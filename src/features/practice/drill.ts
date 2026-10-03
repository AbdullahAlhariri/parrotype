import type { KeyStat } from '@/types'
import type { Weakness } from '@/engine'

// Focus drill helpers: which units to drill, and the accuracy gate.

export const DRILL_WORDS = 30
export const GATE = 97
/** clean rounds in a row before Kees suggests more speed */
export const PASSES_TO_SPEED_UP = 3

/** "d,ij,E" -> ['d', 'ij', 'e']; letters only, one or two characters each, at most 5 units. */
export function parseUnits(raw: string | null | undefined): string[] {
  if (!raw) return []
  const out: string[] = []
  for (const part of raw.split(',')) {
    const u = part.trim().toLowerCase()
    if (!u || [...u].length > 2 || !/^\p{L}+$/u.test(u) || out.includes(u)) continue
    out.push(u)
  }
  return out.slice(0, 5)
}

/** Explicit units (from ?focus=) as weaknesses, with the user's own numbers when there are any. */
export function unitsToWeaknesses(units: string[], keys: Record<string, KeyStat>, bigrams: Record<string, KeyStat>): Weakness[] {
  return units.map((unit, i) => {
    const kind = [...unit].length > 1 ? 'bigram' : 'key'
    const s = (kind === 'key' ? keys : bigrams)[unit]
    const samples = s ? s.hits + s.misses : 0
    return {
      unit,
      kind,
      score: 1 - i * 0.1,
      errorRate: samples ? s!.misses / samples : 0,
      samples,
      avgMs: s && s.hits ? Math.round(s.ms / s.hits) : 0,
      weak: true,
    }
  })
}

/** Accuracy shown as a whole number that never rounds up past the gate (96.6 -> 96). */
export const gateAccuracy = (accuracy: number) => Math.floor(accuracy + 1e-9)

export const passesGate = (accuracy: number) => gateAccuracy(accuracy) >= GATE

/** One or two plain sentences under the drill result. */
export function gateNote(accuracy: number, passesInARow: number): string {
  const acc = gateAccuracy(accuracy)
  if (acc < GATE) return `Accuracy ${acc}%. Kees wants ${GATE} before speeding up.`
  if (passesInARow >= PASSES_TO_SPEED_UP) return `Accuracy ${acc}%. That is ${passesInARow} clean rounds in a row, so try the next one about 5% faster.`
  const left = PASSES_TO_SPEED_UP - passesInARow
  return `Accuracy ${acc}%. That clears ${GATE}. ${left} more like this and you can push the pace.`
}
