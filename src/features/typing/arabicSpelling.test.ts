import { describe, expect, it } from 'vitest'
import { seeded } from '@/lib/random'
import { wordList } from '@/engine'
import { fixArabicWord, fixSpelling, fixWordList } from './arabicSpelling'
import { DEFAULT_CONFIG, newRun } from './page/config'
import { dailyChallenge } from '@/features/practice/daily'

describe('Arabic spelling layer', () => {
  it('puts the hamza where it belongs and takes it off a plain alif', () => {
    expect(['انا', 'الى', 'اذا', 'الان', 'لان', 'اريد'].map(fixArabicWord)).toEqual(['أنا', 'إلى', 'إذا', 'الآن', 'لأن', 'أريد'])
    expect(['إبن', 'إمرأة', 'إنتهى', 'الإتصال'].map(fixArabicWord)).toEqual(['ابن', 'امرأة', 'انتهى', 'الاتصال'])
  })

  it('fixes ى for ي, ه for ة and شئ', () => {
    expect(['فى', 'الذى', 'هذة', 'مره', 'شئ', 'شيئ'].map(fixArabicWord)).toEqual(['في', 'الذي', 'هذه', 'مرة', 'شيء', 'شيء'])
  })

  it('keeps the punctuation the generator added', () => {
    expect(fixArabicWord('انه،')).toBe('أنه،')
    expect(fixArabicWord('"انا"')).toBe('"أنا"')
    expect(fixArabicWord('(فى)')).toBe('(في)')
    expect(fixArabicWord('الى؟')).toBe('إلى؟')
  })

  it('leaves correct words, imperatives and numbers alone, and is stable', () => {
    for (const w of ['أن', 'انظر', 'اذهب', 'اسمع', 'على', 'إلى', '2024', 'مرحبا']) expect(fixArabicWord(w)).toBe(w)
    for (const w of wordList('ar')) expect(fixArabicWord(fixArabicWord(w))).toBe(fixArabicWord(w))
  })

  it('only touches Arabic', () => {
    const nl = ['de', 'ij', 'een']
    expect(fixSpelling(nl, 'nl')).toBe(nl)
    expect(fixWordList(nl, 'nl')).toBe(nl)
  })

  it('never leaves the same word twice in a row after a correction', () => {
    const out = fixSpelling(['ان', 'أن', 'في', 'من', 'هل', 'لا'], 'ar')
    expect(out).toHaveLength(6)
    for (let i = 1; i < out.length; i++) expect(out[i]).not.toBe(out[i - 1])
    expect(out.filter((w) => w === 'أن')).toHaveLength(2)
  })

  it('merges a corrected list without changing the order of the rest', () => {
    expect(fixWordList(['لا', 'أن', 'ان', 'فى', 'في'], 'ar')).toEqual(['لا', 'أن', 'في'])
  })

  it('keeps misspellings out of Arabic typing tests and the daily challenge', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const run = newRun({ ...DEFAULT_CONFIG, words: 100, list: 3000, punctuation: seed % 2 === 0 }, 'ar', seeded(seed))
      for (const w of run.words) expect(fixArabicWord(w)).toBe(w)
    }
    for (const day of ['2026-01-01', '2026-10-17', '2027-03-09']) {
      for (const w of dailyChallenge('ar', day).words) expect(fixArabicWord(w)).toBe(w)
    }
  })
})
