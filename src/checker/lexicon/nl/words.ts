// Closed word classes for the Dutch rules (docs/research/dutch-errors.md §4.1).

export const set = (words: string): ReadonlySet<string> => new Set(words.trim().split(/\s+/))

export const SUBJECT_PRONOUNS = set('ik jij je u hij zij ze het men wij we jullie')
/** third person singular-ish subjects that take stem + t */
export const SUBJ3 = set('hij zij ze het men u er dit dat wat wie die iemand niemand iedereen')
/** pronouns that can only be a subject, never an object or determiner */
export const SUBJECT_ONLY = set('ik jij hij zij wij we men iemand niemand iedereen')
export const OBJECT_PRONOUNS = set('me mij je jou hem haar ons jullie hen hun ze u zich')
export const POSSESSIVES = set("mijn m'n jouw je uw zijn z'n haar d'r ons onze jullie hun")

export const PREPOSITIONS = set(`in op aan met van voor naar bij uit over onder door tegen zonder tussen achter naast
  tijdens om na sinds rond binnen buiten langs via volgens vanaf tot boven beneden behalve ondanks wegens per
  richting rondom`)

export const ARTICLES = set('de het een')
export const DETERMINERS = set(`de het een geen deze dit die dat elk elke ieder iedere welk welke zo'n veel weinig
  mijn m'n jouw uw zijn z'n haar ons onze jullie hun`)

export const COORDINATORS = set('en maar want dus of noch')
export const SUBORDINATORS = set(`omdat dat als wanneer terwijl hoewel zodat voordat nadat totdat sinds zodra tenzij
  alsof doordat waardoor zolang indien mits opdat aangezien ofschoon toen`)
export const QUESTION_WORDS = set('wat wie waar wanneer waarom hoe welke welk hoeveel hoelang')

/** sentence-initial adverbs that trigger verb-second order (WO-01). Subordinator-like words left out. */
export const ADV_FRONT = set(`morgen gisteren vandaag overmorgen eergisteren daarna dan soms misschien daarom
  eigenlijk natuurlijk vaak altijd nooit hier straks vanavond vanmorgen vanochtend vanmiddag vannacht eerst later
  gelukkig helaas meestal ineens opeens vroeger binnenkort trouwens toch echter bovendien daarnaast uiteindelijk
  inmiddels intussen tegenwoordig`)
/** two-word fronted time phrases: "volgende week ik ga" */
export const ADV_FRONT_HEADS = set('volgende vorige elke iedere dit deze vorig volgend')
export const ADV_FRONT_TAILS = set('week maand jaar keer dag ochtend middag avond weekend zomer winter jaar')

/** high-frequency finite verb forms (WO rules, verb detection) */
export const FINITE = set(`ben bent is zijn heb hebt heeft hebben kan kun kunt kunnen wil wilt willen moet moeten
  mag mogen zal zult zullen ga gaat gaan kom komt komen woon woont wonen werk werkt werken doe doet doen zie ziet
  zien weet weten vind vindt vinden word wordt worden was waren had hadden ging gingen kwam kwamen zat zaten lag
  lagen stond stonden zei zeiden wist wisten kon konden wilde wilden moest moesten mocht mochten zou zouden werd
  werden deed deden zag zagen vond vonden blijf blijft blijven ligt zit staat sta loop loopt maak maakt speel speelt
  leer leert denk denkt hoop hoopt houd houdt hou krijg krijgt neem neemt geef geeft eet drink drinkt slaap slaapt
  lees leest schrijf schrijft kijk kijkt zeg zegt praat spreek spreekt koop koopt betaal betaalt`)

/** auxiliaries that take a past participle (PART-01, AUX rules) */
export const AUX_PARTICIPLE = set(`heb hebt heeft hebben had hadden ben bent is zijn was waren word wordt worden werd
  werden geworden`)
export const HEBBEN_FORMS = set('heb hebt heeft hebben had hadden')
/** verbs that may close a verb cluster around a participle without being in AUX_PARTICIPLE */
export const PARTICIPLE_COMPANIONS = set(`blijf blijft blijven bleef bleven raak raakt raken raakte raakten krijg krijgt
  krijgen kreeg kregen lijk lijkt lijken leek leken schijnt scheen voel voelt voelde voelden kan kun kunt kunnen kon
  konden moet moeten moest moesten mag mogen mocht mochten wil wilt willen wilde wilden zal zult zullen zou zouden
  ga gaat gaan ging gingen heet heette staat stond stonden ligt lag lagen zit zat zaten te`)

export const DAYS = set('maandag dinsdag woensdag donderdag vrijdag zaterdag zondag')
export const MONTHS = set('januari februari maart april mei juni juli augustus september oktober november december')
export const SEASONS = set('lente zomer herfst winter')
/** official holiday names that contain a weekday and keep their capital */
export const HOLIDAY_PREFIXES = set('goede witte stille')

/** languages, peoples and their adjectives: always capitalised in Dutch */
export const LANGUAGE_WORDS = set(`nederlands nederlandse nederlander nederlanders engels engelse engelsman arabisch
  arabische arabier arabieren frans franse fransman fransen duits duitse duitser duitsers turks turkse turk turken
  marokkaans marokkaanse marokkaan marokkanen belgisch belgische belg belgen spaans spaanse spanjaard spanjaarden
  italiaans italiaanse italiaan italianen portugees portugese grieks griekse russisch russische rus russen chinees
  chinese japans japanse koreaans koreaanse zweeds zweedse noors noorse deens deense surinaams surinaamse
  indonesisch indonesische koerdisch koerdische perzisch perzische hebreeuws hebreeuwse latijn latijnse europees
  europese amerikaans amerikaanse amerikaan amerikanen brits britse iers ierse schots schotse oostenrijks
  oostenrijkse zwitsers zwitserse egyptisch egyptische syrisch syrische irakees irakese somalisch somalische
  vlaams vlaamse hollands hollandse fries friese afrikaans afrikaanse hindi urdu berbers berberse tamazight
  oekraïens oekraïense pools poolse`)
/** language words that are also ordinary lowercase words */
export const LANGUAGE_AMBIGUOUS = set('engels fries pools hindi urdu')

/** words that never start a capitalised mid-sentence error: brand-ish or name particles */
export const NAME_PARTICLES = set("de van der den het ter ten 't")
