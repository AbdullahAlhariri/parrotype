import { set } from './words'

// Verb lexicon (docs/research/dutch-errors.md §3.4, §6.3-6.6). Every form here is verified against
// the Dutch Hunspell list in lexicon.test.ts.

export interface VerbForms {
  inf: string
  /** ik-form (stem) */
  ik: string
  /** hij-form (stem + t, or the stem when it already ends in t) */
  hij: string
  pastSg: string
  pastPl: string
  part: string
  /** auxiliary for the perfect: h = hebben, z = zijn, hz = both, '' = none */
  aux: 'h' | 'z' | 'hz' | ''
}

/** 134 strong, mixed and irregular verbs: inf | hij | past sg | past pl | participle | aux */
const STRONG_TABLE = `
worden wordt werd werden geworden z
vinden vindt vond vonden gevonden h
houden houdt hield hielden gehouden h
rijden rijdt reed reden gereden hz
snijden snijdt sneed sneden gesneden h
glijden glijdt gleed gleden gegleden hz
lijden lijdt leed leden geleden h
strijden strijdt streed streden gestreden h
mijden mijdt meed meden gemeden h
vermijden vermijdt vermeed vermeden vermeden h
bieden biedt bood boden geboden h
verbieden verbiedt verbood verboden verboden h
binden bindt bond bonden gebonden h
verbinden verbindt verbond verbonden verbonden h
zenden zendt zond zonden gezonden h
schenden schendt schond schonden geschonden h
bidden bidt bad baden gebeden h
raden raadt raadde raadden geraden h
laden laadt laadde laadden geladen h
braden braadt braadde braadden gebraden h
scheiden scheidt scheidde scheidden gescheiden hz
treden treedt trad traden getreden hz
betreden betreedt betrad betraden betreden h
overtreden overtreedt overtrad overtraden overtreden h
wenden wendt wendde wendden gewend h
zijn is was waren geweest z
hebben heeft had hadden gehad h
kunnen kan kon konden gekund h
zullen zal zou zouden - -
mogen mag mocht mochten gemogen h
moeten moet moest moesten gemoeten h
willen wil wilde wilden gewild h
weten weet wist wisten geweten h
gaan gaat ging gingen gegaan z
staan staat stond stonden gestaan h
verstaan verstaat verstond verstonden verstaan h
begrijpen begrijpt begreep begrepen begrepen h
doen doet deed deden gedaan h
slaan slaat sloeg sloegen geslagen h
zien ziet zag zagen gezien h
komen komt kwam kwamen gekomen z
nemen neemt nam namen genomen h
geven geeft gaf gaven gegeven h
lezen leest las lazen gelezen h
eten eet at aten gegeten h
vergeten vergeet vergat vergaten vergeten hz
zitten zit zat zaten gezeten h
liggen ligt lag lagen gelegen h
leggen legt legde legden gelegd h
zetten zet zette zetten gezet h
spreken spreekt sprak spraken gesproken h
breken breekt brak braken gebroken hz
treffen treft trof troffen getroffen h
schrijven schrijft schreef schreven geschreven h
blijven blijft bleef bleven gebleven z
kijken kijkt keek keken gekeken h
lijken lijkt leek leken geleken h
krijgen krijgt kreeg kregen gekregen h
beginnen begint begon begonnen begonnen z
winnen wint won wonnen gewonnen h
drinken drinkt dronk dronken gedronken h
zingen zingt zong zongen gezongen h
springen springt sprong sprongen gesprongen hz
schieten schiet schoot schoten geschoten h
sluiten sluit sloot sloten gesloten h
genieten geniet genoot genoten genoten h
gieten giet goot goten gegoten h
ruiken ruikt rook roken geroken h
buigen buigt boog bogen gebogen h
vliegen vliegt vloog vlogen gevlogen hz
liegen liegt loog logen gelogen h
kiezen kiest koos kozen gekozen h
verliezen verliest verloor verloren verloren h
vriezen vriest vroor vroren gevroren h
wegen weegt woog wogen gewogen h
trekken trekt trok trokken getrokken h
vechten vecht vocht vochten gevochten h
dragen draagt droeg droegen gedragen h
varen vaart voer voeren gevaren hz
graven graaft groef groeven gegraven h
helpen helpt hielp hielpen geholpen h
sterven sterft stierf stierven gestorven z
werpen werpt wierp wierpen geworpen h
zwemmen zwemt zwom zwommen gezwommen hz
lopen loopt liep liepen gelopen hz
roepen roept riep riepen geroepen h
slapen slaapt sliep sliepen geslapen h
laten laat liet lieten gelaten h
vallen valt viel vielen gevallen z
hangen hangt hing hingen gehangen h
vangen vangt ving vingen gevangen h
heten heet heette heetten geheten h
lachen lacht lachte lachten gelachen h
bakken bakt bakte bakten gebakken h
vragen vraagt vroeg vroegen gevraagd h
zeggen zegt zei zeiden gezegd h
kopen koopt kocht kochten gekocht h
brengen brengt bracht brachten gebracht h
denken denkt dacht dachten gedacht h
zoeken zoekt zocht zochten gezocht h
bezoeken bezoekt bezocht bezochten bezocht h
verkopen verkoopt verkocht verkochten verkocht h
jagen jaagt joeg joegen gejaagd h
waaien waait woei woeien gewaaid h
zweren zweert zwoer zwoeren gezworen h
wijzen wijst wees wezen gewezen h
prijzen prijst prees prezen geprezen h
rijzen rijst rees rezen gerezen z
bijten bijt beet beten gebeten h
smijten smijt smeet smeten gesmeten h
verdwijnen verdwijnt verdween verdwenen verdwenen z
verschijnen verschijnt verscheen verschenen verschenen z
schijnen schijnt scheen schenen geschenen h
stijgen stijgt steeg stegen gestegen z
zwijgen zwijgt zweeg zwegen gezwegen h
grijpen grijpt greep grepen gegrepen h
knijpen knijpt kneep knepen geknepen h
fluiten fluit floot floten gefloten h
kruipen kruipt kroop kropen gekropen hz
zuigen zuigt zoog zogen gezogen h
bederven bederft bedierf bedierven bedorven hz
gelden geldt gold golden gegolden h
schelden scheldt schold scholden gescholden h
smelten smelt smolt smolten gesmolten hz
zwellen zwelt zwol zwollen gezwollen z
stinken stinkt stonk stonken gestonken h
dwingen dwingt dwong dwongen gedwongen h
klimmen klimt klom klommen geklommen hz
glimmen glimt glom glommen geglommen h
wassen wast waste wasten gewassen h
scheppen schept schiep schiepen geschapen h
bevelen beveelt beval bevalen bevolen h
stelen steelt stal stalen gestolen h
bewegen beweegt bewoog bewogen bewogen h`

