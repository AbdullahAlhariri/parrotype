import { navigate } from '@/lib/router'
import { ROUTES } from '@/routes'
import { LANGS, LANG_NAMES, type Lang } from '@/types'
import type { Settings } from '@/state/settings'
import { THEME_CHOICES, resolveTheme, getTheme, AUTO_THEME_ID } from '@/styles/themes'
import { TYPING_FONTS } from '@/styles/fonts'
import type { KeesLevel, TypingFontChoice } from '@/styles/fontStore'
import { exportAll } from '@/features/settings/data'

/** One row in the command palette. Monkeytype "single list" style: group › label. */
export interface Command {
  id: string
  group: string
  label: string
  /** extra words that should match, e.g. 'dutch nl' */
  keywords?: string
  /** short description on the right */
  hint?: string
  /** marks the active value of a setting */
  current?: boolean
  /** theme rows: paint the theme while the row is active */
  previewTheme?: string
  /** font rows: render the label in this font */
  fontFamily?: string
  /** lang attribute for the label */
  lang?: string
  run: () => void
  /** message for a toast after running (for changes you cannot see right away) */
  confirm?: string
}

export interface CommandContext {
  path: string
  settings: Settings
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  font: TypingFontChoice
  setFont: (f: TypingFontChoice) => void
  kees: KeesLevel
  setKees: (k: KeesLevel) => void
}

const LANG_KEYWORDS: Record<Lang, string> = { nl: 'nl dutch nederlands', en: 'en english engels', ar: 'ar arabic arabisch' }

export function buildCommands(ctx: CommandContext): Command[] {
  const { settings: s, set } = ctx
  const out: Command[] = []

  for (const r of ROUTES) {
    out.push({
      id: `go:${r.path}`,
      group: 'go to',
      label: r.label,
      hint: r.blurb,
      keywords: r.path.replace('/', ''),
      current: ctx.path === r.path,
      run: () => navigate(r.path),
    })
  }

  for (const l of LANGS) {
    out.push({
      id: `lang:${l}`,
      group: 'practice language',
      label: LANG_NAMES[l],
      lang: l,
      keywords: LANG_KEYWORDS[l],
      current: s.lang === l,
      run: () => set('lang', l),
    })
  }

  for (const t of THEME_CHOICES) {
    out.push({
      id: `theme:${t.id}`,
      group: 'theme',
      label: t.name,
      keywords: t.id === AUTO_THEME_ID ? 'system dark light' : getTheme(t.id).species,
      current: s.theme === t.id,
      previewTheme: t.id,
      run: () => set('theme', t.id),
    })
  }

  for (const f of TYPING_FONTS) {
    out.push({
      id: `font:${f.id}`,
      group: 'typing font',
      label: f.name,
      fontFamily: f.family,
      current: ctx.font === f.id,
      run: () => ctx.setFont(f.id),
    })
  }

  const sizes: [string, number][] = [
    ['small', 1.375],
    ['medium', 1.75],
    ['large', 2.25],
    ['huge', 2.75],
  ]
  for (const [name, rem] of sizes) {
    out.push({
      id: `size:${rem}`,
      group: 'text size',
      label: name,
      hint: `${rem} rem`,
      keywords: 'font typing',
      current: Math.abs(s.fontSize - rem) < 0.01,
      run: () => set('fontSize', rem),
    })
  }

  for (const c of ['line', 'block', 'underline'] as const) {
    out.push({ id: `caret:${c}`, group: 'caret', label: c, current: s.caretStyle === c, run: () => set('caretStyle', c) })
  }

  const toggles: { key: 'sound' | 'focusMode' | 'smoothCaret' | 'stopOnError' | 'showKeyboard'; group: string; keywords?: string; on: string; off: string }[] = [
    { key: 'sound', group: 'sound', keywords: 'keystroke click audio', on: 'Sound on', off: 'Sound off' },
    { key: 'focusMode', group: 'focus mode', keywords: 'hide chrome', on: 'Focus mode on: the chrome fades while you type', off: 'Focus mode off' },
    { key: 'smoothCaret', group: 'smooth caret', keywords: 'glide', on: 'Smooth caret on', off: 'Smooth caret off' },
    { key: 'stopOnError', group: 'stop on error', keywords: 'strict', on: 'Stop on error on', off: 'Stop on error off' },
    { key: 'showKeyboard', group: 'on-screen keyboard', keywords: 'keyboard layout', on: 'On-screen keyboard on', off: 'On-screen keyboard off' },
  ]
  for (const t of toggles) {
    for (const value of [true, false]) {
      out.push({
        id: `${t.key}:${value}`,
        group: t.group,
        label: value ? 'on' : 'off',
        keywords: `toggle ${t.keywords ?? ''}`,
        current: s[t.key] === value,
        run: () => set(t.key, value),
        confirm: value ? t.on : t.off,
      })
    }
  }

  const keesLevels: [KeesLevel, string, string][] = [
    ['lively', 'blinks, fidgets, reacts', 'Kees is lively again'],
    ['quiet', 'blinks only', 'Kees will keep still'],
    ['hidden', 'off screen', 'Kees is off his perch'],
  ]
  for (const [level, hint, confirm] of keesLevels) {
    out.push({
      id: `kees:${level}`,
      group: 'kees',
      label: level,
      hint,
      keywords: 'mascot parrot',
      current: ctx.kees === level,
      run: () => ctx.setKees(level),
      confirm,
    })
  }

  out.push({
    id: 'data:export',
    group: 'data',
    label: 'export everything',
    hint: 'one JSON file',
    keywords: 'backup download save',
    run: () => {
      exportAll()
    },
    confirm: 'Backup downloaded',
  })
  out.push({
    id: 'go:settings-data',
    group: 'data',
    label: 'import or reset',
    hint: 'in settings',
    keywords: 'restore delete',
    run: () => navigate('/settings#data'),
  })

  return out
}

/** The theme a command previews, resolved ('auto' becomes kea-dark or kea-light). */
export const previewOf = (c: Command | undefined) => (c?.previewTheme ? resolveTheme(c.previewTheme) : null)
