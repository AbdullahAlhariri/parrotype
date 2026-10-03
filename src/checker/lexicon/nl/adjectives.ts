// Learner adjective list (docs/research/dutch-errors.md §6.9): base -> inflected (-e) form.

const PAIRS = `groot:grote klein:kleine mooi:mooie nieuw:nieuwe oud:oude goed:goede slecht:slechte lang:lange
  kort:korte leuk:leuke lekker:lekkere rood:rode wit:witte zwart:zwarte blauw:blauwe groen:groene geel:gele duur:dure
  goedkoop:goedkope snel:snelle langzaam:langzame druk:drukke rustig:rustige belangrijk:belangrijke
  moeilijk:moeilijke makkelijk:makkelijke warm:warme koud:koude dik:dikke dun:dunne hoog:hoge laag:lage breed:brede
  smal:smalle zwaar:zware vies:vieze lief:lieve boos:boze blij:blije ziek:zieke gezond:gezonde jong:jonge
  schoon:schone vol:volle leeg:lege sterk:sterke zwak:zwakke fijn:fijne raar:rare vreemd:vreemde prachtig:prachtige
  heerlijk:heerlijke gezellig:gezellige vriendelijk:vriendelijke eerlijk:eerlijke aardig:aardige echt:echte
  grappig:grappige saai:saaie stil:stille donker:donkere bruin:bruine grijs:grijze roze:roze`

/** base -> inflected */
export const ADJ_INFLECT: ReadonlyMap<string, string> = new Map(
  PAIRS.trim().split(/\s+/).map((p) => p.split(':') as [string, string]),
)
/** inflected -> base */
export const ADJ_BASE: ReadonlyMap<string, string> = new Map(
  [...ADJ_INFLECT].filter(([b, i]) => b !== i).map(([b, i]) => [i, b] as [string, string]),
)

/** adjectives that never take -e: gouden, open, eigen, linker/rechter, lila, roze */
export const UNINFLECTED_ADJ: ReadonlySet<string> = new Set(
  'open eigen gouden zilveren houten stenen wollen linker rechter lila roze beige oranje retro plastic'.split(' '),
)

/** suffixes where dropping or adding -e is partly a matter of style: lower confidence */
export const isSoftAdjective = (base: string) => /(?:ig|isch|lijk)$/.test(base)

const IRREGULAR_COMPARATIVES = ['beter', 'meer', 'minder', 'liever']

/** comparative forms of the curated adjectives: groter, duurder, beter... */
export const COMPARATIVES: ReadonlySet<string> = new Set([
  ...IRREGULAR_COMPARATIVES,
  ...[...ADJ_INFLECT]
    .filter(([b]) => !UNINFLECTED_ADJ.has(b) && b !== 'goed')
    .map(([b, infl]) => (b.endsWith('r') ? b + 'der' : infl + 'r'))
    .filter((c) => c !== 'leger'), // leger = army
])
