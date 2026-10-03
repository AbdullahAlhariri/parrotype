import type { Lang } from '@/types'

// Small string helpers for the spell layer. Everything here is 1:1 on characters where it
// matters for offsets; lookup forms are only used for dictionary questions, never for spans.

const LIGATURE: Record<string, string> = { 'ĳ': 'ij', 'Ĳ': 'IJ' }

/** The form we ask Hunspell about: NFC, straight apostrophes and hyphens, no ĳ ligature. */
export const toLookup = (w: string) =>
  w
    .normalize('NFC')
    .replace(/[’ʼ‘`´]/g, "'")
    .replace(/[‐‑]/g, '-')
    .replace(/[ĳĲ]/g, (c) => LIGATURE[c])

const COMBINING = /[̀-ͯ]/g

/** é -> e, ë -> e. Arabic is left alone (see baseChar). */
export const stripDiacritics = (s: string) => s.normalize('NFD').replace(COMBINING, '').normalize('NFC')

const ARABIC_BASE: Record<string, string> = {
  'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ٱ': 'ا', 'ؤ': 'و', 'ئ': 'ي', 'ى': 'ي', 'ة': 'ه',
}

/** The letter without accents or hamza, lowercased: used to spot "same letter, different mark". */
export function baseChar(c: string): string {
  const a = ARABIC_BASE[c]
  if (a) return a
  return stripDiacritics(c.toLowerCase())
}

export const ARABIC_RE = /[؀-ۿݐ-ݿ]/
export const LATIN_RE = /[A-Za-zÀ-ɏ]/
const LETTER_RE = /\p{L}/u
const UPPER_RE = /\p{Lu}/u
const LOWER_RE = /\p{Ll}/u

export type CaseShape = 'lower' | 'capital' | 'upper' | 'mixed' | 'none'

/** How a word is capitalised. 'IJsland' counts as 'capital' (Dutch capitalises both letters of ij). */
export function caseShape(w: string): CaseShape {
  const letters = [...w].filter((c) => LETTER_RE.test(c))
  const cased = letters.filter((c) => UPPER_RE.test(c) || LOWER_RE.test(c))
  if (!cased.length) return 'none'
  const upper = cased.filter((c) => UPPER_RE.test(c)).length
  if (upper === 0) return 'lower'
  if (upper === cased.length) return cased.length > 1 ? 'upper' : 'capital'
  if (UPPER_RE.test(cased[0])) {
    const rest = /^ij/i.test(letters.join('')) && letters[1] === 'J' ? cased.slice(2) : cased.slice(1)
    if (rest.every((c) => !UPPER_RE.test(c))) return 'capital'
  }
  return 'mixed'
}

/** Upper-case the first letter; Dutch "ij" becomes "IJ" (IJsland, IJmuiden). */
export function capitalize(w: string, lang?: Lang): string {
  const i = [...w].findIndex((c) => LETTER_RE.test(c))
  if (i < 0) return w
  const chars = [...w]
  if (lang === 'nl' && chars[i] === 'i' && chars[i + 1] === 'j') {
    chars[i] = 'I'
    chars[i + 1] = 'J'
    return chars.join('')
  }
  chars[i] = chars[i].toUpperCase()
  return chars.join('')
}

/** Give a suggestion the casing of the word it replaces (unless it carries its own capitals). */
export function applyCase(shape: CaseShape, suggestion: string, lang: Lang): string {
  if (shape === 'upper') return suggestion.toUpperCase()
  if (shape === 'capital' && caseShape(suggestion) === 'lower') return capitalize(suggestion, lang)
  return suggestion
}

/** Put typographic apostrophes back if the user typed them. */
export const restoreApostrophe = (original: string, suggestion: string) =>
  original.includes('’') ? suggestion.replace(/'/g, '’') : suggestion

export const isVowel = (c: string | undefined, lang: Lang = 'nl') =>
  !!c && (lang === 'ar' ? 'اوي'.includes(c) : 'aeiouyáàâäéèêëíìîïóòôöúùûü'.includes(c.toLowerCase()))
