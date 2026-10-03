import { create } from 'zustand'
import type { Issue, IssueCategory, Lang } from '@/types'
import { getSettings, useSettings } from '@/state/settings'

// Opt-in second opinion from LanguageTool (docs/research/tech-stack.md §3).
// The text leaves the device, so this only runs when settings.languageTool is on.
// Never throws for network trouble: it reports through useLanguageToolStatus and returns null.

/* ------------------------------------------------------------------ */
/* Status store                                                        */
/* ------------------------------------------------------------------ */

export type LanguageToolState = 'off' | 'idle' | 'checking' | 'ok' | 'rate-limited' | 'error' | 'blocked'

export interface LanguageToolStatus {
  state: LanguageToolState
  /** one plain sentence for the UI */
  message: string
  /** epoch ms of the last state change */
  at: number
}

const MSG = {
  off: 'Off. Your text stays on this device.',
  idle: 'On. Checks run when you pause typing.',
  checking: 'Checking with LanguageTool.',
  ok: 'Checked by LanguageTool.',
  offline: "You're offline. Local checks still run.",
  blocked:
    "Can't reach LanguageTool from this page. The server may not accept browser requests (CORS), or the address is wrong.",
  tooLong: 'A paragraph is too long for LanguageTool (20 KB max). The rest was checked.',
}

const status = (state: LanguageToolState, message: string): LanguageToolStatus => ({ state, message, at: Date.now() })
const initialStatus = () => (getSettings().languageTool ? status('idle', MSG.idle) : status('off', MSG.off))

export const useLanguageToolStatus = create<LanguageToolStatus>(() => initialStatus())
/** alias: the status store, for non-React code (languageToolStatus.getState()) */
export const languageToolStatus = useLanguageToolStatus

const setStatus = (state: LanguageToolState, message: string) => useLanguageToolStatus.setState(status(state, message))

useSettings.subscribe((s, prev) => {
  if (s.languageTool === prev.languageTool && s.languageToolUrl === prev.languageToolUrl) return
  useLanguageToolStatus.setState(initialStatus())
})

/* ------------------------------------------------------------------ */
/* API shapes (subset of RuleMatchesAsJsonSerializer)                  */
/* ------------------------------------------------------------------ */

export interface LTMatch {
  message: string
  shortMessage?: string
  offset: number
  length: number
  replacements: { value: string }[]
  rule: {
    id: string
    subId?: string
    description: string
    issueType?: string
    category: { id: string; name: string }
    urls?: { value: string }[]
  }
  type?: { typeName: string }
}

export interface LTResponse {
  matches: LTMatch[]
}

export class LanguageToolError extends Error {
  status: number
  kind: 'http' | 'network' | 'rate-limit' | 'too-long'
  constructor(message: string, status: number, kind: LanguageToolError['kind']) {
    super(message)
    this.status = status
    this.kind = kind
  }
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Accepts "https://api.languagetool.org", ".../v2" or ".../v2/check". */
export function endpointUrl(url: string): string {
  const u = (url || 'https://api.languagetool.org').trim().replace(/\/+$/, '')
  if (/\/v2\/check$/.test(u)) return u
  if (/\/v2$/.test(u)) return `${u}/check`
  return `${u}/v2/check`
}

export const isPublicEndpoint = (url: string) => {
  try {
    return new URL(endpointUrl(url)).hostname.endsWith('languagetool.org')
  } catch {
    return false
  }
}

const isLocalHost = (url: string) => {
  try {
    return /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[::1\])/.test(new URL(url).hostname)
  } catch {
    return false
  }
}

export function ltLanguage(lang: Lang, variant: 'en-US' | 'en-GB' = 'en-US'): string {
  return lang === 'en' ? variant : lang
}

/** LanguageTool category / issue type -> ours. */
export function ltCategory(m: LTMatch): IssueCategory {
  const cat = m.rule.category?.id ?? ''
  const type = m.rule.issueType ?? ''
  if (type === 'misspelling' || cat === 'TYPOS' || cat === 'SPELLING' || cat === 'COMPOUNDING') return 'spelling'
  if (cat === 'CASING') return 'capitalization'
  if (cat === 'PUNCTUATION' || cat === 'TYPOGRAPHY' || type === 'typographical' || type === 'whitespace') return 'punctuation'
  if (
    ['STYLE', 'REDUNDANCY', 'PLAIN_ENGLISH', 'REPETITIONS_STYLE', 'WIKIPEDIA', 'GENDER_NEUTRALITY'].includes(cat) ||
    type === 'style' ||
    type === 'register'
  )
    return 'style'
  return 'grammar'
}

