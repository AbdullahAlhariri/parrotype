import type { Lang, TypoKind } from '@/types'
import { areAdjacent, decomposeDeadKey, isMirror, keyOf, layoutFor, neighbourChar, sameFinger, sameHand, sameKey, type LayoutId } from './keyboard'
import { alignUnits, keyboardCosts, osaDistance, type EditOp } from './osa'
import { graphemes, isArabic, normalizeTypingText, stripMarks } from './text'
import { hasHamza, isVowel, label, soft, type ClassifyOptions, type Ctx, type TypoLabel, type TypoNature } from './typo-ctx'
import { languageRule } from './typo-lang'

export { osaDistance, editOps } from './osa'
export type { EditOp } from './osa'
export { tipFor, typoName } from './typo-ctx'
export type { TypoNature, TypoTip, TypoLabel, ClassifyOptions } from './typo-ctx'
export type { TypoTag } from './tips'

// Labels one mistyped word (expected vs typed) with a kind, motor/cognitive nature,
// a short detail and a friendly tip. Pipeline (order matters): keyboard layout -> case
// -> diacritics -> spaces -> language spelling rules -> doubling -> cut short -> hand
// shift -> real word -> keyboard-aware optimal string alignment.

// the same folding the typing session applies (curly quotes count as straight ones)
const norm = (s: string) => normalizeTypingText(s).trim()

// sentence punctuation around a word (not apostrophes or hyphens, which belong to words)
const PUNCT = '.,;:!?"()[\\]{}«»¿¡،؛؟…'
const LEAD_RE = new RegExp(`^[${PUNCT}]+`, 'u')
const TRAIL_RE = new RegExp(`[${PUNCT}]+$`, 'u')
const PUNCT_RE = new RegExp(`[${PUNCT}]`, 'gu')

/** Drops punctuation that both words share at the edges ("wordt," vs "word,"), so the word rules see bare words. */
function stripSharedPunct(E: string, T: string): [string, string] {
  const edge = (re: RegExp, s: string) => re.exec(s)?.[0] ?? ''
  const lead = edge(LEAD_RE, E)
  const trail = edge(TRAIL_RE, E)
  let e = E
  let t = T
  if (lead && edge(LEAD_RE, t) === lead && e.length > lead.length && t.length > lead.length) {
    e = e.slice(lead.length)
    t = t.slice(lead.length)
  }
  if (trail && edge(TRAIL_RE, t) === trail && e.length > trail.length && t.length > trail.length) {
    e = e.slice(0, -trail.length)
    t = t.slice(0, -trail.length)
  }
  return [e, t]
}

/**
 * Label one mistake. Returns null when the two words are the same.
 * The 4th argument is a layout id or a full options object.
 */
export function classifyTypo(expected: string, typed: string, lang: Lang, layoutOrOpts?: LayoutId | ClassifyOptions): TypoLabel | null {
  const o: ClassifyOptions = typeof layoutOrOpts === 'string' ? { layout: layoutOrOpts } : (layoutOrOpts ?? {})
  if (norm(expected) === norm(typed)) return null
  const [E, T] = stripSharedPunct(norm(expected), norm(typed))
  const c: Ctx = { E, T, el: E.toLowerCase(), tl: T.toLowerCase(), lang, layout: o.layout ?? layoutFor(lang), mode: o.mode ?? 'copy', o }
  if (!T) return label(c, 'skipped', soft(c), 'word not typed', 'skipped')
  return (
    layoutRule(c) ??
    caseRule(c) ??
    deadKeyRule(c) ??
    diacriticRule(c) ??
    spaceRule(c) ??
    punctRule(c) ??
    languageRule(c) ??
    doublingRule(c) ??
    cutShortRule(c) ??
    handShiftRule(c) ??
    realWordRule(c) ??
    opsRule(c)
  )
}

const hasLatin = (s: string) => /\p{Script=Latin}/u.test(s)

