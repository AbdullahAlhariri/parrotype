import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react'
import { Button, Icon, Kbd, Kees, type KeesMood } from '@/components/ui'
import { personaName } from '@/lib/audio'
import { setTyping } from '@/lib/focus'
import { Link } from '@/lib/router'
import { useSettings } from '@/state/settings'
import { LANG_TAGS, isRtl, type Issue, type Lang } from '@/types'
import { checkAttempt, ruleTitles } from './checker'
import { DictationFeedback, statusText } from './DictationFeedback'
import { DictationInput } from './DictationInput'
import { MemoryFlash } from './MemoryFlash'
import { flashMs } from './logic/flash'
import { gradeAttempt } from './logic/grade'
import type { DictationItem } from './logic/items'
import { initialItem, itemReducer, type ItemAction, type ItemState } from './logic/ladder'
import { recordFirstCheck, recordIssues } from './logic/record'
import { keesRepeat, type ItemResult } from './logic/summary'
import type { DictationVoice, VoiceSource } from './useVoice'
import { VoiceMenu } from './VoiceMenu'

interface Props {
  lang: Lang
  items: DictationItem[]
  /** sentences flash on screen instead of being spoken */
  memory: boolean
  voice: DictationVoice
  onFinish: (results: ItemResult[]) => void
  onNewSet: () => void
  /** shown above the stage before the first sentence, e.g. "no Arabic voice in this browser" */
  notice?: ReactNode
  /** the same in one line, under the controls once the set has started */
  noticeShort?: ReactNode
  /** play the first sentence right away (the set was started with a click or enter) */
  autoStart?: boolean
}

const INTERACTIVE = 'input, textarea, select, button, a, [contenteditable], dialog, [role="dialog"]'

/** Correct forms the parrot repeats after a reveal: one word three times, or each word once. */
function repeatWords(s: ItemState): string[] {
  const words = [...new Set((s.first?.wrong ?? []).filter((t) => t.status !== 'extra' && t.op.expected).map((t) => t.op.expected!))]
  if (!words.length) return []
  return words.length === 1 ? keesRepeat(words[0]) : words.slice(0, 3).map((w) => `${w}.`)
}

const LANG_EN: Record<Lang, string> = { nl: 'Dutch', en: 'English', ar: 'Arabic' }

const PLACEHOLDER: Record<Lang, { heard: string; saw: string; retype: string }> = {
  en: { heard: 'Type what you heard', saw: 'Type what you saw', retype: 'Type it correctly once' },
  nl: { heard: 'Typ wat je hoort', saw: 'Typ wat je zag', retype: 'Typ de zin één keer goed' },
  ar: { heard: 'اكتب ما تسمعه', saw: 'اكتب ما رأيته', retype: 'اكتب الجملة صحيحةً مرة واحدة' },
}

/**
 * Who reads, for the line under the buttons and the parrot's accessible name. Inside a sentence
 * ("read by the narrator") a leading "The" of a persona name goes lowercase.
 */
function speakerName(lang: Lang, src: VoiceSource, inline = false): string {
  if (src.kind === 'browser') return inline ? 'the browser voice' : 'The browser voice'
  const name = personaName(lang, src.persona)
  return inline ? name.replace(/^The /, 'the ') : name
}

