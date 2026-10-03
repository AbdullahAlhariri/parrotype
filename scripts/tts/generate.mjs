// Pre-renders dictation audio with Gemini 3.8 Flash TTS and checks every clip by
// transcribing it back (the clip must say exactly the sentence, nothing more).
//
//   GEMINI_API_KEY=... node scripts/tts/generate.mjs --sample [--out dir]
//   GEMINI_API_KEY=... node scripts/tts/generate.mjs --jobs jobs.json [--concurrency 4] [--skip-existing]
//
// The key is read from the environment only. Never commit it.
// Needs ffmpeg (with libmp3lame) and ffprobe on PATH.

import { execFile } from 'node:child_process'
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { promisify } from 'node:util'
import { DESIGNED, PERSONAS, REACTIONS } from './personas.mjs'

const mascotOf = (lang) => PERSONAS[lang].find((p) => p.mascot).id

const run = promisify(execFile)
const API = 'https://generativelanguage.googleapis.com/v1beta'
const TTS_MODEL = process.env.TTS_MODEL ?? 'gemini-3.8-flash-tts'
const QA_MODEL = process.env.QA_MODEL ?? 'gemini-3.8-flash'
const KEY = process.env.GEMINI_API_KEY
const VOICES_FILE = new URL('./voices.json', import.meta.url)
const BITRATE = process.env.TTS_BITRATE ?? '40k'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export async function api(path, body, attempt = 0) {
  const res = await fetch(`${API}/${path}`, {
    method: 'POST',
    headers: { 'x-goog-api-key': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if ((res.status === 429 || res.status >= 500) && attempt < 6) {
    await sleep(2000 * 2 ** attempt + Math.random() * 1000)
    return api(path, body, attempt + 1)
  }
  const json = await res.json()
  if (!res.ok || json.error) throw new Error(`${path} ${res.status}: ${json.error?.message ?? 'unknown error'}`)
  return json
}

/* ---------------- designed voices ---------------- */

async function loadVoiceIds() {
  return existsSync(VOICES_FILE) ? JSON.parse(await readFile(VOICES_FILE, 'utf8')) : {}
}

/** Creates any designed voice that has no stored id yet. Saves preview clips to previewDir. */
export async function ensureDesignedVoices(previewDir) {
  const ids = await loadVoiceIds()
  for (const [name, def] of Object.entries(DESIGNED)) {
    if (ids[name]) continue
    const created = await api('voices', {
      store: true,
      voice: {
        type: 'prompted',
        display_name: `parrotype-${name}`,
        language_code: def.languageCode,
        prompted: { input: def.description },
      },
    })
    ids[name] = created.id
    await writeFile(VOICES_FILE, JSON.stringify(ids, null, 2) + '\n')
    console.log(`designed ${name}: ${created.id}`)
    const sample = created.sample_audio ?? created.sampleAudio
    if (sample?.data && previewDir) {
      await encodeMp3(Buffer.from(sample.data, 'base64'), join(previewDir, `${name}-preview.mp3`))
    }
  }
  return ids
}

export function resolveVoice(voice, ids) {
  if (!voice.startsWith('@')) return voice
  const id = ids[voice.slice(1)]
  if (!id) throw new Error(`designed voice ${voice} has not been created`)
  return id
}

/* ---------------- synthesis ---------------- */

/** Returns WAV bytes for one line of text. */
export async function synthesize({ text, voice, style, languageCode }) {
  const part = { text }
  if (style) part.speechMetadata = { style }
  const json = await api(`models/${TTS_MODEL}:generateContent`, {
    contents: [{ role: 'user', parts: [part] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: { voiceConfig: { voice }, ...(languageCode ? { languageCode } : {}) },
    },
  })
  const audio = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)
  if (!audio) throw new Error(`no audio returned (finish: ${json.candidates?.[0]?.finishReason})`)
  const bytes = Buffer.from(audio.inlineData.data, 'base64')
  if (bytes.subarray(0, 4).toString() === 'RIFF') return bytes
  const rate = Number(/rate=(\d+)/.exec(audio.inlineData.mimeType)?.[1] ?? 24000)
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

/** Trims silence at both ends, evens out loudness, encodes a small mono MP3. Returns seconds. */
export async function encodeMp3(wav, outFile) {
  const ext = wav.subarray(0, 4).toString() === 'RIFF' ? 'wav' : 'mp3'
  const tmp = join(tmpdir(), `pt-${process.pid}-${Math.random().toString(36).slice(2)}.${ext}`)
  await writeFile(tmp, wav)
  await mkdir(dirname(outFile), { recursive: true })
  const trim = 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.12'
  await run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y', '-i', tmp,
    '-af', `${trim},areverse,${trim},areverse,loudnorm=I=-17:TP=-1.5:LRA=11`,
    '-ar', '24000', '-ac', '1', '-codec:a', 'libmp3lame', '-b:a', BITRATE, outFile,
  ])
  await rm(tmp, { force: true })
  const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', outFile])
  return Number(stdout.trim())
}

/* ---------------- verification ---------------- */

export async function transcribe(mp3, lang, model = QA_MODEL) {
  const numbers = lang === 'ar' ? 'Write numbers as words.' : 'Write numbers out in words, exactly as spoken.'
  const json = await api(`models/${model}:generateContent`, {
    contents: [{
      role: 'user',
      parts: [
        { inlineData: { mimeType: 'audio/mp3', data: mp3.toString('base64') } },
        { text: `Transcribe this audio verbatim in its original language. ${numbers} Output only the transcript.` },
      ],
    }],
    generationConfig: { temperature: 0 },
  })
  return (json.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('').trim()
}

/** Loose comparison: case and punctuation are ignored; for Arabic also hamza/alif/yaa/taa marbuta spelling variants. */
export function normalize(text, lang) {
  let t = text.normalize('NFC').toLowerCase()
  if (lang === 'ar') {
    t = t
      .replace(/[ً-ٰٟـ]/g, '')
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه')
      .replace(/[ؤئ]/g, 'ء')
  }
  return t
    .replace(/<[^>]+>/g, ' ')
    .replace(/[’‘`´]/g, "'")
    .replace(/[^\p{L}\p{N}'\s-]/gu, ' ')
    .replace(/-/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

// Names a transcriber may legitimately spell differently ("Kees" sounds like "Keith" or "case" to English ears).
const NAME_VARIANTS = { kees: ['keith', 'keys', 'case', 'kase', 'kiss', 'cees', 'kays', 'كيس'] }
const canonical = (w) => Object.keys(NAME_VARIANTS).find((n) => n === w || NAME_VARIANTS[n].includes(w)) ?? w

// Audio cannot show spelling: words that sound the same compare equal (word/wordt, its/it's...).
const EN_HOMOPHONES = { "it's": 'its', "they're": 'there', their: 'there', "you're": 'your', too: 'to', two: 'to', "who's": 'whose', "we're": 'were', "there's": 'theres' }
function soundAlike(w, lang) {
  if (lang === 'nl') return w.replace(/dt$|d$/, 't').replace(/ij/g, 'ei').replace(/ou/g, 'au').replace(/[ëï]/g, (c) => (c === 'ë' ? 'e' : 'i'))
  if (lang === 'en') return EN_HOMOPHONES[w] ?? w
  return w
}

export function wordErrors(expected, actual, lang) {
  const a = normalize(expected, lang).map(canonical).map((w) => soundAlike(w, lang))
  const b = normalize(actual, lang).map(canonical).map((w) => soundAlike(w, lang))
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return d[a.length][b.length]
}

// A squawk can be misheard as a swear word; such clips are regenerated.
const RUDE = /\b(fuck\w*|shit\w*|damn\w*|bitch\w*|crap|hell|ass|dick|kut|klote|godver\w*|tering|kanker|lul|shit)\b/i
export const soundsRude = (heard) => RUDE.test(heard ?? '')

/* ---------------- jobs ---------------- */

/** One clip: synthesize, encode, verify; retries when the transcript does not match. */
export async function renderJob(job, ids, { maxTries = 3 } = {}) {
  const persona = PERSONAS[job.lang].find((p) => p.id === job.persona)
  if (!persona) throw new Error(`unknown persona ${job.lang}/${job.persona}`)
  const voice = resolveVoice(persona.voice, ids)
  let last
  for (let attempt = 1; attempt <= maxTries; attempt++) {
    const wav = await synthesize({ text: job.text, voice, style: job.style ?? persona.style, languageCode: persona.languageCode })
    const duration = await encodeMp3(wav, job.out)
    const heard = await transcribe(await readFile(job.out), job.lang)
    const errors = job.skipQa ? 0 : wordErrors(job.text, heard, job.lang)
    const rude = soundsRude(heard)
    last = { ...job, voice, duration, attempt, heard, errors, rude, ok: errors === 0 && !rude }
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
          out[i] = await fn(items[i])
        } catch (e) {
          out[i] = { ...items[i], ok: false, error: String(e.message ?? e) }
        }
        const r = out[i]
        const tag = r.ok ? (r.attempt > 1 ? `ok(${r.attempt})` : 'ok   ') : 'FAIL '
        console.log(`${tag} ${r.lang} ${r.persona.padEnd(11)} ${r.id} ${r.duration ? r.duration.toFixed(1) + 's' : ''} | ${r.heard ?? r.error ?? ''}`)
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

function sampleJobs(out) {
  const jobs = []
  for (const lang of ['nl', 'en', 'ar']) {
    PERSONAS[lang].forEach((p, i) => {
      jobs.push({ id: 'sample', lang, persona: p.id, text: SAMPLE_TEXT[lang], out: join(out, lang, `${i + 1}-${p.id}.mp3`) })
    })
    for (const r of REACTIONS[lang]) {
      jobs.push({ id: `reaction-${r.id}`, lang, persona: mascotOf(lang), text: r.text, style: r.style, skipQa: true, out: join(out, lang, `reaction-${r.id}.mp3`) })
    }
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
  const ids = await ensureDesignedVoices(join(out, 'previews'))
  let jobs
  if (args.includes('--sample')) jobs = sampleJobs(out)
  else if (args.includes('--reactions')) {
    jobs = Object.entries(REACTIONS).flatMap(([lang, list]) =>
      list.map((r) => ({ id: r.id, lang, persona: mascotOf(lang), text: r.text, style: r.style, skipQa: true, out: join(out, lang, 'reactions', `${r.id}.mp3`) })),
    )
  } else {
    const file = opt('--jobs')
    if (!file) throw new Error('Pass --sample or --jobs <file.json>')
    jobs = JSON.parse(await readFile(file, 'utf8'))
  }
  if (args.includes('--skip-existing')) jobs = jobs.filter((j) => !existsSync(j.out))
  console.log(`${jobs.length} clips with ${TTS_MODEL}, checked by ${QA_MODEL}`)
  const results = await pool(jobs, concurrency, (j) => renderJob(j, ids))
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
