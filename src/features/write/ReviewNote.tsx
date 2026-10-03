import { useMemo, type ReactNode } from 'react'
import type { Lang } from '@/types'
import { useStats } from '@/state/stats'

interface Props {
  lang: Lang
}

const nl = (t: string) => (
  <span className="wp-form" lang="nl">
    {t}
  </span>
)
const en = (t: string) => (
  <span className="wp-form" lang="en">
    {t}
  </span>
)
const ar = (t: string) => (
  <span className="wp-form" lang="ar" dir="rtl">
    {t}
  </span>
)

/** What usually goes wrong in each language, for writers without a history yet. */
const TIPS: Record<Lang, ReactNode> = {
  nl: (
    <>
      Worth a second look: every verb after {nl('ik')}, {nl('jij')} and {nl('hij')} (d, t or dt?), and {nl('ei')} or {nl('ij')}.
    </>
  ),
  en: (
    <>
      Worth a second look: {en('its')} or {en('it’s')}, {en('then')} or {en('than')}, and every {en('since')}.
    </>
  ),
  ar: (
    <>
      Worth a second look: hamza seats, {ar('ة')} or {ar('ه')}, {ar('ى')} or {ar('ي')}, and the hidden alif in {ar('هذا')} and {ar('لكن')}.
    </>
  ),
}

/**
 * Side note during self-review (the strip above the editor already says how many lines are marked):
 * what to do, why the font changed, and where to look first.
 */
export function ReviewNote({ lang }: Props) {
  const rules = useStats((s) => s.rules[lang])
  const usual = useMemo(
    () =>
      Object.values(rules ?? {})
        .filter((r) => r.count >= 2)
        .sort((a, b) => b.count - a.count)
        .slice(0, 2),
    [rules],
  )
  return (
    <>
      <p>Fix what you can find, then reveal.</p>
      <p>The font changed on purpose: your own words look less familiar, so mistakes stand out.</p>
      {usual.length > 0 ? (
        <p>
          Your usual suspects:{' '}
          {usual.map((r, i) => (
            <span key={r.ruleId}>
              {i > 0 && ' and '}
              <bdi className="wp-form" dir="ltr">
                {r.title}
              </bdi> <span className="tabular">({r.count}x)</span>
            </span>
          ))}
          .
        </p>
      ) : (
        <p>{TIPS[lang]}</p>
      )}
    </>
  )
}
