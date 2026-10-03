import { describe, expect, test } from 'vitest'
import { KEES_MOODS, bubbleWords, nextBlink, nextFidget, sequenced } from './machine'
import { PARROT_TO_KEES } from '../ui/Parrot'

describe('Kees machine', () => {
  test('blinks every 2.5 to 7 s, double blinks are rare', () => {
    expect(nextBlink(() => 0).delay).toBe(2500)
    expect(nextBlink(() => 0.999).delay).toBeLessThanOrEqual(7000)
    expect(nextBlink(() => 0.1).double).toBe(true)
    expect(nextBlink(() => 0.5).double).toBe(false)
  })

  test('fidgets every 12 to 26 s', () => {
    const lo = nextFidget(() => 0)
    const hi = nextFidget(() => 0.999)
    expect(lo.delay).toBe(12000)
    expect(hi.delay).toBeLessThan(26000)
    expect(['tilt', 'ruffle', 'bob', 'glance']).toContain(hi.fidget)
  })

  test('bubble words are trimmed and empty ones dropped', () => {
    expect(bubbleWords()).toEqual([])
    expect(bubbleWords('  wordt. ')).toEqual(['wordt.'])
    expect(bubbleWords(['wordt.', ' ', 'wordt.'])).toEqual(['wordt.', 'wordt.'])
  })

  test('only repeat and talk reveal word by word', () => {
    const three = ['wordt.', 'wordt.', 'wordt.']
    expect(sequenced('repeat', three)).toBe(true)
    expect(sequenced('talk', three)).toBe(true)
    expect(sequenced('idle', three)).toBe(false)
    expect(sequenced('repeat', ['wordt.'])).toBe(false)
  })

  test('every old Parrot mood maps to a real Kees mood, and none of them is sad', () => {
    for (const m of Object.values(PARROT_TO_KEES)) expect(KEES_MOODS).toContain(m)
    expect(PARROT_TO_KEES.sad).toBe('oops')
  })
})
