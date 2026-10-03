import { afterEach, describe, expect, it, vi } from 'vitest'
import { useSettings } from '@/state/settings'
import {
  LanguageToolClient,
  SlidingWindow,
  checkWithLanguageTool,
  endpointUrl,
  isPublicEndpoint,
  languageTool,
  ltCategory,
  matchToIssue,
  splitParagraphs,
  testLanguageTool,
  useLanguageToolStatus,
  type LTMatch,
} from './languagetool'

function match(p: Partial<LTMatch> & { offset: number; length: number }, ruleId = 'HUN_HEBBEN', cat = 'GRAMMAR'): LTMatch {
  return {
    message: 'Gebruik <suggestion>zij</suggestion> als onderwerp.',
    replacements: [{ value: 'Zij' }, { value: 'Ze' }],
    rule: { id: ruleId, description: 'hun als onderwerp', issueType: 'grammar', category: { id: cat, name: cat } },
    ...p,
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

/** a fake LanguageTool: finds "hun hebben" in each paragraph it is sent */
function fakeServer() {
  const calls: URLSearchParams[] = []
  const fetchFn = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
    const body = init!.body as URLSearchParams
    calls.push(body)
    const text = body.get('text')!
    const at = text.indexOf('Hun hebben')
    return json({ matches: at >= 0 ? [match({ offset: at, length: 10 })] : [] })
  })
  return { calls, fetchFn }
}

