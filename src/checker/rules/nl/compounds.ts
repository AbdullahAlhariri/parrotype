import type { Rule, RuleHit } from '@/types'
import { clauseOf, fix, hitWord, hitWords, isCapitalized, isLowercase, isSentenceStart, known, lw, next } from '../../helpers'
import { COUNT_NOUNS, SPLIT_COMPOUNDS, SUBJECT_PRONOUNS, VOWEL_CLASH, isDeNoun, isHetNoun, isKnownNoun, set, vowelsClash } from '../../lexicon/nl'
import { LINKS } from './links'

// Compounds: written apart (Engelse ziekte) and hyphens at vowel clashes (§3.10, CMPD-01..03).

const splitMsg = (right: string) => ({
  message: `One word: ‘${right}’`,
  messageLocal: `Aan elkaar: ‘${right}’`,
  explanation: `Dutch writes compounds as one word, also with English parts: ziekenhuis, accountmanager. Writing them apart is an English habit (the ‘Engelse ziekte’) and can change the meaning.`,
  explanationLocal: `Samenstellingen schrijf je in het Nederlands aan elkaar, ook met Engelse delen: ziekenhuis, accountmanager. Los schrijven is een Engelse gewoonte (de ‘Engelse ziekte’) en kan de betekenis veranderen.`,
  learnMore: LINKS.compounds,
})

const hyphenMsg = (right: string) => ({
  message: `Vowels clash: ‘${right}’`,
  messageLocal: `Klinkerbotsing: ‘${right}’`,
  explanation: `When the parts of a compound would glue two vowels into one sound, put a hyphen between them: zee-egel, auto-ongeluk.`,
  explanationLocal: `Als twee klinkers in een samenstelling samen een andere klank zouden vormen, zet je er een streepje tussen: zee-egel, auto-ongeluk.`,
  learnMore: LINKS.compoundsOneWord,
})

/** the pair can stand as two words when the second one is followed by a subject ("In huis werk ik") */
const freeAfter = (ctx: Parameters<Rule['check']>[0], b: number) => {
  const n = next(ctx, b)
  return n >= 0 && SUBJECT_PRONOUNS.has(lw(ctx, n))
}

export const splitCompound: Rule = {
  id: 'nl.compound.split',
  lang: 'nl',
  category: 'spelling',
  title: 'compounds are one word',
  confidence: 'high',
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((t, i) => {
      const b = next(ctx, i)
      if (b < 0 || !isLowercase(ctx.words[b])) return
      if (!isLowercase(t) && !isSentenceStart(ctx, i)) return
      const pair = `${t.lower} ${lw(ctx, b)}`
      const joined = SPLIT_COMPOUNDS.get(pair)
      const clash = VOWEL_CLASH.get(pair)
      if (!joined && !clash) return
      if (freeAfter(ctx, b)) return
      const right = fix(t, joined ?? (clash as string))
      out.push(hitWords(ctx, i, b, [right], joined ? splitMsg(right) : hyphenMsg(right)))
    })
    return out
  },
}

export const vowelClash: Rule = {
  id: 'nl.compound.hyphen',
  lang: 'nl',
  category: 'spelling',
  title: 'hyphen at a vowel clash',
  confidence: 'high',
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((t, i) => {
      if (!isLowercase(t) && !isSentenceStart(ctx, i)) return
      // joined without hyphen: autoongeluk -> auto-ongeluk
      const mapped = VOWEL_CLASH.get(t.lower)
      if (mapped && !t.lower.includes(' ')) {
        out.push(hitWord(ctx, i, [mapped], hyphenMsg(mapped)))
        return
      }
      if (!ctx.dict || t.lower.length < 7 || /[^\p{L}]/u.test(t.lower) || known(ctx, t.lower)) return
      for (let k = 2; k <= t.lower.length - 3; k++) {
        const a = t.lower.slice(0, k)
        const b = t.lower.slice(k)
        if (!vowelsClash(a, b)) continue
        const cand = `${a}-${b}`
        if (known(ctx, cand) && known(ctx, a) && known(ctx, b)) {
          out.push(hitWord(ctx, i, [cand], hyphenMsg(cand), 'medium'))
          return
        }
      }
    })
    return out
  },
}

