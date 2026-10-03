import type { RuleContext, RuleHit } from '@/types'
import { known } from '../../helpers'
import { inZone, LINKS, prepare, q, type EnRule } from './shared'

// a / an by SOUND, not by letter (english-errors.md 4.2): an hour, a university, an MBA, a one-off, an 8.
// Exception idea and word lists modelled on LanguageTool's det_a.txt / det_an.txt (LGPL), re-implemented.

/** both are in use: an historic / a historic, a herb (UK) / an herb (US) */
const BOTH = new Set(['historic', 'historical', 'herb', 'herbs', 'herbal', 'hotel', 'habitual', 'homage', 'heroic', 'hysterical', 'sql'])
/** start with a vowel letter but a consonant sound: a university, a European, a one-off, a user */
const A_PREFIX = /^(?:eu|ewe|one(?!r)|once|uk|ub|ug(?!l)|ura|ure|uri|uro|usa|use|usu|ut(?![tm])|uv|unan|unesc|uni(?![mndl]|ns|nf|nh))/i
/** start with a consonant letter but a vowel sound (silent h): an hour, an honest man */
const AN_PREFIX = /^(?:hour|honest|honou?r|heir)/i
/** acronyms said as words */
const WORD_ACRONYMS = new Set(['NASA', 'NATO', 'UNESCO', 'UNICEF', 'FIFA', 'UEFA', 'OPEC', 'AIDS', 'LASER', 'RADAR', 'SCUBA', 'PIN', 'SIM', 'GIF', 'JPEG', 'ASAP', 'COVID', 'IKEA', 'ISIS', 'OPEN'])
/** initialisms said letter by letter even though they contain vowels */
const INITIALISMS = new Set(
  'MBA FBI MRI HIV SMS NGO HR SUV ATM FAQ UFO URL USB EU UN UK US USA LED RSVP MP MC HTML XML SOS IOU OK IQ ID AI TV PC CD DVD BBC CEO MSc BSc PhD ISP IT MA BA LLM ICU ER IOC'.split(' '),
)
/** letters whose name starts with a vowel sound: an F, an H, an M, an X-ray */
const VOWEL_SOUND_LETTERS = new Set(['A', 'E', 'F', 'H', 'I', 'L', 'M', 'N', 'O', 'R', 'S', 'X'])
/** fallback "is this an ordinary word" list for shouted words when no dictionary is loaded */
const COMMON_CAPS = new Set(['lot', 'legal', 'laps', 'big', 'new', 'huge', 'free', 'must', 'never', 'only', 'one', 'all', 'any', 'own', 'not', 'old', 'open', 'other', 'great', 'good', 'real'])

/** 'a' | 'an' for the word after the article, or null when both are fine or we can't tell */
export function expectedArticle(raw: string, isWord: (w: string) => boolean = (w) => COMMON_CAPS.has(w)): 'a' | 'an' | null {
  const word = raw.replace(/^["'“‘(]+/, '').replace(/[^A-Za-z0-9'-].*$/, '')
  if (!word) return null
  const lower = word.toLowerCase()
  const head = lower.split('-')[0]
  if (BOTH.has(head)) return null
  if (/^\d/.test(word)) {
    if (/^8/.test(word) || /^(?:11|18)(?!\d)/.test(word) || /^(?:11|18),?\d{3}(?!\d)/.test(word)) return 'an'
    return 'a'
  }
  // a single letter before a hyphen is said as a letter: an X-ray, a T-shirt, a U-turn, an e-mail
  if (head.length === 1 && word.includes('-')) return VOWEL_SOUND_LETTERS.has(head.toUpperCase()) ? 'an' : 'a'
  // judge acronyms on the first part only: a REST-API, an FBI-style raid
  const letters = word.split('-')[0].replace(/[^A-Za-z]/g, '')
  const allCaps = letters.length >= 2 && letters === letters.toUpperCase()
  const acronym =
    allCaps && !WORD_ACRONYMS.has(letters) && (INITIALISMS.has(letters) || !/[AEIOUY]/.test(letters) || !isWord(letters.toLowerCase()))
  if (acronym || (letters.length === 1 && /^[A-Z]$/.test(word))) return VOWEL_SOUND_LETTERS.has(letters[0]) ? 'an' : 'a'
  if (AN_PREFIX.test(head)) return 'an'
  if (A_PREFIX.test(head)) return 'a'
  return /^[aeiou]/i.test(head) ? 'an' : 'a'
}

/** "Plan A is", "vitamin A and": the a is a label, not an article */
const LABEL_BEFORE =
  /\b(?:vitamin|plan|grade|type|class|section|option|exhibit|part|appendix|annex|schedule|article|figure|table|step|phase|series|case|version|letter|point|row|column|group|team|category|level|size|block|platform|gate|model|width|length|height|set|matrix|vector|constant|variable)\s*$/i
/** "where a is non-zero": the word after the a shows it is a symbol */
const STOP_AFTER = new Set(['a', 'an', 'be', 'is', 'are', 'was', 'were', 'and', 'or', 'has', 'have', 'had', 'can', 'could', 'will', 'would', 'should', 'may', 'might', 'must', 'to', 'of', 'in', 'on', 'at', 'for', 'with', 'by', 'as', 'than', 'then', 'if', 'b', 'c', 'd', 'x', 'y', 'z', '='])

const RE = /\b(?<art>a|an)\s+(?<next>["'“‘(]?[A-Za-z0-9][\w'-]*)/gi

export const aAn: EnRule = {
  id: 'en.a-an',
  lang: 'en',
  category: 'grammar',
  title: 'a / an by sound',
  confidence: 'high',
  examples: {
    wrong: 'It took a hour.',
    flag: 'a',
    fix: 'an',
    right: 'It took an hour.',
    ok: ['She is a university student.', 'A European city.', 'Vitamin A is good.', 'Plan A is fine.', 'He has an MBA.', 'A one-way ticket.', 'A historic day.', 'An historic day.', 'I woke at 7 a.m. today.', 'An 18-year-old won.', 'A UFO landed.', 'A useful tip.', 'An honest man.'],
  },
  check(ctx: RuleContext) {
    const { text } = prepare(ctx)
    const isWord = ctx.dict ? (w: string) => known(ctx, w) : undefined
    const out: RuleHit[] = []
    const re = new RegExp(RE.source, RE.flags)
    let m: RegExpExecArray | null
    while ((m = re.exec(text))) {
      const art = m.groups!.art
      const next = m.groups!.next
      re.lastIndex = m.index + art.length // the next word can be an article too
      if (LABEL_BEFORE.test(text.slice(Math.max(0, m.index - 20), m.index))) continue
      if (STOP_AFTER.has(next.toLowerCase())) continue
      const exp = expectedArticle(next, isWord)
      if (!exp || exp === art.toLowerCase()) continue
      if (inZone(ctx, m.index, m.index + m[0].length)) continue
      const fix = art[0] === art[0].toUpperCase() ? exp[0].toUpperCase() + exp.slice(1) : exp
      const word = next.replace(/^["'“‘(]+/, '')
      out.push({
        offset: m.index,
        length: art.length,
        replacements: [fix],
        message: `${q(`${exp} ${word}`)}: ${exp === 'an' ? 'it starts with a vowel sound' : 'it starts with a consonant sound'}`,
        explanation: `The choice depends on the first sound, not the first letter: an hour, an MBA, an 8-year-old, but a university, a European, a one-off. Say it out loud and listen.`,
        learnMore: LINKS.aAn,
      })
    }
    return out
  },
}
