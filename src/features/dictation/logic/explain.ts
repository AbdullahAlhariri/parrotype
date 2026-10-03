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
  /** message is in the practice language */
  messageLocal: boolean
  /** explanation is in the practice language */
  explanationLocal: boolean
}

export interface WordExplanation {
  key: string
  token: GradedToken
  /** short name of the mistake: "d/t ending", "Trema", "Skipped word" */
  name: string
  nameLocal: boolean
  /** what happened, e.g. "d/t ending: 'wordt', not 'word'" (English, from the classifier) */
  detail: string
  /** the classifier's tip, in the chosen language */
  tip: string
  /** what to show as "the rule": the checker's general explanation, else the tip */
  rule: string
  /** rule is in the practice language (for lang/dir on the element) */
  ruleLocal: boolean
  /** checker findings on the user's own text that overlap this word */
  issues: IssueText[]
}

/** A text in the chosen language when it exists, else English; says which one it got. */
function choose(en: string | undefined, local: string | undefined, wantLocal: boolean): [string | undefined, boolean] {
  if (wantLocal && local) return [local, true]
  return [en, false]
}

const tipLocal = (t: TipText | undefined, lang: Lang) => (lang === 'nl' ? t?.nl : lang === 'ar' ? t?.ar : undefined)

const pick = (t: TipText | undefined, lang: Lang, explainIn: ExplainIn): string | undefined =>
  t ? choose(t.en, tipLocal(t, lang), explainIn === 'local' && lang !== 'en')[0] : undefined

const overlaps = (i: Issue, r?: [number, number]) => !!r && i.offset < r[1] && r[0] < i.offset + i.length

const isGrammar = (i: Issue) => i.source !== 'spell' && i.category !== 'spelling' && i.category !== 'typo'

/**
 * Grammar issues that sit on a word the user got wrong. Spelling issues only repeat what the
 * letter diff shows, and issues on correct words are noise here.
 */
export function relevantIssues(grade: Grade, issues: readonly Issue[]): Issue[] {
  return issues.filter((i) => isGrammar(i) && grade.wrong.some((t) => overlaps(i, t.op.typedRange)))
}

const EXTRA_WORD: Record<Lang, string> = { en: 'Extra word', nl: 'Extra woord', ar: 'كلمة زائدة' }

export function explainTokens(grade: Grade, issues: readonly Issue[], lang: Lang, explainIn: ExplainIn): WordExplanation[] {
  const local = explainIn === 'local' && lang !== 'en'
  return grade.wrong.map((t, n) => {
    const own = issues
      .filter((i) => isGrammar(i) && overlaps(i, t.op.typedRange))
      .map<IssueText>((i) => {
        const [message, messageLocal] = choose(i.message, i.messageLocal, local)
        const [explanation, explanationLocal] = choose(i.explanation, i.explanationLocal, local)
        return { ruleId: i.ruleId, message: message ?? i.message, explanation, learnMore: i.learnMore, messageLocal, explanationLocal }
      })
    const explained = own.find((i) => i.explanation)
    if (t.status === 'extra') {
      return {
        key: `x${n}`,
        token: t,
        name: local ? EXTRA_WORD[lang] : EXTRA_WORD.en,
        nameLocal: local,
        detail: `'${t.op.typed}' is not in the sentence`,
        tip: '',
        rule: explained?.explanation ?? '',
        ruleLocal: !!explained?.explanationLocal,
        issues: own,
      }
    }
    const label = t.label
    const nameKey = (label?.tag ?? label?.kind) as keyof typeof NAMES | undefined
    const names = nameKey ? NAMES[nameKey] : undefined
    const [name, nameLocal] = names ? choose(names.en, tipLocal(names, lang), local) : ['Spelling', false]
    const [tip, tipIsLocal] = label ? choose(label.tip.en, label.tip.local, local) : ['', false]
    return {
      key: `w${n}`,
      token: t,
      name: name ?? 'Spelling',
      nameLocal,
      detail: label?.detail ?? '',
      tip: tip ?? '',
      rule: explained?.explanation ?? tip ?? '',
      ruleLocal: explained ? explained.explanationLocal : tipIsLocal,
      issues: own,
    }
  })
}

/** Display name of a typo tag or kind ("d/t ending"), in English or the practice language. */
export function tagName(tag: string, lang: Lang, explainIn: ExplainIn = 'en'): string {
  return pick(NAMES[tag as keyof typeof NAMES], lang, explainIn) ?? tag
}
