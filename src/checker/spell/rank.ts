import type { Lang } from '@/types'
import { editCandidates, generateCandidates, splitCandidates, type Candidate, type CandidateKind } from './candidates'
import { subCost, weightedDistance } from './distance'
import { freqPenalty, type FreqRanks } from './freq'
import { applyCase, capitalize, caseShape, restoreApostrophe, toLookup } from './text'

/** What the spell layer needs from Hunspell (or a stand-in in tests). */
export interface SpellBackend {
  testSpelling(word: string): boolean
  getSpellingSuggestions(word: string): string[]
}

/** wrong (lowercase) -> right, from the rule lexicons (why: Dutch reason key, note: English memory hook) */
export type MisspellingMap = ReadonlyMap<string, { right: string; why?: string; note?: string }>

export interface RankContext {
  lang: Lang
  /** is this exact form a word? (Hunspell + personal dictionary) */
  isKnown: (word: string) => boolean
  backend?: SpellBackend
  freq?: FreqRanks
  misspellings?: MisspellingMap
  /** ask Hunspell for suggestions too (slow for long words, ~5-120 ms) */
  hunspell?: boolean
}

export interface RankedSuggestion {
  /** the suggestion in the casing of the original word */
  word: string
  /** lower is better: distance + rarity + kind bonus (map hits are pushed below -90) */
  score: number
  /** the plain weighted edit distance from the typed word */
  dist: number
  kind: CandidateKind
  /** misspelling-map reason and memory hook, when kind is 'map' */
  why?: string
  note?: string
}

/** Targeted Dutch/Arabic rewrites are what people mean far more often than a random edit. */
/* A case fix gets only a small bonus: a lowercase typo that happens to be a name (betje/Betje) should
   still lose to the common word (beetje). */
const KIND_BONUS: Partial<Record<CandidateKind, number>> = {
  trema: -0.3, accent: -0.25, 'trema-drop': -0.25, 'tussen-n': -0.4, 'tussen-n-drop': -0.4, kofschip: -0.3,
  dt: -0.3, 'ei-ij': -0.25, 'au-ou': -0.2, ending: -0.3, apostrophe: -0.3, 'apostrophe-drop': -0.25,
  'ie-ei': -0.2, hamza: -0.3, 'hamza-drop': -0.3, 'hamza-seat': -0.25, 'ta-marbuta': -0.25, 'alif-maqsura': -0.25,
  'final-alif': -0.2, join: -0.2, case: -0.1,
}

/** Rare Hunspell compounds and splits this far behind the best candidate are noise (ontwikkellong). */
const RARE_MARGIN = 0.4

/** Dutch glues compounds together, so a split is rarely what a Dutch writer meant. */
const SPLIT_WEIGHT: Record<Lang, number> = { nl: 0.6, en: 0.1, ar: 0.4 }

const ligatureFree = (s: string) => toLookup(s)

