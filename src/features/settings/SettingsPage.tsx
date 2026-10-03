import { useEffect, useState } from 'react'
import { PracticeSection } from './sections/PracticeSection'
import { LookSection } from './sections/LookSection'
import { SoundSection } from './sections/SoundSection'
import { DictationSection } from './sections/DictationSection'
import { CheckerSection } from './sections/CheckerSection'
import { DataSection } from './sections/DataSection'
import './settings.css'

const SECTIONS = [
  { id: 'practice', label: 'practice' },
  { id: 'look', label: 'look' },
  { id: 'sound', label: 'sound' },
  { id: 'dictation', label: 'dictation' },
  { id: 'checker', label: 'grammar checker' },
  { id: 'data', label: 'data' },
]

/** Settings is a page, not a modal. Every change is saved the moment you make it. */
export default function SettingsPage() {
  const [current, setCurrent] = useState(SECTIONS[0].id)

  // honour /settings#data (the command palette links there)
  useEffect(() => {
    const id = location.hash.slice(1)
    if (id) document.getElementById(id)?.scrollIntoView({ block: 'start' })
  }, [])

  // highlight the section in view
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (top) setCurrent(top.target.id)
      },
      { rootMargin: '-15% 0px -70% 0px' },
    )
    for (const s of SECTIONS) {
      const el = document.getElementById(s.id)
      if (el) io.observe(el)
    }
    return () => io.disconnect()
  }, [])

  return (
    <div className="page settings-page">
      <header className="settings-head">
        <h1 className="page-title">Settings</h1>
        <p className="page-lede">Saved in this browser the moment you change something. There is no save button.</p>
      </header>
      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Settings sections">
          <ul>
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  aria-current={current === s.id ? 'true' : undefined}
                  onClick={(e) => {
                    e.preventDefault()
                    document.getElementById(s.id)?.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
                    history.replaceState(null, '', `#${s.id}`)
                    setCurrent(s.id)
                  }}
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="settings-body">
          <PracticeSection />
          <LookSection />
          <SoundSection />
          <DictationSection />
          <CheckerSection />
          <DataSection />
        </div>
      </div>
    </div>
  )
}
