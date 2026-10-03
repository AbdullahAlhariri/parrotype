import { describe, expect, it } from 'vitest'
import { soundKey, weightedDistance } from './distance'
import { generateCandidates } from './candidates'
import { rankSuggestions, type SpellBackend } from './rank'
import { caseShape, capitalize, toLookup } from './text'

describe('weightedDistance', () => {
  it('makes typing slips cheaper than random edits', () => {
    const d = (a: string, b: string, lang: 'nl' | 'en' | 'ar' = 'nl') => weightedDistance(a, b, lang)
    expect(d('huis', 'huis')).toBe(0)
    expect(d('teh', 'the', 'en')).toBeLessThan(d('tex', 'the', 'en')) // swap < substitution
    expect(d('aleen', 'alleen')).toBeLessThan(d('aleen', 'aljeen')) // doubling
    expect(d('wnat', 'want')).toBeLessThan(1)
    expect(d('ideeen', 'ideeën')).toBeLessThan(0.2) // only the trema
    expect(d('Huis', 'huis')).toBeLessThan(0.2)
    expect(d('qant', 'want', 'en')).toBeLessThan(d('pant', 'want', 'en')) // q is next to w
    expect(d('انشاء', 'إنشاء', 'ar')).toBeLessThan(0.2)
  })

  it('treats sound-alike spellings as one mistake', () => {
    expect(soundKey('eigenluk', 'nl')).toBe(soundKey('eigenlijk', 'nl'))
    expect(soundKey('gelukkich', 'nl')).toBe(soundKey('gelukkig', 'nl'))
    expect(soundKey('tyd', 'nl')).toBe(soundKey('tijd', 'nl'))
    expect(weightedDistance('natuurluk', 'natuurlijk', 'nl')).toBeLessThanOrEqual(0.5)
  })
})

describe('text helpers', () => {
  it('normalises lookups and casing', () => {
    expect(toLookup('auto’s')).toBe("auto's")
    expect(toLookup('ĳs')).toBe('ijs')
    expect(caseShape('IJsland')).toBe('capital')
    expect(caseShape('NAVO')).toBe('upper')
    expect(caseShape('iPhone')).toBe('mixed')
    expect(caseShape('كتاب')).toBe('none')
    expect(capitalize('ijsland', 'nl')).toBe('IJsland')
    expect(capitalize('ijsland', 'en')).toBe('Ijsland')
  })
})

describe('generateCandidates', () => {
  const words = (w: string, lang: 'nl' | 'en' | 'ar' = 'nl') => generateCandidates(w, lang).map((c) => c.word)
  it('undoes the classic Dutch slips', () => {
    expect(words('ideeen')).toContain('ideeën')
    expect(words('pannekoek')).toContain('pannenkoek')
    expect(words('gefietsd')).toContain('gefietst')
    expect(words('fietsde')).toContain('fietste')
    expect(words('wachte')).toContain('wachtte')
    expect(words('tyd')).toContain('tijd')
    expect(words('autos')).toContain("auto's")
    expect(words('gelukkich')).toContain('gelukkig')
  })
  it('knows English contractions and Arabic hamza', () => {
    expect(words('dont', 'en')).toContain("don't")
    expect(words('im', 'en')).toContain("I'm")
    expect(words('انا', 'ar')).toContain('أنا')
    expect(words('مدرسه', 'ar')).toContain('مدرسة')
  })
})

describe('rankSuggestions', () => {
  const known = new Set(['eigenlijk', 'ideeën', 'idee', 'en', 'want', 'wat', 'Utrecht', 'gezellig'])
  const backend: SpellBackend = {
    testSpelling: (w) => known.has(w),
    getSpellingSuggestions: (w) => (w === 'wnat' ? ['wat', 'want'] : []),
  }
  const freq = new Map([['wat', 5], ['en', 9], ['want', 40], ['idee', 300], ['eigenlijk', 120]])
  const ctx = { lang: 'nl' as const, isKnown: (w: string) => known.has(w), backend, freq }

  it('puts the misspelling map first', () => {
    const r = rankSuggestions('eigelijk', { ...ctx, misspellings: new Map([['eigelijk', { right: 'eigenlijk' }]]) })
    expect(r[0]).toMatchObject({ word: 'eigenlijk', kind: 'map' })
  })

  it('re-ranks Hunspell with distance and frequency', () => {
    expect(rankSuggestions('wnat', ctx)[0].word).toBe('want') // swap beats a deletion, even of a more common word
  })

  it('copies the casing of the original', () => {
    expect(rankSuggestions('Ideeen', ctx)[0].word).toBe('Ideeën')
    expect(rankSuggestions('utrecht', ctx)[0]).toMatchObject({ word: 'Utrecht', kind: 'case' })
  })

  it('offers nothing it cannot validate', () => {
    expect(rankSuggestions('xqzv', ctx)).toEqual([])
  })
})
