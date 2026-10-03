import type { KeyEvent, KeyStat, Lang } from '@/types'
import { bigramClass, layoutFor, type BigramClass, type LayoutId } from './keyboard'
import { Replayer, opOf } from './replay'
import { isLetter } from './text'

// Per-key and per-bigram stats from a keystroke log, and weakness scores over the
// cumulative counts kept in the stats store (hits/misses/ms, no timestamps).

export interface KeyStatsResult {
  keys: Record<string, KeyStat>
  bigrams: Record<string, KeyStat>
}

/** Intervals outside this window are pauses or rollover noise; they get the session mean instead. */
const MIN_IKI = 40
const MAX_IKI = 2000

/**
 * Count only the FIRST attempt at each target position, and only while everything before
 * it in the word was typed right (after an uncorrected slip the letters are misaligned and
 * would blame the wrong keys). `hits` = correct first attempts, `misses` = wrong ones,
 * `ms` = summed interval from the previous keystroke for correct hits, so ms / hits is the
 * mean latency. Keys are lowercased; spaces are not keys here; bigrams are letter pairs.
 */
export function keyStatsFromEvents(events: readonly KeyEvent[]): KeyStatsResult {
  const rep = new Replayer()
  const seen = new Set<string>()
  const expectedAt = new Map<string, string>()
  const samples: { key: string; bigram?: string; correct: boolean; iki: number | null }[] = []
  let prevT: number | null = null

  for (const ev of events) {
    const iki = prevT === null ? null : ev.t - prevT
    prevT = ev.t
    const op = opOf(ev)
    const pos = `${ev.wordIndex}:${ev.charIndex}`
    if ((op === 'insert' || op === 'blocked' || op === 'commit') && ev.expected && !seen.has(pos)) {
      seen.add(pos)
      const key = ev.expected.toLowerCase()
      expectedAt.set(pos, key)
      if (key !== ' ' && rep.cleanPrefix(ev.wordIndex, ev.charIndex)) {
        const prev = ev.charIndex > 0 ? expectedAt.get(`${ev.wordIndex}:${ev.charIndex - 1}`) : undefined
        samples.push({
          key,
          bigram: prev && isLetter(prev) && isLetter(key) ? prev + key : undefined,
          correct: ev.correct,
          iki: iki !== null && iki >= MIN_IKI && iki <= MAX_IKI ? Math.round(iki) : null,
        })
      }
    }
    rep.apply(ev)
  }

  const valid = samples.filter((s) => s.correct && s.iki !== null).map((s) => s.iki as number)
  const meanIki = valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : 0
  const keys: Record<string, KeyStat> = {}
  const bigrams: Record<string, KeyStat> = {}
  const add = (into: Record<string, KeyStat>, unit: string, s: (typeof samples)[number]) => {
    const st = (into[unit] ??= { hits: 0, misses: 0, ms: 0 })
    if (s.correct) {
      st.hits++
      st.ms += s.iki ?? meanIki
    } else st.misses++
  }
  for (const s of samples) {
    add(keys, s.key, s)
    if (s.bigram) add(bigrams, s.bigram, s)
  }
  return { keys, bigrams }
}

/* ------------------------------------------------------------------ */
/* Weakness scoring                                                     */
/* ------------------------------------------------------------------ */

export interface Weakness {
  /** a key ('d') or a bigram ('ij') */
  unit: string
  kind: 'key' | 'bigram'
  /** priority, higher = practise first */
  score: number
  /** observed miss rate, 0-1 */
  errorRate: number
  /** attempts (hits + misses) */
  samples: number
  /** mean ms per correct press (0 = unknown) */
  avgMs: number
  /** statistically confident weakness (passed the Wilson gate or is clearly slow); always set by weaknesses() */
  weak?: boolean
}

