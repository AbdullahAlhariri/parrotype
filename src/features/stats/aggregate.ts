import type { KeyStat, Lang, Mode, NestItem, RuleHitStat, SessionRecord, TypoKind, WordMissStat } from '@/types'
import { LANGS } from '@/types'
import { dayKey } from '@/lib/id'
import { currentStreak } from '@/state/stats'
import { keyOf, layoutFor, type LayoutId } from '@/engine/keyboard'
import { weaknesses, type Weakness } from '@/engine/keystats'
import { gymPackFor, ruleMark, type GymPack } from './gym'
import { shortDate } from './format'

// Pure helpers that turn the stats store into what the stats page draws.
// Everything here takes `now` as an argument so it can be tested.

export type LangFilter = Lang | 'all'
export type PerLang<T> = Record<Lang, T>

export const LANG_FILTERS: LangFilter[] = ['all', ...LANGS]

export const isLangFilter = (v: string | null | undefined): v is LangFilter => !!v && (LANG_FILTERS as string[]).includes(v)

export const matchesLang = (filter: LangFilter, lang: Lang) => filter === 'all' || filter === lang

/** Sessions for a language, oldest first. */
export function sessionsFor(sessions: readonly SessionRecord[], filter: LangFilter): SessionRecord[] {
  const out = sessions.filter((s) => matchesLang(filter, s.lang))
  for (let i = 1; i < out.length; i++) {
    if (out[i].at < out[i - 1].at) return out.sort((a, b) => a.at - b.at)
  }
  return out
}

/** A typing run: something with both a speed and a keystroke accuracy (not gym answers). */
export const isTypingRun = (s: SessionRecord) =>
  typeof s.wpm === 'number' && Number.isFinite(s.wpm) && typeof s.accuracy === 'number' && Number.isFinite(s.accuracy)

