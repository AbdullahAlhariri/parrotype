import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// settings are a plain object here; audio.ts only reads them through getSettings()
const settings: { voices: Record<string, string | undefined>; mascotVoice: boolean } = { voices: {}, mascotVoice: true }
vi.mock('@/state/settings', () => ({
  getSettings: () => settings,
  useSettings: (pick: (s: typeof settings) => unknown) => pick(settings),
}))

type AudioModule = typeof import('./audio')

const MANIFEST = {
  version: 1,
  mascot: { nl: 'Kees', en: 'Monty', ar: 'فستق' },
  voices: {
    nl: [
      { id: 'kees', name: 'Kees', blurb: 'De kea zelf', mascot: true },
      { id: 'lies', name: 'Lies', blurb: 'Licht en luchtig' },
      { id: 'juf', name: 'Juf Ans', blurb: 'De juf' },
    ],
    en: [{ id: 'monty', name: 'Monty', blurb: 'The kea himself', mascot: true }],
    ar: [
      { id: 'fustuq', name: 'فستق', blurb: 'The kea himself', mascot: true },
      { id: 'huda', name: 'هدى', blurb: 'Resonant and witty' },
    ],
  },
  reactions: { nl: ['hello', 'done', 'perfect'], en: ['hello'], ar: [] },
  clips: {
    nl: {
      'nl-k01': ['kees', 'lies', 'juf'],
      'nl-k02': ['lies'],
      'word-wordt-1': ['kees', 'juf'],
    },
    en: { 'en-k01': ['monty'] },
    ar: { 'ar-d01': ['fustuq', 'huda'] },
  },
}

let audio: AudioModule

async function fresh(manifest: unknown = MANIFEST, ok = true): Promise<AudioModule> {
  vi.resetModules()
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok, json: async () => manifest })),
  )
  const m = await import('./audio')
  await m.loadManifest()
  return m
}

beforeEach(async () => {
  settings.voices = {}
  settings.mascotVoice = true
  audio = await fresh()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('parseManifest', () => {
  it('rejects things that are not a manifest', () => {
    expect(audio.parseManifest(null)).toBeNull()
    expect(audio.parseManifest('nope')).toBeNull()
    expect(audio.parseManifest([1, 2])).toBeNull()
  })

  it('keeps voices with an id and a name, once each', () => {
    const m = audio.parseManifest({
      voices: {
        nl: [{ id: 'lies', name: 'Lies' }, { id: 'lies', name: 'Lies again' }, { id: 'x' }, { name: 'no id' }, { id: '../etc', name: 'Sneaky' }],
      },
    })!
    expect(m.voices.nl.map((v) => v.id)).toEqual(['lies'])
    expect(m.voices.nl[0].blurb).toBe('')
    expect(m.voices.en).toEqual([])
  })

  it('drops clips of unknown voices, unsafe sentence ids and unknown reactions', () => {
    const m = audio.parseManifest({
      voices: { nl: [{ id: 'lies', name: 'Lies' }] },
      clips: { nl: { 'nl-k01': ['lies', 'ghost', 'lies'], 'nl-k02': ['ghost'], '../../x': ['lies'] } },
      reactions: { nl: ['hello', 'shout', 'done'] },
    })!
    expect(m.clips.nl).toEqual({ 'nl-k01': ['lies'] })
    expect(m.reactions.nl).toEqual(['hello', 'done'])
  })

  it('takes the mascot name from the mascot voice when the manifest does not name him', () => {
    const m = audio.parseManifest({ voices: { en: [{ id: 'monty', name: 'Monty', mascot: true }] } })!
    expect(m.mascot.en).toBe('Monty')
    expect(m.voices.en[0].mascot).toBe(true)
  })
})

describe('loadManifest', () => {
  it('fetches once and exposes the voices and clips', async () => {
    expect(audio.recordedVoices('nl').map((v) => v.id)).toEqual(['kees', 'lies', 'juf'])
    expect(audio.hasClip('nl', 'nl-k01')).toBe(true)
    expect(audio.hasClip('nl', 'nl-k99')).toBe(false)
    expect(audio.hasRecordings('ar')).toBe(true)
    await audio.loadManifest()
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith(audio.MANIFEST_URL, expect.anything())
  })

  it('resolves to null on a missing file or a network error', async () => {
    let m = await fresh(MANIFEST, false)
    expect(m.getManifest()).toBeNull()
    expect(m.hasRecordings('nl')).toBe(false)

    vi.resetModules()
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('offline'))))
    m = await import('./audio')
    expect(await m.loadManifest()).toBeNull()
    expect(m.recordedVoices('nl')).toEqual([])
  })
})

