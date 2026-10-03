import type { Lang } from '@/types'
import nl from '@/content/words/nl.json'
import en from '@/content/words/en.json'
import ar from '@/content/words/ar.json'
import { shuffle } from '@/lib/random'
import type { Weakness } from './keystats'
import { graphemes, normalizeTypingText } from './text'

// Word lists for typing tests and weakness drills (real words, interleaved).

const LISTS: Record<Lang, string[]> = { nl: nl.words, en: en.words, ar: ar.words }

/** The frequency-ranked word list for a language (top `size` words). */
export const wordList = (lang: Lang, size?: number): string[] => (size ? LISTS[lang].slice(0, size) : LISTS[lang])

export interface GenerateOptions {
  count: number
  /** top-N most frequent words to draw from (default 200; Arabic has 2000 in total) */
  list?: 200 | 1000 | 3000
  punctuation?: boolean
  numbers?: boolean
  rand?: () => number
}

const MARKS: Record<Lang, { comma: string; question: string; semicolon: string }> = {
  nl: { comma: ',', question: '?', semicolon: ';' },
  en: { comma: ',', question: '?', semicolon: ';' },
  ar: { comma: '،', question: '؟', semicolon: '؛' },
}

/** Uniform random words without repeating either of the previous two (Monkeytype style). */
export function generateWords(lang: Lang, opts: GenerateOptions): string[] {
  const rand = opts.rand ?? Math.random
  const pool = LISTS[lang].slice(0, opts.list ?? 200).filter((w) => opts.punctuation || lang !== 'en' || w !== 'i')
  const out: string[] = []
  if (!pool.length) return out
  while (out.length < opts.count) {
    let w = pool[Math.floor(rand() * pool.length)]
    for (let tries = 0; tries < 100 && pool.length > 2 && (w === out[out.length - 1] || w === out[out.length - 2]); tries++) {
      w = pool[Math.floor(rand() * pool.length)]
    }
    if (opts.numbers && rand() < 0.1) w = String(Math.floor(rand() * 10 ** (1 + Math.floor(rand() * 4))))
    out.push(w)
  }
  return opts.punctuation ? punctuate(out, lang, rand) : out
}

function capitalise(w: string, lang: Lang): string {
  if (lang === 'ar' || !w) return w
  if (lang === 'nl' && w.startsWith('ij')) return 'IJ' + w.slice(2)
  return w[0].toUpperCase() + w.slice(1)
}

/** Sentence-ish punctuation: capitals after a sentence end, commas, the odd quote or bracket. */
function punctuate(words: string[], lang: Lang, rand: () => number): string[] {
  const m = MARKS[lang]
  const out: string[] = []
  let start = true
  let inSentence = 0
  words.forEach((word, i) => {
    let w = start ? capitalise(word, lang) : word
    if (lang === 'en' && w === 'i') w = 'I'
    start = false
    inSentence++
    const r = rand()
    const end = () => {
      const p = rand()
      return p < 0.7 ? '.' : p < 0.85 ? m.question : '!'
    }
    if (i === words.length - 1) w += end()
    else if (inSentence >= 3 && r < 0.12) {
      w += end()
      start = true
      inSentence = 0
    } else if (r < 0.22) w += m.comma
    else if (r < 0.245 && inSentence >= 2) w += rand() < 0.5 ? m.semicolon : ':'
    else if (r < 0.27) w = `"${w}"`
    else if (r < 0.285) w = `(${w})`
    out.push(w)
  })
  return out
}

/** Split a sentence or story into typing words, with typographic quotes/dashes made typable. */
export const sentenceToWords = (text: string): string[] => normalizeTypingText(text).split(/\s+/).filter(Boolean)

/* ------------------------------------------------------------------ */
/* Drills                                                               */
/* ------------------------------------------------------------------ */

export interface DrillOptions {
  /** words due for review (spaced repetition); they fill about 15% of the drill */
  review?: string[]
  /** how many top words to search for target words (default: the whole list) */
  list?: number
}

interface Targets {
  focus?: { unit: string; score: number }
  support: { unit: string; score: number }[]
  bigrams: { unit: string; score: number }[]
}

function pickTargets(ws: Weakness[]): Targets {
  const units = ws.filter((w) => w.weak !== false && graphemes(w.unit).every((g) => /\p{L}/u.test(g)))
  const keys = units.filter((w) => w.kind === 'key').map((w) => ({ unit: w.unit.toLowerCase(), score: Math.max(w.score, 0.01) }))
  const bigrams = units.filter((w) => w.kind === 'bigram').map((w) => ({ unit: w.unit.toLowerCase(), score: Math.max(w.score, 0.01) }))
  return { focus: keys[0], support: keys.slice(1, 3), bigrams: bigrams.slice(0, 3) }
}