export const mean = (xs: readonly number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

/* ------------------------------------------------------------------ */
/* Headline                                                             */
/* ------------------------------------------------------------------ */

export interface RollingMetric {
  /** average of the last `size` values (null when there are none) */
  value: number | null
  /** how many values went into `value` */
  n: number
  /** value minus the average of the `size` values before them (null if too few) */
  delta: number | null
  prevN: number
}

/** Average of the last `size` values and the change against the `size` before them. */
export function rolling(values: readonly number[], size = 10, minPrev = 5): RollingMetric {
  const last = values.slice(-size)
  const prev = values.slice(Math.max(0, values.length - 2 * size), Math.max(0, values.length - size))
  const value = last.length ? mean(last) : null
  const delta = value !== null && prev.length >= minPrev ? value - mean(prev) : null
  return { value, n: last.length, delta, prevN: prev.length }
}

export interface Headline {
  accuracy: RollingMetric
  wpm: RollingMetric
  raw: RollingMetric
  consistency: RollingMetric
  /** mistakes per typing run, last 10 */
  mistakes: RollingMetric
  streak: number
  totalMs: number
  runs: number
  sessions: number
  firstAt: number | null
  practisedToday: boolean
}

const daysOf = (sessions: readonly SessionRecord[]) => [...new Set(sessions.map((s) => dayKey(new Date(s.at))))]

/**
 * Headline numbers for the filtered sessions. `days` is the store's day list; it outlives
 * trimmed sessions, so it is merged in for the all-languages streak.
 */
export function headline(sessions: readonly SessionRecord[], filter: LangFilter, days: readonly string[], now = new Date()): Headline {
  const runs = sessions.filter(isTypingRun)
  const pick = (f: (s: SessionRecord) => number | undefined) => runs.map(f).filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  const sessionDays = daysOf(sessions)
  const streakDays = filter === 'all' ? [...new Set([...days, ...sessionDays])] : sessionDays
  return {
    accuracy: rolling(pick((s) => s.accuracy)),
    wpm: rolling(pick((s) => s.wpm)),
    raw: rolling(pick((s) => s.rawWpm)),
    consistency: rolling(pick((s) => s.consistency)),
    mistakes: rolling(pick((s) => s.mistakes)),
    streak: currentStreak(streakDays, now),
    totalMs: sessions.reduce((a, s) => a + (s.durationMs > 0 ? s.durationMs : 0), 0),
    runs: runs.length,
    sessions: sessions.length,
    firstAt: sessions.length ? sessions[0].at : null,
    practisedToday: streakDays.includes(dayKey(now)),
  }
}

/* ------------------------------------------------------------------ */
/* History chart                                                        */
/* ------------------------------------------------------------------ */

export type HistoryMetric = 'accuracy' | 'wpm'

export interface HistoryPoint {
  value: number
  /** trailing average over the last `window` runs, this one included */
  avg: number
  session: SessionRecord
}

export function historySeries(sessions: readonly SessionRecord[], metric: HistoryMetric, window = 10): HistoryPoint[] {
  const runs = sessions.filter(isTypingRun)
  const out: HistoryPoint[] = []
  let sum = 0
  for (let i = 0; i < runs.length; i++) {
    const v = runs[i][metric] as number
    sum += v
    if (i >= window) sum -= runs[i - window][metric] as number
    out.push({ value: v, avg: sum / Math.min(i + 1, window), session: runs[i] })
  }
  return out
}

export interface Scale {
  lo: number
  hi: number
  ticks: number[]
}

/** Y range and tick marks for the history chart. Accuracy tops out at 100; wpm starts near the data. */
export function historyScale(points: readonly HistoryPoint[], metric: HistoryMetric): Scale {
  if (!points.length) return metric === 'accuracy' ? { lo: 80, hi: 100, ticks: [80, 90, 100] } : { lo: 0, hi: 60, ticks: [0, 20, 40, 60] }
  let min = Infinity
  let max = -Infinity
  for (const p of points) {
    min = Math.min(min, p.value, p.avg)
    max = Math.max(max, p.value, p.avg)
  }
  if (metric === 'accuracy') {
    const span = 100 - min
    const step = span <= 8 ? 2 : span <= 20 ? 5 : span <= 50 ? 10 : 20
    const lo = Math.max(0, Math.floor((min - step / 2) / step) * step)
    return { lo, hi: 100, ticks: range(lo, 100, step) }
  }
  const span = Math.max(max - min, 10)
  const step = span <= 20 ? 5 : span <= 50 ? 10 : span <= 120 ? 20 : 50
  const lo = Math.max(0, Math.floor((min - step / 2) / step) * step)
  const hi = Math.ceil((max + step / 2) / step) * step
  return { lo, hi, ticks: range(lo, hi, step) }
}

const range = (lo: number, hi: number, step: number) => {
  const out: number[] = []
  for (let v = lo; v <= hi + 1e-9; v += step) out.push(Math.round(v * 100) / 100)
  return out
}

/** Index of the point nearest to a fractional x position (0..1) across `n` points. */
export const nearestIndex = (frac: number, n: number) => (n <= 1 ? 0 : Math.min(n - 1, Math.max(0, Math.round(frac * (n - 1)))))

/* ------------------------------------------------------------------ */
/* Practice calendar                                                    */
/* ------------------------------------------------------------------ */

export type Level = 0 | 1 | 2 | 3 | 4

/** Minutes per day for each level: under 5, 5 to 15, 15 to 30, 30 and more. */
export const LEVEL_MINUTES = [5, 15, 30] as const

export interface CalendarDay {
  key: string
  date: Date
  ms: number
  runs: number
  level: Level
  /** after today: drawn as an empty slot */
  future: boolean
  today: boolean
}

export interface CalendarData {
  /** weeks oldest first; each week Monday to Sunday */
  weeks: CalendarDay[][]
  /** month label at the week where that month starts */
  months: { label: string; week: number }[]
  activeDays: number
  totalMs: number
}

export function levelFor(ms: number): Level {
  if (ms <= 0) return 0
  const min = ms / 60000
  if (min < LEVEL_MINUTES[0]) return 1
  if (min < LEVEL_MINUTES[1]) return 2
  if (min < LEVEL_MINUTES[2]) return 3
  return 4
}

const monthFmt = new Intl.DateTimeFormat('en-GB', { month: 'short' })

/** The last `weeks` weeks (Monday first, this week last) with practice time per day. */
export function practiceCalendar(sessions: readonly SessionRecord[], now = new Date(), weeks = 20): CalendarData {
  const perDay = new Map<string, { ms: number; runs: number }>()
  for (const s of sessions) {
    const k = dayKey(new Date(s.at))
    const cur = perDay.get(k) ?? { ms: 0, runs: 0 }
    cur.ms += Math.max(0, s.durationMs)
    cur.runs++
    perDay.set(k, cur)
  }
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayKey = dayKey(today)
  const weekday = (today.getDay() + 6) % 7 // Monday = 0
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - weekday - (weeks - 1) * 7)

  const out: CalendarDay[][] = []
  const months: CalendarData['months'] = []
  let activeDays = 0
  let totalMs = 0
  for (let w = 0; w < weeks; w++) {
    const week: CalendarDay[] = []
    for (let d = 0; d < 7; d++) {
      // building from y/m/d keeps days correct across DST changes
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + d)
      const key = dayKey(date)
      const future = date > today
      const v = future ? undefined : perDay.get(key)
      const ms = v?.ms ?? 0
      if (v) {
        activeDays++
        totalMs += ms
      }
      week.push({ key, date, ms, runs: v?.runs ?? 0, level: v ? (Math.max(1, levelFor(ms)) as Level) : 0, future, today: key === todayKey })
    }
    const first = week.find((x) => x.date.getDate() === 1)
    if (w === 0 || first) {
      months.push({ label: monthFmt.format((first ?? week[0]).date), week: w })
    }
    out.push(week)
  }
  // drop the opening label when the next month starts right after it (they would overlap)
  if (months.length > 1 && months[1].week - months[0].week < 3) months.shift()
  return { weeks: out, months, activeDays, totalMs }
}

