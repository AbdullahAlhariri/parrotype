import { describe, expect, it } from 'vitest'
import { alignWords, charDiff, classifyOps, scoreAlignment, tokenize, type WordOp } from './align'

const brief = (ops: WordOp[]) => ops.map((o) => [o.op, o.expected ?? null, o.typed ?? null])

describe('tokenize', () => {
  it('keeps inner apostrophes and hyphens, and Dutch \u2019s / \u2019t', () => {
    expect(tokenize("'s Avonds eet ik auto's en zee-egel!").map((t) => [t.text, t.punct])).toEqual([
      ["'s", false],
      ['Avonds', false],
      ['eet', false],
      ['ik', false],
      ["auto's", false],
      ['en', false],
      ['zee-egel', false],
      ['!', true],
    ])
    expect(tokenize('it\u2019s').map((t) => t.text)).toEqual(["it's"])
  })

  it('records offsets and handles Arabic punctuation', () => {
    const t = tokenize('مرحبا، كيف حالك؟')
    expect(t.map((x) => [x.text, x.punct])).toEqual([
      ['مرحبا', false],
      ['،', true],
      ['كيف', false],
      ['حالك', false],
      ['؟', true],
    ])
    expect(t[2]).toMatchObject({ start: 7, end: 10 })
  })

  it('keeps offsets into the original text and normalises each token', () => {
    const typed = 'idee\u0065\u0308n zijn \uFEFB goed' // decomposed ë, Linux lam-alef
    const t = tokenize(typed)
    expect(t.map((x) => x.norm)).toEqual(['ideeën', 'zijn', 'لا', 'goed'])
    for (const x of t) expect(typed.slice(x.start, x.end)).toBe(x.text)
    expect(tokenize('ك\u200Dتب')).toHaveLength(1)
  })

  it('drops punctuation and folds case/diacritics on request', () => {
    expect(tokenize('Hé, dag!', { ignorePunctuation: true, ignoreCase: true, ignoreDiacritics: true }).map((t) => t.norm)).toEqual(['he', 'dag'])
    expect(tokenize('كَتَبَ', { ignoreDiacritics: true })[0].norm).toBe('كتب')
  })
})

describe('alignWords', () => {
  it('aligns identical text as all equal', () => {
    const ops = alignWords('Ik ga naar huis.', 'Ik ga naar huis.')
    expect(ops.every((o) => o.op === 'equal')).toBe(true)
    expect(scoreAlignment(ops)).toMatchObject({ correctWords: 4, totalWords: 4, accuracy: 100 })
  })

  it('aligns a misspelled word as a substitution (wordt -> word)', () => {
    const ops = alignWords('Hij wordt groot.', 'Hij word groot.')
    expect(brief(ops)).toEqual([
      ['equal', 'Hij', 'Hij'],
      ['sub', 'wordt', 'word'],
      ['equal', 'groot', 'groot'],
      ['equal', '.', '.'],
    ])
    expect(ops[1]).toMatchObject({ expIndex: 1, typedIndex: 1, expRange: [4, 9], typedRange: [4, 8] })
  })

  it('detects a compound written apart (split) and words run together (merge)', () => {
    const split = alignWords('Ik lig in het ziekenhuis', 'Ik lig in het zieken huis')
    expect(brief(split).at(-1)).toEqual(['split', 'ziekenhuis', 'zieken huis'])
    expect(split.at(-1)).toMatchObject({ expIndex: 4, typedIndex: 4, typedRange: [14, 25] })

    const merge = alignWords('Dat is te veel', 'Dat is teveel')
    expect(brief(merge).at(-1)).toEqual(['merge', 'te veel', 'teveel'])

    const nearSplit = alignWords('het ziekenhuis', 'het zieke huis')
    expect(nearSplit.at(-1)?.op).toBe('split')
  })

  it('handles missing and extra words', () => {
    expect(brief(alignWords('ik ga naar huis', 'ik naar huis'))).toEqual([
      ['equal', 'ik', 'ik'],
      ['del', 'ga', null],
      ['equal', 'naar', 'naar'],
      ['equal', 'huis', 'huis'],
    ])
    expect(brief(alignWords('ik ga naar huis', 'ik ga snel naar huis'))[2]).toEqual(['ins', null, 'snel'])
    expect(brief(alignWords('ik ga', ''))).toEqual([
      ['del', 'ik', null],
      ['del', 'ga', null],
    ])
  })

  it('keeps unrelated words as substitutions in place', () => {
    expect(brief(alignWords('ik ga naar huis', 'ik loop naar huis'))[1]).toEqual(['sub', 'ga', 'loop'])
  })

  it('respects ignoreCase and ignorePunctuation', () => {
    expect(alignWords('Hij komt.', 'hij komt.')[0].op).toBe('sub')
    expect(alignWords('Hij komt.', 'hij komt.', { ignoreCase: true })[0].op).toBe('equal')
    const ops = alignWords('Hallo, wereld.', 'Hallo wereld')
    expect(brief(ops)).toEqual([
      ['equal', 'Hallo', 'Hallo'],
      ['del', ',', null],
      ['equal', 'wereld', 'wereld'],
      ['del', '.', null],
    ])
    expect(ops[1].punct).toBe(true)
    expect(scoreAlignment(ops)).toMatchObject({ correctWords: 2, totalWords: 2, accuracy: 100, errors: { punct: 2 } })
    expect(alignWords('Hallo, wereld.', 'Hallo wereld', { ignorePunctuation: true }).every((o) => o.op === 'equal')).toBe(true)
  })

  it('never substitutes a word for a punctuation mark', () => {
    const ops = alignWords('Ja, nee', 'Ja nee hoor')
    expect(ops.some((o) => o.op === 'sub')).toBe(false)
  })

  it('treats composed and decomposed Dutch letters as equal', () => {
    expect(alignWords('ideeën', 'ideee\u0308n')[0].op).toBe('equal')
    expect(alignWords('ideeën', 'ideeen')[0].op).toBe('sub')
    expect(alignWords('ideeën', 'ideeen', { ignoreDiacritics: true })[0].op).toBe('equal')
  })

  it('aligns Arabic, optionally ignoring tashkeel but never the hamza', () => {
    const expected = 'ذهبتُ إلى المدرسةِ'
    const typed = 'ذهبت الى المدرسه'
    expect(brief(alignWords(expected, typed))).toEqual([
      ['sub', 'ذهبتُ', 'ذهبت'],
      ['sub', 'إلى', 'الى'],
      ['sub', 'المدرسةِ', 'المدرسه'],
    ])
    expect(alignWords(expected, typed, { ignoreDiacritics: true }).map((o) => o.op)).toEqual(['equal', 'sub', 'sub'])
    expect(brief(alignWords('ذهبت إلى البيت', 'ذهبت البيت'))[1]).toEqual(['del', 'إلى', null])
  })
})