/** frequent weak verbs: inf | ik | hij | past sg | participle | aux */
const WEAK_TABLE = `
werken werk werkt werkte gewerkt h
wonen woon woont woonde gewoond h
maken maak maakt maakte gemaakt h
spelen speel speelt speelde gespeeld h
leren leer leert leerde geleerd h
praten praat praat praatte gepraat h
fietsen fiets fietst fietste gefietst hz
wachten wacht wacht wachtte gewacht h
horen hoor hoort hoorde gehoord h
hopen hoop hoopt hoopte gehoopt h
koken kook kookt kookte gekookt h
dansen dans danst danste gedanst h
missen mis mist miste gemist h
betalen betaal betaalt betaalde betaald h
vertellen vertel vertelt vertelde verteld h
gebeuren gebeur gebeurt gebeurde gebeurd z
veranderen verander verandert veranderde veranderd hz
bedoelen bedoel bedoelt bedoelde bedoeld h
proberen probeer probeert probeerde geprobeerd h
gebruiken gebruik gebruikt gebruikte gebruikt h
studeren studeer studeert studeerde gestudeerd h
reizen reis reist reisde gereisd hz
leven leef leeft leefde geleefd h
geloven geloof gelooft geloofde geloofd h
beloven beloof belooft beloofde beloofd h
verhuizen verhuis verhuist verhuisde verhuisd z
luisteren luister luistert luisterde geluisterd h
wandelen wandel wandelt wandelde gewandeld hz
bellen bel belt belde gebeld h
huilen huil huilt huilde gehuild h
trouwen trouw trouwt trouwde getrouwd hz
bouwen bouw bouwt bouwde gebouwd h
noemen noem noemt noemde genoemd h
voelen voel voelt voelde gevoeld h
delen deel deelt deelde gedeeld h
stellen stel stelt stelde gesteld h
zorgen zorg zorgt zorgde gezorgd h
volgen volg volgt volgde gevolgd h
kloppen klop klopt klopte geklopt h
stoppen stop stopt stopte gestopt hz
kussen kus kust kuste gekust h
kennen ken kent kende gekend h
antwoorden antwoord antwoordt antwoordde geantwoord h
duren duur duurt duurde geduurd h
openen open opent opende geopend h
sturen stuur stuurt stuurde gestuurd h
pakken pak pakt pakte gepakt h
tekenen teken tekent tekende getekend h
rekenen reken rekent rekende gerekend h
oefenen oefen oefent oefende geoefend h
herhalen herhaal herhaalt herhaalde herhaald h
verdienen verdien verdient verdiende verdiend h
bestellen bestel bestelt bestelde besteld h
verbeteren verbeter verbetert verbeterde verbeterd h
verwachten verwacht verwacht verwachtte verwacht h
ontmoeten ontmoet ontmoet ontmoette ontmoet h
rusten rust rust rustte gerust h
typen typ typt typte getypt h
lenen leen leent leende geleend h
tellen tel telt telde geteld h
kosten kost kost kostte gekost h
groeien groei groeit groeide gegroeid z
redden red redt redde gered h
landen land landt landde geland z
melden meld meldt meldde gemeld h
branden brand brandt brandde gebrand h
verbranden verbrand verbrandt verbrandde verbrand hz
leiden leid leidt leidde geleid h
bereiden bereid bereidt bereidde bereid h
verspreiden verspreid verspreidt verspreidde verspreid h
vermoorden vermoord vermoordt vermoordde vermoord h
beantwoorden beantwoord beantwoordt beantwoordde beantwoord h
begeleiden begeleid begeleidt begeleidde begeleid h
bevrijden bevrijd bevrijdt bevrijdde bevrijd h
kleden kleed kleedt kleedde gekleed h
voeden voed voedt voedde gevoed h
besteden besteed besteedt besteedde besteed h
vermoeden vermoed vermoedt vermoedde vermoed h
schudden schud schudt schudde geschud h
wedden wed wedt wedde gewed h
downloaden download downloadt downloadde gedownload h
uploaden upload uploadt uploadde geüpload h
bloeden bloed bloedt bloedde gebloed h`

