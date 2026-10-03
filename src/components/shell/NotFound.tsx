import { Link } from '@/lib/router'

export function NotFound() {
  return (
    <div className="placeholder">
      Nothing here. <Link to="/">Back to typing</Link>
    </div>
  )
}
