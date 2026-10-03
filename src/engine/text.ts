// Small text helpers shared by the engine modules.

const segmenter =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null

/** User-perceived characters (ë typed as e + U+0308 stays one unit). Input is NFC-normalised. */
export function graphemes(s: string): string[] {
  const text = s.normalize('NFC')
  if (!segmenter) return Array.from(text)
  const out: string[] = []
  for (const seg of segmenter.segment(text)) out.push(seg.segment)
  return out
}

/** Arabic short vowels and other optional marks (not hamza / madda, which change the letter). */
export const TASHKEEL_RE = /[ً-ْٖ-ٰٟ]/g
export const TATWEEL = 'ـ'

/** Remove Arabic tashkeel (harakat, shadda, sukun, dagger alif) and tatweel. */
export const stripTashkeel = (s: string) => s.replace(TASHKEEL_RE, '').replaceAll(TATWEEL, '')

/** Remove Latin accents (é -> e, ë -> e). Arabic letters such as أ are left alone. */
export const stripAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC')

/**
 * Remove every combining mark: Latin accents, Arabic tashkeel and the hamza/madda that
 * decompose out of أ إ آ ؤ ئ (so أ -> ا, ؤ -> و). Also drops tatweel.
 */
export const stripMarks = (s: string) =>
  s.normalize('NFD').replace(/\p{M}/gu, '').replaceAll(TATWEEL, '').normalize('NFC')

/** Typographic punctuation the user cannot easily type, mapped to keyboard characters. */
export function normalizeTypingText(text: string): string {
  return text
    .normalize('NFC')
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/…/g, '...')
    .replace(/[‐-―−]/g, '-')
    .replace(/[   ]/g, ' ')
    .replace(/[​‍‎‏⁦-⁩‪-‮﻿]/g, '')
}

/** Collapse runs of the same character: book -> bok, alllen -> alen. */
export function collapseDoubles(s: string): string {
  let out = ''
  let prev = ''
  for (const c of graphemes(s)) {
    if (c !== prev) out += c
    prev = c
  }
  return out
}

export const isLetter = (c: string) => /^\p{L}/u.test(c)

export const isArabic = (s: string) => /[؀-ۿ]/.test(s)

export const round2 = (n: number) => Math.round(n * 100) / 100
