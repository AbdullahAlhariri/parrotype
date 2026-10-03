import { describe, expect, test } from 'vitest'
import { matchScore, rank, words } from './fuzzy'

const items = [
  { group: 'go to', label: 'type' },
  { group: 'go to', label: 'stats' },
  { group: 'go to', label: 'settings' },
  { group: 'theme', label: 'kea dark' },
  { group: 'theme', label: 'kea light' },
  { group: 'theme', label: 'lorikeet dark' },
  { group: 'theme', label: 'macaw light' },
  { group: 'language', label: 'Nederlands', keywords: 'nl dutch' },
  { group: 'smooth caret', label: 'on' },
  { group: 'sound', label: 'off' },
]

describe('fuzzy palette matching', () => {
  test('words strips accents and punctuation', () => {
    expect(words('Théme › Kea-dark!')).toEqual(['theme', 'kea', 'dark'])
  })

  test('empty query keeps everything in order', () => {
    expect(rank('', items)).toEqual(items)
    expect(rank('  ', items)).toEqual(items)
  })

  test('every query word must prefix-match a different word', () => {
    expect(matchScore('the ke d', items[3])).not.toBeNull()
    expect(matchScore('kea kea', items[3])).toBeNull()
    expect(matchScore('ark', items[3])).toBeNull()
  })

  test('prefix matching across group and label', () => {
    const r = rank('th dark', items).map((i) => i.label)
    expect(r).toEqual(['kea dark', 'lorikeet dark'])
  })

  test('group prefix lists the group', () => {
    expect(rank('theme ', items).map((i) => i.label)).toEqual(['kea dark', 'kea light', 'lorikeet dark', 'macaw light'])
  })

  test('keywords match: dutch finds Nederlands', () => {
    expect(rank('dutch', items)[0].label).toBe('Nederlands')
    expect(rank('ned', items)[0].label).toBe('Nederlands')
  })

  test('closer matches rank first', () => {
    const r = rank('st', items).map((i) => i.label)
    expect(r[0]).toBe('stats')
    expect(r).not.toContain('settings')
    expect(rank('se', items)[0].label).toBe('settings')
  })

  test('leading > is ignored (Monkeytype habit)', () => {
    expect(rank('>sound', items)[0].group).toBe('sound')
  })
})
