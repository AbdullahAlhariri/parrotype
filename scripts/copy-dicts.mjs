// Copies the Hunspell dictionaries from node_modules into public/dicts so the
// spell-check worker can fetch them at runtime (they are too big to bundle).
import { mkdir, copyFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const out = new URL('public/dicts/', root)
await mkdir(out, { recursive: true })

for (const [pkg, name] of [['dictionary-nl', 'nl'], ['dictionary-en', 'en']]) {
  for (const ext of ['aff', 'dic']) {
    await copyFile(new URL(`node_modules/${pkg}/index.${ext}`, root), new URL(`${name}.${ext}`, out))
  }
}
console.log('dictionaries copied to public/dicts')
