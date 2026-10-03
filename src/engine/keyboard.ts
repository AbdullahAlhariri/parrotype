import type { Lang } from '@/types'

// Physical keyboard layouts: where each character lives, which finger presses it,
// and helpers for neighbour / mirror / same-finger questions used by the typo classifier.

export type LayoutId = 'qwerty-us' | 'azerty-be' | 'arabic-101'
export type Hand = 'L' | 'R'
/** 0 = left pinky, 1 = left ring, 2 = left middle, 3 = left index, 4 = left thumb, 5 = right thumb ... 9 = right pinky */
export type Finger = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

export interface KeyDef {
  /** KeyboardEvent.code of the physical key */
  code: string
  /** legend without shift ('' if the key types nothing useful) */
  base: string
  /** legend with shift */
  shift: string
  /** 0 = number row, 1 = top letter row, 2 = home row, 3 = bottom row, 4 = space bar */
  row: number
  /** column within the row (ANSI numbering; the ISO key left of Z is -1) */
  col: number
  /** horizontal position of the key's left edge in key units, row stagger included */
  x: number
  /** width in key units (1 for normal keys) */
  width: number
  hand: Hand
  finger: Finger
  /** has the tactile bump (F and J) */
  home?: boolean
  /** base / shift legend is a dead key (combines with the next letter) */
  dead?: 'base' | 'shift' | 'both'
}

/** Where one character is typed. */
export interface KeyPos {
  code: string
  row: number
  col: number
  x: number
  hand: Hand
  finger: Finger
  shift: boolean
}

export interface Layout {
  id: LayoutId
  name: string
  dir: 'ltr' | 'rtl'
  /** rows top to bottom, the last row is the space bar */
  rows: KeyDef[][]
}

const ROW_X0 = [0, 1.5, 1.75, 2.25]

