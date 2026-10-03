import { Fragment, useMemo } from 'react'
import type { KeyStat, Lang } from '@/types'
import type { Weakness } from '@/engine/keystats'
import { useSettings } from '@/state/settings'
import { drillHref, drillUnits, practiceLangFor, weakUnits, type LangFilter } from './aggregate'
import { pct } from './format'
import { Practice, PracticeLink, SectionHead } from './parts'

/** "d", "d and ij", "d, ij and ei", each unit in the practice font */
function UnitList({ units, lang }: { units: string[]; lang: Lang }) {
  return (
    <>
      {units.map((u, i) => (
        <Fragment key={u}>
          {i > 0 && (i === units.length - 1 ? ' and ' : ', ')}
          <Practice lang={lang} className="st-cta-unit">
            {u}
          </Practice>
        </Fragment>
      ))}
    </>
  )
}

function UnitTable({ items, lang, unit, count }: { items: Weakness[]; lang: Lang; unit: string; count: string }) {
  if (!items.length) return null
  return (
    <table className="st-weak-table">
      <thead>
        <tr>
          <th scope="col">{unit}</th>
          <th scope="col" className="num">
            missed
          </th>
          <th scope="col" className="num">
            {count}
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((w) => (
          <tr key={w.unit}>
            <th scope="row">
              <Practice lang={lang} className="st-unit">
                {w.unit}
              </Practice>
            </th>
            <td className="num st-weak-rate">{pct(w.errorRate * 100)}</td>
            <td className="num st-weak-n">{w.samples}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Weakest keys and letter pairs from weaknesses(), with a link that drills them. */
export function WeakUnits({ keys, bigrams, filter }: { keys: Record<string, KeyStat>; bigrams: Record<string, KeyStat>; filter: LangFilter }) {
  const w = useMemo(() => weakUnits(keys, bigrams, filter), [keys, bigrams, filter])
  const current = useSettings((s) => s.lang)
  const lang = practiceLangFor(filter, current)
  const units = drillUnits(w)
  const empty = !w.keys.length && !w.bigrams.length
  const anyData = Object.keys(keys).length > 0

  return (
    <section className="st-section st-weak" aria-labelledby="st-weak-title">
      <SectionHead
        id="st-weak-title"
        title="Weakest keys and pairs"
        note={
          empty
            ? undefined
            : w.confident
              ? 'Clearly worse than your average, with enough presses to be sure.'
              : 'Nothing is clearly weak yet. These are the worst so far.'
        }
      />
      {empty ? (
        <p className="st-empty-line">
          {anyData
            ? 'No misses worth mentioning. Kees checked twice.'
            : 'Not enough keystrokes yet. Kees needs about 20 presses per key before he points a claw.'}
        </p>
      ) : (
        <>
          <div className="st-weak-groups">
            <UnitTable items={w.keys} lang={lang} unit="key" count="presses" />
            <UnitTable items={w.bigrams} lang={lang} unit="pair" count="typed" />
          </div>
          {units.length > 0 && (
            <PracticeLink to={drillHref(units, filter)} practiceLang={lang} className="btn btn-subtle btn-sm st-cta">
              Drill <UnitList units={units} lang={lang} />
            </PracticeLink>
          )}
        </>
      )}
    </section>
  )
}
