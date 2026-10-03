import { areAdjacent, sameKey } from './keyboard'
import { osaDistance, plainOps, type EditOp } from './osa'
import { stripTashkeel } from './text'
import type { TypoTag } from './tips'
import { HAMZA_CHARS, HAMZA_FAMILY, isVowel, label, soft, type Ctx, type TypoLabel, type TypoNature } from './typo-ctx'

// Language spelling rules for the classifier: Dutch (d/t, 't kofschip, ei/ij, tussen-n...),
// English (homophones, its/it's, ie/ei) and Arabic (hamza, taa marbuta, alif maqsura...).
// They run before the generic doubling and keyboard steps and label cognitive errors.

export function languageRule(c: Ctx): TypoLabel | null {
  if (c.lang === 'nl') return confusableNl(c) ?? dtRule(c) ?? kofschipRule(c) ?? digraphRule(c) ?? apostropheRule(c) ?? tussenNRule(c)
  if (c.lang === 'en') return homophoneEn(c) ?? apostropheRule(c) ?? ieEiRule(c)
  return arabicRule(c)
}

/** true when replacing one occurrence of `a` in `from` by `b` gives `to` */
function oneSwap(from: string, to: string, a: string, b: string): boolean {
  if (from.length - a.length + b.length !== to.length) return false
  for (let k = from.indexOf(a); k >= 0; k = from.indexOf(a, k + 1)) {
    if (from.slice(0, k) + b + from.slice(k + a.length) === to) return true
  }
  return false
}
const swapEither = (x: string, y: string, a: string, b: string) => oneSwap(x, y, a, b) || oneSwap(x, y, b, a)

const NL_PAIRS: [string, string, TypoTag][] = [
  ['de', 'het', 'de-het'], ['deze', 'dit', 'de-het'], ['ons', 'onze', 'de-het'], ['die', 'dat', 'die-dat'], ['wat', 'dat', 'die-dat'],
  ['jou', 'jouw', 'jou-jouw'], ['u', 'uw', 'jou-jouw'], ['me', 'mijn', 'me-mijn'], ["m'n", 'me', 'me-mijn'],
  ['hun', 'zij', 'hun-hen'], ['hun', 'ze', 'hun-hen'], ['hun', 'hen', 'hun-hen'], ['als', 'dan', 'als-dan'],
  ['kan', 'ken', 'lexical'], ['kunt', 'kent', 'lexical'], ['liggen', 'leggen', 'lexical'], ['zitten', 'zetten', 'lexical'],
  ['alleen', 'allen', 'lexical'], ['beide', 'beiden', 'lexical'],
]

/** one key more or less in a copy test (jou/jouw, u/uw, alleen/allen): as likely a slip as a mix-up */
const oneKeyApart = (c: Ctx) =>
  c.mode === 'copy' && !/'/.test(c.el + c.tl) && Math.abs(c.el.length - c.tl.length) === 1 && osaDistance(c.el, c.tl) === 1

function confusableNl(c: Ctx): TypoLabel | null {
  const hit = NL_PAIRS.find(([a, b]) => (c.el === a && c.tl === b) || (c.el === b && c.tl === a))
  return hit ? label(c, 'spelling', oneKeyApart(c) ? 'unknown' : 'cognitive', `'${c.E}', not '${c.T}'`, hit[2], hit[2]) : null
}

const NL_SUBJ_T = new Set(['hij', 'zij', 'ze', 'het', 'u', 'men', 'er', 'dit', 'dat', 'die', 'wat', 'wie', 'jij', 'je', 'iemand', 'niemand', 'iedereen'])
const NL_AUX = new Set(['heb', 'hebt', 'heeft', 'hebben', 'had', 'hadden', 'ben', 'bent', 'is', 'zijn', 'was', 'waren', 'word', 'wordt', 'worden', 'werd', 'werden', 'geworden'])

