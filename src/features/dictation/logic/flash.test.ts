import { describe, expect, it } from 'vitest'
import { PAIRS } from '@/content/dictation'
import { flashMs, flashParts } from './flash'
import { itemsFromPair } from './items'

describe('flashParts', () => {
  it('shows a plain sentence as it is', () => {
    expect(flashParts('Het ijs is nog te dun.')).toEqual([{ kind: 'text', text: 'Het ijs is nog te dun.' }])
  })

  it('puts both spellings where the pair word goes', () => {
    expect(flashParts('Hij wordt morgen twintig.', 'wordt', ['word', 'wordt'])).toEqual([
      { kind: 'text', text: 'Hij ' },
      { kind: 'choice', options: ['word', 'wordt'] },
      { kind: 'text', text: ' morgen twintig.' },
    ])
  })

  it('keeps the capital of a word at the start of the sentence', () => {
    expect(flashParts('Then we went home.', 'then', ['then', 'than'])[0]).toEqual({ kind: 'choice', options: ['Then', 'Than'] })
  })

  it('matches whole words only, with apostrophes and Arabic letters', () => {
    expect(flashParts("It's late and its tail is wet.", 'its', ['its', "it's"])).toEqual([
      { kind: 'text', text: "It's late and " },
      { kind: 'choice', options: ['its', "it's"] },
      { kind: 'text', text: ' tail is wet.' },
    ])
    expect(flashParts('نسي أحمد كتابه في البيت.', 'كتابه', ['كتابة', 'كتابه'])[1]).toEqual({ kind: 'choice', options: ['كتابة', 'كتابه'] })
  })

  it('hides the pair word in every minimal-pair sentence of every language', () => {
    for (const lang of ['nl', 'en', 'ar'] as const) {
      for (const p of PAIRS[lang]) {
        for (const it of itemsFromPair(p)) {
          const parts = flashParts(it.text, it.target, it.choices)
          expect(parts.filter((x) => x.kind === 'choice'), `${it.id}: ${it.text}`).toHaveLength(1)
        }
      }
    }
  })
})

describe('flashMs', () => {
  it('gives longer sentences more time, within limits', () => {
    expect(flashMs('Ja.')).toBe(2200)
    expect(flashMs('Hij wordt morgen twintig jaar.')).toBeGreaterThan(flashMs('Hij wordt boos.'))
    expect(flashMs('woord '.repeat(60))).toBe(9000)
  })
})
