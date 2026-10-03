import { describe, expect, it } from 'vitest'
import { gradeAttempt } from './grade'
import type { DictationItem } from './items'
import { configLabel, DEFAULT_CONFIG } from './items'
import { feedbackLine, formatDuration, keesRepeat, summarise, type ItemResult } from './summary'

const item = (text: string, target?: string): DictationItem => ({ id: text, lang: 'nl', text, focus: [], target })

const result = (text: string, typed: string, extra: Partial<ItemResult> = {}): ItemResult => {
  const first = gradeAttempt(text, typed, 'nl', extra.item?.target)
  return { item: item(text), first, firstTyped: typed, attempts: 1, hint: 0, listens: 1, ms: 10_000, ...extra }
}

describe('summarise', () => {
  it('adds up first-check scores and collects words to practise', () => {
    const s = summarise([
      result('Hij wordt morgen twintig.', 'Hij word morgen twintig.', { hint: 2 }),
      result('Mijn zus wordt boos.', 'Mijn zus word boos.', { hint: 4 }),
      result('Ik heb twee ideeën.', 'Ik heb twee ideeën.'),
    ])
    expect(s).toMatchObject({ items: 3, correctWords: 10, totalWords: 12, accuracy: 83, clean: 1, mistakes: 2, hinted: 2, revealed: 1, durationMs: 30_000 })
    expect(s.toPractise[0]).toMatchObject({ word: 'wordt', count: 2, typed: ['word'], tag: 'dt' })
  })

  it('puts a spelling rule before a plain slip when counts tie', () => {
    const s = summarise([result('De brandweerman redt de kat.', 'De brndweerman red de kat.')])
    expect(s.toPractise.map((w) => w.word)).toEqual(['redt', 'brandweerman'])
  })

  it('leaves out skipped words and a missed capital at the start', () => {
    const s = summarise([result('Ik word elke ochtend wakker.', 'ik word ochtend wakker.')])
    expect(s.mistakes).toBe(2)
    expect(s.toPractise).toEqual([])
  })

  it('counts minimal-pair targets', () => {
    const it1 = item('Ik word morgen dertig.', 'word')
    const it2 = item('Hij wordt morgen dertig.', 'wordt')
    const s = summarise([
      { ...result(it1.text, 'Ik wordt morgen dertig.', { item: it1 }) },
      { ...result(it2.text, 'Hij wordt morgen dertig.', { item: it2 }) },
    ])
    expect(s).toMatchObject({ targets: 2, targetsRight: 1 })
  })

  it('is 100% for an empty run', () => {
    expect(summarise([]).accuracy).toBe(100)
  })
})

describe('small helpers', () => {
  it('keesRepeat only repeats the correct word', () => {
    expect(keesRepeat('wordt')).toEqual(['wordt.', 'wordt.', 'wordt.'])
  })
  it('formatDuration', () => {
    expect(formatDuration(48_000)).toBe('48 s')
    expect(formatDuration(192_000)).toBe('3 min 12 s')
  })
  it('configLabel', () => {
    expect(configLabel('nl', { ...DEFAULT_CONFIG, level: 2, focus: ['dt'] }, false)).toBe('nl level 2 dt')
    expect(configLabel('en', { ...DEFAULT_CONFIG, mode: 'pairs', pairs: ['then-than'] }, true)).toBe('en which one then-than memory')
    expect(configLabel('en', { ...DEFAULT_CONFIG, mode: 'pairs', pairs: ['then-than'] }, false, () => 'then/than')).toBe('en which one then/than')
  })
})

describe('feedbackLine', () => {
  const name = (t: string) => (t === 'dt' ? 'd/t endings' : t)
  it('names the main trap when it dominates', () => {
    const s = summarise([
      result('Hij wordt morgen twintig.', 'Hij word morgen twintig.'),
      result('Mijn zus wordt boos.', 'Mijn zus word boos.'),
      result('Ik heb twee ideeën.', 'Ik heb twee ideeen.'),
    ])
    expect(feedbackLine(s, name)).toBe('2 of your 3 misses were d/t endings. That is the one to drill.')
  })
  it('says so when everything was right', () => {
    expect(feedbackLine(summarise([result('Ik heb twee ideeën.', 'Ik heb twee ideeën.')]), name)).toBe('Every word right on the first try.')
  })
})
