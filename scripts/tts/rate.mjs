// Rates rendered voice clips with Gemini audio understanding, to pick the clearest and most
// pleasant dictation voices. Usage: GEMINI_API_KEY=... node scripts/tts/rate.mjs <lang> <clip.mp3>...
import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'

const KEY = process.env.GEMINI_API_KEY
const JUDGES = [['gemini-3.8-flash', 3], ['gemini-3.5-flash', 2]]
const LANG = { nl: 'Dutch (as spoken in the Netherlands)', en: 'English', ar: 'Modern Standard Arabic' }

const RUBRIC = (lang) => `You are evaluating a text-to-speech voice for a dictation exercise in a typing and spelling app for adult learners of ${LANG[lang]}.
Listen to the clip and score each criterion from 1 to 10:
- clarity: how easy it is for a learner to hear and spell every single word (articulation, no mumbling, word boundaries)
- pleasant: how nice the voice is to listen to many times a day
- fun: charm, character and personality, without hurting clarity
- pace: suitability of the speaking pace for dictation (10 = calm but natural, 1 = far too fast or far too slow)
- native: how native and standard the pronunciation sounds
Reply with JSON only: {"clarity":n,"pleasant":n,"fun":n,"pace":n,"native":n,"note":"one short sentence"}`

async function judge(model, lang, mp3) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ inlineData: { mimeType: 'audio/mp3', data: mp3.toString('base64') } }, { text: RUBRIC(lang) }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 1 },
    }),
  })
  const json = await res.json()
  if (json.error) throw new Error(json.error.message)
  return JSON.parse(json.candidates[0].content.parts.map((p) => p.text ?? '').join(''))
}

const [lang, ...files] = process.argv.slice(2)
const rows = await Promise.all(files.map(async (f) => {
  const mp3 = await readFile(f)
  const votes = (await Promise.all(JUDGES.flatMap(([m, n]) => Array.from({ length: n }, () => judge(m, lang, mp3).catch(() => null))))).filter(Boolean)
  const avg = (k) => votes.reduce((s, v) => s + Number(v[k] || 0), 0) / votes.length
  const s = { clarity: avg('clarity'), pleasant: avg('pleasant'), fun: avg('fun'), pace: avg('pace'), native: avg('native') }
  const overall = 0.4 * s.clarity + 0.2 * s.pleasant + 0.2 * s.fun + 0.1 * s.pace + 0.1 * s.native
  return { clip: basename(f), votes: votes.length, ...s, overall, note: votes[0]?.note }
}))
rows.sort((a, b) => b.overall - a.overall)
for (const r of rows) {
  console.log(`${r.overall.toFixed(2)}  ${r.clip.padEnd(20)} clarity ${r.clarity.toFixed(1)} pleasant ${r.pleasant.toFixed(1)} fun ${r.fun.toFixed(1)} pace ${r.pace.toFixed(1)} native ${r.native.toFixed(1)} (${r.votes} votes) | ${r.note}`)
}
