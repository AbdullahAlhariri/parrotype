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
export const TASHKEEL_RE = /[\u064B-\u0652\u0656-\u065F\u0670]/g
export const TATWEEL = '\u0640'

/** Remove Arabic tashkeel (harakat, shadda, sukun, dagger alif) and tatweel. */
export const stripTashkeel = (s: string) => s.replace(TASHKEEL_RE, '').replaceAll(TATWEEL, '')

/** Remove Latin accents (é -> e, ë -> e). Arabic letters such as أ are left alone. */
export const stripAccents = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036F]/g, '').normalize('NFC')

/**
 * Remove every combining mark: Latin accents, Arabic tashkeel and the hamza/madda that
 * decompose out of أ إ آ ؤ ئ (so أ -> ا, ؤ -> و). Also drops tatweel.
 */
export const stripMarks = (s: string) =>
  s.normalize('NFD').replace(/\p{M}/gu, '').replaceAll(TATWEEL, '').normalize('NFC')

const INVISIBLE_RE = /[\u200B-\u200F\u202A-\u202E\u2066-\u2069\u061C\uFEFF]/g
// Arabic presentation forms, Latin ligatures (ﬁ from copied PDFs) and the Dutch ĳ ligature
const PRESENTATION_RE = /[\uFB50-\uFDFF\uFE70-\uFEFE\uFB00-\uFB06\u0132\u0133]/g
const LOOKALIKES: Record<string, string> = {
  '\u06CC': 'ي', // Persian yeh
  '\u06A9': 'ك', // keheh
  '\u06C1': 'ه',
  '\u06BE': 'ه',
  '\u06D5': 'ه',
  '\u06C0': 'ة',
  '\u0671': 'ا', // alef wasla
}
const LOOKALIKE_RE = /[\u06CC\u06A9\u06C1\u06BE\u06D5\u06C0\u0671]/g

/**
 * Encoding normalisation for typed and target text: NFC, no invisible marks, Arabic
 * presentation forms expanded (Linux types one ligature code point for لا), Latin
 * ligatures (ﬁ, ĳ) split, Persian look-alike letters mapped to Arabic. Never strips hamza.
 */
export function normalizeInput(s: string): string {
  return s
    .normalize('NFC')
    .replace(INVISIBLE_RE, '')
    .replace(PRESENTATION_RE, (ch) => ch.normalize('NFKC'))
    .replace(LOOKALIKE_RE, (ch) => LOOKALIKES[ch])
}

/** Eastern Arabic (٠-٩) and Persian digits as 0-9. */
export const foldDigits = (s: string) =>
  s.replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) % 16)) // both digit blocks start at a multiple of 16

/** Typographic punctuation the user cannot easily type, mapped to keyboard characters. */
export function normalizeTypingText(text: string): string {
  return normalizeInput(text)
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u02BC]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"')
    .replace(/\u2026/g, '...')
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/[\u00A0\u2007\u202F]/g, ' ')
}

export const isLetter = (c: string) => /^\p{L}/u.test(c)

export const isArabic = (s: string) => /[\u0600-\u06FF]/.test(s)

export const round2 = (n: number) => Math.round(n * 100) / 100
