import type { Issue, Lang } from '@/types'
import { useStats } from '@/state/stats'
import { isMistake, isSpelling, type TitleFor, type WriteSummary } from './report'
import { excerpt } from './text'

interface Args {
  lang: Lang
  text: string
  issues: readonly Issue[]
  summary: WriteSummary
  activeMs: number
  /** human readable, e.g. the prompt kind: "grammar trap", "free writing" */
  config: string
  titleFor: TitleFor
}

/**
 * Store a finished text in the stats: one session, a rule hit per rule issue (with a short snippet)
 * and a word miss per misspelled word that has a known right form. Hints are not mistakes.
 */
export function recordWriteSession({ lang, text, issues, summary, activeMs, config, titleFor }: Args) {
  const stats = useStats.getState()
  stats.addSession({ mode: 'write', lang, durationMs: Math.round(activeMs), config, mistakes: summary.mistakes })
  for (const i of issues) {
    if (!isMistake(i)) continue
    if (isSpelling(i)) {
      if (i.replacements[0]) stats.addWordMiss(lang, i.replacements[0], i.text, 'spelling')
      // plain dictionary misses are words, not rules; misspelling-map rules count as both
      if (i.source !== 'rules') continue
    }
    const { start, end } = excerpt(text, i.offset, i.offset + i.length, 60)
    stats.addRuleHit(lang, i.ruleId, titleFor(i), text.slice(start, end).trim())
  }
}
