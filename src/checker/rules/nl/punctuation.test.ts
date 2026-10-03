import { describe, it } from 'vitest'
import { expectClean, expectFlags } from '../../test-utils/expect'
import { repeatedWord, spaceAfter, spaceBefore } from './punctuation'

describe('spacing around punctuation', () => {
  it('flags a space before punctuation', () =>
    expectFlags(spaceBefore, [
      ['Hallo , hoe gaat het?', ' ,', ','],
      ['Hoe gaat het ?', ' ?', '?'],
      ['Klaar !', ' !', '!'],
    ]))
  it('flags a missing space after a comma', () =>
    expectFlags(spaceAfter, [
      ['Hallo,hoe gaat het?', ',', ', '],
      ['Ik ben thuis.Daarna eet ik.', '.', '. '],
    ]))
  it('leaves decimals, links, emoticons and ellipses alone', () => {
    expectClean(spaceBefore, ['Het kost 3,50 euro.', 'Leuk :)', 'Ik weet het niet ...', 'Zie www.nu.nl.', 'Om 10.30 uur.'])
    expectClean(spaceAfter, ['Het kost 3,50 euro.', 'Mail jan@example.nl,daarna bellen.', 'Zie o.a. hier.', 'Kijk op parrotype.nl voor info.'])
  })
})

describe('repeated words', () => {
  it('flags a word typed twice', () =>
    expectFlags(repeatedWord, [
      ['Ik ga naar naar huis.', 'naar naar', 'naar'],
      ['De de kat slaapt.', 'De de', 'De'],
    ]))
  it('leaves grammatical doubles alone', () =>
    expectClean(repeatedWord, [
      'Ik denk dat dat klopt.',
      'De man die die auto heeft, woont hier.',
      'Het wordt tijd dat je je kamer opruimt.',
      'Ze kamt haar haar.',
      'Dat zijn zijn ouders.',
      'Hij stapt in in Utrecht.',
      'Ik vind het het mooiste.',
    ]))
})
