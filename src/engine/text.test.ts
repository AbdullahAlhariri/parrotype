import { describe, expect, it } from 'vitest'
import { foldDigits, graphemes, normalizeInput, normalizeTypingText, stripAccents, stripMarks, stripTashkeel } from './text'

describe('text helpers', () => {
  it('splits into graphemes', () => {
    expect(graphemes('ideeën')).toHaveLength(6)
    expect(graphemes('idee\u0065\u0308n')).toHaveLength(6)
    expect(graphemes('كَتَبَ')).toHaveLength(3)
    expect(graphemes('لا')).toHaveLength(2)
  })

  it('strips marks at three strengths', () => {
    expect(stripAccents('café ideeën أنا')).toBe('cafe ideeen أنا')
    expect(stripTashkeel('كَتَبَ جمـيل أَنا')).toBe('كتب جميل أنا')
    expect(stripMarks('café أنا مسؤول')).toBe('cafe انا مسوول')
  })

  it('normalises encodings but never removes hamza', () => {
    expect(normalizeInput('\uFEFB')).toBe('لا')
    expect(normalizeInput('\uFEF7')).toBe('لأ')
    expect(normalizeInput('ف\u06CC \u06A9تاب')).toBe('في كتاب')
    expect(normalizeInput('a\u200Bb\u200Fc')).toBe('abc')
    expect(normalizeInput('\u0627\u0654')).toBe('أ')
    expect(normalizeInput('ideeën ²')).toBe('ideeën ²')
  })

  it('folds Eastern Arabic and Persian digits', () => {
    expect(foldDigits('\u0661\u0662\u0663 \u06F4\u06F5 67')).toBe('123 45 67')
  })

  it('makes typographic punctuation typable', () => {
    expect(normalizeTypingText('\u201CZo\u2019n\u201D \u2013 klaar\u2026')).toBe(`"Zo'n" - klaar...`)
  })
})
