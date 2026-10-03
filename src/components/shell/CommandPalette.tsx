import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { usePath } from '@/lib/router'
import { useSettings } from '@/state/settings'
import { useTypingFont, useUiPrefs } from '@/styles/fontStore'
import { applyTheme, paintTheme } from '@/styles/themes'
import { setTyping } from '@/lib/focus'
import { Icon } from '@/components/ui/Icon'
import { Kbd } from '@/components/ui/Kbd'
import { isBackdropClick } from '@/components/ui/Modal'
import { toast } from '@/components/ui/toast'
import { buildCommands, previewOf, type Command } from './commands'
import { rank } from './fuzzy'
import { usePalette } from './paletteStore'

/**
 * Command palette. Esc or Ctrl/Cmd+Shift+P opens it; every setting is a row.
 * Theme rows preview live while active (arrow keys or hover); leaving restores the saved theme.
 * A component that wants Esc for itself calls event.preventDefault() in its own keydown handler.
 */
export function CommandPalette() {
  const open = usePalette((p) => p.open)
  const initialQuery = usePalette((p) => p.query)
  const hide = usePalette((p) => p.hide)
  const show = usePalette((p) => p.show)

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (usePalette.getState().open || e.defaultPrevented || e.repeat || e.isComposing) return
      const combo = (e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'p'
      if (e.key !== 'Escape' && !combo) return
      if (document.querySelector('dialog[open]')) return
      e.preventDefault()
      setTyping(false)
      show()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [show])

  return open ? <PaletteDialog initialQuery={initialQuery} onClose={hide} /> : null
}

function PaletteDialog({ initialQuery, onClose }: { initialQuery: string; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const listId = useId()
  const [query, setQuery] = useState(initialQuery)
  const [active, setActive] = useState(0)

  const path = usePath()
  const settings = useSettings()
  const font = useTypingFont((f) => f.font)
  const setFont = useTypingFont((f) => f.setFont)
  const kees = useUiPrefs((u) => u.kees)
  const setKees = useUiPrefs((u) => u.setKees)

  const all = useMemo(
    () => buildCommands({ path, settings, set: settings.set, font, setFont, kees, setKees }),
    [path, settings, font, setFont, kees, setKees],
  )
  const results = useMemo(() => rank(query, all), [query, all])
  const current = results[Math.min(active, results.length - 1)]
  const preview = previewOf(current)

  useEffect(() => {
    const d = dialogRef.current
    if (d && !d.open) d.showModal()
    const input = inputRef.current
    if (input) {
      input.focus()
      input.setSelectionRange(input.value.length, input.value.length)
    }
  }, [])

  // start on the current value when opened pre-filtered (e.g. 'theme ' from the footer)
  useEffect(() => {
    if (!initialQuery) return
    const i = rank(initialQuery, all).findIndex((c) => c.current)
    if (i > 0) setActive(i)
  }, []) // on open only

  // live theme preview; restore the saved theme when the preview ends or the palette closes
  const savedTheme = settings.theme
  useEffect(() => {
    if (preview) paintTheme(preview)
    else applyTheme(savedTheme)
  }, [preview, savedTheme])
  useEffect(() => () => applyTheme(useSettings.getState().theme), [])

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')
    el?.scrollIntoView({ block: 'nearest' })
  }, [active, results])

  const close = () => {
    const d = dialogRef.current
    if (d?.open) d.close()
    onClose()
  }

  const run = (c: Command | undefined) => {
    if (!c) return
    close()
    c.run()
    if (c.confirm) toast(c.confirm)
  }

  const move = (delta: number) => {
    if (!results.length) return
    setActive((a) => (Math.min(a, results.length - 1) + delta + results.length) % results.length)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const ctrl = e.ctrlKey || e.metaKey
    if (e.key === 'ArrowDown' || (ctrl && (e.key === 'j' || e.key === 'n')) || (e.key === 'Tab' && !e.shiftKey)) {
      e.preventDefault()
      move(1)
    } else if (e.key === 'ArrowUp' || (ctrl && (e.key === 'k' || e.key === 'p')) || (e.key === 'Tab' && e.shiftKey)) {
      e.preventDefault()
      move(-1)
    } else if (e.key === 'PageDown') {
      e.preventDefault()
      move(8)
    } else if (e.key === 'PageUp') {
      e.preventDefault()
      move(-8)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      run(current)
    }
  }

  const activeId = current ? `${listId}-${current.id}` : undefined

  return (
    <dialog
      ref={dialogRef}
      className={`palette ${preview ? 'is-previewing' : ''}`}
      aria-label="Command palette"
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault()
        close()
      }}
      onClick={(e) => {
        if (isBackdropClick(e)) close()
      }}
    >
      <div className="palette-search">
        <Icon name="search" size={18} />
        <input
          ref={inputRef}
          className="palette-input"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
          }}
          onKeyDown={onKeyDown}
          placeholder="Type a command: theme, font, stats, sound…"
          aria-label="Search commands"
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={activeId}
          aria-autocomplete="list"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />
      </div>
      {results.length === 0 ? (
        <p className="palette-empty">No command matches “{query.trim()}”. Try “theme” or “font”.</p>
      ) : (
        <ul ref={listRef} className="palette-list" id={listId} role="listbox" aria-label="Commands">
          {results.map((c, i) => (
            <li
              key={c.id}
              id={`${listId}-${c.id}`}
              role="option"
              aria-selected={c === current}
              className="palette-row"
              onPointerMove={() => i !== active && setActive(i)}
              onClick={() => run(c)}
            >
              <span className="palette-group">{c.group}</span>
              <span className="palette-label" lang={c.lang} style={c.fontFamily ? { fontFamily: c.fontFamily } : undefined}>
                {c.label}
              </span>
              {c.hint && <span className="palette-hint">{c.hint}</span>}
              {c.previewTheme && <ThemeDots id={c.previewTheme} />}
              <span className="palette-current">{c.current && <Icon name="check" size={16} label="current" />}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="palette-foot" aria-hidden="true">
        <span>
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd> move
        </span>
        <span>
          <Kbd>enter</Kbd> choose
        </span>
        <span>
          <Kbd>esc</Kbd> close
        </span>
      </div>
    </dialog>
  )
}

function ThemeDots({ id }: { id: string }) {
  const t = previewOf({ id, group: '', label: '', previewTheme: id, run: () => {} })!
  const c = t.colors
  return (
    <span className="palette-swatch" style={{ background: c['--bg'] }} aria-hidden="true">
      <i style={{ background: c['--main'] }} />
      <i style={{ background: c['--caret'] }} />
      <i style={{ background: c['--text'] }} />
    </span>
  )
}
