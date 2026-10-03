import { beforeAll, describe, expect, it } from 'vitest'
import type { Dictionary } from '@/types'
import { loadTestDictionary } from '@/test/dict'
import { EN_MISSPELLINGS, EN_MISSPELLING_NOTES } from '../../lexicon/en'
import { misspelling } from './spelling'
import { expectFlag, expectQuiet, runEn } from './testing'

describe('english misspelling map', () => {
  let us: Dictionary
  let gb: Dictionary
  beforeAll(async () => {
    us = await loadTestDictionary('en')
    gb = await loadTestDictionary('en-GB')
  })

  it('never lists a real word as a wrong form', () => {
    const real = [...EN_MISSPELLINGS.keys()].filter((w) => us.has(w) || gb.has(w))
    expect(real).toEqual([])
    for (const w of ['calender', 'lightening', 'therefor', 'copywrite', 'florescent']) expect(EN_MISSPELLINGS.has(w), w).toBe(false)
  })

  it('only suggests words the dictionaries know', () => {
    const unknown = [...new Set([...EN_MISSPELLINGS.values()].map((m) => m.right))].filter((w) => !us.has(w) && !gb.has(w))
    expect(unknown).toEqual([])
  })

  it('has notes only for words in the list', () => {
    const rights = new Set([...EN_MISSPELLINGS.values()].map((m) => m.right))
    expect(Object.keys(EN_MISSPELLING_NOTES).filter((k) => !rights.has(k))).toEqual([])
  })

  it('flags listed and regularly inflected forms, keeping case', () => {
    expectFlag(misspelling, 'I recieve mail.', 'recieve', 'receive')
    expectFlag(misspelling, 'I recieved mail.', 'recieved', 'received')
    expectFlag(misspelling, 'Recieve it.', 'Recieve', 'Receive')
    expectFlag(misspelling, 'We seperated the old receipts.', 'seperated', 'separated')
    expectFlag(misspelling, 'Two adresses.', 'adresses', 'addresses')
    expectFlag(misspelling, 'Two goverments.', 'goverments', 'governments')
    expectFlag(misspelling, 'See you on wensday.', 'wensday', 'Wednesday')
    expectFlag(misspelling, 'The childs played.', 'childs', 'children')
  })

  it('explains with a memory hook where we have one', () => {
    const [is] = runEn('Keep them seperate.', misspelling)
    expect(is.explanation).toContain('rat')
    const [succes] = runEn('It was a big succes.', misspelling)
    expect(succes.explanation).toContain('Dutch')
  })

  it("offers both varieties for British-only words, the user's first", () => {
    const [plain] = runEn('My neigbour is nice.', misspelling)
    expect(plain.replacements).toEqual(['neighbor', 'neighbour'])
    const [withGb] = runEn('My neigbour is nice.', misspelling, { dict: gb })
    expect(withGb.replacements).toEqual(['neighbour', 'neighbor'])
  })

  it('leaves words to the dedicated rules', () => {
    expectQuiet(misspelling, 'I will definately come and we help eachother alot.')
  })

  it('skips links', () => {
    expectQuiet(misspelling, 'See www.recieve.com/seperate for details.')
  })
})
