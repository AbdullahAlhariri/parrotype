import { useEffect, useMemo, useState } from 'react'
import type { Issue, Lang } from '@/types'
import { getSettings, useSettings } from '@/state/settings'
import {
  abortError,
  useDictionaryStatus,
  usePersonalStore,
  workerCheck,
  workerIsWord,
  workerPreload,
  workerSuggest,
} from './client'
import { checkWithLanguageTool } from './languagetool'
import { mergeIssues, remapIssues } from './merge'
import type { CheckResult } from './worker'

// The one public checking API. Free writing, dictation and proofreading call these.
//
//   const issues = await checkText(text, 'nl', { signal })
//   const fixes = await suggest('eigelijk', 'nl')      // ['eigenlijk', ...]
//
// Spelling (Hunspell) and the rule packs run in a worker; LanguageTool is added only when the
// user switched it on in settings. Aborted calls reject with a DOMException named 'AbortError'.

export interface CheckOptions {
  /** 'strict' also runs style-level rules */
  strictness?: 'normal' | 'strict'
  /**
   * Ask LanguageTool too. Defaults to the user's setting; false skips it for this call.
   * true never overrides the setting: text only leaves the device when the user opted in.
   */
  languageTool?: boolean
  signal?: AbortSignal
}

/* recent local results, so the LanguageTool pass of the same text does not redo the local work */
const memo = new Map<string, CheckResult>()

async function localCheck(text: string, lang: Lang, strictness: 'normal' | 'strict', signal?: AbortSignal, dictWaitMs?: number) {
  const key = [lang, strictness, getSettings().englishVariant, usePersonalStore.getState().version, text].join('\u0000')
  const hit = memo.get(key)
  if (hit) return hit
  const r = await workerCheck(text, lang, strictness, signal, dictWaitMs)
  if (r.spell) {
    memo.set(key, r)
    if (memo.size > 8) memo.delete(memo.keys().next().value!)
  }
  return r
}

/** Spelling + grammar issues in `text`, sorted by offset, never overlapping. */
export function checkText(text: string, lang: Lang, opts: CheckOptions = {}): Promise<Issue[]> {
  return check(text, lang, { strictness: opts.strictness, languageTool: opts.languageTool, signal: opts.signal })
}

/** checkText, plus how long to wait for a dictionary that is still downloading (see useChecker) */
async function check(text: string, lang: Lang, opts: CheckOptions & { dictWaitMs?: number }): Promise<Issue[]> {
  const { strictness = 'normal', signal } = opts
  if (signal?.aborted) throw abortError()
  if (!text.trim()) return []
  const local = await localCheck(text, lang, strictness, signal, opts.dictWaitMs)
  if (opts.languageTool === false || !getSettings().languageTool) return local.issues
  const lt = await checkWithLanguageTool(text, lang, signal)
  if (signal?.aborted) throw abortError()
  return lt ? mergeIssues(local.issues, lt, { localSpell: local.spell }) : local.issues
}

/** Ranked corrections for one word, best first (cased like the input). */
export function suggest(word: string, lang: Lang): Promise<string[]> {
  return workerSuggest(word, lang)
}

/** Is this a word (dictionary or personal dictionary)? True when no dictionary could be loaded. */
export function isWord(word: string, lang: Lang): Promise<boolean> {
  return workerIsWord(word, lang)
}

/** Start downloading a language's dictionary in the background (call on page mount). */
export function preloadLanguage(lang: Lang): void {
  workerPreload(lang)
}

export {
  addToPersonalDictionary,
  getPersonalDictionary,
  removeFromPersonalDictionary,
  usePersonalDictionary,
  useDictionaryStatus,
  type PersonalDictionary,
} from './client'
export {
  languageToolStatus,
  useLanguageToolStatus,
  testLanguageTool,
  type LanguageToolState,
  type LanguageToolStatus,
} from './languagetool'
export { remapIssues } from './merge'
export { applyReplacement } from './engine'

/* ------------------------------------------------------------------ */
/* React hook                                                          */
/* ------------------------------------------------------------------ */

export interface UseCheckerOptions {
  strictness?: 'normal' | 'strict'
  /** ms after the last change before the local check (default 250) */
  delay?: number
  /** ms after the last change before asking LanguageTool, when it is on (default 1500) */
  ltDelay?: number
  /** false pauses checking (results are kept) */
  enabled?: boolean
}

export interface CheckerState {
  /** issues positioned on the current text; ones the user is editing are dropped until the next check */
  issues: Issue[]
  /** a check is waiting or running */
  checking: boolean
  /** the text the last results were computed for */
  checkedText: string
}

const isAbort = (e: unknown) => e instanceof DOMException && e.name === 'AbortError'

/** before the dictionary has arrived, show the rule issues after this long and check again once it is there */
const QUICK_DICT_WAIT_MS = 400

/**
 * Debounced checking for an editor: local checks shortly after typing stops, LanguageTool
 * (if enabled) after a longer pause. Re-checks when the personal dictionary changes.
 * While a dictionary is still downloading, the rule issues show first and spelling follows.
 */
export function useChecker(text: string, lang: Lang, opts: UseCheckerOptions = {}): CheckerState {
  const { strictness = 'normal', delay = 250, ltDelay = 1500, enabled = true } = opts
  const lt = useSettings((s) => s.languageTool)
  const variant = useSettings((s) => s.englishVariant)
  const version = usePersonalStore((s) => s.version)
  // re-check once the dictionary arrives, in case the first pass ran on the rules alone
  const dictReady = useDictionaryStatus((s) => s[lang === 'en' ? variant : lang] === 'ready')
  const [result, setResult] = useState<{ text: string; issues: Issue[] }>({ text: '', issues: [] })
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    preloadLanguage(lang)
  }, [lang, variant])

  useEffect(() => {
    if (!enabled) {
      setChecking(false)
      return
    }
    if (!text.trim()) {
      setResult({ text, issues: [] })
      setChecking(false)
      return
    }
    const ac = new AbortController()
    let ltDone = false
    setChecking(true)
    const run = (withLt: boolean, last: boolean) => async () => {
      try {
        const issues = await check(text, lang, {
          strictness,
          languageTool: withLt,
          signal: ac.signal,
          dictWaitMs: dictReady ? undefined : QUICK_DICT_WAIT_MS,
        })
        if (!withLt && ltDone) return // a slow local pass must not overwrite the merged result
        ltDone ||= withLt
        setResult({ text, issues })
        if (last) setChecking(false)
      } catch (e) {
        if (!isAbort(e)) setChecking(false)
      }
    }
    const t1 = setTimeout(run(false, !lt), delay)
    const t2 = lt ? setTimeout(run(true, true), Math.max(delay, ltDelay)) : undefined
    return () => {
      ac.abort()
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [text, lang, strictness, enabled, lt, variant, version, dictReady, delay, ltDelay])

  const issues = useMemo(() => remapIssues(result.issues, result.text, text), [result, text])
  return { issues, checking, checkedText: result.text }
}
