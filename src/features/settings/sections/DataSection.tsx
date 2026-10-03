import { useRef, useState } from 'react'
import { useSettings } from '@/state/settings'
import { useStats } from '@/state/stats'
import { useNest } from '@/state/nest'
import { useTypingFont, useUiPrefs } from '@/styles/fontStore'
import { Button, Icon, Modal, toast } from '@/components/ui'
import { exportAll, importAndReload, ownKeys, parseBackup, resetAndReload, type Backup } from '../data'
import { Section } from '../Row'

const plural = (n: number, one: string, many: string) => `${n.toLocaleString('en')} ${n === 1 ? one : many}`

function storedBytes(): number {
  try {
    return ownKeys(localStorage).reduce((sum, k) => sum + k.length + (localStorage.getItem(k)?.length ?? 0), 0) * 2
  } catch {
    return 0
  }
}

const kb = (bytes: number) => (bytes < 1024 ? `${bytes} bytes` : `${Math.max(1, Math.round(bytes / 1024))} KB`)

const when = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? 'an unknown date' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function DataSection() {
  const sessions = useStats((s) => s.sessions.length)
  const nest = useNest((n) => n.items.length)
  const resetSettings = useSettings((s) => s.reset)
  const setFont = useTypingFont((f) => f.setFont)
  const setKees = useUiPrefs((u) => u.setKees)
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<Backup | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const bytes = storedBytes()

  const what = `${plural(sessions, 'run', 'runs')} and ${plural(nest, 'word', 'words')} in the mistake nest`

  const onFile = async (file: File | undefined) => {
    if (!file) return
    const result = parseBackup(await file.text())
    if (fileRef.current) fileRef.current.value = ''
    if (!result.ok) {
      toast(result.error, 'bad')
      return
    }
    setPending(result.backup)
  }

  return (
    <Section
      id="data"
      title="Data"
      intro={
        sessions + nest === 0
          ? 'Everything lives in this browser. So far that is just your settings.'
          : `Everything lives in this browser: ${what}, about ${kb(bytes)}.`
      }
    >
      <div className="set-row">
        <div className="set-text">
          <span className="set-label">Export everything</span>
          <p className="set-hint">One JSON file with your settings, stats and mistake nest. Keep it as a backup or move it to another browser.</p>
        </div>
        <div className="set-control">
          <Button onClick={() => (exportAll() ? toast('Backup downloaded.') : toast('This browser blocks storage, so there is nothing to export.', 'bad'))}>
            <Icon name="download" size={16} />
            Export
          </Button>
        </div>
      </div>
      <div className="set-row">
        <div className="set-text">
          <span className="set-label">Import a backup</span>
          <p className="set-hint">Replaces what is here with the file&rsquo;s contents. You will be asked first.</p>
        </div>
        <div className="set-control">
          <input ref={fileRef} type="file" accept="application/json,.json" className="visually-hidden" tabIndex={-1} aria-hidden="true" onChange={(e) => onFile(e.target.files?.[0])} />
          <Button onClick={() => fileRef.current?.click()}>
            <Icon name="upload" size={16} />
            Import
          </Button>
        </div>
      </div>
      <div className="set-row">
        <div className="set-text">
          <span className="set-label">Reset settings</span>
          <p className="set-hint">Theme, font, caret, voices and the rest go back to how they started. Stats and the nest stay.</p>
        </div>
        <div className="set-control">
          <Button
            variant="ghost"
            onClick={() => {
              // keep 'onboarded': resetting the look should not replay the first-visit intro
              const { onboarded } = useSettings.getState()
              resetSettings()
              useSettings.getState().set('onboarded', onboarded)
              setFont('recursive')
              setKees('lively')
              toast('Settings are back to the defaults.')
            }}
          >
            Reset settings
          </Button>
        </div>
      </div>
      <div className="set-row">
        <div className="set-text">
          <span className="set-label">Delete everything</span>
          <p className="set-hint">Removes all Parrotype data from this browser. Export first if you might want it back.</p>
        </div>
        <div className="set-control">
          <Button variant="danger" onClick={() => setConfirmReset(true)}>
            Delete everything
          </Button>
        </div>
      </div>

      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title="Delete everything?">
        <p>{sessions + nest === 0 ? 'This removes your settings from this browser. It cannot be undone.' : `This removes your settings, ${what} from this browser. It cannot be undone.`}</p>
        <div className="modal-actions">
          <Button onClick={() => setConfirmReset(false)} autoFocus>
            Keep it
          </Button>
          <Button variant="danger" onClick={() => resetAndReload()}>
            Delete everything
          </Button>
        </div>
      </Modal>

      <Modal open={pending !== null} onClose={() => setPending(null)} title="Replace with this backup?">
        {pending && (
          <p>
            The backup is from {when(pending.exportedAt)}. What is in this browser now ({what}) will be replaced. The page reloads afterwards.
          </p>
        )}
        <div className="modal-actions">
          <Button onClick={() => setPending(null)} autoFocus>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => pending && importAndReload(pending)}>
            Replace
          </Button>
        </div>
      </Modal>
    </Section>
  )
}
