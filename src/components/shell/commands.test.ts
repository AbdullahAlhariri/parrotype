import { describe, expect, test } from 'vitest'
import { DEFAULT_SETTINGS } from '@/state/settings'
import { ROUTES } from '@/routes'
import { THEMES } from '@/styles/themes'
import { buildCommands, type CommandContext } from './commands'
import { rank } from './fuzzy'

const ctx = (over: Partial<CommandContext> = {}): CommandContext => ({
  path: '/stats',
  settings: { ...DEFAULT_SETTINGS },
  set: () => {},
  font: 'recursive',
  setFont: () => {},
  kees: 'lively',
  setKees: () => {},
  ...over,
})

describe('command palette commands', () => {
  test('every route, language, theme (plus auto) and font is reachable', () => {
    const cmds = buildCommands(ctx())
    for (const r of ROUTES) expect(cmds.some((c) => c.id === `go:${r.path}`)).toBe(true)
    expect(cmds.filter((c) => c.group === 'practice language')).toHaveLength(3)
    expect(cmds.filter((c) => c.group === 'theme')).toHaveLength(THEMES.length + 1)
    expect(cmds.filter((c) => c.group === 'typing font')).toHaveLength(3)
  })

  test('ids are unique', () => {
    const ids = buildCommands(ctx()).map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('current values are marked', () => {
    const cmds = buildCommands(ctx())
    const current = cmds.filter((c) => c.current).map((c) => c.id)
    expect(current).toContain('go:/stats')
    expect(current).toContain('lang:nl')
    expect(current).toContain('theme:kea-dark')
    expect(current).toContain('font:recursive')
    expect(current).toContain('sound:false')
    expect(current).toContain('kees:lively')
  })

  test('running a toggle sets the value', () => {
    const calls: [string, unknown][] = []
    const cmds = buildCommands(ctx({ set: (k, v) => calls.push([k, v]) }))
    cmds.find((c) => c.id === 'sound:true')!.run()
    cmds.find((c) => c.id === 'theme:auto')!.run()
    expect(calls).toEqual([
      ['sound', true],
      ['theme', 'auto'],
    ])
  })

  test('natural queries find the right row first', () => {
    const cmds = buildCommands(ctx())
    expect(rank('lori light', cmds)[0].id).toBe('theme:lorikeet-light')
    expect(rank('dutch', cmds)[0].id).toBe('lang:nl')
    expect(rank('font plex', cmds)[0].id).toBe('font:plex')
    expect(rank('sound off', cmds)[0].id).toBe('sound:false')
    expect(rank('go set', cmds)[0].id).toBe('go:/settings')
    expect(rank('export', cmds)[0].id).toBe('data:export')
  })
})
