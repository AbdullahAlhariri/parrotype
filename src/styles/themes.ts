/** Theme registry. Each theme maps CSS custom properties (see global.css). */
export interface Theme {
  id: string
  name: string
  /** 'dark' | 'light' decides the color-scheme */
  scheme: 'dark' | 'light'
  colors: Record<string, string>
}

export const THEMES: Theme[] = [
  {
    id: 'macaw',
    name: 'macaw',
    scheme: 'dark',
    colors: {
      '--bg': '#1f2320',
      '--bg-alt': '#272c28',
      '--sub': '#6f7a70',
      '--text': '#e8e4d8',
      '--main': '#f2b632',
      '--caret': '#f2b632',
      '--error': '#e5533d',
      '--error-extra': '#9c3a2b',
      '--ok': '#7fbf6a',
    },
  },
]

export function applyTheme(id: string) {
  const theme = THEMES.find((t) => t.id === id) ?? THEMES[0]
  const root = document.documentElement
  for (const [k, v] of Object.entries(theme.colors)) root.style.setProperty(k, v)
  root.style.colorScheme = theme.scheme
  root.dataset.theme = theme.id
}
