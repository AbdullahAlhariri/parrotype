import type { Confidence, IssueCategory, Rule, RuleContext, RuleHit } from '@/types'
import { capitalize, preserveCase } from '../../engine'

// Building blocks for the English pack. Most rules are ports of the regex prototype in
// docs/research/english-rules-prototype/rules.mjs (95 rules, 443 assertions, FP-benchmarked), so they run
// over the raw text instead of tokens. Each rule names the part of the match to underline and builds its
// fix from the capture groups.

/** A rule's own test data: it must flag `flag` in `wrong` (fixing it to `fix`) and stay quiet on the rest. */
export interface Example {
  wrong: string
  /** the text the rule underlines in `wrong` */
  flag: string
  /** expected first replacement */
  fix?: string
  /** the corrected sentence */
  right: string
  /** tricky correct sentences that must not be flagged */
  ok?: string[]
}

export interface EnRule extends Rule {
  examples: Example
}

export interface Msg {
  message: string
  explanation?: string
  learnMore?: string
}

/* ------------------------------------------------------------------ */
/* Text preparation                                                    */
/* ------------------------------------------------------------------ */

const prepared = new WeakMap<RuleContext, { text: string; zones: Array<[number, number]> }>()

/**
 * The text rules match against: curly and dead-key apostrophes become ' and no-break spaces become
 * spaces. Every replacement is one UTF-16 unit for one, so offsets stay valid.
 * Zones are links, e-mail addresses and handles (the tokenizer emits them as one non-word token).
 */
export function prepare(ctx: RuleContext) {
  let p = prepared.get(ctx)
  if (!p) {
    const text = ctx.text.replace(/[’‘ʼ´]/g, "'").replace(/[  ]/g, ' ')
    const zones = ctx.tokens
      .filter((t) => !t.isWord && t.end - t.start > 1 && /[\p{L}\p{N}]/u.test(t.text))
      .map((t): [number, number] => [t.start, t.end])
    p = { text, zones }
    prepared.set(ctx, p)
  }
  return p
}

export const inZone = (ctx: RuleContext, start: number, end: number) =>
  prepare(ctx).zones.some(([s, e]) => start < e && s < end)

/* ------------------------------------------------------------------ */
/* Variety (en-US / en-GB) from the dictionary that was passed in      */
/* ------------------------------------------------------------------ */

const variants = new WeakMap<RuleContext, 'us' | 'gb' | undefined>()

/** 'us' or 'gb' when the context's dictionary is clearly one of them (the app loads the user's choice) */
export function dictVariant(ctx: RuleContext): 'us' | 'gb' | undefined {
  if (!ctx.dict) return undefined
  if (variants.has(ctx)) return variants.get(ctx)
  const us = ctx.dict.has('color') && ctx.dict.has('organize')
  const gb = ctx.dict.has('colour') && ctx.dict.has('organise')
  const v = us && !gb ? 'us' : gb && !us ? 'gb' : undefined
  variants.set(ctx, v)
  return v
}

/* ------------------------------------------------------------------ */
/* Regex rules                                                         */
/* ------------------------------------------------------------------ */

export type Groups = Record<string, string | undefined>

export interface Found {
  /** the underlined text, as written */
  text: string
  /** capture groups (from the prepared text, so apostrophes are straight) */
  g: Groups
  m: RegExpExecArray
  ctx: RuleContext
  /** the prepared text */
  src: string
  start: number
  end: number
}

export interface RegexSpec {
  id: string
  title: string
  category: IssueCategory
  confidence: Confidence
  strictOnly?: boolean
  re: RegExp
  /** skip the match when this matches the 60 characters before it (a readable negative lookbehind) */
  notAfter?: RegExp
  /** named group(s) to underline, first one that matched wins; default: the whole match */
  target?: string | string[] | ((m: RegExpExecArray, src: string) => [number, number] | null)
  /** replacements for the underlined text, best first */
  fix?: (f: Found) => string[]
  /** re-case replacements like the original (default true) */
  keepCase?: boolean
  /** extra check with access to the context (token-level guards) */
  when?: (f: Found) => boolean
  msg: Msg | ((f: Found, fixes: string[]) => Msg)
  examples: Example
}

