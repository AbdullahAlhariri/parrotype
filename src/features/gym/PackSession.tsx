import { useState } from 'react'
import { LANG_TAGS, isRtl } from '@/types'
import { fillGap, type DrillPack } from '@/content/drills'
import { useSettings } from '@/state/settings'
import { useStats } from '@/state/stats'
import { useNest } from '@/state/nest'
import { Link } from '@/lib/router'
import { Button, Kbd, Segmented } from '@/components/ui'
import { GymRound, type RoundResult } from './GymRound'
import { RoundSummary } from './RoundSummary'
import { RulePanel } from './RulePanel'
import { isolateArabic } from './Rich'
import { explain, pickRound, ROUND_SIZE } from './round'
import { useGym } from './store'

type Stage = 'rule' | 'round' | 'summary'

/** Save a finished round everywhere it belongs: gym progress, stats, rule hits, the mistake nest. */
function record(pack: DrillPack, r: RoundResult, explainIn: 'en' | 'local'): boolean {
  const newBest = useGym.getState().recordRound(
    pack.id,
    r.outcomes.map((o) => ({ key: o.key, right: o.right })),
  )
  const total = r.outcomes.length
  const misses = r.outcomes.filter((o) => !o.right)
  const score = total - misses.length
  const stats = useStats.getState()
  stats.addSession({
    mode: 'gym',
    lang: pack.lang,
    durationMs: r.durationMs,
    config: `gym ${pack.title}`,
    score,
    total,
    mistakes: misses.length,
    accuracy: total ? Math.round((score / total) * 100) : 0,
  })
  const ruleId = `gym.${pack.id}`
  for (const o of misses) {
    const target = fillGap(o.item)
    stats.addRuleHit(pack.lang, ruleId, pack.title, target)
    useNest.getState().add({
      lang: pack.lang,
      kind: 'sentence',
      target,
      wrong: [fillGap(o.item, o.typed)],
      ruleId,
      hint: explain(o.item.hint, pack.lang, explainIn)?.text,
    })
  }
  return newBest
}

export function PackSession({ pack }: { pack: DrillPack }) {
  const ruleSeen = useGym((s) => s.packs[pack.id]?.ruleSeen ?? false)
  const choose = useGym((s) => s.choose)
  const setChoose = useGym((s) => s.setChoose)
  const explainIn = useSettings((s) => s.explainIn)
  const [stage, setStage] = useState<Stage>(ruleSeen ? 'round' : 'rule')
  const [round, setRound] = useState(0)
  const [items, setItems] = useState(() => pickRound(pack.items, useGym.getState().packs[pack.id]))
  const [result, setResult] = useState<(RoundResult & { newBest: boolean }) | null>(null)
  const [showRule, setShowRule] = useState(false)
  const rtl = isRtl(pack.lang)

  const startRound = () => {
    setItems(pickRound(pack.items, useGym.getState().packs[pack.id]))
    setRound((n) => n + 1)
    setResult(null)
    setStage('round')
  }

  const start = () => {
    useGym.getState().markRuleSeen(pack.id)
    setStage('round')
  }

  const finish = (r: RoundResult) => {
    const newBest = record(pack, r, explainIn)
    setResult({ ...r, newBest })
    setShowRule(false)
    setStage('summary')
  }

  return (
    <div className="gym-session">
      <header className="gym-session-head">
        <Link to="/gym" className="link-btn gym-back gym-fade">
          All packs
        </Link>
        <div className="gym-title-row">
          <h1 className="gym-pack-title mono-text" lang={LANG_TAGS[pack.lang]} dir={rtl ? 'rtl' : 'ltr'}>
            {pack.title}
          </h1>
          <div className="gym-tools gym-fade">
            <Segmented
              ariaLabel="Answer by"
              value={choose ? 'choose' : 'type'}
              onChange={(v) => setChoose(v === 'choose')}
              options={[
                { value: 'type', label: 'type', title: 'Type the missing word' },
                { value: 'choose', label: 'choose', title: 'Pick it with 1, 2 or 3' },
              ]}
            />
            {stage !== 'rule' && (
              <button type="button" className="link-btn gym-rule-toggle" aria-expanded={showRule} aria-controls="gym-rule" onClick={() => setShowRule((v) => !v)}>
                {showRule ? 'Hide the rule' : 'Show the rule'}
              </button>
            )}
          </div>
        </div>
        <p className="gym-blurb gym-fade">{isolateArabic(pack.blurb)}</p>
      </header>

      {stage === 'rule' && (
        <section className="gym-intro" aria-label="The rule">
          <RulePanel pack={pack} withExamples />
          <div className="gym-intro-actions">
            <Button variant="primary" size="lg" onClick={start} autoFocus>
              Start the round <Kbd className="gym-kbd-on-primary">enter</Kbd>
            </Button>
            <p className="gym-intro-note">
              {Math.min(ROUND_SIZE, pack.items.length)} sentences. Type the missing word and press enter. A slip shows the rule and asks you to type the right word once.
            </p>
          </div>
        </section>
      )}

      {stage !== 'rule' && showRule && (
        <div className="gym-rule-drawer">
          <RulePanel pack={pack} id="gym-rule" />
        </div>
      )}

      {stage === 'round' && <GymRound key={round} pack={pack} items={items} choose={choose} onFinish={finish} onRestart={startRound} />}

      {stage === 'summary' && result && <RoundSummary pack={pack} result={result} onAgain={startRound} />}
    </div>
  )
}
