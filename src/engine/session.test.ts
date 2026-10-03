import { describe, expect, it, vi } from 'vitest'
import { TypingSession, type SessionOptions } from './session'

const make = (words: string[], opts: Partial<SessionOptions> = {}) => new TypingSession(words, { lang: 'nl', ...opts })

/** types each character 100 ms apart, starting at `t0`; returns the next free timestamp */
function type(s: TypingSession, text: string, t0 = 0, step = 100): number {
  let t = t0
  for (const ch of Array.from(text)) {
    s.input(ch, t)
    t += step
  }
  return t
}

const states = (s: TypingSession, w: number) => s.getSnapshot().words[w].letters.map((l) => l.state)

describe('TypingSession basics', () => {
  it('types words, commits with space and finishes on the last correct letter', () => {
    const s = make(['de', 'kat'])
    expect(s.getSnapshot()).toMatchObject({ started: false, finished: false, wordIndex: 0, charIndex: 0, startedAt: null })
    type(s, 'de kat', 1000)
    const snap = s.getSnapshot()
    expect(snap.finished).toBe(true)
    expect(snap.started).toBe(true)
    expect(snap.startedAt).toBe(1000)
    expect(snap.elapsedMs).toBe(500)
    expect(s.durationMs).toBe(500)
    expect(snap.words.map((w) => [w.typed, w.committed, w.correct, w.everWrong])).toEqual([
      ['de', true, true, false],
      ['kat', true, true, false],
    ])
    expect(states(s, 1)).toEqual(['correct', 'correct', 'correct'])
    expect(s.keyEvents).toHaveLength(6)
    expect(s.keyEvents[0]).toMatchObject({ t: 0, expected: 'd', typed: 'd', correct: true, wordIndex: 0, charIndex: 0, op: 'insert' })
    expect(s.keyEvents[2]).toMatchObject({ t: 200, expected: ' ', typed: ' ', correct: true, wordIndex: 0, charIndex: 2, op: 'commit' })
    expect(s.liveAccuracy()).toBe(100)
    // further input is ignored
    expect(s.input('x', 2000)).toBeNull()
  })

  it('ignores a space at the start of a word (and before starting)', () => {
    const s = make(['ik', 'ga'])
    expect(s.input(' ', 0)).toBeNull()
    expect(s.started).toBe(false)
    type(s, 'ik', 10)
    s.input(' ', 300)
    expect(s.input(' ', 400)).toBeNull()
    expect(s.getSnapshot().wordIndex).toBe(1)
    expect(s.keyEvents).toHaveLength(3)
  })

  it('ignores KeyboardEvent names and Backspace before the start', () => {
    const s = make(['ja'])
    expect(s.input('Shift', 0)).toBeNull()
    expect(s.input('Dead', 0)).toBeNull()
    expect(s.input('Enter', 0)).toBeNull()
    expect(s.input('Backspace', 0)).toBeNull()
    expect(s.started).toBe(false)
    expect(s.version).toBe(0)
  })

  it('splits words that contain spaces and skips empty ones', () => {
    const s = make(['de kat', '', ' zit '])
    expect(s.getSnapshot().words.map((w) => w.target)).toEqual(['de', 'kat', 'zit'])
  })
})

describe('mistakes, extra letters and missed letters', () => {
  it('marks wrong letters with what was typed', () => {
    const s = make(['kat', 'zit'])
    type(s, 'kot')
    const w = s.getSnapshot().words[0]
    expect(w.letters[1]).toEqual({ char: 'a', state: 'incorrect', typed: 'o' })
    expect(w.everWrong).toBe(true)
    expect(s.keyEvents[1]).toMatchObject({ expected: 'a', typed: 'o', correct: false })
    expect(s.liveAccuracy()).toBeCloseTo((2 / 3) * 100)
  })

  it('appends extra letters past the end, capped at +10', () => {
    const s = make(['ja', 'nee'])
    type(s, 'jaa')
    expect(states(s, 0)).toEqual(['correct', 'correct', 'extra'])
    expect(s.getSnapshot().words[0].letters[2].char).toBe('a')
    expect(s.keyEvents[2]).toMatchObject({ expected: ' ', correct: false })
    type(s, 'xxxxxxxxxxxx', 1000)
    expect(s.getSnapshot().words[0].typed).toBe('ja' + 'a' + 'x'.repeat(9))
    expect(s.getSnapshot().charIndex).toBe(12)
    expect(s.keyEvents.at(-1)?.expected).toBe('')
  })

  it('shows missed letters when a word is committed early', () => {
    const s = make(['alleen', 'thuis'])
    type(s, 'al ')
    const w = s.getSnapshot().words[0]
    expect(w.committed).toBe(true)
    expect(w.everWrong).toBe(true)
    expect(states(s, 0)).toEqual(['correct', 'correct', 'missed', 'missed', 'missed', 'missed'])
    expect(s.keyEvents[2]).toMatchObject({ expected: 'l', typed: ' ', correct: false, op: 'commit' })
    expect(s.getSnapshot().wordIndex).toBe(1)
  })

  it('flags a corrected letter after backspace', () => {
    const s = make(['kat', 'zit'])
    type(s, 'ko')
    s.input('Backspace', 300)
    s.input('a', 400)
    const w = s.getSnapshot().words[0]
    expect(w.typed).toBe('ka')
    expect(w.letters[1]).toEqual({ char: 'a', state: 'correct', corrected: true })
    expect(w.everWrong).toBe(true)
    expect(s.keyEvents[2]).toMatchObject({ typed: 'Backspace', op: 'delete', charIndex: 1, expected: 'a', correct: true })
    expect(s.liveAccuracy()).toBeCloseTo((2 / 3) * 100) // the fixed error still counts
  })
})

