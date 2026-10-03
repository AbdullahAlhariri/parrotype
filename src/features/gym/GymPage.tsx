import { navigate, useQuery } from '@/lib/router'
import { findPack } from '@/content/drills'
import { PackPicker } from './PackPicker'
import { PackSession } from './PackSession'
import { useFollowLang } from './useFollowLang'
import './gym.css'

/** /gym lists the packs in the practice language; /gym?pack=nl.dt runs one. */
export default function GymPage() {
  const id = useQuery().get('pack')
  const pack = id ? findPack(id) : undefined
  // switching the practice language in the header mid-pack goes back to that language's packs
  useFollowLang(pack?.lang, () => navigate('/gym'))
  return <div className="page gym">{pack ? <PackSession key={pack.id} pack={pack} /> : <PackPicker missing={id ?? undefined} />}</div>
}
