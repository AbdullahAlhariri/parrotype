import { writeFileSync } from 'node:fs'
import { it } from 'vitest'
import { buildContext } from './tokenize'
import { splitClauses } from './tokenize'

const T = [
  "’s Avonds eet ik. ’t Is laat.",
  "Hij zei: ‘Ik kom.’ Daarna ging hij.",
  "Kees' fiets is rock-'n-roll.",
  'Bel 06-12345678 of mail naar a.b@c.nl. Kost €3,50 (ca. 3 km).',
  'Zie https://www.nu.nl/artikel. Of www.google.nl, of nu.nl!',
  'Ik ben moe.de hond slaapt.',
  'Dat is o.a. Jan. Hij komt om 13.30 uur.',
  'Ik zag J.K. Rowling. Zij schreef boeken.',
  'Wat?! Echt waar?? Ja!!! Nee... Oké.',
  'Hij vroeg: "Kom je?" Ik zei ja.',
  '"Kom je?" vroeg hij.',
  'Ik koop appels, peren e.d. Daarna ga ik.',
  'Het is 10 min. Daarna gaan we.',
  'كيف حالك؟ أنا بخير.',
  'Ik ben het eens 😀 echt.',
  "Dit is een test\nnieuwe regel zonder punt\nNog een",
  'De 2e keer en de 1ste keer.',
  'Hij woont in de St. Janstraat.',
  'Hij is groter dan zij, maar ze zegt dat ze het weet.',
  'Is dat gebeurd? Ik ben met die man en zijn vrouw naar huis gegaan.',
  'Ik vind dat leuk.',
]
it('tok', () => {
  const out: string[] = []
  for (const t of T) {
    const ctx = buildContext(t, 'nl')
    out.push(t)
    out.push('  tokens: ' + ctx.tokens.map((k) => (k.isWord ? k.text : `<${k.text}>`)).join(' | '))
    out.push('  sents: ' + ctx.sentences.map((s) => `[${s.text}]`).join(' '))
    out.push('  clauses: ' + splitClauses(ctx).map((c) => `[${ctx.words.slice(c.from, c.to + 1).map((w) => w.text).join(' ')}${c.opener ? ' /' + c.opener : ''}]`).join(' '))
  }
  writeFileSync('/tmp/claude-0/-home-user-parrotype/48c02fc6-2338-5d25-886d-738134e4c7f2/scratchpad/tok.out', out.join('\n'))
})
