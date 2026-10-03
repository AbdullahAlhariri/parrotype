import { describe, expect, it } from 'vitest'
import type { Issue } from '@/types'
import { combineLocal, mergeIssues, remapIssues, withStableIds } from './merge'

let n = 0
function issue(p: Partial<Issue> & Pick<Issue, 'offset' | 'length'>, text = 'x'.repeat(p.length)): Issue {
  return {
    id: `t${n++}`,
    ruleId: 'spell',
    source: 'spell',
    lang: 'nl',
    category: 'spelling',
    text,
    message: 'm',
    replacements: [],
    confidence: 'high',
    ...p,
  }
}

const spans = (is: Issue[]) => is.map((i) => [i.ruleId, i.offset, i.length])

describe('combineLocal', () => {
  it('lets a rule with a fix win over the spell issue on the same word', () => {
    const rule = issue({ ruleId: 'nl.dt.hij-t', source: 'rules', category: 'grammar', offset: 4, length: 4, replacements: ['wordt'] })
    const spell = issue({ offset: 4, length: 4, replacements: ['word'] })
    expect(spans(combineLocal([rule], [spell]))).toEqual([['nl.dt.hij-t', 4, 4]])
  })

  it('lets a spelling fix win over a rule hint without a fix', () => {
    const hint = issue({ ruleId: 'nl.style.long', source: 'rules', category: 'style', offset: 0, length: 20 })
    const spell = issue({ offset: 5, length: 8, replacements: ['eigenlijk'] })
    expect(spans(combineLocal([hint], [spell]))).toEqual([['spell', 5, 8]])
  })

  it('keeps everything that does not overlap, sorted', () => {
    const a = issue({ ruleId: 'r', source: 'rules', offset: 10, length: 3, replacements: ['y'] })
    const b = issue({ offset: 0, length: 4 })
    const c = issue({ offset: 20, length: 2 })
    expect(spans(combineLocal([a], [c, b]))).toEqual([
      ['spell', 0, 4],
      ['r', 10, 3],
      ['spell', 20, 2],
    ])
  })
})

describe('mergeIssues', () => {
  const local = [issue({ offset: 0, length: 8, text: 'eigelijk', replacements: ['eigenlijk'] })]

  it('drops LanguageTool matches that overlap a local issue', () => {
    const lt = [
      issue({ ruleId: 'lt:MORFOLOGIK_RULE_NL_NL', source: 'languagetool', offset: 0, length: 8 }),
      issue({ ruleId: 'lt:HUN_HEBBEN', source: 'languagetool', category: 'grammar', offset: 12, length: 10 }),
    ]
    expect(spans(mergeIssues(local, lt))).toEqual([
      ['spell', 0, 8],
      ['lt:HUN_HEBBEN', 12, 10],
    ])
  })

  it("ignores LanguageTool's speller when Hunspell already checked the words", () => {
    const lt = [issue({ ruleId: 'lt:MORFOLOGIK_RULE_NL_NL', source: 'languagetool', offset: 20, length: 6 })]
    expect(mergeIssues(local, lt, { localSpell: true })).toHaveLength(1)
    expect(mergeIssues(local, lt, { localSpell: false })).toHaveLength(2)
  })

  it('never returns overlapping LanguageTool matches', () => {
    const lt = [
      issue({ ruleId: 'lt:A', source: 'languagetool', category: 'grammar', offset: 30, length: 10 }),
      issue({ ruleId: 'lt:B', source: 'languagetool', category: 'grammar', offset: 35, length: 3 }),
    ]
    expect(spans(mergeIssues([], lt))).toEqual([['lt:A', 30, 10]])
  })
})

describe('withStableIds', () => {
  it('builds ids from rule and text, not offsets', () => {
    const a = withStableIds([issue({ offset: 3, length: 4, text: 'word' }), issue({ offset: 30, length: 4, text: 'Word' })])
    expect(a.map((i) => i.id)).toEqual(['spell:word#0', 'spell:word#1'])
    const b = withStableIds([issue({ offset: 13, length: 4, text: 'word' })])
    expect(b[0].id).toBe(a[0].id)
  })
})

describe('remapIssues', () => {
  const old = 'Ik heb eigelijk ideeen.'
  const issues = [issue({ offset: 7, length: 8, text: 'eigelijk' }), issue({ offset: 16, length: 6, text: 'ideeen' })]

  it('shifts issues after an edit and keeps the ones before it', () => {
    const next = 'Nu heb ik eigelijk ideeen.'
    const out = remapIssues(issues, old, next)
    expect(out.map((i) => next.slice(i.offset, i.offset + i.length))).toEqual(['eigelijk', 'ideeen'])
  })

  it('drops an issue the user is typing in', () => {
    const next = 'Ik heb eigenlijk ideeen.'
    const out = remapIssues(issues, old, next)
    expect(out.map((i) => next.slice(i.offset, i.offset + i.length))).toEqual(['ideeen'])
  })

  it('drops an issue when letters are glued onto it', () => {
    const next = 'Ik heb eigelijk ideeenx.'
    expect(remapIssues(issues, old, next).map((i) => i.text)).toEqual(['eigelijk'])
  })

  it('keeps an issue when a space is typed after it', () => {
    const o = 'Ik heb eigelijk'
    const is = [issue({ offset: 7, length: 8, text: 'eigelijk' })]
    expect(remapIssues(is, o, o + ' ')).toHaveLength(1)
  })
})
