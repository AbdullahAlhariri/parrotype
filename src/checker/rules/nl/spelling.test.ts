import { describe, it } from 'vitest'
import { expectClean, expectFlags } from '../../test-utils/expect'
import { nlDict } from '../../test-utils/nlDict'
import {
  apostrophePlural,
  apostropheWords,
  beideBeiden,
  commonMisspelling,
  enigste,
  ervanAf,
  igLijk,
  ligtLicht,
  lijdtLeidt,
  noTrema,
  perSe,
  reistRijst,
  teAllenTijde,
  teVeel,
  trema,
  tussenN,
  twoWords,
  zeiZij,
  zoN,
} from './spelling'

const dict = nlDict()

describe('SP-01 common misspellings', () => {
  it('fixes frequent non-words, keeping case', () =>
    expectFlags(commonMisspelling, [
      ['Ik ben eigelijk moe.', 'eigelijk', 'eigenlijk'],
      ['Eigelijk wel.', 'Eigelijk', 'Eigenlijk'],
      ['Dat is sowiso goed.', 'sowiso', 'sowieso'],
      ['Ik heb het aleen gedaan.', 'aleen', 'alleen'],
      ['Het was heel interresant.', 'interresant', 'interessant'],
      ['Dat doe ik zo wie zo.', 'zo wie zo', 'sowieso'],
      ['Mischien kom ik.', 'Mischien', 'Misschien'],
    ]))
  it('leaves correct words alone', () => expectClean(commonMisspelling, ['Eigenlijk wil ik niet per se winnen, maar ik doe sowieso mee.', 'Ik ben alleen.']))
})

describe('SP-03/19 two words', () => {
  it('splits words that belong apart', () =>
    expectFlags(twoWords, [
      ['Opzich is het goed.', 'Opzich', 'Op zich'],
      ['Ik heb nogsteeds honger.', 'nogsteeds', 'nog steeds'],
      ['Ik ookal niet.', 'ookal', 'ook al'],
      ['Hij komt zometeen.', 'zometeen', 'zo meteen'],
    ]))
  it('leaves the split forms alone', () => expectClean(twoWords, ['Op zich is het goed.', 'Ik heb nog steeds honger.']))
})

describe('SP-07/08 trema', () => {
  it('adds a missing trema', () => {
    expectFlags(trema, [
      ['Mijn ideeen zijn goed.', 'ideeen', 'ideeën'],
      ['We gaan naar Belgie.', 'Belgie', 'België'],
      ['Ik weet uberhaupt niet wat je bedoelt.', 'uberhaupt', 'überhaupt'],
      ['De reunie is morgen.', 'reunie', 'reünie'],
    ])
    expectFlags(trema, [['Hij is naief.', 'naief', 'naïef']], { dict })
  })
  it('removes a trema that is not needed', () => {
    expectFlags(noTrema, [['Dat is financiëel lastig.', 'financiëel', 'financieel']])
    expectFlags(noTrema, [['Een officiëel bericht.', 'officiëel', 'officieel']], { dict })
  })
  it('leaves correct spellings and names alone', () => {
    expectClean(trema, ['Mijn ideeën over de coördinatie van het project.', 'We zijn in België geweest.', 'Ik sprak met Michael en Noel.'], { dict })
    expectClean(noTrema, ['Dat is financieel lastig.', 'Hij is naïef.'], { dict })
  })
})

describe('SP-11/12 apostrophes', () => {
  it("fixes 's avonds, z'n and m'n", () =>
    expectFlags(apostropheWords, [
      ["Ik zie je s'avonds.", "s'avonds", "'s avonds"],
      ['Ik zie je s avonds.', 's avonds', "'s avonds"],
      ['Ik werk savonds.', 'savonds', "'s avonds"],
      ['Hij heeft zn tas vergeten.', 'zn', "z'n"],
      ['Waar is mn telefoon?', 'mn', "m'n"],
    ]))
  it('leaves correct forms alone', () => expectClean(apostropheWords, ["Ik ga 's avonds hardlopen.", "Hij heeft z'n tas.", "’s Morgens drink ik koffie."]))
})

describe('TUSN-01 tussen-n', () => {
  it('fixes the linking letter', () => {
    expectFlags(tussenN, [['Ik eet graag pannekoeken.', 'pannekoeken', 'pannenkoeken']])
    expectFlags(tussenN, [['Een mooie zonnenbloem.', 'zonnenbloem', 'zonnebloem']])
    expectFlags(tussenN, [['Het hondehok is leeg.', 'hondehok', 'hondenhok']], { dict })
  })
  it('leaves correct compounds alone', () => expectClean(tussenN, ['Ik houd van pannenkoeken.', 'Een zonnebloem en een boekenkast.'], { dict }))
})

describe('SP-13 -ig / -lijk', () => {
  it('fixes sound spellings', () => {
    expectFlags(igLijk, [
      ['Ik ben gelukkich.', 'gelukkich', 'gelukkig'],
      ['Het is natuurluk waar.', 'natuurluk', 'natuurlijk'],
    ])
    expectFlags(igLijk, [['Wat een prachtiche dag.', 'prachtiche', 'prachtige']], { dict })
  })
  it('leaves real -ich words alone', () => expectClean(igLijk, ['Ik eet een sandwich in Zürich.', 'Ik ben gelukkig.'], { dict }))
})

