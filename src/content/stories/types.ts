import type { Lang } from '@/types'

export type StoryLevel = 'easy' | 'medium' | 'hard'

/** An original short story, typed page by page in /stories. */
export interface Story {
  /** stable id, used as the progress key in localStorage; never rename */
  id: string
  lang: Lang
  title: string
  /** one or two dry lines in the story's language */
  blurb: string
  level: StoryLevel
  /** pages of roughly 50 to 70 words (Arabic pages are shorter); straight quotes only */
  pages: string[]
}
