import { it } from 'vitest'
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { loadTestDictionary } from '@/test/dict'
import { enRules } from '.'
import { runEn } from './testing'
const DIR = '/tmp/claude-0/-home-user-parrotype/48c02fc6-2338-5d25-886d-738134e4c7f2/scratchpad/'
it('scan', async () => {
  const dict = await loadTestDictionary('en')
  const lines: string[] = []
  const files: string[] = []
  const walk = (d: string) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/(^|\/)en(\.ts|\/)|\/en\//.test(p) && !/test/.test(f)) files.push(p) } }
  walk('src/content')
  let n = 0
  for (const f of files) {
    const src = readFileSync(f, 'utf8')
    for (const m of src.matchAll(/(['"`])((?:(?!\1)[^\\\n]|\\.){12,})\1/g)) {
      const s = m[2].replace(/\\'/g, "'").replace(/\\"/g, '"')
      if (!/[a-z]{3,}\s+[a-z]{2,}/i.test(s)) continue
      n++
      for (const i of runEn(s, enRules, { dict, strictness: 'normal' })) lines.push(`${f}: [${i.ruleId}] ${i.text} -> ${i.replacements.join('|')} :: ${s.slice(0, 140)}`)
    }
  }
  lines.unshift(`files ${files.length} strings ${n}`)
  writeFileSync(DIR + 'en_scan.txt', lines.join('\n'))
}, 300000)
