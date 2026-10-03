// Typing engine: framework-agnostic session, metrics, typo labels, alignment, key stats, drills.

export {
  LAYOUTS,
  layoutFor,
  keyboardRows,
  keyByCode,
  keyOf,
  areAdjacent,
  isMirror,
  sameFinger,
  sameHand,
  neighbourChar,
  bigramClass,
  composeDeadKey,
  decomposeDeadKey,
  keystrokesFor,
} from './keyboard'
export type { LayoutId, Hand, Finger, KeyDef, KeyPos, Layout, BigramClass } from './keyboard'

export { TypingSession } from './session'
export type { StopOnError, LetterState, LetterView, WordView, SessionSnapshot, SessionOptions } from './session'
export type { EngineKeyEvent, KeyOp } from './replay'

export { computeResult, countChars, perSecond, wpm, kogasa, consistency, mean, stdDev, errorStats } from './metrics'
export type { ResultInput, ResultWord, CharTally } from './metrics'

export { classifyTypo, osaDistance, editOps } from './typo'
export type { TypoLabel, TypoNature, TypoTip, ClassifyOptions, EditOp } from './typo'

export { alignWords, charDiff, scoreAlignment, tokenize, classifyOps } from './align'
export type { AlignOptions, AlignToken, WordOp, WordOpKind, CharOp, AlignmentScore } from './align'

export { keyStatsFromEvents, weaknesses, wilsonLower } from './keystats'
export type { KeyStatsResult, Weakness, WeaknessOptions } from './keystats'

export { generateWords, generateDrill, sentenceToWords, wordList } from './generator'
export type { GenerateOptions, DrillOptions } from './generator'

export { graphemes, stripMarks, stripAccents, stripTashkeel, normalizeTypingText } from './text'
