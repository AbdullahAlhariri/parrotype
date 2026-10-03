import type { Issue, IssueCategory, Lang, NestItem } from '@/types'
import { markKind } from './segments'
import { applyFixes, excerpt, startsSentence } from './text'

export const CATEGORY_LABEL: Record<IssueCategory, string> = {
  spelling: 'spelling',
  typo: 'typos',
  grammar: 'grammar',
  punctuation: 'punctuation',
  capitalization: 'capitals',
  style: 'style',
}

/** Display order: the things that are actually wrong first, style last. */
export const CATEGORY_ORDER: IssueCategory[] = ['spelling', 'typo', 'grammar', 'capitalization', 'punctuation', 'style']

/** misspelling-list rules (nl.spell.common, en.misspelling): their only lesson is the word itself */
const GENERIC_SPELLING = /\.(common|misspellings?)$/

export const isSpelling = (i: Pick<Issue, 'category'>) => i.category === 'spelling' || i.category === 'typo'

/** Hints (style, low confidence) are shown but never counted as mistakes or sent to the nest. */
export const isMistake = (i: Pick<Issue, 'category' | 'confidence'>) => markKind(i) !== 'hint'

/**
 * A short, instance-free title for stats when the rule pack has no title for the id.
 * "With ‘ik’ there is no t: ‘ik vind’" -> "With ‘ik’ there is no t".
 */
export function ruleTitleFromMessage(message: string): string {
  let t = message.split(/:\s/)[0].trim()
  t = t.replace(/[.!?]+$/, '')
  if (t.length > 60) t = t.slice(0, 57).replace(/\s+\S*$/, '') + '...'
  return t || 'Grammar'
}

export type TitleFor = (issue: Issue) => string

export const defaultTitle: TitleFor = (i) => (isSpelling(i) && i.source !== 'rules' ? 'Spelling' : ruleTitleFromMessage(i.message))

export interface CategoryCount {
  category: IssueCategory
  count: number
}

export interface RuleLine {
  ruleId: string
  title: string
  category: IssueCategory
  count: number
  /** first occurrence, for the example and the explanation */
  example: Issue
}

export interface WordLine {
  wrong: string
  right?: string
  count: number
}

export interface WriteSummary {
  /** counted mistakes (hints excluded) */
  mistakes: number
  hints: number
  /** mistakes per category (hints are not in here) */
  byCategory: CategoryCount[]
  /** non-spelling rules that fired, most frequent first */
  rules: RuleLine[]
  /** style hints and unsure calls, most frequent first: shown, never counted */
  hintRules: RuleLine[]
  /** misspelled words, most frequent first */
  words: WordLine[]
  /** correct form of the most frequent mistake, for Kees to repeat */
  repeat?: string
}

export function summarize(text: string, issues: readonly Issue[], titleFor: TitleFor = defaultTitle): WriteSummary {
  const cat = new Map<IssueCategory, number>()
  const rules = new Map<string, RuleLine>()
  const hintRules = new Map<string, RuleLine>()
  const words = new Map<string, WordLine>()
  const freq = new Map<string, { n: number; first: Issue }>()
  let mistakes = 0
  let hints = 0

  const addRule = (map: Map<string, RuleLine>, i: Issue) => {
    const r = map.get(i.ruleId)
    if (r) r.count++
    else map.set(i.ruleId, { ruleId: i.ruleId, title: titleFor(i), category: i.category, count: 1, example: i })
  }

  for (const i of issues) {
    if (!isMistake(i)) {
      hints++
      addRule(hintRules, i)
      continue
    }
    mistakes++
    cat.set(i.category, (cat.get(i.category) ?? 0) + 1)
    if (isSpelling(i)) {
      const key = i.text.toLowerCase()
      const w = words.get(key)
      if (w) w.count++
      else words.set(key, { wrong: i.text, right: i.replacements[0], count: 1 })
      // a spelling rule that can explain itself (هذا، لكن; إن شاء الله; -ig/-lijk) is worth showing as
      // a rule too; plain misspelling lists add nothing to "Words to practise"
      if (i.source === 'rules' && i.explanation && !GENERIC_SPELLING.test(i.ruleId)) addRule(rules, i)
    } else addRule(rules, i)
    if (i.replacements[0]) {
      const key = `${i.ruleId}|${i.replacements[0].toLowerCase()}`
      const f = freq.get(key)
      if (f) f.n++
      else freq.set(key, { n: 1, first: i })
    }
  }

  let repeat: string | undefined
  let best = 0
  for (const { n, first } of freq.values()) {
    if (n > best) {
      best = n
      const r = first.replacements[0]
      repeat = startsSentence(text, first.offset) && r ? r[0].toLocaleLowerCase() + r.slice(1) : r
    }
  }

  return {
    mistakes,
    hints,
    byCategory: CATEGORY_ORDER.filter((c) => cat.has(c)).map((c) => ({ category: c, count: cat.get(c)! })),
    rules: [...rules.values()].sort((a, b) => b.count - a.count),
    hintRules: [...hintRules.values()].sort((a, b) => b.count - a.count),
    words: [...words.values()].sort((a, b) => b.count - a.count),
    repeat,
  }
}

export type NestAdd = Pick<NestItem, 'lang' | 'kind' | 'target'> & Partial<Pick<NestItem, 'wrong' | 'ruleId' | 'hint'>>

/**
 * What goes into the mistake nest: misspelled words (target = first suggestion) and, for grammar,
 * the corrected sentence (every counted fix in that sentence applied) with the rule as a hint.
 */
export function nestItemsFrom(text: string, issues: readonly Issue[], lang: Lang, explainIn: 'en' | 'local' = 'en'): NestAdd[] {
  const out: NestAdd[] = []
  const seen = new Set<string>()
  const mistakes = issues.filter(isMistake)
  for (const i of mistakes) {
    if (!i.replacements[0]) continue
    if (isSpelling(i)) {
      const target = i.replacements[0]
      if (seen.has(`w|${target.toLowerCase()}`)) continue
      seen.add(`w|${target.toLowerCase()}`)
      out.push({ lang, kind: 'word', target, wrong: [i.text] })
      continue
    }
    const { start, end } = excerpt(text, i.offset, i.offset + i.length)
    const target = applyFixes(text, mistakes, start, end).trim()
    const wrong = text.slice(start, end).trim()
    if (!target || target === wrong || seen.has(`s|${target}`)) continue
    seen.add(`s|${target}`)
    const hint = (explainIn === 'local' && (i.explanationLocal ?? i.messageLocal)) || i.explanation || i.message
    out.push({ lang, kind: 'sentence', target, wrong: [wrong], ruleId: i.ruleId, hint })
  }
  return out
}
