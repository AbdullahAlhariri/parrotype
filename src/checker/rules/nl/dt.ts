import type { Rule, RuleContext, RuleHit } from '@/types'
import { clauseOf, hitWord, isCapitalized, isSubjectSlot, lw, next, prev, sameSentence, wordInfo } from '../../helpers'
import { NL_RELATIVES } from '../../tokenize'
import {
  DETERMINERS,
  DSTEM,
  DSTEM_HOMOGRAPHS,
  INDIRECT_OBJECT_PARTICIPLES,
  PARTICIPLES,
  PAST_DT,
  PAST_FORMS,
  QUESTION_WORDS,
  ADV_FRONT,
  SUBORDINATORS,
  T3_TO_IK,
  VERBS,
  isKnownNoun,
  set,
} from '../../lexicon/nl'
import { LINKS } from './links'
import { INVERSION_SUBJ, PERSONAL_SUBJ, inVerbFinalClause, laterFiniteInClause, nounFollows, subjectVerbPairs } from './shared'

// d/t in the present tense and verb agreement (docs/research/dutch-errors.md §3.1, rules DT-01..11, AGR-01..03).

/** ik-form -> hij-form for verbs where they differ (not d-stems, those live in DSTEM) */
const IK_TO_T3: ReadonlyMap<string, string> = new Map(
  VERBS.filter((v) => v.ik !== v.hij && !PAST_FORMS.has(v.ik) && !v.ik.endsWith('d')).map((v) => [v.ik, v.hij]),
)
const IK_TO_INF: ReadonlyMap<string, string> = new Map([
  ...VERBS.map((v) => [v.ik, v.inf] as [string, string]),
  ['hou', 'houden'],
  ['rij', 'rijden'],
  ['snij', 'snijden'],
  ['glij', 'glijden'],
])
/** ik-forms that are adjectives/adverbs (or a past form): never a safe verb */
const IK_NOT_VERB = set('pas open trouw wijs mis duur was stil')
/** ik-forms that are also common nouns: only safe in a main clause ("omdat hij werk heeft") */
const IK_HOMOGRAPHS = set(`werk fiets plan hoop dans kus rust pas leer mis deel stel bel zorg bouw trouw open stuur pak
  teken reis geloof gebruik klop stop groei kijk lijk begin vlieg verlies trek graaf loop roep slaap val lach bak
  vraag koop zoek bezoek verkoop zweer wijs prijs was spring hang vang dwing stink zwel klim zet duur tel typ leen
  voel noem huil wandel luister oefen reken herhaal verdien bestel open kook dans mis`)

const withClipped = (ik: string) => (ik === 'houd' ? ['houd', 'hou'] : ik === 'rijd' ? ['rijd', 'rij'] : [ik])

const lopenTrick = {
  en: 'Swap in ‘lopen’: you hear the t in ‘hij loopt’, so you write one in ‘hij vindt’ too.',
  nl: 'Vervang het werkwoord door ‘lopen’: je hoort een t in ‘hij loopt’, dus schrijf je ook ‘hij vindt’.',
}

/* ------------------------------------------------------------------ */
/* DT-01 / DT-02: ik + stem                                            */
/* ------------------------------------------------------------------ */

const IK_NOT_SUBJECT_PREV = set("het mijn m'n zijn jouw je ons haar woord en of dan behalve zoals")
/** "Iemand als ik heeft ...": als after a noun or pronoun compares, the verb belongs to that noun */
const CLAUSE_LINKS = set('en maar want dus of')
const comparingAls = (ctx: RuleContext, p: number) => {
  if (lw(ctx, p) !== 'als') return false
  const pp = prev(ctx, p)
  return pp >= 0 && !CLAUSE_LINKS.has(lw(ctx, pp))
}

/**
 * The verb before ik/jij probably closes an earlier clause ("Als hij komt ik ga weg", "Het probleem is
 * ik heb geen tijd"), so it is not inverted with ik/jij.
 */
const CLAUSE_SUBJECT_START = set(`ik jij je hij zij ze wij we jullie u het men er de een dit dat die deze mijn jouw
  zijn haar ons onze hun iemand niemand iedereen`)

