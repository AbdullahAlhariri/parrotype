// Pre-renders dictation audio with Gemini TTS, then checks every clip by transcribing it back.
//
//   GEMINI_API_KEY=... node scripts/tts/generate.mjs --sample [--out dir]
//   GEMINI_API_KEY=... node scripts/tts/generate.mjs --jobs jobs.json --out public/audio [--concurrency 4]
//
// The key is read from the environment only. Never commit it.
// Needs ffmpeg with libmp3lame on PATH.

import { execFile } from 'node:child_process'
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { promisify } from 'node:util'
import { PERSONAS, buildPrompt } from './personas.mjs'

const run = promisify(execFile)
const API = 'https://generativelanguage.googleapis.com/v1beta/models'
const TTS_MODEL = process.env.TTS_MODEL ?? 'gemini-3.8-flash-tts'
const QA_MODEL = process.env.QA_MODEL ?? 'gemini-3.8-flash'
const KEY = process.env.GEMINI_API_KEY

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function gemini(model, body, attempt = 0) {
  const res = await fetch(`${API}/${model}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if ((res.status === 429 || res.status >= 500) && attempt < 6) {
    await sleep(2000 * 2 ** attempt + Math.random() * 1000)
    return gemini(model, body, attempt + 1)
  }
  const json = await res.json()
  if (!res.ok || json.error) throw new Error(`${model} ${res.status}: ${json.error?.message ?? 'unknown error'}`)
  return json
}

/** Returns WAV (or raw PCM wrapped as WAV) bytes. */
export async function synthesize(prompt, voice) {
  const json = await gemini(TTS_MODEL, {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
    },
  })
  const part = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)
  if (!part) throw new Error(`no audio returned (finish: ${json.candidates?.[0]?.finishReason})`)
  const bytes = Buffer.from(part.inlineData.data, 'base64')
  const mime = part.inlineData.mimeType
  if (mime.includes('wav') || bytes.subarray(0, 4).toString() === 'RIFF') return bytes
  const rate = Number(/rate=(\d+)/.exec(mime)?.[1] ?? 24000)
  return pcmToWav(bytes, rate)
}

function pcmToWav(pcm, rate) {
  const h = Buffer.alloc(44)
  h.write('RIFF', 0)
  h.writeUInt32LE(36 + pcm.length, 4)
  h.write('WAVEfmt ', 8)
  h.writeUInt32LE(16, 16)
  h.writeUInt16LE(1, 20)
  h.writeUInt16LE(1, 22)
  h.writeUInt32LE(rate, 24)
  h.writeUInt32LE(rate * 2, 28)
  h.writeUInt16LE(2, 32)
  h.writeUInt16LE(16, 34)
  h.write('data', 36)
  h.writeUInt32LE(pcm.length, 40)
  return Buffer.concat([h, pcm])
}

/** Trims silence at both ends, evens out loudness, encodes a small mono MP3. */
export async function encodeMp3(wav, outFile) {
  const tmp = join(tmpdir(), `pt-${process.pid}-${Math.random().toString(36).slice(2)}.wav`)
  await writeFile(tmp, wav)
  await mkdir(dirname(outFile), { recursive: true })
  const trim = 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.12'
  await run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y', '-i', tmp,
    '-af', `${trim},areverse,${trim},areverse,loudnorm=I=-17:TP=-1.5:LRA=11`,
    '-ar', '24000', '-ac', '1', '-codec:a', 'libmp3lame', '-b:a', '48k', outFile,
  ])
  await rm(tmp, { force: true })
  const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', outFile])
  return Number(stdout.trim())
}

export async function transcribe(mp3, lang) {
  const numbers = lang === 'ar' ? 'Write numbers as words.' : 'Write numbers out in words, exactly as spoken.'
  const json = await gemini(QA_MODEL, {
    contents: [{
      parts: [
        { inlineData: { mimeType: 'audio/mp3', data: mp3.toString('base64') } },
        { text: `Transcribe this audio verbatim in its original language. ${numbers} Include every sound that is spoken as a word (for example a squawk like "rraak"). Output only the transcript.` },
      ],
    }],
    generationConfig: { temperature: 0 },
  })
  return (json.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('').trim()
}

/** Loose comparison: case, punctuation and (for Arabic) spelling variants of hamza/alif/yaa/taa marbuta are ignored. */
export function normalize(text, lang) {
  let t = text.normalize('NFC').toLowerCase()
  if (lang === 'ar') {
    t = t
      .replace(/[ً-ٰٟـ]/g, '') // tashkeel + tatweel
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه')
      .replace(/[ؤئ]/g, 'ء')
  }
  return t
    .replace(/[’‘`´]/g, "'")
    .replace(/[^\p{L}\p{N}'\s-]/gu, ' ')
    .replace(/-/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

export function wordErrors(expected, actual, lang) {
  const a = normalize(expected, lang)
  const b = normalize(actual, lang)
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return d[a.length][b.length]
}

/** One clip: synthesize, encode, verify; retries when the transcript does not match. */
export async function renderJob(job, { qa = true, maxTries = 3 } = {}) {
  const persona = PERSONAS.find((p) => p.id === job.persona)
  if (!persona) throw new Error(`unknown persona ${job.persona}`)
  const voice = job.voice ?? persona.voices?.[job.lang] ?? persona.voice
  let last
  for (let attempt = 1; attempt <= maxTries; attempt++) {
    const prompt = job.prompt ?? buildPrompt(persona, job.lang, job.text, { pace: job.pace })
    const wav = await synthesize(prompt, voice)
    const duration = await encodeMp3(wav, job.out)
    if (!qa || job.skipQa) return { ...job, voice, duration, attempt, ok: true }
    const heard = await transcribe(await readFile(job.out), job.lang)
    const errors = wordErrors(job.text, heard, job.lang)
    last = { ...job, voice, duration, attempt, heard, errors, ok: errors === 0 }
    if (last.ok) return last
  }
  return last
}

async function pool(items, size, fn) {
  const out = new Array(items.length)
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) {
        const i = next++
        try {
          out[i] = await fn(items[i], i)
        } catch (e) {
          out[i] = { ...items[i], ok: false, error: String(e.message ?? e) }
        }
        const r = out[i]
        console.log(`${r.ok ? 'ok  ' : 'FAIL'} ${r.lang} ${r.persona} ${r.id} ${r.duration ? r.duration.toFixed(1) + 's' : ''}${r.ok ? '' : ` heard="${r.heard ?? ''}" ${r.error ?? ''}`}`)
      }
    }),
  )
  return out
}