export function DictationRun({ lang, items, memory, voice, onFinish, onNewSet, notice, noticeShort, autoStart = false }: Props) {
  const explainIn = useSettings((s) => s.explainIn)
  const [index, setIndex] = useState(0)
  const [st, setSt] = useState<ItemState>(initialItem)
  const [text, setText] = useState('')
  const [started, setStarted] = useState(false)
  const [listens, setListens] = useState(0)
  const [flashKey, setFlashKey] = useState<number | null>(null)
  const [issueMap, setIssueMap] = useState<ReadonlyMap<string, Issue[]>>(new Map())
  const results = useRef<ItemResult[]>([])
  const itemStart = useRef<number | null>(null)
  const pending = useRef<{ slow: boolean; words: boolean } | null>(null)
  const aborter = useRef<AbortController | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  /** the last sentence is done and the results went to onFinish */
  const over = useRef(false)
  const item = items[index]
  const last = index === items.length - 1
  const sayText = item ? (item.say ?? item.text) : ''

  // who reads this sentence; nobody (no recording, no browser voice) means it shows on screen
  const loading = voice.status === 'loading'
  const source = item && !memory ? voice.sourceFor(item.clip) : null
  const noVoiceHere = !memory && !!item && ((!loading && !source) || voice.failed === item.clip)
  const showsText = memory || noVoiceHere

  const focusInput = () => window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 0)

  /* ---------------- playback ---------------- */

  const speakItem = useCallback(
    (slow: boolean, words: boolean, first: boolean) => {
      if (!item) return
      const go = () => {
        if (words) voice.sayWords(item.clip, sayText)
        else if (!voice.say(item.clip, sayText, slow)) setFlashKey(Date.now())
      }
      // the mascot says hello once before the very first sentence; space again skips it
      if (first) voice.greet().then((ok) => ok && go())
      else go()
    },
    [item, voice, sayText],
  )

  const play = useCallback(
    (slow = false, words = false) => {
      if (!item) return
      const first = index === 0 && listens === 0
      setStarted(true)
      itemStart.current ??= performance.now()
      setListens((n) => n + 1)
      if (showsText) {
        setFlashKey(Date.now())
        return
      }
      if (loading) {
        pending.current = { slow, words }
        return
      }
      speakItem(slow, words, first)
    },
    [item, index, listens, showsText, loading, speakItem],
  )

  // a play requested while the voices were still loading
  useEffect(() => {
    if (loading || !pending.current) return
    const p = pending.current
    pending.current = null
    if (showsText) setFlashKey(Date.now())
    else speakItem(p.slow, p.words, index === 0)
  }, [loading, showsText, speakItem, index])

  // the recording did not load and no browser voice can stand in: show it instead
  const failedHere = !!item && voice.failed === item.clip
  useEffect(() => {
    if (failedHere && started) setFlashKey(Date.now())
  }, [failedHere, started])

  // every next sentence plays by itself (the Enter that moved on is the user gesture)
  const playRef = useRef(play)
  playRef.current = play
  useEffect(() => {
    if (index === 0 && !autoStart) return
    const t = window.setTimeout(() => playRef.current(), index === 0 ? 350 : 220)
    return () => clearTimeout(t)
  }, [index, autoStart])

  // warm the cache: this sentence (the first one) and the next
  const preload = voice.preload
  useEffect(() => {
    if (memory) return
    for (const it of items.slice(index, index + 2)) preload(it.clip)
  }, [index, items, memory, preload])

  const onFlashHidden = useCallback(() => setFlashKey(null), [])

  // the field is display:none while the sentence flashes in its place: focus it once it is back
  // (after the commit, a timeout can come too early and leave focus on the body)
  const flashed = useRef(false)
  useEffect(() => {
    if (flashKey !== null) flashed.current = true
    else if (flashed.current) {
      flashed.current = false
      inputRef.current?.focus({ preventScroll: true })
    }
  }, [flashKey])

  /* ---------------- checking ---------------- */

  const loadIssues = (typed: string, record: boolean, grade: ReturnType<typeof gradeAttempt>) => {
    if (issueMap.has(typed)) return
    const ctrl = aborter.current ?? (aborter.current = new AbortController())
    checkAttempt(typed, lang, ctrl.signal).then((issues) => {
      if (ctrl.signal.aborted) return
      setIssueMap((m) => new Map(m).set(typed, issues))
      if (record && issues.length) ruleTitles().then((t) => recordIssues(lang, grade, issues, (id) => t.get(id)))
    })
  }

  const apply = (action: ItemAction) => {
    const next = itemReducer(st, action)
    setSt(next)
    if (next.phase === 'retype' && st.phase !== 'retype') setText('')
    if (next.phase === 'done' && st.phase !== 'done' && next.first && item) {
      results.current.push({
        item,
        first: next.first,
        firstTyped: next.firstTyped,
        attempts: next.attempts,
        hint: next.hint,
        listens: Math.max(1, listens),
        ms: itemStart.current ? performance.now() - itemStart.current : 0,
      })
    }
    return next
  }

  const goNext = () => {
    voice.stop()
    aborter.current?.abort()
    aborter.current = null
    if (last) {
      over.current = true
      onFinish(results.current)
      return
    }
    setIndex((i) => i + 1)
    setSt(initialItem())
    setText('')
    setListens(0)
    setFlashKey(null)
    setIssueMap(new Map())
    itemStart.current = null
    focusInput()
  }

  const check = () => {
    if (!item) return
    if (st.phase === 'done') return goNext()
    if (flashKey !== null) return
    if (!text.trim()) {
      if (st.phase === 'answer') play()
      return
    }
    setTyping(false)
    const grade = gradeAttempt(item.text, text, lang, item.target)
    const isFirst = !st.first && st.phase !== 'retype'
    apply({ type: 'check', grade, typed: grade.typed })
    if (isFirst) recordFirstCheck(item, grade, explainIn)
    if (!grade.perfect) loadIssues(grade.typed, isFirst, grade)
  }

  const hint = () => {
    apply({ type: 'hint' })
    focusInput()
  }
  const reveal = () => {
    apply({ type: 'reveal' })
    focusInput()
  }

  /* ---------------- keyboard ---------------- */

  const onKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return
    if (e.key === 'Enter') {
      e.preventDefault()
      check()
      return
    }
    const space = e.code === 'Space' || e.key === ' '
    if (space && (e.ctrlKey || (text === '' && !e.altKey && !e.metaKey))) {
      e.preventDefault()
      play(e.shiftKey)
      return
    }
    if (e.altKey && e.code === 'KeyW') {
      e.preventDefault()
      play(false, true)
      return
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && st.phase !== 'done') setTyping(true)
  }

  // keys pressed while focus is not in a field: space plays, enter checks, letters jump into the field
  const checkRef = useRef(check)
  checkRef.current = check
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (e.defaultPrevented || el?.closest?.(INTERACTIVE) || e.metaKey) return
      if (e.key === 'Enter') {
        e.preventDefault()
        checkRef.current()
      } else if (e.code === 'Space' && !e.altKey) {
        e.preventDefault()
        playRef.current(e.shiftKey)
      } else if (e.altKey && e.code === 'KeyW') {
        e.preventDefault()
        playRef.current(false, true)
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey) {
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true })
    return () => {
      setTyping(false)
      aborter.current?.abort()
    }
  }, [])

  // leaving mid-sentence (new set, new setup) silences the voice; after the last sentence the
  // summary may already be playing the mascot's line, which is not ours to stop
  const stopVoice = voice.stop
  useEffect(() => () => void (over.current || stopVoice()), [stopVoice])

  if (!item) return null

  /* ---------------- view ---------------- */

  const flashing = flashKey !== null
  // before anything plays, name the browser voice only once the browser has confirmed it has one
  const speaker = voice.speaking ? voice.current : source?.kind === 'browser' && voice.browser !== 'ready' ? null : source
  // the parrot talks when he reads (his own recordings, or the browser voice); with another voice he listens along
  const parrotTalks = voice.speaking && (!voice.current || voice.current.kind === 'browser' || !!voice.current.persona.mascot)
  const mood: KeesMood = parrotTalks
    ? 'talk'
    : voice.speaking
      ? 'listen'
      : flashing
        ? 'reading'
        : st.phase === 'done'
          ? st.first?.perfect
            ? 'curious'
            : 'idle'
          : st.phase === 'retype'
            ? 'repeat'
            : st.phase === 'feedback'
              ? 'reading'
              : started
                ? 'listen'
                : 'idle'
  const bubble = st.phase === 'retype' ? repeatWords(st) : undefined
  const describedBy = 'dict-keys'
  const canWords = voice.canWords && !showsText && (listens >= 2 || st.attempts > 0)

  // with explanations in the practice language the answer field speaks it too (and Arabic is not an English line in a right-to-left field)
  const phLocal = explainIn === 'local' && lang !== 'en'
  const ph = phLocal ? PLACEHOLDER[lang] : PLACEHOLDER.en
  const placeholder = !started || flashing ? '' : st.phase === 'retype' ? ph.retype : showsText ? ph.saw : ph.heard

  return (
    <section className="dict-run" aria-label={`Sentence ${index + 1} of ${items.length}`}>
      {!started && index === 0 && notice}
      <div className="dict-stage">
        <div className="dict-kees">
          <Kees
            mood={mood}
            size={76}
            bubble={bubble}
            bubbleLang={LANG_TAGS[lang]}
            bubblePlacement="top"
            stayWhileTyping
            label={voice.speaking && voice.current ? `${speakerName(lang, voice.current)} is reading` : undefined}
          />
        </div>
        <div className="dict-controls">
          <div className="dict-buttons" role="group" aria-label={showsText ? 'Show the sentence' : 'Playback'}>
            {showsText ? (
              <Button variant="subtle" size="sm" onClick={() => play()} disabled={flashing}>
                <Icon name="play" size={16} />
                {listens ? 'Show it again' : 'Show it'}
              </Button>
            ) : (
              <>
                <Button variant="subtle" size="sm" onClick={() => play()} aria-keyshortcuts="Control+Space">
                  <Icon name="play" size={16} />
                  {listens && !voice.greeting ? 'Hear it again' : 'Hear it'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => play(true)} aria-keyshortcuts="Control+Shift+Space">
                  Slowly
                </Button>
                {canWords && (
                  <Button variant="ghost" size="sm" onClick={() => play(false, true)} aria-keyshortcuts="Alt+W">
                    Word by word
                  </Button>
                )}
              </>
            )}
          </div>
          {!memory && (
            <div className="dict-voice">
              {noVoiceHere ? (
                <p className="dict-speaker">
                  {voice.failed === item.clip ? 'The recording did not load' : 'No recording of this one'} and no {LANG_EN[lang]} browser voice, so it
                  shows on screen.
                </p>
              ) : voice.greeting && voice.current ? (
                <p className="dict-speaker" data-speaking>
                  <SpeakerName lang={lang} src={voice.current} /> says hello
                </p>
              ) : speaker ? (
                <p className="dict-speaker" data-speaking={voice.speaking || undefined}>
                  <span className="dict-speaker-label">read by </span>
                  <SpeakerName lang={lang} src={speaker} />
                </p>
              ) : null}
              {voice.personas.length > 0 ? (
                <VoiceMenu lang={lang} voice={voice} />
              ) : (
                <Link to="/settings#dictation" className="dict-voice-link">
                  Voice settings
                </Link>
              )}
            </div>
          )}
          {noticeShort && (started || index > 0) && <p className="dict-voice dict-voice-note">{noticeShort}</p>}
        </div>
        <p className="dict-progress tabular" aria-label={`Sentence ${index + 1} of ${items.length}`}>
          {index + 1}
          <span className="dict-progress-of">/{items.length}</span>
        </p>
      </div>

      {!started && <Intro showsText={showsText} pairs={!!item.choices} />}

      {/* memory mode: the sentence shows where the answer goes, then the field takes its place */}
      {flashing && (
        <MemoryFlash
          text={item.text}
          lang={lang}
          ms={flashMs(item.text)}
          flashKey={flashKey}
          onHidden={onFlashHidden}
          target={item.target}
          choices={item.choices}
        />
      )}
      <DictationInput
        ref={inputRef}
        hidden={flashing}
        value={text}
        onChange={setText}
        onKeyDown={onKeyDown}
        lang={lang}
        placeholder={placeholder}
        placeholderLocal={phLocal}
        readOnly={flashing || st.phase === 'done'}
        invalid={st.phase === 'feedback'}
        describedBy={describedBy}
        label={st.phase === 'retype' ? 'Type the sentence correctly' : 'Your answer'}
      />
      <div className="dict-under">
        <KeyHints id={describedBy} st={st} started={started} empty={!text} memory={showsText} last={last} canWords={canWords} greeting={voice.greeting} />
        {/* first stop after the field, so tab then enter starts a new set (as the footer says) */}
        <button type="button" className="dict-restart link-btn" onClick={onNewSet} title="New set (tab, then enter)">
          <Icon name="restart" size={16} />
          New set
        </button>
      </div>

      <DictationFeedback item={item} state={st} issuesFor={(t) => issueMap.get(t) ?? []} onHint={hint} onReveal={reveal} />
      <p className="visually-hidden" role="status" aria-live="polite">
        {st.phase === 'answer' ? '' : statusText(st, item)}
      </p>
    </section>
  )
}

