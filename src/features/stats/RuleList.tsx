import type { LangFilter, RuleRow } from './aggregate'
import { ago, plural } from './format'
import { gymHref, ruleMark } from './gym'
import { LangTag, Practice, PracticeLink, SectionHead } from './parts'
import { useRuleCategories } from './ruleMeta'

const SHOW = 6
const MARK_CLASS = { spell: 'st-ex-spell', grammar: 'st-ex-grammar', hint: 'st-ex-hint' } as const

/** The grammar and spelling rules that fired most on the user's own writing. */
export function RuleList({ rules, filter }: { rules: RuleRow[]; filter: LangFilter }) {
  const top = rules.slice(0, SHOW)
  const categories = useRuleCategories(top.length > 0)
  return (
    <section className="st-section st-rules" aria-labelledby="st-rules-title">
      <SectionHead
        id="st-rules-title"
        title="Rules you trip over"
        note={top.length ? 'What the checker flagged in your own writing and dictation, most often first.' : undefined}
      />
      {top.length ? (
        <ol className="st-rule-list">
          {top.map((r) => (
            <li key={`${r.lang}:${r.ruleId}`}>
              <div className="st-rule-top">
                <span className="st-rule-title">
                  {r.title}
                  {filter === 'all' && <LangTag lang={r.lang} />}
                </span>
                <span className="st-rule-count tabular">
                  {r.count}
                  <span className="sr-only"> {r.count === 1 ? 'time' : 'times'}</span>
                </span>
              </div>
              {r.examples.length > 0 && (
                <div className="st-rule-examples">
                  {r.examples.slice(0, 3).map((ex) => (
                    <Practice key={ex} lang={r.lang} className={MARK_CLASS[ruleMark(r.ruleId, categories)]}>
                      {ex}
                    </Practice>
                  ))}
                </div>
              )}
              <div className="st-rule-foot">
                <span>last seen {ago(r.lastAt)}</span>
                {r.gym && (
                  <PracticeLink to={gymHref(r.gym)} practiceLang={r.gym.lang} className="st-rule-link">
                    Drill{' '}
                    <bdi lang={r.gym.lang}>{r.gym.title}</bdi>{' '}
                    in the gym
                  </PracticeLink>
                )}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="st-empty-line">No rules have fired yet. Write something in write or take a dictation in parrot says, and the repeat offenders turn up here.</p>
      )}
      {rules.length > SHOW && <p className="st-note">{plural(rules.length - SHOW, 'more rule')} with fewer hits.</p>}
    </section>
  )
}
