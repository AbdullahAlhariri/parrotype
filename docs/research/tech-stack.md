# Parrotype tech stack: a client-side typing, spelling and grammar app (Vite + TypeScript, static on Vercel)

> Audience: the engineers building Parrotype.
> Scope: framework, animation, spell checking (nl/en/ar), LanguageTool, Web Speech dictation, open content, persistence, charts, testing, Vercel deployment, PWA.
> Research date: 2026-10-03. Package versions come from the live npm registry on that date.
> **Measured** means I ran it in this sandbox: Node 22.22.0, linux-x64, V8, so Chrome is the closest browser. **Reported** means it comes from a cited source. **Unverified** marks anything I could not check, because many sites (vercel.com, MDN, dev.languagetool.org, tatoeba.org, gutenberg.org, api.languagetool.org) are blocked by this sandbox's egress proxy. GitHub raw files, the npm registry and web search worked.

---

## 0. TL;DR: the decisions

| Area | Recommendation | Why (short) |
|---|---|---|
| UI framework | **Svelte 5** (`svelte@5.57.1`, `@sveltejs/vite-plugin-svelte@7.3.1`) for the app shell. The typing engine is a **framework-agnostic TS state machine** with a thin, imperative "typing surface". | Svelte 5 is within a few ms of vanilla in js-framework-benchmark. It ships transitions, `Spring`/`Tween` and `prefersReducedMotion`, so no animation library is needed. Measured hello-world: 10.1 KB gzip. Monkeytype uses the same hybrid: a framework shell (Solid) with an imperative words/caret renderer. |
| TypeScript | **`typescript@~6.0.3`, not 7.0.x** | `svelte-check@4.7.6` declares `typescript ^5 \|\| ^6`, and `typescript-eslint@8.71` declares `<6.1.0`. TS 7.0.2 (the native port, July 2026) would break that tooling. |
| Build | **Vite 8.3.2** (Rolldown) | Verified: Svelte 5 + Vite 8 + TS 6 + svelte-check + Vitest 5 + vite-plugin-pwa 1.3 + a hunspell WASM worker all build cleanly together (§11). |
| Animation | **CSS transitions/keyframes + WAAPI (`el.animate`) + Svelte transitions.** The caret uses `transform: translate()`. No Motion library. | Zero dependencies, compositor-friendly. `motion` `animate` measures 20.3 KB gzip; `motion/mini` 3.4 KB if ever needed. |
| Spell check | **`hunspell-wasm@0.3.0`** (real Hunspell compiled to WASM) in a **module Web Worker**, with OpenTaal (`dictionary-nl@2.0.0`), SCOWL (`dictionary-en@4.0.0` / `dictionary-en-gb@3.0.0`) and Ayaspell (ar) dictionaries, lazy-loaded per language. | Measured: nl loads in about 160 ms, ~7 µs per word check, suggestions 0–90 ms. It handles Dutch compounds correctly. **nspell does not** (it rejects *wachtwoord* and *wachttijd*), and **typo-js crashes** on the Dutch affix file. |
| Suggestion ranking | Re-rank Hunspell suggestions with a **frequency list**: FrequencyWords `nl_50k` intersected with Hunspell, plus keyboard-distance and OSA distance. Optional SymSpell index for fast typo→word lookup. | Subtitle frequency lists contain misspellings (*onmiddelijk*, *eigelijk*, *seperate* are in the top 50k), so they must never be the validity oracle. |
| Grammar | Own TS rule engine (see dutch-errors.md) plus an **optional LanguageTool** call: debounced, rate-limited, paragraph-cached, against `https://api.languagetool.org/v2/check` **or a user-configured self-hosted URL** (`erikvl87/languagetool`, which starts with `--allow-origin '*'`). | Public limits: 20 req/min/IP, 75 KB/min, 20 KB/request, and "do not send automated requests". CORS on the *public* endpoint is **unverified** (§3.5). |
| Dictation | `speechSynthesis`, **one sentence (or phrase) per utterance**, plus a voice scorer that prefers Edge "Online (Natural)", Google, then Apple/OS voices, and filters novelty and eSpeak voices. Voice metadata comes from Readium's BSD-3 recommended-voices lists. | Short utterances avoid Chrome's ~14–15 s cut-off. Chrome desktop has **no Arabic Google voice**. Chrome does not reliably fire `boundary` events. |
| Content | Tatoeba (CC BY 2.0 FR; a CC0 subset exists) for modern sentences. OpenTaal (BSD/CC BY 3.0) for word validity. FrequencyWords (CC BY-SA 4.0) for frequency. Avoid pre-1947 Dutch Gutenberg texts for spelling practice. Do **not** copy Monkeytype lists (GPL-3.0) unless Parrotype itself is GPL-3.0. | Licences and pedagogy (§5). |
| Persistence | `localStorage` for small settings read synchronously at boot. **IndexedDB via `idb@8.0.3`** (1.4 KB gzip) for results, mistakes, personal dictionary. `navigator.storage.persist()`. JSON export/import. | localStorage is synchronous, ~5 MB, strings only. Safari's 7-day eviction makes **export/import mandatory**. Installing as a Home Screen app escapes that eviction. |
| Charts | **Hand-rolled SVG** for the results WPM chart. `uPlot@1.6.32` (23 KB gzip, MIT) only if the history view needs zoom/hover over thousands of points. | Chart.js tree-shaken line chart: 54 KB gzip; `chart.js/auto`: 70 KB. |
| Tests | **Vitest 5.0.3** (rule engine, diff, tokenizer, LT client with mocked fetch). **Playwright 1.63** for e2e and screenshots. Optional Vitest browser mode via `@vitest/browser-playwright`. | Standard, Vite-native. |
| Deploy | Vercel, framework preset Vite (`vite build` → `dist`). `vercel.json` with an SPA rewrite and `Cache-Control: immutable` on `/assets/*`. Ship dictionaries as hashed **`.txt`** assets so Vercel compresses them. | Vercel only compresses listed MIME types (`text/plain` and `application/wasm` are on the list; octet-stream is not). |
| PWA | **Yes, but small:** `vite-plugin-pwa@~1.3.0`, `generateSW`. Precache the app shell and WASM. Runtime **CacheFirst** for dictionaries. | Offline practice, instant second load, and installability, which also exempts storage from Safari's 7-day cap. Wait before adopting 2.0.0, which was published on the research date. |

---

## 1. Framework and rendering for the typing surface

### 1.1 What the hot path really costs

Per keystroke the UI must:
1. update the state of 1–2 letters (correct / incorrect / extra),
2. move the caret,
3. occasionally scroll a line.

At 120 WPM that is ~10 keystrokes per second, nowhere near 60 updates per second. The real risks are **(a)** re-rendering the whole word list on every key and **(b)** layout thrashing (reading `offsetLeft` in a loop after DOM writes). Framework choice matters less than avoiding those two.

js-framework-benchmark's own result data (`webdriver-ts-results/src/results.ts` on GitHub, medians, ms). "Select row" is the closest analogue to toggling one letter's class among ~1000 elements:

| Framework (keyed) | select row (1 of 1k, **4× CPU slowdown**) | partial update (every 10th of 1k, 4× slowdown) | compressed size (brotli) |
|---|---|---|---|
| vanillajs | 2.5 | 9.8 | 2.5 KB |
| solid v1.9.3 | 3.3 | 10.3 | 4.5 KB |
| preact-signals 10.29.8 | 4.3 | 10.6 | 8.2 KB |
| svelte v5.42.1 | 4.8 | 10.8 | 9.7 KB |
| lit v3.2.0 | 5.2 | 11.8 | 7.3 KB |
| react-hooks v19.2.0 | 5.5 | 14.0 | 51.4 KB |
| preact-hooks 10.29.8 | 12.8 | 20.0 | 5.7 KB |

All of them fit inside a 16.7 ms frame with room to spare, even with CPU throttling. **The choice is about DX, built-in animation and bundle size, not raw speed.**

My own bundle measurements (esbuild, minify, gzip -9, counter "hello world"):

| Lib | min | gzip |
|---|---|---|
| vanilla | – | 0.13 KB |
| preact 11.0.0 | 13.0 KB | 5.5 KB |
| preact + @preact/signals 2.11.3 | 20.5 KB | 8.1 KB |
| solid-js 1.9.15 (via `solid-js/h`; compiled JSX is smaller) | 19.6 KB | 7.6 KB |
| svelte 5.57.1 (Vite build with official plugin) | 25.1 KB | **10.1 KB** |
| react 19.3 + react-dom/client | 222.8 KB | 68.9 KB |

### 1.2 Recommendation: Svelte 5 shell + framework-agnostic engine

- **Svelte 5** for screens (test, results, history, settings, free-writing, dictation), modals and the parrot mascot. Svelte 5 exports:
  - `svelte/transition`: `fade`, `fly`, `scale`, `slide`, `blur`, `draw`, `crossfade`
  - `svelte/animate`: `flip`
  - `svelte/motion`: `Spring`, `Tween`, `prefersReducedMotion`

  I verified these exports in the installed package. That covers a playful parrot (spring bounce on a streak, `crossfade` between results) without a dependency.
