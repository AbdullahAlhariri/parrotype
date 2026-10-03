import type { Lang } from '@/types'
import type { DictationSentence, FocusInfo, MinimalPair } from './types'
import { DICTATION_NL, FOCUS_NL, PAIRS_NL } from './nl'
import { DICTATION_EN, FOCUS_EN, PAIRS_EN } from './en'
import { DICTATION_AR, FOCUS_AR, PAIRS_AR } from './ar'

export type { DictationNote, DictationLevel, DictationSentence, MinimalPair, PairSentence, FocusInfo } from './types'

export const DICTATION: Record<Lang, DictationSentence[]> = { nl: DICTATION_NL, en: DICTATION_EN, ar: DICTATION_AR }

export const PAIRS: Record<Lang, MinimalPair[]> = { nl: PAIRS_NL, en: PAIRS_EN, ar: PAIRS_AR }

/** Focus tags per language, in display order. */
export const FOCUS: Record<Lang, Record<string, FocusInfo>> = { nl: FOCUS_NL, en: FOCUS_EN, ar: FOCUS_AR }

export const dictationFor = (lang: Lang) => DICTATION[lang]
export const pairsFor = (lang: Lang) => PAIRS[lang]
