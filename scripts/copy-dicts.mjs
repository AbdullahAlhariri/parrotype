// Copies the Hunspell dictionaries into public/dicts so the spell-check worker can fetch
// them at runtime (too big to bundle). Files are named .txt so Vercel serves them compressed.
import { mkdir, copyFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const out = new URL('public/dicts/', root)
await mkdir(out, { recursive: true })

const SOURCES = [
  ['nl', 'node_modules/dictionary-nl/index'],
  ['en-US', 'node_modules/dictionary-en/index'],
  ['en-GB', 'node_modules/dictionary-en-gb/index'],
  ['ar', 'vendor/dicts/ar/ar'],
]

for (const [name, base] of SOURCES) {
  for (const ext of ['aff', 'dic']) {
    await copyFile(new URL(`${base}.${ext}`, root), new URL(`${name}.${ext}.txt`, out))
  }
}
console.log('dictionaries copied to public/dicts')
