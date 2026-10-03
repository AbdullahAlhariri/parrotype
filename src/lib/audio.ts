import { useEffect, useSyncExternalStore } from 'react'
import { LANGS, type Lang } from '@/types'
import { getSettings } from '@/state/settings'
import { hashString } from '@/lib/random'
import { mascotName } from '@/lib/mascot'

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

const REACTION_IDS: readonly string[] = ['hello', 'record', 'perfect', 'again', 'streak', 'done']

export const MANIFEST_URL = '/audio/manifest.json'

/* ------------------------------------------------------------------ */
/* Manifest                                                            */
/* ------------------------------------------------------------------ */

// ids end up in URL paths, so only plain ids get through
const SAFE_ID = /^[\w-]{1,80}$/

const record = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {})
const ids = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && SAFE_ID.test(x)) : [])

/**
 * Checks the manifest JSON and keeps only what the app can use: known languages, voices with an
 * id and a name, clips of voices that are listed. Returns null for anything that is not a manifest.
 */
export function parseManifest(raw: unknown): AudioManifest | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const m = raw as Record<string, unknown>
  const out: AudioManifest = {
    version: typeof m.version === 'number' ? m.version : 1,
    mascot: { nl: '', en: '', ar: '' },
    voices: { nl: [], en: [], ar: [] },
    reactions: { nl: [], en: [], ar: [] },
    clips: { nl: {}, en: {}, ar: {} },
  }
  for (const lang of LANGS) {
    const list = record(m.voices)[lang]
    const voices: VoiceInfo[] = []
    for (const v of Array.isArray(list) ? list : []) {
      const r = record(v)
      if (typeof r.id !== 'string' || !SAFE_ID.test(r.id) || typeof r.name !== 'string' || !r.name.trim()) continue
      if (voices.some((x) => x.id === r.id)) continue
      voices.push({ id: r.id, name: r.name, blurb: typeof r.blurb === 'string' ? r.blurb : '', ...(r.mascot === true ? { mascot: true } : {}) })
    }
    out.voices[lang] = voices
    const known = new Set(voices.map((v) => v.id))
    out.reactions[lang] = ids(record(m.reactions)[lang]).filter((r) => REACTION_IDS.includes(r))
    for (const [sentence, personas] of Object.entries(record(record(m.clips)[lang]))) {
      if (!SAFE_ID.test(sentence)) continue
      const have = [...new Set(ids(personas).filter((p) => known.has(p)))]
      if (have.length) out.clips[lang][sentence] = have
    }
    const name = record(m.mascot)[lang]
    out.mascot[lang] = typeof name === 'string' ? name : (voices.find((v) => v.mascot)?.name ?? '')
  }
  return out
}

interface ManifestState {
  manifest: AudioManifest | null
  /** true once the fetch finished, whether or not there was a manifest */
  loaded: boolean
}

let manifestPromise: Promise<AudioManifest | null> | null = null
let state: ManifestState = { manifest: null, loaded: false }
const listeners = new Set<() => void>()

/** Loads the manifest once; resolves to null when it is missing (dev without audio, offline). */
export function loadManifest(): Promise<AudioManifest | null> {
  manifestPromise ??= (typeof fetch === 'function' ? fetch(MANIFEST_URL) : Promise.reject(new Error('no fetch')))
    .then((r) => (r.ok ? r.json() : null))
    .then(parseManifest)
    .catch(() => null)
    .then((m) => {
      state = { manifest: m, loaded: true }
      listeners.forEach((l) => l())
      return m
    })
  return manifestPromise
}

/** Synchronous view of the manifest (null until loadManifest resolved). */
export const getManifest = () => state.manifest

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}
const snapshot = () => state

/** The manifest for React: starts loading it and re-renders once it is there. */
export function useAudioManifest(): ManifestState {
  useEffect(() => {
    void loadManifest()
  }, [])
  return useSyncExternalStore(subscribe, snapshot, snapshot)
}

export const recordedVoices = (lang: Lang): VoiceInfo[] => state.manifest?.voices[lang] ?? []

