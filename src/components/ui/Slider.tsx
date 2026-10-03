import type { CSSProperties } from 'react'

interface Props {
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
  id?: string
  ariaLabel?: string
  ariaDescribedBy?: string
  /** text read out by screen readers, e.g. "1.75 rem" */
  valueText?: string
  className?: string
}

/** Native range input; the filled part is a plain element, no gradient. */
export function Slider({ value, min, max, step = 1, onChange, id, ariaLabel, ariaDescribedBy, valueText, className = '' }: Props) {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0
  return (
    <span className={`range ${className}`.trim()} style={{ '--pct': `${pct}%` } as CSSProperties}>
      <span className="range-track" aria-hidden="true">
        <span className="range-fill" />
      </span>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-valuetext={valueText}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </span>
  )
}
