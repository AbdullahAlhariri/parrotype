import type { Rule, RuleContext, RuleHit } from '@/types'
import {
  gapAfter,
  fix,
  hitWord,
  hitWords,
  isCapitalized,
  isLowercase,
  isSentenceStart,
  isSubjectSlot,
  known,
  lw,
  matchAt,
  next,
  prev,
  unknown,
  type Msg,
} from '../../helpers'
import {
  ADJ_BASE,
  COUNT_NOUNS,
  FINITE_FORMS,
  INFINITIVES,
  MISSPELLINGS,
  PHRASE_MISSPELLINGS,
  PLURAL_NOUNS,
  isKnownNoun,
  set,
  type Misspelling,
} from '../../lexicon/nl'
import { LINKS } from './links'

// Spelling: misspelling map, trema, apostrophes, -ig/-lijk, tussen-n and real-word mix-ups (§3.8-3.14, SP-01..20, TUSN-01).

const checkable = (ctx: RuleContext, i: number) => !isCapitalized(ctx.words[i]) || isSentenceStart(ctx, i)

/* ------------------------------------------------------------------ */
/* Map-based and dictionary-generated non-word fixes                   */
/* ------------------------------------------------------------------ */

type Kind = 'common' | 'two-words' | 'trema' | 'no-trema' | 'apostrophe' | 'tussen-n' | 'ig-lijk'

const kindOf = (wrong: string, m: Misspelling): Kind => {
  if (m.why === 'trema') return /[ëïöü]/.test(wrong) && !/[ëïöü]/.test(m.right) ? 'no-trema' : 'trema'
  if (m.why === 'two-words') return 'two-words'
  if (m.why === 'apostrophe') return 'apostrophe'
  if (m.why === 'tussen-n') return 'tussen-n'
  if (m.why === 'sound') return 'ig-lijk'
  return 'common'
}

const MESSAGES: Record<Kind, (wrong: string, right: string) => Msg> = {
  common: (wrong, right) => ({
    message: `Spelling: ‘${right}’`,
    messageLocal: `Spelling: ‘${right}’`,
    explanation: `‘${wrong}’ is a common misspelling of ‘${right}’.`,
    explanationLocal: `‘${wrong}’ is een veelgemaakte spelfout; je schrijft ‘${right}’.`,
  }),
  'two-words': (_wrong, right) => ({
    message: `Two words: ‘${right}’`,
    messageLocal: `Twee woorden: ‘${right}’`,
    explanation: `‘${right}’ is written as separate words.`,
    explanationLocal: `‘${right}’ schrijf je los.`,
  }),
  trema: (_wrong, right) => ({
    message: `Don't forget the accent: ‘${right}’`,
    messageLocal: `Vergeet het trema of accent niet: ‘${right}’`,
    explanation: `The trema (¨) shows that a new syllable starts at that vowel, so the two vowels are not read as one sound: ide-ëen, Belgi-ë, ge-ïnteresseerd.`,
    explanationLocal: `Het trema (¨) laat zien dat er een nieuwe lettergreep begint, zodat je de klinkers niet samen leest: ide-ëen, Belgi-ë, ge-ïnteresseerd.`,
    learnMore: LINKS.trema,
  }),
  'no-trema': (_wrong, right) => ({
    message: `No trema needed: ‘${right}’`,
    messageLocal: `Hier hoort geen trema: ‘${right}’`,
    explanation: `A trema is only needed where two vowels could be read as one sound. In ‘${right}’ nothing can be misread.`,
    explanationLocal: `Een trema zet je alleen als twee klinkers verkeerd samen gelezen kunnen worden. In ‘${right}’ kan dat niet.`,
    learnMore: LINKS.trema,
  }),
  apostrophe: (_wrong, right) => ({
    message: `Apostrophe: ‘${right}’`,
    messageLocal: `Apostrof: ‘${right}’`,
    explanation: `An apostrophe marks left-out letters: ’s avonds (= des avonds), z’n (zijn), m’n (mijn), zo’n (zo een). It goes where the letters are missing.`,
    explanationLocal: `Een apostrof staat waar letters zijn weggelaten: ’s avonds (= des avonds), z’n (zijn), m’n (mijn), zo’n (zo een).`,
    learnMore: LINKS.apostrophe,
  }),
  'tussen-n': (_wrong, right) => ({
    message: `Linking letter: ‘${right}’`,
    messageLocal: `Tussenletter: ‘${right}’`,
    explanation: `In a compound you write -en- when the first part's only plural ends in -en (pannen → pannenkoek). Fixed exceptions like zonnebloem keep -e-.`,
    explanationLocal: `In een samenstelling schrijf je -en- als het eerste deel alleen een meervoud op -en heeft (pannen → pannenkoek). Vaste uitzonderingen zoals zonnebloem houden -e-.`,
    learnMore: LINKS.linking,
  }),
  'ig-lijk': (_wrong, right) => ({
    message: `You hear it differently, but write ‘${right}’`,
    messageLocal: `Je hoort het anders, maar je schrijft ‘${right}’`,
    explanation: `The endings -ig and -lijk sound like ‘-ach’ and ‘-luk’, but are always spelled -ig and -lijk: gelukkig, natuurlijk.`,
    explanationLocal: `-ig klinkt als ‘-ach’ en -lijk als ‘-luk’, maar je schrijft altijd -ig en -lijk: gelukkig, natuurlijk.`,
  }),
}

