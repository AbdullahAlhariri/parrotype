import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent } from 'react'
import { Link } from '@/lib/router'
import { useSettings } from '@/state/settings'
import { useStats } from '@/state/stats'
import { useNest } from '@/state/nest'
import { isRtl, LANG_TAGS, type Lang, type NestItem } from '@/types'
import { charDiff, type CharOp } from '@/engine'
import { loadVoices, speak, speechSupported, stopSpeaking, voicesFor } from '@/lib/speech'
import { Button, Kbd, Kees, Segmented } from '@/components/ui'
import { answerCcc, cccDone, cccSummary, currentId, isRightAnswer, MAX_REQUEUE, revealMs, SESSION_CAP, startCcc, type CccState } from './ccc'
import { NEST_CONFIG } from './plan'
import { repairHref } from './repair'
import { SubHead, dueIn, useLocalPref } from './parts'

type Phase = 'show' | 'recall' | 'right' | 'wrong'
type Mode = 'look' | 'listen'
const MODES = ['look', 'listen'] as const

export function NestReview() {
  const lang = useSettings((s) => s.lang)
  const [items] = useState(() => new Map(useNest.getState().due(lang).slice(0, SESSION_CAP).map((i) => [i.id, i])))
  const [ccc, setCcc] = useState<CccState>(() => startCcc([...items.keys()]))
  const [startedAt] = useState(() => Date.now())

  if (items.size === 0) return <NothingDue lang={lang} />
  if (cccDone(ccc)) return <ReviewDone lang={lang} items={items} ccc={ccc} startedAt={startedAt} />
  return <ReviewRun lang={lang} items={items} ccc={ccc} onAnswer={(correct, typed) => setCcc((s) => answerCcc(s, correct, typed))} />
}

/* ------------------------------------------------------------------ */

interface RunProps {
  lang: Lang
  items: Map<string, NestItem>
  ccc: CccState
  onAnswer: (correct: boolean, typed: string) => void
}

