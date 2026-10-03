import { useId, type ReactNode } from 'react'

interface Props {
  label: ReactNode
  hint?: ReactNode
  /** render prop gets the id to put on the control and the hint id for aria-describedby */
  children: (ids: { id: string; hintId?: string }) => ReactNode
  className?: string
}

/** Label + control + hint, wired up for screen readers. */
export function Field({ label, hint, children, className = '' }: Props) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  return (
    <div className={`field ${className}`.trim()}>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      {children({ id, hintId })}
      {hint && (
        <p className="field-hint" id={hintId}>
          {hint}
        </p>
      )}
    </div>
  )
}
