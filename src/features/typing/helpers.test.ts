import { describe, expect, it } from 'vitest'
import { TypingSession, computeResult } from '@/engine'
import type { Lang, TypingResult, WordMissStat } from '@/types'
import { buildRuns, ZWJ } from './surface/arabicRuns'
import { chartScale, niceStep, xTicks } from './result/chartScale'
import { feedbackLine, fixedWords, formatDuration, keesMood, practiseItems, practiseWords, repeatWord } from './result/feedback'
import { DEFAULT_CONFIG, configLabel, newRun, parseConfig, repeatRun } from './page/config'
import { pickTip } from './page/tips'

function run(words: string[], text: string, lang: Lang = 'nl', step = 100): TypingResult {
  const s = new TypingSession(words, { lang })
  let t = 0
  for (const ch of Array.from(text)) {
    s.input(ch === '<' ? 'Backspace' : ch, t)
    t += step
  }
  if (!s.finished) s.end(t)
  return computeResult(s)
}

describe('buildRuns (Arabic joining)', () => {
  it('merges letters with the same state into one run', () => {
    const { runs, slots } = buildRuns(Array.from('كتاب'), ['correct', 'correct', 'correct', 'correct'])
    expect(runs).toEqual([{ text: 'كتاب', state: 'correct', from: 0, to: 4 }])
    expect(slots.map((s) => [s.run, s.start, s.end])).toEqual([
      [0, 0, 1],
      [0, 1, 2],
      [0, 2, 3],
      [0, 3, 4],
    ])
  })

  it('puts a ZWJ on both sides of a boundary between joining letters', () => {
    // ك (dual) | ت (dual): joined, so ZWJ on both sides
    const { runs, slots } = buildRuns(Array.from('كتب'), ['correct', 'incorrect', 'untyped'])
    expect(runs.map((r) => r.text)).toEqual(['ك' + ZWJ, ZWJ + 'ت' + ZWJ, ZWJ + 'ب'])
    // the letter's range skips the leading ZWJ
    expect(slots[1]).toEqual({ run: 1, start: 1, end: 2 })
    expect(slots[2]).toEqual({ run: 2, start: 1, end: 2 })
  })

  it('adds no ZWJ after a right-joining letter (ا د ر و ...)', () => {
    const { runs } = buildRuns(Array.from('دار'), ['correct', 'untyped', 'untyped'])
    // د does not join forward, so no ZWJ between د and ا
    expect(runs.map((r) => r.text)).toEqual(['د', 'ار'])
  })

  it('never splits lam-alef with a ZWJ; the pair takes the more important state', () => {
    const { runs } = buildRuns(Array.from('سلام'), ['correct', 'correct', 'incorrect', 'untyped'])
    expect(runs.map((r) => [r.text, r.state])).toEqual([
      ['س' + ZWJ, 'correct'],
      [ZWJ + 'لا', 'incorrect'],
      ['م', 'untyped'],
    ])
  })
})

describe('chart scale', () => {
  it('picks nice steps', () => {
    expect(niceStep(7)).toBe(10)
    expect(niceStep(23)).toBe(25)
    expect(niceStep(0.3)).toBe(0.5)
    expect(chartScale(87)).toEqual({ max: 100, ticks: [0, 25, 50, 75, 100] })
    expect(chartScale(10).ticks).toEqual([0, 5, 10])
  })

  it('labels at most about 8 seconds and always the last one', () => {
    expect(xTicks(4)).toEqual([0, 1, 2, 3])
    const t = xTicks(30)
    expect(t.length).toBeLessThanOrEqual(9)
    expect(t[t.length - 1]).toBe(29)
    expect(xTicks(61).at(-1)).toBe(60)
    expect(xTicks(0)).toEqual([])
  })
})

