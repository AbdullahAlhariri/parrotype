import type { Rule, RuleHit } from '@/types'
import { clauseOf, endsClause, fix, hitWord, hitWords, isSubjectSlot, lw, matchAt, matchFlex, next, opt, prev, spanWithout } from '../../helpers'
import { ADJ_BASE, COUNT_NOUNS, INFINITIVES, SUBJECT_PRONOUNS, isKnownNoun, set } from '../../lexicon/nl'
import { LINKS } from './links'

// Word choice: beseffen, mee eens, kennen/kunnen/weten, liggen/leggen, heel/hele, wie z'n (§3.14, LEX-01..09).

/* LEX-01: "Ik besef me dat" -> "Ik besef dat" */
const BESEF = set('besef beseft beseffen besefte beseften')

export const beseffen: Rule = {
  id: 'nl.lex.beseffen',
  lang: 'nl',
  category: 'grammar',
  title: 'beseffen is not reflexive',
  confidence: 'high',
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((t, i) => {
      if (!BESEF.has(t.lower)) return
      let r = next(ctx, i)
      if (r < 0) return
      // inversion: "Nu besef ik me ..."
      if (SUBJECT_PRONOUNS.has(lw(ctx, r)) && next(ctx, r) >= 0) {
        const subj = lw(ctx, r)
        const refl = lw(ctx, r + 1)
        const pairs: Record<string, string[]> = { ik: ['me', 'mij', 'mezelf'], je: ['je', 'jezelf'], jij: ['je', 'jezelf'], we: ['ons'], wij: ['ons'], hij: ['zich'], zij: ['zich'], ze: ['zich'], u: ['zich', 'u'] }
        if (pairs[subj]?.includes(refl)) r = r + 1
        else return
      } else {
        const refl = lw(ctx, r)
        const p = prev(ctx, i)
        const subj = p >= 0 ? lw(ctx, p) : ''
        const ok =
          ['zich', 'zichzelf', 'mezelf', 'jezelf'].includes(refl) ||
          ((refl === 'me' || refl === 'mij') && subj === 'ik') ||
          (refl === 'ons' && (subj === 'we' || subj === 'wij')) ||
          (refl === 'je' && (subj === 'jij' || subj === 'je'))
        if (!ok) return
      }
      if (isKnownNoun(lw(ctx, r + 1)) && next(ctx, r) >= 0) return // "beseffen ons belang"
      const right = spanWithout(ctx, i, r, r)
      out.push(
        hitWords(ctx, i, r, [right], {
          message: `‘beseffen’ is not reflexive: ‘${right}’`,
          messageLocal: `‘beseffen’ is niet wederkerend: ‘${right}’`,
          explanation: `You say ‘ik besef dat…’ without me/zich. If you want a reflexive verb, use realiseren: ‘ik realiseer me dat…’.`,
          explanationLocal: `Je zegt ‘ik besef dat…’, zonder me/zich. Wil je wel een wederkerend werkwoord, gebruik dan realiseren: ‘ik realiseer me dat…’.`,
          learnMore: LINKS.beseffen,
        }),
      )
    })
    return out
  },
}

/* LEX-02: "Ik ben het met je mee eens" -> "met je eens" */
export const meeEens: Rule = {
  id: 'nl.lex.mee-eens',
  lang: 'nl',
  category: 'grammar',
  title: 'het met iemand eens zijn',
  confidence: 'high',
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((t, i) => {
      if (t.lower !== 'mee' || lw(ctx, i + 1) !== 'eens' || next(ctx, i) < 0) return
      if (set('er daar hier waar').has(lw(ctx, i - 1))) return
      const c = clauseOf(ctx, i)
      if (!c) return
      let met = false
      for (let k = c.from; k < i; k++) if (lw(ctx, k) === 'met') met = true
      if (!met) return
      out.push(
        hitWords(ctx, i, i + 1, [fix(t, 'eens')], {
          message: `‘mee’ is doubled up here: ‘met … eens’`,
          messageLocal: `‘mee’ is hier dubbelop: ‘met … eens’`,
          explanation: `It is ‘het met iemand eens zijn’. ‘Mee’ already means ‘met’, so you only use it without met: ‘Daar ben ik het mee eens.’`,
          explanationLocal: `Het is ‘het met iemand eens zijn’. ‘Mee’ betekent al ‘met’, dus alleen zonder met: ‘Daar ben ik het mee eens.’`,
        }),
      )
    })
    return out
  },
}

