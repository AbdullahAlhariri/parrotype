// Test-only helpers for the English pack (not imported by the app).
import { expect } from 'vitest'
import type { Dictionary, Issue, Rule } from '@/types'
import { runRules } from '../../engine'
import { buildContext } from '../../tokenize'
import type { EnRule } from './shared'

export interface RunOpts {
  dict?: Dictionary
  strictness?: 'normal' | 'strict'
}

/** run rules over English text; strict by default so hints are included */
export const runEn = (text: string, rules: Rule | Rule[], opts: RunOpts = {}): Issue[] =>
  runRules(text, 'en', Array.isArray(rules) ? rules : [rules], { strictness: 'strict', ...opts })

const show = (issues: Issue[]) => JSON.stringify(issues.map((i) => `${i.ruleId}: ${i.text} -> ${i.replacements.join(' | ')}`))

/** the rule flags `flag` in `text` (and, if given, offers `fix` first) */
export function expectFlag(rule: Rule, text: string, flag: string, fix?: string, opts: RunOpts = {}) {
  const issues = runEn(text, rule, opts).filter((i) => i.ruleId === rule.id)
  const hit = issues.find((i) => i.text === flag)
  expect(hit, `${rule.id} should flag "${flag}" in: ${text}\n got: ${show(issues)}`).toBeTruthy()
  if (fix !== undefined) expect(hit?.replacements[0], `${rule.id} fix in: ${text}`).toBe(fix)
}

/** the rule stays quiet on `text` */
export function expectQuiet(rule: Rule, text: string, opts: RunOpts = {}) {
  const issues = runEn(text, rule, opts).filter((i) => i.ruleId === rule.id)
  expect(issues.length, `${rule.id} should not flag: ${text}\n got: ${show(issues)}`).toBe(0)
  // also without the engine's foreign-sentence filter
  expect(rawHits(text, [rule], opts).map((h) => h.text), `${rule.id} (raw) should not flag: ${text}`).toEqual([])
}

/** a rule's built-in examples: fires on `wrong`, quiet on `right` and every `ok` sentence */
export function expectExamples(rule: EnRule, opts: RunOpts = {}) {
  const { wrong, flag, fix, right, ok = [] } = rule.examples
  expectFlag(rule, wrong, flag, fix, opts)
  for (const t of [right, ...ok]) expectQuiet(rule, t, opts)
}

/** issues of at least medium confidence (what counts as a mistake in the UI) */
export const serious = (issues: Issue[]) => issues.filter((i) => i.confidence !== 'low')

export { show as showIssues }

/**
 * Every hit of every rule, straight from rule.check: no overlap resolution and no foreign-sentence filter,
 * so a regression test can't pass just because the engine skipped a sentence.
 */
export function rawHits(text: string, rules: Rule[], opts: RunOpts = {}) {
  const ctx = buildContext(text, 'en', { dict: opts.dict, strictness: opts.strictness ?? 'strict' })
  return rules
    .filter((r) => !r.strictOnly || ctx.strictness === 'strict')
    .flatMap((r) =>
      r.check(ctx).map((h) => ({ ruleId: r.id, text: text.slice(h.offset, h.offset + h.length), confidence: h.confidence ?? r.confidence })),
    )
}
