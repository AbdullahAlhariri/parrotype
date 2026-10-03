import { describe, expect, it } from 'vitest'
import type { Story } from '@/content/stories'
import { completedRead, continueCandidate, pagesDone, storyAverages, withPage, type StoryProgress } from './progress'

const story = (id: string, pages = 3): Story => ({ id, lang: 'nl', title: id, blurb: '', level: 'easy', pages: Array(pages).fill('a b c') })
const r = { wpm: 50, accuracy: 96 }
const run = (pages: number[], count = 3, start?: StoryProgress) => pages.reduce<StoryProgress | undefined>((p, i) => withPage(p, i, count, r, 1), start)!

describe('story progress', () => {
  it('moves to the next page and remembers the best wpm', () => {
    let p = withPage(undefined, 0, 3, { wpm: 50, accuracy: 96 }, 1)
    expect(p.current).toBe(1)
    expect(pagesDone(p)).toBe(1)
    p = withPage(p, 0, 3, { wpm: 40, accuracy: 99 }, 2)
    expect(p.pages[0]).toEqual({ wpm: 40, accuracy: 99, best: 50, at: 2 })
    expect(p.reads).toBe(0)
  })

  it('counts a read only when every page is done, then starts over', () => {
    const p = run([0, 1, 2])
    expect(p.reads).toBe(1)
    expect(p.current).toBe(0)
    expect(completedRead(run([0, 1]), p)).toBe(true)
  })

  it('does not finish a story with skipped pages, and points at the first gap', () => {
    let p = run([0, 2])
    expect(p.reads).toBe(0)
    expect(p.current).toBe(1)
    p = withPage(p, 1, 3, r)
    expect(p.reads).toBe(1) // the last gap filled in completes it
    expect(p.current).toBe(0)
  })

  it('counts a re-read when the last page is typed again', () => {
    let p = run([0, 1, 2])
    p = withPage(p, 0, 3, r)
    expect(p.current).toBe(1)
    expect(p.reads).toBe(1)
    p = withPage(p, 1, 3, r)
    p = withPage(p, 2, 3, r)
    expect(p.reads).toBe(2)
    // retyping the last page straight after the end is not another read
    p = withPage(p, 2, 3, r)
    expect(p.reads).toBe(2)
  })

  it('needs every page again for a re-read, so jumping to the last page does not count', () => {
    let p = run([0, 1, 2])
    p = { ...p, current: 2 } // the page picker moved straight to the last page
    p = withPage(p, 2, 3, r)
    expect(p.reads).toBe(1)
    expect(p.current).toBe(0)
    p = withPage(p, 0, 3, r)
    p = withPage(p, 1, 3, r)
    expect(p.reads).toBe(2) // pages 3, 1, 2: a full read-through, out of order
    expect(p.fresh).toEqual([])
  })

  it('reads older saves without a fresh list', () => {
    const old: StoryProgress = { current: 2, pages: { 0: { wpm: 1, accuracy: 1, best: 1, at: 1 }, 1: { wpm: 1, accuracy: 1, best: 1, at: 1 } }, reads: 0, updatedAt: 1 }
    expect(withPage(old, 2, 3, r).reads).toBe(1)
    const reread: StoryProgress = { ...old, pages: { ...old.pages, 2: old.pages[0] }, reads: 1, current: 0 }
    expect(withPage(reread, 0, 3, r)).toMatchObject({ reads: 1, current: 1, fresh: [0] })
  })

  it('averages finished pages', () => {
    expect(storyAverages(undefined)).toBeNull()
    let p = withPage(undefined, 0, 3, { wpm: 50, accuracy: 96 })
    p = withPage(p, 1, 3, { wpm: 61, accuracy: 97 })
    expect(storyAverages(p)).toEqual({ wpm: 56, accuracy: 96.5, pages: 2 })
  })

  it('offers the most recent part-way story to continue', () => {
    const stories = [story('a'), story('b'), story('c')]
    const progress = {
      a: withPage(undefined, 0, 3, r, 10),
      b: withPage(undefined, 0, 3, r, 20),
      c: run([0, 1, 2]),
    }
    progress.c.updatedAt = 30
    expect(continueCandidate(stories, progress)?.id).toBe('b')
    expect(continueCandidate(stories, {})).toBeUndefined()
  })
})
