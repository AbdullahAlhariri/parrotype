import type { KeyEvent } from '@/types'

/** What a recorded keystroke did. Sessions record it; plain KeyEvents get it inferred. */
export type KeyOp =
  /** a character was added at (wordIndex, charIndex) */
  | 'insert'
  /** the keypress was counted but not applied (stop on error) */
  | 'blocked'
  /** space committed the word */
  | 'commit'
  /** backspace: the word was cut back to charIndex characters */
  | 'delete'
  /** backspace at the start of a word moved back into the previous word */
  | 'back'

export interface EngineKeyEvent extends KeyEvent {
  op: KeyOp
}

export const opOf = (ev: KeyEvent): KeyOp =>
  (ev as Partial<EngineKeyEvent>).op ?? (ev.typed === 'Backspace' ? 'delete' : ev.typed === ' ' ? 'commit' : 'insert')

/**
 * Rebuilds the typed text of every word from a keystroke log. Inserts set the word to
 * exactly charIndex chars before appending, so logs without `op` still converge.
 */
export class Replayer {
  /** typed characters per word (correct presses store the expected character) */
  readonly typed: string[][] = []
  /** per typed character: was it correct */
  readonly ok: boolean[][] = []
  /** index of the word the caret is in */
  current = 0

  apply(ev: KeyEvent) {
    const w = ev.wordIndex
    const i = ev.charIndex
    switch (opOf(ev)) {
      case 'insert': {
        const chars = (this.typed[w] ??= [])
        const flags = (this.ok[w] ??= [])
        chars.length = Math.min(chars.length, i)
        flags.length = chars.length
        while (chars.length < i) {
          chars.push('�')
          flags.push(false)
        }
        chars.push(ev.correct && ev.expected ? ev.expected : ev.typed)
        flags.push(ev.correct)
        this.current = w
        break
      }
      case 'commit':
        this.current = w + 1
        break
      case 'delete':
      case 'back':
        if (this.typed[w]) {
          this.typed[w].length = Math.min(this.typed[w].length, i)
          this.ok[w].length = this.typed[w].length
        }
        this.current = w
        break
      case 'blocked':
        this.current = w
        break
    }
  }

  text(w: number): string {
    return (this.typed[w] ?? []).join('')
  }

  /** true when the first `i` characters of word w are all typed and correct */
  cleanPrefix(w: number, i: number): boolean {
    const flags = this.ok[w] ?? []
    if (flags.length < i) return false
    for (let k = 0; k < i; k++) if (!flags[k]) return false
    return true
  }
}
