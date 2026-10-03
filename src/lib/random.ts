/** Small seeded PRNG (mulberry32) so daily challenges are the same all day. */
export function seeded(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hashString(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function shuffle<T>(items: readonly T[], rand: () => number = Math.random): T[] {
  const a = items.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function pick<T>(items: readonly T[], rand: () => number = Math.random): T {
  return items[Math.floor(rand() * items.length)]
}

/** Pick n items, biased towards the start of the list (frequency-ranked lists). */
export function pickWeighted<T>(items: readonly T[], n: number, rand: () => number = Math.random, skew = 1.6): T[] {
  const out: T[] = []
  for (let i = 0; i < n; i++) out.push(items[Math.floor(Math.pow(rand(), skew) * items.length)])
  return out
}