function verbClosesEarlierClause(ctx: RuleContext, v: number): boolean {
  const c = clauseOf(ctx, v)
  // a subordinate clause with its own subject before the verb: "Als hij komt | ik ga weg"
  if (c?.opener && v > c.core && (SUBORDINATORS.has(c.opener) || NL_RELATIVES.has(c.opener))) {
    if (CLAUSE_SUBJECT_START.has(lw(ctx, c.core)) || isCapitalized(ctx.words[c.core])) return true
  }
  if (lw(ctx, v) !== 'is') return false
  const p = prev(ctx, v)
  return p >= 0 && (isKnownNoun(lw(ctx, p)) || (prev(ctx, p) >= 0 && DETERMINERS.has(lw(ctx, p - 1))))
}
/** hij-forms that are also nouns: rijst (rice), vaart (speed), staat (state), kust (coast) */
const T3_NOUNS = set('rijst vaart staat kust')

const ikMessage = (ik: string, t3: string) =>
  DSTEM.has(ik) || ik === 'houd' || ik === 'rijd'
    ? {
        message: `With ‘ik’ there is no t: ‘ik ${ik}’`,
        messageLocal: `Bij ‘ik’ geen t: ‘ik ${ik}’`,
        explanation: `After ik you write only the stem of the verb, even when it ends in d. Swap in ‘lopen’: ‘ik loop’ has no t, so it is ‘ik ${ik}’.${ik === 'houd' || ik === 'rijd' ? ` (‘ik ${ik.slice(0, -1)}’ is fine too.)` : ''}`,
        explanationLocal: `Bij ik schrijf je alleen de stam, ook als die op een d eindigt. Vervang door ‘lopen’: ik loop (zonder t), dus ik ${ik}.${ik === 'houd' || ik === 'rijd' ? ` (‘ik ${ik.slice(0, -1)}’ mag ook.)` : ''}`,
        learnMore: LINKS.dt,
      }
    : {
        message: `With ‘ik’ use ‘${ik}’, not ‘${t3}’`,
        messageLocal: `Bij ‘ik’ hoort ‘${ik}’, niet ‘${t3}’`,
        explanation: `The verb has to match the subject: ik ${ik}, hij ${t3}.`,
        explanationLocal: `Het werkwoord moet passen bij het onderwerp: ik ${ik}, hij ${t3}.`,
        learnMore: LINKS.dt,
      }

export const ikStem: Rule = {
  id: 'nl.dt.ik-stem',
  lang: 'nl',
  category: 'grammar',
  title: 'ik + stem (no t)',
  confidence: 'high',
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((w, i) => {
      if (w.lower !== 'ik') return
      const v = next(ctx, i)
      if (v < 0) return
      const t3 = lw(ctx, v)
      const ik = T3_TO_IK.get(t3)
      if (!ik) return
      const p = prev(ctx, i)
      if (p >= 0 && (IK_NOT_SUBJECT_PREV.has(lw(ctx, p)) || comparingAls(ctx, p))) return
      if (T3_NOUNS.has(t3) || (inVerbFinalClause(ctx, i) && laterFiniteInClause(ctx, v))) return // "omdat ik rijst eet"
      out.push(hitWord(ctx, v, withClipped(ik), ikMessage(ik, t3)))
    })
    return out
  },
}

export const invertedIk: Rule = {
  id: 'nl.dt.inverted-ik',
  lang: 'nl',
  category: 'grammar',
  title: 'verb + ik (no t)',
  confidence: 'high',
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((w, i) => {
      if (w.lower !== 'ik') return
      const v = prev(ctx, i)
      if (v < 0) return
      const t3 = lw(ctx, v)
      const ik = T3_TO_IK.get(t3)
      if (!ik || T3_NOUNS.has(t3) || verbClosesEarlierClause(ctx, v)) return
      const p = prev(ctx, v)
      if (p >= 0 && PERSONAL_SUBJ.has(lw(ctx, p))) return
      const msg = ikMessage(ik, t3)
      out.push(
        hitWord(ctx, v, withClipped(ik), {
          ...msg,
          message: `‘ik’ after the verb: still no t, ‘${ik} ik’`,
          messageLocal: `‘ik’ achter het werkwoord: ook geen t, ‘${ik} ik’`,
        }),
      )
    })
    return out
  },
}

