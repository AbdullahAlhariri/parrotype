# Monkeytype and friends: a design and UX teardown for Parrotype

> **Audience:** the engineers building Parrotype (repo `parrotype`). Parrotype is a playful, parrot-themed typing trainer built with Vite and TypeScript and deployed to Vercel as a static site. It has one user, who makes many typos in Dutch (most important), English and later Arabic, plus grammar and spelling mistakes in Dutch and English.
>
> **Goal:** take apart what makes Monkeytype, keybr and the other polished typing sites *feel* good. Turn that into concrete layout specs, design tokens, timings, DOM/CSS patterns and TypeScript snippets that Parrotype can reuse.
>
> **How this was researched (read this first):**
> - **Monkeytype source.** I cloned `github.com/monkeytypegame/monkeytype` (`master` at commit `1f43321`, 2026-10-02) and read the real code. Every hex value, duration, size and formula below marked **[source]** comes straight from that checkout, with the file path. Monkeytype is mid-migration from jQuery-style TypeScript to **SolidJS + Tailwind v4** (the newest commit is literally "rewrite commandline in solidjs"), so class names and file paths will move. The behaviour and values are stable.
> - **keybr source.** I cloned `github.com/aradzie/keybr.com` (`05a37bc`, 2026-09-28) and read the lesson algorithm, key colouring, heatmap and caret code. **[source]**
> - **typings.gg source.** I cloned `github.com/briano1905/typings`, the site that inspired Monkeytype. **[source]**
> - **ttyper.** I read the README from GitHub. **[source]**
> - **Blocked sites.** The live sites (monkeytype.com, keybr.com, typings.gg, typelit.io, 10fastfingers.com, typing.com, typeracer.com, kbd.news, Wikipedia) are **blocked by the egress proxy**. I could not check live visuals, so claims about TypeLit, TypeRacer, 10FastFingers and Typing.com rest on search-engine summaries and are marked **(secondary)**.
> - **Licences.** Monkeytype is **GPL-3.0**, keybr is **AGPL-3.0** and typings.gg is **GPL-3.0**. Parrotype must **re-implement** ideas, formulas and values, **not copy code, sounds or images**. Colour values, durations and formulas are facts and fine to reuse. The snippets in this doc are written fresh for Parrotype.

---

## 0. TL;DR: 18 rules for Parrotype's look and feel