export const hasClip = (lang: Lang, sentenceId: string) => (state.manifest?.clips[lang]?.[sentenceId]?.length ?? 0) > 0

/** True when at least one sentence of the language has a recording. */
export const hasRecordings = (lang: Lang) => Object.keys(state.manifest?.clips[lang] ?? {}).length > 0

export const personaInfo = (lang: Lang, id: string): VoiceInfo | undefined => recordedVoices(lang).find((v) => v.id === id)

/** The persona name for English UI copy: the mascot goes by his Latin-script name (Fustuq, not فستق). */
export const personaName = (lang: Lang, v: VoiceInfo) => (v.mascot ? mascotName(lang) : v.name)

/** The first sentence a persona has a clip for (for "Hear a sample"), or null. */
export function sampleClip(lang: Lang, persona: string): string | null {
  for (const [id, personas] of Object.entries(state.manifest?.clips[lang] ?? {})) if (personas.includes(persona)) return id
  return null
}

/* ------------------------------------------------------------------ */
/* Preference                                                          */
/* ------------------------------------------------------------------ */

/**
 * How the user wants dictation voiced, from settings.voices[lang]:
 * 'mix' / undefined = rotate recorded voices, 'gemini:<id>' = one recorded voice,
 * 'browser:<name>' or a legacy plain name = the browser's own speech ('browser:' = its best voice).
 */
export type VoicePreference = { kind: 'mix' } | { kind: 'gemini'; id: string } | { kind: 'browser'; name: string }

export function parseVoiceSetting(v: string | undefined): VoicePreference {
  if (!v || v === 'mix') return { kind: 'mix' }
  if (v.startsWith('gemini:')) return { kind: 'gemini', id: v.slice(7) }
  if (v.startsWith('browser:')) return { kind: 'browser', name: v.slice(8) }
  return { kind: 'browser', name: v }
}

export const voicePreference = (lang: Lang): VoicePreference => parseVoiceSetting(getSettings().voices[lang])

/** The settings value for a preference (inverse of parseVoiceSetting). */
export const voiceSetting = (p: VoicePreference): string => (p.kind === 'mix' ? 'mix' : p.kind === 'gemini' ? `gemini:${p.id}` : `browser:${p.name}`)

/**
 * The browser voice name to hand to speech.ts (speak/pickVoice) for a settings value:
 * the chosen voice for 'browser:<name>', undefined (= the best voice) for everything else.
 */
export const browserVoiceName = (v: string | undefined): string | undefined => {
  const p = parseVoiceSetting(v)
  return p.kind === 'browser' && p.name ? p.name : undefined
}

const pageSession = Math.floor(Math.random() * 1e6)

/**
 * The recorded voice to use for a sentence, or null when browser speech should be used.
 * 'mix' picks deterministically per sentence and page session, so replays keep the same voice;
 * a chosen voice without a clip for this sentence falls back to the mix.
 */
export function pickPersona(lang: Lang, sentenceId: string, pref: VoicePreference = voicePreference(lang)): string | null {
  if (pref.kind === 'browser') return null
  const available = state.manifest?.clips[lang]?.[sentenceId] ?? []
  if (!available.length) return null
  if (pref.kind === 'gemini' && available.includes(pref.id)) return pref.id
  return available[hashString(`${pageSession}:${sentenceId}`) % available.length]
}

/* ------------------------------------------------------------------ */
/* Playback                                                            */
/* ------------------------------------------------------------------ */

export const clipUrl = (lang: Lang, persona: string, sentenceId: string) => `/audio/${lang}/${persona}/${sentenceId}.mp3`
export const reactionUrl = (lang: Lang, id: ReactionId) => `/audio/${lang}/reactions/${id}.mp3`

export type PlaybackOutcome = 'ended' | 'stopped' | 'error'

export interface Playback {
  stop: () => void
  /** resolves when the clip ends, is stopped, or fails */
  ended: Promise<void>
  /** how it finished: on 'error' (missing file, offline, autoplay blocked) callers can fall back */
  outcome: Promise<PlaybackOutcome>
}

