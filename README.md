# parrotype

Practise typing, spelling and grammar in **Dutch**, **English** and (basic, phase 2) **Arabic**.
Monkeytype-style typing tests, plus modes that go after the mistakes a spell checker never sees:
*hij word* vs *hij wordt*, *gebeurd* vs *gebeurt*, *then* vs *than*, *its* vs *it's*.

Your guide is Kees, a kea (an alpine parrot) with a monocle. Copy-typing is parroting, after all.

## What's inside

| Mode | Route | What it trains |
|---|---|---|
| Type | `/` | Classic typing test (time, words, quotes) with live caret, focus mode and a results screen that labels each typo (neighbour key, swapped letters, missed double, d/t...) |
| Parrot says | `/listen` | Dictation: Kees reads a sentence aloud, you type it. Hint ladder, then the rule, then a retype of the correct form |
| Write | `/write` | Free writing with prompts. Spelling (Hunspell) and grammar (hand-written rules) feedback, delayed by default so you look for mistakes yourself first |
| Grammar gym | `/gym` | Quick drills you type: d/t, gebeurd/gebeurt, 't kofschip, de/het, die/dat, ei/ij, its/it's, then/than, hamza... |
| Fix it | `/fix` | Proofread a short text with planted mistakes |
| Stories | `/stories` | Type original short stories page by page |
| Weak spots | `/practice` | Drills built from your own weak keys, bigrams and misspelled words, plus a spaced-repetition "mistake nest" |
| Daily | `/daily` | The same short challenge all day, and your streak |
| Stats | `/stats` | Accuracy and speed over time, keyboard heatmap, most-missed words, rules you trip over |

Everything runs in your browser and is stored in `localStorage`. Nothing is sent anywhere,
unless you switch on the optional LanguageTool check in settings (free-writing text only).

## How it checks your writing

1. **Known target text** (typing test, dictation, drills): a character diff, then a classifier that
   labels each slip (motor slips like neighbour keys and swapped letters vs. spelling knowledge like
   d/t or ei/ij).
2. **Free text**: a Web Worker runs [Hunspell](https://hunspell.github.io/) (compiled to WebAssembly)
   for spelling, with suggestions re-ranked by word frequency and keyboard distance, plus a
   rule engine with Dutch, English and Arabic rule packs. Each rule has a friendly explanation in
   English and in the practice language, and is tested against sentences it must *not* flag.
3. **Optional**: the public [LanguageTool](https://languagetool.org) API (or your own server) as
   a second opinion.

The research behind the design (typing pedagogy, common Dutch/English/Arabic mistakes, Monkeytype
teardown, how to avoid an AI-generated look) is in [`docs/research/`](docs/research/).

## Development

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (vitest)
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build
```

Node 20 or newer.

## Deploying to Vercel

It's a static Vite app, so Vercel needs no special setup:

1. Import the repository in Vercel.
2. Framework preset **Vite** is detected (`vercel.json` also sets it): build command `npm run build`,
   output directory `dist`.
3. Deploy.

`vercel.json` rewrites every route to `index.html` (client-side routing) and sets long cache headers
for hashed assets and dictionaries. The `prebuild` script copies the Hunspell dictionaries from
`node_modules` (and `vendor/dicts/ar`) into `public/dicts`.

## Project layout

```
src/
  engine/      typing session state machine, metrics, typo classifier, alignment, drills (pure TS)
  checker/     tokenizer, rule engine, rule packs (nl/en/ar), spell worker, LanguageTool client
  features/    one folder per mode (typing, dictation, write, gym, proofread, stories, practice, stats, settings, about)
  components/  ui kit, app shell, Kees the mascot
  content/     word lists, quotes, dictation sentences, prompts, drills, stories, proofreading texts
  state/       zustand stores (settings, stats, mistake nest)
  styles/      themes and global styles
docs/          design brief and research reports
```

## Credits and licences

- Word frequencies: [hermitdave/FrequencyWords](https://github.com/hermitdave/FrequencyWords) (content CC BY-SA 4.0)
- Dutch dictionary: [OpenTaal](https://www.opentaal.org/) via [wooorm/dictionaries](https://github.com/wooorm/dictionaries) (BSD-3-Clause or CC BY 3.0)
- English dictionaries: SCOWL via wooorm/dictionaries (MIT and BSD)
- Arabic dictionary: [Ayaspell](http://ayaspell.sourceforge.net/) (used under MPL-1.1), see `vendor/dicts/ar/LICENSE.md`
- Spell engine: [hunspell-wasm](https://www.npmjs.com/package/hunspell-wasm) (used under MPL-1.1)
- Fonts (SIL OFL): Recursive, Caprasimo, Shantell Sans, Noto Naskh Arabic, Atkinson Hyperlegible Mono, IBM Plex Mono
