import { describe, expect, it } from 'vitest'
import { classifyTypo, editOps, osaDistance, type ClassifyOptions, type TypoLabel } from './typo'
import type { Lang } from '@/types'

const cls = (expected: string, typed: string, lang: Lang = 'nl', o?: ClassifyOptions): TypoLabel => {
  const l = classifyTypo(expected, typed, lang, o)
  if (!l) throw new Error(`no label for ${expected} / ${typed}`)
  return l
}

describe('osaDistance and editOps', () => {
  it('computes optimal string alignment distance', () => {
    expect(osaDistance('kitten', 'sitting')).toBe(3)
    expect(osaDistance('the', 'teh')).toBe(1)
    expect(osaDistance('ca', 'ac')).toBe(1)
    expect(osaDistance('abc', 'ca')).toBe(3) // OSA, not unrestricted Damerau
    expect(osaDistance('', 'abc')).toBe(3)
    expect(osaDistance('ideeën', 'ideeen')).toBe(1)
    expect(osaDistance('مدرسة', 'مدرسه')).toBe(1)
  })

  it('returns keyboard-aware edit operations', () => {
    expect(editOps('the', 'teh').map((o) => o.op)).toEqual(['equal', 'swap'])
    expect(editOps('the', 'teh')[1]).toMatchObject({ op: 'swap', e: 'he', t: 'eh', i: 1, j: 1 })
    expect(editOps('alleen', 'aleen').filter((o) => o.op !== 'equal')).toEqual([{ op: 'del', e: 'l', i: 2, j: 2 }])
    expect(editOps('test', 'tesrt').filter((o) => o.op !== 'equal')).toEqual([{ op: 'ins', t: 'r', i: 3, j: 3 }])
    expect(editOps('the', 'thw').filter((o) => o.op !== 'equal')).toEqual([{ op: 'sub', e: 'e', t: 'w', i: 2, j: 2 }])
    expect(editOps('', 'ab').map((o) => o.op)).toEqual(['ins', 'ins'])
    expect(editOps('ab', '').map((o) => o.op)).toEqual(['del', 'del'])
  })
})

describe('classifyTypo basics', () => {
  it('returns null for identical words (curly apostrophes count as straight)', () => {
    expect(classifyTypo('kat', 'kat', 'nl')).toBeNull()
    expect(classifyTypo("it's", 'it’s', 'en')).toBeNull()
  })

  it('labels a skipped word', () => {
    expect(cls('woord', '')).toMatchObject({ kind: 'skipped', detail: 'word not typed' })
  })

  it('gives English tips everywhere and a local tip for nl and ar', () => {
    expect(cls('the', 'thw', 'en').tip.local).toBeUndefined()
    expect(cls('kat', 'kst', 'nl').tip.local).toMatch(/buurtoets/)
    expect(cls('كتب', 'كتل', 'ar').tip.local).toMatch(/المفتاح المجاور/)
  })

  it('accepts a layout id or an options object as the 4th argument', () => {
    // on AZERTY, a and z are neighbours; on QWERTY they are not
    expect(cls('az', 'zz', 'nl', 'azerty-be').kind).toBe('adjacent')
    expect(cls('ma', 'mz', 'nl', { layout: 'qwerty-us' }).kind).toBe('adjacent')
  })
})

