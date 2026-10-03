import type { DictationLevel, DictationSentence, MinimalPair } from '@/content/dictation'
import { tokenize } from '@/engine/align'
import { shuffle } from '@/lib/random'
import { itemsFromPair, type DictationItem } from './items'

/** Lowercased words of a sentence, without punctuation. */
export function wordsOf(text: string): string[] {
  return tokenize(text)
    .filter((t) => !t.punct)
    .map((t) => t.text.toLowerCase())
}

export interface SelectOptions {
  level: DictationLevel
  /** focus tags; empty = any sentence */
  focus: readonly string[]
  count: number
  rand?: () => number
  /** ids seen recently: used only when the fresh ones run out */
  avoid?: ReadonlySet<string>
  /** lowercased words the user often misses; sentences with them come up more often */
  boost?: ReadonlySet<string>
  /** sentences to favour within a tier, e.g. the ones with a recorded voice */
  prefer?: (id: string) => boolean
}

/**
 * Pick `count` sentences. Order of preference: right level and focus, then the focus at a
 * neighbouring level, then the focus at any level, then the level without the focus, then
 * anything. Within a tier, preferred sentences (recorded) come first, then unseen ones, and
 * sentences containing words the user tends to miss are more likely. The result is shuffled.
 */
export function selectSentences(pool: readonly DictationSentence[], o: SelectOptions): DictationSentence[] {
  const rand = o.rand ?? Math.random
  const focus = new Set(o.focus)
  const hasFocus = focus.size > 0
  const tier = (s: DictationSentence) => {
    const focusHit = !hasFocus || s.focus.some((f) => focus.has(f))
    const dl = Math.abs(s.level - o.level)
    if (focusHit && dl === 0) return 0
    if (focusHit && dl === 1) return 1
    if (focusHit) return 2
    if (dl === 0) return 3
    return 4 + dl
  }
  const weight = (s: DictationSentence) => {
    let w = 1
    if (hasFocus && focus.has(s.focus[0])) w *= 2 // the main trap matches
    if (o.boost?.size) w *= 1 + 2 * wordsOf(s.text).filter((x) => o.boost!.has(x)).length
    return w
  }
  const ranked = pool.map((s) => ({
    s,
    tier: tier(s),
    seen: o.avoid?.has(s.id) ? 1 : 0,
    unpreferred: o.prefer && !o.prefer(s.id) ? 1 : 0,
    // Efraimidis-Spirakis: weighted random order
    key: Math.pow(rand() || Number.EPSILON, 1 / weight(s)),
  }))
  ranked.sort((a, b) => a.tier - b.tier || a.unpreferred - b.unpreferred || a.seen - b.seen || b.key - a.key)
  return shuffle(
    ranked.slice(0, Math.max(0, o.count)).map((r) => r.s),
    rand,
  )
}

/**
 * Sentences that contain any of `words` (case-insensitive), most matches first. Used by
 * "Practise these words": new sentences first, the ones just missed (`seen`) after.
 */
export function selectForWords(
  pool: readonly DictationSentence[],
  words: readonly string[],
  count: number,
  seen: ReadonlySet<string> = new Set(),
  rand: () => number = Math.random,
): DictationSentence[] {
  const want = new Set(words.flatMap((w) => wordsOf(w)))
  const hits = pool
    .map((s) => ({ s, n: wordsOf(s.text).filter((w) => want.has(w)).length, seen: seen.has(s.id) ? 1 : 0, r: rand() }))
    .filter((x) => x.n > 0)
  hits.sort((a, b) => a.seen - b.seen || b.n - a.n || a.r - b.r)
  return hits.slice(0, count).map((x) => x.s)
}

/**
 * Minimal-pair items from the chosen sets (all sets when `ids` is empty), spread evenly over
 * the sets and over the members of each set, so a 10-item run is never nine times "wordt".
 * `prefer` (by clip id, e.g. "has a recording") puts those items first in line.
 */
export function selectPairItems(
  pairs: readonly MinimalPair[],
  ids: readonly string[],
  count: number,
  rand: () => number = Math.random,
  prefer?: (clip: string) => boolean,
): DictationItem[] {
  const chosen = ids.length ? pairs.filter((p) => ids.includes(p.id)) : pairs
  // one shuffled queue per (set, member)
  const queues = shuffle(
    chosen.flatMap((p) => {
      const items = shuffle(itemsFromPair(p), rand)
      return p.words.map((w) => items.filter((it) => it.target?.toLowerCase() === w.toLowerCase()))
    }),
    rand,
  ).filter((q) => q.length)
  // round robin over the queues gives a balanced order of every sentence once
  const balanced: DictationItem[] = []
  const longest = Math.max(0, ...queues.map((q) => q.length))
  for (let r = 0; r < longest; r++) for (const q of queues) if (q[r]) balanced.push(q[r])
  const once = prefer ? [...balanced.filter((it) => prefer(it.clip)), ...balanced.filter((it) => !prefer(it.clip))] : balanced
  if (!once.length) return []
  const out: DictationItem[] = []
  while (out.length < count) out.push(...once.slice(0, count - out.length))
  return shuffle(out, rand)
}