const IK_IRREGULAR: Record<string, string> = {
  zijn: 'ben', hebben: 'heb', kunnen: 'kan', zullen: 'zal', mogen: 'mag', willen: 'wil', gaan: 'ga', staan: 'sta',
  verstaan: 'versta', slaan: 'sla', zien: 'zie', doen: 'doe', komen: 'kom',
}

const parseStrong = (line: string): VerbForms => {
  const [inf, hij, pastSg, pastPl, part, aux] = line.split(' ')
  const root = inf.replace(/en$/, '')
  const ik = IK_IRREGULAR[inf] ?? (/t$/.test(root) && hij.endsWith('t') ? hij : hij.replace(/t$/, ''))
  return { inf, ik, hij, pastSg, pastPl, part: part === '-' ? '' : part, aux: aux === '-' ? '' : (aux as VerbForms['aux']) }
}

const parseWeak = (line: string): VerbForms => {
  const [inf, ik, hij, pastSg, part, aux] = line.split(' ')
  return { inf, ik, hij, pastSg, pastPl: pastSg + 'n', part, aux: aux as VerbForms['aux'] }
}

const lines = (table: string) => table.trim().split('\n').map((l) => l.trim()).filter(Boolean)

export const STRONG_VERBS: VerbForms[] = lines(STRONG_TABLE).map(parseStrong)
export const WEAK_VERBS: VerbForms[] = lines(WEAK_TABLE).map(parseWeak)
export const VERBS: VerbForms[] = [...STRONG_VERBS, ...WEAK_VERBS]

/* ------------------------------------------------------------------ */
/* d-stem verbs (the dt danger list, §6.3)                             */
/* ------------------------------------------------------------------ */

/** ik-form -> hij-form for verbs whose stem ends in d: word -> wordt */
export const DSTEM: ReadonlyMap<string, string> = (() => {
  const m = new Map<string, string>()
  for (const v of VERBS) if (v.ik.endsWith('d') && v.hij === v.ik + 't') m.set(v.ik, v.hij)
  // less frequent ones from §6.3 (ik-forms)
  const extra = `beland vermeld verkleed hoed voorbereid verleid misleid overlijd spreid benijd wijd luid duid vergoed
    beïnvloed aanvaard verantwoord aanbied bestrijd onderscheid verraad baad verwond`
  for (const ik of extra.trim().split(/\s+/)) m.set(ik, ik + 't')
  // clipped ik-forms (ik hou, ik rij) are fine with ik, but the hij-form still needs dt
  m.set('hou', 'houdt')
  m.set('rij', 'rijdt')
  m.set('snij', 'snijdt')
  m.set('glij', 'glijdt')
  return m
})()

