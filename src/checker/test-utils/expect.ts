// Test-only helpers: run one rule (or a set) and assert what it flags.
import { expect } from 'vitest'
import type { Dictionary, Issue, Rule } from '@/types'
import { runRules } from '../engine'

export interface CheckOpts {
  dict?: Dictionary
  strictness?: 'normal' | 'strict'
}

export const check = (text: string, rules: Rule | Rule[], opts: CheckOpts = {}): Issue[] =>
  runRules(text, 'nl', Array.isArray(rules) ? rules : [rules], { strictness: 'strict', ...opts })

/**
 * Each case: [sentence, flagged text, first replacement?]. The rule must flag exactly that span.
 */
export function expectFlags(rule: Rule, cases: Array<[string, string, string?]>, opts: CheckOpts = {}) {
  for (const [text, flagged, replacement] of cases) {
    const issues = check(text, rule, opts).filter((i) => i.ruleId === rule.id)
    const hit = issues.find((i) => i.text === flagged)
    expect(hit, `${rule.id} should flag "${flagged}" in: ${text}\n got: ${JSON.stringify(issues.map((i) => i.text))}`).toBeTruthy()
    if (replacement !== undefined) expect(hit?.replacements[0], `replacement in: ${text}`).toBe(replacement)
  }
}

export function expectClean(rule: Rule, texts: string[], opts: CheckOpts = {}) {
  for (const text of texts) {
    const issues = check(text, rule, opts).filter((i) => i.ruleId === rule.id)
    expect(issues.map((i) => `${i.text} -> ${i.replacements[0] ?? ''}`), `${rule.id} should not flag: ${text}`).toEqual([])
  }
}