/* ------------------------------------------------------------------ */
/* Keys                                                                 */
/* ------------------------------------------------------------------ */

export function mergeKeyStats(...maps: Record<string, KeyStat>[]): Record<string, KeyStat> {
  const out: Record<string, KeyStat> = {}
  for (const m of maps) {
    for (const [k, v] of Object.entries(m ?? {})) {
      const cur = out[k] ?? { hits: 0, misses: 0, ms: 0 }
      out[k] = { hits: cur.hits + v.hits, misses: cur.misses + v.misses, ms: cur.ms + v.ms }
    }
  }
  return out
}

/** Physical layout for a filter. "all" shows the Latin keyboard (Dutch and English together). */
export const layoutForFilter = (filter: LangFilter): LayoutId => (filter === 'all' ? layoutFor('nl') : layoutFor(filter))

/** Key or bigram stats for a filter; "all" merges the languages that share the Latin keyboard. */
export function statsForFilter(perLang: PerLang<Record<string, KeyStat>>, filter: LangFilter): Record<string, KeyStat> {
  if (filter !== 'all') return perLang[filter] ?? {}
  const layout = layoutForFilter('all')
  return mergeKeyStats(...LANGS.filter((l) => layoutFor(l) === layout).map((l) => perLang[l] ?? {}))
}

/** Presses a key needs before its miss rate is shown (the same bar weaknesses() uses). */
export const MIN_KEY_SAMPLES = 20

export interface KeyHeat {
  code: string
  hits: number
  misses: number
  /** summed ms of correct presses */
  ms: number
  /** characters that landed on this key, e.g. ['e', 'ë', 'é'] */
  chars: string[]
  /** miss rate 0..1, or null with too few presses to say */
  rate: number | null
}

export interface HeatMap {
  byCode: Map<string, KeyHeat>
  /** top of the colour scale (miss rate), at least 5% */
  max: number
  /** characters with stats that this layout cannot place */
  unplaced: string[]
}

/**
 * Per physical key miss rates. Characters typed with a dead key or Shift count towards
 * the key of their letter (ë and E both land on E).
 */
