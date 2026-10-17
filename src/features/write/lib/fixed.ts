import type { Issue } from '@/types'
import { diffRange, remapIssues } from './paragraphs'
import { markKind } from './segments'
import { applyFixes, excerpt } from './text'

/**
 * Mistakes that were fixed before Finish still belong in the report, the stats and the nest: the
 * report is about what you wrote, not only about what is left. A mistake gets fixed either from
 * its underline ('suggestion': a suggestion button or Enter) or by the writer during self-review,
 * before the underlines showed ('self').
 */
export type FixedHow = 'suggestion' | 'self'

/**
 * A fixed mistake as the report sees it: an Issue whose offset and length point into `context`,
 * the sentence as it was written (so `context.slice(offset, offset + length) === text`).
 */
export interface FixedIssue extends Issue {
  fixed: FixedHow
  context: string
  /** the sentence with every mistake in it corrected, when that is known for sure (for the nest) */
  target?: string
}

/** Kept on the draft: the fixed issue plus where its fix sits in the current text. */
export interface FixedEntry extends FixedIssue {
  /** the fix in the current text, kept in step with edits; null when unknown or edited again */
  at: { offset: number; length: number } | null
}

/** Most fixes a draft keeps (they are stored with the draft). */
export const MAX_FIXED = 80

export const isFixed = (i: Issue): i is FixedIssue => typeof (i as Partial<FixedIssue>).context === 'string' && !!(i as Partial<FixedIssue>).fixed

/** The text an issue's offsets point into: its own sentence for a fixed one, the whole text otherwise. */
export const srcOf = (i: Issue, text: string): string => (isFixed(i) ? i.context : text)

let counter = 0
const stamp = () => `${Date.now().toString(36)}${(counter++ % 1296).toString(36)}`

/** The sentence around an issue, and the issue's offset inside it. */
function sentenceOf(text: string, offset: number, length: number): { start: number; end: number } {
  const b = excerpt(text, offset, offset + length, 160)
  return { start: Math.min(b.start, offset), end: Math.max(b.end, offset + length) }
}

function entry(issue: Issue, text: string, how: FixedHow, recorded: readonly string[], at: FixedEntry['at'], replacements = issue.replacements): FixedEntry {
  const { start, end } = sentenceOf(text, issue.offset, issue.length)
  return {
    ...issue,
    // a mistake an earlier finish already stored keeps its id, so finishing again does not count it twice
    id: recorded.includes(issue.id) ? issue.id : `${issue.id}@${stamp()}`,
    offset: issue.offset - start,
    replacements,
    fixed: how,
    context: text.slice(start, end),
    at,
  }
}

/** `issue` (offsets in `before`, the text just before the fix) was replaced by `rep` from its underline. */
export function fixedFromSuggestion(issue: Issue, rep: string, before: string, recorded: readonly string[] = []): FixedEntry {
  return entry(issue, before, 'suggestion', recorded, { offset: issue.offset, length: rep.length }, [rep, ...issue.replacements.filter((r) => r !== rep)])
}

/** Mistakes the writer fixed during self-review; offsets in `reviewText`, the text when the review started. */
export function fixedFromReview(found: readonly Issue[], reviewText: string, recorded: readonly string[] = []): FixedEntry[] {
  return found.map((i) => entry(i, reviewText, 'self', recorded, null))
}

/** Add entries to a draft's list (newest kept when it is full). */
export const addFixed = (list: readonly FixedEntry[] | undefined, more: readonly FixedEntry[]): FixedEntry[] => [...(list ?? []), ...more].slice(-MAX_FIXED)

/**
 * Keep the fixes glued to their words while the text changes. A fix the writer edits again loses
 * its place; a fix that is undone (ctrl+z brings the old word back) is no fix at all and goes.
 */
export function remapFixed(list: readonly FixedEntry[], prev: string, next: string): FixedEntry[] {
  if (!list.some((e) => e.at)) return list as FixedEntry[]
  const placed = list.filter((e) => e.at).map((e) => ({ ...e, offset: e.at!.offset, length: e.at!.length }))
  const moved = new Map(remapIssues(placed, prev, next).kept.map((k) => [k.id, k.offset]))
  const edit = diffRange(prev, next)
  const out: FixedEntry[] = []
  for (const e of list) {
    if (!e.at) {
      out.push(e)
      continue
    }
    const { offset, length } = e.at
    const to = moved.get(e.id)
    if (to !== undefined) {
      out.push(to === offset ? e : { ...e, at: { offset: to, length } })
      continue
    }
    const inside = edit && edit.start >= offset && edit.oldEnd <= offset + length
    const now = inside ? next.slice(offset, offset + length + edit.newEnd - edit.oldEnd) : null
    if (now !== e.text) out.push({ ...e, at: null })
  }
  return out
}

/**
 * The fixed mistakes for the report on the final text. A fix that is still in place gets its
 * sentence from the final text (so later fixes in the same sentence show too) and, for the nest,
 * that sentence with every remaining mistake corrected.
 */
export function materializeFixed(text: string, list: readonly FixedEntry[] | undefined, finals: readonly Issue[]): FixedIssue[] {
  const mistakes = finals.filter((i) => markKind(i) !== 'hint')
  return (list ?? []).map(({ at, ...e }) => {
    const rep = e.replacements[0] ?? ''
    if (!at || text.slice(at.offset, at.offset + at.length) !== rep) return e
    const { start, end } = sentenceOf(text, at.offset, at.length)
    return {
      ...e,
      context: text.slice(start, at.offset) + e.text + text.slice(at.offset + at.length, end),
      offset: at.offset - start,
      target: applyFixes(text, mistakes, start, end).trim(),
    }
  })
}
