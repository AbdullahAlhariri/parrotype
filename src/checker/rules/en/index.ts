import type { Rule } from '@/types'
import { aAn } from './aan'
import { arabicTransferRules } from './arabic-transfer'
import { capitalRules } from './capitals'
import { collocationRules } from './collocations'
import { confusableRules } from './confusables'
import { grammarRules } from './grammar'
import { punctuationRules } from './punctuation'
import type { EnRule } from './shared'
import { spellingRules } from './spelling'
import { varietyRules } from './variety'

// English rule pack. Ids map one to one to the research prototype (EN_THEN_THAN -> en.then-than), see
// docs/research/english-errors.md section 4. Severity: error -> high, warning -> medium,
// hint -> low + strictOnly (only shown in strict mode).

/** every English rule with its built-in examples (also handy for "fix the sentence" cards) */
export const enRulesWithExamples: EnRule[] = [
  ...confusableRules,
  ...spellingRules,
  ...capitalRules,
  ...grammarRules,
  ...collocationRules,
  ...arabicTransferRules,
  ...punctuationRules,
  aAn,
  ...varietyRules,
]

export const enRules: Rule[] = enRulesWithExamples

export type { EnRule, Example } from './shared'
export { expectedArticle } from './aan'
