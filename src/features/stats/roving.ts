import { useCallback, useRef, useState, type KeyboardEvent } from 'react'

// Roving tabindex for 2D layouts (calendar cells, keyboard keys): one tab stop,
// arrow keys move between items by row and horizontal position.

export interface GridPos {
  row: number
  /** horizontal centre, any unit */
  x: number
}

const KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'] as const
export type NavKey = (typeof KEYS)[number]
export const isNavKey = (k: string): k is NavKey => (KEYS as readonly string[]).includes(k)

/** Index to move to from `from` for an arrow / Home / End key, or `from` if there is nowhere to go. */
export function nextGridIndex(items: readonly GridPos[], from: number, key: NavKey): number {
  const cur = items[from]
  if (!cur) return from
  let best = from
  let bestScore = Infinity
  const consider = (i: number, score: number) => {
    if (score < bestScore) {
      best = i
      bestScore = score
    }
  }
  if (key === 'ArrowLeft' || key === 'ArrowRight' || key === 'Home' || key === 'End') {
    items.forEach((it, i) => {
      if (i === from || it.row !== cur.row) return
      if (key === 'ArrowRight' && it.x > cur.x) consider(i, it.x - cur.x)
      if (key === 'ArrowLeft' && it.x < cur.x) consider(i, cur.x - it.x)
      if (key === 'Home' && it.x < cur.x) consider(i, it.x)
      if (key === 'End' && it.x > cur.x) consider(i, -it.x)
    })
    return best
  }
  // up / down: the nearest row in that direction, then the nearest x within it
  const down = key === 'ArrowDown'
  let row: number | null = null
  for (const it of items) {
    if (down ? it.row > cur.row : it.row < cur.row) {
      if (row === null || (down ? it.row < row : it.row > row)) row = it.row
    }
  }
  if (row === null) return from
  items.forEach((it, i) => {
    if (it.row === row) consider(i, Math.abs(it.x - cur.x))
  })
  return best
}

/** React glue: `tabIndex`, a ref collector and a keydown handler for a set of positioned items. */
export function useRovingGrid<T extends HTMLElement>(items: readonly GridPos[], initial = 0) {
  const [active, setActive] = useState(initial)
  const refs = useRef<(T | null)[]>([])
  const index = Math.min(active, Math.max(0, items.length - 1))

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isNavKey(e.key)) return
      e.preventDefault()
      const next = nextGridIndex(items, index, e.key)
      setActive(next)
      refs.current[next]?.focus()
    },
    [items, index],
  )

  const itemProps = (i: number) => ({
    tabIndex: i === index ? 0 : -1,
    ref: (el: T | null) => {
      refs.current[i] = el
    },
    onFocus: () => setActive(i),
  })

  return { active: index, setActive, onKeyDown, itemProps }
}
