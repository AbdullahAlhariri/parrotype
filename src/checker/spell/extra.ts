import type { Lang } from '@/types'

// Words and phrases the dictionaries lack but this user writes all the time, so free writing never
// underlines them: chat abbreviations, loanwords, the mascots' names and species, Dutch places and
// names in Arabic script, archaic forms in fixed sayings. Found by the corpus tests (src/checker/qa).
// Lowercase entries also accept a capital (Lol) and ALL CAPS (LOL), like the personal dictionary.

const words = (s: string): string[] => s.trim().split(/\s+/)

const NL = words(`
  ff idd btw lol thx mvg grtz omg
  trekke neme kome moge zegge geve leve
  kea kees monty fustuq
  uitwaaien
`)

const EN = words(`
  ok okay lol btw omg thx idk tbh imo brb asap fyi
  kea keas kees monty fustuq curiouser
  learnt spelt dreamt spoilt leapt burnt smelt
  café cafés cliché clichés résumé résumés naïve fiancé fiancée déjà entrée entrées protégé touché rosé purée
  sauté soirée crème brûlée façade jalapeño jalapeños piñata
  gezellig gezelligheid uitwaaien stroopwafel stroopwafels hagelslag
  sabr habibi habibti yalla inshallah mashallah wallah salaam shukran marhaba ahlan iftar suhoor
`)

/**
 * Arabic: loanwords, brands and Dutch places and names in Arabic script. Matched after the proclitics
 * و ف ب ل ك and the article (بالواتساب, لأوتريخت, وروتردام), so list the bare form only.
 */
const AR = words(`
  فستق
  واتساب واتس فيسبوك إنستغرام انستغرام إنستجرام انستجرام يوتيوب تويتر تيك توك سناب سنابشات تيليجرام تلغرام
  نتفليكس غوغل جوجل أمازون إيميل ايميل أونلاين اونلاين لابتوب موبايل تابلت باسورد بلوتوث واي فاي
  بيتزا سوشي شوربة شوربا يوغا برغر همبرغر ساندويتش سندويتش كابتشينو إسبريسو كرواسون باستا كاتشب مايونيز
  أوتريخت اوتريخت أوترخت خرونينغن غرونينغن أيندهوفن ايندهوفن آيندهوفن لايدن ليدن دلفت ديلفت هارلم
  روتردام لاهاي ألميره ألمير بريدا نايميخن نيميغن أرنهيم ماستريخت أمرسفورت تيلبورغ زفولة زاندفورت زاندام
  سخيفينينغن خاودا أنتويرب خنت غنت ليوفاردن فريزلاند
  فينورد أياكس اياكس فيرستابن رايكس رايكسميوزيوم دايك فان كيس مونتي
`)

const EXTRA: Record<Lang, ReadonlySet<string>> = {
  nl: new Set(NL),
  en: new Set(EN),
  ar: new Set(AR),
}

/** proclitic splits for the Arabic list: وبالواتساب -> واتساب */
const AR_PREFIX = /^(?:[وف]?(?:[بلك]?ال|لل|[بلك])|[وف])/

/** Is this word in the extra list for the language? (lookup form: NFC, straight apostrophes) */
export function isExtraWord(word: string, lang: Lang): boolean {
  const set = EXTRA[lang]
  if (set.has(word)) return true
  const lower = word.toLowerCase()
  if (set.has(lower)) return true
  if (lang !== 'ar') return false
  const m = AR_PREFIX.exec(word)
  if (!m) return false
  // try the longest prefix first, then each shorter one (فان is a name, ف + ان is not)
  for (let k = m[0].length; k > 0; k--) {
    const core = word.slice(k)
    if (core.length >= 3 && set.has(core)) return true
  }
  return false
}

/* ------------------------------------------------------------------ */
/* Phrases from other languages                                         */
/* ------------------------------------------------------------------ */

const PHRASES: Record<Lang, string[]> = {
  en: [
    'al dente', 'de facto', 'per se', 'et al', 'ad hoc', 'à la carte', 'a la carte', 'bon appétit', 'déjà vu',
    'faux pas', 'joie de vivre', "coup d'état", 'status quo', 'carpe diem', 'pro bono', 'in situ', 'en route',
    'raison d’être', "raison d'être", 'je ne sais quoi', "c'est la vie", 'la dolce vita', 'tour de france',
    'tour de force', 'crème de la crème', 'hors d’oeuvre', "hors d'oeuvre", 'vis-à-vis', 'vice versa',
  ],
  nl: ['al dente', 'tour de france', 'à la carte', 'déjà vu', 'joie de vivre', 'carpe diem', 'status quo'],
  ar: [],
}

const PHRASE_RE: Record<Lang, RegExp | null> = Object.fromEntries(
  (Object.keys(PHRASES) as Lang[]).map((lang) => {
    const list = PHRASES[lang]
    if (!list.length) return [lang, null]
    const alt = list
      .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/['’]/g, "['’]").replace(/ /g, '\\s+'))
      .sort((a, b) => b.length - a.length)
      .join('|')
    return [lang, new RegExp(`(?<![\\p{L}\\p{M}])(?:${alt})(?![\\p{L}\\p{M}])`, 'giu')]
  }),
) as Record<Lang, RegExp | null>

/** spans of known foreign phrases (al dente, Tour de France): words inside them are not looked up */
export function phraseRanges(text: string, lang: Lang): Array<[number, number]> {
  const re = PHRASE_RE[lang]
  if (!re) return []
  const out: Array<[number, number]> = []
  re.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) out.push([m.index, m.index + m[0].length])
  return out
}
