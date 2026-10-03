import type { Lang, TypoKind } from '@/types'
import { areAdjacent, decomposeDeadKey, isMirror, keyOf, layoutFor, neighbourChar, sameFinger, sameHand, type LayoutId } from './keyboard'
import { graphemes, stripMarks } from './text'
import { TIPS } from './tips'

// Labels one mistyped word (expected vs typed) with a kind, motor/cognitive nature,
// a short detail and a friendly tip. Pipeline (order matters):
// case -> diacritics -> spaces -> language spelling rules -> doubling -> hand shift
// -> real word -> keyboard-aware optimal string alignment.

export type TypoNature = 'motor' | 'cognitive' | 'unknown'

export interface TypoTip {
  en: string
  /** the same tip in Dutch (nl) or Arabic (ar) */
  local?: string
}

export interface TypoLabel {
  kind: TypoKind
  nature: TypoNature
  /** short human text, e.g. "hit 'r' instead of 't' (neighbour key)" */
  detail: string
  /** finer label: 'dt', 'kofschip', 'trema', 'ei-ij', 'hamza', 'neighbour', 'repeat', ... */
  tag?: string
  tip: TypoTip
}

export interface ClassifyOptions {
  layout?: LayoutId
  /** 'copy' (target visible, the default) or 'dictation' (typed from memory/sound) */
  mode?: 'copy' | 'dictation'
  /** previous / next word of the expected text, for sharper d/t tips */
  prev?: string
  next?: string
  /** word list; enables the "typed another real word" label */
  dict?: { has(word: string): boolean }
}

/* ------------------------------------------------------------------ */
/* Optimal string alignment                                             */
/* ------------------------------------------------------------------ */

export type EditOp =
  | { op: 'equal'; e: string; t: string; i: number; j: number }
  | { op: 'sub'; e: string; t: string; i: number; j: number }
  /** extra typed char t, inserted before expected[i] */
  | { op: 'ins'; t: string; i: number; j: number }
  /** expected[i] missing */
  | { op: 'del'; e: string; i: number; j: number }
  /** expected[i..i+1] typed in reverse order */
  | { op: 'swap'; e: string; t: string; i: number; j: number }

interface Costs {
  sub: (e: string, t: string) => number
  ins: (t: string, prev?: string, next?: string) => number
  del: number
  swap: number
}

const UNIT: Costs = { sub: () => 1, ins: () => 1, del: 1, swap: 1 }

function keyboardCosts(layout: LayoutId): Costs {
  return {
    sub: (e, t) => {
      if (e.toLowerCase() === t.toLowerCase() || stripMarks(e) === stripMarks(t)) return 0.3
      if (areAdjacent(e, t, layout)) return 0.8
      if (isMirror(e, t, layout)) return 0.9
      return 1
    },
    ins: (t, prev, next) => {
      if (t === prev || t === next) return 0.7
      if ((prev && areAdjacent(t, prev, layout)) || (next && areAdjacent(t, next, layout))) return 0.85
      return 1
    },
    del: 1,
    swap: 0.9,
  }
}

function alignUnits(E: string[], T: string[], c: Costs): EditOp[] {
  const n = E.length
  const m = T.length
  const d = Array.from({ length: n + 1 }, () => new Float64Array(m + 1))
  const ins = (i: number, j: number) => c.ins(T[j - 1], E[i - 1], E[i])
  for (let i = 1; i <= n; i++) d[i][0] = d[i - 1][0] + c.del
  for (let j = 1; j <= m; j++) d[0][j] = d[0][j - 1] + ins(0, j)
  const canSwap = (i: number, j: number) =>
    i > 1 && j > 1 && E[i - 1] === T[j - 2] && E[i - 2] === T[j - 1] && E[i - 1] !== E[i - 2]
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const s = E[i - 1] === T[j - 1] ? 0 : c.sub(E[i - 1], T[j - 1])
      let v = Math.min(d[i - 1][j - 1] + s, d[i - 1][j] + c.del, d[i][j - 1] + ins(i, j))
      if (canSwap(i, j)) v = Math.min(v, d[i - 2][j - 2] + c.swap)
      d[i][j] = v
    }
  }
  // Backtrace; tie-break eq > swap > sub > del > ins.
  const ops: EditOp[] = []
  const near = (a: number, b: number) => Math.abs(a - b) < 1e-9
  let i = n
  let j = m
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && E[i - 1] === T[j - 1] && near(d[i][j], d[i - 1][j - 1])) {
      ops.push({ op: 'equal', e: E[i - 1], t: T[j - 1], i: i - 1, j: j - 1 })
      i--
      j--
    } else if (canSwap(i, j) && near(d[i][j], d[i - 2][j - 2] + c.swap)) {
      ops.push({ op: 'swap', e: E[i - 2] + E[i - 1], t: T[j - 2] + T[j - 1], i: i - 2, j: j - 2 })
      i -= 2
      j -= 2
    } else if (i > 0 && j > 0 && E[i - 1] !== T[j - 1] && near(d[i][j], d[i - 1][j - 1] + c.sub(E[i - 1], T[j - 1]))) {
      ops.push({ op: 'sub', e: E[i - 1], t: T[j - 1], i: i - 1, j: j - 1 })
      i--
      j--
    } else if (i > 0 && (j === 0 || near(d[i][j], d[i - 1][j] + c.del))) {
      ops.push({ op: 'del', e: E[i - 1], i: i - 1, j })
      i--
    } else {
      ops.push({ op: 'ins', t: T[j - 1], i, j: j - 1 })
      j--
    }
  }
  return ops.reverse()
}