/* ------------------------------------------------------------------ */
/* DT-03: hij/zij/het + d-stem without t                               */
/* ------------------------------------------------------------------ */

const SUBJ3_SURE = set('hij zij men iemand niemand iedereen het')
const SUBJ3_MAYBE = set('ze dit dat die wat wie er')
const SUBJ3_ALL = new Set([...SUBJ3_SURE, ...SUBJ3_MAYBE])
const AMBIGUOUS_SUBJ = set('het ze dit dat die wat wie er u je')

export const hijStemT: Rule = {
  id: 'nl.dt.hij-t',
  lang: 'nl',
  category: 'grammar',
  title: 'hij/zij/het + stem + t',
  confidence: 'high',
  check(ctx) {
    const out: RuleHit[] = []
    for (const { s, v, verbFinal } of subjectVerbPairs(ctx, SUBJ3_ALL)) {
      const subj = lw(ctx, s)
      const ik = lw(ctx, v)
      const t3 = DSTEM.get(ik)
      if (!t3) continue
      const ambiguous = AMBIGUOUS_SUBJ.has(subj)
      if ((ambiguous || verbFinal) && DSTEM_HOMOGRAPHS.has(ik)) continue
      // "Wat vind kinderen leuk?" has a noun subject after the verb; "Het word tijd" does not
      if (ambiguous && nounFollows(ctx, v) && !(subj === 'het' && ik === 'word')) continue
      if (subj === 'er' && !wordInfo(ctx, s)?.sentStart) continue
      const plural = subj === 'zij' || subj === 'ze'
      const inf = IK_TO_INF.get(ik)
      const clipped = ik.length <= 4 && !ik.endsWith('d')
      out.push(
        hitWord(
          ctx,
          v,
          plural && inf ? [t3, inf] : [t3],
          {
            message: `After ‘${subj}’: stem + t → ‘${t3}’`,
            messageLocal: `Na ‘${subj}’: stam + t → ‘${t3}’`,
            explanation: clipped
              ? `‘ik ${ik}’ is fine, but with he/she/it you need the full stem plus t: ‘${subj} ${t3}’.`
              : `With hij, zij, het (and u) you add a t to the stem, also when the stem already ends in d: ${ik} + t = ${t3}. ${lopenTrick.en}${plural ? ` (If ‘${subj}’ means ‘they’, use ‘${inf}’.)` : ''}`,
            explanationLocal: clipped
              ? `‘Ik ${ik}’ mag, maar bij hij, zij en het hoort de hele stam met t: ‘${subj} ${t3}’.`
              : `Bij hij, zij en het (en u) komt er een t achter de stam, ook als die al op d eindigt: ${ik} + t = ${t3}. ${lopenTrick.nl}${plural ? ` (Bedoel je meervoud, dan ‘${inf}’.)` : ''}`,
            learnMore: clipped ? LINKS.hou : LINKS.dt,
          },
          SUBJ3_SURE.has(subj) ? 'high' : 'medium',
        ),
      )
    }
    return out
  },
}

/* ------------------------------------------------------------------ */
/* Agreement for other verbs: hij ga -> hij gaat, jij kom -> jij komt  */
/* ------------------------------------------------------------------ */

const AGR_SUBJ = set('hij zij men iemand niemand iedereen jij')

export const stemT: Rule = {
  id: 'nl.agr.stem-t',
  lang: 'nl',
  category: 'grammar',
  title: 'hij/jij + verb form',
  confidence: 'high',
  check(ctx) {
    const out: RuleHit[] = []
    for (const { s, v, verbFinal } of subjectVerbPairs(ctx, AGR_SUBJ)) {
      const subj = lw(ctx, s)
      const ik = lw(ctx, v)
      const t3 = IK_TO_T3.get(ik)
      if (!t3 || IK_NOT_VERB.has(ik) || (verbFinal && IK_HOMOGRAPHS.has(ik))) continue
      if (subj === 'jij' && (ik === 'ben' || ik === 'heb')) continue // DT-09
      const plural = subj === 'zij'
      const inf = IK_TO_INF.get(ik)
      out.push(
        hitWord(ctx, v, plural && inf ? [t3, inf] : [t3], {
          message: `‘${subj}’ goes with ‘${t3}’`,
          messageLocal: `Bij ‘${subj}’ hoort ‘${t3}’`,
          explanation: `The verb has to match the subject: ik ${ik}, ${subj} ${t3}.${plural ? ` (For ‘they’: zij ${inf}.)` : ''}`,
          explanationLocal: `Het werkwoord moet passen bij het onderwerp: ik ${ik}, ${subj} ${t3}.${plural ? ` (Meervoud: zij ${inf}.)` : ''}`,
          learnMore: LINKS.dt,
        }),
      )
    }
    return out
  },
}

