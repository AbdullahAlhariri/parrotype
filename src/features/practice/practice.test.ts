import { describe, expect, it } from 'vitest'
import { seeded } from '@/lib/random'
import type { SessionRecord, WordAttempt } from '@/types'
import { buildContextLine, buildRepairLine, mostMissed, parseWordsParam, repairHref, repairTally } from './repair'
import { answerCcc, cccDone, cccSummary, currentId, isRightAnswer, revealMs, startCcc } from './ccc'
import { dailyChallenge, dailyRuns, dailySeed, dailySentencePool, formatDay } from './daily'
import { planIdFor, planStatus } from './plan'
import { gateAccuracy, gateNote, parseUnits, passesGate, unitsToWeaknesses } from './drill'

const noRepeats = (xs: string[]) => xs.every((x, i) => i === 0 || x !== xs[i - 1])

describe('word repair', () => {
  it('parses ?words= safely', () => {
    expect(parseWordsParam('wordt, ideeën,,Wordt, gebeurt ')).toEqual(['wordt', 'ideeën', 'gebeurt'])
    expect(parseWordsParam(null)).toEqual([])
    expect(parseWordsParam('a,b,c,d', 2)).toEqual(['a', 'b'])
    expect(parseWordsParam('two words,ok')).toEqual(['ok'])
  })

  it('round-trips through the href', () => {
    const href = repairHref(['wordt', 'ideeën'])
    const q = new URLSearchParams(href.split('?')[1])
    expect(parseWordsParam(q.get('words'))).toEqual(['wordt', 'ideeën'])
  })

  it('types every word three times, never twice in a row', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const rand = seeded(seed)
      const words = ['wordt', 'gebeurt', 'ideeën', 'vindt', 'zonnebrandcrème'].slice(0, 2 + (seed % 4))
      const line = buildRepairLine(words, rand)
      expect(line).toHaveLength(words.length * 3)
      for (const w of words) expect(line.filter((x) => x === w)).toHaveLength(3)
      expect(noRepeats(line)).toBe(true)
    }
  })

  it('handles a single word', () => {
    expect(buildRepairLine(['wordt'], seeded(1))).toEqual(['wordt', 'wordt', 'wordt'])
    expect(buildRepairLine([], seeded(1))).toEqual([])
  })

  it('puts each target once between common words', () => {
    const common = ['de', 'het', 'een', 'en', 'van', 'ik', 'te', 'dat']
    for (let seed = 1; seed <= 50; seed++) {
      const line = buildContextLine(['wordt', 'gebeurt', 'de'], common, seeded(seed))
      expect(line.filter((x) => x === 'wordt')).toHaveLength(1)
      expect(line.filter((x) => x === 'gebeurt')).toHaveLength(1)
      // a target that is also a common word is not used as filler
      expect(line.filter((x) => x === 'de')).toHaveLength(1)
      expect(common).toContain(line[0])
      expect(common).toContain(line[line.length - 1])
      expect(line.length).toBeGreaterThanOrEqual(7)
      expect(line.length).toBeLessThanOrEqual(10)
    }
  })

  it('tallies clean attempts', () => {
    const a = (expected: string, typed: string, everWrong = false): WordAttempt => ({ expected, typed, correct: expected === typed, everWrong })
    const tally = repairTally(['wordt', 'vindt'], [a('wordt', 'wordt'), a('vindt', 'vind'), a('wordt', 'wordt', true), a('vindt', 'vindt'), a('wordt', 'wordt'), a('vindt', '')])
    expect(tally).toEqual([
      { word: 'wordt', clean: 2, total: 3 },
      { word: 'vindt', clean: 1, total: 2 },
    ])
  })

  it('sorts most-missed words by count, then recency', () => {
    const words = {
      a: { word: 'a', count: 2, lastAt: 5, typed: [] },
      b: { word: 'b', count: 4, lastAt: 1, typed: [] },
      c: { word: 'c', count: 2, lastAt: 9, typed: [] },
      d: { word: 'two words', count: 9, lastAt: 9, typed: [] },
    }
    expect(mostMissed(words, 3).map((w) => w.word)).toEqual(['b', 'c', 'a'])
  })
})

