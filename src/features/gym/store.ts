import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Lang } from '@/types'

export interface PackProgress {
  rounds: number
  best: number
  bestOf: number
  lastScore: number
  lastAt: number
  /** item keys answered right first time (latest outcome per item) */
  known: string[]
  /** item key -> how often it was missed, decays when answered right */
  missed: Record<string, number>
  /** the rule card was shown once; later rounds start straight away */
  ruleSeen: boolean
}

export interface Outcome {
  key: string
  right: boolean
}

interface GymStore {
  packs: Record<string, PackProgress>
  /** beginner mode: pick from options with 1/2/3 instead of typing */
  choose: boolean
  /** last language group opened in the pack list */
  lastLang?: Lang
  /** Store a finished round. Returns true for a new best score (not on the first round). */
  recordRound: (packId: string, outcomes: Outcome[]) => boolean
  markRuleSeen: (packId: string) => void
  setChoose: (v: boolean) => void
  setLastLang: (lang: Lang) => void
  reset: () => void
}

const blank = (): PackProgress => ({ rounds: 0, best: 0, bestOf: 0, lastScore: 0, lastAt: 0, known: [], missed: {}, ruleSeen: false })

export const useGym = create<GymStore>()(
  persist(
    (set, get) => ({
      packs: {},
      choose: false,
      recordRound: (packId, outcomes) => {
        const cur = get().packs[packId] ?? blank()
        const score = outcomes.filter((o) => o.right).length
        const known = new Set(cur.known)
        const missed = { ...cur.missed }
        for (const o of outcomes) {
          if (o.right) {
            known.add(o.key)
            if (missed[o.key] > 1) missed[o.key]--
            else delete missed[o.key]
          } else {
            known.delete(o.key)
            missed[o.key] = (missed[o.key] ?? 0) + 1
          }
        }
        const newBest = cur.rounds > 0 && score > cur.best
        const next: PackProgress = {
          ...cur,
          rounds: cur.rounds + 1,
          best: Math.max(cur.best, score),
          bestOf: score >= cur.best ? outcomes.length : cur.bestOf,
          lastScore: score,
          lastAt: Date.now(),
          known: [...known],
          missed,
        }
        set((st) => ({ packs: { ...st.packs, [packId]: next } }))
        return newBest
      },
      markRuleSeen: (packId) =>
        set((st) => ({ packs: { ...st.packs, [packId]: { ...(st.packs[packId] ?? blank()), ruleSeen: true } } })),
      setChoose: (choose) => set({ choose }),
      setLastLang: (lastLang) => set({ lastLang }),
      reset: () => set({ packs: {} }),
    }),
    { name: 'parrotype.gym', version: 1 },
  ),
)
