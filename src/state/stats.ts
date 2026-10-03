import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { KeyStat, Lang, RuleHitStat, SessionRecord, TypoKind, WordMissStat } from '@/types'
import { dayKey, uid } from '@/lib/id'

const MAX_SESSIONS = 1500
const MAX_WORDS = 600

type PerLang<T> = Record<Lang, T>
const perLang = <T,>(make: () => T): PerLang<T> => ({ nl: make(), en: make(), ar: make() })

interface StatsData {
  sessions: SessionRecord[]
  keys: PerLang<Record<string, KeyStat>>
  bigrams: PerLang<Record<string, KeyStat>>
  words: PerLang<Record<string, WordMissStat>>
  rules: PerLang<Record<string, RuleHitStat>>
  /** YYYY-MM-DD of days with at least one finished session */
  days: string[]
  /** best wpm per config key, e.g. "nl|time 30" */
  bests: Record<string, number>
}

interface StatsStore extends StatsData {
  /** Add a finished session. Returns the stored record (with id/at filled in). */
  addSession: (s: Omit<SessionRecord, 'id' | 'at'> & Partial<Pick<SessionRecord, 'id' | 'at'>>) => SessionRecord
  /** Merge per-key and per-bigram hit/miss counts from one run. */
  addKeyStats: (lang: Lang, keys: Record<string, KeyStat>, bigrams: Record<string, KeyStat>) => void
  /** Remember a word typed wrong. */
  addWordMiss: (lang: Lang, word: string, typed: string, kind?: TypoKind) => void
  /** Remember a grammar/spelling rule that fired on the user's text. */
  addRuleHit: (lang: Lang, ruleId: string, title: string, example: string) => void
  /** Update a personal best; returns true if it is a new best. */
  submitBest: (key: string, wpm: number) => boolean
  importData: (data: Partial<StatsData>) => void
  clear: () => void
}

const empty = (): StatsData => ({
  sessions: [],
  keys: perLang(() => ({})),
  bigrams: perLang(() => ({})),
  words: perLang(() => ({})),
  rules: perLang(() => ({})),
  days: [],
  bests: {},
})

const mergeKeyStats = (into: Record<string, KeyStat>, add: Record<string, KeyStat>) => {
  const out = { ...into }
  for (const [k, v] of Object.entries(add)) {
    const cur = out[k] ?? { hits: 0, misses: 0, ms: 0 }
    out[k] = { hits: cur.hits + v.hits, misses: cur.misses + v.misses, ms: cur.ms + v.ms }
  }
  return out
}

export const useStats = create<StatsStore>()(
  persist(
    (set, get) => ({
      ...empty(),
      addSession: (s) => {
        const rec: SessionRecord = { ...s, id: s.id ?? uid(), at: s.at ?? Date.now() }
        const today = dayKey(new Date(rec.at))
        set((st) => ({
          sessions: [...st.sessions, rec].slice(-MAX_SESSIONS),
          days: st.days.includes(today) ? st.days : [...st.days, today],
        }))
        return rec
      },
      addKeyStats: (lang, keys, bigrams) =>
        set((st) => ({
          keys: { ...st.keys, [lang]: mergeKeyStats(st.keys[lang], keys) },
          bigrams: { ...st.bigrams, [lang]: mergeKeyStats(st.bigrams[lang], bigrams) },
        })),
      addWordMiss: (lang, word, typed, kind) =>
        set((st) => {
          const key = word.toLowerCase()
          const cur = st.words[lang][key]
          const next: WordMissStat = {
            word,
            count: (cur?.count ?? 0) + 1,
            lastAt: Date.now(),
            typed: [typed, ...(cur?.typed ?? [])].slice(0, 5),
            kind: kind ?? cur?.kind,
          }
          let words = { ...st.words[lang], [key]: next }
          const entries = Object.entries(words)
          if (entries.length > MAX_WORDS) {
            entries.sort((a, b) => b[1].lastAt - a[1].lastAt)
            words = Object.fromEntries(entries.slice(0, MAX_WORDS))
          }
          return { words: { ...st.words, [lang]: words } }
        }),
      addRuleHit: (lang, ruleId, title, example) =>
        set((st) => {
          const cur = st.rules[lang][ruleId]
          const next: RuleHitStat = {
            ruleId,
            title,
            count: (cur?.count ?? 0) + 1,
            lastAt: Date.now(),
            examples: [example, ...(cur?.examples ?? []).filter((e) => e !== example)].slice(0, 5),
          }
          return { rules: { ...st.rules, [lang]: { ...st.rules[lang], [ruleId]: next } } }
        }),
      submitBest: (key, wpm) => {
        const prev = get().bests[key] ?? 0
        if (wpm <= prev) return false
        set((st) => ({ bests: { ...st.bests, [key]: wpm } }))
        return prev > 0
      },
      importData: (data) => set({ ...empty(), ...data }),
      clear: () => set(empty()),
    }),
    { name: 'parrotype.stats', version: 1 },
  ),
)

/** Consecutive practice days ending today (or yesterday, so the streak survives until midnight). */
export function currentStreak(days: string[], now = new Date()): number {
  const set = new Set(days)
  const d = new Date(now)
  if (!set.has(dayKey(d))) d.setDate(d.getDate() - 1)
  let n = 0
  while (set.has(dayKey(d))) {
    n++
    d.setDate(d.getDate() - 1)
  }
  return n
}
