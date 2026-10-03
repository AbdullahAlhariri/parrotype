import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { Lang } from '@/types'
import { LANG_TAGS, isRtl } from '@/types'
import { Button, Icon } from '@/components/ui'
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
  /** the draft whose delete button was pressed once: the row asks before it deletes */
  const [confirming, setConfirming] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const listId = useId()
  // re-read storage only when something was saved or the menu opens, not on every keystroke
  const drafts = useMemo(() => listDrafts(lang), [lang, version, open])
  const rtl = isRtl(lang)

  useEffect(() => {
    if (!open) setConfirming(null)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      e.stopPropagation()
      setOpen(false)
      btnRef.current?.focus()
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
      <button
        ref={btnRef}
        type="button"
        className="wd-toggle"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        drafts <span className="wd-count tabular">{drafts.length}</span>
      </button>
      {open && (
        <div className="wd-panel" id={listId}>
          {drafts.length === 0 ? (
            <p className="wd-empty">No drafts yet. Anything you write here is saved as you go.</p>
          ) : (
            <ul className="wd-list">
              {drafts.map((d) =>
                confirming === d.id ? (
                  <li key={d.id} className="wd-row wd-row--confirm">
                    <span className="wd-ask">
                      Delete ‘
                      <span className="wd-ask-title" lang={LANG_TAGS[lang]} dir={rtl ? 'rtl' : 'ltr'}>
                        {draftTitle(d, 30).replace(/[\s.,;:!?…]+$/, '')}
                      </span>
                      ’? It is gone for good.
                    </span>
                    <span className="wd-ask-buttons">
                      <Button variant="ghost" size="sm" autoFocus onClick={() => setConfirming(null)}>
                        Keep
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          setConfirming(null)
                          onDelete(d.id)
                          btnRef.current?.focus()
                        }}
                      >
                        Delete
                      </Button>
                    </span>
                  </li>
                ) : (
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
                    <button type="button" className="wd-delete icon-btn" aria-label={`Delete draft: ${draftTitle(d, 30)}`} onClick={() => setConfirming(d.id)}>
                      <Icon name="close" size={16} />
                    </button>
                  </li>
                ),
              )}
            </ul>
          )}
          <p className="wd-foot">The last 10 texts per language stay on this device.</p>
        </div>
      )}
    </div>
  )
}
