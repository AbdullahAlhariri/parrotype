import type { Issue } from '@/types'

// One list of issues for the UI: never two underlines on the same letters, sorted by offset,
// with ids that survive edits elsewhere in the text.

const overlaps = (a: Pick<Issue, 'offset' | 'length'>, b: Pick<Issue, 'offset' | 'length'>) =>
  a.offset < b.offset + b.length && b.offset < a.offset + a.length

const byOffset = (a: Issue, b: Issue) => a.offset - b.offset || a.length - b.length

/**
 * Combine rule issues (already non-overlapping) with spell issues.
 * A rule issue that offers a fix wins over the spell issue on the same word ("hij word" is a d/t
 * issue, not an unknown word). A rule hint without a fix gives way to the spelling fix.
 */
export function combineLocal(rules: Issue[], spell: Issue[]): Issue[] {
  const dropRules = new Set<Issue>()
  const keptSpell: Issue[] = []
  for (const s of spell) {
    const hits = rules.filter((r) => overlaps(r, s))
    if (hits.some((r) => r.replacements.length > 0)) continue
    hits.forEach((r) => dropRules.add(r))
    keptSpell.push(s)
  }
  return withStableIds([...rules.filter((r) => !dropRules.has(r)), ...keptSpell].sort(byOffset))
}

export interface MergeOptions {
  /**
   * The local spell checker ran, so LanguageTool's own spelling matches are noise:
   * Hunspell already accepted those words (Dutch compounds, names, the personal dictionary).
   */
  localSpell?: boolean
}

const LT_SPELLER = /MORFOLOGIK|SPELLER|HUNSPELL|SPELLING_RULE|TYPOS?$/i

/** Add LanguageTool issues where the local checks found nothing. */
export function mergeIssues(local: Issue[], lt: Issue[], opts: MergeOptions = {}): Issue[] {
  const extra: Issue[] = []
  const sorted = [...lt].sort((a, b) => a.offset - b.offset || b.length - a.length)
  for (const is of sorted) {
    if (opts.localSpell && is.category === 'spelling' && LT_SPELLER.test(is.ruleId)) continue
    if (local.some((l) => overlaps(l, is))) continue
    if (extra.some((e) => overlaps(e, is))) continue
    extra.push(is)
  }
  return withStableIds([...local, ...extra].sort(byOffset))
}

/**
 * Ids made from the rule and the flagged text plus a counter ("spell:eigelijk#0"), not the offset,
 * so typing earlier in the text does not change them (handy for keys and "ignore" state).
 */
export function withStableIds(issues: Issue[]): Issue[] {
  const seen = new Map<string, number>()
  return issues.map((is) => {
    const base = `${is.ruleId}:${is.text.toLowerCase()}`
    const n = seen.get(base) ?? 0
    seen.set(base, n + 1)
    const id = `${base}#${n}`
    return is.id === id ? is : { ...is, id }
  })
}

const WORD_CHAR = /[\p{L}\p{M}\p{N}'’-]/u
const isWordChar = (c: string | undefined) => c !== undefined && WORD_CHAR.test(c)

/**
 * Keep issues usable after the text changed while a check was running: issues before the edit stay,
 * issues after it shift, issues the edit touched (or glued letters onto) are dropped as stale.
 */
export function remapIssues(issues: Issue[], oldText: string, newText: string): Issue[] {
  if (oldText === newText) return issues
  const max = Math.min(oldText.length, newText.length)
  let p = 0
  while (p < max && oldText[p] === newText[p]) p++
  let s = 0
  while (s < max - p && oldText[oldText.length - 1 - s] === newText[newText.length - 1 - s]) s++
  const editEnd = oldText.length - s
  const delta = newText.length - oldText.length
  const out: Issue[] = []
  for (const is of issues) {
    const end = is.offset + is.length
    if (end < p || (end === p && !isWordChar(newText[p]))) out.push(is)
    else if (is.offset > editEnd || (is.offset === editEnd && !isWordChar(newText[is.offset + delta - 1]))) {
      out.push({ ...is, offset: is.offset + delta })
    }
  }
  return out
}
