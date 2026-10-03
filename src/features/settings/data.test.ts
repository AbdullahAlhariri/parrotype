import { describe, expect, test } from 'vitest'
import { applyBackup, backupFileName, clearData, collectData, ownKeys, parseBackup, type KeyValueStore } from './data'

class FakeStore implements KeyValueStore {
  map = new Map<string, string>()
  get length() {
    return this.map.size
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null
  }
  getItem(k: string) {
    return this.map.get(k) ?? null
  }
  setItem(k: string, v: string) {
    this.map.set(k, v)
  }
  removeItem(k: string) {
    this.map.delete(k)
  }
}

const seeded = () => {
  const s = new FakeStore()
  s.setItem('parrotype.settings', JSON.stringify({ state: { theme: 'kea-light' }, version: 1 }))
  s.setItem('parrotype.stats', JSON.stringify({ state: { sessions: [{ id: 'a' }] }, version: 1 }))
  s.setItem('parrotype.font', 'not json')
  s.setItem('other-app', 'keep me')
  return s
}

describe('settings data', () => {
  test('collects only parrotype.* keys, parsing JSON where possible', () => {
    const b = collectData(seeded(), new Date('2026-10-03T10:00:00Z'))
    expect(b.app).toBe('parrotype')
    expect(Object.keys(b.data)).toEqual(['parrotype.font', 'parrotype.settings', 'parrotype.stats'])
    expect(b.data['parrotype.font']).toBe('not json')
    expect((b.data['parrotype.settings'] as { state: { theme: string } }).state.theme).toBe('kea-light')
    expect(b.exportedAt).toBe('2026-10-03T10:00:00.000Z')
  })

  test('round trip: export, wipe, import gives the same data back', () => {
    const src = seeded()
    const text = JSON.stringify(collectData(src))
    const dst = new FakeStore()
    dst.setItem('parrotype.nest', '{"stale":true}')
    dst.setItem('other-app', 'untouched')
    const parsed = parseBackup(text)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    applyBackup(dst, parsed.backup)
    expect(ownKeys(dst)).toEqual(['parrotype.font', 'parrotype.settings', 'parrotype.stats'])
    expect(dst.getItem('parrotype.settings')).toBe(src.getItem('parrotype.settings'))
    expect(dst.getItem('parrotype.font')).toBe('not json')
    expect(dst.getItem('other-app')).toBe('untouched')
  })

  test('rejects files that are not backups, with plain messages', () => {
    expect(parseBackup('nope')).toMatchObject({ ok: false })
    expect(parseBackup('[]')).toMatchObject({ ok: false })
    expect(parseBackup('{"app":"monkeytype","data":{}}')).toMatchObject({ ok: false, error: 'That file is not a Parrotype backup.' })
    expect(parseBackup('{"app":"parrotype","version":1,"data":{"evil":1}}')).toMatchObject({ ok: false })
    expect(parseBackup('{"app":"parrotype","version":9,"data":{"parrotype.x":1}}')).toMatchObject({ ok: false })
  })

  test('ignores foreign keys inside a backup', () => {
    const dst = new FakeStore()
    applyBackup(dst, { app: 'parrotype', version: 1, exportedAt: '', data: { 'parrotype.ui': { a: 1 }, 'x.y': 2 } })
    expect([...dst.map.keys()]).toEqual(['parrotype.ui'])
  })

  test('clear removes only our keys', () => {
    const s = seeded()
    clearData(s)
    expect([...s.map.keys()]).toEqual(['other-app'])
  })

  test('file name has the date', () => {
    expect(backupFileName(new Date(2026, 9, 3))).toBe('parrotype-backup-2026-10-03.json')
  })
})
