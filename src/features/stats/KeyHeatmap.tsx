import { useMemo, useState, type CSSProperties } from 'react'
import { LAYOUTS, type KeyDef } from '@/engine/keyboard'
import type { KeyStat } from '@/types'
import { MIN_KEY_SAMPLES, heatShare, keyHeat, layoutForFilter, type KeyHeat, type LangFilter } from './aggregate'
import { pct, plural } from './format'
import { SectionHead } from './parts'
import { useRovingGrid } from './roving'

const STEPS = [0, 0.25, 0.5, 0.75, 1]

const vars = (o: Record<string, string | number | undefined>) => o as CSSProperties

function describe(k: KeyDef, h: KeyHeat | undefined): string {
  const name = k.base
  if (!h || h.hits + h.misses === 0) return `${name}: not typed yet`
  const n = h.hits + h.misses
  if (h.rate === null) return `${name}: ${plural(n, 'press', 'presses')} so far, too few to tell`
  const avg = h.hits ? Math.round(h.ms / h.hits) : 0
  return `${name}: ${pct(h.rate * 100)} missed, ${h.misses} of ${n} first presses${avg ? `, ${avg} ms per press` : ''}`
}

/** The physical keyboard, each key shaded from --surface to --error by how often it was missed. */
export function KeyHeatmap({ keys, filter, note }: { keys: Record<string, KeyStat>; filter: LangFilter; note?: string }) {
  const layout = LAYOUTS[layoutForFilter(filter)]
  const heat = useMemo(() => keyHeat(keys, layout.id), [keys, layout.id])
  const rtl = layout.dir === 'rtl'
  // the number row only earns its space once something on it has been typed
  const showNumbers = useMemo(
    () => layout.rows[0].some((k) => (heat.byCode.get(k.code)?.hits ?? 0) + (heat.byCode.get(k.code)?.misses ?? 0) > 0),
    [layout, heat],
  )
  const rows = useMemo(() => (showNumbers ? layout.rows : layout.rows.slice(1)), [layout, showNumbers])
  const top = showNumbers ? 0 : 1
  const units = useMemo(() => Math.max(...rows.flat().map((k) => k.x + k.width)), [rows])
  const left = useMemo(() => Math.min(...rows.flat().map((k) => k.x)), [rows])
  const span = units - left

  const { flat, positions, start } = useMemo(() => {
    const flat = rows.flat().filter((k) => k.row < 4)
    let start = flat.findIndex((k) => k.code === 'KeyF')
    let worst = -1
    flat.forEach((k, i) => {
      const r = heat.byCode.get(k.code)?.rate
      if (r != null && r > worst) {
        worst = r
        start = i
      }
    })
    return { flat, positions: flat.map((k) => ({ row: k.row, x: k.x + k.width / 2 })), start: Math.max(0, start) }
  }, [rows, heat])
  const index = useMemo(() => new Map(flat.map((k, i) => [k.code, i])), [flat])
  const roving = useRovingGrid<HTMLSpanElement>(positions, start)
  const [tip, setTip] = useState<KeyDef | null>(null)

  const hasData = [...heat.byCode.values()].some((h) => h.rate !== null)
  const tipHeat = tip ? heat.byCode.get(tip.code) : undefined
  const tipCentre = tip ? tip.x + tip.width / 2 - left : 0
  const align = tipCentre < 2.5 ? 'start' : tipCentre > span - 2.5 ? 'end' : 'center'

  return (
    <section className="st-section st-heat" aria-labelledby="st-heat-title">
      <SectionHead id="st-heat-title" title="Missed keys" note={note ?? 'How often your first press on each key was wrong.'} />
      <div className={`st-kb-wrap${hasData ? '' : ' is-empty'}`}>
        <div
          className="st-kb"
          dir="ltr"
          role="grid"
          aria-label={`Miss rate per key, ${layout.name} keyboard`}
          style={{ aspectRatio: `${span} / ${rows.length}`, ...vars({ '--units': span, '--rows': rows.length }) }}
          onKeyDown={roving.onKeyDown}
        >
          {rows.map((row, r) => (
            <div role="row" className="st-kb-row" key={r} style={vars({ '--r': r })}>
              {row.map((k) => {
                if (k.row === 4) {
                  return (
                    <span
                      key={k.code}
                      role="gridcell"
                      className="st-kb-key is-space"
                      style={vars({ '--x': k.x - left, '--w': k.width })}
                      aria-label="Space bar, not counted per key"
                    >
                      <span className="st-kb-cap" aria-hidden="true" />
                    </span>
                  )
                }
                const h = heat.byCode.get(k.code)
                const share = h?.rate != null ? heatShare(h.rate, heat.max) : null
                const i = index.get(k.code)!
                return (
                  <span
                    key={k.code}
                    role="gridcell"
                    aria-label={describe(k, h)}
                    className={`st-kb-key${share === null ? ' is-nodata' : ''}${share !== null && share > 0.55 ? ' is-hot' : ''}${tip?.code === k.code ? ' is-active' : ''}`}
                    style={vars({ '--x': k.x - left, '--w': k.width, '--heat': share === null ? undefined : `${Math.round(share * 100)}%` })}
                    {...roving.itemProps(i)}
                    onFocus={() => {
                      roving.setActive(i)
                      setTip(k)
                    }}
                    onBlur={() => setTip(null)}
                    onPointerEnter={() => setTip(k)}
                    onPointerLeave={(e) => e.pointerType === 'mouse' && setTip(null)}
                  >
                    <span className="st-kb-cap" aria-hidden="true" lang={rtl ? 'ar' : undefined}>
                      {k.base}
                    </span>
                  </span>
                )
              })}
            </div>
          ))}
          {tip && (
            <div className={`st-tip st-kb-tip is-${align}`} style={vars({ '--cx': tipCentre, '--r': tip.row - top })} aria-hidden="true">
              <div className="st-tip-value">
                <span className="st-tip-key" lang={rtl ? 'ar' : undefined}>
                  {tip.base}
                </span>{' '}
                {tipHeat?.rate != null ? `${pct(tipHeat.rate * 100)} missed` : tipHeat ? 'too few presses' : 'not typed yet'}
              </div>
              {tipHeat && tipHeat.hits + tipHeat.misses > 0 && (
                <div className="st-tip-meta">
                  {tipHeat.misses} of {plural(tipHeat.hits + tipHeat.misses, 'first press', 'first presses')}
                </div>
              )}
              {tipHeat && tipHeat.hits > 0 && tipHeat.ms > 0 && (
                <div className="st-tip-meta">{Math.round(tipHeat.ms / tipHeat.hits)} ms per press</div>
              )}
              {tipHeat && tipHeat.chars.length > 1 && (
                <div className="st-tip-meta">
                  includes{' '}
                  <span lang={rtl ? 'ar' : undefined}>
                    {tipHeat.chars
                      .filter((c) => c !== tip.base)
                      .slice(0, 5)
                      .join(' ')}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
        {!hasData && <p className="st-kb-empty">Not enough keystrokes yet. Kees needs about {MIN_KEY_SAMPLES} presses per key, so a few runs and this fills in.</p>}
      </div>
      <div className="st-heat-legend" aria-hidden="true">
        <span className="tabular">0%</span>
        <span className="st-heat-steps">
          {STEPS.map((s) => (
            <span key={s} style={vars({ '--heat': `${s * 100}%` })} />
          ))}
        </span>
        <span className="tabular">{pct(heat.max * 100, 0)} or more</span>
        <span className="st-heat-nodata">
          <span />
          too few presses
        </span>
      </div>
    </section>
  )
}