/* LEX-03: "Ik ken niet zwemmen" -> "Ik kan niet zwemmen" */
const NOUN_INFINITIVES = set('eten leven spelen werken drinken wonen lopen koken lezen schrijven zingen dansen')

export const kunnenKennen: Rule = {
  id: 'nl.lex.kunnen-kennen',
  lang: 'nl',
  category: 'grammar',
  title: 'kunnen / kennen',
  confidence: 'medium',
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((t, i) => {
      if (t.lower !== 'ken' && t.lower !== 'kent') return
      const end = matchFlex(ctx, i, [t.lower, opt(set('niet wel goed ook nog al echt')), (w) => INFINITIVES.has(w.lower) && !NOUN_INFINITIVES.has(w.lower)])
      if (end < 0 || !endsClause(ctx, end)) return
      out.push(
        hitWord(ctx, i, t.lower === 'ken' ? ['kan'] : ['kan', 'kunt'], {
          message: `Be able to = ‘kunnen’: ‘${t.lower === 'ken' ? 'kan' : 'kan/kunt'}’`,
          messageLocal: `In staat zijn = ‘kunnen’: ‘${t.lower === 'ken' ? 'kan' : 'kan/kunt'}’`,
          explanation: `kunnen means ‘can, be able to’ (ik kan zwemmen). kennen means ‘to know someone or something’ (ik ken hem). ‘Ik ken niet komen’ is dialect.`,
          explanationLocal: `Kunnen is ‘in staat zijn’ (ik kan zwemmen). Kennen is ‘iemand of iets kennen’ (ik ken hem). ‘Ik ken niet komen’ is dialect.`,
        }),
      )
    })
    return out
  },
}

/* LEX-04: "Ken je waar hij woont?" -> "Weet je" */
const FACT_WORDS = set('waar hoe wanneer of waarom wie hoeveel hoelang welke')

export const wetenKennen: Rule = {
  id: 'nl.lex.weten-kennen',
  lang: 'nl',
  category: 'grammar',
  title: 'weten (facts) / kennen (people)',
  confidence: 'medium',
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((t, i) => {
      const pron = next(ctx, i)
      if (pron < 0 || !isSubjectSlot(ctx, i)) return
      const pair = `${t.lower} ${lw(ctx, pron)}`
      if (pair !== 'ken je' && pair !== 'ken jij' && pair !== 'kent u') return
      const q = next(ctx, pron)
      if (q < 0) return
      const qw = lw(ctx, q)
      const after = next(ctx, q)
      const factual = FACT_WORDS.has(qw) || (qw === 'wat' && after >= 0 && (SUBJECT_PRONOUNS.has(lw(ctx, after)) || set('er de het een').has(lw(ctx, after))))
      if (!factual) return
      out.push(
        hitWord(ctx, i, ['weet'], {
          message: `For a fact: ‘weet ${lw(ctx, pron)}’`,
          messageLocal: `Bij een feit: ‘weet ${lw(ctx, pron)}’`,
          explanation: `weten is for facts and answers (Weet je waar hij woont?). kennen is for people, places and things you are familiar with (Ken je hem?).`,
          explanationLocal: `Weten gebruik je voor feiten en antwoorden (Weet je waar hij woont?). Kennen voor personen, plaatsen en dingen (Ken je hem?).`,
        }),
      )
    })
    return out
  },
}

/* LEX-05: "Ik weet hem niet" -> "Ik ken hem niet" */
const WETEN_TO_KENNEN: Record<string, string> = { weet: 'ken', weten: 'kennen', wist: 'kende', wisten: 'kenden' }

