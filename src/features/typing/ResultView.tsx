import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { errorStats } from '@/engine'
import { LANG_NAMES, LANG_TAGS, type TypingResult } from '@/types'
import { Button, Icon, Kbd } from '@/components/ui'
import { Kees, featherBurst, useReducedMotion, type KeesMood } from '@/components/kees'
import { playReaction, type ReactionId } from '@/lib/audio'
import { mascotName } from '@/lib/mascot'
import { CountUp } from './result/CountUp'
import { WpmChart } from './result/WpmChart'
import { PractiseWords } from './result/PractiseWords'
import { feedbackLine, fixedWords, formatDuration, keesMood, practiseItems, repeatWord } from './result/feedback'
import { reactionFor, takeAgainSlot } from './result/reaction'
import './result.css'

export interface ResultViewProps {
  result: TypingResult
  /** e.g. a story or drill name; the heading is visually hidden without it */
  title?: string
  /** "time 30", "words 25", "d/t drill" */
  configLabel: string
  isPb?: boolean
  onAgain: () => void
  /** "Practise these N words"; hidden when not given */
  onPractice?: (words: string[]) => void
  /** extra content under the actions (quote source, story navigation...) */
  children?: ReactNode
  /**
   * The mascot's recorded line. Left out, it is picked from the result (personal best, a
   * flawless run, a rough one); a ReactionId plays that line instead, false keeps quiet.
   */
  reaction?: ReactionId | false
}

/** reveal sequence: number 0-400 ms, chart line 0-600 ms, the mascot lands at 600 ms */
const LAND_MS = 600
const REPEAT_AFTER_MS = 1500

/**
 * The result screen, deliberately asymmetric: the big wpm (Caprasimo) and accuracy on the
 * left, the chart with Kees perched on its top edge, the details and the words to practise
 * on the right. Focus lands on the section, so Tab then Enter is "Again".
 */
export function ResultView({ result, title, configLabel, isPb = false, onAgain, onPractice, children, reaction }: ResultViewProps) {
  const reduced = useReducedMotion()
  const headId = useId()
  const rootRef = useRef<HTMLElement>(null)
  const perchRef = useRef<HTMLDivElement>(null)
  const burstDone = useRef(false)
  const tag = LANG_TAGS[result.lang]

  const items = useMemo(() => practiseItems(result), [result])
  const fixed = useMemo(() => fixedWords(result), [result])
  const feedback = useMemo(() => feedbackLine(result, items), [result, items])
  const errs = useMemo(() => errorStats(result), [result])
  const word = repeatWord(items)

  // Kees: lands, reacts (celebrate / oops), then repeats the correct word three times
  const first = keesMood(result, isPb)
  const [mood, setMood] = useState<KeesMood>(first)
  useEffect(() => {
    setMood(first)
    if (!word) return
    const delay = reduced ? 300 : first === 'idle' ? LAND_MS + 200 : REPEAT_AFTER_MS
    const t = window.setTimeout(() => setMood('repeat'), delay)
    return () => window.clearTimeout(t)
  }, [first, word, reduced])

  useEffect(() => {
    rootRef.current?.focus({ preventScroll: true })
  }, [])

  // the recorded line plays as the mascot lands; once per result
  const said = useRef<TypingResult | null>(null)
  useEffect(() => {
    if (said.current === result) return
    const id = reaction === undefined ? reactionFor(result, isPb) : reaction
    if (!id) return
    const t = window.setTimeout(() => {
      said.current = result
      if (id === 'again' && reaction === undefined && !takeAgainSlot()) return
      playReaction(result.lang, id)
    }, reduced ? 150 : LAND_MS)
    return () => window.clearTimeout(t)
  }, [result, isPb, reaction, reduced])

  useEffect(() => {
    if (!isPb || burstDone.current) return
    const t = window.setTimeout(() => {
      if (burstDone.current || !perchRef.current) return
      burstDone.current = true
      void featherBurst(perchRef.current, { origin: { x: 0.42, y: 0.6 } })
    }, reduced ? 0 : LAND_MS + 250)
    return () => window.clearTimeout(t)
  }, [isPb, reduced])

  const c = result.chars
  return (
    <section ref={rootRef} className={`tr${reduced ? '' : ' tr--animate'}`} tabIndex={-1} aria-labelledby={headId}>
      <h2 id={headId} className={title ? 'tr-title' : 'sr-only'}>
        {title ?? 'Result'}
      </h2>
      <div className="tr-grid">
        <div className="tr-main">
          <div className="tr-stat">
            <span className="tr-label">wpm</span>
            <CountUp className="tr-wpm display tabular" value={Math.round(result.wpm)} ms={reduced ? 0 : 400} title={`${result.wpm} wpm`} />
          </div>
          <div className="tr-stat">
            <span className="tr-label">accuracy</span>
            <span className="tr-acc tabular" title={`${result.accuracy}%`}>
              {Math.floor(result.accuracy)}%
            </span>
          </div>
          {isPb && (
            <p className="tr-pb">
              <Icon name="feather" size={18} className="tr-pb-icon" />
              New personal best. {mascotName(result.lang)} is making quite a racket about it.
            </p>
          )}
          <p className="tr-feedback">{feedback}</p>
          <div className="tr-actions">
            <Button variant="primary" onClick={onAgain}>
              Again
            </Button>
            <span className="tr-hint" aria-hidden="true">
              <Kbd>tab</Kbd> then <Kbd>enter</Kbd>
            </span>
          </div>
          {children && <div className="tr-extra">{children}</div>}
        </div>

        <div className="tr-side">
          <div className="tr-chart">
            <div ref={perchRef} className="tr-perch">
              <Kees
                mood={mood}
                size={64}
                bubble={mood === 'repeat' && word ? [`${word}.`, `${word}.`, `${word}.`] : undefined}
                bubbleLang={tag}
                bubblePlacement="left"
              />
            </div>
            <WpmChart wpm={result.wpmSeries} raw={result.rawSeries} errors={result.errorSeries} animate={!reduced} />
          </div>

          <dl className="tr-details">
            <div>
              <dt>raw</dt>
              <dd className="tabular">{Math.round(result.rawWpm)}</dd>
            </div>
            <div>
              <dt>characters</dt>
              <dd className="tabular" title="correct / wrong / extra / missed">
                {c.correct}/{c.incorrect}/{c.extra}/{c.missed}
              </dd>
              <dd className="tr-dd-sub">correct, wrong, extra, missed</dd>
            </div>
            <div>
              <dt>consistency</dt>
              <dd className="tabular">{Math.round(result.consistency)}%</dd>
            </div>
            <div>
              <dt>typos fixed</dt>
              <dd className="tabular">{errs.corrected}</dd>
            </div>
            <div>
              <dt>time</dt>
              <dd className="tabular">{formatDuration(result.durationMs)}</dd>
            </div>
            <div>
              <dt>test</dt>
              <dd className="tr-dd-text">{configLabel}</dd>
              <dd className="tr-dd-sub">{LANG_NAMES[result.lang]}</dd>
            </div>
          </dl>

          <PractiseWords items={items} fixed={fixed} lang={result.lang} onPractice={onPractice} animate={!reduced} />
        </div>
      </div>
    </section>
  )
}
