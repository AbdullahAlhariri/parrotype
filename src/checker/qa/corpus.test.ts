import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Issue, Lang } from '@/types'
import { TEXTS, isProofLang } from '@/content/proofread'
import { applyReplacement } from '../engine'
import { appCorpus } from './corpus'
import { CORRECT_AR } from './correct.ar'
import { CORRECT_EN } from './correct.en'
import { CORRECT_NL } from './correct.nl'
import { ERRORS_AR } from './errors.ar'
import { ERRORS_EN } from './errors.en'
import { ERRORS_NL, type Labelled } from './errors.nl'
import { checkFull, describeIssue, qaCore, serious } from './harness'
import { parseCase, scoreCase, type Scored } from './score'

// The false-positive hunt and the recall measurement, over the full free-writing pipeline (rule pack +
// Hunspell spell layer, exactly what the worker runs), in normal strictness:
//
//  1. Every correct text the app ships (dictation, stories, quotes, prompts, filled-in drills, corrected
//     Fix it texts) plus 250+ hand-written correct sentences per language must come out without a single
//     high or medium issue. Low-confidence hints must stay rare.
//  2. Labelled mistakes (errors.*.ts, one per sentence) must be caught with the right fix; `gap` marks the
//     known misses. The planted mistakes of the Fix it texts are measured too.
//
// The numbers (precision and recall per language and per rule family) are printed at the end; vitest
// hides console output of passing tests, so run: npx vitest run src/checker/qa --silent=false

const LANGS: Lang[] = ['nl', 'en', 'ar']
const OWN: Record<Lang, Record<string, string[]>> = { nl: CORRECT_NL, en: CORRECT_EN, ar: CORRECT_AR }
const ERRORS: Record<Lang, Labelled[]> = { nl: ERRORS_NL, en: ERRORS_EN, ar: ERRORS_AR }

