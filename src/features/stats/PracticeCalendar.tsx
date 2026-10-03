import { useMemo, useState } from 'react'
import type { SessionRecord } from '@/types'
import { LEVEL_MINUTES, practiceCalendar, type CalendarDay } from './aggregate'
import { dayLabel, duration, plural } from './format'
import { SectionHead } from './parts'
import { useRovingGrid } from './roving'

const WEEKS = 20
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const LEGEND = [
  { level: 0, label: 'none' },
  { level: 1, label: `under ${LEVEL_MINUTES[0]}` },
  { level: 2, label: `${LEVEL_MINUTES[0]} to ${LEVEL_MINUTES[1]}` },
  { level: 3, label: `${LEVEL_MINUTES[1]} to ${LEVEL_MINUTES[2]}` },
  { level: 4, label: `${LEVEL_MINUTES[2]} or more` },
]

const describe = (d: CalendarDay) => `${dayLabel(d.date)}: ${d.runs ? `${duration(d.ms)}, ${plural(d.runs, 'session')}` : 'no practice'}`

/** GitHub-style grid of the last 20 weeks, one square per day, shaded by minutes practised. */
export function PracticeCalendar({ sessions }: { sessions: SessionRecord[] }) {
  const cal = useMemo(() => practiceCalendar(sessions, new Date(), WEEKS), [sessions])
  const [tip, setTip] = useState<{ day: CalendarDay; week: number; row: number } | null>(null)

  // focusable cells: every day up to today, positioned by weekday (row) and week (x)
  const { cells, positions, todayIndex } = useMemo(() => {
    const cells: { day: CalendarDay; week: number; row: number }[] = []
    cal.weeks.forEach((week, w) => week.forEach((day, r) => !day.future && cells.push({ day, week: w, row: r })))
    return {
      cells,
      positions: cells.map((c) => ({ row: c.row, x: c.week })),
      todayIndex: Math.max(
        0,
        cells.findIndex((c) => c.day.today),
      ),
    }
  }, [cal])
  const indexOf = useMemo(() => new Map(cells.map((c, i) => [c.day.key, i])), [cells])
  const roving = useRovingGrid<HTMLSpanElement>(positions, todayIndex)

  const pastDays = cells.length
  return (
    <section className="st-section st-calendar" aria-labelledby="st-cal-title">
      <SectionHead
        id="st-cal-title"
        title="Practice calendar"
        note={
          cal.activeDays
            ? `${plural(cal.activeDays, 'day')} out of the last ${pastDays}, ${duration(cal.totalMs)} in total.`
            : `Nothing in the last ${WEEKS} weeks.`
        }
      />
      <div className="st-cal-wrap" style={{ ['--weeks' as string]: WEEKS }}>
        <div className="st-cal-months" aria-hidden="true">
          {cal.months.map((m) => (
            <span key={m.week} style={{ ['--w' as string]: m.week }}>
              {m.label}
            </span>
          ))}
        </div>
        <div className="st-cal" role="grid" aria-label={`Practice per day, last ${WEEKS} weeks`} onKeyDown={roving.onKeyDown}>
          {DAY_NAMES.map((name, r) => (
            <div role="row" className="st-cal-row" key={name}>
              <span role="rowheader" className="st-cal-day" aria-label={name}>
                <span aria-hidden="true">{r % 2 === 0 && r < 6 ? name.slice(0, 3) : ''}</span>
              </span>
              {cal.weeks.map((week, w) => {
                const day = week[r]
                if (day.future) return <span key={day.key} role="gridcell" className="st-cal-cell is-future" aria-hidden="true" />
                const i = indexOf.get(day.key)!
                return (
                  <span
                    key={day.key}
                    role="gridcell"
                    aria-label={describe(day)}
                    className={`st-cal-cell lv-${day.level}${day.today ? ' is-today' : ''}`}
                    {...roving.itemProps(i)}
                    onFocus={() => {
                      roving.setActive(i)
                      setTip({ day, week: w, row: r })
                    }}
                    onBlur={() => setTip(null)}
                    onPointerEnter={() => setTip({ day, week: w, row: r })}
                    onPointerLeave={(e) => e.pointerType === 'mouse' && setTip(null)}
                  />
                )
              })}
            </div>
          ))}
        </div>
        {tip && (
          <div
            className={`st-tip st-cal-tip ${tip.week >= WEEKS / 2 ? 'is-left' : 'is-right'}`}
            style={{ ['--w' as string]: tip.week, ['--r' as string]: tip.row }}
            aria-hidden="true"
          >
            <div className="st-tip-value">{tip.day.runs ? duration(tip.day.ms) : 'no practice'}</div>
            <div className="st-tip-meta">
              {dayLabel(tip.day.date)}
              {tip.day.runs ? `, ${plural(tip.day.runs, 'session')}` : ''}
            </div>
          </div>
        )}
      </div>
      <ul className="st-cal-legend" aria-label="Legend, minutes a day">
        <li className="st-cal-legend-title" aria-hidden="true">
          minutes a day
        </li>
        {LEGEND.map((l) => (
          <li key={l.level}>
            <span className={`st-cal-cell lv-${l.level}`} aria-hidden="true" />
            {l.label}
          </li>
        ))}
      </ul>
    </section>
  )
}
