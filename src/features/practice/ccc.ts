import { normalizeTypingText } from '@/engine/text'

// Cover-Copy-Compare scheduling for the mistake nest: show, hide, recall, compare.
// A miss comes back once more after 3 to 5 other items in the same session.

/** Reviews per session, so the nest never turns into homework. */
export const SESSION_CAP = 20
/** How often one item may be re-queued in a session. */
export const MAX_REQUEUE = 2

export interface CccAnswer {
  id: string
  correct: boolean
  /** true when this was a re-test of an item already answered this session */
  retest: boolean
  typed: string
}

export interface CccState {
  /** item ids in asking order; grows when misses are re-queued */
  queue: string[]
  pos: number
  requeued: Record<string, number>
  log: CccAnswer[]
}

export function startCcc(ids: string[], cap = SESSION_CAP): CccState {
  return { queue: [...new Set(ids)].slice(0, cap), pos: 0, requeued: {}, log: [] }
}

export const currentId = (s: CccState): string | undefined => s.queue[s.pos]

export const cccDone = (s: CccState) => s.pos >= s.queue.length

/** Gap before a missed item returns: 3, 4 or 5 other items. */
export const requeueGap = (rand: () => number) => 3 + Math.floor(rand() * 3)

/** Record the answer for the current item and move on. Misses are re-inserted further down the queue. */
export function answerCcc(s: CccState, correct: boolean, typed = '', rand: () => number = Math.random, maxRequeue = MAX_REQUEUE): CccState {
  const id = currentId(s)
  if (id === undefined) return s
  const retest = s.log.some((a) => a.id === id)
  const log = [...s.log, { id, correct, retest, typed }]
  const queue = s.queue.slice()
  const requeued = { ...s.requeued }
  if (!correct && (requeued[id] ?? 0) < maxRequeue) {
    requeued[id] = (requeued[id] ?? 0) + 1
    const at = Math.min(s.pos + 1 + requeueGap(rand), queue.length)
    queue.splice(at, 0, id)
  }
  return { queue, pos: s.pos + 1, requeued, log }
}

export interface CccSummary {
  /** distinct items asked */
  reviewed: number
  /** right on the first try */
  firstTry: number
  /** ids wrong on the first try */
  missed: string[]
  /** ids wrong at first and right on a later re-test */
  fixed: string[]
}

export function cccSummary(s: CccState): CccSummary {
  const first = new Map<string, boolean>()
  const lastOk = new Map<string, boolean>()
  for (const a of s.log) {
    if (!first.has(a.id)) first.set(a.id, a.correct)
    lastOk.set(a.id, a.correct)
  }
  const missed = [...first].filter(([, ok]) => !ok).map(([id]) => id)
  return {
    reviewed: first.size,
    firstTry: [...first.values()].filter(Boolean).length,
    missed,
    fixed: missed.filter((id) => lastOk.get(id)),
  }
}

/** Comparison form: typable punctuation, NFC, single spaces, trimmed. Case still counts. */
export const normalizeAnswer = (s: string) => normalizeTypingText(s).replace(/\s+/g, ' ').trim()

export const isRightAnswer = (target: string, typed: string) => normalizeAnswer(target) === normalizeAnswer(typed)

/** How long the target stays visible before it is covered. */
export function revealMs(target: string, kind: 'word' | 'sentence'): number {
  const n = [...target].length
  if (kind === 'word') return Math.min(3500, Math.max(1500, 1100 + 110 * n))
  return Math.min(8000, Math.max(2500, 1400 + 55 * n))
}
