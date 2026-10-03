import { describe, expect, it } from 'vitest'
import { enRules, enRulesWithExamples } from '.'
import { expectExamples } from './testing'

// Every rule fires on its own `wrong` example (underlining the expected text, offering the expected fix)
// and stays quiet on its `right` example and every tricky `ok` sentence. Ported from the prototype's test.mjs.

describe('english rules: built-in examples', () => {
  it('has unique ids in the en. namespace', () => {
    const ids = enRules.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const r of enRules) {
      expect(r.id).toMatch(/^en\.[a-z0-9-]+$/)
      expect(r.lang).toBe('en')
      expect(r.title.length).toBeGreaterThan(3)
    }
  })

  it('maps hints to low + strict only', () => {
    for (const r of enRules) if (r.confidence === 'low') expect(r.strictOnly, r.id).toBe(true)
  })

  for (const rule of enRulesWithExamples) it(rule.id, () => expectExamples(rule))
})