export function keyHeat(keys: Record<string, KeyStat>, layout: LayoutId, minSamples = MIN_KEY_SAMPLES): HeatMap {
  const byCode = new Map<string, KeyHeat>()
  const unplaced: string[] = []
  for (const [char, st] of Object.entries(keys)) {
    if (char === ' ') continue
    const pos = keyOf(char, layout)
    if (!pos || pos.row > 3) {
      if (st.hits + st.misses > 0) unplaced.push(char)
      continue
    }
    const cur = byCode.get(pos.code) ?? { code: pos.code, hits: 0, misses: 0, ms: 0, chars: [], rate: null }
    cur.hits += st.hits
    cur.misses += st.misses
    cur.ms += st.ms
    cur.chars.push(char)
    byCode.set(pos.code, cur)
  }
  let max = 0
  for (const h of byCode.values()) {
    const n = h.hits + h.misses
    h.rate = n >= minSamples ? h.misses / n : null
    if (h.rate !== null) max = Math.max(max, h.rate)
  }
  return { byCode, max: Math.max(0.05, Math.ceil(max * 100) / 100), unplaced }
}

/** 0..1 position of a miss rate on the heat scale. */
export const heatShare = (rate: number, max: number) => (max > 0 ? Math.min(1, Math.max(0, rate / max)) : 0)

export interface WeakUnits {
  keys: Weakness[]
  bigrams: Weakness[]
  /** true when these passed the statistical gate; false = just the worst so far */
  confident: boolean
}

/** Weakest keys and letter pairs. Falls back to "worst so far" when nothing is clearly weak yet. */
export function weakUnits(keys: Record<string, KeyStat>, bigrams: Record<string, KeyStat>, filter: LangFilter, limit = 5): WeakUnits {
  const layout = layoutForFilter(filter)
  const lang = filter === 'all' ? 'nl' : filter
  const weak = weaknesses(keys, bigrams, { lang, layout })
  const split = (list: Weakness[]) => ({
    keys: list.filter((w) => w.kind === 'key' && w.unit.trim()).slice(0, limit),
    bigrams: list.filter((w) => w.kind === 'bigram').slice(0, limit),
  })
  if (weak.length) return { ...split(weak), confident: true }
  const loose = weaknesses(keys, bigrams, { lang, layout, all: true }).filter((w) => w.errorRate > 0 && w.samples >= 5)
  return { ...split(loose), confident: false }
}

/** Units the focus drill accepts: letters only, one or two of them, at most 5 (see practice/drill.ts). */
export const DRILL_MAX = 5
const isDrillable = (unit: string) => /^\p{L}{1,2}$/u.test(unit.toLowerCase())

/** The weakest letters and pairs to drill, keys and pairs mixed by weakness score. */
export function drillUnits(w: Pick<WeakUnits, 'keys' | 'bigrams'>, max = DRILL_MAX): string[] {
  const out: string[] = []
  for (const u of [...w.keys, ...w.bigrams].sort((a, b) => b.score - a.score)) {
    const unit = u.unit.toLowerCase()
    if (isDrillable(unit) && !out.includes(unit)) out.push(unit)
    if (out.length >= max) break
  }
  return out
}

/**
 * The practice language a link from the stats page should switch to. The practice pages read
 * the language from settings, not from the URL. "all" keeps the current language unless it is
 * Arabic, because the merged keyboard and word lists there are Dutch and English.
 */
export function practiceLangFor(filter: LangFilter, current: Lang): Lang {
  if (filter !== 'all') return filter
  return current === 'ar' ? 'nl' : current
}

/** The link that starts a drill on these keys / pairs. */
export function drillHref(units: readonly string[], filter: LangFilter): string {
  const q = new URLSearchParams({ focus: units.join(',') })
  if (filter !== 'all') q.set('lang', filter)
  return `/practice?${q.toString()}`
}

/* ------------------------------------------------------------------ */
/* Words, rules, mistake kinds                                          */
/* ------------------------------------------------------------------ */

export interface MissedWord extends WordMissStat {
  lang: Lang
}

export function missedWords(words: PerLang<Record<string, WordMissStat>>, filter: LangFilter): MissedWord[] {
  const out: MissedWord[] = []
  for (const lang of LANGS) {
    if (!matchesLang(filter, lang)) continue
    for (const w of Object.values(words[lang] ?? {})) out.push({ ...w, lang })
  }
  return out.sort((a, b) => b.count - a.count || b.lastAt - a.lastAt)
}

/** Distinct wrong versions, most recent first, never the right word itself. */
export const wrongVersions = (w: WordMissStat, limit = 3) => [...new Set((w.typed ?? []).filter((t) => t && t !== w.word))].slice(0, limit)

