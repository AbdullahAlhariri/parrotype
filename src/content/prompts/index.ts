import type { Lang } from '@/types'
import type { PromptKind, WritingPrompt } from './types'
import { NL_PROMPTS } from './nl'
import { EN_PROMPTS } from './en'
import { AR_PROMPTS } from './ar'

export type { PromptKind, WritingPrompt } from './types'
export { PROMPT_KINDS, kindLabel } from './types'

const BY_LANG: Record<Lang, WritingPrompt[]> = { nl: NL_PROMPTS, en: EN_PROMPTS, ar: AR_PROMPTS }

export const promptsFor = (lang: Lang, kind?: PromptKind | 'all'): WritingPrompt[] =>
  !kind || kind === 'all' ? BY_LANG[lang] : BY_LANG[lang].filter((p) => p.kind === kind)

export const findPrompt = (id: string | undefined): WritingPrompt | undefined => {
  if (!id) return undefined
  const lang = id.slice(0, 2) as Lang
  return BY_LANG[lang]?.find((p) => p.id === id)
}

/** A random prompt, never the one passed in (so shuffle always changes something). */
export function randomPrompt(lang: Lang, kind: PromptKind | 'all' = 'all', notId?: string, rand: () => number = Math.random): WritingPrompt {
  let pool = promptsFor(lang, kind)
  if (!pool.length) pool = promptsFor(lang)
  const others = pool.length > 1 ? pool.filter((p) => p.id !== notId) : pool
  return others[Math.floor(rand() * others.length)]
}
