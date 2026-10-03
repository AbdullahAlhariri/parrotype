// Test-only: a Dictionary backed by nspell + dictionary-nl (the same Hunspell data the app loads).
import { readFileSync } from 'node:fs'
import nspell from 'nspell'
import type { Dictionary } from '@/types'

let cached: Dictionary | undefined

export function nlDict(): Dictionary {
  if (cached) return cached
  const dir = new URL('../../../node_modules/dictionary-nl/', import.meta.url)
  const spell = nspell(readFileSync(new URL('index.aff', dir)), readFileSync(new URL('index.dic', dir)))
  cached = { has: (w: string) => spell.correct(w) }
  return cached
}
