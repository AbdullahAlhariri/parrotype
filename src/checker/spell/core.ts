import type { Dictionary, Issue, Lang } from '@/types'
import { runRules } from '../engine'
import { combineLocal } from '../merge'
import { parseFreqList, type FreqRanks } from './freq'
import { rankSuggestions, type RankedSuggestion, type SpellBackend } from './rank'
import { misspellingsFor, rulesFor } from './sources'
import { checkSpelling, inPersonal, makeIsKnown } from './spellcheck'
import { toLookup } from './text'

// Everything the checker worker does, minus the postMessage plumbing, so it can run in tests
// (node + real Hunspell) and, if ever needed, on the main thread.

export type EnglishVariant = 'en-US' | 'en-GB'
export type DictId = 'nl' | 'en-US' | 'en-GB' | 'ar'
export type DictState = 'idle' | 'loading' | 'ready' | 'failed'

export const dictIdFor = (lang: Lang, variant: EnglishVariant = 'en-US'): DictId => (lang === 'en' ? variant : lang)

export interface HunspellLike extends SpellBackend {
  addWord(word: string): void
  removeWord(word: string): void
}

export interface CoreLoaders {
  /** fetch a text asset, e.g. 'dicts/nl.aff.txt' or 'freq/nl.txt' */
  fetchText(path: string): Promise<string>
  createHunspell(aff: string, dic: string): Promise<HunspellLike>
  onDictState?(id: DictId, state: DictState): void
}

export interface CheckParams {
  text: string
  lang: Lang
  strictness?: 'normal' | 'strict'
  variant?: EnglishVariant
  personalWords?: string[]
  /** rule ids the user switched off */
  disabledRules?: string[]
  /**
   * How long to wait for a dictionary that is still loading before answering with the rules alone
   * (default 12 s). An editor passes a short wait and checks again once the dictionary is ready.
   */
  dictWaitMs?: number
  /** checked once the dictionary is there: return early when the caller lost interest */
  shouldStop?: () => boolean
}

export interface CheckOutput {
  issues: Issue[]
  /** false when the dictionary was not available and only the rules ran */
  spell: boolean
}

interface LoadedDict {
  h: HunspellLike
  /** words added to this Hunspell instance from the personal dictionary */
  added: Set<string>
  /** word -> ranked suggestions for this dictionary (en-US and en-GB differ: organisation) */
  suggestions: Map<string, RankedSuggestion[]>
}

const LOAD_TIMEOUT_MS = 12_000
/** after a failed download, wait this long before trying again (each try is megabytes) */
const RETRY_AFTER_MS = 20_000

export class CheckerCore {
  private dicts = new Map<DictId, Promise<LoadedDict>>()
  private ready = new Map<DictId, LoadedDict>()
  private freqs = new Map<Lang, Promise<FreqRanks | undefined>>()
  private freqReady = new Map<Lang, FreqRanks>()
  private failedAt = new Map<DictId, number>()
  private loaders: CoreLoaders

  constructor(loaders: CoreLoaders) {
    this.loaders = loaders
  }

  /** Start loading a language (dictionary + frequency list). Never rejects. */
  preload(lang: Lang, variant?: EnglishVariant): Promise<void> {
    return Promise.all([this.dict(dictIdFor(lang, variant)).catch(() => null), this.freq(lang)]).then(() => undefined)
  }

  async check(p: CheckParams): Promise<CheckOutput> {
    const { text, lang } = p
    if (!text.trim()) return { issues: [], spell: false }
    const id = dictIdFor(lang, p.variant)
    const d = await this.dictWithin(id, p.dictWaitMs ?? LOAD_TIMEOUT_MS)
    const freq = d ? await this.freq(lang) : undefined
    if (p.shouldStop?.()) return { issues: [], spell: false }
    const personal = this.syncPersonal(d, p.personalWords)

    let dict: Dictionary | undefined
    if (d) {
      const isKnown = makeIsKnown(d.h, personal, lang)
      dict = { has: (w: string) => isKnown(w) }
    }
    const rules = runRules(text, lang, rulesFor(lang), {
      dict,
      strictness: p.strictness ?? 'normal',
      disabled: p.disabledRules,
    })
    if (!d) return { issues: combineLocal(rules, []), spell: false }
    const spell = checkSpelling(text, lang, d.h, freq, {
      personal,
      misspellings: misspellingsFor(lang),
      cache: d.suggestions,
    })
    return { issues: combineLocal(rules, spell), spell: true }
  }

