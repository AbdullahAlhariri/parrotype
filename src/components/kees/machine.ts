import { useCallback, useEffect, useRef, useSyncExternalStore, type RefObject } from 'react'

/**
 * Kees's tiny state machine. The mood comes from props (the page decides what happened);
 * this module adds the life on top: random blinks, idle fidgets, a curious tilt on hover,
 * and beak chomps when he repeats words. Nothing here runs while the user is typing.
 */

export type KeesMood = 'idle' | 'curious' | 'celebrate' | 'oops' | 'oops-big' | 'repeat' | 'reading' | 'sleepy' | 'talk' | 'listen'

export const KEES_MOODS: KeesMood[] = ['idle', 'curious', 'celebrate', 'oops', 'oops-big', 'repeat', 'reading', 'sleepy', 'talk', 'listen']

export type KeesFidget = 'tilt' | 'ruffle' | 'bob' | 'glance'

const FIDGETS: KeesFidget[] = ['tilt', 'ruffle', 'bob', 'glance']
const FIDGET_MS: Record<KeesFidget, number> = { tilt: 1300, ruffle: 650, bob: 760, glance: 1400 }
const POKE_COOLDOWN_MS = 6000
const CHOMP_MS = 220
/** time between repeated words: "wordt." ... "wordt." ... "wordt." */
export const WORD_GAP_MS = 520

/** 2.5 to 7 s between blinks; about 15% of blinks are doubles. */
export function nextBlink(rand: () => number = Math.random): { delay: number; double: boolean } {
  return { delay: 2500 + rand() * 4500, double: rand() < 0.15 }
}

/** 12 to 26 s between idle fidgets. */
export function nextFidget(rand: () => number = Math.random): { delay: number; fidget: KeesFidget } {
  return { delay: 12000 + rand() * 14000, fidget: FIDGETS[Math.floor(rand() * FIDGETS.length)] }
}

/** Normalise the bubble prop into a list of words/phrases to reveal one by one. */
export function bubbleWords(bubble?: string | string[]): string[] {
  if (bubble == null) return []
  const list = Array.isArray(bubble) ? bubble : [bubble]
  return list.map((w) => w.trim()).filter(Boolean)
}

/** Should the bubble reveal word by word with a beak chomp per word? */
export const sequenced = (mood: KeesMood, words: string[]) => words.length > 1 && (mood === 'repeat' || mood === 'talk')

const isTyping = () => typeof document !== 'undefined' && document.body.dataset.typing === 'true'

const flag = (el: Element | null, name: string, ms: number, value = '') => {
  if (!el) return
  el.setAttribute(name, value)
  window.setTimeout(() => el.getAttribute(name) === value && el.removeAttribute(name), ms)
}

/** One beak open/close (used per repeated word). */
export function chomp(el: Element | null) {
  if (!el) return
  el.removeAttribute('data-chomp')
  // force the animation to restart when chomps come close together
  void (el as SVGElement).getBoundingClientRect()
  flag(el, 'data-chomp', CHOMP_MS + 40)
}

const reducedQuery = '(prefers-reduced-motion: reduce)'
const subscribeReduced = (cb: () => void) => {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const mq = window.matchMedia(reducedQuery)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}
const getReduced = () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(reducedQuery).matches

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReduced, getReduced, () => false)
}

interface LifeOptions {
  mood: KeesMood
  /** quiet level or reduced motion: blink only */
  still: boolean
  /** liveliness setting allows fidgets */
  lively: boolean
}

/** Blink and fidget loops. Returns poke(), which tilts his head (hover / focus), with a cooldown. */
export function useKeesLife(ref: RefObject<SVGSVGElement | null>, { mood, still, lively }: LifeOptions) {
  const lastPoke = useRef(-Infinity)
  const moodRef = useRef(mood)
  useEffect(() => {
    moodRef.current = mood
  }, [mood])

  useEffect(() => {
    let timer = 0
    const schedule = () => {
      const { delay, double } = nextBlink()
      timer = window.setTimeout(() => {
        const el = ref.current
        if (el && !document.hidden && !isTyping()) {
          flag(el, 'data-blink', 170)
          if (double) window.setTimeout(() => flag(ref.current, 'data-blink', 170), 260)
        }
        schedule()
      }, delay)
    }
    schedule()
    return () => window.clearTimeout(timer)
  }, [ref])

  useEffect(() => {
    if (still || !lively) return
    let timer = 0
    const schedule = () => {
      const { delay, fidget } = nextFidget()
      timer = window.setTimeout(() => {
        const el = ref.current
        if (el && moodRef.current === 'idle' && !document.hidden && !isTyping()) flag(el, 'data-fidget', FIDGET_MS[fidget], fidget)
        schedule()
      }, delay)
    }
    schedule()
    return () => window.clearTimeout(timer)
  }, [ref, still, lively])

  const poke = useCallback(() => {
    const el = ref.current
    if (!el || still || !lively || moodRef.current !== 'idle') return
    const now = performance.now()
    if (now - lastPoke.current < POKE_COOLDOWN_MS) return
    lastPoke.current = now
    flag(el, 'data-fidget', FIDGET_MS.tilt, 'tilt')
  }, [ref, still, lively])

  return { poke }
}