/** "auto sleutel" when "autosleutel" is a word: a hint only, double objects ("gaf de school geld") look the same */
const ALLOWED_PAIRS = set('school geld')

export const generatedCompound: Rule = {
  id: 'nl.compound.generated',
  lang: 'nl',
  category: 'style',
  title: 'maybe one word',
  confidence: 'low',
  strictOnly: true,
  check(ctx) {
    const out: RuleHit[] = []
    if (!ctx.dict) return out
    ctx.words.forEach((t, i) => {
      const b = next(ctx, i)
      if (b < 0 || !isLowercase(t) || !isLowercase(ctx.words[b])) return
      const x = t.lower
      const y = lw(ctx, b)
      if (!isKnownNoun(x) || !isKnownNoun(y) || ALLOWED_PAIRS.has(x) || SPLIT_COMPOUNDS.has(`${x} ${y}`)) return
      if (freeAfter(ctx, b) || isCapitalized(ctx.words[b])) return
      const cands = vowelsClash(x, y) ? [`${x}-${y}`] : [x + y, `${x}s${y}`]
      const right = cands.find((c) => known(ctx, c))
      if (!right) return
      out.push(hitWords(ctx, i, b, [right], splitMsg(right)))
    })
    return out
  },
}

/** verbs whose two objects can sit side by side: "Geef de baby melk", "Het doet mijn rug pijn" */
const TWO_OBJECT_VERBS = set(`geef geeft gaf gaven geven gegeven breng brengt bracht brachten brengen gebracht stuur stuurt
  stuurde stuurden sturen gestuurd toon toont toonde tonen getoond vertel vertelt vertelde vertellen verteld leer leert
  leerde leren geleerd bied biedt bood boden bieden geboden doe doet deed deden doen gedaan wens wenst wenste wensen
  gewenst noem noemt noemde noemen genoemd maak maakt maakte maken gemaakt kost kostte kosten gekost`)

/**
 * "mijn fiets sleutel", "Ik heb hoofd pijn": two listed nouns whose compound the dictionary knows. In
 * normal mode only when the second one is a countable noun that cannot stand on its own without an
 * article (so "de school geld", "viert de school feest" stay out), or pijn without doen ("Het doet mijn
 * rug pijn" is right), and never in a clause with a verb that takes two objects.
 */
export const splitNounCompound: Rule = {
  id: 'nl.compound.split-nouns',
  lang: 'nl',
  category: 'spelling',
  title: 'two nouns that form one word',
  confidence: 'medium',
  check(ctx) {
    const out: RuleHit[] = []
    if (!ctx.dict) return out
    ctx.words.forEach((t, i) => {
      const b = next(ctx, i)
      if (b < 0 || !isLowercase(ctx.words[b]) || (!isLowercase(t) && !isSentenceStart(ctx, i))) return
      const x = t.lower
      const y = lw(ctx, b)
      if (!(isDeNoun(x) || isHetNoun(x) || COUNT_NOUNS.has(x)) || ALLOWED_PAIRS.has(x) || SPLIT_COMPOUNDS.has(`${x} ${y}`)) return
      if (!(COUNT_NOUNS.has(y) && !BARE_OK.has(y)) && y !== 'pijn') return
      if (freeAfter(ctx, b)) return
      const c = clauseOf(ctx, i)
      for (let k = c ? c.from : 0; k <= (c ? c.to : ctx.words.length - 1); k++) if (TWO_OBJECT_VERBS.has(lw(ctx, k))) return
      const right = (vowelsClash(x, y) ? [`${x}-${y}`] : [x + y, `${x}s${y}`]).find((cand) => known(ctx, cand))
      if (!right) return
      out.push(hitWords(ctx, i, b, [fix(t, right)], splitMsg(fix(t, right))))
    })
    return out
  },
}

/** countable nouns that still appear bare as objects ("werk zoeken", "bezoek krijgen") */
const BARE_OK = set('werk huiswerk bezoek familie mail e-mail les feest koffie thee school bed')

export const compoundRules: Rule[] = [splitCompound, vowelClash, splitNounCompound, generatedCompound]
