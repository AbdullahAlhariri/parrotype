import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Lang } from '@/types'

export type ThemeId = string

export interface Settings {
  /** practice language */
  lang: Lang
  theme: ThemeId
  /** typing text size in rem */
  fontSize: number
  caretStyle: 'line' | 'block' | 'underline'
  smoothCaret: boolean
  /** hide the chrome while typing */
  focusMode: boolean
  /** keystroke sounds */
  sound: boolean
  /** block moving on until the current letter is right */
  stopOnError: boolean
  /** show the on-screen keyboard (helps with Arabic) */
  showKeyboard: boolean
  /** language of explanations for grammar rules */
  explainIn: 'en' | 'local'
  /** speech rate for dictation, 0.5 - 1.5 */
  speechRate: number
  /**
   * Dictation voice per language: 'mix' (rotate the recorded Gemini voices, default),
   * 'gemini:<personaId>' for one recorded voice, or 'browser:<voice name>' for the browser's own speech.
   */
  voices: Partial<Record<Lang, string>>
  /** the mascot (Kees / Monty / Fustuq) says short recorded lines at rare moments */
  mascotVoice: boolean
  /** opt-in: send free-writing text to LanguageTool for deeper checks */
  languageTool: boolean
  languageToolUrl: string
  /** English variant for spelling */
  englishVariant: 'en-US' | 'en-GB'
  /** first visit onboarding done */
  onboarded: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  lang: 'nl',
  theme: 'kea-dark',
  fontSize: 1.75,
  caretStyle: 'line',
  smoothCaret: true,
  focusMode: true,
  sound: false,
  stopOnError: false,
  showKeyboard: false,
  explainIn: 'en',
  speechRate: 0.9,
  voices: {},
  mascotVoice: true,
  languageTool: false,
  languageToolUrl: 'https://api.languagetool.org/v2/check',
  englishVariant: 'en-US',
  onboarded: false,
}

interface SettingsStore extends Settings {
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  patch: (p: Partial<Settings>) => void
  reset: () => void
}

export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      set: (key, value) => set({ [key]: value } as Partial<Settings>),
      patch: (p) => set(p),
      reset: () => set(DEFAULT_SETTINGS),
    }),
    { name: 'parrotype.settings', version: 1 },
  ),
)

/** Non-react access, e.g. inside event handlers or plain modules. */
export const getSettings = () => useSettings.getState()
