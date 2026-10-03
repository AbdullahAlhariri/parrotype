// American vs British spelling markers (docs/research/english-errors.md section 4.3).
// Every pair below is checked in variety.test.ts: the US form is only in the en-US Hunspell list and the
// UK form only in en-GB. Pairs that are valid in both varieties with different meanings are left out
// (license/licence, practice/practise, program/programme, tire/tyre, check/cheque, meter/metre,
// story/storey, curb/kerb, draft/draught, inquiry/enquiry, disk/disc, dialog/dialogue, judgment/judgement,
// mom/mum, donut/doughnut, fetus/foetus).

const PAIRS = `
color/colour colors/colours colored/coloured coloring/colouring colorful/colourful colorless/colourless
favorite/favourite favorites/favourites flavor/flavour flavors/flavours flavored/flavoured
honor/honour honors/honours honored/honoured honorable/honourable humor/humour humorless/humourless
labor/labour labored/laboured laborer/labourer laborers/labourers neighbor/neighbour neighbors/neighbours
neighborhood/neighbourhood neighborhoods/neighbourhoods neighboring/neighbouring behavior/behaviour
behaviors/behaviours behavioral/behavioural harbor/harbour harbors/harbours rumor/rumour rumors/rumours
vapor/vapour odor/odour odors/odours savory/savoury endeavor/endeavour endeavors/endeavours
armor/armour vigor/vigour valor/valour splendor/splendour parlor/parlour
center/centre centers/centres centered/centred theater/theatre theaters/theatres fiber/fibre fibers/fibres
liter/litre liters/litres kilometer/kilometre kilometers/kilometres centimeter/centimetre centimeters/centimetres
millimeter/millimetre millimeters/millimetres somber/sombre luster/lustre specter/spectre caliber/calibre
maneuver/manoeuvre maneuvers/manoeuvres
analyze/analyse analyzed/analysed analyzing/analysing paralyze/paralyse paralyzed/paralysed
catalog/catalogue catalogs/catalogues
traveled/travelled traveling/travelling traveler/traveller travelers/travellers canceled/cancelled
canceling/cancelling labeled/labelled labeling/labelling modeling/modelling modeled/modelled fueled/fuelled
fueling/fuelling signaled/signalled totaled/totalled jeweler/jeweller counselor/counsellor marvelous/marvellous
woolen/woollen enroll/enrol enrollment/enrolment fulfill/fulfil fulfillment/fulfilment skillful/skilful
willful/wilful installment/instalment
defense/defence offense/offence pretense/pretence
pediatric/paediatric anemia/anaemia anesthesia/anaesthesia estrogen/oestrogen leukemia/leukaemia
orthopedic/orthopaedic diarrhea/diarrhoea
gray/grey aluminum/aluminium airplane/aeroplane airplanes/aeroplanes plow/plough cozy/cosy
mustache/moustache math/maths pajamas/pyjamas jewelry/jewellery mold/mould moldy/mouldy
smolder/smoulder artifact/artefact artifacts/artefacts sulfur/sulphur skeptic/sceptic skeptical/sceptical
`

const pairs = PAIRS.trim()
  .split(/\s+/)
  .map((p) => p.split('/') as [string, string])

export const EN_VARIETY_PAIRS: ReadonlyArray<readonly [us: string, uk: string]> = pairs

/** American form -> British form */
export const US_TO_UK: ReadonlyMap<string, string> = new Map(pairs)
/** British form -> American form */
export const UK_TO_US: ReadonlyMap<string, string> = new Map(pairs.map(([us, uk]) => [uk, us]))

/**
 * Stems that take -ize in American and -ise in British spelling (organize/organise). Oxford spelling
 * (-ize with otherwise British spelling) is legitimate, so -ize/-ise only counts as a mix inside one text.
 * Always-ise words (advertise, advise, exercise, surprise, otherwise...) are not stems here.
 */
export const IZE_STEMS: ReadonlySet<string> = new Set(
  `agon alphabet antagon apolog author canon capital caramel carbon categor cauter central character civil colon
  commercial compartmental computer conceptual contextual critic custom decentral democrat demonet desensit destabil
  digit dramat econom emotional emphas energ equal evangel familiar fantas fertil fictional final formal fossil galvan
  general glamor global harmon hospital human hybrid hypnot hypothes ideal immortal immun individual industrial
  institutional internal italic item jeopard legal legitim liberal lion local magnet marginal material maxim mechan
  memor memorial mesmer metabol miniatur minim mobil modern moistur monopol moral motor nasal national natural neutral
  normal notar optim organ ostrac oxid particular pasteur patron penal personal plagiar plural polar politic popular
  pressur priorit privat proselyt public pulver radical random rational real recogn regular reorgan revital revolution
  romantic sanit satir scandal scrutin sensit serial sermon social solemn special stabil standard steril stigmat subsid
  summar symbol sympath synchron synthes tantal terror theor traumat trivial tyrann union urban util vandal vapor
  verbal victim visual vital vocal vulcan weather western`.split(/\s+/),
)

const IZE_RE = /^([a-z]+)i([sz])(e|es|ed|ing|ation|ations)$/

/** 'ize' | 'ise' for words like organize / organisation, else null */
export function izeIse(lower: string): 'ize' | 'ise' | null {
  const m = IZE_RE.exec(lower)
  if (!m || !IZE_STEMS.has(m[1])) return null
  return m[2] === 'z' ? 'ize' : 'ise'
}

/** swap -ize and -ise in a word known to izeIse() */
const SWAP: Record<string, string> = { s: 'z', z: 's', S: 'Z', Z: 'S' }
export const swapIzeIse = (word: string) =>
  word.replace(/(i)([sz])(e|es|ed|ing|ation|ations)$/i, (_, i: string, z: string, rest: string) => i + SWAP[z] + rest)
