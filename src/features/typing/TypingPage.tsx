import { useCallback, useMemo, useState } from 'react'
import type { TypingResult } from '@/types'
import { useSettings } from '@/state/settings'
import { useStats } from '@/state/stats'
import { navigate } from '@/lib/router'
import { TypingSurface } from './TypingSurface'
import { ResultView } from './ResultView'
import { recordTypingRun } from './recordRun'
import { ConfigBar } from './page/ConfigBar'
import { configLabel, loadConfig, moreWords, newRun, repeatRun, saveConfig, type Run, type TypingConfig } from './page/config'
import { pickTip } from './page/tips'
import './page.css'

interface Done {
  result: TypingResult
  isPb: boolean
  label: string
  run: Run
}

/** The classic test on '/': config bar, three lines of words, results. */
export default function TypingPage() {
  const lang = useSettings((s) => s.lang)
  const stopOnError = useSettings((s) => s.stopOnError)
  const misses = useStats((s) => s.words[lang])

  const [config, setConfig] = useState<TypingConfig>(loadConfig)
  const [run, setRun] = useState<Run>(() => newRun(config, lang))
  const [runLang, setRunLang] = useState(lang)
  const [done, setDone] = useState<Done | null>(null)
  const [running, setRunning] = useState(false)
  const [tipN, setTipN] = useState(() => Math.floor(Math.random() * 1000))

  const start = useCallback(
    (c: TypingConfig, prev?: Run) => {
      setRun(newRun(c, lang, Math.random, prev?.quote?.text))
      setDone(null)
      setRunning(false)
      setTipN((n) => n + 1)
    },
    [lang],
  )

  // the language switch lives in the header: a new language means a new run
  if (runLang !== lang) {
    setRunLang(lang)
    setRun(newRun(config, lang))
    setDone(null)
    setRunning(false)
  }

  const changeConfig = (c: TypingConfig) => {
    setConfig(c)
    saveConfig(c)
    start(c, run)
  }

  const finish = (result: TypingResult) => {
    const label = configLabel(config)
    // an AFK run (a key or two, then the clock ran out) is shown but not stored
    const typed = result.chars.correct + result.chars.incorrect + result.chars.extra
    const isPb = typed >= 3 ? recordTypingRun(result, 'typing', label).isPb : false
    setDone({ result, isPb, label, run })
    setRunning(false)
  }

  const needMore = useMemo(() => (config.mode === 'time' ? () => moreWords(config, lang) : undefined), [config, lang])
  const tip = useMemo(() => pickTip(lang, tipN, misses), [lang, tipN, misses])

  if (done) {
    const q = done.run.quote
    return (
      <div className="tp tp--result">
        <ResultView
          key={done.run.id}
          result={done.result}
          configLabel={done.label}
          isPb={done.isPb}
          onAgain={() => start(config, done.run)}
          onPractice={(words) => navigate(`/practice?words=${encodeURIComponent(words.join(','))}`)}
        >
          {q && (
            <p className="tp-source">
              <span className="tp-source-by">{q.source}</span>
              {q.meaning && <span className="tp-meaning">{q.meaning}</span>}
            </p>
          )}
          <button
            type="button"
            className="tp-link"
            onClick={() => {
              setRun(repeatRun(done.run))
              setDone(null)
            }}
          >
            Same text again
          </button>
        </ResultView>
      </div>
    )
  }

  return (
    <div className={`tp${running ? ' is-running' : ''}`}>
      <ConfigBar config={config} onChange={changeConfig} />
      <TypingSurface
        words={run.words}
        lang={lang}
        timeLimitMs={run.timeLimitMs}
        resetKey={run.id}
        onNeedMoreWords={needMore}
        onFinish={finish}
        onRestart={() => start(config, run)}
        onStart={() => setRunning(true)}
        stopOnError={stopOnError ? 'letter' : 'off'}
        label={config.mode === 'quote' ? 'Type the quote' : 'Type the words'}
      />
      <p className="tp-tip" aria-live="off">
        {tip}
      </p>
    </div>
  )
}
