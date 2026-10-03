import type { IssueCategory, Lang } from '@/types'
import type { CandidateKind } from './candidates'

// Copy for spell issues. Plain and specific: say what is wrong and, where there is a rule, the rule.

interface Copy {
  en: string
  nl?: string
  ar?: string
}

const NOT_IN_DICT: Copy = { en: 'Not in the dictionary', nl: 'Staat niet in het woordenboek', ar: 'غير موجودة في القاموس' }
const NEEDS_CAPITAL: Copy = { en: 'Needs a capital letter', nl: 'Hoort met een hoofdletter' }
const NO_CAPITAL: Copy = { en: 'No capital letter here', nl: 'Hier geen hoofdletter' }
const IJ_CAPITAL: Copy = { en: 'IJ takes two capitals', nl: 'IJ krijgt twee hoofdletters' }
const HYPHEN_JOIN: Copy = { en: 'Written as one word', nl: 'Schrijf je aan elkaar' }

const EXPLAIN: Partial<Record<CandidateKind, Copy>> = {
  trema: {
    en: 'The trema (two dots) shows where a new syllable starts: ide-eën, Bel-gi-ë.',
    nl: 'Het trema laat zien waar een nieuwe lettergreep begint: ide-eën, Bel-gi-ë.',
  },
  accent: { en: 'This word keeps its accent.', nl: 'Dit woord schrijf je met een accent.' },
  'trema-drop': {
    en: 'No trema needed: the word reads fine without it.',
    nl: 'Hier hoort geen trema: het woord leest ook zonder goed.',
  },
  'tussen-n': {
    en: 'Tussen-n: write -en- when the first part only has an -en plural (pannen, so pannenkoek).',
    nl: 'Tussen-n: schrijf -en- als het eerste deel alleen een meervoud op -en heeft (pannen, dus pannenkoek).',
  },
  'tussen-n-drop': {
    en: 'No n here: this compound is written with a plain -e-.',
    nl: 'Hier geen n: deze samenstelling schrijf je met alleen -e-.',
  },
  kofschip: {
    en: "Past tense: 't kofschip. Stem ends in t, k, f, s, ch or p? Then -te, otherwise -de.",
    nl: "Verleden tijd: 't kofschip. Eindigt de stam op t, k, f, s, ch of p? Dan -te, anders -de.",
  },
  dt: {
    en: 'd and t sound the same at the end of a word. Check the verb: stem + t, or a past participle with d or t.',
    nl: 'Aan het eind van een woord klinken d en t hetzelfde. Kijk naar het werkwoord: stam + t, of een voltooid deelwoord op d of t.',
  },
  'ei-ij': {
    en: 'ei and ij sound the same, so this one just has to be learned.',
    nl: 'ei en ij klinken hetzelfde. Dit woord moet je gewoon onthouden.',
  },
  'au-ou': {
    en: 'au and ou sound the same, so this one just has to be learned.',
    nl: 'au en ou klinken hetzelfde. Dit woord moet je gewoon onthouden.',
  },
  ending: {
    en: "You hear -ich or 'luk', but you write -ig and -lijk.",
    nl: "Je hoort -ich of 'luk', maar je schrijft -ig en -lijk.",
  },
  apostrophe: {
    en: "Words ending in a, i, o, u or y take 's in the plural: auto's, foto's.",
    nl: "Woorden op a, i, o, u of y krijgen 's in het meervoud: auto's, foto's.",
  },
  'apostrophe-drop': {
    en: 'After a consonant the plural is just -s, no apostrophe.',
    nl: 'Na een medeklinker is het meervoud gewoon -s, zonder apostrof.',
  },
  'ie-ei': {
    en: 'i before e, except after c: believe, receive. Weird and foreign break the rule.',
  },
  hamza: {
    en: 'This word is written with a hamza: أ or إ, not a bare ا.',
    ar: 'تُكتب هذه الكلمة بالهمزة: أ أو إ وليس ا.',
  },
  'ta-marbuta': {
    en: 'Check the last letter: ta marbuta (ة) and ha (ه) look alike but are different letters.',
    ar: 'انتبه للحرف الأخير: التاء المربوطة (ة) والهاء (ه) حرفان مختلفان.',
  },
  'alif-maqsura': {
    en: 'Check the last letter: alif maqsura (ى) has no dots, ya (ي) has two.',
    ar: 'انتبه للحرف الأخير: الألف المقصورة (ى) بدون نقاط والياء (ي) بنقطتين.',
  },
  split: { en: 'These are two separate words.', nl: 'Dit zijn twee losse woorden.' },
  join: { en: 'Written as one word, without a hyphen.', nl: 'Dit schrijf je aan elkaar, zonder streepje.' },
}

const CONTRACTION: Copy = { en: "A contraction keeps its apostrophe where letters were left out: don't, you're, I'm." }

/** reasons from the misspelling map (lexicon/nl/misspellings.ts) */
const WHY: Record<string, Copy> = {
  'two-words': EXPLAIN.split!,
  trema: EXPLAIN.trema!,
  apostrophe: { en: 'Mind the apostrophe.', nl: 'Let op de apostrof.' },
  'tussen-n': EXPLAIN['tussen-n']!,
  double: { en: 'Watch the double letters.', nl: 'Let op de dubbele letters.' },
  sound: { en: 'Spelled the way it sounds, but not the way it is written.', nl: 'Geschreven zoals je het hoort, maar zo spel je het niet.' },
  loan: { en: 'A loanword keeps the spelling of its original language.', nl: 'Een leenwoord houdt de spelling uit de oorspronkelijke taal.' },
}

const local = (c: Copy, lang: Lang) => (lang === 'nl' ? c.nl : lang === 'ar' ? c.ar : undefined)

export interface SpellCopy {
  category: IssueCategory
  message: string
  messageLocal?: string
  explanation?: string
  explanationLocal?: string
}

/** Message and explanation for a flagged word, given its best suggestion (if any). */
export function spellCopy(
  word: string,
  best: { word: string; kind: CandidateKind; why?: string; note?: string } | undefined,
  lang: Lang,
): SpellCopy {
  let head = NOT_IN_DICT
  let category: IssueCategory = 'spelling'
  if (best && best.word.toLowerCase() === word.toLowerCase() && best.word !== word) {
    category = 'capitalization'
    if (/^Ij/.test(word) && /^IJ/.test(best.word)) head = IJ_CAPITAL
    else head = /\p{Lu}/u.test(best.word[0] ?? '') && !/\p{Lu}/u.test(word[0] ?? '') ? NEEDS_CAPITAL : NO_CAPITAL
  } else if (best?.kind === 'join') head = HYPHEN_JOIN

  let why: Copy | undefined
  if (best?.kind === 'map') why = best.note ? { en: best.note } : best.why ? WHY[best.why] : undefined
  else if (best?.kind === 'apostrophe' && lang === 'en') why = CONTRACTION
  else if (best) why = EXPLAIN[best.kind]
  return {
    category,
    message: head.en,
    messageLocal: local(head, lang),
    explanation: why?.en,
    explanationLocal: why ? local(why, lang) : undefined,
  }
}
