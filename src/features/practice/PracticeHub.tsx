import { useMemo, useState } from 'react'
import { Link } from '@/lib/router'
import { useSettings } from '@/state/settings'
import { currentStreak, useStats } from '@/state/stats'
import { BOX_DAYS, useNest } from '@/state/nest'
import { dayKey } from '@/lib/id'
import { LANG_TAGS, isRtl, type Lang } from '@/types'
import { weaknesses, type Weakness } from '@/engine'
import { Kbd } from '@/components/ui'
import { mostMissed, repairHref } from './repair'
import { PLAN, planStatus, usePlanTicks, type PlanId } from './plan'
import { dailyRuns } from './daily'
import { DRILL_WORDS } from './drill'
import { LANG_IN_ENGLISH, TickIcon, dueIn, pct } from './parts'
import { mascotName } from '@/lib/mascot'

const BOX_WHEN = BOX_DAYS.map((d) => (d === 0 ? 'same day' : d === 1 ? '1 day' : d === 7 ? '1 week' : `${d} days`))

export function PracticeHub() {
  const lang = useSettings((s) => s.lang)
  const items = useNest((s) => s.items)
  const keys = useStats((s) => s.keys[lang])
  const bigrams = useStats((s) => s.bigrams[lang])
  const words = useStats((s) => s.words[lang])
  const [now] = useState(() => Date.now())

  const nest = useMemo(() => items.filter((i) => i.lang === lang), [items, lang])
  const due = nest.filter((i) => i.due <= now)
  const weak = useMemo(() => weaknesses(keys, bigrams, { lang }).slice(0, 3), [keys, bigrams, lang])
  const missed = useMemo(() => mostMissed(words, 8), [words])
  const keySamples = useMemo(() => Object.values(keys).reduce((a, s) => a + s.hits + s.misses, 0), [keys])

  const parts = [
    nest.length ? `${nest.length} in the nest` : '',
    weak.length ? `${weak.length} weak ${weak.length === 1 ? 'spot' : 'spots'} on the keyboard` : '',
    missed.length ? `${missed.length} problem ${missed.length === 1 ? 'word' : 'words'}` : '',
  ].filter(Boolean)

  return (
    <div className="page practice">
      <header className="page-head">
        <div>
          <h1 className="page-title">Weak spots</h1>
          <p className="page-lede">
            {parts.length
              ? `Drills built from your own mistakes in ${LANG_IN_ENGLISH[lang]}: ${joinAnd(parts)}.`
              : `Drills built from your own mistakes in ${LANG_IN_ENGLISH[lang]}. There are none yet, which means great typing or very little typing.`}
          </p>
        </div>
      </header>

      <div className="practice-grid">
        <aside className="practice-today" aria-label="Today">
          <TodayPlan dueCount={due.length} />
          <DailyTeaser lang={lang} />
        </aside>

        <div className="practice-sections">
          <NestSection lang={lang} nest={nest} dueCount={due.length} now={now} />
          <DrillSection lang={lang} weak={weak} keySamples={keySamples} primary={due.length === 0} />
          <RepairSection lang={lang} missed={missed.map((w) => ({ word: w.word, count: w.count }))} />
        </div>
      </div>
    </div>
  )
}

function joinAnd(parts: string[]) {
  return parts.length < 2 ? parts.join('') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
}

/* ------------------------------------------------------------------ */

