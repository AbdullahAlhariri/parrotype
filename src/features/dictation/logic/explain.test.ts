import { describe, expect, it } from 'vitest'
import type { Issue } from '@/types'
import { explainTokens, groupExplanations, labelTip, relevantIssues, tagName } from './explain'
import { gradeAttempt } from './grade'

const issue = (p: Partial<Issue> & Pick<Issue, 'offset' | 'length'>): Issue => ({
  id: 'i1',
  ruleId: 'nl.dt.hij-wordt',
  source: 'rules',
  lang: 'nl',
  category: 'grammar',
  text: '',
  message: 'After hij: wordt',
  replacements: [],
  confidence: 'high',
  ...p,
})

describe('explainTokens', () => {
  it('explains a Dutch d/t slip in English or in Dutch, and says which one it is', () => {
    const g = gradeAttempt('Hij wordt morgen twintig.', 'Hij word morgen twintig.', 'nl')
    const [en] = explainTokens(g, [], 'nl', 'en')
    expect(en.name).toBe('d/t ending')
    expect(en.nameLocal).toBe(false)
    expect(en.ruleLocal).toBe(false)
    const [nl] = explainTokens(g, [], 'nl', 'local')
    expect(nl.name).toBe('d/t-regel')
    expect(nl.nameLocal).toBe(true)
    expect(nl.ruleLocal).toBe(!!g.wrong[0].label?.tip.local)
  })

  it('gives Arabic names and rules in Arabic when asked', () => {
    const g = gradeAttempt('هذه مدرسة كبيرة وجميلة.', 'هذه مدرسه كبيرة وجميلة.', 'ar')
    const [ar] = explainTokens(g, [], 'ar', 'local')
    expect(ar.name).toBe('التاء المربوطة')
    expect(ar.nameLocal).toBe(true)
    expect(ar.ruleLocal).toBe(true)
    expect(ar.rule).toMatch(/[؀-ۿ]/)
    const [en] = explainTokens(g, [], 'ar', 'en')
    expect(en.name).toBe('Taa marbuta')
    expect(en.rule).not.toMatch(/[؀-ۿ]{4}/)
  })

  it('English never switches to a local text', () => {
    const g = gradeAttempt('Their parrot is quieter than they expected.', 'There parrot is quieter than they expected.', 'en')
    const rows = explainTokens(g, [], 'en', 'local')
    expect(rows).toHaveLength(1)
    expect(rows[0].nameLocal).toBe(false)
  })

  it('attaches a grammar issue on a wrong word and falls back to English when it has no local text', () => {
    const g = gradeAttempt('Hij wordt morgen twintig.', 'Hij word morgen twintig.', 'nl')
    const i = issue({ offset: 4, length: 4, text: 'word', explanation: 'Stem + t after hij.', messageLocal: 'Na hij: wordt' })
    const [row] = explainTokens(g, [i], 'nl', 'local')
    expect(row.issues).toEqual([expect.objectContaining({ message: 'Na hij: wordt', messageLocal: true, explanation: 'Stem + t after hij.', explanationLocal: false })])
    expect(row.rule).toBe('Stem + t after hij.')
    expect(row.ruleLocal).toBe(false)
  })

  it('ignores spelling issues and issues on words that were right', () => {
    const g = gradeAttempt('Hij wordt morgen twintig.', 'Hij word morgen twintig.', 'nl')
    const spell = issue({ offset: 4, length: 4, source: 'spell', category: 'spelling' })
    const elsewhere = issue({ offset: 9, length: 6 })
    expect(relevantIssues(g, [spell, elsewhere])).toEqual([])
  })

  it('names an extra word in the chosen language', () => {
    const g = gradeAttempt('Ik ben moe.', 'Ik ben heel moe.', 'nl')
    const extra = explainTokens(g, [], 'nl', 'local').find((r) => r.token.status === 'extra')
    expect(extra?.name).toBe('Extra woord')
  })
})

describe('dictation tips', () => {
  it('talks about listening and spelling, not about looking ahead', () => {
    const g = gradeAttempt('Ik ga morgen naar de markt.', 'Ik ga naar de markt.', 'nl')
    const [skipped] = explainTokens(g, [], 'nl', 'en')
    expect(skipped.name).toBe('Skipped word')
    expect(skipped.rule).toMatch(/Hear it again/)
    expect(skipped.rule).not.toMatch(/ahead/)
    const [nl] = explainTokens(g, [], 'nl', 'local')
    expect(nl.rule).toMatch(/Luister/)
    expect(nl.ruleLocal).toBe(true)
  })

  it('has Arabic versions', () => {
    const g = gradeAttempt('ذهبت إلى السوق اليوم.', 'ذهبت إلى اليوم.', 'ar')
    const [row] = explainTokens(g, [], 'ar', 'local')
    expect(row.rule).toMatch(/استمع/)
    expect(row.ruleLocal).toBe(true)
  })

  it('keeps the tip of a real spelling rule', () => {
    const g = gradeAttempt('Hij wordt morgen twintig.', 'Hij word morgen twintig.', 'nl')
    const label = g.wrong[0].label!
    expect(labelTip(label, 'nl', 'en')).toBe(label.tip.en)
    expect(labelTip(label, 'nl', 'local')).toBe(label.tip.local ?? label.tip.en)
  })
})

describe('groupExplanations', () => {
  it('shows the same mistake once with all its words', () => {
    const g = gradeAttempt('Ik heb gisteren een nieuwe fiets gekocht.', 'Ik heb een fiets gekocht.', 'nl')
    const rows = explainTokens(g, [], 'nl', 'en')
    expect(rows).toHaveLength(2)
    const groups = groupExplanations(rows)
    expect(groups).toHaveLength(1)
    expect(groups[0].tokens.map((t) => t.op.expected)).toEqual(['gisteren', 'nieuwe'])
    expect(groups[0].details).toHaveLength(2)
  })

  it('keeps different mistakes and rows with checker findings apart', () => {
    const g = gradeAttempt('Hij wordt morgen twintig jaar.', 'Hij word twintig jaar.', 'nl')
    const rows = explainTokens(g, [issue({ offset: 4, length: 4, text: 'word' })], 'nl', 'en')
    const groups = groupExplanations(rows)
    expect(groups).toHaveLength(rows.length)
    expect(groups.map((x) => x.tokens.length)).toEqual(rows.map(() => 1))
  })
})

describe('tagName', () => {
  it('falls back to English when a tag has no local name', () => {
    expect(tagName('hamza', 'ar', 'local')).toBe('الهمزة')
    expect(tagName('capital', 'ar', 'local')).toBe('Capital letter')
    expect(tagName('unknown-tag', 'nl')).toBe('unknown-tag')
  })
})
