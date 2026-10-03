// Test-only helpers for the Arabic pack (not imported by the app).
import { expect } from 'vitest'
import type { Dictionary, Issue, Rule } from '@/types'
import { runRules } from '../../engine'
import type { ArRule } from './shared'

export interface RunOpts {
  dict?: Dictionary
  strictness?: 'normal' | 'strict'
}

export const runAr = (text: string, rules: Rule | Rule[], opts: RunOpts = {}): Issue[] =>
  runRules(text, 'ar', Array.isArray(rules) ? rules : [rules], { strictness: 'strict', ...opts })

export const showIssues = (issues: Issue[]) => JSON.stringify(issues.map((i) => `${i.ruleId}: ${i.text} -> ${i.replacements.join(' | ')}`))

/** mustFlag: the rule underlines `flagged` in `text` (and offers `fix` first) */
export function mustFlag(rule: Rule, text: string, flagged: string, fix?: string, opts: RunOpts = {}) {
  const issues = runAr(text, rule, opts).filter((i) => i.ruleId === rule.id)
  const hit = issues.find((i) => i.text === flagged)
  expect(hit, `${rule.id} should flag «${flagged}» in: ${text}\n got: ${showIssues(issues)}`).toBeTruthy()
  if (fix !== undefined) expect(hit?.replacements[0], `${rule.id} fix in: ${text}`).toBe(fix)
}

/** mustNotFlag: the rule stays quiet on `text` */
export function mustNotFlag(rule: Rule, text: string, opts: RunOpts = {}) {
  const issues = runAr(text, rule, opts).filter((i) => i.ruleId === rule.id)
  expect(issues.length, `${rule.id} should not flag: ${text}\n got: ${showIssues(issues)}`).toBe(0)
}

export function expectArExamples(rule: ArRule, opts: RunOpts = {}) {
  for (const [text, flagged, fix] of rule.examples.flag) mustFlag(rule, text, flagged, fix, opts)
  for (const text of rule.examples.ok) mustNotFlag(rule, text, opts)
}

export const serious = (issues: Issue[]) => issues.filter((i) => i.confidence !== 'low')
