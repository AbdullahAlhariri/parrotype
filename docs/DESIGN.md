# Parrotype design brief

The short version every screen follows. The long version with sources is in
`docs/research/design-not-ai.md` (sections 4.1 to 4.11) and
`docs/research/monkeytype-ux.md`.

## Idea

Parrotype is a typing, spelling and grammar practice app. Copy-typing is literally parroting,
so the mascot is a parrot: **Kees the kea** (Nestor notabilis, a cheeky alpine parrot; "Kees"
is a Dutch first name that sounds like "kea"). He wears a **monocle** (the "wise" part). His
olive feathers hide a **bright orange underwing** that only shows when you set a personal best.
That is the one loud thing in the product. Everything else is quiet.

## Rules

1. **The typing text is the hero.** Monkeytype layout: centered column, left-aligned text,
   3 visible lines, chrome fades while typing (`body[data-typing]`, see `src/lib/focus.ts`),
   mouse cursor hidden, caret stops blinking while typing.
2. **Colours come from real parrots** (tokens below). No indigo/violet, no gradients,
   no gradient text, no glows, no glass, no box-shadows. Hierarchy comes from tone and type.
3. **Errors use colour and shape.** Wrong letter: `--error` + underline. Extra letter:
   `--error-extra` + strikethrough. Spelling in free text: wavy underline `--error`.
   Grammar: dashed underline `--grammar` (blue). Correct text stays `--text`, never green.
   `--ok` only appears next to a "+" or a label.
4. **Fonts.** Typing text: Recursive Mono (linear, MONO 1 CASL 0). UI: Recursive Sans
   (CASL about 0.5). Display: Caprasimo in at most three places (wordmark, big WPM number, 404).
   Mascot speech bubble: Shantell Sans. Arabic: Noto Naskh Arabic. Optional typing fonts:
   Atkinson Hyperlegible Mono, IBM Plex Mono. In the typing area: no ligatures, no `calt`,
   no kerning. Stats use tabular numbers.
5. **Shapes.** Typing area radius 0. Buttons and inputs 6px. Toggle knobs round. No cards in
   cards, no identical card grids, no bento, no centered marketing hero.
6. **Motion.** Under 300 ms, `ease-out`, only transform and opacity. Nothing animates per
   keystroke except the caret glide (80 to 100 ms linear, optional). Restart is instant.
   Springs (`--spring-soft`, `--spring-pop`) only for Kees and rare moments. Results reveal is
   one sequence: number counts up (400 ms), chart line draws (600 ms), Kees lands. Personal best:
   wing lift reveals the underwing + a feather burst (never confetti). Respect
   `prefers-reduced-motion` with gentler motion, not zero.
7. **Kees has rules.** He never guilt-trips, cries or lectures. He only repeats correct words
   ("wordt. wordt. wordt."). States: idle (random blink), focus (hidden while typing), curious
   (head tilt), celebrate (PB only), oops (adjusts monocle; below 70% accuracy it pops off),
   repeat (speech bubble), reading (reading glasses in grammar/dictation), sleepy.
8. **Copy.** Plain, specific, dry, a bit cheeky. Real numbers over adjectives. Sentence case.
   No em dashes, no emoji, no exclamation marks in errors, at most one exclamation mark per
   screen (personal best only). Banned: unlock, unleash, supercharge, elevate, seamless,
   effortless, empower, journey, "Get started", "Learn more", "Ready to", "magic", sparkles.
   Buttons say what they do: "Again", "Practise these 6 words", "Hear it again", "Show the rule".
9. **Icons.** Few (about 6), custom, 24px grid, 2px stroke, rounded joins, or plain words.
   No stock icon grids, no emoji icons.
10. **Accessibility.** Every text token at least 4.5:1 on `--bg` and `--surface`, caret and
    focus ring at least 3:1. Visible focus rings. Keyboard first: everything reachable without
    a mouse. `lang` attributes on practice text, `dir="rtl"` for Arabic.

## Tokens

CSS custom properties on `:root` (set by `src/styles/themes.ts`):

| token | role |
|---|---|
| `--bg` | page background |
| `--surface` | the one tonal panel colour |
| `--border` | hairlines |
| `--text` | body text, typed-correct letters |
| `--sub` | upcoming letters, secondary labels |
| `--caret` | caret (theme signature colour) |
| `--main` | active controls, links, focus ring, big numbers |
| `--error` / `--error-extra` | wrong / extra letters |
| `--grammar` | grammar underline |
| `--ok` | positive deltas (with a label) |
| `--kees-head --kees-shade --kees-beak --kees-beak-lo --kees-ring --kees-flash` | mascot skin |

Themes: `kea-dark` (default), `kea-light`, `lorikeet-dark`, `lorikeet-light`, `macaw-dark`,
`macaw-light`. Values in `design-not-ai.md` section 4.2.

Spacing scale (px): 2, 4, 8, 12, 16, 24, 32, 48, 72, 112 as `--s-1` to `--s-10`.
Type scale (rem, ratio 1.25): 0.8, 1, 1.25, 1.563, 1.953, 2.441.
Motion: `--dur-press 120ms`, `--dur-fast 150ms`, `--dur-base 200ms`, `--dur-slow 280ms`,
`--ease-out cubic-bezier(0.23, 1, 0.32, 1)`, `--spring-soft`, `--spring-pop` (linear() springs).

## Layout

- Header: Kees mark + "parrotype" wordmark (Caprasimo, lowercase, feather-quill caret) on the left,
  mode links as plain lowercase text in `--sub` (active in `--main`), practice language switch
  (nl / en / ar) on the right. Fades while typing.
- Main: one centered column (max about 66 characters of typing text).
- Footer: keyboard hints (`tab` + `enter` restart, `esc` command palette), theme, font. Fades while typing.
- Results: deliberately asymmetric. Left third the big WPM (Caprasimo) and accuracy; right
  two thirds the WPM chart (solid `--main` line, errors as small x marks) and "words to practise"
  with hand-drawn rough-notation circles. Kees perches on the top edge of the chart.
- Settings is a page, not a modal. Modals only for destructive confirmation.
