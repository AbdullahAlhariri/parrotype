import type { ReactNode } from 'react'
import { Segmented } from '@/components/ui'
import { useSettings } from '@/state/settings'
import { LANG_TAGS, isRtl, type Issue, type Lang } from '@/types'
import { expectedGlyphs, typedGlyphs, type Glyph, type Grade, type GradedToken, type HintLevel } from './logic/grade'
import { explainTokens, type ExplainIn } from './logic/explain'
import type { DictationItem } from './logic/items'
import type { ItemState } from './logic/ladder'
import { nextHintLabel } from './logic/ladder'
import { lineSegments } from './logic/render'

/* ------------------------------------------------------------------ */
/* Glyph rendering                                                     */
/* ------------------------------------------------------------------ */

/** Runs of plain letters stay one text node, so Arabic keeps its joining forms. */
function Glyphs({ glyphs }: { glyphs: Glyph[] }) {
  const out: ReactNode[] = []
  let run = ''
  const flush = () => {
    if (run) out.push(run)
    run = ''
  }
  glyphs.forEach((g, i) => {
    if (g.kind === 'ok') {
      run += g.ch
      return
    }
    flush()
    if (g.kind === 'missing') {
      out.push(<span key={i} className="g-gap" aria-label="missing letter" role="img" />)
    } else if (g.kind === 'extra') {
      out.push(
        <span key={i} className="g-extra">
          {g.ch === ' ' ? '␣' : g.ch}
          <span className="visually-hidden"> (extra)</span>
        </span>,
      )
    } else {
      out.push(
        <span key={i} className={g.kind === 'wrong' ? 'g-wrong' : 'g-fixed'}>
          {g.ch}
        </span>,
      )
    }
  })
  flush()
  return <>{out}</>
}

function TypedToken({ t, level }: { t: GradedToken; level: HintLevel }) {
  if (t.status === 'ok' || t.punct) return <>{t.op.typed}</>
  if (level <= 1) {
    if (t.status === 'missing') return <span className="w-missing" role="img" aria-label="a word is missing here" />
    return (
      <span className="w-wrong">
        {t.op.typed}
        <span className="visually-hidden"> (check this word)</span>
      </span>
    )
  }
  return (
    <span className={`w-marked ${t.status === 'missing' ? 'is-missing' : ''}`}>
      <Glyphs glyphs={typedGlyphs(t, level)} />
    </span>
  )
}

/** What the user typed, marked as far as the hint level allows. */
export function AttemptLine({ grade, level, lang, quiet }: { grade: Grade; level: HintLevel; lang: Lang; quiet?: boolean }) {
  return (
    <p className={`dict-attempt mono-text ${quiet ? 'is-quiet' : ''}`} lang={LANG_TAGS[lang]} dir={isRtl(lang) ? 'rtl' : 'ltr'}>
      {lineSegments(grade, 'typed').map((s, i) => (s.kind === 'gap' ? s.text : <TypedToken key={i} t={s.token} level={level} />))}
    </p>
  )
}

/** The target sentence, with the letters the user missed marked. */
export function AnswerLine({ grade, lang }: { grade: Grade; lang: Lang }) {
  return (
    <p className="dict-answer mono-text" lang={LANG_TAGS[lang]} dir={isRtl(lang) ? 'rtl' : 'ltr'}>
      {lineSegments(grade, 'expected').map((s, i) =>
        s.kind === 'gap' ? (
          s.text
        ) : s.token.status === 'ok' || s.token.punct ? (
          s.token.op.expected
        ) : (
          <span key={i} className="w-fixed">
            <Glyphs glyphs={expectedGlyphs(s.token)} />
          </span>
        ),
      )}
    </p>
  )
}

/* ------------------------------------------------------------------ */
/* The rule                                                            */
/* ------------------------------------------------------------------ */

const LOCAL_NAME: Record<Lang, string> = { nl: 'Nederlands', en: 'English', ar: 'العربية' }

