import { it } from 'vitest'
import { readFileSync, writeFileSync } from 'node:fs'
import { loadTestDictionary } from '@/test/dict'
import { enRules } from '.'
import { runEn } from './testing'
import { PARAGRAPHS_US } from './fixtures'
const DIR = '/tmp/claude-0/-home-user-parrotype/48c02fc6-2338-5d25-886d-738134e4c7f2/scratchpad/'
it('fpbench', async () => {
  const dict = await loadTestDictionary('en')
  const ok: string[] = JSON.parse(readFileSync(DIR + 'lt_ok_examples.json', 'utf8'))
  const counts: Record<string, number> = {}
  const samples: Record<string, string[]> = {}
  let affected = 0
  for (const t of ok) {
    const issues = runEn(t, enRules, { dict, strictness: 'strict' })
    if (issues.length) affected++
    for (const id of new Set(issues.map((i) => i.ruleId))) {
      counts[id] = (counts[id] ?? 0) + 1
      const i = issues.find((x) => x.ruleId === id)!
      ;(samples[id] ??= []).push(`${t.slice(0, 150)}  ==> [${i.text}] -> ${i.replacements.join('|')}`)
    }
  }
  const lines = [`sentences ${ok.length} affected ${affected}`]
  for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
    lines.push(`${v} ${k}`)
    for (const s of samples[k].slice(0, 40)) lines.push(`      ${s}`)
  }
  lines.push('--- hints on US paragraphs')
  for (const p of PARAGRAPHS_US) for (const i of runEn(p, enRules, { dict })) lines.push(`${i.ruleId} [${i.text}] ${i.confidence}`)
  writeFileSync(DIR + 'fp_port.txt', lines.join('\n'))
}, 120000)
