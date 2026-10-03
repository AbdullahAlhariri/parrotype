import type { Lang } from '@/types'
import { osaUnits } from './osa'
import { classifyTypo, type TypoLabel } from './typo'
import { tip } from './typo-ctx'
import { graphemes, normalizeInput, stripAccents, stripTashkeel } from './text'

// Word-level alignment of free typed text against an expected sentence (dictation,
// proofreading), plus per-letter diffs for rendering.

export interface AlignOptions {
  ignoreCase?: boolean
  ignorePunctuation?: boolean
  /** ignore Arabic tashkeel/tatweel and Latin accents */
  ignoreDiacritics?: boolean
}

export interface AlignToken {
  text: string
  /** comparison form after the options are applied */
  norm: string
  /** UTF-16 offsets into the source text */
  start: number
  end: number
  punct: boolean
}

export type WordOpKind = 'equal' | 'sub' | 'ins' | 'del' | 'split' | 'merge'

export interface WordOp {
  op: WordOpKind
  /** expected token(s); two tokens joined by a space for 'merge' */
  expected?: string
  /** typed token(s); two tokens joined by a space for 'split' */
  typed?: string
  /** index of the (first) expected token in tokenize(expected) */
  expIndex?: number
  /** index of the (first) typed token in tokenize(typed) */
  typedIndex?: number
  /** [start, end) offsets in the expected / typed text */
  expRange?: [number, number]
  typedRange?: [number, number]
  /** the tokens involved are punctuation */
  punct?: boolean
  /** a 'del' and an 'ins' of the same word close together: the word was moved (word order) */
  moved?: boolean
}

export interface CharOp {
  op: 'equal' | 'sub' | 'ins' | 'del'
  /** expected character */
  a?: string
  /** typed character */
  b?: string
}

// 's / 't / 'n (Dutch), numbers with separators (1.000, 3,5, 12:30), words with inner
// apostrophes or hyphens (invisible joiners allowed inside), or single punctuation marks
const TOKEN_RE =
  /'[stn](?![\p{L}\p{M}\p{N}])|\p{N}+(?:[.,:]\p{N}+)+(?![\p{L}\p{M}])|[\p{L}\p{N}][\p{L}\p{M}\p{N}\p{Cf}]*(?:['\-][\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N}\p{Cf}]*)*|[^\s\p{L}\p{M}\p{N}\p{Cf}]/gu

const normQuotes = (s: string) => s.replace(/[\u2018\u2019\u02BC]/g, "'").replace(/[\u201C\u201D]/g, '"')

function normalise(text: string, o: AlignOptions): string {
  let s = normalizeInput(text)
  if (o.ignoreDiacritics) s = stripAccents(stripTashkeel(s))
  if (o.ignoreCase) s = s.toLowerCase()
  return s
}

/** Tokens used by alignWords (indices in WordOp refer to this list). Offsets are into `text`. */
export function tokenize(text: string, opts: AlignOptions = {}): AlignToken[] {
  const src = normQuotes(text) // one-for-one replacements keep the offsets valid
  const out: AlignToken[] = []
  for (const m of src.matchAll(TOKEN_RE)) {
    const punct = !/[\p{L}\p{N}]/u.test(m[0])
    if (punct && opts.ignorePunctuation) continue
    const start = m.index ?? 0
    out.push({ text: m[0], norm: normalise(m[0], opts), start, end: start + m[0].length, punct })
  }
  return out
}

const NEVER = 1e9

/** Token comparison with grapheme arrays computed once and word-pair distances cached. */
function costs(E: AlignToken[], T: AlignToken[]) {
  const units = new Map<string, string[]>()
  const unitsOf = (s: string) => {
    let u = units.get(s)
    if (!u) units.set(s, (u = graphemes(s)))
    return u
  }
  const cache = new Map<string, number>()
  /** normalised edit distance, 0 (same) .. 1 (nothing alike) */
  const distance = (a: string, b: string) => {
    const key = a + '\u0000' + b
    let d = cache.get(key)
    if (d === undefined) {
      const A = unitsOf(a)
      const B = unitsOf(b)
      d = osaUnits(A, B) / Math.max(A.length, B.length, 1)
      cache.set(key, d)
    }
    return d
  }
  for (const t of [...E, ...T]) unitsOf(t.norm)

  /** similar words align as a substitution (wordt -> word), unrelated ones still beat del + ins */
  const sub = (a: AlignToken, b: AlignToken): number => {
    if (a.punct !== b.punct) return NEVER
    if (a.norm === b.norm) return 0
    if (a.punct) return 1
    return 0.4 + 1.4 * distance(a.norm, b.norm)
  }

  /** one token written as two (zieken huis) or two as one (teveel) */
  const split = (whole: AlignToken, a: AlignToken, b: AlignToken): number => {
    if (whole.punct || a.punct || b.punct) return NEVER
    const target = whole.norm.replace(/-/g, '')
    const joinedLen = unitsOf(a.norm).length + unitsOf(b.norm).length
    const len = unitsOf(target).length
    if (Math.abs(joinedLen - len) > Math.max(1, len * 0.2)) return NEVER // cannot be within 20%
    const joined = a.norm + b.norm
    if (joined === target || joined === whole.norm) return 0.3
    const d = distance(joined, target)
    return d <= 0.2 ? 0.3 + 1.4 * d : NEVER
  }
  return { sub, split }
}