/** hij-form -> ik-form for every verb where they differ: wordt -> word, loopt -> loop, heeft -> heb */
export const T3_TO_IK: ReadonlyMap<string, string> = (() => {
  const m = new Map<string, string>()
  for (const v of VERBS) if (v.hij !== v.ik) m.set(v.hij, v.ik)
  for (const [ik, hij] of DSTEM) if (!m.has(hij) && ik.endsWith('d')) m.set(hij, ik)
  return m
})()

/** d-stem forms that are also nouns or adjectives: het antwoord, het land, bereid zijn */
export const DSTEM_HOMOGRAPHS = set(`antwoord land kleed raad dood geld bloed strijd hoed brand bad luid wijd bereid
  verspreid verbrand vermoord besteed beantwoord begeleid bevrijd gekleed red wed scheid bind`)

/** hij-forms whose ik-form is clipped and therefore allowed: ik hou, ik rij, hou je */
export const CLIPPED_IK = set('hou rij snij glij')

/** every finite form (present + past) of the lexicon verbs */
export const FINITE_FORMS: ReadonlySet<string> = new Set(
  VERBS.flatMap((v) => [v.ik, v.hij, v.pastSg, v.pastPl, v.inf]).filter(Boolean),
)
export const PAST_FORMS: ReadonlySet<string> = new Set(VERBS.flatMap((v) => [v.pastSg, v.pastPl]))
export const INFINITIVES: ReadonlySet<string> = new Set(VERBS.map((v) => v.inf))
export const PARTICIPLES: ReadonlySet<string> = new Set(VERBS.map((v) => v.part).filter(Boolean))

/** past tense with a wrong final t on a strong verb: werdt -> werd (DT-10) */
export const PAST_DT: ReadonlyMap<string, string> = (() => {
  const m = new Map<string, string>()
  for (const v of STRONG_VERBS) if (v.pastSg.endsWith('d')) m.set(v.pastSg + 't', v.pastSg)
  m.delete('doodt')
  return m
})()

/* ------------------------------------------------------------------ */
/* Participle / present confusables (§6.5)                             */
/* ------------------------------------------------------------------ */

const CONF_PAIRS = `gebeurd|gebeurt verteld|vertelt betekend|betekent veranderd|verandert bedoeld|bedoelt betaald|betaalt
  verdiend|verdient beloofd|belooft geloofd|gelooft herinnerd|herinnert behandeld|behandelt bepaald|bepaalt
  verbaasd|verbaast beschermd|beschermt verklaard|verklaart vertrouwd|vertrouwt verwijderd|verwijdert
  bevestigd|bevestigt herkend|herkent vertaald|vertaalt veroordeeld|veroordeelt bedreigd|bedreigt besteld|bestelt
  bewaard|bewaart verhuisd|verhuist beschadigd|beschadigt beweerd|beweert hersteld|herstelt ontwikkeld|ontwikkelt
  beledigd|beledigt beleefd|beleeft verspild|verspilt verzameld|verzamelt beschouwd|beschouwt
  verondersteld|veronderstelt verzekerd|verzekert verzorgd|verzorgt ontkend|ontkent verstuurd|verstuurt
  vervolgd|vervolgt verdeeld|verdeelt verdedigd|verdedigt bestudeerd|bestudeert verveeld|verveelt
  vertegenwoordigd|vertegenwoordigt verbeterd|verbetert verhoogd|verhoogt benaderd|benadert bespaard|bespaart
  verenigd|verenigt beloond|beloont verlangd|verlangt beëindigd|beëindigt vertraagd|vertraagt bemoeid|bemoeit
  bestuurd|bestuurt vertoond|vertoont beoordeeld|beoordeelt erkend|erkent vervoerd|vervoert verleend|verleent
  benoemd|benoemt herhaald|herhaalt veroverd|verovert verminderd|vermindert berekend|berekent bediend|bedient
  bewonderd|bewondert versierd|versiert verhuurd|verhuurt verlaagd|verlaagt`

/** participle -> present 3sg: gebeurd -> gebeurt */
export const CONF_PART_TO_PRES: ReadonlyMap<string, string> = new Map(
  CONF_PAIRS.trim().split(/\s+/).map((p) => p.split('|') as [string, string]),
)
/** present 3sg -> participle: gebeurt -> gebeurd */
export const CONF_PRES_TO_PART: ReadonlyMap<string, string> = new Map(
  [...CONF_PART_TO_PRES].map(([a, b]) => [b, a] as [string, string]),
)

