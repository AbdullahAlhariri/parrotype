import type { Issue } from '@/types'

/* ------------------------------------------------------------------ */
/* Edits: keep underlines glued to their words while the user types    */
/* ------------------------------------------------------------------ */

/** The one changed region between two texts: [start, oldEnd) in a became [start, newEnd) in b. */
export interface TextEdit {
  start: number
  oldEnd: number
  newEnd: number
}

export function diffRange(a: string, b: string): TextEdit | null {
  if (a === b) return null
  const max = Math.min(a.length, b.length)
  let start = 0
  while (start < max && a.charCodeAt(start) === b.charCodeAt(start)) start++
  let ea = a.length
  let eb = b.length
  while (ea > start && eb > start && a.charCodeAt(ea - 1) === b.charCodeAt(eb - 1)) {
    ea--
    eb--
  }
  return { start, oldEnd: ea, newEnd: eb }
}

const WORD_CHAR = /[\p{L}\p{N}\p{M}'’-]/u
const isWordChar = (c: string | undefined) => !!c && WORD_CHAR.test(c)

export interface Remapped {
  kept: Issue[]
  /** issues whose words the user changed */
  dropped: Issue[]
  edit: TextEdit | null
}

/**
 * Move issues from oldText to newText. Issues after the edit shift; issues the edit touches are
 * dropped, because the user changed that word and the old verdict no longer applies.
 * Typing a space or punctuation right next to a flagged word keeps its underline; typing a
 * letter onto it ("eigelijk" + "e") drops it.
 */
export function remapIssues(issues: readonly Issue[], oldText: string, newText: string): Remapped {
  const edit = diffRange(oldText, newText)
  if (!edit) return { kept: [...issues], dropped: [], edit }
  const delta = edit.newEnd - edit.oldEnd
  const removed = oldText.slice(edit.start, edit.oldEnd)
  const inserted = newText.slice(edit.start, edit.newEnd)
  const kept: Issue[] = []
  const dropped: Issue[] = []
  for (const i of issues) {
    const end = i.offset + i.length
    let before = end < edit.start
    let after = i.offset > edit.oldEnd
    // edit starts exactly where the word ends: only a word character extends the word
    if (end === edit.start && !isWordChar(removed[0]) && !isWordChar(inserted[0])) before = true
    // edit ends exactly where the word starts
    if (i.offset === edit.oldEnd && !isWordChar(removed[removed.length - 1]) && !isWordChar(inserted[inserted.length - 1])) after = true
    // an empty issue span inside a pure insertion point cannot be "before" and "after" at once
    if (before && after) after = false
    if (before) kept.push(i)
    else if (after) kept.push(delta ? { ...i, offset: i.offset + delta } : i)
    else dropped.push(i)
  }
  return { kept, dropped, edit }
}

/* ------------------------------------------------------------------ */
/* Paragraphs: only re-check what changed                              */
/* ------------------------------------------------------------------ */

export interface Paragraph {
  /** offset of the first character in the full text */
  start: number
  end: number
  text: string
}

/** One paragraph per line. Newlines are never part of a paragraph, so offsets map 1:1. */
export function splitParagraphs(text: string): Paragraph[] {
  const out: Paragraph[] = []
  let start = 0
  for (let i = 0; i <= text.length; i++) {
    if (i === text.length || text[i] === '\n') {
      out.push({ start, end: i, text: text.slice(start, i) })
      start = i + 1
    }
  }
  return out
}

export const shiftIssues = (issues: readonly Issue[], delta: number): Issue[] =>
  delta === 0 ? [...issues] : issues.map((i) => ({ ...i, offset: i.offset + delta }))

/**
 * Ids that are unique in the merged text and survive edits elsewhere: rule + flagged text + a
 * counter in reading order ("spell:eigelijk#0"), the same scheme the checker uses. Per-paragraph
 * results need this because each paragraph numbers from #0.
 */
export function reId(issues: readonly Issue[]): Issue[] {
  const seen = new Map<string, number>()
  return issues.map((i) => {
    const base = `${i.ruleId}:${i.text.toLowerCase()}`
    const n = seen.get(base) ?? 0
    seen.set(base, n + 1)
    const id = `${base}#${n}`
    return i.id === id ? i : { ...i, id }
  })
}

/**
 * Content-addressed cache of per-paragraph results (offsets relative to the paragraph).
 * Moving a paragraph, or editing another one, never triggers a re-check of this one.
 */
export class ParagraphCache {
  private map = new Map<string, Issue[]>()
  constructor(private limit = 400) {}

  private key(lang: string, text: string) {
    return `${lang}\u0000${text}`
  }

  get(lang: string, text: string): Issue[] | undefined {
    const k = this.key(lang, text)
    const v = this.map.get(k)
    if (v) {
      this.map.delete(k) // refresh LRU position
      this.map.set(k, v)
    }
    return v
  }

  set(lang: string, text: string, issues: Issue[]) {
    const k = this.key(lang, text)
    this.map.delete(k)
    this.map.set(k, issues)
    while (this.map.size > this.limit) this.map.delete(this.map.keys().next().value as string)
  }

  clear() {
    this.map.clear()
  }

  get size() {
    return this.map.size
  }
}

export interface CheckPlan {
  paragraphs: Paragraph[]
  /** issues already known, in full-text offsets */
  known: Issue[]
  /** paragraphs that still need a check */
  todo: Paragraph[]
}

/** Split the text and sort paragraphs into "cached" and "needs a check". Blank lines are skipped. */
export function planCheck(text: string, lang: string, cache: ParagraphCache): CheckPlan {
  const paragraphs = splitParagraphs(text)
  const known: Issue[] = []
  const todo: Paragraph[] = []
  for (const p of paragraphs) {
    if (!p.text.trim()) continue
    const hit = cache.get(lang, p.text)
    if (hit) known.push(...shiftIssues(hit, p.start))
    else todo.push(p)
  }
  return { paragraphs, known, todo }
}
