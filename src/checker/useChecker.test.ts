// @vitest-environment jsdom
import { createElement, act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it } from 'vitest'
import type { Issue } from '@/types'
import { useChecker, type CheckerState } from './index'

// jsdom has no Worker, so this runs the rules-only fallback: enough to test the hook's timing.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function mount(initial: string) {
  let state: CheckerState = { issues: [], checking: false, checkedText: '' }
  const Probe = ({ text }: { text: string }) => {
    state = useChecker(text, 'nl', { delay: 20 })
    return null
  }
  const el = document.createElement('div')
  const root = createRoot(el)
  const render = (text: string) => act(() => root.render(createElement(Probe, { text })))
  return { render: async () => render(initial), rerender: render, get: () => state, unmount: () => act(() => root.unmount()) }
}

const wait = (ms: number) => act(() => new Promise((r) => setTimeout(r, ms)))
async function until(fn: () => boolean, ms = 5000) {
  for (let t = 0; t < ms && !fn(); t += 50) await wait(50)
}
const texts = (is: Issue[]) => is.map((i) => i.text)

describe('useChecker', () => {
  it('checks after a pause and keeps issues aligned while typing', { timeout: 10_000 }, async () => {
    const m = mount('Hij word boos.')
    await m.render()
    expect(m.get().checking).toBe(true)
    await until(() => !m.get().checking)
    expect(m.get().checking).toBe(false)
    expect(texts(m.get().issues)).toEqual(['word'])
    expect(m.get().checkedText).toBe('Hij word boos.')

    // typing in front shifts the issue right away, before the next check
    await m.rerender('Ja, hij word boos.')
    expect(m.get().issues.map((i) => i.offset)).toEqual([8])

    // empty text clears
    await m.rerender('')
    expect(m.get().issues).toEqual([])
    await m.unmount()
  })
})