describe('motor slips', () => {
  it('neighbour key', () => {
    expect(cls('the', 'thw', 'en')).toMatchObject({ kind: 'adjacent', nature: 'motor', tag: 'neighbour', detail: "hit 'w' instead of 'e' (neighbour key)" })
    expect(cls('test', 'tesr', 'en').detail).toBe("hit 'r' instead of 't' (neighbour key)")
  })

  it('transposition, cross-hand and same-hand', () => {
    expect(cls('the', 'teh', 'en')).toMatchObject({ kind: 'transposition', nature: 'motor', tag: 'cross-hand', detail: "swapped 'h' and 'e'" })
    expect(cls('great', 'graet', 'en')).toMatchObject({ kind: 'transposition', tag: 'same-hand' })
    expect(cls('from', 'form', 'en').kind).toBe('transposition')
  })

  it('mirror key and same finger', () => {
    expect(cls('dog', 'kog', 'en')).toMatchObject({ kind: 'substitution', nature: 'motor', tag: 'mirror' })
    expect(cls('decent', 'deeent', 'en')).toMatchObject({ kind: 'substitution', nature: 'motor', tag: 'same-finger' })
  })

  it('insertions: rolled neighbour, bounce, other', () => {
    expect(cls('the', 'thre', 'en')).toMatchObject({ kind: 'insertion', nature: 'motor', tag: 'roll', detail: "extra 'r' (neighbour of 'e')" })
    expect(cls('the', 'thhe', 'en')).toMatchObject({ kind: 'doubling', nature: 'motor', tag: 'repeat', detail: "pressed 'h' twice" })
    expect(cls('allen', 'alllen', 'nl')).toMatchObject({ kind: 'insertion', nature: 'motor', tag: 'repeat' })
    expect(cls('cat', 'cpat', 'en')).toMatchObject({ kind: 'insertion', nature: 'unknown', detail: "extra 'p'" })
  })

  it('omission and a word cut short', () => {
    expect(cls('house', 'hose', 'en')).toMatchObject({ kind: 'omission', detail: "left out 'u'" })
    expect(cls('alleen', 'al', 'nl')).toMatchObject({ kind: 'omission', tag: 'cut-short', detail: "stopped after 'al'" })
  })

  it('wrong letter doubled (Rumelhart & Norman)', () => {
    expect(cls('book', 'bokk', 'en')).toMatchObject({ kind: 'doubling', nature: 'motor', detail: "doubled 'k' instead of 'o'" })
  })

  it('hands shifted off the home row', () => {
    expect(cls('the', 'yjr', 'en')).toMatchObject({ kind: 'adjacent', nature: 'motor', tag: 'hand-shift', detail: 'hands one key to the right' })
    expect(cls('information', 'ubfirnatuib', 'en').tag).not.toBe('hand-shift') // only partly shifted
  })

  it('several differences become a spelling/garbled label', () => {
    expect(cls('weather', 'wthe', 'en')).toMatchObject({ kind: 'spelling', nature: 'unknown' })
    expect(cls('weather', 'wthe', 'en', { mode: 'dictation' }).nature).toBe('cognitive')
  })

  it('combines two slips into one label', () => {
    const l = cls('typing', 'tyipng', 'en')
    expect(l.detail).toContain('swapped')
    const two = cls('keyboard', 'keyvoarf', 'en')
    expect(two).toMatchObject({ kind: 'adjacent', nature: 'motor' })
    expect(two.detail.split('; ')).toHaveLength(2)
  })

  it('labels the dead-key artifact', () => {
    expect(cls('"een', 'ëen', 'nl')).toMatchObject({ kind: 'diacritic', tag: 'dead-key', nature: 'motor' })
    expect(cls('één', "'e'en", 'nl')).toMatchObject({ kind: 'diacritic', tag: 'dead-key' })
  })
})

describe('capitals and diacritics', () => {
  it('case only', () => {
    expect(cls('Amsterdam', 'amsterdam')).toMatchObject({ kind: 'case', tag: 'capital', nature: 'motor', detail: "missed the capital in 'Amsterdam'" })
    const d = cls('maandag', 'Maandag', 'nl', { mode: 'dictation' })
    expect(d).toMatchObject({ kind: 'case', nature: 'cognitive', detail: "no capital needed: 'maandag'" })
    expect(d.tip.local).toMatch(/dagen, maanden/)
  })

  it('Dutch trema and accents', () => {
    expect(cls('ideeën', 'ideeen')).toMatchObject({ kind: 'diacritic', tag: 'trema', detail: "missing trema: 'ideeën'" })
    expect(cls('België', 'belgie')).toMatchObject({ kind: 'diacritic', tag: 'trema' })
    expect(cls('financieel', 'financiëel')).toMatchObject({ kind: 'diacritic', tag: 'trema', detail: "extra trema: 'financieel' has none" })
    expect(cls('café', 'cafe')).toMatchObject({ kind: 'diacritic', tag: 'accent', detail: "missing accent: 'café'" })
    expect(cls('ideeën', 'ideeen', 'nl', { mode: 'dictation' }).nature).toBe('cognitive')
  })
})

