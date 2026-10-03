import './fonts.css'

/**
 * The three curated typing fonts. Typing surfaces use
 *   font-family: var(--font-typing, var(--font-mono))
 * and the shell writes --font-typing on :root from the user's choice (see fontStore.ts).
 * Noto Naskh Arabic sits in every stack so Arabic practice text renders in a real Naskh.
 */

export type TypingFontId = 'recursive' | 'atkinson' | 'plex'

export interface TypingFont {
  id: TypingFontId
  name: string
  family: string
  /** one plain line for the settings page */
  note: string
}

const TAIL = `'Noto Naskh Arabic', ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace`

export const TYPING_FONTS: TypingFont[] = [
  {
    id: 'recursive',
    name: 'Recursive Mono',
    family: `'Recursive Mono Linear', ${TAIL}`,
    note: 'The default. Even and calm, drawn from sign painting.',
  },
  {
    id: 'atkinson',
    name: 'Atkinson Hyperlegible Mono',
    family: `'Atkinson Hyperlegible Mono', ${TAIL}`,
    note: 'Made by the Braille Institute so that l, 1 and I never look alike.',
  },
  {
    id: 'plex',
    name: 'IBM Plex Mono',
    family: `'IBM Plex Mono', ${TAIL}`,
    note: 'A little warmer and a little wider.',
  },
]

export const DEFAULT_TYPING_FONT: TypingFontId = 'recursive'

export const getTypingFont = (id: string): TypingFont => TYPING_FONTS.find((f) => f.id === id) ?? TYPING_FONTS[0]

export function applyTypingFont(id: string) {
  if (typeof document === 'undefined') return
  const font = getTypingFont(id)
  document.documentElement.style.setProperty('--font-typing', font.family)
  document.documentElement.dataset.font = font.id
}
