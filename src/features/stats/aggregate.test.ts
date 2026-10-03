import { describe, expect, it } from 'vitest'
import type { KeyStat, NestItem, SessionRecord, WordMissStat } from '@/types'
import { dayKey } from '@/lib/id'
import {
  bestsList,
  drillHref,
  headline,
  heatShare,
  historyScale,
  historySeries,
  keyHeat,
  levelFor,
  mergeKeyStats,
  missedWords,
  mistakeKinds,
  nearestIndex,
  nestSummary,
  newestPage,
  practiceCalendar,
  practiseWordsHref,
  rolling,
  sessionsFor,
  statsForFilter,
  topRules,
  weakUnits,
  wrongVersions,
} from './aggregate'
import { ago, daysBetween, duration, durationParts, pct, signed, when } from './format'
import { nextGridIndex } from './roving'

const MIN = 60_000
const DAY = 24 * 60 * MIN
// Saturday 3 Oct 2026, 15:00 local time
const NOW = new Date(2026, 9, 3, 15, 0)

let n = 0
const run = (p: Partial<SessionRecord> = {}): SessionRecord => ({
  id: `s${n++}`,
  at: NOW.getTime(),
  mode: 'typing',
  lang: 'nl',
  durationMs: 30_000,
  config: 'time 30',
  wpm: 50,
  rawWpm: 55,
  accuracy: 95,
  consistency: 70,
  mistakes: 3,
  ...p,
})

const perLang = <T>(nl: Record<string, T>, en: Record<string, T>, ar: Record<string, T>) => ({ nl, en, ar })

describe('rolling', () => {
  it('averages the last 10 and compares with the 10 before', () => {
    const vals = [...Array(10).fill(90), ...Array(10).fill(95)]
    const r = rolling(vals)
    expect(r.value).toBe(95)
    expect(r.n).toBe(10)
    expect(r.delta).toBe(5)
    expect(r.prevN).toBe(10)
  })
  it('needs at least 5 earlier values for a delta', () => {
    expect(rolling([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]).delta).toBeNull()
    expect(rolling(Array.from({ length: 15 }, (_, i) => i)).delta).toBe(mean(5, 14) - mean(0, 4))
  })
  it('handles empty input', () => {
    expect(rolling([])).toEqual({ value: null, n: 0, delta: null, prevN: 0 })
  })
})

const mean = (a: number, b: number) => (a + b) / 2

describe('sessionsFor / headline', () => {
  it('filters by language and sorts by time', () => {
    const a = run({ at: 3, lang: 'nl' })
    const b = run({ at: 1, lang: 'en' })
    const c = run({ at: 2, lang: 'nl' })
    expect(sessionsFor([a, b, c], 'nl').map((s) => s.at)).toEqual([2, 3])
    expect(sessionsFor([a, b, c], 'all').map((s) => s.at)).toEqual([1, 2, 3])
  })

  it('counts typing runs separately from gym sessions and sums time', () => {
    const sessions = [
      run({ at: NOW.getTime() - DAY, accuracy: 90, wpm: 40 }),
      run({ at: NOW.getTime(), accuracy: 100, wpm: 60 }),
      run({ at: NOW.getTime(), mode: 'gym', wpm: undefined, accuracy: undefined, score: 8, total: 10, durationMs: 120_000 }),
    ]
    const h = headline(sessions, 'nl', [], NOW)
    expect(h.runs).toBe(2)
    expect(h.sessions).toBe(3)
    expect(h.accuracy.value).toBe(95)
    expect(h.wpm.value).toBe(50)
    expect(h.totalMs).toBe(180_000)
    expect(h.streak).toBe(2)
    expect(h.practisedToday).toBe(true)
  })

  it('uses the store day list for the all-languages streak only', () => {
    const days = [dayKey(new Date(NOW.getTime() - 2 * DAY)), dayKey(new Date(NOW.getTime() - DAY))]
    const sessions = [run({ at: NOW.getTime() })]
    expect(headline(sessions, 'all', days, NOW).streak).toBe(3)
    expect(headline(sessions, 'nl', days, NOW).streak).toBe(1)
  })
})

