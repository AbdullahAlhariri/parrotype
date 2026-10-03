import type { Issue, Lang, Token } from '@/types'
import { ABBREVIATIONS, splitSentences, tokenize } from '../tokenize'
import type { FreqRanks } from './freq'
import { spellCopy } from './messages'
import { rankSuggestions, type MisspellingMap, type RankedSuggestion, type SpellBackend } from './rank'
import { ARABIC_RE, LATIN_RE, caseShape, toLookup } from './text'

export interface SpellCheckOptions {
  /** personal dictionary (lookup forms); a lowercase entry also accepts Capitalised and ALL CAPS */
  personal?: ReadonlySet<string>
  misspellings?: MisspellingMap
  /** reused across checks: word -> ranked suggestions (only complete results are stored) */
  cache?: Map<string, RankedSuggestion[]>
  /** ms of Hunspell suggestion time per check; words beyond it get the quick candidates only */
  suggestBudgetMs?: number
  /** max suggestions per issue */
  maxSuggestions?: number
}

/** Dictionary membership with the personal dictionary, ĳ ligatures and curly apostrophes handled. */
export function makeIsKnown(backend: SpellBackend, personal?: ReadonlySet<string>) {
  const memo = new Map<string, boolean>()
  return (word: string): boolean => {
    const w = toLookup(word)
    let hit = memo.get(w)
    if (hit !== undefined) return hit
    hit = inPersonal(w, personal) || backend.testSpelling(w)
    if (memo.size > 5000) memo.clear()
    memo.set(w, hit)
    return hit
  }
}

export function inPersonal(word: string, personal?: ReadonlySet<string>): boolean {
  if (!personal?.size) return false
  const w = toLookup(word)
  if (personal.has(w)) return true
  const lower = w.toLowerCase()
  if (personal.has(lower)) return true
  if (caseShape(w) === 'upper') for (const p of personal) if (p.toLowerCase() === lower) return true
  return false
}

