import { alignWords, type WordOp } from '@/engine/align'
import type { PlantedMistake, ProofText } from '@/content/proofread'

export type MistakeStatus = 'fixed' | 'missed' | 'changed'

export interface MistakeResult {
  index: number
  mistake: PlantedMistake
  /** fixed; missed = left as it was; changed = edited, but not into a right form */
  status: MistakeStatus
  /** the user's version of the region around this mistake */
  typed: string
  /** [start, end) of the fix itself in the corrected text */
  span: [number, number]
  /** [start, end) in the corrected text of everything that differs around it (span or wider) */
  region: [number, number]
}

/** A difference outside every planted mistake: something the user broke. */
export interface IntroducedError {
  /** corrected text in this spot ('' for an extra word) */
  expected: string
  typed: string
  /** [start, end) in the corrected text; zero width for an extra word */
  span: [number, number]
}

export interface ProofGrade {
  results: MistakeResult[]
  introduced: IntroducedError[]
  fixed: number
  total: number
}

type Range = [number, number]

const norm = (s: string) =>
  s.normalize('NFC').replace(/[‘’ʼ`´]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim()

/** Where each op sits in one of the two texts. Ops missing from that side get a zero-width range. */
function positions(ops: WordOp[], side: 'expRange' | 'typedRange'): Range[] {
  let cursor = 0
  return ops.map((op) => {
    const r = op[side]
    if (r) {
      cursor = r[1]
      return r
    }
    return [cursor, cursor]
  })
}

/**
 * Every combination of right (or accepted) and wrong forms for the mistakes in one region.
 * Regions hold one mistake in practice; the cap keeps a pathological edit cheap.
 */
function* variants(options: string[][], prefix: number[] = []): Generator<number[]> {
  if (prefix.length === options.length) {
    yield prefix
    return
  }
  for (let i = 0; i < options[prefix.length].length; i++) yield* variants(options, [...prefix, i])
}

/**
 * Grade an edited text against the corrected version. Each planted mistake owns the
 * stretch between the nearest unchanged words on either side, so a fix that the aligner
 * reads as a split or merge with its neighbour is still graded as one mistake.
 */
export function gradeProofread(text: ProofText, edited: string): ProofGrade {
  const ops = alignWords(text.corrected, edited)
  const exp = positions(ops, 'expRange')
  const typ = positions(ops, 'typedRange')
  const n = ops.length
  const claimed = new Array<boolean>(n).fill(false)

  // group mistakes by the op window between their anchors
  const groups = new Map<string, { lo: number; hi: number; members: number[] }>()
  text.mistakes.forEach((m, index) => {
    const start = m.fixAt
    const end = m.fixAt + m.right.length
    let lo = 0
    let hi = n
    for (let i = 0; i < n; i++) if (ops[i].op === 'equal' && exp[i][1] <= start) lo = i + 1
    for (let i = n - 1; i >= 0; i--) if (ops[i].op === 'equal' && exp[i][0] >= end) hi = i
    const key = `${lo}:${hi}`
    const g = groups.get(key) ?? { lo, hi, members: [] }
    g.members.push(index)
    groups.set(key, g)
  })

  const results: MistakeResult[] = []
  for (const { lo, hi, members } of groups.values()) {
    for (let i = lo; i < hi; i++) claimed[i] = true
    const spans = members.map((k): Range => [text.mistakes[k].fixAt, text.mistakes[k].fixAt + text.mistakes[k].right.length])
    const window = ops.slice(lo, hi).map((op, j) => ({ op, e: exp[lo + j], t: typ[lo + j] }))
    const realE = window.filter((w) => w.op.expRange).map((w) => w.e)
    const realT = window.filter((w) => w.op.typedRange).map((w) => w.t)
    const region: Range = [
      Math.min(...spans.map((s) => s[0]), ...realE.map((r) => r[0])),
      Math.max(...spans.map((s) => s[1]), ...realE.map((r) => r[1])),
    ]
    const typed = realT.length ? edited.slice(Math.min(...realT.map((r) => r[0])), Math.max(...realT.map((r) => r[1]))) : ''

    // options per mistake: right forms first (fixed), the wrong form last (missed)
    const options = members.map((k) => {
      const m = text.mistakes[k]
      return [m.right, ...(m.accept ?? []), m.wrong]
    })
    let statuses: MistakeStatus[] | null = null
    let tries = 0
    for (const pick of variants(options)) {
      if (++tries > 256) break
      let candidate = ''
      let cursor = region[0]
      members.forEach((_, j) => {
        candidate += text.corrected.slice(cursor, spans[j][0]) + options[j][pick[j]]
        cursor = spans[j][1]
      })
      candidate += text.corrected.slice(cursor, region[1])
      if (norm(candidate) === norm(typed)) {
        statuses = pick.map((p, j) => (p === options[j].length - 1 ? 'missed' : 'fixed'))
        break
      }
    }
    members.forEach((k, j) => {
      results.push({ index: k, mistake: text.mistakes[k], status: statuses?.[j] ?? 'changed', typed, span: spans[j], region })
    })
  }
  results.sort((a, b) => a.index - b.index)

  const introduced: IntroducedError[] = []
  ops.forEach((op, i) => {
    if (op.op === 'equal' || claimed[i]) return
    introduced.push({ expected: op.expected ?? '', typed: op.typed ?? '', span: exp[i] })
  })

  return { results, introduced, fixed: results.filter((r) => r.status === 'fixed').length, total: results.length }
}

/** Words the user has changed so far compared with the starting text (for the live counter). */
export function countEdits(original: string, edited: string): number {
  if (original === edited) return 0
  return alignWords(original, edited).filter((op) => op.op !== 'equal').length
}

export type Segment =
  | { kind: 'text'; text: string }
  | { kind: 'mistake'; text: string; results: MistakeResult[]; typed: string }
  | { kind: 'new'; text: string; error: IntroducedError }

/** The corrected text cut into plain runs, planted mistakes and new errors, for the result view. */
export function segments(text: ProofText, grade: ProofGrade): Segment[] {
  type Mark = { span: Range; seg: (t: string) => Segment }
  const byRegion = new Map<string, MistakeResult[]>()
  for (const r of grade.results) {
    const key = r.region.join(':')
    byRegion.set(key, [...(byRegion.get(key) ?? []), r])
  }
  const marks: Mark[] = [
    ...[...byRegion.values()].map((rs): Mark => ({ span: rs[0].region, seg: (t) => ({ kind: 'mistake', text: t, results: rs, typed: rs[0].typed }) })),
    ...grade.introduced.map((e): Mark => ({ span: e.span, seg: (t) => ({ kind: 'new', text: t, error: e }) })),
  ].sort((a, b) => a.span[0] - b.span[0] || a.span[1] - b.span[1])
  const out: Segment[] = []
  let cursor = 0
  for (const m of marks) {
    const [s, e] = m.span
    if (s < cursor) continue // marks never overlap, but never render text twice
    if (s > cursor) out.push({ kind: 'text', text: text.corrected.slice(cursor, s) })
    out.push(m.seg(text.corrected.slice(s, e)))
    cursor = e
  }
  if (cursor < text.corrected.length) out.push({ kind: 'text', text: text.corrected.slice(cursor) })
  return out
}

/** The sentence around an offset, for the mistake nest. */
export function sentenceAt(source: string, offset: number): string {
  const before = source.slice(0, offset)
  const start = Math.max(before.lastIndexOf('. '), before.lastIndexOf('? '), before.lastIndexOf('! '), before.lastIndexOf('\n'))
  const rest = source.slice(offset)
  const m = /[.?!](?=\s|$)|\n/.exec(rest)
  const end = m ? offset + m.index + (m[0] === '\n' ? 0 : 1) : source.length
  return source.slice(start < 0 ? 0 : start + 1, end).trim()
}
