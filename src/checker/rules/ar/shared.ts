import type { Confidence, IssueCategory, Rule, RuleContext, RuleHit, Token } from '@/types'

// Building blocks for the Arabic pack (docs/research/arabic-typing.md section 6).
// JS \b does not work for Arabic, so regex rules use the NB/NA lookarounds below.

/** Arabic letters (no tatweel, no harakat) */
export const L = '\\u0621-\\u063A\\u0641-\\u064A'
/** harakat (tashkeel) and the dagger alif */
export const M = '\\u064B-\\u065F\\u0670'
/** not preceded / followed by an Arabic letter or mark */
export const NB = `(?<![${L}${M}\\u0640])`
export const NA = `(?![${L}${M}\\u0640])`

const MARKS = /[ً-ٰٟـ]/g
const ARABIC = /[؀-ۿ]/

/** word without harakat and tatweel, NFC (أ stays أ: never NFD here, it would strip the hamza) */
export const bare = (s: string) => s.normalize('NFC').replace(MARKS, '')
export const isArabic = (t: Token) => ARABIC.test(t.text)

export interface Msg {
  message: string
  messageLocal?: string
  explanation?: string
  explanationLocal?: string
  learnMore?: string
}

/** test data kept next to the rule: sentences it must flag (with the flagged text and first fix) and must not */
export interface ArExamples {
  flag: Array<[sentence: string, flagged: string, fix?: string]>
  ok: string[]
}

export interface ArRule extends Rule {
  examples: ArExamples
}

interface Base {
  id: string
  title: string
  category: IssueCategory
  confidence: Confidence
  strictOnly?: boolean
  examples: ArExamples
}

export function arRule(base: Base, check: (ctx: RuleContext) => RuleHit[]): ArRule {
  return { ...base, lang: 'ar', check }
}

/* ------------------------------------------------------------------ */
/* Proclitics                                                          */
/* ------------------------------------------------------------------ */

/**
 * Which prefixes may be split off before a list lookup.
 * conj: و ف. prep: و ف + ب ل ك. all: prep + the article ال (and لل = ل + ال).
 */
export type Clitics = 'none' | 'conj' | 'prep' | 'all'

export interface Split {
  prefix: string
  core: string
  /** the prefix contains the article */
  article: boolean
}

/** every way to split w into prefix + core, longest prefix first (the unsplit word comes last) */
export function splits(w: string, mode: Clitics): Split[] {
  const out: Split[] = []
  const push = (prefix: string, article: boolean) => {
    if (w.length - prefix.length >= 2) out.push({ prefix, core: w.slice(prefix.length), article })
  }
  const conj = mode !== 'none' && /^[وف]/.test(w) ? w[0] : ''
  const rest = w.slice(conj.length)
  if (mode === 'all') {
    // لل is ل + ال with the alif dropped: للمدرسه = ل + ال + مدرسه
    const art = /^(?:لل|[بك]?ال)/.exec(rest)?.[0]
    if (art) push(conj + art, true)
  }
  if ((mode === 'all' || mode === 'prep') && /^[بلك]/.test(rest)) push(conj + rest[0], false)
  if (conj) push(conj, false)
  push('', false)
  return out
}

export interface LexHit {
  tok: Token
  split: Split
  fixes: string[]
}

export interface LexOptions {
  clitics?: Clitics
  /**
   * Cores of 3 letters or fewer are easy to misread after a lone ب/ل/ك/ف (فارض is not ف + ارض), so by
   * default they only match bare, after و, or after the article. 'loose' allows any prefix.
   */
  shortCore?: 'strict' | 'loose'
  /** shortest core that may follow a prefix (default 2): وفى is a verb (he kept his word), not و + فى */
  minCore?: number
}

