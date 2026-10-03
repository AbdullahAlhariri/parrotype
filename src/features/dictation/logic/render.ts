import type { Grade, GradedToken } from './grade'

export type Segment = { kind: 'gap'; text: string } | { kind: 'token'; token: GradedToken; key: number }

/**
 * The tokens of one side (what was typed, or the target) in reading order, with the original
 * spacing between them. On the typed side a missing word sits where it belongs; on the
 * target side extra typed words are left out.
 */
export function lineSegments(g: Grade, side: 'typed' | 'expected'): Segment[] {
  const src = side === 'typed' ? g.typed : g.expected
  const out: Segment[] = []
  let cursor = 0
  g.tokens.forEach((t, key) => {
    const range = side === 'typed' ? t.op.typedRange : t.op.expRange
    if (!range) {
      // a word only the other side has
      if (side === 'expected' || t.status !== 'missing' || t.punct) return
      const prev = out[out.length - 1]
      if (out.length && !(prev.kind === 'gap' && /\s$/.test(prev.text))) out.push({ kind: 'gap', text: ' ' })
      out.push({ kind: 'token', token: t, key })
      if (!/^\s/.test(src.slice(cursor))) out.push({ kind: 'gap', text: ' ' })
      return
    }
    const [s, e] = range
    if (s > cursor) out.push({ kind: 'gap', text: src.slice(cursor, s) })
    out.push({ kind: 'token', token: t, key })
    cursor = Math.max(cursor, e)
  })
  if (cursor < src.length) out.push({ kind: 'gap', text: src.slice(cursor) })
  return out
}