describe('SP-02/04 fixed phrases', () => {
  it('fixes per se and te allen tijde', () => {
    expectFlags(perSe, [['Ik wil perse winnen.', 'perse', 'per se']])
    expectFlags(teAllenTijde, [
      ['Je moet ten alle tijden opletten.', 'ten alle tijden', 'te allen tijde'],
      ['Ten allen tijde blijven.', 'Ten allen tijde', 'Te allen tijde'],
    ])
  })
  it('leaves ter perse and the correct phrase alone', () => {
    expectClean(perSe, ['Het boek gaat ter perse.', 'Ik wil niet per se winnen.'])
    expectClean(teAllenTijde, ['Het enige wat ik wil, is dat iedereen te allen tijde veilig is.'])
  })
})

describe('SP-05/06 enige, beide', () => {
  it('flags enigste and beiden + noun', () => {
    expectFlags(enigste, [['Dit is de enigste kans.', 'enigste', 'enige']])
    expectFlags(beideBeiden, [
      ['Beiden kinderen zijn ziek.', 'Beiden', 'Beide'],
      ['Ik ken beiden broers.', 'beiden', 'beide'],
    ])
  })
  it('leaves correct uses alone', () => {
    expectClean(enigste, ['Dit is de enige kans.', 'Wat een enig jurkje heb je!'])
    expectClean(beideBeiden, ['Ze komen beiden.', 'Ze zijn beiden gekomen.', 'We gaan beiden werken.', 'Ze gaan beiden spelen.', 'Beide kinderen waren ziek.'])
  })
})

describe('SP-09/10 plural apostrophes', () => {
  it("fixes -'s after consonants and missing 's after vowels", () => {
    expectFlags(apostrophePlural, [
      ["Ik heb twee computer's.", "computer's", 'computers'],
      ['Ik heb twee autos.', 'autos', "auto's"],
      ['De babys slapen.', 'babys', "baby's"],
    ])
    expectFlags(apostrophePlural, [['Ik zag drie menus.', 'menus', "menu's"]], { dict })
  })
  it('leaves correct plurals and abbreviations alone', () =>
    expectClean(apostrophePlural, ["De auto's van mijn ooms.", "Ik heb twee cd's en drie tv's.", 'De cafés zijn duur.', "McDonald's is druk.", 'Hij heeft de crisis overleefd.'], { dict }))
})

describe("SP-12 zo'n", () => {
  it('flags zon before an adjective or noun', () => expectFlags(zoN, [['Het was zon mooie dag.', 'zon', "zo'n"]]))
  it('leaves the sun alone', () => expectClean(zoN, ['De zon schijnt.', 'In de zon zitten is fijn.', 'Ik hou van zon en zee.']))
})

describe('SP-14..17 real-word mix-ups', () => {
  it('flags zei/zij, reist/rijst, lijdt/leidt, ligt/licht', () => {
    expectFlags(zeiZij, [
      ['Hij zij dat het klopte.', 'zij', 'zei'],
      ['Zei is ziek.', 'Zei', 'Zij'],
    ])
    expectFlags(reistRijst, [
      ['Hij rijst naar Spanje.', 'rijst', 'reist'],
      ['Ik eet reist met kip.', 'reist', 'rijst'],
    ])
    expectFlags(lijdtLeidt, [
      ['Hij leidt aan hoofdpijn.', 'leidt', 'lijdt'],
      ['Dit lijdt tot problemen.', 'lijdt', 'leidt'],
    ])
    expectFlags(ligtLicht, [['Het boek licht op tafel.', 'licht', 'ligt']])
  })
  it('leaves correct uses alone', () => {
    expectClean(zeiZij, ['Hij zei dat hij moe was.', 'Het zij zo.', 'Hij of zij moet het doen.', 'Zei hij dat echt?', 'Zij zegt dat het klopt.'])
    expectClean(reistRijst, ['Het deeg rijst in de oven.', 'De vraag rijst of dat klopt.', 'Hij reist veel.', 'Ik eet graag rijst.'])
    expectClean(lijdtLeidt, ['Zij lijdt al jaren aan migraine, maar ze leidt toch haar eigen bedrijf.', 'Hij woont in Leiden aan de gracht.'])
    expectClean(ligtLicht, ['Het licht in de kamer is uit.', 'Zijn gezicht licht op als hij lacht.', 'Het is licht in de kamer.'])
  })
})

describe('SP-18/20 te veel, ervan af', () => {
  it('flags teveel and er van af', () => {
    expectFlags(teVeel, [['Ik heb teveel gegeten.', 'teveel', 'te veel']])
    expectFlags(ervanAf, [['Ik ben er van af.', 'er van', 'ervan']])
  })
  it('leaves the noun and correct forms alone', () => {
    expectClean(teVeel, ['Er is een teveel aan suiker.', 'Ik heb te veel gegeten.'])
    expectClean(ervanAf, ['Ik ben ervan af.', 'Er van de tien kwam er één.'])
  })
})
