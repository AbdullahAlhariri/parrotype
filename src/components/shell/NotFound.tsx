import { Link, usePath } from '@/lib/router'
import { Kees } from '@/components/kees/Kees'
import { Button } from '@/components/ui/Button'
import { openCommandPalette } from './paletteStore'
import { useMascotName } from '@/lib/mascot'

export function NotFound() {
  const path = usePath()
  const name = useMascotName()
  return (
    <section className="not-found" aria-labelledby="nf-title">
      <Kees mood="curious" size={150} />
      <div>
        <p className="not-found-code" aria-hidden="true">
          404
        </p>
        <h1 id="nf-title">This page flew off.</h1>
        <p>
          Nothing lives at <code>{path}</code>. {name} looked twice.
        </p>
        <div className="not-found-actions">
          <Link to="/" className="btn btn-primary">
            Back to typing
          </Link>
          <Button variant="ghost" onClick={() => openCommandPalette()}>
            Open commands
          </Button>
        </div>
      </div>
    </section>
  )
}