const cleanMessage = (s: string) =>
  s
    .replace(/<suggestion>(.*?)<\/suggestion>/g, '“$1”')
    .replace(/<\/?[a-z][^>]*>/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

/** Turn one match into an Issue on `text` (match offsets are relative to `shift`). */
export function matchToIssue(m: LTMatch, text: string, lang: Lang, shift = 0): Issue | null {
  const offset = m.offset + shift
  if (!Number.isInteger(offset) || m.length <= 0 || offset < 0 || offset + m.length > text.length) return null
  const flagged = text.slice(offset, offset + m.length)
  const message = cleanMessage(m.message || m.shortMessage || m.rule.description)
  const explanation = m.rule.description && m.rule.description !== message ? cleanMessage(m.rule.description) : undefined
  const ruleId = `lt:${m.rule.id}`
  return {
    id: `${ruleId}@${offset}:${m.length}`,
    ruleId,
    source: 'languagetool',
    lang,
    category: ltCategory(m),
    offset,
    length: m.length,
    text: flagged,
    message,
    // LanguageTool answers in the language of the text, so for nl/ar this is the local message too
    messageLocal: lang === 'en' ? undefined : message,
    explanation,
    explanationLocal: lang === 'en' ? undefined : explanation,
    replacements: [...new Set(m.replacements.map((r) => r.value))].filter((r) => r !== flagged).slice(0, 5),
    confidence: 'medium',
    learnMore: m.rule.urls?.[0]?.value,
  }
}

const enc = new TextEncoder()
const bytesOf = (s: string) => enc.encode(s).length
/** stay safely under the public API's 20 KB per request */
export const MAX_REQUEST_BYTES = 18_000

/** Paragraphs (lines) with their offsets; very long ones are cut at sentence ends to fit one request. */
export function splitParagraphs(text: string, maxBytes = MAX_REQUEST_BYTES): { start: number; text: string }[] {
  const out: { start: number; text: string }[] = []
  const re = /[^\n]+/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (!m[0].trim()) continue
    let start = m.index
    let rest = m[0]
    while (bytesOf(rest) > maxBytes) {
      // largest prefix that fits, ending after a sentence mark (or at least a space)
      let cut = Math.min(rest.length, maxBytes)
      while (cut > 0 && bytesOf(rest.slice(0, cut)) > maxBytes) cut = Math.floor(cut * 0.9)
      const window = rest.slice(0, cut)
      const sentence = Math.max(window.lastIndexOf('. '), window.lastIndexOf('? '), window.lastIndexOf('! '))
      const at = sentence > cut / 3 ? sentence + 2 : window.lastIndexOf(' ') > 0 ? window.lastIndexOf(' ') + 1 : cut
      out.push({ start, text: rest.slice(0, at) })
      start += at
      rest = rest.slice(at)
    }
    if (rest.trim()) out.push({ start, text: rest })
  }
  return out
}

/** FNV-1a, enough to key a cache of paragraphs */
function hash(s: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36) + s.length.toString(36)
}

/** Sliding one-minute window over request count and bytes. */
export class SlidingWindow {
  private ev: { t: number; bytes: number }[] = []
  private maxReq: number
  private maxBytes: number
  private windowMs: number
  constructor(maxReq: number, maxBytes: number, windowMs = 60_000) {
    this.maxReq = maxReq
    this.maxBytes = maxBytes
    this.windowMs = windowMs
  }
  /** ms to wait before a request of `bytes` fits */
  waitMs(bytes: number, now: number): number {
    this.ev = this.ev.filter((e) => now - e.t < this.windowMs)
    let used = this.ev.reduce((s, e) => s + e.bytes, 0)
    let count = this.ev.length
    let t = now
    for (let i = 0; i < this.ev.length && (count >= this.maxReq || used + bytes > this.maxBytes); i++) {
      t = this.ev[i].t + this.windowMs
      used -= this.ev[i].bytes
      count--
    }
    return Math.max(0, t - now)
  }
  record(bytes: number, now: number) {
    this.ev.push({ t: now, bytes })
  }
}

