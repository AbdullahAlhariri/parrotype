import type { Headline as HeadlineData, RollingMetric } from './aggregate'
import { durationParts, plural } from './format'
import { Delta } from './parts'

const windowLabel = (m: RollingMetric) => (m.n >= 10 ? 'last 10 runs' : m.n === 1 ? 'one run so far' : `average of ${m.n} runs`)

function streakNote(h: HeadlineData) {
  if (!h.streak) return 'starts with your next run'
  if (!h.practisedToday) return 'type today to keep it'
  return h.streak === 1 ? 'day so far' : 'days in a row'
}

/** The four numbers that matter, accuracy first. Plain type, no tiles. */
export function Headline({ h }: { h: HeadlineData }) {
  const acc = h.accuracy
  const wpm = h.wpm
  return (
    <section className="st-headline" aria-label="Summary">
      <div className="st-hl st-hl-hero">
        <div className="st-hl-label">accuracy</div>
        <div className="st-hl-value">
          {acc.value === null ? '–' : acc.value.toFixed(1)}
          {acc.value !== null && <span className="st-hl-unit">%</span>}
        </div>
        <div className="st-hl-sub">
          {acc.value === null ? 'no typing runs yet' : windowLabel(acc)}
          <Delta value={acc.delta} suffix="vs the 10 before" flat="level with the 10 before" />
        </div>
      </div>

      <div className="st-hl">
        <div className="st-hl-label">wpm</div>
        <div className="st-hl-value">{wpm.value === null ? '–' : Math.round(wpm.value)}</div>
        <div className="st-hl-sub">
          {wpm.value === null ? 'no typing runs yet' : windowLabel(wpm)}
          <Delta value={wpm.delta} digits={0} suffix="vs the 10 before" flat="level with the 10 before" />
        </div>
      </div>

      <div className="st-hl">
        <div className="st-hl-label">streak</div>
        <div className="st-hl-value">{h.streak}</div>
        <div className="st-hl-sub">{streakNote(h)}</div>
      </div>

      <div className="st-hl">
        <div className="st-hl-label">practice time</div>
        <div className="st-hl-value">
          {durationParts(h.totalMs).map((p) => (
            <span key={p.unit} className="st-hl-part">
              {p.value}
              <span className="st-hl-unit">{p.unit}</span>
            </span>
          ))}
        </div>
        <div className="st-hl-sub">in {plural(h.sessions, 'session')}</div>
      </div>
    </section>
  )
}

/** Second tier: the numbers Monkeytype users look for, smaller. */
export function Details({ h }: { h: HeadlineData }) {
  const items: [string, string][] = [
    ['raw wpm', h.raw.value === null ? '–' : String(Math.round(h.raw.value))],
    ['consistency', h.consistency.value === null ? '–' : `${Math.round(h.consistency.value)}%`],
    ['mistakes per run', h.mistakes.value === null ? '–' : h.mistakes.value.toFixed(1)],
    ['typing runs', String(h.runs)],
  ]
  return (
    <div className="st-details">
      <dl>
        {items.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <p className="st-note">The first three are averages over the last 10 typing runs.</p>
    </div>
  )
}
