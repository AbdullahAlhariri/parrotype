import { beforeAll, describe, expect, it } from 'vitest'
import type { Issue, Lang } from '@/types'
import { TEXTS, isProofLang } from '@/content/proofread'
import { runRules } from '../engine'
import { arRulesWithExamples } from '../rules/ar'
import { enRulesWithExamples } from '../rules/en'
import { ERRORS_AR } from './errors.ar'
import { ERRORS_EN } from './errors.en'
import { ERRORS_NL, type Labelled } from './errors.nl'
import { checkFull, qaCore } from './harness'
import { parseCase } from './score'

// The copy of every issue the checker raises on the labelled mistakes, the Fix it texts and the rules'
// own examples: a friendly message, an explanation, the explanation in the practice language (Dutch for
// nl, Arabic for ar, so explainIn 'local' works), fixes cased like the original, https learn-more links,
// and none of the copy habits the design brief bans (em dashes, shouting).

const ARABIC = /[؀-ۿ]/
const ERRORS: Record<Lang, Labelled[]> = { nl: ERRORS_NL, en: ERRORS_EN, ar: ERRORS_AR }
/** rules whose whole point is a lowercase letter where the writer typed a capital */
const LOWERING = new Set(['nl.cap.day-month', 'nl.cap.ik', 'nl.cap.language'])

const collected: Record<Lang, Issue[]> = { nl: [], en: [], ar: [] }

beforeAll(async () => {
  await Promise.all([qaCore().preload('nl'), qaCore().preload('en'), qaCore().preload('ar')])
  for (const lang of ['nl', 'en', 'ar'] as Lang[]) {
    for (const l of ERRORS[lang]) collected[lang].push(...(await checkFull(parseCase(l).text, lang, { strictness: 'strict' })))
    if (isProofLang(lang)) for (const t of TEXTS[lang]) collected[lang].push(...(await checkFull(t.text, lang, { strictness: 'strict' })))
  }
  for (const r of enRulesWithExamples) collected.en.push(...runRules(r.examples.wrong, 'en', [r], { strictness: 'strict' }))
  for (const r of arRulesWithExamples) for (const [s] of r.examples.flag) collected.ar.push(...runRules(s, 'ar', [r], { strictness: 'strict' }))
}, 60_000)

const problems = (issues: Issue[], check: (i: Issue) => string | undefined) =>
  issues.map((i) => {
    const p = check(i)
    return p ? `${i.ruleId} «${i.text}»: ${p}` : ''
  }).filter(Boolean)

describe.each(['nl', 'en', 'ar'] as Lang[])('%s issue copy', (lang) => {
  it('has plain messages and explanations', () => {
    const issues = collected[lang]
    expect(issues.length).toBeGreaterThan(100)
    const bad = problems(issues, (i) => {
      const texts = [i.message, i.messageLocal, i.explanation, i.explanationLocal].filter((t): t is string => !!t)
      if (!i.message.trim()) return 'empty message'
      if (i.message.length > 160) return 'message too long'
      if (texts.some((t) => t.includes('—'))) return 'em dash in the copy'
      if (texts.some((t) => /\b[A-Z]{5,}\b/.test(t.replace(/\b(?:LOL|ASAP|BTW|RSVP|FAQ|IJ)\b/g, '')))) return 'shouting'
      if (i.source === 'rules' && !i.explanation) return 'rule issue without explanation'
      if (i.learnMore && !/^https:\/\/\S+$/.test(i.learnMore)) return `bad link ${i.learnMore}`
      return undefined
    })
    expect(bad, bad.join('\n')).toEqual([])
  })

  it.runIf(lang !== 'en')('explains in the practice language too', () => {
    const bad = problems(collected[lang], (i) => {
      if (!i.messageLocal) return 'no local message'
      if (i.explanation && !i.explanationLocal) return 'no local explanation'
      for (const t of [i.messageLocal, i.explanationLocal]) {
        if (!t) continue
        if (lang === 'ar' && !ARABIC.test(t)) return `local copy is not Arabic: ${t}`
        if (lang === 'nl' && ARABIC.test(t.replace(/[‘’'«»][^‘’'«»]*[‘’'«»]/g, ''))) return `local copy is not Dutch: ${t}`
      }
      return undefined
    })
    expect(bad, bad.join('\n')).toEqual([])
  })

  it.runIf(lang !== 'ar')('cases fixes like the flagged word', () => {
    const bad = problems(collected[lang], (i) => {
      if (i.category === 'capitalization' || LOWERING.has(i.ruleId)) return undefined
      // English I is a capital anywhere ("When I can" -> "can I"); Dutch 's / 't keep their small letter
      if (lang === 'en' && /^I\b/.test(i.text)) return undefined
      const firstLetter = (s: string) => [...s.replace(/^['’][st]\s+/i, '')].find((c) => /\p{L}/u.test(c))
      const first = firstLetter(i.text)
      if (!first || first === first.toLowerCase()) return undefined
      const wrong = i.replacements.filter((r) => {
        const f = firstLetter(r)
        return f && f === f.toLowerCase()
      })
      return wrong.length ? `fix not capitalised: ${wrong.join(', ')}` : undefined
    })
    expect(bad, bad.join('\n')).toEqual([])
  })
})