describe('backspace into previous words', () => {
  it('goes back into a wrong previous word, like Monkeytype', () => {
    const s = make(['hij', 'wordt', 'groot'])
    type(s, 'hji ')
    expect(s.getSnapshot().wordIndex).toBe(1)
    const ev = s.input('Backspace', 1000)
    expect(ev).toMatchObject({ op: 'back', wordIndex: 0, charIndex: 3, expected: ' ' })
    const snap = s.getSnapshot()
    expect(snap.wordIndex).toBe(0)
    expect(snap.charIndex).toBe(3)
    expect(snap.words[0].committed).toBe(false)
    // fix it and move on
    s.input('Backspace', 1100)
    s.input('Backspace', 1200)
    type(s, 'ij ', 1300)
    expect(s.getSnapshot().words[0]).toMatchObject({ typed: 'hij', correct: true, committed: true, everWrong: true })
    expect(s.getSnapshot().wordIndex).toBe(1)
  })

  it('does not go back into a correct previous word', () => {
    const s = make(['hij', 'wordt'])
    type(s, 'hij ')
    expect(s.input('Backspace', 1000)).toBeNull()
    expect(s.getSnapshot().wordIndex).toBe(1)
  })

  it('can be switched off', () => {
    const s = make(['hij', 'wordt'], { allowBackspaceIntoPrevWord: false })
    type(s, 'hji ')
    expect(s.input('Backspace', 1000)).toBeNull()
    expect(s.getSnapshot().wordIndex).toBe(1)
  })

  it('deleteWord clears the current word, or the previous wrong one at a word start', () => {
    const s = make(['een', 'mooie', 'dag'])
    type(s, 'eem moo')
    expect(s.deleteWord(1000)).toBe(true)
    expect(s.getSnapshot()).toMatchObject({ wordIndex: 1, charIndex: 0 })
    expect(s.getSnapshot().words[1].typed).toBe('')
    expect(s.deleteWord(1100)).toBe(true)
    expect(s.getSnapshot()).toMatchObject({ wordIndex: 0, charIndex: 0 })
    expect(s.getSnapshot().words[0]).toMatchObject({ typed: '', committed: false, everWrong: true })
    expect(s.deleteWord(1200)).toBe(false)
    const ops = s.keyEvents.slice(-3).map((e) => [e.op, e.wordIndex, e.charIndex])
    expect(ops).toEqual([
      ['delete', 1, 0],
      ['back', 0, 3],
      ['delete', 0, 0],
    ])
  })
})

describe('stop on error', () => {
  it("'letter' blocks wrong keys and early spaces but counts them", () => {
    const s = make(['kat', 'zit'], { stopOnError: 'letter' })
    s.input('k', 0)
    const ev = s.input('o', 100)
    expect(ev).toMatchObject({ op: 'blocked', expected: 'a', typed: 'o', correct: false, charIndex: 1 })
    expect(s.getSnapshot()).toMatchObject({ charIndex: 1 })
    expect(s.getSnapshot().words[0].typed).toBe('k')
    expect(s.input(' ', 200)).toMatchObject({ op: 'blocked', correct: false })
    expect(s.getSnapshot().wordIndex).toBe(0)
    type(s, 'at', 300)
    expect(s.input('x', 600)).toMatchObject({ op: 'blocked', expected: ' ' })
    s.input(' ', 700)
    expect(s.getSnapshot().wordIndex).toBe(1)
    expect(s.getSnapshot().words[0]).toMatchObject({ correct: true, everWrong: true })
    expect(s.liveAccuracy()).toBeCloseTo((4 / 7) * 100)
    expect(s.getSnapshot().words[0].letters[1]).toMatchObject({ state: 'correct', corrected: true })
  })

  it("'word' lets wrong letters in but blocks the space until the word is right", () => {
    const s = make(['kat', 'zit'], { stopOnError: 'word' })
    type(s, 'kot')
    expect(s.getSnapshot().words[0].typed).toBe('kot')
    expect(s.input(' ', 500)).toMatchObject({ op: 'blocked', correct: false })
    expect(s.getSnapshot().wordIndex).toBe(0)
    s.input('Backspace', 600)
    s.input('Backspace', 700)
    type(s, 'at ', 800)
    expect(s.getSnapshot().wordIndex).toBe(1)
  })
})

