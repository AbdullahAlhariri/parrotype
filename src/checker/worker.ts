/// <reference lib="webworker" />
// The checker worker: Hunspell (WASM) + frequency lists + the rule engine, off the main thread.
// Start it with new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }) (see client.ts).
import { createHunspellFromStrings } from 'hunspell-wasm'
import type { Issue, Lang } from '@/types'
import { CheckerCore, type DictId, type DictState, type EnglishVariant } from './spell/core'

/* ------------------------------------------------------------------ */
/* Protocol (shared with client.ts through `import type`)              */
/* ------------------------------------------------------------------ */

interface Base {
  id: number
  lang: Lang
  variant?: EnglishVariant
  personalWords?: string[]
}

export type WorkerRequest =
  | (Base & { op: 'check'; text: string; strictness?: 'normal' | 'strict'; disabledRules?: string[]; dictWaitMs?: number })
  | (Base & { op: 'suggest'; word: string; limit?: number })
  | (Base & { op: 'isWord'; word: string })
  | (Base & { op: 'preload' })
  | { id: number; op: 'cancel'; target: number }

export interface CheckResult {
  issues: Issue[]
  /** false when the dictionary was unavailable and only the rules ran */
  spell: boolean
}

export type WorkerResponse =
  | { id: number; ok: true; result: unknown }
  | { id: number; ok: false; error: string; cancelled?: boolean }
  | { type: 'dict'; dict: DictId; state: DictState }

/* ------------------------------------------------------------------ */

const scope = self as unknown as DedicatedWorkerGlobalScope
const post = (msg: WorkerResponse) => scope.postMessage(msg)

const base = import.meta.env.BASE_URL ?? '/'

const core = new CheckerCore({
  async fetchText(path) {
    const res = await fetch(new URL(base + path, scope.location.origin))
    if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`)
    return res.text()
  },
  createHunspell: (aff, dic) => createHunspellFromStrings(aff, dic),
  onDictState: (dict, state) => post({ type: 'dict', dict, state }),
})

const inflight = new Set<number>()
const cancelled = new Set<number>()

async function handle(req: Exclude<WorkerRequest, { op: 'cancel' }>): Promise<unknown> {
  switch (req.op) {
    case 'check':
      return core.check({
        text: req.text,
        lang: req.lang,
        strictness: req.strictness,
        variant: req.variant,
        personalWords: req.personalWords,
        disabledRules: req.disabledRules,
        dictWaitMs: req.dictWaitMs,
        shouldStop: () => cancelled.has(req.id),
      }) satisfies Promise<CheckResult>
    case 'suggest':
      return core.suggest(req.word, req.lang, req.variant, req.personalWords, req.limit)
    case 'isWord':
      return core.isWord(req.word, req.lang, req.variant, req.personalWords)
    case 'preload':
      await core.preload(req.lang, req.variant)
      return true
  }
}

scope.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const req = e.data
  if (req.op === 'cancel') {
    if (inflight.has(req.target)) cancelled.add(req.target)
    return
  }
  inflight.add(req.id)
  try {
    const result = await handle(req)
    if (cancelled.has(req.id)) post({ id: req.id, ok: false, error: 'cancelled', cancelled: true })
    else post({ id: req.id, ok: true, result })
  } catch (err) {
    post({ id: req.id, ok: false, error: err instanceof Error ? err.message : String(err) })
  } finally {
    inflight.delete(req.id)
    cancelled.delete(req.id)
  }
}
