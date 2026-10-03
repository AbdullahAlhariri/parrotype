import type { Rule, RuleContext, RuleHit } from '@/types'
import { capitalize } from '../../engine'
import { gapBefore, hitWord, hitWords, isAllCaps, isCapitalized, isSentenceStart, looksLikeTitle, lw, next, prev } from '../../helpers'
import { DAYS, HOLIDAY_PREFIXES, LANGUAGE_AMBIGUOUS, LANGUAGE_WORDS, MONTHS, PLACE_NAMES, SEASONS, set } from '../../lexicon/nl'
import { LINKS } from './links'

// Capital letters (§3.11, CAP-01..04).

/** a capital is expected here anyway: after a colon, quote, bracket, bullet or line break */
const freshStart = (ctx: RuleContext, i: number) => isSentenceStart(ctx, i) || /[:"“”„'‘’«»(\[\n•*–—-]\s*$/.test(gapBefore(ctx, i))

const SEASON_PREV = set('de deze die vorige volgende afgelopen komende in het hele elke iedere')
/** months that are also first names (April, Mei, Juni, Juli) need a date context */
const NAME_MONTHS = set('april mei juni juli')
const MONTH_PREV = set('in begin eind half medio midden sinds vanaf tot tijdens deze vorige volgende afgelopen komende per na voor rond elke')
const isNumber = (ctx: RuleContext, k: number) => k >= 0 && /^\d/.test(ctx.words[k]?.text ?? '')

export const dayMonth: Rule = {
  id: 'nl.cap.day-month',
  lang: 'nl',
  category: 'capitalization',
  title: 'days and months are lowercase',
  confidence: 'high',
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((t, i) => {
      const w = t.lower
      const day = DAYS.has(w)
      const month = MONTHS.has(w)
      const season = SEASONS.has(w)
      if (!day && !month && !season) return
      if (!isCapitalized(t) || isAllCaps(t) || freshStart(ctx, i) || looksLikeTitle(ctx, i, (x) => DAYS.has(x) || MONTHS.has(x) || SEASONS.has(x))) return
      const p = prev(ctx, i)
      const n = next(ctx, i)
      if (p >= 0 && isCapitalized(ctx.words[p]) && HOLIDAY_PREFIXES.has(lw(ctx, p))) return // Goede Vrijdag
      if (n >= 0 && isCapitalized(ctx.words[n])) return // part of a name or title
      if (w === 'augustus' && !isNumber(ctx, p) && !isNumber(ctx, n)) return // keizer Augustus
      if (NAME_MONTHS.has(w) && !isNumber(ctx, p) && !isNumber(ctx, n) && (p < 0 || !MONTH_PREV.has(lw(ctx, p)))) return // Mei (name)
      if (season && (p < 0 || !SEASON_PREV.has(lw(ctx, p)))) return // Winter can be a surname
      out.push(
        hitWords(ctx, i, i, [w], {
          message: `No capital for ${season ? 'seasons' : day ? 'days' : 'months'} in Dutch: ‘${w}’`,
          messageLocal: `${season ? 'Seizoenen' : day ? 'Dagen' : 'Maanden'} schrijf je met een kleine letter: ‘${w}’`,
          explanation: `Unlike English, Dutch writes days, months and seasons with a small letter: op maandag 3 januari, in de zomer.`,
          explanationLocal: `Anders dan in het Engels krijgen dagen, maanden en seizoenen een kleine letter: op maandag 3 januari, in de zomer.`,
          learnMore: LINKS.capitalsDays,
        }),
      )
    })
    return out
  },
}

const LANG_CONTEXT = set('spreek spreekt spreken sprak spraken het in leer leert leren vertaal vertaalt vertaald naar uit goed')

