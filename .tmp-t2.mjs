import nspell from 'nspell'
import fs from 'node:fs'
const sp = nspell(fs.readFileSync('node_modules/dictionary-nl/index.aff'), fs.readFileSync('node_modules/dictionary-nl/index.dic'))
const words = process.argv.slice(2)
for (const w of words) console.log(w, sp.correct(w))
