import { useMemo } from 'react'
import { LANGS, type Lang } from '@/types'
import { Button, Parrot, Segmented } from '@/components/ui'
import { Link, navigate, useQuery } from '@/lib/router'
import { useSettings } from '@/state/settings'
import { useStats } from '@/state/stats'
import { useNest } from '@/state/nest'
import {
  bestsList,
  headline,
  isLangFilter,
  missedWords,
  mistakeKinds,
  nestSummary,
  sessionsFor,
  statsForFilter,
  topRules,
  type LangFilter,
} from './aggregate'
import { plural, shortDate } from './format'
import { LANG_ADJ } from './parts'
import { Details, Headline } from './Headline'
import { HistoryChart } from './HistoryChart'
import { PracticeCalendar } from './PracticeCalendar'
import { Bests } from './Bests'
import { KeyHeatmap } from './KeyHeatmap'
import { WeakUnits } from './WeakUnits'
import { MissedWords } from './MissedWords'
import { RuleList } from './RuleList'
import { MistakeKinds } from './MistakeKinds'
import { NestProgress } from './NestProgress'
import { SessionTable } from './SessionTable'
import './stats.css'

const FILTER_OPTIONS: { value: LangFilter; label: string; title: string }[] = [
  { value: 'all', label: 'all', title: 'All languages' },
  { value: 'nl', label: 'nl', title: 'Nederlands' },
  { value: 'en', label: 'en', title: 'English' },
  { value: 'ar', label: 'ar', title: 'العربية' },
]

/** The user's mirror: accuracy first, then where the mistakes come from. */
export default function StatsPage() {
  const settingsLang = useSettings((s) => s.lang)
  const query = useQuery()
  const q = query.get('lang')
  const filter: LangFilter = isLangFilter(q) ? q : settingsLang
  const setFilter = (f: LangFilter) => navigate(f === settingsLang ? '/stats' : `/stats?lang=${f}`, { replace: true })

  const allSessions = useStats((s) => s.sessions)
  const days = useStats((s) => s.days)
  const keysPerLang = useStats((s) => s.keys)
  const bigramsPerLang = useStats((s) => s.bigrams)
  const wordsPerLang = useStats((s) => s.words)
  const rulesPerLang = useStats((s) => s.rules)
  const bests = useStats((s) => s.bests)
  const nestItems = useNest((s) => s.items)

  const sessions = useMemo(() => sessionsFor(allSessions ?? [], filter), [allSessions, filter])
  const h = useMemo(() => headline(sessions, filter, days ?? [], new Date()), [sessions, filter, days])
  const keys = useMemo(() => statsForFilter(keysPerLang, filter), [keysPerLang, filter])
  const bigrams = useMemo(() => statsForFilter(bigramsPerLang, filter), [bigramsPerLang, filter])
  const words = useMemo(() => missedWords(wordsPerLang, filter), [wordsPerLang, filter])
  const kinds = useMemo(() => mistakeKinds(words), [words])
  const rules = useMemo(() => topRules(rulesPerLang, filter), [rulesPerLang, filter])
  const nest = useMemo(() => nestSummary(nestItems ?? [], filter), [nestItems, filter])
  const bestRows = useMemo(() => bestsList(bests ?? {}, allSessions ?? [], filter), [bests, allSessions, filter])

  const setPracticeLang = useSettings((s) => s.set)
  const nothingAtAll =
    !allSessions?.length &&
    !nestItems?.length &&
    LANGS.every((l) => !Object.keys(wordsPerLang?.[l] ?? {}).length && !Object.keys(rulesPerLang?.[l] ?? {}).length)
  const nothingHere = !sessions.length && !words.length && !rules.length && !nest.total

  const otherLangs = useMemo(() => {
    const counts = new Map<Lang, number>()
    for (const s of allSessions ?? []) counts.set(s.lang, (counts.get(s.lang) ?? 0) + 1)
    return LANGS.filter((l) => l !== filter && counts.get(l)).map((l) => ({ lang: l, count: counts.get(l)! }))
  }, [allSessions, filter])

  const arabicKeysHidden = filter === 'all' && Object.keys(keysPerLang?.ar ?? {}).length > 0

  return (
    <div className="page st-page">
      <header className="page-head st-top">
        <div>
          <h1 className="page-title">Stats</h1>
          {sessions.length > 0 && (
            <p className="page-lede">
              {plural(sessions.length, filter === 'all' ? 'session' : `${LANG_ADJ[filter]} session`)} since {shortDate(h.firstAt ?? Date.now())}.
            </p>
          )}
        </div>
        {!nothingAtAll && (
          <div className="st-filter-wrap">
            <span className="st-filter-label" aria-hidden="true">
              stats for
            </span>
            <Segmented<LangFilter>
              ariaLabel="Stats for language"
              value={filter}
              onChange={setFilter}
              options={FILTER_OPTIONS}
              className="st-filter"
            />
          </div>
        )}
      </header>

      {nothingAtAll ? (
        <div className="st-empty">
          <Parrot mood="idle" size={96} />
          <p>No runs yet. Kees is on his perch, waiting.</p>
          <Link to="/" className="btn btn-primary">
            Start typing
          </Link>
        </div>
      ) : nothingHere ? (
        <div className="st-empty">
          <Parrot mood="idle" size={80} />
          <p>{filter === 'all' ? 'Nothing here yet.' : `No ${LANG_ADJ[filter]} runs yet. Kees is on his perch, waiting.`}</p>
          {otherLangs.length > 0 && (
            <p className="st-empty-sub">You do have {otherLangs.map((o) => `${plural(o.count, 'session')} in ${LANG_ADJ[o.lang]}`).join(' and ')}.</p>
          )}
          <div className="st-empty-actions">
            {filter === 'all' ? (
              <Link to="/" className="btn btn-primary">
                Start typing
              </Link>
            ) : (
              <Link to="/" className="btn btn-primary" onClick={() => setPracticeLang('lang', filter)}>
                Type in {LANG_ADJ[filter]}
              </Link>
            )}
            {otherLangs.length > 0 && <Button onClick={() => setFilter('all')}>Show all languages</Button>}
          </div>
        </div>
      ) : (
        <>
          <Headline h={h} />
          <Details h={h} />

          <HistoryChart sessions={sessions} filter={filter} />

          <div className="st-row st-row-cal">
            <PracticeCalendar sessions={sessions} />
            <Bests rows={bestRows} filter={filter} />
          </div>

          <div className="st-row st-row-keys">
            <KeyHeatmap
              keys={keys}
              filter={filter}
              note={
                filter === 'all'
                  ? `How often your first press on each key was wrong. Dutch and English together${arabicKeysHidden ? '; Arabic has its own keyboard under ar' : ''}.`
                  : undefined
              }
            />
            <WeakUnits keys={keys} bigrams={bigrams} filter={filter} />
          </div>

          <div className="st-row">
            <MissedWords words={words} filter={filter} />
            <RuleList rules={rules} filter={filter} />
          </div>

          <div className="st-row">
            <MistakeKinds rows={kinds} />
            <NestProgress summary={nest} filter={filter} />
          </div>

          {sessions.length > 0 && <SessionTable key={filter} sessions={sessions} filter={filter} />}
        </>
      )}
    </div>
  )
}
