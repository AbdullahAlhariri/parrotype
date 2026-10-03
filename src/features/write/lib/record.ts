import type { Issue, Lang } from '@/types'
import { useStats } from '@/state/stats'
import type { Recorded } from './drafts'
import { isMistake, isSpelling, type TitleFor } from './report'
import { excerpt } from './text'

/** Extra writing after a finish only becomes its own session when it is at least this long. */
const MIN_EXTRA_MS = 30_000

interface Args {
  lang: Lang
  text: string
  issues: readonly Issue[]
  activeMs: number
  /** human readable, e.g. the prompt kind: "grammar trap", "free writing" */
  config: string
  titleFor: TitleFor
  /** what an earlier finish of the same draft already stored */
  already?: Recorded
}

/** Which mistakes and how much writing time a finish adds on top of what is already stored. */
export function planRecord(issues: readonly Issue[], activeMs: number, already?: Recorded) {
  const known = new Set(already?.keys ?? [])
  const fresh = issues.filter((i) => isMistake(i) && !known.has(i.id))
  const ms = Math.max(0, Math.round(activeMs - (already?.ms ?? 0)))
  const session = !already || fresh.length > 0 || ms >= MIN_EXTRA_MS
  const keys = [...new Set([...known, ...issues.filter(isMistake).map((i) => i.id)])].slice(-500)
  return { fresh, ms, session, recorded: { ms: Math.max(activeMs, already?.ms ?? 0), keys } satisfies Recorded }
}

/**
 * Store a finished text in the stats: one session, a rule hit per rule issue (with a short snippet)
 * and a word miss per misspelled word that has a known right form. Hints are not mistakes.
 * Finishing the same draft again ("Keep writing", then Finish) only adds the new mistakes and the
 * extra writing time. Returns what is now recorded, to keep on the draft.
 */
export function recordWriteSession({ lang, text, issues, activeMs, config, titleFor, already }: Args): Recorded {
  const stats = useStats.getState()
  const plan = planRecord(issues, activeMs, already)
  if (plan.session) stats.addSession({ mode: 'write', lang, durationMs: plan.ms, config, mistakes: plan.fresh.length })
  for (const i of plan.fresh) {
    if (isSpelling(i)) {
      if (i.replacements[0]) stats.addWordMiss(lang, i.replacements[0], i.text, 'spelling')
      // plain dictionary misses are words, not rules; misspelling-map rules count as both
      if (i.source !== 'rules') continue
    }
    const { start, end } = excerpt(text, i.offset, i.offset + i.length, 60)
    stats.addRuleHit(lang, i.ruleId, titleFor(i), text.slice(start, end).trim())
  }
  return plan.recorded
}
