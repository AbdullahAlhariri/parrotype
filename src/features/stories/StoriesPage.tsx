import { useEffect, useRef } from 'react'
import { navigate, useQuery } from '@/lib/router'
import { useSettings } from '@/state/settings'
import { getStory } from '@/content/stories'
import { StoryList } from './StoryList'
import { StoryReader } from './StoryReader'
import './stories.css'

/** /stories lists the stories for the practice language; /stories?s=<id> opens one. */
export default function StoriesPage() {
  const id = useQuery().get('s')
  const story = id ? getStory(id) : undefined
  const lang = useSettings((s) => s.lang)
  const lastLang = useRef(lang)

  // switching the practice language while reading goes back to that language's list
  useEffect(() => {
    if (lastLang.current !== lang && story && story.lang !== lang) navigate('/stories', { replace: true })
    lastLang.current = lang
  }, [lang, story])

  if (story) return <StoryReader key={story.id} story={story} />
  return <StoryList missing={id ?? undefined} />
}
