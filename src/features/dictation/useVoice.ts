import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  hasRecordings,
  parseVoiceSetting,
  personaInfo,
  pickPersona,
  playClip,
  preferredBrowserVoice,
  preloadClip,
  reactionAvailable,
  sayReaction,
  stopAudio,
  useAudioManifest,
  voiceSetting,
  type VoiceInfo,
  type VoicePreference,
} from '@/lib/audio'
import { loadVoices, pickVoice, speak, speechSupported, stopSpeaking, voicesFor } from '@/lib/speech'
import { getSettings, useSettings } from '@/state/settings'
import type { Lang } from '@/types'

export type VoiceStatus = 'loading' | 'ready' | 'none' | 'unsupported'

/** Who reads a sentence: a recorded persona, or the browser's own speech. */
export type VoiceSource = { kind: 'clip'; persona: VoiceInfo } | { kind: 'browser'; voiceName?: string }

export interface DictationVoice {
  /** can sentences be read aloud at all (recordings or a browser voice) */
  status: VoiceStatus
  /** the browser's own speech for this language; word by word needs it */
  browser: VoiceStatus
  /** name of the browser voice that would speak, when known */
  browserVoiceName?: string
  /** recorded voices of this language (empty without recordings) */
  personas: VoiceInfo[]
  pref: VoicePreference
  setPref: (p: VoicePreference) => void
  speaking: boolean
  /** what is playing right now (null when quiet) */
  current: VoiceSource | null
  /** the mascot's hello is playing (space skips it) */
  greeting: boolean
  /** clip id whose recording failed with no browser voice to stand in (show it on screen instead) */
  failed: string | null
  /** word by word works (it needs browser speech) */
  canWords: boolean
  /** who would read this clip id; null when nobody can (memory mode for that sentence) */
  sourceFor: (clipId: string) => VoiceSource | null
  /** read a sentence; returns who reads it, null when nobody can */
  say: (clipId: string, text: string, slow?: boolean) => VoiceSource | null
  /** one word at a time with the browser voice (a slow reading without one) */
  sayWords: (clipId: string, text: string) => void
  /** the mascot's recorded hello, once per page load and language; resolves false if interrupted */
  greet: () => Promise<boolean>
  preload: (clipId: string) => void
  stop: () => void
}

const SLOW = 0.7
const WORD_RATE = 0.85
const WORD_GAP_MS = 260
const GREET_LIMIT_MS = 7000

const greeted = new Set<Lang>()

/**
 * The dictation voice for one language. Recorded Gemini voices first (public/audio, see
 * src/lib/audio.ts); sentences without a clip, and word by word, use browser speech, with a
 * watchdog because Chrome sometimes never fires `end`.
 */
