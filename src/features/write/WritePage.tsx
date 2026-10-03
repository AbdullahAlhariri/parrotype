import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { Issue } from '@/types'
import { isRtl } from '@/types'
import { useSettings } from '@/state/settings'
import { setTyping } from '@/lib/focus'
import { speak, stopSpeaking } from '@/lib/speech'
import { mascotName } from '@/lib/mascot'
import { browserVoiceName, stopAudio } from '@/lib/audio'
import { Button, Kbd, Kees, Segmented, toast } from '@/components/ui'
import { kindLabel } from '@/content/prompts'
import { WriteEditor, type MarkMode, type WriteEditorHandle } from './WriteEditor'
import { IssuePopover, type IssuePopoverHandle } from './IssuePopover'
import { IssueList } from './IssueList'
import { PromptBar } from './PromptBar'
import { DraftsMenu } from './DraftsMenu'
import { WriteReport } from './WriteReport'
import { STALE, useWriteSession, type FeedbackMode } from './useWriteSession'
import { ruleTitles, useCheckerStatus } from './lib/checker'
import { MARK_LABEL, markKind, stepIssue } from './lib/segments'
import { defaultTitle, summarize, type TitleFor, type WriteSummary } from './lib/report'
import { recordWriteSession } from './lib/record'
import { countChars, countWords } from './lib/text'
import { draftWhen } from './lib/drafts'
import { useHasVoice } from './lib/voice'
import { ReviewNote } from './ReviewNote'
import './write.css'

const PLACEHOLDER = { nl: 'Begin hier met schrijven.', en: 'Start writing here.', ar: 'ابدأ الكتابة هنا.' }
const PAUSE_MS = 1500

const MODE_OPTIONS = [
  { value: 'done' as FeedbackMode, label: 'when I’m done', title: 'Feedback after you press Review (recommended)' },
  { value: 'live' as FeedbackMode, label: 'as I type', title: 'Underlines appear while you write' },
]

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
const MOD = isMac ? 'cmd' : 'ctrl'

const subscribeOnline = (cb: () => void) => {
  window.addEventListener('online', cb)
  window.addEventListener('offline', cb)
  return () => {
    window.removeEventListener('online', cb)
    window.removeEventListener('offline', cb)
  }
}
const useOnline = () => useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true)

interface ReportData {
  text: string
  issues: Issue[]
  summary: WriteSummary
}

