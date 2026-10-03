import { useEffect, useMemo, useRef, useState } from 'react'
import type { Issue, Lang } from '@/types'
import { LANG_TAGS, isRtl } from '@/types'
import { Button, Kees, Stat, toast, useReducedMotion } from '@/components/ui'
import { Link } from '@/lib/router'
import { useNest } from '@/state/nest'
import { kindLabel, type WritingPrompt } from '@/content/prompts'
import { CATEGORY_LABEL, nestItemsFrom, type RuleLine, type WriteSummary } from './lib/report'
import { excerpt, formatDuration } from './lib/text'

interface Props {
  lang: Lang
  text: string
  issues: Issue[]
  summary: WriteSummary
  words: number
  activeMs: number
  prompt?: WritingPrompt
  found: { found: number; total: number } | null
  explainIn: 'en' | 'local'
  onKeepWriting: () => void
  onNew: () => void
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** After "Finish": what went wrong, which rules fired, which words to practise, and the nest. */
export function WriteReport({ lang, text, issues, summary, words, activeMs, prompt, found, explainIn, onKeepWriting, onNew }: Props) {
  const nestItems = useMemo(() => nestItemsFrom(text, issues, lang), [text, issues, lang])
  const [added, setAdded] = useState(false)
  const rtl = isRtl(lang)
  const clean = summary.mistakes === 0
  const headRef = useRef<HTMLHeadingElement>(null)
  const topWordRef = useRef<HTMLSpanElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => headRef.current?.focus(), [])

  // A hand-drawn circle around the word to practise first. Explains, never decorates.
  useEffect(() => {
    const el = topWordRef.current
    if (!el) return
    let note: { remove: () => void } | undefined
    let live = true
    void import('rough-notation').then(({ annotate }) => {
      if (!live) return
      const color = getComputedStyle(document.documentElement).getPropertyValue('--main').trim() || 'currentColor'
      const a = annotate(el, { type: 'circle', color, strokeWidth: 1.5, padding: [4, 10], animate: !reduced, animationDuration: 600, iterations: 1 })
      a.show()
      note = a
    })
    return () => {
      live = false
      note?.remove()
    }
  }, [reduced])

  const addToNest = () => {
    const add = useNest.getState().add
    for (const it of nestItems) add(it)
    setAdded(true)
    toast(`${plural(nestItems.length, 'item')} added to your mistake nest.`, 'good')
  }

  const target = prompt?.words
  const lengthNote = target ? (words >= target ? `${words} of about ${target} words. Done.` : `${words} of about ${target} words.`) : `${plural(words, 'word')}.`
  const repeat = summary.repeat