/* ------------------------------------------------------------------ */
/* DT-04 / DT-09: jij/je before the verb                               */
/* ------------------------------------------------------------------ */

const JIJ_JE = set('jij je')

export const jijT: Rule = {
  id: 'nl.dt.jij-t',
  lang: 'nl',
  category: 'grammar',
  title: 'jij + stem + t',
  confidence: 'high',
  check(ctx) {
    const out: RuleHit[] = []
    for (const { s, v, verbFinal } of subjectVerbPairs(ctx, JIJ_JE)) {
      const subj = lw(ctx, s)
      const ik = lw(ctx, v)
      const t3 = DSTEM.get(ik)
      if (!t3) continue
      if ((subj === 'je' || verbFinal) && DSTEM_HOMOGRAPHS.has(ik)) continue
      if (subj === 'je' && nounFollows(ctx, v)) continue
      out.push(
        hitWord(
          ctx,
          v,
          [t3],
          {
            message: `‘${subj}’ before the verb: add t → ‘${t3}’`,
            messageLocal: `‘${subj}’ vóór het werkwoord: stam + t → ‘${t3}’`,
            explanation: `When jij/je comes before the verb, the verb gets stem + t: jij wordt, je vindt. Only when jij/je comes after the verb does the t drop: word jij?`,
            explanationLocal: `Staat jij/je vóór het werkwoord, dan schrijf je stam + t: jij wordt, je vindt. Alleen als jij/je erachter staat, valt de t weg: word jij?`,
            learnMore: LINKS.wordJe,
          },
          subj === 'jij' ? 'high' : 'medium',
        ),
      )
    }
    return out
  },
}

const BEN_HEB: Record<string, string> = { ben: 'bent', heb: 'hebt' }

export const jijBent: Rule = {
  id: 'nl.dt.jij-bent',
  lang: 'nl',
  category: 'grammar',
  title: 'jij bent / jij hebt',
  confidence: 'high',
  check(ctx) {
    const out: RuleHit[] = []
    for (const { s, v } of subjectVerbPairs(ctx, JIJ_JE)) {
      const fixWord = BEN_HEB[lw(ctx, v)]
      if (!fixWord) continue
      const subj = lw(ctx, s)
      out.push(
        hitWord(ctx, v, [fixWord], {
          message: `It's ‘${subj} ${fixWord}’`,
          messageLocal: `Het is ‘${subj} ${fixWord}’`,
          explanation: `With jij/je before the verb: jij bent, jij hebt. (Jij kan/kunt and jij wil/wilt are both fine.)`,
          explanationLocal: `Met jij/je vóór het werkwoord: jij bent, jij hebt. (Jij kan/kunt en jij wil/wilt mogen allebei.)`,
          learnMore: LINKS.kunt,
        }),
      )
    }
    return out
  },
}

/* ------------------------------------------------------------------ */
/* DT-05 / DT-06 / DT-08: verb + jij/je (inversion drops the t)        */
/* ------------------------------------------------------------------ */

export const invertedJij: Rule = {
  id: 'nl.dt.inverted-jij',
  lang: 'nl',
  category: 'grammar',
  title: 'verb + jij (t drops)',
  confidence: 'high',
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((w, i) => {
      if (w.lower !== 'jij') return
      const v = prev(ctx, i)
      if (v < 0) return
      const t3 = lw(ctx, v)
      const ik = T3_TO_IK.get(t3)
      if (!ik || verbClosesEarlierClause(ctx, v)) return
      const p = prev(ctx, v)
      if (p >= 0 && PERSONAL_SUBJ.has(lw(ctx, p))) return
      out.push(
        hitWord(ctx, v, withClipped(ik), {
          message: `‘jij’ after the verb: no t → ‘${ik} jij’`,
          messageLocal: `‘jij’ achter het werkwoord: geen t → ‘${ik} jij’`,
          explanation: `When jij comes after the verb (a question or inversion), the t drops: word jij, vind jij, loop jij. Before the verb it stays: jij wordt.`,
          explanationLocal: `Staat jij achter het werkwoord (vraag of inversie), dan valt de t weg: word jij, vind jij, loop jij. Ervoor blijft hij staan: jij wordt.`,
          learnMore: LINKS.wordJe,
        }),
      )
    })
    return out
  },
}

