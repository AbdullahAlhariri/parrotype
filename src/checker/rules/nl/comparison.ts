import type { Rule, RuleContext, RuleHit } from '@/types'
import { clauseOf, hitWord, lw, next, prev, sameSentence } from '../../helpers'
import { ADJ_INFLECT, COMPARATIVES, isKnownNoun, set } from '../../lexicon/nl'
import { LINKS } from './links'
import { isFiniteForm } from './shared'

// als / dan in comparisons (§3.7, CMP-01..04).

const NOT_COMPARISON = set('eerder later vroeger')
const COMPARE_WORDS = new Set([...COMPARATIVES, 'anders', 'ander', 'andere'])

const COND_SUBJ = set('ik je jij hij zij ze het we wij jullie u men er')

/** "als" starts a conditional clause ("beter als je komt", "beter als de zon schijnt") */
function conditionalAfter(ctx: RuleContext, als: number): boolean {
  const c = clauseOf(ctx, als)
  const end = c ? c.to : ctx.words.length - 1
  const s = next(ctx, als)
  if (s >= 0 && COND_SUBJ.has(lw(ctx, s)) && s < end) return true // subject + more words: a clause
  for (let k = als + 1; k <= end; k++) {
    const w = lw(ctx, k)
    if (w === 'zijn' && k < end && isKnownNoun(lw(ctx, k + 1))) continue // "als zijn vader": possessive
    if (isFiniteForm(w) || (k > als + 1 && /\p{Ll}{3,}t$/u.test(w) && !isKnownNoun(w))) return true
  }
  return false
}

const CMP_PRONOUNS = set('ik jij hij zij wij we jullie ze u mij jou hem haar ons hen hun iemand iedereen niemand')
const CMP_DETERMINERS = set("mijn m'n jouw je zijn z'n haar onze ons hun uw de het die dat deze dit vorig vorige")

/** "ouder als ik.", "groter als zijn vader.", "beter als vorig jaar.": nothing but the compared thing follows */
function plainComparison(ctx: RuleContext, als: number): boolean {
  const c = clauseOf(ctx, als)
  const end = c ? c.to : ctx.words.length - 1
  for (let k = als + 1; k < ctx.words.length && sameSentence(ctx, als, k); k++) if (lw(ctx, k) === 'dan') return false
  const a = next(ctx, als)
  if (a < 0 || a > end) return false
  if (CMP_PRONOUNS.has(lw(ctx, a))) return a === end
  if (!CMP_DETERMINERS.has(lw(ctx, a))) return false
  const n = next(ctx, a)
  return n >= 0 && n === end && (isKnownNoun(lw(ctx, n)) || ['jaar', 'week', 'maand', 'keer'].includes(lw(ctx, n)))
}

export const groterAls: Rule = {
  id: 'nl.cmp.groter-dan',
  lang: 'nl',
  category: 'grammar',
  title: 'groter dan (not als)',
  confidence: 'medium',
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((w, i) => {
      if (w.lower !== 'als') return
      const c = prev(ctx, i)
      if (c < 0) return
      const cmp = lw(ctx, c)
      if (!COMPARE_WORDS.has(cmp) || NOT_COMPARISON.has(cmp)) return
      if (cmp === 'meer' && lw(ctx, i + 1) === 'een') return // "meer als een broer" = more like a brother
      if (conditionalAfter(ctx, i)) return
      // In normal mode only the sure cases: a pronoun or "my brother" closing the comparison. "Beter als
      // ontbijt" (as breakfast) and "bekender als zanger dan als acteur" use als in another sense.
      if (ctx.strictness !== 'strict' && !plainComparison(ctx, i)) return
      out.push(
        hitWord(ctx, i, ['dan'], {
          message: `After a comparative: ‘${cmp} dan’`,
          messageLocal: `Na een vergrotende trap: ‘${cmp} dan’`,
          explanation: `A difference takes dan (groter dan, beter dan, anders dan); sameness takes als (even groot als, net als). ‘Groter als’ is common in speech, but in writing use dan.`,
          explanationLocal: `Bij verschil gebruik je dan (groter dan, beter dan, anders dan); bij gelijkheid als (even groot als, net als). ‘Groter als’ hoor je vaak, maar schrijf dan.`,
          learnMore: LINKS.danAls,
        }),
      )
    })
    return out
  },
}

