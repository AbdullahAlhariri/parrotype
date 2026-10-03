import { describe, expect, it } from 'vitest'
import type { KeyEvent } from '@/types'
import { TypingSession } from './session'
import { computeResult, consistency, countChars, errorStats, kogasa, perSecond, stdDev, wpm } from './metrics'

function run(words: string[], text: string, step = 100, opts: { timeLimitMs?: number } = {}) {
  const s = new TypingSession(words, { lang: 'nl', ...opts })
  let t = 0
  for (const ch of Array.from(text)) {
    s.input(ch, t)
    t += step
  }
  return s
}

describe('helpers', () => {
  it('wpm = chars / 5 / minutes', () => {
    expect(wpm(250, 60_000)).toBe(50)
    expect(wpm(50, 30_000)).toBe(20)
    expect(wpm(10, 0)).toBe(0)
  })

  it('kogasa matches the formula', () => {
    expect(kogasa(0)).toBe(100)
    expect(kogasa(1)).toBeCloseTo(100 * (1 - Math.tanh(1 + 1 / 3 + 1 / 5)), 10)
    expect(kogasa(0.5)).toBeGreaterThan(kogasa(1))
  })

  it('uses the population standard deviation', () => {
    expect(stdDev([2, 4, 4, 4, 5, 5, 7, 9])).toBe(2)
    expect(consistency([])).toBe(0)
    expect(consistency([0, 0])).toBe(0)
    expect(consistency([60, 60, 60])).toBe(100)
  })
})

describe('countChars (Monkeytype rules)', () => {
  it('counts correct, incorrect, extra and missed', () => {
    const t = countChars([
      { target: 'kat', typed: 'kot' },
      { target: 'alleen', typed: 'al' },
      { target: 'thuis', typed: 'thuiss' },
      { target: 'nu', typed: 'nu' },
    ])
    expect(t).toEqual({
      correctWordChars: 2,
      correctChars: 2 + 2 + 5 + 2,
      incorrectChars: 1,
      extraChars: 1,
      missedChars: 4,
      spaces: 3,
      correctSpaces: 0,
    })
  })

  it('credits the correct prefix of an unfinished last word only', () => {
    expect(countChars([{ target: 'een', typed: 'een' }, { target: 'twee', typed: 'tw', committed: false }])).toMatchObject({
      correctWordChars: 5,
      correctSpaces: 1,
      missedChars: 0,
    })
    expect(countChars([{ target: 'twee', typed: 'tx', committed: false }])).toMatchObject({ correctWordChars: 0, missedChars: 0, incorrectChars: 1 })
  })

  it('gives a committed word its space when the next word is still empty', () => {
    expect(countChars([{ target: 'de', typed: 'de', committed: true }, { target: 'kat', typed: '' }])).toMatchObject({ correctWordChars: 2, correctSpaces: 1, spaces: 1 })
  })
})