const TREMA: Record<string, string> = { e: 'ë', i: 'ï', o: 'ö', u: 'ü' }
const strip = (s: string) => s.normalize('NFD').replace(/[̈]/g, '').normalize('NFC')

function generated(ctx: RuleContext, kind: Kind, word: string): string | undefined {
  if (!ctx.dict || word.length < 4 || /[^\p{L}]/u.test(word) || !unknown(ctx, word)) return undefined
  const lower = word.toLowerCase()
  if (kind === 'trema') {
    const cands = new Set<string>()
    for (let k = 1; k < word.length; k++) {
      const c = lower[k]
      if (TREMA[c] && 'aeiou'.includes(lower[k - 1])) cands.add(word.slice(0, k) + TREMA[c] + word.slice(k + 1))
      if (c === 'e' && k === word.length - 1) cands.add(word.slice(0, k) + 'é')
    }
    const ok = [...cands].filter((c) => known(ctx, c))
    return ok.length === 1 ? ok[0] : undefined
  }
  if (kind === 'no-trema') {
    if (!/[ëïöü]/.test(lower)) return undefined
    const s = strip(word)
    return s !== word && known(ctx, s) ? s : undefined
  }
  if (kind === 'ig-lijk') {
    const c1 = lower.replace(/ich(e|er|ere|ste|en|s)?$/, 'ig$1')
    const c2 = lower.replace(/l(?:i|u|e|y)k(e|er|ere|ste|s|heid)?$/, 'lijk$1')
    for (const c of [c1, c2]) if (c !== lower && known(ctx, c)) return c
    return undefined
  }
  if (kind === 'tussen-n') {
    if (lower.length < 8 || word !== lower) return undefined
    const found = new Set<string>()
    for (let k = 3; k <= lower.length - 4; k++) {
      if (lower[k] !== 'e' || 'aeiou'.includes(lower[k - 1])) continue
      const head = lower.slice(0, k + 1)
      if (lower[k + 1] === 'n') {
        const tail = lower.slice(k + 2)
        const cand = head + tail
        if (tail.length >= 3 && known(ctx, cand) && known(ctx, tail)) found.add(cand)
      } else {
        const tail = lower.slice(k + 1)
        const cand = head + 'n' + tail
        if (tail.length >= 3 && known(ctx, cand) && known(ctx, head + 'n') && known(ctx, tail)) found.add(cand)
      }
    }
    return found.size === 1 ? [...found][0] : undefined
  }
  return undefined
}

