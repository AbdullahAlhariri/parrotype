// Builds the typing-test word lists and the spell-suggestion frequency lists.
// Source: hermitdave/FrequencyWords (OpenSubtitles 2018), content CC BY-SA 4.0.
// Run manually: node scripts/build-wordlists.mjs  (output is committed)
import { mkdir, writeFile } from 'node:fs/promises'
import nspell from 'nspell'
import nl from 'dictionary-nl'
import en from 'dictionary-en'

const SRC = (l) => `https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/${l}/${l}_50k.txt`

// Words we never want to show in a practice list (subtitle corpora are rude).
const BLOCK = new Set(`kut lul klootzak klootzakken neuken neuk hoer hoeren tering kanker godverdomme kolere pik flikker
eikel trut teef sukkel kankerlijer mongool homo kak shit fuck fucking fucked bitch bitches bastard dick cock pussy whore
slut damn goddamn hell ass asshole crap bloody sex sexy naked nigger nigga fag faggot retard porn kill killed murder
dead die died gun guns drugs beer vodka`.split(/\s+/))

async function load(l) {
  const res = await fetch(SRC(l))
  if (!res.ok) throw new Error(`fetch ${l}: ${res.status}`)
  return (await res.text()).trim().split('\n').map((line) => {
    const [w, n] = line.trim().split(' ')
    return { w, n: Number(n) }
  })
}

const outWords = new URL('../src/content/words/', import.meta.url)
const outFreq = new URL('../public/freq/', import.meta.url)
await mkdir(outWords, { recursive: true })
await mkdir(outFreq, { recursive: true })

for (const [lang, dict] of [['nl', nl], ['en', en]]) {
  const spell = nspell(dict)
  const rows = await load(lang)
  const ok = rows.filter(({ w }) => /^[a-zà-ÿ'-]+$/.test(w) && !BLOCK.has(w) && spell.correct(w))
  const practice = ok.filter(({ w }) => w.length >= 2 && !w.includes("'") && !w.includes('-')).slice(0, 3000).map((r) => r.w)
  await writeFile(new URL(`${lang}.json`, outWords), JSON.stringify({ language: lang, source: 'hermitdave/FrequencyWords (CC BY-SA 4.0), filtered with Hunspell', words: practice }) + '\n')
  await writeFile(new URL(`${lang}.txt`, outFreq), ok.map((r) => r.w).join('\n') + '\n')
  console.log(lang, 'practice', practice.length, 'freq', ok.length, practice.slice(0, 12).join(' '))
}

{
  const rows = await load('ar')
  const ok = rows.filter(({ w }) => /^[ء-غف-ي]{2,}$/.test(w))
  const practice = ok.slice(0, 2000).map((r) => r.w)
  await writeFile(new URL('ar.json', outWords), JSON.stringify({ language: 'ar', source: 'hermitdave/FrequencyWords (CC BY-SA 4.0)', words: practice }) + '\n')
  await writeFile(new URL('ar.txt', outFreq), ok.map((r) => r.w).join('\n') + '\n')
  console.log('ar practice', practice.length, 'freq', ok.length, practice.slice(0, 12).join(' '))
}
