import type { Rule, RuleHit } from '@/types'
import type { RuleContext } from '@/types'
import { gapAfter, hitWord, isSentenceStart, isSubjectSlot, lw, matchAt, next, prev } from '../../helpers'
import { ADJ_BASE, COUNT_NOUNS, FINITE, FINITE_FORMS, INFINITIVES, PREPOSITIONS, THANKS_NOUNS, set } from '../../lexicon/nl'
import { LINKS } from './links'
import { PERSONAL_SUBJ } from './shared'

// hun/zij, me/mijn, jou/jouw, u/uw (§3.6, PRN-01..06).

/**
 * Nouns that also work without an article: after "voor me / voor u" they are the object, not owned
 * ("Hij zocht voor me werk", "Er is voor u mail"). Only safe at the start of a sentence ("Me werk ...").
 */
const BARE_NOUNS = set('werk huiswerk bezoek familie mail e-mail')
/** a noun after "prep + me/jou/u" that must be possessed */
const ownedNoun = (ctx: RuleContext, n: number, atStart: boolean) =>
  COUNT_NOUNS.has(lw(ctx, n)) && (atStart || !BARE_NOUNS.has(lw(ctx, n)))

/* PRN-01: "Hun hebben gewonnen" -> "Zij hebben" */
const HUN_VERBS = set(`hebben zijn gaan komen willen kunnen moeten mogen zullen worden doen weten vinden zeggen denken
  hadden waren gingen kwamen wilden konden moesten mochten zouden werden deden wisten vonden zeiden dachten krijgen
  kregen zitten zaten staan stonden liggen lagen blijven bleven maken maakten houden hielden zien zagen horen hoorden
  wonen woonden kijken keken lopen liepen hebt heeft praten praatten slapen sliepen lachen lachten wachten wachtten
  spreken spraken schrijven schreven lezen lazen zingen zongen zwemmen zwommen beginnen begonnen winnen wonnen helpen
  hielpen kopen kochten betalen betaalden vertellen vertelden luisteren luisterden geloven geloofden begrijpen
  begrepen kennen kenden leren leerden voelen voelden hoorden noemen noemden spelen speelden`)

export const hunSubject: Rule = {
  id: 'nl.prn.hun-subject',
  lang: 'nl',
  category: 'grammar',
  title: 'hun hebben → zij hebben',
  confidence: 'high',
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((w, i) => {
      if (w.lower !== 'hun' || !isSubjectSlot(ctx, i)) return
      const v = next(ctx, i)
      if (v < 0 || !HUN_VERBS.has(lw(ctx, v))) return
      const after = next(ctx, v)
      if (after >= 0 && PERSONAL_SUBJ.has(lw(ctx, after))) return // "Hun hebben ze niets gegeven" (fronted object)
      // "Hun lachen klonk luid": a finite verb right after means "hun + infinitive" is a noun phrase
      if (after >= 0 && !INFINITIVES.has(lw(ctx, after)) && (FINITE.has(lw(ctx, after)) || FINITE_FORMS.has(lw(ctx, after)))) return
      out.push(
        hitWord(ctx, i, ['zij', 'ze'], {
          message: `‘Hun’ can't be the subject: use ‘zij’ or ‘ze’`,
          messageLocal: `‘Hun’ is nooit onderwerp: gebruik ‘zij’ of ‘ze’`,
          explanation: `hun means ‘their’ (hun huis) or ‘to them’ (Ik geef hun een boek). The one doing the action is zij/ze: Zij hebben gewonnen.`,
          explanationLocal: `Hun is bezittelijk (hun huis) of meewerkend voorwerp (Ik geef hun een boek). Wie de handeling doet, is zij/ze: Zij hebben gewonnen.`,
          learnMore: LINKS.hunHebben,
        }),
      )
    })
    return out
  },
}

