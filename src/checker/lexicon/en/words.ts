// Small English word helpers for building fixes (verb forms, closed lists).

export const set = (words: string): ReadonlySet<string> => new Set(words.trim().split(/\s+/))

const IRREGULAR_3SG: Record<string, string> = { have: 'has', do: 'does', go: 'goes', be: 'is' }
const IRREGULAR_BASE: Record<string, string> = { has: 'have', does: 'do', goes: 'go', is: 'be' }

/** like -> likes, watch -> watches, study -> studies, have -> has */
export function thirdPerson(verb: string): string {
  const v = verb.toLowerCase()
  if (IRREGULAR_3SG[v]) return IRREGULAR_3SG[v]
  if (/(?:s|sh|ch|x|z|o)$/.test(v)) return `${v}es`
  if (/[^aeiou]y$/.test(v)) return `${v.slice(0, -1)}ies`
  return `${v}s`
}

/** likes -> like, watches -> watch, studies -> study, has -> have */
export function baseForm(verb: string): string {
  const v = verb.toLowerCase()
  if (IRREGULAR_BASE[v]) return IRREGULAR_BASE[v]
  if (/[^aeiou]ies$/.test(v)) return `${v.slice(0, -3)}y`
  if (/(?:ss|sh|ch|x|z)es$/.test(v)) return v.slice(0, -2)
  if (v.endsWith('s') && !v.endsWith('ss')) return v.slice(0, -1)
  return v
}

/** past participle -> past simple, for "I have seen it yesterday" -> "I saw it yesterday" */
export const PARTICIPLE_TO_PAST: Readonly<Record<string, string>> = {
  been: 'was',
  gone: 'went',
  seen: 'saw',
  done: 'did',
  made: 'made',
  met: 'met',
  bought: 'bought',
  eaten: 'ate',
  written: 'wrote',
  taken: 'took',
  given: 'gave',
  got: 'got',
  left: 'left',
  sent: 'sent',
  spent: 'spent',
  found: 'found',
  told: 'told',
  heard: 'heard',
  won: 'won',
  lost: 'lost',
  paid: 'paid',
  visited: 'visited',
  finished: 'finished',
  started: 'started',
  arrived: 'arrived',
  called: 'called',
  moved: 'moved',
  played: 'played',
  watched: 'watched',
  worked: 'worked',
  lived: 'lived',
}

/** base verb -> past participle, for "I live here since 2015" -> "I have lived here since 2015" */
export const BASE_TO_PARTICIPLE: Readonly<Record<string, string>> = {
  live: 'lived',
  work: 'worked',
  study: 'studied',
  know: 'known',
  am: 'been',
  are: 'been',
  teach: 'taught',
  play: 'played',
  own: 'owned',
  wait: 'been waiting',
  stay: 'stayed',
  learn: 'been learning',
}

/** past simple -> base, for "When went you home?" -> "When did you go home?" */
export const PAST_TO_BASE: Readonly<Record<string, string>> = { went: 'go', came: 'come', ate: 'eat', said: 'say' }
