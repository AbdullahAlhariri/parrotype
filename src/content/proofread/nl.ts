import { defineTexts } from './build'
import type { RuleNote } from './types'

// Dutch Fix it texts. Planted mistakes are the ones this user makes most: d/t, participles,
// 't kofschip, split compounds, apostrophe plurals. Few per text, to limit exposure to wrong forms.

const NOTES: Record<string, RuleNote> = {
  'dt-ik': {
    title: 'd/t after ik',
    note: { en: 'After ik the verb is just the stem: no t.', local: 'Na ik schrijf je alleen de stam: geen t.' },
    pack: 'nl.dt',
  },
  'dt-inv': {
    title: 'd/t with jij or je after the verb',
    note: { en: 'When jij or je comes after the verb, the t drops: word je, vind jij.', local: 'Staat jij of je achter het werkwoord, dan valt de t weg: word je, vind jij.' },
    pack: 'nl.dt',
  },
  'dt-hij': {
    title: 'd/t after hij, zij, het',
    note: { en: 'One person or thing as the subject: stem + t. Test with lopen: hij loopt, so hij wordt.', local: 'Eén persoon of ding als onderwerp: stam + t. Test met lopen: hij loopt, dus hij wordt.' },
    pack: 'nl.dt',
  },
  'dt-jouw': {
    title: 'wordt je + noun',
    note: { en: 'Here je means jouw: the subject is je broer, a third person, so stem + t.', local: 'Hier betekent je \'jouw\': het onderwerp is je broer, een derde persoon, dus stam + t.' },
    pack: 'nl.dt',
  },
  part: {
    title: 'participle after a helper verb',
    note: { en: 'With a helper verb (is, heeft, wordt) you need the past participle. The past tense ends in -de, so the participle ends in d.', local: 'Bij een hulpwerkwoord (is, heeft, wordt) hoort een voltooid deelwoord. De verleden tijd eindigt op -de, dus het deelwoord op d.' },
    pack: 'nl.participle',
  },
  'part-pres': {
    title: 'present tense, not a participle',
    note: { en: 'No helper verb in this clause: present tense, stem + t.', local: 'Geen hulpwerkwoord in deze zin: tegenwoordige tijd, stam + t.' },
    pack: 'nl.participle',
  },
  'part-d': {
    title: 'participle with -d',
    note: { en: 'The stem does not end in a \'t kofschip consonant (t, k, f, s, ch, p), so the participle ends in d.', local: 'De stam eindigt niet op een medeklinker uit \'t kofschip (t, k, f, s, ch, p), dus het deelwoord eindigt op d.' },
    pack: 'nl.kofschip',
  },
  'kof-te': {
    title: 'past tense with -te',
    note: { en: 'The stem ends in a \'t kofschip consonant (t, k, f, s, ch, p), so the past tense takes -te.', local: 'De stam eindigt op een medeklinker uit \'t kofschip (t, k, f, s, ch, p), dus de verleden tijd krijgt -te.' },
    pack: 'nl.kofschip',
  },
  'kof-dde': {
    title: 'past tense with -dde',
    note: { en: 'The stem already ends in d and the past tense still adds -de, so you get dd.', local: 'De stam eindigt al op d en de verleden tijd krijgt toch -de, dus dd.' },
    pack: 'nl.kofschip',
  },
  'het-woord': {
    title: 'de or het',
    note: { en: 'This noun is a het-word: het, not de.', local: 'Dit is een het-woord: het, niet de.' },
    pack: 'nl.de-het',
  },
  'dat-het': {
    title: 'dat after a het-word',
    note: { en: 'The noun it refers to is a het-word, so the relative pronoun is dat.', local: 'Het woord waarnaar het verwijst is een het-woord, dus het betrekkelijk voornaamwoord is dat.' },
    pack: 'nl.die-dat',
  },
  'dat-dim': {
    title: 'dat after a diminutive',
    note: { en: 'Meisje is a diminutive, and diminutives are het-words: het meisje dat.', local: 'Meisje is een verkleinwoord, en verkleinwoorden zijn het-woorden: het meisje dat.' },
    pack: 'nl.die-dat',
  },
  'adj-e': {
    title: 'adjective with -e',
    note: { en: 'Boer is a de-word, so the adjective gets an -e, also after een: een oude boer.', local: 'Boer is een de-woord, dus het bijvoeglijk naamwoord krijgt een -e, ook na een: een oude boer.' },
  },
  'als-dan': {
    title: 'dan after a comparative',
    note: { en: 'After a comparative (ouder, groter) you write dan.', local: 'Na een vergrotende trap (ouder, groter) schrijf je dan.' },
    pack: 'nl.als-dan',
  },
  'anders-dan': {
    title: 'anders dan',
    note: { en: 'After anders you write dan: iets anders dan.', local: 'Na anders schrijf je dan: iets anders dan.' },
    pack: 'nl.als-dan',
  },
  'hun-subj': {
    title: 'hun as the subject',
    note: { en: 'Hun is never the subject. Use zij or ze: zij hebben.', local: 'Hun is nooit onderwerp. Gebruik zij of ze: zij hebben.' },
    pack: 'nl.hun-hen',
  },
  'jouw-poss': {
    title: 'jouw before a noun',
    note: { en: 'Something of yours follows (berichtje), so jouw.', local: 'Er volgt iets wat van jou is (berichtje), dus jouw.' },
    pack: 'nl.jou-jouw',
  },
  'jou-obj': {
    title: 'jou as the object',
    note: { en: 'Nothing of yours follows, and it comes after met: jou.', local: 'Er volgt niets wat van jou is, en het staat na met: jou.' },
    pack: 'nl.jou-jouw',
  },
  'mijn-poss': {
    title: 'mijn, not me',
    note: { en: "Me is never possessive: mijn knie, or m'n knie.", local: "Me is nooit bezittelijk: mijn knie, of m'n knie." },
    pack: 'nl.me-mijn',
  },
  'cap-day': {
    title: 'lowercase days and months',
    note: { en: 'Days of the week and months are lowercase in Dutch.', local: 'Dagen van de week en maanden schrijf je in het Nederlands met een kleine letter.' },
  },
  'cap-lang': {
    title: 'capital for languages',
    note: { en: 'Names of languages take a capital letter: Arabisch, Engels.', local: 'Namen van talen schrijf je met een hoofdletter: Arabisch, Engels.' },
  },
  compound: {
    title: 'compounds as one word',
    note: { en: 'A compound is one word in Dutch.', local: 'Een samenstelling schrijf je aan elkaar.' },
    pack: 'nl.compounds',
  },
  'tussen-n': {
    title: 'linking -en- in compounds',
    note: { en: 'Pan only has the plural pannen, so the link is -en-: pannenkoek.', local: 'Pan heeft alleen het meervoud pannen, dus de tussenklank is -en-: pannenkoek.' },
    pack: 'nl.compounds',
  },
  apart: {
    title: 'fixed groups written apart',
    note: { en: 'This is a fixed group of separate words, not a compound: in plaats van.', local: 'Dit is een vaste groep losse woorden, geen samenstelling: in plaats van.' },
    pack: 'nl.compounds',
  },
  trema: {
    title: 'trema',
    note: { en: 'The trema marks where the new syllable starts: Bel-gi-ë.', local: 'Het trema laat zien waar de nieuwe lettergreep begint: Bel-gi-ë.' },
    pack: 'nl.trema-apostrof',
  },
  apos: {
    title: 'apostrophe plurals',
    note: { en: "A plural in -s after a long vowel (a, i, o, u, y) gets an apostrophe: foto's, collega's.", local: "Een meervoud op -s na een lange klinker (a, i, o, u, y) krijgt een apostrof: foto's, collega's." },
    pack: 'nl.trema-apostrof',
  },
  's-avonds': {
    title: "'s avonds",
    note: { en: "'s is short for des, so the apostrophe goes before the s. At the start of a sentence the next word gets the capital: 's Avonds.", local: "'s is kort voor des, dus de apostrof staat voor de s. Aan het begin van een zin krijgt het volgende woord de hoofdletter: 's Avonds." },
    pack: 'nl.trema-apostrof',
  },
  zon: {
    title: "zo'n",
    note: { en: "zo'n is short for zo een. De zon is the sun.", local: "zo'n is kort voor zo een. De zon schijnt aan de hemel." },
    pack: 'nl.trema-apostrof',
  },
  eigenlijk: {
    title: 'eigenlijk',
    note: { en: 'The word is built from eigen + lijk: eigenlijk.', local: 'Het woord bestaat uit eigen + lijk: eigenlijk.' },
  },
  ol: {
    title: 'au or ou',
    note: { en: 'English cold has an l, and where English has an l, Dutch writes ou: koud.', local: 'Het Engelse cold heeft een l, en waar het Engels een l heeft, schrijf je ou: koud.' },
    pack: 'nl.au-ou',
  },
  auw: {
    title: 'au or ou',
    note: { en: 'Blauw is on the short list of -auw words.', local: 'Blauw staat in het korte rijtje -auw-woorden.' },
    pack: 'nl.au-ou',
  },
  ij: {
    title: 'ei or ij',
    note: { en: 'No rule for ei or ij: this word is written with ij.', local: 'Geen regel voor ei of ij: dit woord schrijf je met ij.' },
    pack: 'nl.ei-ij',
  },
}

