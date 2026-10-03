import type { Confidence, RuleContext, RuleHit, Token } from '@/types'
import { preserveCase } from './engine'
import { splitClauses, type Clause } from './tokenize'

/* ------------------------------------------------------------------ */
/* Per-context analysis (cached)                                       */
/* ------------------------------------------------------------------ */

export interface WordInfo {
  tok: Token
  /** index in ctx.words */
  i: number
  sent: number
  clause: number
  sentStart: boolean
  clauseStart: boolean
  /** first word of its clause, or the first word after the clause's conjunction/relative opener */
  subjSlot: boolean
}

interface Analysis {
  info: WordInfo[]
  clauses: Clause[]
}

const cache = new WeakMap<RuleContext, Analysis>()

export function analysis(ctx: RuleContext): Analysis {
  const hit = cache.get(ctx)
  if (hit) return hit
  const clauses = splitClauses(ctx)
  const info: WordInfo[] = []
  let s = 0
  for (let i = 0; i < ctx.words.length; i++) {
    const w = ctx.words[i]
    while (s < ctx.sentences.length - 1 && w.start >= ctx.sentences[s].end) s++
    const sentStart = i === 0 || info[i - 1].sent !== s
    info.push({ tok: w, i, sent: s, clause: -1, sentStart, clauseStart: false, subjSlot: false })
  }
  clauses.forEach((c, ci) => {
    for (let k = c.from; k <= c.to; k++) info[k].clause = ci
    info[c.from].clauseStart = true
    info[c.from].subjSlot = true
    info[c.core].subjSlot = true
  })
  const a = { info, clauses }
  cache.set(ctx, a)
  return a
}

export const wordInfo = (ctx: RuleContext, i: number): WordInfo | undefined => analysis(ctx).info[i]
export const clauseOf = (ctx: RuleContext, i: number): Clause | undefined => {
  const a = analysis(ctx)
  return a.clauses[a.info[i]?.clause ?? -1]
}

/** lowercased word at index i ('' when out of range) */
export const lw = (ctx: RuleContext, i: number) => ctx.words[i]?.lower ?? ''

export const isSentenceStart = (ctx: RuleContext, i: number) => !!wordInfo(ctx, i)?.sentStart
export const isClauseStart = (ctx: RuleContext, i: number) => !!wordInfo(ctx, i)?.clauseStart
/** the subject position: clause start, or right after "omdat/dat/als/en/maar/die..." */
export const isSubjectSlot = (ctx: RuleContext, i: number) => !!wordInfo(ctx, i)?.subjSlot
export const sameSentence = (ctx: RuleContext, a: number, b: number) =>
  a >= 0 && b >= 0 && wordInfo(ctx, a)?.sent === wordInfo(ctx, b)?.sent
export const inSameClause = (ctx: RuleContext, a: number, b: number) =>
  a >= 0 && b >= 0 && wordInfo(ctx, a)?.clause === wordInfo(ctx, b)?.clause

/* ------------------------------------------------------------------ */
/* Neighbours                                                          */
/* ------------------------------------------------------------------ */

/** text between word a and word b */
export const gapBetween = (ctx: RuleContext, a: number, b: number) =>
  ctx.text.slice(ctx.words[a].end, ctx.words[b].start)

/** true when b directly follows a in the same sentence with only spaces between */
export const adjacent = (ctx: RuleContext, a: number, b: number) =>
  b === a + 1 && a >= 0 && b < ctx.words.length && sameSentence(ctx, a, b) && /^[ \t ]*$/.test(gapBetween(ctx, a, b))

/** index of the next word if it directly follows (no punctuation between), else -1 */
export const next = (ctx: RuleContext, i: number) => (adjacent(ctx, i, i + 1) ? i + 1 : -1)
/** index of the previous word if it directly precedes (no punctuation between), else -1 */
export const prev = (ctx: RuleContext, i: number) => (adjacent(ctx, i - 1, i) ? i - 1 : -1)

/** what follows word i up to the next word or sentence end (punctuation, spaces) */
export function gapAfter(ctx: RuleContext, i: number): string {
  const w = ctx.words[i]
  const sent = ctx.sentences[wordInfo(ctx, i)?.sent ?? 0]
  const nextStart = i + 1 < ctx.words.length && sameSentence(ctx, i, i + 1) ? ctx.words[i + 1].start : sent?.end ?? w.end
  return ctx.text.slice(w.end, Math.max(w.end, nextStart))
}

/** what precedes word i back to the previous word or sentence start */
export function gapBefore(ctx: RuleContext, i: number): string {
  const w = ctx.words[i]
  const sent = ctx.sentences[wordInfo(ctx, i)?.sent ?? 0]
  const prevEnd = i > 0 && sameSentence(ctx, i - 1, i) ? ctx.words[i - 1].end : sent?.start ?? w.start
  return ctx.text.slice(Math.min(prevEnd, w.start), w.start)
}

/** word i is the last word of its sentence or followed by punctuation */
export const endsPhrase = (ctx: RuleContext, i: number) => next(ctx, i) < 0
/** word i is the last word of its clause */
export const endsClause = (ctx: RuleContext, i: number) => {
  const c = clauseOf(ctx, i)
  return !!c && c.to === i
}

/* ------------------------------------------------------------------ */
/* Sequence matching                                                   */
/* ------------------------------------------------------------------ */

export type Pat = string | ReadonlySet<string> | ((w: Token, i: number) => boolean)

const matches = (p: Pat, w: Token, i: number) =>
  typeof p === 'string' ? w.lower === p : typeof p === 'function' ? p(w, i) : p.has(w.lower)

