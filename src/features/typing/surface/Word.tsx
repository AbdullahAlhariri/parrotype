import { memo } from 'react'
import type { WordView } from '@/engine'
import { buildRuns } from './arabicRuns'

interface Props {
  view: WordView
  index: number
  rtl: boolean
  active: boolean
  /** dead key / IME composition in progress at [composeAt, composeAt + composeLen) */
  composeAt?: number
  composeLen?: number
  /** stop on error: the letter a wrong key was refused at */
  blockedAt?: number
}

/**
 * One target word. Memoised on the session's WordView object, which only changes identity
 * when that word changes, so a keystroke re-renders just the active word.
 * LTR: one inline span per letter (exact caret maths, per-letter underline).
 * RTL (Arabic): inline runs with zero-width joiners so letters keep joining.
 */
export const Word = memo(function Word({ view, index, rtl, active, composeAt = -1, composeLen = 0, blockedAt = -1 }: Props) {
  let cls = 'ts-w'
  if (view.committed && !view.correct) cls += ' ts-w--error'
  if (active) cls += ' ts-w--active'
  if (composeLen > 0) cls += ' ts-w--composing'

  if (rtl) {
    const { runs } = buildRuns(
      view.letters.map((l) => l.char),
      view.letters.map((l, i) => (i === blockedAt ? 'incorrect' : l.state)),
    )
    return (
      <div className={cls} data-wi={index}>
        {runs.map((r, i) => (
          <span key={i} className={`ts-r is-${r.state}`}>
            {r.text}
          </span>
        ))}
      </div>
    )
  }

  return (
    <div className={cls} data-wi={index}>
      {view.letters.map((l, i) => {
        let c = `ts-l is-${l.state}`
        if (composeLen > 0 && i >= composeAt && i < composeAt + composeLen) c += ' is-composing'
        if (i === blockedAt) c += ' is-blocked'
        return (
          <span key={i} className={c}>
            {l.char}
          </span>
        )
      })}
    </div>
  )
})
