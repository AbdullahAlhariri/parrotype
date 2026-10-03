import { describe, expect, it } from 'vitest'
import * as lex from '../../lexicon/ar'

// The Arabic word lists: well-formed, no duplicates across lists that would give two answers.

const MAPS = Object.entries(lex).filter(([, v]) => v instanceof Map) as Array<[string, ReadonlyMap<string, unknown>]>

describe('arabic lexicon', () => {
  it('only holds Arabic keys without harakat or tatweel', () => {
    for (const [name, m] of MAPS) {
      for (const k of m.keys()) {
        expect(k, name).toMatch(/^[\u0621-\u063F\u0641-\u064A]+$/)
      }
    }
  })

  it('never maps a word to itself', () => {
    for (const [name, m] of MAPS) {
      if (name === 'AR_MISSPELLINGS') continue
      for (const [k, v] of m as ReadonlyMap<string, string[]>) expect(v.includes(k), `${name}: ${k}`).toBe(false)
    }
  })

  it('builds the misspelling map for the speller', () => {
    expect(lex.AR_MISSPELLINGS.get('هاذا')?.right).toBe('هذا')
    expect(lex.AR_MISSPELLINGS.get('إسمي')?.right).toBe('اسمي')
    expect(lex.AR_MISSPELLINGS.size).toBeGreaterThan(100)
  })

  it('keeps names and ambiguous words out', () => {
    for (const w of ['علي', 'موسي', 'لدي', 'كتابه', 'مدرسه', 'ان', 'لاكي', 'مستوي', 'محتوي']) {
      for (const [name, m] of MAPS) {
        if (name === 'AN_HAMZA' || name === 'HA_FOR_TAA') continue
        expect(m.has(w), `${w} in ${name}`).toBe(false)
      }
    }
  })
})
