import { describe, expect, it } from 'vitest'
import { nlDict } from '../../test-utils/nlDict'
import {
  ADJ_INFLECT,
  COMPARATIVES,
  CONF_PART_TO_PRES,
  DE_NOUNS,
  DSTEM,
  DSTEM_PART_TO_PRES,
  HET_NOUNS,
  LOAN_PARTICIPLES,
  MISSPELLINGS,
  PAST_DT,
  SPLIT_COMPOUNDS,
  STRONG_VERBS,
  T3_TO_IK,
  VERBS,
  WEAK_VERBS,
  ZIJN_PARTICIPLES,
  isDiminutive,
  pluralCandidates,
} from '.'

const dict = nlDict()
const missing = (words: Iterable<string>) => [...words].filter((w) => w && !dict.has(w))

describe('Dutch lexicon integrity (checked against Hunspell)', () => {
  it('has the 134 strong verbs from the research table', () => expect(STRONG_VERBS).toHaveLength(134))
  it('every verb form exists', () => {
    expect(missing(VERBS.flatMap((v) => [v.inf, v.ik, v.hij, v.pastSg, v.pastPl, v.part]))).toEqual([])
  })
  it('derives ik-forms correctly', () => {
    const byInf = new Map(VERBS.map((v) => [v.inf, v]))
    expect(byInf.get('zitten')?.ik).toBe('zit')
    expect(byInf.get('vinden')?.ik).toBe('vind')
    expect(byInf.get('zijn')?.ik).toBe('ben')
    expect(byInf.get('eten')?.ik).toBe('eet')
    expect(byInf.get('bidden')?.ik).toBe('bid')
    expect(T3_TO_IK.get('wordt')).toBe('word')
    expect(T3_TO_IK.get('heeft')).toBe('heb')
    expect(T3_TO_IK.has('zit')).toBe(false)
  })
  it('d-stem verbs have real ik and hij forms', () => {
    const clipped = new Set(['hou', 'rij', 'snij', 'glij'])
    expect(missing([...DSTEM].flatMap(([ik, hij]) => (clipped.has(ik) ? [hij] : [ik, hij])))).toEqual([])
  })
  it('weak verb past tenses follow ’t kofschip', () => {
    for (const v of WEAK_VERBS) expect(v.pastSg, v.inf).toMatch(/(?:te|de)$/)
  })
  it('participle/present confusables all exist', () => {
    expect(missing([...CONF_PART_TO_PRES, ...DSTEM_PART_TO_PRES].flat())).toEqual([])
  })
  it('zijn-participles exist', () => expect(missing(ZIJN_PARTICIPLES)).toEqual([]))
  it('past + dt forms are never words', () => expect([...PAST_DT.keys()].filter((w) => dict.has(w))).toEqual([]))
  it('noun lists exist, do not overlap and have the expected size', () => {
    expect(HET_NOUNS.size).toBeGreaterThanOrEqual(300)
    expect(DE_NOUNS.size).toBeGreaterThanOrEqual(160)
    expect([...HET_NOUNS].filter((w) => DE_NOUNS.has(w))).toEqual([])
    // Hunspell's compound support in nspell is limited; these are valid compounds it misses
    const compoundGaps = ['vliegveld', 'winkelcentrum', 'wachtwoord', 'toetsenbord']
    expect(missing([...HET_NOUNS, ...DE_NOUNS]).filter((w) => !compoundGaps.includes(w))).toEqual([])
  })
  it('recognises diminutives and plural candidates', () => {
    expect(isDiminutive('huisje')).toBe(true)
    expect(isDiminutive('balletje')).toBe(true)
    expect(isDiminutive('oranje')).toBe(false)
    expect(isDiminutive('meisjes')).toBe(false)
    expect(pluralCandidates('man')).toContain('mannen')
    expect(pluralCandidates('jaar')).toContain('jaren')
    expect(pluralCandidates('huis')).toContain('huizen')
  })
  it('adjective forms and comparatives exist', () => {
    expect(missing([...ADJ_INFLECT].flat())).toEqual([])
    expect(missing(COMPARATIVES)).toEqual([])
  })
  it('misspellings are never words', () => {
    expect([...MISSPELLINGS.keys()].filter((w) => dict.has(w))).toEqual([])
  })
  it('loan-verb fixes go from a non-word to a word', () => {
    expect([...LOAN_PARTICIPLES.keys()].filter((w) => dict.has(w))).toEqual([])
    expect(missing([...LOAN_PARTICIPLES.values()].filter((w) => !w.includes('-')))).toEqual([])
  })
  it('split compounds are lowercase two-word keys', () => {
    for (const [k, v] of SPLIT_COMPOUNDS) {
      expect(k).toMatch(/^\S+ \S+$/)
      expect(v).not.toContain(' ')
      expect(k.replace(' ', '')).toBe(v)
    }
  })
})
