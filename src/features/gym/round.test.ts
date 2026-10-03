import { beforeEach, describe, expect, it } from 'vitest'
import { seeded } from '@/lib/random'
import { findPack, type DrillItem } from '@/content/drills'
import { chooseOptions, explain, formatClock, gapWidth, isRight, itemKey, mastery, normalizeAnswer, pickRound, reactionForRound, settledForm } from './round'
import { useGym } from './store'

const item = (sentence: string, answer: string, alternatives: string[] = [], accept?: string[]): DrillItem => ({ sentence, answer, alternatives, accept })

describe('answers', () => {
  it('normalises quotes, spaces and Arabic marks', () => {
    expect(normalizeAnswer('  auto’s ', 'nl')).toBe("auto's")
    expect(normalizeAnswer('in   plaats', 'nl')).toBe('in plaats')
    expect(normalizeAnswer('مَدْرَسَةٌ', 'ar')).toBe('مدرسة')
  })

  it('accepts the answer, variants and other capitals, nothing else', () => {
    const it1 = item('{{Zij}} hebben een auto.', 'Zij', ['Hun'], ['ze'])
    expect(isRight(it1, 'zij', 'nl')).toBe(true)
    expect(isRight(it1, 'Ze', 'nl')).toBe(true)
    expect(isRight(it1, 'Hun', 'nl')).toBe(false)
    expect(isRight(it1, '', 'nl')).toBe(false)
    const dt = item('Ik {{word}} moe.', 'word', ['wordt'])
    expect(isRight(dt, 'wordt', 'nl')).toBe(false)
    expect(isRight(dt, 'word ', 'nl')).toBe(true)
  })

  it('settles on the right spelling, keeping an accepted variant and the capital', () => {
    const it1 = item('{{Zij}} hebben een auto.', 'Zij', ['Hun'], ['ze'])
    expect(settledForm(it1, 'zij', 'nl')).toBe('Zij')
    expect(settledForm(it1, 'ze', 'nl')).toBe('Ze')
    expect(settledForm(item('Ik {{word}} moe.', 'word', ['wordt']), 'WORD', 'nl')).toBe('word')
  })

  it('keeps the hamza when checking Arabic', () => {
    const ar = item('ذهبت {{إلى}} البيت.', 'إلى', ['الى'])
    expect(isRight(ar, 'الى', 'ar')).toBe(false)
    expect(isRight(ar, 'إِلَى', 'ar')).toBe(true)
  })
})

describe('pickRound', () => {
  const pack = findPack('nl.dt')!

  it('returns 15 distinct items from the pack', () => {
    const round = pickRound(pack.items, undefined, 15, seeded(1))
    expect(round).toHaveLength(15)
    expect(new Set(round.map(itemKey)).size).toBe(15)
  })

  it('brings back missed items and prefers unknown ones over known ones', () => {
    const missedKeys = pack.items.slice(0, 3).map(itemKey)
    const known = pack.items.slice(3, 40).map(itemKey)
    const round = pickRound(pack.items, { known, missed: Object.fromEntries(missedKeys.map((k) => [k, 2])) }, 15, seeded(7))
    const keys = round.map(itemKey)
    for (const k of missedKeys) expect(keys).toContain(k)
    // 3 missed + all 10 unknown items, then 2 known ones to fill the round
    const unknown = pack.items.slice(40).map(itemKey)
    for (const k of unknown) expect(keys).toContain(k)
    expect(keys.filter((k) => known.includes(k))).toHaveLength(2)
  })

  it('never asks for more items than the pack has', () => {
    const items = [item('a {{b}}.', 'b', ['c']), item('d {{e}}.', 'e', ['f'])]
    expect(pickRound(items, undefined, 15)).toHaveLength(2)
  })
})

describe('helpers', () => {
  it('offers at most three options, including the answer', () => {
    const it3 = item('{{Their}} house.', 'Their', ['There', "They're", 'Theyre'])
    for (let s = 0; s < 20; s++) {
      const opts = chooseOptions(it3, seeded(s))
      expect(opts).toHaveLength(3)
      expect(opts).toContain('Their')
    }
    expect(chooseOptions(item('x {{y}}.', 'y'))).toEqual([])
  })

  it('sizes the gap by the longest option, not the answer', () => {
    expect(gapWidth(item('Ik {{word}} moe.', 'word', ['wordt']))).toBe(6)
    expect(gapWidth(item('Ik {{word}} moe.', 'word', ['wordt']), 'woooooooord')).toBe(12)
  })

  it('picks the explanation language with an English fallback', () => {
    expect(explain({ en: 'A', local: 'B' }, 'nl', 'local')).toEqual({ text: 'B', lang: 'nl' })
    expect(explain({ en: 'A' }, 'en', 'local')).toEqual({ text: 'A', lang: 'en' })
    expect(explain(undefined, 'nl', 'en')).toBeNull()
  })

  it('accepts a multi-word Arabic answer with extra spaces or tashkeel', () => {
    const pack = findPack('ar.common')!
    const it1 = pack.items.find((i) => i.answer === 'إن شاء')!
    expect(isRight(it1, 'إن  شاءَ', 'ar')).toBe(true)
    expect(isRight(it1, 'إنشاء', 'ar')).toBe(false)
  })

  it('shows Arabic explanations when asked, for every Arabic pack', () => {
    for (const id of ['ar.hamza', 'ar.hamza-mid', 'ar.tanween', 'ar.dhal-zay']) {
      const pack = findPack(id)!
      expect(explain(pack.rule, 'ar', 'local')?.lang).toBe('ar')
      expect(explain(pack.items[0].hint, 'ar', 'local')?.lang).toBe('ar')
      expect(explain(pack.items[0].hint, 'ar', 'en')?.lang).toBe('en')
    }
  })

  it('lets the mascot speak only for a new best or a clean round', () => {
    expect(reactionForRound(12, 15, true)).toBe('record')
    expect(reactionForRound(15, 15, false)).toBe('perfect')
    expect(reactionForRound(14, 15, false)).toBeNull()
    expect(reactionForRound(5, 5, false)).toBeNull()
  })

  it('formats the clock', () => {
    expect(formatClock(0)).toBe('0:00')
    expect(formatClock(94_500)).toBe('1:34')
  })
})

describe('gym store', () => {
  beforeEach(() => useGym.setState({ packs: {} }))
  const pack = findPack('nl.de-het')!

  it('tracks known and missed items and reports a new best', () => {
    const keys = pack.items.slice(0, 3).map(itemKey)
    expect(useGym.getState().recordRound(pack.id, [{ key: keys[0], right: true }, { key: keys[1], right: false }])).toBe(false)
    let p = useGym.getState().packs[pack.id]
    expect(p.known).toEqual([keys[0]])
    expect(p.missed).toEqual({ [keys[1]]: 1 })
    expect(mastery(pack, p.known).known).toBe(1)

    const better = useGym.getState().recordRound(pack.id, [
      { key: keys[0], right: true },
      { key: keys[1], right: true },
      { key: keys[2], right: false },
    ])
    expect(better).toBe(true)
    p = useGym.getState().packs[pack.id]
    expect(p.rounds).toBe(2)
    expect(p.best).toBe(2)
    expect(p.missed).toEqual({ [keys[2]]: 1 })
    expect(new Set(p.known)).toEqual(new Set([keys[0], keys[1]]))
  })

  it('remembers that the rule was shown', () => {
    useGym.getState().markRuleSeen(pack.id)
    expect(useGym.getState().packs[pack.id].ruleSeen).toBe(true)
  })
})
