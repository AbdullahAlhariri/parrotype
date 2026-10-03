import type { Lang } from '@/types'
import type { Explained } from '@/content/drills/types'

/** Every practice language has Fix it texts. Kept as its own name for older imports. */
export type ProofLang = Lang

export interface PlantedMistake {
  wrong: string
  right: string
  /** other fixes that also count ('have been living' for 'have lived') */
  accept?: string[]
  /** offset of `wrong` in the faulty text */
  at: number
  /** offset of `right` in the corrected text */
  fixAt: number
  /** key into the language's rule notes, e.g. 'dt-ik' */
  rule: string
  /** short English title for stats: 'd/t after ik' */
  title: string
  ruleNote: Explained
  /** grammar gym pack that trains this rule */
  pack?: string
}

export interface ProofText {
  id: string
  lang: ProofLang
  title: string
  difficulty: 1 | 2 | 3
  /** the text with the mistakes in it, as the editor starts */
  text: string
  /** the same text with every planted mistake fixed */
  corrected: string
  mistakes: PlantedMistake[]
}

export interface RuleNote {
  title: string
  note: Explained
  pack?: string
}