/** How well a word trains the targets (0 = contains none of them). */
function scoreWord(word: string, t: Targets, rank: number): number {
  const g = graphemes(word.toLowerCase())
  let s = 0
  for (let i = 0; i < g.length; i++) {
    if (t.focus && g[i] === t.focus.unit) s += 3 * t.focus.score
    else {
      const sup = t.support.find((k) => k.unit === g[i])
      if (sup) s += 1.5 * sup.score
    }
    if (i > 0) {
      const bg = t.bigrams.find((b) => b.unit === g[i - 1] + g[i])
      if (bg) s += 2.5 * bg.score
    }
  }
  if (!s) return 0
  const freqBonus = 1 / Math.log2(2 + rank)
  const lenPenalty = g.length > 10 ? 0.7 : 1
  return s * (0.6 + 0.4 * freqBonus) * lenPenalty
}

/** Weighted sampling without replacement; temp < 1 sharpens towards the best scores. */
function sample<T>(items: { x: T; w: number }[], k: number, rand: () => number, temp = 0.7): T[] {
  const pool = items.map((it) => ({ x: it.x, w: Math.pow(Math.max(it.w, 1e-9), 1 / temp) }))
  const out: T[] = []
  while (out.length < k && pool.length) {
    const total = pool.reduce((a, p) => a + p.w, 0)
    let r = rand() * total
    let idx = 0
    while (idx < pool.length - 1 && (r -= pool[idx].w) > 0) idx++
    out.push(pool.splice(idx, 1)[0].x)
  }
  return out
}

/** Merge groups so each is spread evenly (largest deficit first), then break up immediate repeats. */
function interleave(groups: string[][]): string[] {
  const total = groups.reduce((a, g) => a + g.length, 0)
  const used = groups.map(() => 0)
  const out: string[] = []
  for (let n = 1; n <= total; n++) {
    let best = -1
    let bestDeficit = -Infinity
    groups.forEach((g, k) => {
      if (used[k] >= g.length) return
      const deficit = (g.length * n) / total - used[k]
      if (deficit > bestDeficit) {
        bestDeficit = deficit
        best = k
      }
    })
    out.push(groups[best][used[best]++])
  }
  for (let i = 1; i < out.length; i++) {
    if (out[i] !== out[i - 1]) continue
    const a = out[i]
    for (let j = i + 1; j < out.length; j++) {
      const b = out[j]
      if (b === a) continue
      // b moves to i, a moves to j: neither may touch a copy of itself
      const bOk = out[i - 1] !== b && (j === i + 1 || out[i + 1] !== b)
      const aOk = (j === i + 1 || out[j - 1] !== a) && (j + 1 >= out.length || out[j + 1] !== a)
      if (aOk && bOk) {
        out[i] = b
        out[j] = a
        break
      }
    }
  }
  return out
}

/**
 * A drill of real words aimed at the weakest keys and bigrams: about 60% target words,
 * 25% common filler and 15% review words (70/30 without review words). With no confident
 * weaknesses yet it falls back to a varied diagnostic from the top 1000 words.
 */
export function generateDrill(lang: Lang, weaknesses: Weakness[], count: number, rand: () => number = Math.random, opts: DrillOptions = {}): string[] {
  const review = shuffle((opts.review ?? []).filter(Boolean), rand)
  const nReview = Math.min(review.length, Math.round(count * 0.15))
  const t = pickTargets(weaknesses)
  if (!t.focus && !t.bigrams.length) {
    const words = generateWords(lang, { count: count - nReview, list: 1000, rand })
    return interleave([words, review.slice(0, nReview)])
  }
  const lexicon = wordList(lang, opts.list)
  const nTarget = Math.round(count * (nReview ? 0.6 : 0.7))
  const nFiller = Math.max(0, count - nTarget - nReview)

  const candidates = lexicon.map((x, rank) => ({ x, w: scoreWord(x, t, rank) })).filter((c) => c.w > 0)
  let targets = sample(candidates, nTarget, rand)
  // few matching words: allow each one a second time rather than drift off target
  if (targets.length < nTarget) targets = targets.concat(sample(candidates, nTarget - targets.length, rand))

  const picked = new Set(targets)
  const fillerPool = lexicon.slice(0, 300).filter((w) => !picked.has(w))
  const fillers = shuffle(fillerPool, rand).slice(0, nFiller + (nTarget - targets.length))
  return interleave([targets, fillers, review.slice(0, nReview)]).slice(0, count)
}
