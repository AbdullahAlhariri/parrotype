import type { Lang, Token } from '@/types'

// The user writes in three languages, so a Dutch text may quote an English sentence (and the other way
// round). Rules and the spell layer skip sentences that are clearly in another language.
//
// The marker lists only hold words that are NOT also everyday words in the other language: English
// has 'is', 'we', 'die', 'van', 'met' and 'er', Dutch has 'was' and 'of'. With those in, "Is a deposit
// necessary, or can we pay when we arrive?" counted as Dutch and its typos went unflagged.

const MARKERS: Record<'nl' | 'en', ReadonlySet<string>> = {
  nl: new Set('de het een en ik je jij niet dat op te zijn voor naar maar ook wat hij zij wij heb heeft dit mijn hebben'.split(' ')),
  en: new Set('the and to you with are this that have it for not be my your were will would what they'.split(' ')),
}

const ARABIC = /[؀-ۿݐ-ݿ]/

/** true when the words of one sentence are clearly not in `lang` */
export function isForeignSentence(words: readonly Token[], lang: Lang): boolean {
  if (!words.length) return false
  const arabic = words.filter((t) => ARABIC.test(t.text)).length
  if (lang === 'ar') return arabic === 0
  if (arabic * 2 > words.length) return true
  const own = MARKERS[lang]
  const other = MARKERS[lang === 'nl' ? 'en' : 'nl']
  const o = words.filter((t) => other.has(t.lower) && !own.has(t.lower)).length
  const m = words.filter((t) => own.has(t.lower) && !other.has(t.lower)).length
  return o >= 3 && o > m * 2
}
