import { LANG_NAMES, LANG_TAGS, isRtl, type Lang } from '@/types'
import { splitGap, type DrillItem, type DrillPack } from '@/content/drills'
import { useSettings } from '@/state/settings'
import { Segmented } from '@/components/ui'
import { RuleText } from './Rich'
import { explain } from './round'

/** Up to three example sentences with different hints, so the examples show the contrast. */
function examples(items: DrillItem[]): DrillItem[] {
  const seen = new Set<string>()
  const out: DrillItem[] = []
  for (const it of items) {
    const key = it.hint?.en ?? it.answer
    if (seen.has(key)) continue
    seen.add(key)
    out.push(it)
    if (out.length === 3) break
  }
  return out
}

export function Example({ item, lang }: { item: DrillItem; lang: DrillPack['lang'] }) {
  const [before, after] = splitGap(item.sentence)
  return (
    <span className="mono-text" lang={LANG_TAGS[lang]} dir={isRtl(lang) ? 'rtl' : 'ltr'}>
      {before}
      <mark className="gym-answer">{item.answer}</mark>
      {after}
    </span>
  )
}

/**
 * Which language explanations come in: English or the practice language (Dutch, Arabic).
 * This is the explanation language only; the practice language changes in the header.
 */
export function ExplainSwitch({ lang }: { lang: Lang }) {
  const explainIn = useSettings((s) => s.explainIn)
  const set = useSettings((s) => s.set)
  if (lang === 'en') return null
  return (
    <Segmented
      ariaLabel="Explanations in"
      value={explainIn}
      onChange={(v) => set('explainIn', v)}
      options={[
        { value: 'en', label: 'English' },
        { value: 'local', label: LANG_NAMES[lang], lang: LANG_TAGS[lang] },
      ]}
    />
  )
}

/** The rule card: shown before a pack's first round, and on demand later ("Show the rule"). */
export function RulePanel({ pack, withExamples = false, id }: { pack: DrillPack; withExamples?: boolean; id?: string }) {
  const explainIn = useSettings((s) => s.explainIn)
  const rule = explain(pack.rule, pack.lang, explainIn)
  if (!rule) return null
  return (
    <div className="gym-rule" id={id}>
      <div className="gym-rule-top">
        <span className="gym-rule-label">The rule</span>
        {pack.rule.local && <ExplainSwitch lang={pack.lang} />}
      </div>
      <RuleText text={rule.text} lang={rule.lang} exampleLang={pack.lang} />
      {withExamples && (
        <ul className="gym-examples" aria-label="Examples">
          {examples(pack.items).map((it) => (
            <li key={it.sentence}>
              <Example item={it} lang={pack.lang} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
