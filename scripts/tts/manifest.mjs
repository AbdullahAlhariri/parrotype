// Writes public/audio/manifest.json from the clips on disk, so the app knows which
// sentences have recorded voices (everything else falls back to browser speech).
import { readdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { MASCOT, PERSONAS, REACTIONS } from './personas.mjs'

const root = new URL('../../public/audio/', import.meta.url)
const manifest = { version: 1, mascot: MASCOT, voices: {}, reactions: {}, clips: {} }

for (const lang of Object.keys(PERSONAS)) {
  manifest.voices[lang] = PERSONAS[lang].map(({ id, name, blurb, mascot }) => ({ id, name, blurb, ...(mascot ? { mascot: true } : {}) }))
  const rdir = new URL(`${lang}/reactions/`, root)
  manifest.reactions[lang] = existsSync(rdir)
    ? (await readdir(rdir)).filter((f) => f.endsWith('.mp3')).map((f) => f.slice(0, -4)).sort()
    : []
  const clips = {}
  for (const p of PERSONAS[lang]) {
    const dir = new URL(`${lang}/${p.id}/`, root)
    if (!existsSync(dir)) continue
    for (const f of await readdir(dir)) {
      if (!f.endsWith('.mp3')) continue
      ;(clips[f.slice(0, -4)] ??= []).push(p.id)
    }
  }
  manifest.clips[lang] = clips
}

await writeFile(new URL('manifest.json', root), JSON.stringify(manifest) + '\n')
const counts = Object.fromEntries(Object.entries(manifest.clips).map(([l, c]) => [l, Object.keys(c).length]))
console.log('manifest written: sentences with audio', counts, 'reactions', Object.fromEntries(Object.entries(manifest.reactions).map(([l, r]) => [l, r.length])))
void REACTIONS
