/** Smallest "nice" step (1, 2, 2.5, 5 x 10^k) at or above v. */
export function niceStep(v: number): number {
  if (v <= 0) return 1
  const p = 10 ** Math.floor(Math.log10(v))
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p
  return 10 * p
}

/** y axis from 0 to a nice maximum with 3 to 5 integer ticks. */
export function chartScale(top: number): { max: number; ticks: number[] } {
  let step = Math.max(1, niceStep(top / 4))
  // integer ticks only: 2.5 becomes 5
  if (!Number.isInteger(step)) step = niceStep(Math.ceil(step) + 0.5)
  const max = Math.ceil(top / step) * step
  const ticks: number[] = []
  for (let t = 0; t <= max + 1e-9; t += step) ticks.push(Math.round(t))
  return { max, ticks }
}

/** Indexes of seconds to label on the x axis (at most about 8), always including the last. */
export function xTicks(n: number): number[] {
  if (n <= 0) return []
  const step = [1, 2, 5, 10, 15, 20, 30, 60, 120].find((s) => n / s <= 8) ?? Math.ceil(n / 8)
  const out: number[] = []
  for (let s = step; s <= n; s += step) out.push(s - 1)
  if (!out.length || out[out.length - 1] !== n - 1) {
    // drop a label that would collide with the last one
    if (out.length && n - 1 - out[out.length - 1] < step / 2) out.pop()
    out.push(n - 1)
  }
  return out
}
