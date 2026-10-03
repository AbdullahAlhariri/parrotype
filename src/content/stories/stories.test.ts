import { describe, expect, it } from 'vitest'
import { loadTestDictionary } from '@/test/dict'
import { normalizeTypingText } from '@/engine/text'
import { ALL_STORIES, storiesFor, storySentences } from './index'

// Names and places the dictionaries do not know (or only know capitalised differently).
const ALLOW = new Set([
  'Kees', 'Sanne', 'Riet', 'Gerrit', 'Utrecht', 'Nieuw-Zeeland', 'Zandvoort', 'Haarlem', 'Overveen',
  'Amersfoort', 'Zwolle', 'Christchurch', 'A12', 'Sam', 'Ada', 'Brooks', 'Layla', 'kea', 'sabr',
  'gezellig', 'uitwaaien', 'teh', 'Sannes', 'kerfuffle',
])

const words = (page: string) =>
  page
    .split(/\s+/)
    .map((w) => w.replace(/^["'(]+|["'.,:;!?؟،)]+$/g, ''))
    .filter(Boolean)

describe('stories content', () => {
  it('has enough stories per language', () => {
    expect(storiesFor('nl').length).toBeGreaterThanOrEqual(4)
    expect(storiesFor('en').length).toBeGreaterThanOrEqual(3)
    expect(storiesFor('ar').length).toBeGreaterThanOrEqual(1)
  })

  it('has unique ids and matching langs', () => {
    const ids = ALL_STORIES.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const s of ALL_STORIES) expect(s.id.startsWith(s.lang + '-')).toBe(true)
  })

  it('keeps pages typable: plain quotes, single spaces, no em dashes', () => {
    for (const s of ALL_STORIES) {
      for (const p of s.pages) {
        expect(p).toBe(normalizeTypingText(p))
        expect(p).toBe(p.trim())
        expect(p).not.toMatch(/\s{2,}/)
        expect(p).not.toMatch(/[—–…“”‘’]/)
      }
    }
  })

  it('keeps pages and stories at the intended length', () => {
    for (const s of ALL_STORIES) {
      const counts = s.pages.map((p) => words(p).length)
      const total = counts.reduce((a, b) => a + b, 0)
      if (s.lang === 'ar') {
        for (const c of counts) expect(c).toBeGreaterThanOrEqual(20)
        continue
      }
      for (const c of counts) {
        expect(c, `${s.id}: ${c} words`).toBeGreaterThanOrEqual(45)
        expect(c, `${s.id}: ${c} words`).toBeLessThanOrEqual(70)
      }
      expect(total).toBeGreaterThanOrEqual(300)
      expect(total).toBeLessThanOrEqual(450)
    }
  })

  it.each(['nl', 'en', 'ar'] as const)('spells every %s word right (Hunspell)', async (lang) => {
    const dict = await loadTestDictionary(lang)
    const unknown: string[] = []
    for (const s of storiesFor(lang)) {
      for (const p of s.pages) {
        for (const w of words(p)) {
          if (ALLOW.has(w) || /^\d+$/.test(w) || w.length === 1) continue
          const lower = w.toLowerCase()
          if (!dict.has(w) && !dict.has(lower)) unknown.push(`${s.id}: ${w}`)
        }
      }
    }
    expect(unknown).toEqual([])
  }, 30_000)

  it('extracts whole sentences for the daily challenge', () => {
    const nl = storySentences('nl')
    expect(nl.length).toBeGreaterThan(50)
    expect(nl).toContain('Sanne werkt thuis.')
  })
})
