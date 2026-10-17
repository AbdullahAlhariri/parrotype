import { useCallback, useEffect, useRef, useState } from 'react'
import type { Issue, Lang } from '@/types'
import { useSettings } from '@/state/settings'
import { findPrompt, randomPrompt, type PromptKind, type WritingPrompt } from '@/content/prompts'
import { addWordToDictionary, personalWords, preloadChecker, runCheck } from './lib/checker'
import { listDrafts, newDraft, saveDraft, deleteDraft as removeDraft, type Draft, type Recorded } from './lib/drafts'
import { ParagraphCache, diffRange, planCheck, reId, remapIssues, shiftIssues, splitParagraphs } from './lib/paragraphs'
import { drawableIssues } from './lib/segments'
import { isSpelling } from './lib/report'
import { addFixed, fixedFromReview, fixedFromSuggestion, materializeFixed, remapFixed, type FixedIssue } from './lib/fixed'
import { readPref, writePref } from './lib/prefs'

export type FeedbackMode = 'done' | 'live'
/** writing: no feedback yet (done mode); review: self-review, only lines are marked; revealed: underlines */
export type Phase = 'writing' | 'checking' | 'review' | 'revealed' | 'report'

/** Self-review lasts this long before the underlines appear on their own. */
export const REVIEW_MS = 60_000
/** Live mode waits this long after the last keystroke. */
export const LIVE_DEBOUNCE_MS = 700
/** Gaps longer than this do not count as writing time. */
const IDLE_GAP_MS = 15_000
/** Drafts older than this are not reopened automatically. */
const RESUME_MS = 3 * 24 * 60 * 60 * 1000

const ignoreKey = (i: Pick<Issue, 'ruleId' | 'text'>) => `${i.ruleId}|${i.text.toLowerCase()}`
/** Key used to tell whether a mistake survived self-review: rule + the fix it wants. */
const fixKey = (i: Issue) => `${i.ruleId}|${(i.replacements[0] ?? i.text).toLowerCase()}`
const byOffset = (a: Issue, b: Issue) => a.offset - b.offset || a.length - b.length

/** A newer check, a draft switch or a language switch replaced this check: not an error, just ignore it. */
export const STALE = 'stale' as const
type CheckOutcome = Issue[] | null | typeof STALE

/** What Finish hands to the report: the final text, what is still wrong in it, and what was fixed on the way. */
export interface FinishResult {
  text: string
  issues: Issue[]
  fixed: FixedIssue[]
}

function startDraft(lang: Lang, kind: PromptKind | 'all'): { draft: Draft; resumed: boolean } {
  const last = listDrafts(lang)[0]
  if (last && !last.finished && Date.now() - last.updatedAt < RESUME_MS) return { draft: last, resumed: true }
  return { draft: newDraft(lang, randomPrompt(lang, kind).id), resumed: false }
}

