import { describe, expect, it } from 'vitest'
import { ALL_PACKS } from '@/content/drills'
import { RULES } from '@/checker/rules'
import { GYM_PACKS, gymHref, gymPackFor, ruleMark } from './gym'

describe('gym links', () => {
  it('every pack the stats page links to exists, with the same title and language', () => {
    for (const p of Object.values(GYM_PACKS)) {
      const real = ALL_PACKS.find((x) => x.id === p.id)
      expect(real, p.id).toBeDefined()
      expect(real!.title).toBe(p.title)
      expect(real!.lang).toBe(p.lang)
    }
  })

  it('maps checker rules onto the pack for the same contrast', () => {
    expect(gymPackFor('nl.dt.hij-t')?.id).toBe('nl.dt')
    expect(gymPackFor('nl.agr.stem-t')?.id).toBe('nl.dt')
    expect(gymPackFor('nl.past.kofschip')?.id).toBe('nl.kofschip')
    expect(gymPackFor('nl.part.aux-d')?.id).toBe('nl.participle')
    expect(gymPackFor('nl.art.het-de')?.id).toBe('nl.de-het')
    expect(gymPackFor('nl.cmp.groter-dan')?.id).toBe('nl.als-dan')
    expect(gymPackFor('nl.spell.lijdt-leidt')?.id).toBe('nl.ei-ij')
    expect(gymPackFor('en.its-it-is')?.id).toBe('en.its')
    expect(gymPackFor('lt:EN_A_VS_AN')?.id).toBe('en.a-an')
    expect(gymPackFor('ar.ha-for-taa')?.id).toBe('ar.taa')
    expect(gymPackFor('gym.nl.au-ou')?.id).toBe('nl.au-ou')
  })

  it('leaves rules the gym cannot drill alone', () => {
    for (const id of ['nl.punct.space-before', 'nl.cap.ik', 'nl.wo.verb-second', 'en.run-on-and', 'spell', 'lt:WHITESPACE_RULE', 'gym.nope']) {
      expect(gymPackFor(id), id).toBeNull()
    }
  })

  it('every mapped rule id is a real rule in the same language', () => {
    for (const [lang, rules] of Object.entries(RULES)) {
      for (const r of rules) {
        const p = gymPackFor(r.id)
        if (p) expect(p.lang, r.id).toBe(lang)
      }
    }
  })

  it('links by pack id', () => {
    expect(gymHref(GYM_PACKS['nl.dt'])).toBe('/gym?pack=nl.dt')
  })
})

describe('ruleMark', () => {
  it('uses the rule category when known', () => {
    const cats = new Map([
      ['nl.spell.enigste', 'grammar' as const],
      ['nl.dt.past-dt', 'spelling' as const],
      ['nl.lex.heel-mooie', 'style' as const],
    ])
    expect(ruleMark('nl.spell.enigste', cats)).toBe('grammar')
    expect(ruleMark('nl.dt.past-dt', cats)).toBe('spell')
    expect(ruleMark('nl.lex.heel-mooie', cats)).toBe('hint')
  })

  it('guesses from the id otherwise', () => {
    expect(ruleMark('spell')).toBe('spell')
    expect(ruleMark('lt:MORFOLOGIK_RULE_EN_US')).toBe('spell')
    expect(ruleMark('gym.nl.ei-ij')).toBe('spell')
    expect(ruleMark('nl.dt.hij-t')).toBe('grammar')
    expect(ruleMark('nl.compound.split')).toBe('spell')
  })
})
