import { it } from 'vitest'
import { writeFileSync } from 'node:fs'
import { nodeCore } from '../spell/testing'
import { TEXTS } from '@/content/proofread'

it('proof2', async () => {
  const core = nodeCore()
  const out: string[] = []
  for (const lang of ['nl', 'en'] as const) {
    for (const t of TEXTS[lang]) {
      const r = await core.check({ text: t.text, lang })
      for (const m of t.mistakes) {
        const is = r.issues.find((i) => i.offset < m.at + m.wrong.length && m.at < i.offset + i.length)
        if (!is) out.push(`${lang} ${m.rule}: ${m.wrong} -> ${m.right} | ${t.text.slice(Math.max(0, m.at - 70), m.at)}[[${m.wrong}]]${t.text.slice(m.at + m.wrong.length, m.at + m.wrong.length + 50)}`.replace(/\n/g, ' '))
      }
    }
  }
  writeFileSync(process.env.OUT!, out.join('\n'))
}, 600000)
