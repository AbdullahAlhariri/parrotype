import { useQuery } from '@/lib/router'
import { findPack } from '@/content/drills'
import { PackPicker } from './PackPicker'
import { PackSession } from './PackSession'
import './gym.css'

/** /gym lists the packs; /gym?pack=nl.dt runs one. */
export default function GymPage() {
  const id = useQuery().get('pack')
  const pack = id ? findPack(id) : undefined
  return <div className="page gym">{pack ? <PackSession key={pack.id} pack={pack} /> : <PackPicker missing={id ?? undefined} />}</div>
}
