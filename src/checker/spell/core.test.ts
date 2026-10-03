import { describe, expect, it } from 'vitest'
import type { Issue } from '@/types'
import { CheckerCore } from './core'
import { nodeCore, nodeLoaders } from './testing'

const noOverlap = (issues: Issue[]) => {
  for (let i = 1; i < issues.length; i++) {
    expect(issues[i].offset).toBeGreaterThanOrEqual(issues[i - 1].offset + issues[i - 1].length)
  }
}

describe('CheckerCore', () => {
  const core = nodeCore()

  it('runs the rules and the spell checker together', async () => {
    const text = 'Hij word morgen opgehaald. Mijn wachtwoord is eigelijk geheim, net als mijn ideeen over Utrecht.'
    const { issues, spell } = await core.check({ text, lang: 'nl' })
    expect(spell).toBe(true)
    noOverlap(issues)
    const byText = Object.fromEntries(issues.map((i) => [i.text, i]))
    expect(byText.word.replacements[0]).toBe('wordt')
    expect(byText.word.source).toBe('rules')
    expect(byText.eigelijk.replacements[0]).toBe('eigenlijk')
    expect(byText.ideeen.replacements[0]).toBe('ideeën')
    expect(byText.wachtwoord).toBeUndefined()
    expect(byText.Utrecht).toBeUndefined()
    for (const i of issues) expect(text.slice(i.offset, i.offset + i.length)).toBe(i.text)
  }, 20_000)

  it('gives ids that survive edits earlier in the text', async () => {
    const a = await core.check({ text: 'Dat is eigelijk zo.', lang: 'nl' })
    const b = await core.check({ text: 'Ja, dat is eigelijk zo.', lang: 'nl' })
    expect(a.issues.map((i) => i.id)).toEqual(b.issues.map((i) => i.id))
  })

  it('checks English with the chosen variant', async () => {
    const us = await core.check({ text: 'The colour is definately nice.', lang: 'en', variant: 'en-US' })
    const gb = await core.check({ text: 'The colour is definately nice.', lang: 'en', variant: 'en-GB' })
    expect(us.issues.some((i) => i.text === 'colour')).toBe(true)
    expect(gb.issues.some((i) => i.text === 'colour')).toBe(false)
    expect(gb.issues.find((i) => i.text === 'definately')?.replacements[0]).toBe('definitely')
  }, 20_000)

  it('keeps suggestions apart per English variant (one shared cache would leak them)', async () => {
    const text = 'We need an organisaton.'
    const fix = async (variant: 'en-US' | 'en-GB') =>
      (await core.check({ text, lang: 'en', variant })).issues.find((i) => i.text === 'organisaton')?.replacements[0]
    expect(await fix('en-US')).toBe('organization')
    expect(await fix('en-GB')).toBe('organisation')
  }, 20_000)

  it('checks Arabic', async () => {
    const { issues } = await core.check({ text: 'انا ذاهب الى المدرسة.', lang: 'ar' })
    expect(issues.map((i) => i.replacements[0])).toEqual(['أنا', 'إلى'])
  }, 20_000)

  it('keeps Hunspell in sync with the personal dictionary', async () => {
    const text = 'Ik oefen met parrotype.'
    const flagged = async (personalWords: string[]) =>
      (await core.check({ text, lang: 'nl', personalWords })).issues.map((i) => i.text)
    expect(await flagged([])).toEqual(['parrotype'])
    expect(await flagged(['parrotype'])).toEqual([])
    expect(await core.isWord('parrotype', 'nl', undefined, ['parrotype'])).toBe(true)
    expect(await flagged([])).toEqual(['parrotype'])
    expect(await core.isWord('parrotype', 'nl', undefined, [])).toBe(false)
  })

  it('never forbids a real word that was in the personal dictionary', async () => {
    await core.check({ text: 'Een huis.', lang: 'nl', personalWords: ['huis'] })
    await core.check({ text: 'Een huis.', lang: 'nl', personalWords: [] })
    expect(await core.isWord('huis', 'nl')).toBe(true)
  })

  it('answers isWord and suggest', async () => {
    expect(await core.isWord('huiswerkopdracht', 'nl')).toBe(true)
    expect(await core.isWord('eigelijk', 'nl')).toBe(false)
    expect(await core.isWord('“wachtwoord,”', 'nl')).toBe(true)
    expect((await core.suggest('eigelijk', 'nl'))[0]).toBe('eigenlijk')
    expect((await core.suggest('Definately', 'en'))[0]).toBe('Definitely')
  })

  it('falls back to rules only when the dictionary cannot load', async () => {
    const broken = new CheckerCore({
      fetchText: async () => {
        throw new Error('offline')
      },
      createHunspell: async () => {
        throw new Error('unreachable')
      },
    })
    const r = await broken.check({ text: 'Hij word morgen opgehaald door Kees en zijn vriendd.', lang: 'nl' })
    expect(r.spell).toBe(false)
    expect(r.issues.map((i) => i.text)).toContain('word')
    expect(r.issues.every((i) => i.source === 'rules')).toBe(true)
    expect(await broken.isWord('eigelijk', 'nl')).toBe(true)
    expect(await broken.suggest('eigelijk', 'nl')).toContain('eigenlijk') // the misspelling map still helps
  })

  it('answers with the rules alone while the dictionary is still loading, when asked to', async () => {
    const disk = nodeLoaders()
    let release!: () => void
    const gate = new Promise<void>((r) => (release = r))
    const slow = new CheckerCore({
      ...disk,
      fetchText: async (path) => {
        if (path.startsWith('dicts/')) await gate
        return disk.fetchText(path)
      },
    })
    const text = 'Hij word morgen eigelijk opgehaald.'
    const quick = await slow.check({ text, lang: 'nl', dictWaitMs: 10 })
    expect(quick.spell).toBe(false)
    expect(quick.issues.map((i) => i.text)).toContain('word')
    release()
    const full = await slow.check({ text, lang: 'nl', dictWaitMs: 10_000 })
    expect(full.spell).toBe(true)
  }, 20_000)

  it('does not download a failed dictionary again on every check', async () => {
    let fetches = 0
    const offline = new CheckerCore({
      fetchText: async () => {
        fetches++
        throw new Error('offline')
      },
      createHunspell: async () => {
        throw new Error('unreachable')
      },
    })
    await offline.check({ text: 'Een zin.', lang: 'nl' })
    const after = fetches
    await offline.check({ text: 'Nog een zin.', lang: 'nl' })
    await offline.isWord('zin', 'nl')
    expect(fetches).toBe(after)
  })

  it('stops early when the caller lost interest', async () => {
    const r = await core.check({ text: 'Dat is eigelijk zo.', lang: 'nl', shouldStop: () => true })
    expect(r.issues).toEqual([])
  })
})
