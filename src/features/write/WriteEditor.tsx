import { forwardRef, useCallback, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import type { Issue, Lang } from '@/types'
import { LANG_TAGS, isRtl } from '@/types'
import { buildSegments, issueAt, markKind } from './lib/segments'

export type MarkMode = 'none' | 'lines' | 'marks'

export interface WriteEditorHandle {
  textarea: HTMLTextAreaElement | null
  /** box of the flagged word relative to the editor, first line fragment only */
  markBox: (id: string) => { top: number; bottom: number; left: number; right: number; width: number } | null
  focus: () => void
}

interface Props {
  text: string
  lang: Lang
  onChange: (text: string) => void
  issues: Issue[]
  /** none: no feedback; lines: only mark lines that have problems; marks: full underlines */
  mode: MarkMode
  activeId?: string
  onPick?: (issue: Issue) => void
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void
  /** caret or selection moved */
  onCaret?: (start: number, end: number) => void
  onLines?: (lines: number) => void
  placeholder?: string
  ariaLabel: string
  describedBy?: string
  /** rendered inside the editor box, positioned against it (the issue popover) */
  children?: ReactNode
}

/**
 * A plain textarea over a mirror div. The mirror has the same font, padding and wrapping, so the
 * underlines it draws sit exactly under the words in the textarea. The mirror is in normal flow and
 * sizes the box; the textarea fills it, so nothing ever scrolls out of sync.
 */
export const WriteEditor = forwardRef<WriteEditorHandle, Props>(function WriteEditor(
  { text, lang, onChange, issues, mode, activeId, onPick, onKeyDown, onCaret, onLines, placeholder, ariaLabel, describedBy, children },
  ref,
) {
  const boxRef = useRef<HTMLDivElement>(null)
  const mirrorRef = useRef<HTMLDivElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const [lineBands, setLineBands] = useState<{ top: number; height: number }[]>([])
  const rtl = isRtl(lang)

  const segments = useMemo(() => buildSegments(text, mode === 'none' ? [] : issues), [text, issues, mode])

  const markBox = useCallback((id: string) => {
    const box = boxRef.current
    const el = mirrorRef.current?.querySelector<HTMLElement>(`[data-issue="${CSS.escape(id)}"]`)
    if (!box || !el) return null
    const r = el.getClientRects()[0] ?? el.getBoundingClientRect()
    const b = box.getBoundingClientRect()
    return { top: r.top - b.top, bottom: r.bottom - b.top, left: r.left - b.left, right: r.right - b.left, width: b.width }
  }, [])

  useImperativeHandle(ref, () => ({ textarea: taRef.current, markBox, focus: () => taRef.current?.focus() }), [markBox])

  // Self-review: measure which visual lines hold a flagged word.
  const measureLines = useCallback(() => {
    const mirror = mirrorRef.current
    if (!mirror || mode !== 'lines') {
      setLineBands((prev) => (prev.length ? [] : prev))
      return
    }
    const cs = getComputedStyle(mirror)
    const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.7
    const padTop = parseFloat(cs.paddingTop) || 0
    const top0 = mirror.getBoundingClientRect().top + padTop
    const lines = new Set<number>()
    mirror.querySelectorAll<HTMLElement>('[data-issue]').forEach((el) => {
      for (const r of el.getClientRects()) lines.add(Math.max(0, Math.round((r.top + r.height / 2 - top0 - lh / 2) / lh)))
    })
    const bands = [...lines].sort((a, b) => a - b).map((i) => ({ top: padTop + i * lh, height: lh }))
    setLineBands(bands)
    onLines?.(bands.length)
  }, [mode, onLines])

  useLayoutEffect(() => {
    measureLines()
  }, [measureLines, segments])

  useLayoutEffect(() => {
    const mirror = mirrorRef.current
    if (!mirror || mode !== 'lines' || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => measureLines())
    ro.observe(mirror)
    let live = true
    // self-review switches fonts, and a font that arrives late can move words to other lines
    const onFonts = () => live && measureLines()
    document.fonts?.ready.then(onFonts)
    document.fonts?.addEventListener?.('loadingdone', onFonts)
    return () => {
      live = false
      ro.disconnect()
      document.fonts?.removeEventListener?.('loadingdone', onFonts)
    }
  }, [measureLines, mode])

  // Clicking inside a flagged word opens it. The mirror sits under the textarea, so hit-test the caret.
  const handleClick = () => {
    const ta = taRef.current
    if (!ta || mode !== 'marks' || !onPick) return
    if (ta.selectionStart !== ta.selectionEnd) return
    const hit = issueAt(issues, ta.selectionStart)
    if (hit) onPick(hit)
  }

  return (
    <div ref={boxRef} className={`we we--${mode}`} data-lang={lang} dir={rtl ? 'rtl' : 'ltr'}>
      {mode === 'lines' && (
        <div className="we-bands" aria-hidden="true">
          {lineBands.map((b) => (
            <span key={b.top} className="we-band" style={{ top: b.top, height: b.height }} />
          ))}
        </div>
      )}
      <div ref={mirrorRef} className="we-mirror we-text" aria-hidden="true" dir={rtl ? 'rtl' : 'ltr'} lang={LANG_TAGS[lang]}>
        {segments.map((s) =>
          s.issue ? (
            <span
              key={s.issue.id}
              data-issue={s.issue.id}
              className={`we-mark we-mark--${markKind(s.issue)}${s.issue.id === activeId ? ' is-active' : ''}`}
            >
              {s.text}
            </span>
          ) : (
            s.text
          ),
        )}
        {/* keeps a trailing line break as tall as the textarea's */}
        {'​'}
      </div>
      <textarea
        ref={taRef}
        className="we-input we-text"
        value={text}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onClick={handleClick}
        onSelect={(e) => onCaret?.(e.currentTarget.selectionStart, e.currentTarget.selectionEnd)}
        dir={rtl ? 'rtl' : 'ltr'}
        lang={LANG_TAGS[lang]}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="sentences"
        autoComplete="off"
        data-gramm="false"
        data-gramm_editor="false"
        data-enable-grammarly="false"
        data-1p-ignore
        data-lpignore="true"
        translate="no"
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-describedby={describedBy}
      />
      {children}
    </div>
  )
})
