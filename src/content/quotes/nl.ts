import { q, type Quote } from './types'

// Dutch: traditional spreekwoorden (no author, no copyright) and public-domain authors.
// Spelling follows the current Woordenlijst; old spellings are modernised and noted.
// Proverbs 1-30 come from docs/research/exercises-and-content.md section 13.1.

const P = 'Dutch proverb'

export const NL_QUOTES: Quote[] = [
  q('Al doende leert men.', P, { meaning: 'You learn by doing.' }),
  q('Oefening baart kunst.', P, { meaning: 'Practice makes perfect.' }),
  q('Wie niet waagt, die niet wint.', P, { meaning: 'Nothing ventured, nothing gained.' }),
  q('Haastige spoed is zelden goed.', P, { meaning: 'More haste, less speed.' }),
  q('Beter laat dan nooit.', P, { meaning: 'Better late than never.' }),
  q('Oost west, thuis best.', P, { meaning: 'There is no place like home.' }),
  q('Wie het laatst lacht, lacht het best.', P, { meaning: 'He who laughs last laughs best.' }),
  q('De aanhouder wint.', P, { meaning: 'Persistence pays off.' }),
  q('Stille wateren hebben diepe gronden.', P, { meaning: 'Still waters run deep.' }),
  q('Beter één vogel in de hand dan tien in de lucht.', P, { meaning: 'A bird in the hand is worth two in the bush.' }),
  q('Zoals de ouden zongen, piepen de jongen.', P, { meaning: 'Children copy their parents.' }),
  q('Wie a zegt, moet ook b zeggen.', P, { meaning: 'In for a penny, in for a pound.' }),
  q('Geen rook zonder vuur.', P, { meaning: 'There is no smoke without fire.' }),
  q('Hoge bomen vangen veel wind.', P, { meaning: 'Prominent people attract the most criticism.' }),
  q('Vele handen maken licht werk.', P, { meaning: 'Many hands make light work.' }),
  q('Wie zijn billen brandt, moet op de blaren zitten.', P, { meaning: 'You have made your bed, now lie in it.' }),
  q('Beter een goede buur dan een verre vriend.', P, { meaning: 'A good neighbour is worth more than a friend far away.' }),
  q('Na regen komt zonneschijn.', P, { meaning: 'After rain comes sunshine.' }),
  q('Wie wat bewaart, die heeft wat.', P, { meaning: 'Waste not, want not.' }),
  q('Een ezel stoot zich in het gemeen geen twee keer aan dezelfde steen.', P, {
    meaning: 'Even a donkey does not make the same mistake twice.',
  }),
  q('Van uitstel komt afstel.', P, { meaning: 'What is postponed is often abandoned.' }),
  q('Gedeelde smart is halve smart.', P, { meaning: 'A sorrow shared is a sorrow halved.' }),
  q('Eind goed, al goed.', P, { meaning: "All's well that ends well." }),
  q('Rome is niet in één dag gebouwd.', P, { meaning: "Rome wasn't built in a day." }),
  q('Spreken is zilver, zwijgen is goud.', P, { meaning: 'Speech is silver, silence is golden.' }),
  q('Zo gewonnen, zo geronnen.', P, { meaning: 'Easy come, easy go.' }),
  q('Je moet het ijzer smeden als het heet is.', P, { meaning: 'Strike while the iron is hot.' }),
  q('Elk huisje heeft zijn kruisje.', P, { meaning: 'Every family has its troubles.' }),
  q('Een goed begin is het halve werk.', P, { meaning: 'Well begun is half done.' }),
  q('Al is de leugen nog zo snel, de waarheid achterhaalt haar wel.', P, { meaning: 'Lies are found out in the end.' }),
  q('Wie goed doet, goed ontmoet.', P, { meaning: 'Do good and good comes back to you.' }),
  q('Waar gehakt wordt, vallen spaanders.', P, { meaning: 'You cannot make an omelette without breaking eggs.' }),
  q('Twee honden vechten om een been, de derde loopt ermee heen.', P, {
    meaning: 'While two people quarrel, a third walks off with the prize.',
  }),
  q('Wie het kleine niet eert, is het grote niet weerd.', P, {
    meaning: 'Look after the small things. (weerd is an old form of waard)',
  }),
  q('Het zijn de slechtste vruchten niet waar de wespen aan knagen.', P, {
    meaning: 'People only pick on things that are worth something.',
  }),
  q('De vroege vogel vangt de worm.', P, { meaning: 'The early bird catches the worm.' }),
  q('Elk vogeltje zingt zoals het gebekt is.', P, {
    meaning: 'Everyone talks the way they were raised. Literally: every little bird sings the way its beak is shaped.',
  }),
  q('Praatjes vullen geen gaatjes.', P, { meaning: 'Talk is cheap: words do not fix anything.' }),
  q('Als de kat van huis is, dansen de muizen op tafel.', P, { meaning: "When the cat's away, the mice will play." }),
  q('Beter ten halve gekeerd dan ten hele gedwaald.', P, { meaning: 'Better to turn back halfway than to get completely lost.' }),
  q('Wat de boer niet kent, dat eet hij niet.', P, { meaning: 'People distrust what they do not know.' }),
  q('Over smaak valt niet te twisten.', P, { meaning: 'There is no accounting for taste.' }),
  q('Hoogmoed komt voor de val.', P, { meaning: 'Pride comes before a fall.' }),
  q('Kleine potjes hebben grote oren.', P, { meaning: 'Little pitchers have big ears: children hear everything.' }),
  q('Zachte heelmeesters maken stinkende wonden.', P, { meaning: 'Being too gentle with a problem makes it worse.' }),
  q('Wie het eerst komt, het eerst maalt.', P, { meaning: 'First come, first served.' }),
  q('Met de hoed in de hand komt men door het ganse land.', P, { meaning: 'Politeness gets you everywhere.' }),
  q('Morgenstond heeft goud in de mond.', P, { meaning: 'The early morning is the best time to get things done.' }),
  q('Je moet de huid niet verkopen voordat de beer geschoten is.', P, { meaning: "Don't count your chickens before they hatch." }),
  q('Wie de schoen past, trekke hem aan.', P, { meaning: 'If the shoe fits, wear it.' }),
  q('Boontje komt om zijn loontje.', P, { meaning: 'You get what you deserve.' }),
  q('Een goed verstaander heeft maar een half woord nodig.', P, { meaning: 'A word to the wise is enough.' }),
  q('Wie zwijgt, stemt toe.', P, { meaning: 'Silence gives consent.' }),
  q('Alle begin is moeilijk.', P, { meaning: 'Every beginning is hard.' }),
  q('Na gedane arbeid is het goed rusten.', P, { meaning: 'Rest is sweet after work.' }),
  q('Wie wind zaait, zal storm oogsten.', P, { meaning: 'Sow the wind, reap the whirlwind.' }),

  /* public-domain authors */
  q('Misschien is niets geheel waar, en zelfs dát niet.', 'Multatuli, Ideeën (1862)', {
    meaning: 'Perhaps nothing is entirely true, and not even that.',
    note: 'the original has dàt; current spelling marks emphasis with dát',
  }),
  q('Ik ben makelaar in koffie, en woon op de Lauriergracht, No. 37. Het is mijn gewoonte niet, romans te schrijven, of zulke dingen.', 'Multatuli, Max Havelaar (1860)'),
  q('Ja, ik wil gelezen worden!', 'Multatuli, Max Havelaar (1860)'),
  q("'t Kan verkeren.", 'G.A. Bredero, his motto (early 17th century)', { meaning: 'Things can change.' }),
  q('De vis wordt duur betaald.', 'Herman Heijermans, Op hoop van zegen (1900)', { meaning: "The fish is paid for dearly, with fishermen's lives." }),
  q("Ik ben een God in 't diepst van mijn gedachten.", 'Willem Kloos, sonnet (1880s)'),
  q('Een nieuwe lente en een nieuw geluid: ik wil dat dit lied klinkt als het gefluit, dat ik vaak hoorde voor een zomernacht in een oud stadje, langs de watergracht.', 'Herman Gorter, Mei (1889)', {
    note: 'line breaks removed',
  }),
  q('Denkend aan Holland zie ik brede rivieren traag door oneindig laagland gaan, rijen ondenkbaar ijle populieren als hoge pluimen aan de einder staan.', 'H. Marsman, Herinnering aan Holland (1936)', {
    note: 'spelling modernised (breede, hooge, den), line breaks removed',
  }),
  q('De lucht hangt er laag en de zon wordt er langzaam in grijze veelkleurige dampen gesmoord, en in alle gewesten wordt de stem van het water met zijn eeuwige rampen gevreesd en gehoord.', 'H. Marsman, Herinnering aan Holland (1936)', {
    note: 'line breaks removed',
  }),
  q('Alle mensen worden vrij en gelijk in waardigheid en rechten geboren. Zij zijn begiftigd met verstand en geweten, en behoren zich jegens elkander in een geest van broederschap te gedragen.', 'Universele Verklaring van de Rechten van de Mens, artikel 1 (1948)'),
  q('Allen die zich in Nederland bevinden, worden in gelijke gevallen gelijk behandeld. Discriminatie wegens godsdienst, levensovertuiging, politieke gezindheid, ras, geslacht, handicap, seksuele gerichtheid of op welke grond dan ook, is niet toegestaan.', 'Grondwet, artikel 1'),
]
