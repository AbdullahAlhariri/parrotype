import { describe, expect, it } from 'vitest'
import { addFixed, fixedFromReview, fixedFromSuggestion, isFixed, materializeFixed, MAX_FIXED, remapFixed, srcOf } from './fixed'
import { nestItemsFrom, summarize } from './report'
import { planRecord } from './record'
import { foundInReview } from '../useWriteSession'
import { mkIssue } from './fixtures'

const T = 'Hij word morgen 18. Ik vindt het leuk.'
const word = () => mkIssue(T, 'word', { ruleId: 'nl.dt.hij-wordt', replacements: ['wordt'], message: 'After ‘hij’: ‘wordt’', explanation: 'hij + stem + t' })
const vindt = (text = T) => mkIssue(text, 'vindt', { ruleId: 'nl.dt.ik-stem', replacements: ['vind'], message: 'With ‘ik’ there is no t' })

/** what the editor does: replace the issue with rep and note the fix */
function applyFix(text: string, i: ReturnType<typeof word>, rep: string) {
  const next = text.slice(0, i.offset) + rep + text.slice(i.offset + i.length)
  return { next, entry: fixedFromSuggestion(i, rep, text) }
}

describe('fixed mistakes', () => {
  it('keeps a fix from the underline with its sentence as written', () => {
    const { next, entry } = applyFix(T, word(), 'wordt')
    expect(next).toBe('Hij wordt morgen 18. Ik vindt het leuk.')
    expect(entry.fixed).toBe('suggestion')
    expect(entry.context).toBe('Hij word morgen 18.')
    expect(entry.context.slice(entry.offset, entry.offset + entry.length)).toBe('word')
    expect(entry.at).toEqual({ offset: 4, length: 5 })
    expect(entry.id).not.toBe(word().id)
    expect(isFixed(entry)).toBe(true)
    expect(isFixed(word())).toBe(false)
    expect(srcOf(entry, next)).toBe(entry.context)
    expect(srcOf(word(), T)).toBe(T)
  })

  it('puts the replacement that was picked first', () => {
    const i = { ...word(), replacements: ['wordt', 'werd'] }
    expect(fixedFromSuggestion(i, 'werd', T).replacements).toEqual(['werd', 'wordt'])
  })

  it('reuses the id of a mistake an earlier finish already recorded', () => {
    expect(fixedFromSuggestion(word(), 'wordt', T, [word().id]).id).toBe(word().id)
  })

  it('follows edits elsewhere and loses its place when the fixed word is edited again', () => {
    const { next, entry } = applyFix(T, word(), 'wordt')
    const moved = remapFixed([entry], next, 'Nou. ' + next)
    expect(moved[0].at).toEqual({ offset: 9, length: 5 })
    const edited = remapFixed([entry], next, next.replace('wordt', 'werdt'))
    expect(edited[0].at).toBeNull()
    expect(remapFixed(edited, next, next + ' Ja.')).toBe(edited)
  })

  it('forgets a fix that was undone', () => {
    const { next, entry } = applyFix(T, word(), 'wordt')
    expect(remapFixed([entry], next, T)).toEqual([])
    // the same word typed differently is an edit, not an undo
    expect(remapFixed([entry], next, next.replace('wordt', 'woord'))[0].at).toBeNull()
  })

  it('materializes against the final text, with later fixes in the same sentence', () => {
    const t = 'Hij word morgen 18 en ik vindt dat leuk.'
    const a = applyFix(t, mkIssue(t, 'word', { ruleId: 'nl.dt.hij-wordt', replacements: ['wordt'] }), 'wordt')
    const b = applyFix(a.next, vindt(a.next), 'vind')
    const list = remapFixed([a.entry], a.next, b.next).concat(b.entry)
    const [fa, fb] = materializeFixed(b.next, list, [])
    expect(b.next).toBe('Hij wordt morgen 18 en ik vind dat leuk.')
    expect(fa.context).toBe('Hij word morgen 18 en ik vind dat leuk.')
    expect(fa.context.slice(fa.offset, fa.offset + fa.length)).toBe('word')
    expect(fa.target).toBe('Hij wordt morgen 18 en ik vind dat leuk.')
    expect(fb.context).toBe('Hij wordt morgen 18 en ik vindt dat leuk.')
    expect('at' in fa).toBe(false)
  })

  it('corrects what is still wrong in the sentence for the nest target', () => {
    const t = 'Hij word morgen 18 en ik vindt dat leuk.'
    const a = applyFix(t, mkIssue(t, 'word', { ruleId: 'nl.dt.hij-wordt', replacements: ['wordt'] }), 'wordt')
    const left = vindt(a.next)
    const [f] = materializeFixed(a.next, [a.entry], [left])
    expect(f.target).toBe('Hij wordt morgen 18 en ik vind dat leuk.')
  })

  it('falls back to the stored sentence when the fix lost its place', () => {
    const { next, entry } = applyFix(T, word(), 'wordt')
    const lost = remapFixed([entry], next, next.replace('wordt', 'werd'))
    const [f] = materializeFixed(next.replace('wordt', 'werd'), lost, [])
    expect(f.context).toBe('Hij word morgen 18.')
    expect(f.target).toBeUndefined()
  })

  it('caps the list', () => {
    const { entry } = applyFix(T, word(), 'wordt')
    expect(addFixed(undefined, Array(MAX_FIXED + 5).fill(entry))).toHaveLength(MAX_FIXED)
  })

  it('counts fixed mistakes in the report, the nest and the stats', () => {
    const a = applyFix(T, word(), 'wordt')
    const b = applyFix(a.next, vindt(a.next), 'vind')
    const final = b.next
    const fixed = materializeFixed(final, remapFixed([a.entry], a.next, final).concat(b.entry), [])
    const s = summarize(final, fixed)
    expect(s.mistakes).toBe(2)
    expect(s.fixedFromMarks).toBe(2)
    expect(s.left).toBe(0)
    expect(s.rules.map((r) => [r.ruleId, r.fixed])).toEqual([
      ['nl.dt.hij-wordt', 1],
      ['nl.dt.ik-stem', 1],
    ])
    expect(s.repeat).toBe('wordt')
    const nest = nestItemsFrom(final, fixed, 'nl')
    expect(nest.map((n) => [n.target, n.wrong])).toEqual([
      ['Hij wordt morgen 18.', ['Hij word morgen 18.']],
      ['Ik vind het leuk.', ['Ik vindt het leuk.']],
    ])
    const plan = planRecord(fixed, 5000)
    expect(plan.fresh).toHaveLength(2)
    // finishing again does not count them twice
    expect(planRecord(fixed, 9000, plan.recorded).fresh).toHaveLength(0)
  })

  it('mixes fixed and remaining mistakes without applying offsets to the wrong text', () => {
    const a = applyFix(T, word(), 'wordt')
    const left = vindt(a.next)
    const fixed = materializeFixed(a.next, [a.entry], [left])
    const all = [left, ...fixed]
    const s = summarize(a.next, all)
    expect(s.mistakes).toBe(2)
    expect(s.left).toBe(1)
    const nest = nestItemsFrom(a.next, all, 'nl')
    expect(nest.map((n) => n.target)).toEqual(['Ik vind het leuk.', 'Hij wordt morgen 18.'])
  })

  it('a style hint that was taken is not a mistake and not a hint any more', () => {
    const hint = mkIssue(T, 'leuk', { category: 'style', replacements: ['fijn'] })
    const { next, entry } = applyFix(T, hint, 'fijn')
    const s = summarize(next, materializeFixed(next, [entry], []))
    expect(s.mistakes).toBe(0)
    expect(s.hints).toBe(0)
  })
})

describe('self-review', () => {
  it('finds the mistakes the writer edited and that are gone after the re-check', () => {
    const reviewed = [word(), vindt()]
    const after = [vindt()]
    const found = foundInReview(reviewed, after, new Set([word().id]))
    expect(found.map((i) => i.text)).toEqual(['word'])
    // edited but still wrong in the same way: not found
    expect(foundInReview(reviewed, [word(), vindt()], new Set([word().id]))).toEqual([])
    // gone without being edited (a fix elsewhere moved things): not credited to the writer
    expect(foundInReview(reviewed, [], new Set())).toEqual([])
  })

  it('stores found mistakes with their sentence as written', () => {
    const [f] = fixedFromReview([word()], T)
    expect(f.fixed).toBe('self')
    expect(f.at).toBeNull()
    expect(f.context).toBe('Hij word morgen 18.')
    const s = summarize('Hij wordt morgen 18. Ik vindt het leuk.', materializeFixed('x', [f], []))
    expect(s.mistakes).toBe(1)
    expect(s.fixedFromMarks).toBe(0)
    // no corrected sentence is known for sure, so grammar stays out of the nest
    expect(nestItemsFrom('x', materializeFixed('x', [f], []), 'nl')).toEqual([])
  })
})
