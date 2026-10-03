import { useEffect, useEffectEvent, useRef } from 'react'
import type { Lang } from '@/types'
import { useSettings } from '@/state/settings'

/**
 * The practice language changes only with the header switch. When it changes while a page shows
 * content in another language (a pack or text opened from a link), `onSwitch` lets the page move
 * to the new language. Opening such a link does not count: only a change after mount does.
 */
export function useFollowLang(shownLang: Lang | undefined, onSwitch: (lang: Lang) => void) {
  const lang = useSettings((s) => s.lang)
  const prev = useRef(lang)
  const switched = useEffectEvent((to: Lang) => {
    if (shownLang && shownLang !== to) onSwitch(to)
  })
  useEffect(() => {
    if (prev.current === lang) return
    prev.current = lang
    switched(lang)
  }, [lang])
}
