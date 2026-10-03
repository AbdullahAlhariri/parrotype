import { beforeAll, describe, expect, it } from 'vitest'
import type { Dictionary } from '@/types'
import { loadTestDictionary } from '@/test/dict'
import { arRules, arRulesWithExamples } from '.'
import { expectArExamples } from './testing'

describe('arabic rules: built-in examples', () => {
  let dict: Dictionary
  beforeAll(async () => {
    dict = await loadTestDictionary('ar')
  }, 30000)

  it('has unique ids in the ar. namespace, with Arabic explanations', () => {
    const ids = arRules.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const r of arRules) {
      expect(r.id).toMatch(/^ar\.[a-z0-9-]+$/)
      expect(r.lang).toBe('ar')
      if (r.confidence === 'low') expect(r.strictOnly, r.id).toBe(true)
    }
  })

  for (const rule of arRulesWithExamples) {
    it(rule.id, () => {
      expectArExamples(rule)
      expectArExamples(rule, { dict })
    })
  }
})
