import { describe, expect, it } from 'vitest'
import { buildContext, splitClauses, splitSentences, tokenize } from './tokenize'

const words = (text: string) => tokenize(text, 'nl').filter((t) => t.isWord).map((t) => t.text)
const sentences = (text: string) => splitSentences(text, tokenize(text, 'nl')).map((s) => s.text)

describe('tokenize', () => {
  it('keeps apostrophes and hyphens inside words', () => {
    expect(words("Ik zag m'n opa's auto en zo'n e-mail van z'n zee-egel.")).toEqual([
      'Ik', 'zag', "m'n", "opa's", 'auto', 'en', "zo'n", 'e-mail', 'van', "z'n", 'zee-egel',
    ])
  })
  it("treats 's and 't as words, including 's-Hertogenbosch", () => {
    expect(words("'s Avonds ga ik naar 's-Hertogenbosch, 't is fijn.")).toEqual(["'s", 'Avonds', 'ga', 'ik', 'naar', "'s-Hertogenbosch", "'t", 'is', 'fijn'])
    expect(words('’s avonds')).toEqual(['’s', 'avonds'])
  })
  it('normalises curly apostrophes in lower', () => {
    const t = tokenize('Zo’n auto’s', 'nl')
    expect(t.map((x) => x.lower)).toEqual(["zo'n", "auto's"])
  })
  it('keeps diacritics and decimals whole', () => {
    expect(words('Ideeën in België kosten €3,50 of 1.000 euro om 10:30.')).toEqual(['Ideeën', 'in', 'België', 'kosten', '3,50', 'of', '1.000', 'euro', 'om', '10:30'])
  })
  it('keeps dotted abbreviations as one word', () => {
    expect(words('Dit is o.a. en d.w.z. hetzelfde, e.g. ook.')).toEqual(['Dit', 'is', 'o.a.', 'en', 'd.w.z.', 'hetzelfde', 'e.g.', 'ook'])
  })
  it('emits links, e-mail addresses and handles as non-word tokens', () => {
    const t = tokenize('Zie www.nu.nl of https://x.nl/a?b=1, mail jan@x.nl of @piet #taal.', 'nl')
    const zones = t.filter((x) => !x.isWord && x.text.length > 1).map((x) => x.text)
    expect(zones).toEqual(['www.nu.nl', 'https://x.nl/a?b=1', 'jan@x.nl', '@piet', '#taal'])
  })
  it('handles Arabic letters with tashkeel', () => {
    expect(words('ذَهَبَ الوَلَدُ إلى المَدرَسةِ؟')).toEqual(['ذَهَبَ', 'الوَلَدُ', 'إلى', 'المَدرَسةِ'])
  })
  it('gives correct offsets and indexes', () => {
    const t = tokenize('Hoi, wereld!', 'nl')
    expect(t.map((x) => [x.text, x.start, x.end, x.isWord, x.index])).toEqual([
      ['Hoi', 0, 3, true, 0],
      [',', 3, 4, false, 1],
      ['wereld', 5, 11, true, 2],
      ['!', 11, 12, false, 3],
    ])
  })
  it('groups runs of sentence marks and keeps emoji whole', () => {
    expect(tokenize('Wat?! Echt... 🙂', 'nl').map((x) => x.text)).toEqual(['Wat', '?!', 'Echt', '...', '🙂'])
  })
})

describe('splitSentences', () => {
  it('splits on . ? ! and Arabic ؟', () => {
    expect(sentences('Ik kom. Kom jij? Ja! هل أنت بخير؟ نعم.')).toEqual(['Ik kom.', 'Kom jij?', 'Ja!', 'هل أنت بخير؟', 'نعم.'])
  })
  it('does not split after abbreviations, initials or decimals', () => {
    expect(sentences('Dhr. Jansen en mevr. De Vries kwamen o.a. bijv. om 3.30 uur. Mr. Smith ook.')).toEqual([
      'Dhr. Jansen en mevr. De Vries kwamen o.a. bijv. om 3.30 uur.',
      'Mr. Smith ook.',
    ])
    expect(sentences('Het boek van J.K. Rowling en J. de Vries.')).toEqual(['Het boek van J.K. Rowling en J. de Vries.'])
  })
  it('splits after enz./etc. only before a capital', () => {
    expect(sentences('Appels, peren enz. Daarna niets.')).toEqual(['Appels, peren enz.', 'Daarna niets.'])
    expect(sentences('Appels, peren enz. en meer.')).toEqual(['Appels, peren enz. en meer.'])
  })
  it('treats an ellipsis as a boundary only before a capital', () => {
    expect(sentences('Ik dacht... nee. Toch wel... Misschien.')).toEqual(['Ik dacht... nee.', 'Toch wel...', 'Misschien.'])
  })
  it('keeps quoted questions with their speech tag', () => {
    expect(sentences('"Kom je?" vroeg hij. Ze knikte.')).toEqual(['"Kom je?" vroeg hij.', 'Ze knikte.'])
  })
  it('splits on line breaks', () => {
    expect(sentences('Boodschappen\nmelk\nbrood')).toEqual(['Boodschappen', 'melk', 'brood'])
  })
})

describe('splitClauses', () => {
  const clauses = (text: string) => {
    const ctx = buildContext(text, 'nl')
    return splitClauses(ctx).map((c) => ctx.words.slice(c.from, c.to + 1).map((w) => w.text).join(' '))
  }
  it('splits on commas and before conjunctions and relatives', () => {
    expect(clauses('Hij heeft gezegd dat het gebeurt, maar ik denk van niet.')).toEqual(['Hij heeft gezegd', 'dat het gebeurt', 'maar ik denk van niet'])
    expect(clauses('Het boek dat ik las was saai.')).toEqual(['Het boek', 'dat ik las was saai'])
  })
  it('keeps determiners and question-initial pronouns attached', () => {
    expect(clauses('Is dat gebeurd?')).toEqual(['Is dat gebeurd'])
    expect(clauses('Ik praat met die man.')).toEqual(['Ik praat met die man'])
    expect(clauses('Ik ben blij met hoe het gaat.')).toEqual(['Ik ben blij met', 'hoe het gaat'])
  })
  it('marks the opener and the subject slot', () => {
    const ctx = buildContext('Ik weet dat hij komt.', 'nl')
    const c = splitClauses(ctx)[1]
    expect(c.opener).toBe('dat')
    expect(ctx.words[c.core].text).toBe('hij')
  })
})

describe('buildContext', () => {
  it('fills words, sentences and defaults', () => {
    const ctx = buildContext('Hoi. Doei!', 'nl')
    expect(ctx.words.map((w) => w.text)).toEqual(['Hoi', 'Doei'])
    expect(ctx.sentences).toHaveLength(2)
    expect(ctx.strictness).toBe('normal')
    expect(ctx.dict).toBeUndefined()
  })
})