function ReviewRun({ lang, items, ccc, onAnswer }: RunProps) {
  const review = useNest((s) => s.review)
  const rate = useSettings((s) => s.speechRate)
  const voiceName = useSettings((s) => s.voices[lang])
  const [mode, setMode] = useLocalPref<Mode>('nestMode', 'look', MODES)
  const [canListen, setCanListen] = useState(false)
  const [phase, setPhase] = useState<Phase>('show')
  const [typed, setTyped] = useState('')
  const [answer, setAnswer] = useState('')
  const [retype, setRetype] = useState('')
  const [retypeMiss, setRetypeMiss] = useState(false)
  const [boxNote, setBoxNote] = useState('')

  const id = currentId(ccc)!
  const item = items.get(id)!
  const retest = ccc.log.some((a) => a.id === id)
  const listen = mode === 'listen' && canListen
  const tag = LANG_TAGS[lang]
  const dir = isRtl(lang) ? 'rtl' : undefined

  useEffect(() => {
    if (!speechSupported()) return
    let alive = true
    loadVoices().then(() => alive && setCanListen(voicesFor(lang).length > 0))
    return () => {
      alive = false
      stopSpeaking()
    }
  }, [lang])

  const say = () => speak(item.target, lang, { rate, voiceName })

  // every new item starts covered-or-shown, depending on the mode
  useEffect(() => {
    setTyped('')
    setRetype('')
    setRetypeMiss(false)
    setPhase(listen ? 'recall' : 'show')
    if (listen) say()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ccc.pos, listen])

  // look mode: cover the target after a moment
  useEffect(() => {
    if (phase !== 'show') return
    const t = setTimeout(() => setPhase('recall'), revealMs(item.target, item.kind))
    return () => clearTimeout(t)
  }, [phase, item])

  // in the show phase, enter or space covers it straight away
  useEffect(() => {
    if (phase !== 'show') return
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.target instanceof Element && e.target.closest('a, button, input, textarea, select')) return
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        setPhase('recall')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase])

  const submit = (value: string) => {
    const correct = isRightAnswer(item.target, value)
    review(item.id, correct, correct ? undefined : value.trim() || undefined)
    const after = useNest.getState().items.find((x) => x.id === item.id)
    const returns = (ccc.requeued[item.id] ?? 0) < MAX_REQUEUE
    setBoxNote(
      !after
        ? 'Five right in a row: it leaves the nest.'
        : correct
          ? `Box ${after.box}, back ${dueIn(after.due)}.`
          : returns
            ? 'Back to box 1. It comes round again in a few items.'
            : 'Back to box 1, for next time.',
    )
    setAnswer(value)
    setPhase(correct ? 'right' : 'wrong')
  }

  const next = () => onAnswer(phase === 'right', answer)

  const onRecall = (e: FormEvent) => {
    e.preventDefault()
    submit(typed)
  }

  const onRetype = (e: FormEvent) => {
    e.preventDefault()
    if (isRightAnswer(item.target, retype)) next()
    else setRetypeMiss(true)
  }

  const onInputKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (listen && e.ctrlKey && e.code === 'Space') {
      e.preventDefault()
      say()
    }
  }

  const total = ccc.queue.length
  const diff = useMemo(() => (phase === 'wrong' ? charDiff(item.target, answer.trim()) : []), [phase, item, answer])

  return (
    <div className="page practice nest-review">
      <SubHead title="Mistake nest">
        <div className="nest-bar">
          <span className="muted small tabular">
            {Math.min(ccc.pos + 1, total)} of {total}
            {retest && <span className="nest-retest">, once more</span>}
          </span>
          {canListen && (
            <Segmented
              ariaLabel="How the word is shown"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'look', label: 'look', title: 'Show it for a moment, then cover it' },
                { value: 'listen', label: 'listen', title: 'Kees says it; you never see it first' },
              ]}
            />
          )}
        </div>
        <div className="nest-progress" aria-hidden="true">
          <span style={{ '--done': ccc.pos / total } as CSSProperties} />
        </div>
      </SubHead>

      <div className={`nest-stage is-${phase}`} aria-live="polite">
        {phase === 'show' && (
          <div className="nest-card">
            <p className="nest-cue muted small">Look at it. It disappears in a moment.</p>
            <p className={`nest-target mono-text is-${item.kind}`} lang={tag} dir={dir}>
              {item.target}
            </p>
            <span className="nest-timer" style={{ animationDuration: `${revealMs(item.target, item.kind)}ms` } as CSSProperties} aria-hidden="true" />
            <p className="nest-hint-keys muted small">
              <Kbd>enter</Kbd> when you have it
            </p>
          </div>
        )}

        {phase === 'recall' && (
          <form className="nest-card" onSubmit={onRecall}>
            <p className="nest-cue muted small">
              {listen ? 'Kees says it. Type what you hear.' : item.kind === 'word' ? 'Now type the word from memory.' : 'Now type the sentence from memory.'}
            </p>
            {listen && <Kees mood="talk" size={56} className="nest-kees" />}
            <input
              className={`nest-input mono-text is-${item.kind}`}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={onInputKey}
              lang={tag}
              dir={dir}
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-label={item.kind === 'word' ? 'The word, from memory' : 'The sentence, from memory'}
            />
            <div className="nest-actions">
              <Button type="submit" variant="primary">
                Check
              </Button>
              {listen && (
                <Button onClick={say}>
                  Hear it again <Kbd>ctrl</Kbd>
                  <Kbd>space</Kbd>
                </Button>
              )}
              <Button variant="ghost" onClick={() => submit('')}>
                No idea
              </Button>
            </div>
          </form>
        )}

        {phase === 'right' && (
          <div className="nest-card">
            <p className="nest-verdict">
              Right. <span className="nest-ok">+1 box</span>
            </p>
            <p className={`nest-target mono-text is-${item.kind}`} lang={tag} dir={dir}>
              {item.target}
            </p>
            <p className="muted small">{boxNote}</p>
            {item.hint && <p className="nest-hint small">{item.hint}</p>}
            <div className="nest-actions">
              <Button variant="primary" onClick={next} autoFocus>
                Next
              </Button>
            </div>
          </div>
        )}

        {phase === 'wrong' && (
          <form className="nest-card" onSubmit={onRetype}>
            <p className="nest-verdict">{answer.trim() ? 'Not quite. This is it:' : 'This is it:'}</p>
            <p className={`nest-target mono-text is-${item.kind}`} lang={tag} dir={dir}>
              {dir ? item.target : <TargetMarks ops={diff} />}
            </p>
            {answer.trim() && (
              <p className="nest-yours small">
                <span className="muted">You typed </span>
                <span className={`mono-text${dir ? ' mark-wrong' : ''}`} lang={tag} dir={dir}>
                  {dir ? answer.trim() : <TypedMarks ops={diff} />}
                </span>
              </p>
            )}
            {item.kind === 'word' && (
              <div className="nest-kees-repeat">
                <Kees mood="repeat" size={56} bubble={[`${item.target}.`, `${item.target}.`, `${item.target}.`]} bubbleLang={tag} />
              </div>
            )}
            {item.hint && <p className="nest-hint small">{item.hint}</p>}
            <label className="nest-retype-label muted small" htmlFor="nest-retype">
              Type it once more, while you can see it.
            </label>
            <input
              id="nest-retype"
              className={`nest-input mono-text is-${item.kind}${retypeMiss ? ' is-miss' : ''}`}
              value={retype}
              onChange={(e) => {
                setRetype(e.target.value)
                setRetypeMiss(false)
              }}
              lang={tag}
              dir={dir}
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-invalid={retypeMiss || undefined}
              aria-describedby={retypeMiss ? 'nest-retype-miss' : undefined}
            />
            {retypeMiss && (
              <p id="nest-retype-miss" className="nest-miss small">
                Not the same yet. Compare it letter by letter.
              </p>
            )}
            <p className="muted small">{boxNote}</p>
            <div className="nest-actions">
              <Button type="submit" variant="primary">
                Next
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

/** The correct text, with the letters that went wrong underlined in --main. */
function TargetMarks({ ops }: { ops: CharOp[] }) {
  return (
    <>
      {ops
        .filter((o) => o.op !== 'ins')
        .map((o, i) => (
          <span key={i} className={o.op === 'equal' ? undefined : 'mark-tricky'}>
            {o.a}
          </span>
        ))}
    </>
  )
}

/** What was typed, small: wrong letters underlined, extra letters struck, gaps for missing ones. */
function TypedMarks({ ops }: { ops: CharOp[] }) {
  return (
    <>
      {ops.map((o, i) => {
        if (o.op === 'equal') return <span key={i}>{o.b}</span>
        if (o.op === 'sub') return <span key={i} className="mark-wrong">{o.b}</span>
        if (o.op === 'ins') return <span key={i} className="mark-extra">{o.b}</span>
        return (
          <span key={i} className="mark-missing" title={`missing ${o.a}`}>
            <span className="sr-only">(missing {o.a})</span>
          </span>
        )
      })}
    </>
  )
}

/* ------------------------------------------------------------------ */

function ReviewDone({ lang, items, ccc, startedAt }: { lang: Lang; items: Map<string, NestItem>; ccc: CccState; startedAt: number }) {
  const sum = cccSummary(ccc)
  const nestItems = useNest((s) => s.items)
  const recorded = useRef(false)

  useEffect(() => {
    if (recorded.current) return
    recorded.current = true
    useStats.getState().addSession({
      mode: 'practice',
      lang,
      durationMs: Date.now() - startedAt,
      config: NEST_CONFIG,
      score: sum.firstTry,
      total: sum.reviewed,
      mistakes: sum.missed.length,
    })
  }, [ccc, lang, startedAt, sum.firstTry, sum.missed.length, sum.reviewed])

  const missedWords = sum.missed.map((id) => items.get(id)).filter((i): i is NestItem => !!i && i.kind === 'word').map((i) => i.target)
  const allRight = sum.firstTry === sum.reviewed
  const tag = LANG_TAGS[lang]

  return (
    <div className="page practice nest-review">
      <SubHead title="Mistake nest" />
      <section className="nest-done" aria-labelledby="nest-done-title">
        <Kees mood={allRight ? 'curious' : 'idle'} size={72} className="nest-done-kees" />
        <div className="nest-done-body">
          <h2 id="nest-done-title" className="nest-done-title tabular">
            {sum.reviewed} reviewed, {sum.firstTry} right the first time.
          </h2>
          <p className="muted">
            {allRight
              ? 'Clean sweep. Everything moved up a box.'
              : `${sum.missed.length} went back to box 1${sum.fixed.length ? `; you got ${sum.fixed.length === sum.missed.length ? (sum.missed.length === 1 ? 'it' : 'all of them') : sum.fixed.length} right on the second go` : ''}. They come back tomorrow or sooner.`}
          </p>
          <ul className="nest-done-list">
            {[...items.values()].map((it) => {
              const now = nestItems.find((x) => x.id === it.id)
              const missed = sum.missed.includes(it.id)
              return (
                <li key={it.id} className={missed ? 'is-missed' : undefined}>
                  <span className="mono-text" lang={tag} dir={isRtl(lang) ? 'rtl' : undefined}>
                    {it.target}
                  </span>
                  <span className="muted small tabular">{now ? `box ${now.box}, ${now.due <= Date.now() ? 'due again now' : `back ${dueIn(now.due)}`}` : 'left the nest'}</span>
                </li>
              )
            })}
          </ul>
          <div className="nest-actions">
            <Link to="/practice" className="btn btn-primary btn-md">
              Back to weak spots
            </Link>
            {missedWords.length > 0 && (
              <Link to={repairHref(missedWords)} className="btn btn-subtle btn-md">
                Practise the {missedWords.length} missed {missedWords.length === 1 ? 'word' : 'words'}
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

function NothingDue({ lang }: { lang: Lang }) {
  const items = useNest((s) => s.items)
  const nest = useMemo(() => items.filter((i) => i.lang === lang).sort((a, b) => a.due - b.due), [items, lang])
  const next = nest[0]
  return (
    <div className="page practice nest-review">
      <SubHead title="Mistake nest" />
      <section className="nest-done">
        <Kees mood="sleepy" size={72} className="nest-done-kees" />
        <div className="nest-done-body">
          <h2 className="nest-done-title">{nest.length ? 'Nothing due right now.' : 'The nest is empty.'}</h2>
          <p className="muted">
            {nest.length
              ? `${nest.length} ${nest.length === 1 ? 'item is' : 'items are'} resting. The next one is due ${next ? dueIn(next.due) : 'soon'}.`
              : 'Words you miss in dictation, the gym and typing runs land here, then come back until they stick.'}
          </p>
          <div className="nest-actions">
            <Link to="/practice" className="btn btn-primary btn-md">
              Back to weak spots
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
