import { useEffect, useState } from 'react'
import { useSettings } from '@/state/settings'
import { LANGS, LANG_TAGS, type Lang } from '@/types'
import { loadVoices, speak, speechSupported, stopSpeaking, voicesFor } from '@/lib/speech'
import { Button, Icon, Select, Slider } from '@/components/ui'
import { Row, Section } from '../Row'

const SAMPLES: Record<Lang, string> = {
  nl: 'Hij wordt morgen dertig, maar hij gedraagt zich als twaalf.',
  en: 'Their parrot is quieter than they expected.',
  ar: 'صباح الخير، هل تحب القهوة؟',
}

const NAME: Record<Lang, string> = { nl: 'Dutch', en: 'English', ar: 'Arabic' }

const INSTALL_HINT =
  'To add a voice on Windows: Settings, Time & language, Speech, Add voices. On macOS: System Settings, Accessibility, Spoken content, System voice, Manage voices. Then reload this page.'

export function DictationSection() {
  const s = useSettings()
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [loaded, setLoaded] = useState(false)
  const [playing, setPlaying] = useState<Lang | null>(null)
  const supported = speechSupported()

  useEffect(() => {
    let alive = true
    loadVoices().then((v) => {
      if (!alive) return
      setVoices(v)
      setLoaded(true)
    })
    return () => {
      alive = false
      stopSpeaking()
    }
  }, [])

  const hear = (lang: Lang) => {
    if (playing === lang) {
      stopSpeaking()
      setPlaying(null)
      return
    }
    setPlaying(lang)
    speak(SAMPLES[lang], lang, {
      rate: s.speechRate,
      voiceName: s.voices[lang] || undefined,
      onEnd: () => setPlaying((p) => (p === lang ? null : p)),
    })
  }

  const missing = LANGS.filter((l) => voicesFor(l, voices).length === 0)

  if (!supported) {
    return (
      <Section id="dictation" title="Dictation">
        <p className="set-note">This browser cannot speak, so dictation (parrot says) is off. Chrome, Edge and Safari can.</p>
      </Section>
    )
  }

  return (
    <Section
      id="dictation"
      title="Dictation"
      intro={
        <>
          Voices come from your device, so they differ between computers. The best one is picked unless you choose.
          {loaded && missing.length > 0 && <span className="set-intro-extra">{INSTALL_HINT}</span>}
        </>
      }
    >
      {LANGS.map((lang) => {
        const list = voicesFor(lang, voices)
        const options = [{ value: '', label: list.length ? `Automatic (${list[0].name})` : 'Automatic' }, ...list.map((v) => ({ value: v.name, label: `${v.name}${v.localService ? '' : ' (online)'}` }))]
        const chosen = s.voices[lang] ?? ''
        const value = options.some((o) => o.value === chosen) ? chosen : ''
        return (
          <Row key={lang} label={`${NAME[lang]} voice`} hint={loaded && !list.length ? `No ${NAME[lang]} voice on this device.` : undefined} labelFor>
            {({ controlId, hintId }) => (
              <div className="voice-control">
                <Select
                  id={controlId}
                  aria-describedby={hintId}
                  options={options}
                  value={value}
                  onChange={(v) => s.set('voices', { ...s.voices, [lang]: v })}
                  disabled={!list.length}
                />
                <Button size="sm" onClick={() => hear(lang)} disabled={!list.length} aria-pressed={playing === lang}>
                  <Icon name={playing === lang ? 'sound-off' : 'sound'} size={16} />
                  {playing === lang ? 'Stop' : 'Hear a sample'}
                </Button>
                <span className="visually-hidden" lang={LANG_TAGS[lang]}>
                  {SAMPLES[lang]}
                </span>
              </div>
            )}
          </Row>
        )
      })}
      <Row label="Speaking speed" hint={`${Number(s.speechRate.toFixed(2))}× normal speed. Slower helps you hear where the d and the t go.`} labelFor stacked>
        {({ controlId, hintId }) => (
          <div className="rate-control">
            <span aria-hidden="true">slow</span>
            <Slider
              id={controlId}
              min={0.5}
              max={1.5}
              step={0.05}
              value={s.speechRate}
              onChange={(v) => s.set('speechRate', Math.round(v * 100) / 100)}
              ariaDescribedBy={hintId}
              valueText={`${s.speechRate} times normal speed`}
            />
            <span aria-hidden="true">fast</span>
          </div>
        )}
      </Row>
    </Section>
  )
}