export function useDictationVoice(lang: Lang): DictationVoice {
  const rate = useSettings((s) => s.speechRate)
  const setting = useSettings((s) => s.voices[lang])
  const { manifest, loaded } = useAudioManifest()
  const pref = useMemo(() => parseVoiceSetting(setting), [setting])
  const browserName = preferredBrowserVoice(pref)

  const [browser, setBrowser] = useState<VoiceStatus>(() => (speechSupported() ? 'loading' : 'unsupported'))
  const [browserVoiceName, setBrowserVoiceName] = useState<string>()
  const [speaking, setSpeaking] = useState(false)
  const [current, setCurrent] = useState<VoiceSource | null>(null)
  const [greeting, setGreeting] = useState(false)
  const [failed, setFailed] = useState<string | null>(null)
  const cancelRef = useRef<() => void>(() => {})
  const timers = useRef<number[]>([])
  const run = useRef(0)

  useEffect(() => {
    if (!speechSupported()) return
    let alive = true
    const update = (all: SpeechSynthesisVoice[]) => {
      if (!alive) return
      const list = voicesFor(lang, all).filter((v) => !/undefined/.test(v.name))
      setBrowser(list.length ? 'ready' : 'none')
      setBrowserVoiceName(list.length ? pickVoice(lang, browserName)?.name : undefined)
    }
    setBrowser('loading')
    loadVoices(2500).then(update)
    // Edge adds its natural voices after a while; Safari after installs
    const onChange = () => update(speechSynthesis.getVoices())
    speechSynthesis.addEventListener?.('voiceschanged', onChange)
    return () => {
      alive = false
      speechSynthesis.removeEventListener?.('voiceschanged', onChange)
    }
  }, [lang, browserName])

  const noBrowser = browser === 'none' || browser === 'unsupported'
  // manifest is a dependency because hasRecordings reads it
  const recorded = useMemo(() => !!manifest && hasRecordings(lang), [manifest, lang])
  // a browser voice was chosen but this browser has none: the recordings are the better fallback
  const effective = useMemo<VoicePreference>(() => (pref.kind === 'browser' && noBrowser ? { kind: 'mix' } : pref), [pref, noBrowser])
  const usesRecordings = recorded && effective.kind !== 'browser'
  const status: VoiceStatus = !loaded
    ? effective.kind === 'browser' && browser === 'ready'
      ? 'ready'
      : 'loading'
    : usesRecordings
      ? 'ready'
      : browser
  const personas = useMemo(() => manifest?.voices[lang] ?? [], [manifest, lang])

  const sourceFor = useCallback(
    (clipId: string): VoiceSource | null => {
      const id = manifest ? pickPersona(lang, clipId, effective) : null
      const persona = id ? personaInfo(lang, id) : undefined
      if (persona) return { kind: 'clip', persona }
      if (browser === 'ready' || browser === 'loading') return { kind: 'browser', voiceName: browserVoiceName }
      return null
    },
    [lang, effective, browser, browserVoiceName, manifest],
  )

  const clearTimers = () => {
    timers.current.forEach((t) => clearTimeout(t))
    timers.current = []
  }

  const stop = useCallback(() => {
    run.current++
    clearTimers()
    cancelRef.current()
    cancelRef.current = () => {}
    stopAudio()
    setSpeaking(false)
    setCurrent(null)
    setGreeting(false)
  }, [])

  /** speak one chunk with the browser, resolve when it ends (or the watchdog gives up) */
  const speakOne = useCallback(
    (text: string, r: number, id: number) =>
      new Promise<void>((resolve) => {
        let done = false
        const finish = () => {
          if (done) return
          done = true
          resolve()
        }
        cancelRef.current = speak(text, lang, { rate: r, voiceName: browserName, onEnd: finish })
        // hard limit: about 3x a slow reading, so a stuck engine never leaves the parrot talking forever
        timers.current.push(window.setTimeout(finish, 2500 + (text.length * 160) / r))
        // soft check: the engine says it stopped, but `end` never came
        let quiet = 0
        const poll = () => {
          if (done || id !== run.current) return
          const s = window.speechSynthesis
          if (typeof s?.speaking === 'boolean' && !s.speaking && !s.pending) quiet++
          else quiet = 0
          if (quiet >= 3) finish()
          else timers.current.push(window.setTimeout(poll, 300))
        }
        timers.current.push(window.setTimeout(poll, 900))
      }),
    [lang, browserName],
  )

  const speakBrowser = useCallback(
    (text: string, r: number, id: number) => {
      setCurrent({ kind: 'browser', voiceName: browserVoiceName })
      setSpeaking(true)
      speakOne(text, r, id).then(() => {
        if (id !== run.current) return
        setSpeaking(false)
        setCurrent(null)
      })
    },
    [speakOne, browserVoiceName],
  )

  const say = useCallback(
    (clipId: string, text: string, slow = false): VoiceSource | null => {
      const src = sourceFor(clipId)
      stop()
      if (!src) return null
      setFailed(null)
      const id = run.current
      const browserRate = slow ? Math.min(SLOW, rate) : rate
      if (src.kind === 'browser') {
        speakBrowser(text, browserRate, id)
        return src
      }
      const playFrom = (from: Extract<VoiceSource, { kind: 'clip' }>, tries: number) => {
        setCurrent(from)
        setSpeaking(true)
        const pb = playClip({ lang, sentenceId: clipId, persona: from.persona.id, rate: slow ? SLOW : 1 })
        cancelRef.current = pb.stop
        pb.outcome.then((o) => {
          if (id !== run.current) return
          if (o === 'error') {
            // a missing file: another recorded voice, else the browser voice, else on screen
            const next = sourceFor(clipId)
            if (next?.kind === 'clip' && next.persona.id !== from.persona.id && tries < 3) return playFrom(next, tries + 1)
            if (browser === 'ready') return speakBrowser(text, browserRate, id)
            setFailed(clipId)
          }
          setSpeaking(false)
          setCurrent(null)
        })
      }
      playFrom(src, 1)
      return src
    },
    [sourceFor, stop, rate, speakBrowser, lang, browser],
  )

  const canWords = browser === 'ready'

  const sayWords = useCallback(
    (clipId: string, text: string) => {
      if (!canWords) {
        say(clipId, text, true)
        return
      }
      stop()
      const id = run.current
      const words = text.split(/\s+/).filter(Boolean)
      setCurrent({ kind: 'browser', voiceName: browserVoiceName })
      setSpeaking(true)
      const next = async () => {
        for (const w of words) {
          if (id !== run.current) return
          await speakOne(w, Math.min(rate, WORD_RATE), id)
          await new Promise((r) => timers.current.push(window.setTimeout(r, WORD_GAP_MS)))
        }
        if (id !== run.current) return
        setSpeaking(false)
        setCurrent(null)
      }
      void next()
    },
    [canWords, say, stop, browserVoiceName, speakOne, rate],
  )

  const greet = useCallback(async (): Promise<boolean> => {
    if (greeted.has(lang) || !reactionAvailable(lang, 'hello')) return true
    greeted.add(lang)
    stop()
    const id = run.current
    const mascot = personas.find((p) => p.mascot)
    if (mascot) setCurrent({ kind: 'clip', persona: mascot })
    setSpeaking(true)
    setGreeting(true)
    let limit = 0
    await Promise.race([sayReaction(lang, 'hello'), new Promise((r) => (limit = window.setTimeout(r, GREET_LIMIT_MS)))])
    clearTimeout(limit)
    if (id !== run.current) return false
    stopAudio()
    setSpeaking(false)
    setCurrent(null)
    setGreeting(false)
    return true
  }, [lang, personas, stop])

  const preload = useCallback(
    (clipId: string) => {
      const src = sourceFor(clipId)
      if (src?.kind === 'clip') preloadClip(lang, src.persona.id, clipId)
    },
    [sourceFor, lang],
  )

  const setPref = useCallback(
    (p: VoicePreference) => {
      const s = getSettings()
      s.set('voices', { ...s.voices, [lang]: voiceSetting(p) })
    },
    [lang],
  )

  // a new language or voice: whatever was playing belongs to the old one
  useEffect(() => () => stop(), [lang, setting, stop])

  useEffect(
    () => () => {
      run.current++
      timers.current.forEach((t) => clearTimeout(t))
      stopSpeaking()
      stopAudio()
    },
    [],
  )

  return {
    status,
    browser,
    browserVoiceName,
    personas,
    pref,
    setPref,
    speaking,
    current,
    greeting,
    failed,
    canWords,
    sourceFor,
    say,
    sayWords,
    greet,
    preload,
    stop,
  }
}
