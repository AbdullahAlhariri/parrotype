import { describe, it } from 'vitest'
import { expectClean, expectFlags } from '../../test-utils/expect'
import { nlDict } from '../../test-utils/nlDict'
import { allesWat, deHet, dezeDit, eenGroot, hetDe, hetDie, hetGrote, hetWat, onzeOns } from './articles'

const dict = nlDict()

describe('ART-01 de + het-word', () => {
  it('flags de before a het-word', () =>
    expectFlags(deHet, [
      ['Ik woon in de huis.', 'de', 'het'],
      ['De meisje is lief.', 'De', 'Het'],
      ['Ik heb de geld niet.', 'de', 'het'],
      ['Waar is de boek?', 'de', 'het'],
      ['Ik zag de huisje aan het water.', 'de', 'het'],
    ]))
  it('leaves de-words, plurals, names and compounds alone', () => {
    expectClean(deHet, [
      'Ik woon in het huis.',
      'De meisjes spelen buiten.',
      'Jan de Vries komt ook.',
      'Hij is weer op de been.',
      'De verleden tijd is lastig.',
      'De licht blauwe jas.',
      'Ik zag de Kind en Gezin folder.',
      'Ik heb de huis deur geverfd.',
    ])
    expectClean(deHet, ['De huis deur is rood.'], { dict })
  })
})

describe('ART-02 preposition + het + de-word', () => {
  it('flags het before a de-word after a preposition', () =>
    expectFlags(hetDe, [
      ['Ik woon in het stad.', 'het', 'de'],
      ['Hij zit op het stoel.', 'het', 'de'],
      ['Ik ga met het auto.', 'het', 'de'],
    ]))
  it('leaves pronoun het and het-words alone', () =>
    expectClean(hetDe, ['Ik vind het top.', 'Toch blijft het theorie.', 'Ik woon in het centrum.', 'Ik heb het tijd gegeven.', 'In de stad.']))
})

describe('ART-03/04 deze/onze + het-word', () => {
  it('flags deze/onze before a het-word', () => {
    expectFlags(dezeDit, [
      ['Deze huis is mooi.', 'Deze', 'Dit'],
      ['Ik wil deze mooie boek.', 'deze', 'dit'],
    ])
    expectFlags(onzeOns, [
      ['Onze huis is groot.', 'Onze', 'Ons'],
      ['Onze nieuwe huis is groot.', 'Onze', 'Ons'],
    ])
  })
  it('leaves de-words and pronoun use alone', () => {
    expectClean(dezeDit, ['Deze auto is snel.', 'Dit huis is mooi.', 'Deze begin ik morgen.', 'Deze week ga ik naar huis.'])
    expectClean(onzeOns, ['Onze auto is snel.', 'Ons huis is groot.', 'Onze kinderen spelen.'])
  })
})

describe('REL-01 het-word + dat', () => {
  it('flags die after a het-word', () =>
    expectFlags(hetDie, [
      ['Het meisje die daar loopt is mijn zus.', 'die', 'dat'],
      ['Het boek die ik lees is spannend.', 'die', 'dat'],
      ['Een kind die altijd lacht.', 'die', 'dat'],
      ['Het kleine huisje die Jan kocht.', 'die', 'dat'],
    ]))
  it('leaves commas, demonstratives and de-words alone', () =>
    expectClean(hetDie, [
      'Het meisje dat naast mij woont, heeft een hond die heel hard blaft.',
      'Het kind, die erg verlegen was, zei niets.',
      'Het boek die man gaf, was saai.',
      'De man die daar loopt is mijn oom.',
      'Ik geef het kind die appel.',
    ]))
})

describe('REL-02/03 dat/wat (strict style)', () => {
  it('hints at dat after a het-word and wat after alles', () => {
    expectFlags(hetWat, [['Het boek wat ik lees is goed.', 'wat', 'dat']])
    expectFlags(allesWat, [
      ['Alles dat ik weet, heb ik geleerd.', 'dat', 'wat'],
      ['Het enige dat ik wil, is rust.', 'dat', 'wat'],
    ])
  })
  it('leaves the standard forms alone', () => {
    expectClean(hetWat, ['Het boek dat ik lees is goed.'])
    expectClean(allesWat, ['Alles wat ik weet, heb ik geleerd.', 'Het enige wat ik wil, is dat iedereen veilig is.'])
  })
})

describe('ADJ-01 een groot huis', () => {
  it('flags -e after een/geen before a het-word', () =>
    expectFlags(eenGroot, [
      ['Ik heb een grote huis.', 'grote', 'groot'],
      ['Het is een mooie meisje.', 'mooie', 'mooi'],
      ['Er is geen nieuwe plan.', 'nieuwe', 'nieuw'],
      ["Zo'n leuke spel!", 'leuke', 'leuk'],
    ]))
  it('leaves de-words, plurals and correct forms alone', () =>
    expectClean(eenGroot, [
      'Wij hebben gisteren een groot huis met een mooie tuin gezien.',
      'Een mooi meisje en een lief kind.',
      'Een grote auto.',
      'Een grote huisdeur.',
      'Ik heb een grote huis deur.',
    ]))
})

describe('ADJ-02 het grote huis', () => {
  it('flags a missing -e after de/het/possessives', () =>
    expectFlags(hetGrote, [
      ['Het groot huis is van mij.', 'groot', 'grote'],
      ['De rood auto is snel.', 'rood', 'rode'],
      ['Ik woon in het klein huis.', 'klein', 'kleine'],
      ['Mijn oud fiets is kapot.', 'oud', 'oude'],
    ]))
  it('leaves predicates, pronoun het and fixed phrases alone', () =>
    expectClean(hetGrote, [
      'Het grote huis op de hoek is van een oude dame.',
      'Ik vind het mooi weer vandaag.',
      'Ik vind het groot nieuws.',
      'Hij gaf ons goed advies.',
      'Ik geef hun goed advies.',
      'Ze zijn groot fan van voetbal.',
      'Het oud papier wordt opgehaald.',
      'Ik vind de auto mooi.',
      'De goed opgeleide man.',
    ]))
})
