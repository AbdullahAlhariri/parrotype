import { describe, expect, it } from 'vitest'
import { gradeAttempt } from './grade'
import { initialItem, itemReducer, nextHintLabel, type ItemState } from './ladder'
import { flashMs } from './flash'

const S = 'Hij wordt morgen twintig jaar.'
const wrong = gradeAttempt(S, 'Hij word morgen twintig jaar.', 'nl')
const right = gradeAttempt(S, S, 'nl')
const check = (s: ItemState, ok: boolean) => itemReducer(s, { type: 'check', grade: ok ? right : wrong, typed: ok ? S : wrong.typed })

describe('hint ladder', () => {
  it('a clean first check finishes the sentence', () => {
    const s = check(initialItem(), true)
    expect(s).toMatchObject({ phase: 'done', hint: 0, attempts: 1 })
    expect(s.first?.perfect).toBe(true)
  })

  it('each wrong check climbs one step: mark, letters, rule, reveal', () => {
    let s = check(initialItem(), false)
    expect(s).toMatchObject({ phase: 'feedback', hint: 1 })
    s = check(s, false)
    expect(s).toMatchObject({ phase: 'feedback', hint: 2 })
    s = check(s, false)
    expect(s).toMatchObject({ phase: 'feedback', hint: 3 })
    s = check(s, false)
    expect(s).toMatchObject({ phase: 'retype', hint: 4, attempts: 4 })
  })

  it('keeps the first attempt for scoring', () => {
    let s = check(initialItem(), false)
    s = check(s, true)
    expect(s.phase).toBe('done')
    expect(s.first).toBe(wrong)
    expect(s.firstTyped).toBe('Hij word morgen twintig jaar.')
    expect(s.grade).toBe(right)
  })

  it('the retype must be right before moving on', () => {
    let s = itemReducer(check(initialItem(), false), { type: 'reveal' })
    expect(s.phase).toBe('retype')
    s = check(s, false)
    expect(s).toMatchObject({ phase: 'retype', retypeMissed: true, attempts: 1 })
    s = check(s, true)
    expect(s.phase).toBe('done')
  })

  it('hint climbs on request, reveal jumps to the end', () => {
    let s = check(initialItem(), false)
    s = itemReducer(s, { type: 'hint' })
    expect(s.hint).toBe(2)
    s = itemReducer(s, { type: 'hint' })
    s = itemReducer(s, { type: 'hint' })
    expect(s).toMatchObject({ hint: 4, phase: 'retype' })
    expect(itemReducer(initialItem(), { type: 'hint' }).hint).toBe(0) // nothing to hint yet
  })

  it('names the next step', () => {
    expect([1, 2, 3, 4].map((h) => nextHintLabel(h as 1))).toEqual(['Show the letters', 'Show the rule', 'Show the answer', null])
  })
})

describe('flashMs', () => {
  it('grows with sentence length within sane bounds', () => {
    const short = flashMs('Hij wordt twintig.')
    const long = flashMs('Wordt het rapport dat de directeur vorige week heeft geschreven, morgen eindelijk besproken?')
    expect(short).toBeGreaterThanOrEqual(2200)
    expect(long).toBeGreaterThan(short)
    expect(long).toBeLessThanOrEqual(9000)
  })
})
