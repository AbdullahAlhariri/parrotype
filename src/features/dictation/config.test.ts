import { describe, expect, it } from 'vitest'
import { configFromQuery } from './config'
import { DEFAULT_CONFIG } from './logic/items'

const q = (s: string) => new URLSearchParams(s)

describe('configFromQuery', () => {
  it('returns null without config params', () => {
    expect(configFromQuery(DEFAULT_CONFIG, q('?x=1'))).toBeNull()
  })
  it('reads focus and level', () => {
    expect(configFromQuery(DEFAULT_CONFIG, q('?focus=dt,participle&level=2'))).toMatchObject({ mode: 'sentences', level: 2, focus: ['dt', 'participle'] })
  })
  it('pairs imply the pairs mode', () => {
    expect(configFromQuery(DEFAULT_CONFIG, q('?pairs=word-wordt&length=5'))).toMatchObject({ mode: 'pairs', pairs: ['word-wordt'], length: 5 })
  })
  it('falls back on nonsense', () => {
    expect(configFromQuery(DEFAULT_CONFIG, q('?level=9&length=7&playback=loud'))).toMatchObject({ level: 1, length: 10, playback: 'listen' })
  })
})