const JE_INV_VERBS = set('wordt vindt houdt rijdt antwoordt redt wedt')
const JE_SAFE_NEXT = set(`ook nog al niet wel echt toch dan nu misschien eigenlijk graag zelf morgen vandaag straks
  vaak altijd nooit soms even gewoon er hier daar me mij ons hem haar trouwens ooit weleens meestal zo snel later
  vanavond vanmiddag binnenkort wakker beter ziek moe boos blij`)
/** fronted question phrases of two words: "Hoe laat word je wakker?" */
const QUESTION_PHRASE = set('laat vaak lang ver snel oud')
const JE_SAFE_NEXT_VINDT = set('het dat dit die deze ze ervan erover daarvan')
const looksParticiple = (w: string) =>
  PARTICIPLES.has(w) || /^(?:ge|be|ver|ont|her|er|op|aan|af|uit|in|mee|weg|terug|door|over|om)\S{2,}[dt]$/.test(w)

export const invertedJe: Rule = {
  id: 'nl.dt.inverted-je',
  lang: 'nl',
  category: 'grammar',
  title: 'verb + je (t drops)',
  confidence: 'medium',
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((w, i) => {
      if (w.lower !== 'je') return
      const v = prev(ctx, i)
      if (v < 0) return
      const t3 = lw(ctx, v)
      if (!JE_INV_VERBS.has(t3)) return
      // the verb must open the clause, possibly after one fronted adverb or question word
      const clause = clauseOf(ctx, v)
      if (!clause) return
      const p = prev(ctx, v)
      const verbFirst = v === clause.from || v === clause.core
      const pp = p >= 0 ? prev(ctx, p) : -1
      const afterFront =
        p >= 0 &&
        (((p === clause.from || p === clause.core) && (ADV_FRONT.has(lw(ctx, p)) || QUESTION_WORDS.has(lw(ctx, p)))) ||
          (pp >= 0 && (pp === clause.from || pp === clause.core) && lw(ctx, pp) === 'hoe' && QUESTION_PHRASE.has(lw(ctx, p))))
      if (!verbFirst && !afterFront) return
      // "Wordt je dat verteld?" (je = to you) is right
      if (t3 === 'wordt') {
        for (let k = i + 1; k <= clause.to; k++) if (INDIRECT_OBJECT_PARTICIPLES.has(lw(ctx, k))) return
      }
      const n = next(ctx, i)
      if (n >= 0) {
        const nw = lw(ctx, n)
        const safe =
          JE_SAFE_NEXT.has(nw) ||
          (t3 === 'vindt' && JE_SAFE_NEXT_VINDT.has(nw)) ||
          (t3 === 'wordt' && looksParticiple(nw) && !INDIRECT_OBJECT_PARTICIPLES.has(nw))
        if (!safe) return // probably possessive: "Wordt je zus gebracht?"
      }
      const ik = T3_TO_IK.get(t3) ?? t3.slice(0, -1)
      out.push(
        hitWord(ctx, v, withClipped(ik), {
          message: `‘je’ after the verb: no t → ‘${ik} je’`,
          messageLocal: `‘je’ achter het werkwoord: geen t → ‘${ik} je’`,
          explanation: `When je comes after the verb, the t drops: word je, vind je. Careful: in ‘Wordt je zus opgehaald?’ je means ‘your’, the subject is ‘je zus’, so wordt is right there.`,
          explanationLocal: `Staat je achter het werkwoord, dan valt de t weg: word je, vind je. Let op: in ‘Wordt je zus opgehaald?’ betekent je ‘jouw’ en is ‘je zus’ het onderwerp; dan is wordt goed.`,
          learnMore: LINKS.wordJe,
        }),
      )
    })
    return out
  },
}