describe('voice preference', () => {
  it('reads settings.voices[lang]', () => {
    expect(audio.voicePreference('nl')).toEqual({ kind: 'mix' })
    settings.voices = { nl: 'gemini:lies', en: 'browser:Samantha', ar: 'mix' }
    expect(audio.voicePreference('nl')).toEqual({ kind: 'gemini', id: 'lies' })
    expect(audio.voicePreference('en')).toEqual({ kind: 'browser', name: 'Samantha' })
    expect(audio.voicePreference('ar')).toEqual({ kind: 'mix' })
  })

  it('treats a plain voice name from before the recordings as the mix, with that voice as the stand-in', () => {
    const p = audio.parseVoiceSetting('Microsoft Fenna Online (Natural) - Dutch (Netherlands)')
    expect(p).toEqual({ kind: 'mix', browser: 'Microsoft Fenna Online (Natural) - Dutch (Netherlands)' })
    expect(audio.browserVoiceName('Microsoft Fenna Online (Natural) - Dutch (Netherlands)')).toBe('Microsoft Fenna Online (Natural) - Dutch (Netherlands)')
  })

  it('round-trips through voiceSetting', () => {
    for (const v of ['mix', 'gemini:lies', 'browser:Samantha', 'browser:', 'Legacy Voice']) {
      expect(audio.voiceSetting(audio.parseVoiceSetting(v))).toBe(v)
    }
    expect(audio.voiceSetting(audio.parseVoiceSetting(undefined))).toBe('mix')
  })

  it('names a browser voice only when one was chosen', () => {
    expect(audio.browserVoiceName('browser:Samantha')).toBe('Samantha')
    expect(audio.browserVoiceName('browser:')).toBeUndefined()
    expect(audio.browserVoiceName('gemini:lies')).toBeUndefined()
    expect(audio.browserVoiceName(undefined)).toBeUndefined()
  })
})

describe('pickPersona', () => {
  it('is null for browser speech and for sentences without a clip', () => {
    expect(audio.pickPersona('nl', 'nl-k01', { kind: 'browser', name: '' })).toBeNull()
    expect(audio.pickPersona('nl', 'nl-k99', { kind: 'mix' })).toBeNull()
    expect(audio.pickPersona('en', 'nl-k01', { kind: 'mix' })).toBeNull()
  })

  it('uses the chosen voice when it has the clip, and the mix when it does not', () => {
    expect(audio.pickPersona('nl', 'nl-k01', { kind: 'gemini', id: 'juf' })).toBe('juf')
    // juf has no recording of nl-k02: lies (the only one) reads it
    expect(audio.pickPersona('nl', 'nl-k02', { kind: 'gemini', id: 'juf' })).toBe('lies')
  })

  it('picks the same voice for the same sentence every time (replays keep their voice)', () => {
    const first = audio.pickPersona('nl', 'nl-k01', { kind: 'mix' })
    expect(MANIFEST.clips.nl['nl-k01']).toContain(first)
    for (let i = 0; i < 5; i++) expect(audio.pickPersona('nl', 'nl-k01', { kind: 'mix' })).toBe(first)
  })

  it('spreads the mix over the voices', async () => {
    const many: Record<string, string[]> = {}
    for (let i = 0; i < 60; i++) many[`nl-x${i}`] = ['kees', 'lies', 'juf']
    const a = await fresh({ ...MANIFEST, clips: { nl: many } })
    const seen = new Set(Object.keys(many).map((id) => a.pickPersona('nl', id, { kind: 'mix' })))
    expect(seen).toEqual(new Set(['kees', 'lies', 'juf']))
  })

  it('reads the preference from settings by default', () => {
    settings.voices = { nl: 'gemini:juf' }
    expect(audio.pickPersona('nl', 'word-wordt-1')).toBe('juf')
    settings.voices = { nl: 'browser:' }
    expect(audio.pickPersona('nl', 'word-wordt-1')).toBeNull()
  })

  it('is null before the manifest has loaded', async () => {
    vi.resetModules()
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    const m = await import('./audio')
    void m.loadManifest()
    expect(m.pickPersona('nl', 'nl-k01', { kind: 'mix' })).toBeNull()
  })
})

describe('helpers', () => {
  it('finds a sample clip per voice', () => {
    expect(audio.sampleClip('nl', 'lies')).toBe('nl-k01')
    expect(audio.sampleClip('nl', 'nobody')).toBeNull()
  })

  it('gives the mascot his Latin-script name in English copy', () => {
    const [fustuq, huda] = audio.recordedVoices('ar')
    expect(audio.personaName('ar', fustuq)).toBe('Fustuq')
    expect(audio.personaName('ar', huda)).toBe('هدى')
  })

  it('builds clip and reaction urls', () => {
    expect(audio.clipUrl('nl', 'lies', 'word-wordt-1')).toBe('/audio/nl/lies/word-wordt-1.mp3')
    expect(audio.reactionUrl('ar', 'hello')).toBe('/audio/ar/reactions/hello.mp3')
  })

  it('offers a reaction only when the mascot may talk and the line exists', () => {
    expect(audio.reactionAvailable('nl', 'hello')).toBe(true)
    expect(audio.reactionAvailable('nl', 'streak')).toBe(false)
    expect(audio.reactionAvailable('ar', 'hello')).toBe(false)
    settings.mascotVoice = false
    expect(audio.reactionAvailable('nl', 'hello')).toBe(false)
  })
})

