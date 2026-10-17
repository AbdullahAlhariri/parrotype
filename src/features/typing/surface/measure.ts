import type { WordView } from '@/engine'
import type { CaretBox } from './caret'
import { buildRuns } from './arabicRuns'

export type CaretStyle = 'line' | 'block' | 'underline'

/** Characters the bidi algorithm lays out left to right even inside Arabic text: digits and Latin letters. */
export const isLtrChar = (c: string) => /^[\p{Nd}\p{Script=Latin}]/u.test(c)

let ctx2d: CanvasRenderingContext2D | null | undefined
const overhangs = new Map<string, number>()

/**
 * How far the ink of right-to-left `text` reaches past the left end of its advance, in px. Naskh
 * draws the tails of a final ر, ت, ن or ي into the space after the word; a caret at the advance
 * edge would sit on that tail. 0 when canvas text metrics are not available.
 */
export function inkOverhangLeft(text: string, font: string): number {
  const key = `${font}|${text}`
  const known = overhangs.get(key)
  if (known !== undefined) return known
  if (ctx2d === undefined) {
    try {
      ctx2d = typeof document !== 'undefined' && !/jsdom/i.test(navigator.userAgent) ? document.createElement('canvas').getContext('2d') : null
    } catch {
      ctx2d = null
    }
  }
  let px = 0
  if (ctx2d) {
    ctx2d.font = font
    ctx2d.direction = 'rtl'
    ctx2d.textAlign = 'left'
    px = Math.max(0, ctx2d.measureText(text).actualBoundingBoxLeft || 0)
  }
  if (overhangs.size > 400) overhangs.clear()
  overhangs.set(key, px)
  return px
}

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
    // after the last letter, clear the ink of its tail, but stay inside the gap before the next word
    let tail = 0
    if (after && !ltr) {
      const cs = getComputedStyle(word)
      tail = Math.min(inkOverhangLeft(view.letters.map((l) => l.char).join(''), `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`), em * 0.3)
    }
    if (style === 'line') x = (after ? (ltr ? rect.right : rect.left - tail) : ltr ? rect.left : rect.right) - base - cw / 2
    else x = (after ? (ltr ? rect.right : rect.left - tail - w) : rect.left) - base
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
