import { describe, it } from 'vitest'
import { expectClean, expectFlags } from '../../test-utils/expect'
import {
  bentJe,
  hijHoudt,
  hijStemT,
  ikPlural,
  ikStem,
  invertedIk,
  invertedJe,
  invertedJij,
  jijBent,
  jijT,
  pastDt,
  stemT,
  uIs,
  uT,
  wijPlural,
} from './dt'

describe('DT-01 ik + stem', () => {
  it('flags a t after ik', () =>
    expectFlags(ikStem, [
      ['Ik wordt boos.', 'wordt', 'word'],
      ['Ik vindt het leuk.', 'vindt', 'vind'],
      ['Weet jij wat ik vindt?', 'vindt', 'vind'],
      ['Ik antwoordt meteen.', 'antwoordt', 'antwoord'],
      ['Ik houdt van jou.', 'houdt', 'houd'],
      ['Ik heeft geen tijd.', 'heeft', 'heb'],
      ['Ik gaat naar huis.', 'gaat', 'ga'],
      ['IK WORDT BOOS.', 'WORDT', 'WORD'],
    ]))
  it('leaves correct and non-subject ik alone', () =>
    expectClean(ikStem, [
      'Ik word boos.',
      'Ik hou van je.',
      'Ik houd van je.',
      'Ik weet het niet.',
      'Ik zit hier.',
      'Het ik wordt sterker.',
      'Jan en ik gaan samen.',
      'Ik, wordt dat niet te veel?',
      'omdat ik rijst eet',
    ]))
})

describe('DT-02 verb + ik', () => {
  it('flags inverted ik with t', () =>
    expectFlags(invertedIk, [
      ['Vindt ik dat leuk?', 'Vindt', 'Vind'],
      ['Dat wordt ik niet.', 'wordt', 'word'],
      ['Morgen gaat ik naar huis.', 'gaat', 'ga'],
    ]))
  it('leaves correct inversion alone', () =>
    expectClean(invertedIk, ['Vind ik dat leuk?', 'Dat word ik niet.', 'Wat hij vindt, weet ik niet.', 'Wat hij vindt ik niet leuk.']))
})

describe('DT-03 hij/zij/het + stem + t', () => {
  it('flags a missing t', () =>
    expectFlags(hijStemT, [
      ['Hij vind het leuk.', 'vind', 'vindt'],
      ['Zij word morgen tien.', 'word', 'wordt'],
      ['Het word steeds kouder.', 'word', 'wordt'],
      ['Hij antwoord niet.', 'antwoord', 'antwoordt'],
      ['Hij hou van voetbal.', 'hou', 'houdt'],
      ['Hij rij elke dag naar Parijs.', 'rij', 'rijdt'],
      ['Wat vind hij ervan?', 'vind', 'vindt'],
      ['Iemand red de kat.', 'red', 'redt'],
      ['Er word gelachen.', 'word', 'wordt'],
    ]))
  it('handles objects, determiners, inversion and verb-final clauses', () =>
    expectClean(hijStemT, [
      'Hij vindt het leuk.',
      'Als ik het red, ben ik blij.',
      'Ik weet niet of ik het vind.',
      'Het antwoord is goed.',
      'Het land is mooi.',
      'Dat geld is van mij.',
      'Die hoed staat je goed.',
      'Dat vind ik leuk.',
      'Wat vind je ervan?',
      'Wat word je later?',
      'Die vind jij toch ook mooi?',
      'Omdat hij antwoord gaf, was ik blij.',
      'Omdat zij bloed verloor, ging ze weg.',
      'Is hij bereid om te helpen?',
      'Die rij is erg lang.',
      'Hij zei: het wordt een mooie dag.',
    ]))
})

describe('agreement: hij/jij + verb form', () => {
  it('flags the ik-form after hij/jij', () =>
    expectFlags(stemT, [
      ['Hij ga naar huis.', 'ga', 'gaat'],
      ['Jij kom morgen toch?', 'kom', 'komt'],
      ['Zij loop elke dag.', 'loop', 'loopt'],
      ['Hij ben ziek.', 'ben', 'is'],
    ]))
  it('skips homographs and verb-final clauses', () =>
    expectClean(stemT, [
      'Hij gaat naar huis.',
      'omdat hij werk heeft',
      'omdat hij pas laat kwam',
      'Hij was moe.',
      'Jij kan het.',
      'Jij wil koffie.',
      'Jij ben laat.',
    ]))
})

describe('DT-04 jij + stem + t', () => {
  it('flags jij/je before the verb without t', () =>
    expectFlags(jijT, [
      ['Jij word later dokter.', 'word', 'wordt'],
      ['Je vind het vast leuk.', 'vind', 'vindt'],
      ['Als je word opgehaald, bel me.', 'word', 'wordt'],
      ['Jij hou toch van kaas?', 'hou', 'houdt'],
    ]))
  it('leaves inversion, possessive je and objects alone', () =>
    expectClean(jijT, [
      'Jij wordt later dokter.',
      'Word je morgen opgehaald?',
      'Je antwoord is goed.',
      'Je geld ligt op tafel.',
      'Ik zie dat je je kamer opruimt.',
      'Omdat ik je vind, ben ik blij.',
    ]))
})

describe('DT-09 jij bent / jij hebt', () => {
  it('flags ben/heb after jij', () =>
    expectFlags(jijBent, [
      ['Jij ben te laat.', 'ben', 'bent'],
      ['Je heb gelijk.', 'heb', 'hebt'],
      ['Als jij ben, ...', 'ben', 'bent'],
    ]))
  it('never flags kan/kunt, wil/wilt or objects', () =>
    expectClean(jijBent, [
      'Jij bent te laat.',
      'Jij kan het.',
      'Jij kunt het.',
      'Jij wil thee.',
      'Jij wilt thee.',
      'Ben je klaar?',
      'Omdat ik je heb geholpen, ben ik moe.',
    ]))
})

