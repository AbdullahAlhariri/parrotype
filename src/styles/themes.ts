/**
 * Theme registry. Every theme is a set of CSS custom properties on :root.
 *
 * Pigments come from photo-derived bird palettes (see docs/research/design-not-ai.md §4.2):
 *   kea       Manu (G-Thomson/Manu): #6C803A #7B5C34 #AB7C47 #CCAE42 #D73202 #272318 #D3CDBF
 *   lorikeet  ochRe (ropenscilabs/ochRe): #486030 #c03018 #f0a800 #484878 #a8c018 #609048
 *   macaw     birdcolors (Tonelli & Youngflesh): #FF3D3F #3870C5 #E0AD04 #262A31 #B8CBDE #33794A
 * Accents were lightened (dark) or darkened (light) until every text token passes WCAG AA
 * on both --bg and --surface. themes.test.ts keeps it that way.
 */

export type ThemeScheme = 'dark' | 'light'

export interface Theme {
  id: string
  /** lowercase display name, e.g. "kea dark" */
  name: string
  /** the bird the pigments come from */
  species: 'kea' | 'lorikeet' | 'macaw'
  scheme: ThemeScheme
  /** CSS custom properties, keys include the leading `--` */
  colors: Record<string, string>
}

/** Tokens that carry text and must reach 4.5:1 on --bg and --surface. */
export const TEXT_TOKENS = ['--text', '--sub', '--main', '--error', '--error-extra', '--grammar', '--ok'] as const

const kea = (scheme: ThemeScheme, c: Record<string, string>): Theme => ({
  id: `kea-${scheme}`,
  name: `kea ${scheme}`,
  species: 'kea',
  scheme,
  colors: c,
})
const lorikeet = (scheme: ThemeScheme, c: Record<string, string>): Theme => ({
  id: `lorikeet-${scheme}`,
  name: `lorikeet ${scheme}`,
  species: 'lorikeet',
  scheme,
  colors: c,
})
const macaw = (scheme: ThemeScheme, c: Record<string, string>): Theme => ({
  id: `macaw-${scheme}`,
  name: `macaw ${scheme}`,
  species: 'macaw',
  scheme,
  colors: c,
})