describe('result feedback', () => {
  it('lists each wrong word once with a typo name, and the words to practise', () => {
    const r = run(['de', 'huis', 'is', 'huis', 'groot.'], 'de hius is hius grot.')
    const items = practiseItems(r)
    expect(items.map((i) => [i.expected, i.typed])).toEqual([
      ['huis', 'hius'],
      ['groot.', 'grot.'],
    ])
    expect(items[0].name).toMatch(/swapped/i)
    expect(practiseWords(items)).toEqual(['huis', 'groot'])
  })

  it('Kees repeats the first spelling mistake before motor slips', () => {
    const r = run(['het', 'huis', 'hij', 'wordt', 'oud'], 'het hius hij word oud')
    expect(repeatWord(practiseItems(r))).toBe('wordt')
    expect(repeatWord([])).toBeUndefined()
  })

  it('picks Kees moods from the numbers', () => {
    const base = run(['de'], 'de')
    expect(keesMood(base, true)).toBe('celebrate')
    expect(keesMood({ ...base, accuracy: 80 }, false)).toBe('oops')
    expect(keesMood({ ...base, accuracy: 60 }, false)).toBe('oops-big')
    expect(keesMood(base, false)).toBe('idle')
  })

  it('writes one plain sentence', () => {
    const clean = run(['de', 'kat'], 'de kat')
    expect(feedbackLine(clean, [])).toBe('No typos at all. Kees checked twice.')
    const fixedOne = run(['de', 'kat'], 'de kx<at')
    expect(fixedWords(fixedOne)).toEqual(['kat'])
    expect(feedbackLine(fixedOne, practiseItems(fixedOne))).toMatch(/fixed one along the way/)
    const nothing = run(['de'], '')
    expect(feedbackLine(nothing, [])).toMatch(/Nothing typed/)
    for (const line of [feedbackLine(clean, []), feedbackLine(fixedOne, [])]) {
      expect(line).not.toMatch(/!|—/)
    }
  })

  it('formats durations', () => {
    expect(formatDuration(4300)).toBe('4s')
    expect(formatDuration(65000)).toBe('1m 05s')
  })
})

describe('typing config', () => {
  it('parses anything into a valid config', () => {
    expect(parseConfig(null)).toEqual(DEFAULT_CONFIG)
    expect(parseConfig({ mode: 'time', time: 60, words: 7, list: 1000, punctuation: 'yes' })).toEqual({
      ...DEFAULT_CONFIG,
      mode: 'time',
      time: 60,
      list: 1000,
    })
  })

  it('labels configs uniquely', () => {
    expect(configLabel(DEFAULT_CONFIG)).toBe('words 25')
    expect(configLabel({ ...DEFAULT_CONFIG, mode: 'time', time: 30, list: 1000, punctuation: true })).toBe('time 30 1k punctuation')
    expect(configLabel({ ...DEFAULT_CONFIG, mode: 'quote', punctuation: true })).toBe('quote medium')
  })

  it('builds runs for every mode', () => {
    const w = newRun({ ...DEFAULT_CONFIG, words: 10 }, 'nl', () => 0.3)
    expect(w.words).toHaveLength(10)
    expect(w.timeLimitMs).toBeUndefined()
    const t = newRun({ ...DEFAULT_CONFIG, mode: 'time', time: 15 }, 'en')
    expect(t.timeLimitMs).toBe(15000)
    expect(t.words.length).toBeGreaterThanOrEqual(50)
    const q = newRun({ ...DEFAULT_CONFIG, mode: 'quote', quote: 'short' }, 'ar', () => 0.1)
    expect(q.quote?.length).toBe('short')
    expect(q.words.join(' ')).toBe(q.quote?.text)
    const again = repeatRun(q)
    expect(again.words).toEqual(q.words)
    expect(again.id).not.toBe(q.id)
  })
})

describe('tips', () => {
  it('rotates plain tips and mixes in personal ones', () => {
    const misses: Record<string, WordMissStat> = {
      wordt: { word: 'wordt', count: 4, lastAt: 1, typed: ['word'] },
    }
    // Unicode isolates around the quoted words keep Arabic words from reordering the sentence
    const tips = Array.from({ length: 9 }, (_, n) => pickTip('nl', n, misses).replace(/[\u2068\u2069]/g, ''))
    expect(tips.some((t) => t.includes('"word" for "wordt" 4 times'))).toBe(true)
    expect(new Set(tips).size).toBeGreaterThan(4)
    for (const t of tips) expect(t).not.toMatch(/!|—/)
    expect(pickTip('ar', 0)).toBeTruthy()
  })
})
