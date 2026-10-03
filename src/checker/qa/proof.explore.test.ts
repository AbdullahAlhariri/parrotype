import { it } from 'vitest'
import { writeFileSync } from 'node:fs'
import { nodeCore } from '../spell/testing'
import { TEXTS } from '@/content/proofread'

it('proof', async () => {
  const core = nodeCore()
  const out: string[] = []
  for (const lang of ['nl', 'en'] as const) {
    let hit = 0, first = 0, n = 0
    for (const t of TEXTS[lang]) {
      const r = await core.check({ text: t.text, lang })
      for (const m of t.mistakes) {
        n++
        const is = r.issues.find((i) => i.offset < m.at + m.wrong.length && m.at < i.offset + i.length)
        const ok = is && (is.replacements.some((x) => t.text.slice(0, is.offset) + x + t.text.slice(is.offset + is.length) === t.text.slice(0, m.at) + m.right + t.text.slice(m.at + m.wrong.length)))
        if (is) hit++
        if (ok) first++
        out.push(`${lang} ${ok ? 'OK ' : is ? 'BAD' : 'MISS'} ${m.rule}\t${m.wrong} -> ${m.right}\t${is ? is.ruleId + ' ' + is.text + ' -> ' + is.replacements.slice(0, 3).join('|') : ''}`)
      }
      const extra = r.issues.filter((i) => !t.mistakes.some((m) => i.offset < m.at + m.wrong.length && m.at < i.offset + i.length))
      for (const e of extra) out.push(`${lang} EXTRA ${e.confidence} ${e.ruleId} ${e.text} -> ${e.replacements.slice(0, 3).join('|')} (${t.id})`)
    }
    out.push(`# ${lang}: ${n} planted, ${hit} flagged, ${first} with right fix`)
  }
  writeFileSync(process.env.OUT!, out.join('\n'))
}, 600000)
