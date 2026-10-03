import type { Lang } from '@/types'
import { DICTATION, PAIRS } from '@/content/dictation'
import { storiesFor } from '@/content/stories'
import { QUOTES } from '@/content/quotes'
import { promptsFor } from '@/content/prompts'
import { PACKS, fillGap } from '@/content/drills'
import { TEXTS, isProofLang } from '@/content/proofread'

// Every correct text the app ships, per language: what free writing must never flag.

export interface CorpusText {
  /** where it comes from, for failure messages: 'dictation nl-k02' */
  where: string
  text: string
}

export function appCorpus(lang: Lang): CorpusText[] {
  const out: CorpusText[] = []
  for (const s of DICTATION[lang]) out.push({ where: `dictation ${s.id}`, text: s.text })
  for (const p of PAIRS[lang]) p.sentences.forEach((s, i) => out.push({ where: `pair ${p.id}#${i}`, text: s.text }))
  for (const st of storiesFor(lang)) st.pages.forEach((page, i) => out.push({ where: `story ${st.id} p${i + 1}`, text: page }))
  QUOTES[lang].forEach((q, i) => out.push({ where: `quote #${i} (${q.source})`, text: q.text }))
  for (const p of promptsFor(lang)) out.push({ where: `prompt ${p.id}`, text: p.text })
  for (const pack of PACKS[lang]) {
    pack.items.forEach((item, i) => {
      out.push({ where: `drill ${pack.id}#${i}`, text: fillGap(item) })
      item.accept?.forEach((a) => out.push({ where: `drill ${pack.id}#${i} (${a})`, text: fillGap(item, a) }))
    })
  }
  if (isProofLang(lang)) for (const t of TEXTS[lang]) out.push({ where: `proofread ${t.id}`, text: t.corrected })
  return out
}
