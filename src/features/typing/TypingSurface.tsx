import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { TypingSession, computeResult, type StopOnError } from '@/engine'
import { LANG_TAGS, isRtl, type Lang, type TypingResult } from '@/types'
import { useSettings } from '@/state/settings'
import { setTyping } from '@/lib/focus'
import { Icon } from '@/components/ui/Icon'
import { playKey, primeSound } from '@/lib/sound'
import { OnScreenKeyboard } from './OnScreenKeyboard'
import { Word } from './surface/Word'
import { Caret } from './surface/caret'
import { measureCaret } from './surface/measure'
import { attachInput } from './surface/input'
import { LiveStats } from './surface/LiveStats'
import './typing.css'

export interface TypingProgress {
  wordIndex: number
  total: number
  elapsedMs: number
  liveWpm: number
  liveAcc: number
}

export interface TypingSurfaceProps {
  words: string[]
  lang: Lang
  /** time mode: the run ends this long after the first key */
  timeLimitMs?: number
  /** called when fewer than 40 words are left ahead of the caret (time mode, endless drills) */
  onNeedMoreWords?: () => string[]
  onFinish: (result: TypingResult) => void
  /** Tab then Enter, or the restart button. Without it the surface restarts the same words. */
  onRestart?: () => void
  /** after every word and once a second while running (not per keystroke) */
  onProgress?: (p: TypingProgress) => void
  /** first keystroke of a run */
  onStart?: () => void
  /** defaults to settings.stopOnError; a boolean is accepted too (true = 'letter') */
  stopOnError?: StopOnError | boolean
  /** seconds left / words done and live accuracy above the text (default true) */
  showLiveStats?: boolean
  /** defaults to settings.showKeyboard, always on for Arabic */
  showKeyboard?: boolean
  autoFocus?: boolean
  /** change it to start over (same or new words) */
  resetKey?: string | number
  className?: string
  /** accessible name for the input, default "Typing practice" */
  label?: string
}

/** words rendered past the caret; the viewport only shows three lines anyway */
const AHEAD = 60
const BUFFER = 40
const GLIDE_MS = 100
const LINE_SCROLL_MS = 125

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

