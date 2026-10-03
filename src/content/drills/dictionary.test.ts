import { describe, expect, it } from 'vitest'
import { ALL_PACKS, fillGap } from './index'
import { ALL_TEXTS } from '@/content/proofread'
import { loadTestDictionary } from '@/test/dict'
import { LANGS } from '@/types'

// Every right answer, filled-in sentence and corrected Fix it text must be spelled the way the
// app's own Hunspell dictionaries spell it. Capitalised words after the first are names.

const WORD = /[\p{L}\p{M}]+(?:['’-][\p{L}\p{M}]+)*/gu
/** names that open a line (signatures), where the capital rule above cannot tell */
const NAMES = new Set(['Marieke', 'Laila'])

function unknownWords(sentences: string[], has: (w: string) => boolean, skipNames: boolean): string[] {
  const out = new Set<string>()
  for (const s of sentences) {
    let first = true
    for (const m of s.matchAll(WORD)) {
      const w = m[0]
      const name = skipNames && !first && /^\p{Lu}/u.test(w)
      first = false
      if (name || NAMES.has(w) || has(w) || has(w.toLowerCase())) continue
      out.add(w)
    }
  }
  return [...out]
}

describe('content spelling', () => {
  for (const lang of LANGS) {
    it(`${lang}: every correct form is in the dictionary`, async () => {
      const dict = await loadTestDictionary(lang)
      const sentences = [
        ...ALL_PACKS.filter((p) => p.lang === lang).flatMap((p) => p.items.map((i) => fillGap(i))),
        ...ALL_TEXTS.filter((t) => t.lang === lang).flatMap((t) => t.corrected.split(/(?<=[.?!:])\s+|\n+/)),
      ]
      expect(unknownWords(sentences, (w) => dict.has(w), lang !== 'ar')).toEqual([])
    }, 60_000)
  }
})
