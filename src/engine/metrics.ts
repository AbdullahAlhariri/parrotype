import type { CharCounts, KeyEvent, Lang, TypingResult, WordAttempt } from '@/types'
import type { TypingSession } from './session'
import { Replayer, opOf } from './replay'
import { classifyTypo } from './typo'
import { round2 } from './text'

// Monkeytype-compatible results: wpm, raw, accuracy, consistency, char counts and
// per-second series, computed from the final words plus the keystroke log.

/** chars / 5 / minutes */
export const wpm = (chars: number, ms: number) => (ms > 0 ? chars / 5 / (ms / 60000) : 0)

/** Monkeytype's consistency curve: 100 at cv 0, falling towards 0 as variation grows. */
export const kogasa = (cv: number) => 100 * (1 - Math.tanh(cv + cv ** 3 / 3 + cv ** 5 / 5))

export const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

/** population standard deviation (divides by n, like Monkeytype) */
export function stdDev(xs: number[]): number {
  if (!xs.length) return 0
  const m = mean(xs)
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)))
}

/** kogasa(stdDev / mean), 0 when there is no data */
export function consistency(values: number[]): number {
  const m = mean(values)
  if (!m) return 0
  const v = kogasa(stdDev(values) / m)
  return Number.isFinite(v) ? round2(v) : 0
}

export interface ResultWord {
  target: string
  typed: string
  /** false for the word the run ended in (time mode); defaults to true */
  committed?: boolean
  everWrong?: boolean
}

export interface ResultInput {
  lang: Lang
  /** words up to the last one typed; WordAttempt ({ expected, typed }) is accepted too */
  words: Array<ResultWord | WordAttempt>
  keyEvents: readonly KeyEvent[]
  durationMs: number
}

export interface CharTally {
  /** letters of exactly-right words (plus the correct prefix of an unfinished last word) */
  correctWordChars: number
  correctChars: number
  incorrectChars: number
  extraChars: number
  missedChars: number
  /** spaces between typed words */
  spaces: number
  /** spaces after correct words */
  correctSpaces: number
}

const toWord = (w: ResultWord | WordAttempt): ResultWord =>
  'target' in w ? w : { target: w.expected, typed: w.typed, committed: true, everWrong: w.everWrong }

/**
 * Monkeytype's countChars over the typed words (untyped words are skipped). A committed
 * word followed by a (still empty) word earns its space, as in Monkeytype's input history.
 */
export function countChars(words: ResultWord[]): CharTally {
  const t: CharTally = { correctWordChars: 0, correctChars: 0, incorrectChars: 0, extraChars: 0, missedChars: 0, spaces: 0, correctSpaces: 0 }
  let lastTyped = -1
  words.forEach((w, k) => {
    if (w.typed !== '') lastTyped = k
  })
  if (lastTyped < 0) return t
  const histEnd = lastTyped + 1 < words.length && words[lastTyped].committed !== false ? lastTyped + 1 : lastTyped
  words.forEach((w, k) => {
    if (w.typed === '' || k > lastTyped) return
    const last = k === histEnd
    const target = Array.from(w.target)
    const typed = Array.from(w.typed)
    if (w.typed === w.target) {
      t.correctWordChars += target.length
      t.correctChars += target.length
      if (!last) t.correctSpaces++
    } else if (typed.length >= target.length) {
      typed.forEach((ch, i) => {
        if (i >= target.length) t.extraChars++
        else if (ch === target[i]) t.correctChars++
        else t.incorrectChars++
      })
    } else {
      let correct = 0
      let incorrect = 0
      typed.forEach((ch, i) => (ch === target[i] ? correct++ : incorrect++))
      t.correctChars += correct
      t.incorrectChars += incorrect
      if (last && w.committed === false) {
        // unfinished last word: its correct prefix counts, nothing is "missed"
        if (!incorrect) t.correctWordChars += correct
      } else {
        t.missedChars += target.length - typed.length
      }
    }
    if (!last) t.spaces++
  })
  return t
}

interface Series {
  wpm: number[]
  raw: number[]
  errors: number[]
}

/**
 * Per-second series. Each full second is a bucket; a final partial second counts if it is
 * at least half a second long (its raw speed is scaled to a full second).
 */