describe('history', () => {
  it('builds a trailing average', () => {
    const sessions = [10, 20, 30].map((v, i) => run({ at: i, wpm: v }))
    const pts = historySeries(sessions, 'wpm', 2)
    expect(pts.map((p) => p.avg)).toEqual([10, 15, 25])
  })
  it('skips sessions without the metric', () => {
    const pts = historySeries([run(), run({ wpm: undefined }), run()], 'accuracy')
    expect(pts).toHaveLength(2)
  })
  it('accuracy scale tops at 100 with clean ticks', () => {
    const pts = historySeries([run({ accuracy: 91.3 }), run({ accuracy: 98 })], 'accuracy')
    const s = historyScale(pts, 'accuracy')
    expect(s.hi).toBe(100)
    expect(s.lo).toBeLessThanOrEqual(91.3)
    expect(s.ticks[0]).toBe(s.lo)
    expect(s.ticks.at(-1)).toBe(100)
  })
  it('wpm scale wraps the data', () => {
    const pts = historySeries([run({ wpm: 42 }), run({ wpm: 71 })], 'wpm')
    const s = historyScale(pts, 'wpm')
    expect(s.lo).toBeLessThanOrEqual(42)
    expect(s.hi).toBeGreaterThanOrEqual(71)
    expect(s.ticks.every((t) => t % 5 === 0)).toBe(true)
  })
  it('nearestIndex clamps', () => {
    expect(nearestIndex(0, 10)).toBe(0)
    expect(nearestIndex(1.4, 10)).toBe(9)
    expect(nearestIndex(0.5, 3)).toBe(1)
    expect(nearestIndex(0.5, 1)).toBe(0)
  })
})

describe('practiceCalendar', () => {
  it('lays out 20 Monday-first weeks ending this week', () => {
    const cal = practiceCalendar([], NOW, 20)
    expect(cal.weeks).toHaveLength(20)
    expect(cal.weeks.every((w) => w.length === 7)).toBe(true)
    expect(cal.weeks[0][0].date.getDay()).toBe(1) // Monday
    const last = cal.weeks[19]
    expect(last.find((d) => d.today)?.key).toBe(dayKey(NOW))
    expect(last[6].future).toBe(true) // Sunday after Saturday
    expect(last[5].future).toBe(false)
  })
  it('sums minutes per day and picks levels', () => {
    const sessions = [
      run({ at: NOW.getTime(), durationMs: 10 * MIN }),
      run({ at: NOW.getTime() - 60 * MIN, durationMs: 10 * MIN }),
      run({ at: NOW.getTime() - DAY, durationMs: 20_000 }),
    ]
    const cal = practiceCalendar(sessions, NOW)
    const today = cal.weeks[19][5]
    expect(today.ms).toBe(20 * MIN)
    expect(today.runs).toBe(2)
    expect(today.level).toBe(3)
    expect(cal.weeks[19][4].level).toBe(1)
    expect(cal.activeDays).toBe(2)
    expect(cal.totalMs).toBe(20 * MIN + 20_000)
  })
  it('ignores runs outside the window', () => {
    const cal = practiceCalendar([run({ at: NOW.getTime() - 400 * DAY })], NOW)
    expect(cal.activeDays).toBe(0)
  })
  it('labels months without overlapping', () => {
    const cal = practiceCalendar([], NOW)
    const weeks = cal.months.map((m) => m.week)
    for (let i = 1; i < weeks.length; i++) expect(weeks[i] - weeks[i - 1]).toBeGreaterThanOrEqual(3)
    expect(cal.months.at(-1)?.label).toBe('Oct')
  })
  it('levels follow the minute thresholds', () => {
    expect(levelFor(0)).toBe(0)
    expect(levelFor(MIN)).toBe(1)
    expect(levelFor(5 * MIN)).toBe(2)
    expect(levelFor(15 * MIN)).toBe(3)
    expect(levelFor(45 * MIN)).toBe(4)
  })
})

