import type { Rule, RuleContext, RuleHit } from '@/types'
import { hitWord, isCapitalized, isLowercase, isSentenceStart, known, lw, next, prev } from '../../helpers'
import {
  ADJ_BASE,
  ADJ_INFLECT,
  FINITE,
  FUNCTION_WORDS,
  PAST_FORMS,
  PERSON_HET_NOUNS,
  PREPOSITIONS,
  SUBJECT_PRONOUNS,
  T3_TO_IK,
  UNINFLECTED_ADJ,
  isDeNoun,
  isDiminutive,
  isHetNoun,
  isKnownNoun,
  isSoftAdjective,
  set,
} from '../../lexicon/nl'
import { LINKS } from './links'

// de/het, deze/dit, onze/ons (ART-01..04), die/dat (REL-01..03), adjective -e (ADJ-01/02). §3.5.

/** the word after noun n could glue onto it as a compound written apart ("de huis deur") */
function compoundAhead(ctx: RuleContext, n: number): boolean {
  const m = next(ctx, n)
  if (m < 0) return false
  const a = lw(ctx, n)
  const b = lw(ctx, m)
  if (FUNCTION_WORDS.has(b) || isCapitalized(ctx.words[m]) || /\d/.test(b)) return false
  if (!ctx.dict || isKnownNoun(b)) return true
  return [a + b, a + 's' + b, a + 'en' + b, a + '-' + b].some((c) => known(ctx, c))
}

/** noun n is followed by a subject pronoun: "Deze begin ik morgen" (deze = pronoun, begin = verb) */
const inversionAfter = (ctx: RuleContext, n: number) => {
  const m = next(ctx, n)
  return m >= 0 && SUBJECT_PRONOUNS.has(lw(ctx, m))
}

const hetNounKind = (w: string): 'list' | 'diminutive' | undefined =>
  isHetNoun(w) ? 'list' : isDiminutive(w) ? 'diminutive' : undefined

const hetWhy = (noun: string, kind: 'list' | 'diminutive') =>
  kind === 'diminutive'
    ? {
        en: `Diminutives (words ending in -je, -tje, -pje) are always het-words: het ${noun}.`,
        nl: `Verkleinwoorden (op -je, -tje, -pje) zijn altijd het-woorden: het ${noun}.`,
      }
    : {
        en: `Dutch nouns have to be learned with their article, and ‘${noun}’ is a het-word: het ${noun}. Tip: learn new words together with de or het.`,
        nl: `Het lidwoord moet je per woord leren, en ‘${noun}’ is een het-woord: het ${noun}. Tip: leer nieuwe woorden meteen met de of het.`,
      }

/** optional inflected adjective between determiner and noun: returns the noun index */
function nounAfter(ctx: RuleContext, d: number, allowAdj: boolean): number {
  const n = next(ctx, d)
  if (n < 0) return -1
  if (allowAdj && ADJ_BASE.has(lw(ctx, n))) {
    const m = next(ctx, n)
    return m >= 0 ? m : -1
  }
  return n
}

/** "de huis- en tuinman", "het auto- en fietsverkeer": the noun is the first half of a shared compound */
const truncatedCompound = (ctx: RuleContext, n: number) => /^-/.test(ctx.text.slice(ctx.words[n].end))

const NUMBER_WORDS = set('één een twee drie vier vijf zes zeven acht negen tien elf twaalf honderd')
/** "de nummer één van de wereld": a person ranked by number takes de */
const rankedNumber = (ctx: RuleContext, n: number) => {
  if (lw(ctx, n) !== 'nummer') return false
  const m = next(ctx, n)
  return m >= 0 && (/^\d/.test(ctx.words[m].text) || NUMBER_WORDS.has(lw(ctx, m)))
}

const nounOk = (ctx: RuleContext, n: number) =>
  isLowercase(ctx.words[n]) && !compoundAhead(ctx, n) && !inversionAfter(ctx, n) && !truncatedCompound(ctx, n)

