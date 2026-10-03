import type { Lang } from '@/types'
import { generateWords, sentenceToWords } from '@/engine'
import { pickQuote, type Quote, type QuoteLength } from '@/content/quotes'

export type TestMode = 'time' | 'words' | 'quote'
export type TimeOption = 15 | 30 | 60 | 120
export type WordsOption = 10 | 25 | 50 | 100
export type ListOption = 200 | 1000 | 3000

export interface TypingConfig {
  mode: TestMode
  time: TimeOption
  words: WordsOption
  quote: QuoteLength
  punctuation: boolean
  numbers: boolean
  /** top-N most common words */
  list: ListOption
}

export const TIME_OPTIONS: TimeOption[] = [15, 30, 60, 120]
export const WORDS_OPTIONS: WordsOption[] = [10, 25, 50, 100]
export const QUOTE_OPTIONS: QuoteLength[] = ['short', 'medium', 'long']
export const LIST_OPTIONS: ListOption[] = [200, 1000, 3000]
export const MODES: TestMode[] = ['time', 'words', 'quote']

// Words mode first: a fixed amount of text suits accuracy practice better than a clock.
export const DEFAULT_CONFIG: TypingConfig = {
  mode: 'words',
  time: 30,
  words: 25,
  quote: 'medium',
  punctuation: false,
  numbers: false,
  list: 200,
}

export const CONFIG_KEY = 'parrotype.typingConfig'

const oneOf = <T,>(v: unknown, options: readonly T[], fallback: T): T => (options.includes(v as T) ? (v as T) : fallback)

/** Validates anything (old versions, hand edits) into a full config. */
export function parseConfig(raw: unknown): TypingConfig {
  const o = raw && typeof raw === 'object' ? (raw as Partial<Record<keyof TypingConfig, unknown>>) : {}
  const d = DEFAULT_CONFIG
  return {
    mode: oneOf(o.mode, MODES, d.mode),
    time: oneOf(o.time, TIME_OPTIONS, d.time),
    words: oneOf(o.words, WORDS_OPTIONS, d.words),
    quote: oneOf(o.quote, QUOTE_OPTIONS, d.quote),
    punctuation: typeof o.punctuation === 'boolean' ? o.punctuation : d.punctuation,
    numbers: typeof o.numbers === 'boolean' ? o.numbers : d.numbers,
    list: oneOf(o.list, LIST_OPTIONS, d.list),
  }
}

export function loadConfig(): TypingConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    return parseConfig(raw ? JSON.parse(raw) : null)
  } catch {
    return DEFAULT_CONFIG
  }
}

export function saveConfig(c: TypingConfig) {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(c))
  } catch {
    /* private mode or blocked storage: the config just won't stick */
  }
}

export const listLabel = (n: ListOption) => (n === 200 ? '200' : `${n / 1000}k`)

/**
 * Human readable and unique per setup, used for history and personal bests:
 * "time 30", "words 25 1k punctuation", "quote medium".
 */
export function configLabel(c: TypingConfig): string {
  if (c.mode === 'quote') return `quote ${c.quote}`
  const parts: string[] = [c.mode === 'time' ? `time ${c.time}` : `words ${c.words}`]
  if (c.list !== 200) parts.push(listLabel(c.list))
  if (c.punctuation) parts.push('punctuation')
  if (c.numbers) parts.push('numbers')
  return parts.join(' ')
}

export interface Run {
  /** bumps for every new run, used as the surface's resetKey */
  id: number
  words: string[]
  quote?: Quote
  timeLimitMs?: number
}

let runId = 0

/** Words for a fresh run. Time mode starts with a buffer and asks for more as you type. */
export function newRun(c: TypingConfig, lang: Lang, rand: () => number = Math.random, prevQuote?: string): Run {
  runId++
  if (c.mode === 'quote') {
    const quote = pickQuote(lang, c.quote, rand, prevQuote)
    return { id: runId, words: sentenceToWords(quote.text), quote }
  }
  const count = c.mode === 'time' ? 100 : c.words
  const words = generateWords(lang, { count, list: c.list, punctuation: c.punctuation, numbers: c.numbers, rand })
  return { id: runId, words, timeLimitMs: c.mode === 'time' ? c.time * 1000 : undefined }
}

/** More words for time mode. */
export const moreWords = (c: TypingConfig, lang: Lang, rand: () => number = Math.random) =>
  generateWords(lang, { count: 50, list: c.list, punctuation: c.punctuation, numbers: c.numbers, rand })

/** The same words again (result screen: "Same text again"). */
export const repeatRun = (r: Run): Run => ({ ...r, id: ++runId })
