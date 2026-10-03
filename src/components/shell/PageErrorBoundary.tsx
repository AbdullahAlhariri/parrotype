import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Link } from '@/lib/router'
import { Kees } from '@/components/kees/Kees'
import { Button } from '@/components/ui/Button'

const RELOAD_KEY = 'parrotype:reloaded'

/** A page chunk that failed to download: usually a new deploy (old files are gone) or no connection. */
export const isChunkError = (e: unknown) =>
  /dynamically imported module|Importing a module script failed|error loading dynamically|ChunkLoadError|Unable to preload CSS/i.test(String((e as Error)?.message ?? e))

/** Reload once per page for a missing chunk, never in a loop and never while offline. */
function reloadOnce(path: string): boolean {
  try {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return false
    const last = JSON.parse(sessionStorage.getItem(RELOAD_KEY) ?? 'null') as { path: string; at: number } | null
    if (last && last.path === path && Date.now() - last.at < 30_000) return false
    sessionStorage.setItem(RELOAD_KEY, JSON.stringify({ path, at: Date.now() }))
  } catch {
    return false
  }
  location.reload()
  return true
}

interface Props {
  children: ReactNode
}

interface State {
  error: unknown
}

/**
 * Keeps the header, footer and palette alive when one page fails, instead of a blank screen.
 * App.tsx remounts it per route (main has key={path}), so moving to another page clears it.
 */
export class PageErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: unknown): State {
    return { error }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    if (isChunkError(error) && reloadOnce(location.pathname)) return
    console.error(error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (error == null) return this.props.children
    const chunk = isChunkError(error)
    const offline = typeof navigator !== 'undefined' && !navigator.onLine
    return (
      <section className="page-error" aria-labelledby="page-error-title">
        <Kees mood="oops" size={96} />
        <div>
          <h1 id="page-error-title">This page did not load.</h1>
          <p>
            {offline
              ? 'You are offline and this page was not downloaded yet. Pages you already opened still work.'
              : chunk
                ? 'Parrotype was probably updated while this tab was open. Reloading fetches the new version.'
                : 'Something broke while drawing it. Your settings, stats and words are safe in this browser.'}
          </p>
          <div className="page-error-actions">
            <Button variant="primary" onClick={() => location.reload()}>
              Reload
            </Button>
            {location.pathname !== '/' && (
              <Link to="/" className="btn btn-ghost btn-md">
                Back to typing
              </Link>
            )}
          </div>
        </div>
      </section>
    )
  }
}
