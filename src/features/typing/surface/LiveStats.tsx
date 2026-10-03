import { useEffect, useState } from 'react'
import type { TypingSession } from '@/engine'

interface Props {
  session: TypingSession
  started: boolean
  finished: boolean
  wordIndex: number
  total: number
  timeLimitMs?: number
  show: boolean
  caps: boolean
}

/**
 * The small live line above the words: seconds left (time mode) or words done, plus live
 * accuracy, in --main. Ticks on its own timer so the words never re-render for it.
 */
export function LiveStats({ session, started, finished, wordIndex, total, timeLimitMs, show, caps }: Props) {
  const [, tick] = useState(0)
  useEffect(() => {
    if (!started || finished || !show) return
    const id = window.setInterval(() => tick((n) => n + 1), 200)
    return () => window.clearInterval(id)
  }, [started, finished, show])

  const now = performance.now()
  const elapsed = session.elapsed(now)
  const progress = timeLimitMs ? String(Math.max(0, Math.ceil((timeLimitMs - elapsed) / 1000))) : `${Math.min(wordIndex, total)}/${total}`
  const acc = Math.floor(session.liveAccuracy())

  return (
    <div className="ts-live">
      <span className={`ts-live-stats tabular${show && started && !finished ? ' is-on' : ''}`} aria-hidden="true">
        <span className="ts-live-main">{progress}</span>
        <span className="ts-live-acc">{acc}%</span>
      </span>
      {caps && (
        <span className="ts-caps" role="status">
          Caps Lock is on.
        </span>
      )}
    </div>
  )
}
