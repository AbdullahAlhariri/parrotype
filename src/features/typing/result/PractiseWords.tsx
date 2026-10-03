import { useEffect, useRef } from 'react'
import { annotate } from 'rough-notation'
import { LANG_TAGS, isRtl, type Lang } from '@/types'
import { Button } from '@/components/ui'
import { useSettings } from '@/state/settings'
import { mascotName } from '@/lib/mascot'
import { practiseWords, tipGroups, type PractiseItem } from './feedback'

type RoughAnnotation = ReturnType<typeof annotate>

interface Props {
  items: PractiseItem[]
  fixed: string[]
  lang: Lang
  onPractice?: (words: string[]) => void
  /** draw the circles (once, after the chart); instant under reduced motion */
  animate: boolean
  /** ms before the circles start */
  delay?: number
}

/**
 * Wrong words, each circled by hand (rough-notation, drawn once), with what was typed shown
 * small and struck through: the correct form is the prominent one on purpose.
 */
export function PractiseWords({ items, fixed, lang, onPractice, animate, delay = 900 }: Props) {
  const listRef = useRef<HTMLUListElement>(null)
  const local = useSettings((s) => s.explainIn) === 'local'
  const tag = LANG_TAGS[lang]
  const words = practiseWords(items)
  const key = items.map((it) => it.expected).join('|')

  useEffect(() => {
    const list = listRef.current
    if (!list || !key) return
    const els = Array.from(list.querySelectorAll<HTMLElement>('.tr-word'))
    const notes: RoughAnnotation[] = els.map((el) =>
      annotate(el, { type: 'circle', animate, animationDuration: 420, padding: [4, 8], strokeWidth: 1.6, iterations: 1 }),
    )
    const timers = notes.map((note, i) => window.setTimeout(() => note.show(), animate ? delay + i * 140 : 0))
    return () => {
      timers.forEach(clearTimeout)
      notes.forEach((note) => note.remove())
    }
  }, [key, animate, delay])

  const tips = tipGroups(items)

  if (!items.length) {
    return (
      <section className="tr-practise is-empty" aria-label="Words to practise">
        <p className="tr-empty">No misspelled words this run. {mascotName(lang)} has nothing to repeat.</p>
        {fixed.length > 0 && (
          <p className="tr-fixed">
            Fixed along the way:{' '}
            <span className="mono-text" lang={tag}>
              {fixed.slice(0, 8).join(', ')}
            </span>
          </p>
        )}
      </section>
    )
  }

  return (
    <section className="tr-practise" aria-labelledby="tr-practise-title">
      <h3 id="tr-practise-title" className="tr-h">
        Words to practise
      </h3>
      <ul ref={listRef} className="tr-words">
        {items.map((it) => (
          <li key={it.expected} className="tr-item" title={it.label ? (local && it.label.tip.local) || it.label.tip.en : undefined}>
            <span className="tr-word-wrap">
              <span className="tr-word mono-text" lang={tag} dir="auto">
                {it.expected}
              </span>
            </span>
            <span className="tr-typed">
              <span className="sr-only">you typed </span>
              <s className="mono-text" lang={tag} dir="auto">
                {it.typed}
              </s>
            </span>
            <span className="tr-kind">{it.name}</span>
          </li>
        ))}
      </ul>
      {tips.length > 0 && (
        <ul className="tr-tips">
          {tips.map((t) => (
            <li key={t.name}>
              <span className="tr-tip-name">{t.name}.</span>{' '}
              {local && t.tipLocal ? (
                <span lang={tag} dir={isRtl(lang) ? 'rtl' : undefined}>
                  {t.tipLocal}
                </span>
              ) : (
                t.tip
              )}
            </li>
          ))}
        </ul>
      )}
      {onPractice && words.length > 0 && (
        <Button className="tr-practise-btn" onClick={() => onPractice(words)}>
          {words.length === 1 ? 'Practise this word' : `Practise these ${words.length} words`}
        </Button>
      )}
    </section>
  )
}
