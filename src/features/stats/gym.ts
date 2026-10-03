import type { IssueCategory, Lang } from '@/types'

// Which grammar-gym pack drills the mistake a checker rule caught. Pack ids and titles mirror
// src/content/drills (gym.test.ts keeps them in sync); importing the packs here would pull every
// drill sentence into the stats page.

export interface GymPack {
  id: string
  lang: Lang
  /** the pack's contrast, e.g. 'word / wordt' */
  title: string
  /** spelling packs get the wavy underline, the rest the grammar one */
  spelling?: boolean
}

export const GYM_PACKS: Record<string, GymPack> = {
  'nl.dt': { id: 'nl.dt', lang: 'nl', title: 'word / wordt' },
  'nl.participle': { id: 'nl.participle', lang: 'nl', title: 'gebeurd / gebeurt' },
  'nl.kofschip': { id: 'nl.kofschip', lang: 'nl', title: 'fietste / woonde' },
  'nl.de-het': { id: 'nl.de-het', lang: 'nl', title: 'de / het' },
  'nl.die-dat': { id: 'nl.die-dat', lang: 'nl', title: 'die / dat' },
  'nl.hun-hen': { id: 'nl.hun-hen', lang: 'nl', title: 'zij / hun / hen' },
  'nl.als-dan': { id: 'nl.als-dan', lang: 'nl', title: 'als / dan' },
  'nl.jou-jouw': { id: 'nl.jou-jouw', lang: 'nl', title: 'jou / jouw' },
  'nl.me-mijn': { id: 'nl.me-mijn', lang: 'nl', title: 'me / mijn' },
  'nl.ei-ij': { id: 'nl.ei-ij', lang: 'nl', title: 'ei / ij', spelling: true },
  'nl.au-ou': { id: 'nl.au-ou', lang: 'nl', title: 'au / ou', spelling: true },
  'nl.trema-apostrof': { id: 'nl.trema-apostrof', lang: 'nl', title: "ideeën / auto's", spelling: true },
  'nl.compounds': { id: 'nl.compounds', lang: 'nl', title: 'tandarts / tand arts', spelling: true },
  'en.its': { id: 'en.its', lang: 'en', title: "its / it's" },
  'en.your': { id: 'en.your', lang: 'en', title: "your / you're" },
  'en.their': { id: 'en.their', lang: 'en', title: "their / there / they're" },
  'en.then-than': { id: 'en.then-than', lang: 'en', title: 'then / than' },
  'en.lose-loose': { id: 'en.lose-loose', lang: 'en', title: 'lose / loose' },
  'en.affect-effect': { id: 'en.affect-effect', lang: 'en', title: 'affect / effect' },
  'en.whose': { id: 'en.whose', lang: 'en', title: "whose / who's" },
  'en.to-too': { id: 'en.to-too', lang: 'en', title: 'to / too / two' },
  'en.a-an': { id: 'en.a-an', lang: 'en', title: 'a / an' },
  'en.since-for': { id: 'en.since-for', lang: 'en', title: 'since / for' },
  'en.make-do': { id: 'en.make-do', lang: 'en', title: 'make / do' },
  'en.lend-teach': { id: 'en.lend-teach', lang: 'en', title: 'lend / borrow, teach / learn' },
  'ar.hamza': { id: 'ar.hamza', lang: 'ar', title: 'أ / إ / ا', spelling: true },
  'ar.taa': { id: 'ar.taa', lang: 'ar', title: 'ة / ه', spelling: true },
  'ar.alif-maqsura': { id: 'ar.alif-maqsura', lang: 'ar', title: 'ى / ي', spelling: true },
}

