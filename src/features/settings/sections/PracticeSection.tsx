import { useSettings } from '@/state/settings'
import { Segmented, Toggle } from '@/components/ui'
import { Row, Section } from '../Row'

export function PracticeSection() {
  const s = useSettings()
  return (
    <Section id="practice" title="Practice">
      <Row label="English spelling" hint="Which dictionary says you are right: color or colour, organize or organise.">
        {() => (
          <Segmented
            variant="boxed"
            ariaLabel="English spelling"
            value={s.englishVariant}
            onChange={(v) => s.set('englishVariant', v)}
            options={[
              { value: 'en-US', label: 'American' },
              { value: 'en-GB', label: 'British' },
            ]}
          />
        )}
      </Row>
      <Row label="Explain rules in" hint="Grammar explanations in English, or in the language you are practising (Dutch tips in Dutch, Arabic tips in Arabic). Switch the practice language with nl, en and ar at the top right.">
        {() => (
          <Segmented
            variant="boxed"
            ariaLabel="Explain rules in"
            value={s.explainIn}
            onChange={(v) => s.set('explainIn', v)}
            options={[
              { value: 'en', label: 'English' },
              { value: 'local', label: 'Practice language' },
            ]}
          />
        )}
      </Row>
      <div className="set-row">
        <Toggle
          checked={s.stopOnError}
          onChange={(v) => s.set('stopOnError', v)}
          label="Stop on error"
          hint="The caret waits until the letter is right. Slower, stricter, good for d/t."
        />
      </div>
      <div className="set-row">
        <Toggle
          checked={s.showKeyboard}
          onChange={(v) => s.set('showKeyboard', v)}
          label="On-screen keyboard"
          hint="Shows the layout under the text. Handy for Arabic; for Dutch and English, keep your eyes on the words."
        />
      </div>
    </Section>
  )
}
