import { useMemo, useState } from 'react'
import { Link, navigate } from '@/lib/router'
import { useSettings } from '@/state/settings'
import { useStats } from '@/state/stats'
import { isRtl, LANG_TAGS, type TypingResult } from '@/types'
import { wordList } from '@/engine'
import { Button, Kbd } from '@/components/ui'
import { TypingSurface } from '@/features/typing/TypingSurface'
import { ResultView } from '@/features/typing/ResultView'
import { recordTypingRun } from '@/features/typing/recordRun'
import { buildContextLine, buildRepairLine, mostMissed, repairHref, repairTally, type RepairTally } from './repair'
import { SubHead, useEnterKey } from './parts'
import { mascotName } from '@/lib/mascot'

type Stage = 'line' | 'context'
type Phase = { kind: 'typing' } | { kind: 'result'; result: TypingResult; isPb: boolean; tally: RepairTally[] }

const STAGE_CONFIG: Record<Stage, string> = { line: 'word repair', context: 'word repair, in context' }

/** Word repair on the given words, or on the most-missed words from the stats. */
export function WordRepair({ words: given }: { words?: string[] }) {
  const lang = useSettings((s) => s.lang)
  const [targets] = useState(() => (given?.length ? given : mostMissed(useStats.getState().words[lang], 8).map((w) => w.word)))
  const [stage, setStage] = useState<Stage>('line')
  const [round, setRound] = useState(0)
  const [phase, setPhase] = useState<Phase>({ kind: 'typing' })
  const tag = LANG_TAGS[lang]
  const dir = isRtl(lang) ? 'rtl' : undefined

  const line = useMemo(
    () => (stage === 'line' ? buildRepairLine(targets) : buildContextLine(targets, wordList(lang, 120))),
    // a new round reshuffles the line
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stage, round, targets, lang],
  )

  if (!targets.length) {
    return (
      <div className="page practice repair">
        <SubHead title="Word repair">
          <p className="page-lede">No problem words yet. Do a few runs and {mascotName(lang)} will start a list.</p>
        </SubHead>
        <Link to="/" className="btn btn-primary btn-md">
          Take a typing test
        </Link>
      </div>
    )
  }

  const start = (s: Stage) => {
    setStage(s)
    setRound((r) => r + 1)
    setPhase({ kind: 'typing' })
  }

  const onFinish = (result: TypingResult) => {
    const { isPb } = recordTypingRun(result, 'practice', STAGE_CONFIG[stage])
    setPhase({ kind: 'result', result, isPb, tally: repairTally(targets, result.words) })
  }

  const stepLabel = stage === 'line' ? 'Step 1 of 2: each word three times, mixed up.' : 'Step 2 of 2: once more, between common words.'

  return (
    <div className={`page practice repair${phase.kind === 'typing' ? ' is-typing' : ''}`}>
      <SubHead title="Word repair">
        <p className="page-lede">{stepLabel}</p>
        <ul className="repair-targets" lang={tag} dir={dir} aria-label="Words being repaired">
          {targets.map((w) => (
            <li key={w} className="mono-text">
              {w}
            </li>
          ))}
        </ul>
      </SubHead>

      {phase.kind === 'typing' ? (
        <TypingSurface
          key={`repair:${stage}:${round}`}
          words={line}
          lang={lang}
          onFinish={onFinish}
          onRestart={() => start(stage)}
          resetKey={`repair:${stage}:${round}`}
          showLiveStats
          autoFocus
          label={stage === 'line' ? 'Word repair, three times each' : 'Word repair, in context'}
        />
      ) : (
        <ResultView
          result={phase.result}
          title={stage === 'line' ? 'Three times each' : 'In context'}
          configLabel={STAGE_CONFIG[stage]}
          isPb={phase.isPb}
          onAgain={() => start(stage)}
          onPractice={(ws) => navigate(repairHref(ws))}
        >
          <RepairSummary tally={phase.tally} stage={stage} lang={tag} dir={dir} onContext={() => start('context')} onRestart={() => start('line')} />
        </ResultView>
      )}
    </div>
  )
}

interface SummaryProps {
  tally: RepairTally[]
  stage: Stage
  lang: string
  dir?: 'rtl'
  onContext: () => void
  onRestart: () => void
}

function RepairSummary({ tally, stage, lang, dir, onContext, onRestart }: SummaryProps) {
  const shaky = tally.filter((t) => t.clean < t.total || t.total === 0)
  const clean = tally.length - shaky.length
  useEnterKey(onContext, stage === 'line')
  return (
    <div className="repair-summary">
      <p className="repair-summary-line tabular">
        {clean === tally.length
          ? stage === 'line'
            ? `All ${tally.length} words clean every time. Now the same words in a line with others.`
            : `All ${tally.length} words clean in context too. Repaired.`
          : `${clean} of ${tally.length} words clean every time.`}
      </p>
      <ul className="repair-tally" lang={lang} dir={dir}>
        {tally.map((t) => (
          <li key={t.word} className={t.clean < t.total || t.total === 0 ? 'is-shaky' : undefined}>
            <span className="mono-text">{t.word}</span>
            <span className="repair-pips" aria-label={`${t.clean} of ${t.total} clean`}>
              {Array.from({ length: Math.max(t.total, 1) }, (_, i) => (
                <i key={i} className={i < t.clean ? 'is-on' : undefined} />
              ))}
            </span>
          </li>
        ))}
      </ul>
      <div className="repair-next">
        {stage === 'line' ? (
          <>
            <Button variant="subtle" size="lg" onClick={onContext}>
              Now in context
            </Button>
            <span className="repair-enter muted small" aria-hidden="true">
              <Kbd>enter</Kbd>
            </span>
          </>
        ) : (
          <>
            <Link to="/practice" className="btn btn-primary btn-lg">
              Back to weak spots
            </Link>
            {shaky.length > 0 && shaky.length < tally.length && (
              <Link to={repairHref(shaky.map((t) => t.word))} className="btn btn-subtle btn-lg">
                Repair the {shaky.length} shaky {shaky.length === 1 ? 'one' : 'ones'}
              </Link>
            )}
            <Button variant="ghost" size="lg" onClick={onRestart}>
              Start over
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
