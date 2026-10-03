import { create } from 'zustand'
import type { Issue, Lang } from '@/types'
import { readPersonalWords, rememberPersonalWord } from './prefs'

/**
 * Adapter between the write feature and the checker (src/checker/index.ts).
 *
 * The checker is loaded lazily (Hunspell and the rule packs get their own chunk) and every call is
 * defensive: a checker that fails to load or throws never breaks the editor, it only shows up in
 * the status line. Members are optional so the editor keeps working while the API grows
 * (checkText with Hunspell + LanguageTool, or the synchronous rules-only checkRules).
 */

export interface CheckOptions {
  /** ask LanguageTool too (the checker only honours it when the user enabled it in settings) */
  languageTool?: boolean
  strictness?: 'normal' | 'strict'
  signal?: AbortSignal
}

interface CheckerModule {
  checkText?: (text: string, lang: Lang, opts?: CheckOptions) => Promise<Issue[]>
  checkRules?: (text: string, lang: Lang, opts?: { strictness?: 'normal' | 'strict' }) => Issue[]
  preloadLanguage?: (lang: Lang) => unknown
  addToPersonalDictionary?: (word: string, lang: Lang) => unknown
  languageToolStatus?: unknown
}

/* ------------------------------------------------------------------ */
/* Status shown in the side panel                                      */
/* ------------------------------------------------------------------ */

export type LtState = 'off' | 'idle' | 'checking' | 'ok' | 'offline' | 'limited' | 'blocked'

interface CheckerStatus {
  /** the checker could not be loaded at all */
  unavailable: boolean
  /** LanguageTool second opinion */
  lt: LtState
  /** the checker's own sentence for the current LanguageTool state */
  ltMessage: string
}

export const useCheckerStatus = create<CheckerStatus>()(() => ({ unavailable: false, lt: 'off', ltMessage: '' }))

/** Map the checker's LanguageTool status ({ state, message }) onto the states the panel knows. */
export function normalizeLt(v: unknown): { lt: LtState; ltMessage: string } {
  const o = v && typeof v === 'object' ? (v as Record<string, unknown>) : {}
  const s = String(typeof v === 'string' ? v : (o.state ?? o.status ?? '')).toLowerCase()
  const ltMessage = typeof o.message === 'string' ? o.message : ''
  let lt: LtState = 'ok'
  if (!s || s === 'off' || s === 'disabled') lt = 'off'
  else if (s === 'idle') lt = 'idle'
  else if (/limit|429|quota/.test(s)) lt = 'limited'
  else if (s === 'blocked' || /cors/.test(s)) lt = 'blocked'
  else if (/offline|error|fail|down|unreach/.test(s)) lt = 'offline'
  else if (/check|pending|busy|loading/.test(s)) lt = 'checking'
  return { lt, ltMessage }
}

function watchLtStatus(mod: CheckerModule) {
  const store = mod.languageToolStatus as { getState?: () => unknown; subscribe?: (l: (s: unknown) => void) => unknown } | undefined
  if (!store || typeof store.getState !== 'function') return
  useCheckerStatus.setState(normalizeLt(store.getState()))
  store.subscribe?.((s) => useCheckerStatus.setState(normalizeLt(s)))
}

/* ------------------------------------------------------------------ */
/* Loading                                                             */
/* ------------------------------------------------------------------ */

let loading: Promise<CheckerModule | null> | null = null

export function loadChecker(): Promise<CheckerModule | null> {
  if (!loading) {
    loading = import('@/checker')
      .then((m) => {
        const mod: CheckerModule = m
        const usable = typeof mod.checkText === 'function' || typeof mod.checkRules === 'function'
        if (usable) watchLtStatus(mod)
        useCheckerStatus.setState({ unavailable: !usable })
        return usable ? mod : null
      })
      .catch((err) => {
        if (import.meta.env.DEV) console.warn('[write] checker failed to load', err)
        useCheckerStatus.setState({ unavailable: true })
        loading = null // allow a retry on the next check
        return null
      })
  }
  return loading
}

/* ------------------------------------------------------------------ */
/* Calls                                                               */
/* ------------------------------------------------------------------ */

export async function preloadChecker(lang: Lang) {
  const mod = await loadChecker()
  try {
    await mod?.preloadLanguage?.(lang)
  } catch {
    /* preloading is an optimisation only */
  }
}

/** Check text. Never throws: returns null when the checker is missing, failed or was aborted. */
export async function runCheck(text: string, lang: Lang, opts: CheckOptions = {}): Promise<Issue[] | null> {
  const mod = await loadChecker()
  if (!mod) return null
  try {
    const issues = mod.checkText ? await mod.checkText(text, lang, opts) : mod.checkRules!(text, lang, { strictness: opts.strictness })
    return Array.isArray(issues) ? issues : []
  } catch (err) {
    if (!opts.signal?.aborted) console.warn('[write] check failed', err)
    return null
  }
}

/** Accept a word for good. Uses the checker's personal dictionary, with a local copy as a safety net. */
export async function addWordToDictionary(word: string, lang: Lang): Promise<void> {
  const mod = await loadChecker()
  try {
    if (mod?.addToPersonalDictionary) {
      await mod.addToPersonalDictionary(word, lang)
      return
    }
  } catch {
    /* fall through to the local copy */
  }
  rememberPersonalWord(lang, word)
}

/** Words accepted locally (only used when the checker has no personal dictionary). */
export const localPersonalWords = readPersonalWords

/** Rule titles ("d/t after hij/zij/het") for stats and the report. */
export async function ruleTitles(lang: Lang): Promise<Map<string, string>> {
  try {
    const { getRules } = await import('@/checker/rules')
    return new Map(getRules(lang).map((r) => [r.id, r.title]))
  } catch {
    return new Map()
  }
}
