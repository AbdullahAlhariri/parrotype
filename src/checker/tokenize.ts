import type { Dictionary, Lang, RuleContext, Sentence, Token } from '@/types'
import { COMPARATIVES } from './lexicon/nl/adjectives'

/* ------------------------------------------------------------------ */
/* Character classes                                                   */
/* ------------------------------------------------------------------ */

const WORD_CHAR = /[\p{L}\p{M}\p{N}]/u
const DIGIT = /\p{Nd}/u
const APOS = /['’ʼ]/
const HYPHEN = /[-‐‑]/
const UPPER_START = /^[^\p{L}]*\p{Lu}/u
const CASED_START = /^[^\p{L}]*[\p{Lu}\p{Ll}]/u

const isWordChar = (c: string | undefined) => c !== undefined && WORD_CHAR.test(c)
const isDigit = (c: string | undefined) => c !== undefined && DIGIT.test(c)

/* Zones we never check: links, e-mail addresses, @handles, #tags. Emitted as one non-word token. */
const URL_RE = /(?:https?:\/\/|www\.)[^\s<>"'`()[\]{}]+/y
const EMAIL_RE = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)+/uy
const HANDLE_RE = /[@#][\p{L}\p{N}_]+/uy
// no bare .de: "moe.de hond" is a missing space far more often than a German site
const DOMAIN_RE =
  /[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)*\.(?:com|nl|org|net|be|io|app|dev|eu|uk|fr|ai|co|info|edu|gov)(?![\p{L}\p{N}])(?:\/[^\s<>"'`]*)?/uy
/** dotted abbreviations kept as one word: o.a., d.w.z., e.g., i.e., a.u.b., U.S.A. */
const DOTTED_ABBR_RE = /(?:\p{L}{1,3}\.){2,}/uy
/** Dutch clitics written with a leading apostrophe: 's avonds, 't is, 's-Hertogenbosch */
const LEAD_APOS_RE = /['’][stST](?![\p{L}\p{M}\p{N}'’])/uy
const TRAILING_PUNCT = /[.,;:!?)\]'"’”]+$/

const stickyMatch = (re: RegExp, text: string, at: number) => {
  re.lastIndex = at
  const m = re.exec(text)
  return m ? m[0] : null
}

/** Lowercase, NFC and straight apostrophes/hyphens: the form rules and lexicons compare against. */
export const normalizeWord = (s: string) =>
  s.normalize('NFC').toLowerCase().replace(/[’ʼ]/g, "'").replace(/[‐‑]/g, '-')

/* ------------------------------------------------------------------ */
/* Tokenizer                                                           */
/* ------------------------------------------------------------------ */

/**
 * Split text into word and punctuation tokens (whitespace is dropped).
 * Words keep inner apostrophes and hyphens (auto's, zo'n, e-mail), decimals stay whole (3,5),
 * Arabic letters keep their tashkeel. Links and e-mail addresses become one non-word token.
 */
export function tokenize(text: string, _lang?: Lang): Token[] {
  const tokens: Token[] = []
  const n = text.length
  let i = 0
  const push = (start: number, end: number, isWord: boolean) => {
    const t = text.slice(start, end)
    tokens.push({ text: t, lower: normalizeWord(t), start, end, isWord, index: tokens.length })
  }
  const atBoundary = (at: number) => at === 0 || !isWordChar(text[at - 1])

  while (i < n) {
    const c = text[i]
    if (/\s/.test(c)) {
      i++
      continue
    }

    // skip zones
    if (atBoundary(i)) {
      let zone: string | null = null
      if (c === 'h' || c === 'w' || c === 'H' || c === 'W') zone = stickyMatch(URL_RE, text, i)
      if (!zone && (c === '@' || c === '#')) zone = stickyMatch(HANDLE_RE, text, i)
      if (!zone && isWordChar(c)) zone = stickyMatch(EMAIL_RE, text, i) ?? stickyMatch(DOMAIN_RE, text, i)
      if (zone) {
        const trimmed = zone.replace(TRAILING_PUNCT, '') || zone
        push(i, i + trimmed.length, false)
        i += trimmed.length
        continue
      }
    }

    // words
    let start = i
    let j = i
    if (APOS.test(c) && atBoundary(i)) {
      const lead = stickyMatch(LEAD_APOS_RE, text, i)
      if (lead) j = i + lead.length
    }
    if (j === i && isWordChar(c)) {
      const abbr = stickyMatch(DOTTED_ABBR_RE, text, i)
      if (abbr && !isWordChar(text[i + abbr.length])) {
        push(i, i + abbr.length, true)
        i += abbr.length
        continue
      }
      j = i + 1
    }
    if (j > i) {
      while (j < n) {
        const d = text[j]
        if (isWordChar(d)) {
          j++
          continue
        }
        const prev = text[j - 1]
        const next = text[j + 1]
        if ((APOS.test(d) || HYPHEN.test(d)) && isWordChar(prev) && isWordChar(next)) {
          j++
          continue
        }
        if ((d === '.' || d === ',' || d === ':' || d === '/') && isDigit(prev) && isDigit(next)) {
          j++
          continue
        }
        // zero-width (non-)joiners inside Arabic/Persian words
        if ((d === '‌' || d === '‍') && isWordChar(next)) {
          j++
          continue
        }
        break
      }
      push(start, j, true)
      i = j
      continue
    }

    // punctuation: group runs of sentence-final marks (... ?! ؟؟) and dashes
    start = i
    if (/[.!?؟…]/.test(c)) {
      while (j < n && /[.!?؟…]/.test(text[j])) j++
      if (j === i) j = i + 1
    } else if (c === '-' && text[i + 1] === '-') {
      j = i
      while (j < n && text[j] === '-') j++
    } else {
      const code = text.charCodeAt(i)
      j = code >= 0xd800 && code <= 0xdbff && i + 1 < n ? i + 2 : i + 1
    }
    push(start, j, false)
    i = j
  }
  return tokens
}

/* ------------------------------------------------------------------ */
/* Sentence splitter                                                   */
/* ------------------------------------------------------------------ */

/** Abbreviations that end in a dot but do not end a sentence (lowercase, no dot). */
export const ABBREVIATIONS: ReadonlySet<string> = new Set(
  `bijv bv enz etc dhr mevr mw mr mrs ms dr drs ir ing prof ca nr blz pag pp vs jr sr st inc ltd corp incl excl
  evt resp vgl zgn ong mln mld fig afb ds mgr lt sgt dept approx feb mrt apr jun jul aug sep sept okt oct nov dec
  vnl ipv tov mbt nav ivm adv atd jl max min afd art tel gem hfst hst`.split(/\s+/),
)
/** Abbreviations that can close a sentence (a list, a measure): split when a capital follows. */
const END_ABBREVIATIONS: ReadonlySet<string> = new Set(['enz', 'etc', 'inc', 'ltd', 'corp', 'max', 'min', 'tel', 'art', 'afd', 'gem'])
/** dotted abbreviations (one word token) that can close a sentence: "peren e.d. Daarna ..." */
const DOTTED_END: ReadonlySet<string> = new Set(['e.d.', 'e.a.', 'e.v.', 'e.v.a.', 'm.m.', 'c.s.', 'etc.'])
const CLOSERS: ReadonlySet<string> = new Set(['"', "'", '’', '”', '»', ')', ']', '}', '›'])

const startsUpper = (t: Token | undefined) => !!t && UPPER_START.test(t.text)
const startsLower = (t: Token | undefined) => !!t && CASED_START.test(t.text) && !UPPER_START.test(t.text)

function endsSentence(tokens: Token[], k: number): boolean {
  const t = tokens[k]
  if (t.isWord) return DOTTED_END.has(t.lower) && startsUpper(tokens[k + 1])
  if (!/^[.!?؟…]+$/.test(t.text)) return false
  let j = k + 1
  let closed = false
  while (j < tokens.length && CLOSERS.has(tokens[j].text) && tokens[j].start === tokens[j - 1].end) {
    j++
    closed = true
  }
  const next = tokens[j]
  const prev = tokens[k - 1]
  if (t.text === '.' && prev?.isWord && prev.end === t.start) {
    if (ABBREVIATIONS.has(prev.lower)) return END_ABBREVIATIONS.has(prev.lower) && startsUpper(next)
    if (/^\p{Lu}$/u.test(prev.text)) return false // initial: J. de Vries
  }
  if (t.text.includes('…') || t.text.includes('..')) return !next || startsUpper(next)
  if (closed && next?.isWord && startsLower(next)) return false // "Kom je?" vroeg hij.
  return true
}

/** Group tokens into sentences. Ends on . ? ! ؟ (not after abbreviations or initials) and on line breaks. */
export function splitSentences(text: string, tokens: Token[]): Sentence[] {
  const out: Sentence[] = []
  let cur: Token[] = []
  const flush = () => {
    if (!cur.length) return
    const start = cur[0].start
    const end = cur[cur.length - 1].end
    out.push({ start, end, text: text.slice(start, end), tokens: cur })
    cur = []
  }
  for (let k = 0; k < tokens.length; k++) {
    cur.push(tokens[k])
    if (k === tokens.length - 1) break
    if (endsSentence(tokens, k)) {
      while (k + 1 < tokens.length && CLOSERS.has(tokens[k + 1].text) && tokens[k + 1].start === tokens[k].end) {
        k++
        cur.push(tokens[k])
      }
      flush()
      continue
    }
    if (text.slice(tokens[k].end, tokens[k + 1].start).includes('\n')) flush()
  }
  flush()
  return out
}

/* ------------------------------------------------------------------ */
/* Clauses (Dutch)                                                     */
/* ------------------------------------------------------------------ */

export const NL_COORDINATORS: ReadonlySet<string> = new Set(['en', 'maar', 'want', 'dus', 'of', 'noch'])
export const NL_SUBORDINATORS: ReadonlySet<string> = new Set(
  `omdat dat als wanneer terwijl hoewel zodat voordat nadat totdat sinds zodra tenzij alsof doordat waardoor zolang
  indien mits opdat aangezien ofschoon alhoewel zoals naarmate naargelang`.split(/\s+/),
)
export const NL_RELATIVES: ReadonlySet<string> = new Set(
  `die wat wie welke waar waarom hoe hoeveel hoelang waarin waarop waarmee waarvan waarover waarbij waaraan waarna
  waarvoor waaruit waarheen wiens wier`.split(/\s+/),
)
const NL_PREPOSITIONS: ReadonlySet<string> = new Set(
  `in op aan met van voor naar bij uit over onder door tegen zonder tussen achter naast tijdens om na sinds rond
  binnen buiten langs via volgens vanaf tot`.split(/\s+/),
)
const NL_AUX_START: ReadonlySet<string> = new Set(
  `is ben bent was waren zijn heb hebt heeft had hadden hebben word wordt werd werden worden`.split(/\s+/),
)
/** after a preposition these are determiners/pronouns ("met die man"), not clause openers */
const DETERMINER_OPENERS: ReadonlySet<string> = new Set(['dat', 'die', 'welke'])
/** right after a clause-initial auxiliary they are the subject ("Is dat gebeurd?") */
const PRONOUN_OPENERS: ReadonlySet<string> = new Set(['dat', 'die', 'wat', 'wie', 'welke'])
const SUBJECTISH: ReadonlySet<string> = new Set(
  `ik jij je hij zij ze wij we jullie u het men er de een die dat dit deze mijn zijn haar ons onze hun`.split(/\s+/),
)
/** before "dan" these make it a comparison that opens a clause: "erger dan hij vertelt" */
const COMPARE_BEFORE_DAN: ReadonlySet<string> = new Set([
  ...COMPARATIVES,
  ...`anders ander andere eerder later liever vaker sneller langer verder erger hoger lager ouder jonger`.split(/\s+/),
])
/** "dan" only opens a clause when a subject follows: "meer dan tien euro" stays one clause */
const DAN_SUBJECTS: ReadonlySet<string> = new Set(`ik jij je hij zij ze wij we jullie u het men er`.split(/\s+/))
const CLAUSE_PUNCT = /[,;:()"„“”«»–—[\]{}]|(?:^|\s)[-/](?:\s|$)/

export interface Clause {
  /** index into ctx.words of the first and last word (inclusive) */
  from: number
  to: number
  /** index of the first word that is not a conjunction/relative opener (the subject slot) */
  core: number
  /** lowercased opening conjunction or relative word, if any */
  opener?: string
}

/**
 * Split each sentence into rough clauses: on , ; : brackets and quotes, and before conjunctions
 * and relative words (dat/die/wat only when they are not right after a preposition or a leading
 * auxiliary, so "Is dat gebeurd?" and "met die man" stay together), and before a comparative
 * "dan" ("Het is erger dan hij vertelt").
 * Non-Dutch text is only split on punctuation.
 */
export function splitClauses(ctx: RuleContext): Clause[] {
  const { words, text, sentences } = ctx
  const nl = ctx.lang === 'nl'
  const out: Clause[] = []
  let w = 0
  for (const s of sentences) {
    const sw: number[] = []
    while (w < words.length && words[w].start < s.end) {
      if (words[w].start >= s.start) sw.push(w)
      w++
    }
    if (!sw.length) continue
    let from = sw[0]
    const close = (to: number) => {
      if (to < from) return
      let core = from
      let opener: string | undefined
      if (nl) {
        while (core < to && isOpener(words[core].lower) && core - from < 2) {
          opener ??= words[core].lower
          core++
        }
        if (core === from && isOpener(words[from].lower)) opener = words[from].lower
      }
      out.push({ from, to, core, opener })
    }
    for (let k = 1; k < sw.length; k++) {
      const cur = sw[k]
      const prev = cur - 1
      const gap = text.slice(words[prev].end, words[cur].start)
      let split = CLAUSE_PUNCT.test(gap)
      if (!split && nl) split = opensClause(ctx, cur, from)
      if (split) {
        close(prev)
        from = cur
      }
    }
    close(sw[sw.length - 1])
  }
  return out
}

const isOpener = (lower: string) =>
  NL_COORDINATORS.has(lower) || NL_SUBORDINATORS.has(lower) || NL_RELATIVES.has(lower) || lower === 'om'

function opensClause(ctx: RuleContext, i: number, clauseFrom: number): boolean {
  const { words } = ctx
  const w = words[i].lower
  const prev = words[i - 1].lower
  if (w === 'om') {
    for (let k = i + 1; k < words.length && k < i + 12; k++) if (words[k].lower === 'te') return true
    return false
  }
  if (w === 'toen') return SUBJECTISH.has(words[i + 1]?.lower ?? '')
  if (w === 'dan') return COMPARE_BEFORE_DAN.has(prev) && DAN_SUBJECTS.has(words[i + 1]?.lower ?? '')
  if (!isOpener(w)) return false
  if (DETERMINER_OPENERS.has(w) && NL_PREPOSITIONS.has(prev)) return false
  if (PRONOUN_OPENERS.has(w) && i - 1 === clauseFrom && NL_AUX_START.has(prev)) return false
  return true
}

/* ------------------------------------------------------------------ */
/* Context                                                             */
/* ------------------------------------------------------------------ */

export interface ContextOptions {
  dict?: Dictionary
  strictness?: 'normal' | 'strict'
}

export function buildContext(text: string, lang: Lang, opts: ContextOptions = {}): RuleContext {
  const tokens = tokenize(text, lang)
  return {
    text,
    lang,
    tokens,
    words: tokens.filter((t) => t.isWord),
    sentences: splitSentences(text, tokens),
    dict: opts.dict,
    strictness: opts.strictness ?? 'normal',
  }
}
