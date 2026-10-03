import { Kees } from '@/components/kees/Kees'
import type { KeesMood } from '@/components/kees/machine'

export type ParrotMood = 'idle' | 'happy' | 'sad' | 'think' | 'talk' | 'sleep' | 'cheer' | 'listen'

interface Props {
  mood?: ParrotMood
  size?: number
  className?: string
  /** accessible label; decorative by default */
  label?: string
}

/** Older moods mapped to Kees's. 'sad' is not a thing: Kees adjusts his monocle instead. */
export const PARROT_TO_KEES: Record<ParrotMood, KeesMood> = {
  idle: 'idle',
  happy: 'curious',
  sad: 'oops',
  think: 'reading',
  talk: 'talk',
  sleep: 'sleepy',
  cheer: 'celebrate',
  listen: 'listen',
}

/** Backward-compatible wrapper. New code should use <Kees /> directly. */
export function Parrot({ mood = 'idle', size = 64, className = '', label }: Props) {
  return <Kees mood={PARROT_TO_KEES[mood] ?? 'idle'} size={size} className={`parrot parrot-${mood} ${className}`.trim()} label={label} />
}
