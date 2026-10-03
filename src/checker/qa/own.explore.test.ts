import { it } from 'vitest'
import { writeFileSync } from 'node:fs'
import type { Lang } from '@/types'
import { checkFull, describeIssue } from './harness'
import { CORRECT_NL } from './correct.nl'
import { CORRECT_EN } from './correct.en'
import { CORRECT_AR } from './correct.ar'

const SETS: Partial<Record<Lang, Record<string, string[]>>> = { nl: CORRECT_NL, en: CORRECT_EN, ar: CORRECT_AR }
it('own', async () => {
  const out: string[] = []
  for (const [lang, groups] of Object.entries(SETS) as Array<[Lang, Record<string, string[]>]>) {
    let n = 0
    for (const [g, list] of Object.entries(groups)) for (const s of list) {
      n++
      for (const v of lang === 'en' ? [g === 'british' ? 'en-GB' as const : 'en-US' as const] : [undefined]) {
        const issues = await checkFull(s, lang, { variant: v, strictness: process.env.STRICT ? 'strict' : 'normal' })
        for (const i of issues) out.push(`${lang}${v ? ' ' + v : ''} [${g}] ${describeIssue(i, s)}`)
      }
    }
    out.push(`# ${lang}: ${n}`)
  }
  writeFileSync(process.env.OUT!, out.join('\n'))
}, 600000)
