import { it } from 'vitest'
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { loadTestDictionary } from '@/test/dict'
import { arRules } from '.'
import { runAr } from './testing'
const DIR = '/tmp/claude-0/-home-user-parrotype/48c02fc6-2338-5d25-886d-738134e4c7f2/scratchpad/'
it('scan', async () => {
  const dict = await loadTestDictionary('ar')
  const lines: string[] = []
  // 1) frequency list words
  const words = readFileSync('public/freq/ar.txt', 'utf8').split('\n').map((w) => w.trim()).filter(Boolean).slice(0, 50000)
  const byRule: Record<string, string[]> = {}
  for (const w of words) for (const i of runAr(w, arRules, { dict, strictness: 'normal' })) (byRule[i.ruleId] ??= []).push(`${w}->${i.replacements[0]}`)
  for (const [k, v] of Object.entries(byRule).sort((a, b) => b[1].length - a[1].length)) lines.push(`${v.length} ${k}: ${v.slice(0, 400).join('  ')}`)
  // 2) Arabic strings in src/content
  lines.push('--- content')
  const files: string[] = []
  const walk = (d: string) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.ts$/.test(f) && !/test/.test(f)) files.push(p) } }
  walk('src/content')
  let n = 0
  for (const f of files) {
    const src = readFileSync(f, 'utf8')
    for (const m of src.matchAll(/(['"`])((?:(?!\1)[^\\\n]|\\.)*[؀-ۿ](?:(?!\1)[^\\\n]|\\.)*)\1/g)) {
      const s = m[2]
      n++
      for (const i of runAr(s, arRules, { dict, strictness: 'strict' })) lines.push(`${f}: [${i.ruleId}] ${i.text} -> ${i.replacements.join('|')} :: ${s.slice(0, 120)}`)
    }
  }
  lines.push(`content strings: ${n}`)
  writeFileSync(DIR + 'ar_scan.txt', lines.join('\n'))
}, 300000)
