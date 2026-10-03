import type { BestRow, LangFilter } from './aggregate'
import { shortDate } from './format'
import { LangTag, SectionHead } from './parts'

export function Bests({ rows, filter }: { rows: BestRow[]; filter: LangFilter }) {
  const showLang = filter === 'all'
  return (
    <section className="st-section st-bests" aria-labelledby="st-bests-title">
      <SectionHead id="st-bests-title" title="Personal bests" />
      {rows.length ? (
        <table className="st-table">
          <thead>
            <tr>
              <th scope="col">test</th>
              <th scope="col" className="num">
                wpm
              </th>
              <th scope="col" className="num">
                set
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <th scope="row">
                  {r.config}
                  {showLang && r.lang && <LangTag lang={r.lang} />}
                </th>
                <td className="num st-strong">{Math.round(r.wpm)}</td>
                <td className="num st-dim">{r.at ? shortDate(r.at) : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="st-empty-line">No personal bests yet. Finish a timed test and the first one is yours.</p>
      )}
    </section>
  )
}