/* ART-01: de + het-noun */
export const deHet: Rule = {
  id: 'nl.art.de-het',
  lang: 'nl',
  category: 'grammar',
  title: 'het-word with de',
  confidence: 'high',
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((w, i) => {
      if (w.lower !== 'de' || (!isLowercase(w) && !isSentenceStart(ctx, i))) return
      const n = next(ctx, i)
      if (n < 0) return
      const noun = lw(ctx, n)
      const kind = hetNounKind(noun)
      if (!kind || !nounOk(ctx, n) || rankedNumber(ctx, n)) return
      if (noun === 'been' && prev(ctx, i) >= 0 && lw(ctx, i - 1) === 'op') return // "op de been" is a fixed phrase
      const why = hetWhy(noun, kind)
      out.push(
        hitWord(
          ctx,
          i,
          ['het'],
          {
            message: `‘${noun}’ is a het-word: ‘het ${noun}’`,
            messageLocal: `‘${noun}’ is een het-woord: ‘het ${noun}’`,
            explanation: why.en,
            explanationLocal: why.nl,
          },
          kind === 'list' ? 'high' : 'medium',
        ),
      )
    })
    return out
  },
}

/** the word after noun n is a finite verb, or nothing follows in the clause */
function verbOrEndAfter(ctx: RuleContext, n: number): boolean {
  const m = next(ctx, n)
  if (m < 0) return /^\s*[.?!,;:]|^\s*$/.test(ctx.text.slice(ctx.words[n].end, ctx.words[n].end + 3))
  return FINITE.has(lw(ctx, m))
}

/* ART-02: preposition + het + de-noun */
export const hetDe: Rule = {
  id: 'nl.art.het-de',
  lang: 'nl',
  category: 'grammar',
  title: 'de-word with het',
  confidence: 'high',
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((w, i) => {
      if (w.lower !== 'het') return
      const p = prev(ctx, i)
      const n = next(ctx, i)
      if (n < 0) return
      const noun = lw(ctx, n)
      if (!isDeNoun(noun) || !nounOk(ctx, n)) return
      // "Het auto is kapot": at the start of a sentence, when a verb or the end follows the noun
      // ("Het auto rijden" is a verb phrase, "Heeft het zin?" has het as the subject: both skipped)
      const start = p < 0 && isSentenceStart(ctx, i) && verbOrEndAfter(ctx, n)
      if (!start && (p < 0 || !PREPOSITIONS.has(lw(ctx, p)))) return
      out.push(
        hitWord(ctx, i, ['de'], {
          message: `‘${noun}’ is a de-word: ‘de ${noun}’`,
          messageLocal: `‘${noun}’ is een de-woord: ‘de ${noun}’`,
          explanation: `‘${noun}’ takes de: de ${noun}. About four in five Dutch nouns are de-words, and all plurals take de.`,
          explanationLocal: `‘${noun}’ krijgt de: de ${noun}. Ongeveer vier op de vijf woorden zijn de-woorden, en meervouden krijgen altijd de.`,
        }),
      )
    })
    return out
  },
}

/* ART-03 / ART-04: deze/onze + het-noun */
function demonstrativeRule(id: string, wrong: string, right: string, title: string): Rule {
  return {
    id,
    lang: 'nl',
    category: 'grammar',
    title,
    confidence: 'high',
    check(ctx) {
      const out: RuleHit[] = []
      ctx.words.forEach((w, i) => {
        if (w.lower !== wrong) return
        const n = nounAfter(ctx, i, true)
        if (n < 0) return
        const noun = lw(ctx, n)
        const kind = hetNounKind(noun)
        if (!kind || !nounOk(ctx, n)) return
        out.push(
          hitWord(ctx, i, [right], {
            message: `‘${noun}’ is a het-word: ‘${right} ${noun}’`,
            messageLocal: `‘${noun}’ is een het-woord: ‘${right} ${noun}’`,
            explanation:
              wrong === 'deze'
                ? `het-words take dit/dat, de-words take deze/die: dit ${noun}, deze auto.`
                : `With a het-word ‘our’ is ons: ons ${noun}. With de-words and plurals it is onze: onze auto.`,
            explanationLocal:
              wrong === 'deze'
                ? `Bij een het-woord gebruik je dit/dat, bij een de-woord deze/die: dit ${noun}, deze auto.`
                : `Bij een het-woord zeg je ons: ons ${noun}. Bij de-woorden en meervoud onze: onze auto.`,
          }),
        )
      })
      return out
    },
  }
}

export const dezeDit = demonstrativeRule('nl.art.deze-dit', 'deze', 'dit', 'deze/dit')
export const onzeOns = demonstrativeRule('nl.art.onze-ons', 'onze', 'ons', 'onze/ons')

/* ------------------------------------------------------------------ */
/* REL-01..03: die/dat/wat                                             */
/* ------------------------------------------------------------------ */

