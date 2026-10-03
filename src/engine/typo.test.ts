import { describe, expect, it } from 'vitest'
import { classifyTypo, editOps, osaDistance, tipFor, typoName, type ClassifyOptions, type TypoLabel } from './typo'
import { TIPS, TYPO_TAGS } from './tips'
import { LAYOUTS, keyOf, layoutFor, type LayoutId } from './keyboard'
import { wordList } from './generator'
import type { Lang } from '@/types'

const cls = (expected: string, typed: string, lang: Lang = 'nl', o?: LayoutId | ClassifyOptions): TypoLabel => {
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
    const del = editOps('alleen', 'aleen').filter((o) => o.op !== 'equal')
    expect(del).toHaveLength(1)
    expect(del[0]).toMatchObject({ op: 'del', e: 'l' })
    expect(editOps('test', 'tesrt').filter((o) => o.op !== 'equal')).toEqual([{ op: 'ins', t: 'r', i: 3, j: 3 }])
    expect(editOps('the', 'thw').filter((o) => o.op !== 'equal')).toEqual([{ op: 'sub', e: 'e', t: 'w', i: 2, j: 2 }])
    expect(editOps('', 'ab').map((o) => o.op)).toEqual(['ins', 'ins'])
    expect(editOps('ab', '').map((o) => o.op)).toEqual(['del', 'del'])
  })
})

