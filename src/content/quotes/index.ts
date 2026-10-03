import type { Lang } from '@/types'
import type { Quote, QuoteLength } from './types'
import { NL_QUOTES } from './nl'
import { EN_QUOTES } from './en'
import { AR_QUOTES } from './ar'

export type { Quote, QuoteLength } from './types'
export { lengthOf } from './types'

export const QUOTES: Record<Lang, Quote[]> = { nl: NL_QUOTES, en: EN_QUOTES, ar: AR_QUOTES }

export const QUOTE_LENGTHS: QuoteLength[] = ['short', 'medium', 'long']

/** All quotes of one language, optionally of one length. */
export function quotesFor(lang: Lang, length?: QuoteLength): Quote[] {
  const all = QUOTES[lang]
  return length ? all.filter((x) => x.length === length) : all
}

/**
 * A random quote of the wanted length. Falls back to the nearest length when a language has
 * none of that length, and avoids `avoid` (usually the previous quote) when it can.
 */
export function pickQuote(lang: Lang, length: QuoteLength, rand: () => number = Math.random, avoid?: string): Quote {
  const order: QuoteLength[] = length === 'short' ? ['short', 'medium', 'long'] : length === 'long' ? ['long', 'medium', 'short'] : ['medium', 'short', 'long']
  for (const len of order) {
    const pool = quotesFor(lang, len)
    if (!pool.length) continue
    const fresh = pool.length > 1 ? pool.filter((x) => x.text !== avoid) : pool
    return fresh[Math.floor(rand() * fresh.length)]
  }
  return QUOTES[lang][0]
}
