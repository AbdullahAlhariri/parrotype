import { describe, expect, it } from 'vitest'
import { loadTestDictionary } from './dict'

describe('loadTestDictionary', () => {
  it('accepts Dutch compounds and rejects misspellings', async () => {
    const nl = await loadTestDictionary('nl')
    expect(nl.has('wachtwoord')).toBe(true)
    expect(nl.has('zonnebloem')).toBe(true)
    expect(nl.has('eigelijk')).toBe(false)
  })
})
