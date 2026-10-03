import { it } from 'vitest'
import { readFileSync, writeFileSync } from 'node:fs'
import type { Lang } from '@/types'
import { nodeCore } from '../spell/testing'

const S = '/tmp/claude-0/-home-user-parrotype/48c02fc6-2338-5d25-886d-738134e4c7f2/scratchpad/'
it('probe', async () => {
  const core = nodeCore()
  const probes = readFileSync(S + 'probe.txt', 'utf8').split('\n').filter(Boolean)
  const out: string[] = []
  for (const l of probes) {
    const lang = l.slice(0, 2) as Lang
    const text = l.slice(3)
    const r = await core.check({ text, lang, variant: (process.env.VARIANT as "en-GB" | undefined), strictness: (process.env.STRICT ? 'strict' : 'normal') })
    out.push(`[${lang}] ${text}\n` + r.issues.map((i) => `   ${i.confidence} ${i.ruleId} ${JSON.stringify(i.text)} -> ${JSON.stringify(i.replacements.slice(0, 4))} | ${i.message}`).join('\n'))
  }
  writeFileSync(S + 'probe.out', out.join('\n'))
}, 120000)