function TodayPlan({ dueCount }: { dueCount: number }) {
  const sessions = useStats((s) => s.sessions)
  const day = usePlanTicks((s) => s.day)
  const ticked = usePlanTicks((s) => s.done)
  const toggle = usePlanTicks((s) => s.toggle)
  const auto = planStatus(sessions, { day: '', done: [] })
  const status = planStatus(sessions, { day, done: ticked })
  const nothingDue = dueCount === 0
  const isDone = (id: PlanId) => status[id] || (id === 'nest' && nothingDue)
  const doneCount = PLAN.filter((p) => isDone(p.id)).length
  const left = PLAN.filter((p) => !isDone(p.id)).reduce((a, p) => a + p.minutes, 0)

  return (
    <section className="plan" aria-labelledby="plan-title">
      <h2 id="plan-title" className="section-title">
        Today, about 15 minutes
      </h2>
      <ol className="plan-list">
        {PLAN.map((p) => {
          const done = isDone(p.id)
          const locked = auto[p.id] || (p.id === 'nest' && nothingDue)
          const label = p.id === 'nest' ? (nothingDue ? 'Nest review, nothing due' : `Nest review, ${dueCount} due`) : p.label
          return (
            <li key={p.id} className={`plan-item${done ? ' is-done' : ''}`}>
              <label className="plan-check">
                <input
                  type="checkbox"
                  checked={done}
                  disabled={locked}
                  onChange={(e) => toggle(p.id, e.target.checked)}
                  aria-label={locked ? `${label}: done today` : `Mark "${label}" as done`}
                />
                <span className="plan-box" aria-hidden="true">
                  <TickIcon size={14} />
                </span>
              </label>
              <Link to={p.to} className="plan-link">
                {label}
              </Link>
              <span className="plan-min muted tabular">{p.minutes} min</span>
            </li>
          )
        })}
      </ol>
      <p className="plan-foot muted small tabular">
        {doneCount === PLAN.length ? 'All four done. That was the whole plan; anything else is extra credit.' : `${doneCount} of ${PLAN.length} done, about ${left} minutes left.`}
      </p>
    </section>
  )
}

function DailyTeaser({ lang }: { lang: Lang }) {
  const sessions = useStats((s) => s.sessions)
  const days = useStats((s) => s.days)
  const streak = currentStreak(days)
  const best = dailyRuns(sessions, lang, dayKey())[0]
  return (
    <section className="practice-daily" aria-labelledby="daily-title">
      <h2 id="daily-title" className="section-title">
        Daily challenge
      </h2>
      <p className="muted">45 seconds on the same words all day. A second go is a fair rematch.</p>
      <p className="practice-daily-nums tabular">
        {streak > 0 ? `${streak}-day streak` : 'No streak yet'}
        {best?.wpm !== undefined ? `. Today: ${Math.round(best.wpm)} wpm.` : '.'}
      </p>
      <Link to="/daily" className="btn btn-subtle btn-md">
        {best ? 'Try for a rematch' : 'Today’s challenge'}
      </Link>
    </section>
  )
}

/* ------------------------------------------------------------------ */

function NestSection({ lang, nest, dueCount, now }: { lang: Lang; nest: { box: number; due: number }[]; dueCount: number; now: number }) {
  const boxes = [1, 2, 3, 4, 5].map((box) => {
    const inBox = nest.filter((i) => i.box === box)
    return { box, total: inBox.length, due: inBox.filter((i) => i.due <= now).length }
  })
  const next = nest.filter((i) => i.due > now).sort((a, b) => a.due - b.due)[0]

  return (
    <section className="practice-section" aria-labelledby="nest-title">
      <div className="practice-section-head">
        <h2 id="nest-title" className="section-title">
          Mistake nest
        </h2>
        <p className="muted">
          {nest.length
            ? 'Words and sentences you got wrong. Each right answer moves one up a box and further away; five in a row and it leaves the nest.'
            : `The nest is empty for ${LANG_IN_ENGLISH[lang]}. Words you miss in dictation and the gym land here and come back until they stick.`}
        </p>
      </div>

      {nest.length > 0 && (
        <ol className="nest-boxes" aria-label="Boxes">
          {boxes.map((b) => (
            <li key={b.box} className={`nest-box${b.total ? '' : ' is-empty'}`}>
              <span className="nest-box-count tabular">{b.total}</span>
              <span className="nest-box-label">box {b.box}</span>
              <span className="nest-box-when muted">{BOX_WHEN[b.box - 1]}</span>
              <span className="nest-box-due tabular">{b.due ? `${b.due} due` : ''}</span>
            </li>
          ))}
        </ol>
      )}

      <div className="practice-actions">
        {dueCount > 0 ? (
          <>
            <Link to="/practice?mode=nest" className="btn btn-primary btn-md">
              Review {dueCount} due
            </Link>
            <span className="muted small">Look, cover, type it from memory, compare. Up to 20 at a time.</span>
          </>
        ) : nest.length > 0 ? (
          <span className="muted small">Nothing due right now. The next one is due {next ? dueIn(next.due, now) : 'soon'}.</span>
        ) : null}
      </div>
    </section>
  )
}

