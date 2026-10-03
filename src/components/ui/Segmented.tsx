import { useRef, type KeyboardEvent, type ReactNode } from 'react'

export interface SegmentedOption<T extends string | number> {
  value: T
  label: ReactNode
  title?: string
  disabled?: boolean
  /** lang attribute for the label, e.g. 'ar' for العربية */
  lang?: string
}

interface Props<T extends string | number> {
  options: SegmentedOption<T>[]
  value: T
  onChange: (v: T) => void
  ariaLabel: string
  className?: string
  /** 'text' (default): plain words, active in --main. 'boxed': one tonal strip, for forms. */
  variant?: 'text' | 'boxed'
}

/**
 * A row of mutually exclusive options (Monkeytype-style config group).
 * Radio-group keyboard model: one tab stop, arrow keys move and select.
 */
export function Segmented<T extends string | number>({ options, value, onChange, ariaLabel, className = '', variant = 'text' }: Props<T>) {
  const ref = useRef<HTMLDivElement>(null)
  const enabled = options.filter((o) => !o.disabled)
  const activeIndex = options.findIndex((o) => o.value === value)

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End']
    if (!keys.includes(e.key) || enabled.length === 0) return
    e.preventDefault()
    const rtl = ref.current ? getComputedStyle(ref.current).direction === 'rtl' : false
    const at = Math.max(0, enabled.findIndex((o) => o.value === value))
    let next = at
    if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = enabled.length - 1
    else {
      const forward = e.key === 'ArrowDown' || (e.key === 'ArrowRight') !== rtl
      const step = e.key === 'ArrowUp' || e.key === 'ArrowDown' ? (e.key === 'ArrowDown' ? 1 : -1) : forward ? 1 : -1
      next = (at + step + enabled.length) % enabled.length
    }
    const opt = enabled[next]
    onChange(opt.value)
    const idx = options.indexOf(opt)
    ;(ref.current?.children[idx] as HTMLElement | undefined)?.focus()
  }

  return (
    <div
      ref={ref}
      className={`segmented ${variant === 'boxed' ? 'segmented-boxed' : ''} ${className}`.trim()}
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
    >
      {options.map((o, i) => {
        const active = o.value === value
        const tabbable = active || (activeIndex === -1 && i === 0)
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={tabbable ? 0 : -1}
            title={o.title}
            lang={o.lang}
            disabled={o.disabled}
            className={active ? 'is-active' : ''}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
