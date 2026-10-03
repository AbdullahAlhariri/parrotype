// Test-only: scoring labelled mistakes against the full pipeline.
import type { Issue, Lang } from '@/types'
import { applyReplacement } from '../engine'
import { checkFull, type CheckOpts } from './harness'
import type { Labelled } from './errors.nl'

export interface Case {
  family: string
  gap?: string
  /** the text with the mistake */
  text: string
  /** the text with the mistake fixed */
  expected: string
  /** the mistake's span in `text` */
  start: number
  end: number
}

const MARK = /\{([^{}]*?)=>([^{}]*?)\}/

export function parseCase([family, marked, gap]: Labelled): Case {
  const m = MARK.exec(marked)
  if (!m) throw new Error(`no {wrong=>right} in: ${marked}`)
  const before = marked.slice(0, m.index)
  const after = marked.slice(m.index + m[0].length)
  if (MARK.test(after)) throw new Error(`two marks in: ${marked}`)
  return { family, gap, text: before + m[1] + after, expected: before + m[2] + after, start: before.length, end: before.length + m[1].length }
}

export type Outcome = 'fixed' | 'flagged' | 'missed'

export interface Scored {
  c: Case
  outcome: Outcome
  /** the best fix was first in the list */
  first: boolean
  /** the issue on the mistake, if any */
  hit?: Issue
  /** high/medium issues elsewhere in the sentence */
  stray: Issue[]
}

const overlaps = (i: Issue, s: number, e: number) => i.offset < e && s < i.offset + i.length
/** either apostrophe counts: the fix follows the writer's style, the label may use the other one */
const norm = (s: string) => s.replace(/[’‘]/g, "'")

export async function scoreCase(c: Case, lang: Lang, opts: CheckOpts = {}): Promise<Scored> {
  const issues = (await checkFull(c.text, lang, opts)).filter((i) => i.confidence !== 'low')
  const on = issues.filter((i) => overlaps(i, c.start, c.end))
  const stray = issues.filter((i) => !overlaps(i, c.start, c.end))
  let best: Scored | undefined
  for (const hit of on) {
    const k = hit.replacements.findIndex((r) => norm(applyReplacement(c.text, hit, r)) === norm(c.expected))
    if (k >= 0) {
      const s: Scored = { c, outcome: 'fixed', first: k === 0, hit, stray }
      if (!best || (s.first && !best.first)) best = s
    }
  }
  return best ?? { c, outcome: on.length ? 'flagged' : 'missed', first: false, hit: on[0], stray }
}
