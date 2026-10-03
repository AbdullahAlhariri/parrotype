import { useQuery } from '@/lib/router'
import { useSettings } from '@/state/settings'
import { PracticeHub } from './PracticeHub'
import { NestReview } from './NestReview'
import { FocusDrill } from './FocusDrill'
import { WordRepair } from './WordRepair'
import { parseWordsParam } from './repair'
import { parseUnits } from './drill'
import './practice.css'

/**
 * /practice                 the hub
 * /practice?words=a,b,c     word repair on those words
 * /practice?mode=repair     word repair on the most-missed words
 * /practice?focus=d,ij      focus drill on those keys and bigrams
 * /practice?mode=drill      focus drill on the current weak spots (or a warm-up)
 * /practice?mode=nest       mistake nest review (cover, copy, compare)
 */
export default function PracticePage() {
  const q = useQuery()
  const lang = useSettings((s) => s.lang)
  // a new query or practice language starts the sub-page fresh
  const key = `${lang}|${q.toString()}`
  const mode = q.get('mode')

  if (q.has('words')) return <WordRepair key={key} words={parseWordsParam(q.get('words'))} />
  if (mode === 'repair') return <WordRepair key={key} />
  if (q.has('focus') || mode === 'drill') return <FocusDrill key={key} units={parseUnits(q.get('focus'))} />
  if (mode === 'nest') return <NestReview key={key} />
  return <PracticeHub />
}

