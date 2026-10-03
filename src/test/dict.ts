/// <reference types="node" />
// Test helper: a real Hunspell Dictionary (same engine and word lists the app uses).
// Usage in vitest: const dict = await loadTestDictionary('nl')
import { readFileSync } from 'node:fs'
import { createHunspellFromStrings } from 'hunspell-wasm'
import type { Dictionary, Lang } from '@/types'

const FILES: Record<Lang | 'en-GB', string> = {
  nl: 'node_modules/dictionary-nl/index',
  en: 'node_modules/dictionary-en/index',
  'en-GB': 'node_modules/dictionary-en-gb/index',
  ar: 'vendor/dicts/ar/ar',
}

const cache = new Map<string, Promise<Dictionary>>()

export function loadTestDictionary(lang: Lang | 'en-GB'): Promise<Dictionary> {
  let p = cache.get(lang)
  if (!p) {
    const base = new URL(`../../${FILES[lang]}`, import.meta.url)
    const aff = readFileSync(new URL(`${base.href}.aff`), 'utf8')
    const dic = readFileSync(new URL(`${base.href}.dic`), 'utf8')
    p = createHunspellFromStrings(aff, dic).then((h) => ({ has: (w: string) => h.testSpelling(w) }))
    cache.set(lang, p)
  }
  return p
}
