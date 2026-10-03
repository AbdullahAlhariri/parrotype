import { useId, type ReactNode } from 'react'

interface Props {
  checked: boolean
  onChange: (v: boolean) => void
  label: ReactNode
  hint?: ReactNode
  disabled?: boolean
}

/** A switch. The whole label is clickable; the hint is read as a description, not as part of the name. */
export function Toggle({ checked, onChange, label, hint, disabled }: Props) {
  const id = useId()
  const labelId = `${id}-label`
  const hintId = hint ? `${id}-hint` : undefined
  return (
    <label className={`toggle ${disabled ? 'is-disabled' : ''}`.trim()}>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        aria-labelledby={labelId}
        aria-describedby={hintId}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="toggle-track" aria-hidden="true">
        <span className="toggle-thumb" />
      </span>
      <span className="toggle-text">
        <span className="toggle-label" id={labelId}>
          {label}
        </span>
        {hint && (
          <span className="toggle-hint" id={hintId}>
            {hint}
          </span>
        )}
      </span>
    </label>
  )
}