export const NL_TEXTS = defineTexts('nl', NOTES, [
  {
    id: 'nl-01',
    title: 'Een appje aan Mark',
    difficulty: 1,
    source:
      'Hoi Mark, ik [wordt>word#dt-ik] morgen om negen uur op kantoor verwacht, dus ik kan niet mee naar de markt. [Vindt>Vind#dt-inv] jij het goed als ik je daarna bel? Mijn collega [antwoord>antwoordt#dt-hij] meestal pas na de lunch, dus het kan wat later worden. [Wordt>Word#dt-inv] je trouwens nog opgehaald na de training, of fiets je zelf naar huis? Laat het even weten, dan houd ik daar rekening mee.\n\nGroetjes,\nSanne',
  },
  {
    id: 'nl-02',
    title: 'Een weekend in Gent',
    difficulty: 1,
    source:
      "Vorig weekend zijn we met de trein naar [Belgie>België#trema] geweest. In Gent hebben we veel musea bezocht en de mooiste [fotos>foto's#apos] heb ik vanaf een brug gemaakt. [Eigelijk>Eigenlijk#eigenlijk] wilden we ook naar Brugge, maar daar was geen tijd meer voor. [S'avonds>'s Avonds#s-avonds] aten we friet met stoofvlees in een klein café aan het water. De volgende keer gaan we met de auto [inplaats>in plaats#apart] van met de trein, want de terugreis duurde bijna vier uur.",
  },
  {
    id: 'nl-03',
    title: 'Pannenkoeken',
    difficulty: 1,
    source:
      'Voor twaalf [pannekoeken>pannenkoeken#tussen-n] heb je 250 gram bloem, een halve liter melk, twee eieren en een snufje zout nodig. Doe de bloem en het zout in een kom en maak een kuiltje in het midden. Klop de eieren erdoor en voeg dan beetje bij beetje de melk toe, zodat er geen klontjes ontstaan. Laat het beslag een kwartier rusten. Smelt een klontje boter in de [koeken pan>koekenpan#compound] en schep er een flinke lepel beslag in. Draai hem om zodra de bovenkant droog [word>wordt#dt-hij]. Lekker met stroop of [poeder suiker>poedersuiker#compound].',
  },
  {
    id: 'nl-04',
    title: 'Een kaartje uit Marrakech',
    difficulty: 1,
    source:
      "Lieve oma,\n\nDe groeten uit Marrakech. Het is hier overdag heel warm, maar 's nachts wordt het best [kaud>koud#ol], dus ik ben [blei>blij#ij] dat ik een trui heb meegenomen. Gisteren zijn we naar een grote markt geweest. Ik heb een [blouwe>blauwe#auw] schaal voor je gekocht en een zakje kruiden voor in de soep. Morgen [reiden>rijden#ij] we met een busje naar de bergen. De mensen zijn erg vriendelijk en ik oefen elke dag mijn [arabisch>Arabisch#cap-lang].\n\nTot over twee weken. Dikke kus,\nNoor",
  },
  {
    id: 'nl-05',
    title: 'Waar was je?',
    difficulty: 2,
    source:
      'Hoi Jesse, wat is er gisteren [gebeurt>gebeurd#part]? Ik heb de hele avond op je gewacht en je drie keer [gebelt>gebeld#part-d], maar je nam niet op. Uiteindelijk [fietsde>fietste#kof-te] ik maar naar je huis. Er [brande>brandde#kof-dde] geen licht, dus ik ben weer naar huis gegaan. Vanochtend hoorde ik van je zus dat je in het ziekenhuis ligt. Ik schrok me rot. Als je wilt, kom ik morgen na mijn werk even langs. Heb je iets nodig? Ik neem in elk geval druiven mee.',
  },
  {
    id: 'nl-06',
    title: 'Een boek voor de vakantie',
    difficulty: 2,
    source:
      'Gisteren heb ik eindelijk [de>het#het-woord] boek gelezen [die>dat#dat-het] jij me in de zomer had aangeraden. Het verhaal speelt zich af in een klein dorp in Friesland, waar een [oud>oude#adj-e] boer al veertig jaar een geheim bewaart. Het meisje [die>dat#dat-dim] de hoofdrol speelt, ontdekt het pas op de laatste bladzijde. Ik vond het einde een beetje vreemd, maar de schrijver weet heel goed hoe je spanning opbouwt. Heb jij nog meer tips? Ik heb volgende week vakantie en wil graag een dik boek meenemen.',
  },
  {
    id: 'nl-07',
    title: 'Klussen bij mijn zus',
    difficulty: 2,
    source:
      'Mijn zus is twee jaar ouder [als>dan#als-dan] ik en woont met haar man in Leiden. [Hun>Zij/Ze#hun-subj] hebben net een huis gekocht met een kleine tuin en een schuur voor hun fietsen. Op [Zaterdag>zaterdag#cap-day] ga ik bij ze langs om te helpen met verven. Ik ben niet zo handig als mijn zus, maar kwasten afwassen lukt me wel. Eerst moet ik nog naar de [tand arts>tandarts#compound], want ik heb al een week [kies pijn>kiespijn#compound]. Daarna neem ik de trein van tien over half twaalf.',
  },
  {
    id: 'nl-08',
    title: 'Een lekkende kraan',
    difficulty: 2,
    source:
      'Beste meneer Jansen,\n\nSinds vorige week lekt de kraan in de badkamer. Ik heb [geprobeert>geprobeerd#part-d] hem zelf te repareren, maar het druppelen [word>wordt#dt-hij] alleen maar erger. Ook de verwarming in de slaapkamer doet het niet goed: hij [word>wordt#dt-hij] pas na een uur een beetje warm. Kunt u deze week een monteur sturen? Ik ben op [Dinsdag>dinsdag#cap-day] en donderdag de hele dag thuis. Als het u beter uitkomt, mag de monteur ook de sleutel bij de buren ophalen.\n\nAlvast bedankt en met vriendelijke groet,\nNadia Bakker',
  },
  {
    id: 'nl-09',
    title: 'Samen sporten',
    difficulty: 2,
    source:
      "Hoi Lisa,\n\nBedankt voor [jou>jouw#jouw-poss] berichtje. Ik ga morgen weer naar de sportschool en wil graag met [jouw>jou#jou-obj] mee naar de yogales. [Me>Mijn/M'n#mijn-poss] knie doet niet meer [zon>zo'n#zon] pijn, dus ik denk dat het wel lukt. Neem jij je eigen handdoek mee? Die van mij ligt nog in de wasmachine. Tom en Fatima komen ook. [Hun>Zij/Ze#hun-subj] hebben net een abonnement genomen en vinden het nog een beetje spannend. Zullen we om zeven uur bij de ingang afspreken? Ik wacht wel op jou als je later bent.\n\nGroetjes,\nEmma",
  },
  {
    id: 'nl-10',
    title: 'Ouderavond',
    difficulty: 2,
    source:
      'Beste ouders,\n\nOp dinsdag 14 [November>november#cap-day] is er een ouderavond in de aula. U kunt dan met de mentor van uw kind praten over [de>het#het-woord] eerste rapport. Vorig jaar [melden>meldden#kof-dde] zich zo veel ouders aan dat we extra stoelen moesten lenen. Daarom vragen we u om zich vooraf aan te melden via de website. Wilt u ook laten weten of u een tolk nodig hebt? Er is koffie en thee, en de leerlingen van klas 3 verkopen [zelf gebakken>zelfgebakken#compound] koekjes voor hun schoolreis.\n\nMet vriendelijke groet,\nMarloes Jansen, teamleider',
  },
  {
    id: 'nl-11',
    title: 'Sollicitatiebrief',
    difficulty: 3,
    source:
      "Geachte heer De Vries,\n\nMet veel interesse heb ik uw vacature voor een [klantenservice medewerker>klantenservicemedewerker#compound] gelezen. Ik werk al drie jaar bij een webwinkel in Utrecht, waar ik dagelijks vragen van klanten [beantwoordt>beantwoord#dt-ik] via de telefoon en de chat. Mijn [collegas>collega's#apos] vinden mij geduldig en nauwkeurig. Naast Nederlands spreek ik vloeiend Engels en [arabisch>Arabisch#cap-lang], wat in uw internationale team goed van pas komt. Ik ben ervan overtuigd dat mijn ervaring uw afdeling kan versterken. Graag vertel ik u in een gesprek meer over mijn motivatie.\n\nMet vriendelijke groet,\nYasmina El Amrani",
  },
  {
    id: 'nl-12',
    title: 'Brand in de bakkerij',
    difficulty: 3,
    source:
      'In de nacht van zaterdag op zondag is er brand uitgebroken in een bakkerij aan de Kerkstraat. Een buurman die zijn hond uitliet, zag rook uit het dak komen en belde meteen de brandweer. De brandweer was binnen tien minuten ter plaatse en [rede>redde#kof-dde] een kat die nog in het gebouw zat. Niemand raakte gewond. Het pand, [die>dat#dat-het] al sinds 1902 een bakkerij is, is zwaar [beschadigt>beschadigd#part]. Hoe de brand is ontstaan, [word>wordt#dt-hij] nog onderzocht. De eigenaar verwacht dat de winkel over een paar maanden weer opengaat.',
  },
  {
    id: 'nl-13',
    title: 'Vergadering verplaatst',
    difficulty: 3,
    source:
      "Beste [collegas>collega's#apos],\n\nDe vergadering van donderdag [word>wordt#dt-hij] verplaatst naar vrijdagochtend om half tien. Het [project plan>projectplan#compound] is nog niet helemaal af, dus we hebben een dag extra nodig. Heeft iemand de cijfers van het vorige kwartaal al bekeken? Er klopt iets niet: de omzet in maart is twee keer zo hoog als in februari. Dat [gebeurd>gebeurt#part-pres] normaal nooit. [Wordt>Word#dt-inv] jij er wijzer van, Pieter? Wie de [vergader ruimte>vergaderruimte#compound] wil reserveren, kan dat via het intranet doen.\n\nTot vrijdag,\nIlse",
  },
  {
    id: 'nl-14',
    title: 'De geleende fiets',
    difficulty: 3,
    source:
      'Gisteren stond mijn fiets niet meer op de plek waar ik hem had neergezet. Ik dacht eerst dat hij gestolen was, maar mijn buurjongen Daan bleek hem te hebben [geleent>geleend#part-d]. Hij [vind>vindt#dt-hij] dat heel normaal, want ik leen zijn ladder ook weleens. Ik vind dat iets anders [als>dan#anders-dan] een fiets meenemen zonder het te vragen. "[Word>Wordt#dt-jouw] je broer ook zo boos als iemand zijn spullen pakt?" vroeg ik. Daan haalde zijn schouders op. Vanochtend stond de fiets er weer, met een briefje: "Sorry, het [gebeurd>gebeurt#part-pres] niet meer."',
  },
])
