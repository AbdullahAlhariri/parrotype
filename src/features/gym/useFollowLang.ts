import { useEffect, useEffectEvent, useRef } from 'react'
import type { Lang } from '@/types'
import { useSettings } from '@/state/settings'

/**
 * Keeps a page and the header's practice language in step, both ways.
 *
 * A link to content in another language (a bookmark, a shared URL) moves the header switch to
 * that language when the page opens, the same way the stats page's practice links do, so the
 * switch always names what is on screen. After that the header leads: switching it calls
 * `onSwitch`, and the page moves to the new language's packs or texts.
 */
export function useFollowLang(shownLang: Lang | undefined, onSwitch: (lang: Lang) => void) {
  const lang = useSettings((s) => s.lang)
  const prev = useRef(lang)
  const switched = useEffectEvent((to: Lang) => {
    if (shownLang && shownLang !== to) onSwitch(to)
  })
  useEffect(() => {
    const st = useSettings.getState()
    if (shownLang && shownLang !== st.lang) st.set('lang', shownLang)
  }, [shownLang])
  useEffect(() => {
    if (prev.current === lang) return
    prev.current = lang
    switched(lang)
  }, [lang])
}
