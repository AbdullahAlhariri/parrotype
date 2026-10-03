import { describe, it } from 'vitest'
import { expectClean, expectFlags } from '../../test-utils/expect'
import { doubleNegation, nietEen, verbFinal, verbSecond } from './wordorder'

describe('WO-01 verb second', () => {
  it('flags subject before verb after a fronted adverb', () =>
    expectFlags(verbSecond, [
      ['Morgen ik ga naar school.', 'ik ga', 'ga ik'],
      ['Gisteren hij was ziek.', 'hij was', 'was hij'],
      ['Volgende week we gaan op vakantie.', 'we gaan', 'gaan we'],
      ['Natuurlijk ik kom.', 'ik kom', 'kom ik'],
      ['Misschien het is morgen klaar.', 'het is', 'is het'],
      ["Mijn collega's zijn aardig maar soms ik begrijp ze niet.", 'ik begrijp', 'begrijp ik'],
    ]))
  it('leaves correct order, commas and subordinators alone', () =>
    expectClean(verbSecond, [
      'Morgen ga ik naar school.',
      'Natuurlijk, ik kom morgen.',
      'Ook ik ben moe.',
      'Nu ik erover nadenk, heb je gelijk.',
      'Toen ik binnenkwam, zat iedereen al aan tafel.',
      'Hier je fiets parkeren is verboden.',
      'Morgen leg ik het pakketje bij de buren neer.',
      'Gisteren fietste ik naar de markt.',
      'Ik was moe, dus ik ging naar bed.',
      'Ik kwam thuis en toen ik binnenkwam, was het stil.',
      'Hij werkt hard en daarom krijgt hij veel.',
    ]))
})

describe('WO-02 verb last in subordinate clauses', () => {
  it('flags the finite verb before the rest of the clause', () =>
    expectFlags(verbFinal, [
      ['Ik blijf thuis omdat ik ben moe.', 'ben moe', 'moe ben'],
      ['Hij zegt dat hij heeft een auto.', 'heeft een auto', 'een auto heeft'],
      ['Ik weet dat het is zo.', 'is zo', 'zo is'],
      ['Ik bel je als ik ben thuis.', 'ben thuis', 'thuis ben'],
    ]))
  it('allows verb clusters, extraposed phrases and inversion', () =>
    expectClean(verbFinal, [
      'Omdat ik moe ben, ga ik vroeg naar bed.',
      'Omdat ik heb gewerkt, ben ik moe.',
      'Omdat ik ben gaan zwemmen, heb ik honger.',
      'Ik weet dat hij wacht op de bus.',
      'Net als jij heb ik honger.',
      'Zo groot als ik ben, pas ik er niet in.',
      'Omdat ze zijn fiets kwijt is, loopt ze.',
      'Het boek dat ik heb gekocht, is mooi.',
      'Als je wilt, kun je blijven.',
      'Hij heeft gezegd dat hij wordt opgehaald.',
      'Ik weet dat het is betaald.',
    ]))
})

describe('WO-03 negation', () => {
  it('flags double negation', () =>
    expectFlags(doubleNegation, [
      ['Ik heb niet geen tijd.', 'niet geen', 'geen'],
      ['Ik heb nooit geen geld.', 'nooit geen', 'nooit'],
    ]))
  it('hints geen for niet een in strict mode', () => expectFlags(nietEen, [['Ik heb niet een auto.', 'niet een', 'geen']]))
  it('leaves single negation alone', () => {
    expectClean(doubleNegation, ['Ik heb geen tijd.', 'Ik heb nooit tijd.'])
    expectClean(nietEen, ['Het is niet een maar twee keer gebeurd.'])
  })
})