describe('helpers', () => {
  it('normalises the endpoint', () => {
    expect(endpointUrl('https://api.languagetool.org/v2/check')).toBe('https://api.languagetool.org/v2/check')
    expect(endpointUrl('https://api.languagetool.org')).toBe('https://api.languagetool.org/v2/check')
    expect(endpointUrl('http://localhost:8010/v2/')).toBe('http://localhost:8010/v2/check')
    // the Vercel proxy has its own path: used as is, relative or absolute
    expect(endpointUrl('/api/languagetool')).toBe('/api/languagetool')
    expect(endpointUrl('https://parrotype.vercel.app/api/languagetool/')).toBe('https://parrotype.vercel.app/api/languagetool')
    expect(isPublicEndpoint('/api/languagetool')).toBe(true)
    expect(isPublicEndpoint('https://api.languagetool.org')).toBe(true)
    expect(isPublicEndpoint('http://localhost:8010')).toBe(false)
  })

  it('maps categories', () => {
    expect(ltCategory(match({ offset: 0, length: 1 }))).toBe('grammar')
    expect(ltCategory(match({ offset: 0, length: 1 }, 'MORFOLOGIK_RULE_EN_US', 'TYPOS'))).toBe('spelling')
    expect(ltCategory(match({ offset: 0, length: 1 }, 'UPPERCASE_SENTENCE_START', 'CASING'))).toBe('capitalization')
    expect(ltCategory(match({ offset: 0, length: 1 }, 'COMMA_PARENTHESIS_WHITESPACE', 'PUNCTUATION'))).toBe('punctuation')
    expect(ltCategory(match({ offset: 0, length: 1 }, 'TOO_LONG_SENTENCE', 'STYLE'))).toBe('style')
  })

  it('turns a match into an Issue', () => {
    const text = 'Hun hebben gelijk.'
    const is = matchToIssue(match({ offset: 0, length: 10 }), text, 'nl')!
    expect(is).toMatchObject({
      ruleId: 'lt:HUN_HEBBEN',
      source: 'languagetool',
      category: 'grammar',
      text: 'Hun hebben',
      message: 'Gebruik “zij” als onderwerp.',
      messageLocal: 'Gebruik “zij” als onderwerp.',
      explanation: 'hun als onderwerp',
      replacements: ['Zij', 'Ze'],
      confidence: 'medium',
    })
    expect(matchToIssue(match({ offset: 15, length: 10 }), text, 'nl')).toBeNull()
  })

  it('keeps at most five replacements', () => {
    const m = match({ offset: 0, length: 3, replacements: 'a b c d e f g'.split(' ').map((value) => ({ value })) })
    expect(matchToIssue(m, 'Hun', 'en')!.replacements).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  it('splits into paragraphs with offsets, and cuts long ones', () => {
    const text = 'Eerste regel.\n\nTweede regel.'
    expect(splitParagraphs(text)).toEqual([
      { start: 0, text: 'Eerste regel.' },
      { start: 15, text: 'Tweede regel.' },
    ])
    const long = 'Dit is een zin. '.repeat(100)
    const parts = splitParagraphs(long, 200)
    expect(parts.length).toBeGreaterThan(5)
    for (const p of parts) {
      expect(new TextEncoder().encode(p.text).length).toBeLessThanOrEqual(200)
      expect(long.slice(p.start, p.start + p.text.length)).toBe(p.text)
    }
  })

  it('limits requests per minute', () => {
    const w = new SlidingWindow(2, 1000)
    w.record(10, 0)
    w.record(10, 1000)
    expect(w.waitMs(10, 2000)).toBe(58_000)
    expect(w.waitMs(10, 61_000)).toBe(0)
    expect(new SlidingWindow(10, 100).waitMs(50, 0)).toBe(0)
  })
})

describe('LanguageToolClient', () => {
  it('checks per paragraph and maps offsets back onto the whole text', async () => {
    const { calls, fetchFn } = fakeServer()
    const lt = new LanguageToolClient({ fetch: fetchFn as typeof fetch })
    const text = 'Dit is goed.\nHun hebben gelijk.\n\nEn hier nog een keer: Hun hebben het.'
    const r = await lt.check(text, { url: 'https://api.languagetool.org/v2/check', lang: 'nl' })
    expect(calls.map((c) => c.get('text'))).toEqual(['Dit is goed.', 'Hun hebben gelijk.', 'En hier nog een keer: Hun hebben het.'])
    expect(calls[0].get('language')).toBe('nl')
    expect(calls[0].get('level')).toBe('default')
    expect(calls[0].has('motherTongue')).toBe(false)
    expect(r.issues.map((i) => [i.offset, text.slice(i.offset, i.offset + i.length)])).toEqual([
      [13, 'Hun hebben'],
      [55, 'Hun hebben'],
    ])
  })

  it('caches paragraphs, so unchanged ones are not sent again', async () => {
    const { calls, fetchFn } = fakeServer()
    const lt = new LanguageToolClient({ fetch: fetchFn as typeof fetch })
    const opts = { url: 'https://api.languagetool.org', lang: 'nl' as const }
    await lt.check('Hun hebben gelijk.\nTweede alinea.', opts)
    const r = await lt.check('Eerst iets nieuws.\nHun hebben gelijk.\nTweede alinea.', opts)
    expect(calls.map((c) => c.get('text'))).toEqual(['Hun hebben gelijk.', 'Tweede alinea.', 'Eerst iets nieuws.'])
    expect(r.issues[0].offset).toBe(19)
  })

  it('sends the English variant and Dutch as mother tongue', async () => {
    const { calls, fetchFn } = fakeServer()
    const lt = new LanguageToolClient({ fetch: fetchFn as typeof fetch })
    await lt.check('Hello there.', { url: 'https://api.languagetool.org', lang: 'en', variant: 'en-GB' })
    expect(calls[0].get('language')).toBe('en-GB')
    expect(calls[0].get('motherTongue')).toBe('nl')
  })

  it('stays under 18 requests a minute on the public server', async () => {
    let now = 0
    const { calls, fetchFn } = fakeServer()
    const lt = new LanguageToolClient({ fetch: fetchFn as typeof fetch, now: () => now, maxWaitMs: 0 })
    const text = Array.from({ length: 25 }, (_, i) => `Zin nummer ${i}.`).join('\n')
    const r = await lt.check(text, { url: 'https://api.languagetool.org', lang: 'nl' })
    expect(calls).toHaveLength(18)
    expect(r.limited).toBe(true)
    expect(r.retryIn).toBeGreaterThan(0)
    now = 61_000
    await lt.check(text, { url: 'https://api.languagetool.org', lang: 'nl' })
    expect(calls).toHaveLength(25) // the rest, the first 18 come from the cache
  })

  it('backs off after a 429', async () => {
    let now = 0
    const fetchFn = vi.fn(async () => json({ message: 'slow down' }, 429))
    const lt = new LanguageToolClient({ fetch: fetchFn as unknown as typeof fetch, now: () => now, maxWaitMs: 0 })
    await expect(lt.check('Een zin.', { url: 'https://api.languagetool.org', lang: 'nl' })).rejects.toMatchObject({ kind: 'rate-limit' })
    const r = await lt.check('Een andere zin.', { url: 'https://api.languagetool.org', lang: 'nl' })
    expect(fetchFn).toHaveBeenCalledTimes(1)
    expect(r.limited).toBe(true)
  })
})

describe('checkWithLanguageTool', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    useSettings.getState().patch({ languageTool: false })
  })

  it('does nothing unless the user opted in', async () => {
    const spy = vi.spyOn(languageTool, 'check')
    useSettings.getState().patch({ languageTool: false })
    expect(await checkWithLanguageTool('Hun hebben gelijk.', 'nl')).toBeNull()
    expect(spy).not.toHaveBeenCalled()
    expect(useLanguageToolStatus.getState().state).toBe('off')
  })

  it('reports CORS / network failures as blocked, without throwing', async () => {
    useSettings.getState().patch({ languageTool: true, languageToolUrl: 'https://lt.example.org' })
    expect(useLanguageToolStatus.getState().state).toBe('idle')
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))
    expect(await checkWithLanguageTool('Hun hebben gelijk.', 'nl')).toBeNull()
    expect(useLanguageToolStatus.getState().state).toBe('blocked')
  })

  it('reports a 429 as rate-limited', async () => {
    useSettings.getState().patch({ languageTool: true, languageToolUrl: 'https://lt429.example.org' })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({}, 429))
    expect(await checkWithLanguageTool('Hun hebben gelijk.', 'nl')).toBeNull()
    expect(useLanguageToolStatus.getState().state).toBe('rate-limited')
  })

  it('tells a malformed address apart from an unreachable one', async () => {
    const spy = vi.spyOn(globalThis, 'fetch')
    expect(await testLanguageTool('not a url')).toMatchObject({ ok: false, message: expect.stringMatching(/does not look right/) })
    expect(await testLanguageTool('ftp://lt.example.org')).toMatchObject({ ok: false })
    expect(spy).not.toHaveBeenCalled()
    spy.mockRejectedValue(new TypeError('Failed to fetch'))
    expect(await testLanguageTool('https://down.example.org')).toMatchObject({ ok: false, message: expect.stringMatching(/CORS/) })
    spy.mockResolvedValue(json({ matches: [] }))
    expect(await testLanguageTool('https://up.example.org/v2')).toEqual({ ok: true, message: 'LanguageTool answered at up.example.org.' })
    expect(spy).toHaveBeenLastCalledWith('https://up.example.org/v2/check', expect.anything())
  })

  it('sends checks through the proxy path unchanged, with the public limits', async () => {
    const { calls, fetchFn } = fakeServer()
    const urls: string[] = []
    let now = 0
    const lt = new LanguageToolClient({
      fetch: ((u: string, init?: RequestInit) => (urls.push(u), fetchFn(u, init))) as typeof fetch,
      now: () => now,
      maxWaitMs: 0,
    })
    const text = Array.from({ length: 20 }, (_, i) => `Zin ${i}.`).join('\n')
    await lt.check(text, { url: '/api/languagetool', lang: 'nl' })
    expect(urls[0]).toBe('/api/languagetool')
    expect(calls).toHaveLength(18)
  })

  it('returns issues and reports ok', async () => {
    useSettings.getState().patch({ languageTool: true, languageToolUrl: 'https://ok.example.org' })
    const { fetchFn } = fakeServer()
    vi.spyOn(globalThis, 'fetch').mockImplementation(fetchFn as typeof fetch)
    const issues = await checkWithLanguageTool('Ja. Hun hebben gelijk.', 'nl')
    expect(issues?.map((i) => i.offset)).toEqual([4])
    expect(useLanguageToolStatus.getState().state).toBe('ok')
  })
})