type Step = 'diag' | 'split' | 'merge' | 'del' | 'ins'

/**
 * Align typed text to the expected text word by word. Substitution cost depends on letter
 * similarity, and split/merged words (zieken huis / ziekenhuis) are detected.
 */
export function alignWords(expected: string, typed: string, opts: AlignOptions = {}): WordOp[] {
  const E = tokenize(expected, opts)
  const T = tokenize(typed, opts)
  const { sub: subCost, split: splitCost } = costs(E, T)
  const n = E.length
  const m = T.length
  const d = Array.from({ length: n + 1 }, () => new Float64Array(m + 1).fill(Infinity))
  const back: Step[][] = Array.from({ length: n + 1 }, () => new Array<Step>(m + 1))
  d[0][0] = 0
  for (let i = 1; i <= n; i++) {
    d[i][0] = i
    back[i][0] = 'del'
  }
  for (let j = 1; j <= m; j++) {
    d[0][j] = j
    back[0][j] = 'ins'
  }
  // long texts: only cells near the diagonal (typed text rarely drifts 40+ words away)
  const band = Math.abs(n - m) + 40
  for (let i = 1; i <= n; i++) {
    const centre = Math.round((i * m) / Math.max(n, 1))
    const lo = Math.max(1, centre - band)
    const hi = Math.min(m, centre + band)
    for (let j = lo; j <= hi; j++) {
      let best = d[i - 1][j - 1] + subCost(E[i - 1], T[j - 1])
      let step: Step = 'diag'
      if (j > 1) {
        const v = d[i - 1][j - 2] + splitCost(E[i - 1], T[j - 2], T[j - 1])
        if (v < best) [best, step] = [v, 'split']
      }
      if (i > 1) {
        const v = d[i - 2][j - 1] + splitCost(T[j - 1], E[i - 2], E[i - 1])
        if (v < best) [best, step] = [v, 'merge']
      }
      if (d[i - 1][j] + 1 < best) [best, step] = [d[i - 1][j] + 1, 'del']
      if (d[i][j - 1] + 1 < best) [best, step] = [d[i][j - 1] + 1, 'ins']
      d[i][j] = best
      back[i][j] = step
    }
  }

  const ops: WordOp[] = []
  const range = (t: AlignToken, u: AlignToken = t): [number, number] => [t.start, u.end]
  let i = n
  let j = m
  while (i > 0 || j > 0) {
    const step = back[i][j]
    if (step === 'diag') {
      const e = E[i - 1]
      const t = T[j - 1]
      const op: WordOp = { op: e.norm === t.norm ? 'equal' : 'sub', expected: e.text, typed: t.text, expIndex: i - 1, typedIndex: j - 1, expRange: range(e), typedRange: range(t) }
      if (e.punct) op.punct = true
      ops.push(op)
      i--
      j--
    } else if (step === 'split') {
      const e = E[i - 1]
      ops.push({ op: 'split', expected: e.text, typed: `${T[j - 2].text} ${T[j - 1].text}`, expIndex: i - 1, typedIndex: j - 2, expRange: range(e), typedRange: range(T[j - 2], T[j - 1]) })
      i--
      j -= 2
    } else if (step === 'merge') {
      const t = T[j - 1]
      ops.push({ op: 'merge', expected: `${E[i - 2].text} ${E[i - 1].text}`, typed: t.text, expIndex: i - 2, typedIndex: j - 1, expRange: range(E[i - 2], E[i - 1]), typedRange: range(t) })
      i -= 2
      j--
    } else if (step === 'del') {
      const e = E[i - 1]
      const op: WordOp = { op: 'del', expected: e.text, expIndex: i - 1, expRange: range(e) }
      if (e.punct) op.punct = true
      ops.push(op)
      i--
    } else {
      const t = T[j - 1]
      const op: WordOp = { op: 'ins', typed: t.text, typedIndex: j - 1, typedRange: range(t) }
      if (t.punct) op.punct = true
      ops.push(op)
      j--
    }
  }
  return markMoves(ops.reverse(), opts)
}

