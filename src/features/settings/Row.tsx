import { useId, type ReactNode } from 'react'

interface RowProps {
  label: ReactNode
  hint?: ReactNode
  /** the control; gets ids so it can point at the label and hint */
  children: (ids: { labelId: string; hintId?: string; controlId: string }) => ReactNode
  /** put the control under the text instead of beside it */
  stacked?: boolean
  /** true when the control is a single input that should get id={controlId} (select, slider, text) */
  labelFor?: boolean
}

/** One setting: text on the left, control on the right (or below when stacked). */
export function Row({ label, hint, children, stacked = false, labelFor = false }: RowProps) {
  const id = useId()
  const labelId = `${id}-label`
  const hintId = hint ? `${id}-hint` : undefined
  const controlId = `${id}-control`
  return (
    <div className={`set-row ${stacked ? 'is-stacked' : ''}`}>
      <div className="set-text">
        {labelFor ? (
          <label className="set-label" id={labelId} htmlFor={controlId}>
            {label}
          </label>
        ) : (
          <span className="set-label" id={labelId}>
            {label}
          </span>
        )}
        {hint && (
          <p className="set-hint" id={hintId}>
            {hint}
          </p>
        )}
      </div>
      <div className="set-control">{children({ labelId, hintId, controlId })}</div>
    </div>
  )
}

interface SectionProps {
  id: string
  title: string
  intro?: ReactNode
  children: ReactNode
}

export function Section({ id, title, intro, children }: SectionProps) {
  return (
    <section className="set-section" id={id} aria-labelledby={`${id}-title`}>
      <h2 className="set-section-title" id={`${id}-title`}>
        {title}
      </h2>
      {intro && <p className="set-intro">{intro}</p>}
      <div className="set-list">{children}</div>
    </section>
  )
}
