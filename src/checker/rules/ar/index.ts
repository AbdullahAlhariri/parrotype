import type { Rule } from '@/types'
import { expressionRules } from './expressions'
import { hamzaRules } from './hamza'
import { letterRules } from './letters'
import { punctuationRules } from './punctuation'
import type { ArRule } from './shared'
import { styleRules } from './style'

// Arabic rule pack (docs/research/arabic-typing.md section 6). Curated word lists plus a few patterns;
// words that can be right in context (علي the name, كتابه 'his book', أن/إن) are left alone or only hinted.
// Confidence tiers follow the research: high = error, medium = warning, low = strict-mode style hint.

export const arRulesWithExamples: ArRule[] = [...expressionRules, ...hamzaRules, ...letterRules, ...punctuationRules, ...styleRules]

export const arRules: Rule[] = arRulesWithExamples

export type { ArRule, ArExamples } from './shared'
