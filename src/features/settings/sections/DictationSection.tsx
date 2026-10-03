import { useEffect, useRef, useState } from 'react'
import { useSettings } from '@/state/settings'
import { LANGS, LANG_TAGS, type Lang } from '@/types'
import {
  parseVoiceSetting,
  personaName,
  playClip,
  preferredBrowserVoice,
  sampleClip,
  stopAudio,
  useAudioManifest,
  voiceSetting,
  type Playback,
  type VoiceInfo,
  type VoicePreference,
} from '@/lib/audio'
import { mascotName } from '@/lib/mascot'
import { loadVoices, speak, speechSupported, stopSpeaking, voicesFor } from '@/lib/speech'
import { Slider, Toggle } from '@/components/ui'
import { Row, Section } from '../Row'
import '@/features/dictation/voice-settings.css'

const SAMPLES: Record<Lang, string> = {
  nl: 'Hij wordt morgen dertig, maar hij gedraagt zich als een kind van twaalf.',
  en: 'Their parrot is quieter than they expected.',
  ar: 'صباح الخير، هل تحب القهوة؟',
}

const NAME: Record<Lang, string> = { nl: 'Dutch', en: 'English', ar: 'Arabic' }

/** "Microsoft Fenna Online (Natural) - Dutch (Netherlands)" reads as "Fenna, online". */
export function voiceLabel(v: Pick<SpeechSynthesisVoice, 'name' | 'localService'>): string {
  const short =
    v.name
      .replace(/^Microsoft\s+/, '')
      .replace(/\s+-\s+.*$/, '')
      .replace(/\s*Online\s*(\(Natural\))?/i, '')
      .trim() || v.name
  return v.localService ? short : `${short}, online`
}

const INSTALL_HINT =
  'To add one on Windows: Settings, Time & language, Speech, Add voices. On macOS: System Settings, Accessibility, Spoken content, System voice, Manage voices. Then reload this page.'

/** The blurbs come from the voice list: Dutch voices are described in Dutch, the rest in English. */
const blurbLang = (lang: Lang, text: string) => (/[؀-ۿ]/.test(text) ? 'ar' : lang === 'nl' ? 'nl' : 'en')

type Choice = 'mix' | 'browser' | `gemini:${string}`

function choiceOf(p: VoicePreference, personas: VoiceInfo[]): Choice {
  if (p.kind === 'browser') return 'browser'
  if (p.kind === 'gemini' && personas.some((v) => v.id === p.id)) return `gemini:${p.id}`
  return 'mix'
}

interface Player {
  /** what is playing: `${lang}:${persona id}` or `${lang}:browser` */
  playing: string | null
  hearClip: (key: string, lang: Lang, persona: string) => void
  hearBrowser: (key: string, lang: Lang, voiceName?: string) => void
}

/** One sample at a time; pressing the playing one again stops it. */
function usePlayer(rate: number): Player {
  const [playing, setPlaying] = useState<string | null>(null)
  const stopRef = useRef<() => void>(() => {})

  useEffect(
    () => () => {
      stopRef.current()
      stopAudio()
      stopSpeaking()
    },
    [],
  )

  const begin = (key: string) => {
    stopRef.current()
    stopRef.current = () => {}
    if (playing === key) {
      setPlaying(null)
      return false
    }
    setPlaying(key)
    return true
  }
  const end = (key: string) => setPlaying((p) => (p === key ? null : p))

  return {
    playing,
    hearClip(key, lang, persona) {
      if (!begin(key)) return
      const id = sampleClip(lang, persona)
      if (!id) return end(key)
      const pb: Playback = playClip({ lang, sentenceId: id, persona })
      stopRef.current = pb.stop
      pb.ended.then(() => end(key))
    },
    hearBrowser(key, lang, voiceName) {
      if (!begin(key)) return
      const cancel = speak(SAMPLES[lang], lang, { rate, voiceName, onEnd: () => end(key) })
      stopRef.current = () => {
        cancel()
        end(key)
      }
    },
  }
}

interface LangProps {
  lang: Lang
  personas: VoiceInfo[]
  loaded: boolean
  browserVoices: SpeechSynthesisVoice[]
  browserLoaded: boolean
  supported: boolean
  player: Player
  open: boolean
}