  async suggest(word: string, lang: Lang, variant?: EnglishVariant, personalWords?: string[], limit = 8): Promise<string[]> {
    const w = word.trim().replace(/^[^\p{L}\p{N}']+|[^\p{L}\p{N}]+$/gu, '')
    if (!w) return []
    const d = await this.dictWithin(dictIdFor(lang, variant), LOAD_TIMEOUT_MS)
    const freq = await this.freq(lang)
    const personal = this.syncPersonal(d, personalWords)
    const isKnown = d ? makeIsKnown(d.h, personal, lang) : (x: string) => inPersonal(x, personal) || !!freq?.has(toLookup(x).toLowerCase())
    return rankSuggestions(w, {
      lang,
      isKnown,
      backend: d?.h,
      freq,
      misspellings: misspellingsFor(lang),
    }, limit).map((s) => s.word)
  }

  /** true when the word is in the dictionary (or personal dictionary); true as well when no dictionary could load */
  async isWord(word: string, lang: Lang, variant?: EnglishVariant, personalWords?: string[]): Promise<boolean> {
    const w = word.trim().replace(/^[^\p{L}\p{N}']+|[^\p{L}\p{N}']+$/gu, '')
    if (!w) return false
    const d = await this.dictWithin(dictIdFor(lang, variant), LOAD_TIMEOUT_MS)
    const personal = this.syncPersonal(d, personalWords)
    if (!d) return true
    return makeIsKnown(d.h, personal, lang)(w)
  }

  dictState(id: DictId): DictState {
    return this.ready.has(id) ? 'ready' : this.dicts.has(id) ? 'loading' : 'idle'
  }

  /* ---------------------------------------------------------------- */

  private dict(id: DictId): Promise<LoadedDict> {
    let p = this.dicts.get(id)
    if (!p) {
      const failed = this.failedAt.get(id)
      if (failed !== undefined && Date.now() - failed < RETRY_AFTER_MS) return Promise.reject(new Error(`${id}: failed recently`))
      this.loaders.onDictState?.(id, 'loading')
      p = Promise.all([this.loaders.fetchText(`dicts/${id}.aff.txt`), this.loaders.fetchText(`dicts/${id}.dic.txt`)])
        .then(([aff, dic]) => this.loaders.createHunspell(aff, dic))
        .then((h) => {
          const d: LoadedDict = { h, added: new Set<string>(), suggestions: new Map() }
          this.failedAt.delete(id)
          this.ready.set(id, d)
          this.loaders.onDictState?.(id, 'ready')
          return d
        })
        .catch((err) => {
          // forget the failure so a later request tries again (offline now, online later)
          this.dicts.delete(id)
          this.failedAt.set(id, Date.now())
          this.loaders.onDictState?.(id, 'failed')
          throw err
        })
      this.dicts.set(id, p)
    }
    return p
  }

  /** the dictionary if it loads within `ms`; rules-only otherwise (it keeps loading for next time) */
  private async dictWithin(id: DictId, ms: number): Promise<LoadedDict | undefined> {
    const ready = this.ready.get(id)
    if (ready) return ready
    let timer: ReturnType<typeof setTimeout> | undefined
    const timeout = new Promise<undefined>((res) => (timer = setTimeout(() => res(undefined), ms)))
    try {
      return await Promise.race([this.dict(id).catch(() => undefined), timeout])
    } finally {
      clearTimeout(timer)
    }
  }

  private freq(lang: Lang): Promise<FreqRanks | undefined> {
    const ready = this.freqReady.get(lang)
    if (ready) return Promise.resolve(ready)
    let p = this.freqs.get(lang)
    if (!p) {
      p = this.loaders
        .fetchText(`freq/${lang}.txt`)
        .then((t) => {
          const f = parseFreqList(t)
          this.freqReady.set(lang, f)
          return f
        })
        .catch(() => {
          this.freqs.delete(lang)
          return undefined
        })
      this.freqs.set(lang, p)
    }
    return p
  }

  /** Make Hunspell know exactly the personal words of this request (they also feed the rules). */
  private syncPersonal(d: LoadedDict | undefined, words: string[] = []): Set<string> {
    const want = new Set(words.map((w) => toLookup(w.trim())).filter(Boolean))
    if (d) {
      let changed = false
      for (const w of d.added) {
        if (!want.has(w)) {
          d.h.removeWord(w)
          d.added.delete(w)
          changed = true
        }
      }
      for (const w of want) {
        // never add (and later remove) a word Hunspell already knows: remove() would forbid it
        if (!d.added.has(w) && !d.h.testSpelling(w)) {
          d.h.addWord(w)
          d.added.add(w)
          changed = true
        }
      }
      if (changed) d.suggestions.clear()
    }
    return want
  }
}