describe('cover-copy-compare scheduling', () => {
  const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']

  it('asks every item once when all answers are right', () => {
    let s = startCcc(ids)
    const asked: string[] = []
    while (!cccDone(s)) {
      asked.push(currentId(s)!)
      s = answerCcc(s, true)
    }
    expect(asked).toEqual(ids)
    expect(cccSummary(s)).toEqual({ reviewed: 8, firstTry: 8, missed: [], fixed: [] })
  })

  it('re-tests a miss after 3 to 5 other items', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const rand = seeded(seed)
      let s = startCcc(ids)
      s = answerCcc(s, true, 'a', rand) // a
      s = answerCcc(s, false, 'x', rand) // b missed
      const back = s.queue.indexOf('b', 2)
      const gap = back - 1 - 1 // other items between the miss (index 1) and its return
      expect(gap).toBeGreaterThanOrEqual(3)
      expect(gap).toBeLessThanOrEqual(5)
    }
  })

  it('appends the re-test at the end when few items remain, and caps re-queues', () => {
    let s = startCcc(['a', 'b'])
    s = answerCcc(s, false, 'x', seeded(3)) // a missed, goes to the end
    expect(s.queue).toEqual(['a', 'b', 'a'])
    s = answerCcc(s, true, 'b')
    s = answerCcc(s, false, 'y') // a missed again: second re-queue
    s = answerCcc(s, false, 'z') // a missed a third time: no more re-queues
    expect(cccDone(s)).toBe(true)
    expect(s.log.map((x) => x.retest)).toEqual([false, false, true, true])
    expect(cccSummary(s)).toEqual({ reviewed: 2, firstTry: 1, missed: ['a'], fixed: [] })
  })

  it('counts items fixed on a re-test', () => {
    let s = startCcc(['a', 'b'])
    s = answerCcc(s, false, 'x')
    s = answerCcc(s, true)
    s = answerCcc(s, true)
    expect(cccSummary(s).fixed).toEqual(['a'])
  })

  it('caps a session and drops duplicates', () => {
    const many = Array.from({ length: 40 }, (_, i) => String(i))
    expect(startCcc([...many, '1', '2']).queue).toHaveLength(20)
    expect(startCcc(['a', 'a', 'b']).queue).toEqual(['a', 'b'])
  })

  it('compares answers strictly but forgives spacing and typographic quotes', () => {
    expect(isRightAnswer('wordt', ' wordt ')).toBe(true)
    expect(isRightAnswer('wordt', 'word')).toBe(false)
    expect(isRightAnswer('Hij wordt', 'hij wordt')).toBe(false)
    expect(isRightAnswer("it's late", 'it’s  late')).toBe(true)
  })

  it('shows longer targets for longer', () => {
    expect(revealMs('de', 'word')).toBe(1500)
    expect(revealMs('zonnebrandcrème', 'word')).toBeGreaterThan(revealMs('wordt', 'word'))
    expect(revealMs('x'.repeat(500), 'sentence')).toBe(8000)
  })
})

