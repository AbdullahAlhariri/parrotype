import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DICTATION, PAIRS } from '@/content/dictation'
import { hasClip, reactionAvailable, sayReaction, useAudioManifest } from '@/lib/audio'
import { mascotName } from '@/lib/mascot'
import { Link, navigate, useQuery } from '@/lib/router'
import { useSettings } from '@/state/settings'
import { useStats } from '@/state/stats'
import type { Lang } from '@/types'
import { preloadChecker } from './checker'
import { configFromQuery, loadConfig, loadRecent, pushRecent, saveConfig } from './config'
import { DictationRun } from './DictationRun'
import { DictationSetup } from './DictationSetup'
import { DictationSummary } from './DictationSummary'
import { configLabel, itemFromSentence, type DictationConfig, type DictationItem } from './logic/items'
import { recordSession } from './logic/record'
import { selectForWords, selectPairItems, selectSentences } from './logic/select'
import { summarise, summaryReaction, type ItemResult, type SessionSummary } from './logic/summary'
import { useDictationVoice, type VoiceStatus } from './useVoice'
import './dictation.css'

/** Words the user missed at least twice: sentences with them come up more often. */
function weakWords(lang: Lang): Set<string> {
  const words = useStats.getState().words[lang] ?? {}
  return new Set(
    Object.values(words)
      .filter((w) => w.count >= 2)
      .map((w) => w.word.toLowerCase()),
  )
}

function buildItems(lang: Lang, c: DictationConfig): DictationItem[] {
  // to listen, sentences with a recorded voice first (the rest fall back to the browser voice)
  const prefer = c.playback === 'listen' ? (id: string) => hasClip(lang, id) : undefined
  if (c.mode === 'pairs') return selectPairItems(PAIRS[lang], c.pairs, c.length, Math.random, prefer)
  return selectSentences(DICTATION[lang], {
    level: c.level,
    focus: c.focus,
    count: c.length,
    avoid: loadRecent(lang),
    boost: weakWords(lang),
    prefer,
  }).map((s) => itemFromSentence(s, lang))
}

const LANG_EN: Record<Lang, string> = { nl: 'Dutch', en: 'English', ar: 'Arabic' }

const VOICE_HELP: Record<Lang, string> = {
  nl: 'Edge, Safari and Chrome on most systems have one.',
  en: 'Almost every browser has one; check your system speech settings.',
  ar: 'Edge, Safari, Windows and most phones have one. Desktop Chrome usually does not.',
}

/** Only when nothing can read aloud: the recordings did not load and the browser has no voice. */
function VoiceNotice({ lang, status }: { lang: Lang; status: VoiceStatus }) {
  const what = status === 'unsupported' ? 'this browser cannot speak' : `this browser has no ${LANG_EN[lang]} voice`
  return (
    <div className="dict-notice" role="note">
      <p>
        <strong>
          The recorded voices did not load and {what}, so {mascotName(lang)} cannot read aloud.
        </strong>{' '}
        Memory mode instead: the sentence shows for a few seconds, then you type it.
      </p>
      <p className="muted">
        {status === 'unsupported' ? 'Try Edge, Safari or Chrome, or reload when you are online.' : `Reload when you are online. ${VOICE_HELP[lang]}`}{' '}
        <Link to="/settings#dictation">Voice settings</Link>
      </p>
    </div>
  )
}

/** The same in one line, once the set is under way. */
function VoiceNote({ lang, status }: { lang: Lang; status: VoiceStatus }) {
  return (
    <>
      No recordings and {status === 'unsupported' ? 'no speech in this browser' : `no ${LANG_EN[lang]} browser voice`}, so memory mode.{' '}
      <Link to="/settings#dictation">Voice settings</Link>
    </>
  )
}

interface Session {
  key: number
  items: DictationItem[]
  config: DictationConfig
  /** "Practise these words" sets are not built from the config */
  label?: string
  /** started from a button: the first sentence plays right away */
  autoStart?: boolean
}

interface Finished {
  summary: SessionSummary
  results: ItemResult[]
  label: string
}