export function TypingSurface(props: TypingSurfaceProps) {
  const { words, lang, timeLimitMs, resetKey, showLiveStats = true, autoFocus = true, className = '' } = props
  const fontSize = useSettings((s) => s.fontSize)
  const caretStyle = useSettings((s) => s.caretStyle)
  const smoothCaret = useSettings((s) => s.smoothCaret)
  const settingsStop = useSettings((s) => s.stopOnError)
  const settingsKeyboard = useSettings((s) => s.showKeyboard)
  const soe = props.stopOnError ?? settingsStop
  const stopOnError: StopOnError = soe === true ? 'letter' : soe === false ? 'off' : soe
  const showKeyboard = props.showKeyboard ?? (settingsKeyboard || lang === 'ar')
  const rtl = isRtl(lang)
  const tag = LANG_TAGS[lang]

  // latest callbacks without re-binding listeners
  const cb = useRef(props)
  useLayoutEffect(() => {
    cb.current = props
  })

  const [restarts, setRestarts] = useState(0)
  const wordsKey = useMemo(() => words.join('\n'), [words])
  const session = useMemo(
    () => new TypingSession(words, { lang, stopOnError, timeLimitMs }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wordsKey, lang, stopOnError, timeLimitMs, resetKey, restarts],
  )
  const snap = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot)

  // first rendered word; lines above the caret's line get dropped (3-line window)
  const [win, setWin] = useState({ session, start: 0 })
  const start = win.session === session ? win.start : 0

  const [focused, setFocused] = useState(false)
  const [composing, setComposing] = useState<string | null>(null)
  const [caps, setCaps] = useState(false)
  const [layoutTick, setLayoutTick] = useState(0)

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const caretElRef = useRef<HTMLDivElement>(null)
  const caretRef = useRef<Caret | null>(null)
  const finishedRef = useRef(false)
  const scrollRef = useRef<Animation | null>(null)
  const doneScrollRef = useRef<Animation | null>(null)
  const descId = useId()

  const finish = useCallback(() => {
    if (finishedRef.current) return
    finishedRef.current = true
    setTyping(false)
    caretRef.current?.idle()
    cb.current.onFinish(computeResult(session))
  }, [session])

  const progress = useCallback(
    (now: number) => {
      cb.current.onProgress?.({
        wordIndex: session.getSnapshot().wordIndex,
        total: session.wordCount,
        elapsedMs: session.elapsed(now),
        liveWpm: session.liveWpm(now),
        liveAcc: session.liveAccuracy(),
      })
    },
    [session],
  )

  /** one key into the session */
  const feed = useCallback(
    (key: string | null, wholeWord = false) => {
      if (session.finished) return
      const now = performance.now()
      const wasStarted = session.started
      const ok = key === null ? (wholeWord ? session.deleteWord(now) : null) : session.input(key, now)
      if (!ok) return
      if (document.body.dataset.typing !== 'true') setTyping(true)
      if (!wasStarted) {
        primeSound()
        cb.current.onStart?.()
      }
      playKey(ok === true || ok.correct)
      caretRef.current?.typing()
      if (session.finished) finish()
    },
    [session, finish],
  )

  // caret controller lives as long as its element
  useLayoutEffect(() => {
    const el = caretElRef.current
    if (!el) return
    const c = new Caret(el)
    caretRef.current = c
    return () => {
      c.destroy()
      caretRef.current = null
    }
  }, [])

  // new run: reset bookkeeping, focus, leave focus mode
  useLayoutEffect(() => {
    finishedRef.current = false
    scrollRef.current?.cancel()
    scrollRef.current = null
    doneScrollRef.current = null
    caretRef.current?.reset()
    caretRef.current?.idle()
    setTyping(false)
    if (autoFocus) inputRef.current?.focus({ preventScroll: true })
  }, [session, autoFocus])

  useEffect(() => () => setTyping(false), [])

  // hidden textarea listeners
  useEffect(() => {
    const ta = inputRef.current
    if (!ta) return
    return attachInput(ta, {
      text: (data) => feed(data),
      backspace: (word) => (word ? feed(null, true) : feed('Backspace')),
      composing: setComposing,
      caps: setCaps,
    })
  }, [feed])

  // time limit + once-a-second progress
  useEffect(() => {
    if (!snap.started || snap.finished) return
    let lastSec = -1
    const id = window.setInterval(() => {
      const now = performance.now()
      if (session.tick(now)) {
        finish()
        return
      }
      const sec = Math.floor(session.elapsed(now) / 1000)
      if (sec !== lastSec) {
        lastSec = sec
        progress(now)
      }
    }, 100)
    return () => window.clearInterval(id)
  }, [session, snap.started, snap.finished, finish, progress])

  // keep a buffer of words ahead of the caret; report progress per word
  useEffect(() => {
    const more = cb.current.onNeedMoreWords
    if (more && !session.finished && session.wordCount - snap.wordIndex < BUFFER) {
      const extra = more()
      if (extra.length) session.addWords(extra)
    }
    if (snap.started) progress(performance.now())
  }, [session, snap.wordIndex, snap.started, progress])

  // re-measure on resize and when web fonts arrive (glyph widths change)
  useEffect(() => {
    const vp = viewportRef.current
    if (!vp) return
    const bump = () => setLayoutTick((n) => n + 1)
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(bump) : null
    ro?.observe(vp)
    const fonts = typeof document !== 'undefined' ? document.fonts : undefined
    let alive = true
    fonts?.ready.then(() => alive && bump())
    fonts?.addEventListener?.('loadingdone', bump)
    return () => {
      alive = false
      ro?.disconnect()
      fonts?.removeEventListener?.('loadingdone', bump)
    }
  }, [])

  // "click or press any key to focus"
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ta = inputRef.current
      if (!ta || document.activeElement === ta || e.defaultPrevented) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key.length !== 1 && e.key !== 'Dead') return
      const t = e.target as HTMLElement | null
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return
      if ((e.key === ' ' || e.key === 'Enter') && t?.closest('button, a, summary, [role="button"], [role="radio"]')) return
      if (document.querySelector('dialog[open], [aria-modal="true"]')) return
      ta.focus({ preventScroll: true })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // caret position + 3-line window, after every change, before paint
  useLayoutEffect(() => {
    const track = trackRef.current
    const caret = caretRef.current
    const caretEl = caretElRef.current
    if (!track || !caret || !caretEl) return
    if (doneScrollRef.current) {
      // the line scroll finished and its words are gone: drop the transform in the same frame
      doneScrollRef.current.cancel()
      doneScrollRef.current = null
    }
    const active = track.querySelector<HTMLElement>(`[data-wi="${snap.wordIndex}"]`)
    if (!active) {
      if (snap.wordIndex < start) setWin({ session, start: snap.wordIndex })
      else caret.hide()
      return
    }
    const motion = smoothCaret && !reducedMotion()
    const first = track.querySelector<HTMLElement>('.ts-w')
    const lineH = active.offsetHeight
    if (first && lineH > 0 && !scrollRef.current) {
      const line = Math.round((active.offsetTop - first.offsetTop) / lineH)
      if (line >= 2) {
        // the caret reached line 3: drop line 1 so the caret types on the middle line
        const targetTop = first.offsetTop + (line - 1) * lineH
        let next = start
        for (const el of track.querySelectorAll<HTMLElement>('.ts-w')) {
          if (el.offsetTop >= targetTop - 2) {
            next = Number(el.dataset.wi)
            break
          }
        }
        const commit = () => {
          caret.reset()
          setWin({ session, start: next })
        }
        if (motion) {
          const shift = targetTop - first.offsetTop
          const anim = track.animate([{ transform: 'translateY(0)' }, { transform: `translateY(${-shift}px)` }], {
            duration: LINE_SCROLL_MS,
            easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
            fill: 'forwards',
          })
          scrollRef.current = anim
          anim.onfinish = () => {
            if (scrollRef.current !== anim) return
            scrollRef.current = null
            doneScrollRef.current = anim
            commit()
          }
        } else {
          commit()
          return
        }
      }
    }
    const box = measureCaret(track, active, snap.words[snap.wordIndex], snap.charIndex, rtl, caretEl, caretStyle)
    if (box) caret.moveTo(box, motion ? GLIDE_MS : 0)
    else caret.hide()
  }, [snap, start, session, layoutTick, caretStyle, fontSize, rtl, smoothCaret])

  const restart = useCallback(() => {
    setTyping(false)
    if (cb.current.onRestart) cb.current.onRestart()
    else setRestarts((n) => n + 1)
    requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }))
  }, [])

  const focusInput = (e: React.MouseEvent) => {
    e.preventDefault()
    inputRef.current?.focus({ preventScroll: true })
  }

  const nextChar = useMemo(() => {
    if (!showKeyboard) return undefined
    const w = snap.words[snap.wordIndex]
    if (!w || snap.finished) return undefined
    const target = Array.from(w.target)
    const i = snap.charIndex
    if (i >= target.length) return ' '
    const c = target[i]
    if (c === 'ل' && 'اأإآ'.includes(target[i + 1] ?? '-')) return c + target[i + 1]
    return c
  }, [showKeyboard, snap.words, snap.wordIndex, snap.charIndex, snap.finished])

  const end = Math.min(snap.words.length, Math.max(start + AHEAD, snap.wordIndex + AHEAD))
  const items = []
  for (let i = start; i < end; i++) {
    const active = i === snap.wordIndex
    items.push(
      <Word
        key={i}
        view={snap.words[i]}
        index={i}
        rtl={rtl}
        active={active}
        composeAt={active && composing ? snap.charIndex : -1}
        composeLen={active && composing ? Array.from(composing).length : 0}
      />,
    )
  }

  const rootCls = [
    'ts-root',
    focused ? 'is-focused' : 'is-blurred',
    `ts-caret-${caretStyle}`,
    rtl ? 'is-rtl' : '',
    snap.started && !snap.finished ? 'is-running' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={rootCls} style={{ ['--ts-size' as string]: `${fontSize}rem` }}>
      <LiveStats
        session={session}
        started={snap.started}
        finished={snap.finished}
        wordIndex={snap.wordIndex}
        total={snap.words.length}
        timeLimitMs={timeLimitMs}
        show={showLiveStats}
        caps={caps}
      />
      <div className="ts-stage" onMouseDown={focusInput}>
        <div ref={viewportRef} className="ts-viewport mono-text" dir={rtl ? 'rtl' : 'ltr'} lang={tag} translate="no" aria-hidden="true">
          <div ref={trackRef} className="ts-track">
            {items}
            <div ref={caretElRef} className="ts-caret is-idle" />
          </div>
        </div>
        <p className="ts-blur-msg" aria-hidden="true">
          Click here or press any key to focus
        </p>
        <textarea
          ref={inputRef}
          className="ts-input"
          aria-label={props.label ?? 'Typing practice'}
          aria-describedby={descId}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          translate="no"
          data-gramm="false"
          data-gramm_editor="false"
          data-enable-grammarly="false"
          data-1p-ignore=""
          data-lpignore="true"
          dir={rtl ? 'rtl' : 'ltr'}
          lang={tag}
          rows={1}
          tabIndex={0}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </div>
      <p id={descId} className="sr-only" lang={tag}>
        {words.join(' ')}
      </p>
      <div className="ts-under">
        <button type="button" className="ts-restart" onClick={restart} aria-label="Restart" title="Restart (tab, then enter)">
          <Icon name="restart" />
        </button>
      </div>
      {showKeyboard && <OnScreenKeyboard lang={lang} next={nextChar} className="ts-keyboard" />}
    </div>
  )
}
