import type { Rule } from '@/types'
import { articleRules } from './articles'
import { capitalRules } from './capitals'
import { comparisonRules } from './comparison'
import { compoundRules } from './compounds'
import { dtRules } from './dt'
import { kofschipRules } from './kofschip'
import { lexicalRules } from './lexical'
import { participleRules } from './participle'
import { pronounRules } from './pronouns'
import { punctuationRules } from './punctuation'
import { spellingRules } from './spelling'
import { wordOrderRules } from './wordorder'

/** All Dutch rules, roughly in priority order (docs/research/dutch-errors.md §10). */
export const nlRules: Rule[] = [
  ...dtRules,
  ...participleRules,
  ...kofschipRules,
  ...wordOrderRules,
  ...pronounRules,
  ...articleRules,
  ...comparisonRules,
  ...capitalRules,
  ...spellingRules,
  ...compoundRules,
  ...lexicalRules,
  ...punctuationRules,
]

export { drillPackFor } from './drills'