/**
 * The words one "practise" button can take: word repair runs in a single language, so in the
 * all-languages view it takes the language with the most words in the list (ties go to `prefer`).
 */
export function practiseSet(words: readonly MissedWord[], prefer: Lang): { lang: Lang; words: MissedWord[]; mixed: boolean } {
  const counts = new Map<Lang, number>()
  for (const w of words) counts.set(w.lang, (counts.get(w.lang) ?? 0) + 1)
  let lang: Lang = words[0]?.lang ?? prefer
  for (const [l, c] of counts) {
    const best = counts.get(lang) ?? 0
    if (c > best || (c === best && l === prefer)) lang = l
  }
  return { lang, words: words.filter((w) => w.lang === lang), mixed: counts.size > 1 }
}

export function practiseWordsHref(words: readonly MissedWord[], filter: LangFilter): string {
  const q = new URLSearchParams({ words: words.map((w) => w.word).join(',') })
  const lang = filter !== 'all' ? filter : words.every((w) => w.lang === words[0]?.lang) ? words[0]?.lang : undefined
  if (lang) q.set('lang', lang)
  return `/practice?${q.toString()}`
}

export interface RuleRow extends RuleHitStat {
  lang: Lang
  /** the grammar-gym pack that drills this contrast, if there is one */
  gym: GymPack | null
  /** true when the gym has a pack for it */
  drillable: boolean
  /** spelling (wavy underline) or grammar (dashed), guessed from the id; RuleList refines it with the rule packs */
  spelling: boolean
}

export function topRules(rules: PerLang<Record<string, RuleHitStat>>, filter: LangFilter): RuleRow[] {
  const out: RuleRow[] = []
  for (const lang of LANGS) {
    if (!matchesLang(filter, lang)) continue
    for (const r of Object.values(rules[lang] ?? {})) {
      const gym = gymPackFor(r.ruleId)
      out.push({
        ...r,
        examples: r.examples ?? [],
        lang,
        gym: gym && gym.lang === lang ? gym : null,
        drillable: !!gym && gym.lang === lang,
        spelling: ruleMark(r.ruleId) === 'spell',
      })
    }
  }
  return out.sort((a, b) => b.count - a.count || b.lastAt - a.lastAt)
}

export const KIND_LABELS: Record<TypoKind | 'other', string> = {
  adjacent: 'neighbouring key',
  transposition: 'swapped letters',
  omission: 'missing letter',
  insertion: 'extra letter',
  doubling: 'wrong double',
  'missed-double': 'missed double',
  substitution: 'wrong letter',
  case: 'capitals',
  diacritic: 'accents and marks',
  space: 'spaces',
  spelling: 'spelling',
  skipped: 'skipped word',
  other: 'not labelled',
}

export interface KindRow {
  kind: TypoKind | 'other'
  label: string
  count: number
  share: number
  example?: { word: string; typed: string; lang: Lang }
}

/** How often each kind of slip happened, weighted by how many times each word was missed. */
export function mistakeKinds(words: readonly MissedWord[]): KindRow[] {
  const rows = new Map<TypoKind | 'other', KindRow>()
  let total = 0
  for (const w of words) {
    const kind = w.kind ?? 'other'
    const row = rows.get(kind) ?? { kind, label: KIND_LABELS[kind], count: 0, share: 0 }
    row.count += w.count
    const typed = wrongVersions(w, 1)[0]
    if (!row.example && typed !== undefined && typed !== '') row.example = { word: w.word, typed, lang: w.lang }
    rows.set(kind, row)
    total += w.count
  }
  const out = [...rows.values()]
  for (const r of out) r.share = total ? r.count / total : 0
  // "not labelled" always goes last
  return out.sort((a, b) => Number(a.kind === 'other') - Number(b.kind === 'other') || b.count - a.count)
}

/* ------------------------------------------------------------------ */
/* Mistake nest                                                         */
/* ------------------------------------------------------------------ */

export interface NestSummary {
  /** items per Leitner box 1..5 (index 0 = box 1) */
  boxes: number[]
  due: number
  /** due now, per language (reviews run in one language at a time) */
  dueByLang: Record<Lang, number>
  total: number
  /** when the next item comes due, if none are due now */
  nextDueAt: number | null
}

