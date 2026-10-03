import { describe, expect, it } from 'vitest'
import { nestItemsFrom, ruleTitleFromMessage, summarize } from './report'
import { applyFixes, countChars, countWords, excerpt, formatDuration, sentenceBounds } from './text'
import { mkIssue } from './fixtures'

const T = 'Hij word morgen 18. Ik vindt het leuk. Dat is eigelijk een goed idee.'

const issues = () => [
  mkIssue(T, 'word', { ruleId: 'nl.dt.hij-wordt', replacements: ['wordt'], message: 'After ‘hij’ the verb gets a t: ‘wordt’', explanation: 'hij + stem + t' }),
  mkIssue(T, 'vindt', { ruleId: 'nl.dt.ik-stem', replacements: ['vind'], message: 'With ‘ik’ there is no t: ‘ik vind’' }),
  mkIssue(T, 'eigelijk', { ruleId: 'spell', source: 'spell', category: 'spelling', replacements: ['eigenlijk'], message: 'Unknown word' }),
]

describe('text helpers', () => {
  it('counts words in Dutch, English and Arabic', () => {
    expect(countWords('')).toBe(0)
    expect(countWords('Hij word morgen 18.')).toBe(4)
    expect(countWords("it's a well-known auto's-thing")).toBe(4)
    expect(countWords('ذهبت إلى المدرسة')).toBe(3)
    expect(countChars('a\nb c')).toBe(4)
  })

  it('formats durations', () => {
    expect(formatDuration(0)).toBe('0:00')
    expect(formatDuration(65_000)).toBe('1:05')
    expect(formatDuration(3_720_000)).toBe('1:02:00')
  })

  it('finds sentence bounds', () => {
    const at = (w: string) => {
      const b = sentenceBounds(T, T.indexOf(w))
      return T.slice(b.start, b.end)
    }
    expect(at('word')).toBe('Hij word morgen 18.')
    expect(at('vindt')).toBe('Ik vindt het leuk.')
    expect(at('idee')).toBe('Dat is eigelijk een goed idee.')
    const multi = 'Eerste regel\nHij zei: "Ja!" Daarna niets.'
    const b = sentenceBounds(multi, multi.indexOf('zei'))
    expect(multi.slice(b.start, b.end)).toBe('Hij zei: "Ja!"')
    const b2 = sentenceBounds(multi, 2)
    expect(multi.slice(b2.start, b2.end)).toBe('Eerste regel')
  })

  it('does not split on decimals', () => {
    const t = 'Het kost 2.50 euro. Klaar.'
    const b = sentenceBounds(t, t.indexOf('euro'))
    expect(t.slice(b.start, b.end)).toBe('Het kost 2.50 euro.')
  })

  it('applies fixes right to left inside a range', () => {
    expect(applyFixes(T, issues())).toBe('Hij wordt morgen 18. Ik vind het leuk. Dat is eigenlijk een goed idee.')
    const b = sentenceBounds(T, T.indexOf('vindt'))
    expect(applyFixes(T, issues(), b.start, b.end)).toBe('Ik vind het leuk.')
  })

  it('cuts long sentences to an excerpt around the issue', () => {
    const long = 'Dit is een hele lange zin met veel woorden die maar doorgaat en doorgaat terwijl hij word gezegd door iemand die nooit ophoudt met praten over alles en niets tegelijk.'
    const i = long.indexOf('word')
    const e = excerpt(long, i, i + 4, 60)
    const piece = long.slice(e.start, e.end)
    expect(piece).toContain('hij word')
    expect(piece.length).toBeLessThan(90)
    expect(long[e.start - 1] === ' ' || e.start === 0).toBe(true)
  })
})

