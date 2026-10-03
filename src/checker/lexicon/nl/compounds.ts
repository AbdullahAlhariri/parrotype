// Compounds written apart ("Engelse ziekte", §6.7) and vowel clashes that need a hyphen (§3.10).

const SPLIT = `zieken huis|ziekenhuis kaas soufflé|kaassoufflé account manager|accountmanager
  management team|managementteam contact persoon|contactpersoon werk ervaring|werkervaring
  auto verzekering|autoverzekering computer programma|computerprogramma telefoon nummer|telefoonnummer
  e-mail adres|e-mailadres taal fout|taalfout spelling controle|spellingcontrole zorg verzekering|zorgverzekering
  klanten service|klantenservice sollicitatie gesprek|sollicitatiegesprek verjaardags feest|verjaardagsfeest
  voetbal wedstrijd|voetbalwedstrijd boodschappen lijst|boodschappenlijst studenten kamer|studentenkamer
  tand arts|tandarts huis arts|huisarts service desk|servicedesk help desk|helpdesk web winkel|webwinkel
  gebruikers naam|gebruikersnaam wacht woord|wachtwoord zonne bril|zonnebril koffie machine|koffiemachine
  sinaasappel sap|sinaasappelsap kinder opvang|kinderopvang bus halte|bushalte trein station|treinstation
  fietsen stalling|fietsenstalling salaris verhoging|salarisverhoging eind examen|eindexamen
  zomer vakantie|zomervakantie kerst vakantie|kerstvakantie boeken kast|boekenkast huis werk|huiswerk
  rij bewijs|rijbewijs`

/** "zieken huis" -> "ziekenhuis" (keys are the lowercase two-word form) */
export const SPLIT_COMPOUNDS: ReadonlyMap<string, string> = new Map(
  [...SPLIT.matchAll(/(\S+ \S+)\|(\S+)/g)].map((m) => [m[1], m[2]] as [string, string]),
)

/** vowel clash at the join needs a hyphen: auto ongeluk / autoongeluk -> auto-ongeluk */
export const VOWEL_CLASH: ReadonlyMap<string, string> = new Map(
  Object.entries({
    'auto ongeluk': 'auto-ongeluk',
    autoongeluk: 'auto-ongeluk',
    'zee egel': 'zee-egel',
    zeeegel: 'zee-egel',
    'na apen': 'na-apen',
    naapen: 'na-apen',
    'radio omroep': 'radio-omroep',
    radioomroep: 'radio-omroep',
    'auto industrie': 'auto-industrie',
    autoindustrie: 'auto-industrie',
    'foto opdracht': 'foto-opdracht',
    'zonne energie': 'zonne-energie',
    zonneenergie: 'zonne-energie',
    'mini ijsje': 'mini-ijsje',
    'thee ei': 'thee-ei',
    theeei: 'thee-ei',
  }),
)

const CLASH_PAIRS = new Set('aa ai au ee ei eu ie ij oe oi oo ou ui uu'.split(' '))

/** true when joining a and b would glue two vowels into one sound (zee+egel, auto+ongeluk) */
export const vowelsClash = (a: string, b: string) => CLASH_PAIRS.has(a.slice(-1) + b.slice(0, 1))
