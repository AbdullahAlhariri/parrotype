import type { Rule, RuleContext, RuleHit } from '@/types'
import { hitSpan, hitWords, next } from '../../helpers'
import { set } from '../../lexicon/nl'

// Spacing around punctuation and doubled words: frequent typing slips.

/** offset sits inside a skipped token (link, e-mail, @handle) */
const inSkipZone = (ctx: RuleContext, offset: number) =>
  ctx.tokens.some((t) => !t.isWord && t.text.length > 2 && offset >= t.start && offset < t.end)

export const spaceBefore: Rule = {
  id: 'nl.punct.space-before',
  lang: 'nl',
  category: 'punctuation',
  title: 'no space before , . ? !',
  confidence: 'high',
  check(ctx) {
    const out: RuleHit[] = []
    const re = /(?<=[\p{L}\p{N}])[ \t ]+([,.;:!?])(?![.\d)(DPp3/\\-])/gu
    for (const m of ctx.text.matchAll(re)) {
      const start = m.index ?? 0
      const mark = m[1]
      if (inSkipZone(ctx, start + m[0].length - 1)) continue
      out.push(
        hitSpan(start, start + m[0].length, [mark], {
          message: `No space before ‘${mark}’`,
          messageLocal: `Geen spatie vóór ‘${mark}’`,
          explanation: `In Dutch (as in English) punctuation marks stick to the word before them: ‘Hallo, hoe gaat het?’`,
          explanationLocal: `Leestekens staan in het Nederlands direct achter het woord: ‘Hallo, hoe gaat het?’`,
        }),
      )
    }
    return out
  },
}

export const spaceAfter: Rule = {
  id: 'nl.punct.space-after',
  lang: 'nl',
  category: 'punctuation',
  title: 'space after a comma',
  confidence: 'medium',
  check(ctx) {
    const out: RuleHit[] = []
    const re = /(?<=\p{Ll}{2})([,;])(?=\p{L}{2})|(?<=\p{Ll}{2})([.!?])(?=\p{Lu}\p{Ll})/gu
    for (const m of ctx.text.matchAll(re)) {
      const at = m.index ?? 0
      if (inSkipZone(ctx, at) || inSkipZone(ctx, at - 1)) continue
      const mark = m[1] ?? m[2]
      out.push(
        hitSpan(at, at + 1, [`${mark} `], {
          message: `Space after ‘${mark}’`,
          messageLocal: `Spatie na ‘${mark}’`,
          explanation: `Put a space after a comma or full stop: ‘ja, natuurlijk’.`,
          explanationLocal: `Na een komma of punt komt een spatie: ‘ja, natuurlijk’.`,
        }),
      )
    }
    return out
  },
}

/**
 * Words that are never correctly doubled. Left out on purpose: dat dat, die die, je je, ze ze, haar haar,
 * het het, zijn zijn, is is (Wat het is is ...) and particles like in/op ("Hij stapt in in Utrecht").
 */
const NEVER_DOUBLE = set('de een en van met ik hij we wij niet naar te maar ook nog')

export const repeatedWord: Rule = {
  id: 'nl.punct.repeated-word',
  lang: 'nl',
  category: 'typo',
  title: 'word typed twice',
  confidence: 'high',
  check(ctx) {
    const out: RuleHit[] = []
    ctx.words.forEach((t, i) => {
      const n = next(ctx, i)
      if (n < 0 || ctx.words[n].lower !== t.lower || !NEVER_DOUBLE.has(t.lower)) return
      out.push(
        hitWords(ctx, i, n, [t.text], {
          message: `‘${t.lower}’ is typed twice`,
          messageLocal: `‘${t.lower}’ staat er twee keer`,
          explanation: `The same word appears twice in a row. Remove one.`,
          explanationLocal: `Hetzelfde woord staat twee keer achter elkaar. Haal er één weg.`,
        }),
      )
    })
    return out
  },
}

export const punctuationRules: Rule[] = [spaceBefore, spaceAfter, repeatedWord]
