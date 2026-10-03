import type { CSSProperties } from 'react'
import { Link } from '@/lib/router'
import { useSettings } from '@/state/settings'
import { isRtl, LANG_TAGS } from '@/types'
import { storiesFor, type Story } from '@/content/stories'
import { LANG_IN_ENGLISH } from '@/features/practice/parts'
import { continueCandidate, pagesDone, useStoryProgress, wordCount, type StoryProgress } from './progress'

const storyHref = (s: Story) => `/stories?s=${encodeURIComponent(s.id)}`

export function StoryList({ missing }: { missing?: string }) {
  const lang = useSettings((s) => s.lang)
  const progress = useStoryProgress((s) => s.progress)
  const stories = storiesFor(lang)
  const resume = continueCandidate(stories, progress)
  const finished = stories.filter((s) => (progress[s.id]?.reads ?? 0) > 0).length

  return (
    <div className="page stories">
      <header className="page-head stories-head">
        <div>
          <h1 className="page-title">Stories</h1>
          <p className="page-lede">Short stories to type, one page at a time. Capitals and punctuation count. Kees keeps your place.</p>
        </div>
        <p className="stories-count muted small tabular">
          {stories.length} in {LANG_IN_ENGLISH[lang]}
          {finished > 0 && `, ${finished} finished`}
        </p>
      </header>

      {missing && <p className="stories-missing small">That story does not exist (any more). Here are the ones that do.</p>}

      {resume && <ResumeStrip story={resume} progress={progress[resume.id]} />}

      <ol className="story-list" aria-label={`Stories in ${LANG_IN_ENGLISH[lang]}`}>
        {stories.map((s) => (
          <li key={s.id}>
            <StoryRow story={s} progress={progress[s.id]} />
          </li>
        ))}
      </ol>
    </div>
  )
}

function ResumeStrip({ story, progress }: { story: Story; progress: StoryProgress }) {
  const page = Math.min(progress.current, story.pages.length - 1) + 1
  return (
    <div className="story-resume">
      <p>
        <span className="muted">Where you stopped: </span>
        <span lang={LANG_TAGS[story.lang]} dir={isRtl(story.lang) ? 'rtl' : undefined} className="story-resume-title">
          {story.title}
        </span>
        <span className="muted tabular">
          , page {page} of {story.pages.length}
        </span>
      </p>
      <Link to={storyHref(story)} className="btn btn-primary btn-md">
        Continue
      </Link>
    </div>
  )
}

function StoryRow({ story, progress }: { story: Story; progress?: StoryProgress }) {
  const done = pagesDone(progress)
  const total = story.pages.length
  const finished = (progress?.reads ?? 0) > 0
  const rtl = isRtl(story.lang)
  const status = finished ? (progress!.reads > 1 ? `read ${progress!.reads} times` : 'finished') : done ? 'in progress' : `${wordCount(story)} words`
  return (
    <Link
      to={storyHref(story)}
      className={`story-row${done ? ' is-started' : ''}`}
      dir={rtl ? 'rtl' : undefined}
      aria-label={`${story.title}. ${story.level}, ${done} of ${total} pages done.`}
    >
      <span className="story-row-main" lang={LANG_TAGS[story.lang]}>
        <span className="story-row-title">{story.title}</span>
        <span className="story-row-blurb">{story.blurb}</span>
      </span>
      <span className="story-row-meta" dir="ltr" aria-hidden="true">
        <span className="story-row-pages tabular">
          {done}/{total}
          <span className="muted"> pages</span>
        </span>
        <span className="story-row-status">
          {story.level}, {status}
        </span>
      </span>
      <span className="story-row-bar" style={{ '--done': done / total } as CSSProperties} aria-hidden="true" />
    </Link>
  )
}
