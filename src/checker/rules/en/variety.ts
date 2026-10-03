import type { RuleContext, RuleHit, Token } from '@/types'
import { preserveCase } from '../../engine'
import { izeIse, swapIzeIse, UK_TO_US, US_TO_UK } from '../../lexicon/en'
import { dictVariant, inZone, q, type EnRule } from './shared'

// American vs British spelling (english-errors.md 4.3). Either variety is fine; mixing them is the slip.
// With the user's dictionary we know their variety and flag the other one; without it we flag whichever
// variety is in the minority. -ize/-ise is separate: Oxford spelling (-ize with British spelling) is
// correct British English, so only a mix of -ize and -ise inside one text counts.

interface Marked {
  t: Token
  other: string
}

const NAME = { us: 'American', gb: 'British' } as const

function collect(ctx: RuleContext) {
  const us: Marked[] = []
  const gb: Marked[] = []
  const ize: Marked[] = []
  const ise: Marked[] = []
  for (const t of ctx.words) {
    if (inZone(ctx, t.start, t.end)) continue
    const w = t.lower
    const toUk = US_TO_UK.get(w)
    const toUs = UK_TO_US.get(w)
    if (toUk) us.push({ t, other: toUk })
    else if (toUs) gb.push({ t, other: toUs })
    const z = izeIse(w)
    if (z) (z === 'ize' ? ize : ise).push({ t, other: swapIzeIse(t.text) })
  }
  return { us, gb, ize, ise }
}

export const variety: EnRule = {
  id: 'en.variety',
  lang: 'en',
  category: 'spelling',
  title: 'American and British spelling mixed',
  confidence: 'medium',
  examples: {
    wrong: 'My favorite colour is blue, and my favorite flavor is lemon.',
    flag: 'colour',
    fix: 'color',
    right: 'My favorite color is blue, and my favorite flavor is lemon.',
    ok: ['My favourite colour is blue.', 'My favorite color is blue.', 'The program at the theatre was long.'],
  },
  check(ctx) {
    const variant = dictVariant(ctx)
    const { us, gb } = collect(ctx)
    // the variety of the words we flag
    let side: 'us' | 'gb'
    if (variant) side = variant === 'us' ? 'gb' : 'us'
    else if (us.length && gb.length) side = us.length < gb.length ? 'us' : 'gb'
    else return []
    const keep = side === 'us' ? 'gb' : 'us'
    return (side === 'us' ? us : gb).map(({ t, other }): RuleHit => {
      const fix = preserveCase(t.text, other)
      return {
        offset: t.start,
        length: t.end - t.start,
        replacements: [fix],
        message: variant
          ? `${q(t.text)} is ${NAME[side]} spelling; your English is set to ${NAME[keep]}: ${q(fix)}`
          : `${q(t.text)} is ${NAME[side]} spelling; the rest of this text is ${NAME[keep]}: ${q(fix)}`,
        explanation: `Both spellings are correct on their own, mixing them in one text isn't. American: color, center, traveled. British: colour, centre, travelled.${variant ? ' You can switch variety in settings.' : ''}`,
      }
    })
  },
}

export const izeIseMix: EnRule = {
  id: 'en.ize-ise',
  lang: 'en',
  category: 'spelling',
  title: '-ize and -ise mixed',
  confidence: 'medium',
  examples: {
    wrong: 'We need to organize the party and realise the plan.',
    flag: 'realise',
    fix: 'realize',
    right: 'We need to organize the party and realize the plan.',
    ok: ['We need to organise the party and realise the plan.', 'We advertise, exercise and surprise.', 'Otherwise we organize it.'],
  },
  check(ctx) {
    const { ize, ise } = collect(ctx)
    if (!ize.length || !ise.length) return []
    const variant = dictVariant(ctx)
    // flag -ise for American, -ize for British (the en-GB list is -ise), else the smaller group (tie: -ise)
    const flagIse = variant ? variant === 'us' : ise.length <= ize.length
    return (flagIse ? ise : ize).map(({ t, other }): RuleHit => ({
      offset: t.start,
      length: t.end - t.start,
      replacements: [other],
      message: `${q(t.text)} and ${q((flagIse ? ize : ise)[0].t.text)} in one text: pick one ending, ${q(other)}`,
      explanation: `-ize and -ise are both correct (British English allows either), but stick to one ending throughout a text: organize and realize, or organise and realise.`,
    }))
  },
}

export const varietyRules: EnRule[] = [variety, izeIseMix]
