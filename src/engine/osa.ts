import { areAdjacent, isMirror, type LayoutId } from './keyboard'
import { graphemes, stripMarks } from './text'

// Optimal string alignment (restricted Damerau-Levenshtein) with backtrace. Keyboard-aware
// costs make neighbour-key substitutions, repeated keys and swaps cheaper, so the alignment
// prefers physically plausible explanations of a typo.

export type EditOp =
  | { op: 'equal'; e: string; t: string; i: number; j: number }
  | { op: 'sub'; e: string; t: string; i: number; j: number }
  /** extra typed char t, inserted before expected[i] */
  | { op: 'ins'; t: string; i: number; j: number }
  /** expected[i] missing */
  | { op: 'del'; e: string; i: number; j: number }
  /** expected[i..i+1] typed in reverse order */
  | { op: 'swap'; e: string; t: string; i: number; j: number }

export interface Costs {
  sub: (e: string, t: string) => number
  ins: (t: string, prev?: string, next?: string) => number
  del: number
  swap: number
}

const UNIT: Costs = { sub: () => 1, ins: () => 1, del: 1, swap: 1 }

export function keyboardCosts(layout: LayoutId): Costs {
  return {
    sub: (e, t) => {
      if (e.toLowerCase() === t.toLowerCase() || stripMarks(e) === stripMarks(t)) return 0.3
      if (areAdjacent(e, t, layout)) return 0.8
      if (isMirror(e, t, layout)) return 0.9
      return 1
    },
    ins: (t, prev, next) => {
      if (t === prev || t === next) return 0.7
      if ((prev && areAdjacent(t, prev, layout)) || (next && areAdjacent(t, next, layout))) return 0.85
      return 1
    },
    del: 1,
    // below two cheap mark-only substitutions (2 x 0.3), so a real swap always wins
    swap: 0.5,
  }
}

export function alignUnits(E: string[], T: string[], c: Costs): EditOp[] {
  const n = E.length
  const m = T.length
  const d = Array.from({ length: n + 1 }, () => new Float64Array(m + 1))
  const ins = (i: number, j: number) => c.ins(T[j - 1], E[i - 1], E[i])
  for (let i = 1; i <= n; i++) d[i][0] = d[i - 1][0] + c.del
  for (let j = 1; j <= m; j++) d[0][j] = d[0][j - 1] + ins(0, j)
  const canSwap = (i: number, j: number) =>
    i > 1 && j > 1 && E[i - 1] === T[j - 2] && E[i - 2] === T[j - 1] && E[i - 1] !== E[i - 2]
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const s = E[i - 1] === T[j - 1] ? 0 : c.sub(E[i - 1], T[j - 1])
      let v = Math.min(d[i - 1][j - 1] + s, d[i - 1][j] + c.del, d[i][j - 1] + ins(i, j))
      if (canSwap(i, j)) v = Math.min(v, d[i - 2][j - 2] + c.swap)
      d[i][j] = v
    }
  }
  // Backtrace; tie-break eq > swap > sub > del > ins.
  const ops: EditOp[] = []
  const near = (a: number, b: number) => Math.abs(a - b) < 1e-9
  let i = n
  let j = m
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && E[i - 1] === T[j - 1] && near(d[i][j], d[i - 1][j - 1])) {
      ops.push({ op: 'equal', e: E[i - 1], t: T[j - 1], i: i - 1, j: j - 1 })
      i--
      j--
    } else if (canSwap(i, j) && near(d[i][j], d[i - 2][j - 2] + c.swap)) {
      ops.push({ op: 'swap', e: E[i - 2] + E[i - 1], t: T[j - 2] + T[j - 1], i: i - 2, j: j - 2 })
      i -= 2
      j -= 2
    } else if (i > 0 && j > 0 && E[i - 1] !== T[j - 1] && near(d[i][j], d[i - 1][j - 1] + c.sub(E[i - 1], T[j - 1]))) {
      ops.push({ op: 'sub', e: E[i - 1], t: T[j - 1], i: i - 1, j: j - 1 })
      i--
      j--
    } else if (i > 0 && (j === 0 || near(d[i][j], d[i - 1][j] + c.del))) {
      ops.push({ op: 'del', e: E[i - 1], i: i - 1, j })
      i--
    } else {
      ops.push({ op: 'ins', t: T[j - 1], i, j: j - 1 })
      j--
    }
  }
  return ops.reverse()
}

/** Damerau-Levenshtein distance (optimal string alignment) over graphemes, unit costs. */
export const osaDistance = (a: string, b: string): number => osaUnits(graphemes(a), graphemes(b))

/** osaDistance on pre-split units. */
export function osaUnits(A: string[], B: string[]): number {
  const n = A.length
  const m = B.length
  if (!n) return m
  if (!m) return n
  let prev2 = new Array<number>(m + 1).fill(0)
  let prev = Array.from({ length: m + 1 }, (_, j) => j)
  for (let i = 1; i <= n; i++) {
    const cur = new Array<number>(m + 1)
    cur[0] = i
    for (let j = 1; j <= m; j++) {
      const cost = A[i - 1] === B[j - 1] ? 0 : 1
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)
      if (i > 1 && j > 1 && A[i - 1] === B[j - 2] && A[i - 2] === B[j - 1]) v = Math.min(v, prev2[j - 2] + 1)
      cur[j] = v
    }
    prev2 = prev
    prev = cur
  }
  return prev[m]
}

/**
 * Keyboard-aware edit operations turning `expected` into `typed` (graphemes). Neighbour-key
 * substitutions, repeated keys and swaps are cheaper, so the alignment prefers physically
 * plausible explanations.
 */
export function editOps(expected: string, typed: string, layout: LayoutId = 'qwerty-us'): EditOp[] {
  return alignUnits(graphemes(expected), graphemes(typed), keyboardCosts(layout))
}

/** Unit-cost edit operations without the equal steps. */
export const plainOps = (a: string, b: string) => alignUnits(graphemes(a), graphemes(b), UNIT).filter((o) => o.op !== 'equal')