export function useWriteSession(lang: Lang) {
  const languageTool = useSettings((s) => s.languageTool)

  const [kind, setKindState] = useState<PromptKind | 'all'>(() => readPref<PromptKind | 'all'>('kind', 'all'))
  const [mode, setModeState] = useState<FeedbackMode>(() => readPref<FeedbackMode>('feedback', 'done'))
  const [initial] = useState(() => startDraft(lang, kind))
  const [draft, setDraft] = useState<Draft>(initial.draft)
  const [resumed, setResumed] = useState(initial.resumed)
  const [phase, setPhase] = useState<Phase>('writing')
  const [issues, setIssues] = useState<Issue[]>([])
  const [checkedText, setCheckedText] = useState<string | null>(null)
  const [reviewEndsAt, setReviewEndsAt] = useState(0)
  const [found, setFound] = useState<{ found: number; total: number } | null>(null)
  const [draftsVersion, setDraftsVersion] = useState(0)

  const textRef = useRef(draft.text)
  const draftRef = useRef(draft)
  const phaseRef = useRef(phase)
  const issuesRef = useRef(issues)
  const lastInputRef = useRef(0)
  const seqRef = useRef(0)
  const cacheRef = useRef(new ParagraphCache())
  const checkedRef = useRef<string | null>(null)
  const reviewKeysRef = useRef<Issue[]>([])
  /** the text when self-review started (the review's issues point into it) */
  const reviewTextRef = useRef('')
  /** ids of flagged words the user edited during self-review (a Set, so StrictMode's double updaters count once) */
  const editedInReviewRef = useRef(new Set<string>())
  draftRef.current = draft
  phaseRef.current = phase
  issuesRef.current = issues

  const prompt: WritingPrompt | undefined = findPrompt(draft.promptId)

  useEffect(() => {
    void preloadChecker(lang)
  }, [lang])

  /* ---------------- persistence ---------------- */

  useEffect(() => {
    const t = setTimeout(() => {
      if (saveDraft(draftRef.current)) setDraftsVersion((v) => v + 1)
    }, 500)
    return () => clearTimeout(t)
  }, [draft])

  useEffect(() => {
    const flush = () => saveDraft(draftRef.current)
    window.addEventListener('pagehide', flush)
    return () => {
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [])

  /* ---------------- filtering ---------------- */

  const filterKnown = useCallback(
    (list: Issue[]) => {
      const ignored = new Set(draftRef.current.ignored)
      const personal = personalWords(lang)
      return list.filter((i) => !ignored.has(ignoreKey(i)) && !(isSpelling(i) && personal.has(i.text.toLowerCase())))
    },
    [lang],
  )

  /* ---------------- checking ---------------- */

  /**
   * Check the text. 'full' checks it in one go (optionally with LanguageTool); 'paragraphs' only
   * checks paragraphs it has not seen. Results are moved onto the current text if the user kept
   * typing meanwhile. Returns null when the checker failed and STALE when something newer replaced it.
   */
  const check = useCallback(
    async (text: string, how: { full: boolean; lt?: boolean }): Promise<CheckOutcome> => {
      const seq = ++seqRef.current
      let result: Issue[] | null
      if (how.full) {
        const res = await runCheck(text, lang, { languageTool: !!how.lt && languageTool })
        result = res && reId([...res].sort(byOffset))
      } else {
        const plan = planCheck(text, lang, cacheRef.current)
        const fresh = await Promise.all(
          plan.todo.map(async (p) => {
            const r = await runCheck(p.text, lang, { languageTool: false })
            if (!r) return null
            cacheRef.current.set(lang, p.text, r)
            return shiftIssues(r, p.start)
          }),
        )
        // all paragraph checks failing means the checker is broken; some failing just leaves gaps
        result = plan.todo.length && fresh.every((f) => f === null) ? null : reId([...plan.known, ...fresh.flatMap((f) => f ?? [])].sort(byOffset))
      }
      if (seq !== seqRef.current) return STALE
      if (!result) return null
      // Keep LanguageTool's verdicts when this round did not ask it.
      if (!(how.full && how.lt && languageTool)) {
        const lt = issuesRef.current.filter((i) => i.source === 'languagetool')
        if (lt.length) result = reId([...result, ...remapIssues(lt, textRef.current, text).kept].sort(byOffset))
      }
      result = filterKnown(result)
      if (textRef.current !== text) result = remapIssues(result, text, textRef.current).kept
      checkedRef.current = text
      setCheckedText(text)
      return drawableIssues(textRef.current, result)
    },
    [lang, languageTool, filterKnown],
  )

  /* ---------------- text changes ---------------- */

  const setText = useCallback((next: string) => {
    const prev = textRef.current
    if (next === prev) return
    textRef.current = next
    const now = Date.now()
    const gap = now - lastInputRef.current
    lastInputRef.current = now
    setResumed(false)
    setDraft((d) => ({
      ...d,
      text: next,
      updatedAt: now,
      activeMs: d.activeMs + (gap < IDLE_GAP_MS ? gap : 0),
      ...(d.fixed?.length ? { fixed: remapFixed(d.fixed, prev, next) } : {}),
    }))
    setIssues((cur) => {
      if (!cur.length) return cur
      const r = remapIssues(cur, prev, next)
      if (phaseRef.current === 'review') for (const d of r.dropped) editedInReviewRef.current.add(d.id)
      return r.kept
    })
  }, [])

  // Live mode: check changed paragraphs shortly after the user stops typing.
  useEffect(() => {
    if (mode !== 'live' || phase === 'report' || phase === 'checking') return
    const text = draft.text
    if (text === checkedText) return
    const t = setTimeout(async () => {
      const res = await check(text, { full: false })
      if (Array.isArray(res) && phaseRef.current !== 'report') {
        setIssues(res)
        if (phaseRef.current !== 'revealed') setPhase('revealed')
      }
    }, LIVE_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [mode, phase, draft.text, checkedText, check])

  /* ---------------- review flow (done mode) ---------------- */

  /** Check the whole text and start self-review. Resolves false when the checker failed. */
  const review = useCallback(async (): Promise<boolean> => {
    const text = textRef.current
    if (!text.trim()) return true
    setPhase('checking')
    const res = await check(text, { full: true, lt: true })
    if (res === STALE) return true
    if (!res) {
      setPhase(issuesRef.current.length ? 'revealed' : 'writing')
      return false
    }
    setIssues(res)
    if (!res.length) {
      setPhase('revealed')
      setFound(null)
      return true
    }
    reviewKeysRef.current = res
    reviewTextRef.current = text
    editedInReviewRef.current = new Set()
    setFound(null)
    setReviewEndsAt(Date.now() + REVIEW_MS)
    setPhase('review')
    return true
  }, [check])

  const reveal = useCallback(async () => {
    if (phaseRef.current !== 'review') return
    const text = textRef.current
    let next = issuesRef.current
    const edited = editedInReviewRef.current.size
    if (edited > 0) {
      setPhase('checking')
      const res = await check(text, { full: true })
      if (res === STALE) return
      next = res ?? next
      setIssues(next)
      const found = foundInReview(reviewKeysRef.current, next, editedInReviewRef.current)
      setFound({ found: found.length, total: reviewKeysRef.current.length })
      // found yourself is still a mistake you made: it goes in the report and the stats too
      if (found.length) setDraft((d) => ({ ...d, fixed: addFixed(d.fixed, fixedFromReview(found, reviewTextRef.current, d.recorded?.keys)) }))
    }
    setPhase('revealed')
  }, [check])

  // Reveal on its own when the self-review time is up.
  useEffect(() => {
    if (phase !== 'review') return
    const t = setTimeout(() => void reveal(), Math.max(0, reviewEndsAt - Date.now()))
    return () => clearTimeout(t)
  }, [phase, reviewEndsAt, reveal])

  /** After a fix, re-check only the paragraph it was in. */
  const recheckAt = useCallback(
    async (offset: number) => {
      const text = textRef.current
      const para = splitParagraphs(text).find((p) => offset >= p.start && offset <= p.end)
      if (!para || !para.text.trim()) return
      const res = await runCheck(para.text, lang, { languageTool: false })
      if (!res || textRef.current !== text) return
      cacheRef.current.set(lang, para.text, res)
      const fresh = filterKnown(shiftIssues(res, para.start))
      setIssues((cur) => {
        const outside = cur.filter((i) => i.offset + i.length < para.start || i.offset > para.end || i.source === 'languagetool')
        return drawableIssues(text, reId([...outside, ...fresh].sort(byOffset)))
      })
      // If this paragraph holds the only change since the last check, the text counts as checked again.
      const since = checkedRef.current === null ? null : diffRange(checkedRef.current, text)
      if (mode === 'live' || !since || (since.start >= para.start && since.newEnd <= para.end)) {
        checkedRef.current = text
        setCheckedText(text)
      }
    },
    [lang, filterKnown, mode],
  )

  /* ---------------- issue actions ---------------- */

  /** A fix from an underline: `before` is the text just before `rep` replaced the issue. */
  const noteFixed = useCallback((issue: Issue, rep: string, before: string) => {
    setDraft((d) => ({ ...d, fixed: addFixed(d.fixed, [fixedFromSuggestion(issue, rep, before, d.recorded?.keys)]) }))
  }, [])

  const ignore = useCallback((issue: Issue) => {
    const key = ignoreKey(issue)
    setDraft((d) => (d.ignored.includes(key) ? d : { ...d, ignored: [...d.ignored, key] }))
    draftRef.current = { ...draftRef.current, ignored: [...draftRef.current.ignored, key] }
    setIssues((cur) => cur.filter((i) => ignoreKey(i) !== key))
  }, [])

  const addToDictionary = useCallback(
    async (issue: Issue) => {
      const word = issue.text
      await addWordToDictionary(word, lang)
      cacheRef.current.clear()
      setIssues((cur) => cur.filter((i) => !(isSpelling(i) && i.text.toLowerCase() === word.toLowerCase())))
    },
    [lang],
  )

  /* ---------------- finishing ---------------- */

  /**
   * Final full check for the report. Resolves null (and goes back to where it was) when the checker
   * failed, STALE when the user moved on to another draft or language meanwhile.
   */
  const finish = useCallback(async (): Promise<FinishResult | null | typeof STALE> => {
    const text = textRef.current
    if (!text.trim()) return STALE
    const before = phaseRef.current
    setPhase('checking')
    const res = await check(text, { full: true, lt: true })
    if (res === STALE) return STALE
    if (!res) {
      // never show a clean report for a text nobody could read
      setPhase(before === 'checking' || before === 'report' ? 'writing' : before)
      return null
    }
    setIssues(res)
    setPhase('report')
    // the check moved its results onto whatever the text is now
    const final = textRef.current
    return { text: final, issues: res, fixed: materializeFixed(final, draftRef.current.fixed, res) }
  }, [check])

  const markFinished = useCallback((recorded: Recorded) => {
    setDraft((d) => ({ ...d, finished: true, recorded }))
  }, [])

  const keepWriting = useCallback(() => {
    // an open draft is unfinished again, so it reopens after a reload
    setDraft((d) => (d.finished ? { ...d, finished: false } : d))
    setPhase(issuesRef.current.length || mode === 'live' ? 'revealed' : 'writing')
  }, [mode])

  /* ---------------- drafts and prompts ---------------- */

  const resetFor = useCallback((d: Draft) => {
    saveDraft(draftRef.current)
    seqRef.current++
    textRef.current = d.text
    draftRef.current = d
    lastInputRef.current = 0
    setDraft(d)
    setIssues([])
    checkedRef.current = null
    setCheckedText(null)
    setFound(null)
    setPhase('writing')
    setDraftsVersion((v) => v + 1)
  }, [])

  const startNew = useCallback(
    (withPrompt = true) => {
      resetFor(newDraft(lang, withPrompt ? randomPrompt(lang, kind, draftRef.current.promptId).id : undefined))
      setResumed(false)
    },
    [lang, kind, resetFor],
  )

  const openDraft = useCallback(
    (d: Draft) => {
      resetFor({ ...d, finished: false })
      setResumed(false)
    },
    [resetFor],
  )

  const deleteDraft = useCallback(
    (id: string) => {
      removeDraft(lang, id)
      if (id === draftRef.current.id) resetFor(newDraft(lang, randomPrompt(lang, kind).id))
      setDraftsVersion((v) => v + 1)
    },
    [lang, kind, resetFor],
  )

  // Switching the practice language opens that language's latest draft (or a fresh one).
  const langRef = useRef(lang)
  useEffect(() => {
    if (langRef.current === lang) return
    langRef.current = lang
    cacheRef.current.clear()
    const next = startDraft(lang, kind)
    resetFor(next.draft)
    setResumed(next.resumed)
  }, [lang, kind, resetFor])

  const setPrompt = useCallback((p: WritingPrompt | undefined) => setDraft((d) => ({ ...d, promptId: p?.id })), [])
  const shuffle = useCallback(() => setPrompt(randomPrompt(lang, kind, draftRef.current.promptId)), [lang, kind, setPrompt])

  const setKind = useCallback(
    (k: PromptKind | 'all') => {
      setKindState(k)
      writePref('kind', k)
      const cur = findPrompt(draftRef.current.promptId)
      if (k !== 'all' && cur?.kind !== k) setPrompt(randomPrompt(lang, k))
    },
    [lang, setPrompt],
  )

  const setMode = useCallback(
    (m: FeedbackMode) => {
      setModeState(m)
      writePref('feedback', m)
      if (m === 'done' && phaseRef.current === 'revealed' && textRef.current !== checkedText) {
        // switching back to "when I'm done" hides feedback until the next review
        setIssues([])
        setPhase('writing')
      }
      if (m === 'live' && (phaseRef.current === 'writing' || phaseRef.current === 'review')) setPhase('revealed')
    },
    [checkedText],
  )

  return {
    lang,
    draft,
    text: draft.text,
    prompt,
    kind,
    mode,
    phase,
    issues,
    found,
    resumed,
    reviewEndsAt,
    dirty: draft.text !== checkedText,
    draftsVersion,
    setText,
    setKind,
    setMode,
    setPrompt,
    shuffle,
    review,
    reveal,
    recheckAt,
    ignore,
    addToDictionary,
    noteFixed,
    finish,
    markFinished,
    keepWriting,
    startNew,
    openDraft,
    deleteDraft,
  }
}

export type WriteSession = ReturnType<typeof useWriteSession>

/**
 * Self-review: which of the review's issues the writer fixed before the reveal. An issue counts
 * when its word was edited and the fix it wanted is asked for fewer times than before.
 */
export function foundInReview(reviewed: readonly Issue[], after: readonly Issue[], edited: ReadonlySet<string>): Issue[] {
  const left = new Map<string, number>()
  for (const i of after) left.set(fixKey(i), (left.get(fixKey(i)) ?? 0) + 1)
  const groups = new Map<string, Issue[]>()
  for (const i of reviewed) groups.set(fixKey(i), [...(groups.get(fixKey(i)) ?? []), i])
  const out: Issue[] = []
  for (const [key, list] of groups) {
    const gone = Math.max(0, list.length - (left.get(key) ?? 0))
    out.push(...list.filter((i) => edited.has(i.id)).slice(0, gone))
  }
  return out.sort(byOffset)
}
