// Shared domain types. Every feature codes against these, so change them with care.

export type Lang = 'nl' | 'en' | 'ar'

export const LANGS: Lang[] = ['nl', 'en', 'ar']

export const LANG_NAMES: Record<Lang, string> = {
  nl: 'Nederlands',
  en: 'English',
  ar: 'العربية',
}

/** BCP-47 tags used for speech synthesis and `lang` attributes. */
export const LANG_TAGS: Record<Lang, string> = {
  nl: 'nl-NL',
  en: 'en-US',
  ar: 'ar-SA',
}

export const isRtl = (lang: Lang) => lang === 'ar'

/* ------------------------------------------------------------------ */
/* Typing                                                              */
/* ------------------------------------------------------------------ */

/** What kind of slip a typo was. Used to label mistakes and to pick drills. */
export type TypoKind =
  | 'adjacent' // hit a neighbouring key (fat finger)
  | 'transposition' // swapped two letters: teh -> the
  | 'omission' // left a letter out: aleen -> alleen
  | 'insertion' // extra letter: alllen
  | 'doubling' // doubled the wrong letter: bigg
  | 'missed-double' // single where a double belongs: aleen
  | 'substitution' // other wrong letter
  | 'case' // capitalisation only
  | 'diacritic' // ë vs e, أ vs ا
  | 'space' // words run together or split
  | 'spelling' // several differences, probably a spelling (knowledge) error
  | 'skipped' // word not typed at all

/** One keystroke as recorded by the typing surface. */
export interface KeyEvent {
  /** ms since the session started */
  t: number
  /** character that was expected at the caret ('' if beyond the word) */
  expected: string
  /** what was actually typed; 'Backspace' for deletions */
  typed: string
  correct: boolean
  wordIndex: number
  charIndex: number
}

/** The result of typing one target word. */
export interface WordAttempt {
  expected: string
  /** final typed text for the word (after corrections) */
  typed: string
  correct: boolean
  /** true if the word was ever wrong while typing, even if fixed later */
  everWrong: boolean
  kind?: TypoKind
}

export interface CharCounts {
  correct: number
  incorrect: number
  extra: number
  missed: number
}

/** Final numbers for one typing run (test, story page, drill...). */
export interface TypingResult {
  lang: Lang
  durationMs: number
  wpm: number
  rawWpm: number
  /** 0-100 */
  accuracy: number
  /** 0-100, higher is steadier */
  consistency: number
  chars: CharCounts
  words: WordAttempt[]
  keyEvents: KeyEvent[]
  /** wpm per second, for the result chart */
  wpmSeries: number[]
  rawSeries: number[]
  errorSeries: number[]
}

/* ------------------------------------------------------------------ */
/* Checking (spelling + grammar)                                       */
/* ------------------------------------------------------------------ */

export type IssueCategory = 'spelling' | 'grammar' | 'punctuation' | 'capitalization' | 'style' | 'typo'

export type Confidence = 'high' | 'medium' | 'low'

/** A problem found in free text, shown as an underline with an explanation. */
export interface Issue {
  /** unique within one check run */
  id: string
  /** e.g. 'nl.dt.hij-wordt', 'spell', 'lt:EN_A_VS_AN' */
  ruleId: string
  source: 'rules' | 'spell' | 'languagetool'
  lang: Lang
  category: IssueCategory
  /** UTF-16 offset into the checked text */
  offset: number
  length: number
  /** the flagged substring (text.slice(offset, offset + length)) */
  text: string
  /** short friendly message in English */
  message: string
  /** the same message in the practice language (nl/ar), optional */
  messageLocal?: string
  /** longer "why" explanation in English, optional */
  explanation?: string
  explanationLocal?: string
  /** best fix first */
  replacements: string[]
  confidence: Confidence
  /** link for more info (Taaladvies, Onze Taal, Cambridge...) */
  learnMore?: string
}

/** A token produced by the shared tokenizer (src/checker/tokenize.ts). */
export interface Token {
  text: string
  lower: string
  start: number
  end: number
  /** true for words (letters, digits, apostrophes, hyphens inside words) */
  isWord: boolean
  /** index among ALL tokens */
  index: number
}

export interface Sentence {
  start: number
  end: number
  text: string
  /** tokens in this sentence (word and non-word) */
  tokens: Token[]
}

/**
 * Word-list lookup available to rules (Hunspell-backed in the worker, a Set in tests).
 * Rules must still work (more conservatively) when it is missing.
 */
export interface Dictionary {
  /** true if the word form exists (case-insensitive for lowercase input) */
  has(word: string): boolean
}

export interface RuleContext {
  text: string
  lang: Lang
  tokens: Token[]
  /** only word tokens, in order */
  words: Token[]
  sentences: Sentence[]
  dict?: Dictionary
  /** 'strict' also runs style-level rules (groter als, een hele mooie...) */
  strictness: 'normal' | 'strict'
}

/** What a rule returns. The engine turns hits into Issues. */
export interface RuleHit {
  offset: number
  length: number
  replacements: string[]
  message: string
  messageLocal?: string
  explanation?: string
  explanationLocal?: string
  confidence?: Confidence
  learnMore?: string
}

export interface Rule {
  /** stable id, e.g. 'nl.dt.hij-wordt'. Used for stats, so never rename casually. */
  id: string
  lang: Lang
  category: IssueCategory
  /** short human title shown in stats: "d/t after hij/zij/het" */
  title: string
  /** default confidence for hits that don't set one */
  confidence: Confidence
  /** style-level rule: only runs when strictness is 'strict' */
  strictOnly?: boolean
  check(ctx: RuleContext): RuleHit[]
}

/* ------------------------------------------------------------------ */
/* Stats and history                                                   */
/* ------------------------------------------------------------------ */

export type Mode = 'typing' | 'dictation' | 'write' | 'gym' | 'proofread' | 'practice' | 'story' | 'daily'

export interface SessionRecord {
  id: string
  /** epoch ms */
  at: number
  mode: Mode
  lang: Lang
  durationMs: number
  /** human readable config, e.g. "time 30", "words 25", "d/t drill" */
  config: string
  wpm?: number
  rawWpm?: number
  accuracy?: number
  consistency?: number
  chars?: CharCounts
  /** mode-specific score, e.g. drill correct answers */
  score?: number
  total?: number
  /** number of mistakes made in this session */
  mistakes: number
}

export interface KeyStat {
  hits: number
  misses: number
  /** sum of ms between previous keystroke and this one (for speed per key) */
  ms: number
}

export interface WordMissStat {
  word: string
  count: number
  lastAt: number
  /** last few wrong versions typed */
  typed: string[]
  kind?: TypoKind
}

export interface RuleHitStat {
  ruleId: string
  title: string
  count: number
  lastAt: number
  /** last few flagged snippets */
  examples: string[]
}

/* ------------------------------------------------------------------ */
/* Mistake nest: spaced repetition of things you got wrong            */
/* ------------------------------------------------------------------ */

export interface NestItem {
  id: string
  lang: Lang
  /** 'word' = a misspelled word, 'sentence' = a sentence with a grammar trap */
  kind: 'word' | 'sentence'
  /** the correct text to practise */
  target: string
  /** wrong versions the user produced */
  wrong: string[]
  ruleId?: string
  /** optional hint/explanation shown after answering */
  hint?: string
  /** Leitner box 1..5 */
  box: number
  /** epoch ms when it is due again */
  due: number
  added: number
  reviews: number
  lapses: number
}
