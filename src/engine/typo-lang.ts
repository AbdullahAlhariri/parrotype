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

function confusableNl(c: Ctx): TypoLabel | null {
  const hit = NL_PAIRS.find(([a, b]) => (c.el === a && c.tl === b) || (c.el === b && c.tl === a))
  return hit ? label(c, 'spelling', 'cognitive', `'${c.E}', not '${c.T}'`, hit[2], hit[2]) : null
}

const NL_SUBJ_T = new Set(['hij', 'zij', 'ze', 'het', 'u', 'men', 'er', 'dit', 'dat', 'die', 'wat', 'wie', 'jij', 'je', 'iemand', 'niemand', 'iedereen'])
const NL_AUX = new Set(['heb', 'hebt', 'heeft', 'hebben', 'had', 'hadden', 'ben', 'bent', 'is', 'zijn', 'was', 'waren', 'word', 'wordt', 'worden', 'werd', 'werden', 'geworden'])

function dtRule(c: Ctx): TypoLabel | null {
  const re = /^(.*?[aeiouy].*?)(dt|d|t)$/
  const me = re.exec(c.el)
  const mt = re.exec(c.tl)
  if (!me || !mt || me[1] !== mt[1] || me[2] === mt[2]) return null
  const prev = c.o.prev?.toLowerCase()
  const next = c.o.next?.toLowerCase()
  const endsT = me[2] !== 'd'
  let key = 'dt'
  if (prev === 'ik' && !endsT) key = 'dt-ik'
  else if ((next === 'je' || next === 'jij') && !endsT) key = 'dt-inversion'
  else if (prev && NL_SUBJ_T.has(prev) && endsT) key = 'dt-3rd'
  else if (prev && NL_AUX.has(prev) && !endsT) key = 'dt-participle'
  return label(c, 'spelling', 'cognitive', `d/t ending: '${c.E}', not '${c.T}'`, key, 'dt', { prev: c.o.prev ?? '' })
}

function kofschipRule(c: Ctx): TypoLabel | null {
  const re = /^(.{3,}?)(dde|tte|de|te)(n?)$/
  const me = re.exec(c.el)
  const mt = re.exec(c.tl)
  if (!me || !mt || me[1] !== mt[1] || me[3] !== mt[3] || me[2] === mt[2]) return null
  // -de vs -te is the kofschip choice; a lost double (wachtte -> wachte) is the classic slip too,
  // but an extra double (zitten -> zittten, houden -> houdden) is just a bounce
  const doubledE = me[2].length === 3
  const doubledT = mt[2].length === 3
  if (me[2].at(-2) === mt[2].at(-2) && !(doubledE && !doubledT)) return null
  return label(c, 'spelling', 'cognitive', `past-tense ending: '${c.E}', not '${c.T}'`, 'kofschip', 'kofschip')
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
  return label(c, 'spelling', 'cognitive', `apostrophe: '${c.E}'`, 'apostrophe', 'apostrophe')
}

function tussenNRule(c: Ctx): TypoLabel | null {
  const [long, short] = c.el.length > c.tl.length ? [c.el, c.tl] : [c.tl, c.el]
  if (long.length !== short.length + 1) return null
  // compound shape: a first part of 4+ letters, linking e(n), then a 3+ letter part starting with a consonant
  for (let k = 5; k <= long.length - 4; k++) {
    if (long[k] !== 'n' || long[k - 1] !== 'e' || long[k + 1] === 'n' || isVowel(long[k + 1])) continue
    if (long.startsWith('lijk', k + 1)) continue
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
  const oneKey = c.mode === 'copy' && !/'/.test(c.el + c.tl) && Math.abs(c.el.length - c.tl.length) === 1 && osaDistance(c.el, c.tl) === 1
  const out = label(c, 'spelling', oneKey ? 'unknown' : 'cognitive', `'${c.E}', not '${c.T}'`, tag, tag)
  out.tip = { en: group.tip }
  return out
}

function ieEiRule(c: Ctx): TypoLabel | null {
  if (!swapEither(c.tl, c.el, 'ie', 'ei')) return null
  return label(c, 'spelling', soft(c), `ie/ei: '${c.E}'`, 'ie-ei', 'ie-ei')
}

/** Words with a dagger (hidden) alif: pronounced but not written (هذا, not هاذا). */
const HIDDEN_ALIF = new Set(['هذا', 'هذه', 'هذان', 'هذين', 'هكذا', 'ذلك', 'لكن', 'هؤلاء', 'أولئك', 'الله', 'إله', 'الرحمن', 'طه'])

function arabicRule(c: Ctx): TypoLabel | null {
  const ops = plainOps(c.E, c.T)
  if (!ops.length) return null
  // only Shift differs (غ for إ, ى for آ, ـ for ت): a motor slip, labelled by the generic step
  if (ops.every((o) => o.op === 'sub' && sameKey(o.e, o.t, c.layout))) return null
  if (HIDDEN_ALIF.has(stripTashkeel(c.E)) && !c.T.includes('اا') && ops.every((o) => o.op === 'ins' && o.t === 'ا')) {
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
