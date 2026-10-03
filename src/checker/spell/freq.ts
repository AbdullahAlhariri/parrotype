import { toLookup } from './text'

/** word (lowercase lookup form) -> rank, 0 = most frequent */
export type FreqRanks = ReadonlyMap<string, number>

/** Parse a frequency list: one word per line, most frequent first. */
export function parseFreqList(text: string): Map<string, number> {
  const out = new Map<string, number>()
  let rank = 0
  for (const line of text.split('\n')) {
    const w = toLookup(line.trim()).toLowerCase()
    if (!w || out.has(w)) continue
    out.set(w, rank++)
  }
  return out
}

/** 0 for the most common words, rising slowly to 0.9 for dictionary words outside the list. */
export function freqPenalty(rank: number | undefined): number {
  if (rank === undefined) return 0.9
  return Math.min(0.85, 0.18 * Math.log10(rank + 1))
}
