import { LANG_TAGS, isRtl } from '@/types'
import type { ProofText } from '@/content/proofread'
import { Link } from '@/lib/router'
import type { TextProgress } from './store'

interface Props {
  id: string
  texts: ProofText[]
  current: string
  progress: Record<string, TextProgress>
  onPick: () => void
}

/** Every text in the language, with how it went last time. */
export function TextList({ id, texts, current, progress, onPick }: Props) {
  return (
    <ol className="fix-list" id={id} aria-label="All texts">
      {texts.map((t) => {
        const p = progress[t.id]
        const status = p ? (p.perfect ? 'all fixed' : `best ${p.best} of ${p.total}`) : 'not tried'
        return (
          <li key={t.id}>
            <Link
              to={`/fix?text=${encodeURIComponent(t.id)}`}
              className={`fix-list-row${t.id === current ? ' is-current' : ''}${p?.perfect ? ' is-done' : ''}`}
              aria-current={t.id === current ? 'true' : undefined}
              onClick={onPick}
            >
              <span className="fix-list-title" lang={LANG_TAGS[t.lang]} dir={isRtl(t.lang) ? 'rtl' : undefined}>
                {t.title}
              </span>
              <span className="fix-list-level muted">level {t.difficulty}</span>
              <span className="fix-list-count muted tabular">{t.mistakes.length} mistakes</span>
              <span className="fix-list-status tabular">{status}</span>
            </Link>
          </li>
        )
      })}
    </ol>
  )
}
