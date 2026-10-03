import { useMemo, useState } from 'react'
import { navigate } from '@/lib/router'
import { useSettings } from '@/state/settings'
import { currentStreak, useStats } from '@/state/stats'
import { dayKey } from '@/lib/id'
import { LANG_NAMES, type TypingResult } from '@/types'
import { Stat } from '@/components/ui'
import { TypingSurface } from '@/features/typing/TypingSurface'
import { ResultView } from '@/features/typing/ResultView'
import { recordTypingRun } from '@/features/typing/recordRun'
import { DAILY_MS, dailyChallenge, dailyConfig, dailyRuns, formatDay } from './daily'
import { repairHref } from './repair'
import './practice.css'

type Phase = { kind: 'typing' } | { kind: 'result'; result: TypingResult; isPb: boolean; before: number | undefined }

export default function DailyPage() {
  const lang = useSettings((s) => s.lang)
  const stopOnError = useSettings((s) => s.stopOnError)
  const showKeyboard = useSettings((s) => s.showKeyboard)
  const sessions = useStats((s) => s.sessions)
  const days = useStats((s) => s.days)
  const [day] = useState(() => dayKey())
  const [attempt, setAttempt] = useState(0)
  const [phase, setPhase] = useState<Phase>({ kind: 'typing' })

  const challenge = useMemo(() => dailyChallenge(lang, day), [lang, day])
  const runs = dailyRuns(sessions, lang, day)
  const best = runs[0]
  const streak = currentStreak(days)
  const playedToday = days.includes(day)

  const again = () => {
    setAttempt((a) => a + 1)
    setPhase({ kind: 'typing' })
  }

  const onFinish = (result: TypingResult) => {
    const before = best?.wpm
    const { isPb } = recordTypingRun(result, 'daily', dailyConfig(day))
    setPhase({ kind: 'result', result, isPb, before })
  }

  const streakSub = streak === 0 ? 'today can be day one' : playedToday ? 'today included' : 'a run today keeps it'

  return (
    <div className={`page daily${phase.kind === 'typing' ? ' is-typing' : ''}`}>
      <header className="page-head daily-head">
        <div>
          <p className="daily-date muted tabular">{formatDay(day)}</p>
          <h1 className="page-title">Daily challenge</h1>
          <p className="page-lede">
            45 seconds of {LANG_NAMES[lang]}, the same text all day, so a second go is a fair rematch. It opens with a line from one of the stories.
          </p>
        </div>
        <div className="daily-stats">
          <Stat label="streak" value={`${streak} ${streak === 1 ? 'day' : 'days'}`} sub={streakSub} />
          <Stat
            label="today’s best"
            value={best?.wpm !== undefined ? `${Math.round(best.wpm)} wpm` : 'none yet'}
            sub={best ? `${Math.round(best.accuracy ?? 0)}% accuracy, ${runs.length} ${runs.length === 1 ? 'try' : 'tries'}` : 'nothing to beat'}
          />
        </div>
      </header>

      {phase.kind === 'typing' ? (
        <TypingSurface
          key={`daily:${day}:${lang}:${attempt}`}
          words={challenge.words}
          lang={lang}
          timeLimitMs={DAILY_MS}
          onFinish={onFinish}
          onRestart={again}
          resetKey={`daily:${day}:${lang}:${attempt}`}
          stopOnError={stopOnError}
          showKeyboard={showKeyboard}
          showLiveStats
          autoFocus
        />
      ) : (
        <ResultView
          result={phase.result}
          title={runs.length > 1 ? `Try ${runs.length} today` : 'First try today'}
          configLabel={dailyConfig(day)}
          isPb={phase.isPb}
          onAgain={again}
          onPractice={(ws) => navigate(repairHref(ws))}
        >
          <p className="daily-note tabular">{dailyNote(phase.result.wpm, phase.before, streak)}</p>
        </ResultView>
      )}
    </div>
  )
}

function dailyNote(wpm: number, before: number | undefined, streak: number): string {
  const days = streak === 1 ? 'Day one of a streak.' : `${streak} days in a row.`
  if (before === undefined) return `First go today. ${days}`
  const diff = Math.round(wpm) - Math.round(before)
  if (diff > 0) return `${diff} wpm better than your earlier best today. ${days}`
  if (diff === 0) return `Exactly your earlier best today. ${days}`
  return `${-diff} wpm off your best today (${Math.round(before)}). ${days}`
}
