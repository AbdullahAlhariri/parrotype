import { Suspense, useEffect } from 'react'
import { usePath } from '@/lib/router'
import { setTyping } from '@/lib/focus'
import { findRoute } from '@/routes'
import { useSettings } from '@/state/settings'
import { applyTheme } from '@/styles/themes'
import { applyTypingFont } from '@/styles/fonts'
import { useTypingFont, useUiPrefs } from '@/styles/fontStore'
import { Header } from '@/components/shell/Header'
import { Footer } from '@/components/shell/Footer'
import { CommandPalette } from '@/components/shell/CommandPalette'
import { Toaster } from '@/components/shell/Toaster'
import { NotFound } from '@/components/shell/NotFound'
import { toast } from '@/components/ui/toast'
import { takeFlash } from '@/features/settings/data'
import { isRtl } from '@/types'

export default function App() {
  const path = usePath()
  const route = findRoute(path)
  const theme = useSettings((s) => s.theme)
  const lang = useSettings((s) => s.lang)
  const focusMode = useSettings((s) => s.focusMode)
  const fontSize = useSettings((s) => s.fontSize)
  const font = useTypingFont((f) => f.font)
  const kees = useUiPrefs((u) => u.kees)

  useEffect(() => applyTheme(theme), [theme])
  useEffect(() => applyTypingFont(font), [font])
  useEffect(() => {
    const root = document.documentElement
    root.dataset.practiceLang = lang
    root.dataset.practiceDir = isRtl(lang) ? 'rtl' : 'ltr'
    root.dataset.kees = kees
    root.style.setProperty('--typing-font-size', `${fontSize}rem`)
  }, [lang, kees, fontSize])
  useEffect(() => {
    if (focusMode) delete document.body.dataset.focusMode
    else document.body.dataset.focusMode = 'off'
  }, [focusMode])
  useEffect(() => {
    document.title = route && route.path !== '/' ? `${route.label} – parrotype` : 'parrotype'
    setTyping(false)
  }, [route])
  useEffect(() => {
    const flash = takeFlash()
    if (flash) toast(flash, 'good')
  }, [])

  const Page = route?.component
  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header />
      <main className="app-main" id="main" tabIndex={-1} key={path}>
        <Suspense fallback={<div className="page-loading" aria-busy="true" />}>{Page ? <Page /> : <NotFound />}</Suspense>
      </main>
      <Footer />
      <CommandPalette />
      <Toaster />
    </div>
  )
}
