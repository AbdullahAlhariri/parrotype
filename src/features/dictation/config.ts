import type { Lang } from '@/types'
import { DEFAULT_CONFIG, type DictationConfig } from './logic/items'

// Per-viewer conveniences in localStorage: the last setup per language and recently seen
// sentence ids (so a new set does not repeat the last one). Everything works without them.

const CONFIG_KEY = 'parrotype.dictation.config'
const RECENT_KEY = 'parrotype.dictation.recent'
const RECENT_MAX = 40

function read<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : undefined
  } catch {
    return undefined
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* private mode or blocked storage: fine */
  }
}

const LENGTHS = [5, 10, 20] as const

function sanitise(c: Partial<DictationConfig> | undefined): DictationConfig {
  const out = { ...DEFAULT_CONFIG, ...c }
  if (out.mode !== 'pairs') out.mode = 'sentences'
  if (![1, 2, 3].includes(out.level)) out.level = DEFAULT_CONFIG.level
  if (!LENGTHS.includes(out.length)) out.length = DEFAULT_CONFIG.length
  if (out.playback !== 'memory') out.playback = 'listen'
  out.focus = Array.isArray(out.focus) ? out.focus.filter((f) => typeof f === 'string') : []
  out.pairs = Array.isArray(out.pairs) ? out.pairs.filter((f) => typeof f === 'string') : []
  return out
}

export function loadConfig(lang: Lang): DictationConfig {
  return sanitise(read<Partial<Record<Lang, DictationConfig>>>(CONFIG_KEY)?.[lang])
}

/**
 * Deep links from other pages: /listen?focus=dt,participle&level=2 or
 * /listen?mode=pairs&pairs=word-wordt&length=5. Unknown values fall back to the saved setup.
 */
export function configFromQuery(base: DictationConfig, q: URLSearchParams): DictationConfig | null {
  const keys = ['mode', 'level', 'focus', 'pairs', 'length', 'playback']
  if (!keys.some((k) => q.has(k))) return null
  const list = (k: string) => (q.get(k) ?? '').split(',').map((x) => x.trim()).filter(Boolean)
  const next: Partial<DictationConfig> = { ...base }
  if (q.has('mode')) next.mode = q.get('mode') as DictationConfig['mode']
  if (q.has('level')) next.level = Number(q.get('level')) as DictationConfig['level']
  if (q.has('length')) next.length = Number(q.get('length')) as DictationConfig['length']
  if (q.has('playback')) next.playback = q.get('playback') as DictationConfig['playback']
  if (q.has('focus')) next.focus = list('focus')
  if (q.has('pairs')) next.pairs = list('pairs')
  if (q.has('pairs') && !q.has('mode')) next.mode = 'pairs'
  return sanitise(next)
}

export function saveConfig(lang: Lang, c: DictationConfig) {
  const all = read<Partial<Record<Lang, DictationConfig>>>(CONFIG_KEY) ?? {}
  write(CONFIG_KEY, { ...all, [lang]: c })
}

export function loadRecent(lang: Lang): Set<string> {
  return new Set(read<Partial<Record<Lang, string[]>>>(RECENT_KEY)?.[lang] ?? [])
}

export function pushRecent(lang: Lang, ids: string[]) {
  const all = read<Partial<Record<Lang, string[]>>>(RECENT_KEY) ?? {}
  const next = [...ids, ...(all[lang] ?? []).filter((id) => !ids.includes(id))].slice(0, RECENT_MAX)
  write(RECENT_KEY, { ...all, [lang]: next })
}