function nonWordRule(id: string, kind: Kind, title: string, category: Rule['category'] = 'spelling'): Rule {
  return {
    id,
    lang: 'nl',
    category,
    title,
    confidence: 'high',
    check(ctx) {
      const out: RuleHit[] = []
      ctx.words.forEach((t, i) => {
        const m = MISSPELLINGS.get(t.lower)
        let right: string | undefined
        if (m && kindOf(t.lower, m) === kind) right = m.right
        else if (!m && checkable(ctx, i)) right = generated(ctx, kind, t.text)
        if (!right) return
        out.push(hitWord(ctx, i, [right], MESSAGES[kind](t.lower, right)))
      })
      // multi-word entries
      for (const [phrase, right] of PHRASE_MISSPELLINGS) {
        const parts = phrase.split(' ')
        const phraseKind: Kind = right.startsWith("'") ? 'apostrophe' : 'common'
        if (phraseKind !== kind || right === 'te allen tijde') continue
        for (let i = 0; i < ctx.words.length; i++) {
          if (!matchAt(ctx, i, parts)) continue
          const r = fix(ctx.words[i], right)
          out.push(hitWords(ctx, i, i + parts.length - 1, [r], MESSAGES[kind](phrase, right)))
        }
      }
      return out
    },
  }
}

export const commonMisspelling = nonWordRule('nl.spell.common', 'common', 'common misspellings')
export const twoWords = nonWordRule('nl.spell.two-words', 'two-words', 'written as two words')
export const trema = nonWordRule('nl.spell.trema', 'trema', 'trema and accents')
export const noTrema = nonWordRule('nl.spell.no-trema', 'no-trema', 'no trema needed')
export const apostropheWords = nonWordRule('nl.spell.apostrophe', 'apostrophe', "’s avonds, z’n, m’n", 'punctuation')
export const tussenN = nonWordRule('nl.spell.tussen-n', 'tussen-n', 'linking -en- in compounds')
export const igLijk = nonWordRule('nl.spell.ig-lijk', 'ig-lijk', '-ig and -lijk endings')

/* ------------------------------------------------------------------ */
/* Fixed phrases                                                       */
/* ------------------------------------------------------------------ */

export const perSe: Rule = {
  id: 'nl.spell.per-se',
  lang: 'nl',
  category: 'spelling',
  title: 'per se (two words)',
  confidence: 'high',
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((t, i) => {
      if (t.lower !== 'perse' || lw(ctx, i - 1) === 'ter' || lw(ctx, i - 1) === 'de') return
      out.push(
        hitWord(ctx, i, ['per se'], {
          message: `Two words: ‘per se’`,
          messageLocal: `Twee woorden: ‘per se’`,
          explanation: `per se (Latin, ‘in itself / necessarily’) is written as two words. Only ‘ter perse’ (at the printer’s) uses perse.`,
          explanationLocal: `Per se (Latijn: ‘op zich / beslist’) schrijf je als twee woorden. Alleen ‘ter perse’ gebruikt perse.`,
        }),
      )
    })
    return out
  },
}

const TIJDE_WRONG = ['ten alle tijden', 'ten allen tijde', 'ten allen tijden', 'te alle tijden', 'te allen tijden', 'te alle tijde']

export const teAllenTijde: Rule = {
  id: 'nl.spell.te-allen-tijde',
  lang: 'nl',
  category: 'spelling',
  title: 'te allen tijde',
  confidence: 'high',
  check(ctx) {
    const out: RuleHit[] = []
    for (let i = 0; i + 2 < ctx.words.length; i++) {
      const phrase = `${lw(ctx, i)} ${lw(ctx, i + 1)} ${lw(ctx, i + 2)}`
      if (!TIJDE_WRONG.includes(phrase) || !matchAt(ctx, i, phrase.split(' '))) continue
      const right = isCapitalized(ctx.words[i]) ? 'Te allen tijde' : 'te allen tijde'
      out.push(
        hitWords(ctx, i, i + 2, [right], {
          message: `Old fixed phrase: ‘te allen tijde’`,
          messageLocal: `Oude vaste uitdrukking: ‘te allen tijde’`,
          explanation: `The phrase keeps an old case ending: te allen tijde. ‘ten’ (= te den) can't stand before ‘alle(n)’.`,
          explanationLocal: `De uitdrukking heeft een oude naamvalsvorm: te allen tijde. ‘Ten’ (= te den) kan niet vóór ‘alle(n)’.`,
          learnMore: LINKS.teAllenTijde,
        }),
      )
    }
    return out
  },
}

