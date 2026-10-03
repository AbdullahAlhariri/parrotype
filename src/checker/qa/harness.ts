/// <reference types="node" />
// Test-only: the full free-writing pipeline (rule pack + Hunspell spell layer) as the worker runs it,
// over whole corpora. Never imported by the app.
import type { Issue, Lang } from '@/types'
import type { CheckerCore, EnglishVariant } from '../spell/core'
import { nodeCore } from '../spell/testing'

let core: CheckerCore | undefined
/** one core for all corpus tests: Hunspell loads once per dictionary */
export const qaCore = () => (core ??= nodeCore())

export interface CheckOpts {
  variant?: EnglishVariant
  strictness?: 'normal' | 'strict'
}

export async function checkFull(text: string, lang: Lang, opts: CheckOpts = {}): Promise<Issue[]> {
  const r = await qaCore().check({ text, lang, variant: opts.variant, strictness: opts.strictness ?? 'normal' })
  if (!r.spell) throw new Error(`no dictionary for ${lang}`)
  return r.issues
}

/** what the UI counts as a mistake */
export const serious = (issues: Issue[]) => issues.filter((i) => i.confidence !== 'low')

export function describeIssue(i: Issue, text: string): string {
  const around = text.slice(Math.max(0, i.offset - 30), i.offset + i.length + 30).replace(/\s+/g, ' ')
  return `${i.confidence} ${i.ruleId} «${i.text}» -> ${JSON.stringify(i.replacements.slice(0, 3))} … ${around}`
}
