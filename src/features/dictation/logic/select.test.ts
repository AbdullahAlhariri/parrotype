import { describe, expect, it } from 'vitest'
import { DICTATION, PAIRS, type DictationSentence } from '@/content/dictation'
import { seeded } from '@/lib/random'
import { selectForWords, selectPairItems, selectSentences, wordsOf } from './select'

const S = (id: string, level: 1 | 2 | 3, focus: string[], text = `Zin ${id}.`): DictationSentence => ({ id, level, focus, text })

const POOL: DictationSentence[] = [
  S('a', 1, ['dt']),
  S('b', 1, ['dt']),
  S('c', 1, ['ei-ij']),
  S('d', 2, ['dt']),
  S('e', 2, ['ei-ij']),
  S('f', 3, ['dt']),
  S('g', 3, ['trema']),
  S('h', 1, ['trema', 'dt']),
]

describe('wordsOf', () => {
  it('lowercases and drops punctuation', () => {
    expect(wordsOf("Mijn twee opa's wonen in Zeeland.")).toEqual(['mijn', 'twee', "opa's", 'wonen', 'in', 'zeeland'])
  })
})

describe('selectSentences', () => {
  it('returns exactly count sentences without duplicates', () => {
    const out = selectSentences(DICTATION.nl, { level: 2, focus: [], count: 10, rand: seeded(1) })
    expect(out).toHaveLength(10)
    expect(new Set(out.map((s) => s.id)).size).toBe(10)
    expect(out.every((s) => s.level === 2)).toBe(true)
  })

  it('prefers level + focus, then the focus at neighbouring levels', () => {
    const out = selectSentences(POOL, { level: 1, focus: ['dt'], count: 4, rand: seeded(2) })
    expect(out.map((s) => s.id).sort()).toEqual(['a', 'b', 'd', 'h'])
  })

  it('falls back to the level without the focus when the focus runs out', () => {
    const out = selectSentences(POOL, { level: 1, focus: ['trema'], count: 3, rand: seeded(3) })
    const ids = out.map((s) => s.id)
    expect(ids).toContain('h')
    expect(ids).toContain('g') // trema, other level, before non-trema sentences
    expect(ids).toHaveLength(3)
  })

  it('returns the whole pool when count is larger', () => {
    expect(selectSentences(POOL, { level: 2, focus: [], count: 50, rand: seeded(4) })).toHaveLength(POOL.length)
  })

  it('avoids recently seen sentences while fresh ones are left', () => {
    const avoid = new Set(['a', 'b'])
    const out = selectSentences(POOL, { level: 1, focus: [], count: 2, rand: seeded(5), avoid })
    expect(out.map((s) => s.id).sort()).toEqual(['c', 'h'])
  })

  it('boosts sentences with words the user misses', () => {
    const pool = [S('x', 1, [], 'Hij wordt boos.'), ...Array.from({ length: 9 }, (_, i) => S(`n${i}`, 1, [], `Iets anders ${i}.`))]
    let hits = 0
    for (let seed = 0; seed < 200; seed++) {
      const out = selectSentences(pool, { level: 1, focus: [], count: 1, rand: seeded(seed), boost: new Set(['wordt']) })
      if (out[0].id === 'x') hits++
    }
    // weight 3 against 9 others at weight 1: about 25%, never the 10% of a fair draw
    expect(hits).toBeGreaterThan(30)
  })

  it('is deterministic for a seeded rand', () => {
    const a = selectSentences(DICTATION.en, { level: 1, focus: ['homophone'], count: 5, rand: seeded(9) })
    const b = selectSentences(DICTATION.en, { level: 1, focus: ['homophone'], count: 5, rand: seeded(9) })
    expect(a).toEqual(b)
  })
})

describe('selectForWords', () => {
  it('finds sentences containing the words, new ones first', () => {
    const out = selectForWords(DICTATION.nl, ['wordt'], 5, new Set(['nl-d02']), seeded(1))
    expect(out.length).toBe(5)
    expect(out.every((s) => wordsOf(s.text).includes('wordt'))).toBe(true)
    expect(out.map((s) => s.id)).not.toContain('nl-d02')
  })

  it('returns nothing for unknown words', () => {
    expect(selectForWords(DICTATION.nl, ['xyzzy'], 5)).toEqual([])
  })
})

describe('selectPairItems', () => {
  it('balances members of a pair', () => {
    const out = selectPairItems(PAIRS.nl, ['word-wordt'], 6, seeded(1))
    expect(out).toHaveLength(6)
    const word = out.filter((i) => i.target?.toLowerCase() === 'word').length
    expect(word).toBe(3)
    expect(out.every((i) => i.pairId === 'word-wordt' && i.text.includes(i.target!))).toBe(true)
  })

  it('spreads over several sets', () => {
    const out = selectPairItems(PAIRS.en, ['then-than', 'lose-loose'], 8, seeded(2))
    expect(new Set(out.map((i) => i.pairId))).toEqual(new Set(['then-than', 'lose-loose']))
  })

  it('repeats sentences when the run is longer than the set', () => {
    const out = selectPairItems(PAIRS.ar, ['dalla-zalla'], 10, seeded(3))
    expect(out).toHaveLength(10)
  })

  it('uses all sets when none are chosen', () => {
    expect(selectPairItems(PAIRS.nl, [], 20, seeded(4)).length).toBe(20)
  })
})
