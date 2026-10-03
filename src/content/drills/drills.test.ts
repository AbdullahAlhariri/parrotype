import { describe, expect, it } from 'vitest'
import { ALL_PACKS, PACKS, fillGap, nextPack, splitGap } from './index'
import { parseItem } from './build'
import { LANGS } from '@/types'

const BANNED = /—|unlock|supercharge|seamless|effortless|journey/i

describe('drill content', () => {
  it('has unique pack ids, prefixed with the language', () => {
    const ids = ALL_PACKS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const p of ALL_PACKS) expect(p.id.startsWith(`${p.lang}.`)).toBe(true)
  })

  it('groups packs by language', () => {
    for (const lang of LANGS) for (const p of PACKS[lang]) expect(p.lang).toBe(lang)
  })

  it('has enough items per pack (40+ for Dutch, a full round elsewhere)', () => {
    for (const p of ALL_PACKS) {
      expect(p.items.length, p.id).toBeGreaterThanOrEqual(p.lang === 'nl' ? 40 : 20)
    }
  })

  it('has a rule in English, and in the practice language for nl and ar', () => {
    for (const p of ALL_PACKS) {
      expect(p.rule.en.length, p.id).toBeGreaterThan(80)
      if (p.lang !== 'en') expect(p.rule.local?.length ?? 0, p.id).toBeGreaterThan(80)
      expect(p.title.trim(), p.id).not.toBe('')
      expect(p.blurb.trim(), p.id).not.toBe('')
    }
  })

  for (const p of ALL_PACKS) {
    describe(p.id, () => {
      it('has exactly one {{answer}} gap per sentence, matching the answer', () => {
        for (const item of p.items) {
          const gaps = [...item.sentence.matchAll(/\{\{([^{}]*)\}\}/g)]
          expect(gaps.length, item.sentence).toBe(1)
          expect(gaps[0][1], item.sentence).toBe(item.answer)
          expect(item.answer.trim(), item.sentence).toBe(item.answer)
          expect(item.answer, item.sentence).not.toBe('')
        }
      })

      it('has wrong options that differ from the right ones', () => {
        for (const item of p.items) {
          const alts = item.alternatives ?? []
          expect(alts.length, item.sentence).toBeGreaterThan(0)
          expect(new Set(alts).size, item.sentence).toBe(alts.length)
          const right = [item.answer, ...(item.accept ?? [])].map((s) => s.toLowerCase())
          for (const a of alts) expect(right, item.sentence).not.toContain(a.toLowerCase())
        }
      })

      it('has a hint for every item, local too for nl and ar', () => {
        for (const item of p.items) {
          expect(item.hint?.en, item.sentence).toBeTruthy()
          if (p.lang !== 'en') expect(item.hint?.local, item.sentence).toBeTruthy()
        }
      })

      it('has no duplicate sentences', () => {
        const seen = p.items.map((i) => fillGap(i))
        expect(new Set(seen).size).toBe(seen.length)
      })

      it('ends every sentence with punctuation and keeps the copy clean', () => {
        for (const item of p.items) {
          expect(item.sentence, item.sentence).toMatch(/[.?؟!"]$/u)
          expect(item.sentence, item.sentence).not.toMatch(BANNED)
          expect(item.sentence, item.sentence).not.toMatch(/ {2}|^ | $/)
        }
        expect(p.rule.en).not.toMatch(BANNED)
        expect(p.rule.local ?? '').not.toMatch(BANNED)
      })
    })
  }
})

describe('build helpers', () => {
  it('parses answer, wrong options and accepted variants', () => {
    const item = parseItem('{{Zij/ze|Hun|Hen}} hebben een auto.')
    expect(item.sentence).toBe('{{Zij}} hebben een auto.')
    expect(item.answer).toBe('Zij')
    expect(item.accept).toEqual(['ze'])
    expect(item.alternatives).toEqual(['Hun', 'Hen'])
  })

  it('fills and splits gaps', () => {
    const item = { sentence: 'Morgen {{wordt}} hij achttien.', answer: 'wordt' }
    expect(fillGap(item)).toBe('Morgen wordt hij achttien.')
    expect(fillGap(item, 'word')).toBe('Morgen word hij achttien.')
    expect(splitGap(item.sentence)).toEqual(['Morgen ', ' hij achttien.'])
    // a $ in the answer must not be read as a replacement pattern
    expect(fillGap({ sentence: 'a {{x}} b', answer: '$&' })).toBe('a $& b')
  })

  it('finds the next pack in the same language, wrapping around', () => {
    const nl = PACKS.nl
    expect(nextPack(nl[0].id)?.id).toBe(nl[1].id)
    expect(nextPack(nl[nl.length - 1].id)?.id).toBe(nl[0].id)
    expect(nextPack('nope')).toBeUndefined()
  })
})
