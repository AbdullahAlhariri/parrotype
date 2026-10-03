import { memo, useMemo } from 'react'
import { keyboardRows, keystrokesFor, layoutFor, type KeyDef, type LayoutId } from '@/engine'
import type { Lang } from '@/types'
import './keyboard.css'

export interface OnScreenKeyboardProps {
  lang: Lang
  /** the character to type next ('' or undefined: nothing highlighted). 'لا' highlights B. */
  next?: string
  /** per-key heat, 0..1, keyed by the key's lowercase base character (e.g. stats miss rate) */
  heat?: Record<string, number>
  /** tooltip text per key for the heatmap, keyed like `heat` */
  heatLabel?: (char: string, value: number) => string
  layout?: LayoutId
  className?: string
  /** accessible name; the keyboard is decorative unless a heatmap is shown */
  label?: string
}

const UNITS = 15
const LATIN = keyboardRows('qwerty-us').flat()
const latinOf = new Map(LATIN.map((k) => [k.code, k.base]))

const isMark = (s: string) => /^\p{M}+$/u.test(s)
const show = (s: string) => (isMark(s) ? `◌${s}` : s)

interface Shape {
  key: string
  code: string
  x: number
  row: number
  width: number
  base: string
  shift: string
  latin?: string
  home?: boolean
  kind: 'char' | 'shift' | 'space'
  side?: 'L' | 'R'
}

function shapes(layout: LayoutId): Shape[] {
  const rows = keyboardRows(layout)
  const out: Shape[] = []
  const arabic = layout === 'arabic-101'
  rows.forEach((row) =>
    row.forEach((k: KeyDef) => {
      if (k.code === 'Space') {
        out.push({ key: 'Space', code: 'Space', x: k.x, row: 4, width: k.width, base: '', shift: '', kind: 'space' })
        return
      }
      const letter = /\p{L}/u.test(k.base) && k.base.toLowerCase() !== k.base.toUpperCase()
      out.push({
        key: k.code,
        code: k.code,
        x: k.x,
        row: k.row,
        width: k.width,
        base: arabic ? k.base : letter ? k.base.toUpperCase() : k.base,
        shift: arabic ? k.shift : letter ? '' : k.shift,
        latin: arabic ? latinOf.get(k.code)?.toUpperCase() : undefined,
        home: k.home,
        kind: 'char',
      })
    }),
  )
  const row3 = rows[3]
  const first = row3[0]
  const last = row3[row3.length - 1]
  out.push({ key: 'ShiftLeft', code: 'ShiftLeft', x: 0, row: 3, width: first.x - 0.1, base: 'shift', shift: '', kind: 'shift', side: 'L' })
  const rx = last.x + last.width + 0.1
  out.push({ key: 'ShiftRight', code: 'ShiftRight', x: rx, row: 3, width: Math.max(1.5, UNITS - rx), base: 'shift', shift: '', kind: 'shift', side: 'R' })
  return out
}

/** Physical key codes to light up for the next character (opposite-hand Shift for capitals). */
function litCodes(next: string | undefined, layout: LayoutId): Set<string> {
  const lit = new Set<string>()
  if (!next) return lit
  if (next === ' ') {
    lit.add('Space')
    return lit
  }
  const strokes = keystrokesFor(next, layout) ?? keystrokesFor(next.toLowerCase(), layout)
  if (!strokes) return lit
  for (const s of strokes) {
    lit.add(s.code)
    if (s.shift) lit.add(s.hand === 'L' ? 'ShiftRight' : 'ShiftLeft')
  }
  return lit
}

/**
 * The layout from src/engine/keyboard.ts. Never mirrored for Arabic: the keyboard is
 * physical, so it is always dir="ltr" with Q top left. Highlights the next key, or shows a
 * heatmap (stats page) when `heat` is given.
 */
export const OnScreenKeyboard = memo(function OnScreenKeyboard({ lang, next, heat, heatLabel, layout, className = '', label }: OnScreenKeyboardProps) {
  const id = layout ?? layoutFor(lang)
  const keys = useMemo(() => shapes(id), [id])
  const lit = useMemo(() => litCodes(next, id), [next, id])
  const decorative = !heat && !label

  return (
    <div
      className={`osk ${heat ? 'osk--heat' : ''} ${className}`}
      dir="ltr"
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : (label ?? 'Keyboard heatmap')}
    >
      <div className="osk-board" style={{ ['--osk-units' as string]: UNITS }}>
        {keys.map((k) => {
          const h = heat && k.kind === 'char' ? (heat[k.base.toLowerCase()] ?? heat[k.base] ?? 0) : 0
          const cls = ['osk-key', `osk-key--${k.kind}`]
          if (lit.has(k.code)) cls.push('is-next')
          if (k.home) cls.push('is-home')
          return (
            <span
              key={k.key}
              className={cls.join(' ')}
              style={{
                ['--x' as string]: k.x,
                ['--row' as string]: k.row,
                ['--w' as string]: k.width,
                ['--heat' as string]: h,
              }}
              title={heat && k.kind === 'char' && h > 0 ? (heatLabel?.(k.base.toLowerCase(), h) ?? `${k.base}: ${Math.round(h * 100)}%`) : undefined}
            >
              {k.kind === 'char' && (
                <>
                  <span className="osk-base" lang={lang === 'ar' ? 'ar' : undefined}>
                    {show(k.base)}
                  </span>
                  {k.shift && k.shift !== k.base && (
                    <span className="osk-shift" lang={lang === 'ar' ? 'ar' : undefined}>
                      {show(k.shift)}
                    </span>
                  )}
                  {k.latin && <span className="osk-latin">{k.latin}</span>}
                </>
              )}
              {k.kind === 'shift' && <span className="osk-word">shift</span>}
            </span>
          )
        })}
      </div>
    </div>
  )
})
