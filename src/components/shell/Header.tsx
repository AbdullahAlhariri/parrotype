import { Link, usePath } from '@/lib/router'
import { ROUTES } from '@/routes'
import { useSettings } from '@/state/settings'
import { LANG_NAMES, type Lang } from '@/types'
import { Segmented, type SegmentedOption } from '@/components/ui/Segmented'
import { Icon } from '@/components/ui/Icon'
import { Logo } from '@/components/ui/Logo'

const LANG_OPTIONS: SegmentedOption<Lang>[] = [
  { value: 'nl', label: 'nl', title: `Practise in ${LANG_NAMES.nl}` },
  { value: 'en', label: 'en', title: `Practise in ${LANG_NAMES.en}` },
  { value: 'ar', label: 'ar', title: 'Practise in Arabic (العربية)' },
]

export function Header() {
  const path = usePath()
  const lang = useSettings((s) => s.lang)
  const set = useSettings((s) => s.set)
  const here = (p: string) => (path === p ? 'page' : undefined)

  return (
    <header className="app-header">
      <Link to="/" className="brand" aria-label="parrotype, back to the typing test">
        <Logo size={30} />
      </Link>
      <nav className="main-nav" aria-label="Practice modes">
        <ul>
          {ROUTES.filter((r) => r.nav).map((r) => (
            <li key={r.path}>
              <Link to={r.path} aria-current={here(r.path)} title={r.blurb}>
                {r.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="header-tools">
        <Segmented<Lang> className="lang-switch" ariaLabel="Practice language" options={LANG_OPTIONS} value={lang} onChange={(l) => set('lang', l)} />
        <Link to="/stats" className="icon-btn" aria-label="Stats" title="Stats" aria-current={here('/stats')}>
          <Icon name="stats" />
        </Link>
        <Link to="/settings" className="icon-btn" aria-label="Settings" title="Settings" aria-current={here('/settings')}>
          <Icon name="settings" />
        </Link>
      </div>
    </header>
  )
}
