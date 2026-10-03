import type { AnchorHTMLAttributes, ReactNode } from 'react'
import type { Lang } from '@/types'
import { isRtl } from '@/types'
import { charDiff } from '@/engine/align'
import { Link } from '@/lib/router'
import { useSettings } from '@/state/settings'
import { signed } from './format'

export const LANG_ADJ: Record<Lang, string> = { nl: 'Dutch', en: 'English', ar: 'Arabic' }

/** Section heading with an optional one-line note and controls on the right. */
export function SectionHead({ id, title, note, children }: { id: string; title: ReactNode; note?: ReactNode; children?: ReactNode }) {
  return (
    <div className="st-head">
      <div className="st-head-text">
        <h2 id={id}>{title}</h2>
        {note && <p className="st-note">{note}</p>}
      </div>
      {children && <div className="st-head-tools">{children}</div>}
    </div>
  )
}

/** "+1.2 vs the 10 before": positive in --ok with its sign, negative stays quiet. */
export function Delta({ value, digits = 1, suffix, flat }: { value: number | null; digits?: number; suffix: string; flat: string }) {
  if (value === null) return null
  const text = signed(value, digits)
  if (text === '0') return <span className="st-delta is-flat">{flat}</span>
  return (
    <span className={`st-delta is-${value > 0 ? 'up' : 'down'}`}>
      <span className="st-delta-num">{text}</span> {suffix}
    </span>
  )
}

/**
 * A link into a practice page. Those pages take their language from settings, not from the
 * URL, so following the link switches the practice language to `practiceLang` first.
 */
export function PracticeLink({ to, practiceLang, onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; practiceLang: Lang }) {
  const setSetting = useSettings((s) => s.set)
  return (
    <Link
      to={to}
      onClick={(e) => {
        onClick?.(e)
        if (useSettings.getState().lang !== practiceLang) setSetting('lang', practiceLang)
      }}
      {...rest}
    />
  )
}

/** Practice-language text: right font, lang and direction. */
export function Practice({ lang, children, className = '' }: { lang: Lang; children: ReactNode; className?: string }) {
  return (
    <span className={`st-practice ${className}`} lang={lang} dir={isRtl(lang) ? 'rtl' : 'ltr'}>
      {children}
    </span>
  )
}

/** A wrong version of a word, with the wrong / extra / missing letters marked. */
export function TypedDiff({ expected, typed, lang }: { expected: string; typed: string; lang: Lang }) {
  const ops = charDiff(expected, typed)
  return (
    <Practice lang={lang} className="st-typed">
      <span className="sr-only">{typed}</span>
      <span aria-hidden="true">
        {ops.map((op, i) => {
          if (op.op === 'equal') return <span key={i}>{op.b}</span>
          if (op.op === 'sub')
            return (
              <span key={i} className="st-wrong">
                {op.b}
              </span>
            )
          if (op.op === 'ins') {
            // a stray space struck through would read as a dash, so show it as ␣
            return op.b === ' ' ? (
              <span key={i} className="st-extra-space" title="extra space">
                ␣
              </span>
            ) : (
              <span key={i} className="st-extra">
                {op.b}
              </span>
            )
          }
          return <span key={i} className="st-missing" title={`missing ${op.a}`} />
        })}
      </span>
    </Practice>
  )
}

export function LangTag({ lang }: { lang: Lang }) {
  return (
    <span className="st-lang" title={LANG_ADJ[lang]}>
      {lang}
    </span>
  )
}