const EQUAL_ADJ = new Set([...ADJ_INFLECT.keys(), 'veel', 'vaak', 'weinig', 'ver', 'dichtbij', 'hard', 'graag', 'lang'])

/** adverbs after a particle "dan": "Duurt het zo lang dan nog?" */
const AFTER_PARTICLE = set('nog toch eigenlijk wel ook niet maar weer echt ineens nu nou opeens')

/** "dan" here closes the phrase as a particle ("Is het zo koud dan?") */
const danIsParticle = (ctx: RuleContext, dan: number) => {
  const n = next(ctx, dan)
  if (n < 0) return true
  // "even groot dan zijn broer": zijn + noun is the possessive, not the verb
  if (lw(ctx, n) === 'zijn' && next(ctx, n) >= 0 && isKnownNoun(lw(ctx, n + 1))) return false
  return isFiniteForm(lw(ctx, n)) || AFTER_PARTICLE.has(lw(ctx, n)) // "zo duur dan moet je..." (dan = then)
}

export const evenAls: Rule = {
  id: 'nl.cmp.even-als',
  lang: 'nl',
  category: 'grammar',
  title: 'even groot als (not dan)',
  confidence: 'high',
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((w, i) => {
      if (w.lower !== 'even' && w.lower !== 'zo') return
      const a = next(ctx, i)
      if (a < 0 || !EQUAL_ADJ.has(lw(ctx, a))) return
      const d = next(ctx, a)
      if (d < 0 || lw(ctx, d) !== 'dan' || danIsParticle(ctx, d)) return
      out.push(
        hitWord(ctx, d, ['als'], {
          message: `‘${w.lower} … als’, not ‘dan’`,
          messageLocal: `‘${w.lower} … als’, niet ‘dan’`,
          explanation: `When two things are the same, use als: even groot als, zo snel als. dan is only for a difference: groter dan.`,
          explanationLocal: `Bij gelijkheid gebruik je als: even groot als, zo snel als. Dan is alleen voor verschil: groter dan.`,
          learnMore: LINKS.danAls,
        }),
      )
    })
    return out
  },
}

export const hetzelfdeAls: Rule = {
  id: 'nl.cmp.hetzelfde-als',
  lang: 'nl',
  category: 'grammar',
  title: 'hetzelfde als (not dan)',
  confidence: 'high',
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((w, i) => {
      if (w.lower !== 'hetzelfde' && w.lower !== 'dezelfde') return
      const d = next(ctx, i)
      if (d < 0 || lw(ctx, d) !== 'dan' || danIsParticle(ctx, d)) return
      out.push(
        hitWord(ctx, d, ['als'], {
          message: `It's ‘${w.lower} als’`,
          messageLocal: `Het is ‘${w.lower} als’`,
          explanation: `hetzelfde and dezelfde express sameness, so they go with als: hetzelfde als gisteren.`,
          explanationLocal: `Hetzelfde en dezelfde drukken gelijkheid uit, dus: hetzelfde als gisteren.`,
          learnMore: LINKS.danAls,
        }),
      )
    })
    return out
  },
}

export const zowelAls: Rule = {
  id: 'nl.cmp.zowel-als',
  lang: 'nl',
  category: 'grammar',
  title: 'zowel … als',
  confidence: 'medium',
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((w, i) => {
      if (w.lower !== 'zowel') return
      // "zowel mijn broer en zus als mijn ouders": an als later on pairs with zowel
      for (let k = i + 1; k < ctx.words.length && sameSentence(ctx, i, k); k++) if (lw(ctx, k) === 'als') return
      for (let k = i + 1; k <= i + 6 && k < ctx.words.length && sameSentence(ctx, i, k); k++) {
        const x = lw(ctx, k)
        if (x === 'en') {
          out.push(
            hitWord(ctx, k, ['als'], {
              message: `It's ‘zowel … als …’`,
              messageLocal: `Het is ‘zowel … als …’`,
              explanation: `zowel is always paired with als: zowel kinderen als ouders.`,
              explanationLocal: `Zowel hoort bij als: zowel kinderen als ouders.`,
            }),
          )
          return
        }
      }
    })
    return out
  },
}

export const comparisonRules: Rule[] = [groterAls, evenAls, hetzelfdeAls, zowelAls]
