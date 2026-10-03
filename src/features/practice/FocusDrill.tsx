import { useMemo, useState } from 'react'
import { navigate } from '@/lib/router'
import { useSettings } from '@/state/settings'
import { useStats } from '@/state/stats'
import { useNest } from '@/state/nest'
import { LANG_TAGS, type TypingResult } from '@/types'
import { generateDrill, weaknesses, type Weakness } from '@/engine'
import { Kbd } from '@/components/ui'
import { TypingSurface } from '@/features/typing/TypingSurface'
import { ResultView } from '@/features/typing/ResultView'
import { recordTypingRun } from '@/features/typing/recordRun'
import { DRILL_WORDS, GATE, gateNote, passesGate, unitsToWeaknesses } from './drill'
import { focusConfig } from './plan'
import { repairHref } from './repair'
import { SubHead, pct } from './parts'
import { mascotName } from '@/lib/mascot'

type Phase = { kind: 'typing' } | { kind: 'result'; result: TypingResult; isPb: boolean; note: string }

export function FocusDrill({ units }: { units: string[] }) {
  const lang = useSettings((s) => s.lang)
  // frozen for the sitting, so the chips don't shift after each run updates the stats
  const [targets] = useState<Weakness[]>(() => {
    const st = useStats.getState()
    return units.length ? unitsToWeaknesses(units, st.keys[lang], st.bigrams[lang]) : weaknesses(st.keys[lang], st.bigrams[lang], { lang }).slice(0, 3)
  })
  const [review] = useState(() =>
    useNest
      .getState()
      .due(lang)
      .filter((i) => i.kind === 'word')
      .map((i) => i.target),
  )
  const [round, setRound] = useState(0)
  const [phase, setPhase] = useState<Phase>({ kind: 'typing' })
  const [passes, setPasses] = useState(0)

  const words = useMemo(() => generateDrill(lang, targets, DRILL_WORDS, Math.random, { review }), [lang, targets, review, round])
  const config = focusConfig(targets.map((t) => t.unit))

  const again = () => {
    setRound((r) => r + 1)
    setPhase({ kind: 'typing' })
  }

  const onFinish = (result: TypingResult) => {
    const { isPb } = recordTypingRun(result, 'practice', config)
    const nextPasses = passesGate(result.accuracy) ? passes + 1 : 0
    setPasses(nextPasses)
    setPhase({ kind: 'result', result, isPb, note: gateNote(result.accuracy, nextPasses, mascotName(lang)) })
  }

  return (
    <div className={`page practice drill${phase.kind === 'typing' ? ' is-typing' : ''}`}>
      <SubHead title={targets.length ? 'Focus drill' : 'Warm-up drill'}>
        {targets.length > 0 ? (
          <div className="drill-lede">
            <ul className="weak-chips is-inline" aria-label="Drilled keys">
              {targets.map((w) => (
                <li key={w.kind + w.unit} className="weak-chip">
                  <span className="weak-chip-key" lang={LANG_TAGS[lang]}>
                    <Kbd>{w.unit}</Kbd>
                  </span>
                  {w.samples > 0 && <span className="weak-chip-rate tabular">{pct(w.errorRate)}</span>}
                </li>
              ))}
            </ul>
            <p className="page-lede">
              {DRILL_WORDS} real words built around these, mixed with common ones. Accuracy first: {GATE}% before you speed up.
            </p>
          </div>
        ) : (
          <p className="page-lede">Nothing is clearly weak yet, so this is a mixed warm-up from the 1000 most common words. {mascotName(lang)} needs about 20 tries per key before he blames one.</p>
        )}
      </SubHead>

      {phase.kind === 'typing' ? (
        <TypingSurface
          key={`drill:${round}`}
          words={words}
          lang={lang}
          onFinish={onFinish}
          onRestart={again}
          resetKey={`drill:${round}`}
          showLiveStats
          autoFocus
          label={targets.length ? 'Focus drill words' : 'Warm-up drill words'}
        />
      ) : (
        <ResultView
          result={phase.result}
          title={`Round ${round + 1}`}
          configLabel={config}
          isPb={phase.isPb}
          onAgain={again}
          onPractice={(ws) => navigate(repairHref(ws))}
        >
          <p className={`drill-gate${passesGate(phase.result.accuracy) ? ' is-pass' : ''}`}>{phase.note}</p>
        </ResultView>
      )}
    </div>
  )
}
