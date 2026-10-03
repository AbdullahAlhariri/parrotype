import type { Lang, Rule } from '@/types'
import { arRules } from './ar'
import { enRules } from './en'
import { nlRules } from './nl'

export const RULES: Record<Lang, Rule[]> = { nl: nlRules, en: enRules, ar: arRules }

export const getRules = (lang: Lang): Rule[] => RULES[lang] ?? []