describe('keys', () => {
  const ks = (hits: number, misses: number, ms = hits * 200): KeyStat => ({ hits, misses, ms })

  it('merges stats', () => {
    expect(mergeKeyStats({ a: ks(1, 1) }, { a: ks(2, 0), b: ks(1, 0) })).toEqual({ a: ks(3, 1, 600), b: ks(1, 0) })
  })

  it('all = Dutch + English on the Latin keyboard, not Arabic', () => {
    const merged = statsForFilter(perLang({ a: ks(1, 0) }, { a: ks(2, 1) }, { ب: ks(5, 0) }), 'all')
    expect(merged.a.hits).toBe(3)
    expect(merged['ب']).toBeUndefined()
  })

  it('places characters on physical keys and folds accents onto their letter', () => {
    const heat = keyHeat({ e: ks(90, 5), ë: ks(5, 5), d: ks(3, 1) }, 'qwerty-us')
    const e = heat.byCode.get('KeyE')!
    expect(e.hits).toBe(95)
    expect(e.misses).toBe(10)
    expect(e.rate).toBeCloseTo(10 / 105)
    expect(e.chars.sort()).toEqual(['e', 'ë'])
    expect(heat.byCode.get('KeyD')!.rate).toBeNull() // too few presses
    expect(heat.max).toBeCloseTo(0.1)
  })

  it('reports characters a layout cannot place', () => {
    expect(keyHeat({ ب: ks(20, 1) }, 'qwerty-us').unplaced).toEqual(['ب'])
    expect(keyHeat({ ب: ks(20, 1) }, 'arabic-101').byCode.get('KeyF')?.hits).toBe(20)
  })

  it('heatShare clamps to 0..1', () => {
    expect(heatShare(0.2, 0.1)).toBe(1)
    expect(heatShare(0.05, 0.1)).toBe(0.5)
  })

  it('weakUnits returns confident weaknesses when the gate is passed', () => {
    const keys: Record<string, KeyStat> = {}
    for (const c of 'abcdefghijklmnop') keys[c] = ks(200, 2)
    keys.d = ks(150, 50)
    const w = weakUnits(keys, { ij: ks(10, 10) }, 'nl')
    expect(w.confident).toBe(true)
    expect(w.keys[0].unit).toBe('d')
  })

  it('weakUnits falls back to the worst so far', () => {
    const w = weakUnits({ a: ks(8, 1), b: ks(9, 0) }, {}, 'nl')
    expect(w.confident).toBe(false)
    expect(w.keys.map((k) => k.unit)).toEqual(['a'])
  })

  it('drill links carry units and language', () => {
    expect(drillHref(['d', 'ij'], 'nl')).toBe('/practice?focus=d%2Cij&lang=nl')
    expect(drillHref(['d'], 'all')).toBe('/practice?focus=d')
  })
})

describe('words, rules, kinds', () => {
  const w = (word: string, count: number, typed: string[], kind?: WordMissStat['kind'], lastAt = 0): WordMissStat => ({
    word,
    count,
    typed,
    kind,
    lastAt,
  })
  const words = perLang(
    { alleen: w('alleen', 4, ['aleen', 'aleen', 'allen'], 'missed-double', 5), wordt: w('wordt', 2, ['word'], 'spelling', 9) },
    { the: w('the', 3, ['teh'], 'transposition', 1) },
    {},
  )

  it('sorts by count across languages', () => {
    expect(missedWords(words, 'all').map((x) => x.word)).toEqual(['alleen', 'the', 'wordt'])
    expect(missedWords(words, 'en').map((x) => x.lang)).toEqual(['en'])
  })

  it('dedupes wrong versions', () => {
    expect(wrongVersions(w('x', 1, ['a', 'a', 'x', 'b']))).toEqual(['a', 'b'])
  })

  it('practise link lists words and a shared language', () => {
    const list = missedWords(words, 'nl')
    expect(practiseWordsHref(list, 'nl')).toBe('/practice?words=alleen%2Cwordt&lang=nl')
    expect(practiseWordsHref(missedWords(words, 'all'), 'all')).toBe('/practice?words=alleen%2Cthe%2Cwordt')
  })

  it('weights kinds by miss count with an example each', () => {
    const rows = mistakeKinds([...missedWords(words, 'all'), { ...w('x', 1, ['y']), lang: 'nl' }])
    expect(rows.map((r) => r.kind)).toEqual(['missed-double', 'transposition', 'spelling', 'other'])
    expect(rows[0].share).toBeCloseTo(0.4)
    expect(rows[0].example).toEqual({ word: 'alleen', typed: 'aleen', lang: 'nl' })
  })

  it('ranks rules and marks which ones the gym can drill', () => {
    const rules = perLang(
      {
        'nl.dt.hij-wordt': { ruleId: 'nl.dt.hij-wordt', title: 'd/t', count: 7, lastAt: 1, examples: ['hij word'] },
        spell: { ruleId: 'spell', title: 'Spelling', count: 9, lastAt: 1, examples: ['allen'] },
      },
      { 'lt:EN_A_VS_AN': { ruleId: 'lt:EN_A_VS_AN', title: 'a/an', count: 1, lastAt: 1, examples: [] } },
      {},
    )
    const rows = topRules(rules, 'all')
    expect(rows.map((r) => [r.ruleId, r.drillable, r.spelling])).toEqual([
      ['spell', false, true],
      ['nl.dt.hij-wordt', true, false],
      ['lt:EN_A_VS_AN', false, false],
    ])
  })
})