/** Checker rule id patterns (src/checker/rules) and the pack that drills the same contrast. */
const RULE_TO_PACK: [RegExp, string][] = [
  [/^nl\.(dt|agr)\./, 'nl.dt'],
  [/^nl\.past\./, 'nl.kofschip'],
  [/^nl\.(part\.|loan\.participle$)/, 'nl.participle'],
  [/^nl\.art\./, 'nl.de-het'],
  [/^nl\.rel\./, 'nl.die-dat'],
  [/^nl\.cmp\./, 'nl.als-dan'],
  [/^nl\.prn\.hun-subject$/, 'nl.hun-hen'],
  [/^nl\.prn\.me-mijn$/, 'nl.me-mijn'],
  [/^nl\.prn\.(jouw-jou|als-ik-jou)$/, 'nl.jou-jouw'],
  [/^nl\.spell\.(zei-zij|reist-rijst|lijdt-leidt)$/, 'nl.ei-ij'],
  [/^nl\.spell\.(trema|no-trema|apostrophe|plural-apostrophe)$/, 'nl.trema-apostrof'],
  [/^nl\.(compound\.(split|hyphen)|spell\.two-words)$/, 'nl.compounds'],
  [/^en\.(its-|prep-its$)/, 'en.its'],
  [/^en\.(your-youre|youre-your)$/, 'en.your'],
  [/^en\.(their-is|there-own|prep-there-noun|theyre-there|their-theyre)$/, 'en.their'],
  [/^en\.(then-than|than-then)$/, 'en.then-than'],
  [/^en\.(lose-loose|loose-lose)/, 'en.lose-loose'],
  [/^en\.(affect-noun|effect-verb)$/, 'en.affect-effect'],
  [/^en\.(whos-whose|whose-whos)$/, 'en.whose'],
  [/^en\.(too-verb|to-too|me-too|two-too)$/, 'en.to-too'],
  [/^(en\.a-an|lt:EN_A_VS_AN)$/, 'en.a-an'],
  [/^en\.since-(duration|present)$/, 'en.since-for'],
  [/^en\.(make-homework|make-photo|do-mistake|make-a-walk|make-fun)$/, 'en.make-do'],
  [/^en\.(borrow-me|lend-borrow|learn-me)$/, 'en.lend-teach'],
  [/^ar\.(hamza-|an-hamza$|final-hamza$|wasl-)/, 'ar.hamza'],
  [/^ar\.(taa-marbuta|ha-for-taa)/, 'ar.taa'],
  [/^ar\.(alif-maqsura|ya-for-maqsura|maqsura-for-ya)/, 'ar.alif-maqsura'],
]

/** The gym pack for a rule id, or null when the gym has nothing for it (punctuation, word order...). */
export function gymPackFor(ruleId: string): GymPack | null {
  // drills record their own answers as 'gym.<pack id>'
  if (ruleId.startsWith('gym.')) return GYM_PACKS[ruleId.slice(4)] ?? null
  for (const [re, id] of RULE_TO_PACK) if (re.test(ruleId)) return GYM_PACKS[id] ?? null
  return null
}

export const gymHref = (pack: GymPack) => `/gym?pack=${encodeURIComponent(pack.id)}`

/** Underline style for a rule, the same mapping the write page uses. */
export type RuleMark = 'spell' | 'grammar' | 'hint'

export type CategoryMap = ReadonlyMap<string, IssueCategory>

const fromCategory = (c: IssueCategory): RuleMark => (c === 'spelling' || c === 'typo' ? 'spell' : c === 'style' ? 'hint' : 'grammar')

/**
 * Spelling (wavy), grammar (dashed) or hint (dotted). Uses the rule pack's category when it is
 * known; otherwise guesses from the id (dictionary misses and LanguageTool spelling rules).
 */
export function ruleMark(ruleId: string, categories?: CategoryMap | null): RuleMark {
  const c = categories?.get(ruleId)
  if (c) return fromCategory(c)
  if (ruleId === 'spell' || ruleId.startsWith('spell.')) return 'spell'
  if (/^lt:.*(MORFOLOGIK|SPELL|TYPO)/i.test(ruleId)) return 'spell'
  const pack = gymPackFor(ruleId)
  if (pack) return pack.spelling ? 'spell' : 'grammar'
  if (/^(nl|en|ar)\.(spell|compound)/.test(ruleId)) return 'spell'
  return 'grammar'
}