/** look every Arabic word up in a wrong -> right map, trying proclitic splits */
export function lookup(ctx: RuleContext, table: ReadonlyMap<string, string[]>, opts: LexOptions = {}): LexHit[] {
  const { clitics = 'none', shortCore = 'strict', minCore = 2 } = opts
  const out: LexHit[] = []
  for (const tok of ctx.words) {
    if (!isArabic(tok)) continue
    const w = bare(tok.text)
    for (const sp of splits(w, clitics)) {
      const fixes = table.get(sp.core)
      if (!fixes) continue
      if (sp.prefix && sp.core.length < minCore) continue
      if (shortCore === 'strict' && sp.prefix && sp.core.length <= 3 && !sp.article && sp.prefix !== 'و') continue
      out.push({ tok, split: sp, fixes: fixes.map((f) => sp.prefix + f) })
      break
    }
  }
  return out
}

/** a hit on a whole token */
export const tokenHit = (tok: Token, replacements: string[], msg: Msg, confidence?: Confidence): RuleHit => ({
  offset: tok.start,
  length: tok.end - tok.start,
  replacements,
  confidence,
  ...msg,
})

/** a lexicon rule: every match becomes a hit with the same message */
export function lexRule(base: Base, table: ReadonlyMap<string, string[]>, msg: Msg | ((h: LexHit) => Msg), opts: LexOptions = {}): ArRule {
  return arRule(base, (ctx) => lookup(ctx, table, opts).map((h) => tokenHit(h.tok, h.fixes, typeof msg === 'function' ? msg(h) : msg)))
}

/* ------------------------------------------------------------------ */
/* Regex rules                                                         */
/* ------------------------------------------------------------------ */

const zonesCache = new WeakMap<RuleContext, Array<[number, number]>>()
/** links, e-mail addresses and handles (one non-word token each) */
export function inZone(ctx: RuleContext, start: number, end: number) {
  let z = zonesCache.get(ctx)
  if (!z) {
    z = ctx.tokens.filter((t) => !t.isWord && t.end - t.start > 1 && /[\p{L}\p{N}]/u.test(t.text)).map((t): [number, number] => [t.start, t.end])
    zonesCache.set(ctx, z)
  }
  return z.some(([s, e]) => start < e && s < end)
}

export interface ReOptions {
  /** named group to underline (default: whole match) */
  target?: string
  fix: (m: RegExpExecArray) => string[]
  msg: Msg | ((m: RegExpExecArray) => Msg)
  /** extra check */
  when?: (m: RegExpExecArray, ctx: RuleContext) => boolean
}

export function reRule(base: Base, re: RegExp, o: ReOptions): ArRule {
  const flags = [...new Set(`${re.flags}gud`)].join('')
  const r = new RegExp(re.source, flags)
  return arRule(base, (ctx) => {
    const out: RuleHit[] = []
    r.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = r.exec(ctx.text))) {
      if (!m[0].length) {
        r.lastIndex++
        continue
      }
      const ix = o.target ? m.indices?.groups?.[o.target] : [m.index, m.index + m[0].length]
      if (!ix || ix[1] <= ix[0] || inZone(ctx, ix[0], ix[1])) continue
      if (o.when && !o.when(m, ctx)) continue
      out.push({ offset: ix[0], length: ix[1] - ix[0], replacements: o.fix(m), ...(typeof o.msg === 'function' ? o.msg(m) : o.msg) })
    }
    return out
  })
}

/**
 * Quote an Arabic word inside an English message. The word is wrapped in a bidi isolate (FSI ... PDI)
 * so the quote marks stay on the right sides when the message is shown left-to-right.
 */
export const q = (s: string) => (/[\u0600-\u06FF]/.test(s) ? `‘\u2068${s}\u2069’` : `‘${s}’`)
/** quote inside an Arabic message */
export const qa = (s: string) => `«${s}»`

export const LINKS = {
  inshallah: 'https://blog.alifbee.com/inshallah-meaning-arabic/',
  areta: 'https://github.com/CAMeL-Lab/arabic_error_type_annotation',
} as const
