import type { Lang } from '@/types'
import type { EngineKeyEvent, KeyOp } from './replay'
import { wpm, type ResultInput } from './metrics'
import { stripMarks, stripTashkeel } from './text'

// The typing state machine a UI renders. Framework-agnostic: feed it keys with a
// timestamp, read an immutable snapshot (useSyncExternalStore-friendly).

export type StopOnError = 'off' | 'letter' | 'word'
export type LetterState = 'untyped' | 'correct' | 'incorrect' | 'extra' | 'missed'

export interface LetterView {
  /** the target letter (the typed letter for extras) */
  char: string
  state: LetterState
  /** what was typed here, set when incorrect */
  typed?: string
  /** typed wrong at some point, now right (Monkeytype's dotted "corrected" underline) */
  corrected?: boolean
}

export interface WordView {
  target: string
  typed: string
  letters: LetterView[]
  committed: boolean
  everWrong: boolean
  /** typed === target */
  correct: boolean
}

export interface SessionSnapshot {
  /** bumps on every change */
  version: number
  words: WordView[]
  wordIndex: number
  /** caret position inside the current word (= typed length) */
  charIndex: number
  started: boolean
  finished: boolean
  /** `now` of the first keystroke */
  startedAt: number | null
  /** time from the first keystroke to the last change (or to the end) */
  elapsedMs: number
}

export interface SessionOptions {
  lang: Lang
  /** 'letter': wrong keys don't advance; 'word': can't leave a word until it is right */
  stopOnError?: StopOnError
  /** time mode: the run ends this many ms after the first keystroke */
  timeLimitMs?: number
  /** backspace at the start of a word goes back into the previous word if it was wrong (default true) */
  allowBackspaceIntoPrevWord?: boolean
  /** accents and Arabic hamza/tashkeel don't have to be typed (ë accepts e, أ accepts ا) */
  lazy?: boolean
  /** the run also ends once the last word has as many letters as its target, even if wrong */
  quickEnd?: boolean
  /** extra letters allowed past a word's end (default 10) */
  maxExtraLetters?: number
}

interface WordState {
  target: string[]
  text: string
  typed: string[]
  /** number of typed positions that don't match (incl. extras) */
  errors: number
  committed: boolean
  everWrong: boolean
  wrongAt: boolean[]
}

const isNamedKey = (key: string) => key.length > 1 && /^[A-Z][A-Za-z0-9]*$/.test(key)
const isSpace = (ch: string) => ch === ' ' || ch === ' '

export class TypingSession {
  readonly lang: Lang
  readonly stopOnError: StopOnError
  readonly timeLimitMs: number | undefined
  readonly lazy: boolean
  readonly quickEnd: boolean
  private readonly allowBack: boolean
  private readonly maxExtra: number

  private words: WordState[] = []
  private views: WordView[] = []
  private wi = 0
  private events: EngineKeyEvent[] = []
  private startedAt: number | null = null
  private finishedAt: number | null = null
  private lastNow = 0
  private lastT = 0
  private correctKeys = 0
  private totalKeys = 0
  /** chars of committed correct words incl. their space */
  private committedCorrect = 0
  /** typed chars of committed words incl. their space */
  private committedTyped = 0
  private ver = 0
  private snap: SessionSnapshot | null = null
  private listeners = new Set<() => void>()

  constructor(words: string[], opts: SessionOptions) {
    this.lang = opts.lang
    this.stopOnError = opts.stopOnError ?? 'off'
    this.timeLimitMs = opts.timeLimitMs && opts.timeLimitMs > 0 ? opts.timeLimitMs : undefined
    this.lazy = !!opts.lazy
    this.quickEnd = !!opts.quickEnd
    this.allowBack = opts.allowBackspaceIntoPrevWord ?? true
    this.maxExtra = opts.maxExtraLetters ?? 10
    this.push(words)
  }

  /* ---------------- public API ---------------- */

