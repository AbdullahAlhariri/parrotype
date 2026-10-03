import type { Lang } from '@/types'

// Small per-viewer conveniences (feedback mode, prompt kind, personal words). Storage can throw in
// private windows, so every access is wrapped and falls back to the default.

const PREFIX = 'parrotype.write.'

export function readPref<T extends string>(key: string, fallback: T): T {
  try {
    return (localStorage.getItem(PREFIX + key) as T | null) ?? fallback
  } catch {
    return fallback
  }
}

export function writePref(key: string, value: string) {
  try {
    localStorage.setItem(PREFIX + key, value)
  } catch {
    /* not saved; fine */
  }
}

/**
 * Words the user added to their dictionary. The checker keeps its own personal dictionary too;
 * this local copy makes sure a word stays accepted even when that call is unavailable.
 */
export function readPersonalWords(lang: Lang): Set<string> {
  try {
    const raw = localStorage.getItem(`${PREFIX}words.${lang}`)
    const list = raw ? (JSON.parse(raw) as unknown) : []
    return new Set(Array.isArray(list) ? list.filter((w): w is string => typeof w === 'string') : [])
  } catch {
    return new Set()
  }
}

export function rememberPersonalWord(lang: Lang, word: string) {
  const set = readPersonalWords(lang)
  set.add(word.toLowerCase())
  try {
    localStorage.setItem(`${PREFIX}words.${lang}`, JSON.stringify([...set].slice(-2000)))
  } catch {
    /* not saved; fine */
  }
}
