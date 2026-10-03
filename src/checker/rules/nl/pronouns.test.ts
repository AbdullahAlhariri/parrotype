import { describe, it } from 'vitest'
import { expectClean, expectFlags } from '../../test-utils/expect'
import { alsIkJou, hunSubject, jouwJou, meMijn, uUw } from './pronouns'

describe('PRN-01 hun as subject', () => {
  it('flags hun + verb', () =>
    expectFlags(hunSubject, [
      ['Hun hebben gewonnen.', 'Hun', 'Zij'],
      ['Ik denk dat hun gaan verhuizen.', 'hun', 'zij'],
      ['Ze kwamen binnen en hun waren moe.', 'hun', 'zij'],
      ['Hun praten heel snel.', 'Hun', 'Zij'],
    ]))
  it('leaves possessive and object hun alone', () =>
    expectClean(hunSubject, [
      'Hun huis is groot.',
      'Ik geef hun een boek.',
      'Zij hebben hun huiswerk vergeten, dus de leraar heeft hun een extra opdracht gegeven.',
      'Hun hebben ze niets gegeven.',
      'Hun werken hangen in het museum.',
    ]))
})

describe('PRN-02 me/mijn', () => {
  it('flags me before a noun at the start or after a preposition', () =>
    expectFlags(meMijn, [
      ['Ik ga naar me moeder.', 'me', 'mijn'],
      ['Me broer is ziek.', 'Me', 'Mijn'],
      ['Hij woont bij me oom.', 'me', 'mijn'],
    ]))
  it('leaves me as an object alone', () =>
    expectClean(meMijn, [
      'Hij gaf me boeken.',
      'Ze heeft voor me koffie gezet.',
      'Hij komt naar me toe.',
      'Kun jij me vertellen waar mijn tas ligt?',
      'Ik ga naar mijn moeder.',
    ]))
})

describe('PRN-03/04 jou/jouw', () => {
  it('flags jouw without a noun and jou before a noun', () =>
    expectFlags(jouwJou, [
      ['Dit cadeau is voor jouw.', 'jouw', 'jou'],
      ['Is dit van jouw?', 'jouw', 'jou'],
      ['Ik denk aan jouw', 'jouw', 'jou'],
      ['Ik ga met jou fiets.', 'jou', 'jouw'],
    ]))
  it('leaves correct jou/jouw alone', () =>
    expectClean(jouwJou, [
      'Dit is jouw boek.',
      'Is dit jouw boek of mijn boek?',
      'Jouw en mijn ouders kennen elkaar.',
      'Ik heb het voor jou gekocht.',
      'Ik heb voor jou koffie gezet.',
      'Ik ga met jou mee.',
      'Ik denk aan jou, schat.',
      'Jouw, mijn en zijn boeken liggen hier.',
      'Wat is jouw voor- en achternaam?',
    ]))
})

describe('PRN-05 u/uw', () => {
  it('flags u before a noun and uw on its own', () =>
    expectFlags(uUw, [
      ['Bedankt voor u bericht.', 'u', 'uw'],
      ['Dank voor u begrip.', 'u', 'uw'],
      ['Is dit uw?', 'uw', 'u'],
      ['Ik kom met u auto.', 'u', 'uw'],
    ]))
  it('leaves correct u/uw alone', () =>
    expectClean(uUw, ['Bedankt voor uw bericht.', 'Ik heb begrip voor u.', 'Dit is voor u.', 'Ik heb voor u koffie gezet.', 'Hoe kan ik u helpen?']))
})

describe('PRN-06 als ik jou was', () => {
  it('flags jij in the fixed phrase', () => expectFlags(alsIkJou, [['Als ik jij was, zou ik gaan.', 'jij', 'jou']]))
  it('leaves the correct phrase alone', () => expectClean(alsIkJou, ['Als ik jou was, zou ik gaan.', 'Als jij wilt, kom ik.']))
})
