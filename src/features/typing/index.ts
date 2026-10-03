// Reusable typing pieces for other features (stories, weak-spot drills, daily challenge, stats).
// The '/' page itself (TypingPage) is lazy-loaded from routes.ts and not exported here.

export { TypingSurface, type TypingSurfaceProps, type TypingProgress } from './TypingSurface'
export { OnScreenKeyboard, type OnScreenKeyboardProps } from './OnScreenKeyboard'
export { ResultView, type ResultViewProps } from './ResultView'
export { recordTypingRun, countMistakes, bestKey, PB_MIN_MS } from './recordRun'
