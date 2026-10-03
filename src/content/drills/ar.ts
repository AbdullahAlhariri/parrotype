import type { DrillPack } from './types'
import { hamza, hamzaMid, hamzaEnd } from './ar/hamza'
import { taa, alifMaqsura, tanween, wawJamaa } from './ar/letters'
import { hiddenAlif, lamShamsiyya, common } from './ar/words'
import { dadDha, dhalZay } from './ar/sounds'

/**
 * Arabic packs. Unvoweled MSA, like everyday typing; harakat are ignored when answers are
 * checked. Ordered by how often each slip shows up in written Arabic: hamza first, the review
 * pack last.
 */
export const AR_PACKS: DrillPack[] = [
  hamza,
  taa,
  alifMaqsura,
  hamzaMid,
  hamzaEnd,
  wawJamaa,
  tanween,
  hiddenAlif,
  lamShamsiyya,
  dadDha,
  dhalZay,
  common,
]