/**
 * Participle-like words: ge- (also after a separable particle: opgehaald) or an inseparable
 * prefix, where the participle (-d) and the 3rd person (-t) sound alike (gebeurd/gebeurt).
 */
const NL_PREFIXED =
  /^(?:(?:op|aan|af|uit|in|mee|na|om|door|over|terug|weg|toe|voor|bij|samen|vast|los|neer|tegen|achter|thuis)?ge|be|ver|ont|her|er)\p{L}{3,}$/u
/** common ge-/be-/ver- words that are not verb forms: no verb rule for gezond/gezont */
const NL_NOT_VERB = new Set(['gezond', 'gebied', 'geluid', 'gezicht', 'gedicht', 'gerecht', 'gevecht', 'gewicht', 'bericht', 'verstand', 'verband'])
/** a context word without punctuation, lowercased */
const bareWord = (w?: string) => w?.toLowerCase().replace(/[^\p{L}\p{M}']/gu, '')

function dtRule(c: Ctx): TypoLabel | null {
  const re = /^(.*?[aeiouy].*?)(dt|d|t)$/
  const me = re.exec(c.el)
  const mt = re.exec(c.tl)
  if (!me || !mt || me[1] !== mt[1] || me[2] === mt[2]) return null
  const [e, t] = [me[2], mt[2]]
  const dt = (key: string, nature: TypoNature = 'cognitive') =>
    label(c, 'spelling', nature, `d/t ending: '${c.E}', not '${c.T}'`, key, 'dt', { prev: c.o.prev ?? '' })
  // a d added to a t-word (het -> hedt, weet -> weedt) is a rolled key when copying
  if (e === 't' && t === 'dt') return c.mode === 'copy' ? null : dt('dt')
  // the stem's d left out (wordt -> wort): the same question from memory, one dropped key when copying
  if (e === 'dt' && t === 't') return dt('dt-stem', soft(c))
  const prev = bareWord(c.o.prev)
  const next = bareWord(c.o.next)
  const endsT = e !== 'd'
  if (prev === 'ik' && !endsT) return dt('dt-ik')
  if ((next === 'je' || next === 'jij') && !endsT) return dt('dt-inversion')
  if (prev && NL_SUBJ_T.has(prev) && endsT) return dt('dt-3rd')
  if (prev && NL_AUX.has(prev) && !endsT) return dt('dt-participle')
  // only verb forms end in -dt: word/wordt is the classic
  if (e === 'dt' || t === 'dt') return dt('dt')
  if (NL_PREFIXED.test(c.el) && !NL_NOT_VERB.has(c.el)) {
    // gemaakt/gemaakd, geleefd/geleeft: the participle follows 't kofschip
    if (/[kfspxh]$/.test(me[1])) return label(c, 'spelling', 'cognitive', `participle ending: '${c.E}', not '${c.T}'`, 'kofschip', 'kofschip')
    return dt('dt-prefix') // gebeurd/gebeurt, betaald/betaalt
  }
  // other words (hand, goed, kind): a final d sounds like t, the longer form shows it (handen)
  if (e === 'd') return label(c, 'spelling', 'cognitive', `final d: '${c.E}', not '${c.T}'`, 'final-d', 'final-d')
  return null // met -> med: left to the generic sound-alike label
}

const KOFSCHIP_STEM = /(?:[tkfspx]|ch|sh)$/

function kofschipRule(c: Ctx): TypoLabel | null {
  const re = /^(.{3,}?)(dde|tte|de|te)(n?)$/
  const me = re.exec(c.el)
  const mt = re.exec(c.tl)
  if (!me || !mt || me[1] !== mt[1] || me[3] !== mt[3] || me[2] === mt[2]) return null
  const doubledE = me[2].length === 3
  const doubledT = mt[2].length === 3
  if (me[2].at(-2) === mt[2].at(-2)) {
    // a lost double is the classic slip (wachtte -> wachte), an extra one just a bounce (zittten)
    if (!doubledE || doubledT) return null
    // after one short vowel the double is the ordinary closed-syllable rule (platte -> plate)
    if (/[^aeiouy][aeiouy]$/.test(me[1])) return null
  } else {
    // -de vs -te: only when 't kofschip explains the expected ending (not grote/grode),
    // or the v/z trap where the infinitive decides (leven -> leefde, reizen -> reisde)
    const stem = doubledE ? me[1] + me[2][0] : me[1]
    const isTe = me[2].at(-2) === 't'
    const trap = !isTe && /[fs]$/.test(stem)
    if (KOFSCHIP_STEM.test(stem) !== isTe && !trap) return null
  }
  return label(c, 'spelling', 'cognitive', `-de or -te: '${c.E}', not '${c.T}'`, 'kofschip', 'kofschip')
}

function digraphRule(c: Ctx): TypoLabel | null {
  if (swapEither(c.tl, c.el, 'ei', 'ij')) return label(c, 'spelling', 'cognitive', `ei/ij: '${c.E}'`, 'ei-ij', 'ei-ij')
  if (swapEither(c.tl, c.el, 'ij', 'y')) return label(c, 'spelling', 'cognitive', `ij, not y: '${c.E}'`, 'ij-y', 'ij-y')
  if (swapEither(c.tl, c.el, 'au', 'ou')) return label(c, 'spelling', 'cognitive', `au/ou: '${c.E}'`, 'au-ou', 'au-ou')
  if (swapEither(c.tl, c.el, 'g', 'ch')) return label(c, 'spelling', 'cognitive', `g/ch: '${c.E}'`, 'g-ch', 'g-ch')
  // -lik is also a single dropped j, so it only counts when typing from memory
  const lijk = c.mode === 'dictation' ? ['luk', 'lek', 'lik', 'lijck'] : ['luk', 'lek', 'lijck']
  if (lijk.some((x) => oneSwap(c.tl, c.el, x, 'lijk'))) {
    return label(c, 'spelling', 'cognitive', `-lijk: '${c.E}'`, 'lijk', 'lijk')
  }
  return null
}

function apostropheRule(c: Ctx): TypoLabel | null {
  if (!/'/.test(c.E + c.T)) return null
  const bare = (s: string) => s.replace(/['\s]/g, '')
  if (bare(c.el) !== bare(c.tl)) return null
  if (c.lang === 'en' && bare(c.el) === 'its') {
    return label(c, 'spelling', 'cognitive', `'${c.E}', not '${c.T}'`, 'its-its', 'its-its')
  }
  // Dutch: the plural 's (auto's) has its own rule; zo'n, 's ochtends and m'n mark left-out letters
  const tipKey = c.lang === 'nl' && !/'s$/.test(c.el) && !/'s$/.test(c.tl) ? 'elision' : 'apostrophe'
  return label(c, 'spelling', 'cognitive', `apostrophe: '${c.E}'`, tipKey, 'apostrophe')
}

/** first parts whose -en is part of the word itself, not a linking -en- (binnenkort, keukentafel) */
const NL_RADICAL_EN = new Set(['binnen', 'buiten', 'beneden', 'keuken', 'morgen', 'gisteren', 'examen', 'kussen', 'kuiken', 'verleden', 'seizoen', 'christen'])
/** suffixes, not second parts of a compound (gelegenheid, eigendom) */
const NL_SUFFIX = /^(?:lijk|heid|schap|baar|loos|dom|zaam)/

function tussenNRule(c: Ctx): TypoLabel | null {
  const [long, short] = c.el.length > c.tl.length ? [c.el, c.tl] : [c.tl, c.el]
  if (long.length !== short.length + 1) return null
  // compound shape: a first part of 4+ letters, linking e(n), then a 3+ letter part starting with a consonant
  for (let k = 5; k <= long.length - 4; k++) {
    if (long[k] !== 'n' || long[k - 1] !== 'e' || long[k + 1] === 'n' || isVowel(long[k + 1])) continue
    if (NL_SUFFIX.test(long.slice(k + 1)) || NL_RADICAL_EN.has(long.slice(0, k + 1))) continue
    if (long.slice(0, k) + long.slice(k + 1) === short) {
      return label(c, 'spelling', 'cognitive', `linking -e(n)-: '${c.E}'`, 'tussen-n', 'tussen-n')
    }
  }
  return null
}

const EN_HOMOPHONES: { words: string[]; tip: string }[] = [
  { words: ['their', 'there', "they're"], tip: "their = belongs to them, there = that place, they're = they are." },
  { words: ['your', "you're"], tip: "your = belongs to you, you're = you are." },
  { words: ['then', 'than'], tip: 'than compares (bigger than); then is about time (and then).' },
  { words: ['to', 'too', 'two'], tip: 'to = towards, too = also or very, two = 2.' },
  { words: ['whose', "who's"], tip: "whose = belongs to whom, who's = who is." },
  { words: ['were', "we're", 'where', 'wear'], tip: "were = past of are, we're = we are, where = which place, wear = clothes." },
  { words: ['lose', 'loose'], tip: 'lose = not win or misplace, loose = not tight.' },
  { words: ['affect', 'effect'], tip: 'affect is usually the verb, effect the noun (the effect).' },
  { words: ['accept', 'except'], tip: 'accept = take or agree, except = apart from.' },
  { words: ['hear', 'here'], tip: 'hear = with your ears, here = this place.' },
  { words: ['know', 'no'], tip: 'know = have knowledge, no = the opposite of yes.' },
  { words: ['knew', 'new'], tip: 'knew = past of know, new = not old.' },
  { words: ['write', 'right'], tip: 'write = put words down, right = correct or the opposite of left.' },
  { words: ['weather', 'whether'], tip: 'weather = rain and sun, whether = if.' },
  { words: ['piece', 'peace'], tip: 'piece = a part, peace = no war.' },
  { words: ['break', 'brake'], tip: 'break = smash or pause, brake = stop a vehicle.' },
  { words: ['buy', 'by', 'bye'], tip: 'buy = pay for, by = next to or through, bye = goodbye.' },
  { words: ['one', 'won'], tip: 'one = 1, won = past of win.' },
  { words: ['week', 'weak'], tip: 'week = seven days, weak = not strong.' },
  { words: ['passed', 'past'], tip: 'passed = verb (I passed), past = time gone by or beyond.' },
  { words: ['of', 'off'], tip: 'of = belonging to, off = not on or away.' },
  { words: ['advice', 'advise'], tip: 'advice is the noun, advise the verb.' },
  { words: ['principal', 'principle'], tip: 'principal = main or head of school, principle = a rule or belief.' },
  { words: ['its', "it's"], tip: "it's = it is or it has; its = belonging to it." },
]

function homophoneEn(c: Ctx): TypoLabel | null {
  const group = EN_HOMOPHONES.find((g) => g.words.includes(c.el) && g.words.includes(c.tl))
  if (!group) return null
  const tag = group.words[0] === 'its' ? 'its-its' : 'homophone'
  // to/too, two/to, by/bye in a copy test are as likely one extra or missing key as a mix-up
  // (an apostrophe is a deliberate key, so its/it's stays a knowledge error)
  const out = label(c, 'spelling', oneKeyApart(c) ? 'unknown' : 'cognitive', `'${c.E}', not '${c.T}'`, tag, tag)
  out.tip = { en: group.tip }
  return out
}

function ieEiRule(c: Ctx): TypoLabel | null {
  if (!swapEither(c.tl, c.el, 'ie', 'ei')) return null
  return label(c, 'spelling', soft(c), `ie/ei: '${c.E}'`, 'ie-ei', 'ie-ei')
}

/** Words with a dagger (hidden) alif, and how they look with the pronounced alif written (هذا, not هاذا). */
const HIDDEN_ALIF = new Map([
  ['هذا', 'هاذا'], ['هذه', 'هاذه'], ['هذان', 'هاذان'], ['هذين', 'هاذين'], ['هكذا', 'هاكذا'], ['ذلك', 'ذالك'],
  ['لكن', 'لاكن'], ['هؤلاء', 'هاؤلاء'], ['أولئك', 'أولائك'], ['الله', 'اللاه'], ['إله', 'إلاه'], ['الرحمن', 'الرحمان'], ['طه', 'طاه'],
])

function arabicRule(c: Ctx): TypoLabel | null {
  const ops = plainOps(c.E, c.T)
  if (!ops.length) return null
  // only Shift differs (غ for إ, ى for آ, ـ for ت): a motor slip, labelled by the generic step
  if (ops.every((o) => o.op === 'sub' && sameKey(o.e, o.t, c.layout))) return null
  // only the alif where it is pronounced (ذالك), not an alif rolled in elsewhere (ذلاك)
  if (HIDDEN_ALIF.get(stripTashkeel(c.E)) === stripTashkeel(c.T)) {
    return label(c, 'spelling', 'cognitive', `'${c.E}' has a hidden alif: it is not written`, 'hidden-alif', 'hidden-alif')
  }
  const wawAlif = (a: string, b: string) => a.endsWith('وا') && a.slice(0, -1) === b
  if (wawAlif(c.E, c.T) || wawAlif(c.T, c.E)) {
    const detail = c.E.endsWith('وا') ? `'${c.E}' ends in وا (waw al-jama'a)` : `'${c.E}' ends in و without alif`
    return label(c, 'spelling', soft(c), detail, 'waw-alif', 'waw-alif') // one key in a copy test
  }
  // hamza seat: a hamza letter swapped within the family, or a standalone ء added/dropped,
  // possibly with its carrier (شيء -> شئ). Dropping or doubling a whole أ, or swapping it
  // with its neighbour, is an ordinary slip.
  const isHamzaOp = (o: EditOp) =>
    (o.op === 'sub' && HAMZA_FAMILY.includes(o.e) && HAMZA_FAMILY.includes(o.t) && (HAMZA_CHARS.includes(o.e) || HAMZA_CHARS.includes(o.t))) ||
    (o.op === 'del' && o.e === 'ء') ||
    (o.op === 'ins' && o.t === 'ء')
  const isCarrierOp = (o: EditOp) => (o.op === 'del' && 'اويى'.includes(o.e)) || (o.op === 'ins' && 'اويى'.includes(o.t))
  if (ops.some(isHamzaOp) && ops.every((o) => isHamzaOp(o) || isCarrierOp(o)) && !c.T.includes('ءء')) {
    // ء, ئ and ؤ are neighbour keys (X, Z, C), and one dropped ء is one missed key:
    // in a copy test either may be a slip
    const slip = ops.every((o) => (o.op === 'sub' && areAdjacent(o.e, o.t, c.layout)) || (o.op !== 'sub' && ops.length === 1))
    return label(c, 'spelling', slip && c.mode === 'copy' ? 'unknown' : 'cognitive', `hamza: '${c.E}'`, 'hamza', 'hamza')
  }
  const subsWithin = (set: string, key: string) =>
    ops.every((o) => o.op === 'sub' && set.includes(o.e) && set.includes(o.t) && (o.e === key || o.t === key))
  // ة/ت and ى/ا are neighbour keys, so in a copy test they may be slips; ة/ه and ى/ي are not
  const nature = (pair: string): TypoNature =>
    c.mode === 'copy' && ops.every((o) => o.op === 'sub' && pair.includes(o.e) && pair.includes(o.t)) ? 'unknown' : 'cognitive'
  if (subsWithin('ةهت', 'ة')) return label(c, 'spelling', nature('ةت'), `taa marbuta: '${c.E}'`, 'taa-marbuta', 'taa-marbuta')
  if (subsWithin('ىيا', 'ى')) return label(c, 'spelling', nature('ىا'), `alif maqsura: '${c.E}'`, 'alif-maqsura', 'alif-maqsura')
  return null
}