  get version() {
    return this.ver
  }
  get started() {
    return this.startedAt !== null
  }
  get finished() {
    return this.finishedAt !== null
  }
  /** every keystroke so far (Backspace included), `t` relative to the first key */
  get keyEvents(): readonly EngineKeyEvent[] {
    return this.events
  }
  get wordCount() {
    return this.words.length
  }
  /** ms from the first key to the end (or to the latest key while running) */
  get durationMs() {
    if (this.startedAt === null) return 0
    return Math.max(0, (this.finishedAt ?? this.lastNow) - this.startedAt)
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /** Immutable snapshot; the same object until the next change. */
  getSnapshot = (): SessionSnapshot => {
    if (!this.snap) {
      const cur = this.words[this.wi]
      this.snap = {
        version: this.ver,
        words: this.views.slice(),
        wordIndex: this.wi,
        charIndex: cur ? cur.typed.length : 0,
        started: this.started,
        finished: this.finished,
        startedAt: this.startedAt,
        elapsedMs: this.durationMs,
      }
    }
    return this.snap
  }

  snapshot(): SessionSnapshot {
    return this.getSnapshot()
  }

  /**
   * Feed one key: a printable character (or composed text such as 'ë' or 'لا'), ' ' or
   * 'Backspace'. KeyboardEvent.key names like 'Shift' or 'Dead' are ignored.
   * Returns the recorded event, or null if the key did nothing.
   */
  input(key: string, now: number): EngineKeyEvent | null {
    if (this.finished || !this.words.length) return null
    if (this.timeUp(now)) {
      this.changed()
      return null
    }
    let ev: EngineKeyEvent | null = null
    if (key === 'Backspace') ev = this.backspace(now)
    else if (!isNamedKey(key)) {
      for (const ch of Array.from(key.normalize('NFC'))) {
        if (this.finished) break
        ev = (isSpace(ch) ? this.space(now) : this.char(ch, now)) ?? ev
      }
    }
    if (ev) this.changed()
    return ev
  }

  /** Ctrl/Alt+Backspace: clear the current word, or go back into the previous wrong word and clear it. */
  deleteWord(now: number): boolean {
    if (this.finished || !this.started) return false
    if (this.timeUp(now)) {
      this.changed()
      return false
    }
    let w = this.words[this.wi]
    if (!w.typed.length) {
      if (!this.canGoBack()) return false
      this.goBack(now)
      w = this.words[this.wi]
    }
    this.truncate(w, 0)
    this.record(now, 'delete', this.wi, 0, this.expectedAt(w, 0), 'Backspace', true)
    this.refresh(this.wi)
    this.changed()
    return true
  }

  /** Call regularly in time mode; returns true when this call ended the run. */
  tick(now: number): boolean {
    if (this.finished || !this.started) return false
    if (!this.timeUp(now)) return false
    this.changed()
    return true
  }

  /** End the run now (e.g. a "stop" button). */
  end(now: number) {
    if (this.finished) return
    if (this.startedAt === null) this.startedAt = now
    this.finishedAt = Math.max(now, this.startedAt)
    this.changed()
  }

  /** Append words (time mode keeps a buffer of words ahead of the caret). */
  addWords(words: string[]) {
    if (this.push(words)) this.changed()
  }

  /** Live wpm: correct committed words plus the current word while it is still right. */
  liveWpm(now: number): number {
    const cur = this.words[this.wi]
    let chars = this.committedCorrect
    if (cur && !cur.committed && cur.errors === 0) chars += cur.typed.length
    return wpm(chars, this.elapsed(now))
  }

  /** Live raw wpm: every typed character. */
  liveRawWpm(now: number): number {
    const cur = this.words[this.wi]
    const chars = this.committedTyped + (cur && !cur.committed ? cur.typed.length : 0)
    return wpm(chars, this.elapsed(now))
  }

  /** Keystroke accuracy so far, 0-100 (100 before the first key). */
  liveAccuracy(): number {
    return this.totalKeys ? (this.correctKeys / this.totalKeys) * 100 : 100
  }

  /** ms since the first key, capped by the time limit / end. */
  elapsed(now: number): number {
    if (this.startedAt === null) return 0
    if (this.finishedAt !== null) return this.finishedAt - this.startedAt
    const t = Math.max(0, now - this.startedAt)
    return this.timeLimitMs ? Math.min(t, this.timeLimitMs) : t
  }

  /** Data for computeResult(). */
  resultInput(): ResultInput {
    return {
      lang: this.lang,
      words: this.words.slice(0, this.wi + 1).map((w) => ({
        target: w.text,
        typed: w.typed.join(''),
        committed: w.committed,
        everWrong: w.everWrong,
      })),
      keyEvents: this.events,
      durationMs: this.durationMs,
    }
  }

  /* ---------------- internals ---------------- */

  private push(words: string[]): boolean {
    const clean = words.flatMap((w) => w.normalize('NFC').split(/\s+/)).filter(Boolean)
    for (const word of clean) {
      const text = this.lazy ? stripTashkeel(word) : word
      if (!text) continue
      const w: WordState = { target: Array.from(text), text, typed: [], errors: 0, committed: false, everWrong: false, wrongAt: [] }
      this.words.push(w)
      this.views.push(this.view(w))
    }
    return clean.length > 0
  }

  private changed() {
    this.ver++
    this.snap = null
    for (const fn of this.listeners) fn()
  }

  private timeUp(now: number): boolean {
    if (!this.timeLimitMs || this.startedAt === null || this.finishedAt !== null) return false
    if (now - this.startedAt < this.timeLimitMs) return false
    this.finishedAt = this.startedAt + this.timeLimitMs
    this.lastNow = this.finishedAt
    return true
  }

  private start(now: number) {
    if (this.startedAt === null) this.startedAt = now
  }

  private matches(expected: string, typed: string) {
    return expected === typed || (this.lazy && stripMarks(expected) === stripMarks(typed))
  }

  private expectedAt(w: WordState, i: number) {
    return i < w.target.length ? w.target[i] : i === w.target.length ? ' ' : ''
  }

  private record(now: number, op: KeyOp, wordIndex: number, charIndex: number, expected: string, typed: string, correct: boolean) {
    const t = Math.max(this.lastT, now - (this.startedAt ?? now))
    this.lastT = t
    this.lastNow = Math.max(this.lastNow, now)
    const ev: EngineKeyEvent = { t, expected, typed, correct, wordIndex, charIndex, op }
    this.events.push(ev)
    if (typed !== 'Backspace') {
      this.totalKeys++
      if (correct) this.correctKeys++
    }
    return ev
  }

  private char(ch: string, now: number): EngineKeyEvent | null {
    const w = this.words[this.wi]
    const i = w.typed.length
    const len = w.target.length
    const expected = this.expectedAt(w, i)
    const ok = i < len && this.matches(w.target[i], ch)
    if (!ok && this.stopOnError === 'letter') {
      this.start(now)
      this.markWrong(w, i)
      return this.record(now, 'blocked', this.wi, i, expected, ch, false)
    }
    if (i >= len + this.maxExtra) return null
    this.start(now)
    w.typed.push(ok ? w.target[i] : ch)
    if (!ok) {
      w.errors++
      this.markWrong(w, i)
    }
    const ev = this.record(now, 'insert', this.wi, i, expected, ch, ok)
    this.refresh(this.wi)
    if (this.wi === this.words.length - 1) {
      const done = w.typed.length === len && w.errors === 0
      if (done || (this.quickEnd && w.typed.length >= len)) this.commitAndFinish(w, now)
    }
    return ev
  }

  private space(now: number): EngineKeyEvent | null {
    const w = this.words[this.wi]
    const i = w.typed.length
    if (i === 0) return null // Monkeytype: a space at the start of a word is ignored
    const correct = w.errors === 0 && i === w.target.length
    const expected = this.expectedAt(w, i)
    if (!correct) w.everWrong = true
    if (!correct && this.stopOnError !== 'off') return this.record(now, 'blocked', this.wi, i, expected, ' ', false)
    const ev = this.record(now, 'commit', this.wi, i, expected, ' ', correct)
    if (this.wi === this.words.length - 1) this.commitAndFinish(w, now)
    else {
      this.commit(w, false)
      this.refresh(this.wi)
      this.wi++
    }
    return ev
  }

  private backspace(now: number): EngineKeyEvent | null {
    if (!this.started) return null
    const w = this.words[this.wi]
    const i = w.typed.length
    if (i > 0) {
      this.truncate(w, i - 1)
      const ev = this.record(now, 'delete', this.wi, i - 1, this.expectedAt(w, i - 1), 'Backspace', true)
      this.refresh(this.wi)
      return ev
    }
    if (!this.canGoBack()) return null
    return this.goBack(now)
  }

  private canGoBack() {
    if (!this.allowBack || this.wi === 0) return false
    const prev = this.words[this.wi - 1]
    return prev.errors > 0 || prev.typed.length !== prev.target.length
  }

  private goBack(now: number): EngineKeyEvent {
    const prev = this.words[this.wi - 1]
    prev.committed = false
    this.committedTyped -= prev.typed.length + 1
    if (prev.errors === 0 && prev.typed.length === prev.target.length) this.committedCorrect -= prev.target.length + 1
    this.wi--
    this.refresh(this.wi)
    return this.record(now, 'back', this.wi, prev.typed.length, ' ', 'Backspace', true)
  }

  private commit(w: WordState, last: boolean) {
    w.committed = true
    const space = last ? 0 : 1
    this.committedTyped += w.typed.length + space
    if (w.errors === 0 && w.typed.length === w.target.length) this.committedCorrect += w.target.length + space
  }

  private commitAndFinish(w: WordState, now: number) {
    this.commit(w, true)
    this.refresh(this.wi)
    this.finishedAt = Math.max(now, this.startedAt ?? now)
  }

  private truncate(w: WordState, n: number) {
    for (let k = n; k < w.typed.length; k++) if (k >= w.target.length || w.typed[k] !== w.target[k]) w.errors--
    w.typed.length = n
  }

  private markWrong(w: WordState, i: number) {
    w.everWrong = true
    if (i < w.target.length) w.wrongAt[i] = true
  }

  private refresh(index: number) {
    this.views[index] = this.view(this.words[index])
  }

  private view(w: WordState): WordView {
    const letters: LetterView[] = []
    const len = w.target.length
    const n = Math.max(len, w.typed.length)
    for (let i = 0; i < n; i++) {
      if (i >= len) {
        letters.push({ char: w.typed[i], state: 'extra' })
      } else if (i >= w.typed.length) {
        letters.push({ char: w.target[i], state: w.committed ? 'missed' : 'untyped' })
      } else if (w.typed[i] === w.target[i]) {
        letters.push(w.wrongAt[i] ? { char: w.target[i], state: 'correct', corrected: true } : { char: w.target[i], state: 'correct' })
      } else {
        letters.push({ char: w.target[i], state: 'incorrect', typed: w.typed[i] })
      }
    }
    const typed = w.typed.join('')
    return { target: w.text, typed, letters, committed: w.committed, everWrong: w.everWrong, correct: typed === w.text }
  }
}