const ENIGSTE_PREV = set('de het mijn onze jouw zijn haar hun uw je')

export const enigste: Rule = {
  id: 'nl.spell.enigste',
  lang: 'nl',
  category: 'grammar',
  title: 'de enige (not enigste)',
  confidence: 'medium',
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((t, i) => {
      if (t.lower !== 'enigste') return
      const p = prev(ctx, i)
      if (p < 0 || !ENIGSTE_PREV.has(lw(ctx, p))) return
      out.push(
        hitWord(ctx, i, ['enige'], {
          message: `‘The only one’ is ‘enige’`,
          messageLocal: `‘Er is er maar één’ is ‘enige’`,
          explanation: `enig already means ‘only’, and you can't be more ‘only’ than only, so it is de enige. (‘Enigst’ exists only as a superlative of enig = lovely.)`,
          explanationLocal: `Enig betekent al ‘er is er maar één’; eniger dan enig kan niet, dus: de enige. (‘Enigst’ bestaat alleen als overtreffende trap van enig = leuk.)`,
          learnMore: LINKS.enigste,
        }),
      )
    })
    return out
  },
}

const PLURALS_NOT_VERBS: ReadonlySet<string> = new Set([...PLURAL_NOUNS].filter((p) => !INFINITIVES.has(p) && !FINITE_FORMS.has(p)))

export const beideBeiden: Rule = {
  id: 'nl.spell.beide',
  lang: 'nl',
  category: 'grammar',
  title: 'beide + noun',
  confidence: 'high',
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((t, i) => {
      if (t.lower !== 'beiden') return
      const n = next(ctx, i)
      if (n < 0 || !PLURALS_NOT_VERBS.has(lw(ctx, n))) return
      out.push(
        hitWord(ctx, i, ['beide'], {
          message: `Before a noun: ‘beide’`,
          messageLocal: `Vóór een zelfstandig naamwoord: ‘beide’`,
          explanation: `Before a noun you write beide (beide kinderen). beiden stands on its own and means ‘both people’ (Ze komen beiden).`,
          explanationLocal: `Vóór een zelfstandig naamwoord schrijf je beide (beide kinderen). Beiden staat alleen en betekent ‘allebei (personen)’ (Ze komen beiden).`,
          learnMore: LINKS.beide,
        }),
      )
    })
    return out
  },
}

/* ------------------------------------------------------------------ */
/* Apostrophes in plurals (SP-09 / SP-10)                              */
/* ------------------------------------------------------------------ */

const NO_APOSTROPHE_PLURALS = set(`autos fotos menus babys taxis opas omas pizzas radios videos kilos euros cameras
  agendas paraplus hobbys studios logos demos sofas collegas firmas programmas villas casinos pianos dramas themas
  schemas paus`)

export const apostrophePlural: Rule = {
  id: 'nl.spell.plural-apostrophe',
  lang: 'nl',
  category: 'punctuation',
  title: "plural -s or -'s",
  confidence: 'high',
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((t, i) => {
      if (!isLowercase(t)) return
      // computer's -> computers
      const extra = /^([\p{L}-]{3,}[bcdfghjklmnpqrtvw])'s$/u.exec(t.lower)
      if (extra) {
        const base = extra[1]
        const cands = [base + 's', base + 'en']
        const right = ctx.dict ? cands.find((c) => known(ctx, c)) : base + 's'
        if (!right) return
        out.push(
          hitWord(ctx, i, [right], {
            message: `No apostrophe here: ‘${right}’`,
            messageLocal: `Geen apostrof: ‘${right}’`,
            explanation: `A plural gets ’s only after a single a, i, o, u or y (auto’s, baby’s). After a consonant you just add -s or -en: computers.`,
            explanationLocal: `Een meervoud krijgt alleen ’s na een losse a, i, o, u of y (auto’s, baby’s). Na een medeklinker schrijf je gewoon -s of -en: computers.`,
            learnMore: LINKS.plurals,
          }),
        )
        return
      }
      // autos -> auto's
      const m = /^(\p{L}{2,}[aiouy])s$/u.exec(t.lower)
      if (!m) return
      const right = `${m[1]}'s`
      const wrong = ctx.dict ? unknown(ctx, t.lower) && known(ctx, right) : NO_APOSTROPHE_PLURALS.has(t.lower)
      if (!wrong) return
      out.push(
        hitWord(ctx, i, [right], {
          message: `Plural after a/i/o/u/y: ‘${right}’`,
          messageLocal: `Meervoud na a/i/o/u/y: ‘${right}’`,
          explanation: `Words ending in a single a, i, o, u or y get ’s in the plural, so the vowel keeps its sound: auto’s, foto’s, baby’s.`,
          explanationLocal: `Woorden die eindigen op een losse a, i, o, u of y krijgen ’s in het meervoud, zodat de klank blijft: auto’s, foto’s, baby’s.`,
          learnMore: LINKS.plurals,
        }),
      )
    })
    return out
  },
}

