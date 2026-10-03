import { beforeAll, describe, expect, it } from 'vitest'
import type { Issue, Lang } from '@/types'
import type { DictId, HunspellLike } from './core'
import { misspellingsFor } from './sources'
import { checkSpelling } from './spellcheck'
import { loadFreq, loadHunspell } from './testing'

const backends = new Map<DictId, HunspellLike>()
beforeAll(async () => {
  for (const id of ['nl', 'en-US', 'en-GB', 'ar'] as DictId[]) backends.set(id, await loadHunspell(id))
}, 30_000)

function check(text: string, lang: Lang, id: DictId = lang === 'en' ? 'en-US' : (lang as DictId), personal?: string[]) {
  const issues = checkSpelling(text, lang, backends.get(id)!, loadFreq(lang), {
    misspellings: misspellingsFor(lang),
    personal: personal ? new Set(personal) : undefined,
  })
  // spans always point at the flagged text
  for (const i of issues) expect(text.slice(i.offset, i.offset + i.length)).toBe(i.text)
  return issues
}

const flagged = (issues: Issue[]) => issues.map((i) => i.text)
const fixFor = (issues: Issue[], word: string) => issues.find((i) => i.text === word)?.replacements[0]

describe('Dutch', () => {
  it('accepts compounds the dictionary builds from parts', () => {
    expect(check('Mijn wachtwoord staat bij de huiswerkopdracht van vandaag.', 'nl')).toEqual([])
    expect(check('Het voetbalwedstrijdkaartje lag naast de keukentafel.', 'nl')).toEqual([])
  })

  it('does not flag names in the middle of a sentence', () => {
    expect(check('Ik woon in Utrecht met Fatima.', 'nl')).toEqual([])
    expect(check('Gisteren zag ik Yusra, Sanne en Mohammed bij de Albert Heijn.', 'nl')).toEqual([])
  })

  it('does not flag unknown names at the start of a sentence either', () => {
    // Yusra has no near word at all, Aylin is nearest to another name (Aydin)
    expect(check('Yusra komt morgen. Aylin leest een boek.', 'nl')).toEqual([])
    // but a sentence-initial typo of a common word is still caught
    const issues = check('Gistren ging ik naar huis. Ondaks de regen.', 'nl')
    expect(issues.map((i) => [i.text, i.replacements[0]])).toEqual([
      ['Gistren', 'Gisteren'],
      ['Ondaks', 'Ondanks'],
    ])
  })

  it('catches a long capitalised typo mid-sentence', () => {
    expect(fixFor(check('Dit is een Huiswerkopdrcht van school.', 'nl'), 'Huiswerkopdrcht')).toBe('Huiswerkopdracht')
  })

  it('prefers the common word over a name that differs only in case', () => {
    const issues = check('Het was een betje koud.', 'nl')
    expect(issues[0]).toMatchObject({ text: 'betje', category: 'spelling' })
    expect(issues[0].replacements[0]).toBe('beetje')
  })

  it('collapses drawn-out chat spelling', () => {
    expect(fixFor(check('Het is heeeel leuk.', 'nl'), 'heeeel')).toBe('heel')
    expect(fixFor(check('Jaaa, dat wil ik.', 'nl'), 'Jaaa')).toBe('Ja')
  })

  it('never offers a two-word split in Dutch when a compound fits', () => {
    const issues = check('Ik ga vandag naar school.', 'nl')
    expect(issues[0].replacements).toContain('vandaag')
    expect(issues[0].replacements).not.toContain('van dag')
  })

  it('keeps the suggestion list free of rare far-off compounds', () => {
    expect(check('Een ontwikkelling.', 'nl')[0].replacements).toEqual(['ontwikkeling'])
  })

  it('suggests eigenlijk for eigelijk, first', () => {
    const issues = check('Dat is eigelijk best leuk.', 'nl')
    expect(flagged(issues)).toEqual(['eigelijk'])
    expect(fixFor(issues, 'eigelijk')).toBe('eigenlijk')
    expect(issues[0]).toMatchObject({
      ruleId: 'spell',
      source: 'spell',
      category: 'spelling',
      confidence: 'high',
      message: 'Not in the dictionary',
      messageLocal: 'Staat niet in het woordenboek',
    })
  })

  it('restores the trema: ideeen -> ideeën', () => {
    const issues = check('Ik heb veel ideeen.', 'nl')
    expect(fixFor(issues, 'ideeen')).toBe('ideeën')
    expect(issues[0].explanation).toMatch(/trema/)
  })

  it('handles plural apostrophes', () => {
    expect(check("Twee auto's en drie foto's.", 'nl')).toEqual([])
    expect(check('Twee auto’s, typed with a curly apostrophe.', 'nl').map((i) => i.text)).not.toContain('auto’s')
    expect(fixFor(check('Twee autos staan buiten.', 'nl'), 'autos')).toBe("auto's")
    expect(fixFor(check("Twee computer's staan aan.", 'nl'), "computer's")).toBe('computers')
    const e = check("Twee garage's en drie café's.", 'nl')
    expect(e.map((i) => i.replacements[0])).toEqual(['garages', 'cafés'])
    expect(e[1].explanationLocal).toMatch(/Alleen woorden op a, i, o, u of y/)
  })

  it('generates Dutch candidates and validates them', () => {
    const cases: [string, string][] = [
      ['gefietsd', 'gefietst'],
      ['fietsde', 'fietste'],
      ['wachte', 'wachtte'],
      ['geleeft', 'geleefd'],
      ['werdt', 'werd'],
      ['pannekoek', 'pannenkoek'],
      ['zonnenbloem', 'zonnebloem'],
      ['tyd', 'tijd'],
      ['vriendelyk', 'vriendelijk'],
      ['oppasen', 'oppassen'],
      ['cafe', 'café'],
      ['financiëel', 'financieel'],
    ]
    for (const [wrong, right] of cases) {
      expect(fixFor(check(`Het woord ${wrong} hier.`, 'nl'), wrong), wrong).toBe(right)
    }
  })

  it('flags a capitalised misspelling at the start of a sentence and keeps the capital', () => {
    const issues = check('Eigelijk wel. Ideeen genoeg.', 'nl')
    expect(fixFor(issues, 'Eigelijk')).toBe('Eigenlijk')
    expect(fixFor(issues, 'Ideeen')).toBe('Ideeën')
  })

  it('still flags an obvious slip in a capitalised word mid-sentence', () => {
    expect(fixFor(check('Ik heb Ideeen genoeg.', 'nl'), 'Ideeen')).toBe('Ideeën')
  })

  it('reports a missing capital as a capitalisation issue', () => {
    const issues = check('Ik woon in utrecht.', 'nl')
    expect(issues[0]).toMatchObject({ text: 'utrecht', category: 'capitalization', replacements: ['Utrecht'] })
    expect(issues[0].message).toBe('Needs a capital letter')
    const ij = check('Ijsland is koud.', 'nl')
    expect(ij[0]).toMatchObject({ text: 'Ijsland', category: 'capitalization', message: 'IJ takes two capitals' })
    expect(ij[0].replacements[0]).toBe('IJsland')
    // a capital-only fix is not mistaken for a name in mid-sentence
    expect(check('We gaan naar Ijsland.', 'nl')[0]).toMatchObject({ text: 'Ijsland', replacements: ['IJsland'] })
    const brands = check('Ik stuur het via youtube.', 'nl')
    expect(brands[0]).toMatchObject({ replacements: ['YouTube'], message: 'Check the capitals', messageLocal: 'Let op de hoofdletters' })
  })

  it('checks hyphenated words part by part', () => {
    expect(check('Ik woon in Noord-Holland en stuur een e-mail naar Jan-Willem.', 'nl')).toEqual([])
    const glued = check('De koffie-automaat is stuk.', 'nl')
    expect(glued[0]).toMatchObject({ text: 'koffie-automaat', replacements: ['koffieautomaat'] })
    const part = check('Een huiswerk-opdrahct.', 'nl')
    expect(flagged(part)).toEqual(['opdrahct'])
  })

  it('skips numbers, links, e-mail, abbreviations and codes', () => {
    const text = 'Zie https://example.com/pagina of mail jan@voorbeeld.nl. Het kost 3,50 euro, 12e plaats, NAVO, KLM, iPhone, o.a. en bijv. A4.'
    expect(check(text, 'nl')).toEqual([])
  })

  it('leaves English sentences in a Dutch text alone', () => {
    expect(check('Ik zei: I would rather have the definately wrong one. Daarna ging ik naar huis.', 'nl')).toEqual([])
  })

  it('respects the personal dictionary', () => {
    expect(flagged(check('Ik gebruik parrotype elke dag.', 'nl'))).toEqual(['parrotype'])
    expect(check('Ik gebruik parrotype elke dag.', 'nl', 'nl', ['parrotype'])).toEqual([])
    // a lowercase entry also covers the capitalised form
    expect(check('Parrotype is leuk.', 'nl', 'nl', ['parrotype'])).toEqual([])
  })
})

