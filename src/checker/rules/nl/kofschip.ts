import type { Rule, RuleContext, RuleHit } from '@/types'
import { hitWord, isCapitalized, isSentenceStart, known, lw, unknown } from '../../helpers'
import { FINITE_FORMS, LOAN_PARTICIPLES, PARTICIPLES, WEAK_VERBS, isKnownNoun, set } from '../../lexicon/nl'
import { LINKS } from './links'
import { nounFollows, subjectVerbPairs } from './shared'

// Past tense -de/-te and participle -d/-t ('t kofschip, §3.3), loan verbs (§3.4), PAST-01..03, LOAN-01/02.

const kofschipMsg = (wrong: string, right: string, doubled: boolean) =>
  doubled
    ? {
        message: `Stem ends in ${right.match(/(dd|tt)en?$/)?.[1][0] ?? 'd/t'}: write ‘${right}’`,
        messageLocal: `Stam eindigt op ${right.match(/(dd|tt)en?$/)?.[1][0] ?? 'd/t'}: schrijf ‘${right}’`,
        explanation: `The past tense is stem + -te or -de, also when the stem already ends in t or d. So you get a double letter: wacht + te = wachtte, antwoord + de = antwoordde.`,
        explanationLocal: `De verleden tijd is stam + -te of -de, ook als de stam al op t of d eindigt. Dan krijg je een dubbele letter: wacht + te = wachtte, antwoord + de = antwoordde.`,
        learnMore: LINKS.kofschip,
      }
    : {
        message: `’t kofschip: ‘${right}’, not ‘${wrong}’`,
        messageLocal: `’t kofschip: ‘${right}’, niet ‘${wrong}’`,
        explanation: `Look at the last sound of the stem (take it from the infinitive: leven → v, reizen → z). Is it one of t, k, f, s, ch, p (’t kofschip)? Then -te / -t. Otherwise -de / -d: fietste, gefietst, but leefde, geleefd.`,
        explanationLocal: `Kijk naar de laatste letter van de stam (neem die van het hele werkwoord: leven → v, reizen → z). Zit die in ’t kofschip (t, k, f, s, ch, p)? Dan -te / -t. Anders -de / -d: fietste, gefietst, maar leefde, geleefd.`,
        learnMore: LINKS.kofschip,
      }

/* ------------------------------------------------------------------ */
/* Candidate generation, validated against the dictionary              */
/* ------------------------------------------------------------------ */

const shortenVowel = (b: string) => b.replace(/(aa|ee|oo|uu)([^aeiouy]+)$/, (_m, v: string, c: string) => v[0] + c)

/** guesses at the infinitive of a stem, used to make sure a candidate is really a verb form */
export function infinitiveGuesses(base: string): string[] {
  const out = new Set<string>()
  const voiced = base.replace(/f$/, 'v').replace(/s$/, 'z')
  for (const b of [base, voiced]) {
    out.add(b + 'en')
    out.add(shortenVowel(b) + 'en')
  }
  if (/[^aeiou][aeiou][bdfgklmnprst]$/.test(base)) out.add(base + base.slice(-1) + 'en')
  return [...out]
}

const isVerbStem = (ctx: RuleContext, base: string) => base.length >= 2 && infinitiveGuesses(base).some((f) => known(ctx, f))

/** non-word past tense or participle -> the dictionary-validated fix */
export function kofschipFix(ctx: RuleContext, w: string): { right: string; doubled: boolean } | undefined {
  if (w.length < 5 || !unknown(ctx, w)) return undefined
  const past = /^(.+?)(dd|tt|d|t)e(n?)$/.exec(w)
  if (past) {
    const [, stem, , pl] = past
    const found: Array<{ right: string; doubled: boolean }> = []
    for (const suf of ['de', 'te', 'dde', 'tte']) {
      const cand = stem + suf + pl
      if (cand === w || !known(ctx, cand)) continue
      const base = suf.length === 3 ? stem + suf[0] : stem
      if (isVerbStem(ctx, base)) found.push({ right: cand, doubled: suf.length === 3 })
    }
    if (found.length === 1) return found[0]
  }
  if (/[dt]$/.test(w) && /^(?:be|ver|ont|her|er)|ge/.test(w)) {
    const cands = new Set([w.slice(0, -1) + 'd', w.slice(0, -1) + 't'])
    if (/(dt|tt|dd)$/.test(w)) {
      cands.add(w.slice(0, -1))
      cands.add(w.slice(0, -2) + 't') // gebeurdt: gebeurd or gebeurt? ambiguous, so no flag
    }
    const found = [...cands].filter((c) => {
      if (c === w || !known(ctx, c)) return false
      const base = c.replace(/[dt]$/, '')
      return isVerbStem(ctx, base.replace(/^.*?ge/, '')) || isVerbStem(ctx, base)
    })
    if (found.length === 1) return { right: found[0], doubled: false }
  }
  return undefined
}

/** wrong forms of the lexicon's weak verbs, for checking without a dictionary */
const NOT_WRONG = set(`betaalt vertelt gebeurt verandert bedoelt gelooft belooft verhuist gevoelt duurte herhaalt verdient
  bestelt verbetert verwachte ontmoete ruste koste rede lande melde verbrande bereide verspreide vermoorde beantwoorde
  begeleide bevrijde vermoede geschut gewet bloede belten stelten`)
