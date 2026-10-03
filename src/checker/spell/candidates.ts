import type { Lang } from '@/types'
import { isVowel, stripDiacritics } from './text'

// "Generate, then validate" (docs/research/dutch-errors.md §2.4): cheap rewrites that undo the
// mistakes people actually make. Nothing here is trusted until the dictionary accepts it.

export type CandidateKind =
  | 'map' // curated misspelling map
  | 'trema' // ideeen -> ideeën
  | 'accent' // cafe -> café
  | 'trema-drop' // financiëel -> financieel
  | 'tussen-n' // pannekoek -> pannenkoek
  | 'tussen-n-drop' // zonnenbloem -> zonnebloem
  | 'kofschip' // fietsde -> fietste
  | 'dt' // gefietsd -> gefietst, werdt -> werd
  | 'ei-ij' // tyd -> tijd, rijzen/reizen
  | 'au-ou'
  | 'ending' // gelukkich -> gelukkig, natuurluk -> natuurlijk
  | 'double' // aleen -> alleen, oppasen -> oppassen
  | 'apostrophe' // autos -> auto's, dont -> don't
  | 'apostrophe-drop' // computer's -> computers
  | 'ie-ei' // recieve -> receive
  | 'hamza' // انشاء -> إنشاء
  | 'hamza-drop' // إستخدام -> استخدام (hamzat al-wasl)
  | 'hamza-seat' // مسئول / مسؤول
  | 'ta-marbuta' // مدرسه -> مدرسة
  | 'alif-maqsura' // حتي -> حتى
  | 'final-alif' // مرحبى -> مرحبا
  | 'split' // eachother -> each other
  | 'join' // koffie-automaat -> koffieautomaat
  | 'case' // nederlands -> Nederlands
  | 'edit' // one edit away from a frequent word
  | 'hunspell'

export interface Candidate {
  word: string
  kind: CandidateKind
  /** extra score (positive = less likely) on top of the kind's usual weight */
  weight?: number
}

const at = (w: string, i: number, len: number, rep: string) => w.slice(0, i) + rep + w.slice(i + len)

/** every index where `sub` occurs */
function indexes(w: string, sub: string): number[] {
  const out: number[] = []
  for (let i = w.indexOf(sub); i >= 0; i = w.indexOf(sub, i + 1)) out.push(i)
  return out
}

const TREMA: Record<string, string> = { e: 'ë', i: 'ï', o: 'ö', u: 'ü', a: 'ä' }
const ACCENT: Record<string, string[]> = { e: ['é', 'è', 'ê'], a: ['à'], o: ['ó'] }
const CONSONANT = /^[bcdfghjklmnpqrstvwxz]$/

function diacriticCandidates(w: string, lang: Lang): Candidate[] {
  const out: Candidate[] = []
  const chars = [...w]
  chars.forEach((c, i) => {
    if (TREMA[c] && i > 0 && isVowel(chars[i - 1], lang)) {
      out.push({ word: at(w, i, 1, TREMA[c]), kind: 'trema' })
    }
    for (const a of ACCENT[c] ?? []) out.push({ word: at(w, i, 1, a), kind: 'accent' })
  })
  const plain = stripDiacritics(w)
  if (plain !== w) {
    out.push({ word: plain, kind: 'trema-drop' })
    chars.forEach((c, i) => {
      const p = stripDiacritics(c)
      if (p !== c) out.push({ word: at(w, i, 1, p), kind: /[ëïöüä]/.test(c) ? 'trema-drop' : 'accent' })
    })
  }
  return out
}

function doubleCandidates(w: string, lang: Lang): Candidate[] {
  const out: Candidate[] = []
  // drawn-out chat spelling: jaaaa, heeeel, sooo -> ja, heel, so
  if (/(\p{L})\1\1/u.test(w)) {
    out.push({ word: w.replace(/(\p{L})\1{2,}/gu, '$1'), kind: 'double', weight: -0.2 })
    out.push({ word: w.replace(/(\p{L})\1{2,}/gu, '$1$1'), kind: 'double', weight: -0.2 })
  }
  const chars = [...w]
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i]
    if (c === chars[i + 1] && c !== "'" && c !== '-') {
      out.push({ word: at(w, i, 1, ''), kind: 'double' }) // alllen, verry
      continue
    }
    if (i === 0) continue
    // single consonant between vowels or before a final consonant: oppasen -> oppassen, untill
    if (CONSONANT.test(c) && c !== chars[i - 1] && isVowel(chars[i - 1], lang)) {
      out.push({ word: at(w, i, 0, c), kind: 'double' })
    }
    // vowel: helemal -> helemaal, heelemaal -> helemaal
    if ('aeou'.includes(c) && chars[i - 1] !== c && chars[i + 1] !== c && CONSONANT.test(chars[i + 1] ?? '')) {
      out.push({ word: at(w, i, 0, c), kind: 'double' })
    }
  }
  return out
}

