import { describe, expect, it } from 'vitest'
import { diffRange, ParagraphCache, planCheck, reId, remapIssues, shiftIssues, splitParagraphs } from './paragraphs'
import { mkIssue } from './fixtures'

describe('diffRange', () => {
  it('finds insertions, deletions and replacements', () => {
    expect(diffRange('abc', 'abc')).toBeNull()
    expect(diffRange('abc', 'abXc')).toEqual({ start: 2, oldEnd: 2, newEnd: 3 })
    expect(diffRange('abXc', 'abc')).toEqual({ start: 2, oldEnd: 3, newEnd: 2 })
    expect(diffRange('hij word', 'hij wordt')).toEqual({ start: 8, oldEnd: 8, newEnd: 9 })
    expect(diffRange('', 'hoi')).toEqual({ start: 0, oldEnd: 0, newEnd: 3 })
    // repeated letters: the change is placed as late as possible, never outside the strings
    expect(diffRange('aaa', 'aaaa')).toEqual({ start: 3, oldEnd: 3, newEnd: 4 })
  })
})

describe('remapIssues', () => {
  const T = 'Hij word morgen 18. Dat is eigelijk goed.'
  const word = mkIssue(T, 'word')
  const eig = mkIssue(T, 'eigelijk', { category: 'spelling' })

  it('shifts issues after an edit and keeps the ones before it', () => {
    const next = T.replace('morgen', 'overmorgen')
    const { kept, dropped } = remapIssues([word, eig], T, next)
    expect(dropped).toEqual([])
    expect(kept.map((i) => next.slice(i.offset, i.offset + i.length))).toEqual(['word', 'eigelijk'])
  })

  it('drops an issue when its word is edited', () => {
    const next = T.replace('eigelijk', 'eigenlijk')
    const { kept, dropped } = remapIssues([word, eig], T, next)
    expect(kept.map((i) => i.text)).toEqual(['word'])
    expect(dropped.map((i) => i.text)).toEqual(['eigelijk'])
  })

  it('drops an issue when a letter is typed onto its end', () => {
    const next = T.replace('word ', 'wordt ')
    expect(remapIssues([word], T, next).dropped).toHaveLength(1)
  })

  it('keeps an issue when a space or punctuation is typed right after it', () => {
    const t = 'Hij word'
    const w = mkIssue(t, 'word')
    expect(remapIssues([w], t, 'Hij word ').kept).toHaveLength(1)
    expect(remapIssues([w], t, 'Hij word.').kept).toHaveLength(1)
    expect(remapIssues([w], t, 'Hij wordt').dropped).toHaveLength(1)
  })

  it('keeps an issue when text is typed right before it, separated by a space', () => {
    const t = 'word morgen'
    const w = mkIssue(t, 'word')
    const r = remapIssues([w], t, 'Hij word morgen')
    expect(r.kept).toHaveLength(1)
    expect(r.kept[0].offset).toBe(4)
    expect(remapIssues([w], t, 'xword morgen').dropped).toHaveLength(1)
  })

  it('handles deleting a whole line before the issue', () => {
    const t = 'Eerste regel.\nHij word groot.'
    const w = mkIssue(t, 'word')
    const next = 'Hij word groot.'
    const r = remapIssues([w], t, next)
    expect(r.kept[0].offset).toBe(next.indexOf('word'))
  })
})

describe('paragraphs', () => {
  it('splits on line breaks with exact offsets', () => {
    const t = 'een\n\ntwee drie\nvier'
    const ps = splitParagraphs(t)
    expect(ps.map((p) => p.text)).toEqual(['een', '', 'twee drie', 'vier'])
    for (const p of ps) expect(t.slice(p.start, p.end)).toBe(p.text)
    expect(splitParagraphs('')).toEqual([{ start: 0, end: 0, text: '' }])
    expect(splitParagraphs('a\n').map((p) => p.text)).toEqual(['a', ''])
  })

  it('only plans checks for paragraphs it has not seen', () => {
    const cache = new ParagraphCache()
    const p1 = 'Hij word groot.'
    cache.set('nl', p1, [mkIssue(p1, 'word')])
    const text = `Nieuwe zin.\n\n${p1}`
    const plan = planCheck(text, 'nl', cache)
    expect(plan.todo.map((p) => p.text)).toEqual(['Nieuwe zin.'])
    expect(plan.known).toHaveLength(1)
    expect(text.slice(plan.known[0].offset, plan.known[0].offset + 4)).toBe('word')
  })

  it('keys the cache by language', () => {
    const cache = new ParagraphCache()
    cache.set('nl', 'same', [])
    expect(planCheck('same', 'nl', cache).todo).toHaveLength(0)
    expect(planCheck('same', 'en', cache).todo).toHaveLength(1)
  })

  it('evicts the least recently used paragraph', () => {
    const cache = new ParagraphCache(2)
    cache.set('nl', 'a', [])
    cache.set('nl', 'b', [])
    cache.get('nl', 'a')
    cache.set('nl', 'c', [])
    expect(cache.size).toBe(2)
    expect(cache.get('nl', 'b')).toBeUndefined()
    expect(cache.get('nl', 'a')).toBeDefined()
  })

  it('shifts and re-ids merged issues', () => {
    const t = 'word word'
    const a = mkIssue(t, 'word')
    const b = { ...a } // same rule, same offset (two paragraphs before shifting)
    const merged = reId([...shiftIssues([a], 0), ...shiftIssues([b], 0)])
    expect(new Set(merged.map((i) => i.id)).size).toBe(2)
    expect(shiftIssues([a], 5)[0].offset).toBe(5)
  })
})
