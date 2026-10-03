import type { Lang } from '@/types'

/** An explanation in English, plus the practice language for Dutch and Arabic packs. */
export interface Explained {
  en: string
  /** Dutch for nl packs, Arabic for ar packs. English packs leave it out. */
  local?: string
}

export interface DrillItem {
  /** One sentence with exactly one gap, written as {{answer}}: 'Morgen {{wordt}} hij achttien.' */
  sentence: string
  answer: string
  /** Other spellings that are also right (zij / ze). Accepted, never shown as options. */
  accept?: string[]
  /** Wrong options shown in choose mode. */
  alternatives?: string[]
  /** One-line rule hint shown after a wrong answer. */
  hint?: Explained
}

export interface DrillPack {
  /** 'nl.dt'. Stats and the mistake nest use 'gym.<id>' as the rule id. */
  id: string
  lang: Lang
  /** The contrast itself: 'word / wordt'. */
  title: string
  /** One line in English: what the pack trains. */
  blurb: string
  /** One or two paragraphs with the rule and a trick. *word* marks an example. */
  rule: Explained
  items: DrillItem[]
}
