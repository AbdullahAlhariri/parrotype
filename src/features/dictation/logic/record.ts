import { useNest } from '@/state/nest'
import { useStats } from '@/state/stats'
import type { Issue, Lang } from '@/types'
import type { Grade } from './grade'
import type { DictationItem } from './items'
import { practiseWords, type SessionSummary } from './summary'
import { relevantIssues, type ExplainIn } from './explain'

/**
 * Mistakes that only make sense in their sentence (d/t, de/het, then/than...) go to the
 * mistake nest as the whole sentence; spelling mistakes go in as single words.
 */
export const SENTENCE_TAGS = new Set([
  'dt', 'kofschip', 'de-het', 'die-dat', 'jou-jouw', 'me-mijn', 'hun-hen', 'als-dan', 'lexical', 'its-its', 'homophone',
])

const noteText = (item: DictationItem, explainIn: ExplainIn) =>
  item.note ? ((explainIn === 'local' ? item.note.local : undefined) ?? item.note.en) : undefined

/** Store what the first check of a sentence got wrong. Call once per sentence. */
export function recordFirstCheck(item: DictationItem, grade: Grade, explainIn: ExplainIn) {
  const lang = item.lang
  const stats = useStats.getState()
  const nest = useNest.getState()
  const words = practiseWords(grade)
  for (const w of words) stats.addWordMiss(lang, w.word, w.typed, w.token.label?.kind)

  const trap = words.find((w) => w.token.label?.tag && SENTENCE_TAGS.has(w.token.label.tag))
  const pairMiss = !!item.target && grade.targetOk === false
  if (trap || pairMiss) {
    const tag = trap?.token.label?.tag ?? item.pairId
    nest.add({ lang, kind: 'sentence', target: item.text, wrong: [grade.typed], ruleId: tag ? `dictation.${tag}` : undefined, hint: noteText(item, explainIn) })
  }

  const counts = useStats.getState().words[lang]
  for (const w of words) {
    if (w === trap) continue
    if (w.token.label?.tag && SENTENCE_TAGS.has(w.token.label.tag)) continue
    // a finger slip earns a nest place only once it keeps happening on the same word
    if (w.token.label?.nature === 'motor' && (counts[w.word.toLowerCase()]?.count ?? 0) < 3) continue
    const tip = w.token.label ? ((explainIn === 'local' ? w.token.label.tip.local : undefined) ?? w.token.label.tip.en) : undefined
    nest.add({ lang, kind: 'word', target: w.word, wrong: [w.typed], hint: tip })
  }
}

/** Remember checker rules that fired on words the user got wrong. */
export function recordIssues(lang: Lang, grade: Grade, issues: readonly Issue[], titleOf: (ruleId: string) => string | undefined) {
  const stats = useStats.getState()
  for (const i of relevantIssues(grade, issues)) stats.addRuleHit(lang, i.ruleId, titleOf(i.ruleId) ?? i.message, i.text)
}

export function recordSession(lang: Lang, s: SessionSummary, config: string, pairs: boolean) {
  if (!s.items) return
  useStats.getState().addSession({
    mode: 'dictation',
    lang,
    durationMs: Math.round(s.durationMs),
    config,
    accuracy: s.accuracy,
    score: pairs ? s.targetsRight : s.correctWords,
    total: pairs ? s.targets : s.totalWords,
    mistakes: s.mistakes,
  })
}
