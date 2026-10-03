import { describe, expect, it } from 'vitest'
import { loadTestDictionary } from '@/test/dict'
import { normalizeTypingText } from '@/engine/text'
import { ALL_STORIES, storiesFor, storySentences } from './index'

// Names and places the dictionaries do not know (or only know capitalised differently).
const ALLOW = new Set([
  'Kees', 'Sanne', 'Riet', 'Gerrit', 'Utrecht', 'Nieuw-Zeeland', 'Zandvoort', 'Haarlem', 'Overveen',
  'Amersfoort', 'Zwolle', 'Christchurch', 'A12', 'Sam', 'Ada', 'Brooks', 'Layla', 'kea', 'sabr',
  'gezellig', 'uitwaaien', 'teh', 'Sannes', 'kerfuffle', 'Monty',
])

const words = (page: string) =>
  page
    .split(/\s+/)
    .map((w) => w.replace(/^["'(]+|["'.,:;!?؟،)]+$/g, ''))
    .filter(Boolean)

describe('stories content', () => {
  it('has enough stories per language', () => {
    expect(storiesFor('nl').length).toBeGreaterThanOrEqual(4)
    expect(storiesFor('en').length).toBeGreaterThanOrEqual(4)
    expect(storiesFor('ar').length).toBeGreaterThanOrEqual(4)
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
        // Arabic words carry their prefixes (و، ب، ال), so pages are shorter in words
        for (const c of counts) {
          expect(c, `${s.id}: ${c} words`).toBeGreaterThanOrEqual(40)
          expect(c, `${s.id}: ${c} words`).toBeLessThanOrEqual(60)
        }
        expect(total, s.id).toBeGreaterThanOrEqual(150)
        expect(total, s.id).toBeLessThanOrEqual(350)
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

  it('keeps Arabic pages to standard letters: no tashkeel, tatweel, Latin letters or digits', () => {
    for (const s of storiesFor('ar')) {
      for (const p of s.pages) {
        expect(p, s.id).not.toMatch(/[\u064B-\u0652\u0670\u0640]/)
        expect(p, s.id).not.toMatch(/[A-Za-z0-9\u0660-\u0669]/)
        // Arabic punctuation, not the Latin comma or question mark
        expect(p, s.id).not.toMatch(/[,?;]/)
      }
    }
  })

  it('names the parrot per language: Kees in Dutch, Monty in English, فستق in Arabic', () => {
    const text = (lang: 'nl' | 'en' | 'ar') => storiesFor(lang).flatMap((s) => [s.title, s.blurb, ...s.pages]).join(' ')
    expect(text('en')).not.toMatch(/Kees/)
    expect(text('en')).toMatch(/Monty/)
    expect(text('ar')).toMatch(/فستق/)
    expect(text('ar')).not.toMatch(/كيس/)
    expect(text('nl')).toMatch(/Kees/)
  })

  it('extracts whole sentences for the daily challenge', () => {
    const nl = storySentences('nl')
    expect(nl.length).toBeGreaterThan(50)
    expect(nl).toContain('Sanne werkt thuis.')
    const ar = storySentences('ar')
    expect(ar.length).toBeGreaterThan(40)
    expect(ar).toContain('يعيش فستق مع سارة في شقة صغيرة قريبة من البحر.')
  })
})