export const wetenPersoon: Rule = {
  id: 'nl.lex.kennen-persoon',
  lang: 'nl',
  category: 'grammar',
  title: 'kennen + person',
  confidence: 'medium',
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((t, i) => {
      const right = WETEN_TO_KENNEN[t.lower]
      if (!right) return
      const end = matchFlex(ctx, i, [t.lower, set('hem jou hen'), opt(set('niet wel ook echt'))])
      if (end < 0 || !endsClause(ctx, end) || next(ctx, end) >= 0) return
      out.push(
        hitWord(ctx, i, [right], {
          message: `A person you ‘kennen’: ‘${right}’`,
          messageLocal: `Een persoon ken je: ‘${right}’`,
          explanation: `kennen is for people and things you are familiar with (Ik ken hem). weten is for facts (Ik weet waar hij woont).`,
          explanationLocal: `Kennen gebruik je voor personen en dingen (Ik ken hem). Weten voor feiten (Ik weet waar hij woont).`,
        }),
      )
    })
    return out
  },
}

/* LEX-06: "Ik ga even leggen" -> "liggen" */
export const liggenLeggen: Rule = {
  id: 'nl.lex.liggen-leggen',
  lang: 'nl',
  category: 'grammar',
  title: 'liggen/leggen, zitten/zetten',
  confidence: 'medium',
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((t, i) => {
      if (!set('ga gaat gaan ging gingen').has(t.lower)) return
      const end = matchFlex(ctx, i, [t.lower, opt(set('even lekker nog eens maar')), set('leggen zetten')])
      if (end < 0 || !endsClause(ctx, end)) return
      const right = lw(ctx, end) === 'leggen' ? 'liggen' : 'zitten'
      out.push(
        hitWord(ctx, end, [right], {
          message: `Without an object: ‘${right}’`,
          messageLocal: `Zonder voorwerp: ‘${right}’`,
          explanation: `liggen and zitten say where you are (Ik ga even liggen). leggen and zetten mean putting something somewhere and need an object (Ik leg het boek op tafel).`,
          explanationLocal: `Liggen en zitten zeggen waar je bent (Ik ga even liggen). Leggen en zetten is iets ergens neerleggen of neerzetten; daar hoort een voorwerp bij (Ik leg het boek op tafel).`,
          learnMore: LINKS.liggen,
        }),
      )
    })
    return out
  },
}

/* LEX-06b: "Ik leg de hele dag in bed" -> "lig": leggen without an object before a place */
const LEG_TO_LIG: Record<string, string> = { leg: 'lig', legt: 'ligt', leggen: 'liggen', legde: 'lag', legden: 'lagen' }
const LEG_FILLERS = set('al nog even lekker gewoon graag vaak altijd nu net de hele dag middag ochtend avond nacht week ziek languit steeds weer')
const LEG_PLACES: Array<string[]> = [['in', 'bed'], ['op', 'bed'], ['op', 'de', 'bank'], ['in', 'de', 'zon'], ['op', 'de', 'grond'], ['op', 'het', 'strand'], ['in', 'het', 'gras'], ['in', 'het', 'ziekenhuis'], ['in', 'de', 'tuin']]

export const legInBed: Rule = {
  id: 'nl.lex.leg-in-bed',
  lang: 'nl',
  category: 'grammar',
  title: 'ik lig in bed (not leg)',
  confidence: 'medium',
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((t, i) => {
      const right = LEG_TO_LIG[t.lower]
      if (!right) return
      let k = next(ctx, i)
      // only fillers between the verb and the place: anything else may be the object ("Ik leg het boek op bed")
      for (let steps = 0; k >= 0 && steps < 5 && LEG_FILLERS.has(lw(ctx, k)); steps++) k = next(ctx, k)
      if (k < 0 || !LEG_PLACES.some((pl) => matchAt(ctx, k, pl))) return
      out.push(
        hitWord(ctx, i, [right], {
          message: `Nothing is being put down: ‘${right}’`,
          messageLocal: `Er wordt niets neergelegd: ‘${right}’`,
          explanation: `liggen says where you are (Ik lig in bed). leggen means putting something somewhere and needs an object (Ik leg het boek op bed).`,
          explanationLocal: `Liggen zegt waar je bent (Ik lig in bed). Leggen is iets ergens neerleggen; daar hoort een voorwerp bij (Ik leg het boek op bed).`,
          learnMore: LINKS.liggen,
        }),
      )
    })
    return out
  },
}

