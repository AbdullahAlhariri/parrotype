import { personaName } from '@/lib/audio'
import { LANG_TAGS, type Lang } from '@/types'
import type { DictationVoice } from './useVoice'

/**
 * The compact voice picker on the dictation page: Mix (every recorded voice takes turns),
 * one recorded voice, or the browser's own voice. Writes settings.voices[lang], same as Settings.
 */
export function VoiceMenu({ lang, voice }: { lang: Lang; voice: DictationVoice }) {
  const { personas, pref, browser, setPref } = voice
  if (!personas.length) return null
  const value =
    pref.kind === 'browser' ? 'browser' : pref.kind === 'gemini' && personas.some((p) => p.id === pref.id) ? `gemini:${pref.id}` : 'mix'
  const withBrowser = browser === 'ready' || pref.kind === 'browser'

  const change = (v: string) => {
    if (v === 'mix') setPref({ kind: 'mix' })
    else if (v === 'browser') setPref({ kind: 'browser', name: pref.kind === 'browser' ? pref.name : '' })
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
          {withBrowser && <option value="browser">Browser voice</option>}
        </select>
        <svg width="10" height="7" viewBox="0 0 12 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M1.5 1.5 6 6l4.5-4.5" />
        </svg>
      </span>
    </label>
  )
}
