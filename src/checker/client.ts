import { create } from 'zustand'
import type { Lang } from '@/types'
import { LANGS } from '@/types'
import { getSettings } from '@/state/settings'
import { combineLocal } from './merge'
import type { CheckResult, WorkerRequest, WorkerResponse } from './worker'
import type { DictId, DictState } from './spell/core'

// Main-thread side of the checker: one shared worker, request ids, a promise per request,
// AbortSignal support, and a rules-only fallback on the main thread if the worker or WASM fails.

/* ------------------------------------------------------------------ */
/* Personal dictionary (localStorage 'parrotype.dict')                 */
/* ------------------------------------------------------------------ */

export type PersonalDictionary = Record<Lang, string[]>

const DICT_KEY = 'parrotype.dict'
const emptyDict = (): PersonalDictionary => ({ nl: [], en: [], ar: [] })

function readDict(): PersonalDictionary {
  const out = emptyDict()
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(DICT_KEY)
    const parsed = raw ? (JSON.parse(raw) as Partial<Record<string, unknown>>) : null
    if (parsed && typeof parsed === 'object') {
      for (const l of LANGS) {
        const v = parsed[l]
        if (Array.isArray(v)) out[l] = v.filter((w): w is string => typeof w === 'string' && !!w.trim())
      }
    }
  } catch {
    // unreadable or blocked storage: start empty
  }
  return out
}

function writeDict(d: PersonalDictionary) {
  try {
    localStorage.setItem(DICT_KEY, JSON.stringify(d))
  } catch {
    // private mode / quota: keep the in-memory copy
  }
}

interface PersonalStore {
  words: PersonalDictionary
  /** bumps on every change, so checks can be re-run */
  version: number
}

export const usePersonalStore = create<PersonalStore>(() => ({ words: readDict(), version: 0 }))

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === DICT_KEY) usePersonalStore.setState((s) => ({ words: readDict(), version: s.version + 1 }))
  })
}

/** trim, NFC, straight apostrophe, no surrounding punctuation */
export const cleanWord = (w: string) =>
  w
    .normalize('NFC')
    .replace(/[’ʼ]/g, "'")
    .trim()
    .replace(/^[^\p{L}\p{N}']+|[^\p{L}\p{N}]+$/gu, '')

function updateDict(lang: Lang, fn: (words: string[]) => string[]) {
  const s = usePersonalStore.getState()
  const next = { ...s.words, [lang]: fn(s.words[lang]) }
  writeDict(next)
  usePersonalStore.setState({ words: next, version: s.version + 1 })
}

export function addToPersonalDictionary(word: string, lang: Lang): void {
  const w = cleanWord(word)
  if (!w) return
  updateDict(lang, (ws) => (ws.includes(w) ? ws : [...ws, w].sort((a, b) => a.localeCompare(b, lang))))
}

export function removeFromPersonalDictionary(word: string, lang: Lang): void {
  const w = cleanWord(word)
  updateDict(lang, (ws) => ws.filter((x) => x !== w && x !== word))
}

export function getPersonalDictionary(lang: Lang): string[] {
  return usePersonalStore.getState().words[lang]
}

/** React: the personal word list for a language */
export const usePersonalDictionary = (lang: Lang) => usePersonalStore((s) => s.words[lang])

/* ------------------------------------------------------------------ */
/* Dictionary loading status (for "loading the Dutch dictionary")      */
/* ------------------------------------------------------------------ */

export const useDictionaryStatus = create<Record<DictId, DictState>>(() => ({
  nl: 'idle',
  'en-US': 'idle',
  'en-GB': 'idle',
  ar: 'idle',
}))

/* ------------------------------------------------------------------ */
/* Worker plumbing                                                     */
/* ------------------------------------------------------------------ */

type Payload = WorkerRequest extends infer R ? (R extends { op: 'cancel' } ? never : Omit<R, 'id'>) : never

interface Pending {
  req: WorkerRequest
  resolve: (v: unknown) => void
  reject: (e: unknown) => void
  cleanup: () => void
}

let worker: Worker | null | undefined // undefined = not started, null = unavailable
let nextId = 1
const pending = new Map<number, Pending>()

export const abortError = () => new DOMException('Aborted', 'AbortError')

function startWorker(): Worker | null {
  if (worker !== undefined) return worker
  if (typeof Worker === 'undefined' || typeof WebAssembly === 'undefined') return (worker = null)
  try {
    const w = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module', name: 'parrotype-checker' })
    w.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const msg = e.data
      if ('type' in msg) {
        useDictionaryStatus.setState({ [msg.dict]: msg.state })
        return
      }
      const p = pending.get(msg.id)
      if (!p) return
      pending.delete(msg.id)
      p.cleanup()
      if (msg.ok) p.resolve(msg.result)
      else if (msg.cancelled) p.reject(abortError())
      else p.reject(new Error(msg.error))
    }
    w.onerror = (e) => {
      // the module failed to load or crashed: finish what is pending on the main thread
      e.preventDefault?.()
      if (import.meta.env?.DEV) console.warn('[checker] worker failed, using the main-thread fallback', e.message)
      w.terminate()
      worker = null
      // nothing is loading any more: don't leave "Loading the Dutch dictionary" on screen
      const st = useDictionaryStatus.getState()
      useDictionaryStatus.setState(
        Object.fromEntries(Object.entries(st).map(([k, v]) => [k, v === 'loading' ? 'failed' : v])) as typeof st,
      )
      const left = [...pending.values()]
      pending.clear()
      for (const p of left) {
        p.cleanup()
        fallback(p.req).then(p.resolve, p.reject)
      }
    }
    worker = w
  } catch (err) {
    if (import.meta.env?.DEV) console.warn('[checker] no worker, using the main-thread fallback', err)
    worker = null
  }
  return worker
}

/** Send a request to the worker (or the fallback). Rejects with an AbortError when `signal` aborts. */
function call<T>(payload: Payload, signal?: AbortSignal): Promise<T> {
  if (signal?.aborted) return Promise.reject(abortError())
  const id = nextId++
  const req = { ...payload, id } as WorkerRequest
  const w = startWorker()
  if (!w) return withSignal(fallback(req) as Promise<T>, signal)
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      pending.delete(id)
      w.postMessage({ id: nextId++, op: 'cancel', target: id } satisfies WorkerRequest)
      reject(abortError())
    }
    signal?.addEventListener('abort', onAbort, { once: true })
    pending.set(id, {
      req,
      resolve: resolve as (v: unknown) => void,
      reject,
      cleanup: () => signal?.removeEventListener('abort', onAbort),
    })
    w.postMessage(req)
  })
}

