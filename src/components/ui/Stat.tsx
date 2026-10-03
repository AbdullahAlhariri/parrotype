import type { ReactNode } from 'react'

interface Props {
  label: ReactNode
  value: ReactNode
  sub?: ReactNode
  size?: 'sm' | 'lg'
}

/** A labelled number, e.g. on results screens: "wpm 64". */
export function Stat({ label, value, sub, size = 'sm' }: Props) {
  return (
    <div className={`stat stat-${size}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}