const HET_DETERMINERS = set("het dit dat een geen elk ieder mijn m'n jouw zijn haar ons uw hun")
const REL_FOLLOW_WORDS = set(`ik je jij hij zij ze we wij jullie u men het er de een mijn jouw zijn haar onze hun
  daar hier gisteren altijd nooit al nog ook niet heel erg zo vaak nu toen morgen vandaag net pas zelf iedereen
  niemand zich me mij hem ons`)
const looksFinite = (w: string) => FINITE.has(w) || T3_TO_IK.has(w) || PAST_FORMS.has(w)

export const hetDie: Rule = {
  id: 'nl.rel.het-die',
  lang: 'nl',
  category: 'grammar',
  title: 'het-word + dat (not die)',
  confidence: 'high',
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((w, d) => {
      if (!HET_DETERMINERS.has(w.lower)) return
      const n = nounAfter(ctx, d, true)
      if (n < 0) return
      const noun = lw(ctx, n)
      if (!hetNounKind(noun) || !isLowercase(ctx.words[n])) return
      const r = next(ctx, n)
      if (r < 0 || lw(ctx, r) !== 'die') return
      const a = next(ctx, r)
      if (a < 0) return
      const after = ctx.words[a]
      const relative = REL_FOLLOW_WORDS.has(after.lower) || looksFinite(after.lower) || (isCapitalized(after) && !isSentenceStart(ctx, a))
      if (!relative) return // "het boek die man" (die = that, before a noun)
      out.push(
        hitWord(ctx, r, ['dat'], {
          message: `‘${noun}’ is a het-word, so ‘dat’`,
          messageLocal: `‘${noun}’ is een het-woord, dus ‘dat’`,
          explanation: `After a het-word the relative pronoun is dat: het ${noun} dat… After de-words and plurals it is die: de man die…${PERSON_HET_NOUNS.has(noun) ? ' (Only after a comma, for a person, is die sometimes accepted.)' : ''}`,
          explanationLocal: `Na een het-woord gebruik je dat: het ${noun} dat… Na een de-woord of meervoud die: de man die…${PERSON_HET_NOUNS.has(noun) ? ' (Alleen na een komma en bij een persoon wordt die soms goedgekeurd.)' : ''}`,
          learnMore: LINKS.dieDat,
        }),
      )
    })
    return out
  },
}

export const hetWat: Rule = {
  id: 'nl.rel.het-wat',
  lang: 'nl',
  category: 'style',
  title: 'het boek dat (not wat)',
  confidence: 'low',
  strictOnly: true,
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((w, d) => {
      if (!HET_DETERMINERS.has(w.lower)) return
      const n = nounAfter(ctx, d, true)
      if (n < 0 || !hetNounKind(lw(ctx, n))) return
      const r = next(ctx, n)
      const a = r >= 0 ? next(ctx, r) : -1
      if (r < 0 || lw(ctx, r) !== 'wat' || a < 0 || !SUBJECT_PRONOUNS.has(lw(ctx, a))) return
      out.push(
        hitWord(ctx, r, ['dat'], {
          message: `In writing: ‘het ${lw(ctx, n)} dat’`,
          messageLocal: `In nette taal: ‘het ${lw(ctx, n)} dat’`,
          explanation: `After a het-word, dat is the standard relative pronoun in writing; wat is spoken style.`,
          explanationLocal: `Na een het-woord is dat de nette keuze; wat is spreektaal.`,
          learnMore: LINKS.datWat,
        }),
      )
    })
    return out
  },
}

export const allesWat: Rule = {
  id: 'nl.rel.alles-wat',
  lang: 'nl',
  category: 'style',
  title: 'alles wat (not dat)',
  confidence: 'low',
  strictOnly: true,
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((w, i) => {
      const lead = set('alles iets niets niks').has(w.lower) || (w.lower === 'enige' && lw(ctx, i - 1) === 'het')
      if (!lead) return
      const r = next(ctx, i)
      const a = r >= 0 ? next(ctx, r) : -1
      if (r < 0 || lw(ctx, r) !== 'dat' || a < 0 || !SUBJECT_PRONOUNS.has(lw(ctx, a))) return
      out.push(
        hitWord(ctx, r, ['wat'], {
          message: `After ‘${w.lower}’: ‘wat’`,
          messageLocal: `Na ‘${w.lower}’: ‘wat’`,
          explanation: `After alles, iets, niets and het enige the relative pronoun is wat: alles wat ik weet.`,
          explanationLocal: `Na alles, iets, niets en het enige gebruik je wat: alles wat ik weet.`,
          learnMore: LINKS.datWat,
        }),
      )
    })
    return out
  },
}

