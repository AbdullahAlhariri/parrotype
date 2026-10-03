import type { Lang, TypoKind } from '@/types'
import type { LayoutId } from './keyboard'
import { NAMES, TIPS, type TipText, type TypoTag } from './tips'

// Shared label types and helpers for the typo classifier.

export type TypoNature = 'motor' | 'cognitive' | 'unknown'

export interface TypoTip {
  en: string
  /** the same tip in Dutch (nl) or Arabic (ar) */
  local?: string
}

export interface TypoLabel {
  kind: TypoKind
  nature: TypoNature
  /** short human text, e.g. "hit 'r' instead of 't' (neighbour key)" */
  detail: string
  /** finer label: 'dt', 'kofschip', 'trema', 'ei-ij', 'hamza', 'neighbour', 'repeat', ... */
  tag?: TypoTag
  tip: TypoTip
}

export interface ClassifyOptions {
  layout?: LayoutId
  /** 'copy' (target visible, the default) or 'dictation' (typed from memory/sound) */
  mode?: 'copy' | 'dictation'
  /** previous / next word of the expected text, for sharper d/t tips */
  prev?: string
  next?: string
  /** word list; enables the "typed another real word" label */
  dict?: { has(word: string): boolean }
}

export interface Ctx {
  E: string
  T: string
  /** lowercase forms */
  el: string
  tl: string
  lang: Lang
  layout: LayoutId
  mode: 'copy' | 'dictation'
  o: ClassifyOptions
}

export function localise(t: TipText, lang: Lang, fill: (s: string) => string = (s) => s): TypoTip {
  const local = lang === 'nl' ? t.nl : lang === 'ar' ? t.ar : undefined
  return local ? { en: fill(t.en), local: fill(local) } : { en: fill(t.en) }
}

export function tip(key: string, lang: Lang, vars: Record<string, string> = {}): TypoTip {
  const t = TIPS[`${key}.${lang}`] ?? TIPS[key] ?? TIPS.substitution
  return localise(t, lang, (s) => s.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? ''))
}

/** The friendly tip for a tag or kind ('dt', 'adjacent', ...), e.g. for a stats page. */
export const tipFor = (tagOrKind: string, lang: Lang): TypoTip => tip(tagOrKind, lang)

/** Display name for a tag or kind ('dt' -> "d/t ending" / "d/t-regel"). Falls back to the id. */
export const typoName = (tagOrKind: string, lang: Lang): TypoTip =>
  localise((NAMES as Record<string, TipText>)[tagOrKind] ?? { en: tagOrKind }, lang)

export function label(c: Ctx, kind: TypoKind, nature: TypoNature, detail: string, tipKey: string, tag?: TypoTag, vars?: Record<string, string>): TypoLabel {
  const out: TypoLabel = { kind, nature, detail, tip: tip(tipKey, c.lang, vars) }
  if (tag) out.tag = tag
  return out
}

/** cognitive when typed from memory, unknown when the target was on screen */
export const soft = (c: Ctx): TypoNature => (c.mode === 'dictation' ? 'cognitive' : 'unknown')

export const HAMZA_CHARS = 'ءأإآؤئ'
export const HAMZA_FAMILY = HAMZA_CHARS + 'اوىي'
export const hasHamza = (s: string) => [...s].some((ch) => HAMZA_CHARS.includes(ch))

const VOWELS = 'aeiouy'
export const isVowel = (ch: string) => VOWELS.includes(ch)
