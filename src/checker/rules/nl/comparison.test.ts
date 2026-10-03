import { describe, expect, it } from 'vitest'
import { check, expectClean, expectFlags } from '../../test-utils/expect'
import { evenAls, groterAls, hetzelfdeAls, zowelAls } from './comparison'

describe('CMP-01 groter dan (strict)', () => {
  it('flags als after a comparative', () =>
    expectFlags(groterAls, [
      ['Hij is groter als ik.', 'als', 'dan'],
      ['Dit is beter als dat.', 'als', 'dan'],
      ['Het is anders als vroeger.', 'als', 'dan'],
      ['Zij is ouder als mijn broer.', 'als', 'dan'],
    ]))
  it('in normal mode only flags a plain comparison (pronoun or my brother at the end)', () => {
    expect(groterAls.strictOnly).toBeFalsy()
    const normal = { strictness: 'normal' as const }
    for (const t of ['Hij is groter als ik.', 'Zij is ouder als mijn broer.', 'Het was beter als vorig jaar.']) {
      expect(check(t, groterAls, normal).map((i) => i.replacements[0]), t).toEqual(['dan'])
    }
    for (const t of [
      'Het is anders als vroeger.',
      'Een appel is beter als tussendoortje.',
      'Hij is bekender als zanger dan als acteur.',
      'Zij is bekender als zijn vrouw dan als schrijver.',
      'Het is beter als je komt.',
    ]) {
      expect(check(t, groterAls, normal), t).toEqual([])
    }
  })
  it('leaves conditional als alone', () =>
    expectClean(groterAls, [
      'Het is beter als je komt.',
      'Het is beter als het regent.',
      'Het is beter als de kinderen thuis blijven.',
      'Hij is liever thuis als het koud is.',
      'Het is anders als je ouder bent.',
      'Ik kom eerder als het kan.',
      'Hij is meer als een broer voor me.',
      'Hij is groter dan ik.',
    ]))
})

describe('CMP-02 even groot als', () => {
  it('flags dan after even/zo + adjective', () =>
    expectFlags(evenAls, [
      ['Hij is even groot dan ik.', 'dan', 'als'],
      ['Zij is zo snel dan een paard.', 'dan', 'als'],
    ]))
  it('leaves particle dan alone', () =>
    expectClean(evenAls, ['Is het zo koud dan?', 'Ben je echt zo moe dan?', 'Het is zo duur dan moet je sparen.', 'Even groot als jij.']))
})

describe('CMP-03 hetzelfde als', () => {
  it('flags hetzelfde/dezelfde dan', () =>
    expectFlags(hetzelfdeAls, [
      ['Het is hetzelfde dan gisteren.', 'dan', 'als'],
      ['Ik heb dezelfde dan jij.', 'dan', 'als'],
    ]))
  it('leaves particle dan alone', () => expectClean(hetzelfdeAls, ['Waarom is het hetzelfde dan?', 'Hetzelfde als gisteren.']))
})

describe('CMP-04 zowel … als', () => {
  it('flags en after zowel', () => expectFlags(zowelAls, [['Zowel kinderen en ouders waren blij.', 'en', 'als']]))
  it('leaves zowel … als alone', () => expectClean(zowelAls, ['Zowel kinderen als ouders waren blij.', 'Zowel Jan als Piet en Kees kwamen.']))
})
