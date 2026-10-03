import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useUiPrefs } from '@/styles/fontStore'
import { KeesArt, type KeesDetail } from './KeesArt'
import { WORD_GAP_MS, bubbleWords, chomp, sequenced, useKeesLife, useReducedMotion, type KeesMood } from './machine'
import './kees.css'

export interface KeesProps {
  mood?: KeesMood
  /** rendered width and height in px (24 to 200 look right) */
  size?: number
  /** defaults to reading glasses in the 'reading' mood, the monocle otherwise */
  glasses?: 'monocle' | 'reading'
  /** speech bubble. An array is revealed word by word in 'repeat' and 'talk' ("wordt." x3) */
  bubble?: string | string[]
  /** lang attribute for the bubble text, e.g. 'nl' */
  bubbleLang?: string
  bubblePlacement?: 'right' | 'left' | 'top'
  onClick?: () => void
  className?: string
  /** accessible name. Without it (and without onClick) Kees is decorative. */
  label?: string
  /** stay visible while the user types (he hides by default) */
  stayWhileTyping?: boolean
}

const detailFor = (size: number): KeesDetail => (size < 40 ? 's' : size < 90 ? 'm' : 'l')

/** Kees the kea. See docs/DESIGN.md rule 7 for what he may and may not do. */
export function Kees({
  mood = 'idle',
  size = 96,
  glasses,
  bubble,
  bubbleLang,
  bubblePlacement = 'right',
  onClick,
  className = '',
  label,
  stayWhileTyping = false,
}: KeesProps) {
  const level = useUiPrefs((s) => s.kees)
  const reduced = useReducedMotion()
  const still = reduced || level === 'quiet'
  const ref = useRef<SVGSVGElement>(null)
  const { poke } = useKeesLife(ref, { mood, still, lively: level === 'lively' })

  const words = bubbleWords(bubble)
  const wordsKey = words.join('\u0001')
  const seq = sequenced(mood, words) && !still
  const [shown, setShown] = useState(seq ? 0 : words.length)

  useEffect(() => {
    const list = wordsKey ? wordsKey.split('\u0001') : []
    if (!(sequenced(mood, list) && !still)) {
      setShown(list.length)
      if (mood === 'talk' && list.length && !still) {
        // one sentence: a few chomps while it appears
        const n = Math.min(4, list[0].split(/\s+/).length)
        const timers = Array.from({ length: n }, (_, i) => window.setTimeout(() => chomp(ref.current), 120 + i * 260))
        return () => timers.forEach(clearTimeout)
      }
      return
    }
    setShown(0)
    const timers = list.map((_, i) =>
      window.setTimeout(() => {
        setShown(i + 1)
        chomp(ref.current)
      }, 260 + i * WORD_GAP_MS),
    )
    return () => timers.forEach(clearTimeout)
  }, [wordsKey, mood, still])

  if (level === 'hidden') return null

  const detail = detailFor(size)
  const lens = glasses ?? (mood === 'reading' ? 'reading' : 'monocle')
  const style = { '--kees-size': `${size}px`, '--bubble-size': `${Math.round(Math.min(21, Math.max(14, size * 0.15)))}px` } as CSSProperties
  const interactive = typeof onClick === 'function'

  const art = (
    <svg
      ref={ref}
      className="kees"
      data-mood={mood}
      data-detail={detail}
      data-still={still ? '' : undefined}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role={label && !interactive ? 'img' : undefined}
      aria-label={label && !interactive ? label : undefined}
      aria-hidden={label && !interactive ? undefined : true}
      focusable="false"
    >
      <KeesArt detail={detail} glasses={lens} />
    </svg>
  )

  const bubbleEl = words.length > 0 && (
    <span className="kees-bubble" data-place={bubblePlacement} lang={bubbleLang} dir="auto">
      <span className="visually-hidden">{words.join(' ')}</span>
      <span aria-hidden="true">
        {words.map((w, i) => (
          <span key={i} className="kees-word" data-on={i < shown ? '' : undefined}>
            {w}
            {i < words.length - 1 ? ' ' : ''}
          </span>
        ))}
      </span>
    </span>
  )

  const classes = `kees-wrap ${stayWhileTyping ? 'kees-keep' : ''} ${className}`.trim()

  if (interactive) {
    return (
      <button type="button" className={classes} style={style} onClick={onClick} onPointerEnter={poke} onFocus={poke} aria-label={label ?? 'Kees'}>
        {art}
        {bubbleEl}
      </button>
    )
  }
  return (
    <span className={classes} style={style} onPointerEnter={poke}>
      {art}
      {bubbleEl}
    </span>
  )
}
