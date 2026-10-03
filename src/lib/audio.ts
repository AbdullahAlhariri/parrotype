import type { Lang } from '@/types'
import { getSettings } from '@/state/settings'
import { hashString } from '@/lib/random'

/**
 * Pre-recorded voices (Gemini TTS, see scripts/tts). public/audio/manifest.json lists which
 * dictation sentences have clips in which voices; anything missing falls back to browser speech.
 */

export interface VoiceInfo {
  id: string
  name: string
  blurb: string
  mascot?: boolean
}

export interface AudioManifest {
  version: number
  mascot: Record<Lang, string>
  voices: Record<Lang, VoiceInfo[]>
  reactions: Record<Lang, string[]>
  clips: Record<Lang, Record<string, string[]>>
}

export type ReactionId = 'hello' | 'record' | 'perfect' | 'again' | 'streak' | 'done'

let manifestPromise: Promise<AudioManifest | null> | null = null
let manifest: AudioManifest | null = null

/** Loads the manifest once; resolves to null when it is missing (dev without audio, offline). */
export function loadManifest(): Promise<AudioManifest | null> {
  manifestPromise ??= fetch('/audio/manifest.json')
    .then((r) => (r.ok ? (r.json() as Promise<AudioManifest>) : null))
    .catch(() => null)
    .then((m) => (manifest = m))
  return manifestPromise
}

/** Synchronous view of the manifest (null until loadManifest resolved). */
export const getManifest = () => manifest

export const recordedVoices = (lang: Lang): VoiceInfo[] => manifest?.voices[lang] ?? []

export const hasClip = (lang: Lang, sentenceId: string) => (manifest?.clips[lang]?.[sentenceId]?.length ?? 0) > 0

/**
 * How the user wants dictation voiced, from settings.voices[lang]:
 * 'mix' / undefined = rotate recorded voices, 'gemini:<id>' = one recorded voice,
 * 'browser:<name>' or a legacy plain name = the browser's own speech.
 */
export type VoicePreference = { kind: 'mix' } | { kind: 'gemini'; id: string } | { kind: 'browser'; name: string }

export function voicePreference(lang: Lang): VoicePreference {
  const v = getSettings().voices[lang]
  if (!v || v === 'mix') return { kind: 'mix' }
  if (v.startsWith('gemini:')) return { kind: 'gemini', id: v.slice(7) }
  if (v.startsWith('browser:')) return { kind: 'browser', name: v.slice(8) }
  return { kind: 'browser', name: v }
}

const session = Math.floor(Math.random() * 1e6)

/**
 * The recorded voice to use for a sentence, or null when browser speech should be used.
 * 'mix' picks deterministically per sentence and page session, so replays keep the same voice.
 */
export function pickPersona(lang: Lang, sentenceId: string, pref: VoicePreference = voicePreference(lang)): string | null {
  if (pref.kind === 'browser') return null
  const available = manifest?.clips[lang]?.[sentenceId] ?? []
  if (!available.length) return null
  if (pref.kind === 'gemini' && available.includes(pref.id)) return pref.id
  return available[hashString(`${session}:${sentenceId}`) % available.length]
}

export const clipUrl = (lang: Lang, persona: string, sentenceId: string) => `/audio/${lang}/${persona}/${sentenceId}.mp3`

let player: HTMLAudioElement | null = null
let busyUntilEnded = false

export interface Playback {
  stop: () => void
  ended: Promise<void>
}

function play(url: string, rate = 1): Playback {
  player ??= new Audio()
  const a = player
  a.pause()
  a.src = url
  a.playbackRate = rate
  a.preservesPitch = true
  const ended = new Promise<void>((resolve) => {
    const done = () => {
      a.removeEventListener('ended', done)
      a.removeEventListener('error', done)
      a.removeEventListener('pause', done)
      busyUntilEnded = false
      resolve()
    }
    a.addEventListener('ended', done)
    a.addEventListener('error', done)
    a.addEventListener('pause', done)
  })
  busyUntilEnded = true
  void a.play().catch(() => a.dispatchEvent(new Event('error')))
  return { stop: () => a.pause(), ended }
}

/** Plays one dictation clip. rate 0.7 is slow mode (pitch is preserved). */
export function playClip(opts: { lang: Lang; sentenceId: string; persona: string; rate?: number }): Playback {
  return play(clipUrl(opts.lang, opts.persona, opts.sentenceId), opts.rate ?? 1)
}

/** Warms the browser cache for the next sentence's clip. */
export function preloadClip(lang: Lang, persona: string, sentenceId: string) {
  const link = document.createElement('link')
  link.rel = 'prefetch'
  link.href = clipUrl(lang, persona, sentenceId)
  document.head.appendChild(link)
}

/** A short recorded line from the mascot, for rare moments only. Silent when the setting is off or audio is busy. */
export function playReaction(lang: Lang, id: ReactionId): void {
  if (!getSettings().mascotVoice || busyUntilEnded) return
  void loadManifest().then((m) => {
    if (!m?.reactions[lang]?.includes(id)) return
    play(`/audio/${lang}/reactions/${id}.mp3`)
  })
}