/** Pairs a deleted word with the same word inserted within a few steps (Gisteren ik ging). */
function markMoves(ops: WordOp[], o: AlignOptions): WordOp[] {
  const key = (s: string) => normalise(s, { ...o, ignoreCase: true })
  for (let a = 0; a < ops.length; a++) {
    const x = ops[a]
    if ((x.op !== 'del' && x.op !== 'ins') || x.punct || x.moved) continue
    const want = x.op === 'del' ? 'ins' : 'del'
    const word = key((x.op === 'del' ? x.expected : x.typed) ?? '')
    for (let b = a + 1; b < ops.length && b <= a + 4; b++) {
      const y = ops[b]
      if (y.op === want && !y.punct && !y.moved && key((want === 'del' ? y.expected : y.typed) ?? '') === word) {
        x.moved = true
        y.moved = true
        break
      }
    }
  }
  return ops
}

/** Per-letter diff of expected `a` vs typed `b` (graphemes, unit-cost Levenshtein). */
export function charDiff(a: string, b: string): CharOp[] {
  const A = graphemes(a)
  const B = graphemes(b)
  const n = A.length
  const m = B.length
  const d = Array.from({ length: n + 1 }, (_, i) => {
    const row = new Uint32Array(m + 1)
    row[0] = i
    return row
  })
  for (let j = 0; j <= m; j++) d[0][j] = j
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      d[i][j] = Math.min(d[i - 1][j - 1] + (A[i - 1] === B[j - 1] ? 0 : 1), d[i - 1][j] + 1, d[i][j - 1] + 1)
    }
  }
  const out: CharOp[] = []
  let i = n
  let j = m
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && A[i - 1] === B[j - 1] && d[i][j] === d[i - 1][j - 1]) {
      out.push({ op: 'equal', a: A[i - 1], b: B[j - 1] })
      i--
      j--
    } else if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + 1) {
      out.push({ op: 'sub', a: A[i - 1], b: B[j - 1] })
      i--
      j--
    } else if (i > 0 && (j === 0 || d[i][j] === d[i - 1][j] + 1)) {
      out.push({ op: 'del', a: A[i - 1] })
      i--
    } else {
      out.push({ op: 'ins', b: B[j - 1] })
      j--
    }
  }
  return out.reverse()
}

export interface AlignmentScore {
  correctWords: number
  /** expected words (punctuation not counted) */
  totalWords: number
  /** 0-100: correct / (expected + extra typed words) */
  accuracy: number
  errors: { sub: number; ins: number; del: number; split: number; merge: number; punct: number }
}

export function scoreAlignment(ops: WordOp[]): AlignmentScore {
  const errors = { sub: 0, ins: 0, del: 0, split: 0, merge: 0, punct: 0 }
  let correct = 0
  let total = 0
  for (const o of ops) {
    if (o.punct) {
      if (o.op !== 'equal') errors.punct++
      continue
    }
    if (o.op === 'equal') {
      correct++
      total++
    } else if (o.op === 'merge') {
      errors.merge++
      total += 2
    } else if (o.op === 'ins') errors.ins++
    else {
      errors[o.op]++
      total++
    }
  }
  const denom = total + errors.ins
  return { correctWords: correct, totalWords: total, accuracy: denom ? Math.round((correct / denom) * 10000) / 100 : 100, errors }
}

/**
 * A typo label for every op (null for equal / punctuation), in dictation mode, with the
 * neighbouring expected words passed as context for sharper d/t tips.
 */
export function classifyOps(ops: WordOp[], lang: Lang): (TypoLabel | null)[] {
  const words = ops.filter((o) => o.expected !== undefined && !o.punct)
  return ops.map((o) => {
    if (o.punct || o.op === 'equal') return null
    // a moved word is labelled once, on the place where it was expected
    if (o.moved) return o.op === 'del' ? wordOrderLabel(o.expected ?? '', lang) : null
    if (o.op === 'del') return classifyTypo(o.expected ?? '', '', lang, { mode: 'dictation' })
    if (o.op === 'ins') return null
    const k = words.indexOf(o)
    return classifyTypo(o.expected ?? '', o.typed ?? '', lang, { mode: 'dictation', prev: words[k - 1]?.expected, next: words[k + 1]?.expected })
  })
}

function wordOrderLabel(word: string, lang: Lang): TypoLabel {
  return { kind: 'spelling', nature: 'cognitive', detail: `'${word}' is in the wrong place`, tag: 'word-order', tip: tip('word-order', lang) }
}
