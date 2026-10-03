import { it } from 'vitest'
import { alignWords, classifyOps, scoreAlignment, charDiff } from './align'
import type { Lang } from '@/types'

const cases: [string, string, Lang, object?][] = [
  ['Hij wordt morgen dertig jaar.', 'hij word morgen dertig jaar', 'nl'],
  ['Ik ga naar het ziekenhuis.', 'Ik ga naar het zieken huis.', 'nl'],
  ['Dat is te veel.', 'Dat is teveel.', 'nl'],
  ['Ik heb het boek gelezen.', 'Ik heb boek gelezen.', 'nl'],
  ['Gisteren ging ik naar huis.', 'Gisteren ik ging naar huis.', 'nl'],
  ['Hij vindt het leuk.', 'Hij vind het leuk.', 'nl'],
  ['Word je morgen dertig?', 'Wordt je morgen dertig?', 'nl'],
  ['Ik word moe.', 'Ik wordt moe.', 'nl'],
  ['Het is gebeurd.', 'Het is gebeurt.', 'nl'],
  ['Hij is groter dan ik.', 'Hij is groter als ik.', 'nl'],
  ['ذهبت إلى المدرسة.', 'ذهبت الى المدرسه', 'ar'],
  ['The cat sat on the mat.', 'The cat sat on teh mat', 'en'],
  ['a b c', 'a  b   c', 'en'],
  ['', 'hallo', 'nl'],
  ['hallo', '', 'nl'],
  ['Het is 1.000 euro.', 'Het is 1000 euro.', 'nl'],
  ["Zo'n mooie dag.", 'Zon mooie dag.', 'nl'],
  ['Ik zie je morgen.', 'Ik zie je morgen!', 'nl'],
  ['Ik zie je morgen.', 'Ikzie je morgen.', 'nl'],
  ['de pannenkoek', 'de pannen koek', 'nl'],
  ['een nieuwe fiets', 'een nieuwefiets', 'nl'],
  ['in ieder geval', 'inieder geval', 'nl'],
  ['ik heb', 'ik hep', 'nl'],
]

it('probe', () => {
  for (const [e, t, lang, o] of cases) {
    const ops = alignWords(e, t, o)
    const labels = classifyOps(ops, lang)
    console.log(`## ${e} || ${t}`)
    ops.forEach((op, k) => console.log(`   ${op.op} [${op.expected ?? ''}] -> [${op.typed ?? ''}]${op.punct ? ' P' : ''} :: ${labels[k] ? `${labels[k]!.kind}/${labels[k]!.tag ?? '-'} ${labels[k]!.tip.en.slice(0, 50)}` : ''}`))
    console.log('   score', JSON.stringify(scoreAlignment(ops)))
  }
  console.log(JSON.stringify(charDiff('wordt', 'word')))
  // perf
  const words = 'de kat zit op de mat en kijkt naar de vogels in de tuin terwijl de zon schijnt'.split(' ')
  const big = Array.from({ length: 300 }, (_, i) => words[i % words.length]).join(' ')
  const typed = big.replace(/kat/g, 'kta').replace(/ de /g, ' ')
  let t0 = performance.now()
  alignWords(big, typed)
  console.log('300 words ms', performance.now() - t0)
  const big2 = Array.from({ length: 1000 }, (_, i) => words[i % words.length]).join(' ')
  t0 = performance.now()
  alignWords(big2, big2.replace(/zon/g, 'zoon'))
  console.log('1000 words ms', performance.now() - t0)
  t0 = performance.now()
  alignWords('Ik ga morgen naar het ziekenhuis om mijn oma te bezoeken, want zij is ziek.', 'ik ga morgen naar het zieken huis om me oma te bezoeke want zij is ziek')
  console.log('sentence ms', performance.now() - t0)
})