const SAMPLE_TEXT = {
  nl: 'Kees vindt dat je typen beter wordt als je elke dag een beetje oefent.',
  en: "Kees thinks it's better to type slowly than to make ten mistakes in a row.",
  ar: 'أحب أن أتعلم كلمة جديدة كل يوم.',
}

const SAMPLE_REACTIONS = {
  nl: ['Rrraak! Goed zo, dat is een nieuw record.', 'Rrraak! Nog één keer. Je kunt het.'],
  en: ["Rrraak! Well done, that's a new record.", "Rrraak! One more time. You've got this."],
  ar: ['رااك! أحسنت، هذا رقم قياسي جديد.', 'رااك! مرة أخرى. أنت تستطيع.'],
}

function sampleJobs(out) {
  const jobs = []
  for (const lang of ['nl', 'en', 'ar']) {
    for (const p of PERSONAS) {
      jobs.push({ id: 'sample', lang, persona: p.id, text: SAMPLE_TEXT[lang], out: join(out, `${lang}-${p.id}.mp3`) })
    }
    SAMPLE_REACTIONS[lang].forEach((text, i) => {
      const kees = PERSONAS[0]
      jobs.push({
        id: `reaction-${i + 1}`,
        lang,
        persona: 'kees',
        text,
        skipQa: true,
        out: join(out, `${lang}-kees-reaction-${i + 1}.mp3`),
        prompt: `${kees.style} Start with a short, funny parrot squawk ("Rrraak!"), then say the rest happily and clearly.\n\n${text}`,
      })
    })
  }
  return jobs
}

async function main() {
  if (!KEY) throw new Error('Set GEMINI_API_KEY in the environment.')
  const args = process.argv.slice(2)
  const opt = (name, fallback) => {
    const i = args.indexOf(name)
    return i >= 0 ? args[i + 1] : fallback
  }
  const out = opt('--out', 'tts-out')
  const concurrency = Number(opt('--concurrency', 4))
  let jobs
  if (args.includes('--sample')) jobs = sampleJobs(out)
  else {
    const file = opt('--jobs')
    if (!file) throw new Error('Pass --sample or --jobs <file.json>')
    jobs = JSON.parse(await readFile(file, 'utf8'))
    if (args.includes('--skip-existing')) jobs = jobs.filter((j) => !existsSync(j.out))
  }
  console.log(`${jobs.length} clips with ${TTS_MODEL}, QA by ${QA_MODEL}`)
  const results = await pool(jobs, concurrency, (j) => renderJob(j))
  const report = opt('--report', join(out, 'report.json'))
  await mkdir(dirname(report), { recursive: true })
  await writeFile(report, JSON.stringify(results, null, 2))
  const failed = results.filter((r) => !r.ok)
  console.log(`done: ${results.length - failed.length} ok, ${failed.length} failed. Report: ${report}`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e.message)
    process.exit(1)
  })
}
