import type { CSSProperties } from 'react'
import { KeesMark } from '@/components/kees/KeesMark'

/** The wordmark's caret is a parrot feather: a narrow vane, a split, the rachis running into a nib. */
function QuillCaret() {
  return (
    <svg className="logo-caret" viewBox="0 0 8 32" aria-hidden="true" focusable="false">
      <path d="M4 1C6.9 5 7.4 10.6 6.5 15.4L4.9 14.6 6.2 17.2C5.8 19.6 5 21.6 4 23.2 3 21.6 2 18.8 1.7 15.4 1.4 10 2 5 4 1Z" fill="var(--caret)" />
      <path d="M4 4.5V30.5" fill="none" stroke="var(--caret)" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

interface Props {
  /** size of the mark in px; the wordmark scales with it */
  size?: number
  /** hide the wordmark and show only Kees's head */
  markOnly?: boolean
  className?: string
}

/** Kees's head + "parrotype" in Caprasimo, lowercase, with a blinking feather caret. */
export function Logo({ size = 28, markOnly = false, className = '' }: Props) {
  return (
    <span className={`logo ${className}`.trim()} style={{ '--logo-size': `${size}px` } as CSSProperties}>
      <KeesMark size={size} />
      {!markOnly && (
        <span className="logo-word">
          parrotype
          <QuillCaret />
        </span>
      )}
    </span>
  )
}
