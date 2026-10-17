import { NAMES, TIPS, type TipText } from '@/engine/tips'
import type { TypoLabel } from '@/engine/typo'
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

/**
 * The engine's generic tips are written for copy typing ("keep your eyes one word ahead").
 * In dictation nothing is on screen to look at, so these few get a version about listening
 * and spelling instead. Tags with their own rule (d/t, hamza, trema...) keep the engine's tip.
 */
const DICTATION_TIPS: Record<string, TipText> = {
  skipped: {
    en: 'A word went missing. Hear it again slowly and count the words as they come.',
    nl: 'Er ontbreekt een woord. Luister nog eens langzaam en tel de woorden mee.',
    ar: 'سقطت كلمة. استمع مرة أخرى ببطء وعُدَّ الكلمات واحدةً واحدة.',
  },
  substitution: {
    en: 'Spell the word in your head, letter by letter, before you type it.',
    nl: 'Spel het woord in je hoofd, letter voor letter, voordat je het typt.',
    ar: 'تهجَّ الكلمة في ذهنك حرفًا حرفًا قبل أن تكتبها.',
  },
  garbled: {
    en: 'Several letters went astray: hear it again slowly and write the word in parts.',
    nl: 'Meerdere letters gingen mis: luister nog eens langzaam en schrijf het woord in stukjes.',
    ar: 'أخطأت في عدة حروف: استمع مرة أخرى ببطء واكتب الكلمة مقطعًا مقطعًا.',
  },
  'real-word': {
    en: 'That word exists, but another one belongs here: let the rest of the sentence decide which.',
    nl: 'Dat woord bestaat wel, maar hier hoort een ander: laat de rest van de zin bepalen welk woord past.',
    ar: 'هذه كلمة صحيحة، لكن المقصود كلمة أخرى: دع بقية الجملة تحدّد الكلمة المناسبة.',
  },
  omission: {
    en: 'A letter went missing: picture the written word and check it letter by letter.',
    nl: 'Er viel een letter weg: zie het geschreven woord voor je en loop het letter voor letter na.',
    ar: 'سقط حرف: تخيّل الكلمة مكتوبة وراجعها حرفًا حرفًا.',
  },
  insertion: {
    en: 'An extra letter slipped in: picture the written word and check it letter by letter.',
    nl: 'Er sloop een letter te veel in: zie het geschreven woord voor je en loop het letter voor letter na.',
    ar: 'تسلّل حرف زائد: تخيّل الكلمة مكتوبة وراجعها حرفًا حرفًا.',
  },
}

/** The label's tip as [English, practice language], with the dictation wording where there is one. */
function labelTips(label: TypoLabel, lang: Lang): [string, string | undefined] {
  for (const [key, own] of Object.entries(DICTATION_TIPS)) if (TIPS[key]?.en === label.tip.en) return [own.en, tipLocal(own, lang)]
  return [label.tip.en, label.tip.local]
}

/** The tip for a typo label in dictation, in the practice language when asked and available. */
export function labelTip(label: TypoLabel, lang: Lang, explainIn: ExplainIn): string {
  const [en, local] = labelTips(label, lang)
  return choose(en, local, explainIn === 'local' && lang !== 'en')[0] ?? en
}

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
    const [tip, tipIsLocal] = label ? choose(...labelTips(label, lang), local) : ['', false]
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

/** Rows that say the same thing (three skipped words, two wrong letters), shown once with all their words. */
export interface ExplanationGroup {
  key: string
  tokens: GradedToken[]
  name: string
  nameLocal: boolean
  /** what happened per word (English, from the classifier) */
  details: string[]
  rule: string
  ruleLocal: boolean
  issues: IssueText[]
}

/**
 * Merges rows with the same name and rule, in the order they first appear. Rows with checker
 * findings stay on their own: those messages are about one word.
 */
export function groupExplanations(rows: readonly WordExplanation[]): ExplanationGroup[] {
  const out: ExplanationGroup[] = []
  for (const r of rows) {
    const same = !r.issues.length && out.find((g) => !g.issues.length && g.name === r.name && g.rule === r.rule)
    if (same) {
      same.tokens.push(r.token)
      if (r.detail) same.details.push(r.detail)
      continue
    }
    out.push({
      key: r.key,
      tokens: [r.token],
      name: r.name,
      nameLocal: r.nameLocal,
      details: r.detail ? [r.detail] : [],
      rule: r.rule,
      ruleLocal: r.ruleLocal,
      issues: r.issues,
    })
  }
  return out
}
