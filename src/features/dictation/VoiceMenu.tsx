import { personaName, preferredBrowserVoice } from '@/lib/audio'
import { LANG_TAGS, type Lang } from '@/types'
import type { DictationVoice } from './useVoice'

/**
 * The compact voice picker on the dictation page: Mix (every recorded voice takes turns),
 * one recorded voice, or the browser's own voice. Writes settings.voices[lang], same as Settings.
 */
export function VoiceMenu({ lang, voice }: { lang: Lang; voice: DictationVoice }) {
  const { personas, pref, browser, setPref } = voice
  if (!personas.length) return null
  const hasBrowser = browser === 'ready' || browser === 'loading'
  // a browser voice chosen on a device without one: the recordings read, so the menu says Mix
  const value =
    pref.kind === 'browser' && hasBrowser
      ? 'browser'
      : pref.kind === 'gemini' && personas.some((p) => p.id === pref.id)
        ? `gemini:${pref.id}`
        : 'mix'
  // the browser voice picked in Settings stays: as the voice itself, or as the stand-in for
  // sentences without a recording when the recordings take turns
  const browserName = preferredBrowserVoice(pref)

  const change = (v: string) => {
    if (v === 'mix') setPref({ kind: 'mix', browser: browserName })
    else if (v === 'browser') setPref({ kind: 'browser', name: browserName ?? '' })
    else setPref({ kind: 'gemini', id: v.slice('gemini:'.length) })
  }

  return (
    <label className="dict-voice-menu">
      <span className="dict-voice-menu-label">voice</span>
      <span className="dict-voice-select">
        <select value={value} onChange={(e) => change(e.target.value)}>
          <option value="mix">Mix</option>
          {personas.map((p) => (
            <option key={p.id} value={`gemini:${p.id}`} lang={p.mascot ? undefined : LANG_TAGS[lang]}>
              {personaName(lang, p)}
            </option>
          ))}
          {(browser === 'ready' || value === 'browser') && <option value="browser">Browser voice</option>}
        </select>
        <svg width="10" height="7" viewBox="0 0 12 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M1.5 1.5 6 6l4.5-4.5" />
        </svg>
      </span>
    </label>
  )
}