/** Before the first sentence: how to get it. Touch screens have no space bar to press. */
function Intro({ showsText, pairs }: { showsText: boolean; pairs: boolean }) {
  const shown = pairs
    ? 'the first sentence shows for a few seconds, with both spellings of the sound-alike word. Type it with the right one.'
    : 'the first sentence shows for a few seconds. Then type it from memory.'
  return (
    <p className="dict-intro">
      <span className="dict-intro-keys">{showsText ? `Press space and ${shown}` : 'Press space to hear the first sentence.'}</span>
      <span className="dict-intro-touch">{showsText ? `Tap Show it and ${shown}` : 'Tap Hear it for the first sentence.'}</span>
    </p>
  )
}

/** The reader's name; Arabic persona names are Arabic script, so they get their own lang and direction. */
function SpeakerName({ lang, src }: { lang: Lang; src: VoiceSource }) {
  const name = speakerName(lang, src, true)
  const native = src.kind === 'clip' && !src.persona.mascot && isRtl(lang)
  return (
    <bdi className="dict-speaker-name" lang={native ? LANG_TAGS[lang] : undefined}>
      {name}
    </bdi>
  )
}

interface KeyHintsProps {
  id: string
  st: ItemState
  started: boolean
  empty: boolean
  memory: boolean
  last: boolean
  canWords: boolean
  /** the mascot's hello is playing: space skips to the sentence */
  greeting: boolean
}

