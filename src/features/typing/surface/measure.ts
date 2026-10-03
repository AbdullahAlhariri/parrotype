import type { WordView } from '@/engine'
import type { CaretBox } from './caret'
import { buildRuns } from './arabicRuns'

export type CaretStyle = 'line' | 'block' | 'underline'

/** Characters the bidi algorithm lays out left to right even inside Arabic text: digits and Latin letters. */
export const isLtrChar = (c: string) => /^[\p{Nd}\p{Script=Latin}]/u.test(c)

/**
 * Where the caret goes for `charIndex` inside the active word, in px relative to the track
 * (the caret's offset parent). LTR reads offsets of per-letter spans (no layout thrash: one
 * forced layout per keystroke). RTL measures a Range inside the run's text node, because
 * Arabic letters are not separate elements.
 */
export function measureCaret(
  track: HTMLElement,
  word: HTMLElement,
  view: WordView,
  charIndex: number,
  rtl: boolean,
  caretEl: HTMLElement,
  style: CaretStyle,
  /** a letter rendered as incorrect (stop on error), so the runs match the rendered ones */
  blockedAt = -1,
): CaretBox | null {
  const cw = caretEl.offsetWidth
  const ch = caretEl.offsetHeight
  const top = word.offsetTop
  const h = word.offsetHeight
  const em = parseFloat(getComputedStyle(caretEl).fontSize) || 16

  let x: number
  let w: number
  if (rtl) {
    const n = view.letters.length
    if (!n) return null
    const { slots } = buildRuns(
      view.letters.map((l) => l.char),
      view.letters.map((l, i) => (i === blockedAt ? 'incorrect' : l.state)),
    )
    const after = charIndex >= n
    const slot = slots[after ? n - 1 : charIndex]
    const span = word.children[slot.run] as HTMLElement | undefined
    const node = span?.firstChild
    if (!span || !node) return null
    const range = document.createRange()
    range.setStart(node, slot.start)
    range.setEnd(node, slot.end)
    let rect = range.getBoundingClientRect()
    if (!rect.width && !rect.height) rect = span.getBoundingClientRect()
    const base = track.getBoundingClientRect().left
    w = rect.width || em * 0.5
    // an Arabic letter starts at its right edge; digits (numbers mode) run left to right inside the line
    const ltr = isLtrChar(view.letters[after ? n - 1 : charIndex].char)
    if (style === 'line') x = (after ? (ltr ? rect.right : rect.left) : ltr ? rect.left : rect.right) - base - cw / 2
    else x = (after ? (ltr ? rect.right : rect.left - w) : rect.left) - base
  } else {
    const letters = word.children
    const n = letters.length
    if (!n) return null
    const after = charIndex >= n
    const l = letters[after ? n - 1 : charIndex] as HTMLElement
    w = l.offsetWidth
    x = word.offsetLeft + l.offsetLeft + (after ? w : 0)
    if (style === 'line') x -= cw / 2
  }

  const y = style === 'underline' ? top + h / 2 + em * 0.52 : top + (h - ch) / 2
  return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, w: Math.round(w * 10) / 10 }
}