function LanguageVoices({ lang, personas, loaded, browserVoices, browserLoaded, supported, player, open }: LangProps) {
  const setting = useSettings((s) => s.voices[lang])
  const pref = parseVoiceSetting(setting)
  const choice = choiceOf(pref, personas)
  const browserName = preferredBrowserVoice(pref) ?? ''
  const browserValue = browserVoices.some((v) => v.name === browserName) ? browserName : ''
  const noBrowser = !supported || (browserLoaded && browserVoices.length === 0)
  const group = `voice-${lang}`

  const set = (p: VoicePreference) => {
    const s = useSettings.getState()
    s.set('voices', { ...s.voices, [lang]: voiceSetting(p) })
  }
  const choose = (c: Choice) => {
    if (c === 'mix') set({ kind: 'mix' })
    else if (c === 'browser') set({ kind: 'browser', name: browserValue })
    else set({ kind: 'gemini', id: c.slice('gemini:'.length) })
  }

  const chosen = personas.find((v) => `gemini:${v.id}` === choice)
  const summary =
    choice === 'browser'
      ? `Browser voice${browserValue ? `: ${voiceLabel(browserVoices.find((v) => v.name === browserValue)!)}` : ''}`
      : chosen
        ? personaName(lang, chosen)
        : personas.length
          ? `Mix of ${personas.length} voices`
          : 'Browser voice'

  const browserHint = !supported
    ? 'This browser cannot speak, so only the recordings read.'
    : browserLoaded && !browserVoices.length
      ? `No ${NAME[lang]} voice on this device, so only the recordings read. ${INSTALL_HINT}`
      : personas.length
        ? 'From this device. It also reads sentences without a recording, and word by word.'
        : 'From this device, so it differs between computers.'

  return (
    <details className="voice-lang" open={open}>
      <summary>
        <span className="voice-lang-name">{NAME[lang]} voice</span>
        <span className="voice-lang-choice" lang={blurbLang(lang, summary) === 'ar' ? LANG_TAGS.ar : undefined}>
          {summary}
        </span>
        <svg className="voice-lang-chevron" width="12" height="8" viewBox="0 0 12 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M1.5 1.5 6 6l4.5-4.5" />
        </svg>
      </summary>
      <fieldset className="voice-opts">
        <legend className="sr-only">{NAME[lang]} dictation voice</legend>
        {personas.length > 0 && (
          <>
            <div className="voice-opt">
              <label className="voice-opt-main">
                <input type="radio" name={group} checked={choice === 'mix'} onChange={() => choose('mix')} />
                <span className="voice-opt-text">
                  <span className="voice-opt-name">Mix all voices</span>
                  <span className="voice-opt-blurb">Each sentence gets one of the {personas.length}, and keeps it when you replay.</span>
                </span>
              </label>
            </div>
            {personas.map((v) => {
              const key = `${lang}:${v.id}`
              const sample = sampleClip(lang, v.id)
              // the mascot shows his Latin-script name; the other Arabic voices keep theirs
              const native = blurbLang(lang, personaName(lang, v)) === 'ar'
              return (
                <div className="voice-opt" key={v.id}>
                  <label className="voice-opt-main">
                    <input type="radio" name={group} checked={choice === `gemini:${v.id}`} onChange={() => choose(`gemini:${v.id}`)} />
                    <span className="voice-opt-text">
                      <span className="voice-opt-name" lang={native ? LANG_TAGS.ar : undefined}>
                        {personaName(lang, v)}
                        {v.mascot && <span className="voice-opt-tag"> the mascot</span>}
                      </span>
                      {v.blurb && (
                        <span className="voice-opt-blurb" lang={blurbLang(lang, v.blurb)}>
                          {v.blurb}
                        </span>
                      )}
                    </span>
                  </label>
                  {sample && (
                    <button
                      type="button"
                      className="voice-hear link-btn"
                      aria-label={player.playing === key ? 'Stop the sample' : `Hear a sample of ${personaName(lang, v)}`}
                      onClick={() => player.hearClip(key, lang, v.id)}
                    >
                      {player.playing === key ? 'Stop' : 'Hear a sample'}
                    </button>
                  )}
                </div>
              )
            })}
          </>
        )}
        {loaded && personas.length === 0 && <p className="voice-none">No recorded {NAME[lang]} voices found, so the browser voice reads.</p>}
        <div className={`voice-opt is-browser ${noBrowser ? 'is-disabled' : ''}`}>
          <label className="voice-opt-main">
            <input type="radio" name={group} checked={choice === 'browser'} disabled={noBrowser} onChange={() => choose('browser')} />
            <span className="voice-opt-text">
              <span className="voice-opt-name">Browser voice</span>
              <span className="voice-opt-blurb">{browserHint}</span>
            </span>
          </label>
          {!noBrowser && (
            <button
              type="button"
              className="voice-hear link-btn"
              aria-label={player.playing === `${lang}:browser` ? 'Stop the sample' : `Hear a sample of the ${NAME[lang]} browser voice`}
              onClick={() => player.hearBrowser(`${lang}:browser`, lang, browserValue || undefined)}
            >
              {player.playing === `${lang}:browser` ? 'Stop' : 'Hear a sample'}
            </button>
          )}
          {!noBrowser && browserVoices.length > 0 && (
            <select
              className="select voice-browser-select"
              aria-label={`${NAME[lang]} browser voice`}
              value={browserValue}
              onChange={(e) => set({ kind: 'browser', name: e.target.value })}
            >
              <optgroup label="Browser voices">
                <option value="">Automatic: {voiceLabel(browserVoices[0])}</option>
                {browserVoices.map((v) => (
                  <option key={v.name} value={v.name}>
                    {voiceLabel(v)}
                  </option>
                ))}
              </optgroup>
            </select>
          )}
        </div>
      </fieldset>
    </details>
  )
}

