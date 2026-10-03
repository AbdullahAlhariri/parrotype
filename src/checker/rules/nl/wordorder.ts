import type { Rule, RuleHit } from '@/types'
import { clauseOf, fix, hitWords, isSentenceStart, lw, next, prev } from '../../helpers'
import {
  ADV_FRONT,
  ADV_FRONT_HEADS,
  ADV_FRONT_TAILS,
  COMPARATIVES,
  CONF_PART_TO_PRES,
  FINITE,
  FINITE_FORMS,
  INFINITIVES,
  PARTICIPLES,
  PAST_FORMS,
  PREPOSITIONS,
  SUBJECT_PRONOUNS,
  VERBS,
  isKnownNoun,
  set,
} from '../../lexicon/nl'
import { isFiniteForm } from './shared'

// Word order: verb second (WO-01), verb last in subordinate clauses (WO-02), negation (WO-03). §3.15.

const SURE_SUBJ = set('ik jij hij zij wij we jullie men')
const MAIN_COORD = set('en maar want')
const AMBIGUOUS_SUBJ = set('je ze het u')
/** finite forms that are not also common nouns (for subjects like je/het that can be determiners) */
const STRICT_FINITE: ReadonlySet<string> = new Set([
  ...VERBS.map((v) => v.hij),
  ...PAST_FORMS,
  ...INFINITIVES,
  ...'ben heb kan wil mag zal moet ga kom doe zie weet sta'.split(' '),
])
const anyFinite = (w: string) => FINITE.has(w) || FINITE_FORMS.has(w)

export const verbSecond: Rule = {
  id: 'nl.wo.verb-second',
  lang: 'nl',
  category: 'grammar',
  title: 'verb second: Morgen ga ik',
  confidence: 'high',
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((t, i) => {
      // sentence start, or the first word after en/maar/want ("maar soms ik begrijp ...")
      const c = clauseOf(ctx, i)
      const afterCoordinator = !!c && c.core === i && c.core !== c.from && MAIN_COORD.has(c.opener ?? '')
      if (!isSentenceStart(ctx, i) && !afterCoordinator) return
      let s = -1
      if (ADV_FRONT.has(t.lower)) s = next(ctx, i)
      else if (ADV_FRONT_HEADS.has(t.lower) && next(ctx, i) >= 0 && ADV_FRONT_TAILS.has(lw(ctx, i + 1))) s = next(ctx, i + 1)
      if (s < 0) return
      const subj = lw(ctx, s)
      if (!SURE_SUBJ.has(subj) && !AMBIGUOUS_SUBJ.has(subj)) return
      const v = next(ctx, s)
      if (v < 0) return
      const verb = lw(ctx, v)
      if (SURE_SUBJ.has(subj) ? !anyFinite(verb) : !STRICT_FINITE.has(verb)) return
      if (AMBIGUOUS_SUBJ.has(subj) && isKnownNoun(verb)) return
      const right = `${ctx.words[v].text} ${subj === 'ik' ? 'ik' : ctx.words[s].text.toLowerCase()}`
      out.push(
        hitWords(ctx, s, v, [right], {
          message: `The verb comes second: ‘${ctx.text.slice(t.start, ctx.words[s].start)}${right}’`,
          messageLocal: `Het werkwoord staat op plek 2: ‘${ctx.text.slice(t.start, ctx.words[s].start)}${right}’`,
          explanation: `In a Dutch main clause the finite verb is always the second part. If the sentence starts with something other than the subject (morgen, gisteren, daarom…), the subject moves behind the verb: Morgen ga ik. With a comma after the first word (Natuurlijk, ik kom) the order stays.`,
          explanationLocal: `In een Nederlandse hoofdzin staat de persoonsvorm altijd op de tweede plaats. Begin je met iets anders dan het onderwerp (morgen, gisteren, daarom…), dan komt het onderwerp achter het werkwoord: Morgen ga ik.`,
        }),
      )
    })
    return out
  },
}

const WO2_SUBORD = set('omdat dat als wanneer terwijl hoewel zodat voordat nadat totdat sinds zodra tenzij alsof doordat zolang aangezien')
const COMPARE_BEFORE_ALS = new Set([...COMPARATIVES, 'net', 'zo', 'even', 'evenals', 'zowel', 'anders', 'ander', 'andere'])
const WO2_SUBJ = set('ik jij je hij zij ze wij we jullie u het men')
const NOT_INFINITIVE = set('alleen boven beneden even open zeven negen tegen buiten binnen toen geen meteen')
/** infinitives and participles (also separable ones: opgehaald, aangekomen, betaald) */
const looksNonFinite = (w: string) =>
  INFINITIVES.has(w) ||
  PARTICIPLES.has(w) ||
  CONF_PART_TO_PRES.has(w) ||
  w === 'te' ||
  /^\p{L}{0,6}ge\p{L}{2,}[dtn]$/u.test(w) ||
  /^(?:be|ver|ont|her|er)\p{L}{3,}[dt]$/u.test(w) ||
  (w.length >= 5 && /[^aeiouy]en$/.test(w) && !NOT_INFINITIVE.has(w))