describe('English', () => {
  it('suggests definitely for definately', () => {
    const issues = check('I will definately come.', 'en')
    expect(fixFor(issues, 'definately')).toBe('definitely')
  })

  it('ranks the likely word first', () => {
    const cases: [string, string][] = [
      ['recieve', 'receive'],
      ['teh', 'the'],
      ['becuase', 'because'],
      ['alot', 'a lot'],
      ['untill', 'until'],
      ['hapy', 'happy'],
      ['wich', 'which'],
      ['dont', "don't"],
      ['eachother', 'each other'],
      ['intresting', 'interesting'],
      ['beleive', 'believe'],
    ]
    for (const [wrong, right] of cases) expect(fixFor(check(`So ${wrong} here.`, 'en'), wrong), wrong).toBe(right)
  })

  it('accepts names, possessives and contractions', () => {
    expect(check("Fatima's bike is at Yusra's place, isn't it? I don't know.", 'en')).toEqual([])
  })

  it('follows the chosen variant', () => {
    expect(flagged(check('The colour is nice.', 'en', 'en-US'))).toEqual(['colour'])
    expect(check('The colour is nice.', 'en', 'en-GB')).toEqual([])
    expect(fixFor(check('We need an organisaton.', 'en', 'en-GB'), 'organisaton')).toBe('organisation')
    expect(fixFor(check('We need an organisaton.', 'en', 'en-US'), 'organisaton')).toBe('organization')
  })
})

