import { useEffect, useState } from 'react'

interface Props {
  value: number
  /** 0 = show the number straight away */
  ms: number
  className?: string
  title?: string
}

/** Counts from 0 to `value` with an ease-out curve. Only this span re-renders while it runs. */
export function CountUp({ value, ms, className, title }: Props) {
  const [shown, setShown] = useState(ms > 0 ? 0 : value)
  useEffect(() => {
    if (ms <= 0) {
      setShown(value)
      return
    }
    let raf = 0
    const t0 = performance.now()
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / ms)
      setShown(Math.round(value * (1 - (1 - p) ** 3)))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value, ms])
  return (
    <span className={className} title={title} style={{ minWidth: `${String(value).length}ch` }}>
      <span aria-hidden="true">{shown}</span>
      <span className="sr-only">{value}</span>
    </span>
  )
}
