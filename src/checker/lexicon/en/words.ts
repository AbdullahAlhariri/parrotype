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
  be: 'been',
}

/** past simple -> base, for "When went you home?" -> "When did you go home?" */
export const PAST_TO_BASE: Readonly<Record<string, string>> = { went: 'go', came: 'come', ate: 'eat', said: 'say' }

/**
 * Regular -ed on an irregular verb (buyed -> bought). Checked in irregular.test.ts: no wrong form is in the
 * Hunspell lists (leaved, hided, teared and payed are, so they are left out).
 */
export const IRREGULAR_PAST: ReadonlyMap<string, string> = new Map(
  `
  buyed/bought bringed/brought catched/caught teached/taught thinked/thought fighted/fought seeked/sought
  goed/went comed/came becomed/became eated/ate drinked/drank swimmed/swam runned/ran writed/wrote
  speaked/spoke choosed/chose falled/fell feeled/felt keeped/kept meeted/met sayed/said selled/sold
  sended/sent sitted/sat sleeped/slept spended/spent standed/stood taked/took telled/told
  understanded/understood winned/won growed/grew knowed/knew throwed/threw drawed/drew hurted/hurt cutted/cut
  hitted/hit losed/lost maked/made gived/gave begined/began breaked/broke builded/built digged/dug
  drived/drove forgetted/forgot freezed/froze getted/got holded/held lended/lent rided/rode shaked/shook
  stealed/stole sticked/stuck striked/struck weared/wore finded/found feeded/fed flyed/flew forgived/forgave
  heared/heard layed/laid readed/read rised/rose shooted/shot shutted/shut sinked/sank slided/slid
  spinned/spun splitted/split spreaded/spread sweared/swore sweeped/swept swinged/swung weeped/wept
  blowed/blew bited/bit bleeded/bled breeded/bred meaned/meant setted/set stinked/stank withdrawed/withdrew
  overcomed/overcame
`
    .trim()
    .split(/\s+/)
    .map((p) => p.split('/') as [string, string]),
)
