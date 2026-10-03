/**
 * Dev-only Kees gallery. Nothing imports this, so it never ships. In a dev server console:
 *   import('/src/components/kees/gallery.tsx').then((m) => m.mountGallery())
 */
import { createRoot } from 'react-dom/client'
import { Kees } from './Kees'
import { KeesMark } from './KeesMark'
import { KEES_MOODS } from './machine'
import { featherBurst } from './featherBurst'

function Gallery() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, overflow: 'auto', background: 'var(--bg)', color: 'var(--text)', padding: 32 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '56px 40px', alignItems: 'flex-end' }}>
        {KEES_MOODS.map((m) => (
          <figure key={m} style={{ display: 'grid', justifyItems: 'center', gap: 8, margin: 0 }} data-mood-cell={m}>
            <Kees
              mood={m}
              size={120}
              bubble={m === 'repeat' ? ['wordt.', 'wordt.', 'wordt.'] : m === 'talk' ? 'Hoi.' : undefined}
              bubbleLang="nl"
              stayWhileTyping
            />
            <figcaption style={{ color: 'var(--sub)', fontSize: 13 }}>{m}</figcaption>
          </figure>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-end', marginTop: 48 }}>
        {[24, 32, 48, 72, 200].map((s) => (
          <Kees key={s} size={s} />
        ))}
        {[16, 24, 32, 48].map((s) => (
          <KeesMark key={`m${s}`} size={s} />
        ))}
        <button id="burst" className="btn btn-primary" onClick={(e) => featherBurst(e.currentTarget)}>
          Burst
        </button>
      </div>
    </div>
  )
}

export function mountGallery() {
  const el = document.createElement('div')
  document.body.appendChild(el)
  createRoot(el).render(<Gallery />)
}