const BENT_JE: Record<string, string> = { bent: 'ben', hebt: 'heb', kunt: 'kun', zult: 'zul', wilt: 'wil' }

export const bentJe: Rule = {
  id: 'nl.dt.bent-je',
  lang: 'nl',
  category: 'grammar',
  title: 'ben je / heb je / kun je',
  confidence: 'high',
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((w, i) => {
      if (w.lower !== 'je' && w.lower !== 'jij') return
      const v = prev(ctx, i)
      if (v < 0) return
      const right = BENT_JE[lw(ctx, v)]
      if (!right) return
      const p = prev(ctx, v)
      if (p >= 0 && set('jij je u').has(lw(ctx, p))) return // "Jij hebt je huiswerk" (je = your)
      out.push(
        hitWord(ctx, v, [right], {
          message: `With ‘${w.lower}’ after it: ‘${right} ${w.lower}’`,
          messageLocal: `Met ‘${w.lower}’ erachter: ‘${right} ${w.lower}’`,
          explanation: `When je/jij follows the verb, use the short form: ben je, heb je, kun je, zul je, wil je. Bent/hebt/kunt go with u or with jij before the verb.`,
          explanationLocal: `Staat je/jij achter het werkwoord, dan gebruik je de korte vorm: ben je, heb je, kun je, zul je, wil je. Bent/hebt/kunt horen bij u of bij jij vóór het werkwoord.`,
          learnMore: LINKS.kunt,
        }),
      )
    })
    return out
  },
}

/* ------------------------------------------------------------------ */
/* DT-07: u always takes t                                             */
/* ------------------------------------------------------------------ */

const U_VERBS_BEFORE: Record<string, string[]> = { ben: ['bent'], heb: ['hebt', 'heeft'] }
const U_INVERSION_SAFE = set('kom ga doe sta')

const uForm = (ik: string): string[] | undefined =>
  U_VERBS_BEFORE[ik] ?? (DSTEM.has(ik) ? [DSTEM.get(ik) as string] : undefined)

const uMessage = (form: string, after: boolean) => ({
  message: after ? `With ‘u’ always a t: ‘${form} u’` : `With ‘u’ always a t: ‘u ${form}’`,
  messageLocal: after ? `Bij ‘u’ altijd een t: ‘${form} u’` : `Bij ‘u’ altijd een t: ‘u ${form}’`,
  explanation: `u always takes stem + t, before or after the verb: u wordt, wordt u geholpen? (Unlike jij: word jij?) With zijn and hebben: u bent, u hebt/heeft.`,
  explanationLocal: `Bij u komt er altijd een t achter de stam, ook als u achter het werkwoord staat: wordt u al geholpen? (Anders dan bij jij: word jij?) Bij zijn en hebben: u bent, u hebt/heeft.`,
  learnMore: LINKS.hebtU,
})

export const uT: Rule = {
  id: 'nl.dt.u-t',
  lang: 'nl',
  category: 'grammar',
  title: 'u + stem + t',
  confidence: 'high',
  check(ctx) {
    const out: RuleHit[] = []
    // verb + u: "Word u al geholpen?"
    ctx.words.forEach((w, i) => {
      if (w.lower !== 'u') return
      const v = prev(ctx, i)
      if (v < 0) return
      const ik = lw(ctx, v)
      const forms = uForm(ik) ?? (U_INVERSION_SAFE.has(ik) ? [IK_TO_T3.get(ik) as string] : undefined)
      if (!forms) return
      const p = prev(ctx, v)
      if (p >= 0 && PERSONAL_SUBJ.has(lw(ctx, p))) return // "Ik vind u aardig"
      out.push(hitWord(ctx, v, forms, uMessage(forms[0], true)))
    })
    // u + verb: "U vind het vast leuk."
    for (const { v, verbFinal } of subjectVerbPairs(ctx, set('u'))) {
      const ik = lw(ctx, v)
      if (DSTEM_HOMOGRAPHS.has(ik) || nounFollows(ctx, v)) continue
      const forms = uForm(ik) ?? (!verbFinal && !IK_HOMOGRAPHS.has(ik) && !IK_NOT_VERB.has(ik) && IK_TO_T3.has(ik) ? [IK_TO_T3.get(ik) as string] : undefined)
      if (!forms) continue
      out.push(hitWord(ctx, v, forms, uMessage(forms[0], false)))
    }
    return out
  },
}

