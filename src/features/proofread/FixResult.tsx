import { useEffect, useMemo, useRef, useState } from 'react'
import { LANG_TAGS, isRtl, type Lang } from '@/types'
import { findPack } from '@/content/drills'
import type { ProofText } from '@/content/proofread'
import { useSettings } from '@/state/settings'
import { playReaction } from '@/lib/audio'
import { Link } from '@/lib/router'
import { Button, Kbd, Kees, Stat, featherBurst, useReducedMotion } from '@/components/ui'
import { formatClock } from '@/features/gym/round'
import { ExplainSwitch } from '@/features/gym/RulePanel'
import { Rich } from '@/features/gym/Rich'
import { sameWord, segments, type MistakeResult, type ProofGrade, type Segment } from './grade'

interface Props {
  text: ProofText
  grade: ProofGrade
  durationMs: number
  firstPerfect: boolean
  onNext: () => void
  onRetry: () => void
}

/** Practice-language words inside English copy: their own language, direction and font. */
function Word({ lang, className, children }: { lang: Lang; className?: string; children: string }) {
  return (
    <span className={className} lang={LANG_TAGS[lang]} dir={isRtl(lang) ? 'rtl' : undefined}>
      {children}
    </span>
  )
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
  const rtl = isRtl(text.lang)
  const perfect = grade.fixed === grade.total && grade.introduced.length === 0

  useEffect(() => {
    if (!firstPerfect || !keesRef.current) return
    const id = window.setTimeout(() => keesRef.current && featherBurst(keesRef.current), reduced ? 0 : 400)
    return () => window.clearTimeout(id)
  }, [firstPerfect, reduced])

  // the mascot says one recorded line the first time a text comes out clean
  useEffect(() => {
    if (!firstPerfect) return
    const id = window.setTimeout(() => playReaction(text.lang, 'perfect'), reduced ? 150 : 400)
    return () => window.clearTimeout(id)
  }, [firstPerfect, text.lang, reduced])

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

      <div className={`fix-doc${clean ? ' is-clean' : ''}`} lang={tag} dir={rtl ? 'rtl' : 'ltr'}>
        {clean ? text.corrected : segs.map((s, i) => <SegmentView key={i} seg={s} number={number} />)}
      </div>

      {misses.length > 0 && (
        <div className="fix-notes">
          <div className="fix-notes-head">
            <h3 className="fix-notes-title">What you missed</h3>
            <ExplainSwitch lang={text.lang} />
          </div>
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
                    <Word lang={text.lang} className="fix-right">
                      {e.expected}
                    </Word>{' '}
                    <span className="muted">
                      was right; you wrote{' '}
                      {e.typed ? (
                        <s lang={tag} dir={rtl ? 'rtl' : undefined} className="fix-was">
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
                    <s lang={tag} dir={rtl ? 'rtl' : undefined} className="fix-was">
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

/** English labels inside the practice text keep their own direction (dir isolates them). */
function Tag({ ok, children }: { ok?: boolean; children: string }) {
  return (
    <span className={`fx-tag${ok ? ' fx-tag-ok' : ''}`} lang="en" dir="ltr">
      {children}
    </span>
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
        <Tag>new</Tag>
      </span>
    )
  }
  const fixed = seg.results.every((r) => r.status === 'fixed')
  if (fixed) {
    return (
      <span className="fx fx-fixed">
        {seg.text}
        <Tag ok>+fixed</Tag>
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

function MissNote({ result, n, lang, explainIn }: { result: MistakeResult; n: number; lang: Lang; explainIn: 'en' | 'local' }) {
  const [typed, setTyped] = useState('')
  const m = result.mistake
  const local = explainIn === 'local' && !!m.ruleNote.local
  const note = local ? m.ruleNote.local : m.ruleNote.en
  const noteLang: Lang = local ? lang : 'en'
  const pack = m.pack ? findPack(m.pack) : undefined
  const done = sameWord(typed, m.right, lang)
  const tag = LANG_TAGS[lang]
  const rtl = isRtl(lang)
  return (
    <li className="fix-note">
      <span className="fix-note-n tabular" aria-hidden="true">
        {n}
      </span>
      <div className="fix-note-body">
        <p className="fix-note-head">
          <Word lang={lang} className="fix-right">
            {m.right}
          </Word>{' '}
          <span className="muted small">
            {result.status === 'missed' ? (
              'was left as it was'
            ) : (
              <>
                you made it{' '}
                {result.typed ? (
                  <s lang={tag} dir={rtl ? 'rtl' : undefined} className="fix-was">
                    {result.typed}
                  </s>
                ) : (
                  'disappear'
                )}
              </>
            )}
          </span>
        </p>
        <p className="fix-note-text" lang={LANG_TAGS[noteLang]} dir={isRtl(noteLang) ? 'rtl' : 'ltr'}>
          <Rich text={note ?? ''} exampleLang={lang} rtl={isRtl(noteLang)} />
        </p>
        <div className="fix-note-tools">
          <label className="fix-retype">
            <span className="small muted">Type it once:</span>
            <input
              className="fix-retype-input"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              lang={tag}
              dir={rtl ? 'rtl' : 'ltr'}
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              size={Math.max(6, m.right.length + 2)}
              aria-label={`Type ${m.right}`}
              placeholder={m.right}
            />
            {done && <Tag ok>+typed</Tag>}
          </label>
          {pack && (
            <Link to={`/gym?pack=${encodeURIComponent(pack.id)}`} className="link-btn fix-drill">
              Practise{' '}
              <span className="mono-text" lang={LANG_TAGS[pack.lang]} dir={isRtl(pack.lang) ? 'rtl' : undefined}>
                {pack.title}
              </span>
            </Link>
          )}
        </div>
      </div>
    </li>
  )
}