export default function WritePage() {
  const lang = useSettings((s) => s.lang)
  const explainIn = useSettings((s) => s.explainIn)
  const ltOn = useSettings((s) => s.languageTool)
  const speechRate = useSettings((s) => s.speechRate)
  const voices = useSettings((s) => s.voices)
  const status = useCheckerStatus()
  const online = useOnline()
  const hasVoice = useHasVoice(lang)
  const s = useWriteSession(lang)
  const mascot = mascotName(lang)

  const editorRef = useRef<WriteEditorHandle>(null)
  const popRef = useRef<IssuePopoverHandle>(null)
  const [activeId, setActiveId] = useState<string>()
  const [anchor, setAnchor] = useState<{ top: number; bottom: number; left: number; right: number; width: number } | null>(null)
  const [lines, setLines] = useState(0)
  /** lines marked when self-review started; the bands clear as flagged words get edited, this stays */
  const [markedLines, setMarkedLines] = useState(0)
  const [typingNow, setTypingNow] = useState(false)
  /** caret position at the last keystroke: the word being typed there is not judged yet */
  const [typingAt, setTypingAt] = useState(-1)
  const [hasTyped, setHasTyped] = useState(false)
  const [announce, setAnnounce] = useState('')
  const [report, setReport] = useState<ReportData | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [speaking, setSpeaking] = useState(false)
  const typingTimer = useRef<number>(0)
  /** set while a fix is written into the textarea: that is not typing, so the chrome stays */
  const applyingRef = useRef(false)

  const rtl = isRtl(lang)
  const markMode: MarkMode = s.phase === 'review' ? 'lines' : s.phase === 'revealed' ? 'marks' : 'none'
  const visible =
    markMode !== 'marks'
      ? []
      : s.mode === 'live' && typingNow
        ? s.issues.filter((i) => typingAt < i.offset || typingAt > i.offset + i.length)
        : s.issues
  const active = visible.find((i) => i.id === activeId)
  const activeRef = useRef<Issue | undefined>(active)
  activeRef.current = active
  /** the caret selects the whole flagged word (F8, alt+arrows, the side list): Enter then applies the fix */
  const [wordSelected, setWordSelected] = useState(false)
  const words = countWords(s.text)
  const empty = !s.text.trim()

  /* ---------------- typing ---------------- */

  const onText = useCallback(
    (t: string) => {
      s.setText(t)
      setHasTyped(true)
      if (applyingRef.current) return
      setTypingAt(editorRef.current?.textarea?.selectionStart ?? -1)
      setTypingNow(true)
      window.clearTimeout(typingTimer.current)
      typingTimer.current = window.setTimeout(() => setTypingNow(false), PAUSE_MS)
      setTyping(true)
    },
    [s.setText],
  )

  useEffect(
    () => () => {
      window.clearTimeout(typingTimer.current)
      setTyping(false)
      stopSpeaking()
    },
    [],
  )

  // A report belongs to one Finish: drop it when the page leaves the report (language switch, new text).
  useEffect(() => {
    if (s.phase !== 'report') setReport(null)
  }, [s.phase])

  // The popover closes once its word is gone (edited, fixed, ignored) or feedback is hidden.
  useEffect(() => {
    if (activeId && !active) setActiveId(undefined)
  }, [activeId, active])

  // A click anywhere else closes the popover (clicks in the editor are handled by caret tracking).
  useEffect(() => {
    if (!activeId) return
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (popRef.current?.contains(t) || t === editorRef.current?.textarea) return
      setActiveId(undefined)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [activeId])

  // Anchor the popover to its word after every layout change.
  useLayoutEffect(() => {
    if (!active) {
      setAnchor(null)
      return
    }
    const measure = () => {
      const b = editorRef.current?.markBox(active.id) ?? null
      setAnchor((p) => (p && b && p.top === b.top && p.left === b.left && p.width === b.width && p.right === b.right ? p : b))
    }
    measure()
    window.addEventListener('resize', measure)
    document.fonts?.addEventListener?.('loadingdone', measure)
    return () => {
      window.removeEventListener('resize', measure)
      document.fonts?.removeEventListener?.('loadingdone', measure)
    }
  }, [active, s.text])

  // Start with the caret in the editor (on devices with a real keyboard), and put it back there
  // when a button that had focus disappears (Reveal, Review).
  useEffect(() => {
    if (matchMedia('(pointer: fine)').matches) editorRef.current?.focus()
  }, [])
  useEffect(() => {
    if (s.phase === 'revealed' || s.phase === 'writing') {
      const el = document.activeElement
      if (!el || el === document.body) editorRef.current?.focus()
    }
  }, [s.phase])

  // Self-review countdown.
  useEffect(() => {
    if (s.phase !== 'review') return
    setNow(Date.now())
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [s.phase])

  // Tell screen readers what just happened.
  const inReview = s.phase === 'review'
  useEffect(() => {
    if (!inReview) setMarkedLines(0)
    else setMarkedLines((m) => Math.max(m, lines))
  }, [inReview, lines])
  useEffect(() => {
    // the line count arrives after the editor has measured, so this keys on it
    if (inReview && markedLines > 0) setAnnounce(`Find your mistakes first. ${mascot} marked ${markedLines} ${markedLines === 1 ? 'line' : 'lines'}.`)
  }, [inReview, markedLines, mascot])
  useEffect(() => {
    if (s.phase === 'revealed' && s.mode === 'done') setAnnounce(s.issues.length ? `${s.issues.length} underlined. Press F8 to go through them.` : 'Nothing to correct.')
    else if (s.phase === 'checking') setAnnounce(`${mascot} is reading.`)
  }, [s.phase]) // on phase changes only, not on every edit

  /* ---------------- issues ---------------- */

  const describe = (i: Issue, viaKey: boolean) => {
    const msg = (explainIn === 'local' && i.messageLocal) || i.message
    const rep = i.replacements[0]
    const enter = viaKey && rep !== undefined ? `Enter changes it to ${rep || 'nothing'}. ` : ''
    return `${MARK_LABEL[markKind(i)]}: ${i.text}. ${msg}. ${enter}Tab for more options, Escape to close.`
  }

  const openIssue = (i: Issue, via: 'click' | 'key') => {
    setActiveId(i.id)
    if (via === 'key') {
      const ta = editorRef.current?.textarea
      ta?.focus()
      ta?.setSelectionRange(i.offset, i.offset + i.length)
    }
    setWordSelected(via === 'key')
    setAnnounce(describe(i, via === 'key'))
  }

  const step = (dir: 1 | -1) => {
    const ta = editorRef.current?.textarea
    const next = stepIssue(visible, ta?.selectionStart ?? 0, dir, activeRef.current?.id)
    if (next) openIssue(next, 'key')
  }

  const closeIssue = (refocus = true) => {
    setActiveId(undefined)
    if (refocus) editorRef.current?.focus()
  }

  const apply = (i: Issue, rep: string) => {
    const ta = editorRef.current?.textarea
    if (!ta) return
    const { offset, length } = i
    ta.focus()
    ta.setSelectionRange(offset, offset + length)
    const before = ta.value
    let ok = false
    applyingRef.current = true
    try {
      // goes through the browser's undo stack, so ctrl+z brings the old word back
      ok = rep ? document.execCommand('insertText', false, rep) : document.execCommand('delete')
    } catch {
      ok = false
    }
    if (!ok || ta.value === before) {
      onText(before.slice(0, offset) + rep + before.slice(offset + length))
      requestAnimationFrame(() => ta.setSelectionRange(offset + rep.length, offset + rep.length))
    }
    applyingRef.current = false
    setActiveId(undefined)
    setAnnounce(rep ? `Changed to ${rep}.` : 'Removed.')
    void s.recheckAt(offset)
  }

  const ignore = (i: Issue) => {
    s.ignore(i)
    closeIssue()
    setAnnounce('Ignored for this text.')
  }

  const addWord = async (i: Issue) => {
    await s.addToDictionary(i)
    closeIssue()
    toast(`Added ‘${i.text}’ to your dictionary.`, 'good')
  }

  const onCaret = (start: number, end: number) => {
    const a = activeRef.current
    if (!a) return
    if (start < a.offset || end > a.offset + a.length) setActiveId(undefined)
    else setWordSelected(start === a.offset && end === a.offset + a.length)
  }

  /* ---------------- primary action ---------------- */

  const doFinish = async () => {
    setActiveId(undefined)
    stopSpeaking()
    setSpeaking(false)
    const text = s.text
    const titlesLoading = ruleTitles(lang)
    const final = await s.finish()
    if (final === STALE) return
    if (!final) {
      if (!useCheckerStatus.getState().unavailable) toast(`${mascot} could not read your text this time. Try again in a moment; your text is saved.`, 'bad')
      return
    }
    const titles = await titlesLoading
    const titleFor: TitleFor = (i) => titles.get(i.ruleId) ?? defaultTitle(i)
    const summary = summarize(text, final, titleFor)
    setReport({ text, issues: final, summary })
    const recorded = recordWriteSession({
      lang,
      text,
      issues: final,
      activeMs: s.draft.activeMs,
      config: s.prompt ? kindLabel(s.prompt.kind) : 'free writing',
      titleFor,
      already: s.draft.recorded,
    })
    s.markFinished(recorded)
    setTyping(false)
    window.scrollTo({ top: 0 })
  }

  const doReview = async () => {
    setActiveId(undefined)
    const ok = await s.review()
    if (!ok && !useCheckerStatus.getState().unavailable) toast(`${mascot} could not read your text this time. Try again in a moment; your text is saved.`, 'bad')
  }

  const primary = () => {
    if (empty) return
    if (s.phase === 'writing') return void (s.mode === 'done' ? doReview() : doFinish())
    if (s.phase === 'review') return void s.reveal()
    if (s.phase === 'revealed') return void (s.mode === 'done' && s.dirty ? doReview() : doFinish())
  }
  const primaryRef = useRef(primary)
  primaryRef.current = primary
  const stepRef = useRef(step)
  stepRef.current = step

  // Shortcuts that also work when focus is on a button rather than in the editor.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.target === editorRef.current?.textarea) return
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        primaryRef.current()
      } else if (e.key === 'F8') {
        e.preventDefault()
        stepRef.current(e.shiftKey ? -1 : 1)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const onKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    const mod = e.ctrlKey || e.metaKey
    if (mod && e.key === 'Enter') {
      e.preventDefault()
      primary()
      return
    }
    if (e.key === 'F8' || (e.altKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp'))) {
      if (visible.length) {
        e.preventDefault()
        step(e.key === 'ArrowUp' || (e.key === 'F8' && e.shiftKey) ? -1 : 1)
      }
      return
    }
    const a = activeRef.current
    if (!a) return
    // Enter only applies when the word is selected; with a plain caret it makes a new line as usual
    if (e.key === 'Enter' && wordSelected && !mod && !e.shiftKey && !e.altKey && a.replacements[0] !== undefined) {
      e.preventDefault()
      apply(a, a.replacements[0])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      closeIssue(false)
    } else if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault()
      popRef.current?.focusFirst()
    }
  }

  const readAloud = () => {
    if (speaking) {
      stopSpeaking()
      setSpeaking(false)
      return
    }
    setSpeaking(true)
    stopAudio()
    speak(s.text, lang, { rate: speechRate, voiceName: browserVoiceName(voices[lang]), onEnd: () => setSpeaking(false) })
  }

  /* ---------------- report ---------------- */

  if (s.phase === 'report' && report) {
    return (
      <div className="page write write--report">
        <WriteReport
          lang={lang}
          text={report.text}
          issues={report.issues}
          summary={report.summary}
          words={countWords(report.text)}
          activeMs={s.draft.activeMs}
          prompt={s.prompt}
          found={s.found}
          explainIn={explainIn}
          onKeepWriting={() => {
            setReport(null)
            s.keepWriting()
            requestAnimationFrame(() => editorRef.current?.focus())
          }}
          onNew={() => {
            setReport(null)
            s.startNew()
            requestAnimationFrame(() => editorRef.current?.focus())
          }}
        />
      </div>
    )
  }

  /* ---------------- writing ---------------- */

  // 'report' without data yet means the report is still being put together
  const checking = s.phase === 'checking' || s.phase === 'report'
  const readingLabel = `${mascot} is reading`
  const secondsLeft = Math.max(0, Math.ceil((s.reviewEndsAt - now) / 1000))
  const primaryLabel =
    s.phase === 'review'
      ? 'Reveal'
      : checking
        ? readingLabel
        : s.mode === 'done' && (s.phase === 'writing' || s.dirty)
          ? s.phase === 'writing'
            ? 'Review'
            : 'Review again'
          : 'Finish'
  const showFinishToo = s.mode === 'done' && (s.phase === 'revealed' || s.phase === 'review') && primaryLabel !== 'Finish'
  const paused = hasTyped && !typingNow
  const keesMood = checking || paused || s.phase === 'review' ? 'reading' : 'idle'

  const ltLine = (() => {
    if (!ltOn) return undefined
    if (!online || status.lt === 'offline') return { text: 'Grammar check is offline right now. Spelling still works and your text is saved.', warn: true }
    if (status.lt === 'limited') return { text: 'The grammar service is rate-limited. Try again in a minute; your text stays here.', warn: true }
    if (status.lt === 'blocked') return { text: 'Grammar check is offline right now. Spelling still works and your text is saved.', detail: status.ltMessage, warn: true }
    if (status.lt === 'checking') return { text: 'Asking LanguageTool for a second opinion.', warn: false }
    if (status.lt === 'ok') return { text: 'LanguageTool checked it too.', warn: false }
    return { text: `LanguageTool joins in when you press ${s.mode === 'done' ? 'Review' : 'Finish'}.`, warn: false }
  })()

  const note =
    s.phase === 'review' ? (
      <ReviewNote lang={lang} />
    ) : checking ? (
      <p>{readingLabel}.</p>
    ) : s.mode === 'live' ? (
      <p>Underlines show up when you pause for a moment.</p>
    ) : empty ? (
      <p>Write first. {mascot} reads it when you press Review.</p>
    ) : (
      <p>
        Feedback waits until you press Review, so nothing interrupts you. <Kbd>{MOD}</Kbd> <Kbd>enter</Kbd>
      </p>
    )
  const after = s.mode === 'done' && s.phase === 'revealed' && s.dirty && !empty ? <p className="il-note">What you wrote since the last review is not checked yet.</p> : undefined

  return (
    <div className="page write" data-phase={s.phase}>
      <h1 className="visually-hidden">Free writing</h1>
      <div className="wp-bar">
        <div className="wp-mode">
          <span className="wp-bar-label" id="wp-mode-label">
            feedback
          </span>
          <Segmented ariaLabel="When to show feedback" options={MODE_OPTIONS} value={s.mode} onChange={s.setMode} />
        </div>
        <div className="wp-bar-right">
          <DraftsMenu lang={lang} currentId={s.draft.id} version={s.draftsVersion} onOpen={s.openDraft} onDelete={s.deleteDraft} />
          <button type="button" className="wd-toggle" onClick={() => s.startNew()} disabled={checking}>
            new text
          </button>
        </div>
      </div>

      <PromptBar lang={lang} prompt={s.prompt} kind={s.kind} onKind={s.setKind} onShuffle={s.shuffle} onFree={() => s.setPrompt(undefined)} disabled={checking} />

      <div className="wp-grid">
        <div className="wp-main">
          <Strip
            phase={s.phase}
            lines={markedLines}
            secondsLeft={secondsLeft}
            found={s.found}
            left={s.issues.length}
            resumedAt={s.resumed ? s.draft.updatedAt : undefined}
            mascot={mascot}
            onReveal={() => void s.reveal()}
            onNew={() => s.startNew()}
            speech={hasVoice && !empty}
            speaking={speaking}
            onSpeak={readAloud}
          />

          <WriteEditor
            ref={editorRef}
            text={s.text}
            lang={lang}
            onChange={onText}
            issues={markMode === 'lines' ? s.issues : visible}
            mode={markMode}
            activeId={active?.id}
            onPick={(i) => openIssue(i, 'click')}
            onKeyDown={onKeyDown}
            onCaret={onCaret}
            onLines={setLines}
            placeholder={PLACEHOLDER[lang]}
            ariaLabel={s.prompt ? `Your text. Prompt: ${s.prompt.text}` : 'Your text'}
            describedBy="wp-keys"
          >
            {active && anchor && (
              <IssuePopover
                ref={popRef}
                issue={active}
                anchor={anchor}
                rtl={rtl}
                explainIn={explainIn}
                index={visible.indexOf(active)}
                total={visible.length}
                enterApplies={wordSelected}
                onApply={(r) => apply(active, r)}
                onIgnore={() => ignore(active)}
                onAddWord={() => void addWord(active)}
                onClose={() => closeIssue()}
                onStep={step}
              />
            )}
          </WriteEditor>

          <div className="wp-actions">
            <p className="wp-keys" id="wp-keys">
              {s.phase === 'revealed' && visible.length > 0 ? (
                <>
                  <Kbd>F8</Kbd> next mistake <span className="wp-keys-gap" /> <Kbd>{MOD}</Kbd> <Kbd>enter</Kbd> {primaryLabel.toLowerCase()}
                </>
              ) : (
                <>
                  <Kbd>{MOD}</Kbd> <Kbd>enter</Kbd> {primaryLabel === readingLabel ? 'review' : primaryLabel.toLowerCase()}
                </>
              )}
            </p>
            <div className="wp-buttons">
              {showFinishToo && (
                <Button variant="ghost" onClick={() => void doFinish()} disabled={empty || checking}>
                  Finish
                </Button>
              )}
              <Button variant="primary" onClick={primary} disabled={empty || checking} aria-busy={checking || undefined}>
                {primaryLabel}
              </Button>
            </div>
          </div>
        </div>

        <div className="wp-side">
          <div className="wp-kees">
            <Kees size={56} mood={keesMood} stayWhileTyping={paused || checking || s.phase === 'review'} />
          </div>
          <IssueList
            issues={visible}
            revealed={s.phase === 'revealed' && !empty}
            live={s.mode === 'live'}
            activeId={active?.id}
            onJump={(i) => openIssue(i, 'key')}
            explainIn={explainIn}
            words={words}
            target={s.prompt?.words}
            chars={countChars(s.text)}
            activeMs={s.draft.activeMs}
            ltLine={ltLine}
            checkerMissing={status.unavailable}
            mascot={mascot}
            note={note}
            after={after}
          />
        </div>
      </div>

      <p className="visually-hidden" aria-live="polite" aria-atomic="true">
        {announce}
      </p>
    </div>
  )
}

interface StripProps {
  phase: string
  lines: number
  secondsLeft: number
  found: { found: number; total: number } | null
  left: number
  resumedAt?: number
  mascot: string
  onReveal: () => void
  onNew: () => void
  speech: boolean
  speaking: boolean
  onSpeak: () => void
}

/** One line above the editor: the self-review task, the result of it, or "picked up your draft". */
function Strip({ phase, lines, secondsLeft, found, left, resumedAt, mascot, onReveal, onNew, speech, speaking, onSpeak }: StripProps) {
  if (phase === 'review') {
    return (
      <div className="wp-strip wp-strip--review">
        <p>
          <strong>Find your mistakes first:</strong> {mascot} marked {lines} {lines === 1 ? 'line' : 'lines'}.{' '}
          <span className="wp-strip-time tabular">Underlines in {secondsLeft} s.</span>
        </p>
        <div className="wp-strip-tools">
          {speech && (
            <Button variant="ghost" size="sm" onClick={onSpeak} aria-pressed={speaking}>
              {speaking ? 'Stop reading' : 'Read it to me'}
            </Button>
          )}
          <Button variant="subtle" size="sm" onClick={onReveal}>
            Reveal now
          </Button>
        </div>
      </div>
    )
  }
  if (phase === 'revealed' && found && found.total > 0) {
    return (
      <div className="wp-strip">
        <p>
          You found {found.found} of {found.total} yourself.{left > 0 ? ` ${left} left to look at.` : ' All sorted.'}
        </p>
      </div>
    )
  }
  if (resumedAt && phase === 'writing') {
    return (
      <div className="wp-strip">
        <p>Picked up your draft, last edited {draftWhen(resumedAt)}.</p>
        <div className="wp-strip-tools">
          <Button variant="ghost" size="sm" onClick={onNew}>
            Start a new one
          </Button>
        </div>
      </div>
    )
  }
  return null
}
