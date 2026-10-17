// @vitest-environment jsdom
import { createElement, act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import type { Lang } from '@/types'
import { useSettings } from '@/state/settings'
import { useFollowLang } from './useFollowLang'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function mount(shown: Lang | undefined) {
  const calls: Lang[] = []
  const Probe = ({ shown }: { shown: Lang | undefined }) => {
    useFollowLang(shown, (l) => calls.push(l))
    return null
  }
  const root = createRoot(document.createElement('div'))
  const render = (s: Lang | undefined) => act(() => root.render(createElement(Probe, { shown: s })))
  return { render: () => render(shown), rerender: render, calls, unmount: () => act(() => root.unmount()) }
}

const setLang = (l: Lang) => act(() => useSettings.getState().set('lang', l))

describe('useFollowLang', () => {
  afterEach(() => useSettings.getState().set('lang', 'nl'))

  it('moves the header to the language of a linked pack or text when the page opens', async () => {
    useSettings.getState().set('lang', 'ar')
    const m = mount('nl')
    await m.render()
    expect(useSettings.getState().lang).toBe('nl')
    // its own sync is not a switch by the user
    expect(m.calls).toEqual([])
    await m.unmount()
  })

  it('leaves the header alone when the page shows the practice language or nothing in particular', async () => {
    useSettings.getState().set('lang', 'en')
    const a = mount('en')
    await a.render()
    const b = mount(undefined)
    await b.render()
    expect(useSettings.getState().lang).toBe('en')
    expect([...a.calls, ...b.calls]).toEqual([])
    await a.unmount()
    await b.unmount()
  })

  it('calls onSwitch when the header switch changes after that', async () => {
    useSettings.getState().set('lang', 'nl')
    const m = mount('nl')
    await m.render()
    await setLang('ar')
    expect(m.calls).toEqual(['ar'])
    // the page has moved on to Arabic content: switching back is reported again
    await m.rerender('ar')
    await setLang('en')
    expect(m.calls).toEqual(['ar', 'en'])
    await m.unmount()
  })

  it('does not call onSwitch on a page without language-bound content', async () => {
    const m = mount(undefined)
    await m.render()
    await setLang('ar')
    expect(m.calls).toEqual([])
    await m.unmount()
  })
})
