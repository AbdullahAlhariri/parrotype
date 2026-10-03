import { set } from './words'

// Curated noun genders (docs/research/dutch-errors.md §6.1-6.2). Only nouns in these lists are flagged
// by the article rules; everything else is left alone.

/** 315 frequent het-nouns, most frequent first */
export const HET_NOUNS = set(`leven jaar huis geld werk uur eten meisje probleem kind hoofd ding moment plan water land
  verhaal bloed nieuws bed hart begin lichaam gezicht nummer deel team geval geluk wapen vertrouwen recht kantoor
  onderzoek bewijs stuk woord antwoord boek ziekenhuis gevoel contact schip plezier einde spel gebruik leger geheim
  ongeluk slachtoffer feest gevaar succes bedrijf vuur hotel doel gesprek huwelijk vliegtuig gezin gebouw bureau
  bericht oog aantal gebied eind respect paard risico midden adres bezoek park volk systeem raam mes spoor gevecht
  feit verschil verlies been monster ijs appartement vlees glas goud eiland beeld dak dorp dossier geluid bier gat
  proces programma advies bezit gedrag ontbijt voedsel geweld verband publiek rapport beest kamp strand bad toilet
  telefoontje lid signaal veld project belang zwaard afscheid aanbod contract internet ontslag noorden talent
  cadeau geheugen station diner besluit verstand papier verzoek zicht graf dier westen niveau voordeel geduld
  personeel zuiden verslag gas excuus bord voorstel terrein horloge pensioen artikel brood voorbeeld vliegveld
  centrum universum materiaal shirt beroep bezwaar zwembad verdriet uniform onderwerp gedeelte model oor lijf lied
  seizoen huiswerk onderdeel touw kasteel resultaat apparaat oosten gewicht geschenk zand varken hout merk hek café
  gras interview middel podium effect masker museum kopje kruis schema oordeel ei uitzicht vat theater netwerk
  gebrek rijbewijs ministerie nut ondergoed incident vak speelgoed dagboek bewustzijn avontuur karakter college
  paspoort voertuig zout afval gevolg loon experiment gemak concert bestuur testament mysterie symbool profiel
  verkeer paleis recept scherm kwart drama bedrag lawaai konijn misdrijf fruit kanaal gereedschap misbruik nest
  kostuum hoofdstuk jasje begrip toestel accent congres verlof kwartier verblijf tekort beleid detail salaris
  bestand paradijs toezicht circus protocol product winkelcentrum wachtwoord examen gedicht diploma tapijt ontwerp
  hemd gezag vervoer plafond onderwijs gerecht familielid formulier schaap inkomen instrument overhemd getal plein
  hert insect stadion cijfer klimaat koor continent stadhuis potlood kampioenschap nadeel orkest laken woordenboek
  voorjaar kruispunt register gebak alfabet bestek toetsenbord doelpunt servies najaar werkwoord fietspad`)

/** 164 de-nouns learners often get wrong */
export const DE_NOUNS = set(`weg man tijd dood dag vader vrouw moeder auto vriend hand vraag jongen wereld zoon familie
  politie manier kans hulp stad pijn school broer kamer dokter foto dochter week deur baby nacht avond vriendin baas
  telefoon fout liefde buurt baan mond zin zus film informatie koffie lucht maand muziek afspraak bank straat rug
  prijs stem keuze situatie tafel reis partner regel oma arm sleutel kerk zon brief zee wedstrijd les computer winkel
  angst muur neus broek geschiedenis hoogte bus tas thee collega rekening verjaardag trein opa ochtend keuken energie
  stoel voet ervaring vakantie video bruiloft vorm radio maan klas krant mening wind rivier chef brug jas trap zomer
  universiteit oplossing klant ziekte kleur vergadering tuin melk omgeving kast vloer berg pizza taal natuur buik
  leraar markt gezondheid kaas winter regen klok douche middag bril fiets sneeuw sport bibliotheek uitnodiging
  opleiding soep tekst televisie koelkast agenda laptop temperatuur website buurman schoen cultuur lamp lente
  grootte appel muis belasting lengte tand herfst cursus app groente printer`)

