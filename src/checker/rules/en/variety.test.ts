import { beforeAll, describe, expect, it } from 'vitest'
import type { Dictionary } from '@/types'
import { loadTestDictionary } from '@/test/dict'
import { EN_VARIETY_PAIRS, IZE_STEMS, izeIse, swapIzeIse } from '../../lexicon/en'
import { izeIseMix, variety } from './variety'
import { expectFlag, expectQuiet, runEn } from './testing'

describe('US/UK spelling', () => {
  let us: Dictionary
  let gb: Dictionary
  beforeAll(async () => {
    us = await loadTestDictionary('en')
    gb = await loadTestDictionary('en-GB')
  })

  it('only lists pairs where each form belongs to exactly one variety', () => {
    const bad = EN_VARIETY_PAIRS.filter(([a, b]) => !(us.has(a) && !gb.has(a) && gb.has(b) && !us.has(b)))
    expect(bad).toEqual([])
  })

  it('only lists -ize stems that alternate cleanly', () => {
    const bad = [...IZE_STEMS].filter((s) => !(us.has(`${s}ize`) && !gb.has(`${s}ize`) && gb.has(`${s}ise`) && !us.has(`${s}ise`)))
    expect(bad).toEqual([])
  })

  it('recognises -ize/-ise words and swaps them', () => {
    expect(izeIse('organisation')).toBe('ise')
    expect(izeIse('realized')).toBe('ize')
    for (const w of ['advertise', 'surprise', 'exercise', 'otherwise', 'size', 'prize', 'seize', 'uprising', 'precise', 'promise']) {
      expect(izeIse(w), w).toBeNull()
    }
    expect(swapIzeIse('Organisation')).toBe('Organization')
    expect(swapIzeIse('REALIZED')).toBe('REALISED')
  })

  it('flags the minority variety without a dictionary', () => {
    expectFlag(variety, 'My favorite colour is blue, and the center of town is gray.', 'colour', 'color')
    expectFlag(variety, 'The colour of the centre is grey, my favorite.', 'favorite', 'favourite')
    expectQuiet(variety, 'The colour of the centre is grey.')
    expectQuiet(variety, 'The color of the center is gray.')
  })

  it('breaks a 1:1 tie towards American spelling', () => {
    expectFlag(variety, 'Color is nice, colour is nicer.', 'colour', 'color')
  })

  it("flags the other variety when the dictionary shows the user's choice", () => {
    expectFlag(variety, 'The colour is nice.', 'colour', 'color', { dict: us })
    expectFlag(variety, 'The color is nice.', 'color', 'colour', { dict: gb })
    expectQuiet(variety, 'The colour is nice.', { dict: gb })
    const [is] = runEn('We traveled to the theatre.', variety, { dict: gb })
    expect(is.text).toBe('traveled')
    expect(is.message).toContain('set to British')
  })

  it('keeps capitals in the fix', () => {
    expectFlag(variety, 'Colour matters. The color of the center is gray.', 'Colour', 'Color')
  })

  it('treats -ize/-ise as a mix only inside one text', () => {
    expectQuiet(izeIseMix, 'We organise and realise. The colour is fine.')
    expectQuiet(izeIseMix, 'We organize and realize.')
    expectFlag(izeIseMix, 'We organize, prioritize and realise.', 'realise', 'realize')
    expectFlag(izeIseMix, 'We organise, prioritise and realize.', 'realize', 'realise')
    expectFlag(izeIseMix, 'We organise and realize.', 'organise', 'organize', { dict: us })
    expectFlag(izeIseMix, 'We organise and realize.', 'realize', 'realise', { dict: gb })
  })
})
