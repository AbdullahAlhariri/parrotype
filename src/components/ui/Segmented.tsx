import type { ReactNode } from 'react'

export interface SegmentedOption<T extends string | number> {
  value: T
  label: ReactNode
  title?: string
}

interface Props<T extends string | number> {
  options: SegmentedOption<T>[]
  value: T
  onChange: (v: T) => void
  ariaLabel: string
  className?: string
}

/** A row of mutually exclusive text buttons (Monkeytype-style config bar group). */
export function Segmented<T extends string | number>({ options, value, onChange, ariaLabel, className = '' }: Props<T>) {
  return (
    <div className={`segmented ${className}`} role="radiogroup" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          title={o.title}
          className={o.value === value ? 'is-active' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
