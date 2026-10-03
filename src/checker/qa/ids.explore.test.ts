import { it } from 'vitest'
import { writeFileSync } from 'node:fs'
import { RULES } from '../rules'
it('ids', () => {
  const out: string[] = []
  for (const [lang, rules] of Object.entries(RULES)) for (const r of rules) out.push(`${lang}\t${r.id}\t${r.confidence}${r.strictOnly ? ' strict' : ''}\t${r.title}`)
  writeFileSync(process.env.OUT!, out.join('\n'))
})