/* zon -> zo'n */
const ZON_PREV = set('de die deze het een geen mijn onze zijn haar hun jouw uw the la le')

export const zoN: Rule = {
  id: 'nl.spell.zo-n',
  lang: 'nl',
  category: 'spelling',
  title: "zo'n (not zon)",
  confidence: 'medium',
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((t, i) => {
      if (t.lower !== 'zon') return
      const p = prev(ctx, i)
      if (p >= 0 && ZON_PREV.has(lw(ctx, p))) return
      const n = next(ctx, i)
      if (n < 0) return
      const nw = lw(ctx, n)
      if (!ADJ_BASE.has(nw) && !COUNT_NOUNS.has(nw)) return
      out.push(
        hitWord(ctx, i, ["zo'n"], {
          message: `Did you mean ‘zo'n’ (such a)?`,
          messageLocal: `Bedoel je ‘zo'n’ (zo een)?`,
          explanation: `zo'n is short for ‘zo een’ (such a): zo'n mooie dag. zon is the sun.`,
          explanationLocal: `Zo'n is kort voor ‘zo een’: zo'n mooie dag. Zon is die in de lucht.`,
          learnMore: LINKS.apostrophe,
        }),
      )
    })
    return out
  },
}

/* ------------------------------------------------------------------ */
/* Real-word mix-ups: zei/zij, reist/rijst, lijdt/leidt, ligt/licht    */
/* ------------------------------------------------------------------ */

const ZIJ_SUBJ = set('hij zij ze ik')
const ZEI_NEXT = set('dat het niets niks iets nee ja tegen toen altijd dan ook nog gisteren meteen alleen me mij hem')
const ZIJ_FINITE = set('is heeft gaat komt wil kan moet was had ging kwam zal mag wordt werd woont werkt zit staat ligt doet ziet weet vindt')

export const zeiZij: Rule = {
  id: 'nl.spell.zei-zij',
  lang: 'nl',
  category: 'spelling',
  title: 'zei / zij',
  confidence: 'high',
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((t, i) => {
      if (t.lower === 'zij') {
        const s = prev(ctx, i)
        if (s < 0 || !ZIJ_SUBJ.has(lw(ctx, s))) return
        const n = next(ctx, i)
        const ok = n >= 0 ? ZEI_NEXT.has(lw(ctx, n)) : /^\s*[:,."“„]/.test(gapAfter(ctx, i))
        if (!ok) return
        out.push(
          hitWord(ctx, i, ['zei'], {
            message: `Past tense of zeggen: ‘zei’`,
            messageLocal: `Verleden tijd van zeggen: ‘zei’`,
            explanation: `zei (with ei) is the past tense of zeggen: Hij zei dat… zij (with ij) is the pronoun ‘she/they’.`,
            explanationLocal: `Zei (met ei) is de verleden tijd van zeggen: Hij zei dat… Zij (met ij) is het voornaamwoord.`,
          }),
        )
      } else if (t.lower === 'zei') {
        const n = next(ctx, i)
        if (!isSubjectSlot(ctx, i) || n < 0 || !ZIJ_FINITE.has(lw(ctx, n))) return
        out.push(
          hitWord(ctx, i, ['zij'], {
            message: `The pronoun is ‘zij’`,
            messageLocal: `Het voornaamwoord is ‘zij’`,
            explanation: `zij (with ij) means she/they. zei (with ei) is the past tense of zeggen.`,
            explanationLocal: `Zij (met ij) is het voornaamwoord. Zei (met ei) is de verleden tijd van zeggen.`,
          }),
        )
      }
    })
    return out
  },
}

