import { describe, it } from 'vitest'
import { expectClean, expectFlags } from '../../test-utils/expect'
import { dayMonth, ikCapital, languageCapital, sentenceCapital } from './capitals'

describe('CAP-01 days and months', () => {
  it('flags capitalised days, months and seasons mid-sentence', () =>
    expectFlags(dayMonth, [
      ['Op Maandag 3 Januari gaan we.', 'Maandag', 'maandag'],
      ['Op Maandag 3 Januari gaan we.', 'Januari', 'januari'],
      ['Ik ben in Mei jarig.', 'Mei', 'mei'],
      ['We gaan in de Zomer naar Spanje.', 'Zomer', 'zomer'],
      ['Het is op 12 Augustus.', 'Augustus', 'augustus'],
    ]))
  it('leaves sentence starts, holidays, names and headings alone', () =>
    expectClean(dayMonth, [
      'Maandag ga ik naar school.',
      'Goede Vrijdag valt dit jaar laat.',
      'Keizer Augustus regeerde lang.',
      'Ik las het boek van Herman Winter.',
      'Datum: Maandag 3 januari',
      'Mijn Zomer In Spanje',
      'Op maandag 3 januari spreken we Nederlands.',
      'MAANDAG IS HET FEEST.',
      'Ik sprak gisteren met Mei over haar werk.',
      'Ik heb April en Juni uitgenodigd.',
    ]))
})

describe('CAP-02 languages and peoples', () => {
  it('flags lowercase language names', () =>
    expectFlags(languageCapital, [
      ['Ik spreek nederlands.', 'nederlands', 'Nederlands'],
      ['Mijn vriend is marokkaans.', 'marokkaans', 'Marokkaans'],
      ['Ik leer engels.', 'engels', 'Engels'],
      ['Een arabische vriend.', 'arabische', 'Arabische'],
      ['Ik woon in nederland sinds 2019.', 'nederland', 'Nederland'],
      ['We gaan naar amsterdam.', 'amsterdam', 'Amsterdam'],
    ]))
  it('leaves capitalised and ambiguous words alone', () =>
    expectClean(languageCapital, ['Ik spreek Nederlands, Engels en Arabisch.', 'Twee engels zongen een lied.', 'Hij eet fries.', 'Alles lag schots en scheef.']))
})

describe('CAP-03 ik mid-sentence', () => {
  it('flags Ik after the first word', () => expectFlags(ikCapital, [['Gisteren ging Ik naar huis.', 'Ik', 'ik']]))
  it('leaves starts, quotes and headings alone', () =>
    expectClean(ikCapital, ['Ik ga naar huis.', 'Hij zei: "Ik kom."', 'Gisteren zei hij: Ik kom.', 'Waar Ik Van Droom', 'Ze zag het. Ik niet.']))
})

describe('CAP-04 sentence start', () => {
  it('flags lowercase sentence starts', () =>
    expectFlags(sentenceCapital, [
      ['ik ga naar huis.', 'ik', 'Ik'],
      ['Ik ga naar huis. daarna eet ik.', 'daarna', 'Daarna'],
      ["Hallo! 's avonds lees ik.", 'avonds', 'Avonds'],
      ['Kom je? ja, ik kom.', 'ja', 'Ja'],
    ]))
  it('leaves abbreviations, ellipses, brands and quotes alone', () =>
    expectClean(sentenceCapital, [
      'Ik ga naar huis.',
      'We kochten appels, peren enz. en gingen naar huis.',
      'Dhr. de Vries kwam ook.',
      'Ik weet het niet... misschien morgen.',
      'iPhone is een merk.',
      '"Kom je ook?" vroeg hij.',
      'Ik las het in het boek van J.K. Rowling.',
      'Het kost 3,50 euro.',
      'www.nu.nl is een site.',
      '3 appels liggen er.',
      'ok',
      'Ik kom eraan\nen dan gaan we',
      '1. appels en peren\n2. melk en brood',
    ]))
})
