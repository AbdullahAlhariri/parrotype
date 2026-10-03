import { useState } from 'react'
import { DEFAULT_SETTINGS, useSettings } from '@/state/settings'
import { Button, Toggle } from '@/components/ui'
import { Row, Section } from '../Row'

/** https anywhere, or plain http on this machine (a self-hosted server). */
export function isValidServerUrl(url: string): boolean {
  try {
    const u = new URL(url)
    if (u.protocol === 'https:') return true
    return u.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname)
  } catch {
    return false
  }
}

export function CheckerSection() {
  const enabled = useSettings((s) => s.languageTool)
  const url = useSettings((s) => s.languageToolUrl)
  const set = useSettings((s) => s.set)
  const [draft, setDraft] = useState(url)
  const valid = isValidServerUrl(draft.trim())
  const isDefault = url === DEFAULT_SETTINGS.languageToolUrl

  const commit = () => {
    const next = draft.trim()
    if (isValidServerUrl(next) && next !== url) set('languageToolUrl', next)
  }

  return (
    <Section
      id="checker"
      title="Grammar checker"
      intro="Parrotype checks spelling and the common Dutch and English grammar traps on this device. LanguageTool is an optional second opinion for free writing."
    >
      <div className="set-row">
        <Toggle
          checked={enabled}
          onChange={(v) => set('languageTool', v)}
          label="Ask LanguageTool too"
          hint="Text you write in free-writing mode is sent to this server. Typing tests never leave your browser."
        />
      </div>
      <Row
        label="Server"
        hint={
          valid ? (
            <>
              The public server is free with limits. You can run your own with <code>docker run -p 8010:8010 erikvl87/languagetool</code> and use{' '}
              <code>http://localhost:8010/v2/check</code>.
            </>
          ) : (
            'That is not a usable address. Use https, or http on localhost.'
          )
        }
        labelFor
        stacked
      >
        {({ controlId, hintId }) => (
          <div className="url-control">
            <input
              id={controlId}
              className="input"
              type="url"
              inputMode="url"
              spellCheck={false}
              autoComplete="off"
              value={draft}
              aria-describedby={hintId}
              aria-invalid={!valid}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => e.key === 'Enter' && commit()}
            />
            <Button
              variant="ghost"
              size="sm"
              disabled={isDefault && draft === url}
              onClick={() => {
                setDraft(DEFAULT_SETTINGS.languageToolUrl)
                set('languageToolUrl', DEFAULT_SETTINGS.languageToolUrl)
              }}
            >
              Reset
            </Button>
          </div>
        )}
      </Row>
    </Section>
  )
}