describe('nest, pages, bests', () => {
  const item = (box: number, due: number, lang: NestItem['lang'] = 'nl'): NestItem => ({
    id: String(Math.random()),
    lang,
    kind: 'word',
    target: 'x',
    wrong: [],
    box,
    due,
    added: 0,
    reviews: 0,
    lapses: 0,
  })

  it('counts items per box and due now', () => {
    const now = 1000
    const s = nestSummary([item(1, 0), item(1, 2000), item(3, 500), item(5, 9000), item(2, 0, 'en')], 'nl', now)
    expect(s.boxes).toEqual([2, 0, 1, 0, 1])
    expect(s.due).toBe(2)
    expect(s.total).toBe(4)
    expect(s.nextDueAt).toBeNull()
    expect(nestSummary([item(1, 2000), item(2, 1500)], 'all', now).nextDueAt).toBe(1500)
  })

  it('pages newest first', () => {
    const items = Array.from({ length: 25 }, (_, i) => i)
    const p0 = newestPage(items, 0, 10)
    expect(p0.rows[0]).toBe(24)
    expect([p0.from, p0.to, p0.pages]).toEqual([1, 10, 3])
    const p2 = newestPage(items, 2, 10)
    expect(p2.rows).toEqual([4, 3, 2, 1, 0])
    expect([p2.from, p2.to]).toEqual([21, 25])
    expect(newestPage(items, 9, 10).page).toBe(2)
    expect(newestPage([], 0, 10)).toMatchObject({ rows: [], from: 0, to: 0, pages: 1 })
  })

  it('lists bests by language then config, with the date of the run', () => {
    const sessions = [run({ at: 42, config: 'time 30', wpm: 78.2 })]
    const rows = bestsList({ 'nl|time 120': 60, 'nl|time 30': 78.2, 'en|time 15': 80, 'nl|time 15': 0 }, sessions, 'all')
    expect(rows.map((r) => r.key)).toEqual(['nl|time 30', 'nl|time 120', 'en|time 15'])
    expect(rows[0].at).toBe(42)
    expect(rows[1].at).toBeNull()
    expect(bestsList({ 'nl|time 30': 70, 'en|time 15': 80 }, [], 'en').map((r) => r.config)).toEqual(['time 15'])
  })
})

describe('format', () => {
  it('formats numbers', () => {
    expect(pct(96.44)).toBe('96.4%')
    expect(signed(1.24)).toBe('+1.2')
    expect(signed(-0.76)).toBe('−0.8')
    expect(signed(0.01)).toBe('0')
    expect(signed(3, 0)).toBe('+3')
  })
  it('formats durations', () => {
    expect(duration(0)).toBe('0 min')
    expect(duration(40_000)).toBe('40 s')
    expect(duration(14 * MIN)).toBe('14 min')
    expect(duration(80 * MIN)).toBe('1 h 20 min')
    expect(durationParts(120 * MIN)).toEqual([{ value: '2', unit: 'h' }])
  })
  it('formats dates relative to now', () => {
    const now = NOW.getTime()
    expect(when(now - 30 * MIN, now)).toBe('today 14:30')
    expect(when(now - DAY, now)).toMatch(/^yesterday /)
    expect(when(now - 3 * DAY, now)).toMatch(/^Wed /)
    expect(when(new Date(2026, 8, 1).getTime(), now)).toBe('1 Sept')
    expect(when(new Date(2025, 8, 1).getTime(), now)).toBe('1 Sept 2025')
    expect(ago(now, now)).toBe('today')
    expect(ago(now - 3 * DAY, now)).toBe('3 days ago')
    expect(ago(now - 20 * DAY, now)).toBe('2 weeks ago')
    expect(daysBetween(new Date(2026, 9, 2, 23, 59).getTime(), new Date(2026, 9, 3, 0, 1).getTime())).toBe(1)
  })
})

describe('nextGridIndex', () => {
  // a b c
  //  d e
  const items = [
    { row: 0, x: 0 },
    { row: 0, x: 1 },
    { row: 0, x: 2 },
    { row: 1, x: 0.5 },
    { row: 1, x: 1.6 },
  ]
  it('moves within a row', () => {
    expect(nextGridIndex(items, 0, 'ArrowRight')).toBe(1)
    expect(nextGridIndex(items, 2, 'ArrowRight')).toBe(2)
    expect(nextGridIndex(items, 2, 'ArrowLeft')).toBe(1)
    expect(nextGridIndex(items, 1, 'Home')).toBe(0)
    expect(nextGridIndex(items, 0, 'End')).toBe(2)
  })
  it('moves between rows to the nearest x', () => {
    expect(nextGridIndex(items, 2, 'ArrowDown')).toBe(4)
    expect(nextGridIndex(items, 3, 'ArrowUp')).toBe(0)
    expect(nextGridIndex(items, 4, 'ArrowDown')).toBe(4)
  })
})
