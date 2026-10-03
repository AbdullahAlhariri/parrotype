import type { Lang } from '@/types'

/** A short explanation of the trap in a sentence. `local` is in the practice language (nl/ar). */
export interface DictationNote {
  en: string
  local?: string
}

export type DictationLevel = 1 | 2 | 3

export interface DictationSentence {
  /** stable id, e.g. 'nl-k02' (used for "recently seen" and stats) */
  id: string
  /** the exact target text, in standard spelling */
  text: string
  /** 1 = short with one trap, 2 = one clause plus one or two traps, 3 = long with several traps */
  level: DictationLevel
  /** focus tags (keys of FOCUS[lang]); the first one is the main trap */
  focus: string[]
  note?: DictationNote
  /** what the voice reads when it should differ from `text` (pronunciation fixes) */
  say?: string
}

/** One sentence of a minimal-pair set: `word` is the pair member that appears in it. */
export interface PairSentence {
  text: string
  word: string
}

/** Words that sound (almost) the same but are spelled differently: word/wordt, then/than. */
export interface MinimalPair {
  id: string
  lang: Lang
  /** the members, as they are written: ['word', 'wordt'] */
  words: string[]
  /** how to tell them apart */
  note: DictationNote
  sentences: PairSentence[]
}

export interface FocusInfo {
  /** chip label, lowercase */
  label: string
  /** one-line description for the chip's title attribute */
  title: string
}
