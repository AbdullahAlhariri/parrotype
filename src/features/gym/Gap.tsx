import type { CSSProperties, Ref } from 'react'
import { LANG_TAGS, isRtl, type Lang } from '@/types'
import type { DrillItem } from '@/content/drills'
import { gapWidth } from './round'

export type GapMode = 'ask' | 'pick' | 'retype' | 'done'

interface Props {
  item: DrillItem
  lang: Lang
  mode: GapMode
  value: string
  onChange: (v: string) => void
  onEnter: () => void
  inputRef: Ref<HTMLInputElement>
  label: string
  /** the word to show once answered ('done') */
  settled?: string
}

const same = (a: string, b: string) => a.toLocaleLowerCase() === b.toLocaleLowerCase()

/**
 * The gap inside the sentence. 'ask': an empty line to type on. 'pick': a blank for choose
 * mode. 'retype': the right answer as a ghost that the typed letters cover. 'done': the word
 * settles into the sentence.
 */
export function Gap({ item, lang, mode, value, onChange, onEnter, inputRef, label, settled }: Props) {
  const rtl = isRtl(lang)
  const ghost = mode === 'retype' ? item.answer : ''
  const width = Math.max(gapWidth(item, value), ghost.length + 1)
  const style = { '--gap-w': `${width}ch` } as CSSProperties
  // Arabic letters join, so a per-letter overlay would break them apart: use a placeholder there
  const overlay = mode === 'retype' && !rtl

  // answered: the word joins the sentence as plain text, at its own width
  if (mode === 'done') {
    return <span className="gym-gap is-done">{settled ?? value}</span>
  }

  if (mode === 'pick') {
    return (
      <span className="gym-gap is-pick" style={style}>
        <span className="gym-gap-blank" aria-hidden="true" />
        <span className="sr-only">blank</span>
      </span>
    )
  }

  return (
    <span className={`gym-gap is-${mode}${overlay ? ' has-overlay' : ''}`} style={style}>
      {overlay && (
        <span className="gym-gap-mirror" aria-hidden="true">
          {mirror(ghost, value).map((c, i) => (
            <span key={i} className={`gc gc-${c.state}`}>
              {c.ch}
            </span>
          ))}
        </span>
      )}
      <input
        ref={inputRef}
        className="gym-gap-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            onEnter()
          }
        }}
        placeholder={mode === 'retype' && rtl ? ghost : undefined}
        aria-label={label}
        lang={LANG_TAGS[lang]}
        dir={rtl ? 'rtl' : 'ltr'}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        enterKeyHint="done"
        data-gramm="false"
      />
    </span>
  )
}

type Cell = { ch: string; state: 'ok' | 'err' | 'extra' | 'ghost' }

/** Typed letters over the ghost answer: right, wrong, extra, or still to type. */
export function mirror(ghost: string, typed: string): Cell[] {
  const g = Array.from(ghost)
  const t = Array.from(typed)
  const out: Cell[] = []
  for (let i = 0; i < Math.max(g.length, t.length); i++) {
    if (i < t.length) out.push({ ch: t[i] === ' ' ? ' ' : t[i], state: i >= g.length ? 'extra' : same(t[i], g[i]) ? 'ok' : 'err' })
    else out.push({ ch: g[i] === ' ' ? ' ' : g[i], state: 'ghost' })
  }
  return out
}