describe('computeResult', () => {
  it('perfect run, hand computed', () => {
    const s = run(['de', 'kat'], 'de kat', 1000)
    const r = computeResult(s)
    expect(r.durationMs).toBe(5000)
    // 5 letters + 1 space in 5 s = 6 / 5 / (5/60) = 14.4
    expect(r.wpm).toBe(14.4)
    expect(r.rawWpm).toBe(14.4)
    expect(r.accuracy).toBe(100)
    expect(r.chars).toEqual({ correct: 6, incorrect: 0, extra: 0, missed: 0 })
    expect(r.words).toEqual([
      { expected: 'de', typed: 'de', correct: true, everWrong: false },
      { expected: 'kat', typed: 'kat', correct: true, everWrong: false },
    ])
    expect(r.rawSeries).toEqual([12, 12, 12, 12, 24])
    expect(r.wpmSeries).toEqual([12, 12, 12, 12, 14.4])
    expect(r.errorSeries).toEqual([0, 0, 0, 0, 0])
    // raw mean 14.4, sd 4.8 -> cv 1/3
    expect(r.consistency).toBeCloseTo(kogasa(1 / 3), 2)
    expect(r.keyEvents).toHaveLength(6)
    expect(r.lang).toBe('nl')
  })

  it('wrong word, hand computed', () => {
    const r = computeResult(run(['kat', 'zit'], 'kot zit'))
    expect(r.durationMs).toBe(600)
    expect(r.wpm).toBe(60) // only "zit": 3 / 5 / 0.01
    expect(r.rawWpm).toBe(140) // 5 correct + 1 incorrect + 1 space = 7
    expect(r.accuracy).toBe(71.43) // o and the space on a wrong word are wrong: 5/7
    expect(r.chars).toEqual({ correct: 5, incorrect: 1, extra: 0, missed: 0 })
    expect(r.words[0]).toMatchObject({ expected: 'kat', typed: 'kot', correct: false, everWrong: true, kind: 'substitution' })
    // shorter than a second: one bucket scaled to a full second
    expect(r.rawSeries).toEqual([140])
    expect(r.wpmSeries).toEqual([60])
    expect(r.errorSeries).toEqual([2])
    expect(r.consistency).toBe(100)
  })

  it('missed and extra letters', () => {
    const r = computeResult(run(['alleen', 'thuis', 'nu'], 'al thuiss nu'))
    expect(r.durationMs).toBe(1100)
    expect(r.wpm).toBe(21.82) // only "nu": 2 / 5 / (1.1 / 60)
    expect(r.rawWpm).toBe(130.91) // 9 correct + 2 spaces + 1 extra = 12 chars
    expect(r.accuracy).toBe(75) // early space, extra s, space after a wrong word
    expect(r.chars).toEqual({ correct: 9, incorrect: 0, extra: 1, missed: 4 })
    expect(r.words.map((w) => w.kind)).toEqual(['omission', 'doubling', undefined])
  })

  it('time mode: the unfinished last word counts its correct prefix', () => {
    const s = run(['een', 'twee', 'drie'], 'een tw', 200, { timeLimitMs: 2000 })
    s.tick(2000)
    const r = computeResult(s)
    expect(r.durationMs).toBe(2000)
    expect(r.wpm).toBe(36) // een + space + tw = 6 chars in 2 s
    expect(r.rawWpm).toBe(36)
    expect(r.chars).toEqual({ correct: 6, incorrect: 0, extra: 0, missed: 0 })
    expect(r.words).toHaveLength(1)
    expect(r.rawSeries).toEqual([60, 12])
    expect(r.wpmSeries).toEqual([60, 36])
  })

  it('backspaced errors lower accuracy but not wpm', () => {
    const s = new TypingSession(['kat'], { lang: 'nl' })
    s.input('k', 0)
    s.input('o', 100)
    s.input('Backspace', 200)
    s.input('a', 300)
    s.input('t', 400)
    const r = computeResult(s)
    expect(r.accuracy).toBe(75)
    expect(r.wpm).toBeCloseTo(wpm(3, 400), 2)
    expect(r.words[0]).toEqual({ expected: 'kat', typed: 'kat', correct: true, everWrong: true })
    expect(errorStats(r)).toEqual({ wrongKeys: 1, corrected: 1, uncorrected: 0 })
  })

  it('accepts plain data and WordAttempt lists', () => {
    const r = computeResult({
      lang: 'en',
      words: [{ expected: 'the', typed: 'teh', correct: false, everWrong: true }],
      keyEvents: [],
      durationMs: 60_000,
    })
    expect(r.wpm).toBe(0)
    expect(r.rawWpm).toBe(0.6)
    expect(r.accuracy).toBe(0)
    expect(r.words[0].kind).toBe('transposition')
  })

  it('gives the same result from a session and from its result input', () => {
    const s = run(['de', 'hond', 'blaft', 'hard'], 'de hnod blaft hrad ', 137)
    expect(computeResult(s)).toEqual(computeResult(s.resultInput()))
  })

  it('rebuilds the series from plain KeyEvents without op fields', () => {
    const s = run(['de', 'hond', 'blaft'], 'de honf', 300)
    s.input('Backspace', 2500)
    let t = 2600
    for (const ch of 'd blaft') {
      s.input(ch, t)
      t += 300
    }
    const input = s.resultInput()
    const plain: KeyEvent[] = input.keyEvents.map(({ t: tt, expected, typed, correct, wordIndex, charIndex }) => ({ t: tt, expected, typed, correct, wordIndex, charIndex }))
    const a = computeResult(input)
    const b = computeResult({ ...input, keyEvents: plain })
    expect(b.wpmSeries).toEqual(a.wpmSeries)
    expect(b.rawSeries).toEqual(a.rawSeries)
    expect(a.wpmSeries.at(-1)).toBe(a.wpm)
  })

  it('drops a final partial second shorter than half a second', () => {
    const events: KeyEvent[] = [0, 400, 900, 1200, 2100].map((t, i) => ({ t, expected: 'abcde'[i], typed: 'abcde'[i], correct: true, wordIndex: 0, charIndex: i }))
    const series = perSecond(['abcde'], events, 2200)
    expect(series.raw).toEqual([36, 12]) // the key at 2100 ms falls in the dropped 0.2 s
    expect(series.wpm).toHaveLength(2)
    expect(series.wpm[1]).toBeCloseTo(wpm(5, 2200), 2)
  })

  it('is all zeros for an empty run', () => {
    const r = computeResult(new TypingSession(['x'], { lang: 'nl' }))
    expect(r).toMatchObject({ wpm: 0, rawWpm: 0, accuracy: 0, consistency: 0, words: [], wpmSeries: [], rawSeries: [] })
  })
})

describe('review regressions', () => {
  it('labels words with their sentence context (hij eet -> hij eed is the verb rule)', () => {
    const r = computeResult(run(['hij', 'eet', 'brood'], 'hij eed brood'))
    expect(r.words[1]).toMatchObject({ expected: 'eet', typed: 'eed', correct: false, kind: 'spelling' })
    // without a subject in front it is just two sound-alike letters
    expect(computeResult(run(['eet', 'brood'], 'eed brood')).words[0].kind).toBe('substitution')
  })

  it('keeps live numbers and the result in step through backspacing into a wrong word', () => {
    const s = new TypingSession(['de', 'kat', 'zit'], { lang: 'nl' })
    let t = 0
    for (const k of ['d', 'w', ' ', 'k', 'Backspace', 'Backspace', 'Backspace', 'e', ' ', 'k', 'a', 't', ' ', 'z', 'i', 't']) s.input(k, (t += 150))
    const r = computeResult(s)
    expect(s.finished).toBe(true)
    expect(r.words.map((w) => w.correct)).toEqual([true, true, true])
    expect(r.words[0].everWrong).toBe(true)
    expect(Math.round(s.liveWpm(1e9) * 100) / 100).toBe(r.wpm)
    expect(Math.round(s.liveAccuracy() * 100) / 100).toBe(r.accuracy)
    expect(r.wpmSeries.at(-1)).toBe(r.wpm)
  })
})
