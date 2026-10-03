import { it } from 'vitest'
import { appendFileSync, writeFileSync } from 'node:fs'
const OUT = '/tmp/claude-0/-home-user-parrotype/48c02fc6-2338-5d25-886d-738134e4c7f2/scratchpad/probe.txt'
const log = (...a: unknown[]) => appendFileSync(OUT, a.join(' ') + '\n')
import { classifyTypo } from './typo'
import { neighbourChar, keyOf } from './keyboard'
import { wordList } from './generator'
import { seeded } from '@/lib/random'
import type { Lang } from '@/types'

it('probe', () => {
  writeFileSync(OUT, '')
  const rand = seeded(42)
  for (const lang of ['nl', 'en'] as Lang[]) {
    const words = wordList(lang).filter((w) => w.length >= 3 && /^[a-z]+$/.test(w))
    const stats: Record<string, Record<string, number>> = {}
    const bad: Record<string, string[]> = {}
    const note = (slip: string, e: string, t: string) => {
      const l = classifyTypo(e, t, lang)
      if (!l) return
      const k = `${l.kind}${l.tag ? '/' + l.tag : ''}`
      ;(stats[slip] ??= {})[k] = (stats[slip][k] ?? 0) + 1
      if (l.nature === 'cognitive') (bad[slip] ??= []).push(`${e}>${t}:${l.tag}`)
    }
    for (const w of words) {
      const i = Math.floor(rand() * w.length)
      // adjacent substitution
      const p = keyOf(w[i])
      if (p) {
        const n = neighbourChar(w[i], rand() < 0.5 ? -1 : 1)
        if (n && /[a-z]/.test(n)) note('adjacent', w, w.slice(0, i) + n + w.slice(i + 1))
      }
      // transposition
      if (i < w.length - 1 && w[i] !== w[i + 1]) note('swap', w, w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2))
      // omission
      note('omit', w, w.slice(0, i) + w.slice(i + 1))
      // bounce
      note('bounce', w, w.slice(0, i + 1) + w[i] + w.slice(i + 1))
    }
    for (const [slip, s] of Object.entries(stats)) {
      const total = Object.values(s).reduce((a, b) => a + b, 0)
      const top = Object.entries(s).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k}:${v}`).join(' ')
      log(lang, slip, 'total', total, 'cognitive', (bad[slip] ?? []).length, '|', top)
      log('   cog examples:', (bad[slip] ?? []).slice(0, 25).join(' '))
    }
  }
})
