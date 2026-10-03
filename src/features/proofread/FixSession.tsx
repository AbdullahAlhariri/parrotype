import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { LANG_TAGS } from '@/types'
import type { ProofText } from '@/content/proofread'
import { useStats } from '@/state/stats'
import { useNest } from '@/state/nest'
import { setTyping } from '@/lib/focus'
import { Button, Kbd } from '@/components/ui'
import { FixResult } from './FixResult'
import { countEdits, gradeProofread, sentenceAt, type ProofGrade } from './grade'
import { useFix } from './store'

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

/** Save one check: stats session, a rule hit and a nest entry per missed mistake, text progress. */
function record(text: ProofText, grade: ProofGrade, durationMs: number): boolean {
  const stats = useStats.getState()
  const missed = grade.results.filter((r) => r.status !== 'fixed')
  stats.addSession({
    mode: 'proofread',
    lang: text.lang,
    durationMs,
    config: `fix ${text.title}`,
    score: grade.fixed,
    total: grade.total,
    mistakes: missed.length + grade.introduced.length,
    accuracy: grade.total ? Math.round((grade.fixed / grade.total) * 100) : 100,
  })
  for (const r of missed) {
    const m = r.mistake
    const ruleId = m.pack ? `gym.${m.pack}` : `fix.${text.lang}.${m.rule}`
    const target = sentenceAt(text.corrected, m.fixAt)
    stats.addRuleHit(text.lang, ruleId, m.title, target)
    useNest.getState().add({
      lang: text.lang,
      kind: 'sentence',
      target,
      wrong: [sentenceAt(text.text, m.at)],
      ruleId,
      hint: m.ruleNote.en,
    })
  }
  return useFix.getState().record(text.id, grade.fixed, grade.total, grade.introduced.length)
}

interface Props {
  text: ProofText
  onNext: () => void
}

/** One text: edit it, check it, see what happened. Always ends on the corrected text. */
export function FixSession({ text, onNext }: Props) {
  const [value, setValue] = useState(text.text)
  const [started, setStarted] = useState(() => Date.now())
  const [result, setResult] = useState<{ grade: ProofGrade; durationMs: number; firstPerfect: boolean } | null>(null)
  const area = useRef<HTMLTextAreaElement>(null)
  const edits = useMemo(() => countEdits(text.text, value), [text.text, value])
  const n = text.mistakes.length

  // the editor grows with its text instead of scrolling inside the page
  useLayoutEffect(() => {
    const el = area.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight + 2}px`
  }, [value, result])

  const check = () => {
    setTyping(false)
    const grade = gradeProofread(text, value)
    const durationMs = Date.now() - started
    const firstPerfect = record(text, grade, durationMs)
    setResult({ grade, durationMs, firstPerfect })
    window.scrollTo({ top: 0 })
  }

  const retry = () => {
    setValue(text.text)
    setResult(null)
    setStarted(Date.now())
    requestAnimationFrame(() => area.current?.focus())
  }

  if (result) {
    return <FixResult text={text} grade={result.grade} durationMs={result.durationMs} firstPerfect={result.firstPerfect} onNext={onNext} onRetry={retry} />
  }

  return (
    <div className="fix-edit">
      <p className="fix-hidden" id="fix-count">
        <span className="fix-hidden-n tabular">{n}</span> mistakes hidden in this text. Fix them in place, then check.
      </p>
      <textarea
        ref={area}
        className="fix-editor"
        value={value}
        onChange={(e) => {
          if (document.body.dataset.typing !== 'true') setTyping(true)
          setValue(e.target.value)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            check()
          }
        }}
        lang={LANG_TAGS[text.lang]}
        aria-label={`${text.title}: text to proofread`}
        aria-describedby="fix-count"
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        data-gramm="false"
        data-gramm_editor="false"
        data-enable-grammarly="false"
        rows={6}
      />
      <div className="fix-controls">
        <Button variant="primary" onClick={check}>
          Check <Kbd className="fix-kbd-on-primary">{isMac ? '⌘' : 'ctrl'} enter</Kbd>
        </Button>
        <Button variant="ghost" onClick={retry} disabled={value === text.text}>
          Start over
        </Button>
        <span className="fix-edits tabular" aria-live="polite">
          {edits === 0 ? 'No changes yet' : `${edits} ${edits === 1 ? 'change' : 'changes'} so far`}
        </span>
      </div>
    </div>
  )
}