/* ------------------------------------------------------------------ */
/* playback with a stand-in for HTMLAudioElement                       */
/* ------------------------------------------------------------------ */

class FakeAudio {
  static last: FakeAudio | null = null
  src = ''
  playbackRate = 1
  defaultPlaybackRate = 1
  preservesPitch = false
  ended = false
  paused = true
  private handlers = new Map<string, Set<() => void>>()
  constructor() {
    FakeAudio.last = this
  }
  addEventListener(type: string, fn: () => void) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set())
    this.handlers.get(type)!.add(fn)
  }
  removeEventListener(type: string, fn: () => void) {
    this.handlers.get(type)?.delete(fn)
  }
  emit(type: string) {
    if (type === 'ended') this.ended = true
    this.handlers.get(type)?.forEach((f) => f())
  }
  play() {
    this.paused = false
    this.ended = false
    queueMicrotask(() => this.emit('playing'))
    return Promise.resolve()
  }
  pause() {
    const was = !this.paused
    this.paused = true
    if (was) this.emit('pause')
  }
}

describe('playClip', () => {
  it('fails softly where there is no audio element (tests, old browsers)', async () => {
    const pb = audio.playClip({ lang: 'nl', sentenceId: 'nl-k01', persona: 'lies' })
    expect(await pb.outcome).toBe('error')
  })

  it('plays the clip url at the asked rate and reports how it ended', async () => {
    vi.stubGlobal('Audio', FakeAudio)
    const a = await fresh()
    const pb = a.playClip({ lang: 'nl', sentenceId: 'nl-k01', persona: 'lies', rate: 0.7 })
    const el = FakeAudio.last!
    expect(el.src).toBe('/audio/nl/lies/nl-k01.mp3')
    expect(el.playbackRate).toBe(0.7)
    expect(el.preservesPitch).toBe(true)
    expect(a.audioBusy()).toBe(true)
    await Promise.resolve()
    el.emit('ended')
    expect(await pb.outcome).toBe('ended')
    expect(a.audioBusy()).toBe(false)
  })

  it('a new clip stops the one before', async () => {
    vi.stubGlobal('Audio', FakeAudio)
    const a = await fresh()
    const one = a.playClip({ lang: 'nl', sentenceId: 'nl-k01', persona: 'lies' })
    const two = a.playClip({ lang: 'nl', sentenceId: 'nl-k02', persona: 'lies' })
    expect(await one.outcome).toBe('stopped')
    two.stop()
    expect(await two.outcome).toBe('stopped')
  })

  it('reports a missing file as an error, so callers can fall back to browser speech', async () => {
    vi.stubGlobal('Audio', FakeAudio)
    const a = await fresh()
    const pb = a.playClip({ lang: 'nl', sentenceId: 'nl-k01', persona: 'lies' })
    FakeAudio.last!.emit('error')
    expect(await pb.outcome).toBe('error')
  })

  it('skips a voice whose file failed to load, so the next pick is another voice', async () => {
    vi.stubGlobal('Audio', FakeAudio)
    const a = await fresh()
    const chosen = { kind: 'gemini', id: 'juf' } as const
    expect(a.pickPersona('nl', 'nl-k01', chosen)).toBe('juf')
    const pb = a.playClip({ lang: 'nl', sentenceId: 'nl-k01', persona: 'juf' })
    FakeAudio.last!.emit('error')
    await pb.outcome
    const next = a.pickPersona('nl', 'nl-k01', chosen)
    expect(next).not.toBe('juf')
    expect(['kees', 'lies']).toContain(next)
    // a sentence whose only clip is broken has no recorded voice left
    const only = a.playClip({ lang: 'nl', sentenceId: 'nl-k02', persona: 'lies' })
    FakeAudio.last!.emit('error')
    await only.outcome
    expect(a.pickPersona('nl', 'nl-k02', { kind: 'mix' })).toBeNull()
  })

  it('a blocked play() (autoplay) is an error but does not mark the file as broken', async () => {
    class Blocked extends FakeAudio {
      play() {
        return Promise.reject(new Error('NotAllowedError'))
      }
    }
    vi.stubGlobal('Audio', Blocked)
    const a = await fresh()
    const pb = a.playClip({ lang: 'nl', sentenceId: 'nl-k02', persona: 'lies' })
    expect(await pb.outcome).toBe('error')
    expect(a.pickPersona('nl', 'nl-k02', { kind: 'mix' })).toBe('lies')
  })

  it('a reaction stays quiet while a clip plays', async () => {
    vi.stubGlobal('Audio', FakeAudio)
    const a = await fresh()
    a.playClip({ lang: 'nl', sentenceId: 'nl-k01', persona: 'lies' })
    expect(await a.sayReaction('nl', 'hello')).toBe(false)
    a.stopAudio()
    const said = a.sayReaction('nl', 'done')
    await Promise.resolve()
    await Promise.resolve()
    expect(FakeAudio.last!.src).toBe('/audio/nl/reactions/done.mp3')
    FakeAudio.last!.emit('ended')
    expect(await said).toBe(true)
  })
})
