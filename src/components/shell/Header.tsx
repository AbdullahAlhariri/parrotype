import { Link, usePath } from '@/lib/router'
import { ROUTES } from '@/routes'

export function Header() {
  const path = usePath()
  return (
    <header className="app-header">
      <Link to="/" className="brand">parrotype</Link>
      <nav>
        {ROUTES.filter((r) => r.nav).map((r) => (
          <Link key={r.path} to={r.path} aria-current={path === r.path ? 'page' : undefined}>{r.label}</Link>
        ))}
      </nav>
    </header>
  )
}
