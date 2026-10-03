import { it } from 'vitest'
import { writeFileSync } from 'node:fs'
import type { Lang } from '@/types'
import { nodeCore } from '../spell/testing'
import { appCorpus } from './corpus'

it('dump', async () => {
  const core = nodeCore()
  const lines: string[] = []
  for (const lang of ['nl', 'en', 'ar'] as Lang[]) {
    const corpus = appCorpus(lang)
    let n = 0
    const t0 = performance.now()
    for (const c of corpus) {
      const r = await core.check({ text: c.text, lang })
      for (const is of r.issues) {
        n++
        lines.push(`${lang}\t${is.confidence}\t${is.ruleId}\t${JSON.stringify(is.text)}\t->${JSON.stringify(is.replacements.slice(0, 3))}\t${c.where}\t${c.text.slice(Math.max(0, is.offset - 40), is.offset + is.length + 40).replace(/\n/g, ' ')}`)
      }
    }
    lines.push(`# ${lang}: ${corpus.length} texts, ${n} issues, ${Math.round(performance.now() - t0)} ms`)
  }
  writeFileSync(process.env.DUMP ?? '/tmp/dump.tsv', lines.join('\n'))
}, 600000)
