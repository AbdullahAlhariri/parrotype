import type { ProofLang, ProofText } from './types'
import { NL_TEXTS } from './nl'
import { EN_TEXTS } from './en'

export type { PlantedMistake, ProofLang, ProofText, RuleNote } from './types'

/** Texts per language, easiest first (stable within a difficulty). */
export const TEXTS: Record<ProofLang, ProofText[]> = {
  nl: [...NL_TEXTS].sort((a, b) => a.difficulty - b.difficulty),
  en: [...EN_TEXTS].sort((a, b) => a.difficulty - b.difficulty),
}

export const ALL_TEXTS: ProofText[] = [...TEXTS.nl, ...TEXTS.en]

export const findText = (id: string) => ALL_TEXTS.find((t) => t.id === id)

export const isProofLang = (lang: string): lang is ProofLang => lang === 'nl' || lang === 'en'

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
