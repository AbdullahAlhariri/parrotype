import { it } from 'vitest'
import { appendFileSync } from 'node:fs'
import { runRules } from '../engine'
import { nlRules } from '../rules/nl'
import { buildContext } from '../tokenize'
it('r', () => {
  for (const t of ['Het pakket is bezorgt.', 'Me knie doet pijn.', 'Is dit jou jas?', 'Het auto is kapot.', 'Wat is er gebeurt?']) {
    const ctx = buildContext(t, 'nl')
    const raw = nlRules.flatMap((r) => { try { return r.check(ctx).map((h) => r.id + ' ' + t.slice(h.offset, h.offset + h.length)) } catch (e) { return ['ERR ' + r.id + ' ' + e] } })
    appendFileSync("/tmp/claude-0/-home-user-parrotype/48c02fc6-2338-5d25-886d-738134e4c7f2/scratchpad/r.txt", t + " " + JSON.stringify(raw) + " " + JSON.stringify(runRules(t, "nl", nlRules).map((i) => i.ruleId)) + "\n")
  }
})