/** A clip that has not started after this long counts as failed (stalled network). */
const START_TIMEOUT_MS = 8000

// One element for everything: iOS only lets an element play without a fresh tap once it has
// played from a tap, so reusing it keeps "next sentence plays by itself" working there.
let player: HTMLAudioElement | null = null
let current: { finish: (o: PlaybackOutcome) => void } | null = null

/** True while a clip or reaction is playing (or loading to play). */
export const audioBusy = () => current !== null

/** Stops whatever recorded audio is playing. */
export function stopAudio() {
  current?.finish('stopped')
}

function play(url: string, rate = 1): Playback {
  current?.finish('stopped')
  if (typeof Audio === 'undefined') {
    const outcome = Promise.resolve<PlaybackOutcome>('error')
    return { stop: () => {}, ended: outcome.then(() => {}), outcome }
  }
  player ??= new Audio()
  const a = player
  let settle: (o: PlaybackOutcome) => void = () => {}
  const outcome = new Promise<PlaybackOutcome>((resolve) => (settle = resolve))
  let started = false
  let timer: ReturnType<typeof setTimeout> | undefined

  const onEnded = () => self.finish('ended')
  const onError = () => self.finish('error')
  const onPlaying = () => (started = true)
  // a pause we did not ask for (media keys, another tab taking over); the pause of the previous
  // clip arrives before this one plays, hence `started`
  const onPause = () => started && !a.ended && self.finish('stopped')

  const self = {
    finish(o: PlaybackOutcome) {
      if (current !== self) return
      current = null
      clearTimeout(timer)
      a.removeEventListener('ended', onEnded)
      a.removeEventListener('error', onError)
      a.removeEventListener('playing', onPlaying)
      a.removeEventListener('pause', onPause)
      if (o !== 'ended') a.pause()
      settle(o)
    },
  }
  current = self
  a.pause()
  a.addEventListener('ended', onEnded)
  a.addEventListener('error', onError)
  a.addEventListener('playing', onPlaying)
  a.addEventListener('pause', onPause)
  a.src = url
  // loading a new source resets playbackRate to defaultPlaybackRate, so set both after src
  a.defaultPlaybackRate = rate
  a.playbackRate = rate
  a.preservesPitch = true
  timer = setTimeout(() => !started && self.finish('error'), START_TIMEOUT_MS)
  a.play().catch(() => self.finish('error'))
  return { stop: () => self.finish('stopped'), ended: outcome.then(() => {}), outcome }
}

/** Plays one dictation clip. rate 0.7 is slow mode (pitch is preserved). */
export function playClip(opts: { lang: Lang; sentenceId: string; persona: string; rate?: number }): Playback {
  return play(clipUrl(opts.lang, opts.persona, opts.sentenceId), opts.rate ?? 1)
}

const prefetched = new Set<string>()

/** Warms the browser cache for the next sentence's clip. */
export function preloadClip(lang: Lang, persona: string, sentenceId: string) {
  if (typeof document === 'undefined') return
  const href = clipUrl(lang, persona, sentenceId)
  if (prefetched.has(href)) return
  prefetched.add(href)
  const link = document.createElement('link')
  link.rel = 'prefetch'
  link.href = href
  document.head.appendChild(link)
}

const speechBusy = () => typeof speechSynthesis !== 'undefined' && speechSynthesis.speaking

/**
 * A short recorded line from the mascot, for rare moments only. Resolves when it is over:
 * true if it played to the end. Silent (false) when the setting is off, the line does not
 * exist, or something else is already playing.
 */
export async function sayReaction(lang: Lang, id: ReactionId): Promise<boolean> {
  if (!getSettings().mascotVoice || audioBusy() || speechBusy()) return false
  const m = await loadManifest()
  if (!m?.reactions[lang]?.includes(id) || audioBusy() || speechBusy()) return false
  return (await play(reactionUrl(lang, id)).outcome) === 'ended'
}

/** Fire-and-forget version of sayReaction. */
export function playReaction(lang: Lang, id: ReactionId): void {
  void sayReaction(lang, id)
}
