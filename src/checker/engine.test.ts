import { describe, expect, it, vi } from 'vitest'
import type { Rule } from '@/types'
import { applyReplacement, capitalize, preserveCase, resolveOverlaps, runRules } from './engine'
import { getRules, RULES } from './rules'

const rule = (id: string, check: Rule['check'], extra: Partial<Rule> = {}): Rule => ({
  id,
  lang: 'nl',
  category: 'grammar',
  title: id,
  confidence: 'medium',
  check,
  ...extra,
})

const flagWord = (word: string, conf?: 'high' | 'medium' | 'low') => (ctx: Parameters<Rule['check']>[0]) =>
  ctx.words.filter((w) => w.lower === word).map((w) => ({ offset: w.start, length: w.end - w.start, replacements: ['X'], message: 'm', confidence: conf }))

describe('runRules', () => {
  it('turns hits into issues with defaults from the rule', () => {
    const [i] = runRules('Ik wordt boos.', 'nl', [rule('t.a', flagWord('wordt'))])
    expect(i).toMatchObject({ ruleId: 't.a', source: 'rules', lang: 'nl', category: 'grammar', offset: 3, length: 5, text: 'wordt', confidence: 'medium', replacements: ['X'] })
    expect(i.id).toBe('t.a@3:5')
  })
  it('sorts by offset and removes overlaps, keeping the stronger hit', () => {
    const rules = [
      rule('weak', () => [{ offset: 0, length: 8, replacements: [], message: 'w', confidence: 'low' as const }]),
      rule('strong', flagWord('wordt', 'high')),
      rule('other', flagWord('boos')),
    ]
    expect(runRules('Ik wordt boos.', 'nl', rules).map((i) => i.ruleId)).toEqual(['strong', 'other'])
  })
  it('never crashes on a throwing rule and drops invalid hits', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const rules = [
      rule('boom', () => {
        throw new Error('bad rule')
      }),
      rule('bad', () => [
        { offset: -1, length: 2, replacements: [], message: 'x' },
        { offset: 0, length: 0, replacements: [], message: 'x' },
        { offset: 0, length: 999, replacements: [], message: 'x' },
      ]),
      rule('ok', flagWord('boos')),
    ]
    expect(runRules('Ik wordt boos.', 'nl', rules).map((i) => i.ruleId)).toEqual(['ok'])
    warn.mockRestore()
  })
  it('skips strict-only rules in normal mode, disabled rules and other languages', () => {
    const rules = [
      rule('strict', flagWord('boos'), { strictOnly: true }),
      rule('off', flagWord('ik')),
      rule('en', flagWord('wordt'), { lang: 'en' }),
    ]
    expect(runRules('Ik wordt boos.', 'nl', rules, { disabled: ['off'] })).toEqual([])
    expect(runRules('Ik wordt boos.', 'nl', rules, { strictness: 'strict', disabled: ['off'] }).map((i) => i.ruleId)).toEqual(['strict'])
  })
  it('folds a capital-letter issue into a grammar issue on the same word', () => {
    const cap = rule('cap', (ctx) => [{ offset: 0, length: ctx.words[0].end, replacements: ['Wordt'], message: 'capital' }], { category: 'capitalization', confidence: 'high' })
    const dt = rule('dt', (ctx) => [{ offset: 0, length: ctx.words[0].end, replacements: ['word'], message: 'no t' }])
    const out = runRules('wordt je opgehaald?', 'nl', [cap, dt])
    expect(out.map((i) => [i.ruleId, i.replacements[0]])).toEqual([['dt', 'Word']])
    expect(out[0].message).toContain('capital')
  })
  it('drops replacements equal to the flagged text', () => {
    const r = rule('same', () => [{ offset: 0, length: 2, replacements: ['Ik', 'ik', 'ik'], message: 'm' }])
    expect(runRules('Ik kom.', 'nl', [r])[0].replacements).toEqual(['ik'])
  })
  it('ignores sentences in another language', () => {
    const r = rule('any', flagWord('is'))
    expect(runRules('This is the book that you wanted to read with me.', 'nl', [r])).toEqual([])
    expect(runRules('Dit is het boek dat je wilde lezen.', 'nl', [r])).toHaveLength(1)
  })
  it('ignores short single-quoted mentions and code, but not dialogue', () => {
    const r = rule('any', flagWord('vind'))
    expect(runRules("Schrijf niet 'hij vind' maar 'hij vindt'.", 'nl', [r])).toEqual([])
    expect(runRules('Het woord `vind` is een stam.', 'nl', [r])).toEqual([])
    expect(runRules('"Hij vind het leuk," zei ze.', 'nl', [r])).toHaveLength(1)
    expect(runRules("Ik ga 's avonds weg en hij vind dat goed.", 'nl', [r])).toHaveLength(1)
  })
  it('returns nothing for empty text', () => expect(runRules('   ', 'nl', [rule('x', () => [])])).toEqual([]))
})

