import { useToasts } from '@/components/ui/toast'
import { Icon } from '@/components/ui/Icon'

/** Toasts, bottom centre, announced politely. Push them with toast('...') from anywhere. */
export function Toaster() {
  const items = useToasts((t) => t.items)
  const dismiss = useToasts((t) => t.dismiss)
  return (
    <div className="toaster" role="status" aria-live="polite" aria-relevant="additions">
      {items.map((t) => (
        <div key={t.id} className={`toast toast-${t.tone}`}>
          <span>{t.message}</span>
          <button type="button" className="toast-close" aria-label="Dismiss" onClick={() => dismiss(t.id)}>
            <Icon name="close" size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
