import type { ReactNode } from 'react'

const AR = '\\u0600-\\u06FF\\u0750-\\u077F\\u08A0-\\u08FF\\uFB50-\\uFDFF\\uFE70-\\uFEFF'
// an Arabic run (words joined by spaces or Arabic commas), with the quote marks and isolates around it
const RUN = new RegExp(`([‘“«(]?)\\u2068?([${AR}]+(?:[\\s\\u060C\\u061B]+[${AR}]+)*)\\u2069?([’”»)]?)`, 'g')

/**
 * English checker text that quotes Arabic ("The long a is said but not written: ‘هذا’"). Each Arabic
 * run gets its own right-to-left span in the Arabic face, sized to match the Latin around it, and a
 * one-word quote stays on one line with its quote marks.
 */
export function Mixed({ text }: { text: string }) {
  if (!/[؀-ۿ]/.test(text)) return <>{text}</>
  const out: ReactNode[] = []
  let last = 0
  for (const m of text.matchAll(RUN)) {
    const [all, open, run, close] = m
    out.push(text.slice(last, m.index))
    const ar = (
      <span className="wp-ar" lang="ar" dir="rtl">
        {run}
      </span>
    )
    out.push(
      <span key={m.index} className={/\s/.test(run) ? undefined : 'wp-ar-quote'}>
        {open}
        {ar}
        {close}
      </span>,
    )
    last = m.index + all.length
  }
  out.push(text.slice(last))
  return <>{out}</>
}
