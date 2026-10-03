import { it } from 'vitest'
import { writeFileSync } from 'node:fs'
import type { Lang } from '@/types'
import { ERRORS_NL, type Labelled } from './errors.nl'
import { ERRORS_EN } from './errors.en'
import { ERRORS_AR } from './errors.ar'
import { parseCase, scoreCase } from './score'

const SETS: Record<Lang, Labelled[]> = { nl: ERRORS_NL, en: ERRORS_EN, ar: ERRORS_AR }
it('recall', async () => {
  const out: string[] = []
  for (const [lang, set] of Object.entries(SETS) as Array<[Lang, Labelled[]]>) {
    let fixed = 0, first = 0, flagged = 0
    for (const l of set) {
      const c = parseCase(l)
      const s = await scoreCase(c, lang)
      if (s.outcome === 'fixed') fixed++
      if (s.first) first++
      if (s.outcome !== 'missed') flagged++
      if (s.outcome !== 'fixed' || !s.first || s.stray.length)
        out.push(`${lang} ${s.outcome.toUpperCase()}${s.first ? '' : s.outcome === 'fixed' ? ' (not first)' : ''}${c.gap ? ' [gap]' : ''} ${c.family}: ${c.text} => ${c.expected} | ${s.hit ? s.hit.ruleId + ' ' + s.hit.text + ' -> ' + s.hit.replacements.slice(0, 3).join('|') : ''}${s.stray.length ? ' STRAY ' + s.stray.map((i) => i.ruleId + ' ' + i.text + '->' + i.replacements[0]).join(', ') : ''}`)
    }
    out.push(`# ${lang}: ${set.length} cases, ${flagged} flagged, ${fixed} fixed, ${first} fixed first`)
  }
  writeFileSync(process.env.OUT!, out.join('\n'))
}, 600000)