describe('finishing', () => {
  it('does not finish on a wrong last word until space is pressed', () => {
    const s = make(['ja', 'nee'])
    type(s, 'ja naa')
    expect(s.finished).toBe(false)
    s.input(' ', 1000)
    expect(s.finished).toBe(true)
    expect(s.getSnapshot().words[1]).toMatchObject({ committed: true, correct: false })
  })

  it('quickEnd finishes once the last word is long enough', () => {
    const s = make(['ja', 'nee'], { quickEnd: true })
    type(s, 'ja naa')
    expect(s.finished).toBe(true)
  })

  it('end() stops the run early', () => {
    const s = make(['ja', 'nee'])
    type(s, 'ja n')
    s.end(2000)
    expect(s.finished).toBe(true)
    expect(s.durationMs).toBe(2000)
    expect(s.input('e', 2100)).toBeNull()
  })

  it('time mode ends at the limit via tick or the next key', () => {
    const s = make(['een', 'twee', 'drie'], { timeLimitMs: 1000 })
    expect(s.tick(5000)).toBe(false) // not started
    type(s, 'een tw', 10_000)
    expect(s.tick(10_900)).toBe(false)
    expect(s.tick(11_000)).toBe(true)
    expect(s.finished).toBe(true)
    expect(s.durationMs).toBe(1000)
    expect(s.elapsed(99_999)).toBe(1000)

    const s2 = make(['een', 'twee'], { timeLimitMs: 1000 })
    type(s2, 'ee', 0)
    expect(s2.input('n', 1500)).toBeNull()
    expect(s2.finished).toBe(true)
    expect(s2.durationMs).toBe(1000)
    expect(s2.getSnapshot().words[0].typed).toBe('ee')
  })

  it('addWords extends the run (time mode buffer)', () => {
    const s = make(['een'], { timeLimitMs: 30_000 })
    s.addWords(['twee', 'drie'])
    expect(s.wordCount).toBe(3)
    type(s, 'een twee ')
    expect(s.finished).toBe(false)
    expect(s.getSnapshot().wordIndex).toBe(2)
  })
})

describe('snapshot and subscriptions', () => {
  it('keeps the same snapshot object until something changes', () => {
    const s = make(['ja', 'nee'])
    const a = s.getSnapshot()
    expect(s.getSnapshot()).toBe(a)
    const fn = vi.fn()
    const off = s.subscribe(fn)
    s.input('j', 0)
    expect(fn).toHaveBeenCalledTimes(1)
    const b = s.getSnapshot()
    expect(b).not.toBe(a)
    expect(b.version).toBe(1)
    // untouched words keep their view objects (cheap React memo)
    expect(b.words[1]).toBe(a.words[1])
    expect(b.words[0]).not.toBe(a.words[0])
    off()
    s.input('a', 100)
    expect(fn).toHaveBeenCalledTimes(1)
  })
})

