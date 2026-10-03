import { getSettings } from '@/state/settings'

// Keystroke sounds, synthesised with WebAudio (no audio files): a soft felt-like click for
// every key and a low wooden tick for a wrong key. Off unless settings.sound is on.

type Ctx = AudioContext

let ctx: Ctx | null = null
let out: GainNode | null = null
let noise: AudioBuffer | null = null
let broken = false

function audio(): Ctx | null {
  if (ctx || broken || typeof window === 'undefined') return ctx
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) {
    broken = true
    return null
  }
  try {
    ctx = new AC({ latencyHint: 'interactive' })
  } catch {
    broken = true
    return null
  }
  out = ctx.createGain()
  out.gain.value = 0.5
  out.connect(ctx.destination)
  // 60 ms of pink-ish noise, reused for every click
  const len = Math.floor(ctx.sampleRate * 0.06)
  noise = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = noise.getChannelData(0)
  let last = 0
  for (let i = 0; i < len; i++) {
    last = 0.6 * last + 0.4 * (Math.random() * 2 - 1)
    data[i] = last
  }
  return ctx
}

function ready(): Ctx | null {
  if (!getSettings().sound) return null
  if (typeof document !== 'undefined' && document.hidden) return null
  const c = audio()
  if (!c) return null
  if (c.state === 'suspended') void c.resume()
  return c
}

const jitter = (v: number, pct: number) => v * (1 + (Math.random() * 2 - 1) * pct)

/** A short, soft click. */
export function playClick(volume = 1) {
  const c = ready()
  if (!c || !out || !noise) return
  const t = c.currentTime
  const src = c.createBufferSource()
  src.buffer = noise
  src.playbackRate.value = jitter(1, 0.04)
  const band = c.createBiquadFilter()
  band.type = 'bandpass'
  band.frequency.value = jitter(2300, 0.08)
  band.Q.value = 1.1
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(0.32 * volume, t + 0.002)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03)
  src.connect(band).connect(g).connect(out)
  src.start(t)
  src.stop(t + 0.05)

  // the key bottoming out: a tiny low thump
  const osc = c.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(jitter(150, 0.05), t)
  osc.frequency.exponentialRampToValueAtTime(90, t + 0.03)
  const og = c.createGain()
  og.gain.setValueAtTime(0.0001, t)
  og.gain.exponentialRampToValueAtTime(0.12 * volume, t + 0.003)
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.04)
  osc.connect(og).connect(out)
  osc.start(t)
  osc.stop(t + 0.05)
}

/** A low, short wooden tick for a wrong key. Never shrill. */
export function playError(volume = 1) {
  const c = ready()
  if (!c || !out) return
  const t = c.currentTime
  const osc = c.createOscillator()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(220, t)
  osc.frequency.exponentialRampToValueAtTime(150, t + 0.07)
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(0.16 * volume, t + 0.004)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09)
  osc.connect(g).connect(out)
  osc.start(t)
  osc.stop(t + 0.1)
}

/** Click for a correct key (or backspace), tick for a wrong one. */
export function playKey(correct: boolean) {
  if (correct) playClick()
  else playError()
}

/** Create/resume the audio context inside a user gesture so the first key is not silent. */
export function primeSound() {
  ready()
}
