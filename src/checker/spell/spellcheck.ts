import type { Issue, Lang, Token } from '@/types'
import { apostropheLike } from '../engine'
import { isForeignSentence } from '../foreign'
import { ABBREVIATIONS, splitSentences, tokenize } from '../tokenize'
import type { FreqRanks } from './freq'
import { isExtraWord, phraseRanges } from './extra'
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

/**
 * Dictionary membership with the personal dictionary, ĳ ligatures and curly apostrophes handled.
 * With a language, the extra word list (chat abbreviations, loanwords, Dutch places in Arabic) counts too.
 */
export function makeIsKnown(backend: SpellBackend, personal?: ReadonlySet<string>, lang?: Lang) {
  const memo = new Map<string, boolean>()
  return (word: string): boolean => {
    const w = toLookup(word)
    let hit = memo.get(w)
    if (hit !== undefined) return hit
    hit = inPersonal(w, personal) || (!!lang && isExtraWord(w, lang)) || backend.testSpelling(w)
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
const OPEN_QUOTE = /["“„«‘'‚]/
const CLOSE_QUOTE = /["”»’'“‘]/
const AR_PREFIX = /^(?:[وف]?(?:[بلك]?ال|لل|[بلك])|[وف])/

/** fixes that only change a mark or a letter's shape: a capitalised word with one of these is no name */
const MARK_KINDS: ReadonlySet<string> = new Set(['map', 'case', 'trema', 'accent', 'trema-drop'])
/** the Arabic rewrites that target this user's real mistakes (hamza, ة/ه, ى/ي) */
const AR_TARGETED: ReadonlySet<string> = new Set(['map', 'hamza', 'hamza-drop', 'hamza-seat', 'ta-marbuta', 'alif-maqsura', 'final-alif'])

/**
 * Arabic words have no capitals, so a name or loanword the dictionary lacks (أوتريخت, روتردام) looks
 * like a typo. Only a targeted rewrite, or a fix that is a word people write and a small slip away,
 * is sure; a far or rare fix is just a hint.
 */
function arabicConfidence(best: RankedSuggestion, common: boolean): Issue['confidence'] {
  if (AR_TARGETED.has(best.kind)) return 'high'
  if (common && best.dist <= 1) return 'high'
  if (common && best.dist < 1.6) return 'medium'
  return 'low'
}

const isCapitalised = (w: string) => {
  const shape = caseShape(w)
  return shape === 'capital' || shape === 'upper'
}
const HAS_DIGIT = /\p{N}/u
const LETTER = /\p{L}/u

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
  const isKnown = makeIsKnown(backend, opts.personal, lang)
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

  const phrases = phraseRanges(text, lang)
  for (const s of sentences) {
    const words = s.tokens.filter((t) => t.isWord)
    if (!words.length || isForeignSentence(words, lang)) continue
    words.forEach((tok, wi) => {
      if (abbreviation(tok) || quotedMention(tok)) return
      if (phrases.some(([a, b]) => tok.start >= a && tok.end <= b)) return
      const ps = pieces(tok, wi === 0, lang, isKnown)
      if (ps === 'ok') return
      // a capitalised neighbour (not the sentence's first word) makes a capitalised word part of a name
      const nameNext = wi + 1 < words.length && isCapitalised(words[wi + 1].text)
      const namePrev = wi > 1 && isCapitalised(words[wi - 1].text)
      for (const p of ps) {
        const issue = checkPiece(p, ps.length > 1, nameNext || namePrev)
        if (issue) issues.push(issue)
      }
    })
  }
  return issues

  /** one word in quotes: the writer talks about the word (She typed "teh"), so it is not checked */
  function quotedMention(tok: Token): boolean {
    const open = text[tok.start - 1]
    const close = text[tok.end]
    if (!open || !close || !OPEN_QUOTE.test(open) || !CLOSE_QUOTE.test(close)) return false
    const before = text[tok.start - 2]
    const after = text[tok.end + 1]
    return (before === undefined || /[\s([:]/.test(before)) && (after === undefined || !LETTER.test(after))
  }

  /** a capitalised word mid-sentence that splits into two known words is a street or place (Lauriergracht) */
  function knownCompound(w: string): boolean {
    const lower = toLookup(w).toLowerCase()
    const chars = [...lower]
    for (let i = 3; i <= chars.length - 3; i++) {
      if (isKnown(chars.slice(0, i).join('')) && isKnown(chars.slice(i).join(''))) return true
    }
    return false
  }

  /**
   * A plural verb with an object pronoun (أن يعلموه، كتبوها، ساعدوني): the alif of waw al-jama'a drops
   * before the pronoun, and Ayaspell lacks many of these. Known when the bare plural (يعلموا / يعلمون) is.
   */
  function arabicObjectForm(w: string): boolean {
    const m = /^(.{2,}و)(ه|ها|هم|هما|هن|ك|كم|كما|ني|نا)$/.exec(w)
    return !!m && (isKnown(`${m[1]}ا`) || isKnown(`${m[1]}ن`))
  }

  /** frequency rank of an Arabic word, with or without its proclitics */
  function arabicRank(w: string): number | undefined {
    if (!freq) return undefined
    const lookup = toLookup(w)
    const own = freq.get(lookup)
    if (own !== undefined) return own
    const m = AR_PREFIX.exec(lookup)
    return m ? freq.get(lookup.slice(m[0].length)) : undefined
  }

  /** an Arabic suggestion people actually write (in the frequency list) */
  function commonArabic(w: string): boolean {
    return arabicRank(w) !== undefined
  }

  /** bijv., blz., Dr. and other abbreviations the dictionary knows with their dot */
  function abbreviation(tok: Token): boolean {
    if (text[tok.end] !== '.') return false
    return ABBREVIATIONS.has(tok.lower) || isKnown(tok.text + '.')
  }

  function checkPiece(p: Piece, isPart: boolean, inName: boolean): Issue | null {
    const w = p.text
    if (!lookable(w, lang) || isKnown(w)) return null
    const lookup = toLookup(w)
    if (lang === 'ar' && arabicObjectForm(lookup)) return null
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
      if (!p.initial && knownCompound(w)) return null // Lauriergracht, Keizersgracht
      // a capitalised neighbour (Sifan Hassan) or a fix two letters away (Mehmet -> Meet): a name
      if (!MARK_KINDS.has(best.kind) && (inName || best.dist >= 1.5)) return null
    }
    if (isPart && !ranked.length && shape !== 'lower') return null
    // Arabic has no capitals to spot names and loanwords by, so the frequency list stands in: a word
    // people write (البيتزا, السوشي) that no targeted rewrite turns into a dictionary word, and that is
    // at least as common as its nearest fix, is left alone. (لاكن is rarer than لكن: still flagged.)
    if (lang === 'ar' && freq?.has(lookup) && !ranked.some((r) => AR_TARGETED.has(r.kind))) {
      const own = freq.get(lookup)!
      const fix = best ? arabicRank(best.word) : undefined
      if (fix === undefined || own <= fix) return null
    }

    const replacements = ranked.slice(0, max).map((r) => apostropheLike(text, w, r.word))
    const copy = spellCopy(w, best, lang)
    // a capitalised word a whole letter away from its fix may still be a name we do not know (Priya)
    const unsure = shape === 'capital' && best && best.kind !== 'map' && !caseFix && best.dist >= 1
    let confidence: Issue['confidence'] = !replacements.length ? 'low' : unsure ? 'medium' : 'high'
    if (lang === 'ar' && best) confidence = arabicConfidence(best, commonArabic(best.word))
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