export function perSecond(targets: string[], events: readonly KeyEvent[], durationMs: number): Series {
  const full = Math.floor(durationMs / 1000)
  const rem = durationMs - full * 1000
  const partial = rem >= 500 || (full === 0 && rem > 0)
  const buckets = full + (partial ? 1 : 0)
  const out: Series = { wpm: [], raw: [], errors: [] }
  if (!buckets) return out
  const keys = new Array<number>(buckets).fill(0)
  const errs = new Array<number>(buckets).fill(0)
  const sorted = events.slice().sort((a, b) => a.t - b.t)
  const rep = new Replayer()
  let e = 0
  for (let b = 0; b < buckets; b++) {
    const lastBucket = b === buckets - 1
    const end = lastBucket ? Infinity : (b + 1) * 1000
    while (e < sorted.length && sorted[e].t < end) {
      const ev = sorted[e++]
      rep.apply(ev)
      if (ev.typed === 'Backspace') continue
      let idx = Math.floor(ev.t / 1000)
      if (idx === buckets && ev.t === buckets * 1000) idx = buckets - 1
      if (idx >= buckets) continue // inside a dropped partial second
      keys[idx]++
      if (!ev.correct) errs[idx]++
    }
    const at = lastBucket ? durationMs : (b + 1) * 1000
    const cur = Math.min(rep.current, targets.length - 1)
    const words = targets.slice(0, cur + 1).map((target, k) => ({ target, typed: rep.text(k), committed: k < rep.current }))
    const tally = countChars(words)
    out.wpm.push(round2(wpm(tally.correctWordChars + tally.correctSpaces, at)))
  }
  for (let b = 0; b < buckets; b++) {
    const span = b === buckets - 1 && partial ? rem : 1000
    out.raw.push(Math.round(wpm(keys[b], span)))
    out.errors.push(errs[b])
  }
  return out
}

const isSession = (x: TypingSession | ResultInput): x is TypingSession =>
  typeof (x as TypingSession).resultInput === 'function'

/** Final numbers for a run, exactly the TypingResult shape. */
export function computeResult(src: TypingSession | ResultInput): TypingResult {
  const input = isSession(src) ? src.resultInput() : src
  const words = input.words.map(toWord)
  const tally = countChars(words)
  const ms = input.durationMs
  const presses = input.keyEvents.filter((e) => e.typed !== 'Backspace')
  const correctPresses = presses.filter((e) => e.correct).length
  const series = perSecond(
    words.map((w) => w.target),
    input.keyEvents,
    ms,
  )
  const chars: CharCounts = {
    correct: tally.correctChars + tally.correctSpaces,
    incorrect: tally.incorrectChars,
    extra: tally.extraChars,
    missed: tally.missedChars,
  }
  return {
    lang: input.lang,
    durationMs: ms,
    wpm: round2(wpm(tally.correctWordChars + tally.correctSpaces, ms)),
    rawWpm: round2(wpm(tally.correctChars + tally.spaces + tally.incorrectChars + tally.extraChars, ms)),
    accuracy: presses.length ? round2((correctPresses / presses.length) * 100) : 0,
    consistency: consistency(series.raw),
    chars,
    words: attempts(words, input.lang),
    keyEvents: input.keyEvents.slice(),
    wpmSeries: series.wpm,
    rawSeries: series.raw,
    errorSeries: series.errors,
  }
}

function attempts(words: ResultWord[], lang: Lang): WordAttempt[] {
  let last = -1
  words.forEach((w, k) => {
    if (w.typed !== '') last = k
  })
  const out: WordAttempt[] = []
  words.forEach((w, k) => {
    if (w.typed === '') return
    const unfinished = k === last && w.committed === false
    const correct = w.typed === w.target
    // an unfinished last word that is right so far is not a mistake
    if (unfinished && !correct && w.target.startsWith(w.typed)) return
    const attempt: WordAttempt = { expected: w.target, typed: w.typed, correct, everWrong: w.everWrong ?? !correct }
    if (!correct) {
      const compareTo = unfinished && w.typed.length < w.target.length ? Array.from(w.target).slice(0, Array.from(w.typed).length).join('') : w.target
      // the neighbouring target words sharpen the d/t diagnosis (hij wordt, ik word)
      const kind = classifyTypo(compareTo, w.typed, lang, { prev: words[k - 1]?.target, next: words[k + 1]?.target })?.kind
      if (kind) attempt.kind = kind
    }
    out.push(attempt)
  })
  return out
}

/** Soukoreff & MacKenzie style split: wrong keys that were fixed vs errors left in the text. */
export function errorStats(result: Pick<TypingResult, 'chars' | 'keyEvents'>) {
  const wrongKeys = result.keyEvents.filter((e) => e.typed !== 'Backspace' && !e.correct && opOf(e) !== 'commit').length
  const uncorrected = result.chars.incorrect + result.chars.extra + result.chars.missed
  const corrected = Math.max(0, wrongKeys - result.chars.incorrect - result.chars.extra)
  return { wrongKeys, corrected, uncorrected }
}
