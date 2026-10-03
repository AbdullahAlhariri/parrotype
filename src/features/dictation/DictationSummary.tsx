import { useEffect, useId, useRef, useState } from 'react'
import { annotate } from 'rough-notation'
import { Button, Kbd, Kees, useReducedMotion, type KeesMood } from '@/components/ui'
import { useSettings } from '@/state/settings'
import { LANG_TAGS, isRtl, type Lang } from '@/types'
import { tagName, type ExplainIn } from './logic/explain'
import { feedbackLine, formatDuration, type SessionSummary } from './logic/summary'

interface Props {
  lang: Lang
  summary: SessionSummary
  config: string
  onAgain: () => void
  /** start a set built around these words; hidden when there is nothing to practise */
  onPractise?: (words: string[]) => void
}

const LAND_MS = 600

/** 0 to value in `ms`, ease-out. */
function useCountUp(value: number, ms: number) {
  const [n, setN] = useState(ms ? 0 : value)
  useEffect(() => {
    if (!ms) {
      setN(value)
      return
    }
    let raf = 0
    const t0 = performance.now()
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / ms)
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value, ms])
  return n
}

/**
 * End of a set, asymmetric like the typing result: the big number and the details on the
 * left, the words to practise on the right with Kees perched on top, repeating the most
 * missed word (the correct form, nothing else).
 */
export function DictationSummary({ lang, summary: s, config, onAgain, onPractise }: Props) {
  const reduced = useReducedMotion()
  const explainIn = useSettings((st) => st.explainIn) as ExplainIn
  const headId = useId()
  const rootRef = useRef<HTMLElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const pairs = s.targets > 0
  const big = pairs ? Math.round((s.targetsRight / s.targets) * 100) : s.accuracy
  const shown = useCountUp(big, reduced ? 0 : 400)
  const words = s.toPractise
  const top = words[0]?.word
  const tag = LANG_TAGS[lang]
  const dir = isRtl(lang) ? 'rtl' : 'ltr'

  const first: KeesMood = !s.mistakes ? 'curious' : big < 70 ? 'oops-big' : 'oops'
  const [mood, setMood] = useState<KeesMood>(first)
  useEffect(() => {
    if (!top) return
    const t = window.setTimeout(() => setMood('repeat'), LAND_MS + 700)
    return () => clearTimeout(t)
  }, [top])

  useEffect(() => {
    rootRef.current?.focus({ preventScroll: true })
  }, [])

  // a hand-drawn circle around the word Kees repeats: explanation, not decoration
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>('.dict-sum-word')
    if (!el) return
    const note = annotate(el, { type: 'circle', animate: !reduced, animationDuration: 420, padding: [4, 8], strokeWidth: 1.6, iterations: 1 })
    const t = window.setTimeout(() => note.show(), reduced ? 0 : LAND_MS + 300)
    return () => {
      clearTimeout(t)
      note.remove()
    }
  }, [top, reduced])

  const practiseLabel = words.length === 1 ? 'Practise this word' : `Practise these ${words.length} words`

  return (
    <section ref={rootRef} className={`dict-sum ${reduced ? '' : 'is-animated'}`} tabIndex={-1} aria-labelledby={headId}>
      <h2 id={headId} className="sr-only">
        How the set went
      </h2>
      <div className="dict-sum-grid">
        <div className="dict-sum-main">
          <span className="dict-sum-label">{pairs ? 'right word' : 'words right'}</span>
          <span className="dict-sum-big display tabular" aria-label={`${big}%`}>
            {shown}%
          </span>
          <p className="dict-sum-sub">
            {pairs ? `${s.targetsRight} of ${s.targets} on the first try` : `${s.correctWords} of ${s.totalWords} words on the first try`}
          </p>
          <p className="dict-sum-line">{feedbackLine(s, (t) => tagName(t, lang))}</p>
          <div className="dict-sum-actions">
            <Button variant="primary" onClick={onAgain}>
              Again
            </Button>
            {onPractise && words.length > 0 && <Button onClick={() => onPractise(words.map((w) => w.word))}>{practiseLabel}</Button>}
          </div>
          <p className="dict-sum-hint" aria-hidden="true">
            <Kbd>tab</Kbd> then <Kbd>enter</Kbd>
          </p>
        </div>

        <div className="dict-sum-side">
          <div className="dict-sum-perch">
            <Kees mood={mood} size={64} bubble={mood === 'repeat' && top ? [`${top}.`, `${top}.`, `${top}.`] : undefined} bubbleLang={tag} bubblePlacement="left" />
          </div>
          <dl className="dict-sum-details">
            <div>
              <dt>sentences</dt>
              <dd className="tabular">
                {s.items}
                <span className="dict-sum-dd-sub"> {s.clean} clean</span>
              </dd>
            </div>
            <div>
              <dt>needed hints</dt>
              <dd className="tabular">
                {s.hinted}
                {s.revealed > 0 && <span className="dict-sum-dd-sub"> {s.revealed === 1 ? '1 answer shown' : `${s.revealed} answers shown`}</span>}
              </dd>
            </div>
            <div>
              <dt>time</dt>
              <dd className="tabular">{formatDuration(s.durationMs)}</dd>
            </div>
            <div>
              <dt>set</dt>
              <dd className="dict-sum-dd-text">{config}</dd>
            </div>
          </dl>

          {words.length ? (
            <section className="dict-sum-words" aria-labelledby={`${headId}-w`}>
              <h3 id={`${headId}-w`}>Words to practise</h3>
              <ul ref={listRef}>
                {words.slice(0, 12).map((w) => (
                  <li key={w.word}>
                    <span className="dict-sum-word mono-text" lang={tag} dir={dir}>
                      {w.word}
                    </span>
                    <s className="dict-sum-typed mono-text" lang={tag} dir={dir} aria-label={`you typed ${w.typed[0]}`}>
                      {w.typed[0] || '—'}
                    </s>
                    <span className="dict-sum-tag">
                      {w.tag ? tagName(w.tag, lang, explainIn) : w.kind ? tagName(w.kind, lang, explainIn) : ''}
                      {w.count > 1 && <span className="tabular"> {w.count}x</span>}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="dict-sum-nest muted small">The tricky ones go to the mistake nest and come back in weak spots.</p>
            </section>
          ) : (
            <p className="dict-sum-empty">Nothing to practise. Kees listened twice and found nothing.</p>
          )}
        </div>
      </div>
    </section>
  )
}