const REIST_SUBJ = set('hij zij ze men u jij je')
const REIST_NEXT = set('naar door met rond af terug veel vaak graag elk elke ieder iedere de een volgende vorige morgen')
const RIJST_PREV = set('eet eten at aten kook kookt koken witte bruine gebakken gekookte zilvervlies')

export const reistRijst: Rule = {
  id: 'nl.spell.reist-rijst',
  lang: 'nl',
  category: 'spelling',
  title: 'reist / rijst',
  confidence: 'medium',
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((t, i) => {
      const p = prev(ctx, i)
      const n = next(ctx, i)
      if (t.lower === 'rijst' && p >= 0 && n >= 0 && REIST_SUBJ.has(lw(ctx, p)) && REIST_NEXT.has(lw(ctx, n))) {
        out.push(
          hitWord(ctx, i, ['reist'], {
            message: `Travels = ‘reist’ (ei)`,
            messageLocal: `Op reis = ‘reist’ (ei)`,
            explanation: `reizen (to travel) is spelled with ei: hij reist. rijst (with ij) is rice.`,
            explanationLocal: `Reizen schrijf je met ei: hij reist. Rijst (met ij) is het eten.`,
          }),
        )
      } else if (t.lower === 'reist' && p >= 0 && RIJST_PREV.has(lw(ctx, p))) {
        out.push(
          hitWord(ctx, i, ['rijst'], {
            message: `Rice = ‘rijst’ (ij)`,
            messageLocal: `Het eten = ‘rijst’ (ij)`,
            explanation: `rijst (rice) is spelled with ij. reist (with ei) comes from reizen, to travel.`,
            explanationLocal: `Rijst (het eten) schrijf je met ij. Reist (met ei) komt van reizen.`,
          }),
        )
      }
    })
    return out
  },
}

const LEID_TO_LIJD: Record<string, string> = { leid: 'lijd', leidt: 'lijdt', leiden: 'lijden', leidde: 'leed', leidden: 'leden' }
const LIJD_TO_LEID: Record<string, string> = { lijd: 'leid', lijdt: 'leidt', lijden: 'leiden' }

export const lijdtLeidt: Rule = {
  id: 'nl.spell.lijdt-leidt',
  lang: 'nl',
  category: 'spelling',
  title: 'lijden / leiden',
  confidence: 'medium',
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((t, i) => {
      const n = next(ctx, i)
      if (n < 0 || (isCapitalized(t) && !isSentenceStart(ctx, i))) return // Leiden (city)
      const nw = lw(ctx, n)
      const toLijd = LEID_TO_LIJD[t.lower]
      const toLeid = LIJD_TO_LEID[t.lower]
      if (toLijd && (nw === 'aan' || nw === 'onder')) {
        out.push(
          hitWord(ctx, i, [toLijd], {
            message: `Suffer = ‘${toLijd}’ (ij)`,
            messageLocal: `Pijn hebben = ‘${toLijd}’ (ij)`,
            explanation: `lijden (with ij) means to suffer: lijden aan/onder. leiden (with ei) means to lead.`,
            explanationLocal: `Lijden (met ij) is pijn of last hebben: lijden aan/onder. Leiden (met ei) is de baas zijn of de weg wijzen.`,
          }),
        )
      } else if (toLeid && (nw === 'tot' || nw === 'naar') && lw(ctx, i - 1) !== 'het') {
        out.push(
          hitWord(ctx, i, [toLeid], {
            message: `Lead = ‘${toLeid}’ (ei)`,
            messageLocal: `De weg wijzen = ‘${toLeid}’ (ei)`,
            explanation: `leiden (with ei) means to lead: leiden tot/naar. lijden (with ij) means to suffer.`,
            explanationLocal: `Leiden (met ei) is de weg wijzen: leiden tot/naar. Lijden (met ij) is pijn hebben.`,
          }),
        )
      }
    })
    return out
  },
}