function KeyHints({ id, st, started, empty, memory, last, canWords, greeting }: KeyHintsProps) {
  let hints: [ReactNode, string][]
  const space = <Kbd>space</Kbd>
  const enter = <Kbd>enter</Kbd>
  if (!started) hints = [[space, memory ? 'show the sentence' : 'hear the sentence']]
  else if (greeting && empty) hints = [[space, 'skip the hello']]
  else if (st.phase === 'done') hints = [[enter, last ? 'see how it went' : 'next sentence']]
  else if (st.phase === 'feedback') hints = [[enter, 'check again'], [<><Kbd>ctrl</Kbd> {space}</>, memory ? 'show it again' : 'hear it again']]
  else if (!empty) hints = [[enter, 'check'], [<><Kbd>ctrl</Kbd> {space}</>, memory ? 'show it again' : 'hear it again']]
  else if (memory) hints = [[space, 'show it again']]
  else {
    hints = [[space, 'hear it again'], [<><Kbd>shift</Kbd> {space}</>, 'slowly']]
    if (canWords) hints.push([<><Kbd>alt</Kbd> <Kbd>w</Kbd></>, 'word by word'])
  }
  return (
    <p className="dict-keys" id={id}>
      {hints.map(([k, label], i) => (
        <span key={i} className="dict-key">
          {k} {label}
        </span>
      ))}
    </p>
  )
}
