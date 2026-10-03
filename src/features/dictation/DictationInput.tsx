import { useLayoutEffect, type KeyboardEvent, type RefObject } from 'react'
import { LANG_TAGS, isRtl, type Lang } from '@/types'

interface Props {
  ref: RefObject<HTMLTextAreaElement | null>
  value: string
  onChange: (v: string) => void
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void
  lang: Lang
  placeholder: string
  readOnly?: boolean
  /** after a wrong check: aria-invalid and a different hairline */
  invalid?: boolean
  describedBy?: string
  label: string
  /** memory mode: out of the way while the sentence flashes in its place */
  hidden?: boolean
}

const fit = (t: HTMLTextAreaElement | null) => {
  if (!t) return
  t.style.height = 'auto'
  t.style.height = `${t.scrollHeight}px`
}

/**
 * The answer field: one logical line that grows downwards, in the typing font, with every
 * browser "help" (spellcheck, autocorrect, autocapitalise) off. Newlines never get in.
 */
export function DictationInput({ ref, value, onChange, onKeyDown, lang, placeholder, readOnly, invalid, describedBy, label, hidden }: Props) {
  useLayoutEffect(() => fit(ref.current), [ref, value, lang, hidden])
  useLayoutEffect(() => {
    const onResize = () => fit(ref.current)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [ref])

  return (
    <textarea
      ref={ref}
      className={`dict-input mono-text ${hidden ? 'is-hidden' : ''}`}
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/[\r\n]+/g, ' '))}
      onKeyDown={onKeyDown}
      lang={LANG_TAGS[lang]}
      dir={isRtl(lang) ? 'rtl' : 'ltr'}
      placeholder={placeholder}
      readOnly={readOnly}
      aria-label={label}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      spellCheck={false}
      autoCorrect="off"
      autoCapitalize="off"
      autoComplete="off"
      enterKeyHint="done"
      data-gramm="false"
      data-enable-grammarly="false"
    />
  )
}
