import { useEffect, useState } from 'react'
import type { Lang } from '@/types'
import { loadVoices, speechSupported, voicesFor } from '@/lib/speech'

/**
 * True once the browser has a voice for this language, so "Read it to me" is worth showing.
 * Recorded voices only exist for dictation sentences, so reading free text aloud is browser speech.
 */
export function useHasVoice(lang: Lang): boolean {
  const [has, setHas] = useState(false)
  useEffect(() => {
    setHas(false)
    if (!speechSupported()) return
    let live = true
    void loadVoices().then((v) => live && setHas(voicesFor(lang, v).length > 0))
    return () => {
      live = false
    }
  }, [lang])
  return has
}
