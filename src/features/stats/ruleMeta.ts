import { useEffect, useState } from 'react'
import type { IssueCategory } from '@/types'
import type { CategoryMap } from './gym'

let cache: Map<string, IssueCategory> | null = null

/**
 * Rule id -> category from the rule packs. Loaded lazily once the page is up so the stats chunk
 * stays small; until then ruleMark() guesses from the id.
 */
export function useRuleCategories(enabled: boolean): CategoryMap | null {
  const [map, setMap] = useState(cache)
  useEffect(() => {
    if (cache || !enabled) return
    let alive = true
    import('@/checker/rules')
      .then(({ RULES }) => {
        const next = new Map<string, IssueCategory>()
        for (const list of Object.values(RULES)) for (const r of list) next.set(r.id, r.category)
        cache = next
        if (alive) setMap(next)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [enabled])
  return map
}
