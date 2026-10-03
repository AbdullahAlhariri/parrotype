import { afterEach, describe, expect, it } from 'vitest'
import { TypingSession, computeResult } from '@/engine'
import type { Lang, TypingResult } from '@/types'
import { AGAIN_COOLDOWN_MS, isFlawless, isRough, reactionFor, resetAgainSlot, takeAgainSlot } from './result/reaction'
import { feedbackLine, practiseItems, tipGroups, type PractiseItem } from './result/feedback'
import { isLtrChar } from './surface/measure'
import { pickTip } from './page/tips'

function run(words: string[], text: string, lang: Lang = 'nl'): TypingResult {
  const s = new TypingSession(words, { lang })
  let t = 0
  for (const ch of Array.from(text)) {
    s.input(ch === '<' ? 'Backspace' : ch, t)
    t += 120
  }
  if (!s.finished) s.end(t)
  return computeResult(s)
}

const TEN = ['de', 'kat', 'zit', 'op', 'de', 'mat', 'en', 'kijkt', 'naar', 'buiten']

describe('mascot reactions on the result screen', () => {
  afterEach(() => resetAgainSlot())

  it('a personal best beats everything else', () => {
    expect(reactionFor(run(TEN, TEN.join(' ')), true)).toBe('record')
  })

  it('a flawless run needs ten words and no slip at all', () => {
    const clean = run(TEN, TEN.join(' '))
    expect(isFlawless(clean)).toBe(true)
    expect(reactionFor(clean, false)).toBe('perfect')
    // fixed along the way still counts as a slip
    const fixed = run(TEN, 'de kx<at ' + TEN.slice(2).join(' '))
    expect(isFlawless(fixed)).toBe(false)
    // nine words is too short
    expect(isFlawless(run(TEN.slice(0, 9), TEN.slice(0, 9).join(' ')))).toBe(false)
  })

  it('a rough run is under 85% accuracy over at least five typed words', () => {
    const rough = run(TEN, TEN.map((w, i) => (i < 9 ? 'x'.repeat(w.length) : w)).join(' '))
    expect(rough.accuracy).toBeLessThan(85)
    expect(isRough(rough)).toBe(true)
    expect(reactionFor(rough, false)).toBe('again')
    expect(isRough(run(['de', 'kat'], 'xx kat'))).toBe(false)
  })

  it('says "again" at most once per ten minutes', () => {
    const t0 = 1_000_000
    expect(takeAgainSlot(t0)).toBe(true)
    expect(takeAgainSlot(t0 + 60_000)).toBe(false)
    expect(takeAgainSlot(t0 + AGAIN_COOLDOWN_MS - 1)).toBe(false)
    expect(takeAgainSlot(t0 + AGAIN_COOLDOWN_MS)).toBe(true)
  })
})

describe('result copy per language', () => {
  it('names the mascot of the practice language', () => {
    expect(feedbackLine(run(['de', 'kat'], 'de kat'), [])).toMatch(/Kees/)
    expect(feedbackLine(run(['the', 'cat'], 'the cat', 'en'), [])).toMatch(/Monty/)
    expect(feedbackLine(run(['في', 'البيت'], 'في البيت', 'ar'), [])).toMatch(/Fustuq/)
  })

  it('merges typo types that share a tip, so no tip shows twice', () => {
    const tip = { en: 'Two letters overtook each other.', local: 'x' }
    const item = (expected: string, name: string): PractiseItem => ({
      expected,
      typed: expected,
      name,
      label: { kind: 'transposition', nature: 'motor', tip } as unknown as PractiseItem['label'],
    })
    const groups = tipGroups([item('huis', 'Swapped letters (one hand)'), item('kat', 'Swapped letters (two hands)'), item('mat', 'Swapped letters (one hand)')])
    expect(groups).toHaveLength(1)
    expect(groups[0]).toMatchObject({ name: 'Swapped letters', n: 3, tip: tip.en })
  })

  it('keeps real typo groups apart', () => {
    const r = run(['huis', 'wordt', 'groot'], 'hius word groot')
    const groups = tipGroups(practiseItems(r))
    expect(new Set(groups.map((g) => g.tip)).size).toBe(groups.length)
  })

  it('isolates quoted Arabic words in English tips', () => {
    const misses = { 'مدرسة': { word: 'مدرسة', count: 2, lastAt: 1, typed: ['مدرسه'] } }
    const tips = Array.from({ length: 9 }, (_, n) => pickTip('ar', n, misses))
    const personal = tips.find((t) => t.includes('مدرسة'))
    expect(personal).toBe('You typed "⁨مدرسه⁩" for "⁨مدرسة⁩" 2 times so far. Fustuq has written it in his little book.')
  })
})

describe('caret direction inside Arabic text', () => {
  it('treats digits and Latin letters as left-to-right', () => {
    expect(isLtrChar('7')).toBe(true)
    expect(isLtrChar('٣')).toBe(true)
    expect(isLtrChar('a')).toBe(true)
    expect(isLtrChar('ب')).toBe(false)
    expect(isLtrChar('،')).toBe(false)
    expect(isLtrChar('.')).toBe(false)
  })
})
