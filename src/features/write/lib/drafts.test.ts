import { describe, expect, it } from 'vitest'
import { DRAFTS_KEY, MAX_DRAFTS, deleteDraft, draftTitle, draftWhen, listDrafts, newDraft, readAll, saveDraft, type KV } from './drafts'

const memory = (): KV & { data: Map<string, string> } => {
  const data = new Map<string, string>()
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) }
}

describe('drafts', () => {
  it('saves, lists newest first and deletes', () => {
    const kv = memory()
    const a = { ...newDraft('nl', 'nl-p01', 1000), text: 'eerste' }
    const b = { ...newDraft('nl', undefined, 2000), text: 'tweede' }
    saveDraft(a, kv)
    saveDraft(b, kv)
    expect(listDrafts('nl', kv).map((d) => d.text)).toEqual(['tweede', 'eerste'])
    expect(listDrafts('en', kv)).toEqual([])
    deleteDraft('nl', b.id, kv)
    expect(listDrafts('nl', kv).map((d) => d.text)).toEqual(['eerste'])
  })

  it('updates in place and keeps only the last 10 per language', () => {
    const kv = memory()
    for (let i = 0; i < 14; i++) saveDraft({ ...newDraft('en', undefined, i), text: `draft ${i}`, updatedAt: i }, kv)
    const list = listDrafts('en', kv)
    expect(list).toHaveLength(MAX_DRAFTS)
    expect(list[0].text).toBe('draft 13')
    const top = { ...list[0], text: 'draft 13 edited', updatedAt: 99 }
    saveDraft(top, kv)
    expect(listDrafts('en', kv)).toHaveLength(MAX_DRAFTS)
    expect(listDrafts('en', kv)[0].text).toBe('draft 13 edited')
  })

  it('does not store empty drafts, and removes a draft that became empty', () => {
    const kv = memory()
    const d = { ...newDraft('ar'), text: 'نص' }
    saveDraft(d, kv)
    saveDraft({ ...d, text: '   ' }, kv)
    expect(listDrafts('ar', kv)).toEqual([])
  })

  it('survives broken storage', () => {
    const kv = memory()
    kv.data.set(DRAFTS_KEY, '{not json')
    expect(readAll(kv)).toEqual({})
    const throwing: KV = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    }
    expect(listDrafts('nl', throwing)).toEqual([])
    expect(saveDraft({ ...newDraft('nl'), text: 'x' }, throwing)).toBe(false)
    expect(listDrafts('nl', null)).toEqual([])
  })

  it('makes short titles and relative times', () => {
    expect(draftTitle({ text: '' })).toBe('Empty draft')
    expect(draftTitle({ text: 'Korte zin\nmeer' })).toBe('Korte zin')
    expect(draftTitle({ text: 'een twee drie vier vijf zes zeven acht negen tien elf twaalf' }, 20)).toBe('een twee drie vier…')
    const now = new Date(2026, 9, 3, 15, 0).getTime()
    expect(draftWhen(now - 10_000, now)).toBe('just now')
    expect(draftWhen(now - 12 * 60_000, now)).toBe('12 min ago')
    expect(draftWhen(new Date(2026, 9, 3, 9, 5).getTime(), now)).toBe('today 09:05')
    expect(draftWhen(new Date(2026, 9, 2, 22, 30).getTime(), now)).toBe('yesterday 22:30')
    expect(draftWhen(new Date(2026, 8, 20).getTime(), now)).toBe('20 Sept')
  })
})
