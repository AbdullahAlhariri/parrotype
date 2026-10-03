import { it } from 'vitest'
import { classifyTypo } from './typo'
import { wordList } from './generator'
import { keyOf, layoutFor, LAYOUTS } from './keyboard'
import type { Lang } from '@/types'

function neighbours(ch: string, lang: Lang): string[] {
  const layout = layoutFor(lang)
  const p = keyOf(ch, layout)
  if (!p || p.shift) return []
  const out: string[] = []
  for (const row of LAYOUTS[layout].rows) for (const k of row) {
    if (k.row > 3 || k.code === p.code || !k.base) continue
    if (Math.hypot(k.x - p.x, k.row - p.row) <= 1.25 && /\p{L}/u.test(k.base) && Array.from(k.base).length === 1) out.push(k.base)
  }
  return out
}

it('motor slip false-cognitive rate', { timeout: 300000 }, () => {
  for (const lang of ['nl', 'en', 'ar'] as Lang[]) {
    const words = wordList(lang, 1500).filter((w) => Array.from(w).length >= 2)
    const stats: Record<string, { n: number; cog: number; ex: string[] }> = {}
    const add = (type: string, e: string, t: string) => {
      if (e === t) return
      const l = classifyTypo(e, t, lang)
      const s = (stats[type] ??= { n: 0, cog: 0, ex: [] })
      s.n++
      if (l?.nature === 'cognitive') {
        s.cog++
        if (s.ex.length < 12) s.ex.push(`${e}>${t}:${l.tag}`)
      }
    }
    for (const w of words) {
      const g = Array.from(w)
      for (let i = 0; i < g.length; i++) {
        for (const n of neighbours(g[i], lang)) add('neighbour', w, [...g.slice(0, i), n, ...g.slice(i + 1)].join(''))
        add('drop', w, [...g.slice(0, i), ...g.slice(i + 1)].join(''))
        add('double', w, [...g.slice(0, i + 1), g[i], ...g.slice(i + 1)].join(''))
        if (i + 1 < g.length) add('swap', w, [...g.slice(0, i), g[i + 1], g[i], ...g.slice(i + 2)].join(''))
        for (const n of neighbours(g[i], lang)) add('roll', w, [...g.slice(0, i + 1), n, ...g.slice(i + 1)].join(''))
      }
    }
    for (const [type, s] of Object.entries(stats)) console.log(`${lang} ${type}: ${s.n} slips, ${s.cog} cognitive (${((100 * s.cog) / s.n).toFixed(2)}%) ${s.ex.join(' ')}`)
  }
})