- Scoped CSS plus CSS custom properties for Monkeytype-style themes.
- **Keep the typing logic out of components.** `src/core/typing/` holds a pure TS state machine (`TypingSession`: target words, input per word, keystroke log with timestamps, error classification). It is unit-testable in Vitest with no DOM.
- **Typing surface:** render words/letters once per test (Svelte `{#each}` or a small imperative renderer that builds `<span class="w"><span class="l">…`). On each `input` event, mutate **only** the affected letters (`el.classList` / `dataset.state`) and schedule the caret move in `requestAnimationFrame`. If you keep it reactive in Svelte, store per-letter state in a `$state` array and mutate by index (fine-grained). Don't rebuild a `$derived` array of all letters per keystroke. That still works, but it is wasteful.
- Why not the others:
  - **Solid** (what Monkeytype moved to) is equally good if the team prefers JSX. Animations need extra packages (Monkeytype uses `@solid-primitives/transition-group` plus `animejs`).
  - **Preact + signals** is fine. Hooks-only Preact is the slowest in the table.
  - **React 19** costs ~69 KB gzip for no benefit here.
  - **Vanilla TS** gives the best raw speed, but settings, results, history and modals become hand-rolled state management.

Monkeytype data point (GPL-3.0 repo, read for reference only): `frontend/package.json` lists `solid-js`, `animejs 4.2.2`, `chart.js 3.7.1`, `idb 8.0.3`. Its words area is still built imperatively: `test-ui.ts` builds `<letter>` HTML strings, and the caret in `elements/caret.ts` is an absolutely positioned element animated with anime.js from `offsetLeft/offsetTop` measurements.

### 1.3 Input capture (important for Dutch diacritics and Arabic)

- Use a **hidden, focused `<input>`/`<textarea>`** and handle **`beforeinput` / `input` + `compositionstart/update/end`**, not raw `keydown.key`. This is what Monkeytype does (`input/listeners/input.ts`, `composition.ts`).
  - Dead keys (US-International: `"` + `e` → `ë` in *ideeën*, `'` + `e` → `é` in *café*) and IMEs/mobile keyboards only produce correct characters through `input`/composition.
  - `keydown` reports `"Dead"`.
  - `InputEvent.inputType` support: Chrome 60, Firefox 66, Safari 10.1. `beforeinput`: Firefox 87+. (MDN browser-compat-data 8.1.4.)
- Keep `keydown` only for shortcuts (Tab+Enter restart, Esc) and for keystroke timing analytics.
- On the hidden input and the free-writing editor set:

  ```
  spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="off"
  ```

  Otherwise the browser's own spell checker and the phone's autocorrect will "fix" the user's typos or reveal answers.
- Normalize all text to **NFC** (`s.normalize('NFC')`): `"café"` (5 code units) vs `"café"` (4) are equal after NFC (measured). Normalize typographic apostrophes `’` → `'` before comparing. The Dutch Hunspell `.aff` does the same via `ICONV ’ '`.
- Compare by **grapheme clusters** for Arabic: `Intl.Segmenter(lang, {granularity:'grapheme'})` (Chrome 87, Firefox 125, Safari 14.1). `"ذهبتُ"` is 5 UTF-16 code units but 4 graphemes (measured). Decide per mode whether harakat (tashkeel) count. Ayaspell ignores them (`IGNORE ًٌٍَُِّْـٰ` in `ar.aff`).

### 1.4 Caret and animation approach

