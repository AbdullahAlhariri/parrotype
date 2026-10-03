/**
 * Backup, restore and reset of everything Parrotype keeps in this browser:
 * every localStorage key that starts with 'parrotype.' (settings, stats, nest, font, ui, ...).
 * After an import or reset the page reloads so every persisted store rehydrates cleanly.
 */

export const PREFIX = 'parrotype.'
const FLASH_KEY = 'parrotype:flash'

export interface Backup {
  app: 'parrotype'
  version: 1
  exportedAt: string
  data: Record<string, unknown>
}

/** Minimal Storage surface, so tests can pass a Map-backed fake. */
export interface KeyValueStore {
  readonly length: number
  key(index: number): string | null
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

const safeStorage = (): KeyValueStore | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

export function ownKeys(store: KeyValueStore): string[] {
  const keys: string[] = []
  for (let i = 0; i < store.length; i++) {
    const k = store.key(i)
    if (k && k.startsWith(PREFIX)) keys.push(k)
  }
  return keys.sort()
}

/**
 * How a stored value goes into the backup. JSON (what the zustand stores write) is embedded as
 * JSON so the file stays readable. Anything else, including JSON-encoded strings and numbers
 * written differently from JSON.stringify, is kept as the raw string, so import gives back
 * exactly the same bytes (applyBackup writes strings verbatim).
 */
export function encodeValue(raw: string): unknown {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'string' && JSON.stringify(parsed) === raw) return parsed
  } catch {
    /* not JSON */
  }
  return raw
}

export function collectData(store: KeyValueStore, now = new Date()): Backup {
  const data: Record<string, unknown> = {}
  for (const k of ownKeys(store)) {
    const raw = store.getItem(k)
    if (raw == null) continue
    data[k] = encodeValue(raw)
  }
  return { app: 'parrotype', version: 1, exportedAt: now.toISOString(), data }
}

export type ParseResult = { ok: true; backup: Backup; keys: string[] } | { ok: false; error: string }

/** Validate a backup file's text. Errors are plain sentences for the UI. */
export function parseBackup(text: string): ParseResult {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return { ok: false, error: 'That file is not JSON. Pick a file made with "Export everything".' }
  }
  if (!json || typeof json !== 'object') return { ok: false, error: 'That file is empty or not a Parrotype backup.' }
  const b = json as Partial<Backup>
  if (b.app !== 'parrotype' || typeof b.data !== 'object' || b.data === null || Array.isArray(b.data)) {
    return { ok: false, error: 'That file is not a Parrotype backup.' }
  }
  if (typeof b.version === 'number' && b.version > 1) {
    return { ok: false, error: 'That backup comes from a newer Parrotype. Update this one first.' }
  }
  const keys = Object.keys(b.data).filter((k) => k.startsWith(PREFIX))
  if (keys.length === 0) return { ok: false, error: 'That backup has nothing in it.' }
  return { ok: true, backup: { app: 'parrotype', version: 1, exportedAt: String(b.exportedAt ?? ''), data: b.data }, keys }
}

/** Replace all Parrotype data with the backup's. Keys outside the prefix are ignored. */
export function applyBackup(store: KeyValueStore, backup: Backup) {
  for (const k of ownKeys(store)) store.removeItem(k)
  for (const [k, v] of Object.entries(backup.data)) {
    if (!k.startsWith(PREFIX)) continue
    store.setItem(k, typeof v === 'string' ? v : JSON.stringify(v))
  }
}

export function clearData(store: KeyValueStore) {
  for (const k of ownKeys(store)) store.removeItem(k)
}

export const backupFileName = (now = new Date()) => {
  const p = (n: number) => String(n).padStart(2, '0')
  return `parrotype-backup-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}.json`
}

/** Download everything as one JSON file. */
export function exportAll(): boolean {
  const store = safeStorage()
  if (!store) return false
  const backup = collectData(store)
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = backupFileName()
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return true
}

/** Show a toast after the next reload (sessionStorage, outside the exported prefix). */
export function flashAfterReload(message: string) {
  try {
    sessionStorage.setItem(FLASH_KEY, message)
  } catch {
    /* private mode: no message, still fine */
  }
}

export function takeFlash(): string | null {
  try {
    const m = sessionStorage.getItem(FLASH_KEY)
    if (m) sessionStorage.removeItem(FLASH_KEY)
    return m
  } catch {
    return null
  }
}

export function importAndReload(backup: Backup) {
  const store = safeStorage()
  if (!store) return false
  applyBackup(store, backup)
  flashAfterReload('Backup restored.')
  location.reload()
  return true
}

export function resetAndReload() {
  const store = safeStorage()
  if (!store) return false
  clearData(store)
  flashAfterReload('Everything is deleted. Kees kept nothing.')
  location.reload()
  return true
}
