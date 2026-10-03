import { useRef, type KeyboardEvent } from 'react'
import { useTypingFont } from '@/styles/fontStore'
import { TYPING_FONTS } from '@/styles/fonts'
import { Icon } from '@/components/ui'

/** Three curated typing fonts, each previewed in itself with the letters people confuse. */
export function FontPicker({ labelledBy }: { labelledBy: string }) {
  const font = useTypingFont((f) => f.font)
  const setFont = useTypingFont((f) => f.setFont)
  const ref = useRef<HTMLDivElement>(null)

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const at = Math.max(0, TYPING_FONTS.findIndex((f) => f.id === font))
    const next = (at + step + TYPING_FONTS.length) % TYPING_FONTS.length
    setFont(TYPING_FONTS[next].id)
    ;(ref.current?.children[next] as HTMLElement | undefined)?.focus()
  }

  return (
    <div ref={ref} className="font-picker" role="radiogroup" aria-labelledby={labelledBy} onKeyDown={onKeyDown}>
      {TYPING_FONTS.map((f) => {
        const active = f.id === font
        return (
          <button
            key={f.id}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            className="font-chip"
            onClick={() => setFont(f.id)}
          >
            <span className="font-chip-sample mono-text" style={{ fontFamily: f.family }} aria-hidden="true">
              hij wordt, Il1| O0 rn m ë
            </span>
            <span className="font-chip-name">
              {f.name}
              {active && <Icon name="check" size={16} label="selected" />}
            </span>
            <span className="font-chip-note">{f.note}</span>
          </button>
        )
      })}
    </div>
  )
}
