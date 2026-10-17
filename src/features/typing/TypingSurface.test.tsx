// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TypingResult } from '@/types'
import { TypingSurface } from './TypingSurface'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let now = 0

function mount(props: { timeLimitMs?: number; words?: string[] }) {
  const done: TypingResult[] = []
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  act(() => {
    root.render(
      createElement(TypingSurface, {
        words: props.words ?? ['een', 'twee', 'drie', 'vier', 'vijf'],
        lang: 'nl',
        timeLimitMs: props.timeLimitMs,
        onFinish: (r: TypingResult) => done.push(r),
        showKeyboard: false,
      }),
    )
  })
  const ta = host.querySelector('textarea')!
  const type = (data: string, at: number) => {
    now = at
    act(() => {
      ta.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data, bubbles: true, cancelable: true }))
    })
  }
  return { done, type, unmount: () => act(() => root.unmount()) }
}

describe('TypingSurface', () => {
  beforeEach(() => {
    now = 0
    vi.spyOn(performance, 'now').mockImplementation(() => now)
  })
  afterEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('finishes when the last word is typed', () => {
    const m = mount({ words: ['een', 'twee'] })
    m.type('e', 0)
    m.type('en twee', 500)
    expect(m.done).toHaveLength(1)
    expect(m.done[0].accuracy).toBe(100)
    m.unmount()
  })

  it('shows the result when a key arrives after the time limit, before the clock tick noticed', () => {
    const m = mount({ timeLimitMs: 1000 })
    m.type('e', 0)
    m.type('e', 400)
    // no interval tick ran in between: the key itself finds the time up and ends the session
    m.type('n', 1030)
    expect(m.done).toHaveLength(1)
    expect(m.done[0].durationMs).toBe(1000)
    // later keys do nothing more
    m.type(' ', 1100)
    expect(m.done).toHaveLength(1)
    m.unmount()
  })
})