const abortError = () => new DOMException('Aborted', 'AbortError')

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortError())
    const id = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(id)
        reject(abortError())
      },
      { once: true },
    )
  })
}

/* ------------------------------------------------------------------ */
/* Client                                                              */
/* ------------------------------------------------------------------ */

export interface LanguageToolCheckOptions {
  url: string
  lang: Lang
  variant?: 'en-US' | 'en-GB'
  signal?: AbortSignal
}

export interface LanguageToolCheckResult {
  issues: Issue[]
  /** some paragraphs were skipped to respect the rate limit */
  limited: boolean
  /** some paragraphs were too long to send */
  tooLong: boolean
  /** seconds until requests are allowed again (when limited) */
  retryIn: number
}

export interface LanguageToolClientOptions {
  fetch?: typeof fetch
  now?: () => number
  /** longest we wait for the limiter before skipping a paragraph this round */
  maxWaitMs?: number
}

const LIMITS = {
  public: { req: 18, bytes: 70_000 },
  custom: { req: 120, bytes: Number.POSITIVE_INFINITY },
}

export class LanguageToolClient {
  private cache = new Map<string, LTMatch[]>()
  private limiters = new Map<string, SlidingWindow>()
  /** per endpoint: no requests before this time (after a 429) */
  private backoffUntil = new Map<string, number>()
  private fetchFn: typeof fetch
  private now: () => number
  private maxWaitMs: number

  constructor(opts: LanguageToolClientOptions = {}) {
    this.fetchFn = opts.fetch ?? ((...args) => fetch(...args))
    this.now = opts.now ?? Date.now
    this.maxWaitMs = opts.maxWaitMs ?? 3_000
  }

  async check(text: string, o: LanguageToolCheckOptions): Promise<LanguageToolCheckResult> {
    const url = endpointUrl(o.url)
    const language = ltLanguage(o.lang, o.variant)
    const motherTongue = o.lang === 'en' ? 'nl' : undefined
    const limiter = this.limiter(url)
    const out: LanguageToolCheckResult = { issues: [], limited: false, tooLong: false, retryIn: 0 }

    for (const p of splitParagraphs(text)) {
      const key = `${url}\u0000${language}\u0000${hash(p.text)}`
      let matches = this.cache.get(key)
      if (matches) {
        // refresh LRU position
        this.cache.delete(key)
        this.cache.set(key, matches)
      } else {
        const bytes = bytesOf(p.text)
        if (bytes > MAX_REQUEST_BYTES + 2_000) {
          out.tooLong = true
          continue
        }
        const now = this.now()
        const wait = Math.max((this.backoffUntil.get(url) ?? 0) - now, limiter.waitMs(bytes, now))
        if (wait > this.maxWaitMs) {
          out.limited = true
          out.retryIn = Math.max(out.retryIn, Math.ceil(wait / 1000))
          continue
        }
        if (wait > 0) await sleep(wait, o.signal)
        limiter.record(bytes, this.now())
        matches = await this.request(url, p.text, language, motherTongue, o.signal)
        this.cache.set(key, matches)
        if (this.cache.size > 300) this.cache.delete(this.cache.keys().next().value!)
      }
      for (const m of matches) {
        const is = matchToIssue(m, text, o.lang, p.start)
        if (is) out.issues.push(is)
      }
    }
    return out
  }

  /** one tiny request to see whether the endpoint answers (for a "Test connection" button) */
  async ping(url: string, signal?: AbortSignal): Promise<void> {
    const u = endpointUrl(url)
    const text = 'Dit is een test.'
    this.limiter(u).record(bytesOf(text), this.now())
    await this.request(u, text, 'nl', undefined, signal)
  }

  private limiter(url: string): SlidingWindow {
    let l = this.limiters.get(url)
    if (!l) {
      const lim = isPublicEndpoint(url) ? LIMITS.public : LIMITS.custom
      l = new SlidingWindow(lim.req, lim.bytes)
      this.limiters.set(url, l)
    }
    return l
  }

