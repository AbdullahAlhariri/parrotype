import { describe, expect, it } from 'vitest'
import { QUOTES, pickQuote, quotesFor, lengthOf } from './index'
import type { Lang } from '@/types'

const LANGS: Lang[] = ['nl', 'en', 'ar']

describe('quotes', () => {
  it('has enough quotes per language', () => {
    expect(QUOTES.nl.length).toBeGreaterThanOrEqual(40)
    expect(QUOTES.en.length).toBeGreaterThanOrEqual(40)
    expect(QUOTES.ar.length).toBeGreaterThanOrEqual(15)
  })

  it.each(LANGS)('%s: every quote is typable and has a source', (lang) => {
    for (const x of QUOTES[lang]) {
      expect(x.text.trim()).toBe(x.text)
      expect(x.source.length).toBeGreaterThan(2)
      // no curly quotes, dashes, ellipses, line breaks or double spaces
      expect(x.text).not.toMatch(/[‘’“”–—…\n\t]|\s{2}/)
      expect(x.length).toBe(lengthOf(x.text))
    }
  })

  it.each(LANGS)('%s: no duplicates', (lang) => {
    const texts = QUOTES[lang].map((x) => x.text)
    expect(new Set(texts).size).toBe(texts.length)
  })

  it('keeps Latin letters and digits out of Arabic text', () => {
    for (const x of QUOTES.ar) expect(x.text).not.toMatch(/[A-Za-z0-9]/)
  })

  it('every language has short and medium quotes, nl and en have long ones', () => {
    for (const lang of LANGS) {
      expect(quotesFor(lang, 'short').length).toBeGreaterThan(3)
      expect(quotesFor(lang, 'medium').length).toBeGreaterThan(3)
    }
    expect(quotesFor('nl', 'long').length).toBeGreaterThanOrEqual(4)
    expect(quotesFor('en', 'long').length).toBeGreaterThanOrEqual(4)
  })

  it('pickQuote respects the length, avoids the previous quote and falls back', () => {
    const first = pickQuote('nl', 'short', () => 0)
    expect(first.length).toBe('short')
    const next = pickQuote('nl', 'short', () => 0, first.text)
    expect(next.text).not.toBe(first.text)
    // Arabic may have no long quotes: we still get something
    expect(pickQuote('ar', 'long', () => 0.5).text.length).toBeGreaterThan(0)
  })
})