describe('composed input, Arabic and lazy mode', () => {
  it('accepts composed and decomposed accented letters', () => {
    const s = make(['ideeën'])
    type(s, 'idee')
    s.input('e\u0308', 1000) // e + combining diaeresis from an IME
    s.input('n', 1100)
    expect(s.finished).toBe(true)
    expect(s.getSnapshot().words[0].correct).toBe(true)
  })

  it('types Arabic, including the two-letter لا key', () => {
    const s = new TypingSession(['لا', 'شكرا'], { lang: 'ar' })
    s.input('لا', 0)
    expect(s.getSnapshot().words[0].typed).toBe('لا')
    expect(s.keyEvents).toHaveLength(2)
    s.input(' ', 100)
    type(s, 'شكرا', 200)
    expect(s.finished).toBe(true)
  })

  it('lazy mode accepts plain letters for accented ones and drops tashkeel from targets', () => {
    const s = make(['ideeën', 'café'], { lazy: true })
    type(s, 'ideeen cafe')
    expect(s.finished).toBe(true)
    const snap = s.getSnapshot()
    expect(snap.words.map((w) => [w.typed, w.correct])).toEqual([
      ['ideeën', true],
      ['café', true],
    ])
    expect(s.liveAccuracy()).toBe(100)
    expect(s.keyEvents[4]).toMatchObject({ expected: 'ë', typed: 'e', correct: true })

    const a = new TypingSession(['أَنا'], { lang: 'ar', lazy: true })
    expect(a.getSnapshot().words[0].target).toBe('أنا')
    type(a, 'انا')
    expect(a.finished).toBe(true)
  })

  it('normalises Linux ligatures, invisible marks and Eastern digits', () => {
    const s = new TypingSession(['لا', '3', 'كتب'], { lang: 'ar' })
    s.input('\uFEFB', 0) // xkb types لا as one presentation-form code point
    expect(s.getSnapshot().words[0]).toMatchObject({ typed: 'لا', correct: true })
    s.input(' ', 100)
    s.input('\u0663', 200) // ٣
    expect(s.getSnapshot().words[1].correct).toBe(true)
    s.input(' ', 300)
    s.input('ك\u200D', 400) // stray zero-width joiner
    expect(s.getSnapshot().words[2].typed).toBe('ك')
  })

  it('strips tashkeel and tatweel from targets unless asked to keep tashkeel', () => {
    expect(new TypingSession(['كَتَبَ', 'جمـيل'], { lang: 'ar' }).getSnapshot().words.map((w) => w.target)).toEqual(['كتب', 'جميل'])
    expect(new TypingSession(['كَتَبَ'], { lang: 'ar', tashkeel: true }).getSnapshot().words[0].letters).toHaveLength(6)
  })

  it('is strict about accents without lazy mode', () => {
    const s = make(['café'])
    type(s, 'cafe')
    expect(s.finished).toBe(false)
    expect(s.getSnapshot().words[0].letters[3]).toMatchObject({ state: 'incorrect', typed: 'e' })
  })
})

describe('live numbers', () => {
  it('computes live wpm, raw and accuracy', () => {
    const s = make(['de', 'kat', 'zit'])
    // "de kat " = 7 chars over 6 seconds of typing (first key at t=0)
    type(s, 'de kat ', 0, 1000)
    expect(s.liveWpm(6000)).toBeCloseTo(wpmOf(7, 6000))
    s.input('x', 7000)
    // the current word has an error, so it adds nothing to wpm but counts for raw
    expect(s.liveWpm(7000)).toBeCloseTo(wpmOf(7, 7000))
    expect(s.liveRawWpm(7000)).toBeCloseTo(wpmOf(8, 7000))
    expect(s.liveAccuracy()).toBeCloseTo((7 / 8) * 100)
  })
})

const wpmOf = (chars: number, ms: number) => chars / 5 / (ms / 60000)

describe('review regressions: text input', () => {
  it('types a whole composed word, even one that looks like a key name ("Het" from a mobile keyboard)', () => {
    const s = make(['Het', 'is', 'goed'])
    expect(s.input('Het', 0)).toMatchObject({ typed: 't', correct: true, charIndex: 2 })
    expect(s.getSnapshot().words[0].typed).toBe('Het')
    // insertText never filters key names: "Enter" typed as text is text
    const t = make(['Enter'])
    t.insertText('Enter', 0)
    expect(t.finished).toBe(true)
    // real key names are still ignored by input()
    for (const key of ['Shift', 'CapsLock', 'ArrowLeft', 'F5', 'Tab', 'Escape', 'Unidentified', 'Process', 'MediaPlayPause']) {
      expect(make(['a']).input(key, 0), key).toBeNull()
    }
  })

  it('types a composition with a space across the word boundary', () => {
    const s = make(['ik', 'ga', 'naar'])
    s.insertText('ik ga', 0)
    expect(s.getSnapshot()).toMatchObject({ wordIndex: 1, charIndex: 2 })
    expect(s.keyEvents.map((e) => e.op)).toEqual(['insert', 'insert', 'commit', 'insert', 'insert'])
  })

  it('accepts curly quotes for straight ones and makes typographic targets typable', () => {
    const s = make(['auto’s', 'zo…', '“ja”'])
    expect(s.getSnapshot().words.map((w) => w.target)).toEqual(["auto's", 'zo...', '"ja"'])
    type(s, 'auto’s zo... “ja”')
    expect(s.finished).toBe(true)
    expect(s.getSnapshot().words.every((w) => w.correct)).toBe(true)
  })

  it('ignores control characters and splits ligatures', () => {
    const s = make(['ijs', 'fijn'])
    expect(s.input('\t', 0)).toBeNull()
    expect(s.input('\n', 0)).toBeNull()
    expect(s.started).toBe(false)
    s.input('ĳ', 0) // the one-character ĳ ligature
    s.input('s', 100)
    s.input(' ', 200)
    s.input('ﬁ', 300) // ﬁ
    type(s, 'jn', 400)
    expect(s.getSnapshot().words.map((w) => w.correct)).toEqual([true, true])
    expect(s.finished).toBe(true)
  })
})