/* ------------------------------------------------------------------ */
/* ADJ-01 / ADJ-02: adjective -e                                       */
/* ------------------------------------------------------------------ */

const NO_E_DETERMINERS = set("een geen elk ieder zo'n veel welk")

export const eenGroot: Rule = {
  id: 'nl.adj.een-groot-huis',
  lang: 'nl',
  category: 'grammar',
  title: 'een groot huis (no -e)',
  confidence: 'high',
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((w, d) => {
      if (!NO_E_DETERMINERS.has(w.lower)) return
      const a = next(ctx, d)
      if (a < 0) return
      const base = ADJ_BASE.get(lw(ctx, a))
      const n = next(ctx, a)
      if (!base || n < 0) return
      const noun = lw(ctx, n)
      if (!hetNounKind(noun) || !nounOk(ctx, n)) return
      out.push(
        hitWord(
          ctx,
          a,
          [base],
          {
            message: `${w.lower} + het-word: no -e, ‘${base} ${noun}’`,
            messageLocal: `${w.lower} + het-woord: geen -e, ‘${base} ${noun}’`,
            explanation: `An adjective before a noun gets -e, except with a het-word after een, geen, elk, ieder, veel, welk or zo'n: een ${base} ${noun}, but het ${lw(ctx, a)} ${noun}.`,
            explanationLocal: `Een bijvoeglijk naamwoord krijgt een -e, behalve bij een het-woord na een, geen, elk, ieder, veel, welk of zo'n: een ${base} ${noun}, maar het ${lw(ctx, a)} ${noun}.`,
            learnMore: LINKS.adjective,
          },
          isSoftAdjective(base) ? 'medium' : 'high',
        ),
      )
    })
    return out
  },
}

const E_DETERMINERS = set('de deze mijn jouw uw onze')
const E_DETERMINERS_AT_START = set('het dit')
const FIXED_NO_E: ReadonlySet<string> = new Set(['oud papier', 'hoog water', 'oud nieuws'])

export const hetGrote: Rule = {
  id: 'nl.adj.het-grote-huis',
  lang: 'nl',
  category: 'grammar',
  title: 'het grote huis (with -e)',
  confidence: 'high',
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((w, d) => {
      const det = w.lower
      const atStart = isSentenceStart(ctx, d) || (prev(ctx, d) >= 0 && PREPOSITIONS.has(lw(ctx, d - 1)))
      if (!E_DETERMINERS.has(det) && !(E_DETERMINERS_AT_START.has(det) && atStart)) return
      const a = next(ctx, d)
      if (a < 0) return
      const base = lw(ctx, a)
      const infl = ADJ_INFLECT.get(base)
      const n = next(ctx, a)
      if (!infl || infl === base || UNINFLECTED_ADJ.has(base) || n < 0) return
      const noun = lw(ctx, n)
      if (!isKnownNoun(noun) || !nounOk(ctx, n) || FIXED_NO_E.has(`${base} ${noun}`)) return
      if ((det === 'de' || det === 'deze' || det === 'onze') && !isDeNoun(noun)) return
      if ((det === 'het' || det === 'dit') && !isHetNoun(noun)) return
      out.push(
        hitWord(ctx, a, [infl], {
          message: `After ‘${det}’ the adjective gets -e: ‘${infl}’`,
          messageLocal: `Na ‘${det}’ krijgt het bijvoeglijk naamwoord een -e: ‘${infl}’`,
          explanation: `After de, het, deze, dit and possessives like mijn, an adjective before a noun always gets -e: ${det} ${infl} ${noun}. Only een/geen + het-word drops it (een ${base} huis).`,
          explanationLocal: `Na de, het, deze, dit en woorden als mijn krijgt een bijvoeglijk naamwoord vóór een zelfstandig naamwoord altijd een -e: ${det} ${infl} ${noun}. Alleen een/geen + het-woord niet (een ${base} huis).`,
          learnMore: LINKS.adjective,
        }),
      )
    })
    return out
  },
}

export const articleRules: Rule[] = [deHet, hetDe, dezeDit, onzeOns, hetDie, hetWat, allesWat, eenGroot, hetGrote]
