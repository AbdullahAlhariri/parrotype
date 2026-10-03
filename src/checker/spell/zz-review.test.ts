import { it } from 'vitest'
import { loadHunspell } from './testing'

it('timing', async () => {
  for (const id of ['nl', 'en-US', 'ar'] as const) {
    const h = await loadHunspell(id)
    const words = id === 'ar'
      ? ['إستخدامهمانبتال', 'وبالمستشفياتهمكن', 'سيتمكنونمنالذهاب', 'الي', 'مدرسه']
      : ['aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'huiswerkopdrachtenbundelverzamelingx', 'qwertyuiopasdfghjkl', 'xkcdthisisnotawordatall', 'eigelijk', 'onmiddelijkheidsbeginselen']
    for (const w of words) {
      const t0 = performance.now()
      const s = h.getSpellingSuggestions(w)
      console.log(id, w.length, w.slice(0, 20), (performance.now() - t0).toFixed(0) + 'ms', s.slice(0, 3))
    }
  }
}, 120_000)
