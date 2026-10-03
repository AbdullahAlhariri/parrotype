import { it } from 'vitest'
import { writeFileSync } from 'node:fs'
import { loadFreq, loadHunspell } from '../spell/testing'
import { rankSuggestions } from '../spell/rank'
import { generateCandidates } from '../spell/candidates'
import { makeIsKnown } from '../spell/spellcheck'
it('hs', async () => {
  const h = await loadHunspell('ar')
  const isKnown = makeIsKnown(h, undefined, 'ar')
  const out: string[] = []
  for (const w of ['مهندسن', 'المتخف']) {
    out.push(w + ' cands: ' + generateCandidates(w, 'ar').map((c) => c.word + ':' + c.kind).join(' '))
    out.push(w + ' ranked: ' + rankSuggestions(w, { lang: 'ar', isKnown, backend: h, freq: loadFreq('ar') }).map((r) => `${r.word}:${r.kind}:${r.score.toFixed(2)}:${r.dist}`).join(' '))
  }
  writeFileSync('/tmp/claude-0/-home-user-parrotype/48c02fc6-2338-5d25-886d-738134e4c7f2/scratchpad/hs.txt', out.join('\n'))
}, 60000)
