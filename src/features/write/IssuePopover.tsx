import { forwardRef, useId, useImperativeHandle, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { Issue } from '@/types'
import { LANG_TAGS } from '@/types'
import { Kbd } from '@/components/ui'
import { MARK_LABEL, markKind } from './lib/segments'
import { isSpelling } from './lib/report'

export interface IssuePopoverHandle {
  focusFirst: () => void
  contains: (el: Node | null) => boolean
}

interface Anchor {
  top: number
  bottom: number
  left: number
  right: number
  /** width of the editor box */
  width: number
}

interface Props {
  issue: Issue
  anchor: Anchor
  rtl: boolean
  explainIn: 'en' | 'local'
  index: number
  total: number
  onApply: (replacement: string) => void
  onIgnore: () => void
  onAddWord?: () => void
  onClose: () => void
  onStep: (dir: 1 | -1) => void
}

const SOURCES: [RegExp, string][] = [
  [/taaladvies\.net/, 'Taaladvies'],
  [/vlaanderen\.be/, 'Taaladvies'],
  [/onzetaal\.nl/, 'Onze Taal'],
  [/woordenlijst\.org/, 'the Woordenlijst'],
  [/cambridge\.org/, 'Cambridge'],
  [/merriam-webster/, 'Merriam-Webster'],
  [/languagetool/, 'LanguageTool'],
]

function sourceName(url: string) {
  for (const [re, name] of SOURCES) if (re.test(url)) return name
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'the source'
  }
}

/** Small card anchored under the flagged word: what is wrong, the fix, and the rule on request. */
export const IssuePopover = forwardRef<IssuePopoverHandle, Props>(function IssuePopover(
  { issue, anchor, rtl, explainIn, index, total, onApply, onIgnore, onAddWord, onClose, onStep },
  ref,
) {
  const rootRef = useRef<HTMLDivElement>(null)
  const firstRef = useRef<HTMLButtonElement>(null)
  const [ruleOpen, setRuleOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; above: boolean } | null>(null)
  const ruleId = useId()
  const kind = markKind(issue)
  const local = explainIn === 'local'
  const message = (local && issue.messageLocal) || issue.message
  const messageLang = local && issue.messageLocal ? LANG_TAGS[issue.lang] : 'en'
  const explanation = (local && issue.explanationLocal) || issue.explanation
  const explanationLang = local && issue.explanationLocal ? LANG_TAGS[issue.lang] : 'en'
  const reps = issue.replacements.slice(0, 4)

  useImperativeHandle(ref, () => ({
    focusFirst: () => (firstRef.current ?? rootRef.current?.querySelector<HTMLButtonElement>('button'))?.focus(),
    contains: (el) => !!el && !!rootRef.current?.contains(el),
  }))

  // A new issue starts with the rule folded.
  useLayoutEffect(() => setRuleOpen(false), [issue.id])

  // Place under the word, flip above when it would leave the viewport, clamp inside the editor.
  useLayoutEffect(() => {
    const el = rootRef.current
    const box = el?.offsetParent as HTMLElement | null
    if (!el || !box) return
    const w = el.offsetWidth
    const h = el.offsetHeight
    const boxTop = box.getBoundingClientRect().top
    const below = anchor.bottom + 8
    const roomBelow = window.innerHeight - (boxTop + below)
    const above = roomBelow < h + 8 && boxTop + anchor.top - h - 8 > 8
    const want = rtl ? anchor.right - w : anchor.left - 12
    const left = Math.max(0, Math.min(want, anchor.width - w))
    const top = above ? anchor.top - h - 8 : below
    setPos((p) => (p && p.top === top && p.left === left && p.above === above ? p : { top, left, above }))
  }, [anchor.top, anchor.bottom, anchor.left, anchor.right, anchor.width, rtl, ruleOpen, issue.id])

  useLayoutEffect(() => {
    if (pos) rootRef.current?.scrollIntoView?.({ block: 'nearest' })
  }, [pos, issue.id])

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      onClose()
    } else if (e.key === 'F8' || (e.altKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp'))) {
      e.preventDefault()
      onStep(e.key === 'ArrowUp' || (e.key === 'F8' && e.shiftKey) ? -1 : 1)
    }
  }

  return (
    <div
      ref={rootRef}
      className={`ip ip--${kind}${pos?.above ? ' is-above' : ''}`}
      role="dialog"
      dir="ltr"
      aria-label={`${MARK_LABEL[kind]}: ${issue.text}`}
      style={pos ? { top: pos.top, left: pos.left } : { visibility: 'hidden', top: anchor.bottom, left: 0 }}
      onKeyDown={onKeyDown}
    >
      <div className="ip-head">
        <span className={`ip-kind ip-kind--${kind}`}>{MARK_LABEL[kind]}</span>
        <span className="ip-count tabular">
          {index + 1} of {total}
        </span>
      </div>

      <p className="ip-msg" lang={messageLang}>
        {message}
      </p>

      {reps.length > 0 ? (
        <div className="ip-reps" lang={LANG_TAGS[issue.lang]}>
          {reps.map((r, i) => (
            <button key={r} ref={i === 0 ? firstRef : undefined} type="button" className={`ip-rep${i === 0 ? ' is-first' : ''}`} onClick={() => onApply(r)}>
              <span className="ip-rep-text" dir={rtl ? 'rtl' : undefined}>
                {r || '(remove)'}
              </span>
              {i === 0 && <Kbd>enter</Kbd>}
            </button>
          ))}
        </div>
      ) : (
        <p className="ip-none">No suggestion for this one. Rewrite it in your own words.</p>
      )}

      {explanation && (
        <div className="ip-rule">
          <button type="button" className="ip-link" aria-expanded={ruleOpen} aria-controls={ruleId} onClick={() => setRuleOpen((o) => !o)}>
            {ruleOpen ? 'Hide the rule' : 'Show the rule'}
          </button>
          <div id={ruleId} hidden={!ruleOpen} className="ip-rule-body">
            <p lang={explanationLang}>{explanation}</p>
            {issue.learnMore && (
              <a href={issue.learnMore} target="_blank" rel="noreferrer noopener">
                {sourceName(issue.learnMore)} explains it
              </a>
            )}
          </div>
        </div>
      )}
      {!explanation && issue.learnMore && (
        <a className="ip-source" href={issue.learnMore} target="_blank" rel="noreferrer noopener">
          {sourceName(issue.learnMore)} explains it
        </a>
      )}

      <div className="ip-actions">
        <button type="button" className="ip-link" onClick={onIgnore}>
          Ignore
        </button>
        {onAddWord && isSpelling(issue) && (
          <button type="button" className="ip-link" onClick={onAddWord}>
            Add to my dictionary
          </button>
        )}
        <span className="ip-keys" aria-hidden="true">
          <Kbd>F8</Kbd> next
        </span>
      </div>
    </div>
  )
})