/** Damerau-Levenshtein distance (optimal string alignment) over graphemes, unit costs. */
export function osaDistance(a: string, b: string): number {
  const A = graphemes(a)
  const B = graphemes(b)
  const n = A.length
  const m = B.length
  if (!n) return m
  if (!m) return n
  let prev2 = new Array<number>(m + 1).fill(0)
  let prev = Array.from({ length: m + 1 }, (_, j) => j)
  for (let i = 1; i <= n; i++) {
    const cur = new Array<number>(m + 1)
    cur[0] = i
    for (let j = 1; j <= m; j++) {
      const cost = A[i - 1] === B[j - 1] ? 0 : 1
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)
      if (i > 1 && j > 1 && A[i - 1] === B[j - 2] && A[i - 2] === B[j - 1]) v = Math.min(v, prev2[j - 2] + 1)
      cur[j] = v
    }
    prev2 = prev
    prev = cur
  }
  return prev[m]
}

/**
 * Keyboard-aware edit operations turning `expected` into `typed` (graphemes). Neighbour-key
 * substitutions, repeated keys and swaps are cheaper, so the alignment prefers physically
 * plausible explanations.
 */
export function editOps(expected: string, typed: string, layout: LayoutId = 'qwerty-us'): EditOp[] {
  return alignUnits(graphemes(expected), graphemes(typed), keyboardCosts(layout))
}

const plainOps = (a: string, b: string) => alignUnits(graphemes(a), graphemes(b), UNIT).filter((o) => o.op !== 'equal')

/* ------------------------------------------------------------------ */
/* Classification                                                       */
/* ------------------------------------------------------------------ */

interface Ctx {
  E: string
  T: string
  /** lowercase forms */
  el: string
  tl: string
  lang: Lang
  layout: LayoutId
  mode: 'copy' | 'dictation'
  o: ClassifyOptions
}

function tip(key: string, lang: Lang, vars: Record<string, string> = {}): TypoTip {
  const t = TIPS[`${key}.${lang}`] ?? TIPS[key] ?? TIPS.substitution
  const fill = (s: string) => s.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? '')
  const local = lang === 'nl' ? t.nl : lang === 'ar' ? t.ar : undefined
  return local ? { en: fill(t.en), local: fill(local) } : { en: fill(t.en) }
}

function label(c: Ctx, kind: TypoKind, nature: TypoNature, detail: string, tipKey: string, tag?: string, vars?: Record<string, string>): TypoLabel {
  const out: TypoLabel = { kind, nature, detail, tip: tip(tipKey, c.lang, vars) }
  if (tag) out.tag = tag
  return out
}

/** cognitive when typed from memory, unknown when the target was on screen */
const soft = (c: Ctx): TypoNature => (c.mode === 'dictation' ? 'cognitive' : 'unknown')

