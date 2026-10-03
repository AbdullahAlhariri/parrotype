import type { Lang } from '@/types'
import { uid } from '@/lib/id'

export const DRAFTS_KEY = 'parrotype.drafts'
export const MAX_DRAFTS = 10

export interface Draft {
  id: string
  lang: Lang
  text: string
  promptId?: string
  createdAt: number
  updatedAt: number
  /** time spent actually writing, in ms */
  activeMs: number
  /** issues the user dismissed: `${ruleId}|${text}` */
  ignored: string[]
  /** set once the user finished it and saw the report */
  finished?: boolean
}

type DraftMap = Partial<Record<Lang, Draft[]>>

/** Storage that can be swapped in tests. Every call is wrapped: private windows may throw. */
export interface KV {
  getItem(k: string): string | null
  setItem(k: string, v: string): void
}

const defaultKV = (): KV | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

export function readAll(kv: KV | null = defaultKV()): DraftMap {
  if (!kv) return {}
  try {
    const raw = kv.getItem(DRAFTS_KEY)
    const parsed = raw ? (JSON.parse(raw) as unknown) : {}
    return parsed && typeof parsed === 'object' ? (parsed as DraftMap) : {}
  } catch {
    return {}
  }
}

function writeAll(map: DraftMap, kv: KV | null): boolean {
  if (!kv) return false
  try {
    kv.setItem(DRAFTS_KEY, JSON.stringify(map))
    return true
  } catch {
    return false
  }
}

/** Drafts for one language, newest first. */
export function listDrafts(lang: Lang, kv: KV | null = defaultKV()): Draft[] {
  return [...(readAll(kv)[lang] ?? [])].filter((d) => d && typeof d.text === 'string').sort((a, b) => b.updatedAt - a.updatedAt)
}

export function newDraft(lang: Lang, promptId?: string, now = Date.now()): Draft {
  return { id: uid(), lang, text: '', promptId, createdAt: now, updatedAt: now, activeMs: 0, ignored: [] }
}

/** Insert or update a draft; keeps the newest MAX_DRAFTS per language. Empty drafts are not stored. */
export function saveDraft(d: Draft, kv: KV | null = defaultKV()): boolean {
  const map = readAll(kv)
  const others = (map[d.lang] ?? []).filter((x) => x.id !== d.id)
  const list = d.text.trim() ? [d, ...others] : others
  map[d.lang] = list.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_DRAFTS)
  return writeAll(map, kv)
}

export function deleteDraft(lang: Lang, id: string, kv: KV | null = defaultKV()): boolean {
  const map = readAll(kv)
  map[lang] = (map[lang] ?? []).filter((x) => x.id !== id)
  return writeAll(map, kv)
}

/** First words of a draft for the menu. */
export function draftTitle(d: Pick<Draft, 'text'>, max = 48): string {
  const line = d.text.trim().split('\n')[0].replace(/\s+/g, ' ')
  if (line.length <= max) return line || 'Empty draft'
  return line.slice(0, max).replace(/\s+\S*$/, '').replace(/[\s.,;:!?…]+$/, '') + '…'
}

/** "just now", "12 min ago", "today 14:02", "3 Oct" */
export function draftWhen(at: number, now = Date.now()): string {
  const diff = now - at
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`
  const d = new Date(at)
  const n = new Date(now)
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  if (d.toDateString() === n.toDateString()) return `today ${time}`
  const y = new Date(n)
  y.setDate(n.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return `yesterday ${time}`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
