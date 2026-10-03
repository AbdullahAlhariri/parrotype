import { wordsOf } from './select'

/**
 * Memory mode (no voice, or chosen): how long the sentence stays on screen. Long enough to
 * read it once with attention, short enough that you have to remember it.
 */
export function flashMs(text: string): number {
  const words = wordsOf(text).length
  return Math.round(Math.min(9000, Math.max(2200, 1200 + 330 * words + 12 * text.length)))
}
