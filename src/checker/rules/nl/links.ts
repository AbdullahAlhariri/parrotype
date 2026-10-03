// "Learn more" pages (Taaladvies, Onze Taal and friends), from docs/research/dutch-errors.md.

const TA = 'https://www.vlaanderen.be/team-taaladvies'

export const LINKS = {
  dt: `${TA}/spellingregels/werkwoorden-vervoegen/werkwoorden-vervoegen-1-spelling-van-de-stam-en-de-tegenwoordige-tijd-ott`,
  wordJe: 'https://inburgering.org/nl/d-of-t/word-of-wordt',
  hou: 'https://webwoordenboek.nl/kenniscentrum/hoe-schrijf-je-ik-hou-van-jou',
  hebtU: 'https://webwoordenboek.nl/kenniscentrum/is-het-hebt-u-of-heeft-u',
  kunt: 'https://webwoordenboek.nl/kenniscentrum/is-het-je-kunt-of-je-kan',
  participle: 'https://onzetaal.nl/uploads/editor/Taalmaat_-_betaald_of_betaalt.pdf',
  kofschip: 'https://onzetaal.nl/uploads/editor/Taalmaat_-_t_kofschip.pdf',
  loanVerbs: 'https://onzetaal.nl/taalloket/engelse-werkwoorden',
  dieDat: `${TA}/taaladviezen/die-dat`,
  datWat: `${TA}/taaladviezen/dat-wat`,
  adjective: `${TA}/taaladviezen/het-grote-huis-het-groot-huis`,
  mijMijn: `${TA}/taaladviezen/mij-mijn`,
  uUw: `${TA}/taaladviezen/u-uw`,
  hunHebben: 'https://webwoordenboek.nl/kenniscentrum/is-het-hun-hebben-of-zij-hebben',
  danAls: 'https://webwoordenboek.nl/kenniscentrum/is-het-dan-of-als',
  heel: 'https://webwoordenboek.nl/kenniscentrum/is-het-heel-of-hele',
  capitalsDays: `${TA}/spellingregels/hoofdletters/hoofdletters-09-namen-van-dagen-feestdagen-periodes-en-historische-gebeurtenissen`,
  capitalsLanguages: `${TA}/spellingregels/hoofdletters/hoofdletters-06-namen-van-talen-en-dialecten`,
  capitals: 'https://inburgering.org/nl/grammar/capitals',
  plurals: `${TA}/spellingregels/zelfstandige-naamwoorden/zelfstandige-naamwoorden-2-spelling-van-meervouden`,
  apostrophe: 'https://inburgering.org/nl/grammar/apostrophe',
  compounds: `${TA}/spellingregels/engelse-woorden-aaneenschrijven/engelse-woorden-aaneenschrijven-2-samenkoppelingen`,
  compoundsOneWord: 'https://inburgering.org/nl/grammar/english-loans-one-word-or-two',
  linking: 'https://inburgering.org/nl/grammar/compound-linking-letters',
  trema: 'https://inburgering.org/nl/grammar/trema-dieresis',
  beide: 'https://www.vlaanderen.be/taaladvies/taaladviezen/beide-beiden',
  enigste: 'https://www.vlaanderen.be/taaladvies/enigste-enige',
  ervanaf: 'https://www.vlaanderen.be/taaladvies/taaladviezen/ervanaf-ervan-af-er-vanaf-er-van-af',
  beseffen: 'https://taaladvies.net/taal/advies/vraag/1394/zich_beseffen_beseffen/',
  liggen: 'https://inburgering.org/nl/grammar/liggen-vs-leggen',
  wiens: `${TA}/taaladviezen/wiens-van-wie-waarvan-wie-zn`,
  teAllenTijde: 'https://www.rendement.nl/zakelijke-communicatie/nieuws/is-het-nou-ten-alle-tijden-of-te-allen-tijde.html',
  danAlsGrammar: 'https://inburgering.org/grammar/dan-vs-als-comparison',
} as const

/** quote a word for messages */
export const q = (s: string) => `‘${s}’`