function RuleList({ grade, issues, item, solved }: { grade: Grade; issues: Issue[]; item: DictationItem; solved: boolean }) {
  const lang = item.lang
  const explainIn = useSettings((s) => s.explainIn) as ExplainIn
  const setSetting = useSettings((s) => s.set)
  const rows = explainTokens(grade, issues, lang, explainIn)
  const local = explainIn === 'local' && lang !== 'en'
  const note = item.note ? ((local ? item.note.local : undefined) ?? item.note.en) : undefined
  const noteDir = local && lang === 'ar' ? 'rtl' : 'ltr'
  const textLang = local ? LANG_TAGS[lang] : 'en'
  if (!rows.length && !(note && solved)) return null
  return (
    <section className="dict-rules" aria-label="The rule">
      <div className="dict-rules-head">
        <h3>{solved ? 'What went wrong' : 'The rule'}</h3>
        {lang !== 'en' && (
          <Segmented
            ariaLabel="Explanation language"
            className="dict-explain-in"
            value={explainIn}
            onChange={(v) => setSetting('explainIn', v)}
            options={[
              { value: 'en', label: 'English' },
              { value: 'local', label: LOCAL_NAME[lang] },
            ]}
          />
        )}
      </div>
      {rows.length > 0 && (
        <ul className="dict-rule-rows">
          {rows.map((r) => (
            <li key={r.key} className="dict-rule">
              <span className="dict-rule-word mono-text" lang={LANG_TAGS[lang]} dir={isRtl(lang) ? 'rtl' : 'ltr'}>
                {solved && r.token.status !== 'extra' ? <Glyphs glyphs={expectedGlyphs(r.token)} /> : <TypedToken t={r.token} level={2} />}
              </span>
              <span className="dict-rule-name">{r.name}</span>
              <div className="dict-rule-body" lang={textLang} dir={noteDir}>
                {/* before the answer only the general rule; after it, what exactly went wrong */}
                {r.rule && <p>{r.rule}</p>}
                {solved && r.detail && (
                  <p className="muted small" lang="en" dir="ltr">
                    {r.detail}
                  </p>
                )}
                {solved &&
                  r.issues.map((i) => (
                    <p key={i.ruleId} className="dict-rule-check">
                      {i.message}
                    </p>
                  ))}
              </div>
            </li>
          ))}
        </ul>
      )}
      {note && solved && (
        <p className="dict-note" lang={textLang} dir={noteDir}>
          <span className="dict-note-label">{local && lang === 'nl' ? 'In deze zin' : local ? 'في هذه الجملة' : 'In this sentence'}</span> {note}
        </p>
      )}
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Feedback panel                                                      */
/* ------------------------------------------------------------------ */

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** One line about the latest check, also announced to screen readers by the run. */
export function statusText(s: ItemState, item: DictationItem): string {
  const g = s.grade
  const first = s.first
  if (!g || !first) return ''
  const firstScore = `${first.correct} of ${first.total}`
  if (s.phase === 'done') {
    if (s.attempts === 1 && s.hint === 0) {
      if (item.target) return first.targetOk ? `${firstScore} words, and the right ${item.target.toLowerCase()}.` : `${firstScore} words.`
      return g.punctOnly ? `${firstScore} words. The punctuation differs a little, which does not count here.` : `${firstScore} words. Clean.`
    }
    if (s.hint >= 4) return `That's the one. ${firstScore} words were right the first time.`
    return `Fixed. ${firstScore} words were right the first time.`
  }
  if (s.phase === 'retype') {
    if (s.retypeMissed && g) return `Not quite. ${plural(g.wrong.length, 'word is', 'words are')} still off. Match it letter for letter.`
    return 'Here it is. Type it correctly once, then the next sentence.'
  }
  const n = g.wrong.length
  if (s.hint === 1) return `${g.correct} of ${g.total} words right. ${n === 1 ? 'The marked word is' : 'The marked words are'} off. Fix and press enter.`
  if (s.hint === 2) return 'Closer: marked letters are wrong, a gap is a missing letter, struck letters are extra.'
  return n === 1 ? 'Still one word off. Here is the rule for it.' : `Still ${n} words off. Here are the rules.`
}

interface Props {
  item: DictationItem
  state: ItemState
  /** checker issues for a checked text ([] while unknown) */
  issuesFor: (typed: string) => Issue[]
  onHint: () => void
  onReveal: () => void
}

export function DictationFeedback({ item, state, issuesFor, onHint, onReveal }: Props) {
  const g = state.grade
  if (!g || state.phase === 'answer') return null
  const lang = item.lang
  const level = state.hint
  const done = state.phase === 'done'
  const retype = state.phase === 'retype'
  const showAnswer = retype || (done && (level >= 4 || g.punctOnly))
  const ruleGrade = retype || done ? (state.first ?? g) : g
  const next = state.phase === 'feedback' ? nextHintLabel(level) : null

  return (
    <div className={`dict-feedback ${done ? 'is-done' : ''}`} data-level={level}>
      <p className="dict-status">{statusText(state, item)}</p>

      {showAnswer && <AnswerLine grade={state.first ?? g} lang={lang} />}

      {state.phase === 'feedback' && <AttemptLine grade={g} level={level} lang={lang} />}
      {retype && state.retypeMissed && <AttemptLine grade={g} level={2} lang={lang} />}
      {retype && !state.retypeMissed && state.first && (
        <div className="dict-was">
          <span className="dict-was-label">You wrote</span>
          <AttemptLine grade={state.first} level={2} lang={lang} quiet />
        </div>
      )}

      {(level >= 3 || (done && level >= 1)) && !state.first?.perfect && (
        <RuleList grade={ruleGrade} issues={issuesFor(ruleGrade.typed)} item={item} solved={done || retype} />
      )}

      {next && (
        <div className="dict-ladder">
          <button type="button" className="link-btn" onClick={onHint}>
            {next}
          </button>
          {level < 3 && (
            <button type="button" className="link-btn" onClick={onReveal}>
              Show the answer
            </button>
          )}
        </div>
      )}
    </div>
  )
}
