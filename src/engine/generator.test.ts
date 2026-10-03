import { describe, expect, it } from 'vitest'
import { seeded } from '@/lib/random'
import { generateDrill, generateWords, sentenceToWords, wordList } from './generator'
import type { Weakness } from './keystats'

const weak = (unit: string, kind: 'key' | 'bigram', score = 0.5): Weakness => ({ unit, kind, score, errorRate: 0.2, samples: 50, avgMs: 200, weak: true })

describe('wordList', () => {
  it('serves frequency-ranked lists per language', () => {
    expect(wordList('nl', 5)).toEqual(['ik', 'je', 'het', 'de', 'dat'])
    expect(wordList('en').length).toBeGreaterThan(2950)
    expect(wordList('ar').length).toBe(2000)
  })

  it('drops subtitle fragments and fillers, and lowercase English i', () => {
    for (const junk of ['don', 'll', 're', 'uh', 'mm', 'i']) expect(wordList('en')).not.toContain(junk)
    expect(wordList('nl')).not.toContain('ie')
    expect(wordList('en')).toContain('you')
    const words = generateWords('en', { count: 400, rand: seeded(3) })
    expect(words).not.toContain('i')
    expect(words).not.toContain('don')
    // in punctuation mode the pronoun shows up, always as a capital
    const punct = generateWords('en', { count: 3000, punctuation: true, rand: seeded(4) }).map((w) => w.replace(/[^\p{L}]/gu, ''))
    expect(punct).toContain('I')
    expect(punct).not.toContain('i')
  })
})

describe('generateWords', () => {
  it('draws the requested number of words from the top-N list, reproducibly', () => {
    const a = generateWords('nl', { count: 50, rand: seeded(1) })
    const b = generateWords('nl', { count: 50, rand: seeded(1) })
    expect(a).toEqual(b)
    expect(a).toHaveLength(50)
    const top = new Set(wordList('nl', 200))
    expect(a.every((w) => top.has(w))).toBe(true)
    const big = generateWords('nl', { count: 300, list: 3000, rand: seeded(2) })
    expect(big.some((w) => !top.has(w))).toBe(true)
  })

  it('never repeats either of the previous two words', () => {
    const ws = generateWords('en', { count: 500, rand: seeded(3) })
    for (let i = 2; i < ws.length; i++) {
      expect(ws[i]).not.toBe(ws[i - 1])
      expect(ws[i]).not.toBe(ws[i - 2])
    }
    expect(ws).not.toContain('i') // a lone lowercase "i" only appears with punctuation (as "I")
  })

  it('adds numbers when asked', () => {
    const ws = generateWords('nl', { count: 200, numbers: true, rand: seeded(4) })
    const nums = ws.filter((w) => /^\d+$/.test(w))
    expect(nums.length).toBeGreaterThan(5)
    expect(nums.length).toBeLessThan(50)
  })

  it('punctuates Dutch/English like sentences', () => {
    const ws = generateWords('nl', { count: 120, punctuation: true, rand: seeded(5) })
    expect(ws).toHaveLength(120)
    expect(ws[0][0]).toBe(ws[0][0].toUpperCase())
    expect(/[.?!]$/.test(ws.at(-1)!)).toBe(true)
    for (let i = 1; i < ws.length; i++) {
      if (/[.?!]["')]?$/.test(ws[i - 1])) {
        const first = ws[i].replace(/^["(]/, '')
        expect(first[0]).toBe(first[0].toUpperCase())
      }
    }
    expect(ws.some((w) => w.endsWith(','))).toBe(true)
  })

  it('capitalises the Dutch ij digraph as IJ', () => {
    const rand = seeded(6)
    for (let k = 0; k < 40; k++) {
      const ws = generateWords('nl', { count: 30, list: 3000, punctuation: true, rand })
      for (const w of ws) expect(w.startsWith('Ij')).toBe(false)
    }
  })

  it('uses Arabic punctuation and no capitals for Arabic', () => {
    const ws = generateWords('ar', { count: 200, punctuation: true, rand: seeded(7) })
    const text = ws.join(' ')
    expect(text).toMatch(/[،؟.!]/)
    expect(text).not.toMatch(/[,?;]/)
    expect(/[.؟!]$/.test(ws.at(-1)!)).toBe(true)
  })
})

describe('generateDrill', () => {
  it('fills about 70% of the drill with real words containing the weak units', () => {
    const ws = generateDrill('nl', [weak('v', 'key', 0.8), weak('ij', 'bigram', 0.6)], 40, seeded(8))
    expect(ws).toHaveLength(40)
    const all = new Set(wordList('nl'))
    expect(ws.every((w) => all.has(w))).toBe(true)
    const hits = ws.filter((w) => w.includes('v') || w.includes('ij')).length
    expect(hits).toBeGreaterThanOrEqual(26)
    for (let i = 1; i < ws.length; i++) expect(ws[i]).not.toBe(ws[i - 1])
  })

  it('mixes in review words (about 15%) spread through the drill', () => {
    const review = ['wordt', 'gebeurd', 'ideeën', 'misschien', 'alleen', 'eigenlijk', 'natuurlijk']
    const ws = generateDrill('nl', [weak('d', 'key')], 40, seeded(9), { review })
    expect(ws).toHaveLength(40)
    const used = ws.filter((w) => review.includes(w))
    expect(used.length).toBe(6)
    // never two review words next to each other
    for (let i = 1; i < ws.length; i++) expect(review.includes(ws[i]) && review.includes(ws[i - 1])).toBe(false)
  })

  it('ignores non-letter and unconfident units, and falls back to a diagnostic', () => {
    const ws = generateDrill('en', [weak(' ', 'key'), weak(',', 'key'), { ...weak('q', 'key'), weak: false }], 30, seeded(10))
    expect(ws).toHaveLength(30)
    const top = new Set(wordList('en', 1000))
    expect(ws.every((w) => top.has(w))).toBe(true)
  })

  it('works for Arabic', () => {
    const ws = generateDrill('ar', [weak('ة', 'key'), weak('ال', 'bigram')], 30, seeded(11))
    expect(ws).toHaveLength(30)
    expect(ws.filter((w) => w.includes('ة') || w.includes('ال')).length).toBeGreaterThanOrEqual(20)
  })
})

describe('sentenceToWords', () => {
  it('splits text into typable words', () => {
    expect(sentenceToWords('\u201CHet is\u00A0gebeurd\u2019, zei hij\u2026  ')).toEqual(['"Het', 'is', "gebeurd',", 'zei', 'hij...'])
    expect(sentenceToWords('ذهبتُ إلى المدرسة')).toEqual(['ذهبتُ', 'إلى', 'المدرسة'])
    expect(sentenceToWords('   ')).toEqual([])
  })
})
