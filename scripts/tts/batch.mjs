// Bulk TTS through the Gemini Batch API (separate, larger quotas than the per-day request
// limit, and half price). Every clip is still verified by transcription; clips that fail are
// retried in a new batch round.
//
//   GEMINI_API_KEY=... node scripts/tts/batch.mjs --jobs jobs.json [--chunk 100] [--rounds 3] [--report r.json]
//
// Jobs are the same objects generate.mjs uses: { id, lang, persona, text, style?, out, skipQa? }.

import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { PERSONAS } from './personas.mjs'
import { api, encodeMp3, ensureDesignedVoices, resolveVoice, soundsRude, transcribe, wordErrors } from './generate.mjs'

const KEY = process.env.GEMINI_API_KEY
const MODEL = process.env.TTS_MODEL ?? 'gemini-3.8-flash-tts'
const QA_MODELS = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.7-flash']
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function ttsRequest(job, ids) {
  const persona = PERSONAS[job.lang].find((p) => p.id === job.persona)
  if (!persona) throw new Error(`unknown persona ${job.lang}/${job.persona}`)
  const part = { text: job.text }
  const style = job.style ?? persona.style
  if (style) part.speechMetadata = { style }
  return {
    contents: [{ role: 'user', parts: [part] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: { voiceConfig: { voice: resolveVoice(persona.voice, ids) }, languageCode: persona.languageCode },
    },
  }
}

async function getJson(path) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/${path}`, { headers: { 'x-goog-api-key': KEY } })
    if (res.ok) return res.json()
    if (attempt > 5) throw new Error(`GET ${path}: ${res.status} ${await res.text()}`)
    await sleep(3000 * (attempt + 1))
  }
}

/** Submits one batch and waits for it. Returns one {job, audio?: Buffer, error?} per job, in order. */
async function runBatch(jobs, ids, label) {
  const op = await api(`models/${MODEL}:batchGenerateContent`, {
    batch: {
      displayName: label,
      model: `models/${MODEL}`,
      inputConfig: { requests: { requests: jobs.map((j, i) => ({ request: ttsRequest(j, ids), metadata: { key: String(i) } })) } },
    },
  })
  const name = op.name ?? op.metadata?.name
  console.log(`${label}: submitted ${name} (${jobs.length} clips)`)
  let batch
  for (;;) {
    await sleep(15000)
    batch = await getJson(name)
    const state = batch.metadata?.state ?? batch.state
    const stats = batch.metadata?.batchStats ?? batch.batchStats ?? {}
    if (/SUCCEEDED|FAILED|CANCELLED|EXPIRED/.test(state ?? '') || batch.done) {
      console.log(`${label}: ${state} ok=${stats.successfulRequestCount ?? '?'} failed=${stats.failedRequestCount ?? '?'}`)
      break
    }
  }
  // (MP3 output via responseFormat is rejected in batch mode, so clips arrive as WAV)
  const output = batch.response?.inlinedResponses ? batch.response : batch.metadata?.output ?? batch.output
  const items = output?.inlinedResponses?.inlinedResponses ?? []
  const byKey = new Map(items.map((it, i) => [it.metadata?.key ?? String(i), it]))
  return jobs.map((job, i) => {
    const it = byKey.get(String(i))
    const part = it?.response?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)
    if (!part) return { job, error: it?.error?.message ?? 'no audio in batch response' }
    return { job, audio: Buffer.from(part.inlineData.data, 'base64') }
  })
}

async function verify(job, audio) {
  const duration = await encodeMp3(audio, job.out)
  const mp3 = await readFile(job.out)
  let heard = ''
  for (const model of QA_MODELS) {
    try {
      heard = await transcribe(mp3, job.lang, model)
      break
    } catch (e) {
      if (!/429|quota/i.test(String(e.message))) throw e
    }
  }
  const errors = job.skipQa ? 0 : wordErrors(job.text, heard, job.lang)
  const rude = soundsRude(heard)
  return { ...job, duration, heard, errors, rude, ok: errors === 0 && !rude }
}

async function pool(items, size, fn) {
  const out = []
  let next = 0
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => {
    while (next < items.length) {
      const i = next++
      out[i] = await fn(items[i]).catch((e) => ({ ...items[i].job, ok: false, error: String(e.message ?? e) }))
    }
  }))
  return out
}

async function main() {
  if (!KEY) throw new Error('Set GEMINI_API_KEY in the environment.')
  const args = process.argv.slice(2)
  const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d)
  const chunk = Number(opt('--chunk', 50))
  const rounds = Number(opt('--rounds', 3))
  const reportFile = opt('--report', 'tts-batch-report.json')
  const ids = await ensureDesignedVoices()
  let todo = JSON.parse(await readFile(opt('--jobs'), 'utf8')).filter((j) => !existsSync(j.out))
  const done = []
  for (let round = 1; round <= rounds && todo.length; round++) {
    console.log(`round ${round}: ${todo.length} clips`)
    const chunks = []
    for (let i = 0; i < todo.length; i += chunk) chunks.push(todo.slice(i, i + chunk))
    const results = (await Promise.all(chunks.map((c, i) => runBatch(c, ids, `parrotype r${round} ${i + 1}/${chunks.length}`)))).flat()
    const checked = await pool(results, 6, async (r) => (r.audio ? verify(r.job, r.audio) : { ...r.job, ok: false, error: r.error }))
    const failed = []
    for (const r of checked) {
      if (r.ok) done.push(r)
      else {
        failed.push(r)
        console.log(`retry ${r.lang} ${r.persona} ${r.id}: ${r.error ?? `heard "${r.heard}"`}`)
      }
    }
    todo = failed.map(({ id, lang, persona, text, style, out, skipQa }) => ({ id, lang, persona, text, style, out, skipQa }))
    // a failed QA leaves a bad file on disk: remove it so the next round regenerates it
    for (const j of todo) if (existsSync(j.out)) await import('node:fs/promises').then((fs) => fs.rm(j.out))
  }
  await mkdir(dirname(reportFile), { recursive: true }).catch(() => {})
  await writeFile(reportFile, JSON.stringify({ ok: done.length, failed: todo, results: done }, null, 1))
  console.log(`finished: ${done.length} ok, ${todo.length} still failing. Report: ${reportFile}`)
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