/** Arabic typed in a Dutch/English test or the reverse: the keyboard layout is switched. */
function layoutRule(c: Ctx): TypoLabel | null {
  const arabicTarget = isArabic(c.E)
  const wrong = arabicTarget ? hasLatin(c.T) && !isArabic(c.T) : hasLatin(c.E) && isArabic(c.T) && !hasLatin(c.T)
  return wrong ? label(c, 'substitution', 'unknown', 'typed with another keyboard layout', 'wrong-layout', 'wrong-layout') : null
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
  // Dutch IJ is one letter: Ijs for IJs is a spelling question, not a Shift slip
  if (c.lang === 'nl' && /IJ/.test(c.E) && /Ij/.test(c.T)) return label(c, 'case', 'cognitive', `capital IJ: '${c.E}'`, 'ij-capital', 'capital')
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


function diacriticRule(c: Ctx): TypoLabel | null {
  const sE = stripMarks(c.el)
  if (sE !== stripMarks(c.tl)) return null
  const E = graphemes(c.E)
  const T = graphemes(c.T)
  if (c.lang === 'ar' || isArabic(c.E)) {
    // two neighbouring letters swapped (شيئ -> شئي) is a transposition, not a hamza question
    const diff = E.flatMap((e, i) => (e !== T[i] ? [i] : []))
    if (E.length === T.length && diff.length === 2 && diff[1] === diff[0] + 1 && E[diff[0]] === T[diff[1]] && E[diff[1]] === T[diff[0]]) return null
    const hamza = E.length === T.length ? E.some((e, i) => e !== T[i] && (hasHamza(e) || hasHamza(T[i]))) : hasHamza(c.E + c.T)
    if (hamza) {
      // أ is Shift + ا: in a copy test a missed Shift is as likely as not knowing the hamza
      const shiftOnly = E.length === T.length && E.every((e, i) => e === T[i] || sameKey(e, T[i], c.layout))
      const nature: TypoNature = shiftOnly && c.mode === 'copy' ? 'unknown' : 'cognitive'
      const want = E.find((e, i) => e !== T[i] && hasHamza(e))
      const detail = want ? `hamza: '${c.E}' is written with ${want.replace(/[\u064B-\u0652]/g, '')}` : `hamza: '${c.E}' has no hamza here`
      return label(c, 'diacritic', nature, detail, 'hamza', 'hamza')
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
      if ((em ? e : t).normalize('NFD').includes('\u0308')) trema = true
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
  const noHyphen = (s: string) => s.replace(/[\s\-\u2010\u2011]+/g, '')
  if (noHyphen(c.el) === noHyphen(c.tl)) {
    return label(c, 'spelling', soft(c), `hyphen: '${c.E}'`, 'hyphen', 'hyphen')
  }
  return null
}

/** Only sentence punctuation differs (huis. vs huis, wat? vs wat!). */
function punctRule(c: Ctx): TypoLabel | null {
  const bare = (s: string) => s.replace(PUNCT_RE, '')
  if (bare(c.E) !== bare(c.T)) return null
  const pe = c.E.length - bare(c.E).length
  const pt = c.T.length - bare(c.T).length
  const [kind, detail]: [TypoKind, string] =
    pt < pe ? ['omission', `punctuation missing: '${c.E}'`] : pt > pe ? ['insertion', `extra punctuation: '${c.E}' has less`] : ['substitution', `wrong punctuation: '${c.E}'`]
  return label(c, kind, soft(c), detail, 'punctuation', 'punctuation')
}


/* ------------------------------------------------------------------ */
/* Doubling, hand shift, real words                                     */
/* ------------------------------------------------------------------ */

function runs(s: string): { c: string; n: number }[] {
  const out: { c: string; n: number }[] = []
  for (const g of graphemes(s)) {
    const last = out[out.length - 1]
    if (last && last.c === g) last.n++
    else out.push({ c: g, n: 1 })
  }
  return out
}


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
  // in a copy test a doubled or dropped letter is ambiguous, so spelling-rule tags need dictation
  const ruleTag = (k: number) =>
    !latin || c.mode !== 'dictation' ? undefined : isVowel(re[k].c) ? (c.lang === 'nl' ? 'open-syllable' : undefined) : 'double-consonant'

  if (missed.length === 1 && extra.length === 1) {
    // a slipped double schema in a copy test (bokk), a spelling question from memory (tommorow)
    const nature = c.mode === 'dictation' ? 'cognitive' : 'motor'
    return label(c, 'doubling', nature, `doubled '${rt[extra[0]].c}' instead of '${re[missed[0]].c}'`, 'doubling', 'wrong-double')
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

/** Only the start of the word was typed (space pressed too early, or the end left out). */
function cutShortRule(c: Ctx): TypoLabel | null {
  const missing = graphemes(c.el).length - graphemes(c.tl).length
  if (missing < 2 || !c.el.startsWith(c.tl)) return null
  const detail = c.mode === 'copy' ? `stopped after '${c.T}'` : `left out the end of '${c.E}'`
  return label(c, 'omission', soft(c), detail, 'cut-short', 'cut-short')
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
  nl: ['ck', 'sz', 'fv', 'dt', 'bp'],
  en: ['ck', 'cs', 'sz'],
  ar: ['ضظ', 'ذز', 'ثس', 'صس', 'طت', 'قك', 'حه', 'ذد', 'ظز'],
}
/** Arabic letters that differ only by their dots */
const DOT_TWINS = ['سش', 'جحخ', 'صض', 'عغ', 'فق', 'بتثني', 'دذ', 'رز', 'طظ']

const phonetic = (lang: Lang, a: string, b: string) => PHONETIC[lang].some((p) => p.includes(a) && p.includes(b) && a !== b)

function opsRule(c: Ctx): TypoLabel {
  const E = graphemes(c.E)
  const ops = alignUnits(E, graphemes(c.T), keyboardCosts(c.layout)).filter((o) => o.op !== 'equal')
  // one slip is never "garbled", even in a one-letter word (a -> s)
  if (ops.length >= 3 || (ops.length > 1 && ops.length / Math.max(E.length, 1) > 0.5)) {
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
      const el = e.toLowerCase()
      const tl = t.toLowerCase()
      if (el === tl) return label(c, 'case', c.mode === 'dictation' ? 'cognitive' : 'motor', `'${t}' should be '${e}'`, 'case', 'capital')
      if (stripMarks(e) === stripMarks(t)) return label(c, 'diacritic', soft(c), `'${t}' should be '${e}'`, 'diacritic')
      if (sameKey(e, t, L)) {
        const missed = keyOf(e, L)?.shift && !keyOf(t, L)?.shift
        return label(c, 'substitution', 'motor', `'${t}' instead of '${e}' (same key, ${missed ? 'missed' : 'extra'} Shift)`, 'shift', 'shift')
      }
      const sound = () => label(c, 'substitution', 'cognitive', `typed '${t}' for '${e}' (they sound alike)`, 'phonetic', 'phonetic')
      // from memory, sound-alike letters (s/z, f/v) beat the neighbour-key explanation
      if (c.mode === 'dictation' && phonetic(c.lang, el, tl)) return sound()
      if (areAdjacent(e, t, L)) {
        const dots = DOT_TWINS.some((g) => g.includes(e) && g.includes(t)) ? ', the letters only differ by dots' : ''
        return label(c, 'adjacent', 'motor', `hit '${t}' instead of '${e}' (neighbour key${dots})`, 'adjacent', 'neighbour')
      }
      if (c.mode === 'dictation' && c.lang !== 'ar' && isVowel(el) && isVowel(tl)) {
        return label(c, 'substitution', 'cognitive', `typed '${t}' for '${e}' (vowels that sound alike)`, 'vowel', 'vowel')
      }
      if (isMirror(e, t, L)) return label(c, 'substitution', 'motor', `hit '${t}' instead of '${e}' (same finger, other hand)`, 'mirror', 'mirror')
      if (sameFinger(e, t, L)) return label(c, 'substitution', 'motor', `hit '${t}' instead of '${e}' (same finger, other row)`, 'same-finger', 'same-finger')
      if (phonetic(c.lang, el, tl)) return sound()
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
