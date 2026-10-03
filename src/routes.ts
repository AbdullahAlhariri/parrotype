import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

export interface RouteDef {
  path: string
  /** label in nav and command palette */
  label: string
  /** one-line description for the command palette and home */
  blurb: string
  component: LazyExoticComponent<ComponentType>
  /** shown in the main nav */
  nav: boolean
}

export const ROUTES: RouteDef[] = [
  { path: '/', label: 'type', blurb: 'Classic typing test: time, words or quotes', component: lazy(() => import('@/features/typing/TypingPage')), nav: true },
  { path: '/listen', label: 'parrot says', blurb: 'Hear a sentence, type it back (dictation)', component: lazy(() => import('@/features/dictation/DictationPage')), nav: true },
  { path: '/write', label: 'write', blurb: 'Free writing with spelling and grammar checks', component: lazy(() => import('@/features/write/WritePage')), nav: true },
  { path: '/gym', label: 'grammar gym', blurb: 'Quick drills: d/t, de/het, its/it’s and more', component: lazy(() => import('@/features/gym/GymPage')), nav: true },
  { path: '/fix', label: 'fix it', blurb: 'Proofread a text with planted mistakes', component: lazy(() => import('@/features/proofread/ProofreadPage')), nav: true },
  { path: '/stories', label: 'stories', blurb: 'Type short stories page by page', component: lazy(() => import('@/features/stories/StoriesPage')), nav: true },
  { path: '/practice', label: 'weak spots', blurb: 'Drills built from your own mistakes', component: lazy(() => import('@/features/practice/PracticePage')), nav: true },
  { path: '/daily', label: 'daily', blurb: 'Today’s challenge, same for everyone', component: lazy(() => import('@/features/practice/DailyPage')), nav: false },
  { path: '/stats', label: 'stats', blurb: 'Speed, accuracy, weak keys and mistake history', component: lazy(() => import('@/features/stats/StatsPage')), nav: false },
  { path: '/settings', label: 'settings', blurb: 'Theme, caret, sounds, voices, checker', component: lazy(() => import('@/features/settings/SettingsPage')), nav: false },
  { path: '/about', label: 'about', blurb: 'How Parrotype works, credits and licenses', component: lazy(() => import('@/features/about/AboutPage')), nav: false },
]

export const findRoute = (path: string) => ROUTES.find((r) => r.path === path)
