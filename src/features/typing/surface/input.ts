// Native listeners for the hidden textarea. Characters come from `beforeinput` and
// composition events (dead keys like " + e = ë, Arabic IMEs, mobile keyboards), never from
// keydown.key. Keydown is only used for Backspace, Enter and the Caps Lock state.

export interface InputHandlers {
  /** typed text: usually one character, sometimes more (لا, a finished composition) */
  text: (data: string) => void
  /** backspace; `word` for Ctrl/Alt/Cmd+Backspace */
  backspace: (word: boolean) => void
  /** composition in progress ('' at start), null when it ends */
  composing: (text: string | null) => void
  caps: (on: boolean) => void
}

/** Kept in the textarea so mobile Backspace always has something to delete (and fires). */
const SENTINEL = ' '

const BLOCKED = new Set([
  'insertReplacementText',
  'insertFromPaste',
  'insertFromPasteAsQuotation',
  'insertFromDrop',
  'insertFromYank',
  'insertLineBreak',
  'insertParagraph',
  'insertTranspose',
  'deleteContentForward',
  'deleteWordForward',
  'deleteByCut',
  'deleteByDrag',
  'historyUndo',
  'historyRedo',
])

export function attachInput(ta: HTMLTextAreaElement, h: InputHandlers): () => void {
  let composing = false

  const reset = () => {
    if (ta.value !== SENTINEL) ta.value = SENTINEL
    try {
      ta.setSelectionRange(SENTINEL.length, SENTINEL.length)
    } catch {
      /* not focusable yet */
    }
  }

  const caps = (e: KeyboardEvent) => {
    if (typeof e.getModifierState === 'function') h.caps(e.getModifierState('CapsLock'))
  }

  const onKeyDown = (e: KeyboardEvent) => {
    caps(e)
    if (e.isComposing || composing || e.keyCode === 229) return
    if (e.key === 'Backspace') {
      e.preventDefault()
      h.backspace(e.ctrlKey || e.altKey || e.metaKey)
    } else if (e.key === 'Enter') {
      e.preventDefault()
    }
  }

  const onBeforeInput = (e: InputEvent) => {
    const t = e.inputType
    if (t === 'insertText') {
      e.preventDefault()
      if (e.data) h.text(e.data)
    } else if (t === 'deleteContentBackward') {
      e.preventDefault()
      h.backspace(false)
    } else if (t === 'deleteWordBackward' || t === 'deleteSoftLineBackward' || t === 'deleteHardLineBackward') {
      e.preventDefault()
      h.backspace(true)
    } else if (BLOCKED.has(t)) {
      e.preventDefault()
    }
  }

  const onCompositionStart = () => {
    composing = true
    h.composing('')
  }
  const onCompositionUpdate = (e: CompositionEvent) => h.composing(e.data ?? '')
  const onCompositionEnd = (e: CompositionEvent) => {
    composing = false
    h.composing(null)
    if (e.data) h.text(e.data)
    reset()
  }
  const onInput = () => {
    if (!composing) reset()
  }

  reset()
  ta.addEventListener('keydown', onKeyDown)
  ta.addEventListener('keyup', caps)
  ta.addEventListener('beforeinput', onBeforeInput)
  ta.addEventListener('compositionstart', onCompositionStart)
  ta.addEventListener('compositionupdate', onCompositionUpdate)
  ta.addEventListener('compositionend', onCompositionEnd)
  ta.addEventListener('input', onInput)
  ta.addEventListener('focus', reset)
  return () => {
    ta.removeEventListener('keydown', onKeyDown)
    ta.removeEventListener('keyup', caps)
    ta.removeEventListener('beforeinput', onBeforeInput)
    ta.removeEventListener('compositionstart', onCompositionStart)
    ta.removeEventListener('compositionupdate', onCompositionUpdate)
    ta.removeEventListener('compositionend', onCompositionEnd)
    ta.removeEventListener('input', onInput)
    ta.removeEventListener('focus', reset)
  }
}
