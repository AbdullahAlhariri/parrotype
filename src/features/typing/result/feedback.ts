import type { TypingResult } from '@/types'
import { classifyTypo, typoName, type TypoLabel } from '@/engine'
import type { KeesMood } from '@/components/kees'
import { mascotName } from '@/lib/mascot'

export interface PractiseItem {
  /** the target word as it appeared in the text */
  expected: string
  /** what was typed instead */
  typed: string
  label: TypoLabel | null
  /** display name of the typo type, e.g. "Neighbour key", "d/t ending" */
  name: string
}

const trimPunct = (w: string) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')

/** Words left wrong, once each, with a typo label (first `max`). */
export function practiseItems(r: TypingResult, max = 12): PractiseItem[] {
  const seen = new Set<string>()
  const out: PractiseItem[] = []
  r.words.forEach((w, i) => {
    if (w.correct || !w.typed || seen.has(w.expected)) return
    seen.add(w.expected)
    const label = classifyTypo(w.expected, w.typed, r.lang, { prev: r.words[i - 1]?.expected, next: r.words[i + 1]?.expected })
    const id = label?.tag ?? label?.kind ?? w.kind ?? 'substitution'
    out.push({ expected: w.expected, typed: w.typed, label, name: typoName(id, r.lang).en })
  })
  return out.slice(0, max)
}

/** The words to send to practice: punctuation stripped, no duplicates. */
export function practiseWords(items: PractiseItem[]): string[] {
  return [...new Set(items.map((it) => trimPunct(it.expected)).filter(Boolean))]
}

/** Words that went wrong while typing but were fixed before moving on. */
export function fixedWords(r: TypingResult): string[] {
  return [...new Set(r.words.filter((w) => w.correct && w.everWrong).map((w) => w.expected))]
}

/** The word the mascot repeats: the first spelling (knowledge) mistake, else the first mistake. */
export function repeatWord(items: PractiseItem[]): string | undefined {
  const pick = items.find((it) => it.label?.nature === 'cognitive') ?? items[0]
  return pick ? trimPunct(pick.expected) || pick.expected : undefined
}

export function keesMood(r: TypingResult, isPb: boolean): KeesMood {
  if (isPb) return 'celebrate'
  if (r.accuracy < 70) return 'oops-big'
  if (r.accuracy < 85) return 'oops'
  return 'idle'
}

/** "30s", "1m 05s" */
export function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`
}

/** One plain, specific sentence about the run. No exclamation marks, no guilt. */
export function feedbackLine(r: TypingResult, items: PractiseItem[]): string {
  const typed = r.chars.correct + r.chars.incorrect + r.chars.extra
  const name = mascotName(r.lang)
  if (!typed) return `Nothing typed. ${name} waited politely.`
  const wrong = r.words.filter((w) => !w.correct).length
  const fixed = fixedWords(r).length
  if (!wrong && !fixed && r.accuracy >= 99.99) return `No typos at all. ${name} checked twice.`
  if (!wrong && fixed) return fixed === 1 ? 'Every word right in the end. You fixed one along the way.' : `Every word right in the end. You fixed ${fixed} along the way.`
  if (r.accuracy < 85 && r.rawWpm >= 45) return `Fast hands, loose letters. Try about ${Math.max(5, Math.round((r.rawWpm * 0.9) / 5) * 5)} wpm next time.`
  if (r.accuracy < 75) return 'Rough run. Your best runs often come right after a slow one.'
  if (r.accuracy >= 97 && r.wpm < 30) return 'Slow and spotless. Speed comes later; accuracy was the hard part.'
  const counts = new Map<string, number>()
  for (const it of items) counts.set(it.name, (counts.get(it.name) ?? 0) + 1)
  const top = [...counts].sort((a, b) => b[1] - a[1])[0]
  if (top && top[1] >= 2 && items.length >= 2) return `${top[0]}: ${top[1]} of your ${items.length} mistakes.`
  if (r.consistency >= 80) return `Steady rhythm: ${Math.round(r.consistency)}% consistency.`
  return wrong === 1 ? 'One word left wrong. It is listed below.' : `${wrong} words left wrong. They are listed below.`
}

export interface TipGroup {
  name: string
  tip: string
  tipLocal?: string
  n: number
}

/**
 * Up to `max` tips for the most common typo types. Types that share a tip (swapped letters on
 * one hand and on two hands) are merged under their common name, so no tip is shown twice.
 */
export function tipGroups(items: PractiseItem[], max = 2): TipGroup[] {
  const groups = new Map<string, TipGroup & { names: Set<string> }>()
  for (const it of items) {
    if (!it.label) continue
    const tip = it.label.tip.en
    const g = groups.get(tip)
    if (g) {
      g.n++
      g.names.add(it.name)
    } else groups.set(tip, { name: it.name, tip, tipLocal: it.label.tip.local, n: 1, names: new Set([it.name]) })
  }
  return [...groups.values()]
    .sort((a, b) => b.n - a.n)
    .slice(0, max)
    .map(({ names, ...g }) => ({ ...g, name: names.size > 1 ? commonName([...names]) : g.name }))
}

/** "Swapped letters (one hand)" + "Swapped letters (two hands)" -> "Swapped letters" */
function commonName(names: string[]): string {
  const bare = names.map((n) => n.replace(/\s*\(.*\)$/, ''))
  return bare.every((b) => b === bare[0]) ? bare[0] : names[0]
}
