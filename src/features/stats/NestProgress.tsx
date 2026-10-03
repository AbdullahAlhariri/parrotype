import { LANGS, type Lang } from '@/types'
import { BOX_DAYS } from '@/state/nest'
import { useSettings } from '@/state/settings'
import type { LangFilter, NestSummary } from './aggregate'
import { daysBetween, plural } from './format'
import { LANG_ADJ, PracticeLink, SectionHead } from './parts'

const REVIEW = '/practice?mode=nest'

const interval = (days: number) => (days === 0 ? 'today' : days === 7 ? '1 week' : plural(days, 'day'))
const comesBack = (days: number) => (days === 0 ? 'back the same day' : `back after ${interval(days)}`)

function nextDue(at: number, now = Date.now()) {
  const d = daysBetween(now, at)
  if (d <= 0) return 'later today'
  if (d === 1) return 'tomorrow'
  return `in ${d} days`
}

/** Leitner boxes 1 to 5 of the mistake nest, plus what is due now. */
export function NestProgress({ summary, filter }: { summary: NestSummary; filter: LangFilter }) {
  const current = useSettings((s) => s.lang)
  const max = Math.max(1, ...summary.boxes)
  // a review runs in one language, so the all-languages view gets one link per language with work due
  const dueLangs: Lang[] = LANGS.filter((l) => summary.dueByLang[l] > 0).sort((a, b) => Number(b === current) - Number(a === current))
  const split = filter === 'all' && dueLangs.length > 1

  return (
    <section className="st-section st-nest" aria-labelledby="st-nest-title">
      <SectionHead
        id="st-nest-title"
        title="Mistake nest"
        note={
          summary.total ? 'A right answer moves a word up a box. A miss sends it back to box 1. Right in box 5 and it leaves the nest.' : undefined
        }
      />
      {summary.total ? (
        <>
          <ol className="st-nest-boxes">
            {summary.boxes.map((count, i) => (
              <li key={i} aria-label={`Box ${i + 1}: ${plural(count, 'item')}, ${comesBack(BOX_DAYS[i])}`}>
                <span className="st-nest-count tabular" aria-hidden="true">
                  {count}
                </span>
                <span className="st-nest-bar" aria-hidden="true">
                  <span style={{ height: `${count ? Math.max(6, (count / max) * 100) : 0}%` }} />
                </span>
                <span className="st-nest-box" aria-hidden="true">
                  box {i + 1}
                </span>
                <span className="st-nest-int" aria-hidden="true">
                  {interval(BOX_DAYS[i])}
                </span>
              </li>
            ))}
          </ol>
          <div className="st-nest-foot">
            {summary.due ? (
              <>
                <p>
                  <strong className="tabular">{summary.due}</strong> due now
                  {split && ` (${dueLangs.map((l) => `${summary.dueByLang[l]} ${LANG_ADJ[l]}`).join(', ')})`}, {summary.total} in the nest.
                </p>
                <div className="st-nest-actions">
                  {split ? (
                    dueLangs.map((l) => (
                      <PracticeLink key={l} to={REVIEW} practiceLang={l} className="btn btn-subtle btn-sm">
                        Review {summary.dueByLang[l]} {LANG_ADJ[l]}
                      </PracticeLink>
                    ))
                  ) : (
                    <PracticeLink to={REVIEW} practiceLang={dueLangs[0] ?? current} className="btn btn-subtle btn-sm">
                      Review {summary.due === 1 ? 'it' : `these ${summary.due}`}
                    </PracticeLink>
                  )}
                </div>
              </>
            ) : (
              <p>Nothing due. {summary.nextDueAt ? `The next one comes back ${nextDue(summary.nextDueAt)}.` : ''}</p>
            )}
          </div>
        </>
      ) : (
        <p className="st-empty-line">The nest is empty. Words you get wrong land here and come back for review.</p>
      )}
    </section>
  )
}
