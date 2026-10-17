import { readFileSync } from 'node:fs'
import { it } from 'vitest'
import type { Lang } from '@/types'
import { checkFull, describeIssue, qaCore } from './harness'
import { loadFreq, loadHunspell } from '../spell/testing'
import { rankSuggestions } from '../spell/rank'
import { makeIsKnown } from '../spell/spellcheck'
import { misspellingsFor } from '../spell/sources'

// TEMPORARY reviewer probe: reads lines "lang|strict?|text" from a scratch file and prints every issue.
const FILE = process.env.PROBE ?? '/tmp/probe.txt'

it('probe', async () => {
  await Promise.all([qaCore().preload('nl'), qaCore().preload('en', 'en-US'), qaCore().preload('ar')])
  const out: string[] = []
  for (const line of readFileSync(FILE, 'utf8').split('\n')) {
    if (!line.trim() || line.startsWith('#')) continue
    const [lang, mode, ...rest] = line.split('|')
    const text = rest.join('|')
    if (mode === 'r') {
      for (const w of text.split(' ')) {
        const h = await loadHunspell(lang === 'en' ? 'en-US' : (lang as 'nl' | 'ar'))
        const isKnown = makeIsKnown(h, undefined, lang as Lang)
        const freq = loadFreq(lang as Lang)
        const r = rankSuggestions(w, { lang: lang as Lang, isKnown, backend: h, freq, misspellings: misspellingsFor(lang as Lang) }, 4)
        out.push(`rank ${w} known=${isKnown(w)} freq=${freq.get(w.toLowerCase())} enfreq=${loadFreq('en').get(w.toLowerCase())}: ` + r.map((x) => `${x.word}(${x.kind} d${x.dist.toFixed(2)} s${x.score.toFixed(2)} f${freq.get(x.word.toLowerCase())})`).join(' '))
      }
      continue
    }
    const issues = await checkFull(text, lang as Lang, { strictness: mode === 's' ? 'strict' : 'normal' })
    out.push(`${issues.length ? '!!' : 'ok'} [${lang}${mode}] ${text}`)
    for (const i of issues) out.push(`     ${describeIssue(i, text)}`)
  }
  console.log(out.join('\n'))
}, 120_000)