/** homographs that make "de X" / "het X" legitimate (§4.1), plus fixed phrases */
export const ARTICLE_EXCLUSIONS = set(`wit meer weer verleden totaal licht recht publiek uniform patroon teken voetbal weg
  tijd kwart dood`)

/** het-nouns for people: "Het schoolhoofd, die ..." is accepted after a comma (REL-01) */
export const PERSON_HET_NOUNS = set('meisje kind hoofd schoolhoofd familielid lid slachtoffer personeelslid')

/** countable nouns people own or relate to: safe after "me/jou/u" + noun (PRN rules) */
export const COUNT_NOUNS = set(`moeder vader broer zus zusje broertje oma opa oom tante neef nicht vriend vriendin
  vriendje vriendinnetje man vrouw zoon dochter kind baby buurman buurvrouw baas collega leraar lerares juf meester
  dokter familie fiets auto huis kamer telefoon mobiel tas boek jas hond kat paard laptop computer sleutel portemonnee
  pen bril horloge schoen broek trui shirt fototoestel camera bed tuin school werk baan naam adres bericht brief
  mail e-mail vraag antwoord reactie aanvraag bestelling bezoek komst account wachtwoord rekening nummer
  telefoonnummer verjaardag feest kantoor koffer rugzak paspoort rijbewijs huiswerk mening idee plan cadeau`)

/** formal nouns after "Bedankt voor u ..." */
export const THANKS_NOUNS = set(`bericht brief mail e-mail vraag antwoord reactie aanvraag bestelling bezoek komst
  aandacht begrip geduld hulp tijd interesse medewerking inzet steun uitnodiging feedback`)

const IRREGULAR_PLURALS = set(`kinderen eieren bladeren liederen kalveren lammeren volkeren runderen steden schepen
  dagen wegen gaten glazen baden ouders mensen leden`)

/** best-effort plural forms of the curated nouns (used to spot "beiden + plural noun") */
export function pluralCandidates(noun: string): string[] {
  const out = [noun + 's', noun + 'en', noun + "'s"]
  const m = /^(.*?)([^aeiouy])$/.exec(noun)
  if (m) {
    out.push(noun + m[2] + 'en') // man -> mannen
    const long = /^(.*)(aa|ee|oo|uu)([^aeiouy])$/.exec(noun)
    if (long) out.push(long[1] + long[2][0] + long[3] + 'en') // jaar -> jaren
    if (noun.endsWith('s')) out.push(noun.slice(0, -1) + 'zen') // huis -> huizen
    if (noun.endsWith('f')) out.push(noun.slice(0, -1) + 'ven') // brief -> brieven
  }
  if (/[aiouy]$/.test(noun)) out.push(noun + "'s")
  return out
}

export const PLURAL_NOUNS: ReadonlySet<string> = new Set([
  ...IRREGULAR_PLURALS,
  ...[...HET_NOUNS, ...DE_NOUNS, ...COUNT_NOUNS].flatMap(pluralCandidates),
  ...set(`kanten partijen teams jongens meisjes handen ogen oren benen armen voeten opties broers zussen landen
    auto's huizen keren kanten studenten mogelijkheden vrienden vriendinnen ploegen groepen`),
])

/** -je words that are not diminutives */
const NOT_DIMINUTIVE = set('oranje franje kastanje plunje bonje')

/** singular diminutive (het-word): huisje, boompje, koninkje, balletje. Plural -jes is excluded. */
export function isDiminutive(word: string): boolean {
  if (word.length < 5 || NOT_DIMINUTIVE.has(word)) return false
  if (word === 'meisje') return true
  if (!/(?:tje|pje|kje|je)$/.test(word)) return false
  const base = word.replace(/(?:etje|tje|pje|kje|je)$/, '')
  return HET_NOUNS.has(base) || DE_NOUNS.has(base) || COUNT_NOUNS.has(base) || /(?:tje|pje|kje)$/.test(word)
}

export const isHetNoun = (w: string) => HET_NOUNS.has(w) && !ARTICLE_EXCLUSIONS.has(w)
export const isDeNoun = (w: string) => DE_NOUNS.has(w) && !ARTICLE_EXCLUSIONS.has(w)
export const isKnownNoun = (w: string) => HET_NOUNS.has(w) || DE_NOUNS.has(w) || COUNT_NOUNS.has(w)
