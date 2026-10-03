/**
 * Command palette matching, after Monkeytype's filter: the query is split into words and every
 * query word must match the START of a different word of the command (group, label or keywords).
 * Results are ranked by how much of the command the query covers, with a bonus for matching
 * in order and for matching the label rather than the group.
 */

const MARKS = /[̀-ͯ]/g

export function words(text: string): string[] {
  return text
    .normalize('NFD')
    .replace(MARKS, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
}

export interface MatchTarget {
  group: string
  label: string
  keywords?: string
}

/** Returns a score (higher is better) or null when the query does not match. */
export function matchScore(query: string, target: MatchTarget): number | null {
  const q = words(query.replace(/^>/, ''))
  if (q.length === 0) return 0
  const groupWords = words(target.group)
  const labelWords = words(target.label)
  const extra = words(target.keywords ?? '')
  const pool = [
    ...groupWords.map((w) => ({ w, weight: 1 })),
    ...labelWords.map((w) => ({ w, weight: 1.5 })),
    ...extra.map((w) => ({ w, weight: 0.8 })),
  ]
  const used = new Set<number>()
  let score = 0
  let lastIndex = -1
  for (const part of q) {
    // prefer the earliest unused word that matches exactly, then the earliest prefix match
    let best = -1
    for (let i = 0; i < pool.length; i++) {
      if (used.has(i) || !pool[i].w.startsWith(part)) continue
      if (pool[i].w === part) {
        best = i
        break
      }
      if (best === -1) best = i
    }
    if (best === -1) return null
    used.add(best)
    const { w, weight } = pool[best]
    score += (part.length / w.length) * weight + part.length * 0.05
    if (best > lastIndex) score += 0.1
    lastIndex = best
  }
  return score
}

/** Filter and rank. Stable for equal scores, so the default order wins ties. */
export function rank<T extends MatchTarget>(query: string, items: T[]): T[] {
  if (!words(query).length) return items
  return items
    .map((item, i) => ({ item, i, s: matchScore(query, item) }))
    .filter((x): x is { item: T; i: number; s: number } => x.s !== null)
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.item)
}
