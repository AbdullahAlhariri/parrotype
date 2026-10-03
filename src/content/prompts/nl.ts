import type { WritingPrompt } from './types'

// Dutch writing prompts. Adult, a little playful, never childish.
// Every sentence here was checked against Taaladvies / Onze Taal spelling (2015 Groene Boekje).
// Trap prompts make the writer produce the forms that trip people up: d/t, gebeurd/gebeurt,
// inversion with jij, 't kofschip, English loan verbs, als/dan, V2 word order.

const p = (id: string, kind: WritingPrompt['kind'], words: number, text: string, focus: string[], watch?: string): WritingPrompt => ({
  id: `nl-${id}`,
  lang: 'nl',
  kind,
  words,
  text,
  focus,
  ...(watch ? { watch } : {}),
})

export const NL_PROMPTS: WritingPrompt[] = [
  // story starters
  p('p01', 'story', 150, 'Eerste zin: ‘Toen ik de deur opendeed, zat er een papegaai op mijn bank. Hij keek me aan en zei: “Eindelijk ben je thuis.”’', ['story', 'ei-ij', 'past-tense']),
  p('p02', 'story', 150, 'Eerste zin: ‘De lift bleef steken tussen de derde en de vierde verdieping, en ik was niet alleen.’', ['story', 'past-tense']),
  p('p03', 'story', 120, 'Schrijf een dagboekfragment van een kat die een hele dag alleen thuis is.', ['story', 'ik-form']),
  p('p04', 'story', 150, 'Een buitenaards wezen bezoekt voor het eerst een Nederlandse supermarkt. Wat ziet het, en wat begrijpt het helemaal niet?', ['story', 'het-pronoun', 'capitals']),
  p('p05', 'story', 100, 'Schrijf de achterflap van een spannend boek dat nog niet bestaat.', ['story', 'die-dat']),
  p('p06', 'story', 150, 'Eerste zin: ‘Om drie uur ’s nachts ging de telefoon. Een onbekend nummer.’', ['story', 'apostrophe', 'past-tense']),
  p('p07', 'story', 150, 'Je vindt een oude sleutel in de zak van een jas die je net tweedehands hebt gekocht. Waar past hij op?', ['story', 'dt', 'die-dat']),

  // opinion
  p('p08', 'opinion', 200, 'Wat vind je van thuiswerken? Noem twee voordelen en twee nadelen, en sluit af met je eigen mening.', ['opinion', 'vind-vindt']),
  p('p09', 'opinion', 200, 'Vergelijk je woonplaats met de stad waar je het liefst zou wonen. Wat is daar beter, en wat is er minder goed dan hier?', ['als-dan', 'comparative']),
  p('p10', 'opinion', 200, 'Moeten kinderen onder de vijftien sociale media mogen gebruiken? Geef je mening met minstens twee argumenten.', ['opinion', 'word-order']),
  p('p11', 'opinion', 180, 'Is een smartphone een hulpmiddel of een tijdvreter? Kies een kant en verdedig die.', ['opinion', 'compound']),
  p('p12', 'opinion', 180, 'Moet de supermarkt op zondag open zijn? Schrijf een kort betoog voor of tegen.', ['opinion', 'capitals']),

  // describe
  p('p13', 'describe', 120, 'Beschrijf je kamer: wat staat er, wat ligt er en wat hangt er aan de muur?', ['de-het', 'adj-e', 'staan-liggen']),
  p('p14', 'describe', 150, 'Beschrijf een persoon die je bewondert, zonder zijn of haar naam te noemen. Kan een lezer raden wie het is?', ['die-dat', 'adj-e']),
  p('p15', 'describe', 150, 'Beschrijf een drukke markt op zaterdagochtend: de kraampjes, de geuren, de mensen en de straatmuzikant met zijn accordeon.', ['describe', 'compound', 'capitals']),
  p('p16', 'describe', 150, 'Beschrijf je favoriete plek in de natuur met al je zintuigen: wat zie, hoor, ruik en voel je daar?', ['ik-form', 'dt']),
  p('p17', 'describe', 120, 'Beschrijf het uitzicht uit je raam zo precies dat iemand het zou kunnen tekenen.', ['describe', 'adj-e']),
  p('p18', 'describe', 150, 'Beschrijf twee mensen die je goed kent. Wat doen ze graag, wat hebben ze gemeen en waarin verschillen ze?', ['hun-zij', 'als-dan']),

  // journal
  p('p19', 'journal', 120, 'Beschrijf je ochtend van vandaag, vanaf het moment dat je wakker werd tot je de deur uitging.', ['past-tense', 'kofschip']),
  p('p20', 'journal', 150, 'Wat heb je dit jaar geleerd dat je vorig jaar nog niet wist?', ['participle', 'kofschip']),
  p('p21', 'journal', 150, 'Schrijf over een feest dat je nooit zult vergeten. Wie waren er, en wat maakte het zo bijzonder?', ['die-dat', 'past-tense']),
  p('p22', 'journal', 150, 'Vertel over een misverstand dat ontstond doordat iemand iets verkeerd begreep.', ['participle', 'past-tense']),
  p('p23', 'journal', 100, 'Waar heb je deze week om moeten lachen?', ['journal', 'word-order']),

  // letters and messages
  p('p24', 'letter', 180, 'Schrijf een klachtenbrief aan een webwinkel die je het verkeerde pakket heeft gestuurd. Blijf beleefd en gebruik ‘u’.', ['formal', 'participle', 'u-form']),
  p('p25', 'letter', 80, 'Schrijf een bericht aan een vriend of vriendin om een afspraak te verzetten. Leg uit waarom en stel een nieuwe datum voor.', ['dt', 'capitals']),
  p('p26', 'letter', 200, 'Schrijf een korte sollicitatiebrief voor je droombaan. Wat maakt jou de beste kandidaat?', ['formal', 'compound']),
  p('p27', 'letter', 100, 'Schrijf een briefje aan je buren: je geeft zaterdag een feestje en het kan laat worden.', ['capitals', 'dt']),
  p('p28', 'letter', 120, 'Schrijf een bedankje aan iemand die jou ooit uit de brand heeft geholpen. Wat heeft die persoon voor jou gedaan?', ['jou-jouw', 'participle']),

  // explain to a friend
  p('p29', 'explain', 150, 'Leg aan een kind van tien uit hoe je een lekke fietsband plakt.', ['imperative', 'compound']),
  p('p30', 'explain', 150, 'Schrijf het recept van je lievelingsgerecht op. Gebruik de gebiedende wijs, bijvoorbeeld: ‘Snijd de ui in kleine stukjes.’', ['imperative', 'dt']),
  p('p31', 'explain', 150, 'Een vriend uit het buitenland komt een week logeren. Leg uit hoe hij met de trein van Schiphol naar jouw huis komt.', ['imperative', 'jou-jouw']),
  p('p32', 'explain', 120, 'Leg aan een vriend uit waarom je ‘hij wordt’ schrijft, maar ‘word jij’.', ['dt', 'inversion']),

  // grammar traps
  p('p33', 'trap', 120, 'Beschrijf wat er gisteren gebeurd is en wat er morgen gebeurt.', ['participle', 'dt'], 'gebeurd / gebeurt'),
  p('p34', 'trap', 150, 'Hoe ziet je leven er over tien jaar uit? Gebruik minstens vijf keer ‘word’ of ‘wordt’.', ['dt', 'word-wordt'], 'word / wordt'),
  p('p35', 'trap', 150, 'Interview jezelf: stel jezelf vijf vragen met ‘jij’ of ‘je’ en beantwoord ze. Bijvoorbeeld: ‘Vind jij jezelf geduldig?’', ['dt', 'inversion'], 'vind jij / jij vindt'),
  p('p36', 'trap', 120, 'Wat vindt jouw beste vriend of vriendin van jouw hobby’s? En wat vind jij van zijn of haar hobby’s?', ['dt', 'vind-vindt'], 'vind / vindt'),
  p('p37', 'trap', 150, 'Beschrijf een gewone werkdag van iemand die je kent: wat doet ze, wat vindt ze leuk en waar houdt ze niet van? Schrijf alles in de hij- of zij-vorm.', ['dt', 'inversion'], 'houdt ze / vindt ze'),
  p('p38', 'trap', 150, 'Vertel wat je vorige week allemaal hebt gedaan: gewerkt, gefietst, gekookt, verhuisd? Gebruik minstens tien voltooide deelwoorden.', ['kofschip', 'participle'], 'gefietst / verhuisd'),
  p('p39', 'trap', 150, 'Je bent net verhuisd. Beschrijf wat je hebt ingepakt, wat er is kapotgegaan en wat je nooit meer hebt teruggevonden.', ['participle', 'compound'], 'verhuisd / kapotgegaan'),
  p('p40', 'trap', 120, 'Vergelijk jezelf met een familielid: wie is groter, ouder, slimmer of eigenwijzer dan de ander?', ['als-dan', 'comparative'], 'groter dan / even groot als'),
  p('p41', 'trap', 120, 'Gisteren, vandaag, morgen: schrijf over alle drie en begin elke zin met een tijdsaanduiding. Bijvoorbeeld: ‘Morgen ga ik eindelijk naar de kapper.’', ['word-order', 'dt'], 'Morgen ga ik'),
  p('p42', 'trap', 120, 'Schrijf over je laptop of telefoon: wat heb je gedownload, geüpdatet, gedeletet of gecheckt? Gebruik minstens vijf Engelse werkwoorden.', ['loan-verbs', 'kofschip'], 'geüpdatet / gedownload'),
  p('p43', 'trap', 100, 'Vertel over je zaterdag: wat deed je ’s ochtends, ’s middags en ’s avonds?', ['apostrophe', 'past-tense'], '’s ochtends / ’s avonds'),
  p('p44', 'trap', 120, 'Wat zit er in je tas? Beschrijf vijf dingen met ‘die’ of ‘dat’ erachter, zoals: ‘het etui dat ik altijd vergeet’.', ['die-dat', 'de-het'], 'het boek dat / de pen die'),
]
