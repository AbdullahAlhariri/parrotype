import type { Lang } from '@/types'
import { areAdjacent, layoutFor } from '@/engine/keyboard'
import { baseChar, isVowel, stripDiacritics } from './text'

// Weighted optimal-string-alignment distance tuned for this user's slips:
// typing slips (neighbour keys, swaps, doubled letters) and sound-alike spellings
// are cheaper than random edits, so the likely word wins the ranking.
// Costs are hypotheses from docs/research/english-errors.md §4.4; tune from logs.

const COST = {
  case: 0.1,
  mark: 0.15, // é/e, ë/e, أ/ا
  transpose: 0.5,
  double: 0.4, // alleen/aleen, happy/hapy
  joiner: 0.3, // apostrophe, hyphen, space
  adjacent: 0.6,
  vowel: 0.7,
  vowelIndel: 0.75, // intresting, goverment's cousin
  alif: 0.6, // هاذا/هذا, لاكن/لكن: a long a that is said but not written
  h: 0.7, // silent h: wich/which
  other: 1,
}

/** Sound-alike letter pairs per language, as unordered "ab" keys. */
const PAIRS: Record<Lang, Record<string, number>> = {
  nl: { dt: 0.4, sz: 0.5, fv: 0.5, ck: 0.5, cs: 0.6, iy: 0.6, gx: 0.8 },
  en: { ck: 0.5, cs: 0.6, sz: 0.5, iy: 0.6, fv: 0.6, bp: 0.6, dt: 0.7 },
  ar: {
    'ته': 0.4, 'ذز': 0.5, 'ثس': 0.5, 'سص': 0.5, 'تط': 0.5, 'ظض': 0.5, 'دض': 0.6, 'كق': 0.6, 'حه': 0.6, 'ءع': 0.6,
    'ذظ': 0.6, 'زظ': 0.6, 'غق': 0.7,
  },
}

const pairKey = (a: string, b: string) => (a < b ? a + b : b + a)

/** cost of typing `a` where `b` was meant (single letters) */
export function subCost(a: string, b: string, lang: Lang): number {
  if (a === b) return 0
  const la = a.toLowerCase()
  const lb = b.toLowerCase()
  if (la === lb) return COST.case
  const ba = baseChar(la)
  const bb = baseChar(lb)
  if (ba === bb) return COST.mark
  const pair = PAIRS[lang][pairKey(ba, bb)]
  if (pair !== undefined) return pair
  if (areAdjacent(la, lb, layoutFor(lang))) return COST.adjacent
  if (isVowel(ba, lang) && isVowel(bb, lang)) return COST.vowel
  return COST.other
}

/** cost of a letter that is in one word but not the other; `word` is the word that has it */
function indelCost(word: string[], i: number, lang: Lang): number {
  const c = word[i]
  if (c === "'" || c === '-' || c === ' ') return COST.joiner
  const lc = c.toLowerCase()
  if (lc === word[i - 1]?.toLowerCase() || lc === word[i + 1]?.toLowerCase()) return COST.double
  if (lang === 'ar') return c === 'ا' ? COST.alif : c === 'و' || c === 'ي' ? COST.vowel : COST.other
  if (lc === 'h') return COST.h
  if (isVowel(lc, lang)) return COST.vowelIndel
  return COST.other
}

/** Weighted OSA distance from what was typed (a) to a candidate (b). */
export function weightedDistance(a: string, b: string, lang: Lang): number {
  if (a === b) return 0
  const A = Array.from(a)
  const B = Array.from(b)
  const n = A.length
  const m = B.length
  const w = m + 1
  const d = new Float64Array((n + 1) * w)
  for (let i = 1; i <= n; i++) d[i * w] = d[(i - 1) * w] + indelCost(A, i - 1, lang)
  for (let j = 1; j <= m; j++) d[j] = d[j - 1] + indelCost(B, j - 1, lang)
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      let v = Math.min(
        d[(i - 1) * w + j] + indelCost(A, i - 1, lang),
        d[i * w + j - 1] + indelCost(B, j - 1, lang),
        d[(i - 1) * w + j - 1] + subCost(A[i - 1], B[j - 1], lang),
      )
      if (i > 1 && j > 1 && A[i - 1] === B[j - 2] && A[i - 2] === B[j - 1]) {
        v = Math.min(v, d[(i - 2) * w + j - 2] + COST.transpose)
      }
      d[i * w + j] = v
    }
  }
  const raw = d[n * w + m]
  // spelled by ear: same sound key means one "sound" mistake, however many letters it took
  if (raw > 0.5 && soundKey(a, lang) === soundKey(b, lang)) return Math.min(raw, 0.5)
  return raw
}

/** A rough pronunciation key: two spellings with the same key sound (nearly) alike. */
export function soundKey(w: string, lang: Lang): string {
  let s = stripDiacritics(w.toLowerCase())
  if (lang === 'nl') {
    s = s
      .replace(/(lijk|luk|lik|lek|lyk)(e|en|s)?$/, 'lek$2')
      .replace(/(ig|ich)(e|en|s)?$/, 'ig$2')
      .replace(/ij|y/g, 'ei')
      .replace(/au/g, 'ou')
      .replace(/ch/g, 'g')
      .replace(/sj/g, 'sh')
      .replace(/c(?=[eiy])/g, 's')
      .replace(/c/g, 'k')
      .replace(/ph/g, 'f')
      .replace(/th/g, 't')
      .replace(/qu/g, 'kw')
      .replace(/x/g, 'ks')
      .replace(/z/g, 's')
      .replace(/v/g, 'f')
      .replace(/dt$|d$/, 't')
  } else if (lang === 'en') {
    s = s
      .replace(/ph/g, 'f')
      .replace(/ck/g, 'k')
      .replace(/c(?=[eiy])/g, 's')
      .replace(/c/g, 'k')
      .replace(/q/g, 'k')
      .replace(/x/g, 'ks')
      .replace(/wh/g, 'w')
      .replace(/z/g, 's')
      .replace(/([^aeiou])e$/, '$1')
  } else {
    s = Array.from(s, baseChar).join('')
  }
  return s.replace(/(.)\1+/g, '$1')
}
