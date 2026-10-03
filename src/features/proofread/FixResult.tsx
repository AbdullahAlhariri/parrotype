import { useEffect, useMemo, useRef, useState } from 'react'
import { LANG_TAGS } from '@/types'
import { findPack } from '@/content/drills'
import type { ProofText } from '@/content/proofread'
import { useSettings } from '@/state/settings'
import { Link } from '@/lib/router'
import { Button, Kbd, Kees, Stat, featherBurst, useReducedMotion } from '@/components/ui'
import { formatClock } from '@/features/gym/round'
import { segments, type MistakeResult, type ProofGrade, type Segment } from './grade'

interface Props {
  text: ProofText
  grade: ProofGrade
  durationMs: number
  firstPerfect: boolean
  onNext: () => void
  onRetry: () => void
}

/** Results after a check: score, the corrected text with what happened where, and a note per miss. */
export function FixResult({ text, grade, durationMs, firstPerfect, onNext, onRetry }: Props) {
  const explainIn = useSettings((s) => s.explainIn)
  const [clean, setClean] = useState(false)
  const keesRef = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const segs = useMemo(() => segments(text, grade), [text, grade])
  const misses = grade.results.filter((r) => r.status !== 'fixed')
  const number = new Map(misses.map((r, i) => [r.index, i + 1]))
  const tag = LANG_TAGS[text.lang]
  const perfect = grade.fixed === grade.total && grade.introduced.length === 0

  useEffect(() => {
    if (!firstPerfect || !keesRef.current) return
    const id = window.setTimeout(() => keesRef.current && featherBurst(keesRef.current), reduced ? 0 : 400)
    return () => window.clearTimeout(id)
  }, [firstPerfect, reduced])

  const line = firstPerfect
    ? `All ${grade.total} fixed and nothing broken. First time for this one!`
    : perfect
      ? `All ${grade.total} fixed and nothing broken.`
      : grade.fixed === 0
        ? `None of the ${grade.total} found this time. They are marked below.`
        : `${grade.fixed} of ${grade.total} fixed. The ${misses.length === 1 ? 'one you missed is' : `${misses.length} you missed are`} marked below.`

  return (
    <section className="fix-result" aria-labelledby="fix-result-title">
      <h2 id="fix-result-title" className="sr-only">
        Check result
      </h2>
      <div className="fix-score-row">
        <div className="fix-score tabular">
          {grade.fixed}
          <span className="fix-score-of">
            <span className="sr-only"> of </span>
            <span aria-hidden="true">/</span>
            {grade.total}
          </span>
        </div>
        <div className="fix-score-side">
          <p className="fix-score-label">mistakes fixed</p>
          <div className="fix-stats">
            <Stat label="missed" value={misses.length} />
            <Stat label="new mistakes" value={grade.introduced.length} />
            <Stat label="time" value={formatClock(durationMs)} />
          </div>
        </div>
        <div className="fix-kees" ref={keesRef}>
          <Kees mood={firstPerfect ? 'celebrate' : 'reading'} size={64} />
        </div>
      </div>

      <p className="fix-line">{line}</p>

      <div className="fix-view-toggle">
        <button type="button" className="link-btn" onClick={() => setClean((v) => !v)} aria-pressed={clean}>
          {clean ? 'Show what changed' : 'Show the corrected text'}
        </button>
      </div>

      <div className={`fix-doc${clean ? ' is-clean' : ''}`} lang={tag}>
        {clean ? text.corrected : segs.map((s, i) => <SegmentView key={i} seg={s} number={number} />)}
      </div>

      {misses.length > 0 && (
        <div className="fix-notes">
          <h3 className="fix-notes-title">What you missed</h3>
          <ol className="fix-note-list">
            {misses.map((r) => (
              <MissNote key={r.index} result={r} n={number.get(r.index) ?? 0} lang={text.lang} explainIn={explainIn} />
            ))}
          </ol>
        </div>
      )}

      {grade.introduced.length > 0 && (
        <div className="fix-notes">
          <h3 className="fix-notes-title">New mistakes</h3>
          <ul className="fix-new-list">
            {grade.introduced.map((e, i) => (
              <li key={i}>
                {e.expected ? (
                  <>
                    <span className="fix-right" lang={tag}>
                      {e.expected}
                    </span>{' '}
                    <span className="muted">
                      was right; you wrote{' '}
                      {e.typed ? (
                        <s lang={tag} className="fix-was">
                          {e.typed}
                        </s>
                      ) : (
                        'nothing there'
                      )}
                    </span>
                  </>
                ) : (
                  <span className="muted">
                    an extra{' '}
                    <s lang={tag} className="fix-was">
                      {e.typed}
                    </s>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="fix-actions">
        <Button variant="primary" onClick={onNext} autoFocus>
          Next text <Kbd className="fix-kbd-on-primary">enter</Kbd>
        </Button>
        <Button variant="subtle" onClick={onRetry}>
          Try this one again
        </Button>
      </div>
    </section>
  )
}

function SegmentView({ seg, number }: { seg: Segment; number: Map<number, number> }) {
  if (seg.kind === 'text') return <>{seg.text}</>
  if (seg.kind === 'new') {
    return (
      <span className="fx fx-new">
        {seg.error.typed && <s className="fx-was">{seg.error.typed}</s>}
        {seg.text && seg.error.typed && ' '}
        {seg.text && <span className="fx-right">{seg.text}</span>}
        <span className="fx-tag">new</span>
      </span>
    )
  }
  const fixed = seg.results.every((r) => r.status === 'fixed')
  if (fixed) {
    return (
      <span className="fx fx-fixed">
        {seg.text}
        <span className="fx-tag fx-tag-ok">+fixed</span>
      </span>
    )
  }
  const n = seg.results.map((r) => number.get(r.index)).filter(Boolean)
  return (
    <span className="fx fx-miss">
      {seg.typed && <s className="fx-was">{seg.typed}</s>}
      {seg.typed && ' '}
      <span className="fx-right">{seg.text}</span>
      <sup className="fx-num">{n.join(',')}</sup>
    </span>
  )
}

function MissNote({ result, n, lang, explainIn }: { result: MistakeResult; n: number; lang: ProofText['lang']; explainIn: 'en' | 'local' }) {
  const [typed, setTyped] = useState('')
  const m = result.mistake
  const note = explainIn === 'local' && m.ruleNote.local ? m.ruleNote.local : m.ruleNote.en
  const noteLang = explainIn === 'local' && m.ruleNote.local ? lang : 'en'
  const pack = m.pack ? findPack(m.pack) : undefined
  const done = typed.trim() === m.right
  const tag = LANG_TAGS[lang]
  return (
    <li className="fix-note">
      <span className="fix-note-n tabular" aria-hidden="true">
        {n}
      </span>
      <div className="fix-note-body">
        <p className="fix-note-head">
          <span className="fix-right" lang={tag}>
            {m.right}
          </span>{' '}
          <span className="muted small">
            {result.status === 'missed' ? (
              'was left as it was'
            ) : (
              <>
                you made it{' '}
                <s lang={tag} className="fix-was">
                  {result.typed || 'disappear'}
                </s>
              </>
            )}
          </span>
        </p>
        <p className="fix-note-text" lang={LANG_TAGS[noteLang]}>
          {note}
        </p>
        <div className="fix-note-tools">
          <label className="fix-retype">
            <span className="small muted">Type it once:</span>
            <input
              className="fix-retype-input"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              lang={tag}
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              size={Math.max(6, m.right.length + 2)}
              aria-label={`Type ${m.right}`}
              placeholder={m.right}
            />
            {done && <span className="fx-tag fx-tag-ok">+typed</span>}
          </label>
          {pack && (
            <Link to={`/gym?pack=${encodeURIComponent(pack.id)}`} className="link-btn fix-drill">
              Practise{' '}
              <span className="mono-text" lang={LANG_TAGS[pack.lang]}>
                {pack.title}
              </span>
            </Link>
          )}
        </div>
      </div>
    </li>
  )
}

