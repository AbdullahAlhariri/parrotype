import type { Lang } from '@/types'
import { useSettings } from '@/state/settings'

/**
 * The parrot has a name per practice language: Kees is Dutch, Monty (after his monocle)
 * speaks English, and Fustuq ("pistachio", a classic name for a green bird) speaks Arabic.
 */
const NAMES: Record<Lang, { native: string; latin: string }> = {
  nl: { native: 'Kees', latin: 'Kees' },
  en: { native: 'Monty', latin: 'Monty' },
  ar: { native: 'فستق', latin: 'Fustuq' },
}

/** Name for use inside English (or Dutch) UI copy: Arabic is transliterated so the sentence stays one script. */
export const mascotName = (lang: Lang) => NAMES[lang].latin

/** Name as written in the practice language itself (فستق inside Arabic text). */
export const mascotNativeName = (lang: Lang) => NAMES[lang].native

/** Current practice language's mascot name, for English UI copy. */
export function useMascotName(): string {
  return mascotName(useSettings((s) => s.lang))
}
