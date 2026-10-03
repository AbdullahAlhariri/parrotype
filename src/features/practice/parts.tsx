import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from '@/lib/router'

/** "Weak spots" link back to the hub, above a sub-page title. */
export function SubHead({ title, children, back = '/practice', backLabel = 'Weak spots' }: { title: ReactNode; children?: ReactNode; back?: string; backLabel?: string }) {
  return (
    <header className="practice-subhead">
      <Link to={back} className="practice-back link-btn">
        {backLabel}
      </Link>
      <h1 className="page-title">{title}</h1>
      {children}
    </header>
  )
}

const PREFS_KEY = 'parrotype.practice'

function readPrefs(): Record<string, unknown> {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') ?? {}
  } catch {
    return {}
  }
}

/** A small per-browser preference (remembered choice, not data). Survives a blocked localStorage. */
export function useLocalPref<T extends string>(key: string, fallback: T, allowed: readonly T[]): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    const v = readPrefs()[key]
    return allowed.includes(v as T) ? (v as T) : fallback
  })
  const set = useCallback(
    (v: T) => {
      setValue(v)
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify({ ...readPrefs(), [key]: v }))
      } catch {
        /* private mode: the choice just isn't remembered */
      }
    },
    [key],
  )
  return [value, set]
}

/** Custom tick on the 24px grid, 2px stroke, rounded joins. */
export function TickIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  )
}

/** 0.094 -> "9.4%", 0.31 -> "31%" */
export const pct = (rate: number) => {
  const p = rate * 100
  return `${p < 10 ? Math.round(p * 10) / 10 : Math.round(p)}%`
}

/** "later today", "tomorrow", "in 3 days" */
export function dueIn(ms: number, now = Date.now()): string {
  const day = 24 * 60 * 60 * 1000
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  const days = Math.floor((ms - start.getTime()) / day)
  if (ms <= now) return 'now'
  if (days <= 0) return 'later today'
  if (days === 1) return 'tomorrow'
  return `in ${days} days`
}

/**
 * Enter runs `fn` when nothing interactive has focus (the result section, or the page itself).
 * Result screens use it for the step after "Again" (which is tab, then enter).
 */
export function useEnterKey(fn: () => void, enabled = true) {
  const ref = useRef(fn)
  useEffect(() => {
    ref.current = fn
  })
  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.repeat || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
      const t = e.target
      if (t instanceof Element && t.closest('a, button, input, textarea, select, [contenteditable="true"], dialog')) return
      e.preventDefault()
      ref.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled])
}
