import { NAMES, type TipText } from '@/engine/tips'
import type { Issue, Lang } from '@/types'
import type { Grade, GradedToken } from './grade'

export type ExplainIn = 'en' | 'local'

export interface IssueText {
  ruleId: string
  /** specific, often names the fix ("'je' before the verb: add t") */
  message: string
  /** the general rule, safe to show before the answer */
  explanation?: string
  learnMore?: string
}

export interface WordExplanation {
  key: string
  token: GradedToken
  /** short name of the mistake: "d/t ending", "Trema", "Skipped word" */
  name: string
  /** what happened, e.g. "d/t ending: 'wordt', not 'word'" (English, from the classifier) */
  detail: string
  /** the classifier's tip, in the chosen language */
  tip: string
  /** what to show as "the rule": the checker's general explanation, else the tip */
  rule: string
  /** checker findings on the user's own text that overlap this word */
  issues: IssueText[]
}

const pick = (t: TipText | undefined, lang: Lang, explainIn: ExplainIn): string | undefined => {
  if (!t) return undefined
  if (explainIn === 'local' && lang !== 'en') return (lang === 'nl' ? t.nl : t.ar) ?? t.en
  return t.en
}

const overlaps = (i: Issue, r?: [number, number]) => !!r && i.offset < r[1] && r[0] < i.offset + i.length

const isGrammar = (i: Issue) => i.source !== 'spell' && i.category !== 'spelling' && i.category !== 'typo'

/**
 * Grammar issues that sit on a word the user got wrong. Spelling issues only repeat what the
 * letter diff shows, and issues on correct words are noise here.
 */
export function relevantIssues(grade: Grade, issues: readonly Issue[]): Issue[] {
  return issues.filter((i) => isGrammar(i) && grade.wrong.some((t) => overlaps(i, t.op.typedRange)))
}

export function explainTokens(grade: Grade, issues: readonly Issue[], lang: Lang, explainIn: ExplainIn): WordExplanation[] {
  return grade.wrong.map((t, n) => {
    const local = explainIn === 'local' && lang !== 'en'
    const own = issues
      .filter((i) => isGrammar(i) && overlaps(i, t.op.typedRange))
      .map<IssueText>((i) => ({
        ruleId: i.ruleId,
        message: (local ? i.messageLocal : undefined) ?? i.message,
        explanation: (local ? i.explanationLocal : undefined) ?? i.explanation,
        learnMore: i.learnMore,
      }))
    if (t.status === 'extra') {
      return {
        key: `x${n}`,
        token: t,
        name: local ? (lang === 'nl' ? 'Extra woord' : 'كلمة زائدة') : 'Extra word',
        detail: `'${t.op.typed}' is not in the sentence`,
        tip: '',
        rule: own.find((i) => i.explanation)?.explanation ?? '',
        issues: own,
      }
    }
    const label = t.label
    const nameKey = (label?.tag ?? label?.kind) as keyof typeof NAMES | undefined
    const tip = label ? ((local ? label.tip.local : undefined) ?? label.tip.en) : ''
    return {
      key: `w${n}`,
      token: t,
      name: pick(nameKey ? NAMES[nameKey] : undefined, lang, explainIn) ?? 'Spelling',
      detail: label?.detail ?? '',
      tip,
      rule: own.find((i) => i.explanation)?.explanation ?? tip,
      issues: own,
    }
  })
}

/** Display name of a typo tag or kind ("d/t ending"), in English or the practice language. */
export function tagName(tag: string, lang: Lang, explainIn: ExplainIn = 'en'): string {
  return pick(NAMES[tag as keyof typeof NAMES], lang, explainIn) ?? tag
}