/* LEX-07: "een hele mooie dag" -> "een heel mooie dag" (style) */
export const heelHele: Rule = {
  id: 'nl.lex.heel-mooie',
  lang: 'nl',
  category: 'style',
  title: 'een heel mooie (not hele)',
  confidence: 'low',
  strictOnly: true,
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((t, i) => {
      if (t.lower !== 'een') return
      const h = next(ctx, i)
      if (h < 0 || lw(ctx, h) !== 'hele') return
      const a = next(ctx, h)
      if (a < 0 || !ADJ_BASE.has(lw(ctx, a)) || next(ctx, a) < 0) return
      out.push(
        hitWord(ctx, h, ['heel'], {
          message: `In formal writing: ‘heel’ before an adjective`,
          messageLocal: `In nette taal: ‘heel’ vóór een bijvoeglijk naamwoord`,
          explanation: `heel here means ‘very’ and does not change: een heel mooie dag. ‘Een hele mooie dag’ is common in speech.`,
          explanationLocal: `Heel betekent hier ‘erg’ en verandert niet: een heel mooie dag. ‘Een hele mooie dag’ is spreektaal.`,
          learnMore: LINKS.heel,
        }),
      )
    })
    return out
  },
}

/* LEX-08: "Wie z'n jas is dit?" -> "Van wie is deze jas?" (style) */
export const wieZn: Rule = {
  id: 'nl.lex.wie-zn',
  lang: 'nl',
  category: 'style',
  title: "wie z'n (spoken)",
  confidence: 'low',
  strictOnly: true,
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((t, i) => {
      if (t.lower !== 'wie') return
      const z = next(ctx, i)
      const n = z >= 0 ? next(ctx, z) : -1
      if (z < 0 || n < 0 || !set("z'n zijn").has(lw(ctx, z)) || !COUNT_NOUNS.has(lw(ctx, n))) return
      out.push(
        hitWords(ctx, i, z, [fix(t, 'wiens')], {
          message: `‘${t.text} ${lw(ctx, z)}’ is spoken style`,
          messageLocal: `‘${t.text} ${lw(ctx, z)}’ is spreektaal`,
          explanation: `In writing use ‘van wie’ (Van wie is deze jas?) or the formal ‘wiens’.`,
          explanationLocal: `Schrijf liever ‘van wie’ (Van wie is deze jas?) of het formele ‘wiens’.`,
          learnMore: LINKS.wiens,
        }),
      )
    })
    return out
  },
}

/* LEX-09: "zoals hoe ik het doe" -> "zoals ik het doe" (uncertain, style) */
export const zoalsHoe: Rule = {
  id: 'nl.lex.zoals-hoe',
  lang: 'nl',
  category: 'style',
  title: 'zoals (not zoals hoe)',
  confidence: 'low',
  strictOnly: true,
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((t, i) => {
      const n = next(ctx, i)
      if (n < 0) return
      const pair = `${t.lower} ${lw(ctx, n)}`
      if (pair !== 'zoals hoe' && pair !== 'hoe als') return
      out.push(
        hitWords(ctx, i, n, [fix(t, t.lower === 'zoals' ? 'zoals' : 'hoe')], {
          message: `Doubled up: ‘${t.lower === 'zoals' ? 'zoals' : 'hoe'}’ is enough`,
          messageLocal: `Dubbelop: ‘${t.lower === 'zoals' ? 'zoals' : 'hoe'}’ is genoeg`,
          explanation: `zoals and hoe already do the job alone: ‘zoals ik het doe’.`,
          explanationLocal: `Zoals of hoe alleen is genoeg: ‘zoals ik het doe’.`,
        }),
      )
    })
    return out
  },
}

export const lexicalRules: Rule[] = [beseffen, meeEens, kunnenKennen, wetenKennen, wetenPersoon, liggenLeggen, legInBed, heelHele, wieZn, zoalsHoe]