const LICHT_SUBJ = set('hij zij ze die dat dit er')
const PLACE_PREPS = set('op in onder naast achter bij tussen boven aan')
const PLACE_OBJ = set("de het een mijn m'n jouw je zijn z'n haar ons onze hun uw")

export const ligtLicht: Rule = {
  id: 'nl.spell.ligt-licht',
  lang: 'nl',
  category: 'spelling',
  title: 'ligt / licht',
  confidence: 'medium',
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((t, i) => {
      if (t.lower !== 'licht') return
      const p = prev(ctx, i)
      const n = next(ctx, i)
      if (p < 0 || n < 0 || !PLACE_PREPS.has(lw(ctx, n))) return
      const pw = lw(ctx, p)
      if (!LICHT_SUBJ.has(pw) && !isKnownNoun(pw)) return
      const o = next(ctx, n)
      if (o < 0 || (!PLACE_OBJ.has(lw(ctx, o)) && !isKnownNoun(lw(ctx, o)))) return // "Zijn gezicht licht op als ..."
      out.push(
        hitWord(ctx, i, ['ligt'], {
          message: `Lies = ‘ligt’ (g)`,
          messageLocal: `Liggen → ‘ligt’ (met g)`,
          explanation: `liggen → het ligt (with g). licht means light (de lamp, or not heavy).`,
          explanationLocal: `Liggen → het ligt (met g). Licht is de lamp, of niet zwaar.`,
        }),
      )
    })
    return out
  },
}

export const teVeel: Rule = {
  id: 'nl.spell.te-veel',
  lang: 'nl',
  category: 'spelling',
  title: 'te veel (two words)',
  confidence: 'medium',
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((t, i) => {
      if (t.lower !== 'teveel' || set("het een dat dit zo'n").has(lw(ctx, i - 1))) return
      out.push(
        hitWord(ctx, i, ['te veel'], {
          message: `Two words: ‘te veel’`,
          messageLocal: `Twee woorden: ‘te veel’`,
          explanation: `te veel (too much) is two words. Only the noun ‘het teveel’ (the surplus) is one word.`,
          explanationLocal: `Te veel schrijf je los. Alleen het zelfstandig naamwoord ‘het teveel’ is één woord.`,
        }),
      )
    })
    return out
  },
}

export const ervanAf: Rule = {
  id: 'nl.spell.ervan-af',
  lang: 'nl',
  category: 'spelling',
  title: 'ervan af (not er van af)',
  confidence: 'medium',
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((_t, i) => {
      if (!matchAt(ctx, i, ['er', 'van', set('af uit door weg')])) return
      const right = isCapitalized(ctx.words[i]) ? 'Ervan' : 'ervan'
      out.push(
        hitWords(ctx, i, i + 1, [right], {
          message: `Write ‘ervan’ as one word`,
          messageLocal: `Schrijf ‘ervan’ aan elkaar`,
          explanation: `er + a preposition next to it is one word: ervan, erover, ermee. So: ervan af or er vanaf, never er van af.`,
          explanationLocal: `Er + een voorzetsel ernaast schrijf je aan elkaar: ervan, erover, ermee. Dus: ervan af of er vanaf, nooit er van af.`,
          learnMore: LINKS.ervanaf,
        }),
      )
    })
    return out
  },
}

export const spellingRules: Rule[] = [
  commonMisspelling,
  twoWords,
  trema,
  noTrema,
  apostropheWords,
  tussenN,
  igLijk,
  perSe,
  teAllenTijde,
  enigste,
  beideBeiden,
  apostrophePlural,
  zoN,
  zeiZij,
  reistRijst,
  lijdtLeidt,
  ligtLicht,
  teVeel,
  ervanAf,
]
