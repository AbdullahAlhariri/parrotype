import type { Issue } from '@/types'

/** Test helper: an Issue for the first occurrence of `word` in `text` (after `from`). */
export function mkIssue(text: string, word: string, over: Partial<Issue> = {}, from = 0): Issue {
  const offset = text.indexOf(word, from)
  if (offset < 0) throw new Error(`"${word}" not in text`)
  return {
    id: `${over.ruleId ?? 'r'}@${offset}`,
    ruleId: 'r',
    source: 'rules',
    lang: 'nl',
    category: 'grammar',
    offset,
    length: word.length,
    text: word,
    message: 'msg',
    replacements: [],
    confidence: 'high',
    ...over,
  }
}
