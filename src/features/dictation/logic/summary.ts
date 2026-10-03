import type { ReactionId } from '@/lib/audio'
import type { TypoKind } from '@/types'
import type { Grade, GradedToken, HintLevel } from './grade'
import type { DictationItem } from './items'

/** What happened with one sentence. */
export interface ItemResult {
  item: DictationItem
  /** the first check: the score counts this one */
  first: Grade
  firstTyped: string
  attempts: number
  /** highest hint level reached (4 = revealed) */
  hint: HintLevel
  listens: number
  ms: number
}

export interface PractiseWord {
  /** correct form */
  word: string
  /** what was typed instead (latest first, unique) */
  typed: string[]
  count: number
  kind?: TypoKind
  tag?: string
  /** a finger slip rather than a spelling question */
  motor?: boolean
}

export interface SessionSummary {
  items: number
  correctWords: number
  totalWords: number
  /** 0-100, words right on the first check */
  accuracy: number
  /** sentences right on the first check */
  clean: number
  /** wrong words on first checks */
  mistakes: number
  /** checks that needed at least one hint */
  hinted: number
  revealed: number
  /** minimal pairs: pair words right on the first check */
  targetsRight: number
  targets: number
  durationMs: number
  toPractise: PractiseWord[]
}

/**
 * Words worth practising from a first attempt: wrong words and run-together/split words.
 * Skipped words (not heard) and a missed capital at the start of a sentence are left out:
 * neither is a spelling problem.
 */
export function practiseWords(g: Grade): { token: GradedToken; word: string; typed: string }[] {
  return g.wrong
    .filter((t) => t.status === 'wrong')
    .filter((t) => !(t.label?.kind === 'case' && t.sentenceStart))
    .map((t) => ({ token: t, word: t.op.expected ?? '', typed: t.op.typed ?? '' }))
}

const MOTOR_TAGS = new Set(['neighbour', 'mirror', 'same-finger', 'hand-shift', 'repeat', 'roll', 'cross-hand', 'same-hand', 'wrong-double', 'cut-short', 'dead-key', 'shift', 'wrong-layout'])

export function summarise(results: readonly ItemResult[]): SessionSummary {
  const words = new Map<string, PractiseWord>()
  let correctWords = 0
  let totalWords = 0
  let mistakes = 0
  let clean = 0
  let hinted = 0
  let revealed = 0
  let targetsRight = 0
  let targets = 0
  let durationMs = 0
  for (const r of results) {
    correctWords += r.first.correct
    totalWords += r.first.total
    mistakes += r.first.wrong.length
    if (r.first.perfect) clean++
    if (r.hint >= 2) hinted++
    if (r.hint >= 4) revealed++
    if (r.item.target) {
      targets++
      if (r.first.targetOk) targetsRight++
    }
    durationMs += r.ms
    for (const { token, word, typed } of practiseWords(r.first)) {
      const key = word.toLowerCase()
      const cur = words.get(key)
      if (cur) {
        cur.count++
        cur.typed = [typed, ...cur.typed.filter((x) => x !== typed)]
      } else {
        words.set(key, { word, typed: [typed], count: 1, kind: token.label?.kind, tag: token.label?.tag, motor: token.label?.nature === 'motor' })
      }
    }
  }
  // most missed first; on a tie, spelling rules (d/t, ei/ij...) before plain slips
  const weight = (w: PractiseWord) => (w.motor ? 0 : 1) + (w.tag && !MOTOR_TAGS.has(w.tag) ? 2 : 0)
  const toPractise = [...words.values()].sort((a, b) => b.count - a.count || weight(b) - weight(a))
  return {
    items: results.length,
    correctWords,
    totalWords,
    accuracy: totalWords ? Math.round((correctWords / totalWords) * 100) : 100,
    clean,
    mistakes,
    hinted,
    revealed,
    targetsRight,
    targets,
    durationMs,
    toPractise,
  }
}

/** A perfect set gets the mascot's 'perfect' line, any other set 'done'. */
export const summaryReaction = (s: SessionSummary): ReactionId => (s.items > 0 && s.clean === s.items ? 'perfect' : 'done')

/** ["wordt.", "wordt.", "wordt."]: the parrot only ever repeats the correct form (his bubble shows them one by one). */
export const keesRepeat = (word: string, times = 3) => Array.from({ length: times }, () => `${word}.`)

/** "3 min 12 s", "48 s" */
export function formatDuration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(s / 60)
  return m ? `${m} min ${s % 60} s` : `${s} s`
}

/**
 * One dry, specific line about the run. `name` turns a typo tag into words ("d/t ending"),
 * `mascot` is the parrot's name in this language.
 */
export function feedbackLine(s: SessionSummary, name: (tag: string) => string, mascot = 'Kees'): string {
  if (!s.items) return ''
  if (s.targets) {
    if (s.targetsRight === s.targets) return `The right word every time, ${s.targets} out of ${s.targets}.`
    const miss = s.targets - s.targetsRight
    return `${miss} of ${s.targets} times the other word. ${mascot} will bring those back.`
  }
  if (!s.mistakes) return 'Every word right on the first try.'
  const tags = new Map<string, number>()
  for (const w of s.toPractise) if (w.tag) tags.set(w.tag, (tags.get(w.tag) ?? 0) + w.count)
  const misses = s.toPractise.reduce((n, w) => n + w.count, 0)
  const [top, n] = [...tags.entries()].sort((a, b) => b[1] - a[1])[0] ?? []
  if (top && n! >= 2 && n! * 2 >= misses) return `${n} of your ${misses} misses were ${name(top).toLowerCase()}. That is the one to drill.`
  const off = `${s.mistakes} ${s.mistakes === 1 ? 'word' : 'words'} off on the first try`
  return s.revealed ? `${off}. ${s.revealed} ${s.revealed === 1 ? 'sentence needed' : 'sentences needed'} the answer.` : `${off}, all fixed without the answer.`
}