export const languageCapital: Rule = {
  id: 'nl.cap.language',
  lang: 'nl',
  category: 'capitalization',
  title: 'languages, peoples and places get a capital',
  confidence: 'high',
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((t, i) => {
      if (t.text !== t.lower) return
      if (PLACE_NAMES.has(t.lower)) {
        const right = capitalize(t.text)
        out.push(
          hitWord(ctx, i, [right], {
            message: `Names of places get a capital: ‘${right}’`,
            messageLocal: `Namen van plaatsen en landen krijgen een hoofdletter: ‘${right}’`,
            explanation: `Countries, cities and continents are names, so they start with a capital: Nederland, Amsterdam, Europa.`,
            explanationLocal: `Landen, steden en werelddelen zijn namen en krijgen een hoofdletter: Nederland, Amsterdam, Europa.`,
            learnMore: LINKS.capitals,
          }),
        )
        return
      }
      if (!LANGUAGE_WORDS.has(t.lower)) return
      if (LANGUAGE_AMBIGUOUS.has(t.lower)) {
        const p = prev(ctx, i)
        if (p < 0 || !LANG_CONTEXT.has(lw(ctx, p))) return
      }
      const right = capitalize(t.text)
      out.push(
        hitWord(ctx, i, [right], {
          message: `Languages and nationalities get a capital: ‘${right}’`,
          messageLocal: `Talen en volken krijgen een hoofdletter: ‘${right}’`,
          explanation: `Names of languages and peoples, and adjectives made from them, start with a capital: Nederlands, Engels, een Marokkaanse vriend.`,
          explanationLocal: `Namen van talen en volken, en bijvoeglijke naamwoorden daarvan, krijgen een hoofdletter: Nederlands, Engels, een Marokkaanse vriend.`,
          learnMore: LINKS.capitalsLanguages,
        }),
      )
    })
    return out
  },
}

export const ikCapital: Rule = {
  id: 'nl.cap.ik',
  lang: 'nl',
  category: 'capitalization',
  title: 'ik is lowercase mid-sentence',
  confidence: 'high',
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((t, i) => {
      if (t.text !== 'Ik' || freshStart(ctx, i) || looksLikeTitle(ctx, i, (x) => x === 'ik')) return
      if (lw(ctx, i - 1) === 'het' && prev(ctx, i) >= 0) return // "het Ik" (psychology)
      out.push(
        hitWords(ctx, i, i, ['ik'], {
          message: `‘ik’ only gets a capital at the start of a sentence`,
          messageLocal: `‘ik’ krijgt alleen aan het begin van een zin een hoofdletter`,
          explanation: `Unlike English ‘I’, Dutch ‘ik’ is written with a small letter in the middle of a sentence.`,
          explanationLocal: `Anders dan het Engelse ‘I’ schrijf je ‘ik’ midden in een zin met een kleine letter.`,
          learnMore: LINKS.capitals,
        }),
      )
    })
    return out
  },
}

const CLITICS = set("'s 't")

export const sentenceCapital: Rule = {
  id: 'nl.cap.sentence-start',
  lang: 'nl',
  category: 'capitalization',
  title: 'capital at the start of a sentence',
  confidence: 'high',
  check(ctx) {
    const out: RuleHit[] = []
    ctx.sentences.forEach((s, k) => {
      const first = s.tokens[0]
      if (!first?.isWord) return
      if (k > 0) {
        const prevSentence = ctx.sentences[k - 1]
        const last = prevSentence.tokens.filter((t) => !/^["'’”»)\]]$/.test(t.text)).pop()
        if (!last || last.isWord || !/[.!?؟]$/.test(last.text) || /\.\.|…/.test(last.text)) return
        // "1. appels" / "a. peren": a numbered list item, not a new sentence
        const prevWords = prevSentence.tokens.filter((t) => t.isWord)
        if (prevWords.length && prevWords.every((t) => /^(?:\d+|\p{L})$/u.test(t.text))) return
      }
      const wordsIn = s.tokens.filter((t) => t.isWord)
      if (wordsIn.length < 2) return
      let i = ctx.words.indexOf(first)
      if (CLITICS.has(first.lower)) {
        const n = next(ctx, i)
        if (n < 0) return
        i = n
      }
      const t = ctx.words[i]
      if (!/^\p{Ll}/u.test(t.text) || /\p{Lu}/u.test(t.text.slice(1))) return // iPhone, eBay
      const right = capitalize(t.text)
      const msg = {
        message: `Start a sentence with a capital: ‘${right}’`,
        messageLocal: `Begin een zin met een hoofdletter: ‘${right}’`,
        explanation: `The first word of a sentence starts with a capital letter. After ’s or ’t the next word gets it: ’s Avonds…`,
        explanationLocal: `Het eerste woord van een zin begint met een hoofdletter. Na ’s of ’t krijgt het volgende woord die: ’s Avonds…`,
        learnMore: LINKS.capitals,
      }
      out.push(hitWords(ctx, i, i, [right], msg))
    })
    return out
  },
}

export const capitalRules: Rule[] = [dayMonth, languageCapital, ikCapital, sentenceCapital]
