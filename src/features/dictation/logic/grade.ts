import { alignWords, charDiff, classifyOps, type CharOp, type WordOp } from '@/engine/align'
import type { TypoLabel } from '@/engine/typo'
import { graphemes, normalizeInput } from '@/engine/text'
import type { Lang } from '@/types'

/**
 * Grading of one dictation attempt: word alignment (engine), a typo label per wrong word,
 * a letter diff for rendering, and the score. Case counts (capitals are part of the
 * practice), punctuation is shown but never scored, Arabic tashkeel is ignored.
 */

export type TokenStatus = 'ok' | 'wrong' | 'missing' | 'extra'

export interface GradedToken {
  op: WordOp
  status: TokenStatus
  punct: boolean
  label: TypoLabel | null
  /** letter diff expected vs typed, for wrong words (sub / split / merge) */
  chars: CharOp[] | null
  /** minimal-pair mode: this is the pair word */
  isTarget: boolean
  /** first word of a sentence (a missed capital there is a slip, not a word to practise) */
  sentenceStart: boolean
}

export interface Grade {
  /** the normalised target and attempt the ranges refer to */
  expected: string
  typed: string
  tokens: GradedToken[]
  /** expected words typed right */
  correct: number
  /** expected words */
  total: number
  /** extra typed words */
  extra: number
  /** correct / total, 0..1 */
  score: number
  /** every word right (punctuation ignored) */
  perfect: boolean
  /** words right, punctuation differs */
  punctOnly: boolean
  /** minimal pairs: the pair word is right (undefined outside pair mode) */
  targetOk?: boolean
  /** the word tokens that are not ok */
  wrong: GradedToken[]
}

/** NFC, straight quotes, single spaces, presentation forms expanded, no tatweel. */
export function normaliseAttempt(text: string): string {
  return normalizeInput(text)
    .replace(/[‘’ʼ`´]/g, "'")
    .replace(/[“”„]/g, '"')
    .replace(/ـ/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const SENTENCE_END = /^[.?!؟:;]$/

export function gradeAttempt(expected: string, typedRaw: string, lang: Lang, target?: string): Grade {
  const typed = normaliseAttempt(typedRaw)
  const exp = normaliseAttempt(expected)
  const ops = alignWords(exp, typed, { ignoreDiacritics: lang === 'ar' })
  const labels = classifyOps(ops, lang)
  const want = target?.toLowerCase()
  let targetSeen = false
  let prevExpected: WordOp | undefined

  const tokens: GradedToken[] = ops.map((op, i) => {
    const punct = !!op.punct
    const status: TokenStatus = op.op === 'equal' ? 'ok' : op.op === 'del' ? 'missing' : op.op === 'ins' ? 'extra' : 'wrong'
    const chars = !punct && (op.op === 'sub' || op.op === 'split' || op.op === 'merge') ? charDiff(op.expected ?? '', op.typed ?? '') : null
    let isTarget = false
    if (want && !targetSeen && op.expected !== undefined && op.expected.toLowerCase().split(' ').includes(want)) {
      isTarget = true
      targetSeen = true
    }
    const sentenceStart = op.expected !== undefined && (!prevExpected || (!!prevExpected.punct && SENTENCE_END.test(prevExpected.expected ?? '')))
    if (op.expected !== undefined) prevExpected = op
    return { op, status, punct, label: labels[i], chars, isTarget, sentenceStart }
  })

  let correct = 0
  let total = 0
  let extra = 0
  let punctWrong = 0
  for (const t of tokens) {
    if (t.punct) {
      if (t.status !== 'ok') punctWrong++
      continue
    }
    if (t.status === 'extra') extra++
    else {
      const n = t.op.op === 'merge' ? 2 : 1
      total += n
      if (t.status === 'ok') correct += n
    }
  }
  const wrong = tokens.filter((t) => !t.punct && t.status !== 'ok')
  const perfect = wrong.length === 0
  const grade: Grade = {
    expected: exp,
    typed,
    tokens,
    correct,
    total,
    extra,
    score: total ? correct / total : 1,
    perfect,
    punctOnly: perfect && punctWrong > 0,
    wrong,
  }
  if (want) grade.targetOk = tokens.some((t) => t.isTarget && t.status === 'ok')
  return grade
}

/* ------------------------------------------------------------------ */
/* Rendering helpers                                                   */
/* ------------------------------------------------------------------ */

/** 0 = no feedback yet, 1 = mark wrong words, 2 = narrow to letters, 3 = show the rule, 4 = reveal */
export type HintLevel = 0 | 1 | 2 | 3 | 4

export type GlyphKind = 'ok' | 'wrong' | 'missing' | 'extra' | 'fixed'

export interface Glyph {
  /** the character; '' for a gap that should not give the letter away */
  ch: string
  kind: GlyphKind
}

/**
 * What the user typed, marked as far as the hint level allows. Level 1 marks only whole words
 * (the caller underlines the token), level 2+ marks letters: wrong letters, extra letters,
 * and gaps where a letter is missing (the missing letter itself stays hidden).
 */
export function typedGlyphs(t: GradedToken, level: HintLevel): Glyph[] {
  if (t.status === 'missing') {
    // a word that was not typed: a short gap at level 1, one gap per letter from level 2
    const n = level >= 2 ? graphemes(t.op.expected ?? '').length : 1
    return Array.from({ length: n }, () => ({ ch: '', kind: 'missing' }))
  }
  const text = t.op.typed ?? ''
  if (t.status === 'extra') return graphemes(text).map((ch) => ({ ch, kind: level >= 2 ? 'extra' : 'ok' }))
  if (t.status === 'ok' || !t.chars || level < 2) return graphemes(text).map((ch) => ({ ch, kind: 'ok' }))
  const out: Glyph[] = []
  for (const c of t.chars) {
    if (c.op === 'equal') out.push({ ch: c.b ?? '', kind: 'ok' })
    else if (c.op === 'sub') out.push({ ch: c.b ?? '', kind: 'wrong' })
    else if (c.op === 'ins') out.push({ ch: c.b ?? '', kind: 'extra' })
    else out.push({ ch: '', kind: 'missing' })
  }
  return out
}

/** The correct word with the letters the user got wrong or left out marked as 'fixed'. */
export function expectedGlyphs(t: GradedToken): Glyph[] {
  const text = t.op.expected ?? ''
  if (t.status === 'ok') return graphemes(text).map((ch) => ({ ch, kind: 'ok' }))
  if (t.status === 'missing' || !t.chars) return graphemes(text).map((ch) => ({ ch, kind: 'fixed' }))
  const out: Glyph[] = []
  for (const c of t.chars) {
    if (c.op === 'equal') out.push({ ch: c.a ?? '', kind: 'ok' })
    else if (c.op === 'sub' || c.op === 'del') out.push({ ch: c.a ?? '', kind: 'fixed' })
  }
  return out
}