  private async request(url: string, text: string, language: string, motherTongue: string | undefined, signal?: AbortSignal) {
    const body = new URLSearchParams({ text, language, level: 'default' })
    if (motherTongue) body.set('motherTongue', motherTongue)
    // form body + Accept only = a CORS "simple request", no preflight (the LT server does not answer OPTIONS)
    const init: RequestInit & { targetAddressSpace?: string } = {
      method: 'POST',
      body,
      headers: { Accept: 'application/json' },
      signal,
    }
    // Chrome's Local Network Access: lets an https page reach a LanguageTool server on this machine
    if (isLocalHost(url)) init.targetAddressSpace = 'local'
    let res: Response
    try {
      res = await this.fetchFn(url, init)
    } catch (err) {
      if (signal?.aborted) throw abortError()
      throw new LanguageToolError(err instanceof Error ? err.message : 'Network error', 0, 'network')
    }
    if (res.status === 429) {
      this.backoffUntil.set(url, this.now() + 60_000)
      throw new LanguageToolError('Rate limited', 429, 'rate-limit')
    }
    if (res.status === 413) throw new LanguageToolError('Text too long', 413, 'too-long')
    if (!res.ok) throw new LanguageToolError(`HTTP ${res.status}`, res.status, 'http')
    const json = (await res.json()) as LTResponse
    return Array.isArray(json?.matches) ? json.matches : []
  }
}

/* ------------------------------------------------------------------ */
/* App-level entry points                                              */
/* ------------------------------------------------------------------ */

export const languageTool = new LanguageToolClient()
let seq = 0

const isAbort = (err: unknown) => err instanceof DOMException && err.name === 'AbortError'

function reportError(err: unknown) {
  if (!(err instanceof LanguageToolError)) return setStatus('error', 'LanguageTool check failed. Local checks still run.')
  if (err.kind === 'rate-limit') return setStatus('rate-limited', 'LanguageTool asked us to slow down. Trying again in a minute.')
  if (err.kind === 'too-long') return setStatus('error', MSG.tooLong)
  if (err.kind === 'network') {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return setStatus('error', MSG.offline)
    return setStatus('blocked', MSG.blocked)
  }
  if (err.status === 403) return setStatus('blocked', 'LanguageTool refused the request (403). Check the server address.')
  return setStatus('error', `LanguageTool returned an error (${err.status}). Local checks still run.`)
}

/**
 * Check text with LanguageTool if the user opted in. Returns null when it is off, failed or was
 * aborted; the reason is in useLanguageToolStatus. Debouncing is the caller's job.
 */
export async function checkWithLanguageTool(text: string, lang: Lang, signal?: AbortSignal): Promise<Issue[] | null> {
  const s = getSettings()
  if (!s.languageTool) return null
  if (!text.trim()) return []
  const my = ++seq
  const prev = useLanguageToolStatus.getState()
  setStatus('checking', MSG.checking)
  try {
    const r = await languageTool.check(text, { url: s.languageToolUrl, lang, variant: s.englishVariant, signal })
    if (my === seq) {
      if (r.limited) setStatus('rate-limited', `Holding back to stay under the LanguageTool limit. Next check in ${r.retryIn} s.`)
      else if (r.tooLong) setStatus('error', MSG.tooLong)
      else setStatus('ok', MSG.ok)
    }
    return r.issues
  } catch (err) {
    if (my === seq) {
      if (isAbort(err)) useLanguageToolStatus.setState(prev.state === 'checking' ? status('idle', MSG.idle) : prev)
      else reportError(err)
    }
    return null
  }
}

/** For a "Test connection" button: does this LanguageTool address answer? */
export async function testLanguageTool(url: string = getSettings().languageToolUrl): Promise<{ ok: boolean; message: string }> {
  try {
    await languageTool.ping(url)
    return { ok: true, message: `LanguageTool answered at ${new URL(endpointUrl(url)).host}.` }
  } catch (err) {
    if (err instanceof LanguageToolError) {
      if (err.kind === 'network') return { ok: false, message: MSG.blocked }
      if (err.kind === 'rate-limit') return { ok: false, message: 'LanguageTool is rate limiting this address. Try again in a minute.' }
      return { ok: false, message: `LanguageTool returned an error (${err.status}).` }
    }
    return { ok: false, message: 'That address does not look right.' }
  }
}
