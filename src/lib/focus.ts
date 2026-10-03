/**
 * Focus mode contract: typing surfaces call setTyping(true) on the first keystroke
 * and setTyping(false) when the run ends or the mouse moves. The shell fades the
 * header/footer while <body data-typing="true">.
 */
export function setTyping(on: boolean) {
  if (on) document.body.dataset.typing = 'true'
  else delete document.body.dataset.typing
}

if (typeof window !== 'undefined') {
  window.addEventListener('mousemove', () => setTyping(false), { passive: true })
}
