import type { Grade, HintLevel } from './grade'

/**
 * Per-sentence flow with the indirect hint ladder (typing-pedagogy.md §2.9):
 * answer -> (wrong) mark words -> narrow to letters -> show the rule -> reveal -> retype -> done.
 * Every wrong check climbs one step; the user can also climb on purpose.
 */

export type ItemPhase = 'answer' | 'feedback' | 'retype' | 'done'

export interface ItemState {
  phase: ItemPhase
  hint: HintLevel
  /** checks submitted (not counting the retype) */
  attempts: number
  /** grade of the latest check */
  grade: Grade | null
  /** grade and text of the first check: this is what gets scored */
  first: Grade | null
  firstTyped: string
  /** the retype after the reveal was wrong at least once */
  retypeMissed: boolean
}

export const initialItem = (): ItemState => ({
  phase: 'answer',
  hint: 0,
  attempts: 0,
  grade: null,
  first: null,
  firstTyped: '',
  retypeMissed: false,
})

export type ItemAction = { type: 'check'; grade: Grade; typed: string } | { type: 'hint' } | { type: 'reveal' } | { type: 'reset' }

const up = (h: HintLevel): HintLevel => Math.min(4, h + 1) as HintLevel

export function itemReducer(s: ItemState, a: ItemAction): ItemState {
  switch (a.type) {
    case 'reset':
      return initialItem()
    case 'check': {
      if (s.phase === 'done') return s
      if (s.phase === 'retype') {
        return a.grade.perfect ? { ...s, phase: 'done', grade: a.grade } : { ...s, grade: a.grade, retypeMissed: true }
      }
      const first = s.first ?? a.grade
      const firstTyped = s.first ? s.firstTyped : a.typed
      const attempts = s.attempts + 1
      if (a.grade.perfect) return { ...s, phase: 'done', grade: a.grade, first, firstTyped, attempts }
      const hint = up(s.hint)
      return { ...s, phase: hint === 4 ? 'retype' : 'feedback', hint, grade: a.grade, first, firstTyped, attempts }
    }
    case 'hint': {
      if (s.phase !== 'feedback') return s
      const hint = up(s.hint)
      return { ...s, hint, phase: hint === 4 ? 'retype' : 'feedback' }
    }
    case 'reveal':
      if (s.phase !== 'feedback' && s.phase !== 'answer') return s
      return { ...s, hint: 4, phase: 'retype' }
  }
}

/** Label for the button that climbs one step from `hint`. */
export function nextHintLabel(hint: HintLevel): string | null {
  if (hint === 1) return 'Show the letters'
  if (hint === 2) return 'Show the rule'
  if (hint === 3) return 'Show the answer'
  return null
}
