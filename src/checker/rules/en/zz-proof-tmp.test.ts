import { it } from 'vitest'
import { writeFileSync } from 'node:fs'
import { loadTestDictionary } from '@/test/dict'
import { TEXTS, applyFixes } from '@/content/proofread'
import { enRules } from '.'
import { runEn } from './testing'
const DIR = '/tmp/claude-0/-home-user-parrotype/48c02fc6-2338-5d25-886d-738134e4c7f2/scratchpad/'
it('proof', async () => {
  const dict = await loadTestDictionary('en')
  const lines: string[] = []
  let planted = 0, caught = 0, extra = 0, fixedFlags = 0
  for (const t of TEXTS.en) {
    const issues = runEn(t.text, enRules, { dict, strictness: 'normal' })
    for (const m of t.mistakes) {
      planted++
      const hit = issues.find((i) => i.offset < m.at + m.wrong.length && m.at < i.offset + i.length)
      if (hit) caught++
      lines.push(`${hit ? 'CAUGHT' : 'missed'} ${t.id} [${m.rule}] ${m.wrong} -> ${m.right}${hit ? `  by ${hit.ruleId} -> ${hit.replacements[0]}` : ''}`)
    }
    for (const i of issues) {
      if (!t.mistakes.some((m) => i.offset < m.at + m.wrong.length && m.at < i.offset + i.length)) { extra++; lines.push(`EXTRA ${t.id} [${i.ruleId}] ${i.text} -> ${i.replacements[0]} (${i.confidence})`) }
    }
    const fixed = applyFixes(t)
    for (const i of runEn(fixed, enRules, { dict, strictness: 'normal' })) { fixedFlags++; lines.push(`FIXED-FLAG ${t.id} [${i.ruleId}] ${i.text} -> ${i.replacements[0]}`) }
  }
  lines.unshift(`planted ${planted} caught ${caught} extra ${extra} flags-on-fixed ${fixedFlags}`)
  writeFileSync(DIR + 'proof.txt', lines.join('\n'))
}, 120000)
