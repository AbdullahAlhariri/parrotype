import { wordsOf } from './select'

/**
 * Memory mode (no voice, or chosen): how long the sentence stays on screen. Long enough to
 * read it once with attention, short enough that you have to remember it.
 */
export function flashMs(text: string): number {
  const words = wordsOf(text).length
  return Math.round(Math.min(9000, Math.max(2200, 1200 + 330 * words + 12 * text.length)))
}

export type FlashPart = { kind: 'text'; text: string } | { kind: 'choice'; options: string[] }

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * What memory mode shows. For a minimal pair the pair word becomes both spellings
 * ("Hij word/wordt morgen twintig."): they sound the same, so listening gives no more away than
 * this, and showing the word itself would hand over the answer. Options keep the pair's order
 * and take the capital of the word they stand in for.
 */
export function flashParts(text: string, target?: string, choices?: readonly string[]): FlashPart[] {
  if (!target || !choices || choices.length < 2) return [{ kind: 'text', text }]
  const m = new RegExp(`(?<![\\p{L}\\p{M}'’])${escape(target)}(?![\\p{L}\\p{M}])`, 'iu').exec(text)
  if (!m) return [{ kind: 'text', text }]
  const first = m[0][0]
  const upper = first !== first.toLowerCase()
  const options = choices.map((c) => (upper ? c[0].toUpperCase() + c.slice(1) : c))
  const before = text.slice(0, m.index)
  const after = text.slice(m.index + m[0].length)
  return [
    ...(before ? [{ kind: 'text', text: before } as const] : []),
    { kind: 'choice', options },
    ...(after ? [{ kind: 'text', text: after } as const] : []),
  ]
}
