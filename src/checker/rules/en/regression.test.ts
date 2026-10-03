import { beforeAll, describe, expect, it } from 'vitest'
import type { Dictionary } from '@/types'
import { loadTestDictionary } from '@/test/dict'
import { enRules } from '.'
import { DICTATION, PARAGRAPHS_GB, PARAGRAPHS_US } from './fixtures'
import { runEn, serious, showIssues } from './testing'

// No rule may fire on correct text: the 55 dictation targets (any confidence, strict mode) and paragraphs
// of correct English (nothing of medium or high confidence).

describe('english regression: correct text stays clean', () => {
  let us: Dictionary
  let gb: Dictionary
  beforeAll(async () => {
    us = await loadTestDictionary('en')
    gb = await loadTestDictionary('en-GB')
  })

  it('has 55 dictation sentences', () => expect(DICTATION).toHaveLength(55))

  it('flags nothing at all in the dictation sentences', () => {
    for (const s of DICTATION) {
      for (const dict of [undefined, us]) {
        const issues = runEn(s, enRules, { dict, strictness: 'strict' })
        expect(issues, `${s}\n${showIssues(issues)}`).toEqual([])
      }
    }
  })

  it('flags nothing serious in correct American paragraphs', () => {
    for (const p of PARAGRAPHS_US) {
      for (const dict of [undefined, us]) {
        const issues = serious(runEn(p, enRules, { dict, strictness: 'strict' }))
        expect(issues, `${p}\n${showIssues(issues)}`).toEqual([])
      }
    }
  })

  it('flags nothing serious in correct British paragraphs', () => {
    for (const p of PARAGRAPHS_GB) {
      for (const dict of [undefined, gb]) {
        const issues = serious(runEn(p, enRules, { dict, strictness: 'strict' }))
        expect(issues, `${p}\n${showIssues(issues)}`).toEqual([])
      }
    }
  })

  it('runs the whole pack quickly', () => {
    const text = PARAGRAPHS_US.join('\n\n').repeat(4)
    const t0 = performance.now()
    runEn(text, enRules, { dict: us })
    expect(performance.now() - t0).toBeLessThan(250)
  })
})
