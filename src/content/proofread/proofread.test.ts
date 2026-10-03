import { describe, expect, it } from 'vitest'
import { ALL_TEXTS, TEXTS, applyFixes } from './index'
import { MARK_RE } from './build'
import { findPack } from '@/content/drills'

const words = (s: string) => s.split(/\s+/).filter(Boolean).length

describe('Fix it content', () => {
  it('has at least 12 texts per language, with unique ids', () => {
    expect(TEXTS.nl.length).toBeGreaterThanOrEqual(12)
    expect(TEXTS.en.length).toBeGreaterThanOrEqual(12)
    const ids = ALL_TEXTS.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('sorts each language from easy to hard', () => {
    for (const list of Object.values(TEXTS)) {
      const d = list.map((t) => t.difficulty)
      expect(d).toEqual([...d].sort())
    }
  })

  for (const t of ALL_TEXTS) {
    describe(t.id, () => {
      it('is 60 to 150 words with 3 to 6 planted mistakes', () => {
        expect(words(t.corrected)).toBeGreaterThanOrEqual(60)
        expect(words(t.corrected)).toBeLessThanOrEqual(150)
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
          if (t.lang === 'nl') expect(m.ruleNote.local, m.rule).toBeTruthy()
          expect(m.title.trim(), m.rule).not.toBe('')
          if (m.pack) expect(findPack(m.pack)?.lang, m.pack).toBe(t.lang)
        }
      })

      it('leaves no markup behind and keeps the copy clean', () => {
        expect(t.text).not.toMatch(/[[\]]/)
        expect(t.corrected).not.toMatch(/[[\]]/)
        expect(t.corrected).not.toMatch(/—| {2}/)
        expect([...t.text.matchAll(MARK_RE)]).toHaveLength(0)
      })
    })
  }
})
