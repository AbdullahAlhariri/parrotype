import { useMemo, useState, type KeyboardEvent, type PointerEvent } from 'react'
import type { SessionRecord } from '@/types'
import { Segmented } from '@/components/ui'
import { MODE_LABELS, historyScale, historySeries, nearestIndex, sessionConfig, type HistoryMetric, type HistoryPoint, type LangFilter } from './aggregate'
import { pct, shortDate, when } from './format'
import { SectionHead } from './parts'
import { useWidth } from './useWidth'

/** Accuracy the drills aim for (typing-pedagogy.md: 97% keystroke accuracy). */
const TARGET = 97
const PAD = { l: 38, r: 14, t: 14, b: 28 }

type Range = 50 | 200 | 0

/** "type, time 30" or just "daily" */
const runLabel = (s: SessionRecord) => [MODE_LABELS[s.mode] ?? s.mode, sessionConfig(s)].filter(Boolean).join(', ')

export function HistoryChart({ sessions, filter }: { sessions: SessionRecord[]; filter: LangFilter }) {
  const [metric, setMetric] = useState<HistoryMetric>('accuracy')
  const [range, setRange] = useState<Range>(200)
  const [hover, setHover] = useState<number | null>(null)
  const [wrapRef, width] = useWidth<HTMLDivElement>()

  const all = useMemo(() => historySeries(sessions, metric), [sessions, metric])
  const pts = useMemo(() => (range ? all.slice(-range) : all), [all, range])
  const scale = useMemo(() => historyScale(pts, metric), [pts, metric])

  const n = pts.length
  const height = width < 520 ? 190 : 240
  const iw = Math.max(10, width - PAD.l - PAD.r)
  const ih = height - PAD.t - PAD.b
  const x = (i: number) => PAD.l + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw)
  const y = (v: number) => PAD.t + (1 - (v - scale.lo) / (scale.hi - scale.lo || 1)) * ih
  const fmt = (v: number) => (metric === 'accuracy' ? pct(v) : `${Math.round(v)} wpm`)
  const label = metric === 'accuracy' ? 'Accuracy' : 'Speed'

  // static layer: memoised so hovering does not redraw hundreds of dots
  const plot = useMemo(() => {
    const xs = (i: number) => PAD.l + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw)
    const ys = (v: number) => PAD.t + (1 - (v - scale.lo) / (scale.hi - scale.lo || 1)) * ih
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${xs(i).toFixed(1)} ${ys(p.avg).toFixed(1)}`).join('')
    const tickCount = iw < 360 ? 3 : 5
    // evenly spaced runs, minus repeats of the same date (several runs on one day)
    const xTicks: number[] = []
    for (const i of n > 1 ? new Set(Array.from({ length: tickCount }, (_, k) => Math.round((k * (n - 1)) / (tickCount - 1)))) : [0]) {
      const prev = xTicks[xTicks.length - 1]
      if (prev === undefined || shortDate(pts[prev].session.at) !== shortDate(pts[i].session.at)) xTicks.push(i)
    }
    const showTarget = metric === 'accuracy' && TARGET > scale.lo && TARGET < scale.hi
    const r = n > 400 ? 1.5 : n > 120 ? 2 : 2.75
    return (
      <>
        <g className="st-grid">
          {scale.ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.l} x2={PAD.l + iw} y1={ys(t)} y2={ys(t)} />
              <text x={PAD.l - 8} y={ys(t)} dy="0.35em" textAnchor="end">
                {t}
              </text>
            </g>
          ))}
        </g>
        {showTarget && <line className="st-target" x1={PAD.l} x2={PAD.l + iw} y1={ys(TARGET)} y2={ys(TARGET)} />}
        <g className="st-axis-x">
          {n > 0 &&
            xTicks.map((i) => (
              <text key={i} x={xs(i)} y={PAD.t + ih + 20} textAnchor={n === 1 ? 'middle' : i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}>
                {shortDate(pts[i].session.at)}
              </text>
            ))}
        </g>
        <g className="st-dots">
          {pts.map((p, i) => (
            <circle key={p.session.id + i} cx={xs(i)} cy={ys(p.value)} r={r} />
          ))}
        </g>
        {n > 1 && <path className="st-avg" d={line} />}
      </>
    )
  }, [pts, n, iw, ih, scale, metric])

  const pick = (e: PointerEvent<SVGSVGElement>) => {
    if (!n) return
    const rect = e.currentTarget.getBoundingClientRect()
    setHover(nearestIndex((e.clientX - rect.left - PAD.l) / iw, n))
  }

  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    if (!n) return
    const cur = hover ?? n - 1
    const go: Record<string, number> = {
      ArrowLeft: cur - 1,
      ArrowRight: cur + 1,
      PageUp: cur - 10,
      PageDown: cur + 10,
      Home: 0,
      End: n - 1,
    }
    if (e.key in go) {
      e.preventDefault()
      setHover(Math.min(n - 1, Math.max(0, go[e.key])))
    }
  }

  const active: HistoryPoint | null = hover !== null && pts[hover] ? pts[hover] : null
  const describe = (p: HistoryPoint) =>
    `${fmt(p.value)}, average ${fmt(p.avg)}, ${when(p.session.at)}, ${runLabel(p.session)}`

  const ranges: { value: Range; label: string }[] = [
    { value: 50, label: 'last 50' },
    ...(all.length > 200 ? [{ value: 200 as Range, label: 'last 200' }] : []),
    { value: 0, label: 'all' },
  ]
  const rangeValue: Range = range === 200 && all.length <= 200 ? 0 : range

  return (
    <section className="st-section st-history" aria-labelledby="st-history-title">
      <SectionHead id="st-history-title" title={`${label} over time`}>
        <Segmented<HistoryMetric>
          ariaLabel="Metric"
          value={metric}
          onChange={setMetric}
          options={[
            { value: 'accuracy', label: 'accuracy' },
            { value: 'wpm', label: 'wpm' },
          ]}
        />
        {all.length > 50 && <Segmented<Range> ariaLabel="Runs shown" value={rangeValue} onChange={setRange} options={ranges} className="st-range" />}
      </SectionHead>

      <div className="st-legend" aria-hidden="true">
        <span>
          <svg width="10" height="10" viewBox="0 0 10 10">
            <circle cx="5" cy="5" r="3" className="st-key-dot" />
          </svg>
          each run
        </span>
        <span>
          <svg width="18" height="10" viewBox="0 0 18 10">
            <line x1="1" x2="17" y1="5" y2="5" className="st-key-line" />
          </svg>
          average of the last 10
        </span>
        {metric === 'accuracy' && (
          <span>
            <svg width="18" height="10" viewBox="0 0 18 10">
              <line x1="1" x2="17" y1="5" y2="5" className="st-key-target" />
            </svg>
            {TARGET}% target
          </span>
        )}
      </div>

      <div className="st-chart" ref={wrapRef}>
        {n === 0 ? (
          <p className="st-empty-line">No typing runs in this language yet.</p>
        ) : (
          <svg
            width={width}
            height={height}
            role="slider"
            tabIndex={0}
            aria-label={`${label} per run. Arrow keys step through runs.`}
            aria-valuemin={1}
            aria-valuemax={n}
            aria-valuenow={(hover ?? n - 1) + 1}
            aria-valuetext={describe(active ?? pts[n - 1])}
            onPointerMove={pick}
            onPointerDown={pick}
            onPointerLeave={(e) => e.pointerType === 'mouse' && setHover(null)}
            onKeyDown={onKey}
            onFocus={() => setHover((h) => h ?? n - 1)}
            onBlur={() => setHover(null)}
          >
            {plot}
            {active && hover !== null && (
              <g className="st-cross">
                <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={PAD.t + ih} />
                <circle className="st-cross-run" cx={x(hover)} cy={y(active.value)} r={4.5} />
                {n > 1 && <circle className="st-cross-avg" cx={x(hover)} cy={y(active.avg)} r={4} />}
              </g>
            )}
          </svg>
        )}
        {active && hover !== null && (
          <div className={`st-tip ${x(hover) > width * 0.6 ? 'is-left' : 'is-right'}`} style={{ left: x(hover), top: PAD.t }} aria-hidden="true">
            <div className="st-tip-value">{fmt(active.value)}</div>
            {n > 1 && <div>average {fmt(active.avg)}</div>}
            <div className="st-tip-meta">{when(active.session.at)}</div>
            <div className="st-tip-meta">
              {runLabel(active.session)}
              {filter === 'all' && <>, {active.session.lang}</>}
            </div>
          </div>
        )}
      </div>
      {n === 1 && <p className="st-note">One run so far. Kees needs two to draw a line.</p>}
    </section>
  )
}