/* PRN-02: "naar me moeder" -> "naar mijn moeder" */
export const meMijn: Rule = {
  id: 'nl.prn.me-mijn',
  lang: 'nl',
  category: 'grammar',
  title: 'me → mijn before a noun',
  confidence: 'high',
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((w, i) => {
      if (w.lower !== 'me') return
      const n = next(ctx, i)
      const atStart = isSentenceStart(ctx, i)
      if (n < 0 || !ownedNoun(ctx, n, atStart)) return
      const p = prev(ctx, i)
      if (!atStart && !(p >= 0 && PREPOSITIONS.has(lw(ctx, p)))) return // "Hij gaf me boeken"
      out.push(
        hitWord(ctx, i, ['mijn', "m'n"], {
          message: `‘me’ can't mean ‘my’: write ‘mijn’ or ‘m'n’`,
          messageLocal: `‘me’ is geen bezittelijk voornaamwoord: ‘mijn’ of ‘m'n’`,
          explanation: `me means ‘me’ (Hij ziet me). For ‘my’ write mijn, or the short form m'n: mijn moeder, m'n moeder.`,
          explanationLocal: `Me betekent ‘mij’ (Hij ziet me). Van mij is mijn, of kort m'n: mijn moeder, m'n moeder.`,
          learnMore: LINKS.mijMijn,
        }),
      )
    })
    return out
  },
}

/**
 * "jouw in Utrecht gekochte fiets", "jouw tot nu toe beste tijd": a phrase between jouw and its noun.
 * True when an inflected adjective or participle follows within a few words.
 */
function attributiveAhead(ctx: RuleContext, n: number): boolean {
  for (let k = n + 1, steps = 0; k < ctx.words.length && steps < 5; k++, steps++) {
    if (k !== n + 1 && next(ctx, k - 1) !== k) return false
    const w = lw(ctx, k)
    if ((ADJ_BASE.has(w) || /^(?:ge|be|ver|ont|her)\p{L}{3,}(?:de|te|en)$/u.test(w) || /ste$/.test(w)) && next(ctx, k) >= 0) return true
  }
  return false
}

/* PRN-03: "voor jouw." -> "voor jou."; PRN-04: "met jou fiets" -> "met jouw fiets" */
/** particles of separable verbs: "Ik ga met jouw mee" can only be jou */
const JOU_PARTICLES = set('mee toe heen')
const OTHER_POSSESSIVES = set("mijn m'n zijn z'n haar onze ons hun uw jullie")

export const jouwJou: Rule = {
  id: 'nl.prn.jouw-jou',
  lang: 'nl',
  category: 'grammar',
  title: 'jou / jouw',
  confidence: 'high',
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((w, i) => {
      if (w.lower === 'jouw') {
        const n = next(ctx, i)
        const gap = gapAfter(ctx, i)
        if (n < 0) {
          if (!/^\s*[.?!,;:)]|^\s*$/.test(gap)) return
          // "jouw, mijn en zijn boek" is a list of possessives
          if (/^\s*,/.test(gap) && OTHER_POSSESSIVES.has(lw(ctx, i + 1))) return
        } else if (JOU_PARTICLES.has(lw(ctx, n))) {
          // "met jouw mee": the particle of a separable verb, never a noun
        } else if (!PREPOSITIONS.has(lw(ctx, n)) || /^-/.test(ctx.text.slice(ctx.words[n].end)) || attributiveAhead(ctx, n)) return
        out.push(
          hitWord(ctx, i, ['jou'], {
            message: `No noun after it, so ‘jou’`,
            messageLocal: `Geen zelfstandig naamwoord erachter, dus ‘jou’`,
            explanation: `jouw always comes before a noun (jouw boek). On its own, after a preposition or at the end, write jou: voor jou, van jou.`,
            explanationLocal: `Jouw staat altijd vóór een zelfstandig naamwoord (jouw boek). Zonder zelfstandig naamwoord schrijf je jou: voor jou, van jou.`,
            learnMore: LINKS.mijMijn,
          }),
        )
      } else if (w.lower === 'jou') {
        const p = prev(ctx, i)
        const n = next(ctx, i)
        if (n < 0) return
        const noun = lw(ctx, n)
        const thanks = p > 0 && matchAt(ctx, p - 1, [set('bedankt dank dankjewel dankuwel'), 'voor']) && THANKS_NOUNS.has(noun)
        // "Is dit jou jas?": an owned noun that closes the clause can only be jouw + noun
        const closing = ownedNoun(ctx, n, false) && /^\s*[.?!,;:)]|^\s*$/.test(gapAfter(ctx, n))
        if (!thanks && !closing && (p < 0 || !PREPOSITIONS.has(lw(ctx, p)) || !ownedNoun(ctx, n, false))) return
        out.push(
          hitWord(
            ctx,
            i,
            ['jouw'],
            {
              message: `Belongs to you: ‘jouw ${lw(ctx, n)}’`,
              messageLocal: `Van jou: ‘jouw ${lw(ctx, n)}’`,
              explanation: `Before a noun, ‘your’ is jouw: met jouw fiets. jou is the object form: met jou.`,
              explanationLocal: `Vóór een zelfstandig naamwoord gebruik je jouw: met jouw fiets. Jou is de voorwerpsvorm: met jou.`,
              learnMore: LINKS.mijMijn,
            },
            'medium',
          ),
        )
      }
    })
    return out
  },
}

