import type { Issue, Lang } from '@/types'

// The checker (and its rule packs) load lazily, so the dictation page itself stays small.
// Checking an attempt is a bonus layer: if anything fails, dictation still works on the diff.

let checker: Promise<typeof import('@/checker')> | null = null
const loadChecker = () => (checker ??= import('@/checker'))

export function preloadChecker(lang: Lang) {
  loadChecker()
    .then((m) => m.preloadLanguage(lang))
    .catch(() => {})
}

/** Spelling and grammar issues in the user's own attempt ([] when the checker is unavailable). */
export async function checkAttempt(text: string, lang: Lang, signal?: AbortSignal): Promise<Issue[]> {
  try {
    const m = await loadChecker()
    return await m.checkText(text, lang, { signal })
  } catch {
    return []
  }
}

let titles: Promise<Map<string, string>> | null = null

/** Rule titles ("d/t after hij/zij/het") for the stats page, keyed by rule id. */
export function ruleTitles(): Promise<Map<string, string>> {
  titles ??= import('@/checker/rules')
    .then((m) => new Map((['nl', 'en', 'ar'] as Lang[]).flatMap((l) => m.getRules(l).map((r) => [r.id, r.title] as const))))
    .catch(() => new Map())
  return titles
}
