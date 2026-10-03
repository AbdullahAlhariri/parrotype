// Imperative caret: positioned with transform, glides with WAAPI so React never re-renders
// for it. A new move starts from wherever the caret is on screen, so it never queues up.

export interface CaretBox {
  x: number
  y: number
  /** only used by the block and underline styles */
  w: number
}

const IDLE_MS = 900

export class Caret {
  private anim: Animation | null = null
  private idleTimer = 0
  private last: CaretBox | null = null
  private lastMoveAt = 0

  constructor(private el: HTMLElement) {
    this.idle()
  }

  /** Move to a box (px, relative to the caret's offset parent). */
  moveTo(box: CaretBox, glideMs: number) {
    const prev = this.last
    if (prev && prev.x === box.x && prev.y === box.y && prev.w === box.w) return
    const to = `translate(${box.x}px, ${box.y}px)`
    const from = this.anim ? getComputedStyle(this.el).transform : this.el.style.transform
    this.anim?.cancel()
    this.anim = null
    this.el.style.setProperty('--caret-w', `${box.w}px`)
    this.el.style.transform = to
    this.el.style.visibility = 'visible'
    this.last = box
    // never slower than the keys: during a burst the glide shortens so the caret stays on the letter
    const now = performance.now()
    const ms = Math.min(glideMs, now - this.lastMoveAt)
    this.lastMoveAt = now
    if (ms >= 25 && prev && from && from !== 'none') {
      this.anim = this.el.animate([{ transform: from }, { transform: to }], { duration: ms, easing: 'linear' })
      this.anim.onfinish = () => {
        this.anim = null
      }
    }
  }

  hide() {
    this.el.style.visibility = 'hidden'
    this.last = null
  }

  /** Forget the last position so the next move snaps (after a reset or a line jump). */
  reset() {
    this.anim?.cancel()
    this.anim = null
    this.last = null
  }

  /** Solid while keys arrive, blinking after a short pause. */
  typing() {
    this.el.classList.remove('is-idle')
    clearTimeout(this.idleTimer)
    this.idleTimer = window.setTimeout(() => this.idle(), IDLE_MS)
  }

  idle() {
    clearTimeout(this.idleTimer)
    this.el.classList.add('is-idle')
  }

  destroy() {
    clearTimeout(this.idleTimer)
    this.anim?.cancel()
  }
}
