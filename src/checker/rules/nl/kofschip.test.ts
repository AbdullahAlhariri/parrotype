import { describe, expect, it } from 'vitest'
import { buildContext } from '../../tokenize'
import { expectClean, expectFlags } from '../../test-utils/expect'
import { nlDict } from '../../test-utils/nlDict'
import { KOFSCHIP_FALLBACK, infinitiveGuesses, kofschip, kofschipFix, loanVerb, pastDde } from './kofschip'

const dict = nlDict()

describe("PAST-01/02 't kofschip", () => {
  const cases: Array<[string, string, string]> = [
    ['Ik fietsde naar huis.', 'fietsde', 'fietste'],
    ['Hij heeft daar lang geleeft.', 'geleeft', 'geleefd'],
    ['Ik heb naar huis gefietsd.', 'gefietsd', 'gefietst'],
    ['Ik wachte op de bus.', 'wachte', 'wachtte'],
    ['Hij antwoorde niet.', 'antwoorde', 'antwoordde'],
    ['Ze verhuiste vorig jaar.', 'verhuiste', 'verhuisde'],
    ['Wij leefte daar.', 'leefte', 'leefde'],
    ['Ik werkde hard.', 'werkde', 'werkte'],
  ]
  it('fixes non-word past forms with the dictionary', () => expectFlags(kofschip, cases, { dict }))
  it('fixes the lexicon verbs without a dictionary too', () => expectFlags(kofschip, cases))
  it('does not touch real words, names or ambiguous forms', () =>
    expectClean(
      kofschip,
      [
        'Ik fietste naar huis.',
        'Hij heeft daar lang geleefd.',
        'Ik wachtte een uur op de bus.',
        'Zijn jullie al aan het nieuwe hoofdstuk begonnen, of moeten we nog even wachten?',
        'Het gebeurdt vaak.',
        'Ik sprak met Ahmet.',
        'Het was een late avond.',
      ],
      { dict },
    ))
  it('validates candidates as verb forms', () => {
    const ctx = buildContext('x', 'nl', { dict })
    expect(kofschipFix(ctx, 'fietsde')).toEqual({ right: 'fietste', doubled: false })
    expect(kofschipFix(ctx, 'antwoorde')).toEqual({ right: 'antwoordde', doubled: true })
    expect(kofschipFix(ctx, 'gebiet')).toBeUndefined()
    expect(infinitiveGuesses('leef')).toContain('leven')
    expect(infinitiveGuesses('verhuis')).toContain('verhuizen')
    expect(infinitiveGuesses('stop')).toContain('stoppen')
  })
  it('only lists non-words in the no-dictionary fallback', () => {
    const real = [...KOFSCHIP_FALLBACK.keys()].filter((w) => dict.has(w))
    expect(real).toEqual([])
    for (const { right } of KOFSCHIP_FALLBACK.values()) expect(dict.has(right), right).toBe(true)
  })
})

describe('PAST-03 -dde', () => {
  it('flags the adjective form used as past tense', () =>
    expectFlags(pastDde, [
      ['Ik verbrande mijn hand.', 'verbrande', 'verbrandde'],
      ['Hij verspreide het nieuws.', 'verspreide', 'verspreidde'],
    ]))
  it('leaves the adjective alone', () =>
    expectClean(pastDde, ['De verbrande toast ligt daar.', 'Ik verbrandde mijn hand.', 'omdat ik verbrande lucifers zag']))
})

describe('LOAN-01/02 English verbs', () => {
  it('fixes English-style participles', () =>
    expectFlags(
      loanVerb,
      [
        ['Ik heb de app geupdate.', 'geupdate', 'geüpdatet'],
        ['Ik heb hem geïnterviewed.', 'geïnterviewed', 'geïnterviewd'],
        ['Ze heeft de foto geliked.', 'geliked', 'geliket'],
        ['Ik heb het bestand gedownloaded.', 'gedownloaded', 'gedownload'],
        ['Ik heb het al gechecked.', 'gechecked', 'gecheckt'],
      ],
      { dict },
    ))
  it('works without a dictionary from the lookup table', () => expectFlags(loanVerb, [['Ik heb het gecrashed.', 'gecrashed', 'gecrasht']]))
  it('leaves correct loan participles alone', () =>
    expectClean(loanVerb, ["Ik heb mijn telefoon geüpdatet en alle foto's gedownload.", 'Ze heeft de foto geliket.', 'Het is gerecycled.'], { dict }))
})
