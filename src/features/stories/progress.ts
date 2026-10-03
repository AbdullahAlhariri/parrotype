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
  /** how many times every page was typed (complete read-throughs) */
  reads: number
  /** pages typed in the current read-through; a read counts when it holds every page */
  fresh?: number[]
  updatedAt: number
}

export const emptyProgress = (): StoryProgress => ({ current: 0, pages: {}, reads: 0, fresh: [], updatedAt: 0 })

/** Pages typed in the current read-through. Older saves have no list: before the first read it is every recorded page. */
export const freshPages = (p: StoryProgress): number[] => p.fresh ?? (p.reads ? [] : Object.keys(p.pages).map(Number))

export const pagesDone = (p: StoryProgress | undefined) => (p ? Object.keys(p.pages).length : 0)

/** The first page not in `done` after `from`, wrapping round; -1 when every page is in it. */
export function nextUnfinished(done: ReadonlySet<number>, pageCount: number, from: number): number {
  for (let k = 1; k <= pageCount; k++) {
    const i = (from + k) % pageCount
    if (!done.has(i)) return i
  }
  return -1
}

/**
 * Apply one finished page. Pure, so it can be tested without the store.
 * A read counts when every page has been typed since the last read finished, in any order, so
 * jumping straight to the last page of a finished story is not another read. A finished read
 * starts over at page 1; otherwise `current` is the next page still to type in this read-through.
 */
export function withPage(prev: StoryProgress | undefined, page: number, pageCount: number, rec: { wpm: number; accuracy: number }, now = Date.now()): StoryProgress {
  const p = prev ?? emptyProgress()
  const old = p.pages[page]
  const pages = { ...p.pages, [page]: { wpm: rec.wpm, accuracy: rec.accuracy, best: Math.max(old?.best ?? 0, rec.wpm), at: now } }
  const fresh = new Set(freshPages(p).filter((i) => i >= 0 && i < pageCount))
  fresh.add(page)
  const missing = nextUnfinished(fresh, pageCount, page)
  if (missing === -1) return { ...p, pages, fresh: [], current: 0, reads: p.reads + 1, updatedAt: now }
  return { ...p, pages, fresh: [...fresh].sort((a, b) => a - b), current: missing, updatedAt: now }
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
