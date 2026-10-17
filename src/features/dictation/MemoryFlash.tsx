import { Fragment, useEffect } from 'react'
import { LANG_TAGS, isRtl, type Lang } from '@/types'
import { flashParts } from './logic/flash'

interface Props {
  text: string
  lang: Lang
  /** ms the sentence stays visible */
  ms: number
  /** changes on every flash, restarting the timer */
  flashKey: number
  onHidden: () => void
  /** minimal pairs: the pair word in this sentence and all members of its set */
  target?: string
  choices?: string[]
}

/**
 * Memory mode: the sentence shows in the answer field's place for a few seconds, the field's
 * underline draining as a timer, then it hides and you type it from memory. In a minimal pair
 * the pair word shows as both spellings, so the flash does not give the answer away.
 */
export function MemoryFlash({ text, lang, ms, flashKey, onHidden, target, choices }: Props) {
  useEffect(() => {
    const t = window.setTimeout(onHidden, ms)
    return () => clearTimeout(t)
  }, [flashKey, ms, onHidden])

  return (
    <div className="dict-flash" dir={isRtl(lang) ? 'rtl' : 'ltr'} aria-live="polite">
      <p className="dict-flash-text mono-text" lang={LANG_TAGS[lang]}>
        {flashParts(text, target, choices).map((p, i) =>
          p.kind === 'text' ? (
            <Fragment key={i}>{p.text}</Fragment>
          ) : (
            <span key={i} className="dict-flash-choice">
              {p.options.map((o, j) => (
                <Fragment key={o}>
                  {j > 0 && (
                    <>
                      <span className="dict-flash-or" aria-hidden="true">
                        /
                      </span>
                      <span className="visually-hidden"> or </span>
                    </>
                  )}
                  {o}
                </Fragment>
              ))}
            </span>
          ),
        )}
      </p>
      <span key={flashKey} className="dict-flash-timer" style={{ animationDuration: `${ms}ms` }} aria-hidden="true" />
    </div>
  )
}
