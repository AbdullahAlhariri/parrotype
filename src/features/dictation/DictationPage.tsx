import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DICTATION, PAIRS } from '@/content/dictation'
import { Link } from '@/lib/router'
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
import { summarise, type ItemResult, type SessionSummary } from './logic/summary'
import { useKeesVoice, type VoiceStatus } from './useKeesVoice'
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
  if (c.mode === 'pairs') return selectPairItems(PAIRS[lang], c.pairs, c.length)
  return selectSentences(DICTATION[lang], {
    level: c.level,
    focus: c.focus,
    count: c.length,
    avoid: loadRecent(lang),
    boost: weakWords(lang),
  }).map((s) => itemFromSentence(s, lang))
}

const LANG_EN: Record<Lang, string> = { nl: 'Dutch', en: 'English', ar: 'Arabic' }

const VOICE_HELP: Record<Lang, string> = {
  nl: 'Edge, Safari and Chrome on most systems have one.',
  en: 'Almost every browser has one; check your system speech settings.',
  ar: 'Edge, Safari, Windows and most phones have one. Desktop Chrome usually does not.',
}

function VoiceNotice({ lang, status }: { lang: Lang; status: VoiceStatus }) {
  const what = status === 'unsupported' ? 'This browser cannot speak' : `This browser has no ${LANG_EN[lang]} voice`
  return (
    <div className="dict-notice" role="note">
      <p>
        <strong>{what}, so Kees cannot read aloud.</strong> Memory mode instead: the sentence shows for a few seconds, then you type it.
      </p>
      <p className="muted">
        {status === 'unsupported' ? 'Try Edge, Safari or Chrome.' : VOICE_HELP[lang]} <Link to="/settings#voices">Voice settings</Link>
      </p>
    </div>
  )
}

interface Session {
  key: number
  items: DictationItem[]
  config: DictationConfig
  /** "Practise these words" sets are not built from the config */
  label?: string
  /** started from a button: Kees reads the first sentence right away */
  autoStart?: boolean
}

interface Finished {
  summary: SessionSummary
  results: ItemResult[]
  label: string
}

export default function DictationPage() {
  const lang = useSettings((s) => s.lang)
  const voice = useKeesVoice(lang)
  const [config, setConfig] = useState<DictationConfig>(() => {
    const saved = loadConfig(lang)
    const linked = configFromQuery(saved, new URLSearchParams(location.search))
    if (!linked) return saved
    saveConfig(lang, linked)
    return linked
  })
  const [session, setSession] = useState<Session>(() => ({ key: 1, items: buildItems(lang, config), config }))
  const [finished, setFinished] = useState<Finished | null>(null)

  const canListen = voice.status === 'ready' || voice.status === 'loading'
  const memory = !canListen || config.playback === 'memory'

  const start = useCallback(
    (c: DictationConfig, opts: { items?: DictationItem[]; label?: string; autoStart?: boolean } = {}) => {
      setFinished(null)
      setSession((s) => ({ key: s.key + 1, items: opts.items ?? buildItems(lang, c), config: c, label: opts.label, autoStart: opts.autoStart }))
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

  const changeConfig = (c: DictationConfig) => {
    setConfig(c)
    saveConfig(lang, c)
    // switching only how the sentence is given keeps the current set
    if (c.playback !== config.playback && c.mode === config.mode && c.level === config.level && c.length === config.length && c.focus === config.focus && c.pairs === config.pairs) return
    start(c)
  }

  const finish = (results: ItemResult[]) => {
    const summary = summarise(results)
    const pairName = (id: string) => PAIRS[lang].find((p) => p.id === id)?.words.join('/') ?? id
    const label = session.label ?? configLabel(lang, session.config, memory, pairName)
    recordSession(lang, summary, label, session.config.mode === 'pairs')
    pushRecent(lang, results.map((r) => r.item.id))
    setFinished({ summary, results, label })
  }

  const practise = (words: string[]) => {
    if (!finished) return
    if (session.config.mode === 'pairs') {
      const missed = [...new Set(finished.results.filter((r) => r.first.targetOk === false).map((r) => r.item.pairId!))]
      const ids = missed.length ? missed : session.config.pairs
      start({ ...session.config, pairs: ids }, { items: selectPairItems(PAIRS[lang], ids, session.config.length), autoStart: true })
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

  return (
    <div className="dict page">
      <h1 className="sr-only">Parrot says: hear it, type it</h1>
      <DictationSetup lang={lang} config={config} onChange={changeConfig} canListen={canListen} />
      {finished ? (
        <DictationSummary
          lang={lang}
          summary={finished.summary}
          config={finished.label}
          onAgain={() => start(session.config, { autoStart: true })}
          onPractise={practise}
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
          autoStart={session.autoStart}
        />
      ) : (
        <p className="dict-empty">No sentences match this setup. Pick fewer focus tags.</p>
      )}
    </div>
  )
}
