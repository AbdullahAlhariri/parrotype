import type { Issue } from '@/types'

const WORD = /[\p{L}\p{N}\p{M}]+(?:['’-][\p{L}\p{N}\p{M}]+)*/gu

export const countWords = (text: string) => (text.match(WORD) ?? []).length

/** Characters without counting line breaks. */
export const countChars = (text: string) => text.replace(/\n/g, '').length

/** 65 000 ms -> "1:05", 3 720 000 ms -> "1:02:00" */
export function formatDuration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

const END = /[.!?…؟]/
const CLOSERS = /["'”’»)\]]/

/** Bounds of the sentence around an offset. Sentences end at . ! ? … ؟ (plus closing quotes) or a line break. */
export function sentenceBounds(text: string, offset: number): { start: number; end: number } {
  let start = offset
  while (start > 0) {
    const c = text[start - 1]
    if (c === '\n') break
    if (END.test(c) && /\s/.test(text[start] ?? ' ')) break
    start--
  }
  while (start < offset && /\s/.test(text[start])) start++
  let end = offset
  while (end < text.length) {
    const c = text[end]
    if (c === '\n') break
    end++
    if (END.test(c)) {
      while (end < text.length && (END.test(text[end]) || CLOSERS.test(text[end]))) end++
      if (end >= text.length || /\s/.test(text[end])) break
    }
  }
  while (end > start && /\s/.test(text[end - 1])) end--
  return { start, end }
}

/** Apply replacements (first suggestion of each issue) inside [start, end), right to left. */
export function applyFixes(text: string, issues: readonly Issue[], start = 0, end = text.length): string {
  const inside = issues
    .filter((i) => i.replacements.length && i.offset >= start && i.offset + i.length <= end)
    .sort((a, b) => b.offset - a.offset)
  let out = text.slice(start, end)
  let lastStart = Infinity
  for (const i of inside) {
    if (i.offset + i.length > lastStart) continue // overlapping, skip
    const rel = i.offset - start
    out = out.slice(0, rel) + i.replacements[0] + out.slice(rel + i.length)
    lastStart = i.offset
  }
  return out
}

/** True when the word at offset starts a sentence (so its capital is positional, not part of the word). */
export function startsSentence(text: string, offset: number) {
  return sentenceBounds(text, offset).start === offset
}

/** A short excerpt of a long sentence around [from, to), cut at word boundaries. */
export function excerpt(text: string, from: number, to: number, max = 160): { start: number; end: number } {
  const b = sentenceBounds(text, from)
  if (b.end - b.start <= max) return b
  const pad = Math.max(20, Math.floor((max - (to - from)) / 2))
  let start = Math.max(b.start, from - pad)
  let end = Math.min(b.end, to + pad)
  while (start > b.start && !/\s/.test(text[start - 1])) start--
  while (end < b.end && !/\s/.test(text[end])) end++
  return { start, end }
}
