import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SessionRecord } from '@/types'
import { dayKey } from '@/lib/id'

// The suggested 15-minute plan. An item counts as done when a matching session was recorded
// today, or when it was ticked by hand (ticks are stored per day and reset at midnight).

export type PlanId = 'warmup' | 'nest' | 'dictation' | 'gym'

export interface PlanItem {
  id: PlanId
  label: string
  minutes: number
  to: string
}

export const PLAN: PlanItem[] = [
  { id: 'warmup', label: 'Warm-up drill', minutes: 2, to: '/practice?mode=drill' },
  { id: 'nest', label: 'Nest review', minutes: 4, to: '/practice?mode=nest' },
  { id: 'dictation', label: 'One dictation set', minutes: 5, to: '/listen' },
  { id: 'gym', label: 'One gym pack', minutes: 4, to: '/gym' },
]

export const DRILL_CONFIG = 'warm-up drill'
export const focusConfig = (units: string[]) => (units.length ? `focus drill: ${units.join(' ')}` : DRILL_CONFIG)
export const NEST_CONFIG = 'nest review'

/** Which plan item a finished session satisfies, if any. */
export function planIdFor(s: Pick<SessionRecord, 'mode' | 'config'>): PlanId | undefined {
  if (s.mode === 'dictation') return 'dictation'
  if (s.mode === 'gym') return 'gym'
  if (s.mode === 'practice' && s.config === NEST_CONFIG) return 'nest'
  if (s.mode === 'practice' && /^(focus|warm-up) drill/.test(s.config)) return 'warmup'
  return undefined
}

export function planStatus(sessions: SessionRecord[], ticks: { day: string; done: PlanId[] }, now = new Date()): Record<PlanId, boolean> {
  const today = dayKey(now)
  const done: Record<PlanId, boolean> = { warmup: false, nest: false, dictation: false, gym: false }
  for (const s of sessions) {
    if (dayKey(new Date(s.at)) !== today) continue
    const id = planIdFor(s)
    if (id) done[id] = true
  }
  if (ticks.day === today) for (const id of ticks.done) done[id] = true
  return done
}

interface PlanStore {
  day: string
  done: PlanId[]
  toggle: (id: PlanId, on: boolean) => void
}

export const usePlanTicks = create<PlanStore>()(
  persist(
    (set) => ({
      day: '',
      done: [],
      toggle: (id, on) =>
        set((st) => {
          const today = dayKey()
          const cur = st.day === today ? st.done : []
          return { day: today, done: on ? [...new Set([...cur, id])] : cur.filter((x) => x !== id) }
        }),
    }),
    { name: 'parrotype.plan', version: 1 },
  ),
)
