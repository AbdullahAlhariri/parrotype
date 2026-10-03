import { useEffect, useId, useRef, type MouseEvent, type ReactNode } from 'react'

/**
 * True when a click on a <dialog> landed on its ::backdrop. e.target alone is not enough:
 * clicks in the dialog's own padding also report the dialog as the target.
 */
export function isBackdropClick(e: MouseEvent<HTMLDialogElement>): boolean {
  const d = e.currentTarget
  if (e.target !== d) return false
  // keyboard-generated clicks have no position; never treat them as backdrop clicks
  if (e.clientX === 0 && e.clientY === 0 && e.detail === 0) return false
  const r = d.getBoundingClientRect()
  return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom
}

interface Props {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  className?: string
}

/**
 * Native <dialog> modal: Esc closes, focus is trapped and restored by the browser.
 * Only for destructive confirmation (settings are a page, not a modal).
 * Put buttons in <div className="modal-actions">.
 */
export function Modal({ open, onClose, title, children, className = '' }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      className={`modal ${className}`.trim()}
      aria-labelledby={title ? titleId : undefined}
      onClose={onClose}
      onCancel={(e) => {
        // let the palette's Esc handler know this Esc belongs to the dialog
        e.stopPropagation()
      }}
      onClick={(e) => {
        if (isBackdropClick(e)) onClose()
      }}
    >
      {title && (
        <h2 className="modal-title" id={titleId}>
          {title}
        </h2>
      )}
      {children}
    </dialog>
  )
}