describe('classifyTypo basics', () => {
  it('returns null for identical words (curly apostrophes count as straight)', () => {
    expect(classifyTypo('kat', 'kat', 'nl')).toBeNull()
    expect(classifyTypo("it's", 'it\u2019s', 'en')).toBeNull()
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

describe('wrong keyboard layout', () => {
  it('notices Arabic typed in a Dutch test and Latin typed in an Arabic test', () => {
    expect(cls('kat', 'لشف', 'nl')).toMatchObject({ kind: 'substitution', tag: 'wrong-layout', nature: 'unknown' })
    expect(cls('كتب', 'ffd', 'ar').tag).toBe('wrong-layout')
    expect(cls('كتب', 'ffd', 'ar').tip.local).toMatch(/لوحة المفاتيح/)
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
    // a noun's final d is not the verb rule: it gets the "say a longer form" tip
    expect(cls('hond', 'hont')).toMatchObject({ tag: 'final-d', nature: 'cognitive', detail: "final d: 'hond', not 'hont'" })
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

  it('tussen-n, but not for plain n-omissions or a missed double', () => {
    expect(cls('pannenkoek', 'pannekoek')).toMatchObject({ tag: 'tussen-n', kind: 'spelling' })
    expect(cls('zonnebloem', 'zonnenbloem').tag).toBe('tussen-n')
    expect(cls('boekenkast', 'boekekast').tag).toBe('tussen-n')
    expect(cls('kennen', 'kenen').kind).toBe('missed-double')
    // not compounds with a linking -en-
    expect(cls('verdwenen', 'verdween').tag).not.toBe('tussen-n')
    expect(cls('nadenken', 'nadeken').tag).not.toBe('tussen-n')
    expect(cls('samenwerken', 'samewerken').tag).not.toBe('tussen-n')
    expect(cls('eigenlijk', 'eigelijk').tag).not.toBe('tussen-n')
  })

  it('double letters and the open-syllable rule (rule tags only from memory)', () => {
    const d = { mode: 'dictation' } as const
    expect(cls('jullie', 'julie', 'nl', d)).toMatchObject({ kind: 'missed-double', tag: 'double-consonant', nature: 'cognitive', detail: "single 'l' where 'll' belongs" })
    expect(cls('kopen', 'koopen', 'nl', d)).toMatchObject({ kind: 'doubling', tag: 'open-syllable' })
    expect(cls('maar', 'mar', 'nl', d)).toMatchObject({ kind: 'missed-double', tag: 'open-syllable' })
    expect(cls('kopen', 'koopen', 'nl', d).tip.local).toMatch(/lettergreep/)
    // in a copy test the same slips stay neutral
    expect(cls('jullie', 'julie')).toMatchObject({ kind: 'missed-double', nature: 'unknown' })
    expect(cls('jullie', 'julie').tag).toBeUndefined()
    expect(cls('kopen', 'koopen').tag).toBeUndefined()
  })

  it('-lijk written as it sounds', () => {
    expect(cls('natuurlijk', 'natuurluk')).toMatchObject({ tag: 'lijk', nature: 'cognitive' })
    expect(cls('eigenlijk', 'eigenlek').tag).toBe('lijk')
    expect(cls('moeilijk', 'moeilik', 'nl', { mode: 'dictation' }).tag).toBe('lijk')
    expect(cls('moeilijk', 'moeilik').tag).not.toBe('lijk') // could be one dropped key
  })

  it("kofschip ignores an extra doubled d/t (a bounce)", () => {
    expect(cls('zitten', 'zittten').tag).not.toBe('kofschip')
    expect(cls('houden', 'houdden').tag).not.toBe('kofschip')
    expect(cls('maakte', 'maaktte').tag).not.toBe('kofschip')
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

describe('dictation mode leans cognitive', () => {
  const d = { mode: 'dictation' } as const
  it('sound-alike letters beat the neighbour key', () => {
    expect(cls('sowieso', 'zowieso', 'nl', d)).toMatchObject({ tag: 'phonetic', nature: 'cognitive' })
    expect(cls('sowieso', 'zowieso', 'nl')).toMatchObject({ kind: 'adjacent', nature: 'motor' })
    expect(cls('vakantie', 'vacantie', 'nl', d).tag).toBe('phonetic')
  })

  it('unstressed vowels', () => {
    expect(cls('separate', 'seperate', 'en', d)).toMatchObject({ kind: 'substitution', tag: 'vowel', nature: 'cognitive' })
    expect(cls('definitief', 'defenitief', 'nl', d).tag).toBe('vowel')
    expect(cls('definitief', 'defenitief', 'nl').tag).toBe('mirror') // e/i are mirror keys in a copy test
  })

  it('a moved double letter', () => {
    expect(cls('tomorrow', 'tommorow', 'en', d)).toMatchObject({ kind: 'doubling', tag: 'wrong-double', nature: 'cognitive' })
    expect(cls('interessant', 'interresant', 'nl', d).nature).toBe('cognitive')
    expect(cls('book', 'bokk', 'en').nature).toBe('motor')
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
    expect(cls('two', 'to', 'en').nature).toBe('unknown')
    expect(cls('then', 'than', 'en').nature).toBe('cognitive')
    expect(cls('to', 'too', 'en', { mode: 'dictation' }).nature).toBe('cognitive')
  })

  it('ie/ei, apostrophes and double consonants', () => {
    expect(cls('receive', 'recieve', 'en').tag).toBe('ie-ei')
    expect(cls("don't", 'dont', 'en').tag).toBe('apostrophe')
    expect(cls('until', 'untill', 'en', { mode: 'dictation' })).toMatchObject({ kind: 'doubling', tag: 'double-consonant' })
    expect(cls('occurred', 'occured', 'en', { mode: 'dictation' })).toMatchObject({ kind: 'missed-double', tag: 'double-consonant' })
    expect(cls('until', 'untill', 'en')).toMatchObject({ kind: 'doubling', nature: 'unknown' })
  })

  it('flags another real word only with a dictionary', () => {
    const dict = { has: (w: string) => ['hand', 'hold'].includes(w) }
    expect(cls('hand', 'hold', 'en', { dict })).toMatchObject({ tag: 'real-word', kind: 'spelling' })
    expect(cls('hand', 'hold', 'en').tag).not.toBe('real-word')
  })
})

describe('Arabic rules', () => {
  it('hamza on alif is a diacritic difference with a hamza tag', () => {
    // أ is Shift + ا: a copy test can't tell a missed Shift from a missing hamza
    expect(cls('أنا', 'انا', 'ar')).toMatchObject({ kind: 'diacritic', tag: 'hamza', nature: 'unknown' })
    expect(cls('أنا', 'انا', 'ar', { mode: 'dictation' }).nature).toBe('cognitive')
    // إ lives on another key (Shift + غ), so ا for إ is a choice
    expect(cls('إلى', 'الى', 'ar')).toMatchObject({ tag: 'hamza', nature: 'cognitive' })
    expect(cls('أنا', 'انا', 'ar').tip.local).toMatch(/الهمزة/)
  })

  it('hamza seats and a dropped hamza', () => {
    expect(cls('سأل', 'سئل', 'ar')).toMatchObject({ kind: 'spelling', tag: 'hamza', nature: 'cognitive' })
    expect(cls('شيء', 'شي', 'ar').tag).toBe('hamza')
    expect(cls('شيء', 'شئ', 'ar').tag).toBe('hamza')
    expect(cls('مسؤول', 'مسئول', 'ar').tag).toBe('hamza')
    // ء and ئ are neighbour keys
    expect(cls('الماء', 'المائ', 'ar')).toMatchObject({ tag: 'hamza', nature: 'unknown' })
    expect(cls('الماء', 'المائ', 'ar', { mode: 'dictation' }).nature).toBe('cognitive')
  })

  it('does not call a dropped, doubled or swapped hamza letter a spelling error', () => {
    expect(cls('أنا', 'نا', 'ar').tag).not.toBe('hamza')
    expect(cls('أنا', 'أأنا', 'ar').tag).not.toBe('hamza')
    expect(cls('أين', 'يأن', 'ar').kind).toBe('transposition')
    expect(cls('شيئ', 'شئي', 'ar').kind).toBe('transposition')
    expect(cls('الماء', 'الماءء', 'ar').tag).not.toBe('hamza')
    expect(cls('هؤلاء', 'هؤلااء', 'ar').tag).not.toBe('hidden-alif')
    expect(cls('الماء', 'الما', 'ar')).toMatchObject({ tag: 'hamza', nature: 'unknown' })
    expect(cls('الماء', 'الما', 'ar', { mode: 'dictation' }).nature).toBe('cognitive')
  })

  it('taa marbuta and alif maqsura (neighbour-key pairs stay neutral in a copy test)', () => {
    expect(cls('مدرسة', 'مدرسه', 'ar')).toMatchObject({ kind: 'spelling', tag: 'taa-marbuta', nature: 'cognitive' })
    expect(cls('مدرسة', 'مدرست', 'ar')).toMatchObject({ tag: 'taa-marbuta', nature: 'unknown' })
    expect(cls('مدرسة', 'مدرست', 'ar', { mode: 'dictation' }).nature).toBe('cognitive')
    expect(cls('على', 'علي', 'ar')).toMatchObject({ tag: 'alif-maqsura', nature: 'cognitive' })
    expect(cls('على', 'علا', 'ar')).toMatchObject({ tag: 'alif-maqsura', nature: 'unknown' })
  })

  it('Shift slips on the same key', () => {
    expect(cls('إلى', 'غلى', 'ar')).toMatchObject({ kind: 'substitution', tag: 'shift', nature: 'motor', detail: "'غ' instead of 'إ' (same key, missed Shift)" })
    expect(cls('آخر', 'ىخر', 'ar').tag).toBe('shift')
    expect(cls('تمر', 'ـمر', 'ar').detail).toContain('extra Shift')
    expect(cls('hoi!', 'hoi1', 'nl').tag).toBe('shift')
  })

  it("waw al-jama'a and the hidden alif of هؤلاء", () => {
    expect(cls('كتبوا', 'كتبو', 'ar', { mode: 'dictation' })).toMatchObject({ kind: 'spelling', tag: 'waw-alif', nature: 'cognitive' })
    expect(cls('كتبوا', 'كتبو', 'ar').nature).toBe('unknown')
    expect(cls('مهندسو', 'مهندسوا', 'ar').tag).toBe('waw-alif')
    expect(cls('هؤلاء', 'هاؤلاء', 'ar').tag).toBe('hidden-alif')
  })

  it('points out dot twins that are neighbour keys', () => {
    expect(cls('سلام', 'شلام', 'ar')).toMatchObject({ kind: 'adjacent', detail: "hit 'ش' instead of 'س' (neighbour key, the letters only differ by dots)" })
  })

  it('accepts the Linux lam-alef ligature and Persian look-alikes as the same text', () => {
    expect(classifyTypo('لا', '\uFEFB', 'ar')).toBeNull()
    expect(classifyTypo('في', 'ف\u06CC', 'ar')).toBeNull()
  })

  it('the hidden alif of هذا / لكن', () => {
    expect(cls('هذا', 'هاذا', 'ar')).toMatchObject({ kind: 'spelling', tag: 'hidden-alif', nature: 'cognitive' })
    expect(cls('لكن', 'لاكن', 'ar').tag).toBe('hidden-alif')
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

describe('names and tips', () => {
  it('has a display name and a tip for every tag', () => {
    for (const tag of TYPO_TAGS) {
      expect(typoName(tag, 'en').en).not.toBe(tag)
      const hasTip = Object.keys(TIPS).some((k) => k === tag || k.startsWith(tag + '.') || k.startsWith(tag + '-'))
      if (!['neighbour', 'cross-hand', 'same-hand', 'wrong-double', 'capital', 'split-join'].includes(tag)) expect(hasTip, tag).toBe(true)
    }
  })

  it('localises names and tips', () => {
    expect(typoName('dt', 'nl')).toEqual({ en: 'd/t ending', local: 'd/t-regel' })
    expect(typoName('hamza', 'ar').local).toBe('الهمزة')
    expect(typoName('its-its', 'en')).toEqual({ en: "its / it's" })
    expect(typoName('unknown-thing', 'en')).toEqual({ en: 'unknown-thing' })
    expect(tipFor('kofschip', 'nl').local).toMatch(/kofschip/)
    expect(tipFor('case', 'en').en).toMatch(/capitalises/) // language-specific tip wins
    expect(tipFor('adjacent', 'ar').local).toMatch(/المفتاح المجاور/)
  })
})

describe('review regressions: fewer false rule labels', () => {
  const d = { mode: 'dictation' } as const

  it('keeps the verb d/t rule for verb forms only', () => {
    // -dt only exists in verbs, and participle-shaped words (also with a separable particle)
    expect(cls('wordt', 'word').tag).toBe('dt')
    expect(cls('gebeurd', 'gebeurt')).toMatchObject({ tag: 'dt', nature: 'cognitive' })
    expect(cls('gebeurd', 'gebeurt').tip.en).toMatch(/is gebeurd/)
    expect(cls('opgehaald', 'opgehaalt').tag).toBe('dt')
    expect(cls('betaald', 'betaalt').tag).toBe('dt')
    // nouns and adjectives: the final d sounds like t, which is not the verb rule
    for (const [e, t] of [['hand', 'hant'], ['goed', 'goet'], ['kind', 'kint'], ['paard', 'paart'], ['gezond', 'gezont'], ['beeld', 'beelt']]) {
      expect(cls(e, t)).toMatchObject({ tag: 'final-d', nature: 'cognitive' })
    }
    expect(cls('hand', 'hant').tip.local).toMatch(/langere vorm/)
    // a d typed for a final t is not a d/t-rule question either: just sound-alike letters
    for (const [e, t] of [['dat', 'dad'], ['met', 'med'], ['niet', 'nied']]) {
      expect(cls(e, t).tag).not.toBe('dt')
      expect(cls(e, t).tag).toBe('phonetic')
    }
    // context still picks the verb rule and its tip
    expect(cls('vind', 'vint', 'nl', { prev: 'ik' }).tag).toBe('dt')
    expect(cls('vindt', 'vind', 'nl', { prev: '"Hij' }).tip.en).toMatch(/^After 'Hij' the verb/)
  })

  it("labels 't kofschip only where the rule explains the ending", () => {
    // participles follow 't kofschip too, including the v/z trap
    expect(cls('gemaakt', 'gemaakd')).toMatchObject({ tag: 'kofschip', detail: "participle ending: 'gemaakt', not 'gemaakd'" })
    expect(cls('geleefd', 'geleeft').tag).toBe('kofschip')
    expect(cls('reisde', 'reiste').tag).toBe('kofschip')
    expect(cls('werkte', 'werkde').tip.en).toMatch(/leven → leefde/)
    // grote is no past tense: 't kofschip would even predict the wrong ending
    expect(cls('grote', 'grode').tag).not.toBe('kofschip')
    // a lost double after one short vowel is the closed-syllable rule, not a past tense
    expect(cls('platte', 'plate')).toMatchObject({ kind: 'missed-double', nature: 'unknown' })
    expect(cls('platte', 'plate').tag).toBeUndefined()
    expect(cls('gladde', 'glade', 'nl', d).tag).toBe('double-consonant')
    expect(cls('spotte', 'spote').tag).not.toBe('kofschip')
    // after a consonant or a long vowel the double is the stem t + -te
    expect(cls('praatte', 'prate').kind).toBe('missed-double') // two letters dropped: not this rule
    expect(cls('praatte', 'praate').tag).toBe('kofschip')
    expect(cls('rustte', 'ruste').tag).toBe('kofschip')
  })

  it('does not call a radical -en- or a suffix a tussen-n', () => {
    expect(cls('ziekenhuis', 'ziekehuis').tag).toBe('tussen-n')
    expect(cls('binnenkort', 'binnekort').tag).toBeUndefined()
    expect(cls('keukentafel', 'keuketafel').tag).toBeUndefined()
    expect(cls('gelegenheid', 'gelegeheid').tag).toBeUndefined()
    expect(cls('binnenkort', 'binnekort').kind).toBe('omission')
  })

  it('treats one key more or less on a confusable pair as undecided in a copy test', () => {
    expect(cls('jouw', 'jou')).toMatchObject({ tag: 'jou-jouw', nature: 'unknown' })
    expect(cls('jouw', 'jou', 'nl', d).nature).toBe('cognitive')
    expect(cls('alleen', 'allen').nature).toBe('unknown')
    expect(cls('dan', 'als').nature).toBe('cognitive')
    expect(cls('kan', 'ken').nature).toBe('cognitive')
  })

  it('picks the right apostrophe tip and spots the Dutch IJ capital', () => {
    expect(cls("zo'n", 'zon').tip.local).toMatch(/weggelaten letters/)
    expect(cls("auto's", 'autos').tip.local).toMatch(/Meervoud/)
    expect(cls("don't", 'dont', 'en').tip.en).toMatch(/missing letters/)
    expect(cls('IJsland', 'Ijsland')).toMatchObject({ kind: 'case', nature: 'unknown', tag: 'capital' })
    expect(cls('IJsland', 'Ijsland', 'nl', d).nature).toBe('cognitive')
    expect(cls('IJsland', 'Ijsland').tip.local).toMatch(/IJs/)
    expect(cls('Amsterdam', 'amsterdam').nature).toBe('motor')
  })

  it('treats a space inside a short piece as a thumb slip, even from memory', () => {
    expect(cls('groot', 'gr oot', 'nl', d)).toMatchObject({ kind: 'space', nature: 'motor' })
    expect(cls('ziekenhuis', 'zieken huis', 'nl', d).nature).toBe('cognitive')
    expect(cls('voetbal', 'voet bal', 'nl', d).nature).toBe('cognitive')
    expect(cls('ok', 'o k', 'en', { mode: 'dictation', dict: { has: (w) => ['o', 'k'].includes(w) } }).nature).toBe('cognitive')
  })

  it('hears a final b as p in Dutch', () => {
    expect(cls('heb', 'hep', 'nl', d)).toMatchObject({ tag: 'phonetic', nature: 'cognitive' })
  })

  it('never calls a single slip garbled, even in a one-letter word', () => {
    expect(cls('a', 's', 'en')).toMatchObject({ kind: 'adjacent', tag: 'neighbour' })
    expect(cls('a', 'an', 'en').kind).toBe('insertion')
    expect(cls('a', 'q', 'en').kind).toBe('adjacent')
    expect(cls('in', 'ob', 'en').detail).toMatch(/several letters/)
  })

  it('looks through punctuation both words share, and labels punctuation-only slips', () => {
    expect(cls('wordt,', 'word,')).toMatchObject({ tag: 'dt', detail: "d/t ending: 'wordt', not 'word'" })
    expect(cls('"hallo"', '"halo"').kind).toBe('missed-double')
    expect(cls('ziekenhuis.', 'zieken huis.').detail).toBe("split 'ziekenhuis' into two words")
    expect(cls('huis.', 'huis')).toMatchObject({ kind: 'omission', tag: 'punctuation' })
    expect(cls('huis', 'huis,')).toMatchObject({ kind: 'insertion', tag: 'punctuation' })
    expect(cls('wat?', 'wat!')).toMatchObject({ kind: 'substitution', tag: 'punctuation' })
    expect(cls('huis.', 'huis').tip.local).toMatch(/Leestekens/)
    expect(classifyTypo('.', '.', 'nl')).toBeNull()
    expect(cls('.', ',').kind).toBe('substitution')
  })

  it('folds quotes exactly like the typing session (a backtick is a different key)', () => {
    expect(classifyTypo("auto's", 'auto’s', 'nl')).toBeNull()
    expect(classifyTypo("auto's", 'autoʼs', 'nl')).toBeNull()
    expect(classifyTypo("auto's", 'auto`s', 'nl')).not.toBeNull()
  })
})

describe('review regressions: simulated finger slips stay out of the knowledge bucket', () => {
  /** letters on the keys touching `ch` (same shift level) */
  const neighbours = (ch: string, lang: Lang): string[] => {
    const layout = layoutFor(lang)
    const p = keyOf(ch, layout)
    if (!p || p.shift) return []
    return LAYOUTS[layout].rows
      .flat()
      .filter((k) => k.row < 4 && k.code !== p.code && Math.hypot(k.x - p.x, k.row - p.row) <= 1.25 && /^\p{L}$/u.test(k.base))
      .map((k) => k.base)
  }
  const risky: Record<Lang, string[]> = {
    nl: ['het', 'niet', 'met', 'weet', 'moet', 'doet', 'heeft', 'gebeurd', 'antwoordde', 'platte', 'werkte', 'binnenkort', 'grote', 'hand', 'jouw', 'kopen'],
    en: ['their', 'its', 'to', 'then', 'receive', 'until', 'were', 'your'],
    ar: ['ذلك', 'هذا', 'مدرسة', 'على', 'إلى', 'شيء', 'قالوا', 'أنا'],
  }
  // slips that land exactly on a classic spelling error are fine to call cognitive
  const classic = new Set(['wordt>word', 'vindt>vind', 'houdt>houd', 'antwoordde>antwoorde', 'ziekenhuis>ziekehuis', 'لكن>لاكن'])

  it.each(['nl', 'en', 'ar'] as Lang[])('%s: neighbour keys, swaps, rolls, bounces and drops', (lang) => {
    const bad: string[] = []
    const check = (e: string, t: string) => {
      if (e === t || classic.has(`${e}>${t}`)) return
      if (classifyTypo(e, t, lang)?.nature === 'cognitive') bad.push(`${e}>${t}`)
    }
    for (const w of [...wordList(lang, 120), ...risky[lang]]) {
      const g = Array.from(w)
      g.forEach((ch, i) => {
        const at = (mid: string[], skip = 1) => [...g.slice(0, i), ...mid, ...g.slice(i + skip)].join('')
        for (const n of neighbours(ch, lang)) {
          check(w, at([n])) // neighbour key
          check(w, at([ch, n])) // rolled extra key
        }
        check(w, at([ch, ch])) // bounce
        if (g.length > 2) check(w, at([])) // dropped letter
        if (i + 1 < g.length) check(w, at([g[i + 1], ch], 2)) // swap
      })
    }
    expect(bad).toEqual([])
  })
})
