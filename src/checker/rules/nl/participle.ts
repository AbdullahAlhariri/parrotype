import type { Rule, RuleContext, RuleHit } from '@/types'
import { clauseOf, endsClause, gapAfter, hitWord, lw, next, prev, sameSentence, wordInfo } from '../../helpers'
import {
  ADJECTIVAL_PARTICIPLES,
  AUX_PARTICIPLE,
  CONF_PART_TO_PRES,
  CONF_PRES_TO_PART,
  DSTEM_PART_TO_PRES,
  DSTEM_PRES_TO_PART,
  HEBBEN_FORMS,
  PARTICIPLE_COMPANIONS,
  ZIJN_PARTICIPLES,
  ZIJN_PARTICIPLES_MEDIUM,
  isKnownNoun,
  set,
} from '../../lexicon/nl'
import { LINKS } from './links'
import { nounFollows } from './shared'

// Past participle vs present tense (§3.2, PART-01..05) and hebben/zijn (AUX-01).

const ZIJN_AUX_NEIGHBOURS = set(`we wij zij ze jullie er al nog niet ook daar hier toen net pas gisteren dan nu
  allemaal allebei beide samen weer eindelijk zojuist`)

/** is word k an auxiliary here? Filters out possessive "zijn moeder" and "de was". */
function isAux(ctx: RuleContext, k: number): boolean {
  const w = lw(ctx, k)
  if (!AUX_PARTICIPLE.has(w)) return false
  if (w === 'zijn') {
    const p = k > 0 && sameSentence(ctx, k - 1, k) ? lw(ctx, k - 1) : ''
    const n = next(ctx, k) >= 0 ? lw(ctx, k + 1) : ''
    return ZIJN_AUX_NEIGHBOURS.has(p) || ZIJN_AUX_NEIGHBOURS.has(n)
  }
  if (w === 'was') return prev(ctx, k) < 0 || !set('de die deze onze mijn je jouw').has(lw(ctx, k - 1))
  return true
}

const participleMessage = (wrong: string, right: string, dstem: boolean) => ({
  message: `After an auxiliary: participle ‘${right}’`,
  messageLocal: `Na een hulpwerkwoord: voltooid deelwoord ‘${right}’`,
  explanation: dstem
    ? `With heeft/is/wordt you need the past participle. The stem of this verb already ends in d, so the participle is ‘${right}’ without an extra t.`
    : `With heeft/is/wordt you need the past participle, and it ends in d here: ‘${right}’. Trick: swap in ‘lopen’ → ‘heeft gelopen’ is a participle, so write ‘${right}’, not the present form ‘${wrong}’.`,
  explanationLocal: dstem
    ? `Na heeft/is/wordt komt het voltooid deelwoord. De stam eindigt al op d, dus het deelwoord is ‘${right}’, zonder extra t.`
    : `Na heeft/is/wordt komt het voltooid deelwoord, en dat eindigt hier op een d: ‘${right}’. Truc: vervang door ‘lopen’ → ‘heeft gelopen’ is een deelwoord, dus ‘${right}’ en niet de tegenwoordige tijd ‘${wrong}’.`,
  learnMore: LINKS.participle,
})

function participleAfterAux(ctx: RuleContext, map: ReadonlyMap<string, string>, dstem: boolean): RuleHit[] {
  const out: RuleHit[] = []
  ctx.words.forEach((w, i) => {
    const right = map.get(w.lower)
    if (!right) return
    const c = clauseOf(ctx, i)
    if (!c) return
    let confidence: 'high' | 'medium' | undefined
    if (endsClause(ctx, i)) {
      for (let k = c.from; k < i; k++) if (isAux(ctx, k)) confidence = 'high'
    }
    // verb-final cluster: "...dat het al betaalt is"
    const n = next(ctx, i)
    if (!confidence && n >= 0 && endsClause(ctx, n) && isAux(ctx, n) && lw(ctx, n) !== 'zijn') confidence = 'medium'
    if (!confidence) return
    out.push(hitWord(ctx, i, [right], participleMessage(w.lower, right, dstem), confidence))
  })
  return out
}

