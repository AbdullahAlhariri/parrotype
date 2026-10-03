import type { Lang, WordMissStat } from '@/types'
import { tipFor, typoName } from '@/engine'

// One quiet tip between runs. Plain and specific, sentence case, no exclamation marks.

const GENERAL = [
  'Eyes on the text, not on your hands. Your fingers know more than you think.',
  'Typos cluster at the end of words when you rush. Finish the word, then speed up.',
  'Ten minutes a day beats one long session on Sunday.',
  "Kea are the world's only alpine parrots. They also take apart car wipers. Nobody's perfect.",
  'Accuracy first. Speed turns up on its own once the typos stop.',
  'A wrong key you fix still counts against accuracy. Slowing down a touch is cheaper.',
  'Rest your fingers on the home row. The bumps on F and J are there for you.',
  'Read one word ahead. Your fingers type this word while your eyes fetch the next.',
  'Press tab, then enter, to start over at any time.',
  'Esc opens the command palette. Every setting lives in there.',
  'Words you get wrong go to your weak spots, so you will meet them again.',
  'Shake out your hands after a few runs. Tired fingers make more typos.',
  'Swapped letters mean your hands raced each other. Keep an even rhythm.',
]

const BY_LANG: Record<Lang, string[]> = {
  nl: [
    '"ij" is two keys: i, then j.',
    'ik word, jij wordt, hij wordt. But: word jij? No t when jij comes after the verb.',
    'On US-International, " then e gives ë. Handy for ideeën and België.',
    'één means one, een means a. The accents are only there to tell them apart.',
    'Diminutives are always het-words: het huisje, het meisje.',
    "Past tense with 't kofschip: werkte, maar woonde.",
  ],
  en: [
    'i before e, except after c, unless the word is weird. English is like that.',
    "it's means it is. its means belonging to it.",
    'You type "the" more than any other word. It is worth making it one movement.',
    'Practise -ough words slowly: though, through, thought, tough.',
  ],
  ar: [
    'On the Arabic 101 layout, لا has its own key: B.',
    'Taa marbuta (ة) sits on M, haa (ه) on I.',
    'Shift + H gives أ, Shift + Y gives إ.',
    'The home row bumps are under ب and ت.',
  ],
}

/** A tip for run number `n`. Every third tip is personal when there is history to use. */
export function pickTip(lang: Lang, n: number, misses: Record<string, WordMissStat> = {}): string {
  const top = Object.values(misses)
    .filter((m) => m.count >= 2)
    .sort((a, b) => b.count - a.count || b.lastAt - a.lastAt)
  if (top.length && n % 3 === 2) {
    const m = top[(n / 3) % top.length | 0]
    if (m.kind && n % 2 === 0) {
      const name = typoName(m.kind, lang).en.toLowerCase()
      return `Your most frequent slip in "${m.word}" is ${name}. ${tipFor(m.kind, lang).en}`
    }
    const typed = m.typed[0]
    return typed
      ? `You typed "${typed}" for "${m.word}" ${m.count} times so far. Kees has written it in his little book.`
      : `"${m.word}" went wrong ${m.count} times so far. Kees has written it in his little book.`
  }
  const pool = [...BY_LANG[lang], ...GENERAL]
  return pool[n % pool.length]
}
