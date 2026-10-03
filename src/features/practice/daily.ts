import type { Lang, SessionRecord } from '@/types'
import { hashString, seeded } from '@/lib/random'
import { dayKey } from '@/lib/id'
import { sentenceToWords, wordList } from '@/engine'
import { storySentences } from '@/content/stories'

// The daily challenge: one story sentence, then common words, seeded by date and language
// so every load on the same day gets the same text.

export const DAILY_MS = 45_000
const TOTAL_WORDS = 200

export const dailySeed = (day: string, lang: Lang) => hashString(`parrotype-daily|${day}|${lang}`)

export interface DailyChallenge {
  day: string
  lang: Lang
  /** the story sentence the run opens with */
  sentence: string
  words: string[]
}

const startsSentence = (s: string, lang: Lang) => lang === 'ar' || /^\p{Lu}/u.test(s)

/** Narrative sentences of 6 to 16 words without dialogue quotes. */
export function dailySentencePool(lang: Lang): string[] {
  return storySentences(lang).filter((s) => {
    const n = s.split(/\s+/).length
    return n >= 6 && n <= 16 && !/["']/.test(s) && startsSentence(s, lang)
  })
}

export function dailyChallenge(lang: Lang, day: string = dayKey()): DailyChallenge {
  const rand = seeded(dailySeed(day, lang))
  const pool = dailySentencePool(lang)
  const sentence = pool.length ? pool[Math.floor(rand() * pool.length)] : ''
  const head = sentence ? sentenceToWords(sentence) : []
  const list = wordList(lang, 200).filter((w) => lang !== 'en' || w !== 'i')
  const words = [...head]
  while (words.length < TOTAL_WORDS && list.length) {
    let w = list[Math.floor(rand() * list.length)]
    for (let i = 0; i < 20 && (w === words[words.length - 1] || w === words[words.length - 2]); i++) {
      w = list[Math.floor(rand() * list.length)]
    }
    words.push(w)
  }
  return { day, lang, sentence, words }
}

export const dailyConfig = (day: string) => `daily ${day}`

/** Today's daily runs for a language, best first. */
export function dailyRuns(sessions: SessionRecord[], lang: Lang, day: string): SessionRecord[] {
  return sessions
    .filter((s) => s.mode === 'daily' && s.lang === lang && dayKey(new Date(s.at)) === day)
    .sort((a, b) => (b.wpm ?? 0) - (a.wpm ?? 0) || (b.accuracy ?? 0) - (a.accuracy ?? 0))
}

/** "Saturday 3 October" */
export function formatDay(day: string, locale = 'en-GB'): string {
  const [y, m, d] = day.split('-').map(Number)
  return new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(y, m - 1, d))
}