  return (
    <section className="wr" aria-labelledby="wr-title">
      <div className="wr-side">
        <div className="wr-kees">
          <Kees
            size={112}
            mood={repeat ? 'repeat' : clean ? 'curious' : 'idle'}
            bubble={repeat ? [`${repeat}.`, `${repeat}.`, `${repeat}.`] : undefined}
            bubbleLang={LANG_TAGS[lang]}
            bubblePlacement="top"
            stayWhileTyping
          />
        </div>
        <div className="wr-stats">
          <Stat label="mistakes" value={summary.mistakes} sub={summary.hints ? `plus ${plural(summary.hints, 'style hint')}` : undefined} />
          <Stat label="words" value={words} sub={target ? `aim was about ${target}` : undefined} />
          <Stat label="time writing" value={formatDuration(activeMs)} />
        </div>
      </div>

      <div className="wr-main">
        <h2 id="wr-title" className="wr-title" tabIndex={-1} ref={headRef}>
          {!clean ? headline(summary) : cleanHeadline(summary.hints)}
        </h2>
        <p className="wr-lede">
          {lengthNote}
          {prompt ? ` Prompt: ${kindLabel(prompt.kind)}.` : ''}
          {found && found.total > 0 ? ` You found ${found.found} of ${found.total} yourself before the reveal.` : ''}
        </p>

        {!clean && (
          <>
            <div className="wr-block">
              <h3 className="wr-h">Mistakes by kind</h3>
              <ul className="wr-cats">
                {summary.byCategory.map((c) => {
                  const max = Math.max(...summary.byCategory.map((x) => x.count))
                  return (
                    <li key={c.category} className={`wr-cat wr-cat--${c.category}`}>
                      <span className="wr-cat-name">{CATEGORY_LABEL[c.category]}</span>
                      <span className="wr-cat-bar" aria-hidden="true">
                        <span style={{ transform: `scaleX(${c.count / max})` }} />
                      </span>
                      <span className="wr-cat-n tabular">{c.count}</span>
                    </li>
                  )
                })}
              </ul>
            </div>

            {summary.words.length > 0 && (
              <div className="wr-block">
                <h3 className="wr-h">Words to practise</h3>
                <ul className="wr-words" lang={LANG_TAGS[lang]} dir={rtl ? 'rtl' : 'ltr'}>
                  {summary.words.map((w, i) => (
                    <li key={w.wrong} className="wr-word">
                      <span className="wr-word-right" ref={i === 0 ? topWordRef : undefined}>
                        {w.right ?? w.wrong}
                      </span>
                      {w.right && <s className="wr-word-wrong">{w.wrong}</s>}
                      {w.count > 1 && <span className="wr-word-n tabular">{w.count}x</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {summary.rules.length > 0 && (
              <div className="wr-block">
                <h3 className="wr-h">Rules that came up</h3>
                <ul className="wr-rules">
                  {summary.rules.map((r) => (
                    <RuleItem key={r.ruleId} rule={r} text={text} lang={lang} explainIn={explainIn} />
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {summary.hintRules.length > 0 && (
          <div className="wr-block">
            <h3 className="wr-h">
              Style hints <span className="wr-h-note">not counted as mistakes</span>
            </h3>
            <ul className="wr-rules wr-rules--hints">
              {summary.hintRules.map((r) => (
                <RuleItem key={r.ruleId} rule={r} text={text} lang={lang} explainIn={explainIn} />
              ))}
            </ul>
          </div>
        )}

        <div className="wr-actions">
          {nestItems.length > 0 &&
            (added ? (
              <>
                <Button variant="subtle" disabled>
                  In your nest
                </Button>
                <Link to="/practice?mode=nest" className="btn btn-primary btn-md">
                  Practise them now
                </Link>
              </>
            ) : (
              <Button variant="primary" onClick={addToNest}>
                Add {nestItems.length === 1 ? 'this' : `these ${nestItems.length}`} to my mistake nest
              </Button>
            ))}
          <Button variant={nestItems.length || added ? 'subtle' : 'primary'} onClick={onNew}>
            New text
          </Button>
          <Button variant="ghost" onClick={onKeepWriting}>
            Keep writing
          </Button>
        </div>
      </div>
    </section>
  )
}

function cleanHeadline(hints: number) {
  if (!hints) return 'Nothing to correct. Kees read it twice and found nothing.'
  return hints === 1 ? 'No mistakes. One style hint, take it or leave it.' : `No mistakes. ${hints} style hints, take them or leave them.`
}

function headline(s: WriteSummary) {
  const cats = s.byCategory
  if (cats.length === 1) return s.mistakes === 1 ? `1 mistake: ${CATEGORY_LABEL[cats[0].category]}.` : `${s.mistakes} mistakes, all ${CATEGORY_LABEL[cats[0].category]}.`
  const parts = cats.map((c) => `${c.count} ${CATEGORY_LABEL[c.category]}`)
  return `${plural(s.mistakes, 'mistake')}: ${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}.`
}

function RuleItem({ rule, text, lang, explainIn }: { rule: RuleLine; text: string; lang: Lang; explainIn: 'en' | 'local' }) {
  const [open, setOpen] = useState(false)
  const reduced = useReducedMotion()
  const ex = rule.example
  const rep = ex.replacements[0]
  const { start, end } = excerpt(text, ex.offset, ex.offset + ex.length, 120)
  const local = explainIn === 'local'
  const explanation = (local && ex.explanationLocal) || ex.explanation
  const message = (local && ex.messageLocal) || ex.message
  const rtl = isRtl(lang)
  return (
    <li className="wr-rule">
      <div className="wr-rule-head">
        <span className="wr-rule-title">{rule.title}</span>
        {rule.count > 1 && <span className="wr-rule-n tabular">{rule.count}x</span>}
      </div>
      {rep !== undefined ? (
        <p className="wr-rule-ex" lang={LANG_TAGS[lang]} dir={rtl ? 'rtl' : 'ltr'}>
          {text.slice(start, ex.offset)}
          <mark className="wr-fix">{rep}</mark>
          {text.slice(ex.offset + ex.length, end)}
        </p>
      ) : (
        <p className="wr-rule-ex" lang={LANG_TAGS[lang]} dir={rtl ? 'rtl' : 'ltr'}>
          {text.slice(start, end)}
        </p>
      )}
      <p className="wr-rule-was">
        {rep !== undefined && (
          <>
            You wrote <s lang={LANG_TAGS[lang]}>{ex.text}</s>.{' '}
          </>
        )}
        <span lang={local && ex.messageLocal ? LANG_TAGS[lang] : 'en'}>{message}</span>
      </p>
      {explanation && (
        <>
          <button type="button" className="ip-link wr-rule-toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? 'Hide the rule' : 'Show the rule'}
          </button>
          {open && (
            <p className={`wr-rule-why${reduced ? '' : ' is-anim'}`} lang={local && ex.explanationLocal ? LANG_TAGS[lang] : 'en'}>
              {explanation}
            </p>
          )}
        </>
      )}
    </li>
  )
}