describe('summarize', () => {
  it('counts per category and lists rules and words', () => {
    const s = summarize(T, issues())
    expect(s.mistakes).toBe(3)
    expect(s.byCategory).toEqual([
      { category: 'spelling', count: 1 },
      { category: 'grammar', count: 2 },
    ])
    expect(s.rules.map((r) => r.ruleId)).toEqual(['nl.dt.hij-wordt', 'nl.dt.ik-stem'])
    expect(s.words).toEqual([{ wrong: 'eigelijk', right: 'eigenlijk', count: 1 }])
  })

  it('picks the most frequent mistake for Kees to repeat', () => {
    const t = 'Hij word boos. Zij word blij. Ik vindt dat raar.'
    const list = [
      mkIssue(t, 'word', { ruleId: 'dt', replacements: ['wordt'] }),
      mkIssue(t, 'word', { ruleId: 'dt', replacements: ['wordt'] }, 16),
      mkIssue(t, 'vindt', { ruleId: 'ik', replacements: ['vind'] }),
    ]
    expect(summarize(t, list).repeat).toBe('wordt')
  })

  it('lowercases a repeat that is only capitalised because it starts a sentence', () => {
    const t = 'Eigelijk wel.'
    expect(summarize(t, [mkIssue(t, 'Eigelijk', { category: 'spelling', replacements: ['Eigenlijk'] })]).repeat).toBe('eigenlijk')
  })

  it('keeps hints out of the mistake count', () => {
    const t = 'een hele mooie dag'
    const s = summarize(t, [mkIssue(t, 'hele', { ruleId: 'nl.style.hele', category: 'style', replacements: ['heel'] })])
    expect(s.mistakes).toBe(0)
    expect(s.hints).toBe(1)
    expect(s.rules).toEqual([])
    expect(s.byCategory).toEqual([])
    expect(s.hintRules.map((r) => r.ruleId)).toEqual(['nl.style.hele'])
  })

  it('does not count unsure grammar calls in the categories', () => {
    const list = [...issues(), mkIssue(T, 'goed', { ruleId: 'maybe', confidence: 'low', replacements: ['prima'] })]
    const s = summarize(T, list)
    expect(s.mistakes).toBe(3)
    expect(s.byCategory.reduce((n, c) => n + c.count, 0)).toBe(3)
    expect(s.hintRules.map((r) => r.ruleId)).toEqual(['maybe'])
  })

  it('derives instance-free titles from messages', () => {
    expect(ruleTitleFromMessage('With ‘ik’ there is no t: ‘ik vind’')).toBe('With ‘ik’ there is no t')
    expect(ruleTitleFromMessage('Use a capital here.')).toBe('Use a capital here')
    expect(ruleTitleFromMessage('')).toBe('Grammar')
  })
})

describe('nestItemsFrom', () => {
  it('adds misspelled words and corrected sentences', () => {
    const items = nestItemsFrom(T, issues(), 'nl')
    expect(items).toEqual([
      { lang: 'nl', kind: 'sentence', target: 'Hij wordt morgen 18.', wrong: ['Hij word morgen 18.'], ruleId: 'nl.dt.hij-wordt', hint: 'hij + stem + t' },
      { lang: 'nl', kind: 'sentence', target: 'Ik vind het leuk.', wrong: ['Ik vindt het leuk.'], ruleId: 'nl.dt.ik-stem', hint: 'With ‘ik’ there is no t: ‘ik vind’' },
      { lang: 'nl', kind: 'word', target: 'eigenlijk', wrong: ['eigelijk'] },
    ])
  })

  it('fixes every counted mistake in a sentence and adds it once', () => {
    const t = 'Hij word eigelijk boos.'
    const list = [
      mkIssue(t, 'word', { ruleId: 'dt', replacements: ['wordt'] }),
      mkIssue(t, 'eigelijk', { category: 'spelling', replacements: ['eigenlijk'] }),
    ]
    const items = nestItemsFrom(t, list, 'nl')
    expect(items.find((i) => i.kind === 'sentence')?.target).toBe('Hij wordt eigenlijk boos.')
    expect(items.filter((i) => i.kind === 'sentence')).toHaveLength(1)
  })

  it('skips issues without a suggestion and hints', () => {
    const t = 'Xyzzy is een hele mooie dag.'
    const list = [mkIssue(t, 'Xyzzy', { category: 'spelling' }), mkIssue(t, 'hele', { category: 'style', replacements: ['heel'] })]
    expect(nestItemsFrom(t, list, 'nl')).toEqual([])
  })
})
