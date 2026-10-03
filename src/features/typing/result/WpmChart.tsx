import { useId, useLayoutEffect, useRef, useState, type PointerEvent } from 'react'
import { chartScale, xTicks } from './chartScale'

interface Props {
  wpm: number[]
  raw: number[]
  errors: number[]
  /** draw the lines in (600 ms); off for reduced motion */
  animate: boolean
}

const PAD = { l: 36, r: 30, t: 16, b: 28 }

function useWidth(ref: React.RefObject<HTMLElement | null>) {
  const [w, setW] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setW(el.clientWidth)
    if (typeof ResizeObserver !== 'function') return
    const ro = new ResizeObserver(() => setW(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return w
}

const path = (pts: [number, number][]) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('')

/**
 * Hand-rolled SVG: wpm as a solid --main line (3px), raw dashed at 60%, errors as small x marks
 * in --error on their own right-hand axis. Axes in --sub, hairline grid in --border.
 */
export function WpmChart({ wpm, raw, errors, animate }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const width = useWidth(wrapRef)
  const [hover, setHover] = useState<number | null>(null)
  const id = useId().replace(/:/g, '')
  const n = wpm.length
  const height = width && width < 520 ? 172 : 212

  const summary = n
    ? `Speed over ${n} seconds: ${Math.round(wpm[n - 1])} wpm at the end, raw speed between ${Math.round(Math.min(...raw))} and ${Math.round(Math.max(...raw))}, ${errors.reduce((a, b) => a + b, 0)} wrong keys.`
    : 'Not enough data for a chart.'

  if (!n) {
    return (
      <div ref={wrapRef} className="tr-chart-empty">
        {summary}
      </div>
    )
  }

  const iw = Math.max(40, width - PAD.l - PAD.r)
  const ih = height - PAD.t - PAD.b
  const { max, ticks } = chartScale(Math.max(10, ...wpm, ...raw))
  const eMax = Math.max(1, ...errors)
  const x = (i: number) => PAD.l + (n === 1 ? iw / 2 : (i / (n - 1)) * iw)
  const y = (v: number) => PAD.t + ih - (Math.max(0, v) / max) * ih
  const ye = (v: number) => PAD.t + ih - (v / eMax) * ih
  const xs = xTicks(n)

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - box.left
    const i = n === 1 ? 0 : Math.round(((px - PAD.l) / iw) * (n - 1))
    setHover(Math.min(n - 1, Math.max(0, i)))
  }

  return (
    <div ref={wrapRef} className="tr-chart-box">
      {width > 0 && (
        <svg
          className="tr-svg"
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-labelledby={`${id}-t ${id}-d`}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        >
          <title id={`${id}-t`}>Words per minute over time</title>
          <desc id={`${id}-d`}>{summary}</desc>
          <defs>
            <clipPath id={`${id}-clip`}>
              <rect className={animate ? 'tr-reveal' : undefined} x={0} y={0} width={width} height={height} />
            </clipPath>
          </defs>

          <g className="tr-gridlines">
            {ticks.map((t) => (
              <line key={t} x1={PAD.l} x2={PAD.l + iw} y1={y(t)} y2={y(t)} />
            ))}
          </g>
          <g className="tr-axis">
            {ticks.map((t) => (
              <text key={t} x={PAD.l - 8} y={y(t)} dy="0.32em" textAnchor="end">
                {t}
              </text>
            ))}
            {[0, eMax].map((t) => (
              <text key={`e${t}`} x={PAD.l + iw + 8} y={ye(t)} dy="0.32em" textAnchor="start">
                {t}
              </text>
            ))}
            {xs.map((i) => (
              <text key={`x${i}`} x={x(i)} y={height - 8} textAnchor="middle">
                {i + 1}
              </text>
            ))}
          </g>

          <g clipPath={`url(#${id}-clip)`}>
            <path className="tr-line-raw" d={path(raw.map((v, i) => [x(i), y(v)]))} />
            <path className="tr-line-wpm" d={path(wpm.map((v, i) => [x(i), y(v)]))} />
            {n === 1 && <circle className="tr-dot" cx={x(0)} cy={y(wpm[0])} r={3} />}
            <g className="tr-errors">
              {errors.map((e, i) =>
                e > 0 ? (
                  <path key={i} d={`M${x(i) - 3.5} ${ye(e) - 3.5}l7 7M${x(i) + 3.5} ${ye(e) - 3.5}l-7 7`} />
                ) : null,
              )}
            </g>
          </g>

          {hover !== null && (
            <g className="tr-hover" aria-hidden="true">
              <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={PAD.t + ih} />
              <circle cx={x(hover)} cy={y(wpm[hover])} r={4} />
            </g>
          )}
        </svg>
      )}
      <div className="tr-chart-foot">
        <p className="tr-readout tabular" aria-hidden="true">
          {hover !== null
            ? `${hover + 1}s: ${Math.round(wpm[hover])} wpm, raw ${Math.round(raw[hover])}, ${errors[hover]} ${errors[hover] === 1 ? 'error' : 'errors'}`
            : 'seconds'}
        </p>
        <ul className="tr-legend" aria-hidden="true">
          <li>
            <svg width="18" height="6">
              <path d="M1 3h16" className="tr-line-wpm" />
            </svg>
            wpm
          </li>
          <li>
            <svg width="18" height="6">
              <path d="M1 3h16" className="tr-line-raw" />
            </svg>
            raw
          </li>
          <li>
            <svg width="10" height="10" className="tr-errors">
              <path d="M2 2l6 6M8 2l-6 6" />
            </svg>
            errors
          </li>
        </ul>
      </div>
    </div>
  )
}
