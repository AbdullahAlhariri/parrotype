import { beforeAll, describe, expect, it } from 'vitest'
import type { Dictionary } from '@/types'
import { loadTestDictionary } from '@/test/dict'
import { IRREGULAR_PAST } from '../../lexicon/en'
import { enRules } from '.'
import { couldOf, itsItIs, itsOwn, thenThan, yourYoure } from './confusables'
import { dayCap, iLower, sentenceStartCap } from './capitals'
import { inTheWeekend } from './grammar'
import { spaceBeforePunct, wordRepeat } from './punctuation'
import { expectFlag, expectQuiet, runEn } from './testing'

describe('english rules: edge cases', () => {
  let us: Dictionary
  let gb: Dictionary
  beforeAll(async () => {
    us = await loadTestDictionary('en')
    gb = await loadTestDictionary('en-GB')
  })

  it('keeps the case of the original in fixes', () => {
    expectFlag(couldOf, 'I SHOULD OF KNOWN.', 'OF', 'HAVE')
    expectFlag(yourYoure, 'Your welcome.', 'Your', "You're")
    expectFlag(thenThan, 'Bigger THEN me.', 'THEN', 'THAN')
    expectFlag(wordRepeat, 'The the cat sat.', 'The the', 'The')
  })

  it('treats curly apostrophes like straight ones, and answers in the same style', () => {
    expectFlag(itsOwn, 'The town has it’s own beach.', 'it’s', 'its')
    expectFlag(itsItIs, 'Its a beautiful day, isn’t it?', 'Its', 'It’s')
    expectFlag(itsItIs, "Its a beautiful day, isn't it?", 'Its', "It's")
    expectFlag(couldOf, 'You couldn’t of known.', 'of', 'have')
  })

  it('never flags inside links and e-mail addresses', () => {
    expect(runEn('Read https://example.com/its-a-test and mail its.a@example.com today.', enRules)).toEqual([])
    expect(runEn('See www.the-the.com for monday deals.', [wordRepeat, dayCap]).map((i) => i.text)).toEqual(['monday'])
  })

  it('follows the shared sentence splitter for capitals', () => {
    expectQuiet(sentenceStartCap, 'We met Dr. smith yesterday.')
    expectQuiet(sentenceStartCap, 'It costs approx. ten euros.')
    expectQuiet(sentenceStartCap, 'He said "wait." and left.')
    expectFlag(sentenceStartCap, 'It rained. we stayed in.', 'we', 'We')
    expectFlag(iLower, 'i think so.', 'i', 'I')
  })

  it('answers in the user’s variety where it matters', () => {
    expectFlag(inTheWeekend, 'What did you do in the weekend?', 'in', 'on', { dict: us })
    expectFlag(inTheWeekend, 'What did you do in the weekend?', 'in', 'at', { dict: gb })
  })

  it('merges spaces before punctuation into one fix', () => {
    expectFlag(spaceBeforePunct, 'Really ?', ' ?', '?')
  })

  it('only lists irregular pasts that are not words, with known fixes', () => {
    const bad = [...IRREGULAR_PAST].filter(([w, r]) => us.has(w) || gb.has(w) || !us.has(r) || !gb.has(r))
    expect(bad).toEqual([])
  })

  it('gives every hit a message and keeps hits inside the text', () => {
    const text = "Their is alot of informations. i buyed a apple in monday and i'm agree. We dicussed about it, then we loose."
    const issues = runEn(text, enRules, { dict: us })
    expect(issues.map((i) => i.ruleId)).toEqual([
      'en.their-is',
      'en.alot',
      'en.uncountable-plural',
      'en.i-lower',
      'en.irregular-past',
      'en.a-an',
      'en.day-cap',
      'en.i-am-agree',
    ])
    for (const is of issues) {
      expect(is.message.length).toBeGreaterThan(5)
      expect(text.slice(is.offset, is.offset + is.length)).toBe(is.text)
      expect(is.message).not.toMatch(/—|!/)
      expect(is.explanation ?? '').not.toMatch(/—/)
    }
  })
})