/* PRN-05: "Bedankt voor u bericht" -> "uw bericht"; "Dit is voor uw." -> "voor u." */
export const uUw: Rule = {
  id: 'nl.prn.u-uw',
  lang: 'nl',
  category: 'grammar',
  title: 'u / uw',
  confidence: 'high',
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((w, i) => {
      if (w.lower === 'uw') {
        const n = next(ctx, i)
        if (n >= 0 || !/^\s*[.?!;:)]|^\s*$/.test(gapAfter(ctx, i))) return
        out.push(
          hitWord(ctx, i, ['u'], {
            message: `No noun after it, so ‘u’`,
            messageLocal: `Geen zelfstandig naamwoord erachter, dus ‘u’`,
            explanation: `uw means ‘your’ and needs a noun (uw bericht). The person is u: Dit is voor u.`,
            explanationLocal: `Uw betekent ‘van u’ en staat vóór een zelfstandig naamwoord (uw bericht). De persoon zelf is u: Dit is voor u.`,
            learnMore: LINKS.uUw,
          }),
        )
      } else if (w.lower === 'u') {
        const p = prev(ctx, i)
        const n = next(ctx, i)
        if (p < 0 || n < 0 || !PREPOSITIONS.has(lw(ctx, p))) return
        const noun = lw(ctx, n)
        const thanks = p > 0 && matchAt(ctx, p - 1, [set('bedankt dank dankjewel dankuwel'), 'voor']) && THANKS_NOUNS.has(noun)
        if (!thanks && !ownedNoun(ctx, n, false)) return
        out.push(
          hitWord(
            ctx,
            i,
            ['uw'],
            {
              message: `Belongs to you: ‘uw ${noun}’`,
              messageLocal: `Van u: ‘uw ${noun}’`,
              explanation: `Before a noun, the formal ‘your’ is uw: bedankt voor uw bericht. u is the person: voor u.`,
              explanationLocal: `Vóór een zelfstandig naamwoord gebruik je uw: bedankt voor uw bericht. U is de persoon: voor u.`,
              learnMore: LINKS.uUw,
            },
            thanks ? 'high' : 'medium',
          ),
        )
      }
    })
    return out
  },
}

/* PRN-06: "als ik jij was" -> "als ik jou was" */
export const alsIkJou: Rule = {
  id: 'nl.prn.als-ik-jou',
  lang: 'nl',
  category: 'grammar',
  title: 'als ik jou was',
  confidence: 'high',
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((_w, i) => {
      if (!matchAt(ctx, i, ['als', 'ik', set('jij jouw'), set('was waren ben')])) return
      out.push(
        hitWord(ctx, i + 2, ['jou'], {
          message: `Fixed phrase: ‘als ik jou was’`,
          messageLocal: `Vaste uitdrukking: ‘als ik jou was’`,
          explanation: `The expression is ‘als ik jou was’ (if I were you), with jou.`,
          explanationLocal: `De vaste uitdrukking is ‘als ik jou was’, met jou.`,
        }),
      )
    })
    return out
  },
}

export const pronounRules: Rule[] = [hunSubject, meMijn, jouwJou, uUw, alsIkJou]
