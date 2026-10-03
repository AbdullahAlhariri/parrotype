import type { KindRow } from './aggregate'
import { pct } from './format'
import { Practice, SectionHead, TypedDiff } from './parts'

/** Share of each kind of slip, as a plain horizontal bar list. */
export function MistakeKinds({ rows }: { rows: KindRow[] }) {
  const max = Math.max(0.0001, ...rows.map((r) => r.share))
  return (
    <section className="st-section st-kinds" aria-labelledby="st-kinds-title">
      <SectionHead
        id="st-kinds-title"
        title="Kinds of mistakes"
        note={rows.length ? 'From your missed words, counted every time you missed them.' : undefined}
      />
      {rows.length ? (
        <ul className="st-kind-list">
          <li className="st-kind-head" aria-hidden="true">
            <span className="st-kind-share">share</span>
            <span className="st-kind-count">times</span>
          </li>
          {rows.map((r) => (
            <li key={r.kind}>
              <span className="st-kind-label">{r.label}</span>
              <span className="st-kind-bar" aria-hidden="true">
                <span style={{ width: `${(r.share / max) * 100}%` }} />
              </span>
              <span className="st-kind-share tabular">{pct(r.share * 100, 0)}</span>
              <span className="st-kind-count tabular">
                {r.count}
                <span className="sr-only"> times</span>
              </span>
              {r.example && (
                <span className="st-kind-ex">
                  <TypedDiff expected={r.example.word} typed={r.example.typed} lang={r.example.lang} /> for{' '}
                  <Practice lang={r.example.lang}>{r.example.word}</Practice>
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="st-empty-line">No slips to sort yet.</p>
      )}
    </section>
  )
}
