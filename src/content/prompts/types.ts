import type { Lang } from '@/types'

/** What sort of writing a prompt asks for. 'trap' prompts are built to force a tricky form. */
export type PromptKind = 'story' | 'opinion' | 'describe' | 'journal' | 'letter' | 'explain' | 'trap'

export interface WritingPrompt {
  /** stable id, e.g. 'nl-p07'. Stored in drafts and stats, so never renumber. */
  id: string
  lang: Lang
  kind: PromptKind
  text: string
  /** suggested length in words */
  words: number
  /** structures the prompt tends to bring out (dt, participle, then-than ...) */
  focus: string[]
  /** short English nudge for trap prompts: which forms to watch */
  watch?: string
}

export const PROMPT_KINDS: { id: PromptKind; label: string; short: string }[] = [
  { id: 'story', label: 'story starter', short: 'story' },
  { id: 'opinion', label: 'opinion', short: 'opinion' },
  { id: 'describe', label: 'describe', short: 'describe' },
  { id: 'journal', label: 'journal', short: 'journal' },
  { id: 'letter', label: 'letter', short: 'letter' },
  { id: 'explain', label: 'explain to a friend', short: 'explain' },
  { id: 'trap', label: 'grammar trap', short: 'traps' },
]

export const kindLabel = (k: PromptKind) => PROMPT_KINDS.find((x) => x.id === k)?.label ?? k