describe('DT-05 verb + jij', () => {
  it('flags a t before jij', () =>
    expectFlags(invertedJij, [
      ['Wordt jij ook moe?', 'Wordt', 'Word'],
      ['Vindt jij het leuk?', 'Vindt', 'Vind'],
      ['Morgen gaat jij naar school.', 'gaat', 'ga'],
    ]))
  it('leaves correct forms alone', () => expectClean(invertedJij, ['Word jij ook moe?', 'Vind jij het ook raar?', 'Kun jij me helpen?']))
})

describe('DT-06 verb + je', () => {
  it('flags wordt/vindt je when je is the subject', () =>
    expectFlags(invertedJe, [
      ['Wordt je morgen opgehaald?', 'Wordt', 'Word'],
      ['Hoe vindt je het?', 'vindt', 'vind'],
      ['Vindt je dat leuk?', 'Vindt', 'Vind'],
      ['Morgen wordt je opgehaald.', 'wordt', 'word'],
    ]))
  it('skips possessive je and je = "to you"', () =>
    expectClean(invertedJe, [
      'Wordt je broer ook opgehaald?',
      'Word je morgen ook om zeven uur opgehaald, of wordt je zus eerst gebracht?',
      'Wordt je dat verteld?',
      'Wat wordt je gevraagd?',
      'Wordt je ook verteld dat het laat is?',
      'Het wordt je nu duidelijk.',
      'Vindt je moeder het goed?',
    ]))
})

describe('DT-07 u + t', () => {
  it('flags a missing t with u', () =>
    expectFlags(uT, [
      ['Word u al geholpen?', 'Word', 'Wordt'],
      ['Vind u het goed?', 'Vind', 'Vindt'],
      ['U vind het vast leuk.', 'vind', 'vindt'],
      ['Ben u klaar?', 'Ben', 'Bent'],
      ['Kom u ook?', 'Kom', 'Komt'],
    ]))
  it('leaves u as object and uw-mistakes alone', () =>
    expectClean(uT, [
      'Wordt u al geholpen?',
      'Ik vind u erg aardig.',
      'Ik heb u gisteren gezien.',
      'Mag ik u iets vragen?',
      'Als ik u vind, bel ik.',
      'Bedankt voor u antwoord.',
      'U hebt gelijk.',
      'U heeft gelijk.',
      'U kan het.',
    ]))
})

describe('DT-08 ben je / heb je', () => {
  it('flags bent/hebt/kunt before je/jij', () =>
    expectFlags(bentJe, [
      ['Bent je klaar?', 'Bent', 'Ben'],
      ['Hebt je honger?', 'Hebt', 'Heb'],
      ['Kunt jij me helpen?', 'Kunt', 'Kun'],
      ['Wilt je thee?', 'Wilt', 'Wil'],
    ]))
  it('leaves possessive je after a subject alone', () =>
    expectClean(bentJe, ['Ben je klaar?', 'Jij hebt je huiswerk gemaakt.', 'Je bent je sleutels kwijt.', 'Hebt u je gezien?']))
})

describe('DT-10 no dt in the past', () => {
  it('flags past tense + t', () =>
    expectFlags(pastDt, [
      ['Hij werdt boos.', 'werdt', 'werd'],
      ['Zij vondt het leuk.', 'vondt', 'vond'],
      ['Hij hieldt van haar.', 'hieldt', 'hield'],
    ]))
  it('allows archaic gij and present doodt', () => expectClean(pastDt, ['Gij vondt het schoon.', 'Hij doodt de tijd.', 'Hij werd boos.']))
})

describe('DT-11 hij houdt / rijdt', () => {
  it('flags hout van / rijt naar', () =>
    expectFlags(hijHoudt, [
      ['Hij hout van voetbal.', 'hout', 'houdt'],
      ['Zij rijt naar Parijs.', 'rijt', 'rijdt'],
    ]))
  it('leaves wood and tearing alone', () => expectClean(hijHoudt, ['Het hout is nat.', 'Hij rijt de brief open.', 'Hij houdt van voetbal.']))
})

describe('AGR-01 wij + plural', () => {
  it('flags a singular verb after wij/we', () =>
    expectFlags(wijPlural, [
      ['Wij gaat naar huis.', 'gaat', 'gaan'],
      ['We heeft een hond.', 'heeft', 'hebben'],
      ['We ga morgen.', 'ga', 'gaan'],
    ]))
  it('leaves plural and inversion alone', () =>
    expectClean(wijPlural, ['Wij gaan naar huis.', 'Gaan we morgen?', 'omdat we laat zijn', 'Ik zag dat we rust nodig hebben.']))
})

describe('AGR-02 ik + ik-form', () => {
  it('flags a plural verb after sentence-initial ik', () =>
    expectFlags(ikPlural, [
      ['Ik hebben honger.', 'hebben', 'heb'],
      ['Ik zijn moe.', 'zijn', 'ben'],
    ]))
  it('leaves coordination and verb clusters alone', () =>
    expectClean(ikPlural, ['Jan en ik hebben honger.', 'Zij en ik zijn moe.', 'omdat ik zwemmen kan', 'Ik heb honger.']))
})

describe('AGR-03 u bent', () => {
  it('flags u is', () => expectFlags(uIs, [['U is van harte welkom.', 'is', 'bent']]))
  it('leaves u as indirect object alone', () =>
    expectClean(uIs, ['U bent van harte welkom.', 'Wat is u overkomen?', 'Het is u opgevallen.', 'Dit is voor u.']))
})
