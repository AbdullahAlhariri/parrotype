import { it } from 'vitest'
import { tokenize, buildContext, splitClauses } from './tokenize'
import { runRules } from './engine'
import { dtRules } from './rules/nl/dt'
it('smoke', () => {
  const t = "Ik ga 's avonds naar m'n opa's huis, o.a. voor zo'n e-mail. Kost 3,50 euro... Hij vindt het leuk! Bezoek www.nu.nl of mail jan@x.nl. Dhr. Jansen kwam."
  console.log(tokenize(t, 'nl').map(x => x.text + (x.isWord ? '' : '§')).join(' | '))
  const ctx = buildContext(t, 'nl')
  console.log(ctx.sentences.map(s => s.text))
  const c2 = buildContext('Hij heeft gezegd dat het gebeurt, maar ik denk dat het niet waar is. Is dat gebeurd? Het boek dat ik met die man las.', 'nl')
  console.log(splitClauses(c2).map(c => c2.words.slice(c.from, c.to + 1).map(w => w.text).join(' ') + ' [' + (c.opener ?? '') + ']'))
  for (const s of ['Ik wordt boos.', 'Vindt ik dat leuk?', 'Hij vind het leuk.', 'Jij word later dokter.', 'Wordt jij ook moe?', 'Word u al geholpen?', 'Bent je klaar?', 'Jij ben te laat.', 'Hij werdt boos.', 'Hij hout van voetbal.', 'Wij gaat naar huis.', 'Ik hebben honger.', 'U is van harte welkom.', 'Wordt je morgen opgehaald?', 'Hij ga naar huis.', 'Als ik het red, ben ik blij.', 'Het antwoord is goed.', 'omdat hij werk heeft', 'Word je morgen ook om zeven uur opgehaald, of wordt je zus eerst gebracht?']) {
    console.log(s, '=>', runRules(s, 'nl', dtRules).map(i => `${i.ruleId}:${i.text}->${i.replacements.join('/')}`))
  }
})
