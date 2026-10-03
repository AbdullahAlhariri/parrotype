import { useEffect } from 'react'
import { LANG_TAGS, isRtl, type Lang } from '@/types'

interface Props {
  text: string
  lang: Lang
  /** ms the sentence stays visible */
  ms: number
  /** changes on every flash, restarting the timer */
  flashKey: number
  onHidden: () => void
}

/**
 * Memory mode: the sentence shows for a few seconds with a thin draining line under it,
 * then hides and you type it from memory.
 */
export function MemoryFlash({ text, lang, ms, flashKey, onHidden }: Props) {
  useEffect(() => {
    const t = window.setTimeout(onHidden, ms)
    return () => clearTimeout(t)
  }, [flashKey, ms, onHidden])

  return (
    <div className="dict-flash" aria-live="polite">
      <p className="dict-flash-text mono-text" lang={LANG_TAGS[lang]} dir={isRtl(lang) ? 'rtl' : 'ltr'}>
        {text}
      </p>
      <span key={flashKey} className="dict-flash-timer" style={{ animationDuration: `${ms}ms` }} aria-hidden="true" />
    </div>
  )
}