/** app texts that are not meant to be correct language, with the reason */
const NOT_CORRECT: Array<[RegExp, string]> = [[/^'Twas brillig/, 'Jabberwocky: nonsense words by design']]

interface Tally {
  texts: number
  /** high/medium issues on correct text */
  fp: Issue[]
  hints: number
  /** English app texts flagged in one variety only (favourite in en-US): the variety rule doing its job */
  variety: number
  cases: Scored[]
  planted: Array<{ fixed: boolean; flagged: boolean; rule: string }>
}

const tally: Record<Lang, Tally> = Object.fromEntries(
  LANGS.map((l) => [l, { texts: 0, fp: [], hints: 0, variety: 0, cases: [], planted: [] }]),
) as unknown as Record<Lang, Tally>

/** per-test timeout: each test checks hundreds of texts, and other test files run alongside */
const SLOW = 60_000

const sameSpot = (a: Issue, b: Issue) => a.offset === b.offset && a.length === b.length && a.ruleId === b.ruleId

beforeAll(async () => {
  // load every dictionary once, outside the per-test timeout
  await Promise.all([qaCore().preload('nl'), qaCore().preload('en', 'en-US'), qaCore().preload('en', 'en-GB'), qaCore().preload('ar')])
}, 60_000)

describe.each(LANGS)('%s: no false positives on correct text', (lang) => {
  it('app content (dictation, stories, quotes, prompts, drills, corrected Fix it texts)', async () => {
    const t = tally[lang]
    const bad: string[] = []
    for (const c of appCorpus(lang)) {
      if (NOT_CORRECT.some(([re]) => re.test(c.text))) continue
      t.texts++
      let issues = await checkFull(c.text, lang)
      if (lang === 'en') {
        // either variety is correct English: an issue counts only if the other variety raises it too
        const gb = await checkFull(c.text, lang, { variant: 'en-GB' })
        const both = issues.filter((i) => gb.some((g) => sameSpot(g, i)))
        t.variety += serious(issues).length - serious(both).length
        issues = both
      }
      t.hints += issues.length - serious(issues).length
      for (const i of serious(issues)) {
        t.fp.push(i)
        bad.push(`${c.where}: ${describeIssue(i, c.text)}`)
      }
    }
    expect(bad, bad.join('\n')).toEqual([])
  }, SLOW)

  it('hand-written sentences in many registers', async () => {
    const t = tally[lang]
    const bad: string[] = []
    let n = 0
    for (const [group, list] of Object.entries(OWN[lang])) {
      // British spelling is checked with the en-GB dictionary, the rest of the English with en-US
      const variant = lang === 'en' ? (group === 'british' ? 'en-GB' : 'en-US') : undefined
      for (const s of list) {
        n++
        t.texts++
        const issues = await checkFull(s, lang, { variant })
        t.hints += issues.length - serious(issues).length
        for (const i of serious(issues)) {
          t.fp.push(i)
          bad.push(`[${group}] ${describeIssue(i, s)}`)
        }
      }
      // the same sentences as one text: sentence splitting and cross-sentence rules
      if (list.length > 1) {
        const text = list.join(group === 'email' || group === 'mixed' ? '\n' : ' ')
        for (const i of serious(await checkFull(text, lang, { variant }))) bad.push(`[${group}, joined] ${describeIssue(i, text)}`)
      }
    }
    expect(n).toBeGreaterThanOrEqual(250)
    expect(bad, bad.join('\n')).toEqual([])
  }, SLOW)

  it('keeps low-confidence hints rare', () => {
    const t = tally[lang]
    expect(t.hints, `${t.hints} hints on ${t.texts} correct texts`).toBeLessThanOrEqual(Math.ceil(t.texts * 0.005))
  })
})

describe.each(LANGS)('%s: recall on labelled mistakes', (lang) => {
  it(`catches the labelled mistakes with the right fix`, async () => {
    const t = tally[lang]
    expect(ERRORS[lang].length).toBeGreaterThanOrEqual(120)
    const problems: string[] = []
    for (const l of ERRORS[lang]) {
      const c = parseCase(l)
      const s = await scoreCase(c, lang)
      t.cases.push(s)
      const show = `${c.family}: ${c.text} (want ${c.expected})`
      if (!c.gap && s.outcome !== 'fixed') {
        problems.push(`${s.outcome}: ${show}${s.hit ? ` got ${s.hit.ruleId} -> ${s.hit.replacements.join(' | ')}` : ''}`)
      }
      for (const i of s.stray) problems.push(`stray issue in ${show}: ${describeIssue(i, c.text)}`)
    }
    expect(problems, problems.join('\n')).toEqual([])
  }, SLOW)

  it.runIf(isProofLang(lang))('measures the planted mistakes of the Fix it texts', async () => {
    if (!isProofLang(lang)) return
    const t = tally[lang]
    for (const text of TEXTS[lang]) {
      const issues = serious(await checkFull(text.text, lang))
      for (const m of text.mistakes) {
        const end = m.at + m.wrong.length
        const on = issues.filter((i) => i.offset < end && m.at < i.offset + i.length)
        const want = [m.right, ...(m.accept ?? [])].map((r) => text.text.slice(0, m.at) + r + text.text.slice(end))
        const norm = (s: string) => s.replace(/[’‘]/g, "'")
        const fixed = on.some((i) => i.replacements.some((r) => want.some((w) => norm(w) === norm(applyReplacement(text.text, i, r)))))
        t.planted.push({ fixed, flagged: on.length > 0, rule: m.rule })
      }
    }
    const fixed = t.planted.filter((p) => p.fixed).length
    // a floor, so a regression shows up; the report prints the exact number
    expect(fixed / t.planted.length).toBeGreaterThanOrEqual(lang === 'ar' ? 0.6 : 0.65)
  }, SLOW)
})

/* ------------------------------------------------------------------ */
/* Report                                                              */
/* ------------------------------------------------------------------ */

const pct = (a: number, b: number) => (b ? `${((100 * a) / b).toFixed(1)}%` : '-')

afterAll(() => {
  const lines: string[] = ['', 'Checker QA (full pipeline, normal strictness)']
  for (const lang of LANGS) {
    const t = tally[lang]
    if (!t.cases.length && !t.texts) continue
    const tp = t.cases.filter((s) => s.outcome !== 'missed').length
    const stray = t.cases.reduce((n, s) => n + s.stray.length, 0)
    const fixed = t.cases.filter((s) => s.outcome === 'fixed').length
    const first = t.cases.filter((s) => s.first).length
    lines.push(
      `${lang}: ${t.texts} correct texts, ${t.fp.length} false positives, ${t.hints} hints` +
        (lang === 'en' ? `, ${t.variety} variety-only flags` : '') +
        ` | ${t.cases.length} labelled mistakes: recall ${pct(tp, t.cases.length)}, right fix ${pct(fixed, t.cases.length)}` +
        ` (first ${pct(first, t.cases.length)}), precision ${pct(tp, tp + t.fp.length + stray)}`,
    )
    const families = [...new Set(t.cases.map((s) => s.c.family))]
    lines.push(
      '   ' +
        families
          .map((f) => {
            const fs = t.cases.filter((s) => s.c.family === f)
            return `${f} ${fs.filter((s) => s.outcome === 'fixed').length}/${fs.length}`
          })
          .join(', '),
    )
    if (t.planted.length) {
      lines.push(`   Fix it planted mistakes: ${t.planted.filter((p) => p.fixed).length}/${t.planted.length} fixed, ${t.planted.filter((p) => p.flagged).length} flagged`)
    }
    const nowCaught = t.cases.filter((s) => s.c.gap && s.outcome === 'fixed')
    for (const s of nowCaught) lines.push(`   gap now caught (update the label): ${s.c.text}`)
  }
  console.log(lines.join('\n'))
})
