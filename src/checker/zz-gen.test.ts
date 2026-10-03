import { it } from 'vitest'
import { WEAK_VERBS, STRONG_VERBS } from './lexicon/nl/verbs'
import { nlDict } from './test-utils/nlDict'
it('gen', () => {
  const d = nlDict()
  const real: string[] = []
  const bad: string[] = []
  for (const v of [...WEAK_VERBS, ...STRONG_VERBS]) {
    for (const f of [v.ik, v.hij, v.pastSg, v.pastPl, v.part, v.inf]) if (f && !d.has(f)) bad.push(`${v.inf}:${f}`)
  }
  for (const v of WEAK_VERBS) {
    const wrongs: string[] = []
    const p = v.pastSg
    if (p.endsWith('tte')) wrongs.push(p.slice(0, -3) + 'te')
    else if (p.endsWith('dde')) wrongs.push(p.slice(0, -3) + 'de')
    else if (p.endsWith('te')) wrongs.push(p.slice(0, -2) + 'de')
    else if (p.endsWith('de')) wrongs.push(p.slice(0, -2) + 'te')
    const pt = v.part
    if (pt.endsWith('d')) wrongs.push(pt.slice(0, -1) + 't')
    else if (pt.endsWith('t') && !pt.endsWith('tt')) wrongs.push(pt.slice(0, -1) + 'd')
    for (const w of wrongs) if (d.has(w)) real.push(`${v.inf}:${w}`)
  }
  console.log('MISSING FORMS', bad.join(' '))
  console.log('REAL WRONGS', real.join(' '))
})