describe('resolveOverlaps', () => {
  const issue = (id: string, offset: number, length: number, confidence: 'high' | 'medium' | 'low') => ({
    id, ruleId: id, source: 'rules' as const, lang: 'nl' as const, category: 'grammar' as const, offset, length, text: '', message: '', replacements: [], confidence,
  })
  it('prefers confidence, then length, then the earlier issue', () => {
    expect(resolveOverlaps([issue('a', 0, 3, 'medium'), issue('b', 2, 3, 'high')]).map((i) => i.id)).toEqual(['b'])
    expect(resolveOverlaps([issue('a', 0, 3, 'high'), issue('b', 0, 5, 'high')]).map((i) => i.id)).toEqual(['b'])
    expect(resolveOverlaps([issue('a', 4, 2, 'high'), issue('b', 0, 2, 'high')]).map((i) => i.id)).toEqual(['b', 'a'])
  })
})

describe('replacements', () => {
  it('applies a replacement', () => expect(applyReplacement('Ik wordt boos.', { offset: 3, length: 5 }, 'word')).toBe('Ik word boos.'))
  it('preserves case', () => {
    expect(preserveCase('Hij', 'zij')).toBe('Zij')
    expect(preserveCase('HIJ', 'zij')).toBe('ZIJ')
    expect(preserveCase('hij', 'zij')).toBe('zij')
    expect(preserveCase('belgie', 'België')).toBe('België')
    expect(preserveCase("S'avonds", "'s avonds")).toBe("'s Avonds")
    expect(preserveCase('U', 'uw')).toBe('Uw')
  })
  it('capitalises past a leading clitic', () => {
    expect(capitalize("'s avonds")).toBe("'s Avonds")
    expect(capitalize('ëen')).toBe('Ëen')
  })
})

describe('rule registry', () => {
  it('exposes rules per language', () => {
    expect(getRules('nl').length).toBeGreaterThan(50)
    expect(RULES.en).toBeInstanceOf(Array)
    expect(RULES.ar).toBeInstanceOf(Array)
  })
  it('has unique, well-formed rule ids', () => {
    const ids = getRules('nl').map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^nl\.[a-z]+\.[a-z0-9-]+$/)
    for (const r of getRules('nl')) expect(r.lang).toBe('nl')
  })
  it('style rules are strict-only and low/medium confidence', () => {
    for (const r of getRules('nl').filter((r) => r.category === 'style')) {
      expect(r.strictOnly, r.id).toBe(true)
      expect(r.confidence, r.id).not.toBe('high')
    }
  })
  it('runs the full Dutch pack', () => {
    const issues = runRules('Hij vind dat ik eigelijk te laat ben.', 'nl', getRules('nl'))
    expect(issues.map((i) => i.ruleId)).toEqual(['nl.dt.hij-t', 'nl.spell.common'])
    for (const i of issues) {
      expect(i.message).toBeTruthy()
      expect(i.messageLocal).toBeTruthy()
      expect(i.explanation).toBeTruthy()
      expect(i.explanationLocal).toBeTruthy()
    }
  })
})
