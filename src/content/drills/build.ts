import type { Lang } from '@/types'
import type { DrillItem, DrillPack, Explained } from './types'

/**
 * Compact authoring format for drill items:
 *
 *   ['Morgen {{word|wordt}} ik achttien.', 'ik']
 *
 * Inside the braces: the answer first, then the wrong options for choose mode, split by |.
 * Extra right answers go after a slash: {{zij/ze|hun|hen}}. The second element is a key
 * into the pack's `hints`.
 */
export type ItemSource = readonly [sentence: string, hint: string]

interface PackSource {
  id: string
  lang: Lang
  title: string
  blurb: string
  rule: Explained
  hints: Record<string, Explained>
  items: readonly ItemSource[]
}

export const GAP_RE = /\{\{([^{}]+)\}\}/g

export function parseItem(src: string, hint?: Explained): DrillItem {
  const match = [...src.matchAll(GAP_RE)]
  // a malformed item keeps its raw sentence so the content test can point at it
  if (match.length !== 1) return { sentence: src, answer: '', alternatives: [], hint }
  const [right, ...wrong] = match[0][1].split('|').map((s) => s.trim())
  const [answer, ...accept] = right.split('/').map((s) => s.trim())
  const item: DrillItem = {
    sentence: src.replace(match[0][0], `{{${answer}}}`),
    answer,
    alternatives: wrong,
    hint,
  }
  if (accept.length) item.accept = accept
  return item
}

export function definePack({ hints, items, ...meta }: PackSource): DrillPack {
  return { ...meta, items: items.map(([sentence, key]) => parseItem(sentence, hints[key])) }
}