export const auxParticiple: Rule = {
  id: 'nl.part.aux-d',
  lang: 'nl',
  category: 'grammar',
  title: 'participle after heeft/is (gebeurd)',
  confidence: 'high',
  check: (ctx) => participleAfterAux(ctx, CONF_PRES_TO_PART, false),
}

export const dstemParticiple: Rule = {
  id: 'nl.part.dstem-aux',
  lang: 'nl',
  category: 'grammar',
  title: 'participle of a d-stem verb (beantwoord)',
  confidence: 'high',
  check: (ctx) => participleAfterAux(ctx, DSTEM_PRES_TO_PART, true),
}

/* ------------------------------------------------------------------ */
/* PART-02 / PART-03 / PART-04: present wanted, participle written     */
/* ------------------------------------------------------------------ */

const PART02_SUBJ = set('hij zij ze het men u jij je dit iemand niemand iedereen')
const PART02_SUBJ_SENT_START = set('dat er wat')
const MAIN_OPENERS = set('en maar want dus')

const presentMessage = (wrong: string, right: string, subj: string) => ({
  message: `No auxiliary, so present tense: ‘${right}’`,
  messageLocal: `Geen hulpwerkwoord, dus tegenwoordige tijd: ‘${right}’`,
  explanation: `There is no heeft/is/wordt here, so this is the present tense: ${subj} + stem + t = ‘${right}’. ‘${wrong}’ with a d is the past participle (Het is ${wrong}).`,
  explanationLocal: `Er staat geen heeft/is/wordt, dus dit is de tegenwoordige tijd: ${subj} + stam + t = ‘${right}’. ‘${wrong}’ met een d is het voltooid deelwoord (Het is ${wrong}).`,
  learnMore: LINKS.participle,
})

const presentFor = (w: string) => CONF_PART_TO_PRES.get(w) ?? DSTEM_PART_TO_PRES.get(w)

/** a word in the punctuation-delimited stretch around i that could carry the participle */
function auxNearby(ctx: RuleContext, from: number): boolean {
  const s = wordInfo(ctx, from)?.sent
  // walk left and right until punctuation or sentence edge
  let a = from
  while (a > 0 && wordInfo(ctx, a - 1)?.sent === s && prev(ctx, a) === a - 1) a--
  let b = from
  while (b + 1 < ctx.words.length && next(ctx, b) === b + 1) b++
  for (let k = a; k <= b; k++) {
    const w = lw(ctx, k)
    if (isAux(ctx, k) || PARTICIPLE_COMPANIONS.has(w)) return true
  }
  return false
}

export const pronounParticiple: Rule = {
  id: 'nl.part.present-t',
  lang: 'nl',
  category: 'grammar',
  title: 'present tense, not participle (het gebeurt)',
  confidence: 'high',
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((w, s) => {
      const subj = w.lower
      const info = wordInfo(ctx, s)
      if (!info) return
      if (!PART02_SUBJ.has(subj) && !(PART02_SUBJ_SENT_START.has(subj) && info.sentStart)) return
      // main-clause subject: clause start, or right after en/maar/want/dus
      const c = clauseOf(ctx, s)
      if (!c) return
      const mainStart = s === c.from ? !c.opener || c.opener === subj : s === c.core && MAIN_OPENERS.has(c.opener ?? '')
      if (!mainStart) return
      const v = next(ctx, s)
      if (v < 0) return
      const right = presentFor(lw(ctx, v))
      if (!right) return
      if (auxNearby(ctx, s)) return
      if (nounFollows(ctx, v)) return // "Het verteld verhaal"
      out.push(hitWord(ctx, v, [right], presentMessage(lw(ctx, v), right, subj)))
    })
    return out
  },
}

const PART03_Q = set('wat wie hoe waar wanneer waarom')
const PART03_NEXT = set('er hier daar nu dan toch eigenlijk precies vandaag morgen nou allemaal')

export const whatHappens: Rule = {
  id: 'nl.part.wat-gebeurt',
  lang: 'nl',
  category: 'grammar',
  title: 'wat gebeurt er',
  confidence: 'high',
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((w, q) => {
      if (!PART03_Q.has(w.lower)) return
      const v = next(ctx, q)
      if (v < 0) return
      const right = presentFor(lw(ctx, v))
      const n = next(ctx, v)
      if (!right || n < 0 || !PART03_NEXT.has(lw(ctx, n))) return
      const c = clauseOf(ctx, q)
      if (c) for (let k = c.from; k <= c.to; k++) if (k !== v && (isAux(ctx, k) || PARTICIPLE_COMPANIONS.has(lw(ctx, k)))) return
      out.push(hitWord(ctx, v, [right], presentMessage(lw(ctx, v), right, w.lower)))
    })
    return out
  },
}

