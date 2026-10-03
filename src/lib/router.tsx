import { useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent } from 'react'

/** Tiny history router. Vercel rewrites every path to index.html (see vercel.json). */

const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

if (typeof window !== 'undefined') window.addEventListener('popstate', notify)

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  if (to === location.pathname + location.search) return
  if (opts.replace) history.replaceState(null, '', to)
  else history.pushState(null, '', to)
  notify()
  window.scrollTo({ top: 0 })
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** Current pathname, e.g. "/listen". */
export function usePath(): string {
  return useSyncExternalStore(subscribe, () => location.pathname, () => '/')
}

/** Current query params (read-only). */
export function useQuery(): URLSearchParams {
  const search = useSyncExternalStore(subscribe, () => location.search, () => '')
  return new URLSearchParams(search)
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }

export function Link({ to, onClick, ...rest }: LinkProps) {
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e)
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    navigate(to)
  }
  return <a href={to} onClick={handle} {...rest} />
}
