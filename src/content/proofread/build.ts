import type { PlantedMistake, ProofLang, ProofText, RuleNote } from './types'

/**
 * Texts are written once, with each planted mistake marked inline:
 *
 *   'Hoi Mark, ik [wordt>word#dt-ik] morgen ...'
 *
 * [wrong>right#rule] gives the faulty text, the corrected text and the mistake list in one
 * go, so the two versions can never drift apart. Extra accepted fixes follow a slash:
 * [Hun>Zij/Ze#hun-subj].
 */
export const MARK_RE = /\[([^[\]>#]*)>([^[\]#]*)#([a-z0-9-]+)\]/g

interface TextSource {
  id: string
  title: string
  difficulty: 1 | 2 | 3
  source: string
}

export function defineTexts(lang: ProofLang, notes: Record<string, RuleNote>, sources: TextSource[]): ProofText[] {
  return sources.map(({ source, ...meta }) => {
    let text = ''
    let corrected = ''
    let last = 0
    const mistakes: PlantedMistake[] = []
    for (const m of source.matchAll(MARK_RE)) {
      const plain = source.slice(last, m.index)
      text += plain
      corrected += plain
      const [right, ...accept] = m[2].split('/')
      const entry = notes[m[3]]
      const mistake: PlantedMistake = {
        wrong: m[1],
        right,
        at: text.length,
        fixAt: corrected.length,
        rule: m[3],
        title: entry?.title ?? m[3],
        ruleNote: entry?.note ?? { en: '' },
      }
      if (accept.length) mistake.accept = accept
      if (entry?.pack) mistake.pack = entry.pack
      mistakes.push(mistake)
      text += m[1]
      corrected += right
      last = (m.index ?? 0) + m[0].length
    }
    text += source.slice(last)
    corrected += source.slice(last)
    return { ...meta, lang, text, corrected, mistakes }
  })
}