/** do the words starting at i match pats, each directly following the previous? */
export function matchAt(ctx: RuleContext, i: number, pats: Pat[]): boolean {
  for (let k = 0; k < pats.length; k++) {
    const j = i + k
    if (j >= ctx.words.length) return false
    if (k > 0 && !adjacent(ctx, j - 1, j)) return false
    if (!matches(pats[k], ctx.words[j], j)) return false
  }
  return true
}

/** all start indices where pats match consecutive adjacent words */
export function findSeq(ctx: RuleContext, pats: Pat[]): number[] {
  const out: number[] = []
  for (let i = 0; i + pats.length <= ctx.words.length; i++) if (matchAt(ctx, i, pats)) out.push(i)
  return out
}

/**
 * Like matchAt, but each optional pattern (wrapped in opt()) may be skipped.
 * Returns the index of the last matched word, or -1.
 */
export interface OptPat {
  opt: Pat
}
export const opt = (p: Pat): OptPat => ({ opt: p })
export function matchFlex(ctx: RuleContext, i: number, pats: Array<Pat | OptPat>): number {
  const step = (k: number, j: number): number => {
    if (k === pats.length) return j - 1
    const p = pats[k]
    const isOpt = typeof p === 'object' && 'opt' in p
    const pat = isOpt ? (p as OptPat).opt : (p as Pat)
    if (j < ctx.words.length && (j === i || adjacent(ctx, j - 1, j)) && matches(pat, ctx.words[j], j)) {
      const r = step(k + 1, j + 1)
      if (r >= 0) return r
    }
    return isOpt ? step(k + 1, j) : -1
  }
  return step(0, i)
}

/* ------------------------------------------------------------------ */
/* Casing                                                              */
/* ------------------------------------------------------------------ */

export const isCapitalized = (t: Token) => /^[^\p{L}]*\p{Lu}/u.test(t.text)
export const isAllCaps = (t: Token) => {
  const letters = t.text.replace(/[^\p{L}]/gu, '')
  return letters.length > 1 && letters === letters.toUpperCase() && letters !== letters.toLowerCase()
}
export const isLowercase = (t: Token) => t.text === t.text.toLowerCase()
/**
 * Sentence written in Title Case or a heading: most words after the first are capitalised.
 * `ignore` leaves out the words a rule is checking (so two errors don't make a title).
 */
export function looksLikeTitle(ctx: RuleContext, i: number, ignore: (lower: string) => boolean = () => false): boolean {
  const s = wordInfo(ctx, i)?.sent
  const words = ctx.words.filter(
    (w, k) => wordInfo(ctx, k)?.sent === s && !wordInfo(ctx, k)?.sentStart && /\p{L}/u.test(w.text) && !ignore(w.lower),
  )
  if (words.length < 2) return false
  return words.filter(isCapitalized).length >= words.length * 0.6
}

/** replacement in the casing of token t */
export const fix = (t: Token, replacement: string) => preserveCase(t.text, replacement)

/* ------------------------------------------------------------------ */
/* Dictionary                                                          */
/* ------------------------------------------------------------------ */

/** true if the dictionary knows the word (in its own casing or lowercased). False without a dictionary. */
export const known = (ctx: RuleContext, w: string) => !!ctx.dict && (ctx.dict.has(w) || ctx.dict.has(w.toLowerCase()))
/** true only when a dictionary is present and does not know the word */
export const unknown = (ctx: RuleContext, w: string) => !!ctx.dict && !known(ctx, w)

/* ------------------------------------------------------------------ */
/* Hits                                                                */
/* ------------------------------------------------------------------ */

export interface Msg {
  message: string
  messageLocal?: string
  explanation?: string
  explanationLocal?: string
  learnMore?: string
}

/** a hit spanning words from..to (inclusive) */
export function hitWords(
  ctx: RuleContext,
  from: number,
  to: number,
  replacements: string[],
  msg: Msg,
  confidence?: Confidence,
): RuleHit {
  const a = ctx.words[from]
  const b = ctx.words[to]
  return { offset: a.start, length: b.end - a.start, replacements, confidence, ...msg }
}

/** a hit on one word, replacements given in lowercase and re-cased like the original */
export function hitWord(ctx: RuleContext, i: number, replacements: string[], msg: Msg, confidence?: Confidence): RuleHit {
  const t = ctx.words[i]
  return hitWords(ctx, i, i, replacements.map((r) => fix(t, r)), msg, confidence)
}

export function hitSpan(start: number, end: number, replacements: string[], msg: Msg, confidence?: Confidence): RuleHit {
  return { offset: start, length: end - start, replacements, confidence, ...msg }
}

/** replace word `at` inside the span from..to, keeping the original text around it */
export function spanWithWord(ctx: RuleContext, from: number, to: number, at: number, replacement: string): string {
  const a = ctx.words[from]
  const b = ctx.words[to]
  const w = ctx.words[at]
  return ctx.text.slice(a.start, w.start) + fix(w, replacement) + ctx.text.slice(w.end, b.end)
}

/** text of words from..to with word `drop` removed (and one adjacent space) */
export function spanWithout(ctx: RuleContext, from: number, to: number, drop: number): string {
  const a = ctx.words[from]
  const b = ctx.words[to]
  const w = ctx.words[drop]
  const before = ctx.text.slice(a.start, w.start)
  const after = ctx.text.slice(w.end, b.end)
  return drop === from ? after.replace(/^\s+/, '') : before.replace(/\s+$/, '') + after
}
