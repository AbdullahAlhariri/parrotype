import { useEffect, useMemo, useRef, useState } from 'react'
import { LANG_TAGS, isRtl } from '@/types'
import { splitGap, type DrillItem, type DrillPack } from '@/content/drills'
import { useSettings } from '@/state/settings'
import { setTyping } from '@/lib/focus'
import { Icon, Kbd, Kees } from '@/components/ui'
import { Gap, type GapMode } from './Gap'
import { Rich } from './Rich'
import { chooseOptions, explain, formatClock, isRight, itemKey, settledForm } from './round'

export interface RoundOutcome {
  item: DrillItem
  key: string
  right: boolean
  /** first answer given */
  typed: string
}

export interface RoundResult {
  outcomes: RoundOutcome[]
  durationMs: number
  bestStreak: number
}

type Phase = 'ask' | 'right' | 'wrong' | 'fixed'

interface Props {
  pack: DrillPack
  items: DrillItem[]
  choose: boolean
  onFinish: (r: RoundResult) => void
  onRestart: () => void
}

const RIGHT_PAUSE = 500
const FIXED_PAUSE = 650

function useElapsed(start: number, running: boolean) {
  const [now, setNow] = useState(start)
  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(id)
  }, [running])
  return now - start
}

/** One quick-fire round: type (or pick) the missing word, sentence after sentence. */
export function GymRound({ pack, items, choose, onFinish, onRestart }: Props) {
  const lang = pack.lang
  const rtl = isRtl(lang)
  const explainIn = useSettings((s) => s.explainIn)
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('ask')
  const [value, setValue] = useState('')
  const [wrongTyped, setWrongTyped] = useState('')
  const [streak, setStreak] = useState(0)
  const [plus, setPlus] = useState(0)
  const [started] = useState(() => Date.now())
  const outcomes = useRef<RoundOutcome[]>([])
  const bestStreak = useRef(0)
  const timer = useRef<number | undefined>(undefined)
  const inputRef = useRef<HTMLInputElement>(null)
  const optionsRef = useRef<HTMLDivElement>(null)
  const elapsed = useElapsed(started, true)

  const item = items[index]
  const options = useMemo(() => (choose ? chooseOptions(item) : []), [item, choose])
  const picking = choose && options.length > 0 && phase === 'ask'
  const [before, after] = splitGap(item.sentence)
  const hint = explain(item.hint, lang, explainIn)

  useEffect(
    () => () => {
      window.clearTimeout(timer.current)
      setTyping(false)
    },
    [],
  )

  // keep the keyboard where the next action is
  useEffect(() => {
    if (picking) optionsRef.current?.querySelector('button')?.focus({ preventScroll: true })
    else inputRef.current?.focus({ preventScroll: true })
  }, [index, phase, picking])

  const advance = () => {
    window.clearTimeout(timer.current)
    if (index + 1 >= items.length) {
      setTyping(false)
      onFinish({ outcomes: outcomes.current, durationMs: Date.now() - started, bestStreak: bestStreak.current })
      return
    }
    setIndex(index + 1)
    setPhase('ask')
    setValue('')
    setWrongTyped('')
  }

  const answer = (typed: string) => {
    if (phase !== 'ask' || !typed.trim()) return
    const right = isRight(item, typed, lang)
    outcomes.current.push({ item, key: itemKey(item), right, typed: typed.trim() })
    if (right) {
      const s = streak + 1
      bestStreak.current = Math.max(bestStreak.current, s)
      setStreak(s)
      setPlus((p) => p + 1)
      setValue(typed)
      setPhase('right')
      timer.current = window.setTimeout(advance, RIGHT_PAUSE)
    } else {
      setStreak(0)
      setWrongTyped(typed.trim())
      setValue('')
      setPhase('wrong')
    }
  }

  const onChange = (v: string) => {
    if (document.body.dataset.typing !== 'true') setTyping(true)
    setValue(v)
    if (phase === 'wrong' && isRight(item, v, lang)) {
      setPhase('fixed')
      timer.current = window.setTimeout(advance, FIXED_PAUSE)
    }
  }

  const onEnter = () => {
    if (phase === 'ask') answer(value)
    else if (phase === 'right' || phase === 'fixed') advance()
  }

  // choose mode: 1 2 3 pick; Enter skips the short pause after an answer
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const inText = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement
      if (picking && /^[1-3]$/.test(e.key) && !inText) {
        const opt = options[Number(e.key) - 1]
        if (opt) {
          e.preventDefault()
          setTyping(true)
          answer(opt)
        }
      } else if (e.key === 'Enter' && !inText && (phase === 'right' || phase === 'fixed')) {
        e.preventDefault()
        advance()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const mode: GapMode = picking ? 'pick' : phase === 'ask' ? 'ask' : phase === 'wrong' ? 'retype' : 'done'

  return (
    <div className={`gym-round is-${phase}`}>
      <div className="gym-meter tabular">
        <span className="gym-meter-count">
          <span className="sr-only">Sentence </span>
          {index + 1}
          <span className="gym-meter-of">
            <span className="sr-only"> of </span>
            <span aria-hidden="true">/</span>
            {items.length}
          </span>
        </span>
        <span className="gym-meter-streak">
          streak {streak}
          {plus > 0 && phase === 'right' && (
            <span key={plus} className="gym-plus" aria-hidden="true">
              +1
            </span>
          )}
        </span>
        <span className="gym-meter-time">{formatClock(elapsed)}</span>
      </div>

      <p key={index} className="gym-sentence mono-text" lang={LANG_TAGS[lang]} dir={rtl ? 'rtl' : 'ltr'}>
        {before}
        <Gap
          item={item}
          lang={lang}
          mode={mode}
          value={value}
          onChange={onChange}
          onEnter={onEnter}
          inputRef={inputRef}
          label={phase === 'wrong' ? `Type ${item.answer}` : 'Missing word'}
          settled={settledForm(item, value, lang)}
        />
        {after}
      </p>

      {picking && (
        <div className="gym-options" ref={optionsRef} role="group" aria-label="Pick the missing word">
          {options.map((o, i) => (
            <button key={o} type="button" className="gym-option" onClick={() => answer(o)} aria-keyshortcuts={String(i + 1)}>
              <Kbd>{i + 1}</Kbd>
              <span className="mono-text" lang={LANG_TAGS[lang]} dir={rtl ? 'rtl' : undefined}>
                {o}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="sr-only" aria-live="polite">
        {phase === 'right' && 'Right.'}
        {phase === 'wrong' && `Not quite. The answer is ${item.answer}. ${hint?.text ?? ''}`}
      </div>

      <div className="gym-feedback">
        {(phase === 'wrong' || phase === 'fixed') && (
          <div className="gym-wrong">
            <Kees
              mood="repeat"
              size={56}
              stayWhileTyping
              bubble={[`${item.answer}.`, `${item.answer}.`, `${item.answer}.`]}
              bubbleLang={LANG_TAGS[lang]}
              className="gym-kees"
            />
            <div className="gym-wrong-text">
              <p className="gym-typed">
                you typed{' '}
                <s lang={LANG_TAGS[lang]} dir={rtl ? 'rtl' : undefined}>
                  {wrongTyped}
                </s>
              </p>
              {hint && (
                <p className="gym-hint" lang={LANG_TAGS[hint.lang]} dir={hint.lang === 'ar' ? 'rtl' : 'ltr'}>
                  <Rich text={hint.text} exampleLang={lang} rtl={hint.lang === 'ar'} />
                </p>
              )}
              <p className="gym-instr">
                {phase === 'wrong' ? (
                  <>
                    Type{' '}
                    <b className="mono-text" lang={LANG_TAGS[lang]} dir={rtl ? 'rtl' : undefined}>
                      {item.answer}
                    </b>{' '}
                    to go on.
                  </>
                ) : (
                  'Locked in.'
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="gym-round-foot">
        <span className="gym-keys">
          {picking && (
            <>
              <Kbd>1</Kbd> <Kbd>2</Kbd> {options.length > 2 && <Kbd>3</Kbd>} pick
            </>
          )}
          {!picking && phase === 'ask' && (
            <>
              <Kbd>enter</Kbd> check
            </>
          )}
          {phase === 'wrong' && 'type the word above to go on'}
          {(phase === 'right' || phase === 'fixed') && (
            <>
              <Kbd>enter</Kbd> next
            </>
          )}
        </span>
        <button type="button" className="icon-btn gym-restart" onClick={onRestart} aria-label="Restart the round" title="Restart the round">
          <Icon name="restart" size={18} />
        </button>
      </div>
    </div>
  )
}
