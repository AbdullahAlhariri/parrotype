import { Segmented } from '@/components/ui'
import { FOCUS, PAIRS, type DictationLevel } from '@/content/dictation'
import { LANG_TAGS, type Lang } from '@/types'
import type { DictationConfig, DictationMode, Playback } from './logic/items'

interface Props {
  lang: Lang
  config: DictationConfig
  onChange: (c: DictationConfig) => void
  /** false when there is no voice: memory mode is the only option then */
  canListen: boolean
}

const PAIR_EXAMPLE: Record<Lang, string> = { nl: 'word or wordt?', en: 'then or than?', ar: 'كتابة or كتابه?' }

const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

/** Monkeytype-style config bar: plain text options, the active one in --main. */
export function DictationSetup({ lang, config: c, onChange, canListen }: Props) {
  const set = (p: Partial<DictationConfig>) => onChange({ ...c, ...p })
  const pairs = c.mode === 'pairs'
  const chips = pairs
    ? PAIRS[lang].map((p) => ({ id: p.id, label: p.words.join(' / '), title: p.note.en, lang: LANG_TAGS[lang] }))
    : Object.entries(FOCUS[lang]).map(([id, f]) => ({ id, label: f.label, title: f.title, lang: undefined }))
  const selected = pairs ? c.pairs : c.focus
  const select = (list: string[]) => set(pairs ? { pairs: list } : { focus: list })

  return (
    <div className="dict-setup">
      <div className="dict-bar">
        <Segmented<DictationMode>
          ariaLabel="Mode"
          value={c.mode}
          onChange={(mode) => set({ mode })}
          options={[
            { value: 'sentences', label: 'sentences', title: 'You hear a sentence and type it' },
            { value: 'pairs', label: 'which one?', title: `Sound-alike words in a sentence: ${PAIR_EXAMPLE[lang]}` },
          ]}
        />
        {!pairs && (
          <div className="dict-group">
            <span className="dict-group-label" aria-hidden="true">
              level
            </span>
            <Segmented<DictationLevel>
              ariaLabel="Level"
              value={c.level}
              onChange={(level) => set({ level })}
              options={[
                { value: 1, label: '1', title: 'Short, one trap' },
                { value: 2, label: '2', title: 'One clause, a trap or two' },
                { value: 3, label: '3', title: 'Long, several traps' },
              ]}
            />
          </div>
        )}
        <div className="dict-group">
          <span className="dict-group-label" aria-hidden="true">
            length
          </span>
          <Segmented<5 | 10 | 20>
            ariaLabel="Sentences per set"
            value={c.length}
            onChange={(length) => set({ length })}
            options={[
              { value: 5, label: '5' },
              { value: 10, label: '10' },
              { value: 20, label: '20' },
            ]}
          />
        </div>
        {canListen && (
          <Segmented<Playback>
            ariaLabel="How you get the sentence"
            value={c.playback}
            onChange={(playback) => set({ playback })}
            options={[
              { value: 'listen', label: 'listen', title: 'A voice reads it aloud' },
              { value: 'memory', label: 'memory', title: 'The sentence flashes on screen, then you type it from memory' },
            ]}
          />
        )}
      </div>

      <div className="dict-chips" role="group" aria-label={pairs ? 'Word pairs' : 'Focus'}>
        <button type="button" className="dict-chip" aria-pressed={selected.length === 0} onClick={() => select([])}>
          {pairs ? 'all pairs' : 'everything'}
        </button>
        {chips.map((ch) => (
          <button
            key={ch.id}
            type="button"
            className="dict-chip"
            aria-pressed={selected.includes(ch.id)}
            title={ch.title}
            lang={ch.lang}
            onClick={() => select(toggle(selected, ch.id))}
          >
            {ch.label}
          </button>
        ))}
      </div>
    </div>
  )
}