export function DictationSection() {
  const practiceLang = useSettings((s) => s.lang)
  const rate = useSettings((s) => s.speechRate)
  const mascotVoice = useSettings((s) => s.mascotVoice)
  const set = useSettings((s) => s.set)
  const { manifest, loaded } = useAudioManifest()
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [browserLoaded, setBrowserLoaded] = useState(false)
  const supported = speechSupported()
  const player = usePlayer(rate)

  useEffect(() => {
    let alive = true
    loadVoices().then((v) => {
      if (!alive) return
      setVoices(v)
      setBrowserLoaded(true)
    })
    return () => {
      alive = false
    }
  }, [])

  // the practice language first: that is the one being set up most of the time
  const order = [practiceLang, ...LANGS.filter((l) => l !== practiceLang)]

  return (
    <Section
      id="dictation"
      title="Dictation"
      intro="Recorded voices read the sentences in parrot says. Pick one per language, or let them take turns. Your browser's own voice fills in where there is no recording."
    >
      <div className="voice-langs">
        {order.map((lang) => (
          <LanguageVoices
            key={lang}
            lang={lang}
            personas={manifest?.voices[lang] ?? []}
            loaded={loaded}
            browserVoices={voicesFor(lang, voices)}
            browserLoaded={browserLoaded}
            supported={supported}
            player={player}
            open={lang === practiceLang}
          />
        ))}
      </div>
      <div className="set-row">
        <Toggle
          checked={mascotVoice}
          onChange={(v) => set('mascotVoice', v)}
          label="Mascot voice"
          hint={`${mascotName('nl')}, ${mascotName('en')} and ${mascotName('ar')} say a short recorded line now and then: hello before the first sentence, a word at the end of a set, a personal best. Never while you type.`}
        />
      </div>
      <Row
        label="Browser voice speed"
        hint={`${Number(rate.toFixed(2))}× normal speed. Only for the browser voice: recordings play at their own pace, and Slowly plays them at 0.7×.`}
        labelFor
        stacked
      >
        {({ controlId, hintId }) => (
          <div className="rate-control">
            <span aria-hidden="true">slow</span>
            <Slider
              id={controlId}
              min={0.5}
              max={1.5}
              step={0.05}
              value={rate}
              onChange={(v) => set('speechRate', Math.round(v * 100) / 100)}
              ariaDescribedBy={hintId}
              valueText={`${rate} times normal speed`}
            />
            <span aria-hidden="true">fast</span>
          </div>
        )}
      </Row>
    </Section>
  )
}
