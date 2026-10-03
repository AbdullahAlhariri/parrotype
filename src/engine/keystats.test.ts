import { describe, expect, it } from 'vitest'
import type { KeyEvent, KeyStat } from '@/types'
import { TypingSession, type SessionOptions } from './session'
import { keyStatsFromEvents, weaknesses, wilsonLower } from './keystats'

function events(words: string[], keys: (string | [string, number])[], opts: Partial<SessionOptions> = {}) {
  const s = new TypingSession(words, { lang: 'nl', ...opts })
  let t = 0
  for (const k of keys) {
    const [key, at] = typeof k === 'string' ? [k, t] : k
    t = at
    s.input(key, t)
    t += 100
  }
  return s.keyEvents
}
const chars = (text: string) => Array.from(text)

describe('keyStatsFromEvents', () => {
  it('counts first attempts per key and letter bigram, lowercased, without spaces', () => {
    const { keys, bigrams } = keyStatsFromEvents(events(['De', 'kat'], chars('De kat')))
    expect(Object.keys(keys).sort()).toEqual(['a', 'd', 'e', 'k', 't'])
    expect(keys.d).toEqual({ hits: 1, misses: 0, ms: 100 }) // first key: no interval, gets the mean
    expect(keys.a).toEqual({ hits: 1, misses: 0, ms: 100 })
    expect(Object.keys(bigrams).sort()).toEqual(['at', 'de', 'ka'])
  })

  it('ignores retries after a backspace (first attempt only)', () => {
    const { keys, bigrams } = keyStatsFromEvents(events(['kat'], ['k', 'o', 'Backspace', 'a', 't']))
    expect(keys.a).toEqual({ hits: 0, misses: 1, ms: 0 })
    expect(keys.k.hits).toBe(1)
    expect(keys.t.hits).toBe(1)
    expect(bigrams.ka).toEqual({ hits: 0, misses: 1, ms: 0 })
    expect(bigrams.at.hits).toBe(1)
  })

  it('stops counting a word after an uncorrected slip (letters are misaligned)', () => {
    const { keys } = keyStatsFromEvents(events(['hello', 'x'], chars('hlelo ')))
    expect(keys.h).toEqual({ hits: 1, misses: 0, ms: 0 }) // no valid interval in this run: latency unknown
    expect(keys.e).toEqual({ hits: 0, misses: 1, ms: 0 })
    expect(keys.l).toBeUndefined()
    expect(keys.o).toBeUndefined()
  })

  it('counts a blocked key once under stop-on-letter, then carries on', () => {
    const { keys } = keyStatsFromEvents(events(['kat'], chars('kxxat'), { stopOnError: 'letter' }))
    expect(keys.a).toEqual({ hits: 0, misses: 1, ms: 0 })
    expect(keys.t.hits).toBe(1)
  })

  it('charges the letter where space was pressed too early', () => {
    const { keys } = keyStatsFromEvents(events(['alleen', 'nu'], chars('al ')))
    expect(keys.l).toEqual({ hits: 1, misses: 1, ms: 100 })
  })

  it('replaces pauses longer than 2 s by the mean interval', () => {
    const { keys } = keyStatsFromEvents(events(['de', 'kat'], ['d', 'e', ' ', ['k', 5000], 'a', 't']))
    expect(keys.k.ms).toBe(100)
    expect(keys.e.ms).toBe(100)
  })

  it('works on plain KeyEvents without op fields', () => {
    const plain: KeyEvent[] = [
      { t: 0, expected: 'k', typed: 'k', correct: true, wordIndex: 0, charIndex: 0 },
      { t: 150, expected: 'a', typed: 's', correct: false, wordIndex: 0, charIndex: 1 },
      { t: 300, expected: 'a', typed: 'Backspace', correct: true, wordIndex: 0, charIndex: 1 },
      { t: 450, expected: 'a', typed: 'a', correct: true, wordIndex: 0, charIndex: 1 },
      { t: 600, expected: 't', typed: 't', correct: true, wordIndex: 0, charIndex: 2 },
    ]
    const { keys } = keyStatsFromEvents(plain)
    expect(keys.a).toEqual({ hits: 0, misses: 1, ms: 0 })
    expect(keys.t).toEqual({ hits: 1, misses: 0, ms: 150 })
  })
})

describe('wilsonLower', () => {
  it('is a conservative lower bound', () => {
    expect(wilsonLower(0, 0)).toBe(0)
    expect(wilsonLower(0, 50)).toBeCloseTo(0, 10)
    expect(wilsonLower(5, 10)).toBeCloseTo(0.2366, 3)
    expect(wilsonLower(20, 80)).toBeLessThan(0.25)
    expect(wilsonLower(200, 800)).toBeGreaterThan(wilsonLower(20, 80))
  })
})

const st = (hits: number, misses: number, avgMs = 150): KeyStat => ({ hits, misses, ms: hits * avgMs })

describe('weaknesses', () => {
  it('returns nothing without data', () => {
    expect(weaknesses({}, {})).toEqual([])
  })

  it('flags only keys that are confidently worse than the user average', () => {
    const keys = { a: st(95, 5), d: st(60, 20), e: st(98, 2), x: st(2, 2) }
    const weak = weaknesses(keys, {})
    expect(weak.map((w) => w.unit)).toEqual(['d'])
    expect(weak[0]).toMatchObject({ kind: 'key', samples: 80, errorRate: 0.25, avgMs: 150, weak: true })

    const all = weaknesses(keys, {}, { all: true })
    expect(all).toHaveLength(4)
    expect(all[0].unit).toBe('d')
    expect(all.find((w) => w.unit === 'x')).toMatchObject({ weak: false, samples: 4 }) // too few samples
    for (let i = 1; i < all.length; i++) expect(all[i - 1].score).toBeGreaterThanOrEqual(all[i].score)
  })

  it('also flags clearly slow keys with plenty of samples', () => {
    const keys = { a: st(100, 0, 150), s: st(100, 0, 150), d: st(100, 0, 160), f: st(100, 0, 400) }
    const weak = weaknesses(keys, {})
    expect(weak.map((w) => w.unit)).toEqual(['f'])
    expect(weak[0].avgMs).toBe(400)
  })

  it('normalises bigram latency by type: same-finger reaches are expected to be slower', () => {
    const bigrams = {
      th: st(50, 0, 240), // two hands, 1.6x the base: slow
      ed: st(50, 0, 240), // same finger reach, expected 1.65x: fine
      an: st(50, 0, 150),
      er: st(50, 0, 172),
    }
    const all = weaknesses({}, bigrams, { all: true })
    const th = all.find((w) => w.unit === 'th')!
    const ed = all.find((w) => w.unit === 'ed')!
    expect(th.score).toBeGreaterThan(ed.score)
    expect(th.kind).toBe('bigram')
  })

  it('shrinks small samples towards the overall error rate', () => {
    // same raw rate, more evidence -> higher score
    const all = weaknesses({ a: st(900, 100), q: st(9, 1), w: st(50, 50) }, {}, { all: true })
    const a = all.find((w) => w.unit === 'a')!
    const q = all.find((w) => w.unit === 'q')!
    expect(a.errorRate).toBeCloseTo(q.errorRate)
    expect(a.score).toBeGreaterThan(q.score)
  })
})
