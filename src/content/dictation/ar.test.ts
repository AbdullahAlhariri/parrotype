import { describe, expect, it } from 'vitest'
import { loadTestDictionary } from '@/test/dict'
import { runRules } from '@/checker/engine'
import { arRules } from '@/checker/rules/ar'
import { DICTATION_AR, FOCUS_AR, PAIRS_AR } from './ar'

// Arabic-only checks on top of content.test.ts: parity with Dutch and English, clean letters,
// every focus tag drillable, notes in both languages, and no flags from the Arabic rule pack
// (a dictation target must never be marked wrong).

/** standard letters (no tatweel U+0640, no tashkeel U+064B+), a space, Arabic punctuation and a full stop */
const ALLOWED = /^[ء-غف-ي ،؛؟.]+$/u
const ARABIC = /[ء-ي]/u

const texts = [
  ...DICTATION_AR.map((s) => ({ where: s.id, text: s.text })),
  ...PAIRS_AR.flatMap((p) => p.sentences.map((s, i) => ({ where: `${p.id}#${i + 1}`, text: s.text }))),
]

describe('arabic dictation content', () => {
  it('is at parity: 100+ sentences spread over three levels, 8+ pair sets of 2+ sentences', () => {
    expect(DICTATION_AR.length).toBeGreaterThanOrEqual(100)
    for (const level of [1, 2, 3]) expect(DICTATION_AR.filter((s) => s.level === level).length, `level ${level}`).toBeGreaterThanOrEqual(15)
    expect(PAIRS_AR.length).toBeGreaterThanOrEqual(8)
    for (const p of PAIRS_AR) {
      expect(p.sentences.length, p.id).toBeGreaterThanOrEqual(2)
      for (const w of p.words) expect(w, p.id).toMatch(ALLOWED)
    }
  })

  it('uses standard letters and Arabic punctuation only: no tashkeel, tatweel, digits or Latin', () => {
    for (const { where, text } of texts) expect(text, where).toMatch(ALLOWED)
  })

  it('has no text twice', () => {
    const seen = new Map<string, string>()
    for (const { where, text } of texts) {
      expect(seen.get(text), `${where} repeats ${seen.get(text)}`).toBeUndefined()
      seen.set(text, where)
    }
  })

  it('makes every focus tag the main trap of at least four sentences', () => {
    for (const tag of Object.keys(FOCUS_AR)) {
      expect(DICTATION_AR.filter((s) => s.focus[0] === tag).length, tag).toBeGreaterThanOrEqual(4)
    }
  })

  it('explains every trap in English and in Arabic', () => {
    for (const s of DICTATION_AR) {
      expect(s.note, s.id).toBeDefined()
      expect(s.note?.en, s.id).toMatch(ARABIC)
      expect(s.note?.local, s.id).toMatch(ARABIC)
      expect(s.note?.local, s.id).not.toMatch(/[A-Za-z]/)
    }
    for (const p of PAIRS_AR) {
      expect(p.note.en.length, p.id).toBeGreaterThan(5)
      expect(p.note.local, p.id).toMatch(ARABIC)
      expect(p.note.local, p.id).not.toMatch(/[A-Za-z]/)
    }
  })

  it('keeps English notes readable left to right: no Arabic words split by punctuation alone', () => {
    // in an LTR line, "ثلاث سنوات: سنة is feminine" becomes one RTL run and shows سنة first;
    // an Arabic list joined by "،" or a space is fine, it reads as one Arabic phrase
    const SPLIT = /[ء-ي][^A-Za-zء-ي()]*[.:;?,+=][^A-Za-zء-ي()]*[ء-ي]/u
    // brackets right after an Arabic word, holding no Latin, pair up right to left: "و (يدعو)."
    const BRACKET = /[ء-ي]\s*\([^A-Za-z)]*\)/u
    const english = [
      ...DICTATION_AR.map((s) => ({ where: s.id, text: s.note?.en ?? '' })),
      ...PAIRS_AR.map((p) => ({ where: p.id, text: p.note.en })),
      ...Object.entries(FOCUS_AR).map(([k, f]) => ({ where: `focus ${k}`, text: f.title })),
    ]
    for (const { where, text } of english) {
      expect(text, where).not.toMatch(SPLIT)
      expect(text, where).not.toMatch(BRACKET)
    }
  })

  it('gets no flags from the Arabic rule pack, in strict mode, with and without the dictionary', async () => {
    const dict = await loadTestDictionary('ar')
    for (const { where, text } of texts) {
      for (const d of [undefined, dict]) {
        const issues = runRules(text, 'ar', arRules, { strictness: 'strict', dict: d })
        expect(issues.map((i) => `${i.ruleId}: ${i.text}`), where).toEqual([])
      }
    }
  }, 60_000)
})
