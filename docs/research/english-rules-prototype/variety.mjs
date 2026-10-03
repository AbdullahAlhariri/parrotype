// US/UK spelling consistency (prototype). Curated pairs only; ambiguous pairs are deliberately left out.
// Pattern families: -or/-our, -er/-re, -ize/-ise (handled separately: Oxford spelling allows -ize in UK),
// -yze/-yse, -l-/-ll-, -ense/-ence, -og/-ogue, ae/oe -> e.
export const PAIRS = [
  ['color', 'colour'], ['favorite', 'favourite'], ['flavor', 'flavour'], ['honor', 'honour'], ['humor', 'humour'],
  ['labor', 'labour'], ['neighbor', 'neighbour'], ['behavior', 'behaviour'], ['harbor', 'harbour'], ['rumor', 'rumour'],
  ['center', 'centre'], ['theater', 'theatre'], ['fiber', 'fibre'], ['liter', 'litre'], ['kilometer', 'kilometre'],
  ['analyze', 'analyse'], ['paralyze', 'paralyse'], ['catalog', 'catalogue'], ['traveled', 'travelled'], ['traveling', 'travelling'],
  ['traveler', 'traveller'], ['canceled', 'cancelled'], ['canceling', 'cancelling'], ['labeled', 'labelled'], ['modeling', 'modelling'],
  ['jewelry', 'jewellery'], ['enroll', 'enrol'], ['fulfill', 'fulfil'], ['skillful', 'skilful'], ['defense', 'defence'],
  ['offense', 'offence'], ['pajamas', 'pyjamas'], ['gray', 'grey'], ['mom', 'mum'], ['aluminum', 'aluminium'],
  ['airplane', 'aeroplane'], ['pediatric', 'paediatric'], ['maneuver', 'manoeuvre'], ['plow', 'plough'], ['cozy', 'cosy'],
  ['donut', 'doughnut'], ['mustache', 'moustache'], ['gotten', null], ['math', 'maths'], ['apologize', 'apologise'],
];
// Only the inflection-insensitive base forms above are listed; add -s/-ed/-ing variants in the real data file.
// Deliberately EXCLUDED (valid in both varieties with different meanings or both used):
export const AMBIGUOUS = ['license/licence', 'practice/practise', 'program/programme', 'tire/tyre', 'check/cheque', 'meter/metre',
  'story/storey', 'curb/kerb', 'draft/draught', 'inquiry/enquiry', 'disk/disc', 'dialog/dialogue', 'judgment/judgement', 'ax/axe'];

const US = new Map(), UK = new Map();
for (const [us, uk] of PAIRS) { if (us) US.set(us, uk); if (uk) UK.set(uk, us); }
const IZE = /\b\w{3,}iz(e|es|ed|ing|ation|ations)\b/gi, ISE = /\b\w{3,}is(e|es|ed|ing|ation|ations)\b/gi;
const ISE_STOP = /^(advertis|advis|apprais|arise|chastis|compris|compromis|concis|demis|despis|devis|disguis|enterpris|excis|exercis|expertis|franchis|improvis|incis|merchandis|nois|pois|precis|premis|promis|revis|rise|supervis|surmis|surpris|televis|wis|vis|cris|prais|rais|bruis|cruis|pois|franchis|exercis|treatis|paradis|reprise)/i;

export function varietyReport(text) {
  const us = [], uk = [];
  for (const m of text.matchAll(/[A-Za-z]+/g)) {
    const w = m[0].toLowerCase();
    if (US.has(w)) us.push({ word: m[0], index: m.index, other: US.get(w) });
    if (UK.has(w)) uk.push({ word: m[0], index: m.index, other: UK.get(w) });
  }
  const ize = [...text.matchAll(IZE)].map(m => m[0]);
  const ise = [...text.matchAll(ISE)].map(m => m[0]).filter(w => !ISE_STOP.test(w));
  // Flag the MINORITY variety (or the opposite of the user's chosen variety)
  const minority = us.length && uk.length ? (us.length >= uk.length ? uk : us) : [];
  const izeMix = ize.length && ise.length ? (ize.length >= ise.length ? ise : ize) : [];
  return { usCount: us.length, ukCount: uk.length, flag: minority, izeIseMix: izeMix };
}
