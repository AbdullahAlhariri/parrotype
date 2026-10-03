import { useRef, type CSSProperties, type KeyboardEvent } from 'react'
import { useSettings } from '@/state/settings'
import { AUTO_THEME_ID, THEMES, resolveTheme, type Theme } from '@/styles/themes'
import { Icon } from '@/components/ui'

/** Paint the chip with the theme's own tokens so the sample is a real preview. */
const chipStyle = (t: Theme) => {
  const style: Record<string, string> = {}
  for (const [k, v] of Object.entries(t.colors)) style[k.replace('--', '--t-')] = v
  return style as CSSProperties
}

function Sample() {
  return (
    <span className="theme-sample mono-text" aria-hidden="true">
      <span className="ts-typed">de kat word</span>
      <span className="ts-wrong">t</span>
      <span className="ts-caret" />
      <span className="ts-sub"> morgen gewassen</span>
    </span>
  )
}

/** The six themes plus auto, as paint chips that each show a line of typing. */
export function ThemePicker({ labelledBy }: { labelledBy: string }) {
  const theme = useSettings((s) => s.theme)
  const set = useSettings((s) => s.set)
  const ref = useRef<HTMLDivElement>(null)
  const ids = [AUTO_THEME_ID, ...THEMES.map((t) => t.id)]

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const at = Math.max(0, ids.indexOf(theme))
    const next = (at + step + ids.length) % ids.length
    set('theme', ids[next])
    ;(ref.current?.children[next] as HTMLElement | undefined)?.focus()
  }

  const auto = resolveTheme(AUTO_THEME_ID)
  return (
    <div ref={ref} className="theme-picker" role="radiogroup" aria-labelledby={labelledBy} onKeyDown={onKeyDown}>
      {ids.map((id) => {
        const t = id === AUTO_THEME_ID ? auto : THEMES.find((x) => x.id === id)!
        const active = theme === id
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active || (!ids.includes(theme) && id === 'kea-dark') ? 0 : -1}
            className="theme-chip"
            style={chipStyle(t)}
            onClick={() => set('theme', id)}
          >
            <span className="theme-name">{id === AUTO_THEME_ID ? `auto, now ${auto.name}` : t.name}</span>
            <Sample />
            <span className="theme-check">{active && <Icon name="check" size={18} label="selected" />}</span>
          </button>
        )
      })}
    </div>
  )
}
