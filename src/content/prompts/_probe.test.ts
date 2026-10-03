import { it } from 'vitest'
import { runRules } from '@/checker/engine'
import { getRules } from '@/checker/rules'
import { promptsFor } from './index'
import type { Lang } from '@/types'

it('probe', () => {
  const bad = runRules('هاذا اليوم جميل لاكن إنشاء الله', 'ar', getRules('ar'))
  console.log('ar BAD', bad.length)
  let n = 0
  for (const lang of ['nl', 'en', 'ar'] as Lang[]) {
    for (const p of promptsFor(lang)) {
      n++
      const issues = runRules(p.text, lang, getRules(lang), { strictness: 'strict' })
      for (const i of issues) console.log(lang, p.id, i.ruleId, i.category, i.confidence, JSON.stringify(i.text), '->', i.replacements[0])
    }
  }
  console.log('ar checked', n)
})
