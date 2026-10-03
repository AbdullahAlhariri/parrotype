import type { LetterState } from '@/engine'

// Arabic letters must stay joined while parts of a word change colour. We group letters with
// the same state into runs (one inline span each) and put a zero-width joiner (U+200D) on both
// sides of a boundary between two letters that connect, so engines that shape each span on its
// own (Safari/WebKit) still draw initial/medial/final forms. Lam + alef is never split with a
// ZWJ (that destroys the لا ligature); the pair takes the more important of the two states.
// See docs/research/arabic-typing.md section 4.3 and appendix B.

export const ZWJ = '\u200D'

const DUAL = new Set(Array.from('ئبتثجحخسشصضطظعغفقكلمنهيىپچڤگکی'))
const RIGHT = new Set(Array.from('آأؤإاةدذرزوژٱ'))
const CAUSING = new Set(['\u0640', ZWJ])
const ALEFS = new Set(Array.from('اأإآ'))
const isTransparent = (c: string) => /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/.test(c)
const joinsForward = (c: string) => DUAL.has(c) || CAUSING.has(c)
const joinsBackward = (c: string) => DUAL.has(c) || RIGHT.has(c) || CAUSING.has(c)

/** Which state wins when lam-alef has to be coloured as one unit: an error is never hidden. */
const PRIORITY: Record<LetterState, number> = { incorrect: 5, extra: 4, missed: 3, untyped: 2, correct: 1 }

export interface Run {
  text: string
  state: LetterState
  /** letters [from, to) of the word live in this run */
  from: number
  to: number
}

/** Per letter: which run holds it and its UTF-16 range inside that run's text. */
export interface LetterSlot {
  run: number
  start: number
  end: number
}

export interface RunLayout {
  runs: Run[]
  slots: LetterSlot[]
}

export function buildRuns(chars: string[], states: LetterState[]): RunLayout {
  const st = states.slice()
  const lamAlef = new Set<number>()
  for (let i = 0; i + 1 < chars.length; i++) {
    if (chars[i] === 'ل' && ALEFS.has(chars[i + 1])) {
      lamAlef.add(i)
      if (st[i] !== st[i + 1]) {
        const s = PRIORITY[st[i]] >= PRIORITY[st[i + 1]] ? st[i] : st[i + 1]
        st[i] = st[i + 1] = s
      }
    }
  }
  const runs: Run[] = []
  const slots: LetterSlot[] = []
  for (let i = 0; i < chars.length; i++) {
    const last = runs[runs.length - 1]
    if (last && last.state === st[i]) {
      slots.push({ run: runs.length - 1, start: last.text.length, end: last.text.length + chars[i].length })
      last.text += chars[i]
      last.to = i + 1
      continue
    }
    let lead = ''
    if (last) {
      const prev = Array.from(chars[i - 1]).filter((c) => !isTransparent(c))[0] ?? ''
      const next = Array.from(chars[i])[0] ?? ''
      if (!lamAlef.has(i - 1) && joinsForward(prev) && joinsBackward(next)) {
        last.text += ZWJ
        lead = ZWJ
      }
    }
    runs.push({ text: lead + chars[i], state: st[i], from: i, to: i + 1 })
    slots.push({ run: runs.length - 1, start: lead.length, end: lead.length + chars[i].length })
  }
  return { runs, slots }
}