- **Caret:** one absolutely positioned `<div class="caret">` inside the words container. After DOM writes, read the target letter's `offsetLeft/offsetTop/offsetWidth` once (one forced layout per keystroke is fine). Then set `style.transform = translate3d(x, y, 0)` with `transition: transform 90ms cubic-bezier(.2,.8,.2,1)` for a "smooth caret". Transforms run on the compositor; animating `left`/`top` (what Monkeytype does via anime.js) triggers layout.
- **Blink:** a CSS `@keyframes` opacity animation, paused (`animation-play-state: paused` or a `.typing` class) while keys arrive, resumed after ~500 ms idle.
- **Line scrolling:** show 3 lines. When the caret enters line 3, translate the words container up by one line height with a 150 ms transition (or remove the first line's nodes).
- **Feedback micro-animations:**
  - error shake: `el.animate([{transform:'translateX(0)'},{transform:'translateX(-2px)'},…], {duration:120})`
  - correct-word pop
  - parrot reactions via Svelte `Spring`

  WAAPI (`Element.animate`) is supported by all evergreen browsers (Safari 13.1+).
- **Reduced motion:** honour `prefers-reduced-motion` (Svelte `prefersReducedMotion.current`, or a `matchMedia` CSS media query). Disable smooth caret, shakes and confetti.
- Only add `motion` (Motion One successor, `motion@14.0.0`, MIT) if spring-chained sequences become painful: `animate` adds 20.3 KB gzip, `motion/mini` 3.4 KB (measured).

### 1.5 Arabic (phase 2) rendering notes

- `dir="rtl"` on the words container, `lang="ar"`. The caret maths mirrors (use the letter's right edge).
- **Per-letter spans must stay `display: inline`** (never `inline-block`) or Arabic contextual joining breaks. Monkeytype marks Arabic as `"joiningScript": true` in `languages/arabic.json` and switches letters to `display: inline` under `.joiningScript`. It only uses `inline-block` for words flagged `broken-joining`. Test colour changes inside a word in Safari: joining across differently styled inline spans can differ by engine (unverified for current Safari).

---

## 2. Client-side spell checking (nl, en, ar)

### 2.1 Measured comparison

All measured in Node 22 (V8). Expect similar in Chrome, slower in Safari, 2–4× slower on phones.

| Library | Version (last publish) | License | Dutch load | Dutch heap/RSS | Check | Suggest | Dutch compounds | Verdict |
|---|---|---|---|---|---|---|---|---|
| **hunspell-wasm** | 0.3.0 (2024-10-31) | LGPL-2.0 / GPL-2.0 / **MPL-1.1** (pick one) | **158–185 ms** | ~45–50 MB RSS | 5000 frequent words in 33 ms (~7 µs/word) | 0–90 ms (10 typos = 296 ms) | **Correct** (*wachtwoord*, *huiswerkopdracht*, *voetbalwedstrijdkaartje* OK; *ziekehuis* rejected → *ziekenhuis*) | **Use** |
| nspell | 2.1.5 (2021-01-17) | MIT | 736 ms | ~50 MB heap | ~0.1 ms/word | 16–28 ms | **Wrong:** no `COMPOUNDBEGIN/MIDDLE/END` support (its readme lists them unchecked). Rejects *wachtwoord*, *wachttijd*, *grondgebied*, *gastvrouw*, *huiswerkopdracht*. | Avoid for nl. OK for en. |
| typo-js | 1.3.2 (2026-05-12) | BSD-3 | **crashes**: `SyntaxError: Invalid regular expression: /^(N(km\))(n3)$/i` (cannot parse `FLAG long` + parenthesised `COMPOUNDRULE`) | – | – | en: **750–1376 ms per suggestion** | – | Avoid |
| hunspell-asm | 4.0.2 (2020-02-01) | MIT | not tested | – | – | – | Hunspell | Stale; prefer hunspell-wasm |
| spellchecker-wasm (SymSpell, Rust) | 0.3.3 (2020-05-13) | MIT | needs a frequency dictionary | – | – | µs | No morphology | Stale |
| symspell-ex | 1.1.10 (2022) | MIT | – | – | – | – | No morphology | Not needed |
| Hand-rolled SymSpell over `nl_50k` (max edit 2, prefix 7) | – | ours | 1.5 s build | 79 MB heap, 467k delete-keys | – | 0.25 ms | No (list only) | Useful as a **ranker/fallback**, not as the oracle |

English with hunspell-wasm: 64–70 ms load, ~25 MB RSS. Suggestions: *recieve* → receive, *definately* → definitely, *teh* → the, *becuase* → because, 6–36 ms.

Arabic (Ayaspell 3.5 via LibreOffice) with hunspell-wasm: **748–788 ms load**, ~25 MB extra RSS. *هاذا* → هذا, *لاكن* → لأكن/… , *انشاء* → إنشاء.

Loading all three dictionaries in one worker came to ≈70 MB RSS in Node.

Dutch-specific behaviour (hunspell-wasm + OpenTaal):

| Word | Result |
|---|---|
| *gefietsd* | → *gefietst* |
| *ideeen* | → *ideeën* |
| *cafe* | → *café* |
| *pannekoek* | → *pannenkoek* |
| *misschein* | → *misschien* |
| *teurg* | → *terug* |
| *wnat* | → *want, wat* |
| *tijd*, *IJsland* | accepted (the `.dic` stores the `ĳ` ligature; `ICONV ij ĳ` maps typed `ij`) |

**Real words that are wrong in context** (*word/wordt*, *gebeurd/gebeurt*, *vind/vindt*) pass the spell check. That is the rule engine's and LanguageTool's job (see dutch-errors.md).

### 2.2 Why not a flat word list as the validity oracle?

- The **OpenTaal wordlist** (`wordlist.txt`, v2.20.23, 2023-03-10, BSD-3 or CC BY 3.0): 413,937 entries, 4,985 KiB raw / 1,334 KiB gzip / 1,134 KiB brotli.
  - Measured: `Set` build 440 ms, ~52 MB heap.
  - It does include *wachtwoord*, *wachttijd*, *huiswerkopdracht*, but **not novel compounds** (*appeltaartrecept*, *keukentafelstoel*).
  - A naive splitter accepts wrong ones (*ziekehuis* = *zieke*+*huis*).
- Hunspell gets compounds right because OpenTaal marks which stems may begin, middle or end a compound (flags `Ca`/`Cb`/`Cc` = `COMPOUNDBEGIN/MIDDLE/END` in `nl.aff`).
- **Use hunspell's `testSpelling` as the single "is this a word?" oracle** for both the spell checker and the rule engine's "generate, then validate" morphology (dutch-errors.md §2.4). It lives in the same worker, so no second 1.1 MB download.

### 2.3 Frequency lists are rankers, not validators

hermitdave/FrequencyWords 2018 (`content/2018/{nl,en,ar}/{lang}_50k.txt`, OpenSubtitles; **MIT code, CC BY-SA 4.0 content**):

- Only **34,201 of 50,000** Dutch entries pass Hunspell. The rejects are mostly names and English, but also misspellings.
- Frequent misspellings *inside* the top-50k:
  - nl: *onmiddelijk*, *eigelijk*, *alstjeblieft*, *iik*, *voordele*
  - en: *seperate*, *tommorow*
- **Pipeline:** `freq ∩ hunspell` → `nl_clean.tsv` (460 KB raw, 195 KB gzip). Use it for:
  1. word generation in typing drills,
  2. re-ranking Hunspell suggestions (combine OSA distance, QWERTY adjacency (typing-pedagogy.md §5.1) and log-frequency),
  3. an optional SymSpell index for "did you mean" over the 34k clean words (≈1 s build in a worker; could be precomputed at build time).

### 2.4 Assets and sizes (KiB, measured)

| Asset | raw | gzip | brotli |
|---|---|---|---|
| hunspell.wasm | 793 | 427 | 258 |
| hunspell.js (Emscripten glue) | 66 | 18 | 16 |
| nl.aff / nl.dic (OpenTaal 2.20.21, via dictionary-nl 2.0.0) | 46 / 2,431 | 17 / 791 | 14 / 672 |
| en-US.dic / en-GB.dic (SCOWL 2020.12.07) | 539 / 539 | 189 / 189 | 162 / 162 |
| ar.aff / ar.dic (Ayaspell 3.5, LibreOffice `dictionaries/ar`) | 85 / 7,048 | 15 / 1,486 | 11 / 1,039 |

First-use cost for Dutch is ≈ 270 KiB WASM + 690 KiB dictionary over brotli. After that it comes from the HTTP cache / service worker.

### 2.5 Implementation (verified to build with Vite 8)

```ts
// src/workers/lang.worker.ts — one worker hosts Hunspell (+ later the rule engine)
/// <reference lib="webworker" />
import { createHunspellFromStrings, type Hunspell } from 'hunspell-wasm'
import nlAff from '../assets/dict/nl.aff.txt?url'   // ?url → hashed /assets/nl.aff-XXXX.txt
import nlDic from '../assets/dict/nl.dic.txt?url'
import enAff from '../assets/dict/en-US.aff.txt?url'
import enDic from '../assets/dict/en-US.dic.txt?url'

type Lang = 'nl' | 'en' | 'ar'
const URLS: Partial<Record<Lang, [string, string]>> = { nl: [nlAff, nlDic], en: [enAff, enDic] }
const loaded = new Map<Lang, Promise<Hunspell>>()

function load(lang: Lang): Promise<Hunspell> {
  let p = loaded.get(lang)
  if (!p) {
    const [a, d] = URLS[lang]!
    p = Promise.all([fetch(a).then(r => r.text()), fetch(d).then(r => r.text())])
      .then(([aff, dic]) => createHunspellFromStrings(aff, dic))
    loaded.set(lang, p)
  }
  return p
}

type Req =
  | { id: number; op: 'check'; lang: Lang; words: string[] }
  | { id: number; op: 'suggest'; lang: Lang; word: string }
  | { id: number; op: 'addWord'; lang: Lang; word: string }

self.onmessage = async (e: MessageEvent<Req>) => {
  const m = e.data
  const h = await load(m.lang)
  if (m.op === 'check') self.postMessage({ id: m.id, ok: m.words.map(w => h.testSpelling(w)) })
  else if (m.op === 'suggest') self.postMessage({ id: m.id, suggestions: h.getSpellingSuggestions(m.word).slice(0, 8) })
  else { h.addWord(m.word); self.postMessage({ id: m.id, done: true }) }
}
```

```ts
// main thread
const worker = new Worker(new URL('./workers/lang.worker.ts', import.meta.url), { type: 'module' })
```

Notes:

- `vite.config.ts`: `worker: { format: 'es' }` and `optimizeDeps: { exclude: ['hunspell-wasm'] }`. The package locates its WASM via `new URL("hunspell.wasm", import.meta.url)`. The build emits `hunspell-[hash].wasm` correctly, and dev serves it as `application/wasm` (both checked).
- The build prints a harmless warning: *Module "module"/"fs/promises" externalized for browser compatibility*. Those imports sit in Node-only branches.
- `dictionary-*` packages have `"exports": "./index.js"`, so deep imports like `dictionary-nl/index.dic` are blocked. **Copy** `index.aff`/`index.dic` into `src/assets/dict/*.txt` with a script (`scripts/copy-dicts.mjs`) and commit them together with their licence files.
  - Arabic: download `ar.aff`/`ar.dic` from `https://raw.githubusercontent.com/LibreOffice/dictionaries/master/ar/` (Ayaspell 3.5, GPL-2.0 / LGPL-2.1 / MPL-1.1 tri-licence per Debian's copyright file and the Ayaspell site). A maintained fork exists at github.com/munzirtaha/ayaspell.
- Name the files **`.txt`**. Vercel only compresses known MIME types, and `text/plain` is one (§9). An unknown `.dic` might be served as `application/octet-stream` uncompressed (unverified, so avoid the risk).
- **Lazy load** a language only when free-writing, dictation or results review needs it, and **prefetch on idle** after the first test (`requestIdleCallback` is not in Safari, so fall back to `setTimeout`).
- **Personal dictionary:** `hunspell.addWord()` at runtime, persisted in IndexedDB and replayed after load.
- `getSpellingSuggestions` is synchronous inside the worker and can take ~90 ms for long Dutch words. Only request suggestions for words the user hovers or that appear in the results list. Cap at ~30 per batch, the same cap LanguageTool's public API uses.
- **Licence:** choose the **MPL-1.1** branch of hunspell-wasm's tri-licence. File-level copyleft: we ship the unmodified files with their licence notice and can keep Parrotype MIT. OpenTaal: BSD-3 or CC BY 3.0. SCOWL: MIT AND BSD. Ayaspell: pick MPL-1.1/LGPL. Add an `/about` "Credits & licences" page.

### 2.6 Tokenization (measured pitfalls)

- `Intl.Segmenter('nl', {granularity:'word'})` keeps *zo'n*, *auto's*, *m'n*, *ideeën*, *1,5* together, but splits *e-mail* → *e | mail* and *tv-programma's* → *tv | programma's*. The Dutch `.aff` uses `BREAK 0` and `WORDCHARS ...-...`, so Hunspell wants whole hyphenated words.
- The regex `/[\p{L}\p{M}\p{N}]+(?:['’\-][\p{L}\p{M}\p{N}]+)*/gu` keeps hyphens but drops leading apostrophes (*'s ochtends*, *'t*, *'n*) and splits *1,5*.
- **Use the regex plus special cases**:
  - a leading-apostrophe whitelist: `'s 't 'n 'r 'm 'k`
  - skip pure numbers and URLs
  - do the case logic yourself: *amsterdam* is rejected and *Amsterdam* accepted. Do not auto-capitalize sentence-initial words when checking, but report capitalization as a separate rule.
- For Arabic, `Intl.Segmenter('ar')` splits words fine (*ذهبتُ | إلى | المدرسةِ | وكتبتُ | الدرسَ*, measured). Strip tatweel and tashkeel before checking if the mode ignores them.

---

## 3. LanguageTool HTTP API (optional second opinion)

### 3.1 Endpoint and limits (public server)

- `POST https://api.languagetool.org/v2/check`. Only `/v2/check` is offered publicly. Also useful: `GET /v2/languages` (list of codes; call once and cache).
- **Limits** (dev.languagetool.org/public-http-api, quoted via search results; the page itself was blocked here):
  - 20 requests per IP per minute ("a peak value — don't constantly send this many requests or we would have to block you")
  - **75 KB text per IP per minute**
  - **20 KB text per request**
  - "Only up to 30 misspelled words will have suggestions"
- "**Do not send automated requests.** For that, set up your own instance of LanguageTool or get an account for Enterprise use." Free service, no guarantees, limits may change.
- Our use (a check after the user pauses typing, or on "Check" click, for a single user) fits the spirit if we:
  - debounce ≥1.5 s,
  - never re-send unchanged paragraphs,
  - self-throttle to ~10 req/min,
  - make it **opt-in**. The text is sent to LanguageTool's servers, so the UI needs a privacy note.

### 3.2 Request parameters

All of these appear in `TextChecker.java`, `V2TextChecker.java` and `ServerTools.java` in languagetool-org/languagetool master (6.9-SNAPSHOT).

| Param | Use |
|---|---|
| `text` (or `data` = annotated JSON for markup) | Plain text to check. Required unless `data` is given. |
| `language` | `nl`, `nl-BE`, `en-US`, `en-GB`, `ar` (Arabic module countries: "", SA, DZ, EG, …), or `auto` |
| `motherTongue` | e.g. `ar` or `nl`: enables false-friend rules for that L1 |
| `preferredVariants` | with `language=auto`, e.g. `en-GB,nl-BE` |
| `level` | `default` \| `picky` (also academic, clarity, … on the server). **Use `picky`** for a learner. |
| `enabledRules`, `disabledRules` | comma-separated rule IDs |
| `enabledCategories`, `disabledCategories` | comma-separated category IDs |
| `enabledOnly` | `true` → only the listed rules/categories. **Requires** enabled rules/categories and **forbids** disabledRules/Categories (server throws 400). |
| `mode` | `all` (default), `textLevelOnly`, `allButTextLevelOnly` |
| `username` + `apiKey` | Premium only, not for us |

### 3.3 Response JSON (from `RuleMatchesAsJsonSerializer.java`)

```ts
interface LTResponse {
  software: { name: string; version: string; buildDate: string; apiVersion: number; premium: boolean; premiumHint?: string; status: string }
  warnings?: { incompleteResults: boolean; incompleteResultsReason?: string }
  language: { name: string; code: string; spellCheckOnly?: boolean
              detectedLanguage: { name: string; code: string; confidence: number; source?: string } }
  matches: LTMatch[]
  sentenceRanges?: [number, number][]
  extendedSentenceRanges?: { from: number; to: number; detectedLanguages: { language: string; rate: number }[] }[]
  ignoreRanges?: { from: number; to: number; language: { code: string } }[]
}
interface LTMatch {
  message: string            // may contain <suggestion>…</suggestion> markup
  shortMessage?: string
  offset: number             // UTF-16 index into `text` (Java String index = JS string index)
  length: number
  replacements: { value: string; shortDescription?: string; suffix?: string; type?: string; confidence?: number }[]
  context: { text: string; offset: number; length: number }
  sentence?: string
  type: { typeName: string } // e.g. "Other", "UnknownWord", "Hint"
  rule: { id: string; subId?: string; sourceFile?: string; description: string; issueType: string
          urls?: { value: string }[]; category: { id: string; name: string }; isPremium?: boolean
          tags?: string[]; confidence?: number; tempOff?: boolean }
  ignoreForIncompleteSentence?: boolean
  contextForSureMatch?: number
}
```

Offsets are Java `String` positions (UTF-16 code units), so they index the JS string you sent directly, emoji and surrogate pairs included.

Error statuses (`LanguageToolHttpHandler.java`):

| Status | Meaning |
|---|---|
| **429** | too many requests |
| **413** | text too long (`TextTooLongException`) |
| **400** | bad parameters |
| **403** | access denied |
| **503** | overloaded / unavailable |

### 3.4 Self-hosting (user-configurable endpoint)

```sh
docker run -d --name languagetool -p 8010:8010 \
  -e Java_Xms=512m -e Java_Xmx=2g \
  erikvl87/languagetool
# test: curl --data "language=nl&text=Hij word morgen gebracht." http://localhost:8010/v2/check
```

- The image's `start.sh` runs `org.languagetool.server.HTTPServer --port 8010 --public --allow-origin '*' --config config.properties`, so **CORS is on by default**. Its Dockerfile builds LanguageTool **6.8**. Default heap is 256m/512m; raise `Java_Xmx` for nl+en.
- Any `HTTPServerConfig` option is settable as `-e langtool_<option>=…`, e.g. `langtool_pipelinePrewarming=true`.
- n-gram data (better confusion-pair detection, *their/there*-style) is optional: `-e langtool_languageModel=/ngrams -v ~/ngrams:/ngrams:ro`. The README shows `en/` and `nl/` n-gram folders.
- **Preflight caveat:** the LT server only answers `OPTIONS` for `/v2/users/me`, not for `/v2/check` (checked in `ApiV2.java`). Send a **CORS "simple request"**: `POST` with a `URLSearchParams` body (`application/x-www-form-urlencoded`), only safelisted headers (`Accept`), no JSON body, no custom headers.
- Calling `http://localhost:8010` from the HTTPS Vercel page:
  - Chrome **142+** asks the user for **Local Network Access** permission (Chrome blog, 2025-06-09). Annotate `fetch(url, { targetAddressSpace: 'local' })` so Chrome exempts it from mixed-content blocking.
  - Other browsers may block mixed content. Recommend the user put HTTPS in front (Caddy / Tailscale serve / a cheap VPS). Expose the endpoint as a setting ("LanguageTool server URL", default public, "Test connection" button).

### 3.5 CORS from the browser to the *public* API: unverified

- The server code sets `Access-Control-Allow-Origin` only when started with `--allow-origin`.
- I could not reach `api.languagetool.org` from this sandbox to inspect headers.
- One third-party directory (publicapi.dev) lists the LanguageTool API as "CORS: No". Forum posts discuss CORS only for self-hosted servers.
- **Action:** the very first spike must run this from the deployed Vercel preview:

  ```js
  fetch('https://api.languagetool.org/v2/check', { method: 'POST', body: new URLSearchParams({ text: 'Hij word morgen gebracht.', language: 'nl' }) })
  ```

  If CORS fails, the options are:
  - (a) self-hosted URL only,
  - (b) a tiny Vercel Function proxy (`api/lt.ts`, ~20 lines; this adds a "backend", and its egress IP is shared, so keep the client-side limiter),
  - (c) ship without LT. The rule engine plus Hunspell is the primary path anyway.

### 3.6 TypeScript client sketch (debounce + limiter + paragraph cache + offset remap)

```ts
// src/lib/languagetool.ts
export type LTLang = 'nl' | 'nl-BE' | 'en-US' | 'en-GB' | 'ar' | 'auto'
export interface LTOptions {
  endpoint: string                    // 'https://api.languagetool.org' or user URL
  language: LTLang
  motherTongue?: string
  level?: 'default' | 'picky'
  disabledRules?: string[]
  enabledRules?: string[]
  enabledOnly?: boolean
  preferredVariants?: string[]
}
export class LTError extends Error { constructor(msg: string, public status: number) { super(msg) } }

/** Sliding-window limiter for both request count and bytes per window. */
class SlidingWindow {
  private ev: { t: number; bytes: number }[] = []
  constructor(private maxReq: number, private maxBytes: number, private windowMs = 60_000) {}
  waitMs(bytes: number, now = Date.now()): number {
    this.ev = this.ev.filter(e => now - e.t < this.windowMs)
    let used = this.ev.reduce((s, e) => s + e.bytes, 0), count = this.ev.length, i = 0, t = now
    while ((count >= this.maxReq || used + bytes > this.maxBytes) && i < this.ev.length) {
      t = this.ev[i].t + this.windowMs; used -= this.ev[i].bytes; count--; i++
    }
    return Math.max(0, t - now)
  }
  record(bytes: number) { this.ev.push({ t: Date.now(), bytes }) }
}

const sleep = (ms: number, signal?: AbortSignal) => new Promise<void>((res, rej) => {
  const id = setTimeout(res, ms)
  signal?.addEventListener('abort', () => { clearTimeout(id); rej(signal.reason) }, { once: true })
})

/** Split into paragraphs with their start offsets so unchanged ones hit the cache. */
function paragraphs(text: string): { start: number; text: string }[] {
  const out: { start: number; text: string }[] = []
  const re = /[^\n]+/g; let m: RegExpExecArray | null
  while ((m = re.exec(text))) out.push({ start: m.index, text: m[0] })
  return out
}

export class LanguageToolClient {
  private limiter: SlidingWindow
  private cache = new Map<string, LTMatch[]>()          // key: lang + '\0' + paragraph
  private backoffUntil = 0
  private timer: ReturnType<typeof setTimeout> | undefined
  private inflight: AbortController | undefined
  private enc = new TextEncoder()

  constructor(private opts: LTOptions) {
    const host = new URL(opts.endpoint).hostname
    const isPublic = host.endsWith('languagetool.org')
    // public: stay well under 20 req / 75 KB per minute; self-hosted: effectively unlimited
    this.limiter = isPublic ? new SlidingWindow(10, 60_000) : new SlidingWindow(600, 50_000_000)
  }

  /** Call on every input; only the last call within `delay` runs. */
  schedule(text: string, onResult: (matches: LTMatch[], forText: string) => void,
           onError?: (e: unknown) => void, delay = 1500) {
    clearTimeout(this.timer)
    this.timer = setTimeout(async () => {
      this.inflight?.abort()
      const ac = (this.inflight = new AbortController())
      try { onResult(await this.check(text, ac.signal), text) }
      catch (e) { if (!ac.signal.aborted) onError?.(e) }
    }, delay)
  }

  async check(text: string, signal?: AbortSignal): Promise<LTMatch[]> {
    const out: LTMatch[] = []
    for (const p of paragraphs(text)) {
      if (!p.text.trim()) continue
      const key = this.opts.language + '\0' + p.text
      let ms = this.cache.get(key)
      if (!ms) { ms = await this.request(p.text, signal); this.cache.set(key, ms) }
      for (const m of ms) out.push({ ...m, offset: m.offset + p.start })
    }
    return out
  }

  private async request(text: string, signal?: AbortSignal): Promise<LTMatch[]> {
    const bytes = this.enc.encode(text).length
    if (bytes > 18_000) throw new LTError('Paragraph too long for the public API (20 KB)', 413)
    const wait = Math.max(this.backoffUntil - Date.now(), this.limiter.waitMs(bytes))
    if (wait > 0) await sleep(wait, signal)
    const body = new URLSearchParams({ text, language: this.opts.language, level: this.opts.level ?? 'picky' })
    const o = this.opts
    if (o.motherTongue) body.set('motherTongue', o.motherTongue)
    if (o.preferredVariants?.length) body.set('preferredVariants', o.preferredVariants.join(','))
    if (o.enabledRules?.length) body.set('enabledRules', o.enabledRules.join(','))
    if (o.enabledOnly) body.set('enabledOnly', 'true')
    else if (o.disabledRules?.length) body.set('disabledRules', o.disabledRules.join(','))
    this.limiter.record(bytes)
    // URLSearchParams body + Accept only => CORS "simple request" (no preflight)
    const res = await fetch(o.endpoint.replace(/\/+$/, '') + '/v2/check',
      { method: 'POST', body, headers: { Accept: 'application/json' }, signal })
    if (res.status === 429) { this.backoffUntil = Date.now() + 60_000; throw new LTError('Rate limited', 429) }
    if (!res.ok) throw new LTError(await res.text(), res.status)
    const json = (await res.json()) as LTResponse
    return json.matches
  }
}

/** Keep matches valid after the user edited text while the request was in flight. */
export function remapMatches(matches: LTMatch[], oldText: string, newText: string): LTMatch[] {
  const max = Math.min(oldText.length, newText.length)
  let p = 0; while (p < max && oldText[p] === newText[p]) p++
  let s = 0; while (s < max - p && oldText[oldText.length - 1 - s] === newText[newText.length - 1 - s]) s++
  const oldEditEnd = oldText.length - s, delta = newText.length - oldText.length
  return matches.flatMap(m => m.offset + m.length <= p ? [m]
    : m.offset >= oldEditEnd ? [{ ...m, offset: m.offset + delta }]
    : [])                                    // overlapped the edit → stale, drop
}
```

UI integration:

- Render LT matches with the **CSS Custom Highlight API**: `CSS.highlights.set('lt', new Highlight(...ranges))` plus `::highlight(lt) { text-decoration: underline wavy var(--grammar) }`. It works on a `contenteditable="plaintext-only"` editor or a mirror `<div>`, not inside `<textarea>`.
  - Support: `Highlight` Chrome 105, Firefox 140, Safari 17.2. `::highlight()` Firefox 149. `plaintext-only` Firefox 136.
  - No wrapper spans are needed, so caret and IME behaviour stay native.
- Dedupe against our own rule engine by span. Map LT rule IDs to our categories (dutch-errors.md §10). Strip `<suggestion>` tags from `message`.
- Skip LT `MORFOLOGIK_RULE_*` / `*_SPELLER_RULE` (spelling) matches when Hunspell already flagged the same span. Use `disabledRules` to save quota.

---

## 4. Web Speech API for dictation

### 4.1 Voice availability (Readium "web-speech-recommended-voices", BSD-3, plus their WebSpeech.md)

| Platform | nl-NL | nl-BE | en-US / en-GB | ar |
|---|---|---|---|---|
| **Chrome desktop** (Google voices, **online only**, 19 voices / 15 languages) | "Google Nederlands" | – | "Google US English", "Google UK English Female/Male" | **none** |
| **Edge desktop** ("Online (Natural)", online, 250+ voices / 75 languages) | Microsoft Colette / Fenna / Maarten Online (Natural), Hanna Online | Dena / Arnaud Online (Natural) | many | Zariyah / Hamed (ar-SA) plus 15 other regions (EG, AE, MA, …) |
| **Windows (any browser, local)** | Microsoft Frank | – | David/Zira/… | Hoda (ar-EG), Naayf (ar-SA) |
| **macOS / iOS / iPadOS (Safari + all iOS browsers)** | Xander, Claire | Ellen | Samantha, Daniel, … | Majed (ar-001; several qualities), Mariam, Tarik, Laila |
| **Android (Chrome)** | Google "Nederlands 1–5 (Natural)" (via system TTS) | nl-be-x-bec/bed | many | ar-xa-x-arc/arz/ard/are |
| **Firefox** | whatever the OS provides (no own voices). Linux needs speech-dispatcher, often only eSpeak. | | | |

Important quirks:

- **`getVoices()` is async in Chrome.** It returns `[]` until `voiceschanged` fires. `voiceschanged` support: Chrome 33, Firefox 49, **Safari 16** (BCD). Use a promise that resolves on the event *or* after polling every 250 ms up to ~3 s.
- **Edge on macOS** shows only 18 natural voices until the first utterance has been spoken, then 250+ (Readium). Re-query after the first `speak()`.
- **Edge Android** returns an empty list. **Chrome Android** returns an unfiltered list of *languages* (not installed voices), localized and sometimes with `_` separators (`en_us`). Normalize `lang.replace('_','-')`. Firefox Android uses `eng-US-f000`-style tags (Readium).
- **Safari:** downloaded high-quality voices don't appear, installing them can make the preloaded ones disappear, and every voice reports `default: true` (Readium).
- **Chrome Google voices:** utterances longer than **~14–15 s stop silently**, and they **do not fire `boundary` events**. BCD marks `boundary` as partial in Chrome ("does not fire as expected", crbug 40715888).
  - The known workaround is `pause()`/`resume()` every ~5–10 s. It breaks on Android, where **`pause()` == `cancel()`** (BCD note). Avoid it.
  - Speak **one sentence or phrase per utterance** instead.
- **Edge natural voices:** no pitch control; some characters must be escaped (Readium). A reported Edge 150 issue made natural voices show as "Microsoft undefined Online (Natural) - undefined" intermittently (Microsoft Tech Community thread). Guard against voices whose `name`/`lang` contain `undefined`.
- **iOS:** `speak()` must be triggered by a user gesture. Prime it with a silent utterance (`volume: 0`, `text: ' '`) on the first tap (easy-speech FAQ).
- **Linux Firefox:** "voices aren't available in Speech Dispatcher" if speech-dispatcher is misconfigured (Mozilla support KB).

### 4.2 Voice picker heuristic

```ts
// novelty/very-low-quality names from readium/speech json/filters/{novelty,veryLowQuality}.json
const BAD = /^(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Good News|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox|Eddy|Flo|Grandma|Grandpa|Jacques|Reed|Rocko|Sandy|Shelley|Fred|Junior|Kathy|Ralph)\b|eSpeak/i

export function scoreVoice(v: SpeechSynthesisVoice, wanted: string /* 'nl-NL' */): number {
  if (!v.name || /undefined/.test(v.name)) return -Infinity
  const vl = v.lang.replace('_', '-').toLowerCase(), [wl, wr] = wanted.toLowerCase().split('-')
  if (!(vl === wl || vl.startsWith(wl + '-'))) return -Infinity   // 'ar-001', 'ar-SA' both match 'ar'
  let s = 0
  if (wr && vl.endsWith('-' + wr)) s += 30                          // exact region (nl-BE vs nl-NL)
  if (/Online \(Natural\)/.test(v.name)) s += 60                   // Edge neural
  else if (/\(Natural\)|Neural/i.test(v.name)) s += 50             // Android/ChromeOS natural
  else if (/^Google/.test(v.name)) s += 40                          // Chrome desktop (online, no boundary)
  if (/Premium|Enhanced|Siri/i.test(v.name)) s += 45               // Apple higher-quality variants
  if (BAD.test(v.name)) s -= 200
  if (v.localService) s += 5                                        // offline, usually fires boundary events
  return s
}
export const pickVoice = (voices: SpeechSynthesisVoice[], lang: string) =>
  voices.map(v => [scoreVoice(v, lang), v] as const).filter(([s]) => s > -Infinity)
        .sort((a, b) => b[0] - a[0])[0]?.[1]
```

Always let the user override the voice (and persist the chosen `voiceURI` + `name`). Show "no Arabic voice on Chrome desktop, try Edge or install an OS voice" when nothing scores.

### 4.3 Dictation playback design

- Segment text into sentences with `Intl.Segmenter(lang, {granularity:'sentence'})`. For a classic Dutch *dictee* (typing-pedagogy.md §2.12), also split long sentences at commas into phrases: speak each phrase, pause, repeat.
- One `SpeechSynthesisUtterance` per chunk:
  - `lang` = voice lang
  - `rate` 0.8–0.95 for dictation (spec range 0.1–10). Offer a "slow" mode at 0.7.
  - `pitch` 1; Edge natural voices ignore it.
- Await `onend`. Always `speechSynthesis.cancel()` before starting a new sequence (Chrome sometimes gets stuck in `speaking=true`).
- `boundary` events (`charIndex`, `charLength` on newer engines, `name` = `'word'`/`'sentence'`) are **nice-to-have**. In dictation the text must stay hidden anyway, so use them only for a progress indicator. Fall back to a timer estimate when they don't fire (Chrome Google voices).
- Library option: **`easy-speech@2.4.0`** (MIT, 2.6 KB gzip measured; last release 2024-09). It wraps voice loading (voiceschanged → timeout polling), events and several quirks. `@readium/speech@0.13.0` (BSD-3, actively developed) adds voice selection from the recommended-voices data plus highlighting, but is much bigger. Recommendation: **own ~150-line wrapper** using the heuristic above, plus a copy of Readium's `nl/en/ar` JSON (BSD-3, attribute) if we want nice labels.
- `SpeechRecognition` is not needed. For reference, BCD now shows Chrome/Edge 139+, Safari 14.1, Firefox preview only.

---

## 5. Open-licensed content sources

| Source | What | Licence | Notes for Parrotype |
|---|---|---|---|
| **Tatoeba** per-language exports: `https://downloads.tatoeba.org/exports/per_language/{nld,eng,ara}/{lang}_{table}.tsv.bz2`, tables `sentences_detailed` (id, lang, text, username, date_added, date_last_modified), `sentences_CC0` (id, lang, text, date_last_modified), `sentences_with_audio` (sentence_id, audio_id, username, license, attribution_url), `links` | Modern, short sentences in nl/en/ar | Text **CC BY 2.0 FR**. A subset is **CC0 1.0** (`sentences_CC0`). **Audio: per contributor** (CC BY, CC BY-SA, CC BY-NC or *no public licence*). | Weekly exports (Saturdays 06:30 UTC). Prefer the **CC0 subset** where it is big enough (no attribution needed). Otherwise keep `id`+`username` and generate a credits page. Only use audio whose `license` is CC BY/CC BY-SA (never NC or empty) and credit the username. URL pattern confirmed from `tatoebatools` source; tatoeba.org itself was blocked here. |
| **hermitdave/FrequencyWords** (`content/2018/{nl,en,ar}/{lang}_50k.txt`, `_full.txt`) | OpenSubtitles word frequencies | **MIT code, CC BY-SA 4.0 content** | Share-alike applies to derived word lists: publish `nl_clean.tsv` etc. under CC BY-SA 4.0 with attribution. Noisy: intersect with Hunspell (§2.3). |
| **OpenTaal wordlist** (`wordlist.txt`, 414k entries, v2.20.23) and **OpenTaal Hunspell** | Dutch word validity, compounds | **BSD-3 or CC BY 3.0** (user's choice) | Permissive. Hunspell dic/aff are what we ship. The flat list is useful offline for build scripts (e.g. generating d/t pairs). |
| **SCOWL / dictionary-en(-gb)** | English spelling | MIT AND BSD | Ships with `dictionary-en@4.0.0` (en_US 2020.12.07). |
| **Ayaspell** (LibreOffice `dictionaries/ar`, v3.5) | Arabic spelling | GPL-2.0 / LGPL-2.1 / MPL-1.1 | Choose MPL/LGPL for a permissive app. |
| **wordfreq** (rspeer) | Frequencies for nl/en/ar from many corpora | Apache-2.0 code, **CC BY-SA 4.0** data | **Sunset** (no further updates, see SUNSET.md) but data still usable. Python build step only. |
| google-10000-english | English top-10k | LDC licence + fair use; "not recommended for commercial purposes" | **Avoid.** |
| **Project Gutenberg** | Public-domain books: *Max Havelaar* (nl) #11024, Grimm *Sprookjes: Tweede verzameling* (nl, trans. M. van Eeden-Van Vloten) #22555, Andersen *Sproken en vertellingen: Morgenrood* (nl) #25580, Aesop's Fables (en) #21 (Townsend) and #11339 (V. S. Vernon Jones) | US public domain. Remove the PG header/footer and don't use the "Project Gutenberg" trademark. | **Pedagogy warning:** pre-1947 Dutch uses the old De Vries–Te Winkel spelling (*mensch*, *zoo*, *visch*). Max Havelaar (1860) and early-1900s translations almost certainly do. Do **not** use them for Dutch spelling practice unless modernized. English Aesop is fine. Check translator death dates for EU copyright (life + 70) before redistributing translations. |
| **Wikipedia / Wikiquote (nl/en/ar)** | Modern prose, quotes | CC BY-SA 4.0 | Good for "paragraph" mode, with attribution and share-alike. |
| **Monkeytype** `frontend/static/languages/*.json` (e.g. `dutch_1k`, `dutch_10k`, `arabic` with `rightToLeft`/`joiningScript`) and `static/quotes/*.json` | Word lists and quotes | **GPL-3.0** (repo LICENSE; frontend package.json `"license": "GPL-3.0"`) | If we copy these into our bundle, the conservative reading is that Parrotype must be GPL-3.0-compatible and license-noticed. The GPL "aggregate" clause may cover separate data files, and bare word lists may not be copyrightable in the US. The EU has database rights. This is legal uncertainty, not legal advice. **Recommendation:** generate our own lists from the permissive/CC sources above. If we ever copy Monkeytype data, license Parrotype GPL-3.0 and keep the files under `public/vendor/monkeytype/` with attribution. |

Build pipeline suggestion: `scripts/build-data.mjs` (Node, run locally, outputs committed to `src/assets/data/`):

1. Download FrequencyWords and the Tatoeba CC0/BY exports.
2. Filter with hunspell-wasm (the same WASM we ship): keep words that pass the spell check, drop names and non-target-language words, NFC-normalize.
3. Bucket by frequency rank (top 200 / 1k / 5k / 10k) and by difficulty tags (ij/ei, d/t forms, trema, double letters).
4. Write compact JSON plus `CREDITS.md`.

---

## 6. Persistence (no backend)

| | localStorage | IndexedDB |
|---|---|---|
| API | synchronous, strings only | asynchronous, structured clone (objects, Blobs) |
| Size | ~5 MB per origin (web.dev) | quota-based: Chrome/Firefox up to a large share of free disk; Safari ~1 GB-class with prompts (web.dev) |
| Use for | **settings/theme** (read before first paint, no flash), last-used mode | **results history, keystroke logs, mistake stats for spaced repetition, personal dictionary** |

- Library: **`idb@8.0.3`** (ISC, 1.4 KB gzip measured; Monkeytype uses it) when you want object stores plus indexes. **`idb-keyval@6.3.0`** (Apache-2.0, 0.5 KB gzip) if pure key/value is enough. Dexie 4.4.6 is overkill.
- Suggested schema (DB `parrotype`, version 1):
  - `results` (keyPath `id` = ISO timestamp + random). Indexes: `byLangDate` [`lang`, `ts`], `byMode`. Value: `{ id, ts, lang, mode, wpm, raw, acc, consistency, durationMs, wordCount, errors: ErrorEvent[], wpmSeries: number[], version }`.
  - `mistakes` (keyPath `[lang, word]`): `{ lang, word, typedVariants: Record<string, number>, count, lastSeen, srs: { box, due } }`.
  - `dictionary` (keyPath `[lang, word]`): user-added words, replayed into Hunspell.
  - `meta`: `schemaVersion`, `createdAt`, `lastExportAt`.
- **Durability:**
  - Call `navigator.storage.persist()` after the first completed test (Chrome 55, Firefox 57, Safari 15.2). Show `navigator.storage.estimate()` in settings (Safari 17+).
  - **Safari/WebKit's ITP deletes all script-writable storage** (IndexedDB, localStorage, SW registrations) after **7 days without a visit** (Safari 13.1 / iOS 13.4+). Home Screen web apps have their own counter, which effectively exempts them.
  - So: an **Export** button (JSON download via `Blob` + `URL.createObjectURL` + `<a download="parrotype-YYYY-MM-DD.json">`), an **Import** (file input → JSON.parse → schema validation → merge by `id`), and a gentle "last backup N days ago" nudge.
- Validate imports with **`valibot@1.5.0`** (MIT, 1.3 KB gzip measured for a small schema), or hand-written guards. Include `format: 'parrotype-export', version: 1` and migration functions.
- Large logs: per-keystroke timing for a 60 s test is ~300–600 events. Store them compactly as parallel arrays or delta-encoded `Uint16Array` (structured clone stores typed arrays natively). `CompressionStream('gzip')` is available everywhere (Safari 16.4+) for exports if files get big.

---

## 7. Charts

- **Results screen (WPM over time + raw WPM + error markers): hand-rolled SVG.** About 100–150 lines of TS:
  - `viewBox` scaling
  - `<polyline>` for WPM and raw
  - `<circle>`/`<line>` error ticks
  - CSS-variable colours for themes
  - `<title>`/`<desc>` for accessibility
  - Svelte `draw` transition for a playful reveal

  Zero bytes of dependency, full control over the Monkeytype look. Follow the project's dataviz guidelines for colours and axes.
- **History view** (hundreds to thousands of points, zoom, cursor): **`uPlot@1.6.32`** (MIT, 52 KB min / **23 KB gzip** measured; Canvas; last release 2025-03, mature/slow cadence), lazy-loaded via `import()` on that route.
- Chart.js 4.5.1: 54 KB gzip with manually registered line-chart parts, 70 KB with `chart.js/auto` (measured). Not needed.

---

## 8. Testing

- **Vitest 5.0.3** (peer `vite ^6.4 || ^7 || ^8`) in Node environment for:
  - the typing state machine (WPM/accuracy formulas from typing-pedagogy.md §3, backspace policies),
  - the typo classifier (OSA alignment with backtrace, keyboard adjacency),
  - the **rule engine**: one test file per rule family with positive cases **and antipatterns** (dutch-errors.md), as `it.each` tables,
  - tokenizer edge cases (*'s ochtends*, *e-mail*, *zo'n*, *ideeën*, NFC),
  - the LanguageTool client (mock `fetch`; assert limiter delays with `vi.useFakeTimers()`, 429 backoff, `remapMatches`),
  - import/export validation and migrations.
- **Spell worker tests:** run hunspell-wasm directly in Vitest (Node can load it; my benchmarks did exactly that). Keep a golden list of Dutch words that must pass/fail (*wachtwoord* ✓, *ziekehuis* ✗, *gefietsd* ✗ → *gefietst*).
- **Playwright 1.63** (`@playwright/test`, released 2026-09-04) for e2e: type a full test with `page.keyboard.type`, include dead-key / composition cases via `page.keyboard.insertText`, check the results screen and the persistence round trip (export → clear → import). Use `toHaveScreenshot()` per theme for the Monkeytype-like visuals.
  - Run against `vite preview` (`webServer` in `playwright.config.ts`).
  - Browsers download on CI with `npx playwright install --with-deps chromium`. That was blocked in this sandbox, so browser tests could not be run here.
- Optional: **Vitest browser mode** (`@vitest/browser-playwright@5.0.3`) for DOM-level tests of the typing surface (caret positioning, RTL).
- Svelte component tests: `@testing-library/svelte@5.4.2` with `happy-dom@20.14.5` or `jsdom@30.1.1`, only where useful.
- CI (GitHub Actions): `npm ci && npm run check && npm test && npm run build && npx playwright test`. Vercel builds previews per PR on its own.

---

## 9. Vercel deployment (static Vite SPA)

- Vercel auto-detects Vite: build command `vite build` (or `npm run build`), output directory **`dist`**. No server code is needed.
- `vercel.json` at the repo root:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/((?!assets/).*)", "destination": "/index.html" }],
  "headers": [
    { "source": "/assets/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }] },
    { "source": "/(sw.js|registerSW.js|manifest.webmanifest)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" }] },
    { "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }
      ] }
  ]
}
```

- **Rewrites:** Vercel serves an existing static file **before** applying rewrites (filesystem precedence), so the catch-all SPA rewrite (Vercel's documented Vite example is `"/(.*)" → "/index.html"`) doesn't swallow assets. The negative lookahead is extra safety. Simpler still: with only 4–5 screens, use **hash routing** (`#/history`) and no rewrite is needed at all.
- **Caching:** Vercel's default `Cache-Control` for static files is `public, max-age=0, must-revalidate`. Vite's `/assets/*` filenames are content-hashed, so mark them `immutable`. Import dictionaries via `?url` so they land in `/assets/` with a hash. A dictionary update then automatically busts caches.
- **Compression:** Vercel's CDN compresses (gzip/brotli) only listed MIME types. The list includes `application/wasm`, `application/json`, `text/plain`, `text/css`, `text/javascript`, `text/csv`, `text/markdown`, but not `application/octet-stream`. Hence `.txt` for `.aff`/`.dic`, which shrinks Dutch from 2.4 MB to ~0.7 MB on the wire.
- **CSP** (if added): WebAssembly compilation needs `script-src 'self' 'wasm-unsafe-eval'`. `connect-src` must allow `https://api.languagetool.org` plus the user's custom LT URL, so use something like `connect-src 'self' https: http://localhost:*`. Leave CSP out of v1 rather than break custom endpoints.
- Environment variables are not needed. Any Vite env var must be prefixed `VITE_` to reach the client.
- `@vercel/analytics@2.0.1` exists if you want page analytics. Not needed for a single user.

---

## 10. PWA / offline: worth it, kept small

**Why:**
1. offline practice (trains, planes),
2. instant repeat loads of WASM + dictionaries,
3. installability (the Home Screen app escapes Safari's 7-day storage purge, §6),
4. it's cheap with Vite.

**Config (verified to build with Vite 8.3.2 + vite-plugin-pwa 1.3.0, `generateSW`):**

```ts
import { VitePWA } from 'vite-plugin-pwa'
VitePWA({
  registerType: 'autoUpdate',
  workbox: {
    globPatterns: ['**/*.{js,css,html,svg,woff2,wasm}'],   // app shell + hunspell.wasm (precache ~0.9 MiB)
    maximumFileSizeToCacheInBytes: 3_000_000,              // default 2 MiB would skip larger files
    runtimeCaching: [{
      urlPattern: ({ url }) => /\/assets\/[\w.-]+\.(aff|dic)-[\w-]+\.txt$/.test(url.pathname),
      handler: 'CacheFirst',                               // hashed names → safe forever
      options: { cacheName: 'dictionaries', expiration: { maxEntries: 12 } },
    }],
  },
  manifest: { name: 'Parrotype', short_name: 'Parrotype', theme_color: '#…', background_color: '#…', display: 'standalone', icons: [/* 192, 512, maskable */] },
})
```

- Keep dictionaries **out of precache** (Arabic alone is 1 MB brotli) and cache them on first use.
- Version note: `vite-plugin-pwa@2.0.0` was published on 2026-10-03 (the research date). Its peer range includes Vite 8, as does 1.3.0's. Start with `~1.3.0` and upgrade after reading the 2.0 changelog.
- Phase it: ship v1 without a service worker if time is short. Add the PWA in v1.1. The asset layout above already suits it.

---

## 11. Verified scaffold (package versions and layout)

I built this exact combination in a scratch project:
- `svelte-check`: **0 errors**
- `vitest run`: 2/2 passing
- `vite build`: main JS **41.3 KB / 16.4 KB gzip**, including Svelte runtime + `Spring` + demo. The worker, WASM and dictionary are separate chunks.

```json
{
  "name": "parrotype",
  "private": true,
  "type": "module",
  "engines": { "node": ">=22" },
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "check": "svelte-check --tsconfig ./tsconfig.json",
    "test": "vitest run",
    "e2e": "playwright test",
    "data": "node scripts/build-data.mjs"
  },
  "dependencies": {
    "hunspell-wasm": "0.3.0",
    "idb": "^8.0.3"
  },
  "devDependencies": {
    "vite": "^8.3.2",
    "svelte": "^5.57.1",
    "@sveltejs/vite-plugin-svelte": "^7.3.1",
    "@tsconfig/svelte": "^5.0.8",
    "typescript": "~6.0.3",
    "svelte-check": "^4.7.6",
    "vitest": "^5.0.3",
    "@playwright/test": "^1.63.0",
    "vite-plugin-pwa": "~1.3.0",
    "dictionary-nl": "2.0.0",
    "dictionary-en": "4.0.0",
    "dictionary-en-gb": "3.0.0"
  }
}
```

Suggested layout:

```
src/
  main.ts, App.svelte
  core/            # framework-agnostic, 100% unit-tested
    typing/        # TypingSession, metrics (wpm/raw/acc/consistency), backspace policies
    diff/          # OSA alignment, typo classifier, keyboard model (QWERTY/AZERTY)
    text/          # tokenizer, NFC/apostrophe normalization, sentence segmentation
    rules/         # Dutch/English rule engine (dutch-errors.md), rule tables as data
    lt/            # LanguageTool client (§3.6)
    speech/        # voice picker + utterance queue (§4)
    storage/       # idb schema, export/import, migrations
  workers/lang.worker.ts   # hunspell + rules, message protocol
  ui/              # Svelte components: TypingSurface, Caret, Results, WpmChart (SVG), Parrot, Settings
  assets/dict/     # nl.aff.txt, nl.dic.txt, en-US.*.txt, en-GB.*.txt, ar.*.txt + LICENSE-*.txt
  assets/data/     # generated word/sentence lists + CREDITS.md
scripts/           # copy-dicts.mjs, build-data.mjs
tests/e2e/         # Playwright specs
vercel.json, vite.config.ts, playwright.config.ts
```

---

## 12. Risks and open questions (verify early)

1. **LanguageTool public CORS** (§3.5): run the 1-line fetch from the first Vercel preview. Decide on self-hosted-only / proxy / none.
2. **hunspell-wasm in Safari/iOS**: built for web/worker/node (Emscripten `ENVIRONMENT_IS_WORKER` branch). Module workers need Safari 15+. Test memory on an iPhone with nl+en loaded. Load one language at a time on mobile.
3. **hunspell-wasm maintenance**: a single maintainer, last release 2024-10. Pin the version. The fallback is `hunspell-asm` (older) or nspell + a compound-splitting heuristic (worse).
4. **Arabic joining across styled spans** in Safari (§1.5): prototype early in phase 2.
5. **Edge natural voices** occasionally report `undefined` names (Edge 150 thread): keep the guard and the fallback voice.
6. **Chrome `boundary` events**: design dictation so they are optional.
7. **TypeScript 7**: revisit when svelte-check and typescript-eslint widen their peer ranges.
8. **Licensing hygiene**: keep a `CREDITS.md` / About page listing OpenTaal, SCOWL, Ayaspell, hunspell-wasm (MPL-1.1), FrequencyWords (CC BY-SA 4.0), Tatoeba (CC BY 2.0 FR with usernames, CC0 subset), and Readium voice data (BSD-3).

---

## Sources

**Measured in this sandbox (scripts in the session scratchpad):** nspell/typo-js/hunspell-wasm/SymSpell benchmarks; bundle sizes via esbuild/Vite; a Vite 8 + Svelte 5 + PWA + worker build; FrequencyWords ∩ Hunspell intersection; Intl.Segmenter tests.

Framework, build, benchmark
- js-framework-benchmark result data (results.ts): https://github.com/krausest/js-framework-benchmark/blob/master/webdriver-ts-results/src/results.ts
- Monkeytype frontend package.json (SolidJS, animejs, chart.js, idb; GPL-3.0): https://github.com/monkeytypegame/monkeytype/blob/master/frontend/package.json
- Monkeytype LICENSE (GPL-3.0): https://github.com/monkeytypegame/monkeytype/blob/master/LICENSE
- Monkeytype test-ui.ts (imperative `<letter>` rendering): https://github.com/monkeytypegame/monkeytype/blob/master/frontend/src/ts/test/test-ui.ts
- Monkeytype caret element (anime.js, offsetLeft): https://github.com/monkeytypegame/monkeytype/blob/master/frontend/src/ts/elements/caret.ts
- Monkeytype input listeners (beforeinput, composition): https://github.com/monkeytypegame/monkeytype/blob/master/frontend/src/ts/input/listeners/input.ts and …/composition.ts
- Monkeytype joiningScript CSS: https://github.com/monkeytypegame/monkeytype/blob/master/frontend/src/styles/test.scss
- Monkeytype Arabic language file (`rightToLeft`, `joiningScript`): https://github.com/monkeytypegame/monkeytype/blob/master/frontend/static/languages/arabic.json
- Monkeytype architecture overview (Mintlify): https://www.mintlify.com/monkeytypegame/monkeytype/architecture/frontend
- npm registry (versions, licences, publish dates, peerDependencies) for svelte, @sveltejs/vite-plugin-svelte, vite, typescript, svelte-check, typescript-eslint, preact, solid-js, react, motion, vitest, @playwright/test, vite-plugin-pwa, idb, idb-keyval, uplot, chart.js, valibot, easy-speech, @readium/speech: https://www.npmjs.com/
- MDN browser-compat-data 8.1.4 (npm `@mdn/browser-compat-data`, 2026-10-01): https://github.com/mdn/browser-compat-data

Spell checking
- hunspell-wasm (npm / GitHub): https://www.npmjs.com/package/hunspell-wasm , https://github.com/rotemdan/hunspell-wasm
- nspell (supported affix options list in readme): https://github.com/wooorm/nspell
- nspell pre-parsed dictionaries discussion (slow parsing): https://lightrun.com/answers/wooorm-nspell-pre-parsed-dictionaries
- typo-js: https://www.npmjs.com/package/typo-js
- dictionary-nl / dictionary-en / dictionary-en-gb (wooorm/dictionaries): https://github.com/wooorm/dictionaries
- OpenTaal Hunspell: https://github.com/OpenTaal/opentaal-hunspell
- OpenTaal wordlist (README, licence, v2.20.23): https://github.com/OpenTaal/opentaal-wordlist
- LibreOffice dictionaries, Arabic (Ayaspell 3.5): https://github.com/LibreOffice/dictionaries/tree/master/ar
- Ayaspell project / licence: https://ayaspell.sourceforge.net/index.html , https://metadata.ftp-master.debian.org/changelogs/main/h/hunspell-ar/hunspell-ar_3.2-1_copyright , https://github.com/munzirtaha/ayaspell
- hermitdave/FrequencyWords (MIT code, CC BY-SA 4.0 content): https://github.com/hermitdave/FrequencyWords
- wordfreq (licence, sunset): https://github.com/rspeer/wordfreq
- google-10000-english licence note: https://github.com/first20hours/google-10000-english

LanguageTool
- Public HTTP API limits and terms: https://dev.languagetool.org/public-http-api (quoted via search; page blocked here)
- LanguageTool help, "Does LanguageTool offer an API?": https://help.languagetool.org/hc/en-us/articles/39254488835095-Does-LanguageTool-offer-an-API
- Server params (TextChecker / V2TextChecker / ServerTools / ApiV2 / LanguageToolHttpHandler / HTTPServerConfig): https://github.com/languagetool-org/languagetool/tree/master/languagetool-server/src/main/java/org/languagetool/server
- JSON response serializer: https://github.com/languagetool-org/languagetool/blob/master/languagetool-core/src/main/java/org/languagetool/tools/RuleMatchesAsJsonSerializer.java
- Dutch and Arabic language modules: https://github.com/languagetool-org/languagetool/tree/master/languagetool-language-modules/nl , …/ar
- LanguageTool supported languages: https://languagetool.org/languages
- CHANGES.md (`--allow-origin` without parameter implies `*`): https://github.com/languagetool-org/languagetool/blob/master/languagetool-standalone/CHANGES.md
- erikvl87/docker-languagetool (README, start.sh with `--public --allow-origin '*'`, Dockerfile LT 6.8): https://github.com/Erikvl87/docker-languagetool
- Self-hosted CORS forum threads: https://forum.languagetool.org/t/self-hosted-languagetool/4583 , https://forum.languagetool.org/t/local-lt-server-cross-origin-request-blocked/7257
- publicapi.dev listing (claims "CORS: No"): https://publicapi.dev/language-tool-api
- Chrome Local Network Access: https://developer.chrome.com/blog/local-network-access

Web Speech
- Readium Speech, "SpeechSynthesis in browsers and OSes": https://github.com/readium/speech/blob/main/docs/WebSpeech.md
- Readium recommended voices JSON (nl/en/ar; novelty/veryLowQuality filters; BSD-3): https://github.com/readium/speech/tree/main/json
- easy-speech README and FAQ (iOS gesture, max length, Safari delay): https://github.com/jankapunkt/easy-speech , https://github.com/jankapunkt/easy-speech/blob/master/FAQ.md
- MDN boundary event: https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisUtterance/boundary_event
- Chrome 15-second cut-off and pause/resume workaround (summaries): https://dev.to/jankapunkt/cross-browser-speech-synthesis-the-hard-way-and-the-easy-way-353 , https://www.caktusgroup.com/blog/2025/11/03/the-halting-problem/
- Edge 150 undefined natural voices thread: https://techcommunity.microsoft.com/discussions/edgeinsiderdiscussions/edge-version-150-javascript-speechsynthesis-getvoices-undefined-voices/4538591
- Firefox speech-dispatcher on Linux: https://support.mozilla.org/en-US/kb/speechd-setup
- Microsoft Windows voices list: https://support.microsoft.com/en-us/windows/appendix-a-supported-languages-and-voices-4486e345-7730-53da-fcfe-55cc64300f01

Content
- Tatoeba licences (wiki, via search): https://en.wiki.tatoeba.org/history/show-version/3365 ; downloads page: https://tatoeba.org/en/downloads ; Wikipedia overview: https://en.wikipedia.org/wiki/Tatoeba
- tatoebatools (export URL patterns and table columns): https://github.com/LBeaudoux/tatoebatools , https://pypi.org/project/tatoebatools/
- Project Gutenberg: Max Havelaar (nl) https://www.gutenberg.org/ebooks/11024 ; Grimm Sprookjes (nl) https://www.gutenberg.org/ebooks/22555 ; Andersen (nl) https://www.gutenberg.org/ebooks/25580 ; Aesop https://www.gutenberg.org/ebooks/21 , https://www.gutenberg.org/ebooks/11339
- PG licence / trademark summary: https://pressbooks.uiowa.edu/makur3/back-matter/project-gutenberg-license
- Dutch spelling reforms (pre-1947 spelling): https://elon.io/grammar/dutch/regional/older-spelling-conventions

Persistence, deploy, PWA
- web.dev "Storage for the web": https://web.dev/articles/storage-for-the-web
- Safari 7-day cap on script-writable storage: https://searchengineland.com/what-safaris-7-day-cap-on-script-writeable-storage-means-for-pwa-developers-332519 , https://mjtsai.com/blog/2020/03/26/safari-13-1-third-party-cookie-blocking-and-7-day-script-writeable-storage/
- Vercel Vite guide (SPA rewrite): https://vercel.com/docs/frameworks/frontend/vite
- Vercel CDN compression (MIME list): https://vercel.com/docs/how-vercel-cdn-works/compression
- Vercel cache-control defaults: https://vercel.com/docs/headers/cache-control-headers
- Vercel rewrites vs filesystem precedence (community): https://community.vercel.com/t/rewrite-rule-affecting-all-files-under-shop-path-unexpectedly/608
- vite-plugin-pwa: https://github.com/vite-pwa/vite-plugin-pwa
