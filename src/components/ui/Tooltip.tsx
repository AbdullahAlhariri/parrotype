import type { ReactNode } from 'react'

/** CSS-only tooltip; shows on hover and keyboard focus. */
export function Tooltip({ content, children }: { content: ReactNode; children: ReactNode }) {
  return (
    <span className="tooltip">
      {children}
      <span role="tooltip" className="tooltip-bubble">{content}</span>
    </span>
  )
}