export const THEMES: Theme[] = [
  kea('dark', {
    '--bg': '#272318',
    '--surface': '#312C1F',
    '--border': '#4A4433',
    '--text': '#EEE8D8',
    '--sub': '#9D957B',
    '--caret': '#B9CC5E',
    '--main': '#DDBE4F',
    '--error': '#FF9A6E',
    '--error-extra': '#E5764F',
    '--grammar': '#8EC3EA',
    '--ok': '#A3B860',
    '--kees-head': '#8CA14A',
    '--kees-body': '#7E9242',
    '--kees-shade': '#5C6E2E',
    '--kees-face': '#8CA14A',
    '--kees-beak': '#D9D2C3',
    '--kees-beak-lo': '#A39B8A',
    '--kees-ring': '#E7C653',
    '--kees-flash': '#FF6A3D',
    '--kees-flash-2': '#F2A93B',
    '--kees-eye': '#1C1A12',
  }),
  kea('light', {
    '--bg': '#E6E9D8',
    '--surface': '#DADEC9',
    '--border': '#B9BEA4',
    '--text': '#272318',
    '--sub': '#625E4C',
    '--caret': '#4E6018',
    '--main': '#6A4E0F',
    '--error': '#A32900',
    '--error-extra': '#741F00',
    '--grammar': '#1D5486',
    '--ok': '#45561C',
    '--kees-head': '#6C803A',
    '--kees-body': '#627535',
    '--kees-shade': '#46562A',
    '--kees-face': '#6C803A',
    '--kees-beak': '#4A463F',
    '--kees-beak-lo': '#2E2B26',
    '--kees-ring': '#B08A1E',
    '--kees-flash': '#D73202',
    '--kees-flash-2': '#E08A12',
    '--kees-eye': '#1C1A12',
  }),
  lorikeet('dark', {
    '--bg': '#1A1B2E',
    '--surface': '#232539',
    '--border': '#383B5A',
    '--text': '#EEF0E4',
    '--sub': '#9396B2',
    '--caret': '#B6CF2A',
    '--main': '#F5B21B',
    '--error': '#FF9677',
    '--error-extra': '#EC765C',
    '--grammar': '#8FC6F2',
    '--ok': '#8CC063',
    '--kees-head': '#4F78CC',
    '--kees-body': '#7FB04F',
    '--kees-shade': '#4F7D2E',
    '--kees-face': '#4F78CC',
    '--kees-beak': '#F0643C',
    '--kees-beak-lo': '#B8401F',
    '--kees-ring': '#F5B21B',
    '--kees-flash': '#FF7A45',
    '--kees-flash-2': '#F5C21B',
    '--kees-eye': '#14152A',
  }),
  lorikeet('light', {
    '--bg': '#EDF2DB',
    '--surface': '#E1E8CA',
    '--border': '#C2CBA6',
    '--text': '#1A1B2E',
    '--sub': '#585B74',
    '--caret': '#386116',
    '--main': '#7A5000',
    '--error': '#A3210F',
    '--error-extra': '#741706',
    '--grammar': '#1D4C87',
    '--ok': '#386116',
    '--kees-head': '#3A5FAE',
    '--kees-body': '#4F7D2E',
    '--kees-shade': '#355A1C',
    '--kees-face': '#3A5FAE',
    '--kees-beak': '#D2461F',
    '--kees-beak-lo': '#8F2E12',
    '--kees-ring': '#7A5000',
    '--kees-flash': '#C03018',
    '--kees-flash-2': '#E0A000',
    '--kees-eye': '#14152A',
  }),
  macaw('dark', {
    '--bg': '#262A31',
    '--surface': '#2F343C',
    '--border': '#434A56',
    '--text': '#EAF0F6',
    '--sub': '#97A3B3',
    '--caret': '#F2BE1D',
    '--main': '#8DB2EE',
    '--error': '#FF8F8C',
    '--error-extra': '#F07A77',
    '--grammar': '#8DB2EE',
    '--ok': '#66B482',
    '--kees-head': '#FF5A5C',
    '--kees-body': '#F04A4D',
    '--kees-shade': '#3870C5',
    '--kees-face': '#F3EEE6',
    '--kees-beak': '#EDE5D6',
    '--kees-beak-lo': '#1E2126',
    '--kees-ring': '#F2BE1D',
    '--kees-flash': '#F2BE1D',
    '--kees-flash-2': '#5C93E0',
    '--kees-eye': '#1E2126',
  }),
  macaw('light', {
    '--bg': '#E6ECF5',
    '--surface': '#D9E1EC',
    '--border': '#B7C3D3',
    '--text': '#262A31',
    '--sub': '#566070',
    '--caret': '#8C6400',
    '--main': '#2756A0',
    '--error': '#AF1B20',
    '--error-extra': '#801216',
    '--grammar': '#2756A0',
    '--ok': '#25653F',
    '--kees-head': '#E03538',
    '--kees-body': '#CF2C30',
    '--kees-shade': '#2756A0',
    '--kees-face': '#FAF7F2',
    '--kees-beak': '#D8CCB6',
    '--kees-beak-lo': '#1E2126',
    '--kees-ring': '#262A31',
    '--kees-flash': '#C99A00',
    '--kees-flash-2': '#3870C5',
    '--kees-eye': '#1E2126',
  }),
]

export const DEFAULT_THEME_ID = 'kea-dark'
export const AUTO_THEME_ID = 'auto'

/** Everything a theme picker can offer: 'auto' first, then the six real themes. */
export const THEME_CHOICES: { id: string; name: string }[] = [
  { id: AUTO_THEME_ID, name: 'auto (follows your system)' },
  ...THEMES.map((t) => ({ id: t.id, name: t.name })),
]

const byId = new Map(THEMES.map((t) => [t.id, t]))

export const getTheme = (id: string): Theme => byId.get(id) ?? byId.get(DEFAULT_THEME_ID)!

const prefersLight = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: light)').matches

/** Resolve 'auto' and unknown ids to a real theme. */
export function resolveTheme(id: string): Theme {
  if (id === AUTO_THEME_ID) return getTheme(prefersLight() ? 'kea-light' : 'kea-dark')
  return getTheme(id)
}

/** Lowercase label for any id the settings may hold, including 'auto'. */
export function themeName(id: string): string {
  if (id === AUTO_THEME_ID) return `auto, ${resolveTheme(id).name}`
  return getTheme(id).name
}

let unwatchAuto: (() => void) | null = null

/** Write a theme's tokens to :root without touching the 'auto' listener (used for live previews). */
export function paintTheme(theme: Theme) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  for (const [k, v] of Object.entries(theme.colors)) root.style.setProperty(k, v)
  root.style.colorScheme = theme.scheme
  root.dataset.theme = theme.id
  root.dataset.scheme = theme.scheme
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', theme.colors['--bg'])
}

/**
 * Apply a theme by id. 'auto' follows prefers-color-scheme (kea-dark / kea-light) and keeps
 * following it until another theme is applied. Unknown ids fall back to kea-dark.
 */
export function applyTheme(id: string) {
  unwatchAuto?.()
  unwatchAuto = null
  paintTheme(resolveTheme(id))
  if (id === AUTO_THEME_ID && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const onChange = () => paintTheme(resolveTheme(AUTO_THEME_ID))
    mq.addEventListener('change', onChange)
    unwatchAuto = () => mq.removeEventListener('change', onChange)
  }
}
