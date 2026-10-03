import type { Issue } from '@/types'

/** How an issue is drawn: spelling = wavy --error, grammar = dashed --grammar, hint = dotted --sub. */
export type MarkKind = 'spell' | 'grammar' | 'hint'

export function markKind(issue: Pick<Issue, 'category' | 'confidence'>): MarkKind {
  if (issue.category === 'spelling' || issue.category === 'typo') return 'spell'
  if (issue.category === 'style' || issue.confidence === 'low') return 'hint'
  return 'grammar'
}

export const MARK_LABEL: Record<MarkKind, string> = { spell: 'spelling', grammar: 'grammar', hint: 'hint' }

/**
 * Issues that can still be drawn on this text: inside the text, matching the flagged substring,
 * sorted by offset and without overlaps (the first, then the longer one wins).
 */
export function drawableIssues(text: string, issues: readonly Issue[]): Issue[] {
  const sorted = issues
    .filter((i) => i.length > 0 && i.offset >= 0 && i.offset + i.length <= text.length)
    .filter((i) => text.slice(i.offset, i.offset + i.length) === i.text)
    .sort((a, b) => a.offset - b.offset || b.length - a.length)
  const out: Issue[] = []
  let end = -1
  for (const i of sorted) {
    if (i.offset < end) continue
    out.push(i)
    end = i.offset + i.length
  }
  return out
}

export interface Segment {
  start: number
  end: number
  text: string
  issue?: Issue
}

/** Split text into plain and flagged runs for the overlay. Concatenating segment texts gives the text back. */
export function buildSegments(text: string, issues: readonly Issue[]): Segment[] {
  const segs: Segment[] = []
  let pos = 0
  for (const issue of drawableIssues(text, issues)) {
    if (issue.offset > pos) segs.push({ start: pos, end: issue.offset, text: text.slice(pos, issue.offset) })
    const end = issue.offset + issue.length
    segs.push({ start: issue.offset, end, text: text.slice(issue.offset, end), issue })
    pos = end
  }
  if (pos < text.length || !segs.length) segs.push({ start: pos, end: text.length, text: text.slice(pos) })
  return segs
}

/** The issue under a caret position (inclusive of the end, so a caret right after a word counts). */
export function issueAt(issues: readonly Issue[], pos: number): Issue | undefined {
  return issues.find((i) => pos >= i.offset && pos <= i.offset + i.length)
}

/** Next / previous issue relative to a caret position, wrapping around. */
export function stepIssue(issues: readonly Issue[], from: number, dir: 1 | -1, currentId?: string): Issue | undefined {
  if (!issues.length) return undefined
  const sorted = [...issues].sort((a, b) => a.offset - b.offset)
  const cur = currentId ? sorted.findIndex((i) => i.id === currentId) : -1
  if (cur >= 0) return sorted[(cur + dir + sorted.length) % sorted.length]
  if (dir === 1) return sorted.find((i) => i.offset >= from) ?? sorted[0]
  return [...sorted].reverse().find((i) => i.offset + i.length < from) ?? sorted[sorted.length - 1]
}
