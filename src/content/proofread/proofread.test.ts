import { describe, expect, it } from 'vitest'
import { ALL_TEXTS, TEXTS, applyFixes } from './index'
import { MARK_RE } from './build'
import { findPack } from '@/content/drills'
import { LANGS } from '@/types'
import { stripTashkeel } from '@/engine/text'

const words = (s: string) => s.split(/\s+/).filter(Boolean).length
/** Arabic packs more into a word (clitics, no separate articles), so its texts are shorter. */
const WORDS = { nl: [60, 150], en: [60, 150], ar: [50, 120] } as const
const TASHKEEL = /[\u064B-\u0652\u0670\u0640]/u

describe('Fix it content', () => {
  it('has at least 12 texts per language, with unique ids prefixed with the language', () => {
    for (const lang of LANGS) expect(TEXTS[lang].length, lang).toBeGreaterThanOrEqual(12)
    const ids = ALL_TEXTS.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const t of ALL_TEXTS) expect(t.id.startsWith(`${t.lang}-`), t.id).toBe(true)
  })

  it('has texts at every level in every language', () => {
    for (const lang of LANGS) expect(new Set(TEXTS[lang].map((t) => t.difficulty)), lang).toEqual(new Set([1, 2, 3]))
  })

  it('sorts each language from easy to hard', () => {
    for (const list of Object.values(TEXTS)) {
      const d = list.map((t) => t.difficulty)
      expect(d).toEqual([...d].sort())
    }
  })

  for (const t of ALL_TEXTS) {
    describe(t.id, () => {
      it(`is ${WORDS[t.lang][0]} to ${WORDS[t.lang][1]} words with 3 to 6 planted mistakes`, () => {
        expect(words(t.corrected)).toBeGreaterThanOrEqual(WORDS[t.lang][0])
        expect(words(t.corrected)).toBeLessThanOrEqual(WORDS[t.lang][1])
        expect(t.mistakes.length).toBeGreaterThanOrEqual(3)
        expect(t.mistakes.length).toBeLessThanOrEqual(6)
        expect([1, 2, 3]).toContain(t.difficulty)
      })

      it('turns into the corrected text when every planted fix is applied', () => {
        for (const m of t.mistakes) {
          expect(t.text.slice(m.at, m.at + m.wrong.length)).toBe(m.wrong)
          expect(t.corrected.slice(m.fixAt, m.fixAt + m.right.length)).toBe(m.right)
        }
        expect(applyFixes(t)).toBe(t.corrected)
      })

      it('has a real mistake, a note and a known drill pack for every fix', () => {
        for (const m of t.mistakes) {
          expect(m.wrong, m.rule).not.toBe(m.right)
          expect(m.wrong.trim(), m.rule).not.toBe('')
          expect(m.right.trim(), m.rule).not.toBe('')
          expect(m.ruleNote.en, m.rule).toBeTruthy()
          if (t.lang !== 'en') expect(m.ruleNote.local, m.rule).toBeTruthy()
          expect(m.title.trim(), m.rule).not.toBe('')
          if (m.pack) expect(findPack(m.pack)?.lang, m.pack).toBe(t.lang)
        }
      })

      if (t.lang === 'ar') {
        it('is plain Arabic: no tashkeel, Arabic punctuation, notes in Arabic', () => {
          expect(t.text).not.toMatch(TASHKEEL)
          expect(t.corrected).not.toMatch(/[,;?]/)
          for (const m of t.mistakes) {
            expect(m.ruleNote.local ?? '', m.rule).toMatch(/[\u0600-\u06FF]/)
            expect(m.ruleNote.local ?? '', m.rule).not.toMatch(TASHKEEL)
            expect(stripTashkeel(m.wrong), m.rule).not.toBe(m.right)
          }
        })
      }

      it('leaves no markup behind and keeps the copy clean', () => {
        expect(t.text).not.toMatch(/[[\]]/)
        expect(t.corrected).not.toMatch(/[[\]]/)
        expect(t.corrected).not.toMatch(/—| {2}/)
        expect([...t.text.matchAll(MARK_RE)]).toHaveLength(0)
      })
    })
  }
})
