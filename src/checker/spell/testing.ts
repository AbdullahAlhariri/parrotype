/// <reference types="node" />
// Test-only helpers: real Hunspell + frequency lists from disk, the same files the app serves.
// Never import this from app code (it uses node:fs).
import { readFileSync } from 'node:fs'
import { createHunspellFromStrings } from 'hunspell-wasm'
import type { Lang } from '@/types'
import { CheckerCore, type CoreLoaders, type DictId, type HunspellLike } from './core'
import { parseFreqList, type FreqRanks } from './freq'

const root = new URL('../../../', import.meta.url)

const DICT_FILES: Record<DictId, string> = {
  nl: 'node_modules/dictionary-nl/index',
  'en-US': 'node_modules/dictionary-en/index',
  'en-GB': 'node_modules/dictionary-en-gb/index',
  ar: 'vendor/dicts/ar/ar',
}

const read = (rel: string) => readFileSync(new URL(rel, root), 'utf8')

const hunspells = new Map<DictId, Promise<HunspellLike>>()
export function loadHunspell(id: DictId): Promise<HunspellLike> {
  let p = hunspells.get(id)
  if (!p) {
    p = createHunspellFromStrings(read(`${DICT_FILES[id]}.aff`), read(`${DICT_FILES[id]}.dic`))
    hunspells.set(id, p)
  }
  return p
}

const freqs = new Map<Lang, FreqRanks>()
export function loadFreq(lang: Lang): FreqRanks {
  let f = freqs.get(lang)
  if (!f) {
    f = parseFreqList(read(`public/freq/${lang}.txt`))
    freqs.set(lang, f)
  }
  return f
}

/** Loaders that read the files on disk, the same ones the worker fetches. */
export function nodeLoaders(): CoreLoaders {
  return {
    fetchText: async (path) => {
      const m = /^dicts\/(.+)\.(aff|dic)\.txt$/.exec(path)
      if (m) return read(`${DICT_FILES[m[1] as DictId]}.${m[2]}`)
      return read(`public/${path}`)
    },
    createHunspell: (aff, dic) => createHunspellFromStrings(aff, dic),
  }
}

/** A CheckerCore wired to the files on disk (fresh Hunspell instances, so personal words don't leak). */
export function nodeCore(): CheckerCore {
  return new CheckerCore(nodeLoaders())
}
