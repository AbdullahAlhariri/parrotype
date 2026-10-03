import { describe, expect, it } from 'vitest'
import { findPrompt, promptsFor, randomPrompt, PROMPT_KINDS } from './index'
import type { Lang } from '@/types'

const MIN: Record<Lang, number> = { nl: 30, en: 30, ar: 12 }

describe('writing prompts', () => {
  for (const lang of ['nl', 'en', 'ar'] as Lang[]) {
    const all = promptsFor(lang)

    it(`${lang}: has enough prompts`, () => {
      expect(all.length).toBeGreaterThanOrEqual(MIN[lang])
    })

    it(`${lang}: ids are unique and well formed`, () => {
      const ids = all.map((p) => p.id)
      expect(new Set(ids).size).toBe(ids.length)
      for (const p of all) {
        expect(p.id).toMatch(new RegExp(`^${lang}-p\\d{2}$`))
        expect(p.lang).toBe(lang)
      }
    })

    it(`${lang}: every prompt has text, a sane length and a known kind`, () => {
      const kinds = new Set(PROMPT_KINDS.map((k) => k.id))
      for (const p of all) {
        expect(p.text.trim().length).toBeGreaterThan(10)
        expect(p.words).toBeGreaterThanOrEqual(50)
        expect(p.words).toBeLessThanOrEqual(300)
        expect(kinds.has(p.kind)).toBe(true)
        expect(p.text).not.toMatch(/—/) // no em dashes in copy
      }
    })

    it(`${lang}: trap prompts say what to watch`, () => {
      const traps = all.filter((p) => p.kind === 'trap')
      expect(traps.length).toBeGreaterThan(0)
      for (const p of traps) expect(p.watch).toBeTruthy()
    })
  }

  it('nl and en cover every kind', () => {
    for (const lang of ['nl', 'en'] as Lang[]) {
      for (const k of PROMPT_KINDS) expect(promptsFor(lang, k.id).length).toBeGreaterThan(0)
    }
  })

  it('findPrompt resolves ids across languages', () => {
    expect(findPrompt('nl-p33')?.text).toContain('gebeurd')
    expect(findPrompt('en-p01')?.lang).toBe('en')
    expect(findPrompt('xx-p01')).toBeUndefined()
    expect(findPrompt(undefined)).toBeUndefined()
  })

  it('randomPrompt never repeats the current one and respects the kind', () => {
    let seed = 1
    const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
    for (let i = 0; i < 50; i++) {
      const p = randomPrompt('nl', 'trap', 'nl-p33', rand)
      expect(p.id).not.toBe('nl-p33')
      expect(p.kind).toBe('trap')
    }
  })
})
