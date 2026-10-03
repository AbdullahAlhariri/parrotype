import type { Lang } from '@/types'
import type { DrillItem, DrillPack, Explained } from '@/content/drills'
import { hashString, shuffle } from '@/lib/random'
import { stripTashkeel } from '@/engine'

export const ROUND_SIZE = 15

/** Stable key for an item, so progress survives reordering the content. */
export const itemKey = (item: DrillItem) => hashString(item.sentence).toString(36)

const INVISIBLE = /[​-‏‪-‮⁦-⁩؜﻿]/g

export function normalizeAnswer(s: string, lang: Lang): string {
  const out = s.normalize('NFC').replace(INVISIBLE, '').replace(/[‘’ʼ`´]/g, "'").replace(/\s+/g, ' ').trim()
  return lang === 'ar' ? stripTashkeel(out) : out
}

/** Right answer or an accepted variant. Case is ignored: the gym trains the rule, not the capital. */
export function isRight(item: DrillItem, typed: string, lang: Lang): boolean {
  const t = normalizeAnswer(typed, lang).toLocaleLowerCase()
  if (!t) return false
  return [item.answer, ...(item.accept ?? [])].some((a) => normalizeAnswer(a, lang).toLocaleLowerCase() === t)
}

export interface ProgressLike {
  known?: string[]
  missed?: Record<string, number>
}

/**
 * Pick the items for one round: up to a third from what you missed before (most missed first),
 * then sentences you have not got right yet, then the rest. Shuffled, so nothing comes in blocks.
 */
export function pickRound(items: DrillItem[], progress: ProgressLike | undefined, n = ROUND_SIZE, rand: () => number = Math.random): DrillItem[] {
  const keyed = items.map((item) => ({ item, key: itemKey(item) }))
  const known = new Set(progress?.known ?? [])
  const missed = progress?.missed ?? {}
  const weak = shuffle(keyed.filter((k) => missed[k.key]), rand)
    .sort((a, b) => missed[b.key] - missed[a.key])
    .slice(0, Math.ceil(n / 3))
  const taken = new Set(weak.map((k) => k.key))
  const fresh = shuffle(keyed.filter((k) => !taken.has(k.key) && !known.has(k.key)), rand)
  const rest = shuffle(keyed.filter((k) => !taken.has(k.key) && known.has(k.key)), rand)
  return shuffle([...weak, ...fresh, ...rest].slice(0, Math.min(n, items.length)), rand).map((k) => k.item)
}

/** Up to three options for choose mode, the answer among them. Empty when the item has no wrong options. */
export function chooseOptions(item: DrillItem, rand: () => number = Math.random): string[] {
  const alts = item.alternatives ?? []
  if (!alts.length) return []
  return shuffle([item.answer, ...shuffle(alts, rand).slice(0, 2)], rand)
}

/** Share of a pack's sentences answered right first time, 0-1. */
export function mastery(pack: DrillPack, known: string[] | undefined): { known: number; total: number; share: number } {
  const keys = new Set(known ?? [])
  const k = pack.items.filter((i) => keys.has(itemKey(i))).length
  return { known: k, total: pack.items.length, share: pack.items.length ? k / pack.items.length : 0 }
}

/** Gap width in ch: never the answer's own length, or the gap would give it away. */
export function gapWidth(item: DrillItem, typed = ''): number {
  const longest = Math.max(item.answer.length, ...(item.alternatives ?? []).map((a) => a.length), ...(item.accept ?? []).map((a) => a.length))
  return Math.max(longest, typed.length) + 1
}

export interface ExplainedIn {
  text: string
  /** BCP-47-ish language of the text */
  lang: Lang
}

/** Pick the explanation in the language the user asked for, falling back to English. */
export function explain(e: Explained | undefined, packLang: Lang, explainIn: 'en' | 'local'): ExplainedIn | null {
  if (!e) return null
  if (explainIn === 'local' && e.local) return { text: e.local, lang: packLang }
  return { text: e.en, lang: 'en' }
}

export const formatClock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
