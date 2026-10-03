import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Look-and-feel preferences that live outside src/state/settings.ts.
 * - typing font, stored under 'parrotype.font'
 * - Kees liveliness, stored under 'parrotype.ui'
 * Both keys start with 'parrotype.' so data export/import picks them up.
 */

export type TypingFontChoice = 'recursive' | 'atkinson' | 'plex'

interface FontStore {
  font: TypingFontChoice
  setFont: (font: TypingFontChoice) => void
}

export const useTypingFont = create<FontStore>()(
  persist(
    (set) => ({
      font: 'recursive',
      setFont: (font) => set({ font }),
    }),
    { name: 'parrotype.font', version: 1 },
  ),
)

/** lively: blinks, fidgets, reacts. quiet: blinks only. hidden: Kees stays off screen. */
export type KeesLevel = 'lively' | 'quiet' | 'hidden'

interface UiStore {
  kees: KeesLevel
  setKees: (kees: KeesLevel) => void
}

export const useUiPrefs = create<UiStore>()(
  persist(
    (set) => ({
      kees: 'lively',
      setKees: (kees) => set({ kees }),
    }),
    { name: 'parrotype.ui', version: 1 },
  ),
)

export const getKeesLevel = (): KeesLevel => useUiPrefs.getState().kees
