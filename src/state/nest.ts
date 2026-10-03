import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Lang, NestItem } from '@/types'
import { uid } from '@/lib/id'

/** Leitner intervals in days for boxes 1..5. Box 5 + correct = graduated (removed). */
export const BOX_DAYS = [0, 1, 3, 7, 16]
const DAY = 24 * 60 * 60 * 1000

interface NestStore {
  items: NestItem[]
  /** Add (or bump) a mistake. Same target + lang is merged, and sent back to box 1. */
  add: (item: Pick<NestItem, 'lang' | 'kind' | 'target'> & Partial<Pick<NestItem, 'wrong' | 'ruleId' | 'hint'>>) => void
  /** Record a review answer. Correct moves up a box, wrong goes back to box 1. */
  review: (id: string, correct: boolean, typed?: string) => void
  remove: (id: string) => void
  due: (lang: Lang, now?: number) => NestItem[]
  clear: () => void
}

export const useNest = create<NestStore>()(
  persist(
    (set, get) => ({
      items: [],
      add: (it) =>
        set((st) => {
          const now = Date.now()
          const existing = st.items.find((x) => x.lang === it.lang && x.target === it.target)
          if (existing) {
            return {
              items: st.items.map((x) =>
                x === existing
                  ? { ...x, box: 1, due: now, wrong: [...new Set([...(it.wrong ?? []), ...x.wrong])].slice(0, 6) }
                  : x,
              ),
            }
          }
          const item: NestItem = {
            id: uid(),
            lang: it.lang,
            kind: it.kind,
            target: it.target,
            wrong: it.wrong ?? [],
            ruleId: it.ruleId,
            hint: it.hint,
            box: 1,
            due: now,
            added: now,
            reviews: 0,
            lapses: 0,
          }
          return { items: [...st.items, item].slice(-800) }
        }),
      review: (id, correct, typed) =>
        set((st) => {
          const now = Date.now()
          const items: NestItem[] = []
          for (const x of st.items) {
            if (x.id !== id) {
              items.push(x)
              continue
            }
            if (correct && x.box >= 5) continue // graduated
            const box = correct ? x.box + 1 : 1
            items.push({
              ...x,
              box,
              due: now + BOX_DAYS[box - 1] * DAY,
              reviews: x.reviews + 1,
              lapses: x.lapses + (correct ? 0 : 1),
              wrong: !correct && typed ? [...new Set([typed, ...x.wrong])].slice(0, 6) : x.wrong,
            })
          }
          return { items }
        }),
      remove: (id) => set((st) => ({ items: st.items.filter((x) => x.id !== id) })),
      due: (lang, now = Date.now()) => get().items.filter((x) => x.lang === lang && x.due <= now).sort((a, b) => a.box - b.box || a.due - b.due),
      clear: () => set({ items: [] }),
    }),
    { name: 'parrotype.nest', version: 1 },
  ),
)
