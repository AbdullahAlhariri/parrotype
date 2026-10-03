import { describe, expect, it } from 'vitest'
import { findPack } from '@/content/drills'
import { nlRules } from '.'
import { drillPackFor } from './drills'

describe('drillPackFor', () => {
  it('maps rule families to drill packs', () => {
    expect(drillPackFor('nl.dt.hij-t')).toBe('nl.dt')
    expect(drillPackFor('nl.part.aux-d')).toBe('nl.participle')
    expect(drillPackFor('nl.past.kofschip')).toBe('nl.kofschip')
    expect(drillPackFor('nl.rel.het-die')).toBe('nl.die-dat')
    expect(drillPackFor('nl.punct.space-before')).toBeUndefined()
  })
  it('only points at packs that exist', () => {
    for (const r of nlRules) {
      const pack = drillPackFor(r.id)
      if (pack) expect(findPack(pack)?.lang, `${r.id} -> ${pack}`).toBe('nl')
    }
  })
})