export function nestSummary(items: readonly NestItem[], filter: LangFilter, now = Date.now()): NestSummary {
  const boxes = [0, 0, 0, 0, 0]
  const dueByLang: Record<Lang, number> = { nl: 0, en: 0, ar: 0 }
  let due = 0
  let total = 0
  let next: number | null = null
  for (const it of items) {
    if (!matchesLang(filter, it.lang)) continue
    total++
    boxes[Math.min(5, Math.max(1, Math.round(it.box) || 1)) - 1]++
    if (it.due <= now) {
      due++
      if (it.lang in dueByLang) dueByLang[it.lang]++
    } else next = next === null ? it.due : Math.min(next, it.due)
  }
  return { boxes, due, dueByLang, total, nextDueAt: due ? null : next }
}

/* ------------------------------------------------------------------ */
/* Sessions table and bests                                             */
/* ------------------------------------------------------------------ */

export interface Page<T> {
  rows: T[]
  page: number
  pages: number
  from: number
  to: number
  total: number
}

/** Newest-first page `page` (0-based, clamped) of `items` (oldest first). */
export function newestPage<T>(items: readonly T[], page: number, size: number): Page<T> {
  const total = items.length
  const pages = Math.max(1, Math.ceil(total / size))
  const p = Math.min(Math.max(0, page), pages - 1)
  const end = total - p * size
  const start = Math.max(0, end - size)
  return { rows: items.slice(start, end).reverse(), page: p, pages, from: total ? p * size + 1 : 0, to: p * size + (end - start), total }
}

export interface BestRow {
  key: string
  lang: Lang | null
  config: string
  wpm: number
  /** when it was set, if the run is still in history */
  at: number | null
}

/** Personal bests ("nl|time 30" -> 78), sorted by language then config (time 15 before time 120). */
export function bestsList(bests: Record<string, number>, sessions: readonly SessionRecord[], filter: LangFilter): BestRow[] {
  const rows: BestRow[] = []
  for (const [key, wpm] of Object.entries(bests)) {
    const bar = key.indexOf('|')
    const head = bar >= 0 ? key.slice(0, bar) : ''
    const lang = (LANGS as string[]).includes(head) ? (head as Lang) : null
    const config = lang ? key.slice(bar + 1) : key
    if (filter !== 'all' && lang !== filter) continue
    if (!(wpm > 0)) continue
    let at: number | null = null
    for (let i = sessions.length - 1; i >= 0; i--) {
      const s = sessions[i]
      if (s.config === config && (lang === null || s.lang === lang) && typeof s.wpm === 'number' && Math.abs(s.wpm - wpm) < 0.5) {
        at = s.at
        break
      }
    }
    rows.push({ key, lang, config, wpm, at })
  }
  const order = (l: Lang | null) => (l === null ? 99 : LANGS.indexOf(l))
  return rows.sort((a, b) => order(a.lang) - order(b.lang) || a.config.localeCompare(b.config, 'en', { numeric: true }))
}

/**
 * The config of a session without what the mode column already says: "daily 2026-10-03" in a
 * daily row on 3 Oct is just "", "daily 2026-09-21" on another day becomes "21 Sept".
 */
export function sessionConfig(s: Pick<SessionRecord, 'mode' | 'config' | 'at'>): string {
  let c = (s.config ?? '').trim()
  for (const prefix of [MODE_LABELS[s.mode], s.mode]) {
    if (prefix && c.toLowerCase().startsWith(prefix.toLowerCase() + ' ')) {
      c = c.slice(prefix.length + 1).trim()
      break
    }
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(c)
  if (iso) return c === dayKey(new Date(s.at)) ? '' : shortDate(new Date(+iso[1], +iso[2] - 1, +iso[3]).getTime(), s.at)
  return c
}

export const MODE_LABELS: Record<Mode, string> = {
  typing: 'type',
  dictation: 'parrot says',
  write: 'write',
  gym: 'grammar gym',
  proofread: 'fix it',
  practice: 'weak spots',
  story: 'stories',
  daily: 'daily',
}