/* ------------------------------------------------------------------ */
/* DT-10 / DT-11                                                       */
/* ------------------------------------------------------------------ */

export const pastDt: Rule = {
  id: 'nl.dt.past-dt',
  lang: 'nl',
  category: 'spelling',
  title: 'no dt in the past tense',
  confidence: 'high',
  check(ctx) {
    const out: RuleHit[] = []
    const gij = new Set<number>()
    ctx.words.forEach((w, i) => {
      if (w.lower === 'gij') gij.add(wordInfo(ctx, i)?.sent ?? -1)
    })
    ctx.words.forEach((w, i) => {
      const right = PAST_DT.get(w.lower)
      if (!right || gij.has(wordInfo(ctx, i)?.sent ?? -1)) return
      out.push(
        hitWord(ctx, i, [right], {
          message: `Past tense never ends in dt: ‘${right}’`,
          messageLocal: `Verleden tijd nooit met dt: ‘${right}’`,
          explanation: `Strong verbs change their vowel in the past tense and never get an extra t: hij werd, hij vond, hij hield.`,
          explanationLocal: `Sterke werkwoorden veranderen van klinker in de verleden tijd en krijgen geen extra t: hij werd, hij vond, hij hield.`,
          learnMore: LINKS.dt,
        }),
      )
    })
    return out
  },
}

const HOUT_SUBJ = set('hij zij ze men jij u')
const RIJT_NEXT = set('naar met door elke elk vaak altijd te auto fiets hard snel langzaam')

export const hijHoudt: Rule = {
  id: 'nl.dt.hij-houdt',
  lang: 'nl',
  category: 'grammar',
  title: 'hij houdt / hij rijdt',
  confidence: 'medium',
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((w, i) => {
      if (w.lower !== 'hout' && w.lower !== 'rijt') return
      const s = prev(ctx, i)
      const n = next(ctx, i)
      if (s < 0 || n < 0 || !HOUT_SUBJ.has(lw(ctx, s))) return
      const right = w.lower === 'hout' ? 'houdt' : 'rijdt'
      if (w.lower === 'hout' && lw(ctx, n) !== 'van') return
      if (w.lower === 'rijt' && !RIJT_NEXT.has(lw(ctx, n))) return
      out.push(
        hitWord(ctx, i, [right], {
          message: `Did you mean ‘${right}’?`,
          messageLocal: `Bedoel je ‘${right}’?`,
          explanation: `‘ik ${right === 'houdt' ? 'hou' : 'rij'}’ is fine, but with hij/zij you need the full stem ${right.slice(0, -1)} + t = ${right}.`,
          explanationLocal: `‘Ik ${right === 'houdt' ? 'hou' : 'rij'}’ mag, maar bij hij/zij hoort de hele stam ${right.slice(0, -1)} + t = ${right}.`,
          learnMore: LINKS.hou,
        }),
      )
    })
    return out
  },
}

/* ------------------------------------------------------------------ */
/* AGR-01..03                                                          */
/* ------------------------------------------------------------------ */

const WIJ_SG: Record<string, string> = Object.fromEntries(
  `is:zijn heeft:hebben gaat:gaan komt:komen wordt:worden vindt:vinden doet:doen ziet:zien staat:staan kan:kunnen
  wil:willen zal:zullen mag:mogen moet:moeten weet:weten krijgt:krijgen blijft:blijven loopt:lopen woont:wonen
  werkt:werken speelt:spelen maakt:maken zegt:zeggen denkt:denken kijkt:kijken eet:eten drinkt:drinken
  slaapt:slapen leest:lezen schrijft:schrijven rijdt:rijden houdt:houden betaalt:betalen neemt:nemen geeft:geven
  ligt:liggen zit:zitten hoort:horen leert:leren spreekt:spreken koopt:kopen zoekt:zoeken brengt:brengen
  vraagt:vragen begint:beginnen wint:winnen helpt:helpen ga:gaan kom:komen ben:zijn heb:hebben doe:doen zie:zien
  sta:staan`
    .trim()
    .split(/\s+/)
    .map((p) => p.split(':')),
)

