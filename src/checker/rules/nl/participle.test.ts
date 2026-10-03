import { describe, it } from 'vitest'
import { expectClean, expectFlags } from '../../test-utils/expect'
import { auxParticiple, ditBetekent, dstemParticiple, pronounParticiple, whatHappens, zijnVerb } from './participle'

describe('PART-01 participle after an auxiliary', () => {
  it('flags -t where the participle needs -d', () =>
    expectFlags(auxParticiple, [
      ['Wat is er gebeurt?', 'gebeurt', 'gebeurd'],
      ['Ze heeft de tekst verbetert.', 'verbetert', 'verbeterd'],
      ['De rekening is al betaalt.', 'betaalt', 'betaald'],
      ['Ik heb het hem beloofd, maar hij heeft het niet gelooft.', 'gelooft', 'geloofd'],
      ['Wat heeft dit betekent?', 'betekent', 'betekend'],
      ['Ze zijn vorig jaar verhuist.', 'verhuist', 'verhuisd'],
      ['Ik weet dat het al betaalt is.', 'betaalt', 'betaald'],
    ]))
  it('leaves present tense in other clauses alone', () =>
    expectClean(auxParticiple, [
      'Wat er gisteren is gebeurd, gebeurt hopelijk nooit meer.',
      'Hij heeft gezegd dat het gebeurt.',
      'Het is een systeem dat goed betaalt.',
      'Ik heb geen idee wat het betekent.',
      'Ik ben blij met hoe het verandert.',
      'Ik ben benieuwd of het verandert.',
      'Hij is degene die altijd betaalt.',
      'Zijn moeder verhuist volgende week.',
      'Het is gebeurd en het gebeurt nooit meer.',
      'Ze heeft haar tekst drie keer verbeterd en nu verbetert ze die van haar broer.',
      'Is het waar dat hij verhuist?',
    ]))
})

describe('PART-05 participle of a d-stem verb', () => {
  it('flags dt where the participle ends in d', () =>
    expectFlags(dstemParticiple, [
      ['Hij heeft de vraag beantwoordt.', 'beantwoordt', 'beantwoord'],
      ['Het nieuws is snel verspreidt.', 'verspreidt', 'verspreid'],
    ]))
  it('leaves present tense alone', () =>
    expectClean(dstemParticiple, [
      'De docent beantwoordt nu de vragen die hij vorige week niet heeft beantwoord.',
      'Het nieuws dat de minister heeft verspreid, verspreidt zich razendsnel.',
    ]))
})

describe('PART-02 present tense, not participle', () => {
  it('flags a participle right after a subject without auxiliary', () =>
    expectFlags(pronounParticiple, [
      ['Het gebeurd vaak.', 'gebeurd', 'gebeurt'],
      ['Hij verteld een verhaal.', 'verteld', 'vertelt'],
      ['Dat bepaald de prijs.', 'bepaald', 'bepaalt'],
      ['Dit betekend dat we moeten gaan.', 'betekend', 'betekent'],
      ['Ik kom morgen en hij betaald de rekening.', 'betaald', 'betaalt'],
      ['Zij beantwoord de vraag.', 'beantwoord', 'beantwoordt'],
    ]))
  it('leaves questions, verb-final clauses and adjectival participles alone', () =>
    expectClean(pronounParticiple, [
      'Is het gebeurd?',
      'Heb je het verbeterd?',
      'Ik weet dat het gebeurd is.',
      'Terwijl hij verbaasd opkeek, liep zij weg.',
      'Omdat ze beledigd wegliep, bleef hij achter.',
      'Ik vind het verbeterd.',
      'Het verteld verhaal was mooi.',
      'Het moet nog betaald worden.',
      'Het boek dat bewaard bleef, is oud.',
      'Hij leek verbaasd.',
    ]))
})

describe('PART-03 wat gebeurt er', () => {
  it('flags a participle after a question word', () =>
    expectFlags(whatHappens, [
      ['Wat gebeurd er?', 'gebeurd', 'gebeurt'],
      ['Wie betaald er vandaag?', 'betaald', 'betaalt'],
    ]))
  it('leaves participles with an auxiliary alone', () =>
    expectClean(whatHappens, ['Wat is er gebeurd?', 'Ik weet niet wat er gebeurd is.', 'Wat gebeurt er?']))
})

describe('PART-04 dit betekent', () => {
  it('flags betekend after dit/dat', () =>
    expectFlags(ditBetekent, [
      ['Dit betekend dat we moeten gaan.', 'betekend', 'betekent'],
      ['Ja, en dat betekend niet veel.', 'betekend', 'betekent'],
    ]))
  it('leaves the participle alone', () => expectClean(ditBetekent, ['Wat heeft dat betekend?', 'Dat heeft veel voor mij betekend.']))
})

describe('AUX-01 zijn-verbs', () => {
  it('flags hebben with gaan/komen/blijven/worden...', () =>
    expectFlags(zijnVerb, [
      ['Ik heb naar huis gegaan.', 'heb', 'ben'],
      ['Hij heeft gisteren overleden.', 'heeft', 'is'],
      ['We hebben thuis gebleven.', 'hebben', 'zijn'],
      ['Het heeft niet gebeurd.', 'heeft', 'is'],
      ['Ze hadden ziek geweest.', 'hadden', 'waren'],
      ['Ik denk dat hij gekomen had.', 'had', 'was'],
    ]))
  it('leaves zijn, adjectival participles and other clauses alone', () =>
    expectClean(zijnVerb, [
      'Ik ben naar huis gegaan.',
      'Ik heb het verdwenen geld gevonden.',
      'Ik heb het gevoel opnieuw geboren te zijn.',
      'Ik had geen idee wat er gebeurd was.',
      'Ik heb een boek dat verdwenen is.',
      'Ik heb hem zien gaan.',
      'Zij zijn vorige zomer naar Marokko gegaan en zijn daar drie weken gebleven.',
    ]))
})

describe('participle rules: auxiliary before a pronoun subject', () => {
  it('does not flag "Wat heeft dit betekend?"', () => {
    expectClean(pronounParticiple, ['Wat heeft dit betekend?', 'Waarom is dat veranderd?'])
    expectClean(ditBetekent, ['Wat heeft dit betekend?'])
  })
})