const ANSI_CODES: string[][] = [
  ['Backquote', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal'],
  ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight', 'Backslash'],
  ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote'],
  ['KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash'],
]

// ISO boards: Backslash moves to the home row (next to Enter) and an extra key sits left of Z.
const ISO_CODES: string[][] = [
  ANSI_CODES[0],
  ANSI_CODES[1].slice(0, 12),
  [...ANSI_CODES[2], 'Backslash'],
  ['IntlBackslash', ...ANSI_CODES[3]],
]

const FINGERS: Record<string, Finger> = {
  Backquote: 0, Digit1: 0, KeyQ: 0, KeyA: 0, KeyZ: 0, IntlBackslash: 0,
  Digit2: 1, KeyW: 1, KeyS: 1, KeyX: 1,
  Digit3: 2, KeyE: 2, KeyD: 2, KeyC: 2,
  Digit4: 3, Digit5: 3, KeyR: 3, KeyT: 3, KeyF: 3, KeyG: 3, KeyV: 3, KeyB: 3,
  Digit6: 6, Digit7: 6, KeyY: 6, KeyU: 6, KeyH: 6, KeyJ: 6, KeyN: 6, KeyM: 6,
  Digit8: 7, KeyI: 7, KeyK: 7, Comma: 7,
  Digit9: 8, KeyO: 8, KeyL: 8, Period: 8,
  Digit0: 9, Minus: 9, Equal: 9, KeyP: 9, BracketLeft: 9, BracketRight: 9, Backslash: 9,
  Semicolon: 9, Quote: 9, Slash: 9,
  Space: 5,
}

/** Homologous keys: same finger and position on the other hand (d <-> k, f <-> j, ...). */
const MIRROR_PAIRS: [string, string][] = [
  ['Digit1', 'Digit0'], ['Digit2', 'Digit9'], ['Digit3', 'Digit8'], ['Digit4', 'Digit7'], ['Digit5', 'Digit6'],
  ['KeyQ', 'KeyP'], ['KeyW', 'KeyO'], ['KeyE', 'KeyI'], ['KeyR', 'KeyU'], ['KeyT', 'KeyY'],
  ['KeyA', 'Semicolon'], ['KeyS', 'KeyL'], ['KeyD', 'KeyK'], ['KeyF', 'KeyJ'], ['KeyG', 'KeyH'],
  ['KeyZ', 'Slash'], ['KeyX', 'Period'], ['KeyC', 'Comma'], ['KeyV', 'KeyM'], ['KeyB', 'KeyN'],
]
const MIRROR = new Map<string, string>(MIRROR_PAIRS.flatMap(([a, b]) => [[a, b], [b, a]]))

type Legends = { base: string[]; shift: string[] }[]

const chars = (s: string) => Array.from(s)

const QWERTY_US: Legends = [
  { base: chars('`1234567890-='), shift: chars('~!@#$%^&*()_+') },
  { base: chars('qwertyuiop[]\\'), shift: chars('QWERTYUIOP{}|') },
  { base: chars("asdfghjkl;'"), shift: chars('ASDFGHJKL:"') },
  { base: chars('zxcvbnm,./'), shift: chars('ZXCVBNM<>?') },
]

// Belgian AZERTY (Windows "Belgian (Period)"), ISO. ^ and ¨ are dead keys.
const AZERTY_BE: Legends = [
  { base: chars('²&é"\'(§è!çà)-'), shift: chars('³1234567890°_') },
  { base: chars('azertyuiop^$'), shift: chars('AZERTYUIOP¨*') },
  { base: chars('qsdfghjklmùµ'), shift: chars('QSDFGHJKLM%£') },
  { base: chars('<wxcvbn,;:='), shift: chars('>WXCVBN?./+') },
]

// Windows Arabic (101). Some keys type two characters (لا on B). Paired brackets are
// swapped as on the real layout (bidi mirroring). Letters verified against the report;
// shifted punctuation positions are best effort.
const ARABIC_101: Legends = [
  {
    base: ['ذ', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
    shift: ['ّ', '!', '@', '#', '$', '%', '^', '&', '*', ')', '(', '_', '+'],
  },
  {
    base: ['ض', 'ص', 'ث', 'ق', 'ف', 'غ', 'ع', 'ه', 'خ', 'ح', 'ج', 'د', '\\'],
    shift: ['َ', 'ً', 'ُ', 'ٌ', 'لإ', 'إ', '‘', '÷', '×', '؛', '>', '<', '|'],
  },
  {
    base: ['ش', 'س', 'ي', 'ب', 'ل', 'ا', 'ت', 'ن', 'م', 'ك', 'ط'],
    shift: ['ِ', 'ٍ', ']', '[', 'لأ', 'أ', 'ـ', '،', '/', ':', '"'],
  },
  {
    base: ['ئ', 'ء', 'ؤ', 'ر', 'لا', 'ى', 'ة', 'و', 'ز', 'ظ'],
    shift: ['~', 'ْ', '}', '{', 'لآ', 'آ', '’', ',', '.', '؟'],
  },
]

function buildRows(codes: string[][], legends: Legends, deadKeys: Record<string, KeyDef['dead']> = {}): KeyDef[][] {
  const rows = codes.map((rowCodes, row) => {
    const firstCol = rowCodes[0] === 'IntlBackslash' ? -1 : 0
    return rowCodes.map((code, i): KeyDef => {
      const col = firstCol + i
      const finger = FINGERS[code]
      const key: KeyDef = {
        code,
        base: legends[row].base[i] ?? '',
        shift: legends[row].shift[i] ?? '',
        row,
        col,
        x: ROW_X0[row] + col,
        width: 1,
        hand: finger <= 4 ? 'L' : 'R',
        finger,
      }
      if (code === 'KeyF' || code === 'KeyJ') key.home = true
      if (deadKeys[code]) key.dead = deadKeys[code]
      return key
    })
  })
  rows.push([{ code: 'Space', base: ' ', shift: ' ', row: 4, col: 0, x: 4, width: 6.25, hand: 'R', finger: 5 }])
  return rows
}

export const LAYOUTS: Record<LayoutId, Layout> = {
  'qwerty-us': {
    id: 'qwerty-us',
    name: 'US / US-International QWERTY',
    dir: 'ltr',
    rows: buildRows(ANSI_CODES, QWERTY_US),
  },
  'azerty-be': {
    id: 'azerty-be',
    name: 'Belgian AZERTY',
    dir: 'ltr',
    rows: buildRows(ISO_CODES, AZERTY_BE, { BracketLeft: 'both' }),
  },
  'arabic-101': {
    id: 'arabic-101',
    name: 'Arabic (101)',
    dir: 'rtl',
    rows: buildRows(ANSI_CODES, ARABIC_101),
  },
}

/** Default physical layout for a practice language. */
export const layoutFor = (lang: Lang): LayoutId => (lang === 'ar' ? 'arabic-101' : 'qwerty-us')

/** Rows of keys for rendering an on-screen keyboard (base + shift legends). */
export const keyboardRows = (layout: LayoutId = 'qwerty-us'): KeyDef[][] => LAYOUTS[layout].rows

/* ------------------------------------------------------------------ */
/* Character lookup                                                     */
/* ------------------------------------------------------------------ */

const charMaps = new Map<LayoutId, Map<string, KeyPos>>()
const codeMaps = new Map<LayoutId, Map<string, KeyDef>>()

function charMap(layout: LayoutId): Map<string, KeyPos> {
  let map = charMaps.get(layout)
  if (map) return map
  map = new Map()
  for (const row of LAYOUTS[layout].rows) {
    for (const k of row) {
      const pos = (shift: boolean): KeyPos => ({ code: k.code, row: k.row, col: k.col, x: k.x, hand: k.hand, finger: k.finger, shift })
      if (k.base && !map.has(k.base)) map.set(k.base, pos(false))
      if (k.shift && !map.has(k.shift)) map.set(k.shift, pos(true))
    }
  }
  charMaps.set(layout, map)
  return map
}

function codeMap(layout: LayoutId): Map<string, KeyDef> {
  let map = codeMaps.get(layout)
  if (!map) {
    map = new Map(LAYOUTS[layout].rows.flat().map((k) => [k.code, k]))
    codeMaps.set(layout, map)
  }
  return map
}

/** The key definition for a KeyboardEvent.code. */
export const keyByCode = (code: string, layout: LayoutId = 'qwerty-us'): KeyDef | undefined => codeMap(layout).get(code)

const stripLatinMarks = (c: string) => c.normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC')

/**
 * Where a character is typed. Characters made with a dead key (é on US-International)
 * map to the key of their base letter. Returns undefined for unknown characters.
 */
export function keyOf(char: string, layout: LayoutId = 'qwerty-us'): KeyPos | undefined {
  const map = charMap(layout)
  const direct = map.get(char)
  if (direct) return direct
  const nfc = char.normalize('NFC')
  if (nfc !== char && map.has(nfc)) return map.get(nfc)
  const plain = stripLatinMarks(nfc)
  if (plain !== nfc) {
    const base = map.get(plain)
    if (base) return base
  }
  const lower = nfc.toLowerCase()
  if (lower !== nfc && map.has(lower)) return { ...map.get(lower)!, shift: true }
  return undefined
}

const physical = (a: string, b: string, layout: LayoutId): [KeyPos, KeyPos] | null => {
  const p = keyOf(a, layout)
  const q = keyOf(b, layout)
  return p && q ? [p, q] : null
}

/** True when the two characters sit on different but touching keys (6 neighbours on a staggered board). */
export function areAdjacent(a: string, b: string, layout: LayoutId = 'qwerty-us'): boolean {
  const pq = physical(a, b, layout)
  if (!pq) return false
  const [p, q] = pq
  if (p.code === q.code || p.row > 3 || q.row > 3) return false
  return Math.hypot(p.x - q.x, p.row - q.row) <= 1.25 + 1e-9
}

/** True for homologous keys: the same finger and position on the other hand (d/k, f/j, e/i). */
export function isMirror(a: string, b: string, layout: LayoutId = 'qwerty-us'): boolean {
  const pq = physical(a, b, layout)
  return !!pq && MIRROR.get(pq[0].code) === pq[1].code
}

/** True when two different keys are pressed by the same finger (e and c, r and v). */
export function sameFinger(a: string, b: string, layout: LayoutId = 'qwerty-us'): boolean {
  const pq = physical(a, b, layout)
  return !!pq && pq[0].code !== pq[1].code && pq[0].finger === pq[1].finger
}

export function sameHand(a: string, b: string, layout: LayoutId = 'qwerty-us'): boolean {
  const pq = physical(a, b, layout)
  return !!pq && pq[0].hand === pq[1].hand
}

/**
 * The character on the key `dx` columns to the right (negative = left) in the same row,
 * typed with the same shift state. Used to detect "hands one key off" errors.
 */
export function neighbourChar(char: string, dx: number, layout: LayoutId = 'qwerty-us'): string | undefined {
  const p = keyOf(char, layout)
  if (!p || p.row > 3) return undefined
  const key = LAYOUTS[layout].rows[p.row].find((k) => k.col === p.col + dx)
  if (!key) return undefined
  return (p.shift ? key.shift : key.base) || undefined
}

/** Bigram timing class (Gentner): two hands, same hand, same finger repeat, same finger reach. */
export type BigramClass = 'alt' | 'sameHand' | 'sameFingerRepeat' | 'sameFingerReach'

export function bigramClass(a: string, b: string, layout: LayoutId = 'qwerty-us'): BigramClass {
  const pq = physical(a, b, layout)
  if (!pq) return 'alt'
  const [p, q] = pq
  if (p.code === q.code) return 'sameFingerRepeat'
  if (p.hand !== q.hand) return 'alt'
  return p.finger === q.finger ? 'sameFingerReach' : 'sameHand'
}

/* ------------------------------------------------------------------ */
/* Dead keys                                                            */
/* ------------------------------------------------------------------ */

const vowelsFor = (map: Record<string, string>) => {
  const out: Record<string, string> = { ...map }
  for (const [k, v] of Object.entries(map)) out[k.toUpperCase()] = v.toUpperCase()
  return out
}

const ACUTE = vowelsFor({ a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú', y: 'ý', c: 'ç' })
const DIAERESIS = vowelsFor({ a: 'ä', e: 'ë', i: 'ï', o: 'ö', u: 'ü', y: 'ÿ' })
const GRAVE = vowelsFor({ a: 'à', e: 'è', i: 'ì', o: 'ò', u: 'ù' })
const CIRCUMFLEX = vowelsFor({ a: 'â', e: 'ê', i: 'î', o: 'ô', u: 'û' })
const TILDE = vowelsFor({ a: 'ã', o: 'õ', n: 'ñ' })

const DEAD_KEYS: Partial<Record<LayoutId, Record<string, Record<string, string>>>> = {
  // US-International: ' " ` ^ ~ are dead keys (space after them gives the plain sign)
  'qwerty-us': { "'": ACUTE, '"': DIAERESIS, '`': GRAVE, '^': CIRCUMFLEX, '~': TILDE },
  'azerty-be': { '^': CIRCUMFLEX, '¨': DIAERESIS },
}

/** The character a dead key + letter produces (`"` + `e` = `ë` on US-International). */
export const composeDeadKey = (mark: string, letter: string, layout: LayoutId = 'qwerty-us'): string | undefined =>
  DEAD_KEYS[layout]?.[mark]?.[letter]

/** Splits a composed character into its dead key and base letter (`ë` = `"` + `e`). */
export function decomposeDeadKey(char: string, layout: LayoutId = 'qwerty-us'): { mark: string; letter: string } | undefined {
  const table = DEAD_KEYS[layout]
  if (!table) return undefined
  for (const [mark, combos] of Object.entries(table)) {
    for (const [letter, out] of Object.entries(combos)) if (out === char) return { mark, letter }
  }
  return undefined
}

/**
 * The key presses that produce a character: one key, or a dead key followed by a letter.
 * Undefined if the layout cannot type it.
 */
export function keystrokesFor(char: string, layout: LayoutId = 'qwerty-us'): KeyPos[] | undefined {
  const direct = charMap(layout).get(char.normalize('NFC'))
  if (direct) return [direct]
  const dk = decomposeDeadKey(char.normalize('NFC'), layout)
  if (dk) {
    const m = charMap(layout).get(dk.mark)
    const l = charMap(layout).get(dk.letter)
    if (m && l) return [m, l]
  }
  return undefined
}
