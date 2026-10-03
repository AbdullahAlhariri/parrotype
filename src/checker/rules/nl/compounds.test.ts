import { describe, expect, it } from 'vitest'
import { check, expectClean, expectFlags } from '../../test-utils/expect'
import { nlDict } from '../../test-utils/nlDict'
import { generatedCompound, splitCompound, vowelClash } from './compounds'

const dict = nlDict()

describe('CMPD-01 compounds written apart', () => {
  it('joins curated split compounds', () =>
    expectFlags(splitCompound, [
      ['Ik moet naar het zieken huis.', 'zieken huis', 'ziekenhuis'],
      ['Mijn telefoon nummer is nieuw.', 'telefoon nummer', 'telefoonnummer'],
      ['Hij is account manager.', 'account manager', 'accountmanager'],
      ['Tand arts is een mooi beroep.', 'Tand arts', 'Tandarts'],
      ['Ik had een auto ongeluk.', 'auto ongeluk', 'auto-ongeluk'],
    ]))
  it('leaves the joined forms and verb readings alone', () =>
    expectClean(splitCompound, ['Ik moet naar het ziekenhuis.', 'In huis werk ik graag.', 'Ik heb een rijbewijs.']))
})

describe('CMPD-03 hyphen at a vowel clash', () => {
  it('adds the hyphen', () => expectFlags(vowelClash, [['Ik had een autoongeluk.', 'autoongeluk', 'auto-ongeluk']]))
  it('leaves correct forms alone', () => expectClean(vowelClash, ['Ik had een auto-ongeluk.', 'Een mooi fotoalbum.'], { dict }))
})

describe('CMPD-02 generated compounds (strict hint)', () => {
  it('only runs in strict mode with a dictionary', () => {
    expect(generatedCompound.strictOnly).toBe(true)
    expect(check('Ik zoek de auto sleutel.', generatedCompound, { strictness: 'normal', dict })).toEqual([])
    expect(check('Ik zoek de auto sleutel.', generatedCompound, { strictness: 'strict' })).toEqual([])
  })
  it('is never more than a low-confidence hint', () => {
    for (const i of check('Ik zoek de auto sleutel.', generatedCompound, { dict })) expect(i.confidence).toBe('low')
  })
})
