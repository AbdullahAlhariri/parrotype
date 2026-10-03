import { beforeAll, describe, expect, it } from 'vitest'
import type { Dictionary } from '@/types'
import { loadTestDictionary } from '@/test/dict'
import { arRules } from '.'
import { DRILLS, EVERYDAY, EXTRA_OK, MUST_FLAG, PROVERBS, TRICKY } from './fixtures'
import { runAr, showIssues } from './testing'

// Correct Arabic from the research (proverbs, everyday sentences, drills, tricky cases) must come out
// with zero flags, even in strict mode; every known error must be caught by its rule with the full pack.

describe('arabic regression', () => {
  let dict: Dictionary
  beforeAll(async () => {
    dict = await loadTestDictionary('ar')
  }, 30000)

  const correct = [...PROVERBS, ...EVERYDAY, ...DRILLS, ...TRICKY, ...EXTRA_OK]

  it(`flags nothing in ${correct.length} correct sentences`, () => {
    expect(PROVERBS).toHaveLength(32)
    expect(DRILLS).toHaveLength(47)
    for (const s of correct) {
      for (const d of [undefined, dict]) {
        const issues = runAr(s, arRules, { dict: d, strictness: 'strict' })
        expect(issues, `${s}\n${showIssues(issues)}`).toEqual([])
      }
    }
  })

  it('flags nothing in the same sentences joined into one text', () => {
    const text = correct.join(' ')
    expect(runAr(text, arRules, { dict, strictness: 'strict' })).toEqual([])
  })

  it(`catches all ${MUST_FLAG.length} known errors with the full pack`, () => {
    expect(MUST_FLAG).toHaveLength(48)
    for (const [s, id] of MUST_FLAG) {
      for (const d of [undefined, dict]) {
        const issues = runAr(s, arRules, { dict: d, strictness: 'strict' })
        expect(issues.some((i) => i.ruleId === id), `${id} on: ${s}\n${showIssues(issues)}`).toBe(true)
      }
    }
  })

  it('runs quickly', () => {
    const text = correct.join(' ').repeat(3)
    const t0 = performance.now()
    runAr(text, arRules, { dict })
    expect(performance.now() - t0).toBeLessThan(300)
  })
})
