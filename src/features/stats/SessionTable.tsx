import { useState } from 'react'
import type { SessionRecord } from '@/types'
import { Button } from '@/components/ui'
import { MODE_LABELS, newestPage, type LangFilter } from './aggregate'
import { pct, when } from './format'
import { LangTag, SectionHead } from './parts'

const SIZE = 12

function accCell(s: SessionRecord) {
  if (typeof s.accuracy === 'number') return pct(s.accuracy)
  if (typeof s.score === 'number' && typeof s.total === 'number' && s.total > 0) return `${s.score}/${s.total}`
  return '–'
}

export function SessionTable({ sessions, filter }: { sessions: SessionRecord[]; filter: LangFilter }) {
  const [page, setPage] = useState(0)
  const p = newestPage(sessions, page, SIZE)
  const showLang = filter === 'all'
  const now = Date.now()

  return (
    <section className="st-section st-sessions" aria-labelledby="st-sessions-title">
      <SectionHead id="st-sessions-title" title="Recent sessions" />
      <div className="st-table-scroll">
        <table className="st-table st-session-table">
          <thead>
            <tr>
              <th scope="col" className="st-col-when">
                when
              </th>
              <th scope="col">what</th>
              {showLang && <th scope="col">lang</th>}
              <th scope="col" className="num">
                wpm
              </th>
              <th scope="col" className="num">
                acc
              </th>
              <th scope="col" className="num">
                mistakes
              </th>
            </tr>
          </thead>
          <tbody>
            {p.rows.map((s) => (
              <tr key={s.id}>
                <td className="st-dim st-when st-col-when">{when(s.at, now)}</td>
                <td className="st-what">
                  <span className="st-mode">{MODE_LABELS[s.mode] ?? s.mode}</span> <span className="st-config">{s.config}</span>
                  {/* narrow screens: the date moves under the mode instead of taking a column (CSS shows one of the two) */}
                  <span className="st-when-inline">{when(s.at, now)}</span>
                </td>
                {showLang && (
                  <td>
                    <LangTag lang={s.lang} />
                  </td>
                )}
                <td className="num tabular">{typeof s.wpm === 'number' ? Math.round(s.wpm) : '–'}</td>
                <td className="num tabular">{accCell(s)}</td>
                <td className="num tabular">{s.mistakes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {p.pages > 1 && (
        <nav className="st-pager" aria-label="Session pages">
          <Button size="sm" variant="ghost" disabled={p.page === 0} onClick={() => setPage(p.page - 1)}>
            Newer
          </Button>
          <span className="tabular" aria-live="polite">
            {p.from} to {p.to} of {p.total}
          </span>
          <Button size="sm" variant="ghost" disabled={p.page >= p.pages - 1} onClick={() => setPage(p.page + 1)}>
            Older
          </Button>
        </nav>
      )}
    </section>
  )
}
