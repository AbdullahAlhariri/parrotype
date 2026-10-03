import type { WordAttempt, WordMissStat } from '@/types'

// Word repair: each problem word three times in a mixed line, then once more between common words.

export const MAX_REPAIR_WORDS = 10

/** Clean a ?words= value: split on commas, trim, drop empties and case-insensitive duplicates, cap the count. */
export function parseWordsParam(raw: string | null | undefined, max = MAX_REPAIR_WORDS): string[] {
  if (!raw) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const part of raw.split(',')) {
    const w = part.trim().replace(/\s+/g, ' ')
    if (!w || w.includes(' ')) continue
    const key = w.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(w)
    if (out.length >= max) break
  }
  return out
}

/** The query string for /practice?words=... */
export const repairHref = (words: string[]) => `/practice?words=${encodeURIComponent(words.join(','))}`

/**
 * Every word `reps` times, in random order, never the same word twice in a row (unless there is
 * only one word). Greedy with a feasibility check, weighted by how many copies are left.
 */
export function buildRepairLine(words: string[], rand: () => number = Math.random, reps = 3): string[] {
  const uniq = [...new Set(words)]
  if (uniq.length <= 1) return uniq.flatMap((w) => Array<string>(reps).fill(w))
  const left = new Map(uniq.map((w) => [w, reps]))
  const out: string[] = []
  let n = uniq.length * reps
  while (n > 0) {
    const prev = out[out.length - 1]
    const rest = n - 1
    const ok = [...left].filter(([w, c]) => {
      if (c === 0 || w === prev) return false
      if (c - 1 > Math.floor(rest / 2)) return false
      for (const [y, cy] of left) if (y !== w && cy > Math.ceil(rest / 2)) return false
      return true
    })
    const pool = ok.length ? ok : [...left].filter(([w, c]) => c > 0 && w !== prev)
    const total = pool.reduce((a, [, c]) => a + c, 0)
    let r = rand() * total
    let pick = pool[pool.length - 1][0]
    for (const [w, c] of pool) {
      if ((r -= c) < 0) {
        pick = w
        break
      }
    }
    out.push(pick)
    left.set(pick, (left.get(pick) ?? 1) - 1)
    n--
  }
  return out
}

/**
 * A short line where each target appears once, with one or two common words before it and
 * one common word at the end: "en wordt het ook gebeurt dat".
 */
export function buildContextLine(words: string[], common: string[], rand: () => number = Math.random): string[] {
  const targets = shuffleCopy([...new Set(words)], rand)
  const lower = new Set(targets.map((w) => w.toLowerCase()))
  const pool = common.filter((w) => !lower.has(w.toLowerCase()))
  if (!pool.length) return targets
  const out: string[] = []
  const filler = () => {
    let w = pool[Math.floor(rand() * pool.length)]
    for (let i = 0; i < 8 && pool.length > 2 && (w === out[out.length - 1] || w === out[out.length - 2]); i++) {
      w = pool[Math.floor(rand() * pool.length)]
    }
    out.push(w)
  }
  for (const t of targets) {
    filler()
    if (rand() < 0.5) filler()
    out.push(t)
  }
  filler()
  return out
}

export interface RepairTally {
  word: string
  /** attempts typed right first time (never wrong while typing) */
  clean: number
  total: number
}

/** How many times each target was typed cleanly in a finished run. */
export function repairTally(targets: string[], attempts: WordAttempt[]): RepairTally[] {
  return targets.map((word) => {
    const mine = attempts.filter((a) => a.expected === word && a.typed !== '')
    return { word, clean: mine.filter((a) => a.correct && !a.everWrong).length, total: mine.length }
  })
}

/** Most-missed words first (count, then recency). */
export function mostMissed(words: Record<string, WordMissStat>, n = 8): WordMissStat[] {
  return Object.values(words)
    .filter((w) => w.word && !/\s/.test(w.word))
    .sort((a, b) => b.count - a.count || b.lastAt - a.lastAt)
    .slice(0, n)
}

function shuffleCopy<T>(items: T[], rand: () => number): T[] {
  const a = items.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