function span(spec: RegexSpec, m: RegExpExecArray, src: string): [number, number] | null {
  const t = spec.target
  if (!t) return [m.index, m.index + m[0].length]
  if (typeof t === 'function') return t(m, src)
  for (const name of Array.isArray(t) ? t : [t]) {
    const ix = m.indices?.groups?.[name]
    if (ix) return [ix[0], ix[1]]
  }
  return null
}

export function regexRule(spec: RegexSpec): EnRule {
  const flags = [...new Set(`${spec.re.flags}gd`)].join('')
  return {
    id: spec.id,
    lang: 'en',
    category: spec.category,
    title: spec.title,
    confidence: spec.confidence,
    strictOnly: spec.strictOnly,
    examples: spec.examples,
    check(ctx) {
      const { text: src } = prepare(ctx)
      const re = new RegExp(spec.re.source, flags)
      const out: RuleHit[] = []
      let m: RegExpExecArray | null
      while ((m = re.exec(src))) {
        if (m[0].length === 0) {
          re.lastIndex++
          continue
        }
        if (spec.notAfter?.test(src.slice(Math.max(0, m.index - 60), m.index))) continue
        const sp = span(spec, m, src)
        if (!sp || sp[1] <= sp[0] || inZone(ctx, sp[0], sp[1])) continue
        const [start, end] = sp
        const f: Found = { text: ctx.text.slice(start, end), g: m.groups ?? {}, m, ctx, src, start, end }
        if (spec.when && !spec.when(f)) continue
        const raw = spec.fix?.(f) ?? []
        const fixes = spec.keepCase === false ? raw : raw.map((r) => preserveCase(f.text, r))
        const msg = typeof spec.msg === 'function' ? spec.msg(f, fixes) : spec.msg
        out.push({ offset: start, length: end - start, replacements: fixes, ...msg })
      }
      return out
    },
  }
}

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

/** quote a word for messages */
export const q = (s: string) => `‘${s}’`

/** lowercase except a standalone I */
export const lowerKeepI = (s: string) => s.toLowerCase().replace(/\bi\b/g, 'I')

export const cap = capitalize

/** the text right before a match start (for fixes that look back, like "have made" -> "have done") */
export const before = (f: Found, n = 30) => f.src.slice(Math.max(0, f.m.index - n), f.m.index)

/** find a rule by id (throws when it is missing, handy in tests) */
export const byId = <T extends Rule>(rules: T[], id: string): T => {
  const r = rules.find((x) => x.id === id)
  if (!r) throw new Error(`no rule ${id}`)
  return r
}

/** sentence start: start of text or after . ! ? and whitespace */
export const SENT_START = '(?<=^|[.!?]\\s+)'

export const LINKS = {
  aAn: 'https://www.grammarly.com/blog/grammar/indefinite-articles-a-and-an/',
  weekend: 'https://learnersdictionary.com/qa/Over-the-weekend-on-the-weekend-at-the-weekend',
  takePhoto: 'https://jakubmarian.com/make-a-photo-vs-take-a-photo-in-english/',
  borrowLend: 'https://brians.wsu.edu/?p=542',
  sincePerfect: 'https://elon.io/grammar/dutch/common-mistakes/present-perfect-duration',
  doSupport: 'https://elon.io/grammar/dutch/common-mistakes/do-support',
  falseFriends: 'https://elon.io/grammar/dutch/common-mistakes/false-friends',
  pluralApostrophe: 'https://elon.io/grammar/dutch/nouns/plurals-apostrophe-s',
  capitals: 'https://elon.io/grammar/dutch/spelling/capitalization-and-ij',
  mostOf: 'https://www.grammar-quizzes.com/article4d.html',
  runOn: 'https://owl.purdue.edu/owl/general_writing/punctuation/independent_and_dependent_clauses/runonsentences.html',
} as const
