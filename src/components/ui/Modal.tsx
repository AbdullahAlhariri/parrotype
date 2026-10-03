import { useEffect, useId, useRef, type ReactNode } from 'react'

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
        if (e.target === ref.current) onClose()
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
