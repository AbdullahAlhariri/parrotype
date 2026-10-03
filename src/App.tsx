import { Suspense, useEffect } from 'react'
import { usePath } from '@/lib/router'
import { findRoute } from '@/routes'
import { useSettings } from '@/state/settings'
import { applyTheme } from '@/styles/themes'
import { Header } from '@/components/shell/Header'
import { Footer } from '@/components/shell/Footer'
import { CommandPalette } from '@/components/shell/CommandPalette'
import { NotFound } from '@/components/shell/NotFound'
import { isRtl } from '@/types'

export default function App() {
  const path = usePath()
  const route = findRoute(path)
  const theme = useSettings((s) => s.theme)
  const lang = useSettings((s) => s.lang)

  useEffect(() => applyTheme(theme), [theme])
  useEffect(() => {
    document.documentElement.dataset.practiceLang = lang
    document.documentElement.dataset.practiceDir = isRtl(lang) ? 'rtl' : 'ltr'
  }, [lang])
  useEffect(() => {
    document.title = route && route.path !== '/' ? `${route.label} · parrotype` : 'parrotype'
  }, [route])

  const Page = route?.component
  return (
    <div className="app">
      <Header />
      <main className="app-main" key={path}>
        <Suspense fallback={<div className="page-loading" aria-busy="true" />}>{Page ? <Page /> : <NotFound />}</Suspense>
      </main>
      <Footer />
      <CommandPalette />
    </div>
  )
}