/** Rank correction candidates for one unknown word. Best first, cased like the original. */
export function rankSuggestions(word: string, ctx: RankContext, limit = 8): RankedSuggestion[] {
  const { lang, isKnown, freq } = ctx
  const lookup = toLookup(word)
  const lower = lookup.toLowerCase()
  const shape = caseShape(lookup)
  const isCommon = (w: string) => !!freq?.has(w)
  // the frequency lists have no apostrophes (subtitles split "don't"), so rank by the part before it
  const rankOf = (w: string) => freq?.get(w) ?? (w.includes("'") ? freq?.get(w.split("'")[0]) : undefined)
  const validMulti = (w: string) => w.split(' ').every((p) => p === '' || isKnown(p) || isKnown(p.toLowerCase()))
  /** a split or an inserted hyphen is only worth offering when both halves are everyday words */
  const splitPart = (p: string) => {
    if ((lang === 'en' && (p === 'a' || p === 'i')) || p === "'s") return true
    const r = freq?.get(p)
    return r !== undefined && p.length > 1 && r < (p.length <= 3 ? 3000 : 12000)
  }
  const commonParts = (w: string) => !freq || w.toLowerCase().split(/[ -]/).every(splitPart)

  const pool = new Map<string, Candidate & { order: number; why?: string; note?: string }>()
  const weightOf = (c: Candidate) => (KIND_BONUS[c.kind] ?? 0) + (c.weight ?? 0)
  const offer = (c: Candidate, order = 0, why?: string, note?: string) => {
    const key = c.word
    const prev = pool.get(key)
    if (prev?.kind === 'map') return
    if (!prev || c.kind === 'map' || weightOf(c) < weightOf(prev)) {
      pool.set(key, { ...c, order, why, note })
    }
  }

  const hit = ctx.misspellings?.get(lower)
  if (hit) offer({ word: hit.right, kind: 'map' }, 0, hit.why, hit.note)

  for (const c of generateCandidates(lower, lang)) if (validMulti(c.word)) offer(c)
  // capital letters: nederlands -> Nederlands, ijsland/Ijsland -> IJsland
  if (shape === 'lower' || shape === 'capital') {
    const cap = capitalize(lower, lang)
    if (cap !== lookup && isKnown(cap)) offer({ word: cap, kind: 'case' })
  }
  if (freq) {
    // the frequency lists come from subtitles and hold common misspellings too (Arabic الى, ان),
    // so the dictionary has the last word
    for (const c of editCandidates(lower, lang, isCommon)) {
      if (isKnown(c.word)) offer(c)
      else if (lang !== 'ar' && isKnown(capitalize(c.word, lang))) offer({ ...c, word: capitalize(c.word, lang) })
    }
    // Dutch writes compounds as one word (OpenTaal even sets NOSPLITSUGS); its fused phrases are in the map
    if (lang !== 'nl') for (const c of splitCandidates(lower, splitPart, lang)) if (validMulti(c.word)) offer(c)
  }
  if (ctx.backend && ctx.hunspell !== false) {
    const raw = ctx.backend.getSpellingSuggestions(lookup)
    raw.forEach((s, i) => {
      const w = ligatureFree(s)
      const wl = w.toLowerCase()
      if (wl === lower && w === lookup) return
      if (wl === lower) offer({ word: w, kind: 'case' }, i)
      else if (w.includes(' ')) {
        // koffie-automaat -> "koffie automaat" swaps one mistake for another
        if (!lower.includes('-') && commonParts(w) && validMulti(w)) offer({ word: w, kind: 'split' }, i)
      } else if (!lower.includes('-') && wl.replace(/-/g, '') === lower) {
        if (commonParts(w)) offer({ word: w, kind: 'split', weight: 0.2 }, i) // int-resting
      } else if (validMulti(w)) offer({ word: w, kind: 'hunspell' }, i)
    })
  }

  const first = [...lower][0] ?? ''
  const scored: RankedSuggestion[] = []
  for (const c of pool.values()) {
    const cased = c.kind === 'case' ? c.word : applyCase(shape, c.word, lang)
    if (cased === lookup) continue
    const candLower = cased.toLowerCase()
    const dist = weightedDistance(lookup, cased, lang)
    let score = dist
    const parts = candLower.split(' ').filter(Boolean)
    score += Math.max(...parts.map((p) => freqPenalty(rankOf(p)))) + (parts.length > 1 ? 0.1 : 0)
    // people rarely get the first letter wrong, unless it is a sound-alike or a neighbouring key
    const cf = [...candLower][0] ?? ''
    if (cf !== first && subCost(first, cf, lang) >= 1) score += 0.35
    score += weightOf(c) + (c.kind === 'split' ? SPLIT_WEIGHT[lang] : 0)
    if (c.kind === 'hunspell') score += 0.03 * c.order
    if (c.kind === 'map') score -= 100
    scored.push({ word: restoreApostrophe(word, cased), score, dist, kind: c.kind, why: c.why, note: c.note })
  }
  scored.sort((a, b) => a.score - b.score)

  // keep the list tight: nothing far worse than the best real candidate (definitely, not effeminately)
  const best = Math.min(...scored.map((s) => s.score + (s.kind === 'map' ? 100 : 0)))
  const cutoff = best + 1.6
  const rare = (s: RankedSuggestion) =>
    (s.kind === 'hunspell' || s.kind === 'split') &&
    s.score > best + RARE_MARGIN &&
    s.word.toLowerCase().split(/[ -]/).some((p) => rankOf(p) === undefined)
  const seen = new Set<string>()
  const out: RankedSuggestion[] = []
  for (const s of scored) {
    const key = s.word.toLowerCase()
    if (seen.has(key) || (s.kind !== 'map' && (s.score > cutoff || (out.length > 0 && rare(s))))) continue
    seen.add(key)
    out.push(s)
    if (out.length >= limit) break
  }
  return out
}
