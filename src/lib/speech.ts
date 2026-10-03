import type { Lang } from '@/types'
import { LANG_TAGS } from '@/types'

/**
 * Thin wrapper around the Web Speech API (speechSynthesis) for dictation.
 * Voices load asynchronously and differ per browser, so everything here is defensive.
 */

export const speechSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window

let voicesCache: SpeechSynthesisVoice[] = []

/** Resolves once the browser has populated its voice list (or after a short timeout). */
export function loadVoices(timeoutMs = 1500): Promise<SpeechSynthesisVoice[]> {
  if (!speechSupported()) return Promise.resolve([])
  const now = speechSynthesis.getVoices()
  if (now.length) {
    voicesCache = now
    return Promise.resolve(now)
  }
  return new Promise((resolve) => {
    const done = () => {
      voicesCache = speechSynthesis.getVoices()
      resolve(voicesCache)
    }
    speechSynthesis.addEventListener('voiceschanged', done, { once: true })
    setTimeout(done, timeoutMs)
  })
}

/** Voices that speak the language, best first. */
export function voicesFor(lang: Lang, voices: SpeechSynthesisVoice[] = voicesCache): SpeechSynthesisVoice[] {
  const prefix = lang.toLowerCase()
  const tag = LANG_TAGS[lang].toLowerCase()
  return voices
    .filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith(prefix))
    .sort((a, b) => scoreVoice(b, tag) - scoreVoice(a, tag))
}

function scoreVoice(v: SpeechSynthesisVoice, tag: string) {
  const name = v.name.toLowerCase()
  let s = 0
  if (v.lang.toLowerCase().replace('_', '-') === tag) s += 4 // nl-NL over nl-BE, en-US over en-IN
  if (/natural|neural|online/.test(name)) s += 6 // Edge's Microsoft Natural voices
  if (/premium|enhanced|siri/.test(name)) s += 5 // Apple downloadable voices
  if (name.includes('google')) s += 4
  if (v.localService) s += 1 // works offline
  if (/compact|espeak/.test(name)) s -= 4
  return s
}

export function pickVoice(lang: Lang, preferredName?: string): SpeechSynthesisVoice | undefined {
  const list = voicesFor(lang)
  if (preferredName) {
    const hit = list.find((v) => v.name === preferredName)
    if (hit) return hit
  }
  return list[0]
}

export interface SpeakOptions {
  rate?: number
  voiceName?: string
  onStart?: () => void
  onEnd?: () => void
  /** char index of the word being spoken (not all voices fire boundary events) */
  onBoundary?: (charIndex: number) => void
}

/**
 * Speak text. Long text is split into sentence chunks, because Chrome silently
 * stops utterances after ~15 seconds. Returns a function that cancels speech.
 */
export function speak(text: string, lang: Lang, opts: SpeakOptions = {}): () => void {
  if (!speechSupported()) {
    opts.onEnd?.()
    return () => {}
  }
  speechSynthesis.cancel()
  const voice = pickVoice(lang, opts.voiceName)
  const chunks = chunkText(text)
  let cancelled = false
  let offset = 0
  chunks.forEach((chunk, i) => {
    const u = new SpeechSynthesisUtterance(chunk)
    u.lang = voice?.lang ?? LANG_TAGS[lang]
    if (voice) u.voice = voice
    u.rate = opts.rate ?? 0.9
    const base = offset
    offset += chunk.length + 1
    if (i === 0) u.onstart = () => opts.onStart?.()
    u.onboundary = (e) => opts.onBoundary?.(base + e.charIndex)
    if (i === chunks.length - 1) {
      u.onend = () => !cancelled && opts.onEnd?.()
      u.onerror = () => !cancelled && opts.onEnd?.()
    }
    speechSynthesis.speak(u)
  })
  return () => {
    cancelled = true
    speechSynthesis.cancel()
  }
}

export function stopSpeaking() {
  if (speechSupported()) speechSynthesis.cancel()
}

function chunkText(text: string, max = 180): string[] {
  const sentences = text.match(/[^.!?؟]+[.!?؟]*\s*/g) ?? [text]
  const out: string[] = []
  let cur = ''
  for (const s of sentences) {
    if ((cur + s).length > max && cur) {
      out.push(cur.trim())
      cur = ''
    }
    cur += s
  }
  if (cur.trim()) out.push(cur.trim())
  return out
}