export const verbFinal: Rule = {
  id: 'nl.wo.verb-final',
  lang: 'nl',
  category: 'grammar',
  title: 'verb last: omdat ik moe ben',
  confidence: 'medium',
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((t, i) => {
      if (!WO2_SUBORD.has(t.lower)) return
      if (t.lower === 'als' && prev(ctx, i) >= 0 && COMPARE_BEFORE_ALS.has(lw(ctx, i - 1))) return
      const s = next(ctx, i)
      if (s < 0 || !WO2_SUBJ.has(lw(ctx, s))) return
      const v = next(ctx, s)
      if (v < 0) return
      const verb = lw(ctx, v)
      const sure = SURE_SUBJ.has(lw(ctx, s))
      if (!STRICT_FINITE.has(verb) && !FINITE.has(verb) && !(sure && anyFinite(verb) && !isKnownNoun(verb))) return
      if (verb === 'zijn' && !set('we wij jullie').has(lw(ctx, s))) return // "omdat ze zijn fiets kwijt is"
      if (lw(ctx, s) === 'het' || lw(ctx, s) === 'je' ? isKnownNoun(verb) : false) return
      const c = clauseOf(ctx, v)
      const first = next(ctx, v)
      if (!c || first < 0 || c.to - v > 5) return
      const fw = lw(ctx, first)
      if (PREPOSITIONS.has(fw) || SUBJECT_PRONOUNS.has(fw)) return // PP after the verb is allowed; "als jij heb ik" is inversion
      for (let k = v + 1; k <= c.to; k++) {
        const w = lw(ctx, k)
        if (looksNonFinite(w) || isFiniteForm(w)) return
      }
      const rest = ctx.text.slice(ctx.words[first].start, ctx.words[c.to].end)
      const right = `${rest} ${ctx.words[v].text}`
      out.push(
        hitWords(ctx, v, c.to, [right], {
          message: `In a subordinate clause the verb goes last: ‘${t.lower} ${lw(ctx, s)} ${right}’`,
          messageLocal: `In een bijzin staat het werkwoord achteraan: ‘${t.lower} ${lw(ctx, s)} ${right}’`,
          explanation: `After omdat, dat, als, wanneer, terwijl… the finite verb moves to the end of the clause: omdat ik moe ben, dat hij een auto heeft.`,
          explanationLocal: `Na omdat, dat, als, wanneer, terwijl… staat de persoonsvorm aan het eind van de bijzin: omdat ik moe ben, dat hij een auto heeft.`,
        }),
      )
    })
    return out
  },
}

export const doubleNegation: Rule = {
  id: 'nl.wo.double-negation',
  lang: 'nl',
  category: 'grammar',
  title: 'no double negation',
  confidence: 'medium',
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((t, i) => {
      if (t.lower !== 'niet' && t.lower !== 'nooit') return
      const g = next(ctx, i)
      if (g < 0 || lw(ctx, g) !== 'geen') return
      const right = fix(t, t.lower === 'niet' ? 'geen' : 'nooit')
      out.push(
        hitWords(ctx, i, g, [right], {
          message: `Double negation: ‘${right}’ is enough`,
          messageLocal: `Dubbele ontkenning: ‘${right}’ is genoeg`,
          explanation: `Standard Dutch uses one negation: Ik heb geen tijd, Ik heb nooit tijd. ‘Niet geen’ or ‘nooit geen’ is dialect.`,
          explanationLocal: `In standaardtaal gebruik je één ontkenning: Ik heb geen tijd, Ik heb nooit tijd. ‘Niet geen’ of ‘nooit geen’ is dialect.`,
        }),
      )
    })
    return out
  },
}

export const nietEen: Rule = {
  id: 'nl.wo.niet-een',
  lang: 'nl',
  category: 'style',
  title: 'geen (not niet een)',
  confidence: 'low',
  strictOnly: true,
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((t, i) => {
      if (t.lower !== 'niet') return
      const e = next(ctx, i)
      const n = e >= 0 ? next(ctx, e) : -1
      if (e < 0 || n < 0 || lw(ctx, e) !== 'een' || !isKnownNoun(lw(ctx, n))) return
      out.push(
        hitWords(ctx, i, e, [fix(t, 'geen')], {
          message: `To negate a noun use ‘geen’`,
          messageLocal: `Een zelfstandig naamwoord ontken je met ‘geen’`,
          explanation: `Ik heb geen auto (not ‘niet een auto’), unless you stress the number: niet één auto.`,
          explanationLocal: `Ik heb geen auto (niet ‘niet een auto’), tenzij je het aantal benadrukt: niet één auto.`,
        }),
      )
    })
    return out
  },
}

export const wordOrderRules: Rule[] = [verbSecond, verbFinal, doubleNegation, nietEen]
