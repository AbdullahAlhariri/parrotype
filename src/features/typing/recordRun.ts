import type { Mode, SessionRecord, TypingResult } from '@/types'
import { classifyTypo, keyStatsFromEvents } from '@/engine'
import { useStats } from '@/state/stats'
import { useNest } from '@/state/nest'
import { getSettings } from '@/state/settings'

/** Runs shorter than this never set a personal best (a 3-word sprint is not a record). */
export const PB_MIN_MS = 10_000

/** Wrong keypresses, the same count that lowers accuracy (fixed ones included). */
export const countMistakes = (r: TypingResult) => r.keyEvents.filter((e) => e.typed !== 'Backspace' && !e.correct).length

/** Personal-best key: "nl|time 30". */
export const bestKey = (r: TypingResult, config: string) => `${r.lang}|${config}`

/**
 * Store one finished typing run: the session, per-key stats, every word left wrong (with its
 * typo kind), a personal best ('typing' mode, 10 s or longer) and spelling (cognitive)
 * mistakes in the mistake nest for spaced repetition.
 */
export function recordTypingRun(result: TypingResult, mode: Mode, config: string): { session: SessionRecord; isPb: boolean } {
  const stats = useStats.getState()
  const lang = result.lang

  const session = stats.addSession({
    mode,
    lang,
    durationMs: Math.round(result.durationMs),
    config,
    wpm: result.wpm,
    rawWpm: result.rawWpm,
    accuracy: result.accuracy,
    consistency: result.consistency,
    chars: result.chars,
    mistakes: countMistakes(result),
  })

  const { keys, bigrams } = keyStatsFromEvents(result.keyEvents)
  if (Object.keys(keys).length || Object.keys(bigrams).length) stats.addKeyStats(lang, keys, bigrams)

  const local = getSettings().explainIn === 'local'
  const nest = useNest.getState()
  result.words.forEach((w, i) => {
    if (w.correct || !w.typed) return
    const label = classifyTypo(w.expected, w.typed, lang, { prev: result.words[i - 1]?.expected, next: result.words[i + 1]?.expected })
    stats.addWordMiss(lang, w.expected, w.typed, label?.kind ?? w.kind)
    if (label?.nature === 'cognitive') {
      nest.add({ lang, kind: 'word', target: w.expected, wrong: [w.typed], hint: (local && label.tip.local) || label.tip.en })
    }
  })

  const isPb = mode === 'typing' && result.durationMs >= PB_MIN_MS && result.wpm > 0 ? stats.submitBest(bestKey(result, config), result.wpm) : false

  return { session, isPb }
}
