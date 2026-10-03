import type { TypingResult } from '@/types'
import type { ReactionId } from '@/lib/audio'

// Which recorded line the mascot says on the result screen. Rare on purpose: a personal best,
// a flawless run, or (at most once per 10 minutes) a word of comfort after a rough one.

export const PERFECT_MIN_WORDS = 10
export const ROUGH_ACCURACY = 85
/** a rough run needs this many typed words before it counts (not a stray key or two) */
export const ROUGH_MIN_WORDS = 5
export const AGAIN_COOLDOWN_MS = 10 * 60 * 1000

// remembered across reloads, so a few rough runs and a refresh don't mean a second sympathy line
const AGAIN_KEY = 'parrotype.againAt'
let lastAgainAt = -Infinity

function readAgainAt(): number {
  try {
    const v = Number(localStorage.getItem(AGAIN_KEY))
    return Number.isFinite(v) && v > 0 ? v : -Infinity
  } catch {
    return -Infinity
  }
}

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
  const last = Math.max(lastAgainAt, readAgainAt())
  // a stored time in the future (clock changed) does not block forever
  if (now - last < AGAIN_COOLDOWN_MS && last <= now) return false
  lastAgainAt = now
  try {
    localStorage.setItem(AGAIN_KEY, String(now))
  } catch {
    /* blocked storage: the in-memory time still applies */
  }
  return true
}

/** For tests. */
export function resetAgainSlot() {
  lastAgainAt = -Infinity
  try {
    localStorage.removeItem(AGAIN_KEY)
  } catch {
    /* nothing stored */
  }
}