const CLITIC = /^['’][stnkmr]$/i
const HAS_DIGIT = /\p{N}/u
const LETTER = /\p{L}/u

/* The user writes in three languages. Skip sentences that are clearly in another one. */
const STOP: Record<'nl' | 'en', ReadonlySet<string>> = {
  nl: new Set('de het een en van ik je jij niet dat op te zijn met voor naar maar ook wat er hij zij we wij heb heeft dit die is'.split(' ')),
  en: new Set('the and of to you with are this that have it for not be my your was were will would what they'.split(' ')),
}

function isForeign(words: Token[], lang: Lang): boolean {
  const arabic = words.filter((t) => ARABIC_RE.test(t.text)).length
  if (lang === 'ar') return arabic === 0
  if (arabic * 2 > words.length) return true
  const own = lang === 'nl' ? STOP.nl : STOP.en
  const other = lang === 'nl' ? STOP.en : STOP.nl
  const o = words.filter((t) => other.has(t.lower) && !own.has(t.lower)).length
  const m = words.filter((t) => own.has(t.lower) && !other.has(t.lower)).length
  return o >= 3 && o > m * 2
}

interface Piece {
  text: string
  start: number
  /** first word of a sentence (capitalised words there are not names) */
  initial: boolean
}

/**
 * Words to look up: hyphenated words are checked part by part (Noord-Holland, e-mailadres),
 * except a Dutch compound that only needs its hyphen removed (koffie-automaat).
 */
function pieces(tok: Token, initial: boolean, lang: Lang, isKnown: (w: string) => boolean): Piece[] | 'ok' {
  const text = tok.text
  const whole = [{ text, start: tok.start, initial }]
  if (!/[-‐‑]/.test(text) || isKnown(text)) return whole
  const out: Piece[] = []
  let at = 0
  for (const part of text.split(/[-‐‑]/)) {
    if (part) out.push({ text: part, start: tok.start + at, initial: initial && at === 0 })
    at += part.length + 1
  }
  const fine = out.every((p) => isKnown(p.text) || p.text.length < 2 || caseShape(p.text) !== 'lower')
  if (fine && lang === 'nl' && caseShape(text) === 'lower' && isKnown(text.replace(/[-‐‑]/g, ''))) return whole
  return fine ? 'ok' : out
}

/** Should we look this word up at all? Numbers, abbreviations, codes and other scripts are skipped. */
function lookable(w: string, lang: Lang): boolean {
  if (w.length < 2 || CLITIC.test(w)) return false
  if (HAS_DIGIT.test(w) || w.includes('.') || w.includes('/') || w.includes('@')) return false
  if (!LETTER.test(w)) return false
  const shape = caseShape(w)
  if (shape === 'upper' || shape === 'mixed') return false // NAVO, KLM, iPhone, McDonald
  if (lang === 'ar' ? LATIN_RE.test(w) : ARABIC_RE.test(w)) return false
  return true
}

/**
 * Find words the dictionary does not know and suggest fixes.
 * Capitalised words in the middle of a sentence are treated as names unless the fix is obvious
 * (a known misspelling, a missing trema, a d/t slip...).
 */
export function checkSpelling(
  text: string,
  lang: Lang,
  backend: SpellBackend,
  freq: FreqRanks | undefined,
  opts: SpellCheckOptions = {},
): Issue[] {
  if (!text.trim()) return []
  const isKnown = makeIsKnown(backend, opts.personal)
  const tokens = tokenize(text, lang)
  const sentences = splitSentences(text, tokens)
  const budget = opts.suggestBudgetMs ?? 350
  const max = opts.maxSuggestions ?? 6
  const cache = opts.cache
  let spent = 0
  const issues: Issue[] = []

  const suggestionsFor = (word: string): RankedSuggestion[] => {
    const key = `${lang}\u0000${word}`
    const hit = cache?.get(key)
    if (hit) return hit
    const withHunspell = spent < budget
    const t0 = withHunspell ? performance.now() : 0
    const ranked = rankSuggestions(word, {
      lang,
      isKnown,
      backend,
      freq,
      misspellings: opts.misspellings,
      hunspell: withHunspell,
    })
    if (withHunspell) {
      spent += performance.now() - t0
      if (cache) {
        if (cache.size > 2000) cache.delete(cache.keys().next().value!)
        cache.set(key, ranked)
      }
    }
    return ranked
  }

  for (const s of sentences) {
    const words = s.tokens.filter((t) => t.isWord)
    if (!words.length || isForeign(words, lang)) continue
    words.forEach((tok, wi) => {
      if (abbreviation(tok)) return
      const ps = pieces(tok, wi === 0, lang, isKnown)
      if (ps === 'ok') return
      for (const p of ps) {
        const issue = checkPiece(p, ps.length > 1)
        if (issue) issues.push(issue)
      }
    })
  }
  return issues

  /** bijv., blz., Dr. and other abbreviations the dictionary knows with their dot */
  function abbreviation(tok: Token): boolean {
    if (text[tok.end] !== '.') return false
    return ABBREVIATIONS.has(tok.lower) || isKnown(tok.text + '.')
  }

  function checkPiece(p: Piece, isPart: boolean): Issue | null {
    const w = p.text
    if (!lookable(w, lang) || isKnown(w)) return null
    const lookup = toLookup(w)
    // possessive with 's: names everywhere (Fatima's, Yusra's), any known word in English (teacher's).
    // Dutch "computer's" stays flagged: after a consonant the plural is just -s.
    const poss = /^(.+)'s$/.exec(lookup)
    if (poss && (caseShape(poss[1]) === 'capital' || (lang === 'en' && isKnown(poss[1])))) return null
    const shape = caseShape(w)

    const ranked = suggestionsFor(w)
    const best = ranked[0]
    // IJsland, iPhone, McDonald: same word, other capitals (an all-caps BEA for Bea is not that)
    const caseFix = best?.kind === 'case' && caseShape(best.word) !== 'upper'
    if (shape === 'capital' && best?.kind !== 'map' && !caseFix) {
      // Probably a name: nothing close, or the nearest word is another name (Yusra, Aylin -> Aydin).
      // That holds at the start of a sentence too. Mid-sentence we also want an obvious slip of a
      // common word (Ideeen, a long Huiswerkopdrcht), because capitals there are mostly names.
      if (!best || !isKnown(best.word.toLowerCase())) return null
      if (!p.initial && !(best.score < 0.75 || ([...w].length >= 8 && best.dist <= 1))) return null
    }
    if (isPart && !ranked.length && shape !== 'lower') return null

    const replacements = ranked.slice(0, max).map((r) => r.word)
    const copy = spellCopy(w, best, lang)
    // a capitalised word a whole letter away from its fix may still be a name we do not know (Priya)
    const unsure = shape === 'capital' && best && best.kind !== 'map' && !caseFix && best.dist >= 1
    const confidence = !replacements.length ? 'medium' : unsure ? 'medium' : 'high'
    return {
      id: `spell@${p.start}:${w.length}`,
      ruleId: 'spell',
      source: 'spell',
      lang,
      category: copy.category,
      offset: p.start,
      length: w.length,
      text: w,
      message: copy.message,
      messageLocal: copy.messageLocal,
      explanation: copy.explanation,
      explanationLocal: copy.explanationLocal,
      replacements,
      confidence,
    }
  }
}
