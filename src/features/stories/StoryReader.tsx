import { useMemo, useState } from 'react'
import { Link, navigate } from '@/lib/router'
import { isRtl, LANG_TAGS, type TypingResult } from '@/types'
import { sentenceToWords } from '@/engine'
import { storiesFor, type Story } from '@/content/stories'
import { Button, Kbd, Kees } from '@/components/ui'
import { TypingSurface } from '@/features/typing/TypingSurface'
import { ResultView } from '@/features/typing/ResultView'
import { recordTypingRun } from '@/features/typing/recordRun'
import { useEnterKey } from '@/features/practice/parts'
import { mascotName } from '@/lib/mascot'
import { completedRead, storyAverages, useStoryProgress, wordCount } from './progress'

type Phase = { kind: 'typing' } | { kind: 'result'; result: TypingResult; isPb: boolean; completed: boolean; nextPage: number } | { kind: 'end' }

/** Where to open a story: the next page still to type (page 1 again once it was finished). */
function openingPage(story: Story): number {
  const p = useStoryProgress.getState().progress[story.id]
  return p ? Math.min(Math.max(p.current, 0), story.pages.length - 1) : 0
}

export function StoryReader({ story }: { story: Story }) {
  const progress = useStoryProgress((s) => s.progress[story.id])
  const recordPage = useStoryProgress((s) => s.recordPage)
  const goTo = useStoryProgress((s) => s.goTo)
  const [page, setPage] = useState(() => openingPage(story))
  const [attempt, setAttempt] = useState(0)
  const [phase, setPhase] = useState<Phase>({ kind: 'typing' })

  const total = story.pages.length
  const words = useMemo(() => sentenceToWords(story.pages[page]), [story, page])
  const rtl = isRtl(story.lang)

  const openPage = (i: number) => {
    // hand the keyboard back to the typing surface after a click on a page number
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    goTo(story.id, i)
    setPage(i)
    setAttempt((a) => a + 1)
    setPhase({ kind: 'typing' })
  }

  const onFinish = (result: TypingResult) => {
    const { isPb } = recordTypingRun(result, 'story', `${story.title} p${page + 1}`)
    const before = useStoryProgress.getState().progress[story.id]
    recordPage(story.id, page, total, { wpm: result.wpm, accuracy: result.accuracy })
    const after = useStoryProgress.getState().progress[story.id]
    setPhase({ kind: 'result', result, isPb, completed: completedRead(before, after), nextPage: after.current })
  }

  const again = () => {
    setAttempt((a) => a + 1)
    setPhase({ kind: 'typing' })
  }

  const proceed = () => {
    if (phase.kind !== 'result') return
    if (phase.completed) setPhase({ kind: 'end' })
    else openPage(phase.nextPage)
  }
  useEnterKey(proceed, phase.kind === 'result')


  return (
    <div className={`page story-reader${phase.kind === 'typing' ? ' is-typing' : ''}`}>
      <header className="story-head" dir={rtl ? 'rtl' : undefined}>
        <Link to="/stories" className="story-back link-btn">
          All stories
        </Link>
        <h1 className="story-title" lang={LANG_TAGS[story.lang]} dir={rtl ? 'rtl' : undefined}>
          {story.title}
        </h1>
        <PagePicker total={total} page={page} done={progress?.pages ?? {}} ended={phase.kind === 'end'} onPick={openPage} />
      </header>

      {phase.kind === 'typing' && (
        <TypingSurface
          key={`${story.id}:${page}:${attempt}`}
          words={words}
          lang={story.lang}
          onFinish={onFinish}
          onRestart={again}
          resetKey={`${story.id}:${page}:${attempt}`}
          showLiveStats
          autoFocus
          label={`${story.title}, page ${page + 1} of ${total}`}
          className="story-surface"
        />
      )}

      {phase.kind === 'result' && (
        <div className="story-result">
          <ResultView result={phase.result} title={`Page ${page + 1} done`} configLabel={`${story.title} p${page + 1}`} isPb={phase.isPb} onAgain={again}>
            <div className="story-next">
              <Button variant="subtle" size="lg" onClick={proceed}>
                {phase.completed ? 'Finish the story' : phase.nextPage === page + 1 ? 'Next page' : `Go to page ${phase.nextPage + 1}`}
              </Button>
              <span className="muted small" aria-hidden="true">
                <Kbd>enter</Kbd>
              </span>
            </div>
          </ResultView>
        </div>
      )}

      {phase.kind === 'end' && <StoryEnd story={story} onAgain={() => openPage(0)} />}
    </div>
  )
}

interface PickerProps {
  total: number
  page: number
  done: Record<number, { wpm: number; accuracy: number }>
  ended: boolean
  onPick: (i: number) => void
}

function PagePicker({ total, page, done, ended, onPick }: PickerProps) {
  return (
    <nav className="story-pages" aria-label="Pages">
      <span className="story-pages-label muted tabular">{ended ? `${total} pages` : `Page ${page + 1} of ${total}`}</span>
      <ol>
        {Array.from({ length: total }, (_, i) => {
          const rec = done[i]
          const label = `Page ${i + 1}${rec ? `, done at ${Math.round(rec.wpm)} wpm` : ''}`
          return (
            <li key={i}>
              <button
                type="button"
                className={`story-page${rec ? ' is-done' : ''}`}
                aria-current={!ended && i === page ? 'step' : undefined}
                aria-label={label}
                title={label}
                onClick={() => onPick(i)}
              >
                {i + 1}
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function StoryEnd({ story, onAgain }: { story: Story; onAgain: () => void }) {
  const progress = useStoryProgress((s) => s.progress[story.id])
  const avg = storyAverages(progress)
  const list = storiesFor(story.lang)
  const after = list.slice(list.indexOf(story) + 1).concat(list.slice(0, list.indexOf(story)))
  const nextStory = after.find((s) => !(useStoryProgress.getState().progress[s.id]?.reads ?? 0)) ?? after[0]
  const reads = progress?.reads ?? 1
  const name = mascotName(story.lang)

  return (
    <section className="story-end" aria-labelledby="story-end-title">
      <Kees mood="curious" size={88} className="story-end-kees" />
      <div className="story-end-body">
        <h2 id="story-end-title" className="story-end-title">
          The end.
        </h2>
        <p className="story-end-line tabular">
          {story.pages.length} pages, {wordCount(story)} words
          {avg && (
            <>
              . Average {avg.wpm} wpm at {avg.accuracy}% accuracy
            </>
          )}
          .
        </p>
        <p className="muted">{reads > 1 ? `That makes ${reads} reads. ${name} can recite it now, and frequently does.` : `${name} would like a sequel. He is not getting one.`}</p>
        <div className="story-end-actions">
          {nextStory && nextStory.id !== story.id && (
            <Button variant="primary" size="lg" autoFocus onClick={() => navigate(`/stories?s=${encodeURIComponent(nextStory.id)}`)}>
              Next story: <span lang={LANG_TAGS[nextStory.lang]}>{nextStory.title}</span>
            </Button>
          )}
          <Button onClick={onAgain}>Read it again</Button>
          <Link to="/stories" className="btn btn-ghost btn-md">
            All stories
          </Link>
        </div>
      </div>
    </section>
  )
}
