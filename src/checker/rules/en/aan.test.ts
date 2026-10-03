import { beforeAll, describe, expect, it } from 'vitest'
import type { Dictionary } from '@/types'
import { loadTestDictionary } from '@/test/dict'
import { aAn, expectedArticle } from './aan'
import { expectFlag, expectQuiet, runEn } from './testing'

// The prototype's 28 a/an cases and 14 no-fire sentences (aan.mjs / test.mjs), plus a few more.

const CASES: Array<[string, 'a' | 'an' | null]> = [
  ['a hour', 'an'],
  ['an university', 'a'],
  ['an European', 'a'],
  ['a apple', 'an'],
  ['an one-time', 'a'],
  ['a MBA', 'an'],
  ['a FBI agent', 'an'],
  ['an UFO', 'a'],
  ['a honest', 'an'],
  ['a 8-year-old', 'an'],
  ['an useful', 'a'],
  ['a umbrella', 'an'],
  ['an uniform', 'a'],
  ['a unimportant', 'an'],
  ['a uninteresting', 'an'],
  ['an unique', 'a'],
  ['a ugly', 'an'],
  ['an user', 'a'],
  ['a 11-year-old', 'an'],
  ['an 100', 'a'],
  ['a NASA', null],
  ['a SQL', null],
  ['an URL', 'a'],
  ['a honour', 'an'],
  ['an Utrecht', 'a'],
  ['a umpire', 'an'],
  ['a utter', 'an'],
  ['an once', 'a'],
  // additions
  ['a X-ray', 'an'],
  ['an U-turn', 'a'],
  ['an unanimous', 'a'],
  ['a e-mail', 'an'],
]

const OK = [
  'It took an hour.',
  'She is a university student.',
  'A European city.',
  'Vitamin A is good.',
  'Plan A is fine.',
  'He has an MBA.',
  'A one-way ticket.',
  'A historic day.',
  'An historic day.',
  'I woke at 7 a.m. today.',
  'An 18-year-old won.',
  'A UFO landed.',
  'A useful tip.',
  'An honest man.',
  // additions
  'There is a LOT of noise.',
  'She bought a T-shirt and an X-ray machine.',
  'Visit https://example.com/a-apple for more.',
]

function caseResult(t: string, dict?: Dictionary) {
  const issues = runEn(`${t} thing.`, aAn, { dict })
  return issues.length ? issues[0].replacements[0].toLowerCase() : null
}

describe('a/an by sound', () => {
  let dict: Dictionary
  beforeAll(async () => {
    dict = await loadTestDictionary('en')
  })

  for (const [t, exp] of CASES) {
    it(`${t} -> ${exp ?? 'no change'}`, () => {
      expect(caseResult(t)).toBe(exp)
      expect(caseResult(t, dict)).toBe(exp)
    })
  }

  it('stays quiet on correct sentences', () => {
    for (const t of OK) {
      expectQuiet(aAn, t)
      expectQuiet(aAn, t, { dict })
    }
  })

  it('underlines only the article and keeps its case', () => {
    expectFlag(aAn, 'A hour later we left.', 'A', 'An')
    expectFlag(aAn, 'We waited an year.', 'an', 'a')
    const [is] = runEn('It took a hour.', aAn)
    expect(is.message).toContain('an hour')
  })

  it('uses the dictionary to tell shouted words from initialisms', () => {
    // LEGAL is a word (a legal...), FBI is not (an FBI...)
    expect(expectedArticle('LEGAL', (w) => dict.has(w))).toBe('a')
    expect(expectedArticle('FBI', (w) => dict.has(w))).toBe('an')
  })
})
