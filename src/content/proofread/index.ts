import { LANGS, type Lang } from '@/types'
import type { ProofLang, ProofText } from './types'
import { NL_TEXTS } from './nl'
import { EN_TEXTS } from './en'
import { AR_TEXTS } from './ar'

export type { PlantedMistake, ProofLang, ProofText, RuleNote } from './types'

const byDifficulty = (list: ProofText[]) => [...list].sort((a, b) => a.difficulty - b.difficulty)

/** Texts per language, easiest first (stable within a difficulty). */
export const TEXTS: Record<ProofLang, ProofText[]> = {
  nl: byDifficulty(NL_TEXTS),
  en: byDifficulty(EN_TEXTS),
  ar: byDifficulty(AR_TEXTS),
}

export const ALL_TEXTS: ProofText[] = [...TEXTS.nl, ...TEXTS.en, ...TEXTS.ar]

export const findText = (id: string) => ALL_TEXTS.find((t) => t.id === id)

/** Every practice language has texts now; kept so older callers keep compiling. */
export const isProofLang = (lang: string): lang is ProofLang => (LANGS as string[]).includes(lang)

export const textsFor = (lang: Lang): ProofText[] => TEXTS[lang]

/** The fix applied by hand, mistake by mistake, from the faulty text. Used to check content. */
export function applyFixes(text: ProofText): string {
  let out = ''
  let last = 0
  for (const m of text.mistakes) {
    out += text.text.slice(last, m.at) + m.right
    last = m.at + m.wrong.length
  }
  return out + text.text.slice(last)
}
