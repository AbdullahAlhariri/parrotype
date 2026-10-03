import type { Lang, Rule } from '@/types'
import { EN_MISSPELLINGS } from '../lexicon/en/misspellings'
import { MISSPELLINGS as NL_MISSPELLINGS } from '../lexicon/nl/misspellings'
import { getRules } from '../rules'
import type { MisspellingMap } from './rank'

// Data owned by the rules engineers: the exact misspelling maps and the rule packs.

const MAPS: Record<Lang, MisspellingMap> = {
  nl: NL_MISSPELLINGS,
  en: EN_MISSPELLINGS,
  ar: new Map(),
}

/** Exact misspelling map (lowercase wrong form -> right) for a language. */
export const misspellingsFor = (lang: Lang): MisspellingMap => MAPS[lang]

/** The rule pack for a language. */
export const rulesFor = (lang: Lang): Rule[] => getRules(lang)