describe('daily challenge', () => {
  it('is the same all day and differs between days and languages', () => {
    const a = dailyChallenge('nl', '2026-10-03')
    const b = dailyChallenge('nl', '2026-10-03')
    expect(b).toEqual(a)
    expect(dailyChallenge('nl', '2026-10-04').words).not.toEqual(a.words)
    expect(dailyChallenge('en', '2026-10-03').words).not.toEqual(a.words)
    expect(dailySeed('2026-10-03', 'nl')).toBe(dailySeed('2026-10-03', 'nl'))
  })

  it('opens with a story sentence and has enough words for 45 seconds', () => {
    for (const lang of ['nl', 'en', 'ar'] as const) {
      const c = dailyChallenge(lang, '2026-10-03')
      expect(c.sentence.length).toBeGreaterThan(0)
      expect(c.words.slice(0, c.sentence.split(/\s+/).length).join(' ')).toBe(c.sentence)
      expect(c.words.length).toBeGreaterThanOrEqual(150)
      expect(noRepeats(c.words.slice(c.sentence.split(/\s+/).length))).toBe(true)
    }
  })

  it('only uses narrative sentences', () => {
    for (const s of dailySentencePool('nl')) {
      expect(s).not.toMatch(/"/)
      expect(s).toMatch(/[.!?]$/)
    }
  })

  it('finds today\'s runs, best first', () => {
    const at = new Date(2026, 9, 3, 12).getTime()
    const base = { lang: 'nl', durationMs: 45000, config: 'daily 2026-10-03', mistakes: 0 } as const
    const sessions: SessionRecord[] = [
      { ...base, id: '1', at, mode: 'daily', wpm: 50, accuracy: 96 },
      { ...base, id: '2', at, mode: 'daily', wpm: 61, accuracy: 94 },
      { ...base, id: '3', at: at - 86400000, mode: 'daily', wpm: 90, accuracy: 99 },
      { ...base, id: '4', at, mode: 'typing', wpm: 99, accuracy: 99 },
      { ...base, id: '5', at, mode: 'daily', lang: 'en', wpm: 70, accuracy: 99 },
    ]
    expect(dailyRuns(sessions, 'nl', '2026-10-03').map((s) => s.id)).toEqual(['2', '1'])
  })

  it('formats the day', () => {
    expect(formatDay('2026-10-03')).toBe('Saturday 3 October')
  })
})

describe('daily plan', () => {
  const at = new Date(2026, 9, 3, 9).getTime()
  const now = new Date(2026, 9, 3, 18)
  const s = (mode: SessionRecord['mode'], config: string, when = at): SessionRecord => ({ id: config, at: when, mode, lang: 'nl', durationMs: 1, config, mistakes: 0 })

  it('maps sessions to plan items', () => {
    expect(planIdFor(s('practice', 'warm-up drill'))).toBe('warmup')
    expect(planIdFor(s('practice', 'focus drill: d ij'))).toBe('warmup')
    expect(planIdFor(s('practice', 'nest review'))).toBe('nest')
    expect(planIdFor(s('practice', 'word repair'))).toBeUndefined()
    expect(planIdFor(s('dictation', 'set 1'))).toBe('dictation')
    expect(planIdFor(s('gym', 'd/t'))).toBe('gym')
    expect(planIdFor(s('typing', 'time 30'))).toBeUndefined()
  })

  it('combines today\'s sessions with today\'s ticks only', () => {
    const sessions = [s('practice', 'nest review'), s('gym', 'pack', at - 86400000)]
    expect(planStatus(sessions, { day: '2026-10-03', done: ['dictation'] }, now)).toEqual({ warmup: false, nest: true, dictation: true, gym: false })
    expect(planStatus(sessions, { day: '2026-10-02', done: ['dictation'] }, now)).toEqual({ warmup: false, nest: true, dictation: false, gym: false })
  })
})

describe('focus drill helpers', () => {
  it('parses ?focus= units', () => {
    expect(parseUnits('d, IJ ,e,d,abc,1,')).toEqual(['d', 'ij', 'e'])
    expect(parseUnits(null)).toEqual([])
    expect(parseUnits('a,b,c,d,e,f,g')).toHaveLength(5)
    expect(parseUnits('ة,لا')).toEqual(['ة', 'لا'])
  })

  it('turns units into weaknesses with the user\'s own numbers', () => {
    const ws = unitsToWeaknesses(['d', 'ij', 'x'], { d: { hits: 90, misses: 10, ms: 9000 } }, { ij: { hits: 15, misses: 5, ms: 3000 } })
    expect(ws.map((w) => [w.unit, w.kind, w.samples])).toEqual([
      ['d', 'key', 100],
      ['ij', 'bigram', 20],
      ['x', 'key', 0],
    ])
    expect(ws[0].errorRate).toBeCloseTo(0.1)
    expect(ws[0].avgMs).toBe(100)
    expect(ws.every((w) => w.weak)).toBe(true)
  })

  it('never rounds accuracy up past the gate', () => {
    expect(gateAccuracy(96.99)).toBe(96)
    expect(passesGate(96.99)).toBe(false)
    expect(passesGate(97)).toBe(true)
    expect(gateNote(95.4, 0)).toBe('Accuracy 95%. Kees wants 97 before speeding up.')
    expect(gateNote(98, 1)).toMatch(/^Accuracy 98%\. That clears 97\. 2 more/)
    expect(gateNote(99, 3)).toMatch(/3 clean rounds in a row, so try the next one about 5% faster/)
  })
})

describe('copy rules', () => {
  it('has no em dashes or banned words in practice and story strings', async () => {
    const { readFileSync, readdirSync } = await import('node:fs')
    const dirs = ['src/features/practice', 'src/features/stories', 'src/content/stories']
    const banned = /—|\bunlock|\bunleash|supercharge|\belevate|seamless|effortless|empower|\bjourney\b|get started|learn more|ready to\b|\bmagic\b/i
    for (const d of dirs) {
      for (const f of readdirSync(d)) {
        if (!/\.(tsx?|css)$/.test(f) || f.endsWith('.test.ts')) continue
        const text = readFileSync(`${d}/${f}`, 'utf8')
        expect(text, `${d}/${f}`).not.toMatch(banned)
      }
    }
  })
})

describe('daily top-up words', () => {
  it('is deterministic per round and differs between rounds', async () => {
    const { dailyMoreWords } = await import('./daily')
    expect(dailyMoreWords('nl', '2026-10-03', 1)).toEqual(dailyMoreWords('nl', '2026-10-03', 1))
    expect(dailyMoreWords('nl', '2026-10-03', 2)).not.toEqual(dailyMoreWords('nl', '2026-10-03', 1))
    expect(dailyMoreWords('ar', '2026-10-03', 1)).toHaveLength(60)
  })
})