describe('scoreAlignment', () => {
  it('counts expected words, extra words and split/merge errors', () => {
    const ops = alignWords('Dat is te veel voor het ziekenhuis', 'Dat is teveel voor voor het zieken huis')
    const s = scoreAlignment(ops)
    expect(s.totalWords).toBe(7)
    expect(s.correctWords).toBe(4)
    expect(s.errors).toMatchObject({ merge: 1, split: 1, ins: 1 })
    expect(s.accuracy).toBe(50) // 4 / (7 + 1)
    expect(scoreAlignment([])).toMatchObject({ totalWords: 0, accuracy: 100 })
  })
})

describe('charDiff', () => {
  it('diffs letters for rendering', () => {
    expect(charDiff('wordt', 'word')).toEqual([
      { op: 'equal', a: 'w', b: 'w' },
      { op: 'equal', a: 'o', b: 'o' },
      { op: 'equal', a: 'r', b: 'r' },
      { op: 'equal', a: 'd', b: 'd' },
      { op: 'del', a: 't' },
    ])
    expect(charDiff('the', 'teh').map((o) => o.op)).toEqual(['equal', 'sub', 'sub'])
    expect(charDiff('', 'ab')).toEqual([
      { op: 'ins', b: 'a' },
      { op: 'ins', b: 'b' },
    ])
    expect(charDiff('ideeën', 'ideeen').filter((o) => o.op !== 'equal')).toEqual([{ op: 'sub', a: 'ë', b: 'e' }])
    expect(charDiff('مدرسة', 'مدرسه').at(-1)).toEqual({ op: 'sub', a: 'ة', b: 'ه' })
  })
})

describe('classifyOps', () => {
  it('labels each op in dictation mode with sentence context', () => {
    const ops = alignWords('Hij wordt morgen opgehaald.', 'Hij word morgen opgehaalt.')
    const labels = classifyOps(ops, 'nl')
    expect(labels[0]).toBeNull()
    expect(labels[1]).toMatchObject({ tag: 'dt', nature: 'cognitive' })
    expect(labels[1]?.tip.en).toMatch(/After 'Hij'/)
    expect(labels[3]).toMatchObject({ tag: 'dt' })
    expect(labels[4]).toBeNull() // the full stop
    expect(classifyOps(alignWords('in het ziekenhuis', 'in het zieken huis'), 'nl')[2]).toMatchObject({ kind: 'space', nature: 'cognitive' })
    expect(classifyOps(alignWords('ik ga', 'ik'), 'nl')[1]).toMatchObject({ kind: 'skipped' })
  })
})
