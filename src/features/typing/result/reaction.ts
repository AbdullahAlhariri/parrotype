import type { TypingResult } from '@/types'
import type { ReactionId } from '@/lib/audio'

// Which recorded line the mascot says on the result screen. Rare on purpose: a personal best,
// a flawless run, or (at most once per 10 minutes) a word of comfort after a rough one.

export const PERFECT_MIN_WORDS = 10
export const ROUGH_ACCURACY = 85
/** a rough run needs this many typed words before it counts (not a stray key or two) */
export const ROUGH_MIN_WORDS = 5
export const AGAIN_COOLDOWN_MS = 10 * 60 * 1000

let lastAgainAt = -Infinity

/** Words the user actually typed something for. */
const attempted = (r: TypingResult) => r.words.filter((w) => w.typed !== '')

export const isFlawless = (r: TypingResult) => {
  const words = attempted(r)
  return words.length >= PERFECT_MIN_WORDS && r.accuracy >= 99.995 && words.every((w) => w.correct && !w.everWrong)
}

export const isRough = (r: TypingResult) => r.accuracy < ROUGH_ACCURACY && attempted(r).length >= ROUGH_MIN_WORDS

/** The reaction for a result, ignoring the cooldown. */
export function reactionFor(r: TypingResult, isPb: boolean): ReactionId | null {
  if (isPb) return 'record'
  if (isFlawless(r)) return 'perfect'
  if (isRough(r)) return 'again'
  return null
}

/** True when an 'again' may play now; remembers it when it does. */
export function takeAgainSlot(now = Date.now()): boolean {
  if (now - lastAgainAt < AGAIN_COOLDOWN_MS) return false
  lastAgainAt = now
  return true
}

/** For tests. */
export function resetAgainSlot() {
  lastAgainAt = -Infinity
}
