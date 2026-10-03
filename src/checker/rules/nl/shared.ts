import type { RuleContext } from '@/types'
import { clauseOf, lw, next, isSubjectSlot } from '../../helpers'
import { FINITE, FINITE_FORMS, PREPOSITIONS, QUESTION_WORDS, SUBORDINATORS, isKnownNoun, set } from '../../lexicon/nl'

/** words after a verb that signal inversion with a different subject: "Dat vind ik" */
export const INVERSION_SUBJ = set('ik je jij we wij jullie')
export const PERSONAL_SUBJ = set('ik je jij we wij jullie ze zij hij het u men')

const RELATIVE_OPENERS = set('die dat wat wie welke waar waarom hoe waarin waarop waarmee waarvan waarover waarbij')

/** finite-looking forms used to spot a verb later in a clause */
export const isFiniteForm = (w: string) => FINITE.has(w) || FINITE_FORMS.has(w)

/** true when the clause of word i is introduced by a subordinator or relative word (verb-final order) */
export function inVerbFinalClause(ctx: RuleContext, i: number): boolean {
  const c = clauseOf(ctx, i)
  if (!c?.opener) return false
  return SUBORDINATORS.has(c.opener) || RELATIVE_OPENERS.has(c.opener) || QUESTION_WORDS.has(c.opener)
}

/** another finite verb form appears after word i in the same clause */
export function laterFiniteInClause(ctx: RuleContext, i: number): boolean {
  const c = clauseOf(ctx, i)
  if (!c) return false
  for (let k = i + 1; k <= c.to; k++) if (isFiniteForm(lw(ctx, k))) return true
  return false
}

export interface SubjVerb {
  s: number
  v: number
  /** the clause has verb-final order (after omdat, dat, die...) */
  verbFinal: boolean
}

/**
 * Subject pronoun directly followed by a word, where the pronoun sits in the subject slot of its clause
 * (clause start or right after the conjunction). Skips inversions like "Dat vind ik" and verb-final
 * clauses where a real finite verb follows later ("omdat hij werk heeft").
 */
export function subjectVerbPairs(ctx: RuleContext, subjects: ReadonlySet<string>): SubjVerb[] {
  const out: SubjVerb[] = []
  for (let s = 0; s < ctx.words.length; s++) {
    if (!subjects.has(lw(ctx, s)) || !isSubjectSlot(ctx, s)) continue
    const v = next(ctx, s)
    if (v < 0) continue
    const after = next(ctx, v)
    if (after >= 0 && INVERSION_SUBJ.has(lw(ctx, after))) continue
    const verbFinal = inVerbFinalClause(ctx, s)
    if (verbFinal && laterFiniteInClause(ctx, v)) continue
    out.push({ s, v, verbFinal })
  }
  return out
}

/** the word after i is a known noun (so i is probably a determiner/adjective, not a subject/verb) */
export const nounFollows = (ctx: RuleContext, i: number) => {
  const n = next(ctx, i)
  return n >= 0 && isKnownNoun(lw(ctx, n))
}

export const isPreposition = (w: string) => PREPOSITIONS.has(w)
