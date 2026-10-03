import { useState } from 'react'
import { LANG_TAGS, isRtl } from '@/types'
import { TEXTS, findText, type ProofText } from '@/content/proofread'
import { useSettings } from '@/state/settings'
import { navigate, useQuery } from '@/lib/router'
import { LANG_IN_ENGLISH } from '@/features/gym/round'
import { useFollowLang } from '@/features/gym/useFollowLang'
import { FixSession } from './FixSession'
import { TextList } from './TextList'
import { nextUp, useFix } from './store'
import './proofread.css'

const go = (t: ProofText) => navigate(`/fix?text=${encodeURIComponent(t.id)}`)

/** /fix opens the next unfinished text in the practice language; /fix?text=nl-03 opens that one. */
export default function ProofreadPage() {
  const query = useQuery()
  const practiceLang = useSettings((s) => s.lang)
  const progress = useFix((s) => s.texts)
  const [listOpen, setListOpen] = useState(false)

  const asked = query.get('text')
  const fromQuery = asked ? findText(asked) : undefined
  // texts follow the practice language; a link to a text wins until the header switch is used
  const lang = fromQuery?.lang ?? practiceLang
  const texts = TEXTS[lang]
  // the default pick is made once per language, so finishing a text doesn't swap it out underneath you
  const [fallback, setFallback] = useState(() => ({ lang, id: nextUp(texts, progress).id }))
  if (fallback.lang !== lang) setFallback({ lang, id: nextUp(texts, progress).id })
  const text = fromQuery ?? texts.find((t) => t.id === fallback.id) ?? nextUp(texts, progress)
  const index = texts.indexOf(text)
  const rtl = isRtl(text.lang)

  useFollowLang(fromQuery?.lang, (l) => go(nextUp(TEXTS[l], useFix.getState().texts)))

  const step = (d: number) => go(texts[(index + d + texts.length) % texts.length])

  return (
    <div className="page fix">
      <header className="page-head fix-page-head">
        <div>
          <h1 className="page-title">Fix it</h1>
          <p className="page-lede">
            {texts.length} short {LANG_IN_ENGLISH[lang]} texts with a few planted mistakes. Find them, fix them, then check. You always end on the corrected text.
          </p>
        </div>
      </header>

      {asked && !fromQuery && <p className="fix-notice">There is no text called {asked}. Here is the next one up.</p>}

      <div className="fix-bar">
        <div className="fix-titles">
          <h2 className="fix-title" lang={LANG_TAGS[text.lang]} dir={rtl ? 'rtl' : undefined}>
            {text.title}
          </h2>
          <p className="fix-meta">
            <span>level {text.difficulty}</span>
            <span className="tabular">
              text {index + 1} of {texts.length}
            </span>
          </p>
        </div>
        <nav className="fix-nav" aria-label="Other texts">
          <button type="button" className="link-btn" onClick={() => step(-1)}>
            previous
          </button>
          <button type="button" className="link-btn" onClick={() => step(1)}>
            next
          </button>
          <button type="button" className="link-btn" aria-expanded={listOpen} aria-controls="fix-list" onClick={() => setListOpen((v) => !v)}>
            {listOpen ? 'hide the list' : 'all texts'}
          </button>
        </nav>
      </div>

      {listOpen && <TextList id="fix-list" texts={texts} current={text.id} progress={progress} onPick={() => setListOpen(false)} />}

      <FixSession key={text.id} text={text} onNext={() => go(nextUp(texts, useFix.getState().texts, text.id))} />
    </div>
  )
}
