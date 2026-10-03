import type { Confidence, Dictionary, Issue, Lang, Rule, RuleContext, RuleHit } from '@/types'
import { buildContext } from './tokenize'

export interface RunOptions {
  dict?: Dictionary
  strictness?: 'normal' | 'strict'
  /** rule ids to skip (user turned them off) */
  disabled?: string[]
}

const RANK: Record<Confidence, number> = { high: 3, medium: 2, low: 1 }

/**
 * Run rules over text and return non-overlapping issues sorted by offset.
 * A rule that throws is skipped (and logged in dev), so one bad rule never breaks checking.
 */
export function runRules(text: string, lang: Lang, rules: Rule[], opts: RunOptions = {}): Issue[] {
  if (!text.trim()) return []
  const ctx = buildContext(text, lang, opts)
  const disabled = new Set(opts.disabled ?? [])
  const foreign = foreignRanges(ctx)
  const issues: Issue[] = []
  for (const rule of rules) {
    if (rule.lang !== lang || disabled.has(rule.id)) continue
    if (rule.strictOnly && ctx.strictness !== 'strict') continue
    let hits: RuleHit[]
    try {
      hits = rule.check(ctx)
    } catch (err) {
      if (import.meta.env?.DEV) console.warn(`[checker] rule ${rule.id} failed`, err)
      continue
    }
    for (const h of hits) {
      if (!isValidHit(h, text)) continue
      if (foreign.some(([s, e]) => h.offset >= s && h.offset < e)) continue
      issues.push(toIssue(rule, h, text, lang))
    }
  }
  return resolveOverlaps(issues)
}

function isValidHit(h: RuleHit, text: string) {
  return (
    Number.isInteger(h.offset) &&
    Number.isInteger(h.length) &&
    h.offset >= 0 &&
    h.length > 0 &&
    h.offset + h.length <= text.length &&
    !!h.message
  )
}

function toIssue(rule: Rule, h: RuleHit, text: string, lang: Lang): Issue {
  const flagged = text.slice(h.offset, h.offset + h.length)
  const replacements = [...new Set(h.replacements)].filter((r) => r !== flagged)
  return {
    id: `${rule.id}@${h.offset}:${h.length}`,
    ruleId: rule.id,
    source: 'rules',
    lang,
    category: rule.category,
    offset: h.offset,
    length: h.length,
    text: flagged,
    message: h.message,
    messageLocal: h.messageLocal,
    explanation: h.explanation,
    explanationLocal: h.explanationLocal,
    replacements,
    confidence: h.confidence ?? rule.confidence,
    learnMore: h.learnMore,
  }
}

/** Keep one issue per span: higher confidence wins, then the longer span, then the earlier one. */
export function resolveOverlaps(issues: Issue[]): Issue[] {
  const ranked = [...issues].sort(
    (a, b) => RANK[b.confidence] - RANK[a.confidence] || b.length - a.length || a.offset - b.offset,
  )
  const kept: Issue[] = []
  for (const is of ranked) {
    const end = is.offset + is.length
    if (kept.some((k) => is.offset < k.offset + k.length && k.offset < end)) continue
    kept.push(is)
  }
  return kept.sort((a, b) => a.offset - b.offset || a.length - b.length)
}

/* ------------------------------------------------------------------ */
/* Foreign sentences                                                   */
/* ------------------------------------------------------------------ */

// The user practises three languages, so a Dutch text may quote an English sentence. Skip those.
const STOP: Record<'nl' | 'en', ReadonlySet<string>> = {
  nl: new Set('de het een en van ik je jij niet dat op te zijn met voor naar maar ook wat er hij zij we wij heb heeft dit die is'.split(' ')),
  en: new Set('the and of to you with are this that have it for not be my your was were will would what they'.split(' ')),
}
const ARABIC = /[؀-ۿ]/

function foreignRanges(ctx: RuleContext): Array<[number, number]> {
  const out: Array<[number, number]> = []
  for (const s of ctx.sentences) {
    const words = s.tokens.filter((t) => t.isWord)
    if (!words.length) continue
    const arabic = words.filter((t) => ARABIC.test(t.text)).length
    let foreign: boolean
    if (ctx.lang === 'ar') foreign = arabic === 0
    else if (arabic * 2 > words.length) foreign = true
    else {
      const other = ctx.lang === 'nl' ? STOP.en : STOP.nl
      const own = ctx.lang === 'nl' ? STOP.nl : STOP.en
      const o = words.filter((t) => other.has(t.lower) && !own.has(t.lower)).length
      const m = words.filter((t) => own.has(t.lower) && !other.has(t.lower)).length
      foreign = o >= 3 && o > m * 2
    }
    if (foreign) out.push([s.start, s.end])
  }
  return out
}

/* ------------------------------------------------------------------ */
/* Replacements                                                        */
/* ------------------------------------------------------------------ */

export function applyReplacement(text: string, issue: Pick<Issue, 'offset' | 'length'>, replacement: string) {
  return text.slice(0, issue.offset) + replacement + text.slice(issue.offset + issue.length)
}

const LETTER = /\p{L}/u
const UPPER = /\p{Lu}/u

/** Upper-case the first letter (skipping a leading 's / 't clitic: 's avonds -> 's Avonds). */
export function capitalize(s: string) {
  const m = /^(['’][st]\s+)/i.exec(s)
  const skip = m ? m[1].length : 0
  for (let i = skip; i < s.length; i++) {
    if (LETTER.test(s[i])) return s.slice(0, i) + s[i].toUpperCase() + s.slice(i + 1)
  }
  return s
}

/**
 * Give a replacement the casing of the original: HIJ -> HIJ-style, Hij -> Capitalised, else unchanged.
 * Replacements that already carry capitals (België) are left alone in the lowercase case.
 */
export function preserveCase(original: string, replacement: string) {
  const letters = [...original].filter((c) => LETTER.test(c))
  if (letters.length > 1 && letters.every((c) => UPPER.test(c))) return replacement.toUpperCase()
  const body = original.replace(/^['’][st]\s+/i, '')
  const firstLetter = [...body].find((c) => LETTER.test(c))
  if (firstLetter && UPPER.test(firstLetter)) return capitalize(replacement)
  return replacement
}
