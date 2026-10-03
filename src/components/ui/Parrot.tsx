export type ParrotMood = 'idle' | 'happy' | 'sad' | 'think' | 'talk' | 'sleep' | 'cheer' | 'listen'

interface Props {
  mood?: ParrotMood
  size?: number
  className?: string
  /** accessible label; decorative by default */
  label?: string
}

/** The Parrotype mascot. Placeholder art: the design owner replaces this with the real SVG + animations. */
export function Parrot({ mood = 'idle', size = 64, className = '', label }: Props) {
  return (
    <svg
      className={`parrot parrot-${mood} ${className}`}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <circle cx="32" cy="34" r="22" fill="var(--main)" />
      <circle cx="38" cy="28" r="4" fill="var(--bg)" />
      <path d="M48 30 q10 4 2 12 q-4 -6 -8 -6z" fill="var(--text)" />
    </svg>
  )
}
