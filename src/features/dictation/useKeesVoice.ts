import { useCallback, useEffect, useRef, useState } from 'react'
import { loadVoices, pickVoice, speak, speechSupported, stopSpeaking, voicesFor } from '@/lib/speech'
import { useSettings } from '@/state/settings'
import type { Lang } from '@/types'

export type VoiceStatus = 'loading' | 'ready' | 'none' | 'unsupported'

export interface KeesVoice {
  status: VoiceStatus
  /** name of the voice that will speak, when known */
  voiceName?: string
  speaking: boolean
  /** speak a sentence; `slow` uses rate 0.7 */
  say: (text: string, slow?: boolean) => void
  /** speak one word at a time with a short pause between words */
  sayWords: (text: string) => void
  stop: () => void
}

const SLOW = 0.7
const WORD_GAP_MS = 260

/**
 * Kees's voice for one language: voice detection, speaking state and a watchdog, because
 * Chrome sometimes never fires `end` (utterance garbage-collected, or a stuck queue).
 */
export function useKeesVoice(lang: Lang): KeesVoice {
  const rate = useSettings((s) => s.speechRate)
  const preferred = useSettings((s) => s.voices[lang])
  const [status, setStatus] = useState<VoiceStatus>(() => (speechSupported() ? 'loading' : 'unsupported'))
  const [voiceName, setVoiceName] = useState<string>()
  const [speaking, setSpeaking] = useState(false)
  const cancelRef = useRef<() => void>(() => {})
  const timers = useRef<number[]>([])
  const run = useRef(0)

  useEffect(() => {
    if (!speechSupported()) return
    let alive = true
    const update = (all: SpeechSynthesisVoice[]) => {
      if (!alive) return
      const list = voicesFor(lang, all).filter((v) => !/undefined/.test(v.name))
      setStatus(list.length ? 'ready' : 'none')
      setVoiceName(list.length ? pickVoice(lang, preferred)?.name : undefined)
    }
    setStatus('loading')
    loadVoices(2500).then(update)
    // Edge adds its natural voices later; Safari after installs
    const onChange = () => update(speechSynthesis.getVoices())
    speechSynthesis.addEventListener?.('voiceschanged', onChange)
    return () => {
      alive = false
      speechSynthesis.removeEventListener?.('voiceschanged', onChange)
    }
  }, [lang, preferred])

  const clearTimers = () => {
    timers.current.forEach((t) => clearTimeout(t))
    timers.current = []
  }

  const stop = useCallback(() => {
    run.current++
    clearTimers()
    cancelRef.current()
    cancelRef.current = () => {}
    setSpeaking(false)
  }, [])

  /** speak one chunk, resolve when it ends (or the watchdog gives up) */
  const speakOne = useCallback(
    (text: string, r: number, id: number) =>
      new Promise<void>((resolve) => {
        let done = false
        const finish = () => {
          if (done) return
          done = true
          resolve()
        }
        cancelRef.current = speak(text, lang, { rate: r, voiceName: preferred, onEnd: finish })
        // hard limit: about 3x a slow reading, so a stuck engine never leaves Kees talking forever
        const limit = window.setTimeout(finish, 2500 + (text.length * 160) / r)
        timers.current.push(limit)
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
    [lang, preferred],
  )

  const say = useCallback(
    (text: string, slow = false) => {
      stop()
      const id = run.current
      setSpeaking(true)
      speakOne(text, slow ? Math.min(SLOW, rate) : rate, id).then(() => {
        if (id === run.current) setSpeaking(false)
      })
    },
    [rate, speakOne, stop],
  )

  const sayWords = useCallback(
    (text: string) => {
      stop()
      const id = run.current
      const words = text.split(/\s+/).filter(Boolean)
      setSpeaking(true)
      const next = async () => {
        for (const w of words) {
          if (id !== run.current) return
          await speakOne(w, Math.min(rate, 0.85), id)
          await new Promise((r) => timers.current.push(window.setTimeout(r, WORD_GAP_MS)))
        }
        if (id === run.current) setSpeaking(false)
      }
      next()
    },
    [rate, speakOne, stop],
  )

  useEffect(
    () => () => {
      run.current++
      timers.current.forEach((t) => clearTimeout(t))
      stopSpeaking()
    },
    [],
  )

  return { status, voiceName, speaking, say, sayWords, stop }
}