describe('Arabic', () => {
  it('flags missing hamza and suggests the right form', () => {
    const issues = check('انا ذاهب الى المدرسة.', 'ar')
    expect(fixFor(issues, 'انا')).toBe('أنا')
    expect(fixFor(issues, 'الى')).toBe('إلى')
    expect(issues[0].messageLocal).toBe('غير موجودة في القاموس')
  })

  it('ignores tashkeel and tatweel, and Latin words', () => {
    expect(check('ذَهَبْتُ إلى المدرسةِ وقرأتُ كتـــابًا عن Python.', 'ar')).toEqual([])
  })

  it('fixes hamza and the last letter together, and never suggests a misspelling', () => {
    // the frequency list holds الى (a misspelling) as a common word; the dictionary must veto it
    const issues = check('ذهبت الي البيت.', 'ar')
    expect(issues[0].replacements[0]).toBe('إلى')
    expect(issues[0].replacements).not.toContain('الى')
  })

  it('explains hamzat al-wasl as a hamza that should go', () => {
    const issues = check('إستخدام الإنترنت مفيد.', 'ar')
    expect(issues[0]).toMatchObject({ text: 'إستخدام' })
    expect(issues[0].replacements[0]).toBe('استخدام')
    expect(issues[0].explanation).toMatch(/hamzat al-wasl/)
    expect(issues[0].explanationLocal).toMatch(/همزة وصل/)
  })

  it('prefers the frequent word over a rare hamza form', () => {
    expect(fixFor(check('هاذا جميل لاكن صعب.', 'ar'), 'لاكن')).toBe('لكن')
    expect(fixFor(check('هاذا جميل.', 'ar'), 'هاذا')).toBe('هذا')
  })
})