1. **Type in place.** Draw the caret and the letter colours directly on the target text, as Monkeytype and keybr do. Do not use a separate input box like typings.gg, 10FastFingers and TypeRacer. Capture input with a **hidden, focused `<textarea>`** so IME, dead keys (Dutch `ë`, `é`) and mobile keyboards work. **[source: Monkeytype `#wordsInput`]**
2. **Use one accent colour and 10 colour tokens.** Derive everything else from `--bg`, `--main`, `--caret`, `--sub`, `--sub-alt`, `--text`, `--error`, `--error-extra`, `--colorful-error` and `--colorful-error-extra`. Parrotype adds 2–3 tokens for grammar and spelling (§11.5).
3. **Use a monospace font for the test text and the whole UI.** Monkeytype uses **Roboto Mono 400** almost everywhere. **Lexend Deca** is used only for the logo wordmark. Preload both as `woff2` with `font-display: block`, so the caret never jumps when a fallback font swaps out.
4. **Text colours:** untyped = `--sub` (dim), correct = `--text` (bright), wrong = `--error`, extra letters = `--error-extra` (darker red). A word committed with mistakes gets a **2px `--error` underline**. Missed letters stay in the untyped colour. There is **no** per-letter underline for missed letters; the whole word is underlined.
5. **Show only 3 lines.** After the active word drops to line 3, remove line 1 and slide the text up one line, so the user always types on the **middle line** with one line of context above.
6. **Smooth caret:** a bar `0.1em` wide and `1.2em` tall, centred on the letter. Animate `left/top` (Parrotype: `transform`) over **85 / 100 / 150 ms** (fast / medium / slow). Easing is `inOut(1.25)`, with 100 ms as the default. **Do not blink while typing.** Blink with a 1 s opacity cycle only when idle.
7. **Focus mode.** On the first keystroke, fade out everything except the words, caret and live timer: nav, config bar, footer, key tips, and the mouse cursor (`cursor:none`). Bring them back when the mouse moves more than **3 px**.
8. **Fades are 125 ms.** That covers restart fade-out/in, result fade-in, button colour transitions and the focus fade. Mode switches in the config bar take 250 ms. Respect `prefers-reduced-motion` by setting every duration to 0.
9. **Keep the live stats tiny.** By default only the timer/progress shows, top-left above the words, at the test font size, in `--main`. Live WPM and accuracy are opt-in.
10. **Make the result screen glanceable:** huge **wpm** and **acc** (4rem numbers, 2rem labels) on the left and a 200 px chart on the right. Below them: raw, characters `correct/incorrect/extra/missed`, consistency and time. "Next test" is one Tab+Enter away.
11. **Copy the metrics exactly.** WPM = characters of *fully correct* words, including their trailing space, ÷ 5 ÷ minutes. Raw counts every typed character. Accuracy = correct keypresses ÷ all keypresses (backspaced errors still count against you). Consistency = `100·(1−tanh(c + c³/3 + c⁵/5))`, where c is the coefficient of variation of per-second raw WPM. (§9)
12. **Keyboard first:** Tab then Enter restarts (or an optional single-key quick restart). Esc, Ctrl/Cmd+Shift+P opens a **command palette** that reaches every setting and previews themes live on hover.
13. **Keep the error colour readable.** Monkeytype's default `serika_dark` error red is only **2.70:1** against its background, and its untyped text is 2.17:1. Dim is fine for untyped text, but **Parrotype's whole point is errors**, so `--error` must be ≥ 4.5:1. Never show an error by colour alone: always add an underline.
14. **Mark corrections, not just errors.** Monkeytype's word history shows letters you *fixed* with a **dotted `--main` underline**. That is great feedback for a typo-heavy user (§4.4).
15. **Take keybr's per-key model:** an exponential moving average (α = 0.1) of each key's time-to-type. Key colour is a gradient from `--slow-key` to `--fast-key` by confidence. A new letter unlocks only when every included key has *once* reached the target speed. (§15)
16. **Add a keybr-style keyboard heatmap** for misses and hits (spots scaled by min-max normalised frequency). Add ttyper-style "worst keys" to the result screen. (§15, §16)
17. **Arabic (phase 2):** set `direction: rtl`. Render letters `display: inline` (not `inline-block`) so the letters can join up (as Monkeytype's `joiningScript` does). Prefer the **CSS Custom Highlight API** for colouring Arabic and free-writing text without breaking that joining (§14.4).
18. **Keep the parrot quiet.** The mascot appears in the logo, the result screen, empty states and micro-copy, **never** in the typing area. Restraint is the product.

---

## 1. Why these sites feel good

The common thread is **restraint plus instant, honest feedback**. Concretely:

| Principle | How Monkeytype / keybr do it | Parrotype takeaway |
|---|---|---|
| **The text is the UI** | Words sit in the visual centre (`.pageTest` grid `1fr auto 1fr`). There is no input box: the letters themselves change colour. **[source: `styles/test.scss`]** | Put the words dead centre. The only chrome while typing is the caret and a tiny timer. |
| **One accent colour** | A theme is just 10 hex values (§11). The accent `--main` is used for the timer, active config buttons, the logo, the result numbers and the chart line. Everything else is `--sub`/`--text` on `--bg`. | Same: Parrotype themes are token sets, not stylesheets. |
| **Zero-latency feedback** | DOM updates are batched with `requestDebouncedAnimationFrame` (one rAF per key per frame). The caret position is computed from `offsetLeft/offsetTop` (cheap layout reads). Fonts are preloaded with `font-display: block`. **[source: `elements/caret.ts`, `html/head.html`]** | Never re-render the whole word list per keystroke: patch only the active word. |
| **No layout shift** | `font-variant: no-common-ligatures`. Extra letters can be hidden (`hideExtraLetters`) "to avoid words jumping lines". Untyped letters reserve a transparent `0.05em` bottom border so dead-key underlines don't shift. | Reserve every border you might show later (transparent by default). |
| **Calm motion** | Fades are 125 ms. The caret glides in 85–150 ms. Line scroll is 125 ms (optional). Every animation passes through `applyReducedMotion()`. | Use the same timing scale (§12). |
| **Keyboard first** | Restart with Tab→Enter. Command palette on Esc. Focus mode hides the mouse cursor. | The whole app must be usable without a mouse. |
| **Progressive disclosure** | The test page shows only 3 config groups. The other 100+ options live in the palette and the settings page. | Show 3–4 controls max on the main screen. |
| **Personality in the margins** | The logo subtitle reads "monkey see". Caret styles include "banana", "carrot" and "monkey". There is a "fart" click sound. All of these are opt-in. | Parrot jokes go in micro-copy, results and empty states. Defaults stay sober. |
| **Customisability as delight** | 187 themes. 26 click sounds. 43 fonts. Caret styles. Tape mode. Blind mode. **[source: counts from `constants/themes.ts`, `fonts.ts`, schema]** | Parrotype has one user, so ship 4–6 curated themes and the settings that matter for typo training (§13). |

The Monkeytype README and About page describe the goal as emulating "natural keyboard typing … by unobtrusively presenting the text prompts and displaying typed characters in-place, providing straightforward, real-time feedback on typos, speed, and accuracy." **[source: `components/pages/AboutPage.tsx`]** Monkeytype's author has said he was inspired by **typings.gg**'s "super clean, minimalistic UI" after seeing it on r/mk; Monkeytype launched on 15 May 2020. **(secondary: kbd.news interview via search summary)**

---

## 2. Layout anatomy (Monkeytype)

```
┌──────────────────────────────────────────────────────────────────────────┐  padding-top 2rem
│ [⌨ logo] monkeytype   ⌨  👑  ℹ  ⚙                        🔔  👤 lvl      │  header (flex, gap .5rem)
│          monkey see                                                       │
├──────────────────────────────────────────────────────────────────────────┤  row-gap 2rem
│                                                                          │
│     ┌──────────────────┐ ┌──────────────────────────────┐ ┌──────────────┐│  test config bar (3 "cards",
│     │ @ punctuation #  │ │ ◷time  A words  ❝quote  ▲zen │ │ 15 30 60 120 ⚙││   bg --sub-alt, radius .5rem)
│     │   numbers        │ │ ✎custom                       │ └──────────────┘│   margin-bottom 2rem (mb-8)
│     └──────────────────┘ └──────────────────────────────┘                 │
│                                                                          │
│  23                                         ← live timer "mini" (--main)  │  margin-top -1.25em
│  the quick brown fox jumps over the lazy dog and then some more words    │  line 1 (typed: --text)
│  that keep going |until the line wraps onto the next visible line here   │  line 2 (caret | here)
│  and a third line that is still untyped and shown in the sub color       │  line 3 (--sub)
│                                                                          │
│                                   ⟳                                       │  restart button (text btn)
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│                  tab > enter  - restart test                             │  key tips (text-xs, --sub)
│                  esc or ctrl+shift+p  - command line                     │
│ ✉ contact  ♥ support  </> github  discord  twitter  terms  security  …  🎨 serika dark  v26.x │
└──────────────────────────────────────────────────────────────────────────┘  padding-bottom 2rem
```

### 2.1 Page grid **[source: `styles/core.scss`]**

```scss
#app {
  min-height: 100vh;
  grid-template-rows: [top-start] auto [content-start] 1fr [content-end] auto [top-end];
  row-gap: 2rem;
  padding-top: 2rem;
  padding-bottom: 2rem;
}
.content-grid {               /* Kevin Powell's "content grid" pattern */
  --padding-inline: 2rem;
  --content-max-width: 1536px;
  /* full-width | breakout (+6rem each side) | content */
}
.pageTest { display: grid; grid-template-rows: 1fr auto 1fr; }  /* vertically centres the test */
```

Breakpoints (Tailwind theme overrides): `xxs 331px, xs 426px, sm 721px, md 849px, lg 1105px, xl 1361px, 2xl 1617px`. **[source: `styles/tailwind.css`]** Below `md` (849px) the config bar is hidden and replaced by a single **"test settings"** button that opens a modal. **[source: `components/pages/test/TestConfig.tsx`]**

### 2.2 Header **[source: `components/layout/header/*.tsx`]**

- **Logo:** an SVG keyboard-shaped mark, height `1.5rem` (`h-6`), coloured `--main`. Next to it, the wordmark **"monkeytype"** in **Lexend Deca**, `2rem`, colour `--text`. Above the wordmark sits a tiny subtitle **"monkey see"** (`0.315em` of 2rem ≈ 10px, `--sub`), shown only at `lg+`. Clicking the logo on the test page restarts the test.
- **Focus mode:** the logo mark and wordmark change to `--sub` (`transition-colors`, 250 ms for the wordmark, 125 ms for the subtitle, which becomes transparent).
- **Nav:** icon-only "text" buttons (Font Awesome): keyboard (test), crown (leaderboards), info (about), cog (settings), then a flexible spacer, then bell (notifications) and the account avatar/menu with an XP bar (a notification bubble flags pending friend requests). In focus mode their opacity goes to `var(--nav-focus-opacity)`, which is `0` by default. Some themes set it to `0.5`.
- **Theme hooks:** `data-nav-item="test|leaderboards|about|settings|alerts"` lets individual themes recolour nav icons. Dracula, for example, gives each icon a different Dracula colour. **[source: `static/themes/dracula.css`]**

### 2.3 Test config bar **[source: `TestConfig.tsx`]**

- **Three groups,** each a "card" (`background: var(--sub-alt-color)`, `border-radius: var(--roundness)` = `0.5rem`):
  1. `@ punctuation`, `# numbers` (hidden in zen mode; disabled in quote mode);
  2. mode: `time`, `words`, `quote`, `zen`, `custom`;
  3. mode-specific values ("mode2"): time `15 30 60 120 ⚙`; words `10 25 50 100 ⚙`; quote `all short medium long thicc ♥ search`; custom `change`.
- **Responsive size variables:** font-size `0.5em → 0.6em (md) → 0.75em (lg/xl)`, card gap `0.25em → 1em → 2em (xl)`, horizontal button padding `0.4–1em`, vertical padding `0.5–0.75rem`.
- **Button colours** (`button.text`): normally `--sub`; `.active` = `--main`; hover = `--text`; `:active` (pressed) = `--sub`. Colour transitions take **0.125s**. **[source: `styles/buttons.scss`]**
- **Mode switch:** the old mode2 card fades out while the new one fades in, and the wrapper animates its width, over **250 ms**.
- **Focus mode:** the whole bar gets `opacity-0 pointer-events-none` with `transition-opacity duration-125`. It also hides on the result screen.
- **Share button:** a share-settings button slides in from the right on hover.

### 2.4 Test area **[source: `html/pages/test.html`, `styles/test.scss`]**

```html
<div id="typingTest">
  <!-- caps lock warning, mode notices, live stats (mini/text) -->
  <div id="wordsWrapper" translate="no">
    <textarea id="wordsInput" autocomplete="off" autocapitalize="none" autocorrect="off"
              spellcheck="false" data-gramm="false" data-gramm_editor="false"
              data-enable-grammarly="false" data-1p-ignore data-lpignore="true"></textarea>
    <!-- out-of-focus warning -->
    <div id="paceCaret" class="default hidden"></div>
    <div id="caret" class="default"></div>
    <div id="words"></div>
  </div>
  <button id="restartTestButton" aria-label="Restart Test"><i class="fa-redo-alt"></i></button>
</div>
```

Things worth copying exactly:

- **`translate="no"`** on the wrapper, so browser auto-translate does not rewrite the target words.
- **The hidden textarea** (`width:0; opacity:0; caret-color:transparent; position:absolute; z-index:-1; pointer-events:none; contain:strict`). Its attributes switch off autocorrect, spellcheck, Grammarly, password managers and autofill. For a *Dutch* user these attributes are essential: an OS-level autocorrect would silently fix typos before Parrotype can see them.
- `#words { display:flex; flex-wrap:wrap; align-content:flex-start; user-select:none; padding-bottom:.5em }`.
- The out-of-focus state: `#words.blurred { opacity:.25; filter: blur(4px) }`, plus a centred message **"Click here or press any key to focus"** after **1 second** out of focus.

### 2.5 Footer **[source: `components/layout/footer/*.tsx`]**

- **Key tips** (`text-xs` = 0.75rem, `--sub`, centred, `mb-8`):
  - `<kbd>tab</kbd> > <kbd>enter</kbd> - restart test`, or the single quick-restart key if one is configured;
  - `<kbd>esc</kbd> or <kbd>ctrl/cmd</kbd>+<kbd>shift</kbd>+<kbd>p</kbd> - command line`. The "or Ctrl+Shift+P" part is hidden on Firefox.
- **`<kbd>` style:** `color: var(--bg-color); background: var(--sub-color); padding: .2em .4em; border-radius: .25em; font-size: .75em`. **[source: `styles/core.scss`]**
- **Links row:** contact, support, github, discord, twitter, terms, security, privacy. On the right: the **current theme name** (clicking it opens the theme picker) and the **version**. Everything fades to `opacity-0` in focus mode.

---

## 3. Typography

| Element | Font | Size | Colour | Notes |
|---|---|---|---|---|
| Body / all UI | `"Roboto Mono", "Vazirharf", monospace` (`--font`) | 1rem (16px), `line-height: 1.25` on `html` | `--text` | `Vazirharf` is a Persian/Arabic fallback face, so RTL scripts render well. **[source: `core.scss`, `fonts.scss`]** |
| Logo wordmark | **Lexend Deca** 400 | 2rem | `--text` (focus: `--sub`) | The only non-mono text. |
| Test words | the user's font setting (default Roboto Mono) | `fontSize` setting in rem, **default 2 → 32px** | §4 | Applied to `#caret, #paceCaret, #typingTest, #wordsInput`, so the caret scales with the text. |
| Word box | | `font-size: 1em; line-height: 1em; margin: .25em .3em` | | Line pitch = 1em + 2×0.25em + 2px border ≈ **1.5em + 2px** = 50px at 32px. |
| Live timer "mini" | test font | same as the test (`fontSize` rem) | `--main` (configurable: main/sub/text/black) | Opacity is configurable (0.25/0.5/0.75/1). |
| Live "text" style | test font | `4rem → 10rem` responsive, very large, behind the text (`z-index:-1`) | timer colour | An alternative, bolder style. |
| Config bar | `--font` | 0.5–0.75em | `--sub` / `--main` active | |
| Result: wpm/acc | `--font` | label **2rem** (line-height 1.5rem), number **4rem** | label `--sub`, number `--main` | **[source: `test.scss` `#result .stats`]** |
| Result: other stats | `--font` | label 1rem, value **2rem** | label `--sub`, value `--main` | `test type`, `other`, `source` values are 1rem. |
| Command palette rows | `--font` | `text-xs` (0.75rem), `leading-3` | `--sub`; active row inverted (`bg-text text-bg`) | The input is `text-base`, `py-4`. |
| Footer, key tips | `--font` | 0.75rem | `--sub` | |

Fonts are self-hosted `woff2` files, preloaded in `<head>`:

```html
<link rel="preload" href="/webfonts/RobotoMono-Regular.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/webfonts/LexendDeca-Regular.woff2" as="font" type="font/woff2" crossorigin>
```

with `@font-face { font-display: block }`. **[source: `html/head.html`, `styles/standalone.scss`]** Monkeytype also ships a "`<Font> Preview`" face for every font, so the command palette can render each font option *in that font*.

**Parrotype:** self-host **Roboto Mono** and **Lexend Deca** (both SIL OFL on Google Fonts) via `@fontsource/roboto-mono` and `@fontsource/lexend-deca`, or copy the `woff2` files into `public/fonts/`. For phase 2, add **Vazirmatn** or **Noto Naskh Arabic** (both OFL) for Arabic. Monkeytype offers `Noto_Naskh_Arabic` as a font option. **[source: `constants/fonts.ts`]**

---

## 4. Letters, words and error display

### 4.1 DOM model **[source: `test/test-ui.ts`]**

Every word is a `div.word[data-wordindex]` and every character is a custom `<letter>` element (`display:inline-block`):

```html
<div class="word typed error" data-wordindex="3">
  <letter class="correct">h</letter><letter class="incorrect">e</letter><letter>t</letter>
</div>
<div class="word active" data-wordindex="4">
  <letter class="correct">h</letter><letter class="correct">u</letter><letter>i</letter><letter>s</letter>
</div>
```

- **Newlines and tabs:** these get their own `letter.nlChar` / `letter.tabChar`, holding an icon at `opacity:.2`. A newline is followed by `.beforeNewline .newline .afterNewline` spacer divs that force the flex wrap.
- **Active word re-rendering:** only the *active* word is re-rendered on each input (`updateWordLetters`, in a rAF keyed by word index).
- **Character splitting:** words are split with `Strings.splitIntoCharacters` (code-point aware), not `str.split("")`. This matters for emoji and for combining marks: Arabic harakat, and Dutch `ë` when it is typed as `e` + U+0308.

### 4.2 Letter states and colours **[source: `styles/test.scss`]**

`#words` defines indirection variables, so modes like *flipped* or *colorful* can remap all colours at once:

```scss
#words {
  --correct-letter-color:   var(--text-color);
  --untyped-letter-color:   var(--sub-color);
  --incorrect-letter-color: var(--error-color);
  --extra-letter-color:     var(--error-extra-color);
}
.word letter                 { color: var(--untyped-letter-color);
                               border-bottom: .05em solid transparent; }      /* reserved */
.word letter.correct         { color: var(--correct-letter-color); }
.word letter.incorrect       { color: var(--incorrect-letter-color); }
.word letter.incorrect.extra { color: var(--extra-letter-color); }
.word letter.dead            { border-bottom-color: var(--untyped-letter-color); } /* IME/dead-key composition in progress */
.word letter.corrected       { color: var(--correct-letter-color);
                               border-bottom: 2px dotted var(--main-color); }  /* result history: you fixed this */
.word letter.missing         { opacity: .5; }

.word { position: relative; font-size: 1em; line-height: 1em; margin: .25em .3em;
        font-variant: no-common-ligatures; border-bottom: 2px solid transparent; }
.word.error {                               /* committed word that is wrong */
  border-bottom: 2px solid var(--error-color);
  text-shadow: 1px 0 0 var(--bg-color), -1px 0 0 var(--bg-color),
               0 1px 0 var(--bg-color), 1px 1px 0 var(--bg-color), -1px 1px 0 var(--bg-color);
}
#words.colorfulMode { --correct-letter-color: var(--main-color);
                      --incorrect-letter-color: var(--colorful-error-color);
                      --extra-letter-color: var(--colorful-error-extra-color); }
#words.flipped      { --correct-letter-color: var(--sub-color); --untyped-letter-color: var(--text-color); }
```

The `text-shadow` on `.word.error` is a neat trick. It paints a 1px background-coloured halo round the glyphs, so descenders (g, j, p, y) "cut" the red underline instead of colliding with it, like `text-decoration-skip-ink`.

Summary of what the user sees:

| Situation | Rendering |
|---|---|
| Not typed yet | letter in `--sub` |
| Typed correctly | letter in `--text` |
| Typed wrong (default `indicateTypos: off`) | the **target** letter shown in `--error`. The wrong key you pressed is *not* shown. |
| Typed wrong, `indicateTypos: replace` | the **typed** character shown in `--error`, replacing the target. A space shows as `_`. |
| Typed wrong, `indicateTypos: below` | the target letter in red, plus the typed letters as a small "hint" under it (`font-size:.75em; bottom:-1.1em; opacity:.5`). Adjacent wrong letters are merged into one hint. |
| Typed wrong, `indicateTypos: both` | the typed char replaces the target, and the target is shown below. |
| Extra letters (typed past the word's end) | appended `letter.incorrect.extra` in `--error-extra` (darker red). The word grows, and can wrap. |
| Space pressed early (missed letters) | missed letters stay `--sub`. The whole word gets the 2px `--error` underline. |
| Space pressed on a correct word | no underline. The word keeps `--text`. |
| Blind mode | incorrect letters are drawn in the *correct* colour, extra letters are hidden, and the error underline is transparent. |

**Parrotype default for this user:** use `indicateTypos: "below"`, so the user sees both what they *should* have typed (big, red) and what they *did* type (small, below). That pairing is exactly what helps a typo-prone typist notice their own error patterns (for example `teh`/`the`, or Dutch `ij`/`y`). Keep `replace` as an option.

### 4.3 Highlight modes and typed effects **[source]**

- **`highlightMode`:** `off | letter (default) | word | next_word | next_two_words | next_three_words`. Word modes colour whole words instead of single letters: the active word in `--text`, typed words back in `--sub`, and wrong words red.
- **`typedEffect`:** `keep (default) | hide | fade | dots`.
  - `fade`: `fadeOut 250ms ease-in` on typed words.
  - `dots`: each typed letter shrinks into a coloured dot (`scale(.4)`, 200 ms); the dot is red if the letter was wrong.
  - All of these honour `prefers-reduced-motion`.

### 4.4 Corrections and words history (result screen) **[source: `buildWordLettersHTML`]**

After the test, Monkeytype rebuilds every word from the event log:

- letters you got wrong **and later fixed** are shown with `letter.corrected` (normal colour plus a **dotted `--main` underline**);
- extra letters you later deleted get `extraCorrected` (a dotted right border);
- hovering a word shows a tooltip with **exactly what you typed** (spaces as `_`) and the word's **burst speed**;
- an optional **burst heatmap** colours each word by its speed.

**Parrotype:** this is the most valuable screen for a typo-heavy user. Extend it:

1. Colour-code the *typo type* per word: transposition, neighbour key, doubled letter, omission. The classification algorithm is in `typing-pedagogy.md`.
2. Give each word a "practice these words" button. Monkeytype has **"practice words"** with missed/slow options.

---

## 5. The caret: deep dive

### 5.1 CSS **[source: `styles/caret.scss`, `styles/animations.scss`]**

```scss
#caret {
  position: absolute;
  height: 1.2em;                       /* relative to test font size (2rem → 38.4px) */
  background: var(--caret-color);
  border-radius: var(--roundness);     /* .5rem → effectively a pill */
  animation: caretFlashSmooth 1s infinite;
  transform-origin: top left;
}
#caret.default   { width: .1em; }      /* ≈3.2px at the default 2rem; keybr's line caret is a fixed 2px */
#caret.block     { width: .5em; z-index: -1; border-radius: .05em; }   /* sits behind the letter */
#caret.outline   { width: .5em; background: transparent; border: .05em solid var(--caret-color); animation-name: none; }
#caret.underline { height: .1em; width: .5em; }
#paceCaret       { background: var(--sub-color); opacity: .5; height: 1.2em; }  /* ghost caret at target pace */

@keyframes caretFlashSmooth { 0%,100% { opacity: 0 } 50% { opacity: 1 } }
@keyframes caretFlashHard   { 0%,50% { opacity: 1 } 51%,100% { opacity: 0 } }   /* used when smoothCaret = off */
```

Caret styles: `off, default (line), block, outline, underline, carrot, banana, monkey`. The last three are image carets. Full-width styles (block, outline, underline) take the **width of the letter they sit on**.

> Correction to the task brief: Monkeytype's default line caret is **`0.1em`** wide, not 2px. At the default size that is ≈3.2px. The **2px** figure is keybr's line caret (§15.4).

### 5.2 When it blinks **[source: `test/focus.ts`, `test/test-ui.ts`]**

- On every input, `Focus.set(true)` turns focus mode on, and `Caret.stopAnimation()` sets `animation-name:none; opacity:1`. The caret is **solid while typing**.
- `Caret.startAnimation()` runs only when focus mode is *left* (mouse moved more than 3px, page change, restart), or when the caret is shown. So **the caret blinks while idle before the test, and after you touch the mouse**.
- With `smoothCaret: off`, the blink is the hard on/off keyframe instead of the smooth fade.

**Parrotype recommendation:** go one step further, like text editors do. Add `.caret--idle` (blinking) after **~600 ms without input**, even in focus mode. A user who pauses to think about a Dutch spelling should see "you are here". This is a deliberate deviation from Monkeytype (my judgement).

### 5.3 How the position is computed **[source: `elements/caret.ts` → `goTo()` / `getTargetPositionAndWidth()`]**

1. **Schedule:** `goTo({wordIndex, letterIndex})` runs inside `requestDebouncedAnimationFrame`, so it runs at most once per frame.
2. **Pick a side:** the caret sits on the **left edge of the target letter** (`beforeLetter`). When `letterIndex >= word length` (the word is finished, or there are extra letters) it switches to the **right edge of the last letter** (`afterLetter`). In blind mode and hide-extra mode it clamps to the last real letter.
3. **Find the letter:** look up the `<letter>` element. If it is invisible (`offsetWidth === 0`), walk back to the nearest visible letter.
4. **Compute the position for LTR, no tape:**
   ```
   left = letter.offsetLeft + word.offsetLeft (+ letter.offsetWidth if afterLetter) − caretWidth/2
   top  = letter.offsetTop  + word.offsetTop  + (letter.offsetHeight − caretHeight)/2
   ```
   For the underline style, `top += letter.offsetHeight` and the vertical centring is skipped. Full-width styles take `width = letter.offsetWidth`, and use the word's inline margin (the "space width") when the caret is after the word.
5. **RTL:** an RTL word (whole-word check, or per-letter in zen/custom mode) mirrors this logic. `left` starts from the letter's right edge, and `afterLetter` subtracts the letter width.
6. **Tape mode:** the main caret is **locked** at `tapeMargin%` of the wrapper width (default 50%), and the *text* scrolls under it instead.

### 5.4 How it animates **[source: `Caret.animatePosition()`]**

```ts
const smoothCaretSpeed = { off: 0, slow: 150, medium: 100, fast: 85 }[Config.smoothCaret]; // ms, default "medium"
this.posAnimation = this.element.animate({ left, top, width?, duration: smoothCaretSpeed, ease: "inOut(1.25)" }); // anime.js v4
```

- A new move **cancels** the running position animation (`posAnimation?.cancel()`) and starts a new one from wherever the caret currently is. At 100+ WPM the caret is therefore always chasing the latest target and never queues up.
- **Line jumps** are animated on a **separate channel** (`marginTop`), so they don't fight with the left/top animation. Afterwards the margin is folded back into `top` (`readyToResetMarginTop`). Tape scrolling does the same with `marginLeft`.
- `inOut(1.25)` is anime.js's power-in-out easing with exponent 1.25: gentle, close to `ease-in-out`. A good CSS stand-in is `cubic-bezier(.45, 0, .55, 1)`, or plain `ease-in-out`.

### 5.5 Parrotype caret: a fresh implementation (Web Animations API + transform)

Using `transform` instead of `left/top` keeps the animation on the compositor. The trick is to **read the caret's current on-screen transform** before cancelling the old animation, so the new one starts from where the caret actually is.

```ts
// src/ui/caret.ts
export type CaretSpeed = 'off' | 'slow' | 'medium' | 'fast';
const SPEED_MS: Record<CaretSpeed, number> = { off: 0, slow: 150, medium: 100, fast: 85 };
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export class Caret {
  private anim: Animation | null = null;
  private idleTimer = 0;
  constructor(private el: HTMLElement, private speed: CaretSpeed = 'medium', private idleMs = 600) {}

  /** Move to the left edge (or right edge when `after`) of `letter`, relative to `container`. */
  moveTo(letter: HTMLElement, container: HTMLElement, after = false, rtl = false): void {
    const word = letter.offsetParent as HTMLElement;          // .word is position:relative
    const caretW = this.el.offsetWidth, caretH = this.el.offsetHeight;
    let x = word.offsetLeft + letter.offsetLeft;
    const edgeRight = rtl ? !after : after;
    if (edgeRight) x += letter.offsetWidth;
    x -= caretW / 2;
    const y = word.offsetTop + letter.offsetTop + (letter.offsetHeight - caretH) / 2;
    this.translate(x, y);
  }

  private translate(x: number, y: number): void {
    const to = `translate(${x}px, ${y}px)`;
    const ms = reduceMotion() ? 0 : SPEED_MS[this.speed];
    const from = getComputedStyle(this.el).transform;       // current visual position, mid-animation
    this.anim?.cancel();
    this.el.style.transform = to;
    if (ms > 0 && from !== 'none') {
      this.anim = this.el.animate([{ transform: from }, { transform: to }],
        { duration: ms, easing: 'cubic-bezier(.45,0,.55,1)' });
    }
    this.markActive();
  }

  /** Solid while typing, blink after idleMs. */
  markActive(): void {
    this.el.classList.remove('caret--idle');
    clearTimeout(this.idleTimer);
    this.idleTimer = window.setTimeout(() => this.el.classList.add('caret--idle'), this.idleMs);
  }
}
```

```css
.caret { position:absolute; left:0; top:0; width:.1em; height:1.2em; border-radius:999px;
         background: var(--caret); will-change: transform; pointer-events:none; }
.caret--idle { animation: caret-blink 1s ease-in-out infinite; }
@keyframes caret-blink { 0%,100% { opacity: 0 } 50% { opacity: 1 } }
@media (prefers-reduced-motion: reduce) { .caret--idle { animation: none; } }
```

**Performance notes:**

- Read all `offset*` values first, then write `style`, to avoid layout thrash.
- Call `moveTo` from inside the same rAF that patched the active word.
- `getComputedStyle(el).transform` forces style recalculation, not layout, which is cheap enough here.
- Re-run `moveTo` without animation on `resize`, on font load (`document.fonts.ready`) and on font-size change.

---

## 6. Line scrolling (3-line window) and tape mode

### 6.1 The 3-line window **[source: `test/test-ui.ts` → `updateWordsWrapperHeight()` / `lineJump()`]**

- **Wrapper height:** `#wordsWrapper` gets an explicit pixel height equal to the first **3 distinct line tops** (it walks words until it has seen 3 different `offsetTop` values). It has `overflow: visible clip`, so the hint row below can still show.
- **Line jump:** on each word change, if `newActiveWord.offsetTop > previousActiveWord.offsetTop` (the caret moved down a line), call `lineJump(previousTop)`:
  - `currentTestLine` starts at 0. The **first** line change just increments it, so you type line 2 with line 1 still visible above.
  - From the **second** line change on (`currentTestLine > 0`), every element on lines above the previous line is removed, and `#words` is shifted up by one line height.
  - With `smoothLineScroll` on (**default off**), the shift is `#words.animate({ marginTop: -lineHeight, duration: 125 })`. The removed DOM is deleted at the end and `marginTop` is reset to 0. The caret runs the same `marginTop` animation on its own channel. With it off, the removal is instant.
- **Result:** the active line is always line 2 of 3, with one finished line above for context and one upcoming line below.
- **`showAllLines`** (word, quote and custom modes only) turns the window off and lets the text grow.
- **`maxLineWidth`** (in `ch`, 0 = full width) limits the measure. Parrotype should default to about **60–70ch** for readability.

**Parrotype implementation sketch:**

```ts
// After patching the active word:
const top = activeWord.offsetTop;
if (top > lastTop) {
  linesPassed++;
  if (linesPassed >= 2) {               // keep exactly one finished line visible
    const lineH = activeWord.offsetHeight + 2 * parseFloat(getComputedStyle(activeWord).marginTop);
    const firstLineTop = (wordsEl.firstElementChild as HTMLElement).offsetTop;
    const doomed = [...wordsEl.children].filter(w => (w as HTMLElement).offsetTop === firstLineTop);
    const anim = reduceMotion() ? null
      : wordsEl.animate([{ transform: 'translateY(0)' }, { transform: `translateY(${-lineH}px)` }],
                        { duration: 125, easing: 'ease-in-out' });
    const finish = () => { doomed.forEach(n => n.remove()); caret.reposition(false); };
    anim ? anim.finished.then(finish) : finish();
  }
  lastTop = top;
}
```

(Monkeytype animates `margin-top`. A `transform` on `#words` plus the caret, or better, on a shared inner container holding both the words and the caret, is smoother. If the caret is a child of the scrolled container, the line jump needs no separate caret sync at all.)

### 6.2 Tape mode **[source]**

- **What it is:** `tapeMode: off | letter | word`. A single line scrolls horizontally: per keypress in `letter` mode, per word in `word` mode. The caret stays fixed at `tapeMargin`% (10–90, default 50).
- **Scroll animation:** `marginLeft`, **125 ms**, `inOut(1.25)`.
- **Edge fade:** `mask-image: linear-gradient(90deg, transparent 1%, #000 10%, #000 90%, transparent 99%)`.
- **Parrotype:** offer it as a "focus line" option. It works well on narrow phone screens and for long dictation sentences.

---

## 7. Focus mode, live stats and warnings

### 7.1 Focus mode **[source: `test/focus.ts`]**

- **Turning it on:** the first keystroke of the test (`onTestStart`) and every later input call `Focus.set(true)`. That adds `.focus` to `#app, footer, main, …`, sets `cursor: none` on `body, button, a`, and stops the caret blink.
- **What fades:** header nav → `opacity: var(--nav-focus-opacity)` (0). Logo → `--sub`. Test config → `opacity:0; pointer-events:none`. Footer and key tips → `opacity:0`. The restart button → `opacity:0`, except on `:focus-visible`, so Tab still reveals it.
- **Turning it off:** a `mousemove` with `movementX > 3 || movementY > 3`. The threshold exists so "mouse/desk vibration" doesn't cause flicker. Also page change and test restart.
- **Timing:** opacity transitions of 125 ms (`duration-125`), or Tailwind's default `--default-transition-duration: 0.25s`.

### 7.2 Live stats **[source: `components/pages/test/live-stats/*`, default config]**

| Setting | Options | Default |
|---|---|---|
| `timerStyle` ("live progress") | `off, bar, text, mini, flash_text, flash_mini` | **`mini`** |
| `liveSpeedStyle` | `off, text, mini` | `off` |
| `liveAccStyle` | `off, text, mini` | `off` |
| `liveBurstStyle` | `off, text, mini` | `off` |
| `timerColor` | `black, sub, text, main` | `main` |
| `timerOpacity` | `0.25, 0.5, 0.75, 1` | `1` |

- **mini:** a flex row with gap `.5em`, `margin-top: -1.25em`, `margin-left: .25em`, at the **test font size**, sitting just above the first line. Time mode shows seconds remaining. Words mode shows `typed/total`.
- **bar:** a fixed `8px` (`h-2`) bar across the very top of the viewport.
- **text:** a giant translucent number behind the words.

**Parrotype:** default to **mini timer plus live accuracy** in `--main`. Accuracy matters more than speed for this user. Keep live WPM opt-in.

### 7.3 Warnings

- **Caps Lock** warning (on by default).
- **Out of focus:** after 1s, blur the words and show "Click here or press any key to focus" (or "Click anywhere to focus the window" when the window itself lost focus).
- **Loading:** a spinner appears only after a **0.5 s delay** (`animation-delay: .5s`), so fast transitions never flash it.

---

## 8. Result screen

### 8.1 Layout **[source: `html/pages/test-result.html`, `styles/test.scss`]**

```
┌──────────────┬───────────────────────────────────────────────────────────┐
│ wpm 👑        │  WPM chart (Chart.js, height 200px)                        │
│ 87           │   ── wpm (main, 3px)   - - raw (main @60%, 2px, dash 8/8)  │
│ acc          │   ×  errors (error colour, crossRot r=3, right axis)       │
│ 96%          │                                                           │
├──────────────┴───────────────────────────────────────────────────────────┤
│ test type      other     raw     characters        consistency   time     │
│ time 30        —         92      412/9/2/3         78%           30s      │
│ english                                                                   │
├──────────────────────────────────────────────────────────────────────────┤
│  [ › next test ] [ ⟳ repeat ] [ ⚠ practice words ] [ ≡ words history ]    │
│  [ ▶ replay ] [ 📷 screenshot ]                                            │
└──────────────────────────────────────────────────────────────────────────┘
```

**Grid and sizes:**

- `.wrapper` is a grid: `grid-template-columns: auto 1fr; grid-template-areas: "stats chart" "morestats morestats"; gap: 1rem`.
- Big stats (`.wpm`, `.acc`): label `2rem`, number `4rem`. Other groups: label `1rem`, value `2rem`. Labels are `--sub`, values `--main`.

**PB crown:**

- A `1.7rem` square badge next to "wpm" (`background: --main; color: --bg; border-radius: --roundness`).
- States: new PB (crown), pending (outlined), ineligible (slashed), error (question mark), warning (exclamation).

**Characters:** shown as `correct/incorrect/extra/missed`, with a tooltip spelling out the four labels.

**Time:** shows AFK time and "time today" as small `0.75rem` `--sub` annotations.

**Buttons:** next test, repeat test (same words), practice words, toggle words history, watch replay, and save screenshot (copies to clipboard; Shift+click downloads).

### 8.2 The chart **[source: `controllers/chart-controller.ts`]**

| Dataset | Type | Colour | Width / marker |
|---|---|---|---|
| wpm | line | `--main` | `borderWidth 3`, `pointRadius 1` |
| raw | line | `--main` + `99` alpha (≈60%) | `borderWidth 2`, `borderDash [8, 8]`, no points |
| errors | **scatter** | `--error` | **`pointStyle: "crossRot"` (×)**, radius 3 (5 on hover), hidden when the value is 0. Own right-hand y-axis titled "Errors". |
| burst | line (hidden by default) | `--sub` | `borderWidth 3` |

- **Axes:** grid colour `--sub-alt`; ticks and axis titles `--sub`; x-axis = seconds; `maintainAspectRatio:false`.
- **Legend:** a small legend (`scale`, `pb line`, `raw`, `burst`, `errors` toggles) fades in **only on chart hover** (`opacity 0 → 1`, 125 ms).
- **What the lines mean:** the wpm line is a **running average** to that second, while raw is **momentary** per-second speed. The About page explains this. **[source: `AboutPage.tsx`]**

> Correction to the task brief: errors are drawn as red **× markers**, not dots.

### 8.3 Transitions **[source: `test/test-logic.ts`, `test/result.ts`]**

1. `#typingTest` fades to `opacity 0` (**125 ms**).
2. The loading spinner shows (it only becomes visible after its 0.5 s CSS delay).
3. Stats are calculated.
4. `#result` fades in (**125 ms**) and gets focus (`tabindex=-1`), and the page scrolls to centre it.

Restart is a 125 ms fade-out and a 125 ms fade-in. All durations are wrapped in `applyReducedMotion(ms)`, which returns `prefersReducedMotion() ? 0 : ms`.

### 8.4 Account / history (for Parrotype's local "progress" page)

- **Activity heatmap** (GitHub-style calendar) **[source: `styles/test-activity.scss`]**: square cells, `gap .25em`, `border-radius .25em`. The level colours mix `--main` into `--sub-alt`:
  ```css
  [data-level="0"] { background: var(--bg-color); }
  [data-level="1"] { background: color-mix(in srgb, var(--main-color) 20%, var(--sub-alt-color)); }
  [data-level="2"] { background: color-mix(in srgb, var(--main-color) 50%, var(--sub-alt-color)); }
  [data-level="3"] { background: color-mix(in srgb, var(--main-color) 75%, var(--sub-alt-color)); }
  [data-level="4"] { background: var(--main-color); }
  ```
  Because it is pure `color-mix` on tokens, the heatmap matches every theme for free.
- **Stats tiles:** tests started / completed, time typing, and for wpm, raw, acc and consistency each a *highest*, *average* and *average (last 10)*. A history chart shows every result plus averages over 10 and 100 results.
- **PBs** are stored per `mode` + `mode2` (time 15/30/60/120, words 10/25/50/100), keyed by `language`, `punctuation`, `numbers`, `difficulty` and `lazyMode`. Each PB keeps `{wpm, raw, acc, consistency, timestamp}`. **[source: `packages/schemas/src/shared.ts`]**
- **Parrotype:** store results in **IndexedDB** (`idb-keyval` or Dexie), plus a JSON export/import button, since there is no backend. PB key: `${mode}:${mode2}:${language}:${punct}:${numbers}`.

---

## 9. Metrics: exact formulas (and a fresh TS port)

From the source (`test/test-logic.ts`, `test/events/stats.ts`, `utils/strings.ts → countChars`, `utils/numbers.ts`, `packages/util/src/numbers.ts`) and the About page:

| Metric | Definition | Notes |
|---|---|---|
| **wpm** | `correctWordChars / 5 / (seconds / 60)` | `correctWordChars` counts characters of words typed **exactly right**, **including the trailing space** (target words carry their commit space). In time mode (or when bailing out), a partially typed *last* word earns credit for its correct prefix. |
| **raw** | `(allCorrect + incorrect + extra) / 5 / minutes` | Every typed character, right or wrong. |
| **acc** | `correctKeypresses / (correctKeypresses + incorrectKeypresses) × 100` | Counted **per input event**, so a wrong key you later backspace **still lowers accuracy**. |
| **characters** | `correct / incorrect / extra / missed` | missed = target chars never typed (word committed early). extra = chars past the word end, or typed in place of the space. |
| **consistency** | `kogasa(stdev(rawPerSecond) / mean(rawPerSecond))` | `kogasa(c) = 100 · (1 − tanh(c + c³/3 + c⁵/5))`. Population std-dev (÷n). |
| **key consistency** | same kogasa on the intervals between keydowns (last interval dropped) | |
| **wpm history** | per-second running wpm (the chart line) | |
| **burst** | per-word speed (wpm for that single word) | shown in the history hover. |

Fresh TypeScript implementation for Parrotype (re-derived, not copied):

```ts
// src/core/stats.ts
export interface CharCounts { correctWordChars: number; correct: number; incorrect: number; extra: number; missed: number; }

/** Compare one committed word (input may include trailing space) to its target (with trailing space). */
export function countWord(input: string, target: string, creditPartial = false): CharCounts {
  const inp = [...input], tgt = [...target];             // code points, not UTF-16 units
  const exact = input === target;
  const prefixOk = target.startsWith(input);
  const r: CharCounts = { correctWordChars: 0, correct: 0, incorrect: 0, extra: 0, missed: 0 };
  for (let i = 0; i < Math.max(inp.length, tgt.length); i++) {
    const a = inp[i], b = tgt[i];
    if (a === b) {
      if (b === ' ' && !exact) r.extra++; else r.correct++;
      if (exact || (creditPartial && prefixOk)) r.correctWordChars++;
    } else if (a === undefined) {
      if (!creditPartial) r.missed++;
    } else if (b === undefined || (b === ' ' && a !== ' ' && !input.includes(' '))) {
      r.extra++;
    } else {
      r.incorrect++;
    }
  }
  return r;
}

export const wpm = (chars: number, seconds: number) => (seconds > 0 ? chars / 5 / (seconds / 60) : 0);

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const stdev = (xs: number[]) => { const m = mean(xs); return xs.length ? Math.sqrt(mean(xs.map(x => (x - m) ** 2))) : 0; };
export const kogasa = (cov: number) => 100 * (1 - Math.tanh(cov + cov ** 3 / 3 + cov ** 5 / 5));
export function consistency(rawPerSecond: number[]): number {
  const m = mean(rawPerSecond); if (!m) return 0;
  const v = kogasa(stdev(rawPerSecond) / m);
  return Number.isFinite(v) ? Math.round(v * 100) / 100 : 0;
}
export const accuracy = (correctKeys: number, wrongKeys: number) =>
  correctKeys + wrongKeys === 0 ? 0 : (correctKeys / (correctKeys + wrongKeys)) * 100;
```

**Parrotype additions**, aimed at typo training (see `typing-pedagogy.md`):

- **corrected vs uncorrected error rate** (Soukoreff & MacKenzie);
- **per-key and per-bigram miss rate and latency** (keybr style, §15);
- **typo-type distribution**;
- **"words with mistakes"** list for the practice loop.

---

## 10. Keyboard shortcuts and the command palette

### 10.1 Shortcuts **[source: `states/hotkeys.ts`, `input/hotkeys/*`, `CommandlineHotkey.tsx`]**

| Action | Default | Notes |
|---|---|---|
| Restart test | **Tab, then Enter** (Tab focuses `#restartTestButton`, Enter activates it) | `quickRestart` setting: `off (default) / esc / tab / enter` makes it a single key. Plain quick restart is **blocked in long tests** (words ≥ 1000 or infinite, time ≥ 900 s or infinite, long custom texts; `utils/quick-restart.ts`) ("Quick restart disabled in long tests. Press shift + tab … to confirm"), and **Shift+key** is the confirm. If the text itself contains tabs or newlines, the key becomes Shift+Tab / Shift+Enter. Repeating the *same words* is a separate "repeat test" button on the result screen. |
| Command line | **Esc**, or **Ctrl/Cmd+Shift+P** (not on Firefox) | If `quickRestart = esc`, the command line moves to Tab. |
| Next test (on result) | Tab → Enter on the focused "next test" button | |
| Bail out of a long test | Shift+Enter twice | |
| Logo click | restart (on the test page) | |
| Palette navigation | ↑/↓, **Ctrl+K/J**, **Ctrl+P/N**, Tab, Enter, Esc | **[source: `CommandlineModal.tsx`]** |

The page also registers a `keydown` listener that calls `preventDefault()` on Escape at the very top of `<head>`, before any app code loads, so the browser's default Esc handling does not interfere with the command line.

### 10.2 Command palette ("command line") **[source: `commandline/filter.ts`, `components/modals/CommandlineModal.tsx`]**

- **Matching:** the query is split into words. Each query word must match the **start** of some word of a command's `display` or `alias` (punctuation stripped). Each display word can be used once. Only commands with the **highest match count**, then the **highest match strength** (total matched characters), are kept. A leading `>` is ignored.
- **Single-list mode** (default `on`): every option of every setting is flattened into one list, e.g. `Theme › serika dark`, `Smooth caret › fast`. You can type "car fa" and press Enter.
- **Rows:**
  - layout: `px-4 py-2 text-xs`, `--sub`; the active row is inverted (`background --text; color --bg`);
  - icons: check marks for active config values; **theme rows show three colour bubbles** (main, sub, text) on a `--bg` pill;
  - fonts: font rows render *in that font* (preview faces).
- **Live preview:** when the active row is a theme, the palette **removes its own dim backdrop** and applies the theme as a preview. Moving off the theme rows restores the old theme. Hovering with the mouse also changes the active row.
- **Overflow:** when results are cut off, the last row says "N more results – keep typing to narrow the search".

**Parrotype:** build a small palette (~200 lines) with the same prefix-word matcher. Commands: theme, language (nl/en/ar), mode, duration, caret speed, indicate typos, focus line, sound, "practice my mistakes", "export data". It is the cheapest way to make every setting reachable from the keyboard.

---

## 11. Themes

### 11.1 Tokens **[source: `constants/themes.ts`, `components/core/Theme.tsx`]**

A theme is exactly 10 colours, validated by a Zod schema. The `Theme` component injects them as a `<style id="theme">` on `:root`, debounced by **125 ms**, so rapidly cycling previews doesn't thrash:

```css
:root {
  --bg-color;                 /* page background */
  --main-color;               /* accent: timer, active buttons, logo, result numbers, chart line */
  --caret-color;              /* caret (often = main) */
  --sub-color;                /* untyped text, inactive UI, labels */
  --sub-alt-color;            /* panels/cards (config bar, palette rows, chart grid), slightly off bg */
  --text-color;               /* correctly typed text, hover state, body text */
  --error-color;              /* incorrect letters, error underline */
  --error-extra-color;        /* extra (over-typed) letters: a darker red */
  --colorful-error-color;     /* errors when "colorful mode" (correct = main) is on */
  --colorful-error-extra-color;
}
```

- **Derived values:** `--roundness: .5rem` (global). `::selection { background: var(--main-color); color: var(--sub-alt-color) }`. `<meta name="theme-color" content={bg}>`. The **favicon is regenerated** in the theme colours (`FavIcon.tsx`).
- **`hasCss: true` themes** load an extra `/themes/<name>.css` for flourishes, such as per-icon nav colours (dracula), pill-shaped nav buttons (lavender), or background images. **Only about 52 of the 187 themes need one**; the rest are pure tokens.
- **Tailwind mapping** (`@theme` block): `--color-bg: var(--bg-color)`, `--color-main: var(--main-color)`, and so on, so utilities like `text-main`, `bg-sub-alt` and `text-error` work everywhere.
- **Fallback:** `head.html` inlines the serika_dark tokens, so the first paint is never unstyled.
- **Heritage:** many theme names come from **mechanical keycap sets** (GMK 8008, 9009, Olivia, Botanical, Dots, Carbon …), a tradition from typings.gg, whose README credits "GMK 8008 by Dixie Mech", and so on. **[source: typings README]**

### 11.2 Exact values of popular themes **[source: `frontend/src/ts/constants/themes.ts` @ `1f43321`]**

| theme | bg | main | caret | sub | sub-alt | text | error | error-extra | colorful-error | colorful-error-extra |
|---|---|---|---|---|---|---|---|---|---|---|
| **serika_dark** (default) | `#323437` | `#e2b714` | `#e2b714` | `#646669` | `#2c2e31` | `#d1d0c5` | `#ca4754` | `#7e2a33` | `#ca4754` | `#7e2a33` |
| serika (default light) | `#e1e1e3` | `#e2b714` | `#e2b714` | `#aaaeb3` | `#d1d3d8` | `#323437` | `#da3333` | `#791717` | `#da3333` | `#791717` |
| 8008 | `#333a45` | `#f44c7f` | `#f44c7f` | `#939eae` | `#2e343d` | `#e9ecf0` | `#da3333` | `#791717` | `#c5da33` | `#849224` |
| 9009 (css) | `#eeebe2` | `#080909` | `#7fa480` | `#99947f` | `#d3cfc1` | `#080909` | `#c87e74` | `#a56961` | `#c87e74` | `#a56961` |
| botanical | `#7b9c98` | `#eaf1f3` | `#abc6c4` | `#495755` | `#72908d` | `#eaf1f3` | `#f6c9b4` | `#f59a71` | `#f6c9b4` | `#f59a71` |
| dracula (css) | `#282a36` | `#bd93f9` | `#bd93f9` | `#6272a4` | `#20222c` | `#f8f8f2` | `#ff5555` | `#f1fa8c` | `#ff5555` | `#f1fa8c` |
| nord | `#242933` | `#88c0d0` | `#eceff4` | `#929aaa` | `#2e3440` | `#d8dee9` | `#bf616a` | `#793e44` | `#bf616a` | `#793e44` |
| nord_light | `#eceff4` | `#8fbcbb` | `#8fbcbb` | `#6a7791` | `#d8dee9` | `#8fbcbb` | `#bf616a` | `#793e44` | `#bf616a` | `#793e44` |
| lavender (css) | `#ada6c2` | `#e4e3e9` | `#e4e3e9` | `#e4e3e9` | `#a19bb9` | `#2f2a41` | `#ca4754` | `#7e2a33` | `#ca4754` | `#7e2a33` |
| carbon | `#313131` | `#f66e0d` | `#f66e0d` | `#616161` | `#2b2b2b` | `#f5e6c8` | `#e72d2d` | `#7e2a33` | `#e72d2d` | `#7e2a33` |
| olivia | `#1c1b1d` | `#deaf9d` | `#deaf9d` | `#4e3e3e` | `#262223` | `#f2efed` | `#bf616a` | `#793e44` | `#e03d4e` | `#aa2f3b` |
| catppuccin (css) | `#1e1e2e` | `#cba6f7` | `#f2cdcd` | `#7f849c` | `#181825` | `#cdd6f4` | `#f38ba8` | `#eba0ac` | `#f38ba8` | `#eba0ac` |
| gruvbox_dark | `#282828` | `#d79921` | `#fabd2f` | `#665c54` | `#212121` | `#ebdbb2` | `#fb4934` | `#cc241d` | `#cc241d` | `#9d0006` |
| monokai | `#272822` | `#a6e22e` | `#66d9ef` | `#e6db74` | `#1f201b` | `#e2e2dc` | `#f92672` | `#fd971f` | `#f92672` | `#fd971f` |
| rose_pine | `#1f1d27` | `#9ccfd8` | `#f6c177` | `#c4a7e7` | `#282533` | `#e0def4` | `#eb6f92` | `#ebbcba` | `#eb6f92` | `#ebbcba` |
| iceberg_dark | `#161821` | `#84a0c6` | `#d2d4de` | `#595e76` | `#232531` | `#c6c8d1` | `#e27878` | `#e2a478` | `#e27878` | `#e2a478` |
| iceberg_light | `#e8e9ec` | `#2d539e` | `#262a3f` | `#adb1c4` | `#ccceda` | `#33374c` | `#cc517a` | `#cc3768` | `#cc517a` | `#cc3768` |
| paper | `#eeeeee` | `#444444` | `#444444` | `#b2b2b2` | `#dddddd` | `#444444` | `#d70000` | `#d70000` | `#d70000` | `#d70000` |
| dark | `#111` | `#eee` | `#eee` | `#444` | `#191919` | `#eee` | `#da3333` | `#791717` | `#da3333` | `#791717` |
| vscode | `#1e1e1e` | `#007acc` | `#569cd6` | `#4d4d4d` | `#191919` | `#d4d4d4` | `#f44747` | `#f44747` | `#f44747` | `#f44747` |
| bento | `#2d394d` | `#ff7a90` | `#ff7a90` | `#4a768d` | `#263041` | `#fffaf8` | `#ee2a3a` | `#f04040` | `#fc2032` | `#f04040` |
| solarized_dark | `#002b36` | `#859900` | `#dc322f` | `#2aa198` | `#00222b` | `#268bd2` | `#d33682` | `#9b225c` | `#d33682` | `#9b225c` |
| solarized_light | `#fdf6e3` | `#859900` | `#dc322f` | `#2aa198` | `#e2d8be` | `#181819` | `#d33682` | `#9b225c` | `#d33682` | `#9b225c` |
| matcha_moccha | `#523525` | `#7ec160` | `#7ec160` | `#9e6749` | `#422b1e` | `#ecddcc` | `#fb4934` | `#cc241d` | `#fb4934` | `#cc241d` |
| tangerine | `#ffede0` | `#fe5503` | `#5d8500` | `#ff9562` | `#fdd3bf` | `#3d1705` | `#7fb500` | `#5f8700` | `#7fb500` | `#5f8700` |
| milkshake (css) | `#ffffff` | `#212b43` | `#212b43` | `#62cfe6` | `#ddeff3` | `#212b43` | `#f19dac` | `#e58c9d` | `#f19dac` | `#e58c9d` |
| miami_nights | `#18181a` | `#e4609b` | `#e4609b` | `#47bac0` | `#0f0f10` | `#fff` | `#fff591` | `#b6af68` | `#fff591` | `#b6af68` |

(The full list has **187 themes**. "css" means the theme also ships an extra stylesheet.)

### 11.3 Contrast audit (WCAG ratio against `bg`, computed by me)

| theme | main | sub (untyped) | text (correct) | **error** |
|---|---|---|---|---|
| serika_dark | 6.55 | **2.17** | 8.05 | **2.70** ⚠ |
| serika (light) | **1.46** ⚠ | 1.71 | 9.56 | 3.57 |
| nord | 7.29 | 5.16 | 10.80 | 3.56 |
| dracula | 5.90 | 3.03 | 13.36 | 4.53 |
| 8008 | 3.38 | 4.23 | 9.67 | **2.46** ⚠ |
| botanical | 2.61 | 2.54 | 2.61 | **1.98** ⚠ |

**Takeaways:**

- A low-contrast `sub` is a **deliberate design choice**: untyped text is meant to recede. Parrotype can keep `sub` around **3:1**.
- But **`error` at 2–2.7:1 is too faint for a trainer whose core job is showing errors**. Parrotype's built-in themes should have `error ≥ 4.5:1` against `bg`.
- Always pair the error colour with a **shape cue** (underline or wavy underline), for colour-blind safety.

### 11.4 Proposed Parrotype themes (contrast-checked)

| token | **parrot** (dark, default) | ratio vs bg | **cockatoo** (light) | ratio vs bg |
|---|---|---|---|---|
| `--bg` | `#1d2420` (deep jungle green-black) | | `#f6f3ea` (warm paper) | |
| `--sub-alt` | `#182019` | 1.05 | `#ebe6d7` | 1.12 |
| `--sub` | `#6b7871` | 3.43 | `#857f70` | 3.59 |
| `--text` | `#e6efe8` | 13.49 | `#26322b` | 12.03 |
| `--main` | `#7bd389` (parrot green) | 8.69 | `#1a7a43` | 4.84 |
| `--caret` | `#ffd23f` (budgie yellow) | 10.97 | `#a86b00` (amber) | 3.97 |
| `--error` | `#ff6b5b` (macaw red) | 5.66 | `#c0362f` | 4.97 |
| `--error-extra` | `#b5524a` | 3.22 | `#9b2c26` | 6.80 |
| `--grammar` *(new)* | `#6cb6ff` (hyacinth blue) | 7.37 | `#2f6fb3` | 4.68 |
| `--correction` *(new: "you fixed this")* | `= --main` dotted | | `= --main` dotted | |

These values are a starting point; tune them by eye. Keep the 10 Monkeytype token names, so users can paste Monkeytype palettes in as custom themes, and add the Parrotype-only tokens with fallbacks:

```css
:root {
  --bg-color:#1d2420; --sub-alt-color:#182019; --sub-color:#6b7871; --text-color:#e6efe8;
  --main-color:#7bd389; --caret-color:#ffd23f; --error-color:#ff6b5b; --error-extra-color:#b5524a;
  --colorful-error-color:#ff6b5b; --colorful-error-extra-color:#b5524a;
  /* Parrotype extensions */
  --grammar-color: var(--pt-grammar, #6cb6ff);
  --spell-color:   var(--error-color);
  --roundness: .5rem;
  --dur-fast: 125ms; --dur-med: 250ms;
  color-scheme: dark;
}
:root[data-theme="cockatoo"] { --bg-color:#f6f3ea; /* … */ color-scheme: light; }
body { background: var(--bg-color); color: var(--text-color); font-family: "Roboto Mono", monospace; }
```

Switch themes by setting `document.documentElement.dataset.theme` (or by injecting a `<style>` the way Monkeytype does). Also update `<meta name="theme-color">`. Add a "follow system" option via `prefers-color-scheme`; Monkeytype has `autoSwitchTheme`, with `themeLight: serika` and `themeDark: serika_dark`.

### 11.5 Spelling and grammar marks (Parrotype-specific; no Monkeytype equivalent)

For free-writing and dictation modes, borrow the OS and word-processor convention, which users already understand:

```css
::highlight(pt-spell)   { text-decoration: underline wavy var(--spell-color);   text-decoration-thickness: 2px; text-underline-offset: 3px; }
::highlight(pt-grammar) { text-decoration: underline wavy var(--grammar-color); text-decoration-thickness: 2px; text-underline-offset: 3px; }
::highlight(pt-fixed)   { text-decoration: underline dotted var(--main-color); }
```

**Rules:**

- **Spelling** = red wavy underline. **Grammar** = blue wavy underline. This mirrors LanguageTool and Word conventions, so there is nothing to learn.
- Show marks only **after the word or sentence is committed**, never mid-word. That is the "delayed, indirect feedback" recommendation in `typing-pedagogy.md`.
- Clicking a mark, or pressing a key on it, opens a small card styled like Monkeytype's word-history tooltip:

```css
.pt-card { background: var(--sub-alt-color); color: var(--text-color);
           border-radius: var(--roundness); padding: .5rem .75rem; font-size: .8rem; }
```

---

## 12. Motion and timing cheat sheet (from source)

| What | Duration | Easing | Source |
|---|---|---|---|
| Button / link colour, opacity, background | **125 ms** | default | `buttons.scss`, `core.scss` (`transition: color .125s, opacity .125s, background .125s`) |
| Focus-mode fade (config bar, footer) | **125 ms** | default | `TestConfig.tsx` (`duration-125`) |
| Tailwind default transition | 250 ms (`--duration-half: 125ms`) | | `tailwind.css` |
| Mode / mode2 cross-fade + width | **250 ms** | anime default | `TestConfig.tsx` |
| Restart fade-out + fade-in | **125 ms + 125 ms** | | `test-ui.ts` |
| Test → result fade | 125 ms out, 125 ms in | | `test-logic.ts`, `result.ts` |
| Loading spinner | appears after **500 ms** delay, fades in 125 ms | `ease` | `test.scss` |
| Caret move | **85 / 100 / 150 ms** (fast / medium (default) / slow) | `inOut(1.25)` | `elements/caret.ts` |
| Caret blink | **1 s** loop (smooth: 0→1→0 opacity; hard: 50/50) | | `animations.scss` |
| Line jump (smoothLineScroll) | **125 ms** | anime default | `test-ui.ts` |
| Tape scroll | **125 ms** | `inOut(1.25)` | `test-ui.ts` |
| Typed effect "fade" | 250 ms | `ease-in` | `test.scss` |
| Typed effect "dots" | 200 ms + 100 ms dot fade-in | `ease-out` | `test.scss` |
| Highlight box (word input highlight) | 250 ms (left/right), 125 ms opacity | `ease`, `linear` | `test.scss` |
| Chart legend reveal | 125 ms | | `test.scss` |
| Theme apply debounce | 125 ms | | `Theme.tsx` |
| Focus exit threshold | mouse movement > **3 px** | | `focus.ts` |
| Out-of-focus warning | after **1 s** | | settings metadata |
| keybr caret move | **100 ms** (`1000/((120·5)/60)`, i.e. one char at 120 WPM) | `linear` | keybr `Cursor.tsx` |
| keybr key-detail popup | 300 ms in, 300 ms out | | keybr `Indicators.tsx` |
| typings.gg (2019) | **400 ms** on almost every element | `ease-in-out` | typings `style.css` |

Monkeytype's 125 ms is ~3× faster than typings.gg's 400 ms. Snappy transitions are part of why it feels "fast".

---

## 13. Option catalogue (what Monkeytype offers, and what Parrotype should keep)

Descriptions are quoted or paraphrased from `config/metadata.tsx`. **[source]**

| Option | Monkeytype behaviour | Parrotype |
|---|---|---|
| **blind mode** | "No errors or incorrect words are highlighted. Helps you to focus on raw speed." | Keep as a challenge mode. The *result* screen still reveals the errors. |
| **confidence mode** `off/on/max` | "on": cannot go back to previous words. "max": no backspace at all. | Keep. Pedagogically useful (forces commitment); see `typing-pedagogy.md`. |
| **stop on error** `off/word/letter` | letter: input stops on a wrong key. word: you can't leave a word until it is fixed. | **Keep, default `off`.** Offer "letter" for accuracy drills. |
| **delete on error** `off/letter/letter_hard/word/word_hard` | auto-deletes the wrong char (and the one before it), or the whole word. | Optional. |
| **difficulty** `normal/expert/master` | expert fails the test on a wrong *word* commit. master fails on a wrong *key* (100% accuracy). | Keep as "sudden death" (ttyper has the same). |
| **freedom mode** | lets you delete correctly typed previous words. | Skip. |
| **strict space** | space at the start of a word inserts a space instead of being ignored. | Skip. |
| **quick end** | words mode: the test ends on the last word even if it's wrong. | Default on. |
| **indicate typos** `off/below/replace/both` | §4.2 | **Default `below` for this user.** |
| **hide extra letters** | avoids line reflow, but key presses then seem to do nothing. | Off. |
| **lazy mode** | replaces accents and diacritics with plain letters. | Useful for Arabic harakat and for Dutch `ë/é/ï` when the user lacks a layout that types them. |
| **smooth caret** `off/slow/medium/fast` | §5 | Default medium (100 ms). |
| **caret style** | off, line, block, outline, underline, + images | line, block, underline; maybe a tiny "feather" image caret as an Easter egg. |
| **smooth line scroll** | animate line jumps (default **off**) | **Default on** (125 ms). It reads calmer. |
| **show all lines / tape mode / max line width** | §6 | 3 lines; tape optional; maxLineWidth ≈ 65ch. |
| **highlight mode / typed effect / flip / colorful** | §4.3 | Keep letter highlight; colorful as an option. |
| **pace caret** | a ghost caret moving at PB / average / custom speed (`--sub`, 50% opacity). | Nice-to-have, later. |
| **min wpm / min acc / min burst** | auto-fail under a threshold. | "min acc" fits typo training (e.g. fail under 95%). |
| **sound on click** | 26 packs (below), default off. | 2–3 sounds, default off. |
| **sound on error ("damage")** | 4 sounds, default off. | Optional soft "squawk". |
| **british english** | converts US spellings to UK. | Not needed. |
| **funbox** | gimmick modifiers (mirror, upside down, nospace, …). | Skip. |

### 13.1 Sounds **[source: `constants/sounds.ts`, `controllers/sound-controller.ts`, `commandline-metadata.ts`]**

- **Click sound names:**
  - 1–7: click, beep, pop, nk creams, typewriter, osu, hitmarker;
  - 8–11 (Web Audio oscillators): sine, sawtooth, square, triangle;
  - 12–13 (random notes from a scale, octave drifting 4–6): pentatonic, wholetone;
  - 14–26: fist fight, rubber keys, fart, akko lavenders, cherrymx black abs, cherrymx black pbt, cherrymx blue abs, cherrymx blue pbt, cherrymx brown pbt, kalih box white, razer green, tealios v2, trust gxt.
- **Natural-sounding samples:** each sample pack has **3–10 recordings** and one is chosen at random per key, which avoids the "machine-gun" effect of one repeated sample.
- **Implementation:**
  - `howler` is **lazy-imported** on first use, and the sounds are WAV files;
  - synth notes use `AudioContext` + `OscillatorNode` + `GainNode`, with gain = `volume/10` and decay `setTargetAtTime(0, t, 0.3)`;
  - default volume is 0.5; there are separate error sounds 1–4 and a time-warning sound.
- **Parrotype:** skip Howler. Use plain Web Audio:
  - decode 3–5 short click samples (CC0 sources) into `AudioBuffer`s, and pick one at random per key;
  - add ±3% `playbackRate` jitter;
  - create the `AudioContext` lazily on the first user gesture, as autoplay policy requires.

---

## 14. Word generation, languages, Dutch and Arabic

### 14.1 Word list format **[source: `frontend/static/languages/*.json`]**

```json
{ "name": "dutch_1k", "noLazyMode": true, "bcp47": "nl-NL", "words": ["aan", "aanbod", "aanraken", ...] }
{ "name": "arabic", "rightToLeft": true, "joiningScript": true, "bcp47": "ar-SA", "words": ["أَتَمَنَّى", ...] }
{ "name": "english", "noLazyMode": true, "orderedByFrequency": true, "words": ["the", "be", "of", ...] }
```

Language groups: `dutch: [dutch, dutch_1k, dutch_10k]`, `arabic: [arabic, arabic_10k]`, `arabic_egypt: [arabic_egypt, arabic_egypt_1k]`, `arabic_morocco`. **[source: `constants/languages.ts`]**

What I found when I inspected them (downloaded from `raw.githubusercontent.com`):

| list | words | observation |
|---|---|---|
| `english` | 200 | ordered by frequency (`the, be, of, and, a…`) |
| `dutch` | **199** | starts `als, zijn, dat, hij, was, voor, op, met…`, but contains oddities like `heet`, `woord`. It looks like a **translated** English top-200 list rather than a real Dutch frequency list. |
| `dutch_1k` | 1000 | **alphabetical** (`aan, aanbod, aanraken, aantal, aanval, aap…`) |
| `dutch_10k` | 9998 | rare compounds (`aambeeld, achtergrondstudie, appreciatiebevoegdheid`…), not frequency-based |
| `arabic` | 199 | **fully vowelised with harakat** (`أَتَمَنَّى`), some suspicious vowelisation (`أَلِأرْضٍ`), and very hard to type |
| `arabic_10k` | 9281 | many entries have a **leading space** (`" اِكْتَشَفَ"`), a data-quality bug |

**Parrotype recommendations:**

- Build **its own Dutch frequency list** from a real corpus, e.g. SUBTLEX-NL (Keuleers, Brysbaert & New 2010), plus a curated list of the user's *personal* error words. Monkeytype's Dutch lists are a weak base.
- For Arabic, offer **unvowelised** words by default, with a toggle for harakat. Strip U+064B–U+0652 for the plain variant.

### 14.2 Picking words **[source: `test/words-generator.ts`, `test/wordset.ts`]**

- **Selection:** uniform random (`randomElementFromArray`), with rejection sampling (up to 100 tries) when:
  - the word equals **either of the previous 2 words**;
  - punctuation is off and the word contains punctuation, or is `I`;
  - numbers are off and the word contains digits.
- **Other strategies:** a `zipf` frequency mode exists, but only funboxes use it; custom text can be read in order (`nextWord`) or shuffled (`shuffledWord`, which exhausts every word before repeating).
- **Punctuation mode:**
  - capitalise the first word and any word after `. ? ! ؟`;
  - about 10% of words get a sentence-ending mark;
  - the last word always gets one.
  - Language rules: Spanish `¿¡`, the Hindi/Bengali/Nepali danda `।`, CJK `。`, Arabic `؟`.

**Parrotype:** start with the same "no repeat within 2" uniform picker. Then add *weighted* picking: give a boost to words that contain the user's weak bigrams or that the user has misspelled before (the spaced-repetition box; see `typing-pedagogy.md`).

### 14.3 RTL and Arabic in Monkeytype **[source: `styles/test.scss`, `test/test-ui.ts`, `elements/caret.ts`]**

```scss
#words.rightToLeftTest { direction: rtl; .wordRtl { unicode-bidi: bidi-override; } }
#words.joiningScript .word { overflow-wrap: anywhere; padding-bottom: .05em; }
#words.joiningScript .word letter { display: inline; }   /* NOT inline-block: lets Arabic letters join */
```

- **Joining:** `inline-block` letters each start a new shaping run, so Arabic letters would show in their **isolated** forms. With `display:inline`, modern browsers shape across the spans, so the letters join, though colour changes mid-word can still look slightly off in some engines.
- **Caret:** for RTL words, positions are computed from the right edge (§5.3).
- **Font:** the `--font` stack includes `Vazirharf` for Arabic and Persian glyphs.
- **Words history** uses the same `rightToLeftTest` / `joiningScript` classes.

### 14.4 Better approach for Parrotype: CSS Custom Highlight API

Instead of wrapping every character in an element, render each word, or the whole free-writing text, as **plain text nodes**, and colour ranges with `CSS.highlights`. This keeps Arabic shaping intact and is ideal for spelling and grammar underlines in free-writing mode. Browser support: **Chrome/Edge 105, Safari 17.2, Firefox 140 (June 2025)**. **(secondary: web.dev "New to the web platform in June 2025")**

Limits:

- `::highlight()` only accepts a few properties (`color`, `background-color`, `text-decoration*`, `text-shadow`), **not borders**.
- Caret positioning then uses `Range.getBoundingClientRect()` instead of `offsetLeft`.

```ts
const hlCorrect = new Highlight(), hlWrong = new Highlight(), hlUntyped = new Highlight();
CSS.highlights.set('pt-correct', hlCorrect);
CSS.highlights.set('pt-wrong', hlWrong);
CSS.highlights.set('pt-untyped', hlUntyped);

function paintWord(textNode: Text, target: string, input: string) {
  // ranges must be built on UTF-16 offsets; iterate code points and accumulate .length
  let off = 0; const tgt = [...target], inp = [...input];
  tgt.forEach((ch, i) => {
    const r = new Range(); r.setStart(textNode, off); r.setEnd(textNode, off + ch.length);
    (i >= inp.length ? hlUntyped : inp[i] === ch ? hlCorrect : hlWrong).add(r);
    off += ch.length;
  });
}

// caret from a range: getBoundingClientRect relative to the container
function caretRect(textNode: Text, utf16Offset: number, container: HTMLElement) {
  const r = new Range(); r.setStart(textNode, utf16Offset); r.collapse(true);
  const b = r.getBoundingClientRect(), c = container.getBoundingClientRect();
  return { x: b.left - c.left, y: b.top - c.top, h: b.height };
}
```

```css
::highlight(pt-untyped) { color: var(--sub-color); }
::highlight(pt-correct) { color: var(--text-color); }
::highlight(pt-wrong)   { color: var(--error-color); text-decoration: underline var(--error-color) 2px; }
```

**Recommendation:**

- Use **per-letter spans** for Latin-script copy tests. They are the simplest, match Monkeytype, and allow borders and hints.
- Use the **Highlight API** for Arabic and for free-writing and dictation.
- Hide both behind one `TextRenderer` interface.

---

## 15. keybr teardown (adaptive lessons, per-key colouring, heatmap)

### 15.1 The guided lesson algorithm (exact) **[source: `packages/keybr-lesson/lib/guided.ts`, `target.ts`, `key.ts`, `keybr-result/lib/keystats.ts`, `keybr-math/lib/filter.ts`]**

- **Letter order:** by frequency in the chosen language (or a keyboard-weighted order, if that setting is on).
- **Per-key time-to-type:** an **exponential moving average** with **α = 0.1**. The first sample initialises it. Each key also tracks `bestTimeToType`, the minimum of the smoothed value over time.
- **Confidence:** `confidence = timeToType(targetSpeed) / smoothedTimeToType`. A key is "confident" when this is ≥ 1. The **default target is 175 characters per minute** (35 WPM), settable from 75 to 750.
- **Lesson update**, for each letter in frequency order:
  1. include it if fewer than **6** keys are included (the minimum alphabet);
  2. *force*-include it while below `maxSize = 6 + round((N−6) × alphabetSize)` (the alphabet-size slider, default 0);
  3. include it if its `bestConfidence ≥ 1` (keys you have mastered stay in);
  4. otherwise include **one new letter only when *every* included key has `bestConfidence ≥ 1`** (or current `confidence ≥ 1` with "recover keys" on).
- **Focus key:** the **least confident** included key below 1. Generated words are biased towards it.
- **Text:**
  - "natural words": dictionary words built only from included letters (up to 1000), padded with phonetic **pseudo-words** if fewer than 15 exist;
  - otherwise, phonetic Markov pseudo-words only;
  - then optional capitals and punctuation are added.
- **Events:**
  - a **"new letter"** alert when a key unlocks;
  - "top speed" and "top score" events;
  - a **daily goal** (default **30 min**).

### 15.2 Key-row UI **[source: `keybr-lesson-ui/lib/Key.tsx`, `styles.ts`, `styles.module.less`]**

- **The row:** the full alphabet in a row of small square keys (`1.5rem`, mono font, 1px gaps). There are also "large" (3rem) and "announcement" (5rem, 4rem glyph) sizes for the current key and the unlock popup.
- **Included keys:** the background is a **linear mix from `--slow-key-color` to `--fast-key-color` by confidence**. Defaults are `#cc0000` → `#60d788` in the light theme and `#8c1818` → `#448154` in the dark theme.
- **Excluded keys:** dimmed, with a **diagonal strike-through SVG line** across the tile.
- **Other states:**
  - uncalibrated (not enough data) keys get a neutral style;
  - the **focused** key gets an outline;
  - **forced** keys are underlined;
  - the **current** key gets a 3px outline.
- **Hover:** hovering a key shows a popup with its speed chart and stats.
- **Gauges row:** **Speed**, **Accuracy** and **Score**, each with a signed **delta vs your average** ("The difference from the average value."), followed by the current key, streaks and daily goal.

**Parrotype:** for a Dutch-first user, run the same model on keys **and on Dutch-specific bigrams/digraphs** (`ij`, `ui`, `ei`, `oe`, `ou`, `aa`, `ee`, `ch`, `sch`, `-dt`), plus Dutch letters like `ë`/`é`. Show a key row coloured slow → fast. Only "unlock" new material in a dedicated **Learn** mode; the free test mode stays unrestricted.

```ts
// Confidence colour, theme-aware (sRGB lerp is fine at this scale)
function confidenceColor(c: number, slow = '#cc0000', fast = '#60d788'): string {
  const t = Math.max(0, Math.min(1, c));
  const p = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const [a, b] = [p(slow), p(fast)];
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;
}
// or in CSS: background: color-mix(in oklab, var(--fast-key) calc(var(--c) * 100%), var(--slow-key));
```

### 15.3 Keyboard heatmap **[source: `keybr-keyboard-ui/lib/HeatmapLayer.tsx`]**

- **Data:** a histogram of `[codePoint, value]`, mapped to key shapes of the active layout (space is ignored), then **min-max normalised** to 0..1 (or 0.5 if all values are equal).
- **Three drawing modes** on top of an SVG keyboard, each at **opacity 0.7**:
  - **h** (hits): a **top-left semicircle**, radius `f·15 + 5`;
  - **m** (misses): a **bottom-right semicircle**, radius `f·15 + 5`;
  - **f** (frequency): a **full circle**, radius `f·20 + 5`.
- Drawing h and m together gives a split "hit vs miss" spot per key. That is an elegant way to show where errors cluster.

**Parrotype:** draw a simple SVG ANSI/ISO keyboard (the user's layout, probably US-International or Dutch). Show **misses** as red spots and **slowness** as amber spots. Put it on the result screen ("where your fingers slipped today") and on the progress page.

### 15.4 keybr caret and text **[source: `keybr-textinput-ui/lib/Cursor.tsx`, `styles.ts`]**

- **Caret shapes:**
  - **Line** = `width: 2px; height: lineHeight; left = x − 2` (RTL: `x + w`);
  - **Block** = the caret copies the character, in inverted colours;
  - **Box** = a 1px outline `w+4 × h+4`;
  - **Underline** = `2px` tall at the bottom.
- **Smooth movement:** a WAAPI `left/top` animation of **100 ms, linear**. If a move arrives while one is still running, the animation is **cancelled and the caret snaps** to the target, so the caret never lags behind a fast typist.
- **Text styles:**
  - `normal` / `hit` (`--text-color-f2`, a slightly faded text) / `miss` (`--error`);
  - **`garbage`** = a wrong typed char shown in `--textinput__color` on a **red background**. This is a clear "you typed this junk" cue.

---

## 16. Other polished typing sites (short teardowns)

| Site | Typing surface | Error display | Distinctive ideas worth stealing |
|---|---|---|---|
| **typings.gg** (2019, the minimalist original) **[source]** | Text card (`#typing-area`, radius `.4rem`) with a **separate input box** below it plus a "redo" button. Max width `40rem`. | **Current word highlighted** in an accent colour. Committed words coloured correct/wrong. The **input box turns red** (`#input-field.wrong`) the moment the typed prefix diverges. | Theme names and palettes from keycap sets. Word counts `10/25/50/100/250` and times `15/30/60/120/240` as plain `/`-separated text links. WPM/ACC in the top-right. `transition: all .4s ease-in-out` on everything. WPM = *words* per minute (not chars/5). |
| **10FastFingers** **(secondary)** | A box of words with an input field. The **current word is highlighted**. Space submits a word. | Letters colour green when correct and red/underlined when wrong as you type. | Simple 1-minute test; a "top 200/1000 words" mindset. |
| **TypeRacer** **(secondary)** | Real quotes (books, movies, songs). Multiplayer race with **cars that only move forward on correct characters**. | Typing a wrong char **stalls the car**, and the **input field turns red** until it is fixed. You *must* fix errors to continue. "Try again" highlights last time's mistakes. | The progress metaphor (the car = your parrot flying across a branch). Graph of speed and mistakes after the race. Replaying a text with past mistakes highlighted. |
| **TypeLit.io** **(secondary)** | Retype **classic books chapter by chapter** (80+ Project Gutenberg books in 9 languages **including Dutch**). | Real-time error highlighting. WPM and accuracy tracked **per page, per chapter and per book**. | Long-form, meaningful text instead of word salad. Progress saved per chapter. 200+ ranks. **Dutch literature practice** is a strong fit for Parrotype's grammar goals (public-domain Dutch texts from Gutenberg/DBNL). |
| **ttyper** (terminal, Rust) **[source: README]** | Prompt box + input box (rounded borders). | `prompt_correct` green, `prompt_incorrect` red, untyped gray. The **current word's letters are bold** (correct: green bold, incorrect: red bold, untyped: blue bold). Cursor = underlined char. | `--sudden-death` (restart on first error), `--no-backtrack`, `--no-backspace`. **Results show "worst keys"** and a WPM chart. Custom word list = one word per line. |
| **Typing.com** **(secondary)** | Structured **lessons**. Optional **virtual keyboard and virtual hands** showing which finger to use. | Instant per-key feedback. Speed and accuracy assessed after each lesson. | Gamification: **badges, stars per lesson, points, levels**. A finger guide for beginners. |
| **keybr** **[source]** | One text block. Caret line, block, box or underline. | hit / miss / garbage styles (§15.4). | Adaptive letter unlocking, per-key confidence colours, heatmap, daily goal, streaks, calendar. |

---

## 17. Parrotype: a concrete design spec built from all of the above

### 17.1 Layout (desktop)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 🦜 parrotype                        ⌨  📈  ⚙              nl ▾  🎨       │ header: logo 1.5rem mark + Lexend Deca 1.75–2rem
│    polly want a keyboard?                                               │ subtitle .65rem --sub (fades in focus)
│                                                                         │
│   ┌───────────────┐ ┌──────────────────────────────┐ ┌────────────────┐  │ config cards (--sub-alt, .5rem radius)
│   │ Aa punct  # 12│ │ time words text dictee vrij  │ │ 15 30 60 120 ⚙ │  │ "dictee" = dictation, "vrij" = free writing
│   └───────────────┘ └──────────────────────────────┘ └────────────────┘  │
│                                                                         │
│   23  97%                                                               │ mini timer + live acc (--main)
│   de kat zit op de mat en kijkt naar de vogel die                       │ 3 lines, max-width ~65ch
│   in de boom |zit te fluiten terwijl de zon langzaam                    │ caret: budgie-yellow line, 100ms glide
│   ondergaat achter de huizen van het kleine dorp                        │
│                                 ⟳                                       │
│                                                                         │
│            tab ▸ enter  restart      esc  command line                  │ key tips (.75rem --sub)
└─────────────────────────────────────────────────────────────────────────┘
```

Modes in the middle card:

- **time** / **words**: copy tests from frequency lists.
- **text**: real sentences or quotes; Dutch literature snippets.
- **dictee**: TTS dictation (the text is hidden); errors are judged against the target after each word.
- **vrij** (free writing): zen-like; no target; spelling and grammar via the rule engine plus optional LanguageTool, shown as wavy underlines after each sentence.

### 17.2 Behaviour spec (checklist for engineers)

- [ ] The hidden `<textarea>` gets focus on load and on any key. Handle `beforeinput`/`input` plus `compositionstart/update/end`. Show composition in progress with a dotted underline (`letter.dead` equivalent), so Dutch dead keys (`"` + `e` → `ë`) feel right.
- [ ] Set `autocomplete=off autocorrect=off autocapitalize=none spellcheck=false data-gramm=false` on the textarea, and `translate="no"` on the words wrapper.
- [ ] Per keystroke, patch **only the active word** inside one rAF, then move the caret in the same frame.
- [ ] Letter states and colours exactly as in §4.2. Default `indicateTypos: below`. Committed wrong words get a 2px `--error` underline with the halo text-shadow.
- [ ] 3-line window. Remove line 1 and slide up with a 125 ms `transform` once the caret reaches line 3.
- [ ] Caret: §5.5 (`0.1em × 1.2em`, 100 ms glide, solid while typing, blink after 600 ms idle).
- [ ] Focus mode: on first input, fade out the header nav, config, footer and key tips (125 ms) and hide the mouse cursor. Exit on mouse move > 3px or Esc.
- [ ] Restart: Tab then Enter (Tab focuses the restart button), plus an optional single-key quick restart setting (for long texts/dictations, require Shift to confirm, as Monkeytype does for tests ≥ 900 s or ≥ 1000 words). "Repeat same words" is a result-screen button (and a Shift+R style shortcut if wanted).
- [ ] Command palette on Esc and Ctrl/Cmd+Shift+P, with prefix-word matching and live theme preview.
- [ ] Result: wpm and acc at 4rem; raw, chars, consistency and time at 2rem; chart (wpm line, dashed raw line, red × errors); "worst keys" (ttyper) and "words you fixed" (dotted underline); buttons next / repeat / practise mistakes / history. Fade 125 ms. Tab → next.
- [ ] Metrics: §9 exactly, plus corrected/uncorrected error rates.
- [ ] Persistence: settings in `localStorage` (versioned JSON, Zod-validated); results and per-key stats in IndexedDB; JSON export/import.
- [ ] `prefers-reduced-motion`: all durations → 0, no blink.
- [ ] Contrast: `error ≥ 4.5:1`; errors always shown by colour **and** shape.
- [ ] Mobile: config collapses into one "settings" button below `md` (849px), and the words font drops to ~1.5rem.

### 17.3 Where the parrot lives (playful, but restrained)

- **Logo:** a simple geometric parrot head mark in `--main`, next to the "parrotype" wordmark in Lexend Deca. In focus mode both turn `--sub`, like Monkeytype's logo.
- **Subtitle under the logo** (Monkeytype's "monkey see" equivalent): a rotating line, e.g. "polly wants a keyboard", "squawk less, type more", "parrot see, parrot type".
- **Result screen:** a small parrot illustration beside the big numbers, with one line of feedback based on the data: "Squawk! You swapped *ie*/*ei* 3× today", or "No typos in *hebben* this time 🎉". Never more than one sentence.
- **Empty states and the onboarding tooltip:** the parrot "repeats" what you type. That is a natural hook for **dictation** ("the parrot says it, you type it").
- **Optional:** a "feather" caret style and a soft "squawk" error sound, both **off** by default.
- **Never:** animations in the typing area, confetti during a test, or a mascot covering the text.

---

## Sources

**Primary source code** (cloned and read, 2026-10-03):

- Monkeytype repository (GPL-3.0), commit `1f43321` (2026-10-02): https://github.com/monkeytypegame/monkeytype. Files cited:
  - `frontend/src/ts/constants/themes.ts`, `frontend/src/ts/constants/default-config.ts`, `frontend/src/ts/constants/sounds.ts`, `frontend/src/ts/constants/fonts.ts`, `frontend/src/ts/constants/languages.ts`
  - `frontend/src/styles/caret.scss`, `frontend/src/styles/animations.scss`, `frontend/src/styles/core.scss`, `frontend/src/styles/test.scss`, `frontend/src/styles/buttons.scss`, `frontend/src/styles/tailwind.css`, `frontend/src/styles/test-activity.scss`, `frontend/src/styles/standalone.scss`, `frontend/src/styles/fonts.scss`
  - `frontend/src/html/head.html`, `frontend/src/html/pages/test.html`, `frontend/src/html/pages/test-result.html`
  - `frontend/src/ts/elements/caret.ts`, `frontend/src/ts/test/caret.ts`, `frontend/src/ts/test/focus.ts`, `frontend/src/ts/test/test-ui.ts`, `frontend/src/ts/test/test-logic.ts`, `frontend/src/ts/test/result.ts`, `frontend/src/ts/test/events/stats.ts`, `frontend/src/ts/test/words-generator.ts`, `frontend/src/ts/test/wordset.ts`
  - `frontend/src/ts/utils/strings.ts`, `frontend/src/ts/utils/numbers.ts`, `packages/util/src/numbers.ts`
  - `frontend/src/ts/controllers/chart-controller.ts`, `frontend/src/ts/controllers/sound-controller.ts`
  - `frontend/src/ts/components/core/Theme.tsx`, `frontend/src/ts/components/layout/header/{Header,Logo,Nav}.tsx`, `frontend/src/ts/components/layout/footer/{Footer,Keytips}.tsx`, `frontend/src/ts/components/pages/test/{TestConfig,OutOfFocusWarning}.tsx`, `frontend/src/ts/components/pages/test/live-stats/*`, `frontend/src/ts/components/pages/AboutPage.tsx`, `frontend/src/ts/components/pages/account/TestStats.tsx`, `frontend/src/ts/components/modals/CommandlineModal.tsx`
  - `frontend/src/ts/commandline/filter.ts`, `frontend/src/ts/commandline/commandline-metadata.ts`, `frontend/src/ts/config/metadata.tsx`, `frontend/src/ts/states/hotkeys.ts`, `frontend/src/ts/input/hotkeys/quickrestart.ts`
  - `packages/schemas/src/configs.ts`, `packages/schemas/src/shared.ts`
  - `frontend/static/themes/dracula.css`, `frontend/static/themes/lavender.css`
- Monkeytype word lists (raw): https://raw.githubusercontent.com/monkeytypegame/monkeytype/master/frontend/static/languages/dutch.json (also `dutch_1k.json`, `dutch_10k.json`, `arabic.json`, `arabic_10k.json`, `english.json`)
- keybr.com repository (AGPL-3.0), commit `05a37bc` (2026-09-28): https://github.com/aradzie/keybr.com. Files cited:
  - `packages/keybr-lesson/lib/{guided,target,key,settings}.ts`, `packages/keybr-result/lib/keystats.ts`, `packages/keybr-math/lib/filter.ts`
  - `packages/keybr-lesson-ui/lib/{Key.tsx,styles.ts,styles.module.less,gauges.tsx}`, `packages/keybr-keyboard-ui/lib/{HeatmapLayer.tsx,HeatmapLayer.module.less}`
  - `packages/keybr-textinput-ui/lib/{Cursor.tsx,styles.ts}`, `packages/page-practice/lib/practice/{Indicators.tsx,state/event-source-letter.ts}`, `packages/keybr-themes/lib/themes/*.less`
- typings.gg repository (GPL-3.0): https://github.com/briano1905/typings (`style.css`, `index.html`, `main.js`, `themes/*.css`, `README.md`)
- ttyper README: https://github.com/max-niederman/ttyper (via https://raw.githubusercontent.com/max-niederman/ttyper/main/README.md)

**Secondary sources** (search-engine summaries; the live sites were blocked by the egress proxy):

- typings.gg: https://typings.gg/
- Monkeytype history and typings.gg inspiration: https://kbd.news/Interview-3-years-of-Monkeytype-2019.html and https://en.everybodywiki.com/Monkeytype
- TypeLit.io: https://www.typelit.io/llms.txt, https://www.typelit.io/faq, https://edtechimpact.com/products/typelitio/, https://www.inputmag.com/culture/typelitio-is-perfect-for-literature-fiends-typing-novices
- TypeRacer: https://www.educatorstechnology.com/2022/12/typeracer-learn-typing-through-racing.html, https://www.seeles.ai/games/puzzle/typeracer-the-global-typing-competition
- 10FastFingers: https://10fastfingers.com/typing-test, https://github.com/stevengeeky/typing-tester, https://www.pcworld.com/article/3148829/want-to-type-faster-start-with-this-fun-one-minute-test.html
- Typing.com gamification and virtual hands: https://www.typing.com/blog/gamification-can-support-typing-practice/, https://www.commonsense.org/node/4123856
- keybr overview: https://cdn.jsdelivr.net/gh/aradzie/keybr.com@master/README.md, https://www.educationalappstore.com/website/keybr
- ttyper: https://www.linuxlinks.com/ttyper-terminal-based-typing-test/, https://docs.rs/crate/ttyper/0.4.0
- CSS Custom Highlight API support (Firefox 140, June 2025): https://web.dev/blog/web-platform-06-2025

**Other:**

- SUBTLEX-NL (Keuleers, Brysbaert & New, 2010): suggested as the base for a real Dutch frequency word list (not fetched here; verify the licence before bundling).
- WCAG contrast ratios in §11.3–11.4 were computed locally with the WCAG 2.x relative-luminance formula.
