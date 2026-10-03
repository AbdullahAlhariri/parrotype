// Builds the TTS job list for every dictation sentence and minimal-pair sentence, in every
// persona voice. Clips whose sentence text changed since they were rendered are deleted so
// they get regenerated. Run: npx tsx scripts/tts/dictation-jobs.ts > jobs.json
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { DICTATION, PAIRS } from '../../src/content/dictation/index.ts'
import { PERSONAS } from './personas.mjs'

type Lang = 'nl' | 'en' | 'ar'
const TEXTS = 'public/audio/texts.json'
const previous: Record<string, string> = existsSync(TEXTS) ? JSON.parse(readFileSync(TEXTS, 'utf8')) : {}
const current: Record<string, string> = {}
const jobs: Array<{ id: string; lang: Lang; persona: string; text: string; out: string }> = []

for (const lang of ['nl', 'en', 'ar'] as Lang[]) {
  const lines = [
    ...DICTATION[lang].map((s) => ({ id: s.id, text: s.say ?? s.text })),
    ...PAIRS[lang].flatMap((p) => p.sentences.map((s, i) => ({ id: `${p.id}-${i + 1}`, text: s.text }))),
  ]
  for (const line of lines) {
    const key = `${lang}/${line.id}`
    current[key] = line.text
    const changed = previous[key] !== undefined && previous[key] !== line.text
    for (const p of PERSONAS[lang]) {
      const out = `public/audio/${lang}/${p.id}/${line.id}.mp3`
      if (changed && existsSync(out)) rmSync(out)
      jobs.push({ id: line.id, lang, persona: p.id, text: line.text, out })
    }
  }
}
writeFileSync(TEXTS, JSON.stringify(current, null, 1) + '\n')
process.stdout.write(JSON.stringify(jobs, null, 1))
