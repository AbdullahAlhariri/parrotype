import type { ReactNode } from 'react'

interface Props {
  label: ReactNode
  value: ReactNode
  sub?: ReactNode
  /** 'lg' sets the value in Caprasimo: use it for the one big number on a screen */
  size?: 'sm' | 'lg'
  className?: string
}

/** A labelled number, e.g. on results screens: "wpm 64". Tabular figures. */
export function Stat({ label, value, sub, size = 'sm', className = '' }: Props) {
  return (
    <div className={`stat stat-${size} ${className}`.trim()}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}
