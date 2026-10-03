import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { Lang } from '@/types'
import { LANG_TAGS, isRtl } from '@/types'
import { Icon } from '@/components/ui'
import { draftTitle, draftWhen, listDrafts, type Draft } from './lib/drafts'
import { countWords } from './lib/text'

interface Props {
  lang: Lang
  currentId: string
  /** bump to re-read the list from storage */
  version: number
  onOpen: (d: Draft) => void
  onDelete: (id: string) => void
}

/** "Drafts" button with the last 10 texts in this language. Autosave keeps them; this opens them. */
export function DraftsMenu({ lang, currentId, version, onOpen, onDelete }: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const listId = useId()
  // re-read storage only when something was saved or the menu opens, not on every keystroke
  const drafts = useMemo(() => listDrafts(lang), [lang, version, open])
  const rtl = isRtl(lang)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        setOpen(false)
        btnRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [open])

  const now = Date.now()
  return (
    <div className="wd" ref={rootRef}>
      <button ref={btnRef} type="button" className="wd-toggle" aria-expanded={open} aria-controls={listId} onClick={() => setOpen((o) => !o)}>
        drafts <span className="wd-count tabular">{drafts.length}</span>
      </button>
      {open && (
        <div className="wd-panel" id={listId}>
          {drafts.length === 0 ? (
            <p className="wd-empty">No drafts yet. Anything you write here is saved as you go.</p>
          ) : (
            <ul className="wd-list">
              {drafts.map((d) => (
                <li key={d.id} className={`wd-row${d.id === currentId ? ' is-current' : ''}`}>
                  <button
                    type="button"
                    className="wd-open"
                    onClick={() => {
                      setOpen(false)
                      if (d.id !== currentId) onOpen(d)
                    }}
                    aria-current={d.id === currentId ? 'true' : undefined}
                  >
                    <span className="wd-title" lang={LANG_TAGS[lang]} dir={rtl ? 'rtl' : 'ltr'}>
                      {draftTitle(d)}
                    </span>
                    <span className="wd-meta">
                      {d.id === currentId ? 'open now, ' : ''}
                      {countWords(d.text)} words, {draftWhen(d.updatedAt, now)}
                    </span>
                  </button>
                  <button type="button" className="wd-delete icon-btn" aria-label={`Delete draft: ${draftTitle(d, 30)}`} onClick={() => onDelete(d.id)}>
                    <Icon name="close" size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="wd-foot">The last 10 texts per language stay on this device.</p>
        </div>
      )}
    </div>
  )
}