function dutchCandidates(w: string): Candidate[] {
  const out: Candidate[] = [...diacriticCandidates(w, 'nl'), ...doubleCandidates(w, 'nl')]
  const add = (word: string, kind: CandidateKind) => out.push({ word, kind })

  // tussen-n: pannekoek -> pannenkoek, zonnenbloem -> zonnebloem
  for (let i = 2; i < w.length - 3; i++) {
    if (w[i] !== 'e') continue
    if (w[i + 1] === 'n') {
      if (i + 2 < w.length - 2) add(at(w, i + 1, 1, ''), 'tussen-n-drop')
    } else if (!isVowel(w[i + 1])) add(at(w, i + 1, 0, 'n'), 'tussen-n')
  }

  // d / t / dt at the end
  let m: RegExpExecArray | null
  if ((m = /^(.+?)(d|t|dt)$/.exec(w))) {
    const [, stem, end] = m
    for (const e of ['d', 't', 'dt']) if (e !== end && !(e === 'dt' && /[dt]$/.test(stem))) add(stem + e, 'dt')
  }
  // past tense: -de/-te(n), -dde/-tte
  if ((m = /^(.+?)(dde|tte|de|te)(n?)$/.exec(w))) {
    const [, stem, end, n] = m
    for (const e of ['de', 'te', 'dde', 'tte']) if (e !== end) add(stem + e + n, 'kofschip')
  }
  // -dt in other positions is not a thing; -d/-t before inflection: gebeurde/gebeurtte handled above

  // ei <-> ij, y -> ij
  for (const i of indexes(w, 'ei')) add(at(w, i, 2, 'ij'), 'ei-ij')
  for (const i of indexes(w, 'ij')) add(at(w, i, 2, 'ei'), 'ei-ij')
  for (const i of indexes(w, 'y')) add(at(w, i, 1, 'ij'), 'ei-ij')
  // au <-> ou
  for (const i of indexes(w, 'au')) add(at(w, i, 2, 'ou'), 'au-ou')
  for (const i of indexes(w, 'ou')) add(at(w, i, 2, 'au'), 'au-ou')

  // endings by ear: -ich -> -ig, -luk/-lik/-lek/-lyk -> -lijk (with inflection)
  if ((m = /^(.+)ich(e|en|er|ste)?$/.exec(w))) add(`${m[1]}ig${m[2] ?? ''}`, 'ending')
  if ((m = /^(.+)l(?:uk|ik|ek|yk|eik)(e|en|er|s|ste|heid)?$/.exec(w))) add(`${m[1]}lijk${m[2] ?? ''}`, 'ending')
  if ((m = /^(.+)hijd(en)?$/.exec(w))) add(`${m[1]}heid${m[2] ?? ''}`, 'ei-ij')

  // plural apostrophe: autos -> auto's, computer's -> computers
  if ((m = /^(.+[aiouy])s$/.exec(w))) add(`${m[1]}'s`, 'apostrophe')
  if ((m = /^(.+[^aiouy])'s$/.exec(w))) add(`${m[1]}s`, 'apostrophe-drop')
  return out
}

function englishCandidates(w: string): Candidate[] {
  const out: Candidate[] = [...doubleCandidates(w, 'en')]
  // contractions: dont -> don't, youre -> you're, im -> I'm
  for (const k of [1, 2, 3]) {
    if (w.length > k + 1) out.push({ word: at(w, w.length - k, 0, "'"), kind: 'apostrophe' })
  }
  const pronounI = /^i(m|ve|ll|d)$/.exec(w)
  if (pronounI) out.push({ word: `I'${pronounI[1]}`, kind: 'apostrophe' })
  for (const i of indexes(w, 'ie')) out.push({ word: at(w, i, 2, 'ei'), kind: 'ie-ei' })
  for (const i of indexes(w, 'ei')) out.push({ word: at(w, i, 2, 'ie'), kind: 'ie-ei' })
  // Dutch habits in English words: k for c (kwality), -isch, -ie for -y
  for (const i of indexes(w, 'k')) out.push({ word: at(w, i, 1, 'c'), kind: 'edit' })
  for (const i of indexes(w, 'kw')) out.push({ word: at(w, i, 2, 'qu'), kind: 'edit' })
  return out
}

/** the last letter: ta marbuta, alif maqsura, alif */
function arabicEndings(w: string): Candidate[] {
  const out: Candidate[] = []
  const add = (word: string, kind: CandidateKind) => out.push({ word, kind })
  const stem = w.slice(0, -1)
  if (w.endsWith('ه')) add(stem + 'ة', 'ta-marbuta')
  if (w.endsWith('ة')) add(stem + 'ه', 'ta-marbuta')
  if (w.endsWith('ي')) add(stem + 'ى', 'alif-maqsura')
  if (w.endsWith('ى')) {
    add(stem + 'ي', 'alif-maqsura')
    add(stem + 'ا', 'final-alif') // مرحبى -> مرحبا
  }
  if (w.endsWith('ا') && w.length > 2) add(stem + 'ى', 'final-alif')
  // tanween typed as a noon: مهندسن -> مهندسا (an accusative -an written the way it sounds)
  if (w.endsWith('ن') && w.length >= 4) out.push({ word: stem + 'ا', kind: 'final-alif', weight: -0.4 })
  return out
}

function arabicCandidates(w: string): Candidate[] {
  const out: Candidate[] = []
  const add = (word: string, kind: CandidateKind) => out.push({ word, kind })
  // hamza on the first alif, also after the article and common prefixes: انا -> أنا, الى -> إلى
  // (after a prefix it is a guess, so frequency has to carry it: لان -> لأن, but لاكن -> لكن)
  const prefixes = ['', 'و', 'ف', 'ب', 'ل', 'ال', 'وال', 'بال', 'لل', 'فال']
  const hamzas: Candidate[] = []
  for (const p of prefixes) {
    if (!w.startsWith(p + 'ا') || w.length <= p.length + 1) continue
    // a hamza on the article itself (المتخف -> ألمتخف) only reads as interrogative أ + ل: rare
    const onArticle = !p && w.startsWith('ال') && w.length >= 5
    for (const h of ['أ', 'إ', 'آ']) hamzas.push({ word: p + h + w.slice(p.length + 1), kind: 'hamza', weight: p ? 0.3 : onArticle ? 0.7 : 0 })
  }
  out.push(...hamzas)
  // both slips at once, the classic one: الي -> إلى
  for (const c of hamzas) for (const e of arabicEndings(c.word)) out.push({ ...e, kind: 'hamza', weight: (c.weight ?? 0) + 0.05 })
  // hamza written on an alif that has none (hamzat al-wasl): إستخدام -> استخدام, إسم -> اسم
  for (const i of indexes(w, 'أ')) add(at(w, i, 1, 'ا'), 'hamza-drop')
  for (const i of indexes(w, 'إ')) add(at(w, i, 1, 'ا'), 'hamza-drop')
  out.push(...arabicEndings(w))
  // hamza seat: above or below the alif (أسلام -> إسلام), مسئول/مسؤول
  for (const i of indexes(w, 'أ')) add(at(w, i, 1, 'إ'), 'hamza-seat')
  for (const i of indexes(w, 'إ')) add(at(w, i, 1, 'أ'), 'hamza-seat')
  for (const i of indexes(w, 'ئ')) add(at(w, i, 1, 'ؤ'), 'hamza-seat')
  for (const i of indexes(w, 'ؤ')) add(at(w, i, 1, 'ئ'), 'hamza-seat')
  return out
}

/** Targeted rewrites of a lowercase lookup form. Unvalidated. */
export function generateCandidates(lower: string, lang: Lang): Candidate[] {
  const out = lang === 'nl' ? dutchCandidates(lower) : lang === 'en' ? englishCandidates(lower) : arabicCandidates(lower)
  if (lower.includes('-')) out.push({ word: lower.replace(/-/g, ''), kind: 'join' })
  return out.filter((c) => c.word !== lower && c.word.length > 0)
}

/** Two-word splits (eachother -> each other); both halves must be common words. */
export function splitCandidates(lower: string, isCommon: (w: string) => boolean, lang: Lang): Candidate[] {
  if (lower.length < 5 || lower.includes('-')) return []
  const singles = lang === 'en' ? new Set(['a', 'i']) : new Set<string>()
  const out: Candidate[] = []
  const chars = [...lower]
  for (let i = 1; i < chars.length; i++) {
    const a = chars.slice(0, i).join('')
    const b = chars.slice(i).join('')
    if ((a.length < 2 && !singles.has(a)) || (b.length < 2 && !singles.has(b))) continue
    if (!isCommon(a) || !isCommon(b)) continue
    const fix = (p: string) => (lang === 'en' && p === 'i' ? 'I' : p)
    out.push({ word: `${fix(a)} ${fix(b)}`, kind: 'split' })
  }
  return out
}

const ALPHABET: Record<Lang, string> = {
  nl: "abcdefghijklmnopqrstuvwxyzëïéèöü'",
  en: "abcdefghijklmnopqrstuvwxyz'",
  ar: 'ابتثجحخدذرزسشصضطظعغفقكلمنهويءآأإؤئىة',
}

/** Words one plain edit away that are in `isCommon` (a frequency list of valid words). */
export function editCandidates(lower: string, lang: Lang, isCommon: (w: string) => boolean): Candidate[] {
  const out = new Set<string>()
  const chars = [...lower]
  const n = chars.length
  const alpha = [...ALPHABET[lang]]
  const tryWord = (w: string) => {
    if (w !== lower && isCommon(w)) out.add(w)
  }
  for (let i = 0; i <= n; i++) {
    const head = chars.slice(0, i).join('')
    const tail = chars.slice(i).join('')
    if (i < n) tryWord(head + chars.slice(i + 1).join('')) // delete
    if (i < n - 1) tryWord(head + chars[i + 1] + chars[i] + chars.slice(i + 2).join('')) // swap
    for (const c of alpha) {
      tryWord(head + c + tail) // insert
      if (i < n && c !== chars[i]) tryWord(head + c + chars.slice(i + 1).join('')) // replace
    }
  }
  return [...out].map((word) => ({ word, kind: 'edit' as const }))
}
