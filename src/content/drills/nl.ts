import type { DrillPack } from './types'
import { dt, participle, kofschip } from './nl/verbs'
import { deHet, dieDat } from './nl/words'
import { eiIj, auOu, tremaApostrof, compounds } from './nl/spelling'
import { hunHen, alsDan, jouJouw, meMijn } from './nl/pronouns'

/** Dutch packs, in the order a learner meets them: verbs first, they cause the most slips. */
export const NL_PACKS: DrillPack[] = [
  dt,
  participle,
  kofschip,
  deHet,
  dieDat,
  alsDan,
  hunHen,
  jouJouw,
  meMijn,
  eiIj,
  auOu,
  tremaApostrof,
  compounds,
]
