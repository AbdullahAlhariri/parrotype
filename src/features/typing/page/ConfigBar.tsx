import type { ReactNode } from 'react'
import { Segmented } from '@/components/ui'
import {
  LIST_OPTIONS,
  MODES,
  QUOTE_OPTIONS,
  TIME_OPTIONS,
  WORDS_OPTIONS,
  listLabel,
  type TypingConfig,
} from './config'

interface Props {
  config: TypingConfig
  onChange: (c: TypingConfig) => void
}

function TextToggle({ on, disabled, onClick, children, title }: { on: boolean; disabled?: boolean; onClick: () => void; children: ReactNode; title?: string }) {
  return (
    <button
      type="button"
      className={`tp-toggle${on ? ' is-on' : ''}`}
      aria-pressed={on}
      aria-disabled={disabled || undefined}
      title={title}
      onClick={() => !disabled && onClick()}
    >
      {children}
    </button>
  )
}

/** Monkeytype-style config: plain text toggles, the active one in --main. Fades while typing. */
export function ConfigBar({ config, onChange }: Props) {
  const set = <K extends keyof TypingConfig>(key: K, value: TypingConfig[K]) => onChange({ ...config, [key]: value })
  const quote = config.mode === 'quote'
  const noExtras = quote ? 'Quotes come with their own punctuation' : undefined

  return (
    <div className="tp-config" role="group" aria-label="Test settings">
      <div className="tp-group" role="group" aria-label="Extras">
        <TextToggle on={config.punctuation && !quote} disabled={quote} title={noExtras} onClick={() => set('punctuation', !config.punctuation)}>
          punctuation
        </TextToggle>
        <TextToggle on={config.numbers && !quote} disabled={quote} title={noExtras} onClick={() => set('numbers', !config.numbers)}>
          numbers
        </TextToggle>
      </div>
      <span className="tp-sep" aria-hidden="true" />
      <Segmented ariaLabel="Mode" value={config.mode} onChange={(v) => set('mode', v)} options={MODES.map((m) => ({ value: m, label: m }))} />
      <span className="tp-sep" aria-hidden="true" />
      {config.mode === 'time' && (
        <Segmented
          ariaLabel="Seconds"
          value={config.time}
          onChange={(v) => set('time', v)}
          options={TIME_OPTIONS.map((t) => ({ value: t, label: t, title: `${t} seconds` }))}
        />
      )}
      {config.mode === 'words' && (
        <Segmented
          ariaLabel="Number of words"
          value={config.words}
          onChange={(v) => set('words', v)}
          options={WORDS_OPTIONS.map((n) => ({ value: n, label: n, title: `${n} words` }))}
        />
      )}
      {quote && (
        <Segmented ariaLabel="Quote length" value={config.quote} onChange={(v) => set('quote', v)} options={QUOTE_OPTIONS.map((l) => ({ value: l, label: l }))} />
      )}
      {!quote && (
        <>
          <span className="tp-sep" aria-hidden="true" />
          <div className="tp-group tp-list">
            <span className="tp-group-label" aria-hidden="true">
              top
            </span>
            <Segmented
              ariaLabel="Word list"
              value={config.list}
              onChange={(v) => set('list', v)}
              options={LIST_OPTIONS.map((n) => ({ value: n, label: listLabel(n), title: `the ${n} most common words` }))}
            />
          </div>
        </>
      )}
    </div>
  )
}
