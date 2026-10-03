// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { TypingSession, computeResult } from '@/engine'
import { useStats } from '@/state/stats'
import { useNest } from '@/state/nest'
import { useSettings } from '@/state/settings'
import type { Lang, TypingResult } from '@/types'
import { recordTypingRun, countMistakes, bestKey, PB_MIN_MS } from './recordRun'

/** Type `text` into a fresh session, one key every `step` ms ('<' is backspace). */
function run(words: string[], text: string, lang: Lang = 'nl', step = 100): TypingResult {
  const s = new TypingSession(words, { lang })
  let t = 1000
  for (const ch of Array.from(text)) {
    s.input(ch === '<' ? 'Backspace' : ch, t)
    t += step
  }
  if (!s.finished) s.end(t)
  return computeResult(s)
}

beforeEach(() => {
  localStorage.clear()
  useStats.getState().clear()
  useNest.getState().clear()
  useSettings.getState().reset()
})

describe('recordTypingRun', () => {
  it('stores the session with the numbers from the result', () => {
    const r = run(['de', 'kat', 'zit'], 'de kat zit')
    const { session, isPb } = recordTypingRun(r, 'typing', 'words 10')
    expect(isPb).toBe(false)
    const stored = useStats.getState().sessions
    expect(stored).toHaveLength(1)
    expect(stored[0]).toEqual(session)
    expect(session).toMatchObject({
      mode: 'typing',
      lang: 'nl',
      config: 'words 10',
      wpm: r.wpm,
      rawWpm: r.rawWpm,
      accuracy: 100,
      consistency: r.consistency,
      chars: r.chars,
      mistakes: 0,
    })
    expect(session.durationMs).toBe(Math.round(r.durationMs))
    expect(useStats.getState().days).toHaveLength(1)
  })

  it('adds per-key and per-bigram stats', () => {
    const r = run(['kat'], 'kat')
    recordTypingRun(r, 'typing', 'words 10')
    const keys = useStats.getState().keys.nl
    expect(keys.k.hits).toBe(1)
    expect(keys.a.hits).toBe(1)
    expect(useStats.getState().bigrams.nl.ka.hits).toBe(1)
  })

  it('counts wrong keypresses as mistakes, fixed ones included', () => {
    const r = run(['huis', 'boom'], 'hiu<<uis boom')
    expect(countMistakes(r)).toBe(2)
    const { session } = recordTypingRun(r, 'typing', 'words 10')
    expect(session.mistakes).toBe(2)
    // the word was fixed, so it is not a word miss
    expect(useStats.getState().words.nl).toEqual({})
  })

  it('remembers every word left wrong with its typo kind', () => {
    const r = run(['het', 'huis', 'is', 'groot'], 'het hius is groot')
    recordTypingRun(r, 'typing', 'words 10')
    const miss = useStats.getState().words.nl.huis
    expect(miss).toMatchObject({ word: 'huis', count: 1, typed: ['hius'], kind: 'transposition' })
  })

  it('puts spelling (cognitive) mistakes in the nest with a hint, but not motor slips', () => {
    // hij word: a d/t spelling error; hius: swapped letters (motor)
    const r = run(['hij', 'wordt', 'oud', 'huis'], 'hij word oud hius')
    recordTypingRun(r, 'typing', 'words 10')
    const items = useNest.getState().items
    expect(items.map((x) => x.target)).toEqual(['wordt'])
    expect(items[0]).toMatchObject({ lang: 'nl', kind: 'word', wrong: ['word'], box: 1 })
    expect(items[0].hint && items[0].hint.length).toBeGreaterThan(10)
  })

  it('uses the local-language hint when explanations are set to local', () => {
    useSettings.getState().set('explainIn', 'local')
    const r = run(['hij', 'wordt', 'oud'], 'hij word oud')
    recordTypingRun(r, 'typing', 'words 10')
    const hint = useNest.getState().items[0]?.hint ?? ''
    expect(hint).toMatch(/[a-z]/)
    expect(hint).not.toBe('')
  })

  it('sets personal bests only in typing mode, for runs of 10 s or more', () => {
    const words = Array.from({ length: 30 }, () => 'de')
    const slow = run(words, words.join(' '), 'nl', 300) // ~26 s
    expect(slow.durationMs).toBeGreaterThanOrEqual(PB_MIN_MS)
    // the first run only establishes a best, it is not a "new" one
    expect(recordTypingRun(slow, 'typing', 'time 30').isPb).toBe(false)
    expect(useStats.getState().bests[bestKey(slow, 'time 30')]).toBe(slow.wpm)

    const fast = run(words, words.join(' '), 'nl', 150) // ~13 s, faster
    expect(fast.wpm).toBeGreaterThan(slow.wpm)
    expect(recordTypingRun(fast, 'typing', 'time 30').isPb).toBe(true)
    expect(useStats.getState().bests['nl|time 30']).toBe(fast.wpm)

    // another mode never touches bests
    const faster = run(words, words.join(' '), 'nl', 120)
    expect(recordTypingRun(faster, 'story', 'time 30').isPb).toBe(false)
    expect(useStats.getState().bests['nl|time 30']).toBe(fast.wpm)

    // a short sprint does not count
    const sprint = run(['de', 'de'], 'de de', 'nl', 50)
    expect(sprint.durationMs).toBeLessThan(PB_MIN_MS)
    recordTypingRun(sprint, 'typing', 'words 10')
    expect(useStats.getState().bests['nl|words 10']).toBeUndefined()
  })

  it('keys bests by language and config', () => {
    const r = run(['the', 'cat'], 'the cat', 'en')
    expect(bestKey(r, 'words 25 punctuation')).toBe('en|words 25 punctuation')
  })
})