export default function DictationPage() {
  const lang = useSettings((s) => s.lang)
  const voice = useDictationVoice(lang)
  const [mascotTalks, setMascotTalks] = useState(false)
  const [config, setConfig] = useState<DictationConfig>(() => {
    const saved = loadConfig(lang)
    const linked = configFromQuery(saved, new URLSearchParams(location.search), lang)
    if (!linked) return saved
    saveConfig(lang, linked)
    return linked
  })
  // the query string the setup above already came from
  const appliedQuery = useRef(new URLSearchParams(location.search).toString())
  // the first set waits for the voice list (a few ms), so it can favour sentences with a recording
  const { loaded: audioLoaded } = useAudioManifest()
  const [session, setSession] = useState<Session | null>(null)
  const [finished, setFinished] = useState<Finished | null>(null)
  useEffect(() => {
    if (audioLoaded) setSession((s) => s ?? { key: 1, items: buildItems(lang, config), config })
  }, [audioLoaded, lang, config])

  const canListen = voice.status === 'ready' || voice.status === 'loading'
  const memory = !canListen || config.playback === 'memory'

  const start = useCallback(
    (c: DictationConfig, opts: { items?: DictationItem[]; label?: string; autoStart?: boolean } = {}) => {
      setFinished(null)
      setMascotTalks(false)
      setSession((s) => ({ key: (s?.key ?? 0) + 1, items: opts.items ?? buildItems(lang, c), config: c, label: opts.label, autoStart: opts.autoStart }))
    },
    [lang],
  )

  // a new language: its own saved setup and a fresh set
  const shownLang = useRef(lang)
  useEffect(() => {
    preloadChecker(lang)
    if (shownLang.current === lang) return
    shownLang.current = lang
    const c = loadConfig(lang)
    setConfig(c)
    start(c)
  }, [lang, start])

  // A deep link (/listen?focus=dt) sets up the page once; then the query goes, so a reload or a
  // later change in the setup bar is not overridden. Links followed while already here apply too.
  const search = useQuery().toString()
  useEffect(() => {
    const linked = configFromQuery(loadConfig(lang), new URLSearchParams(search), lang)
    if (!linked) {
      appliedQuery.current = search
      return
    }
    if (search !== appliedQuery.current) {
      appliedQuery.current = search
      saveConfig(lang, linked)
      setConfig(linked)
      start(linked)
    }
    navigate(location.pathname + location.hash, { replace: true })
  }, [search, lang, start])

  const changeConfig = (c: DictationConfig) => {
    setConfig(c)
    saveConfig(lang, c)
    // switching only how the sentence is given keeps the current set
    if (c.playback !== config.playback && c.mode === config.mode && c.level === config.level && c.length === config.length && c.focus === config.focus && c.pairs === config.pairs) return
    start(c)
  }

  const finish = (results: ItemResult[]) => {
    if (!session) return
    const summary = summarise(results)
    const pairName = (id: string) => PAIRS[lang].find((p) => p.id === id)?.words.join('/') ?? id
    const label = session.label ?? configLabel(lang, session.config, memory, pairName)
    recordSession(lang, summary, label, session.config.mode === 'pairs')
    pushRecent(lang, results.map((r) => r.item.id))
    setFinished({ summary, results, label })
    // one recorded line from the mascot (if that is on); he talks in the summary while it plays
    const line = summaryReaction(summary)
    if (reactionAvailable(lang, line)) {
      setMascotTalks(true)
      sayReaction(lang, line).finally(() => setMascotTalks(false))
    }
  }

  const practise = (words: string[]) => {
    if (!finished || !session) return
    if (session.config.mode === 'pairs') {
      const missed = [...new Set(finished.results.filter((r) => r.first.targetOk === false).map((r) => r.item.pairId!))]
      const ids = missed.length ? missed : session.config.pairs
      const prefer = session.config.playback === 'listen' ? (id: string) => hasClip(lang, id) : undefined
      start({ ...session.config, pairs: ids }, { items: selectPairItems(PAIRS[lang], ids, session.config.length, Math.random, prefer), autoStart: true })
      return
    }
    const seen = new Set(finished.results.map((r) => r.item.id))
    const fresh = selectForWords(DICTATION[lang], words, session.config.length, seen)
    // top up with the sentences that went wrong, so a short list still makes a set
    const missed = finished.results.filter((r) => !r.first.perfect).map((r) => r.item)
    const items = [...fresh.map((s) => itemFromSentence(s, lang))]
    for (const it of missed) if (items.length < session.config.length && !items.some((x) => x.id === it.id)) items.push(it)
    start(session.config, { items, label: `${lang} practise ${words.slice(0, 3).join(' ')}`, autoStart: true })
  }

  const notice = useMemo(() => (canListen ? null : <VoiceNotice lang={lang} status={voice.status} />), [canListen, lang, voice.status])
  const noticeShort = useMemo(() => (canListen ? null : <VoiceNote lang={lang} status={voice.status} />), [canListen, lang, voice.status])

  return (
    <div className="dict page">
      <h1 className="sr-only">Parrot says: hear it, type it</h1>
      <DictationSetup lang={lang} config={config} onChange={changeConfig} canListen={canListen} />
      {!session ? null : finished ? (
        <DictationSummary
          lang={lang}
          summary={finished.summary}
          config={finished.label}
          onAgain={() => start(session.config, { autoStart: true })}
          onPractise={practise}
          talking={mascotTalks}
        />
      ) : session.items.length ? (
        <DictationRun
          key={session.key}
          lang={lang}
          items={session.items}
          memory={memory}
          voice={voice}
          onFinish={finish}
          onNewSet={() => start(session.config, { autoStart: true })}
          notice={notice}
          noticeShort={noticeShort}
          autoStart={session.autoStart}
        />
      ) : (
        <p className="dict-empty">{config.mode === 'pairs' ? 'No sentences for these pairs. Pick another pair.' : 'No sentences match this setup. Pick fewer focus tags.'}</p>
      )}
    </div>
  )
}
