import type { Lang } from '@/types'
import type { Story } from './types'
import { NL_STORIES } from './nl'
import { EN_STORIES } from './en'
import { AR_STORIES } from './ar'

export type { Story, StoryLevel } from './types'

const BY_LANG: Record<Lang, Story[]> = { nl: NL_STORIES, en: EN_STORIES, ar: AR_STORIES }

export const ALL_STORIES: Story[] = [...NL_STORIES, ...EN_STORIES, ...AR_STORIES]

export const storiesFor = (lang: Lang): Story[] => BY_LANG[lang]

export const getStory = (id: string): Story | undefined => ALL_STORIES.find((s) => s.id === id)

/** Whole sentences from every story page in a language (used by the daily challenge). */
export function storySentences(lang: Lang): string[] {
  const out: string[] = []
  for (const story of BY_LANG[lang]) {
    for (const page of story.pages) {
      for (const m of page.matchAll(/[^.!?؟]+[.!?؟]+["']?/g)) {
        const s = m[0].trim()
        if (s) out.push(s)
      }
    }
  }
  return out
}