const normApos = (s: string) => s.normalize('NFC').replace(/[‘’ʼ`´]/g, "'").trim()

/**
 * Label one mistake. Returns null when the two words are the same.
 * The 4th argument is a layout id or a full options object.
 */
export function classifyTypo(expected: string, typed: string, lang: Lang, layoutOrOpts?: LayoutId | ClassifyOptions): TypoLabel | null {
  const o: ClassifyOptions = typeof layoutOrOpts === 'string' ? { layout: layoutOrOpts } : (layoutOrOpts ?? {})
  const E = normApos(expected)
  const T = normApos(typed)
  if (E === T) return null
  const c: Ctx = { E, T, el: E.toLowerCase(), tl: T.toLowerCase(), lang, layout: o.layout ?? layoutFor(lang), mode: o.mode ?? 'copy', o }
  if (!T) return label(c, 'skipped', soft(c), 'word not typed', 'skipped')
  return (
    caseRule(c) ??
    deadKeyRule(c) ??
    diacriticRule(c) ??
    spaceRule(c) ??
    languageRule(c) ??
    doublingRule(c) ??
    handShiftRule(c) ??
    realWordRule(c) ??
    opsRule(c)
  )
}

function caseRule(c: Ctx): TypoLabel | null {
  if (c.el !== c.tl) return null
  const E = graphemes(c.E)
  const T = graphemes(c.T)
  let missing = 0
  let extra = 0
  E.forEach((e, i) => {
    if (e === T[i]) return
    if (e !== e.toLowerCase()) missing++
    else extra++
  })
  const detail =
    missing && !extra ? `missed the capital in '${c.E}'` : extra && !missing ? `no capital needed: '${c.E}'` : `capitals differ: '${c.E}'`
  return c.mode === 'dictation'
    ? label(c, 'case', 'cognitive', detail, `case.${c.lang}`, 'capital')
    : label(c, 'case', 'motor', detail, 'case', 'capital')
}

/** `ëen` typed for `"een` (or the reverse) on a dead-key layout. */
function deadKeyRule(c: Ctx): TypoLabel | null {
  const expand = (s: string) =>
    graphemes(s)
      .map((g) => {
        const d = decomposeDeadKey(g, c.layout)
        return d ? d.mark + d.letter : g
      })
      .join('')
  const merged = expand(c.T) === c.E
  const unmerged = expand(c.E) === c.T
  if (!merged && !unmerged) return null
  const detail = merged ? 'the dead key merged with the next letter' : 'typed the accent and the letter separately'
  return label(c, 'diacritic', 'motor', detail, 'dead-key', 'dead-key')
}

const HAMZA_CHARS = 'ءأإآؤئ'
const HAMZA_FAMILY = HAMZA_CHARS + 'اوىي'
const hasHamza = (s: string) => [...s].some((ch) => HAMZA_CHARS.includes(ch))

function diacriticRule(c: Ctx): TypoLabel | null {
  const sE = stripMarks(c.el)
  if (sE !== stripMarks(c.tl)) return null
  const E = graphemes(c.E)
  const T = graphemes(c.T)
  if (c.lang === 'ar' || /[؀-ۿ]/.test(c.E)) {
    const hamza = E.length === T.length ? E.some((e, i) => e !== T[i] && (hasHamza(e) || hasHamza(T[i]))) : hasHamza(c.E + c.T)
    if (hamza) {
      const want = E.find((e, i) => e !== T[i] && hasHamza(e))
      const detail = want ? `hamza: '${c.E}' is written with ${want.replace(/[ً-ْ]/g, '')}` : `hamza: '${c.E}' has no hamza here`
      return label(c, 'diacritic', 'cognitive', detail, 'hamza', 'hamza')
    }
    return label(c, 'diacritic', soft(c), 'short-vowel marks (tashkeel) differ', 'tashkeel', 'tashkeel')
  }
  // Latin: which mark and in which direction
  let missing = 0
  let extra = 0
  let trema = false
  if (E.length === T.length) {
    E.forEach((e, i) => {
      const t = T[i]
      if (e === t || e.toLowerCase() === t.toLowerCase()) return
      const em = e.normalize('NFD').length > 1
      const tm = t.normalize('NFD').length > 1
      if ((em ? e : t).normalize('NFD').includes('̈')) trema = true
      if (!tm) missing++
      if (!em) extra++
      if (em && tm) {
        missing++
        extra++
      }
    })
  }
  const mark = trema ? 'trema' : 'accent'
  const detail = missing && !extra ? `missing ${mark}: '${c.E}'` : extra && !missing ? `extra ${mark}: '${c.E}' has none` : `wrong ${mark}: '${c.E}'`
  const tag = c.lang === 'nl' && trema ? 'trema' : 'accent'
  return label(c, 'diacritic', soft(c), detail, tag, tag)
}

function spaceRule(c: Ctx): TypoLabel | null {
  const noSpace = (s: string) => s.replace(/\s+/g, '')
  if (noSpace(c.el) === noSpace(c.tl)) {
    const split = /\s/.test(c.T) && !/\s/.test(c.E)
    const join = /\s/.test(c.E) && !/\s/.test(c.T)
    const detail = split ? `split '${c.E}' into two words` : join ? `wrote '${c.E}' as one word` : 'spaces in the wrong place'
    if (c.mode === 'copy') return label(c, 'space', 'motor', detail, 'space', 'split-join')
    return label(c, 'space', 'cognitive', detail, join ? 'join' : 'split', 'split-join')
  }
  const noHyphen = (s: string) => s.replace(/[\s\-‐‑]+/g, '')
  if (noHyphen(c.el) === noHyphen(c.tl)) {
    return label(c, 'spelling', soft(c), `hyphen: '${c.E}'`, 'hyphen', 'hyphen')
  }
  return null
}

/* ------------------------------------------------------------------ */
/* Language spelling rules                                              */
/* ------------------------------------------------------------------ */

function languageRule(c: Ctx): TypoLabel | null {
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

const NL_PAIRS: [string, string, string][] = [
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
  return label(c, 'spelling', 'cognitive', `past-tense ending: '${c.E}', not '${c.T}'`, 'kofschip', 'kofschip')
}

function digraphRule(c: Ctx): TypoLabel | null {
  if (swapEither(c.tl, c.el, 'ei', 'ij')) return label(c, 'spelling', 'cognitive', `ei/ij: '${c.E}'`, 'ei-ij', 'ei-ij')
  if (swapEither(c.tl, c.el, 'ij', 'y')) return label(c, 'spelling', 'cognitive', `ij, not y: '${c.E}'`, 'ij-y', 'ij-y')
  if (swapEither(c.tl, c.el, 'au', 'ou')) return label(c, 'spelling', 'cognitive', `au/ou: '${c.E}'`, 'au-ou', 'au-ou')
  if (swapEither(c.tl, c.el, 'g', 'ch')) return label(c, 'spelling', 'cognitive', `g/ch: '${c.E}'`, 'g-ch', 'g-ch')
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
  for (let k = 3; k <= long.length - 3; k++) {
    if (long[k] !== 'n' || long[k - 1] !== 'e' || long[k + 1] === 'n' || long[k - 2] === 'n') continue
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
  // to/too, of/off, lose/loose in a copy test are as likely a double tap as a mix-up
  const doubleOnly = c.mode === 'copy' && collapse(c.el) === collapse(c.tl)
  const out = label(c, 'spelling', doubleOnly ? 'unknown' : 'cognitive', `'${c.E}', not '${c.T}'`, tag, tag)
  out.tip = { en: group.tip }
  return out
}

function ieEiRule(c: Ctx): TypoLabel | null {
  if (!swapEither(c.tl, c.el, 'ie', 'ei')) return null
  return label(c, 'spelling', soft(c), `ie/ei: '${c.E}'`, 'ie-ei', 'ie-ei')
}

function arabicRule(c: Ctx): TypoLabel | null {
  const ops = plainOps(c.E, c.T)
  if (!ops.length) return null
  const chars = ops.flatMap((o) => [...('e' in o ? o.e : ''), ...('t' in o ? o.t : '')])
  if (chars.every((ch) => HAMZA_FAMILY.includes(ch)) && chars.some((ch) => HAMZA_CHARS.includes(ch))) {
    return label(c, 'spelling', 'cognitive', `hamza: '${c.E}'`, 'hamza', 'hamza')
  }
  const subsWithin = (set: string, key: string) =>
    ops.every((o) => o.op === 'sub' && set.includes(o.e) && set.includes(o.t) && (o.e === key || o.t === key))
  if (subsWithin('ةهت', 'ة')) return label(c, 'spelling', 'cognitive', `taa marbuta: '${c.E}'`, 'taa-marbuta', 'taa-marbuta')
  if (subsWithin('ىيا', 'ى')) return label(c, 'spelling', 'cognitive', `alif maqsura: '${c.E}'`, 'alif-maqsura', 'alif-maqsura')
  return null
}

/* ------------------------------------------------------------------ */
/* Doubling, hand shift, real words                                     */
/* ------------------------------------------------------------------ */

const collapse = (s: string) => runs(s).map((r) => r.c).join('')

function runs(s: string): { c: string; n: number }[] {
  const out: { c: string; n: number }[] = []
  for (const g of graphemes(s)) {
    const last = out[out.length - 1]
    if (last && last.c === g) last.n++
    else out.push({ c: g, n: 1 })
  }
  return out
}

const VOWELS = 'aeiouy'
const isVowel = (ch: string) => VOWELS.includes(ch)

function doublingRule(c: Ctx): TypoLabel | null {
  const re = runs(c.el)
  const rt = runs(c.tl)
  if (re.length !== rt.length || re.some((r, k) => r.c !== rt[k].c)) return null
  const missed: number[] = []
  const extra: number[] = []
  re.forEach((r, k) => {
    if (rt[k].n < r.n) missed.push(k)
    else if (rt[k].n > r.n) extra.push(k)
  })
  if (!missed.length && !extra.length) return null
  const latin = c.lang !== 'ar'
  const ruleTag = (k: number) => (!latin ? undefined : isVowel(re[k].c) ? (c.lang === 'nl' ? 'open-syllable' : undefined) : 'double-consonant')

  if (missed.length === 1 && extra.length === 1) {
    return label(c, 'doubling', 'motor', `doubled '${rt[extra[0]].c}' instead of '${re[missed[0]].c}'`, 'doubling', 'wrong-double')
  }
  if (extra.length && !missed.length) {
    const k = extra[0]
    if (extra.every((x) => re[x].n >= 2)) {
      return label(c, 'insertion', 'motor', `pressed '${re[k].c}' one time too many`, 'repeat', 'repeat')
    }
    // a doubled consonant after a single vowel looks like a spelling choice (untill, koopen); otherwise a bounce (thhe)
    const before = re[k - 1]
    const plausible = latin && extra.length === 1 && (isVowel(re[k].c) || (!!before && isVowel(before.c) && before.n === 1))
    if (!plausible) return label(c, 'doubling', 'motor', `pressed '${re[k].c}' twice`, 'repeat', 'repeat')
    const tag = ruleTag(k)
    return label(c, 'doubling', soft(c), `doubled '${re[k].c}': '${c.E}' has a single one`, tag ?? 'doubling', tag)
  }
  if (missed.length && !extra.length) {
    const k = missed[0]
    const tag = missed.length === 1 ? ruleTag(k) : undefined
    const detail = missed.length === 1 ? `single '${re[k].c}' where '${re[k].c.repeat(re[k].n)}' belongs` : `double letters missing in '${c.E}'`
    return label(c, 'missed-double', soft(c), detail, tag ?? 'missed-double', tag)
  }
  return label(c, 'doubling', soft(c), `double letters moved in '${c.E}'`, 'doubling')
}

function handShiftRule(c: Ctx): TypoLabel | null {
  const E = graphemes(c.el)
  const T = graphemes(c.tl)
  if (E.length !== T.length || E.length < 3) return null
  const mismatched = E.filter((e, i) => e !== T[i]).length
  if (mismatched / E.length < 0.7) return null
  const shift: Record<string, number | undefined> = {}
  for (let i = 0; i < E.length; i++) {
    if (E[i] === T[i]) continue
    const hand = keyOf(E[i], c.layout)?.hand
    if (!hand) return null
    const dx = [-1, 1].find((d) => neighbourChar(E[i], d, c.layout) === T[i])
    if (dx === undefined || (shift[hand] !== undefined && shift[hand] !== dx)) return null
    shift[hand] = dx
  }
  const dirs = new Set(Object.values(shift))
  const where = dirs.size === 1 ? (dirs.has(1) ? 'to the right' : 'to the left') : 'sideways'
  return label(c, 'adjacent', 'motor', `hands one key ${where}`, 'hand-shift', 'hand-shift')
}

function realWordRule(c: Ctx): TypoLabel | null {
  if (!c.o.dict || !c.o.dict.has(c.tl) || osaDistance(c.el, c.tl) < 2) return null
  return label(c, 'spelling', soft(c), `typed the word '${c.T}' instead of '${c.E}'`, 'real-word', 'real-word')
}

/* ------------------------------------------------------------------ */
/* Generic edit operations                                              */
/* ------------------------------------------------------------------ */

const PHONETIC: Record<Lang, string[]> = {
  nl: ['ck', 'sz', 'fv', 'dt'],
  en: ['ck', 'cs', 'sz'],
  ar: ['ضظ', 'ذز', 'ثس', 'صس', 'طت', 'قك', 'حه', 'ذد', 'ظز'],
}
const phonetic = (lang: Lang, a: string, b: string) => PHONETIC[lang].some((p) => p.includes(a) && p.includes(b) && a !== b)

function opsRule(c: Ctx): TypoLabel {
  const E = graphemes(c.E)
  const ops = alignUnits(E, graphemes(c.T), keyboardCosts(c.layout)).filter((o) => o.op !== 'equal')
  if (ops.length >= 3 || ops.length / Math.max(E.length, 1) > 0.5) {
    return label(c, 'spelling', soft(c), `several letters differ in '${c.E}'`, 'garbled')
  }
  const labels = ops.map((op) => labelOp(c, op, E))
  if (labels.length === 1) return labels[0]
  const primary = labels.find((l) => l.nature === 'motor') ?? labels[0]
  const nature: TypoNature = labels.every((l) => l.nature === 'motor')
    ? 'motor'
    : labels.some((l) => l.nature === 'cognitive')
      ? 'cognitive'
      : soft(c)
  return { ...primary, nature, detail: labels.map((l) => l.detail).join('; ') }
}

function labelOp(c: Ctx, op: EditOp, E: string[]): TypoLabel {
  const L = c.layout
  switch (op.op) {
    case 'swap': {
      const [a, b] = graphemes(op.e)
      const tag = sameHand(a, b, L) ? 'same-hand' : 'cross-hand'
      return label(c, 'transposition', 'motor', `swapped '${a}' and '${b}'`, 'transposition', tag)
    }
    case 'sub': {
      const { e, t } = op
      if (e.toLowerCase() === t.toLowerCase()) return label(c, 'case', c.mode === 'dictation' ? 'cognitive' : 'motor', `'${t}' should be '${e}'`, 'case', 'capital')
      if (stripMarks(e) === stripMarks(t)) return label(c, 'diacritic', soft(c), `'${t}' should be '${e}'`, 'diacritic')
      if (areAdjacent(e, t, L)) return label(c, 'adjacent', 'motor', `hit '${t}' instead of '${e}' (neighbour key)`, 'adjacent', 'neighbour')
      if (isMirror(e, t, L)) return label(c, 'substitution', 'motor', `hit '${t}' instead of '${e}' (same finger, other hand)`, 'mirror', 'mirror')
      if (sameFinger(e, t, L)) return label(c, 'substitution', 'motor', `hit '${t}' instead of '${e}' (same finger, other row)`, 'same-finger', 'same-finger')
      if (phonetic(c.lang, e.toLowerCase(), t.toLowerCase())) return label(c, 'substitution', 'cognitive', `typed '${t}' for '${e}' (they sound alike)`, 'phonetic', 'phonetic')
      return label(c, 'substitution', soft(c), `typed '${t}' instead of '${e}'`, 'substitution')
    }
    case 'ins': {
      const { t, i } = op
      const prev = E[i - 1]
      const next = E[i]
      if (/\s/.test(t)) return label(c, 'space', c.mode === 'copy' ? 'motor' : 'cognitive', 'a space split the word', 'space', 'split-join')
      if (t === prev || t === next) return label(c, 'insertion', 'motor', `pressed '${t}' twice`, 'repeat', 'repeat')
      const near = [prev, next].find((x) => x && areAdjacent(t, x, L))
      if (near) return label(c, 'insertion', 'motor', `extra '${t}' (neighbour of '${near}')`, 'roll', 'roll')
      return label(c, 'insertion', soft(c), `extra '${t}'`, 'insertion')
    }
    case 'del': {
      const { e, i } = op
      if (/\s/.test(e)) return label(c, 'space', c.mode === 'copy' ? 'motor' : 'cognitive', 'missed the space', 'space', 'split-join')
      if (E[i - 1] === e || E[i + 1] === e) return label(c, 'missed-double', soft(c), `single '${e}' where '${e}${e}' belongs`, 'missed-double')
      return label(c, 'omission', soft(c), `left out '${e}'`, 'omission')
    }
    default:
      return label(c, 'substitution', soft(c), 'different letters', 'substitution')
  }
}