/** One primary button on the hub: the nest review when something is due, otherwise the drill. */
function DrillSection({ lang, weak, keySamples, primary }: { lang: Lang; weak: Weakness[]; keySamples: number; primary: boolean }) {
  const units = weak.map((w) => w.unit)
  return (
    <section className="practice-section" aria-labelledby="drill-title">
      <div className="practice-section-head">
        <h2 id="drill-title" className="section-title">
          Focus drill
        </h2>
        <p className="muted">
          {weak.length
            ? `Your weakest keys and letter pairs right now, from ${keySamples.toLocaleString('en')} keystrokes. ${DRILL_WORDS} real words built around them.`
            : keySamples
              ? `Nothing is clearly weak in ${keySamples.toLocaleString('en')} keystrokes. ${mascotName(lang)} wants about 20 tries per key before he blames one. Until then, the drill is a mixed warm-up.`
              : 'No keystrokes yet. Until there are, the drill is a mixed warm-up from the 1000 most common words.'}
        </p>
      </div>

      {weak.length > 0 && (
        <ul className="weak-chips" aria-label="Weak keys">
          {weak.map((w) => (
            <li key={w.kind + w.unit} className="weak-chip" lang={LANG_TAGS[lang]}>
              <Kbd>{w.unit}</Kbd>
              <span className="weak-chip-rate tabular">{pct(w.errorRate)}</span>
              <span className="weak-chip-note muted small">missed, {w.samples} tries</span>
            </li>
          ))}
        </ul>
      )}

      <div className="practice-actions">
        <Link
          to={units.length ? `/practice?focus=${encodeURIComponent(units.join(','))}` : '/practice?mode=drill'}
          className={`btn ${primary ? 'btn-primary' : 'btn-subtle'} btn-md`}
        >
          {units.length ? `Drill ${units.length === 1 ? 'this' : 'these'}, ${DRILL_WORDS} words` : `Warm-up, ${DRILL_WORDS} words`}
        </Link>
        <span className="muted small">Accuracy first: 97% before speed.</span>
      </div>
    </section>
  )
}

function RepairSection({ lang, missed }: { lang: Lang; missed: { word: string; count: number }[] }) {
  return (
    <section className="practice-section" aria-labelledby="repair-title">
      <div className="practice-section-head">
        <h2 id="repair-title" className="section-title">
          Word repair
        </h2>
        <p className="muted">
          {missed.length
            ? 'The words you get wrong most often. Each one three times in a mixed line, then once between common words.'
            : `No problem words yet. Do a few runs and ${mascotName(lang)} will start a list.`}
        </p>
      </div>

      {missed.length > 0 && (
        <ul className="repair-words" lang={LANG_TAGS[lang]} dir={isRtl(lang) ? 'rtl' : undefined} aria-label="Most missed words">
          {missed.map((w) => (
            <li key={w.word}>
              <span className="repair-word mono-text">{w.word}</span>
              <span className="repair-count muted tabular" aria-label={`missed ${w.count} times`}>
                {w.count}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="practice-actions">
        {missed.length > 0 ? (
          <Link to={repairHref(missed.map((w) => w.word))} className="btn btn-subtle btn-md">
            Practise these {missed.length} words
          </Link>
        ) : (
          <Link to="/" className="btn btn-subtle btn-md">
            Take a typing test
          </Link>
        )}
      </div>
    </section>
  )
}
