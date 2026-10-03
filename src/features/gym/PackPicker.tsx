import type { CSSProperties, KeyboardEvent } from 'react'
import { LANG_NAMES, LANG_TAGS, isRtl } from '@/types'
import { packsFor, type DrillPack } from '@/content/drills'
import { useSettings } from '@/state/settings'
import { mascotName } from '@/lib/mascot'
import { Link } from '@/lib/router'
import { isolateArabic } from './Rich'
import { LANG_IN_ENGLISH, mastery, ROUND_SIZE } from './round'
import { useGym, type PackProgress } from './store'

const href = (p: DrillPack) => `/gym?pack=${encodeURIComponent(p.id)}`

/** Arrow keys walk the list; Tab still moves on to the next control. */
function onListKey(e: KeyboardEvent<HTMLOListElement>) {
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
  const links = [...e.currentTarget.querySelectorAll<HTMLAnchorElement>('a.gym-pack')]
  const at = links.indexOf(document.activeElement as HTMLAnchorElement)
  const next = links[at === -1 ? 0 : (at + (e.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length]
  if (next) {
    e.preventDefault()
    next.focus()
  }
}

/** What to suggest at the top: the pack you were working on, or the first one you haven't opened. */
function suggestion(packs: DrillPack[], progress: Record<string, PackProgress>): { pack: DrillPack; resume: boolean } | null {
  const played = packs.filter((p) => progress[p.id]?.rounds).sort((a, b) => progress[b.id].lastAt - progress[a.id].lastAt)
  const recent = played.find((p) => mastery(p, progress[p.id].known).share < 1)
  if (recent) return { pack: recent, resume: true }
  const fresh = packs.find((p) => !progress[p.id]?.rounds)
  return fresh ? { pack: fresh, resume: false } : null
}

export function PackPicker({ missing }: { missing?: string }) {
  // the packs follow the practice language; the header switch is the only way to change it
  const lang = useSettings((s) => s.lang)
  const progress = useGym((s) => s.packs)
  const packs = packsFor(lang)
  const tip = suggestion(packs, progress)

  return (
    <div className="gym-picker">
      <header className="page-head gym-head">
        <div>
          <h1 className="page-title">Grammar gym</h1>
          <p className="page-lede">
            {packs.length} {LANG_IN_ENGLISH[lang]} packs, one rule each. Fifteen sentences a round: type the missing word. A slip shows the rule, then you type the right word once.
          </p>
        </div>
      </header>

      {missing && <p className="gym-missing">There is no pack called {missing}. These are the ones there are.</p>}

      {tip && (
        <div className="gym-suggest">
          <p>
            <span className="muted">{tip.resume ? 'Last time: ' : 'Start with '}</span>
            <span className="mono-text gym-suggest-title" lang={LANG_TAGS[tip.pack.lang]} dir={isRtl(tip.pack.lang) ? 'rtl' : undefined}>
              {tip.pack.title}
            </span>
            {tip.resume ? (
              <span className="muted tabular">
                , {progress[tip.pack.id].lastScore} of {progress[tip.pack.id].bestOf || ROUND_SIZE}
              </span>
            ) : (
              <span className="muted">. It is the slip {mascotName(lang)} hears most.</span>
            )}
          </p>
          <Link to={href(tip.pack)} className="btn btn-primary btn-md">
            {tip.resume ? 'Another round' : 'Open it'}
          </Link>
        </div>
      )}

      <ol className="gym-packs" aria-label={`Packs in ${LANG_NAMES[lang]}`} onKeyDown={onListKey}>
        {packs.map((p) => (
          <li key={p.id}>
            <PackRow pack={p} progress={progress[p.id]} />
          </li>
        ))}
      </ol>

      <p className="gym-foot">Every sentence you miss goes to your mistake nest, and the weak spots page brings it back later.</p>
    </div>
  )
}

function PackRow({ pack, progress }: { pack: DrillPack; progress?: PackProgress }) {
  const m = mastery(pack, progress?.known)
  const played = (progress?.rounds ?? 0) > 0
  const rtl = isRtl(pack.lang)
  return (
    <Link
      to={href(pack)}
      className={`gym-pack${played ? ' is-played' : ''}`}
      style={{ '--known': m.share } as CSSProperties}
      aria-label={`${pack.title}. ${pack.blurb} ${played ? `${m.known} of ${m.total} sentences known.` : 'Not tried yet.'}`}
    >
      <span className="gym-pack-title-cell mono-text" lang={LANG_TAGS[pack.lang]} dir={rtl ? 'rtl' : 'ltr'}>
        {pack.title}
      </span>
      <span className="gym-pack-blurb">{isolateArabic(pack.blurb)}</span>
      <span className="gym-pack-meta tabular" aria-hidden="true">
        {played ? (
          <>
            {m.known}
            <span className="muted">/{m.total}</span>
          </>
        ) : (
          <span className="muted">new</span>
        )}
      </span>
      <span className="gym-pack-bar" aria-hidden="true" />
    </Link>
  )
}
