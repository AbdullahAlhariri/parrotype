import { useSettings } from '@/state/settings'
import { Toggle } from '@/components/ui'
import { Section } from '../Row'

export function SoundSection() {
  const sound = useSettings((s) => s.sound)
  const set = useSettings((s) => s.set)
  return (
    <Section id="sound" title="Sound">
      <div className="set-row">
        <Toggle checked={sound} onChange={(v) => set('sound', v)} label="Keystroke sounds" hint="A soft click per key, made in your browser. Off by default, because quiet is nice." />
      </div>
    </Section>
  )
}