function withSignal<T>(p: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return p
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(abortError())
    signal.addEventListener('abort', onAbort, { once: true })
    p.then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort))
  })
}

/* ------------------------------------------------------------------ */
/* Main-thread fallback: rules only (no Hunspell)                      */
/* ------------------------------------------------------------------ */

async function fallback(req: WorkerRequest): Promise<unknown> {
  switch (req.op) {
    case 'check': {
      // the rule packs are only downloaded on the main thread when the worker could not start
      const [{ runRules }, { rulesFor }] = await Promise.all([import('./engine'), import('./spell/sources')])
      const rules = runRules(req.text, req.lang, rulesFor(req.lang), {
        strictness: req.strictness,
        disabled: req.disabledRules,
      })
      return { issues: combineLocal(rules, []), spell: false } satisfies CheckResult
    }
    case 'suggest':
      return []
    case 'isWord':
      return true // without a dictionary we cannot tell, so don't flag anything
    default:
      return true
  }
}

/* ------------------------------------------------------------------ */
/* Typed calls used by index.ts                                        */
/* ------------------------------------------------------------------ */

const common = (lang: Lang) => ({
  lang,
  variant: getSettings().englishVariant,
  personalWords: getPersonalDictionary(lang),
})

export function workerCheck(
  text: string,
  lang: Lang,
  strictness: 'normal' | 'strict' = 'normal',
  signal?: AbortSignal,
  dictWaitMs?: number,
): Promise<CheckResult> {
  return call<CheckResult>({ op: 'check', text, strictness, dictWaitMs, ...common(lang) }, signal)
}

export const workerSuggest = (word: string, lang: Lang, limit?: number, signal?: AbortSignal) =>
  call<string[]>({ op: 'suggest', word, limit, ...common(lang) }, signal)

export const workerIsWord = (word: string, lang: Lang, signal?: AbortSignal) =>
  call<boolean>({ op: 'isWord', word, ...common(lang) }, signal)

export function workerPreload(lang: Lang): void {
  call<boolean>({ op: 'preload', lang, variant: getSettings().englishVariant }).catch(() => {})
}

/** true once the worker failed and checks run rules-only on the main thread */
export const usingFallback = () => worker === null
