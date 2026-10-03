import type { RuleHit } from '@/types'
import { preserveCase } from '../../engine'
import { EN_MISSPELLINGS, UK_TO_US, US_TO_UK } from '../../lexicon/en'
import { dictVariant, inZone, q, regexRule, type EnRule } from './shared'

// Spelling beyond the dictionary (english-errors.md 1.4, rules 34-38) plus the misspelling map.

export const alot = regexRule({
  id: 'en.alot',
  title: 'alot → a lot',
  category: 'spelling',
  confidence: 'high',
  re: /\balot\b/gi,
  fix: () => ['a lot'],
  msg: { message: `${q('a lot')} is always two words`, explanation: `Like ‘a little’ and ‘a bit’: a lot. (‘allot’ is a different word: to give out.)` },
  examples: { wrong: 'I like it alot.', flag: 'alot', fix: 'a lot', right: 'I like it a lot.', ok: ['Allot time for it.'] },
})

const FUSED: Record<string, string> = {
  eachother: 'each other',
  infront: 'in front',
  atleast: 'at least',
  incase: 'in case',
  everytime: 'every time',
  aswell: 'as well',
  ofcourse: 'of course',
  noone: 'no one',
  inspite: 'in spite',
}

export const fusedWords = regexRule({
  id: 'en.fused-words',
  title: 'eachother → each other',
  category: 'spelling',
  confidence: 'high',
  re: /\b(?:eachother|infront|atleast|incase|everytime|aswell|ofcourse|noone|inspite)\b/gi,
  fix: (f) => [FUSED[f.text.toLowerCase()]],
  msg: (_f, fixes) => ({
    message: `Two words in English: ${q(fixes[0]?.toLowerCase() ?? '')}`,
    explanation: `Dutch glues words together (elkaar, tenminste), English often keeps them apart: each other, at least, in front, as well.`,
  }),
  examples: { wrong: 'We help eachother every day.', flag: 'eachother', fix: 'each other', right: 'We help each other every day.', ok: ['Everyone is here.', 'Nobody came.'] },
})

const DEFINITELY_RE = /\b(?:definately|definatly|definetly|definitly|defenitely|definitley|defintely)\b/gi

export const definitely = regexRule({
  id: 'en.definitely',
  title: 'definately → definitely',
  category: 'spelling',
  confidence: 'high',
  re: DEFINITELY_RE,
  fix: () => ['definitely'],
  msg: { message: `It's ${q('definitely')}`, explanation: `It contains the word finite: defi-nite-ly. No a anywhere.` },
  examples: { wrong: 'I will definately come.', flag: 'definately', fix: 'definitely', right: 'I will definitely come.', ok: [] },
})

export const defiantly = regexRule({
  id: 'en.defiantly',
  title: 'defiantly → definitely?',
  category: 'spelling',
  confidence: 'low',
  strictOnly: true,
  re: /\b(?:will|would|I|I'll|am|was|is|be|'ll)\s+(?<w>defiantly)\b/gi,
  target: 'w',
  fix: () => ['definitely'],
  msg: { message: `Did you mean ${q('definitely')}?`, explanation: `‘defiantly’ means rebelliously, refusing to obey. Autocorrect loves to swap these two.` },
  examples: { wrong: 'I will defiantly be there.', flag: 'defiantly', fix: 'definitely', right: 'I will definitely be there.', ok: ['She defiantly refused.'] },
})

export const offCourse = regexRule({
  id: 'en.off-course',
  title: 'off course → of course',
  category: 'spelling',
  confidence: 'high',
  re: /(?<=^|[.!?,]\s*)[Oo]ff\s+course\b(?=\s*[,.!?]|\s+(?:I|we|you|he|she|they|it|not)\b)/g,
  fix: () => ['of course'],
  msg: { message: `Here you mean ${q('of course')} (one f)`, explanation: `‘of course’ means natuurlijk. ‘off course’ means not on the planned route: the ship drifted off course.` },
  examples: { wrong: 'Off course I will help.', flag: 'Off course', fix: 'Of course', right: 'Of course I will help.', ok: ['The plane went off course.'] },
})

/* ------------------------------------------------------------------ */
/* Misspelling map                                                     */
/* ------------------------------------------------------------------ */

/** forms the dedicated rules above already explain better */
const COVERED = new Set(['alot', ...Object.keys(FUSED)])
const isCovered = (w: string) => COVERED.has(w) || new RegExp(`^${DEFINITELY_RE.source}$`, 'i').test(w)

export const misspelling: EnRule = {
  id: 'en.misspelling',
  lang: 'en',
  category: 'spelling',
  title: 'commonly misspelled words',
  confidence: 'high',
  examples: { wrong: 'I recieved your adress.', flag: 'recieved', fix: 'received', right: 'I received your address.', ok: ['The calendar is on the wall.', 'Lightning struck twice.'] },
  check(ctx) {
    const out: RuleHit[] = []
    const variant = dictVariant(ctx)
    for (const t of ctx.words) {
      const lower = t.lower
      const hit = EN_MISSPELLINGS.get(lower) ?? inflected(lower)
      if (!hit || isCovered(lower) || inZone(ctx, t.start, t.end)) continue
      let fixes = [hit.right]
      const us = UK_TO_US.get(hit.right)
      const uk = US_TO_UK.get(hit.right)
      // the list has a few British forms (neighbour, fulfil): offer both, the user's variety first
      if (us) fixes = variant === 'gb' ? [hit.right, us] : [us, hit.right]
      else if (uk) fixes = variant === 'gb' ? [uk, hit.right] : [hit.right, uk]
      out.push({
        offset: t.start,
        length: t.end - t.start,
        replacements: fixes.map((r) => preserveCase(t.text, r)),
        message: `It's spelled ${q(fixes[0])}`,
        explanation: hit.note ?? `A common slip. The usual spelling is ${fixes.join(' or ')}.`,
      })
    }
    return out
  },
}

const SIBILANT = /(?:s|x|z|ch|sh)$/

/** recieved -> received, adresses -> addresses: regular endings on top of the listed base forms */
function inflected(lower: string): { right: string; note?: string } | undefined {
  const base = (cut: number) => (lower.length - cut >= 4 ? EN_MISSPELLINGS.get(lower.slice(0, -cut)) : undefined)
  const make = (b: ReturnType<typeof base>, right: string | null) => (b && right ? { right, note: b.note } : undefined)
  let b
  if (lower.endsWith('es') && (b = base(2)) && SIBILANT.test(b.right)) return make(b, `${b.right}es`)
  if (lower.endsWith('s') && (b = base(1)) && !SIBILANT.test(b.right) && !b.right.endsWith('y')) return make(b, `${b.right}s`)
  if (lower.endsWith('d') && (b = base(1)) && b.right.endsWith('e')) return make(b, `${b.right}d`)
  if (lower.endsWith('ed') && (b = base(2)) && !/[ey]$/.test(b.right)) return make(b, `${b.right}ed`)
  if (lower.endsWith('ing') && (b = base(3)) && !b.right.endsWith('y')) {
    return make(b, b.right.endsWith('e') ? `${b.right.slice(0, -1)}ing` : `${b.right}ing`)
  }
  return undefined
}

export const spellingRules: EnRule[] = [alot, fusedWords, definitely, defiantly, offCourse, misspelling]
