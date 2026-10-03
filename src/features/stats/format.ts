// Number and date formatting for the stats page. English UI, day-month order.

const DAY = 24 * 60 * 60 * 1000
const MINUS = '−'

const dm = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' })
const dmy = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const wd = new Intl.DateTimeFormat('en-GB', { weekday: 'short' })
const wdm = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
const hm = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' })

const startOfDay = (t: number) => {
  const d = new Date(t)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/** Whole calendar days between two instants (0 = same day). */
export const daysBetween = (from: number, to: number) => Math.round((startOfDay(to) - startOfDay(from)) / DAY)

/** "96.4%" */
export const pct = (v: number, digits = 1) => `${v.toFixed(digits)}%`

/** "+1.2", "−0.8", "0" */
export function signed(v: number, digits = 1): string {
  const r = Number(v.toFixed(digits))
  if (r === 0) return '0'
  return `${r > 0 ? '+' : MINUS}${Math.abs(r).toFixed(digits)}`
}

/** Hours and minutes as parts so the numbers and units can be styled apart. */
export function durationParts(ms: number): { value: string; unit: string }[] {
  if (ms > 0 && ms < 59_500) return [{ value: String(Math.max(1, Math.round(ms / 1000))), unit: 's' }]
  const totalMin = Math.round(ms / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (!h) return [{ value: String(m), unit: 'min' }]
  if (!m) return [{ value: String(h), unit: 'h' }]
  return [
    { value: String(h), unit: 'h' },
    { value: String(m), unit: 'min' },
  ]
}

/** "1 h 20 min", "14 min", "40 s" */
export const duration = (ms: number) =>
  durationParts(ms)
    .map((p) => `${p.value} ${p.unit}`)
    .join(' ')

/** "today 14:20", "yesterday 09:12", "Tue 14:20", "3 Oct", "3 Oct 2025" */
export function when(at: number, now = Date.now()): string {
  const days = daysBetween(at, now)
  const time = hm.format(at)
  if (days === 0) return `today ${time}`
  if (days === 1) return `yesterday ${time}`
  if (days > 1 && days < 7) return `${wd.format(at)} ${time}`
  return new Date(at).getFullYear() === new Date(now).getFullYear() ? dm.format(at) : dmy.format(at)
}

/** "today", "yesterday", "3 days ago", "2 weeks ago", "4 Sep" */
export function ago(at: number, now = Date.now()): string {
  const days = daysBetween(at, now)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 14) return `${days} days ago`
  if (days < 56) return `${Math.floor(days / 7)} weeks ago`
  return shortDate(at, now)
}

/** "3 Oct" this year, "3 Oct 2025" otherwise */
export const shortDate = (at: number, now = Date.now()) =>
  new Date(at).getFullYear() === new Date(now).getFullYear() ? dm.format(at) : dmy.format(at)

/** "Thu 3 Oct" */
export const dayLabel = (d: Date) => wdm.format(d)

/** "3 runs", "1 run" */
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
