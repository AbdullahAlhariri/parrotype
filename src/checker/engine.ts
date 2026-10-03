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
  const skip = [...foreignRanges(ctx), ...mentionRanges(ctx)]
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
      if (skip.some(([s, e]) => h.offset >= s && h.offset + h.length <= e)) continue
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

/**
 * A capital-letter issue on exactly the same word as another issue ("wordt" at the start of a
 * sentence that should be "Word") is folded into the other one, so the d/t lesson is not lost.
 */
function foldCapitalization(issues: Issue[]): Issue[] {
  const caps = issues.filter((i) => i.category === 'capitalization')
  if (!caps.length) return issues
  const drop = new Set<Issue>()
  const out = issues.map((is) => {
    if (is.category === 'capitalization') return is
    const cap = caps.find((c) => c.offset === is.offset && c.length === is.length && !drop.has(c))
    if (!cap) return is
    drop.add(cap)
    const cased = (r: string) => (cap.replacements[0] === capitalize(cap.text) ? capitalize(r) : r)
    return {
      ...is,
      replacements: is.replacements.map(cased),
      message: `${is.message} (and a capital letter)`,
      messageLocal: is.messageLocal ? `${is.messageLocal} (en een hoofdletter)` : is.messageLocal,
    }
  })
  return out.filter((i) => !drop.has(i))
}

/** Keep one issue per span: higher confidence wins, then the longer span, then the earlier one. */
export function resolveOverlaps(input: Issue[]): Issue[] {
  const issues = foldCapitalization(input)
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
/* Mentions: 'hij vind' written on purpose, `code`                     */
/* ------------------------------------------------------------------ */

const OPEN_QUOTE = new Set(["'", '‘', '’', '`'])
const MAX_MENTION_WORDS = 4

/** short single-quoted or backticked spans: the writer is talking about the words, not using them */
function mentionRanges(ctx: RuleContext): Array<[number, number]> {
  const out: Array<[number, number]> = []
  const t = ctx.tokens
  for (let i = 0; i < t.length; i++) {
    if (t[i].isWord || !OPEN_QUOTE.has(t[i].text)) continue
    const before = ctx.text[t[i].start - 1]
    if (before !== undefined && !/[\s(\[:]/.test(before)) continue
    if (!t[i + 1] || t[i + 1].start !== t[i].end) continue
    const closer = t[i].text === '`' ? ['`'] : ["'", '’']
    let words = 0
    for (let j = i + 1; j < t.length && j <= i + MAX_MENTION_WORDS * 2 + 1; j++) {
      if (t[j].isWord) words++
      if (words > MAX_MENTION_WORDS) break
      if (!t[j].isWord && closer.includes(t[j].text) && t[j].start === t[j - 1].end && j > i + 1) {
        out.push([t[i].start, t[j].end])
        i = j
        break
      }
    }
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
