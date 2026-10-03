import type { ReactNode } from 'react'
import type { Issue, IssueCategory } from '@/types'
import { LANG_TAGS, isRtl } from '@/types'
import { CATEGORY_LABEL, CATEGORY_ORDER } from './lib/report'
import { markKind } from './lib/segments'
import { formatDuration } from './lib/text'

interface Props {
  issues: Issue[]
  /** false while feedback is hidden (writing, self-review) */
  revealed: boolean
  activeId?: string
  onJump: (issue: Issue) => void
  explainIn: 'en' | 'local'
  words: number
  target?: number
  chars: number
  activeMs: number
  /** LanguageTool status line, when the user has it switched on */
  ltLine?: { text: string; warn: boolean; detail?: string }
  checkerMissing: boolean
  /** shown instead of the list while feedback is hidden */
  note?: ReactNode
  /** shown under the list */
  after?: ReactNode
}

export function IssueList({ issues, revealed, activeId, onJump, explainIn, words, target, chars, activeMs, ltLine, checkerMissing, note, after }: Props) {
  const groups = CATEGORY_ORDER.map((c) => ({ category: c, items: issues.filter((i) => i.category === c) })).filter((g) => g.items.length)
  const pct = target ? Math.min(1, words / target) : 0

  return (
    <aside className="il" aria-label="Your text">
      <dl className="il-stats">
        <div className="il-stat il-stat--words">
          <dt>words</dt>
          <dd className="tabular">
            {words}
            {target ? <span className="il-of"> / {target}</span> : null}
          </dd>
          {target ? (
            <span className="il-meter" aria-hidden="true">
              <span style={{ transform: `scaleX(${pct})` }} />
            </span>
          ) : null}
        </div>
        <div className="il-stat">
          <dt>characters</dt>
          <dd className="tabular">{chars}</dd>
        </div>
        <div className="il-stat">
          <dt>time writing</dt>
          <dd className="tabular">{formatDuration(activeMs)}</dd>
        </div>
      </dl>

      <div className="il-body" aria-live="polite">
        {checkerMissing ? (
          <p className="il-note">The checker did not load, so there are no corrections right now. Your text is saved.</p>
        ) : !revealed ? (
          note && <div className="il-note">{note}</div>
        ) : issues.length === 0 ? (
          <p className="il-note">Nothing to correct. Kees read it twice and found nothing.</p>
        ) : (
          groups.map((g) => <Group key={g.category} category={g.category} items={g.items} activeId={activeId} onJump={onJump} explainIn={explainIn} />)
        )}
        {revealed && after}
      </div>

      {ltLine && (
        <p className={`il-lt${ltLine.warn ? ' is-warn' : ''}`}>
          {ltLine.text}
          {ltLine.detail && <span className="il-lt-detail">{ltLine.detail}</span>}
        </p>
      )}
    </aside>
  )
}

function Group({ category, items, activeId, onJump, explainIn }: { category: IssueCategory; items: Issue[]; activeId?: string; onJump: (i: Issue) => void; explainIn: 'en' | 'local' }) {
  const title = CATEGORY_LABEL[category]
  return (
    <section className={`il-group il-group--${category}`}>
      <h3 className="il-group-title">
        <span className="il-group-name">{title[0].toUpperCase() + title.slice(1)}</span> <span className="il-count tabular">{items.length}</span>
      </h3>
      <ul className="il-items">
        {items.map((i) => {
          const rtl = isRtl(i.lang)
          const msg = (explainIn === 'local' && i.messageLocal) || i.message
          return (
            <li key={i.id}>
              <button type="button" className={`il-item il-item--${markKind(i)}${i.id === activeId ? ' is-active' : ''}`} onClick={() => onJump(i)} aria-current={i.id === activeId ? 'true' : undefined}>
                <span className="il-forms" lang={LANG_TAGS[i.lang]}>
                  {i.replacements[0] !== undefined ? (
                    <>
                      <span className="il-right" dir={rtl ? 'rtl' : undefined}>
                        {i.replacements[0] || '(remove)'}
                      </span>
                      <s className="il-wrong" dir={rtl ? 'rtl' : undefined}>
                        {i.text}
                      </s>
                    </>
                  ) : (
                    <span className="il-right il-right--plain" dir={rtl ? 'rtl' : undefined}>
                      {i.text}
                    </span>
                  )}
                </span>
                <span className="il-msg" lang={explainIn === 'local' && i.messageLocal ? LANG_TAGS[i.lang] : 'en'}>
                  {msg}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
