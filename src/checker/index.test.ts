import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

// In node there is no Worker, so the public API runs its main-thread fallback (rules only).
// That is exactly the path a browser takes when the worker or WASM fails.

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
})

type Api = typeof import('./index')
type Settings = typeof import('@/state/settings')
let api: Api
let settings: Settings

beforeAll(async () => {
  store.set('parrotype.dict', JSON.stringify({ nl: ['Kees'], en: [], ar: 'broken' }))
  api = await import('./index')
  settings = await import('@/state/settings')
})

afterEach(() => {
  vi.restoreAllMocks()
  settings.useSettings.getState().patch({ languageTool: false })
})

describe('checkText', () => {
  it('returns nothing for empty text', async () => {
    expect(await api.checkText('   ', 'nl')).toEqual([])
  })

  it('rejects with an AbortError when aborted', async () => {
    const ac = new AbortController()
    ac.abort()
    await expect(api.checkText('Hij word boos.', 'nl', { signal: ac.signal })).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('still runs the rules without a worker', async () => {
    const issues = await api.checkText('Hij word morgen opgehaald.', 'nl')
    expect(issues.find((i) => i.text === 'word')?.replacements[0]).toBe('wordt')
  })

  it('adds LanguageTool issues when the user opted in, without doubling local ones', async () => {
    settings.useSettings.getState().patch({ languageTool: true, languageToolUrl: 'https://index-test.example.org' })
    const text = 'Hij word morgen opgehaald. We gaan fietsen.'
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          matches: [
            { offset: 4, length: 4, message: 'word/wordt', replacements: [{ value: 'wordt' }], rule: { id: 'WORDT', description: 'd/t', category: { id: 'GRAMMAR', name: 'Grammar' } } },
            { offset: 35, length: 7, message: 'Een test.', replacements: [{ value: 'wandelen' }], rule: { id: 'FAKE_STYLE', description: 'test', category: { id: 'STYLE', name: 'Style' } } },
          ],
        }),
        { status: 200 },
      ),
    )
    const issues = await api.checkText(text, 'nl')
    const word = issues.filter((i) => i.offset === 4)
    expect(word).toHaveLength(1)
    expect(word[0].source).toBe('rules')
    expect(issues.find((i) => i.ruleId === 'lt:FAKE_STYLE')).toMatchObject({ text: 'fietsen', category: 'style' })
    expect(api.useLanguageToolStatus.getState().state).toBe('ok')

    // languageTool: false skips it for one call
    const local = await api.checkText(text, 'nl', { languageTool: false })
    expect(local.some((i) => i.source === 'languagetool')).toBe(false)
  })

  it('suggest and isWord degrade gracefully without a dictionary', async () => {
    expect(await api.suggest('eigelijk', 'nl')).toEqual([])
    expect(await api.isWord('eigelijk', 'nl')).toBe(true)
  })
})

describe('personal dictionary', () => {
  it('reads what was stored, ignoring junk', () => {
    expect(api.getPersonalDictionary('nl')).toEqual(['Kees'])
    expect(api.getPersonalDictionary('ar')).toEqual([])
  })

  it('adds, dedupes, cleans and removes words, persisted as {nl, en, ar}', () => {
    api.addToPersonalDictionary('  parrotype, ', 'nl')
    api.addToPersonalDictionary('parrotype', 'nl')
    api.addToPersonalDictionary('Rotterdam’s', 'en')
    expect(api.getPersonalDictionary('nl')).toEqual(['Kees', 'parrotype'])
    expect(api.getPersonalDictionary('en')).toEqual(["Rotterdam's"])
    expect(JSON.parse(store.get('parrotype.dict')!)).toEqual({ nl: ['Kees', 'parrotype'], en: ["Rotterdam's"], ar: [] })
    api.removeFromPersonalDictionary('parrotype', 'nl')
    expect(api.getPersonalDictionary('nl')).toEqual(['Kees'])
  })
})
