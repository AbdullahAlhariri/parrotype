// Builds the TTS job list for every dictation sentence and minimal-pair sentence, in every
// persona voice. Run: npx tsx scripts/tts/dictation-jobs.ts > jobs.json
import { DICTATION, PAIRS } from '../../src/content/dictation/index.ts'
import { PERSONAS } from './personas.mjs'

type Lang = 'nl' | 'en' | 'ar'
const jobs: Array<{ id: string; lang: Lang; persona: string; text: string; out: string }> = []

for (const lang of ['nl', 'en', 'ar'] as Lang[]) {
  const lines = [
    ...DICTATION[lang].map((s) => ({ id: s.id, text: s.say ?? s.text })),
    ...PAIRS[lang].flatMap((p) => p.sentences.map((s, i) => ({ id: `${p.id}-${i + 1}`, text: s.text }))),
  ]
  for (const line of lines) {
    for (const p of PERSONAS[lang]) {
      jobs.push({ id: line.id, lang, persona: p.id, text: line.text, out: `public/audio/${lang}/${p.id}/${line.id}.mp3` })
    }
  }
}
process.stdout.write(JSON.stringify(jobs, null, 1))
