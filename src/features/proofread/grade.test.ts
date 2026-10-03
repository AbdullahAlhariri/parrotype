import { describe, expect, it } from 'vitest'
import { ALL_TEXTS, findText } from '@/content/proofread'
import { countEdits, gradeProofread, sameWord, segments, sentenceAt } from './grade'

describe('gradeProofread on every shipped text', () => {
  for (const t of ALL_TEXTS) {
    it(`${t.id}: untouched text misses every mistake and breaks nothing`, () => {
      const g = gradeProofread(t, t.text)
      expect(g.results.map((r) => r.status)).toEqual(t.mistakes.map(() => 'missed'))
      expect(g.introduced).toEqual([])
    })

    it(`${t.id}: corrected text fixes everything`, () => {
      const g = gradeProofread(t, t.corrected)
      expect(g.fixed).toBe(t.mistakes.length)
      expect(g.introduced).toEqual([])
    })

    it(`${t.id}: segments rebuild the corrected text`, () => {
      const g = gradeProofread(t, t.text)
      expect(segments(t, g).map((s) => s.text).join('')).toBe(t.corrected)
    })
  }
})

describe('gradeProofread details', () => {
  const t = findText('nl-01')!

  it('counts a partial fix and keeps the rest missed', () => {
    const edited = t.text.replace('ik wordt morgen', 'ik word morgen')
    const g = gradeProofread(t, edited)
    expect(g.fixed).toBe(1)
    expect(g.results[0].status).toBe('fixed')
    expect(g.results[1].status).toBe('missed')
  })

  it('tells a wrong edit apart from an untouched mistake', () => {
    const edited = t.text.replace('Mijn collega antwoord', 'Mijn collega antwoorde')
    const g = gradeProofread(t, edited)
    expect(g.results[2].status).toBe('changed')
    expect(g.results[2].typed).toBe('antwoorde')
  })

  it('reports new mistakes outside the planted ones', () => {
    const edited = t.corrected.replace('op kantoor', 'op kantor').replace('de markt', 'de markt markt')
    const g = gradeProofread(t, edited)
    expect(g.fixed).toBe(t.mistakes.length)
    expect(g.introduced.map((e) => [e.expected, e.typed])).toEqual([
      ['kantoor', 'kantor'],
      ['', 'markt'],
    ])
  })

  it('accepts listed alternatives', () => {
    const en = findText('en-06')!
    const edited = en.corrected.replace('I have lived', 'I have been living').replace('very nice', 'very friendly')
    const g = gradeProofread(en, edited)
    expect(g.fixed).toBe(en.mistakes.length)
    expect(g.introduced).toEqual([])
  })

  it('handles split and joined words', () => {
    const nl = findText('nl-07')!
    const edited = nl.corrected.replace('tandarts', 'tand arts')
    const g = gradeProofread(nl, edited)
    expect(g.results.find((r) => r.mistake.right === 'tandarts')?.status).toBe('missed')
    expect(g.introduced).toEqual([])
  })

  it('grades Arabic without counting tashkeel as a change', () => {
    const ar = findText('ar-01')!
    const voweled = ar.corrected.replace('أنا بخير', 'أَنَا بخير')
    const g = gradeProofread(ar, voweled)
    expect(g.fixed).toBe(ar.mistakes.length)
    expect(g.introduced).toEqual([])
    expect(countEdits(ar.text, ar.text.replace('بخير', 'بِخَيْرٍ'), 'ar')).toBe(0)
  })

  it('grades an Arabic fix that splits one word into two', () => {
    const ar = findText('ar-04')!
    const g = gradeProofread(ar, ar.text.replace('إنشاء الله', 'إن شاء الله'))
    expect(g.results.find((r) => r.mistake.rule === 'inshallah')?.status).toBe('fixed')
    expect(g.results.filter((r) => r.status === 'fixed')).toHaveLength(1)
    expect(g.introduced).toEqual([])
  })

  it('tells an Arabic wrong edit apart from an untouched mistake', () => {
    const ar = findText('ar-01')!
    const g = gradeProofread(ar, ar.text.replace('الى أمستردام', 'إلي أمستردام'))
    const r = g.results.find((x) => x.mistake.right === 'إلى')!
    expect(r.status).toBe('changed')
    expect(r.typed).toBe('إلي')
  })

  it('matches a retyped word loosely', () => {
    expect(sameWord(' إلى ', 'إلى', 'ar')).toBe(true)
    expect(sameWord('إلَى', 'إلى', 'ar')).toBe(true)
    expect(sameWord('الى', 'إلى', 'ar')).toBe(false)
    expect(sameWord('word', 'wordt', 'nl')).toBe(false)
  })

  it('counts edits against the starting text', () => {
    expect(countEdits(t.text, t.text)).toBe(0)
    expect(countEdits(t.text, t.text.replace('wordt', 'word'))).toBe(1)
  })

  it('finds the sentence around an offset', () => {
    const s = 'Eerste zin. Tweede zin met een fout? Derde.'
    expect(sentenceAt(s, s.indexOf('fout'))).toBe('Tweede zin met een fout?')
    expect(sentenceAt(s, 0)).toBe('Eerste zin.')
    expect(sentenceAt('Hoi,\nDit is een regel.\nGroet', 8)).toBe('Dit is een regel.')
  })
})