export interface WeaknessOptions {
  lang?: Lang
  layout?: LayoutId
  /** target error rate (default 0.03 = 97% accuracy) */
  errTarget?: number
  /** attempts needed before a key can be called weak (default 20) */
  minKeySamples?: number
  /** attempts needed before a bigram can be called weak (default 8) */
  minBigramSamples?: number
  /** return every unit (with `weak` flags) instead of only the weak ones */
  all?: boolean
}

/** Wilson score lower bound (95%) for a rate of e out of n. */
export function wilsonLower(e: number, n: number, z = 1.96): number {
  if (n <= 0) return 0
  const p = e / n
  const z2 = z * z
  return (p + z2 / (2 * n) - z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / (1 + z2 / n)
}

/** Expected latency ratios by bigram type (Gentner): two hands are fastest. */
const CLASS_RATIO: Record<BigramClass, number> = { alt: 1, sameHand: 1.15, sameFingerRepeat: 1.38, sameFingerReach: 1.65 }

const median = (xs: number[]) => {
  if (!xs.length) return 0
  const s = xs.slice().sort((a, b) => a - b)
  const mid = s.length >> 1
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

function score(stats: Record<string, KeyStat>, kind: 'key' | 'bigram', o: WeaknessOptions, layout: LayoutId): Weakness[] {
  const entries = Object.entries(stats).filter(([, s]) => s.hits + s.misses > 0)
  if (!entries.length) return []
  const errTarget = o.errTarget ?? 0.03
  const minN = kind === 'key' ? (o.minKeySamples ?? 20) : (o.minBigramSamples ?? 8)
  const prior = kind === 'key' ? 10 : 5
  let totalN = 0
  let totalE = 0
  let maxN = 0
  for (const [, s] of entries) {
    totalN += s.hits + s.misses
    totalE += s.misses
    maxN = Math.max(maxN, s.hits + s.misses)
  }
  const p0 = totalE / totalN
  // weak = clearly worse than the target AND than this user's own average
  const gate = Math.max(errTarget, p0)
  const ratio = (unit: string) => (kind === 'bigram' ? CLASS_RATIO[bigramClass(unit[0], unit.slice(1), layout)] : 1)
  const base = median(entries.filter(([, s]) => s.hits >= 3 && s.ms > 0).map(([u, s]) => s.ms / s.hits / ratio(u)))

  return entries.map(([unit, s]) => {
    const n = s.hits + s.misses
    const avgMs = s.hits ? s.ms / s.hits : 0
    const shrunk = (s.misses + prior * p0) / (n + prior)
    // smooth saturation keeps very error-prone keys apart instead of capping them all at 1
    const errN = 1 - Math.exp(-shrunk / (2 * errTarget))
    const expected = base * ratio(unit)
    const slow = expected && avgMs && s.hits >= 3 ? Math.min(Math.max((avgMs / expected - 1) / 0.5, 0), 1) : 0
    const weakness = 0.7 * errN + 0.3 * slow
    const freq = n / maxN
    const weak = n >= minN && (wilsonLower(s.misses, n) > gate || (slow >= 1 && s.hits >= 2 * minN))
    return {
      unit,
      kind,
      score: Math.round(weakness * (0.5 + 0.5 * Math.sqrt(freq)) * 1000) / 1000,
      errorRate: s.misses / n,
      samples: n,
      avgMs: Math.round(avgMs),
      weak,
    }
  })
}

/**
 * Rank keys and bigrams by weakness: Bayesian-shrunk error rate (pulled towards the user's
 * overall rate when samples are few), a latency term normalised by bigram type, and a
 * frequency weight. By default only units that pass the confidence gate are returned.
 */
export function weaknesses(keys: Record<string, KeyStat>, bigrams: Record<string, KeyStat>, opts: WeaknessOptions = {}): Weakness[] {
  const layout = opts.layout ?? layoutFor(opts.lang ?? 'nl')
  const all = [...score(keys, 'key', opts, layout), ...score(bigrams, 'bigram', opts, layout)]
  return all.filter((w) => opts.all || w.weak).sort((a, b) => b.score - a.score || b.samples - a.samples)
}
