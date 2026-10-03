import { describe, it } from 'vitest'
import { expectClean, expectFlags } from '../../test-utils/expect'
import { beseffen, heelHele, kunnenKennen, liggenLeggen, meeEens, wetenKennen, wetenPersoon, wieZn, zoalsHoe } from './lexical'

describe('LEX-01 beseffen', () => {
  it('removes the reflexive pronoun', () =>
    expectFlags(beseffen, [
      ['Ik besef me dat het laat is.', 'besef me', 'besef'],
      ['Hij beseft zich niet hoe laat het is.', 'beseft zich', 'beseft'],
      ['Nu besef ik me dat het waar is.', 'besef ik me', 'besef ik'],
    ]))
  it('leaves non-reflexive uses alone', () =>
    expectClean(beseffen, ['Ik besef dat ik te laat ben, maar de trein had vertraging.', 'Besef je dat het laat is?', 'Ik realiseer me dat het laat is.']))
})

describe('LEX-02 mee eens', () => {
  it('flags met … mee eens', () =>
    expectFlags(meeEens, [
      ['Ik ben het met je mee eens.', 'mee eens', 'eens'],
      ['Met dit plan ben ik het mee eens.', 'mee eens', 'eens'],
    ]))
  it('leaves mee eens without met alone', () =>
    expectClean(meeEens, ['Ik ben het er niet mee eens.', 'Daar ben ik het mee eens.', 'Ik ben het helemaal met je eens: dit is een heel mooie dag.']))
})

describe('LEX-03/04/05 kennen, kunnen, weten', () => {
  it('flags ken for kan, ken for weet and weet for ken', () => {
    expectFlags(kunnenKennen, [
      ['Ik ken niet zwemmen.', 'ken', 'kan'],
      ['Hij kent goed zwemmen.', 'kent', 'kan'],
    ])
    expectFlags(wetenKennen, [
      ['Ken je waar hij woont?', 'Ken', 'Weet'],
      ['Ken jij hoe laat het is?', 'Ken', 'Weet'],
      ['Kent u wat ik bedoel?', 'Kent', 'Weet'],
    ])
    expectFlags(wetenPersoon, [
      ['Ik weet hem niet.', 'weet', 'ken'],
      ['Wij weten jou niet.', 'weten', 'kennen'],
    ])
  })
  it('leaves correct kennen/weten alone', () => {
    expectClean(kunnenKennen, ['Ik ken het eten hier niet.', 'Ik ken mensen die dat doen.', 'Ik kan niet zwemmen.'])
    expectClean(wetenKennen, ['Ken je dat liedje?', 'Ik ken je wat beter dan hij.', 'Ken je wat Duits?', 'Weet je waar hij woont?'])
    expectClean(wetenPersoon, ['Ik ken hem niet, maar ik weet wel waar hij woont.', 'Ik weet hem te vinden.', 'Ik weet haar adres niet.', 'Weet je het nog?'])
  })
})

describe('LEX-06 liggen/leggen', () => {
  it('flags leggen/zetten without an object', () =>
    expectFlags(liggenLeggen, [
      ['Ik ga even leggen.', 'leggen', 'liggen'],
      ['Ga lekker zetten.', 'zetten', 'zitten'],
    ]))
  it('leaves transitive uses alone', () =>
    expectClean(liggenLeggen, ['Ik ga het even leggen.', 'Waar ga je dat leggen?', 'Ik ga thee zetten.', 'Ik zet de vaas op de tafel en ga daarna even op de bank liggen.']))
})

describe('LEX-07/08/09 style hints (strict)', () => {
  it('hints heel, van wie and zoals', () => {
    expectFlags(heelHele, [['Het was een hele mooie dag.', 'hele', 'heel']])
    expectFlags(wieZn, [["Wie z'n jas is dit?", "Wie z'n", 'Wiens']])
    expectFlags(zoalsHoe, [['Ik doe het zoals hoe mijn moeder het deed.', 'zoals hoe', 'zoals']])
  })
  it('leaves heel and the whole-reading alone', () => {
    expectClean(heelHele, ['Het was een heel mooie dag.', 'De hele mooie stad was leeg.', 'Ik heb het hele jaar gewerkt.'])
    expectClean(wieZn, ['Wie zijn de winnaars?', 'Van wie is deze jas?'])
  })
})