export const wijPlural: Rule = {
  id: 'nl.agr.wij-plural',
  lang: 'nl',
  category: 'grammar',
  title: 'wij + plural verb',
  confidence: 'high',
  check(ctx) {
    const out: RuleHit[] = []
    for (const { s, v } of subjectVerbPairs(ctx, set('wij we'))) {
      const inf = WIJ_SG[lw(ctx, v)]
      if (!inf) continue
      out.push(
        hitWord(ctx, v, [inf], {
          message: `With ‘${lw(ctx, s)}’ use the plural: ‘${inf}’`,
          messageLocal: `Bij ‘${lw(ctx, s)}’ hoort het meervoud: ‘${inf}’`,
          explanation: `wij/we, jullie and zij (they) take the plural form, which looks like the infinitive: wij ${inf}.`,
          explanationLocal: `Bij wij/we en zij (meervoud) gebruik je de meervoudsvorm, die lijkt op het hele werkwoord: wij ${inf}.`,
          learnMore: LINKS.dt,
        }),
      )
    }
    return out
  },
}

const IK_PLURAL: Record<string, string> = Object.fromEntries(
  `hebben:heb zijn:ben gaan:ga komen:kom worden:word kunnen:kan willen:wil moeten:moet mogen:mag zullen:zal doen:doe
  zien:zie weten:weet vinden:vind maken:maak wonen:woon krijgen:krijg blijven:blijf houden:houd denken:denk`
    .trim()
    .split(/\s+/)
    .map((p) => p.split(':')),
)

export const ikPlural: Rule = {
  id: 'nl.agr.ik-plural',
  lang: 'nl',
  category: 'grammar',
  title: 'ik + ik-form',
  confidence: 'medium',
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((w, i) => {
      if (w.lower !== 'ik') return
      const info = wordInfo(ctx, i)
      const c = clauseOf(ctx, i)
      if (!info || !c || c.from !== i) return // only "Ik hebben ...", not "omdat ik werken moet"
      const p = i > 0 && sameSentence(ctx, i - 1, i) ? lw(ctx, i - 1) : ''
      if (p === 'en' || p === 'of' || p === 'met') return
      const v = next(ctx, i)
      if (v < 0) return
      const right = IK_PLURAL[lw(ctx, v)]
      if (!right) return
      const after = next(ctx, v)
      if (after >= 0 && INVERSION_SUBJ.has(lw(ctx, after))) return
      out.push(
        hitWord(
          ctx,
          v,
          [right],
          {
            message: `With ‘ik’ use ‘${right}’`,
            messageLocal: `Bij ‘ik’ hoort ‘${right}’`,
            explanation: `‘${lw(ctx, v)}’ is the plural (wij/zij). With ik you use the ik-form: ik ${right}.`,
            explanationLocal: `‘${lw(ctx, v)}’ is meervoud (wij/zij). Bij ik gebruik je de ik-vorm: ik ${right}.`,
            learnMore: LINKS.dt,
          },
          info.sentStart ? 'high' : 'medium',
        ),
      )
    })
    return out
  },
}

export const uIs: Rule = {
  id: 'nl.agr.u-bent',
  lang: 'nl',
  category: 'grammar',
  title: 'u bent (not u is)',
  confidence: 'medium',
  check(ctx) {
    const out: RuleHit[] = []
    for (const { s, v, verbFinal } of subjectVerbPairs(ctx, set('u'))) {
      if (verbFinal || lw(ctx, v) !== 'is' || !isSubjectSlot(ctx, s)) continue
      out.push(
        hitWord(ctx, v, ['bent'], {
          message: `Use ‘u bent’`,
          messageLocal: `Gebruik ‘u bent’`,
          explanation: `‘u is’ is old-fashioned; today you write ‘u bent’.`,
          explanationLocal: `‘U is’ is ouderwets; tegenwoordig schrijf je ‘u bent’.`,
          learnMore: LINKS.hebtU,
        }),
      )
    }
    return out
  },
}

export const dtRules: Rule[] = [
  ikStem,
  invertedIk,
  hijStemT,
  stemT,
  jijT,
  jijBent,
  invertedJij,
  invertedJe,
  bentJe,
  uT,
  pastDt,
  hijHoudt,
  wijPlural,
  ikPlural,
  uIs,
]
