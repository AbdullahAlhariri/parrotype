/**
 * Feather burst: Parrotype's answer to confetti, for personal bests only.
 * Eight quill feathers in the theme's mascot pigments fan out of the anchor (Kees's wing)
 * with WAAPI, drift down a little and fade. Under reduced motion three feathers simply
 * appear and fade where they are.
 */

const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)'

const quill = (vane: string, shaft: string) =>
  `<svg viewBox="0 0 12 28" aria-hidden="true" focusable="false">` +
  `<path d="M6 1C9.5 4.5 10.6 9 10 12.5L7.6 11.6 9.6 14.2C9 16.8 7.8 19 6 21 4.2 19 2.4 16 2 12 1.6 7.6 3 4 6 1Z" fill="${vane}"/>` +
  `<path d="M6 4.5V27" fill="none" stroke="${shaft}" stroke-width="1.1" stroke-linecap="round"/></svg>`

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

export interface FeatherBurstOptions {
  /** number of feathers, default 8 */
  count?: number
  /** origin inside the anchor as fractions of its box, default Kees's shoulder (0.5, 0.5) */
  origin?: { x: number; y: number }
}

export function featherBurst(anchorEl: Element, opts: FeatherBurstOptions = {}): Promise<void> {
  if (typeof document === 'undefined' || typeof anchorEl.getBoundingClientRect !== 'function') return Promise.resolve()
  const rect = anchorEl.getBoundingClientRect()
  const ox = rect.left + rect.width * (opts.origin?.x ?? 0.5)
  const oy = rect.top + rect.height * (opts.origin?.y ?? 0.5)

  const css = getComputedStyle(document.documentElement)
  const token = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback
  const vanes = [
    token('--kees-flash', '#FF6A3D'),
    token('--kees-head', '#8CA14A'),
    token('--kees-flash-2', '#F2A93B'),
    token('--kees-shade', '#5C6E2E'),
  ]
  const shaft = token('--kees-beak-lo', '#A39B8A')

  const layer = document.createElement('div')
  layer.className = 'feather-burst'
  layer.setAttribute('aria-hidden', 'true')
  layer.style.left = `${ox}px`
  layer.style.top = `${oy}px`
  document.body.appendChild(layer)

  const still = reducedMotion()
  const count = still ? 3 : (opts.count ?? 8)
  const animations: Animation[] = []

  for (let i = 0; i < count; i++) {
    const holder = document.createElement('div')
    holder.innerHTML = quill(vanes[i % vanes.length], shaft)
    const el = holder.firstElementChild as SVGSVGElement
    layer.appendChild(el)

    if (typeof el.animate !== 'function') continue

    if (still) {
      const x = (i - 1) * 22
      const r = (i - 1) * 25
      el.style.transform = `translate(${x}px, ${-30 - (i % 2) * 8}px) rotate(${r}deg)`
      animations.push(
        el.animate([{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], {
          duration: 1400,
          easing: 'ease-out',
          fill: 'both',
        }),
      )
      continue
    }

    // fan upwards from -160deg to -20deg, with a little jitter so it never looks stamped
    const spread = count > 1 ? i / (count - 1) : 0.5
    const angle = ((-160 + spread * 140 + (Math.random() - 0.5) * 14) * Math.PI) / 180
    const dist = 40 + Math.random() * 50
    const dx = Math.cos(angle) * dist
    const dy = Math.sin(angle) * dist
    const r0 = (Math.random() - 0.5) * 60
    const r1 = r0 + (Math.random() < 0.5 ? -1 : 1) * (50 + Math.random() * 70)
    animations.push(
      el.animate(
        [
          { transform: `translate(0, 0) rotate(${r0}deg) scale(0.6)`, opacity: 0 },
          { opacity: 1, offset: 0.12 },
          { transform: `translate(${dx}px, ${dy}px) rotate(${r1}deg) scale(1)`, opacity: 1, offset: 0.55 },
          { transform: `translate(${dx * 1.15}px, ${dy + 28}px) rotate(${r1 * 1.25}deg) scale(0.95)`, opacity: 0 },
        ],
        { duration: 900 + Math.random() * 250, delay: i * 18, easing: EASE_OUT, fill: 'both' },
      ),
    )
  }

  const done = Promise.all(animations.map((a) => a.finished.catch(() => undefined)))
  return done.then(() => layer.remove())
}
