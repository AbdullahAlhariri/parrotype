import { describe, expect, it } from 'vitest'
import { expectedGlyphs, gradeAttempt, normaliseAttempt, typedGlyphs } from './grade'

describe('normaliseAttempt', () => {
  it('straightens quotes, collapses spaces and drops tatweel', () => {
    expect(normaliseAttempt('  De  baby’s   slapen ')).toBe("De baby's slapen")
    expect(normaliseAttempt('كتـــاب')).toBe('كتاب')
  })
})

describe('gradeAttempt', () => {
  const S = 'Hij wordt elke dag om zes uur wakker.'

  it('scores a perfect attempt', () => {
    const g = gradeAttempt(S, 'Hij wordt elke dag om zes uur wakker.', 'nl')
    expect(g).toMatchObject({ correct: 8, total: 8, perfect: true, punctOnly: false, score: 1 })
    expect(g.wrong).toEqual([])
  })

  it('labels a d/t mistake and scores words correct / total', () => {
    const g = gradeAttempt(S, 'Hij word elke dag om zes uur wakker.', 'nl')
    expect(g.perfect).toBe(false)
    expect(g.correct).toBe(7)
    expect(g.total).toBe(8)
    expect(g.score).toBeCloseTo(7 / 8)
    expect(g.wrong).toHaveLength(1)
    const t = g.wrong[0]
    expect(t.op.expected).toBe('wordt')
    expect(t.op.typed).toBe('word')
    expect(t.label?.tag).toBe('dt')
    expect(t.label?.tip.en).toMatch(/hij/i)
  })

  it('ignores punctuation for the score but reports it', () => {
    const g = gradeAttempt(S, 'Hij wordt elke dag om zes uur wakker', 'nl')
    expect(g.perfect).toBe(true)
    expect(g.punctOnly).toBe(true)
    expect(g.score).toBe(1)
  })

  it('counts capitals', () => {
    const g = gradeAttempt('Ik heb twee ideeën voor het feest.', 'ik heb twee ideeën voor het feest.', 'nl')
    expect(g.perfect).toBe(false)
    expect(g.wrong[0].label?.kind).toBe('case')
    expect(g.wrong[0].sentenceStart).toBe(true)
  })

  it('counts a missing trema', () => {
    const g = gradeAttempt('Ik heb twee ideeën voor het feest.', 'Ik heb twee ideeen voor het feest.', 'nl')
    expect(g.wrong[0].label?.tag).toBe('trema')
  })

  it('handles missing and extra words', () => {
    const g = gradeAttempt('Ik word elke ochtend om zeven uur wakker.', 'Ik word ochtend om zeven uur heel wakker.', 'nl')
    const statuses = g.wrong.map((t) => t.status).sort()
    expect(statuses).toEqual(['extra', 'missing'])
    expect(g.total).toBe(8)
    expect(g.correct).toBe(7)
    expect(g.extra).toBe(1)
  })

  it('treats a split compound as one wrong word', () => {
    const g = gradeAttempt('De hond slaapt in een hondenmand.', 'De hond slaapt in een honden mand.', 'nl')
    expect(g.wrong).toHaveLength(1)
    expect(g.wrong[0].op.op).toBe('split')
    expect(g.wrong[0].label?.tag).toBe('split-join')
  })

  it('ignores Arabic tashkeel but not hamza', () => {
    expect(gradeAttempt('ذهبت إلى السوق مع أمي.', 'ذَهَبْتُ إلى السوق مع أمي.', 'ar').perfect).toBe(true)
    const g = gradeAttempt('ذهبت إلى السوق مع أمي.', 'ذهبت الى السوق مع امي.', 'ar')
    expect(g.wrong.map((t) => t.op.expected)).toEqual(['إلى', 'أمي'])
    expect(g.wrong.every((t) => t.label?.tag === 'hamza')).toBe(true)
  })

  it('never marks a vowel sign in the Arabic letter diff', () => {
    // wrong word typed with tashkeel: only the haa/taa marbuta letter is wrong
    const g = gradeAttempt('هذه مدرسة كبيرة وجميلة.', 'هذه مَدرَسه كبيرة وجميلة.', 'ar')
    expect(g.wrong).toHaveLength(1)
    const marks = typedGlyphs(g.wrong[0], 2).filter((x) => x.kind !== 'ok')
    expect(marks).toEqual([{ ch: 'ه', kind: 'wrong' }])
    expect(g.wrong[0].label?.tag).toBe('taa-marbuta')
  })

  it('finds the target word in minimal-pair mode', () => {
    expect(gradeAttempt('Word jij ook zo moe van dit weer?', 'Wordt jij ook zo moe van dit weer?', 'nl', 'Word').targetOk).toBe(false)
    expect(gradeAttempt('Word jij ook zo moe van dit weer?', 'Word jij ook zo moe van dit wer?', 'nl', 'Word').targetOk).toBe(true)
    expect(gradeAttempt('Hij wordt morgen dertig.', 'Hij wordt morgen dertig.', 'nl').targetOk).toBeUndefined()
  })

  it('treats curly and straight apostrophes the same', () => {
    expect(gradeAttempt("Mijn twee opa's wonen allebei in Zeeland.", 'Mijn twee opa’s wonen allebei in Zeeland.', 'nl').perfect).toBe(true)
  })
})

describe('glyph helpers', () => {
  const g = gradeAttempt('Hij wordt morgen twintig jaar.', 'Hij word morgen twintg jaarr.', 'nl')
  const [wordt, twintig, jaar] = g.wrong

  it('level 1 shows the typed word unmarked (the caller marks the whole word)', () => {
    expect(typedGlyphs(wordt, 1).map((x) => x.kind)).toEqual(['ok', 'ok', 'ok', 'ok'])
  })

  it('level 2 shows a gap for a missing letter without giving it away', () => {
    const gl = typedGlyphs(wordt, 2)
    expect(gl.map((x) => x.ch).join('')).toBe('word')
    expect(gl[gl.length - 1]).toEqual({ ch: '', kind: 'missing' })
    expect(typedGlyphs(twintig, 2).filter((x) => x.kind === 'missing')).toHaveLength(1)
    expect(typedGlyphs(jaar, 2).filter((x) => x.kind === 'extra')).toHaveLength(1)
  })

  it('the reveal marks the letters that were fixed', () => {
    const gl = expectedGlyphs(wordt)
    expect(gl.map((x) => x.ch).join('')).toBe('wordt')
    expect(gl.filter((x) => x.kind === 'fixed').map((x) => x.ch)).toEqual(['t'])
  })

  it('a missing word becomes one gap per letter from level 2', () => {
    const m = gradeAttempt('Ik word elke ochtend wakker.', 'Ik word ochtend wakker.', 'nl').wrong[0]
    expect(typedGlyphs(m, 1)).toHaveLength(1)
    expect(typedGlyphs(m, 2)).toHaveLength(4)
    expect(expectedGlyphs(m).map((x) => x.ch).join('')).toBe('elke')
  })
})
