import { describe, expect, it } from 'vitest'
import { buildSegments, drawableIssues, issueAt, markKind, stepIssue } from './segments'
import { mkIssue } from './fixtures'

const TEXT = 'Hij word morgen 18. Ik vindt het leuk. Dat is eigelijk een goed idee.'

describe('markKind', () => {
  it('maps categories to underline styles', () => {
    expect(markKind({ category: 'spelling', confidence: 'high' })).toBe('spell')
    expect(markKind({ category: 'typo', confidence: 'medium' })).toBe('spell')
    expect(markKind({ category: 'grammar', confidence: 'high' })).toBe('grammar')
    expect(markKind({ category: 'capitalization', confidence: 'medium' })).toBe('grammar')
    expect(markKind({ category: 'style', confidence: 'high' })).toBe('hint')
    expect(markKind({ category: 'grammar', confidence: 'low' })).toBe('hint')
  })
})

describe('buildSegments', () => {
  it('returns one plain segment without issues', () => {
    expect(buildSegments(TEXT, [])).toEqual([{ start: 0, end: TEXT.length, text: TEXT }])
  })

  it('returns one empty segment for empty text', () => {
    expect(buildSegments('', [])).toEqual([{ start: 0, end: 0, text: '' }])
  })

  it('splits around issues and round-trips the text', () => {
    const issues = [mkIssue(TEXT, 'eigelijk', { category: 'spelling' }), mkIssue(TEXT, 'word'), mkIssue(TEXT, 'vindt')]
    const segs = buildSegments(TEXT, issues)
    expect(segs.map((s) => s.text).join('')).toBe(TEXT)
    expect(segs.filter((s) => s.issue).map((s) => s.text)).toEqual(['word', 'vindt', 'eigelijk'])
    for (const s of segs) expect(TEXT.slice(s.start, s.end)).toBe(s.text)
  })

  it('handles issues at the very start and end', () => {
    const t = 'eigelijk klopt het nietq'
    const segs = buildSegments(t, [mkIssue(t, 'eigelijk'), mkIssue(t, 'nietq')])
    expect(segs[0].issue?.text).toBe('eigelijk')
    expect(segs[segs.length - 1].issue?.text).toBe('nietq')
    expect(segs.map((s) => s.text).join('')).toBe(t)
  })

  it('drops overlapping, stale and out-of-range issues', () => {
    const a = mkIssue(TEXT, 'Hij word')
    const b = mkIssue(TEXT, 'word') // overlaps a
    const stale = { ...mkIssue(TEXT, 'leuk'), text: 'lekker' } // text no longer matches
    const out = { ...mkIssue(TEXT, 'idee'), offset: TEXT.length - 1 } // runs past the end
    const kept = drawableIssues(TEXT, [b, a, stale, out])
    expect(kept.map((i) => i.text)).toEqual(['Hij word'])
  })

  it('works with Arabic text (UTF-16 offsets)', () => {
    const t = 'ذهبت الى المدرسة'
    const segs = buildSegments(t, [mkIssue(t, 'الى', { lang: 'ar', category: 'spelling' })])
    expect(segs.map((s) => s.text)).toEqual(['ذهبت ', 'الى', ' المدرسة'])
  })
})

describe('issue navigation', () => {
  const issues = [mkIssue(TEXT, 'word'), mkIssue(TEXT, 'vindt'), mkIssue(TEXT, 'eigelijk')]

  it('finds the issue under the caret, including right after the word', () => {
    const i = TEXT.indexOf('vindt')
    expect(issueAt(issues, i)?.text).toBe('vindt')
    expect(issueAt(issues, i + 5)?.text).toBe('vindt')
    expect(issueAt(issues, i + 7)).toBeUndefined()
  })

  it('steps forward and backward with wrap-around', () => {
    expect(stepIssue(issues, 0, 1)?.text).toBe('word')
    expect(stepIssue(issues, TEXT.indexOf('Ik'), 1)?.text).toBe('vindt')
    expect(stepIssue(issues, TEXT.length, 1)?.text).toBe('word')
    expect(stepIssue(issues, TEXT.indexOf('Ik'), -1)?.text).toBe('word')
    expect(stepIssue(issues, 0, -1)?.text).toBe('eigelijk')
    expect(stepIssue(issues, 0, 1, issues[2].id)?.text).toBe('word')
    expect(stepIssue(issues, 0, -1, issues[0].id)?.text).toBe('eigelijk')
    expect(stepIssue([], 0, 1)).toBeUndefined()
  })
})
