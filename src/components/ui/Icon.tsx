/**
 * The few icons Parrotype has, drawn for it on a 24px grid: 2px stroke, round caps and joins.
 * Everything else is a word.
 */

const PATHS = {
  stats: 'M5 19.5v-6 M10 19.5V9.5 M15 19.5V12 M20 19.5V5',
  settings: 'M4 7.5h8.5 M17.5 7.5H20 M4 16.5h2.5 M11.5 16.5H20 M15 5.2a2.3 2.3 0 1 1 0 4.6 2.3 2.3 0 0 1 0-4.6Z M9 14.2a2.3 2.3 0 1 1 0 4.6 2.3 2.3 0 0 1 0-4.6Z',
  restart: 'M19.6 13.4A7.8 7.8 0 1 1 17 6.3 M19.4 3.6v4.3h-4.3',
  sound: 'M4.5 9.5H8L12.5 5.5v13L8 14.5H4.5Z M16 9.2a4 4 0 0 1 0 5.6 M18.6 6.6a7.6 7.6 0 0 1 0 10.8',
  'sound-off': 'M4.5 9.5H8L12.5 5.5v13L8 14.5H4.5Z M16.5 9.5l5 5 M21.5 9.5l-5 5',
  feather: 'M19.5 4.5c-7.4.4-12.1 5.2-12.6 12.6l3.6-.4c4.9-.6 8.2-4.6 9-12.2Z M4.5 19.5l9-9',
  search: 'M10.5 4.5a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z M15 15l4.5 4.5',
  close: 'M6.5 6.5l11 11 M17.5 6.5l-11 11',
  check: 'M5 12.5l4.3 4.3L19 7.2',
  download: 'M12 4.5v10.5 M7.5 10.5 12 15l4.5-4.5 M5 19.5h14',
  upload: 'M12 15V4.5 M7.5 9 12 4.5 16.5 9 M5 19.5h14',
  play: 'M8 5.8v12.4L18 12Z',
} as const

export type IconName = keyof typeof PATHS

interface Props {
  name: IconName
  size?: number
  className?: string
  /** accessible label; decorative (aria-hidden) by default */
  label?: string
  strokeWidth?: number
}

export function Icon({ name, size = 20, className = '', label, strokeWidth = 2 }: Props) {
  return (
    <svg
      className={`icon icon-${name} ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <path d={PATHS[name]} fill={name === 'play' ? 'currentColor' : undefined} />
    </svg>
  )
}
