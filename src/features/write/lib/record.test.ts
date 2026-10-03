// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { planRecord } from './record'
import { mkIssue } from './fixtures'

const T = 'Hij word morgen 18. Ik vindt het leuk. Een hele mooie dag.'
const word = mkIssue(T, 'word', { id: 'dt:word#0', ruleId: 'dt', replacements: ['wordt'] })
const vindt = mkIssue(T, 'vindt', { id: 'ik:vindt#0', ruleId: 'ik', replacements: ['vind'] })
const hint = mkIssue(T, 'hele', { id: 'style:hele#0', ruleId: 'style', category: 'style', replacements: ['heel'] })

describe('planRecord', () => {
  it('records everything (but hints) the first time', () => {
    const p = planRecord([word, vindt, hint], 90_000)
    expect(p.session).toBe(true)
    expect(p.ms).toBe(90_000)
    expect(p.fresh.map((i) => i.id)).toEqual(['dt:word#0', 'ik:vindt#0'])
    expect(p.recorded).toEqual({ ms: 90_000, keys: ['dt:word#0', 'ik:vindt#0'] })
  })

  it('finishing again only adds new mistakes and the extra time', () => {
    const first = planRecord([word], 60_000).recorded
    const again = planRecord([word, vindt], 75_000, first)
    expect(again.fresh.map((i) => i.id)).toEqual(['ik:vindt#0'])
    expect(again.ms).toBe(15_000)
    expect(again.session).toBe(true)
    expect(again.recorded.keys).toEqual(['dt:word#0', 'ik:vindt#0'])
  })

  it('does not add an empty session for a second look at the same text', () => {
    const first = planRecord([word, vindt], 60_000).recorded
    const again = planRecord([word, vindt], 61_000, first)
    expect(again.session).toBe(false)
    expect(again.fresh).toEqual([])
  })

  it('counts a long stretch of extra writing as its own session even without new mistakes', () => {
    const first = planRecord([word], 60_000).recorded
    expect(planRecord([word], 120_000, first).session).toBe(true)
  })
})
