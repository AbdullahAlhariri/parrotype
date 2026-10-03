import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ProofText } from '@/content/proofread'

export interface TextProgress {
  attempts: number
  /** most mistakes fixed in one check */
  best: number
  total: number
  /** best check fixed everything and broke nothing */
  perfect: boolean
  lastAt: number
}

interface FixStore {
  texts: Record<string, TextProgress>
  /** Store one check. Returns true the first time a text comes out perfect. */
  record: (id: string, fixed: number, total: number, introduced: number) => boolean
}

export const useFix = create<FixStore>()(
  persist(
    (set, get) => ({
      texts: {},
      record: (id, fixed, total, introduced) => {
        const cur = get().texts[id]
        const perfect = fixed === total && introduced === 0
        const first = perfect && !cur?.perfect
        set((st) => ({
          texts: {
            ...st.texts,
            [id]: {
              attempts: (cur?.attempts ?? 0) + 1,
              best: Math.max(cur?.best ?? 0, fixed),
              total,
              perfect: (cur?.perfect ?? false) || perfect,
              lastAt: Date.now(),
            },
          },
        }))
        return first
      },
    }),
    { name: 'parrotype.fix', version: 1 },
  ),
)

/** The text to open by default: the first one not done perfectly yet, easiest first. */
export function nextUp(texts: ProofText[], progress: Record<string, TextProgress>, after?: string): ProofText {
  const start = after ? texts.findIndex((t) => t.id === after) + 1 : 0
  const ordered = [...texts.slice(start), ...texts.slice(0, start)]
  return ordered.find((t) => !progress[t.id]?.perfect) ?? ordered[0]
}
