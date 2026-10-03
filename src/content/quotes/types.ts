export type QuoteLength = 'short' | 'medium' | 'long'

export interface Quote {
  /** the text to type: straight quotes and apostrophes only, no line breaks */
  text: string
  /** who said or wrote it, e.g. "Multatuli, Max Havelaar (1860)" or "Dutch proverb" */
  source: string
  length: QuoteLength
  /** plain-English meaning, for proverbs */
  meaning?: string
  /** small editorial changes, e.g. modernised spelling */
  note?: string
}

/** Character thresholds for quote lengths: short up to 35 (a proverb), medium up to 100, long above. */
export const lengthOf = (text: string): QuoteLength => {
  const n = Array.from(text).length
  return n <= 35 ? 'short' : n <= 100 ? 'medium' : 'long'
}

/** Builds a Quote and derives its length from the text, so the two never disagree. */
export const q = (text: string, source: string, extra: Pick<Quote, 'meaning' | 'note'> = {}): Quote => ({
  text,
  source,
  length: lengthOf(text),
  ...extra,
})
