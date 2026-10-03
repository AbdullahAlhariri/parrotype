// TEMP review harness (deleted after review)
import { readFileSync, writeFileSync } from 'node:fs'
import { it } from 'vitest'
import { runRules } from './engine'
import { nlRules } from './rules/nl'
import { nlDict } from './test-utils/nlDict'

it('scan', () => {
  const file = process.env.SCAN_FILE ?? '/tmp/claude-0/-home-user-parrotype/48c02fc6-2338-5d25-886d-738134e4c7f2/scratchpad/scan.txt'
  const lines = readFileSync(file, 'utf8').split('\n').filter((l) => l.trim() && !l.startsWith('#'))
  const dict = nlDict()
  const out: string[] = []
  for (const line of lines) {
    const a = runRules(line, 'nl', nlRules, { strictness: 'strict', dict })
    const b = runRules(line, 'nl', nlRules, { strictness: 'strict' })
    const fmt = (is: typeof a) => is.map((i) => `[${i.ruleId} ${i.confidence[0]}] "${i.text}" -> ${JSON.stringify(i.replacements.slice(0, 2))}`).join('  ')
    const fa = fmt(a)
    const fb = fmt(b)
    if (fa || fb) out.push(`${line}\n   D: ${fa}${fb !== fa ? `\n   N: ${fb}` : ''}`)
    else out.push(`${line}\n   (clean)`)
  }
  writeFileSync(file + '.out', out.join('\n'))
})
