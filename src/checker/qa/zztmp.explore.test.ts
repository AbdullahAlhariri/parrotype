import { writeFileSync } from 'node:fs'
import { it } from 'vitest'
import { loadFreq, loadHunspell } from '../spell/testing'
import { makeIsKnown } from '../spell/spellcheck'
import { checkFull, qaCore } from './harness'

it('ar unknown freq words through the pipeline', async () => {
  await qaCore().preload('ar')
  const h = await loadHunspell('ar')
  const isKnown = makeIsKnown(h, undefined, 'ar')
  const freq = loadFreq('ar')
  const out: string[] = []
  for (const [w, r] of freq) {
    if (isKnown(w) || w.length < 3) continue
    const text = `رأيت ${w} اليوم.`
    const issues = (await checkFull(text, 'ar')).filter((i) => i.text === w)
    for (const i of issues) out.push(`${r}\t${w}\t${i.confidence}\t${i.ruleId}\t${i.replacements.slice(0, 3).join(' ')}\t${i.replacements[0] ? freq.get(i.replacements[0]) ?? '' : ''}`)
    if (!issues.length) out.push(`${r}\t${w}\tOK`)
  }
  writeFileSync(process.env.OUT!, out.join('\n'))
}, 600000)
