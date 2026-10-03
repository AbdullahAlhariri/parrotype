import { describe, expect, it } from 'vitest'
import {
  LAYOUTS,
  areAdjacent,
  bigramClass,
  composeDeadKey,
  decomposeDeadKey,
  isMirror,
  keyOf,
  keyboardRows,
  keystrokesFor,
  layoutFor,
  neighbourChar,
  sameFinger,
  sameHand,
} from './keyboard'

describe('layouts', () => {
  it('picks a layout per language', () => {
    expect(layoutFor('nl')).toBe('qwerty-us')
    expect(layoutFor('en')).toBe('qwerty-us')
    expect(layoutFor('ar')).toBe('arabic-101')
  })

  it('has 4 key rows plus a space bar, with legends and fingers', () => {
    for (const id of Object.keys(LAYOUTS) as (keyof typeof LAYOUTS)[]) {
      const rows = keyboardRows(id)
      expect(rows).toHaveLength(5)
      expect(rows[4][0].code).toBe('Space')
      for (const k of rows.flat()) {
        expect(k.finger).toBeGreaterThanOrEqual(0)
        expect(k.finger).toBeLessThanOrEqual(9)
        expect(k.hand).toBe(k.finger <= 4 ? 'L' : 'R')
      }
    }
    const home = keyboardRows('qwerty-us')[2]
    expect(home.map((k) => k.base).join('')).toBe("asdfghjkl;'")
    expect(home.filter((k) => k.home).map((k) => k.base)).toEqual(['f', 'j'])
  })

  it('maps Arabic 101 letters to their physical keys', () => {
    const rows = keyboardRows('arabic-101')
    expect(rows[1].slice(0, 12).map((k) => k.base).join('')).toBe('ضصثقفغعهخحجد')
    expect(rows[2].map((k) => k.base).join('')).toBe('شسيبلاتنمكط')
    expect(rows[3].map((k) => k.base)).toEqual(['ئ', 'ء', 'ؤ', 'ر', 'لا', 'ى', 'ة', 'و', 'ز', 'ظ'])
    expect(keyOf('ذ', 'arabic-101')?.code).toBe('Backquote')
    expect(keyOf('ة', 'arabic-101')?.code).toBe('KeyM')
    expect(keyOf('ى', 'arabic-101')?.code).toBe('KeyN')
    expect(keyOf('لا', 'arabic-101')?.code).toBe('KeyB')
    expect(keyOf('أ', 'arabic-101')).toMatchObject({ code: 'KeyH', shift: true })
    expect(keyOf('إ', 'arabic-101')).toMatchObject({ code: 'KeyY', shift: true })
    expect(keyOf('آ', 'arabic-101')).toMatchObject({ code: 'KeyN', shift: true })
    expect(keyOf('؟', 'arabic-101')).toMatchObject({ code: 'Slash', shift: true })
    expect(keyOf('،', 'arabic-101')).toMatchObject({ code: 'KeyK', shift: true })
  })

  it('maps Belgian AZERTY', () => {
    expect(keyOf('a', 'azerty-be')?.code).toBe('KeyQ')
    expect(keyOf('m', 'azerty-be')?.code).toBe('Semicolon')
    expect(keyOf('é', 'azerty-be')?.code).toBe('Digit2')
    expect(keyOf('w', 'azerty-be')?.code).toBe('KeyZ')
    expect(keyOf('<', 'azerty-be')?.col).toBe(-1)
  })
})

describe('keyOf', () => {
  it('finds base, shifted and accented characters', () => {
    expect(keyOf('t')).toMatchObject({ code: 'KeyT', row: 1, hand: 'L', finger: 3, shift: false })
    expect(keyOf('T')).toMatchObject({ code: 'KeyT', shift: true })
    expect(keyOf('?')).toMatchObject({ code: 'Slash', shift: true })
    expect(keyOf('ë')?.code).toBe('KeyE')
    expect(keyOf('É')?.code).toBe('KeyE')
    expect(keyOf('ë')?.code).toBe('KeyE') // decomposed ë
    expect(keyOf('😀')).toBeUndefined()
  })
})

describe('geometry', () => {
  it('knows neighbours on the staggered grid', () => {
    for (const n of 'wedxza') expect(areAdjacent('s', n)).toBe(true)
    expect(areAdjacent('s', 'f')).toBe(false)
    expect(areAdjacent('s', 'c')).toBe(false)
    expect(areAdjacent('r', 't')).toBe(true)
    expect(areAdjacent('e', '3')).toBe(true)
    expect(areAdjacent('a', 'a')).toBe(false)
    expect(areAdjacent('a', 'A')).toBe(false)
    expect(areAdjacent('R', 't')).toBe(true)
    expect(areAdjacent('d', 't')).toBe(false)
    // Arabic: ت (J) touches ة (M)
    expect(areAdjacent('ت', 'ة', 'arabic-101')).toBe(true)
    expect(areAdjacent('ي', 'ى', 'arabic-101')).toBe(false)
  })

  it('knows mirror keys, same finger and same hand', () => {
    expect(isMirror('d', 'k')).toBe(true)
    expect(isMirror('k', 'd')).toBe(true)
    expect(isMirror('f', 'j')).toBe(true)
    expect(isMirror('e', 'i')).toBe(true)
    expect(isMirror('d', 'j')).toBe(false)
    expect(sameFinger('e', 'c')).toBe(true)
    expect(sameFinger('r', 'g')).toBe(true)
    expect(sameFinger('e', 'e')).toBe(false)
    expect(sameFinger('e', 'r')).toBe(false)
    expect(sameHand('t', 'e')).toBe(true)
    expect(sameHand('t', 'h')).toBe(false)
  })

  it('finds the key one column over', () => {
    expect(neighbourChar('t', 1)).toBe('y')
    expect(neighbourChar('t', -1)).toBe('r')
    expect(neighbourChar('T', 1)).toBe('Y')
    expect(neighbourChar('q', -1)).toBeUndefined()
  })

  it('classifies bigrams by hand and finger', () => {
    expect(bigramClass('t', 'h')).toBe('alt')
    expect(bigramClass('e', 'r')).toBe('sameHand')
    expect(bigramClass('e', 'e')).toBe('sameFingerRepeat')
    expect(bigramClass('e', 'd')).toBe('sameFingerReach')
  })
})

describe('dead keys', () => {
  it('composes and decomposes US-International dead keys', () => {
    expect(composeDeadKey('"', 'e')).toBe('ë')
    expect(composeDeadKey("'", 'E')).toBe('É')
    expect(composeDeadKey('^', 'o', 'azerty-be')).toBe('ô')
    expect(decomposeDeadKey('ë')).toEqual({ mark: '"', letter: 'e' })
    expect(decomposeDeadKey('x')).toBeUndefined()
  })

  it('lists the key presses for a character', () => {
    expect(keystrokesFor('a')?.map((k) => k.code)).toEqual(['KeyA'])
    expect(keystrokesFor('ë')?.map((k) => [k.code, k.shift])).toEqual([
      ['Quote', true],
      ['KeyE', false],
    ])
    expect(keystrokesFor('é', 'azerty-be')?.map((k) => k.code)).toEqual(['Digit2'])
    expect(keystrokesFor('ê', 'azerty-be')?.map((k) => k.code)).toEqual(['BracketLeft', 'KeyE'])
    expect(keystrokesFor('ب', 'arabic-101')?.map((k) => k.code)).toEqual(['KeyF'])
    expect(keystrokesFor('ж')).toBeUndefined()
  })
})
