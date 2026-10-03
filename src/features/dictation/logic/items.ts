import type { DictationLevel, DictationNote, DictationSentence, MinimalPair } from '@/content/dictation'
import type { Lang } from '@/types'

/** One thing Kees says during a session: a dictation sentence or a minimal-pair sentence. */
export interface DictationItem {
  /** sentence id, or `${pairId}:${index}` for minimal pairs */
  id: string
  lang: Lang
  text: string
  /** what the voice reads, when different from text */
  say?: string
  level?: DictationLevel
  focus: string[]
  note?: DictationNote
  /** minimal-pair mode: the pair member in this sentence, and the set it belongs to */
  target?: string
  pairId?: string
}

export function itemFromSentence(s: DictationSentence, lang: Lang): DictationItem {
  return { id: s.id, lang, text: s.text, say: s.say, level: s.level, focus: s.focus, note: s.note }
}

export function itemsFromPair(p: MinimalPair): DictationItem[] {
  return p.sentences.map((s, i) => ({
    id: `${p.id}:${i}`,
    lang: p.lang,
    text: s.text,
    focus: [p.id],
    note: p.note,
    target: s.word,
    pairId: p.id,
  }))
}

export type DictationMode = 'sentences' | 'pairs'
export type Playback = 'listen' | 'memory'

export interface DictationConfig {
  mode: DictationMode
  level: DictationLevel
  /** focus tags; empty = everything */
  focus: string[]
  /** minimal-pair set ids; empty = all sets */
  pairs: string[]
  length: 5 | 10 | 20
  playback: Playback
}

export const DEFAULT_CONFIG: DictationConfig = {
  mode: 'sentences',
  level: 1,
  focus: [],
  pairs: [],
  length: 10,
  playback: 'listen',
}

/** Human-readable config for the session record, e.g. "nl level 2 dt", "en which one then/than". */
export function configLabel(lang: Lang, c: DictationConfig, memory: boolean, pairName: (id: string) => string = (id) => id): string {
  const parts: string[] = [lang]
  if (c.mode === 'pairs') {
    parts.push('which one')
    if (c.pairs.length) parts.push(c.pairs.map(pairName).join(' '))
  } else {
    parts.push(`level ${c.level}`)
    if (c.focus.length) parts.push(c.focus.join(' '))
  }
  if (memory) parts.push('memory')
  return parts.join(' ')
}
