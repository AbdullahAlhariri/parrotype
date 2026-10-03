import { useEffect, useRef } from 'react'
import { LANG_TAGS } from '@/types'
import { nextPack, type DrillPack } from '@/content/drills'
import { useSettings } from '@/state/settings'
import { Link } from '@/lib/router'
import { Button, Kees, Kbd, Stat, featherBurst, useReducedMotion } from '@/components/ui'
import type { RoundOutcome, RoundResult } from './GymRound'
import { Example } from './RulePanel'
import { Rich } from './Rich'
import { explain, formatClock, mastery } from './round'
import { useGym } from './store'

interface Props {
  pack: DrillPack
  result: RoundResult & { newBest: boolean }
  onAgain: () => void
}

/** Misses grouped by their hint, so one rule with three slips reads as one thing to revisit. */
function groupMisses(misses: RoundOutcome[]) {
  const groups = new Map<string, RoundOutcome[]>()
  for (const m of misses) {
    const key = m.item.hint?.en ?? ''
    groups.set(key, [...(groups.get(key) ?? []), m])
  }
  return [...groups.values()]
}

export function RoundSummary({ pack, result, onAgain }: Props) {
  const explainIn = useSettings((s) => s.explainIn)
  const known = useGym((s) => s.packs[pack.id]?.known)
  const keesRef = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const total = result.outcomes.length
  const misses = result.outcomes.filter((o) => !o.right)
  const score = total - misses.length
  const next = nextPack(pack.id)
  const m = mastery(pack, known)
  const mood = result.newBest ? 'celebrate' : score / total < 0.7 ? 'oops' : 'curious'

  useEffect(() => {
    if (!result.newBest || !keesRef.current) return
    const id = window.setTimeout(() => keesRef.current && featherBurst(keesRef.current), reduced ? 0 : 450)
    return () => window.clearTimeout(id)
  }, [result.newBest, reduced])

  const line = result.newBest
    ? `New best for this pack: ${score} of ${total}!`
    : misses.length === 0
      ? 'Not one slip. Kees checked twice.'
      : misses.length === 1
        ? 'One slip. The rule for it is below.'
        : `${misses.length} slips. The rules behind them are below.`

  return (
    <section className="gym-summary" aria-labelledby="gym-summary-title">
      <div className="gym-summary-left">
        <h2 id="gym-summary-title" className="sr-only">
          Round finished
        </h2>
        <div className="gym-score tabular" aria-label={`${score} of ${total} right first time`}>
          {score}
          <span className="gym-score-of">/{total}</span>
        </div>
        <p className="gym-score-label">right first time</p>
        <div className="gym-summary-stats">
          <Stat label="time" value={formatClock(result.durationMs)} />
          <Stat label="best streak" value={result.bestStreak} />
          <Stat label="known" value={`${m.known}/${m.total}`} sub="in this pack" />
        </div>
        <div className="gym-summary-kees" ref={keesRef}>
          <Kees mood={mood} size={72} />
        </div>
      </div>

      <div className="gym-summary-right">
        <p className="gym-summary-line">{line}</p>

        {misses.length > 0 && (
          <>
            <h3 className="gym-revisit-title">Rules to revisit</h3>
            <ul className="gym-revisit">
              {groupMisses(misses).map((group) => {
                const hint = explain(group[0].item.hint, pack.lang, explainIn)
                return (
                  <li key={group[0].key}>
                    {hint && (
                      <p className="gym-revisit-hint" lang={LANG_TAGS[hint.lang]} dir={hint.lang === 'ar' ? 'rtl' : 'ltr'}>
                        <Rich text={hint.text} exampleLang={pack.lang} rtl={hint.lang === 'ar'} />
                      </p>
                    )}
                    <ul className="gym-revisit-items">
                      {group.map((o) => (
                        <li key={o.key}>
                          <Example item={o.item} lang={pack.lang} />
                        </li>
                      ))}
                    </ul>
                  </li>
                )
              })}
            </ul>
            <p className="gym-nest-note">
              {misses.length === 1 ? 'This sentence went' : `These ${misses.length} sentences went`} to your mistake nest.{' '}
              <Link to="/practice">Weak spots</Link> brings {misses.length === 1 ? 'it' : 'them'} back today, then less often each time you get {misses.length === 1 ? 'it' : 'them'} right.
            </p>
          </>
        )}

        <div className="gym-summary-actions">
          <Button variant="primary" onClick={onAgain} autoFocus>
            Again <Kbd className="gym-kbd-on-primary">enter</Kbd>
          </Button>
          {next && next.id !== pack.id && (
            <Link to={`/gym?pack=${encodeURIComponent(next.id)}`} className="btn btn-subtle btn-md">
              Next pack:{' '}
              <span className="mono-text" lang={LANG_TAGS[next.lang]}>
                {next.title}
              </span>
            </Link>
          )}
          <Link to="/gym" className="link-btn gym-all-link">
            All packs
          </Link>
        </div>
      </div>
    </section>
  )
}