describe('Dutch spelling rules', () => {
  it('d/t endings with context-aware tips', () => {
    expect(cls('wordt', 'word')).toMatchObject({ kind: 'spelling', nature: 'cognitive', tag: 'dt', detail: "d/t ending: 'wordt', not 'word'" })
    expect(cls('word', 'wordt', 'nl', { prev: 'ik' }).tip.local).toMatch(/^Na ik/)
    expect(cls('word', 'wordt', 'nl', { next: 'je' }).tip.en).toMatch(/t drops/)
    expect(cls('vindt', 'vind', 'nl', { prev: 'hij' }).tip.en).toBe("After 'hij' the verb gets stem + t: hij wordt, het vindt.")
    expect(cls('gebeurd', 'gebeurt', 'nl', { prev: 'is' }).tip.en).toMatch(/past participle/)
    expect(cls('gebeurt', 'gebeurd').tag).toBe('dt')
    expect(cls('werd', 'werdt').tag).toBe('dt')
    expect(cls('wordt', 'wort').tag).toBe('dt')
    expect(cls('hond', 'hont').tag).toBe('dt')
  })

  it("past tense endings ('t kofschip)", () => {
    for (const [e, t] of [
      ['werkte', 'werkde'],
      ['woonde', 'woonte'],
      ['wachtte', 'wachte'],
      ['antwoordde', 'antwoorde'],
      ['leefde', 'leefte'],
      ['fietsten', 'fietsden'],
    ]) {
      expect(cls(e, t)).toMatchObject({ kind: 'spelling', tag: 'kofschip', nature: 'cognitive' })
    }
  })

  it('ei/ij, ij/y, au/ou and g/ch', () => {
    expect(cls('tijd', 'teid')).toMatchObject({ tag: 'ei-ij', detail: "ei/ij: 'tijd'" })
    expect(cls('trein', 'trijn').tag).toBe('ei-ij')
    expect(cls('zei', 'zij').tag).toBe('ei-ij')
    expect(cls('blijven', 'blyven').tag).toBe('ij-y')
    expect(cls('blauw', 'blouw').tag).toBe('au-ou')
    expect(cls('oud', 'aud').tag).toBe('au-ou')
    expect(cls('nodig', 'nodich').tag).toBe('g-ch')
    expect(cls('ligt', 'licht').tag).toBe('g-ch')
    expect(cls('echt', 'egt').tag).toBe('g-ch')
  })

  it('apostrophes', () => {
    expect(cls("auto's", 'autos')).toMatchObject({ tag: 'apostrophe', nature: 'cognitive' })
    expect(cls("'s avonds", "s'avonds")).toMatchObject({ tag: 'apostrophe' })
    expect(cls("auto's", 'autos').tip.local).toMatch(/auto's/)
  })

  it('tussen-n, but not for an ordinary missed double', () => {
    expect(cls('pannenkoek', 'pannekoek')).toMatchObject({ tag: 'tussen-n', kind: 'spelling' })
    expect(cls('zonnebloem', 'zonnenbloem').tag).toBe('tussen-n')
    expect(cls('kennen', 'kenen')).toMatchObject({ kind: 'missed-double', tag: 'double-consonant' })
  })

  it('double letters and the open-syllable rule', () => {
    expect(cls('jullie', 'julie')).toMatchObject({ kind: 'missed-double', tag: 'double-consonant', detail: "single 'l' where 'll' belongs" })
    expect(cls('kopen', 'koopen')).toMatchObject({ kind: 'doubling', tag: 'open-syllable' })
    expect(cls('maar', 'mar')).toMatchObject({ kind: 'missed-double', tag: 'open-syllable' })
    expect(cls('jullie', 'julie', 'nl', { mode: 'dictation' }).nature).toBe('cognitive')
    expect(cls('jullie', 'julie').nature).toBe('unknown')
  })

  it('word confusions (de/het, als/dan, jou/jouw...)', () => {
    expect(cls('dan', 'als')).toMatchObject({ tag: 'als-dan', kind: 'spelling', nature: 'cognitive' })
    expect(cls('het', 'de').tag).toBe('de-het')
    expect(cls('dat', 'die').tag).toBe('die-dat')
    expect(cls('jouw', 'jou').tag).toBe('jou-jouw')
    expect(cls('mijn', 'me').tag).toBe('me-mijn')
  })

  it('split and joined words, hyphens', () => {
    expect(cls('ziekenhuis', 'zieken huis', 'nl', { mode: 'dictation' })).toMatchObject({ kind: 'space', tag: 'split-join', nature: 'cognitive', detail: "split 'ziekenhuis' into two words" })
    expect(cls('ziekenhuis', 'zieken huis', 'nl', { mode: 'dictation' }).tip.local).toMatch(/aan elkaar/)
    expect(cls('te veel', 'teveel', 'nl', { mode: 'dictation' }).tip.local).toMatch(/losse woorden/)
    expect(cls('ziekenhuis', 'zieken huis')).toMatchObject({ kind: 'space', nature: 'motor' })
    expect(cls('zee-egel', 'zeeegel')).toMatchObject({ kind: 'spelling', tag: 'hyphen' })
  })

  it('does not invent rule labels for plain slips', () => {
    expect(cls('kat', 'kst').tag).toBe('neighbour')
    expect(cls('huis', 'hius').kind).toBe('transposition')
    expect(cls('fiets', 'fietd').tag).not.toBe('dt') // fiets does not end in d/t
  })
})

describe('English rules', () => {
  it("its / it's", () => {
    expect(cls("it's", 'its', 'en')).toMatchObject({ kind: 'spelling', tag: 'its-its', nature: 'cognitive' })
    expect(cls('its', "it's", 'en').tag).toBe('its-its')
    expect(cls("it's", 'its', 'en').tip.en).toMatch(/it is/)
  })

  it('homophones with a pair-specific tip', () => {
    const l = cls('their', 'there', 'en')
    expect(l).toMatchObject({ kind: 'spelling', tag: 'homophone', nature: 'cognitive' })
    expect(l.tip.en).toMatch(/belongs to them/)
    expect(cls('than', 'then', 'en').tag).toBe('homophone')
    expect(cls("you're", 'your', 'en').tag).toBe('homophone')
    // a double tap in a copy test is not necessarily a mix-up
    expect(cls('to', 'too', 'en').nature).toBe('unknown')
    expect(cls('to', 'too', 'en', { mode: 'dictation' }).nature).toBe('cognitive')
  })

  it('ie/ei, apostrophes and double consonants', () => {
    expect(cls('receive', 'recieve', 'en').tag).toBe('ie-ei')
    expect(cls("don't", 'dont', 'en').tag).toBe('apostrophe')
    expect(cls('until', 'untill', 'en')).toMatchObject({ kind: 'doubling', tag: 'double-consonant' })
    expect(cls('occurred', 'occured', 'en')).toMatchObject({ kind: 'missed-double', tag: 'double-consonant' })
  })

  it('flags another real word only with a dictionary', () => {
    const dict = { has: (w: string) => ['hand', 'hold'].includes(w) }
    expect(cls('hand', 'hold', 'en', { dict })).toMatchObject({ tag: 'real-word', kind: 'spelling' })
    expect(cls('hand', 'hold', 'en').tag).not.toBe('real-word')
  })
})

describe('Arabic rules', () => {
  it('hamza on alif is a diacritic difference with a hamza tag', () => {
    expect(cls('أنا', 'انا', 'ar')).toMatchObject({ kind: 'diacritic', tag: 'hamza', nature: 'cognitive' })
    expect(cls('إلى', 'الى', 'ar').tag).toBe('hamza')
    expect(cls('أنا', 'انا', 'ar').tip.local).toMatch(/الهمزة/)
  })

  it('hamza seats and a dropped hamza', () => {
    expect(cls('سأل', 'سئل', 'ar')).toMatchObject({ kind: 'spelling', tag: 'hamza' })
    expect(cls('شيء', 'شي', 'ar').tag).toBe('hamza')
  })

  it('taa marbuta and alif maqsura', () => {
    expect(cls('مدرسة', 'مدرسه', 'ar')).toMatchObject({ kind: 'spelling', tag: 'taa-marbuta', nature: 'cognitive' })
    expect(cls('مدرسة', 'مدرست', 'ar').tag).toBe('taa-marbuta')
    expect(cls('على', 'علي', 'ar')).toMatchObject({ tag: 'alif-maqsura' })
  })

  it('tashkeel-only differences', () => {
    expect(cls('كَتَبَ', 'كتب', 'ar')).toMatchObject({ kind: 'diacritic', tag: 'tashkeel' })
  })

  it('keyboard slips on the Arabic 101 layout', () => {
    expect(cls('كتب', 'كتل', 'ar')).toMatchObject({ kind: 'adjacent', nature: 'motor' })
    expect(cls('ضرب', 'صرب', 'ar').kind).toBe('adjacent')
    expect(cls('كتاب', 'كاتب', 'ar').kind).toBe('transposition')
  })
})
