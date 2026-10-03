import { describe, expect, it } from 'vitest'
import { tokenize } from '@/engine/align'
import { loadTestDictionary } from '@/test/dict'
import { LANGS, type Lang } from '@/types'
import { DICTATION, FOCUS, PAIRS } from './index'

const MIN: Record<Lang, number> = { nl: 60, en: 50, ar: 20 }

const MISSPELT: Record<Lang, string> = { nl: 'gebeurdt', en: 'recieve', ar: 'سوأل' }

describe.each(LANGS)('dictation content %s', (lang) => {
  const list = DICTATION[lang]

  it('has enough sentences, with unique ids', () => {
    expect(list.length).toBeGreaterThanOrEqual(MIN[lang])
    const ids = new Set(list.map((s) => s.id))
    expect(ids.size).toBe(list.length)
    expect(list.every((s) => s.id.startsWith(`${lang}-`))).toBe(true)
  })

  it('covers all three levels', () => {
    for (const level of [1, 2, 3]) expect(list.some((s) => s.level === level)).toBe(true)
  })

  it('only uses known focus tags, and every tag has sentences', () => {
    const known = Object.keys(FOCUS[lang])
    for (const s of list) for (const f of s.focus) expect(known, `${s.id} uses ${f}`).toContain(f)
    for (const tag of known) expect(list.some((s) => s.focus.includes(tag)), `no sentence for ${tag}`).toBe(true)
  })

  it('has clean text: trimmed, single spaces, straight apostrophes, final punctuation', () => {
    for (const s of list) {
      expect(s.text, s.id).toBe(s.text.trim())
      expect(s.text, s.id).not.toMatch(/\s{2,}|[‘’“”]/)
      expect(s.text, s.id).toMatch(/[.?!؟]$/)
    }
  })

  it('has notes with an English text, plus a local one outside English', () => {
    for (const s of list) {
      if (!s.note) continue
      expect(s.note.en.length, s.id).toBeGreaterThan(5)
      if (lang !== 'en') expect(s.note.local, s.id).toBeTruthy()
      expect(s.note.en + (s.note.local ?? ''), s.id).not.toMatch(/—|!/)
    }
  })

  it('has minimal pairs whose sentences contain their word', () => {
    for (const p of PAIRS[lang]) {
      expect(p.words.length).toBeGreaterThanOrEqual(2)
      for (const w of p.words) expect(p.sentences.some((s) => s.word.toLowerCase() === w.toLowerCase()), `${p.id}: ${w}`).toBe(true)
      for (const s of p.sentences) {
        const words = tokenize(s.text).map((t) => t.text)
        expect(words, s.text).toContain(s.word)
        expect(p.words.map((w) => w.toLowerCase())).toContain(s.word.toLowerCase())
      }
    }
  })
})

describe('dictation spelling (Hunspell)', () => {
  it.each(LANGS)('every word of every %s sentence is in the dictionary', async (lang) => {
    const dict = await loadTestDictionary(lang)
    expect(dict.has(MISSPELT[lang]), 'the dictionary rejects a known misspelling').toBe(false)
    const texts = [...DICTATION[lang].map((s) => s.text), ...PAIRS[lang].flatMap((p) => p.sentences.map((s) => s.text))]
    const unknown = new Set<string>()
    for (const text of texts) {
      for (const t of tokenize(text)) {
        if (t.punct || /^\d+$/.test(t.text)) continue
        if (!dict.has(t.text) && !dict.has(t.text.toLowerCase())) unknown.add(t.text)
      }
    }
    expect([...unknown]).toEqual([])
  }, 60_000)
})
