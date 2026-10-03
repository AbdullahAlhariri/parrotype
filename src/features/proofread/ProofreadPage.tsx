import { useState } from 'react'
import { LANG_NAMES, LANG_TAGS } from '@/types'
import { TEXTS, findText, isProofLang, type ProofLang, type ProofText } from '@/content/proofread'
import { useSettings } from '@/state/settings'
import { navigate, useQuery } from '@/lib/router'
import { Segmented } from '@/components/ui'
import { FixSession } from './FixSession'
import { TextList } from './TextList'
import { nextUp, useFix } from './store'
import './proofread.css'

const go = (t: ProofText) => navigate(`/fix?text=${encodeURIComponent(t.id)}`)

/** /fix opens the next unfinished text; /fix?text=nl-03 opens that one. */
export default function ProofreadPage() {
  const query = useQuery()
  const practiceLang = useSettings((s) => s.lang)
  const setSetting = useSettings((s) => s.set)
  const progress = useFix((s) => s.texts)
  const [listOpen, setListOpen] = useState(false)

  const asked = query.get('text')
  const fromQuery = asked ? findText(asked) : undefined
  // texts follow the practice language (Dutch while that is Arabic); a link to a text wins
  const lang: ProofLang = fromQuery?.lang ?? (isProofLang(practiceLang) ? practiceLang : 'nl')
  const texts = TEXTS[lang]
  // the default pick is made once per visit, so finishing a text doesn't swap it out underneath you
  const [fallbackId] = useState(() => nextUp(texts, progress).id)
  const text = fromQuery ?? texts.find((t) => t.id === fallbackId) ?? nextUp(texts, progress)
  const index = texts.indexOf(text)

  const pickLang = (l: ProofLang) => {
    setSetting('lang', l)
    go(nextUp(TEXTS[l], useFix.getState().texts))
  }
  const step = (d: number) => go(texts[(index + d + texts.length) % texts.length])

  return (
    <div className="page fix">
      <header className="page-head fix-page-head">
        <div>
          <h1 className="page-title">Fix it</h1>
          <p className="page-lede">Short texts with a few planted mistakes. Find them, fix them, then check. You always end on the corrected text.</p>
        </div>
        <Segmented
          ariaLabel="Texts in"
          value={lang}
          onChange={pickLang}
          options={(['nl', 'en'] as const).map((l) => ({ value: l, label: LANG_NAMES[l].toLowerCase(), lang: LANG_TAGS[l] }))}
        />
      </header>

      {practiceLang === 'ar' && !fromQuery && <p className="fix-note-ar">There are no Arabic texts yet, so here is {LANG_NAMES[lang]}.</p>}
      {asked && !fromQuery && <p className="fix-note-ar">There is no text called {asked}. Here is the next one up.</p>}

      <div className="fix-bar">
        <div className="fix-titles">
          <h2 className="fix-title" lang={LANG_TAGS[text.lang]}>
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
