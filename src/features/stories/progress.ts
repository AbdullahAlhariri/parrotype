import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Story } from '@/content/stories'

// Story progress, kept in localStorage under 'parrotype.stories'.

export interface PageRecord {
  wpm: number
  accuracy: number
  /** best wpm on this page so far */
  best: number
  at: number
}

export interface StoryProgress {
  /** page index (0-based) to open next */
  current: number
  /** finished pages by index */
  pages: Record<number, PageRecord>
  /** how many times the last page was finished */
  reads: number
  updatedAt: number
}

export const emptyProgress = (): StoryProgress => ({ current: 0, pages: {}, reads: 0, updatedAt: 0 })

export const pagesDone = (p: StoryProgress | undefined) => (p ? Object.keys(p.pages).length : 0)

/** The first page without a record after `from`, wrapping round; -1 when every page is done. */
export function nextUnfinished(p: StoryProgress, pageCount: number, from: number): number {
  for (let k = 1; k <= pageCount; k++) {
    const i = (from + k) % pageCount
    if (!p.pages[i]) return i
  }
  return -1
}

/**
 * Apply one finished page. Pure, so it can be tested without the store.
 * A read counts when the last missing page is filled in, or when the last page is typed
 * again after the story was complete (a re-read). A finished story starts over at page 1;
 * otherwise `current` is the next page still to type.
 */
export function withPage(prev: StoryProgress | undefined, page: number, pageCount: number, rec: { wpm: number; accuracy: number }, now = Date.now()): StoryProgress {
  const p = prev ?? emptyProgress()
  const old = p.pages[page]
  const wasComplete = nextUnfinished(p, pageCount, page) === -1
  const pages = { ...p.pages, [page]: { wpm: rec.wpm, accuracy: rec.accuracy, best: Math.max(old?.best ?? 0, rec.wpm), at: now } }
  const next: StoryProgress = { ...p, pages, updatedAt: now }
  const missing = nextUnfinished(next, pageCount, page)
  // a re-read has to arrive at the last page by reading on, not by retyping it straight after the end
  const completed = missing === -1 && (!wasComplete || (page === pageCount - 1 && p.current === page))
  if (completed) return { ...next, current: 0, reads: p.reads + 1 }
  return { ...next, current: missing === -1 ? Math.min(page + 1, pageCount - 1) : missing }
}

/** True when this page record completed a read of the story. */
export const completedRead = (before: StoryProgress | undefined, after: StoryProgress) => after.reads > (before?.reads ?? 0)

/** Average wpm and accuracy over the finished pages (null when none). */
export function storyAverages(p: StoryProgress | undefined): { wpm: number; accuracy: number; pages: number } | null {
  const recs = p ? Object.values(p.pages) : []
  if (!recs.length) return null
  const wpm = recs.reduce((a, r) => a + r.wpm, 0) / recs.length
  const accuracy = recs.reduce((a, r) => a + r.accuracy, 0) / recs.length
  return { wpm: Math.round(wpm), accuracy: Math.round(accuracy * 10) / 10, pages: recs.length }
}

/** The story to offer under "Continue": the most recently touched one that is part-way through. */
export function continueCandidate(stories: Story[], progress: Record<string, StoryProgress>): Story | undefined {
  let best: Story | undefined
  let at = 0
  for (const s of stories) {
    const p = progress[s.id]
    if (!p || p.current <= 0 || p.current >= s.pages.length || pagesDone(p) === 0) continue
    if (p.updatedAt > at) {
      at = p.updatedAt
      best = s
    }
  }
  return best
}

export const wordCount = (s: Story) => s.pages.reduce((a, p) => a + p.split(/\s+/).filter(Boolean).length, 0)

interface StoriesStore {
  progress: Record<string, StoryProgress>
  recordPage: (id: string, page: number, pageCount: number, rec: { wpm: number; accuracy: number }) => void
  goTo: (id: string, page: number) => void
}

export const useStoryProgress = create<StoriesStore>()(
  persist(
    (set) => ({
      progress: {},
      recordPage: (id, page, pageCount, rec) => set((st) => ({ progress: { ...st.progress, [id]: withPage(st.progress[id], page, pageCount, rec) } })),
      goTo: (id, page) =>
        set((st) => {
          const p = st.progress[id] ?? emptyProgress()
          return { progress: { ...st.progress, [id]: { ...p, current: page, updatedAt: Date.now() } } }
        }),
    }),
    { name: 'parrotype.stories', version: 1 },
  ),
)