export const KOFSCHIP_FALLBACK: ReadonlyMap<string, { right: string; doubled: boolean }> = (() => {
  const m = new Map<string, { right: string; doubled: boolean }>()
  const add = (wrong: string, right: string, doubled: boolean) => {
    if (NOT_WRONG.has(wrong) || FINITE_FORMS.has(wrong) || PARTICIPLES.has(wrong) || wrong === right) return
    m.set(wrong, { right, doubled })
  }
  for (const v of WEAK_VERBS) {
    for (const p of [v.pastSg, v.pastPl]) {
      const r = /^(.*?)(tte|dde|te|de)(n?)$/.exec(p)
      if (!r) continue
      const [, stem, suf, pl] = r
      if (suf === 'tte' || suf === 'dde') add(stem + suf.slice(1) + pl, p, true)
      else add(stem + (suf === 'te' ? 'de' : 'te') + pl, p, false)
    }
    if (v.part.endsWith('d')) add(v.part.slice(0, -1) + 't', v.part, false)
    else if (v.part.endsWith('t') && !v.part.endsWith('tt')) add(v.part.slice(0, -1) + 'd', v.part, false)
  }
  return m
})()

/** skip capitalised words mid-sentence: probably names */
const checkable = (ctx: RuleContext, i: number) => !isCapitalized(ctx.words[i]) || isSentenceStart(ctx, i)

export const kofschip: Rule = {
  id: 'nl.past.kofschip',
  lang: 'nl',
  category: 'spelling',
  title: "past tense -te/-de ('t kofschip)",
  confidence: 'high',
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((t, i) => {
      if (!checkable(ctx, i) || /[^\p{L}]/u.test(t.lower)) return
      const fixed = ctx.dict ? kofschipFix(ctx, t.lower) : KOFSCHIP_FALLBACK.get(t.lower)
      if (!fixed) return
      out.push(hitWord(ctx, i, [fixed.right], kofschipMsg(t.lower, fixed.right, fixed.doubled)))
    })
    return out
  },
}

/* ------------------------------------------------------------------ */
/* PAST-03: real-word adjective instead of -dde past                   */
/* ------------------------------------------------------------------ */

// Singular only: stem + en is the infinitive and present plural ("we landen", "ze leiden"), and
// "reden" is also the past of rijden, so a plural can never be judged without knowing the tense.
const DDE_PAST: ReadonlyMap<string, string> = new Map(
  WEAK_VERBS.filter((v) => v.pastSg.endsWith('dde')).map((v) => [v.ik + 'e', v.pastSg] as [string, string]),
)
const PAST_SUBJ = set('ik hij zij ze jij je u men')

export const pastDde: Rule = {
  id: 'nl.past.dde',
  lang: 'nl',
  category: 'spelling',
  title: 'past tense -dde (verbrandde)',
  confidence: 'medium',
  check(ctx) {
    const out: RuleHit[] = []
    for (const { v } of subjectVerbPairs(ctx, PAST_SUBJ)) {
      const w = lw(ctx, v)
      const right = DDE_PAST.get(w)
      if (!right) continue
      if (nounFollows(ctx, v) || isKnownNoun(w)) continue
      out.push(
        hitWord(ctx, v, [right], {
          message: `Past tense: ‘${right}’ (stem + de)`,
          messageLocal: `Verleden tijd: ‘${right}’ (stam + de)`,
          explanation: `The stem already ends in d, and the past tense adds -de, so you write dd: ${right.replace(/de?n?$/, '')} + de = ${right}. ‘${w}’ with one d is an adjective (de ${w} ...).`,
          explanationLocal: `De stam eindigt al op d en de verleden tijd krijgt -de erbij, dus schrijf je dd: ${right}. ‘${w}’ met één d is een bijvoeglijk naamwoord.`,
          learnMore: LINKS.kofschip,
        }),
      )
    }
    return out
  },
}

/* ------------------------------------------------------------------ */
/* LOAN-01 / LOAN-02: English verbs follow Dutch rules                 */
/* ------------------------------------------------------------------ */

function loanFix(ctx: RuleContext, w: string): string | undefined {
  const mapped = LOAN_PARTICIPLES.get(w)
  if (mapped) return !ctx.dict || unknown(ctx, w) ? mapped : undefined
  if (!ctx.dict || !/^ge.{3,}ed$/.test(w) || !unknown(ctx, w)) return undefined
  const stem = w.slice(0, -2)
  const trema = (s: string) => s.replace(/^ge([aeiou])/, (_m, v: string) => 'ge' + ({ a: 'ä', e: 'ë', i: 'ï', o: 'ö', u: 'ü' }[v] ?? v))
  const cands = [stem + 'd', stem + 't', stem, w.slice(0, -1), stem + 'et', stem + 'ed']
  for (const c of [...cands, ...cands.map(trema)]) if (c !== w && known(ctx, c)) return c
  return undefined
}

export const loanVerb: Rule = {
  id: 'nl.loan.participle',
  lang: 'nl',
  category: 'spelling',
  title: 'English verbs in Dutch (geüpdatet)',
  confidence: 'high',
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((t, i) => {
      if (!checkable(ctx, i)) return
      const right = loanFix(ctx, t.lower)
      if (!right) return
      out.push(
        hitWord(ctx, i, [right], {
          message: `Dutch spelling: ‘${right}’`,
          messageLocal: `Nederlandse vervoeging: ‘${right}’`,
          explanation: `English verbs are conjugated like Dutch verbs: ge + stem + t or d (’t kofschip on the last letter of the stem), never English -ed. A trema or hyphen keeps the vowels apart: geüpdatet, geüpload.`,
          explanationLocal: `Engelse werkwoorden vervoeg je op z’n Nederlands: ge + stam + t of d (’t kofschip op de laatste letter van de stam), nooit -ed. Een trema houdt de klinkers uit elkaar: geüpdatet, geüpload.`,
          learnMore: LINKS.loanVerbs,
        }),
      )
    })
    return out
  },
}

export const kofschipRules: Rule[] = [kofschip, pastDde, loanVerb]
