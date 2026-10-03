import type { Lang } from '@/types'
import type { DrillItem, DrillPack } from './types'
import { NL_PACKS } from './nl'
import { EN_PACKS } from './en'
import { AR_PACKS } from './ar'

export type { DrillItem, DrillPack, Explained } from './types'

export const PACKS: Record<Lang, DrillPack[]> = { nl: NL_PACKS, en: EN_PACKS, ar: AR_PACKS }

export const ALL_PACKS: DrillPack[] = [...NL_PACKS, ...EN_PACKS, ...AR_PACKS]

export const packsFor = (lang: Lang): DrillPack[] => PACKS[lang]

export const findPack = (id: string): DrillPack | undefined => ALL_PACKS.find((p) => p.id === id)

/** The pack after this one in the same language, wrapping around. */
export function nextPack(id: string): DrillPack | undefined {
  const pack = findPack(id)
  if (!pack) return undefined
  const list = PACKS[pack.lang]
  return list[(list.indexOf(pack) + 1) % list.length]
}

/** The sentence with its gap filled in: fill('Ik {{word}} moe.', 'wordt') -> 'Ik wordt moe.' */
export const fillGap = (item: Pick<DrillItem, 'sentence' | 'answer'>, word = item.answer) =>
  item.sentence.replace(/\{\{[^{}]+\}\}/, () => word)

/** Text before and after the gap. */
export function splitGap(sentence: string): [before: string, after: string] {
  const m = /\{\{[^{}]+\}\}/.exec(sentence)
  if (!m) return [sentence, '']
  return [sentence.slice(0, m.index), sentence.slice(m.index + m[0].length)]
}