const BETEKEND_SUBJ = set('dit dat het wat')
const BETEKEND_NEXT = set('dat niet toch wel eigenlijk veel niets niks iets voor ook alleen het ze hij zij we je ik')

export const ditBetekent: Rule = {
  id: 'nl.part.dit-betekent',
  lang: 'nl',
  category: 'grammar',
  title: 'dit betekent (dat)',
  confidence: 'high',
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((w, i) => {
      if (w.lower !== 'betekend') return
      const s = prev(ctx, i)
      if (s < 0 || !BETEKEND_SUBJ.has(lw(ctx, s))) return
      const n = next(ctx, i)
      const endsHere = n < 0 && /^\s*[.,!?;:]/.test(gapAfter(ctx, i))
      if (!endsHere && (n < 0 || !BETEKEND_NEXT.has(lw(ctx, n)))) return
      if (auxNearby(ctx, i)) return
      out.push(hitWord(ctx, i, ['betekent'], presentMessage('betekend', 'betekent', lw(ctx, s))))
    })
    return out
  },
}

/* ------------------------------------------------------------------ */
/* AUX-01: zijn-verbs with hebben                                      */
/* ------------------------------------------------------------------ */

const HEBBEN_TO_ZIJN: Record<string, string> = { heb: 'ben', hebt: 'bent', heeft: 'is', hebben: 'zijn', had: 'was', hadden: 'waren' }

export const zijnVerb: Rule = {
  id: 'nl.aux.zijn',
  lang: 'nl',
  category: 'grammar',
  title: 'ben gegaan (not heb gegaan)',
  confidence: 'high',
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((w, p) => {
      const part = w.lower
      const sure = ZIJN_PARTICIPLES.has(part)
      if (!sure && !ZIJN_PARTICIPLES_MEDIUM.has(part)) return
      const c = clauseOf(ctx, p)
      if (!c) return
      // the participle closes the clause, or is followed only by a clause-final hebben form
      const n = next(ctx, p)
      const trailingAux = n >= 0 && endsClause(ctx, n) && HEBBEN_FORMS.has(lw(ctx, n))
      if (!endsClause(ctx, p) && !trailingAux) return
      if (ADJECTIVAL_PARTICIPLES.has(part) && n >= 0 && isKnownNoun(lw(ctx, n))) return
      let aux = trailingAux ? n : -1
      if (aux < 0) for (let k = c.from; k < p; k++) if (HEBBEN_FORMS.has(lw(ctx, k))) aux = k
      if (aux < 0) return
      // another participle between (Ik heb het boek gekregen dat ...) means hebben belongs to that one
      for (let k = Math.min(aux, p) + 1; k < Math.max(aux, p); k++) if (/^ge\S+[dtn]$/.test(lw(ctx, k)) && lw(ctx, k) !== part) return
      const right = HEBBEN_TO_ZIJN[lw(ctx, aux)]
      out.push(
        hitWord(
          ctx,
          aux,
          [right],
          {
            message: `‘${part}’ goes with ‘zijn’: ‘${right} ${part}’`,
            messageLocal: `Bij ‘${part}’ hoort ‘zijn’: ‘${right} ${part}’`,
            explanation: `Verbs of movement to a place or of change (gaan, komen, blijven, worden, sterven, gebeuren…) form the perfect with zijn: ik ben gegaan, het is gebeurd.`,
            explanationLocal: `Werkwoorden van beweging naar een doel of van verandering (gaan, komen, blijven, worden, sterven, gebeuren…) krijgen zijn: ik ben gegaan, het is gebeurd.`,
          },
          sure ? 'high' : 'medium',
        ),
      )
    })
    return out
  },
}

export const participleRules: Rule[] = [auxParticiple, dstemParticiple, pronounParticiple, whatHappens, ditBetekent, zijnVerb]
