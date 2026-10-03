import { useEffect, useState } from 'react'
import { useSettings, type Settings } from '@/state/settings'
import { useUiPrefs, type KeesLevel } from '@/styles/fontStore'
import { Kees, Segmented, Slider, Toggle } from '@/components/ui'
import type { KeesMood } from '@/components/kees'
import { Row, Section } from '../Row'
import { ThemePicker } from './ThemePicker'
import { FontPicker } from './FontPicker'

const CARETS: { value: Settings['caretStyle']; label: string }[] = [
  { value: 'line', label: 'line' },
  { value: 'block', label: 'block' },
  { value: 'underline', label: 'underline' },
]

const KEES_HINT: Record<KeesLevel, string> = {
  lively: 'Blinks, fidgets now and then, and reacts after a run. Never while you type.',
  quiet: 'Blinks. That is all.',
  hidden: 'Off his perch. Results and empty pages carry on without him.',
}

export function LookSection() {
  const s = useSettings()
  const kees = useUiPrefs((u) => u.kees)
  const setKees = useUiPrefs((u) => u.setKees)
  const [keesMood, setKeesMood] = useState<KeesMood>('idle')

  // a little hello when he is switched back to lively
  useEffect(() => {
    if (kees !== 'lively') return
    setKeesMood('curious')
    const t = window.setTimeout(() => setKeesMood('idle'), 1300)
    return () => window.clearTimeout(t)
  }, [kees])

  return (
    <Section id="look" title="Look">
      <Row label="Theme" hint="Colours taken from three real parrots. Every text colour passes WCAG AA on its background." stacked>
        {({ labelId }) => <ThemePicker labelledBy={labelId} />}
      </Row>
      <Row label="Typing font" hint="Only for the text you type. The rest of Parrotype stays in Recursive." stacked>
        {({ labelId }) => <FontPicker labelledBy={labelId} />}
      </Row>
      <Row label="Text size" hint={`${Number(s.fontSize.toFixed(3))} rem. Three lines of text stay visible at any size.`} stacked labelFor>
        {({ controlId, hintId }) => (
          <div className="size-control">
            <Slider
              id={controlId}
              min={1.25}
              max={3}
              step={0.125}
              value={s.fontSize}
              onChange={(v) => s.set('fontSize', v)}
              ariaDescribedBy={hintId}
              valueText={`${s.fontSize} rem`}
            />
            <p className="size-preview mono-text" style={{ fontSize: `${s.fontSize}rem` }} aria-hidden="true">
              <span className="sp-typed">Kees zegt</span>
              <span className={`sp-caret sp-caret-${s.caretStyle}`}>:</span>
              <span className="sp-sub"> wordt.</span>
            </p>
          </div>
        )}
      </Row>
      <Row label="Caret" hint="The real caret is a plain bar, block or underline. Precision beats cuteness here.">
        {() => <Segmented variant="boxed" ariaLabel="Caret style" value={s.caretStyle} onChange={(v) => s.set('caretStyle', v)} options={CARETS} />}
      </Row>
      <div className="set-row">
        <Toggle checked={s.smoothCaret} onChange={(v) => s.set('smoothCaret', v)} label="Smooth caret" hint="Glides between letters in about 90 ms instead of jumping." />
      </div>
      <div className="set-row">
        <Toggle
          checked={s.focusMode}
          onChange={(v) => s.set('focusMode', v)}
          label="Focus mode"
          hint="Header, footer and Kees fade out on your first keystroke. Move the mouse to bring them back."
        />
      </div>
      <Row label="Kees" hint={KEES_HINT[kees]}>
        {() => (
          <div className="kees-control">
            <span className="kees-preview">{kees === 'hidden' ? null : <Kees mood={keesMood} size={56} />}</span>
            <Segmented<KeesLevel>
              variant="boxed"
              ariaLabel="How lively Kees is"
              value={kees}
              onChange={setKees}
              options={[
                { value: 'lively', label: 'lively' },
                { value: 'quiet', label: 'quiet' },
                { value: 'hidden', label: 'hidden' },
              ]}
            />
          </div>
        )}
      </Row>
    </Section>
  )
}