/** d-stem pairs: participle without t | present with dt (PART-05) */
export const DSTEM_PART_TO_PRES: ReadonlyMap<string, string> = new Map(
  `beantwoord|beantwoordt verbrand|verbrandt verspreid|verspreidt bereid|bereidt voorbereid|voorbereidt
  begeleid|begeleidt vermoord|vermoordt vermoed|vermoedt besteed|besteedt beïnvloed|beïnvloedt aanvaard|aanvaardt`
    .trim()
    .split(/\s+/)
    .map((p) => p.split('|') as [string, string]),
)
export const DSTEM_PRES_TO_PART: ReadonlyMap<string, string> = new Map(
  [...DSTEM_PART_TO_PRES].map(([a, b]) => [b, a] as [string, string]),
)

/** ditransitive participles: in "Wordt je dat verteld?" je is "to you" and wordt is right (DT-06) */
export const INDIRECT_OBJECT_PARTICIPLES = set(`aangeboden gegeven toegestuurd gestuurd verteld gevraagd gezegd
  beloofd aangeraden gegund geleerd getoond opgelegd voorgesteld bezorgd gebracht gemeld meegedeeld uitgelegd
  geadviseerd verweten gevraagd toegezegd aangereikt overhandigd betaald vergoed verleend aangerekend`)

/* ------------------------------------------------------------------ */
/* zijn-verbs (AUX-01, §6.6)                                           */
/* ------------------------------------------------------------------ */

/** participles that take zijn, never hebben */
export const ZIJN_PARTICIPLES = set(`gegaan gekomen gebleven geworden geweest gestorven overleden verdwenen geboren gebeurd
  aangekomen opgestaan teruggekomen meegegaan thuisgekomen uitgegaan weggegaan thuisgebleven achtergebleven
  weggebleven binnengekomen teruggegaan langsgekomen`)
/** zijn-verbs with rare hebben uses, or that double as past plural: medium confidence */
export const ZIJN_PARTICIPLES_MEDIUM = set('begonnen gevallen gestegen gedaald vertrokken verschenen')
/** participles also used as adjectives before a noun (het verdwenen geld) */
export const ADJECTIVAL_PARTICIPLES = set('verdwenen overleden geboren gestorven gevallen gestegen gedaald verschenen')

/* ------------------------------------------------------------------ */
/* English loan verbs (§3.4)                                           */
/* ------------------------------------------------------------------ */

/** wrong participle -> right participle */
export const LOAN_PARTICIPLES: ReadonlyMap<string, string> = new Map(
  Object.entries({
    geupdate: 'geüpdatet', geupdated: 'geüpdatet', 'geüpdated': 'geüpdatet', 'ge-update': 'geüpdatet',
    'ge-updated': 'geüpdatet', geupdatet: 'geüpdatet', 'geüpdate': 'geüpdatet',
    gedownloadt: 'gedownload', gedownloaded: 'gedownload',
    geupload: 'geüpload', 'geüploadt': 'geüpload', geuploaded: 'geüpload', 'geüploaded': 'geüpload',
    gedeleted: 'gedeletet', gedelete: 'gedeletet',
    gerecyclet: 'gerecycled',
    geliked: 'geliket', gelikete: 'geliket', gelikted: 'geliket',
    geraced: 'geracet',
    getimet: 'getimed',
    gefaxed: 'gefaxt',
    gecrashed: 'gecrasht',
    gechatted: 'gechat', gechatet: 'gechat',
    gemailed: 'gemaild', 'ge-emaild': 'ge-e-maild', 'ge-emailed': 'ge-e-maild', 'ge-e-mailed': 'ge-e-maild',
    gegoogled: 'gegoogeld', gegoogelt: 'gegoogeld',
    gescored: 'gescoord',
    gebarbecuet: 'gebarbecued',
    geplanned: 'gepland',
    gedealed: 'gedeald',
    gechecked: 'gecheckt', gecheckd: 'gecheckt',
    geprinted: 'geprint',
    gecoached: 'gecoacht',
    gefinished: 'gefinisht',
    geinterviewd: 'geïnterviewd', geinterviewed: 'geïnterviewd', 'geïnterviewed': 'geïnterviewd',
    gestyld: 'gestyled',
    geshopped: 'geshopt', geshoppet: 'geshopt',
    gestopped: 'gestopt',
    gedropped: 'gedropt',
    geskyped: 'geskypet',
    gesaved: 'gesavet',
    gecancelled: 'gecanceld', gecanceled: 'gecanceld',
  }),
)
