# Arabic typing practice and common Arabic spelling and typing errors

> Research for **Parrotype** (repo `parrotype`). Readers: the engineers building the Arabic language pack (`src/lang/ar/…`), the typing-test renderer and the virtual keyboard, plus the content author.
> Scope: Arabic is phase 2, but we ship a basic version now. This covers the keyboard layout (key map, neighbour keys, virtual RTL keyboard), the most common Arabic spelling errors, text normalisation for comparison, RTL rendering in a per-letter typing test, word lists, practice sentences, fonts, and a rules table for the rule engine.
>
> **What was checked first-hand** (not only read):
> 1. **Rendering.** I rendered Arabic in headless **Chromium 141** (Playwright) with Noto Naskh Arabic, comparing per-letter spans, `inline-block`, runs with and without ZWJ, the CSS Custom Highlight API, lam-alef splits and tashkeel spans (§4.1).
> 2. **Real-world error rates.** I counted misspelling versus correct-form frequencies in the **CAMeL MSA frequency list** (12.6 B tokens of web/news text, CC BY-SA 4.0) (§2.1, §2.11).
> 3. **The rule engine.** I prototyped it in TypeScript (Appendix C). It gave **0 false positives** on 125 correct sentences and flagged 48 of 48 test errors. A scan over the top 100k corpus words found false-positive patterns, and I fixed them.
> 4. **The keyboard map.** I verified it against two independent sources: the xkeyboard-config `ara` file and a Windows KLC of Arabic (101).
>
> Some hosts were blocked by the egress proxy (Wikipedia, W3C, webkit.org, aclanthology, kbdlayout.info, dorar.net, unicode.org). For those I relied on search-result excerpts or GitHub mirrors, and the relevant claims are marked.

---

## 0. TL;DR for engineers

1. **Layout = Windows "Arabic (101)"**, the de-facto standard. Its letter positions are identical in Linux xkb `ara(basic)`. The **macOS "Arabic" layout is different** (bottom row ظ ط ذ د ز ر و; ة on `]`). macOS also offers "Arabic – PC", which matches Windows. **Don't hard-code one map.** Learn the user's actual map from `KeyboardEvent.code` + `KeyboardEvent.key` pairs as they type (§1.4).
2. **The لا key (B) types two code points on Windows (U+0644 U+0627).** Linux xkb types the presentation-form ligature **U+FEFB**. Normalise presentation forms with NFKC (§3). Otherwise a Linux user can never type لا "correctly".
3. **Never use `NFD` + "strip all combining marks" on Arabic.** It turns أ إ آ ؤ ئ into ا ا ا و ي and silently erases exactly the hamza errors we want to teach (verified, §3.2). Use **NFC**, then strip only an explicit harakat range.
4. **Per-letter colouring vs cursive joining.** In Blink and Gecko, coloured `display:inline` spans keep joining. **`display:inline-block` always breaks it** (verified: width 264 → 379 px, every letter isolated). Stable **Safari still shapes each inline box separately**: WebKit bug 6148 dates from 2005, and the fix "Arabic letters in adjacent inline boxes not being joined" landed only in **Safari Technology Preview 251 (26 Aug 2026)**.
   → **Render runs of same-state graphemes and put U+200D ZWJ on both sides of a run boundary between connecting letters. But never between ل and an alef**: ZWJ there destroys the mandatory لا ligature (verified, §4.1). Code: Appendix B.
   → Alternative: one text node per word plus the **CSS Custom Highlight API** (Chrome 105, Safari 17.2, Firefox 140). It adds no inline boxes, so shaping is untouched (verified in Chromium).
5. **Caret = an absolutely positioned overlay**, placed from `Range.getBoundingClientRect()` on the logical character offset. In RTL, the "before char *i*" edge is `rect.right`. Never insert a caret element or `::after` content inline inside a word.
6. **Default comparison policy:**
   - hamza seats, ة/ه, ى/ي are **strict**: they are separate keys and the whole point of the drills;
   - harakat (tashkeel) are **stripped** from targets and **ignored** in input;
   - tatweel is stripped from targets and **counted as an error** if typed (it is Shift+ت, a shift slip);
   - Eastern/Western digits are folded together;
   - Persian look-alikes (ی ک) are mapped to Arabic;
   - an optional "lazy hamza" mode (Monkeytype's `أإآ→ا`) stays **off** by default.
7. **JavaScript `\b` does not work for Arabic**, even with the `u` flag (verified). Use lookarounds such as `(?<![\p{L}\p{M}])…(?![\p{L}\p{M}])`.
8. **Most frequent real-world errors** (CAMeL web text, share of the wrong form):

   | Error | Wrong share |
   |---|---|
   | initial hamza dropped (`الى` for إلى, `انا` for أنا, `الاطفال` for الأطفال) | 25–70% |
   | `فى` (Egyptian convention) for في | 8% |
   | `إسمي` for اسمي (hamzat al-wasl written as qat') | 11% |
   | `قالو` for قالوا | 28% |
   | `أرجوا` for أرجو | 10–14% |
   | `شئ` for شيء | 12% |
   | ض/ظ swaps (`الضروف`) | under 1% of written forms; serious when they happen |

   Highest-value rules: hamza wasl/qat' (list + verb-pattern rule), ة inside a word, ى inside a word, ة↔ه, ى↔ي, the waw al-jama'a alif, final hamza on the line, إن شاء الله, and the هذا/لكن hidden alif.
9. **Keyboard insight for feedback.** On Arabic 101 many "dot twins" are physical neighbours: س/ش, ج/ح/خ, ص/ض, ع/غ, ف/ق, ت/ن. A mis-hit produces a letter that looks almost the same, and the user won't notice it. Also: أ is Shift+ا, إ is Shift+غ, آ is Shift+ى. So a "hamza error" can be a **shift slip** (motor), not ignorance. ة is next to ت, and ى is next to ا. ه is **not** near ة, and ي is **not** near ى, so those swaps are **cognitive**.
10. **Rule engine: 32 implemented rules plus 1 optional style rule** (§6.2), with confidence tiers. LanguageTool supports Arabic (since v4.9; about 450 XML rules). Its Arabic rules include many purist "قل ولا تقل" style corrections (e.g. المعاجم→المعجمات), so filter its matches to spelling categories and treat the rest as hints.
11. **Fonts.** Typing text: **Noto Naskh Arabic** (Monkeytype ships it too) or **IBM Plex Sans Arabic** (pairs with IBM Plex Mono). Other options: Readex Pro (the Arabic counterpart of Lexend), Rubik (rounded and playful, has Arabic), Baloo Bhaijaan 2 or Marhey for playful headings. Don't use a monospace Arabic font for the typing text.
12. **Content.** Unvoweled MSA, no Latin letters or digits inside Arabic sentences (bidi + caret pain). Keep the voweled original for TTS. Every practice sentence in §7 passes the rule engine with zero flags.

---

## 1. Keyboard layouts

### 1.1 Windows "Arabic (101)": the standard map

Sources:
- the xkeyboard-config `symbols/ara` "basic" layout (read from the local `/usr/share/X11/xkb/symbols/ara`, upstream at freedesktop);
- a Windows KLC reconstruction of "Arabic (101)", `LOCALEID 00000401` (jsvk repo).

They agree on every letter position. Search results also describe Arabic 101 as the layout Windows, macOS, Linux and Android ship as standard ([noqta.tn](https://noqta.tn/en/blog/learn-arabic-typing-keyboard)).

`KeyboardEvent.code` → `[unshifted, Shift]`:

| Row | Keys (code: base / shift) |
|---|---|
| Number | `Backquote`: **ذ** / ◌ّ (shadda) · `Digit1..0`: 1…0 / ! @ # $ % ^ & * **)** **(** (Shift+9 is `)` and Shift+0 is `(`, mirrored for RTL) · `Minus` - / _ · `Equal` = / + |
| Top | `KeyQ` **ض** / ◌َ fatha · `KeyW` **ص** / ◌ً fathatan · `KeyE` **ث** / ◌ُ damma · `KeyR` **ق** / ◌ٌ dammatan · `KeyT` **ف** / **لإ** · `KeyY` **غ** / **إ** · `KeyU` **ع** / ‘ · `KeyI` **ه** / ÷ · `KeyO` **خ** / × · `KeyP` **ح** / ؛ · `BracketLeft` **ج** / < · `BracketRight` **د** / > · `Backslash` \ / \| |
| Home | `KeyA` **ش** / ◌ِ kasra · `KeyS` **س** / ◌ٍ kasratan · `KeyD` **ي** / ] · `KeyF` **ب** / [ · `KeyG` **ل** / **لأ** · `KeyH` **ا** / **أ** · `KeyJ` **ت** / ـ tatweel · `KeyK` **ن** / ، · `KeyL` **م** / / · `Semicolon` **ك** / : · `Quote` **ط** / " |
| Bottom | `KeyZ` **ئ** / ~ · `KeyX` **ء** / ◌ْ sukun · `KeyC` **ؤ** / } · `KeyV` **ر** / { · `KeyB` **لا** / **لآ** · `KeyN` **ى** / **آ** · `KeyM` **ة** / ’ · `Comma` **و** / , · `Period` **ز** / . · `Slash` **ظ** / **؟** |

Notes that matter for the app:
- **Ligature keys.** On Windows, `B`, `Shift+B`, `Shift+G` and `Shift+T` each emit **two code points**: the KLC `LIGATURE` table maps `B → 0644 0627`, `Shift+B → 0644 0622`, `Shift+G → 0644 0623`, `Shift+T → 0644 0625`. Linux xkb emits **single presentation-form code points** for the same keys: U+FEFB, U+FEF5, U+FEF7, U+FEF9. Typing ل then ا by hand gives the same two code points as the Windows key. So the comparison works on code points after normalisation and doesn't care which method was used.
- **The digit row types Western digits (0–9).** Eastern Arabic digits ٠–٩ are on AltGr in xkb `ara(basic)` and the default in the xkb `ara(digits)` variant. Windows relies on display-level digit substitution. macOS behaviour is unclear from available sources. **Accept both digit systems** (§3).
- **Arabic punctuation needs Shift**: ، = Shift+K, ؛ = Shift+P, ؟ = Shift+/. The full stop is the Latin `.` (Shift+Period on 101). Shift+Comma gives the Latin `,`.
- **The harakat are all on Shift**, on the left-hand keys Q W E R A S X and backtick. If the user holds Shift too long while typing ض ص ث ق ش س ء ذ, the result is a stray haraka, i.e. a *shift slip*.
- xkb differs in a few non-letter shifts. Shift+U and Shift+M give `` ` `` and `'` in xkb, but ‘ and ’ in Windows. Irrelevant for letters.

### 1.2 Other layouts you will meet

| Layout | Difference vs 101 | Source / confidence |
|---|---|---|
| **Arabic (102)** (ISO keyboards) | Same letters. **ذ moves** from `Backquote` (OEM_3) to the key next to Enter (OEM_5); the ISO key between left Shift and Z is used | search excerpts (kromekeycaps, kbdlayout.info "How do I type ذ"); medium |
| **Arabic (102) AZERTY** (Maghreb) | Number row follows French AZERTY (& é " ' ( - è _ ç à, digits on Shift); letters as 101 | xkb `ara(azerty)`; high |
| **macOS "Arabic"** | **Different letter map** (below). Harakat on Shift of the top row. Number row behaviour unverified | community KLC recreation ([Bishoy/Mac-Ar-Layout-for-Win](https://github.com/Bishoy/Mac-Ar-Layout-for-Win), 2012); medium, **verify on a Mac** |
| **macOS "Arabic – PC"** | Same as Windows 101 | Apple community threads; medium |
| **macOS "Arabic – QWERTY"** | Phonetic (letters mapped by sound to Latin keys), for learners | Apple community threads; low (not mapped here) |

macOS "Arabic" letters (from the recreation; **verify**):
- top: `ض ص ث ق ف غ ع ه خ ح ج ة`
- home: `ش س ي ب ل ا ت ن م ك ؛`
- bottom: `ظ ط ذ د ز ر و ، . /`
- shifted: أ = Shift+B, إ = Shift+N, آ = Shift+H, ؤ = Shift+M, ئ = Shift+C, ء = Shift+V, ى = Shift+D

Consequence: if Parrotype assumes 101, a Mac user who types ة gets diagnosed as "pressed `]`". So detect the layout (§1.4).

### 1.3 Neighbour-key map (Arabic 101, ANSI geometry)

Computed from the physical grid (row stagger 0 / 0.5 / 0.25 / 0.5 units; neighbours = same row ±1, adjacent row |dx| ≤ 0.75). This is the same model as `typing-pedagogy.md` §5.1. Code is in Appendix D.

| Key | Neighbours | | Key | Neighbours |
|---|---|---|---|---|
| ض Q | ص ش | | ش A | ض ص س ئ |
| ص W | ض ث ش س | | س S | ص ث ش ي ئ ء |
| ث E | ص ق س ي | | ي D | ث ق س ب ء ؤ |
| ق R | ث ف ي ب | | ب F | ق ف ي ل ؤ ر |
| ف T | ق غ ب ل | | ل G | ف غ ب ا ر لا |
| غ Y | ف ع ل ا | | ا H | غ ع ل ت لا ى |
| ع U | غ ه ا ت | | ت J | ع ه ا ن ى **ة** |
| ه I | ع خ ت ن | | ن K | ه خ ت م ة و |
| خ O | ه ح ن م | | م L | خ ح ن ك و ز |
| ح P | خ ج م ك | | ك ; | ح ج م ط ز ظ |
| ج [ | ح د ك ط | | ط ' | ج د ك ظ |
| د ] | ج ط | | ذ ` | (isolated, far left) |
| ئ Z | ش س ء | | لا B | ل ا ر ى |
| ء X | س ي ئ ؤ | | ى N | **ا** ت لا ة |
| ؤ C | ي ب ء ر | | ة M | **ت** ن ى و |
| ر V | ب ل ؤ لا | | و , | ن م ة ز |
| ز . | م ك و ظ | | ظ / | ك ط ز |

**What this means for feedback (classifier, §5):**
- **Dot twins that are neighbours:** س/ش (A/S), ج/ح/خ (`[`/P/O), ص/ض (W/Q), ع/غ (U/Y), ف/ق (T/R), ت/ن (J/K). A mis-hit gives a letter that differs only by dots, which is hard to spot when proofreading. Label it *"neighbour key, the letters only differ by dots"*.
- **Motor-plausible pairs:** ة↔ت (M/J) and ى↔ا (N/H). **Cognitive pairs:** ة↔ه (M vs I, far apart) and ى↔ي (N vs D, far apart). So "مدرسه" is almost never a slip, while "مدرست" might be.
- **Hamza by shift:** أ = Shift+ا (H), إ = Shift+غ (Y), آ = Shift+ى (N). So `غ` for `إ` and `ى` for `آ` are *missed-Shift* slips, not spelling errors. Tatweel `ـ` for `ت` is an *extra-Shift* slip (J).
- **Non-adjacent twins** (د/ذ, ر/ز, ط/ظ, ب/ت/ث) are visual or phonetic confusions. ذ is alone on the far left, so a ذ↔د or ذ↔ز swap is cognitive.

### 1.4 Detecting the user's real layout

1. **Learn it.** On every `keydown`, record `(event.code, event.shiftKey) → event.key` once `event.key.length === 1`. After about 20 Arabic keystrokes you know whether `KeyM` gives ة (101) or و (Mac). Use the learned map for neighbour and finger stats, and fall back to 101.
2. `navigator.keyboard.getLayoutMap()` returns `code → unshifted char` for the active layout. It is **Chromium-only** and secure-context only, so treat it as a hint, never a requirement.
3. Offer a manual picker: "Windows/Linux Arabic (101)", "Mac Arabic", "Arabic 102 / AZERTY".

### 1.5 Virtual keyboard (on-screen) for RTL

- The **keyboard is physical, so never mirror it.** Put `dir="ltr"` on the keyboard container even when the text area is `dir="rtl"`. Q stays top-left.
- Each key shows the Arabic base letter large, the Shift character small in a corner, and optionally the Latin keycap letter tiny. The user also types Dutch and English, and it helps to see that ض is on Q.
- Highlight the next key. For Shift characters also highlight the **opposite-hand Shift**:
  - right Shift for left-hand keys (`` ` `` Q–T, A–G, Z–B): the harakat, لإ (T), لأ (G), لآ (B);
  - left Shift for right-hand keys (Y–], H–', N–/): أ (H), إ (Y), آ (N), ، (K), ؛ (P), ؟ (/), tatweel (J).

  For لا highlight B, and also accept G then H.
- Home-row bumps are on **ب (F)** and **ت (J)**. The home row is `ش س ي ب | ل ا | ت ن م ك ط`.
- Finger assignment is identical to QWERTY (`typing-pedagogy.md` §5.1), so the per-key weakness stats are shared across languages *by physical key*.

### 1.6 Lesson order (touch-typing) and letter frequency

The order described by Arabic typing tutors ([noqta.tn tutor](https://www.noqta.tn/en/arabic-typing-tutor)):
1. home row `ش س ي ب ل ا ت ن م ك`
2. top row `ض ص ث ق ف غ ع ه خ ح`
3. bottom row `ئ ء ؤ ر ى ة و ز ظ`
4. words, then sentences

Learn the home row one hand at a time.

**Letter frequency in MSA web/news text**, computed from the CAMeL MSA list, weighted by token frequency, Arabic-letter words only (%):

`ا 15.9 · ل 11.8 · ي 7.5 · م 6.5 · و 5.4 · ن 5.0 · ر 4.8 · ت 4.6 · ب 3.5 · ع 3.3 · ة 3.2 · د 3.0 · س 2.6 · ف 2.4 · ه 2.2 · ق 2.1 · ك 2.0 · ح 1.8 · أ 1.5 · ج 1.4 · ش 1.0 · ص 1.0 · ى 1.0 · ط 0.9 · خ 0.9 · ض 0.7 · ز 0.7 · إ 0.6 · ذ 0.5 · ث 0.5 · ئ 0.4 · غ 0.4 · ء 0.4 · ظ 0.2 · آ 0.1 · ؤ 0.1`

**Top bigrams:** `ال` 8.6% (G→H, neighbours), `لم` 1.7, `لا` 1.5, `وا` 1.3, `ية` 1.3, `ات` 1.3, `من` 1.1, `ان` 1.1, `في` 1.0.

The single most-typed sequence in Arabic is the article ال. Drill it as a chunk (n-gram drills, `typing-pedagogy.md` §2.6).

**Frequent real words per stage** (CAMeL top 60k, filtered for known misspellings; use them as keybr-style word pools):
- **home row only**: من، التي، لا، ما، كل، بين، كان، لم، كما، كانت، يمكن، لكن، تلك، ليس، ابن، السلام، كتب، الناس، لكل، بيت، السبت، الملك، الشباب، لبنان
- **+ top row**: في، عن، مع، بعد، قبل، عند، هي، قد، قال، حيث، العالم، بعض، ثم، فيها، جميع، العمل، هناك
- **+ bottom row**: على، هذا، الذي، هذه، ذلك، هو، اليوم، العربية، حتى، غير، ولا، النظر، حول
- **+ hamza letters**: أن، إلى، أو، إن، رئيس، آخر، أي

---

## 2. Common Arabic spelling errors (what, why, evidence)

### 2.1 Evidence and taxonomy

- **ARETA error tagset** (CAMeL Lab; based on the Arabic Learner Corpus tagset), orthographic classes:

  | Tag | Meaning | Example |
  |---|---|---|
  | **OH** | Hamza error | اكثر → أكثر |
  | **OT** | ه/ة confusion | مشاركه → مشاركة |
  | **OA** | ى/ي confusion | علي → على |
  | **OW** | Alif fariqa (waw al-jama'a) | وكانو → وكانوا |
  | **ON** | Nun vs tanween | ثوبن → ثوبٌ |
  | OS / OG | Shortening / lengthening vowels | أوقت → أوقات · نقيمو → نقيم |
  | OC | Character order | تبرينا → تربينا |
  | OR | Replaced character | |
  | OD | Extra character | |
  | OM | Missing character | |
  | MG / SP | Merged / split words | |
  | PC / PT / PM | Punctuation | |

  ([CAMeL-Lab/arabic_error_type_annotation](https://github.com/CAMeL-Lab/arabic_error_type_annotation)). **Use these tags as our Arabic `spelling.<ruleId>` families** in the shared taxonomy.
- **QALB corpus** (Al-Jazeera reader comments, mostly MSA, about 1M words, **243,075 annotated errors**): edits are more than 55% of errors, and edit/add/split/merge are more than 90% of spelling errors. Commonly cited types are hamza forms, ه/ة, and ى/ي (e.g. `إستعمال*` → استعمال) (via search excerpt of [arXiv 2305.14734](https://arxiv.org/abs/2305.14734)).
- **My own count in the CAMeL MSA list**: share of the wrong form among wrong + right, in web/news text. This population includes a lot of forum text, so these numbers describe "people writing online", not our user. They do show *where to aim*:

| Wrong | Right | Wrong share | | Wrong | Right | Wrong share |
|---|---|---|---|---|---|---|
| الاطفال | الأطفال | **71.5%** | | فى | في | 8.3% |
| افضل | أفضل | **51.8%** | | التى | التي | 10.2% |
| اخبار | أخبار | **48.6%** | | الذى | الذي | 9.2% |
| انا | أنا | 38.2% | | لكى | لكي | 12.5% |
| الى | إلى | 35.9% | | حتي | حتى | 5.3% |
| ان | أن | 31.7% | | مستشفي | مستشفى | 2.9% |
| امس | أمس | 30.6% | | العربيه | العربية | 4.3% |
| اول | أول | 29.8% | | الحياه | الحياة | 3.1% |
| اين | أين | 29.1% | | المدرسه | المدرسة | 2.4% |
| اكثر | أكثر | 25.7% | | قالو | قالوا | **27.9%** |
| ايضا | أيضا | 24.8% | | كانو | كانوا | 2.5% |
| اذا | إذا | 24.0% | | نرجوا | نرجو | 13.8% |
| لان | لأن | 23.2% | | أرجوا | أرجو | 10.5% |
| الان | الآن | 19.1% | | يبدوا | يبدو | 1.8% |
| او | أو | 18.9% | | شئ | شيء | 11.7% |
| إسمي | اسمي | 11.4% | | برئ | بريء | 42.5% |
| الإسم | الاسم | 10.5% | | ملئ | مليء | 32.6% |
| الإجتماعية | الاجتماعية | 18.0% | | مسئول | مسؤول | 19.3% (regional variant) |
| إقتصاد | اقتصاد | 16.0% | | تسائل | تساءل | 11.4% |
| إختيار | اختيار | 8.7% | | التفائل | التفاؤل | 6.0% |
| إمرأة | امرأة | 6.9% | | كتير | كثير | 8.0% (dialect) |
| إستخدام | استخدام | 3.6% | | مظبوط | مضبوط | 20.3% |
| ذالك | ذلك | 0.5% | | الضروف | الظروف | 0.3% |
| لاكن | لكن | 0.4% | | انتضار | انتظار | 0.2% |

Two lessons for engineers:
1. **Bare-alif forms are so common online that frequency cannot decide hamza correctness.** For الاسلامية / الأسلامية / الإسلامية, the *wrong* bare form wins. Mine candidate lists from frequency only for ة/ه and ى/ي, and use morphology rules or curated lists for hamza.
2. **Some "errors" are regional conventions:** Egyptian final ى for ي (فى), and مسئول. Label them as such and give them lower confidence.

### 2.2 Hamza (الهمزة)

**Letters:** ا (bare alif), أ (hamza above), إ (hamza below), آ (madda), ء (on the line), ؤ (on waw), ئ (on yaa/nabira).

**A. Initial hamza: wasl vs qat'.** Hamzat al-wasl (همزة الوصل) is written as a bare **ا**: it is pronounced only at the start of speech. Hamzat al-qat' (همزة القطع) is always written **أ** (with fatha/damma) or **إ** (with kasra). Wasl positions ([dorar.net](https://dorar.net/arabia/2592), via search):
- **Ten nouns:** ابن، ابنة، اسم، اسْت، امرؤ، امرأة، اثنان، اثنتان، ايم الله، ايمن الله. Wasl in the singular and dual; the plurals take qat' (أبناء، أسماء).
- **Verbs:**
  - imperative of the triliteral verb (اكتب، اشرب)
  - past and imperative of five- and six-letter verbs, Forms VII, VIII, X (اجتمع، انكسر، استخدم؛ اجتمِعْ، استغفِرْ)
- **Verbal nouns of those forms:** اجتماع، انتظار، استخدام.
- **Particles:** only the article **ال**. Every other particle has qat' (أن، إن، إلى، أو).
- **Everything else is qat'**, including:
  - Form IV past, imperative and masdar (أرسل، أرسِل، إرسال)
  - 1st-person imperfect (أكتب، أستطيع، أكتشف)
  - other nouns (أحمد، إنسان، أطفال)

**Two typical errors, in opposite directions:**
- **Qat' dropped** (اكثر، الى، انا): very common, often deliberate laziness or a missed Shift.
- **Wasl written as qat'** (إستخدام، إجتماع، إسم): hypercorrection.

Our rule engine handles both: a list for the frequent qat' words, plus a **morphological pattern** for Forms VII, VIII and X (§6.2, `AR_WASL_PATTERN`). On a sample of its hits in the top-100k corpus words the pattern was correct in **66 of 66 sampled hits**, after exceptions were added for loanwords and plurals (الإنترنت، الأنبياء، أسترالي، إنجيل…).

**B. Medial hamza seat**, the "strongest vowel" rule: compare the vowel of the hamza with the vowel before it. Kasra > damma > fatha > sukun. Kasra → ئ, damma → ؤ, fatha → أ.
- Examples: سُئِل، بِئْر → ئ · سُؤال، مُؤْمن → ؤ · سَأَل، رَأْس → أ
- **After a long ا with fatha the hamza sits on the line:** تساءل، قراءة
- Typical errors: تفائل→تفاؤل، تسائل→تساءل، مسأله→مسألة، رئيت→رأيت، سوأل→سؤال
- A full implementation needs vowelled text, so **use lists in v1.**

**C. Final hamza.** Its seat follows the letter before it:
- after a **kasra** → ئ (شاطئ، قارئ، مبادئ)
- after a **damma** → ؤ (تباطؤ، التكافؤ)
- after a **fatha** → أ (بدأ، قرأ، ملجأ)
- after a **sukun or long vowel** → **ء on the line** (شيء، بطيء، هدوء، سماء، جزء)

High-precision error patterns:
- word-final `يئ`, `وئ` or `ائ` where the ي/و/ا is a long vowel (شيئ، بطيئ، هدوئ، سمائ);
- `شئ` for شيء (with no ي the hamza can't sit on a nabira after sukun).

**Exceptions found in the corpus scan:** سيّئ، يهيّئ، مساوِئ are correct, because the ي/و is a consonant with shadda/kasra. Also, the old Egyptian typography writes ئ as **ىء** (الطوارىء، القارىء، شاطىء). It is common online; suggest ئ.

**D. Lam-alef with hamza** (لأ، لإ، لآ) are separate keys or shift states on 101. لأن (because) is often typed لان (23% online). This is just a missing hamza.

### 2.3 Taa marbuta ة vs haa ه (and ت)

- **ة** marks the feminine and many nouns or masdars. It is said **t** when you keep reading, and **h** (or nothing) in pause. That pause pronunciation is why people write ه (مدرسه، الحياه، العربيه).
- **ه** is a real **h**: either a root letter (وجه، فقه، انتباه، مياه) or the pronoun "his" (كتابه = his book). So **كتابة (writing) vs كتابه (his book)** is a real-word pair. Only context can decide, so don't auto-correct ه→ة without a lexicon or the frequency ratio. In the CAMeL list I found 336 ه→ة candidates (top 60k) where the ة form is at least 20× more frequent. They look clean: العربيه، شركه، جديده، اللغه، الحياه، المدينه…
- **ة can only be word-final.** Before a suffix it becomes **ت** (سيارة → سيارتك، مدرسة → مدرستي). A ة followed by a letter inside a token is always wrong. Online, this is mostly a **missing space** (المدينةالكبيرة), so suggest "ة + space" unless what follows is a pronoun suffix.
- ة is the M key and ت is J, which are neighbours, so ة↔ت can be a slip.

### 2.4 Alif maqsura ى vs yaa ي

- **ى** (no dots) is an *alif sound*, and appears only word-final: على، إلى، حتى، متى، مستشفى، مصطفى، موسى، رأى، مشى.
- **ي** is a *y/ii sound*: في، الذي، التي، هي، لي، العربي.
- **Egyptian practice writes most final ي as ى** (فى، الذى، العربى). Our corpus shows فى at rank 21 with 23 M tokens. It is not standard MSA, so treat it as a regional habit, medium confidence.
- **Before a suffix ى becomes ي** (على → عليه، إلى → إليك، مستشفى → مستشفيات). A ى inside a word is always wrong, or again a missing space.
- **Real-word traps:**
  - علي is the name *Ali*, as well as a misspelling of على. Flag it only before an ال-noun.
  - لديّ means "I have", so لدي is valid.
  - معنيّ ("concerned") and سويّ ("upright") are real words.
  - Verbs ending in ى are valid as written: نادى، بنى، أبى، رمى، مشى. So never auto-convert ى→ي.
- On the keyboard ى (N) is next to ا (H) and far from ي (D). ى↔ي is a spelling error; ى↔ا may be a slip.

### 2.5 Tanween (التنوين), especially tanween fath + alif

- Accusative indefinite nouns take **ًا**: كتابًا، شكرًا، جدًا.
- **No extra alif** after ة (مدرسةً), after hamza preceded by alif (مساءً، ماءً, never مساءاً), or after ى (هدًى).
- **Position of the fathatan.** On the letter *before* the alif (جدًا) is what the LanguageTool Arabic rule and many modern guides prefer. On the alif (جداً) is widespread and accepted by many. Make this a **style hint, off by default.**
- **ON errors** (ARETA): nun written instead of tanween (ثوبن). Rare in typed MSA.
- **In typing tests we strip harakat**, so tanween marks don't matter there; the alif itself (جدا vs جد) still does. In free writing with tashkeel, run the two tanween rules.

### 2.6 Lam-alef (لا)

- لا is a **mandatory ligature** of ل + ا (also لأ، لإ، لآ). The font draws it as one glyph (OpenType `rlig` in Noto Naskh: `font-variant-ligatures: no-common-ligatures` did *not* break it in my test).
- **Encoding:** always two code points (U+0644 U+0627). The presentation forms U+FEF5 to U+FEFC must be decomposed (NFKC) before comparing.
- **Typing:** the B key (Windows) or ل then ا. Both are correct. In the UI, treat لا as **two graphemes but one visual unit** (§4.3).
- **Teaching tip:** many learners hunt for "لا" on the keyboard. Show "B = لا" on the virtual keyboard.

### 2.7 Waw al-jama'a and the alif fariqa (OW)

- A plural verb ending in **واو الجماعة** takes a silent **ا**: past (كتبوا، ذهبوا، كانوا), imperative (اكتبوا), and jussive/subjunctive (لم يكتبوا، لن يذهبوا، أن يكتبوا).
- **No alif** on:
  - the indicative plural (يكتبون)
  - nouns (أبو، عضو، نحو)
  - verbs whose **root ends in و** (يدعو، يرجو، يبدو، يشكو، أرجو، نرجو)
- **Common errors:**
  - missing alif: قالو (28% online), كانو, لم يكتبو
  - **extra alif** on defective verbs: أرجوا (10.5%), نرجوا (13.8%), يبدوا, يدعوا
- أرجوا and نرجوا are *always* wrong (1st person). يدعوا and يرجوا are valid as plural subjunctive or jussive, so give them medium confidence.

### 2.8 The hidden alif (الألف المحذوفة)

These words are *pronounced* with a long aa but *written* without alif:
- هذا، هذه، هذان، هكذا، ذلك، لكن، لكنّ
- هؤلاء، أولئك
- الله، إله، الرحمن، طه

Typical errors: **هاذا، ذالك، لاكن، هاكذا، هاؤلاء، أولائك**. They are rare online (under 0.5%) but **classic for learners and dialect speakers**. In fully vowelled text, a dagger alif U+0670 (هٰذا، ذٰلك، لٰكن) marks the sound. Use it in the explanation card.

### 2.9 Dialect-driven letter confusions

Spoken dialects merge sounds that MSA spelling keeps apart. Examples: Egyptian ذ→د/ز, ظ→ض/ز, ث→ت/س, ق→ء (glottal stop), with classicisms keeping MSA sounds ([Egyptian Arabic phonology](https://en.wikipedia.org/wiki/Egyptian_Arabic_phonology), [talkinarabic](https://www.talkinarabic.com/letter-qaf-in-egyptian-arabic/), via search). Similar mergers are documented for Moroccan dialects (loss of ث/ذ) and Levantine.

| Pair | Typical wrong → right | Rate online | Notes |
|---|---|---|---|
| ض ↔ ظ | الضهر→الظهر، النضام→النظام، عضيم→عظيم، ظابط→ضابط، انتضار→انتظار، ملاحضة→ملاحظة، الضروف→الظروف | 0.1–0.4% (مظبوط 20%) | **Real-word traps:** ضلّ/ظلّ، ضنّ/ظنّ، نضِر/نظر (LanguageTool's `homophones.txt` lists about 170 such ض/ظ pairs) |
| ذ ↔ ز / د | زهب→ذهب، ازا→إذا، هازا→هذا، اللزي→الذي، كزب→كذب | under 0.1% | زكي (a name / "pure") vs ذكي ("clever") are both real words |
| ث ↔ ت / س | كتير→كثير (8%), تلاتة→ثلاثة، اسنين→اثنين | 0–8% | تاني (dialect) vs ثاني |
| ق ↔ ك / ء / گ | گال→قال، dialect ق written as ك or ء | rare in writing | گ ڨ چ پ ڤ are non-MSA letters: flag as low |
| ت ↔ ط, س ↔ ص, د ↔ ض, ه ↔ ح | mostly learner or L2 errors | rare | |

Policy: catch only **non-words** with lists (validated against frequency). Never flag a real word without context. For the user, use these pairs for **minimal-pair drills** rather than heavy rules.

### 2.10 «إن شاء الله» vs «إنشاء الله»

**إنشاء** is the masdar of أنشأ, "creating, establishing". So «إنشاء الله» reads as "the creation of God" or "creating God", which is a well-known and embarrassing error ([alifbee](https://blog.alifbee.com/inshallah-meaning-arabic/)). The correct form is three words: **إن شاء الله** ("if God wills"). Online, single-token variants exist: انشالله (13,910 tokens), انشاءالله (2,386), إنشاءالله (473).

Similarly **ما شاء الله** (not ماشاء الله) and **بإذن الله** (not بأذن, which is 8% online).

### 2.11 Common misspelled words (wrong → right)

| # | Wrong | Right | Family | # | Wrong | Right | Family |
|---|---|---|---|---|---|---|---|
| 1 | إنشاء الله / انشالله | إن شاء الله | split | 26 | قالو / كانو | قالوا / كانوا | OW |
| 2 | ماشاء الله | ما شاء الله | split | 27 | لم يكتبو | لم يكتبوا | OW |
| 3 | هاذا | هذا | hidden alif | 28 | أرجوا / نرجوا | أرجو / نرجو | OW (extra) |
| 4 | ذالك | ذلك | hidden alif | 29 | يبدوا | يبدو | OW (extra) |
| 5 | لاكن | لكن | hidden alif | 30 | شئ / شيئ | شيء | hamza final |
| 6 | هاؤلاء / أولائك | هؤلاء / أولئك | hidden alif | 31 | بطيئ / برئ | بطيء / بريء | hamza final |
| 7 | الى | إلى | hamza qat' | 32 | هدوئ | هدوء | hamza final |
| 8 | انا / انت | أنا / أنت | hamza qat' | 33 | تفائل | تفاؤل | hamza medial |
| 9 | اذا | إذا | hamza qat' | 34 | تسائل | تساءل | hamza medial |
| 10 | الاطفال | الأطفال | hamza qat' | 35 | رئيت | رأيت | hamza medial |
| 11 | لان | لأن | hamza qat' | 36 | مسأله | مسألة | ة + hamza |
| 12 | الان | الآن | madda | 37 | مسئول | مسؤول | regional |
| 13 | إسم / إسمي | اسم / اسمي | hamza wasl | 38 | الطوارىء | الطوارئ | old typography |
| 14 | إبن / إثنين | ابن / اثنين | hamza wasl | 39 | سيارةك | سيارتك | ة inside word |
| 15 | إمرأة | امرأة | hamza wasl | 40 | علىه / إلىك | عليه / إليك | ى inside word |
| 16 | إستخدام | استخدام | hamza wasl | 41 | الضهر | الظهر | ض/ظ |
| 17 | إجتماع / الإجتماعية | اجتماع / الاجتماعية | hamza wasl | 42 | النضام | النظام | ض/ظ |
| 18 | إنتظار | انتظار | hamza wasl | 43 | ظابط / مظبوط | ضابط / مضبوط | ض/ظ |
| 19 | الإقتصاد | الاقتصاد | hamza wasl | 44 | كتير / تلاتة | كثير / ثلاثة | ث (dialect) |
| 20 | المدرسه | المدرسة | ة/ه | 45 | زهب / ازا | ذهب / إذا | ذ (dialect) |
| 21 | العربيه / الحياه | العربية / الحياة | ة/ه | 46 | مساءاً | مساءً | tanween |
| 22 | حتي / متي | حتى / متى | ى/ي | 47 | كتابً | كتابًا | tanween |
| 23 | مستشفي | مستشفى | ى/ي | 48 | جمييييل | جميل | elongation |
| 24 | فى / الذى / التى | في / الذي / التي | ي/ى (Egypt) | 49 | علی (Persian ی) | على/علي | wrong layout |
| 25 | علي (before ال-noun) | على | ى/ي | 50 | و الكتاب | والكتاب | detached و |

---

## 3. Text normalisation for comparing (target vs typed)

### 3.1 Principles

- **Two layers.**
  - *Encoding normalisation* makes different encodings of the **same keystrokes** equal. Apply it to both target and input.
  - *Lenience options* forgive **real differences** we decide not to grade (harakat, digits, punctuation, lazy hamza).
  - Never mix the two up: a typed tatweel is a real keystroke error, not an encoding difference.
- Apply normalisation **once at import** to the target (store it as `target`; keep the original `display` text with tashkeel for TTS and hint cards). Apply it **per input event** to the typed text.
- **Keep the model string and the display string separate.** The display may contain ZWJ (§4.3) and the model never does. multilingual-typing-race documents the same discipline: "the engine, the typed value, the log and the validator never see [a joiner]" ([PR #63](https://github.com/Nell-Kh/multilingual-typing-race/pull/63)).

### 3.2 The pipeline (validated code in Appendix A)

| Step | What | Why |
|---|---|---|
| 1 | `s.normalize('NFC')` | ا+U+0654 → أ; ي+U+0654 → ئ. **Not NFD + strip marks**: verified, NFD decomposes أ→ا+U+0654, إ→ا+U+0655, آ→ا+U+0653, ؤ→و+U+0654, ئ→ي+U+0654, so stripping `\p{Mn}` produced "الالوان ان شاء الله" from "الْأَلْوَانُ إِنْ شَاءَ اللّٰهُ" |
| 2 | Presentation forms U+FB50–U+FDFF and U+FE70–U+FEFF → `NFKC` per char | Linux xkb types U+FEFB for لا (verified: NFKC(U+FEFB) = U+0644 U+0627). Copied PDF text often has presentation forms |
| 3 | Remove invisibles: U+200B–U+200F (ZWSP, ZWNJ, ZWJ, LRM, RLM), U+202A–U+202E, U+2066–U+2069, U+061C (ALM), U+FEFF | xkb and Windows can type ZWJ/ZWNJ/LRM/RLM on AltGr/Ctrl+Shift layers; copied text carries bidi marks |
| 4 | Persian/Urdu look-alikes: ی U+06CC → ي, ک U+06A9 → ك, ہ U+06C1 / ھ U+06BE / ە U+06D5 → ه, ۀ U+06C0 → ة (approx.), ٱ U+0671 → ا | Persian keyboards and copied text. Farsi yeh has no dots in final form, so it *looks* like ى (it is joining type D like ي) |
| 5 (option, default on) | Strip harakat: U+0610–U+061A, U+064B–U+065F, U+0670 (dagger alef), U+06D6–U+06ED (Quranic), U+08D3–U+08FF | Most Arabic text is unvoweled; typists don't type harakat |
| 6 (option, default on) | Fold digits: ٠–٩ U+0660–U+0669 and ۰–۹ U+06F0–U+06F9 → 0–9 | 101 types Western digits by default; regions differ (Maghreb Western, Egypt/Levant/Gulf Eastern) |
| 7 (option, default off) | Fold punctuation: ، → , · ؛ → ; · ؟ → ? | A trainer should teach Shift+K / Shift+/; enable for beginners |
| 8 (option, default off) | Lazy hamza: أ إ آ → ا | Monkeytype's "lazy mode" does exactly this, and also strips harakat (`frontend/src/ts/test/lazy-mode.ts`). It hides our target errors, so keep it off |
| target only | Strip tatweel U+0640, collapse whitespace | Tatweel is decorative. If the user types it, count it as an extra character (Shift+ت slip) |

**Code-point facts used above** (verified with Python `unicodedata`):
- Eastern Arabic-Indic digits ٠–٩ have bidi class **AN**; Extended (Persian) ۰–۹ have **EN**.
- ، (U+060C) is bidi **CS**; ؛ (U+061B) and ؟ (U+061F) are **AL**.
- Tatweel is **Lm**. ٪ U+066A, ٫ U+066B decimal separator, ٬ U+066C thousands separator.
- Unicode joining types (UCD 18.0 `ArabicShaping.txt`):
  - **R** (right-joining only): ا أ إ آ ٱ د ذ ر ز و ؤ ة
  - **U** (non-joining): ء
  - **D** (dual-joining): all other letters, including ئ and ى
  - **C** (join-causing): tatweel and ZWJ
  - **T** (transparent): harakat

### 3.3 Graphemes, harakat and "what is one character"

- Segment the target with `Intl.Segmenter('ar', {granularity: 'grapheme'})`. A letter plus its harakat is one grapheme (verified: كَتَبَ → [ك+fatha, ت+fatha, ب+fatha]). **لا is two graphemes** (ل, ا).
- In the default (no-tashkeel) mode, graphemes = letters. In an optional "tashkeel mode", keep harakat in the target. The user types them as separate keystrokes (Shift+Q …), so compare per code point but render per grapheme. Chromium did **not** colour a haraka differently from its base letter when they were in different spans (verified, §4.1). Colour the whole grapheme by its worst state.
- **Backspace:** browsers may delete Arabic by code point (one haraka at a time) rather than by grapheme. Derive the typed string from the input element's value (`beforeinput`/`input`), never from counting keydowns.

### 3.4 Regex gotchas (JavaScript)

- `\b` is ASCII-based even with the `u` flag: `/\bإنشاء\b/u.test('قال إنشاء الله')` is **false** (verified). Use `(?<![\p{L}\p{M}])` and `(?![\p{L}\p{M}])`.
- The tokeniser must keep harakat and tatweel inside words: `/[\u0621-\u063A\u0641-\u064A\u064B-\u065F\u0670\u0640]+/gu`. `Intl.Segmenter('ar', {granularity: 'word'})` also works and keeps `والكتاب` as one word.
- Don't put a combining mark at the start of a character class or right after `[`. Write it as an escape, e.g. `[\u064B-\u065F]`, never as a literal (editors attach it to the `[` glyph).

---

## 4. RTL rendering in a typing test

### 4.1 The joining problem: evidence and my measurements

**Background.** Arabic letters take initial, medial, final or isolated forms depending on their neighbours. Text shaping (HarfBuzz/CoreText) runs per *text run*. If the engine cuts runs at element boundaries, each piece is shaped alone: the last letter of span 1 becomes "final" and the first of span 2 "initial" ([WebKit bug 6148](https://bugs.webkit.org/show_bug.cgi?id=6148), filed 19 Dec 2005, "WebKit doesn't shape characters (like Arabic) across style changes").

**Spec and status:**
- CSS Text says markup alone must not break joining. Styling that doesn't change glyphs (colour, text-decoration) must not break it. Non-zero margin, padding or border and isolation boundaries *will* break it.
- W3C **alreq issue #222** ("Inline elements break cursive shaping"): originally WebKit broke joins for any markup, while Gecko and Blink kept them for colour and text-decoration but not for font-weight, font-style or font-size changes. The issue was later closed reporting "interoperable support for cursive joining regardless of inserted spans". Gecko and WebKit still break on weight/style/size changes, and only Gecko colours combining marks separately ([w3c/alreq#222](https://github.com/w3c/alreq/issues/222)).
- **However**, a project that tested in **September 2026** reports that **Safari on macOS and WebKitGTK 2.52 still shape each inline element separately**: with one span per letter, "السابعة" drew as six separate letters. Chromium and Firefox join ([multilingual-typing-race `docs/rtl-notes.md`](https://github.com/Nell-Kh/multilingual-typing-race/blob/main/docs/rtl-notes.md)).
- The fix "**Arabic letters in adjacent inline boxes not being joined**" appears in **Safari Technology Preview 251**, released **26 Aug 2026** ([webkit.org release notes](https://webkit.org/blog/18194/release-notes-for-safari-technology-preview-251/), [MacRumors](https://macrumors.com/2026/08/26/apple-releases-safari-technology-preview-251/)). Assume stable Safari breaks joins until that ships, and older iOS versions will keep breaking them for years.

**My test** (headless Chromium 141.0.7390, Noto Naskh Arabic 40 px, text "السابعة السلام لكنه", `direction: rtl`):

| # | Markup | Width | Result |
|---|---|---|---|
| A | single text node | 264 px | reference, joined |
| B | one `<span>` per letter, `display:inline`, 3 alternating colours | 264 | **joined** |
| C | one span per letter, **`display:inline-block`** | **379** | **broken**: every letter isolated |
| D | one letter with `border-bottom: 2px` | 264 | joined in Chromium (spec allows breaking; avoid) |
| E | 3 runs (correct / wrong / untyped), no ZWJ | 264 | joined |
| F | 3 runs + ZWJ at boundaries | 264 | joined |
| G | `letter-spacing: 2px` | 264 | Chromium **ignored** letter-spacing for Arabic |
| H | `font-weight:700` on half a word | 266 | joined in Chromium (Gecko/WebKit break, per alreq) |
| I | single text node + **CSS Custom Highlight API** (2 ranges) | 264 | joined, partial colouring works, background highlight works |

**Lam-alef test** (64 px, "السلام لا"):

| # | Markup | Width | Result |
|---|---|---|---|
| 1 | single node | 188 | ligature لا |
| 2 | split between ل and ا into two coloured spans, **no ZWJ** | 188 | ligature kept and **split-coloured** (Chromium clips colour inside the glyph) |
| 3 | same split **with ZWJ** on both sides | **178** | **ligature destroyed**: renders as a connected لـا, which is wrong for Arabic |
| 4 | Highlight API split between ل and ا | 188 | ligature kept, split-coloured |
| 5 | `font-variant-ligatures: no-common-ligatures` | 188 | ligature kept (Noto Naskh uses a required ligature) |
| 6 | كَتَبَ with each haraka in its own coloured span | n/a | marks positioned fine but **painted in the base letter's colour** |

**Range geometry:** in Chromium, a Range over ل and over ا *inside* the لا ligature each return half of the ligature's width (12 px + 12 px at 40 px). So a caret can sit "between" ل and ا.

### 4.2 How Monkeytype does it (read from source)

- Language JSON flags: `arabic_10k.json` has `"rightToLeft": true, "joiningScript": true, "bcp47": "ar-SA"`. It has 9,281 words, **fully vowelled** and subtitle-flavoured (e.g. اِخْرَسِي). Lists available: `arabic`, `arabic_10k`, `arabic_egypt`, `arabic_egypt_1k`, `arabic_morocco` (`packages/schemas/src/languages.ts`).
- `test.scss`:
  - `#words.rightToLeftTest { direction: rtl; .wordRtl { unicode-bidi: bidi-override } }`
  - `#words.joiningScript .word letter { display: inline }`. The default for letters is `inline-block`, which would break joining. That is the key line.
  - `overflow-wrap: anywhere` and a small `padding-bottom` on words.
- `break-joining.ts`: only for the "dots" typed-effect does Monkeytype *deliberately* break joining after a word is typed (adds `broken-joining`, fixes the word width).
- `elements/caret.ts`: for RTL words, the caret `left` = `letter.offsetLeft + letter.offsetWidth` (the right edge) for "before letter", minus the letter width for "after letter". Tape mode is mirrored.
- `utils/strings.ts`: RTL detection by regex over U+0590–U+05FF, U+0600–U+06FF, U+0750–U+077F, U+08A0–U+08FF, U+FB50–U+FDFF, U+FE70–U+FEFF. Leading and trailing punctuation are stripped first, so `word؟` doesn't flip direction.
- Fonts: Monkeytype ships **Noto Naskh Arabic** and **Lalezar** among its font options (`packages/schemas/src/fonts.ts`).
- **Gap:** Monkeytype keeps one `<letter>` element per character, which relies on Blink/Gecko joining across inline boxes. That is exactly what stable Safari doesn't do. **Parrotype should do better** with runs + ZWJ.

### 4.3 Recommended rendering strategy for Parrotype

**Default: "runs + ZWJ" (works in every engine).** Code: Appendix B, `buildRuns()`.

1. Split each target word into graphemes. Give each grapheme a state: `correct | incorrect | current | untyped | extra`.
2. Merge consecutive graphemes with the same state into **runs** (one `<span>` per run, `display:inline`). A word usually has 1–4 spans.
3. At a run boundary, if the previous base letter **joins forward** (joining type D or C) and the next **joins backward** (D, R or C; skip transparent marks), append **U+200D** to the end of the previous run and prepend it to the next run.
4. **Exception: ل followed by ا أ إ آ.** Never put ZWJ there. Colour the لا pair as one unit using the more important state (incorrect > extra > current > untyped > correct), so an error is never hidden. In Blink and Gecko you may instead split the colour without ZWJ (`splitLamAlef: true`); Chromium paints it correctly.
5. **Extra (over-typed) letters** go in their own run at the end of the word. ZWJ applies there too, so the extra letters attach to the word visually.
6. Output is display-only. Keep a `displayIndex ↔ modelIndex` map for caret math. Set `user-select: none` on the typing area so copied text never contains ZWJ.

Verified renders in Chromium: `السا|ب|عة` (correct / wrong / untyped), `الس|لا|م` (lam-alef merged as wrong), `مس|ت|شفى`. All joined, ligature intact.

**Alternative: CSS Custom Highlight API** (one text node per word):

```ts
// one Text node per word; ranges per state; no DOM splitting → shaping untouched
const hl = { correct: new Highlight(), incorrect: new Highlight(), untyped: new Highlight() };
for (const [k, h] of Object.entries(hl)) CSS.highlights.set(`tw-${k}`, h);
function paint(textNode: Text, states: State[], offsets: number[] /* grapheme → code-unit offset */) {
  for (const h of Object.values(hl)) h.clear();
  states.forEach((s, i) => { const r = new Range(); r.setStart(textNode, offsets[i]); r.setEnd(textNode, offsets[i + 1]); hl[s]?.add(r); });
}
```

```css
::highlight(tw-correct)   { color: var(--text); }
::highlight(tw-incorrect) { color: var(--error); background-color: var(--error-bg); }
::highlight(tw-untyped)   { color: var(--sub); }
```

- Support: **Chrome/Edge 105, Safari 17.2, Firefox 140** ([web.dev, June 2025](https://web.dev/blog/web-platform-06-2025)). "Not quite Baseline" because of remaining `::highlight` styling issues.
- Only colour, background and text-decoration are allowed, which is all we need.
- Use it behind a feature check (`'highlights' in CSS`), with runs + ZWJ as the fallback.
- I verified Chromium only. Prototype on Safari 17.2+ before making it the default.

**Fallback for exotic effects** (dots, blur, per-letter animations): colour **whole words** by state after commit, and show the per-letter diff only in the result screen. Monkeytype does the same for its dots effect.

**CSS rules for Arabic typing text: do and don't**

- Do: `[data-lang="ar"] .words { direction: rtl; unicode-bidi: isolate; }`. Also put `dir="rtl" lang="ar"` *attributes* on the container (not just CSS), so the bidi base direction, `:lang()` font selection and screen readers agree.
- Do: put `unicode-bidi: isolate` on each `.word` so punctuation and neutral characters don't reorder across words. Words may be `inline-block`; **letters/runs may not**.
- Do: keep identical `font-family`, `font-size`, `font-weight` and `font-style` on all runs. Signal state with colour, background-colour, opacity or `text-decoration` only.
- Don't: use `padding`, `margin`, `border` or `transform` on runs, `display:inline-block` / `flex` / `grid` on runs, `letter-spacing`, or `text-transform`.
- Don't: use `::before`/`::after` with `content` inside a word, or insert the caret element inline.
- Don't: set `font-variant-ligatures: none` or `no-common-ligatures` on Arabic. Monkeytype sets `font-variant: no-common-ligatures` on `.word`. It didn't hurt Noto Naskh in my test, but a font that puts لا in `liga` would break, so reset to `normal` for `:lang(ar)`.
- Don't: use underline for errors (descenders and dots collide). Prefer `background-color`. If you underline, use `text-decoration-skip-ink: none` and a thick offset.
- Do: use logical properties in shared components (`margin-inline-start`, `padding-inline`, `inset-inline-start`, `text-align: start`), so the typing area mirrors without extra code.
- Wrapping: let words wrap at spaces. Avoid `overflow-wrap: anywhere` on Arabic (it can split a word mid-joining), except for a single word longer than the line.

### 4.4 Caret positioning

- **Overlay caret** (absolute, `pointer-events: none`), animated with `transform: translate()`. Exactly as in Monkeytype.
- **Position** = logical index `i` in the active word (number of typed graphemes):
  - `i < len`: rect = `Range(char i)`; RTL caret x = `rect.right` (the start edge of char i), LTR = `rect.left`.
  - `i ≥ len` (end of word or extra letters): rect = `Range(last char)`; RTL x = `rect.left`.
  - In the runs renderer, map the model index to (run text node, display offset), skipping ZWJ.
  - Inside لا: Chromium gives each half its own rect, so the caret lands in the middle of the ligature. If an engine returns the full ligature for ل, place the caret at the ligature's right edge (before ل) or left edge (after ا).
- **Vertical:** use the line box (`rect.top`, `rect.height`). Arabic has tall ascenders and deep descenders, so give the caret about 1.1× the Latin height and centre it. A **block caret is awkward in RTL** because cursive letters have no clean cell, so prefer line or underline caret styles for Arabic.
- **Smooth caret moves right→left.** Mirror tape-mode math (`newMargin *= -1`) as Monkeytype does.
- **Recompute on font load** (`document.fonts.ready`) and on resize. Arabic fonts load late and change widths.

### 4.5 Input handling

- A hidden `<input dir="rtl" lang="ar" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">`. Use `beforeinput` and `input` (`insertText`, `insertCompositionText`, `deleteContentBackward`).
- **One keystroke can insert two code points** (لا, لأ, لإ, لآ on Windows), so always diff against the field value, never assume 1 key = 1 char.
- Desktop Arabic layouts are not IME-based. Mobile keyboards (Gboard etc.) use composition and suggestions: handle `compositionend`, and disable autocorrect.
- Record `KeyboardEvent.code` with each produced character (layout learning §1.4, per-key stats).
- **Don't block Shift-layer characters** (harakat, tatweel): they are informative errors.

### 4.6 Bidi pitfalls in content

- **Keep Latin letters and digits out of Arabic practice sentences** (v1). Numbers are laid out LTR inside RTL text: in "عام 2026" the caret jumps visually while the logical order stays the same. multilingual-typing-race made the same decision.
- If numbers are needed later, isolate them in their own word element (`<bdi>` or `unicode-bidi: isolate; direction: ltr`) and move the caret word by word.
- **Brackets mirror:** `(` typed in RTL shows as `)` and vice versa. That's correct Unicode mirroring, but confusing next to an English keycap legend.
- **Sentence-final punctuation** (. ؟ !) goes visually to the *left* end of the Arabic sentence. It only does so when the container's base direction is RTL, hence the `dir` attribute.

### 4.7 Punctuation and numerals

| Char | Code point | 101 key | Notes |
|---|---|---|---|
| ، Arabic comma | U+060C | Shift+K | turned-comma shape; Latin `,` is Shift+Comma |
| ؛ Arabic semicolon | U+061B | Shift+P | |
| ؟ Arabic question mark | U+061F | Shift+/ | mirrored question mark |
| . full stop | U+002E | Shift+Period (101) / Period (Mac) | Arabic uses the Latin full stop |
| « » | U+00AB / U+00BB | (Mac: Shift+A / Shift+S) | common quotation marks in Arabic print |
| ٪ ٫ ٬ | U+066A–U+066C | not on 101 | percent, decimal and thousands separators |
| ٠–٩ | U+0660–U+0669 | AltGr row (xkb) | Egypt, Levant, Gulf, Iraq. The Maghreb uses 0–9 |
| ۰–۹ | U+06F0–U+06F9 | not on 101 | Persian/Urdu forms (۴ ۵ ۶ differ). Treat as wrong layout |

Default comparison: punctuation **strict** (it teaches the Shift positions), digits **folded**. Offer a "beginner" toggle that also folds punctuation.

---

## 5. Typing-mode error classifier: Arabic labels

These plug into `typing-pedagogy.md` §4–§5. Run them after alignment, per substituted, inserted or deleted grapheme. Implementation: `classifySub()` in Appendix D.

| Label id | Detect | Kind | Tip (EN) / (AR) |
|---|---|---|---|
| `ar.shiftSlip` | same physical key, different Shift state: ا↔أ (H), غ↔إ (Y), ى↔آ (N), ت↔ـ (J), ل↔لأ (G), ف↔لإ (T), لا↔لآ (B), letter↔haraka | motor (cognitive if the same word repeats it in ≥ 2 sessions) | "أ is Shift + ا. Hold Shift with the other hand." / «الهمزة على الألف = Shift + ا» |
| `ar.hamzaSeat` | both in {ا أ إ آ ء ؤ ئ}, not a shift slip | cognitive | wasl vs qat' card (§2.2) |
| `ar.taMarbuta` | ة↔ه | cognitive | "ة sounds like t when you keep reading; ه is always h." |
| `ar.taMarbuta.adjacent` | ة↔ت | motor (M/J are neighbours) unless before a suffix | |
| `ar.alifMaqsura` | ى↔ي | cognitive | "ى has no dots and sounds like a; ي has two dots." |
| `ar.alifMaqsura.adjacent` | ى↔ا | motor (N/H) | |
| `ar.dotTwin.adjacent` | dot-twin pair that is also a neighbour: س/ش ج/ح/خ ص/ض ع/غ ف/ق ت/ن | motor | "Neighbour key, and the letters only differ by dots. Check the dots!" |
| `ar.dotTwin` | dot twin, not adjacent: د/ذ ر/ز ط/ظ ب/ت/ث/ن/ي | cognitive or visual | |
| `ar.phonetic` | ض/ظ ذ/ز ذ/د ث/س ث/ت ظ/ز ق/ك ق/ء ت/ط س/ص د/ض ه/ح ع/ء | cognitive (dialect) | minimal-pair drill |
| `ar.wawAlif.missing` / `.extra` | target ends ـوا and typed ـو, or the reverse | cognitive | §2.7 |
| `ar.hiddenAlif` | typed an extra ا in هذا/ذلك/لكن/هؤلاء/أولئك | cognitive | §2.8 |
| `ar.lamAlef` | typed لأ/لإ/لآ/لا variant mismatch | shift slip or hamza | |
| `ar.harakaStray` | typed a haraka when the target is unvoweled (only if typed harakat aren't ignored) | motor (Shift held) | |
| `ar.space` | detached و/ب/ل, or merged words (`ins.space` / `del.space`) | cognitive | |
| `ar.wrongLayout` | typed ی ک ۴ or Latin letters in an Arabic test | setup | "Switch to the Arabic keyboard (Win+Space / Ctrl+Space)." |
| generic | `sub.adjacent`, `transposition`, `del.double` … from the shared classifier | as in pedagogy doc | |

Order: wrongLayout → shiftSlip → hamzaSeat → taMarbuta/alifMaqsura (with the adjacency check) → phonetic → dotTwin → generic adjacency → other. Word-level patterns (`wawAlif`, `hiddenAlif`, `space`) are matched on the whole word before character-level labels.

---

## 6. Rule engine for free writing and dictation

### 6.1 Design

- Same shape as the Dutch engine (`dutch-errors.md` §2): normalise (NFC, keep offsets) → tokenise (Arabic letters + harakat + tatweel) → split clitics → rules → dedupe.
- **Clitic splitting.** Proclitics are و ف (conjunctions), ب ل ك (prepositions) and ال. Splitting them keeps word lists small. **Danger:** كان → ك + ان was flagged as "ان → أن" in my first run. So:
  - hamza-omission lists only strip **و/ف**;
  - never split when the remaining core has fewer than 2 letters;
  - protect common words.
- **Confidence tiers:** `high` = shown as an error and scored · `medium` = warning · `low` = style hint (off unless "strict MSA").
- **Lexicon validation for v2.** Generate a candidate, then accept it only if the suggestion is in a word list and the found form isn't. Options:
  - **Ayaspell / hunspell-ar** (GPLv2 / LGPLv2 / MPL 1.1 tri-license; [ayaspell](https://github.com/munzirtaha/ayaspell)). Note that Arabic affix files are heavy for `nspell`; test the performance.
  - The **CAMeL frequency list** (CC BY-SA 4.0), only for ة/ه and ى/ي ratio lists, because hamza-less forms dominate online (§2.1).
- **LanguageTool as an optional second opinion.** Arabic has been supported since LT 4.9, with about 450 XML rules and 16 Java rules ([dev.languagetool.org/languages](https://dev.languagetool.org/languages)). Its Arabic resources are useful for ideas:
  - `replaces.txt`: about 670 lines, mainly from Taha Zerrouki's *aghlat* corpus
  - `homophones.txt`: about 170 ض/ظ pairs
  - `darja.txt`: about 240 dialect and loanword replacements
  - `grammar.xml`: categories `COMMON_ERRORS_ON_ONE_WORD_USE`, `Tanwin_nasb`, and others

  But much of `replaces.txt` and `darja.txt` is **prescriptive purism** (e.g. المعاجم → المعجمات, الأهرامات → الأهرام, الباص → الحافلة). For a typing app, keep only spelling-type matches and show the rest as low hints. Licence: LGPL-2.1, so borrow ideas rather than copying the files. *aghlat* is AGPL-3.0: don't bundle it. I couldn't test the live API from this sandbox (blocked); verify that `language=ar` responses arrive in the browser.

### 6.2 Detection rules (33: 32 implemented and tested in Appendix C, plus 1 optional style rule)

"FP risk" = false-positive risk after the listed antipatterns.

| id | Logic | Wrong → right | Explanation (AR / EN) | Conf | FP risk |
|---|---|---|---|---|---|
| AR_INSHALLAH | lookaround regex `[إا]نشاء\s*الله`, `[إا]نشالله`, `ان شالله` | إنشاء الله → إن شاء الله | «إنشاء» تعني الخلق؛ الصواب ثلاث كلمات. / "إنشاء" means creating; write three words | high | very low ("إنشاء الله للكون" is theoretically possible) |
| AR_MASHALLAH | `ماشاء\s?الله` | ماشاء الله → ما شاء الله | «ما شاء الله» كلمات منفصلة. / three separate words | high | very low |
| AR_HIDDEN_ALIF | token list: هاذا هاذه هاذان هاذين هاكذا هاؤلاء ذالك ذالكم لاكن(+ه/ها/ني/ك/هم) لاكي اولائك/أولائك اللاه طاها | هاذا → هذا, لاكن → لكن | ألف تُنطق ولا تُكتب. / alif pronounced, never written | high | very low |
| AR_WASL_NOUNS | token list: إسم(+suffix) إبن إبنة إثنان إثنين أثنين إثنتان إمرأة أمرأة إمرؤ, with clitics | إسمي → اسمي, الإبن → الابن | همزة وصل في الأسماء العشرة. / wasl nouns take bare ا | high | very low (plurals أبناء، أسماء are not listed) |
| AR_WASL_PATTERN | core (clitics stripped) matches a Form VII/VIII/X masdar `^[إأ](ست C C ا C \| C ت C ا C \| ن C C ا C)(suffix)?$` or past `^إ(ست K K K \| K ت K K \| ن K K K)(وا\|ت\|نا\|تم)?$` (C = not ا; K = not ا/و/ي) minus exceptions | إستخدام → استخدام, الإجتماع → الاجتماع, إنتظرت → انتظرت | ماضي الخماسي والسداسي ومصدرهما بهمزة وصل. / Forms VII, VIII, X start with wasl | medium | low after exceptions (الإنترنت، أنبياء، أسترالي، أنطوان، إنجيل، إنزيم، إرتري، ألتراس، إسطنبول); 66/66 sampled corpus hits correct; place names like إنزكان slip through |
| AR_HAMZA_OMITTED | token list (with و/ف only): الى اذا او انا انت انتم اين اي ايضا اكثر اول اخرى اهل امس الان اسبوع ارض اطفال ابدا اسرة افضل اخبار لان(ه/ها) ان انه انها امام اسلام انسان | الى → إلى, ان → أن/إن | همزة القطع تُكتب أ أو إ. / write the qat' hamza | medium | low; ambiguous items get 2 suggestions (ان → أن/إن, امام → أمام/إمام) |
| AR_TAA_MARBUTA_INSIDE | `ة(?=[letters])`; suggest ت if the rest is a pronoun suffix (ي ك ه ها نا هم كم هن كما هما ان ين), else "ة + space" | سيارةك → سيارتك, المدينةالكبيرة → المدينة الكبيرة | التاء المربوطة في آخر الكلمة فقط. / ة is word-final only | high | none (always an error or a missing space) |
| AR_ALIF_MAQSURA_INSIDE | `ى(?=[letters])`; `ىء` → ئ; suffix → ي; else "ى + space" | علىه → عليه, الطوارىء → الطوارئ | الألف المقصورة في آخر الكلمة فقط. / ى is word-final only | high | none |
| AR_YA_FOR_MAQSURA | token list: الي إلي حتي متي مستشفي مستوي أخري اخري أولي مدي محتوي إحدي أعلي أدني بمعني لدي موسي عيسي مصطفي | حتي → حتى | تنتهي بألف مقصورة. / ends in ى | medium | low; لدي, إلي, أولي can be valid (لديّ "I have", إليّ "to me", أوليّ "primary") so give 2 suggestions |
| AR_ALI_ALA | `علي\s+(?=ال)` | علي الطاولة → على الطاولة | «علي» اسم علم. / "Ali" is a name | medium | low ("سلّم علي الأستاذ" "greet Ali the teacher" is rare) |
| AR_MAQSURA_FOR_YA | token list: فى التى الذى اللذى هى لى بى أى اى لكى الثانى يعنى العربى الماضى | فى → في | عادة إقليمية. / regional (Egyptian) habit | medium | low; **never auto-generalise**: نادى، بنى، أبى، مشى are verbs |
| AR_HA_FOR_TAA_MARBUTA | token list (no clitics) of frequent nouns and adjectives; v2: CAMeL ratio ≥ 20 list (336 items) | المدرسه → المدرسة | التاء المربوطة تُنطق تاءً عند الوصل. / ة is said t in connected speech | medium | medium for a generic rule (كتابه "his book", وجه, فقه are correct), so list-only |
| AR_WAW_JAMAA_ALIF | token list of frequent past plurals missing ا: كانو قالو ذهبو كتبو رجعو خرجو دخلو عملو فعلو جاءو أكلو شربو لعبو سافرو وصلو | قالو → قالوا | ألف فارقة بعد واو الجماعة. / silent alif after plural waw | medium | low (أبو, نحو, عضو not listed) |
| AR_WAW_JAMAA_JUSSIVE | `(لم\|لن\|أن\|كي\|لكي\|حتى)\s+[يت]…و` minus defective verbs | لم يكتبو → لم يكتبوا | بعد لم/لن تُكتب ألف فارقة. / after لم/لن write ـوا | medium | low (excludes يدعو يرجو يبدو يشكو …: "لن يدعو" is a correct singular) |
| AR_EXTRA_ALIF_DEFECTIVE | token list: أرجوا ارجوا نرجوا أدعوا ندعوا أشكوا نشكوا | أرجوا → أرجو | الواو أصلية لا واو جماعة. / root waw, no alif | high | very low (1st person can't be plural-marked) |
| AR_EXTRA_ALIF_DEFECTIVE_3SG | يبدوا تبدوا يدعوا يرجوا | يبدوا → يبدو | الفاعل مفرد. / singular subject | medium | medium (valid as plural subjunctive: أن يدعوا) |
| AR_FINAL_HAMZA_LINE | token ends `(ي\|و\|ا)ئ`, minus سيئ يهيئ تهيئ مساوئ | شيئ → شيء, بطيئ → بطيء | الهمزة المتطرفة بعد مدّ على السطر. / final hamza after a long vowel sits on the line | medium | low after exceptions (corpus scan) |
| AR_HAMZA_WORDS | token list: شئ الشئ برئ ملئ بطئ تفائل التفائل تشائم التشائم تسائل مسأله رئيت سوأل يقرا هاؤلاء | شئ → شيء, تفائل → تفاؤل | قاعدة أقوى الحركتين. / stronger-vowel rule | medium | low (بطئ → offers both بطء and بطيء) |
| AR_MASUUL_STYLE | مسئول/مسئولية/… | مسئول → مسؤول | رسم قديم (مصر). / older Egyptian spelling | low | n/a (style only) |
| AR_TANWEEN_MISSING_ALIF | consonant + U+064B not followed by ا, at word end | كتابً → كتابًا | تنوين النصب تتبعه ألف. / fathatan needs alif | high | very low (exceptions ة اء ى excluded by the class) |
| AR_TANWEEN_EXTRA_ALIF | `(ة\|اء)` + (U+064B ا \| ا U+064B) | مساءاً → مساءً | لا ألف بعد ة ولا بعد اء. / no alif after ة or اء | high | very low (requires the tanween mark) |
| AR_TANWEEN_POSITION (style) | `اً` → `ًا` | جداً → جدًا | يُفضَّل التنوين على الحرف قبل الألف. / preferred style | low (off) | high if on (both widely accepted) |
| AR_WAW_DETACHED | standalone و followed by space + letter | و الكتاب → والكتاب | واو العطف تتصل. / و attaches | high | very low |
| AR_PREP_DETACHED | standalone ب ل ك ف + space + ال | ب القلم → بالقلم | حروف الجر المفردة تتصل. / attach | medium | low (single letters as labels or abbreviations) |
| AR_LATIN_PUNCT | `,` `;` `?` after an Arabic letter (± space) | كيف حالك? → كيف حالك؟ | علامات الترقيم العربية. / Arabic punctuation | medium | low (skip between digits) |
| AR_SPACE_BEFORE_PUNCT | whitespace before ، ؛ ؟ ! . : | حالك ؟ → حالك؟ | لا مسافة قبل الترقيم. / no space before | low | low |
| AR_PERSIAN_LETTERS | ی ک ہ ە ۰–۹ | علی → علي/على | حرف فارسي؛ غيّر لوحة المفاتيح. / wrong layout | high | none for Arabic text |
| AR_NON_MSA_LETTERS | پ چ ژ گ ڤ ڨ | گال → قال | ليس من حروف الفصحى. / non-MSA letter | low | medium (foreign names: ڤيينا, چاي) |
| AR_TATWEEL | U+0640 | جمـيل → جميل | التطويل زخرفي. / decorative | low | none |
| AR_ELONGATION | same letter ≥ 3 times | جمييييل → جميل | لا يتكرر حرف ثلاث مرات. / no triple letters | medium | low (exempt ههههه laughter in informal mode) |
| AR_DAD_DHA | non-word list: ضهر الضهر النضام نضام عضيم عضيمة ضلم الضلم ظابط الظابط مظبوط ظرب ضروف الضروف انتضار ملاحضة محافضة انضر حضيرة | الضهر → الظهر | خلط الضاد والظاء. / ض/ظ mix-up | medium | low; never list real-word pairs (ضلّ/ظلّ) |
| AR_INTERDENTAL | كتير تلاتة/تلاته اسنين زهب الزهب ازا/إزا لزلك زلك هازا اللزي كزب مزبوط | كتير → كثير | ث وذ في الفصحى. / keep ث and ذ | medium | low |
| AR_DIALECT_WORD | عشان علشان مش شو ايش هيك كده دلوقتي ليش ازاي فين برضو | عشان → لأن/من أجل | كلمة عامية. / dialect word | low | n/a (style; the user may *want* dialect) |

### 6.3 Prototype results

**Correct text: 0 false positives.**
- 78 correct sentences: 32 proverbs plus everyday sentences, including tricky items (علي as a name, لن يدعو, نادى, بنى, مبادئ, شاطئ, السيئ, يهيئ, الإنترنت, الأسترالي, الأنبياء, مدرستان).
- 47 targeted drill sentences (§7.5).

**Errors: 48 of 48 test errors flagged with the expected rule.**

**Corpus false-positive scan** (top 100k CAMeL words through the pattern rules) found and fixed:
- `AR_WASL_PATTERN` false positives on الإنترنت، الأنبياء، أسترالي، أنطوان، إنجيل، إنزيم، إرتري (exception list + no long vowels in past-tense slots);
- `AR_FINAL_HAMZA_LINE` on السيئ، يهيئ، مساوئ (exception list);
- `AR_ALIF_MAQSURA_INSIDE` suggesting ي for الطوارىء-type spellings (now ئ);
- `AR_TAA_MARBUTA_INSIDE` hits that were really missing spaces (now suggests a space first).

The remaining "suspicious" pattern hits (where the flagged form was more frequent than the fix) were real misspellings that dominate web text, e.g. إمتيازات 334k vs امتيازات 38k. That is more evidence that frequency can't arbitrate hamza.

### 6.4 Mining more lists from CAMeL (v2)

A short Python sketch (I ran it on the top 60k types):

```python
# freq: dict word→count from MSA_freq_lists.tsv (CC BY-SA 4.0: attribute and share-alike the derived list)
cands = []
for w in top_words:
    if w.endswith('ه') and len(w) >= 4:                # ه → ة
        v = w[:-1] + 'ة'
        if freq.get(v, 0) >= 20 * freq[w] and freq[w] >= 500: cands.append((w, v))
    if w.endswith('ي'):                                 # ي → ى (then hand-review: علي, تعالي, صلي are valid)
        v = w[:-1] + 'ى'
        if freq.get(v, 0) >= 10 * freq[w] and freq[w] >= 500: cands.append((w, v))
```

Results:
- 336 ه→ة candidates, clean in review.
- 70 ي→ى candidates. Review removes names (علي، موسي?) and imperatives (تعالي، صلي). Some "targets" are themselves wrong (الي → الى, where the correct form is إلى).
- 456 ى→ي candidates. **Must exclude past-tense verbs ending in ى** (نادى، بنى، أبى).
- **Do not mine hamza this way.**

---

## 7. Content: word lists, sentences, proverbs, drills

### 7.1 Frequency lists: sources and licences

| Source | What | Licence | Use |
|---|---|---|---|
| [CAMeL Arabic Frequency Lists](https://github.com/CAMeL-Lab/Camel_Arabic_Frequency_Lists) `MSA_freq_lists.tsv.zip` (69 MB zip, 228 MB TSV) | 11.4 M types from 12.6 B tokens (CAMeLBERT pre-training data) | **CC BY-SA 4.0** (cite Inoue et al. 2021) | Ranking, mining, letter stats. **Contains forum boilerplate (منتدى, الليزك), misspellings, and NSFW tokens: never ship raw**; curate |
| Monkeytype `arabic_10k.json` | 9,281 fully vowelled words, subtitle-like | Monkeytype repo is GPL-3.0 | Reference only. Vowelled and with a leading space per word |
| [hermitdave/FrequencyWords](https://github.com/hermitdave/FrequencyWords) `ar_50k` | OpenSubtitles 2018 | CC BY-SA 4.0 content | Dialect/colloquial flavour, dictation ideas |
| Buckwalter & Parkinson, *A Frequency Dictionary of Arabic* (Routledge, 2011) | top 5,000 MSA lemmas from a 30 M-word corpus, with dialect distribution | © publisher | Human reference only |

### 7.2 A curated core list (190 MSA words, correctly spelled, with CAMeL rank)

Every word below appears in the CAMeL list. The number is its rank among all types (lower = more frequent). Use it for the default "Arabic 200" mode.

- **Function words:** في 1 · من 2 · على 3 · عن 6 · إلى 7 · أن 5 · إن 39 · مع 11 · لا 12 · ما 13 · أو 14 · هذا 16 · الذي 19 · هذه 20 · التي 9 · كل 23 · بعد 22 · بين 25 · كان 26 · هو 27 · لم 28 · ذلك 29 · خلال 30 · كما 34 · قبل 37 · حيث 42 · قد 43 · غير 44 · حتى 47 · آخر 49 · أي 50 · كانت 53 · عند 57 · حول 59 · هي 60 · بعض 69 · ثم 72 · إذا 79 · منذ 92 · أكثر 93 · هناك 95 · فقط 99 · مثل 103 · دون 108 · لكن 115 · ولكن 118 · أيضا 121 · تلك 128 · الآن 140 · هنا 173 · جدا 198 · لن 252 · أمس 269 · نحن 272 · لقد 342 · أنت 508 · هم 553 · أنا 562 · غدا 1565 · أنتم 6462
- **Time and numbers:** اليوم 32 · عام 56 · يوم 66 · سنة 157 · وقت 211 · أول 231 · واحد 241 · شهر 273 · مرة 300 · ألف 367 · ثلاثة 469 · ساعة 701 · عشرة 987 · خمسة 1235 · أربعة 1604 · أسبوع 1630 · مئة 5212 · اثنان 8777
- **Adjectives:** جديد 209 · أفضل 242 · كبير 282 · كثير 950 · حديث 993 · ممكن 1005 · جميل 2282 · قليل 2809 · طويل 2868 · صغير 3023 · مهم 3192 · سهل 4074 · صعب 5490 · قديم 5512 · قصير 5920
- **Verbs:** قال 51 · كتب 177 · عمل 184 · يقول 362 · جاء 484 · يعمل 847 · يريد 954 · أصبح 1227 · تعلم 1078 · يعرف 1088 · بدأ 1114 · يأتي 1357 · يستطيع 1591 · يرى 1655 · فهم 1800 · رأى 2334 · يبدأ 2328 · أخذ 2474 · يجد 2861 · ذهب 2965 · وجد 3166 · أراد 3437 · انتهى 3678 · عرف 3697 · يكتب 4154 · استطاع 4671 · شرب 5489 · يذهب 5678 · يقرأ 6468 · أعطى 8325 · يفهم 8337 · يسأل 8609 · أكل 9071 · قرأ 9797 · سافر 11788 · سأل 12492 · رجع 13598 · يتعلم 15113 · نام 23377
- **Nouns:** مدينة 129 · عالم 127 · ابن 152 · الناس 179 · سوق 237 · طريق 238 · دولة 257 · أم 301 · جامعة 303 · شيء 324 · بيت 361 · كتاب 431 · كلمة 498 · باب 542 · اسم 559 · صورة 619 · عين 687 · رسالة 704 · مستشفى 709 · مدرسة 760 · ماء 830 · حياة 842 · رجل 859 · هاتف 931 · سيارة 1028 · رأس 1037 · طالب 1106 · مشكلة 1111 · لغة 1141 · سؤال 1243 · فكرة 1405 · أرض 1571 · يد 1581 · بنت 1587 · قلب 1914 · امرأة 1948 · بلد 2161 · أطفال 2469 · بحر 2597 · طفل 3121 · مسجد 3301 · شمس 3366 · صديق 3606 · جملة 3652 · معلم 5431 · طعام 5449 · جواب 5828 · قمر 6875 · سماء 8344 · أب 8366 · قلم 9473 · خبز 15232 · حاسوب 16130 · أخ 17420 · أخت 21990
- **Languages:** العربية 36 · الإنجليزية 1601 · الهولندية 9557

Plus the per-stage pools in §1.6. The list deliberately contains hamza-rich words (أن، إلى، أكثر، أفضل، سؤال، امرأة، اسم، ابن) so every session exercises wasl vs qat'.

### 7.3 Proverbs and sayings (32, unvoweled targets, with English)

| # | Arabic | English |
|---|---|---|
| 1 | الصبر مفتاح الفرج. | Patience is the key to relief. |
| 2 | العلم نور والجهل ظلام. | Knowledge is light and ignorance is darkness. |
| 3 | الوقت كالسيف، إن لم تقطعه قطعك. | Time is like a sword: if you don't cut it, it cuts you. |
| 4 | من جد وجد، ومن زرع حصد. | Whoever strives succeeds; whoever sows reaps. |
| 5 | الصديق وقت الضيق. | A friend in need is a friend indeed. |
| 6 | في التأني السلامة، وفي العجلة الندامة. | In patience lies safety, in haste regret. |
| 7 | لكل مجتهد نصيب. | Every hard worker gets his share. |
| 8 | خير الكلام ما قل ودل. | The best speech is short and to the point. |
| 9 | درهم وقاية خير من قنطار علاج. | An ounce of prevention is worth a pound of cure. |
| 10 | القناعة كنز لا يفنى. | Contentment is a treasure that never runs out. |
| 11 | يد واحدة لا تصفق. | One hand cannot clap. |
| 12 | إذا كان الكلام من فضة فالسكوت من ذهب. | If speech is silver, silence is gold. |
| 13 | الجار قبل الدار، والرفيق قبل الطريق. | Choose the neighbour before the house, the companion before the road. |
| 14 | العقل السليم في الجسم السليم. | A sound mind in a sound body. |
| 15 | ما كل ما يتمنى المرء يدركه، تجري الرياح بما لا تشتهي السفن. | Not all one wishes for is attained; winds blow against what ships desire. (al-Mutanabbi) |
| 16 | رب أخ لك لم تلده أمك. | Many a brother of yours was not born of your mother. |
| 17 | عصفور في اليد خير من عشرة على الشجرة. | A bird in the hand is better than ten in the tree. |
| 18 | خير جليس في الزمان كتاب. | The best companion at any time is a book. (al-Mutanabbi) |
| 19 | كل إناء بما فيه ينضح. | Every vessel leaks what it holds (actions reveal character). |
| 20 | لا تؤجل عمل اليوم إلى الغد. | Don't put off today's work until tomorrow. |
| 21 | الطيور على أشكالها تقع. | Birds of a feather flock together. |
| 22 | من حفر حفرة لأخيه وقع فيها. | Whoever digs a pit for his brother falls into it. |
| 23 | التكرار يعلم الشطار. | Repetition teaches the clever (practice makes perfect). Good Parrotype tagline |
| 24 | أول الغيث قطرة. | The first of the rain is a single drop (big things start small). |
| 25 | على قدر أهل العزم تأتي العزائم. | Resolve comes in proportion to the resolute. (al-Mutanabbi) |
| 26 | لسانك حصانك، إن صنته صانك، وإن خنته خانك. | Your tongue is your horse: guard it and it guards you; betray it and it betrays you. |
| 27 | ليس كل ما يلمع ذهبا. | Not all that glitters is gold. |
| 28 | البعيد عن العين بعيد عن القلب. | Out of sight, out of mind. |
| 29 | الأفعال أبلغ من الأقوال. | Actions speak louder than words. |
| 30 | اطلب العلم من المهد إلى اللحد. | Seek knowledge from the cradle to the grave. |
| 31 | الحاجة أم الاختراع. | Necessity is the mother of invention. |
| 32 | اتق شر الحليم إذا غضب. | Beware the anger of a patient man. |

### 7.4 Everyday practice sentences (with English)

| Arabic | English |
|---|---|
| أنا أتعلم الكتابة على لوحة المفاتيح كل يوم. | I practise typing on the keyboard every day. |
| ذهبت إلى السوق واشتريت خبزا وماء. | I went to the market and bought bread and water. |
| يسكن صديقي في أمستردام منذ ثلاث سنوات. | My friend has lived in Amsterdam for three years. |
| هل تتكلم الهولندية؟ نعم، قليلا. | Do you speak Dutch? Yes, a little. |
| الطقس في هولندا بارد وممطر في الشتاء. | The weather in the Netherlands is cold and rainy in winter. |
| كتب الطلاب الواجب ثم ذهبوا إلى البيت. | The students did the homework, then went home. |
| إن شاء الله سأزورك غدا مساء. | God willing, I'll visit you tomorrow evening. |
| قرأت مسألة صعبة في الكتاب، لكنني فهمتها. | I read a hard problem in the book, but I understood it. |
| سأل المعلم سؤالا سهلا، فأجاب الطالب بسرعة. | The teacher asked an easy question and the student answered quickly. |
| هذه مدرسة كبيرة، وتلك مكتبة صغيرة. | This is a big school, and that is a small library. |
| رأيت ببغاء ملونا في الحديقة. | I saw a colourful parrot in the garden. |
| مستشفى المدينة قريب من محطة القطار. | The city hospital is near the train station. |
| مساء الخير، كيف حالك اليوم؟ | Good evening, how are you today? |
| اشترت أمي هدية جميلة لأختي الصغيرة. | My mother bought a lovely present for my little sister. |
| شكرا جزيلا على مساعدتك. | Thank you very much for your help. |
| هذا الكتاب لي، وذلك القلم لأخي. | This book is mine, and that pen is my brother's. |
| لم يكتبوا الرسالة، لكنهم اتصلوا بالهاتف. | They didn't write the letter, but they phoned. |
| أرجو أن تكون بخير. | I hope you are well. |
| يبدو أن الجو جميل اليوم. | It seems the weather is nice today. |
| اسمي أحمد، وأنا من سوريا. | My name is Ahmad, and I am from Syria. |
| انتظرت الحافلة عشر دقائق. | I waited ten minutes for the bus. |
| استخدم الطالب الحاسوب لكتابة المقال. | The student used the computer to write the essay. |
| هذا شيء بسيط، لكنه مهم. | This is a simple thing, but it is important. |
| قالوا إنهم سيأتون مساء الغد. | They said they would come tomorrow evening. |
| إلى أين تذهب؟ إلى الجامعة. | Where are you going? To the university. |
| كان الامتحان سهلا، والحمد لله. | The exam was easy, thank God. |
| تفاءل بالخير تجده. | Expect good and you will find it. |
| مدرستي قريبة من بيتي، وسيارتك أمام الباب. | My school is close to my house, and your car is in front of the door. |
| بنى الرجل بيتا جميلا، ونادى أولاده. | The man built a beautiful house and called his children. |

### 7.5 Pattern-specific drills (47 sentences, all pass the engine with zero flags)

**Hamza wasl vs qat'**
- اجتمع أحمد وإخوته في البيت. (Ahmad and his brothers gathered at home.)
- استخدمت الحاسوب، ثم أرسلت الرسالة. (I used the computer, then sent the message.)
- انتظرت أختي أمام المدرسة. (I waited for my sister in front of the school.)
- اسمي أمل، وأنا أحب الأدب. (My name is Amal, and I love literature.)
- امتحان الإنجليزية سهل، والاستعداد مهم. (The English exam is easy, and preparation matters.)
- إن الإنسان يتعلم من أخطائه. (Man learns from his mistakes.)
- أكلت أربع تفاحات أمس. (I ate four apples yesterday.)

**ة vs ه** (including the minimal pair كتابة/كتابه)
- المدرسة الجديدة قريبة من بيته. (The new school is near his house.)
- كتابة الرسالة سهلة، وكتابه جديد. (Writing the letter is easy, and his book is new.)
- زرت مكتبة المدينة مع صديقه. (I visited the city library with his friend.)
- هذه شجرة عالية، وتلك فاكهة لذيذة. (This is a tall tree, and that is a tasty fruit.)
- وجهه جميل، وابتسامته واسعة. (His face is handsome, and his smile is wide.)

**ى vs ي**
- مشى الولد إلى المستشفى. (The boy walked to the hospital.)
- على الطاولة كتابي وقلمي. (On the table are my book and my pen.)
- رأى مصطفى صديقه في المقهى. (Mustafa saw his friend in the café.)
- حتى متى ستبقى هنا؟ (How long will you stay here?)
- اشترى أخي هدية لي. (My brother bought me a present.)

**Waw al-jama'a**
- الطلاب كتبوا الدرس وذهبوا إلى البيت. (The students wrote the lesson and went home.)
- لم يكتبوا الواجب، ولن يتأخروا غدا. (They didn't do the homework, and they won't be late tomorrow.)
- المعلمون يدعون الطلاب إلى القراءة. (The teachers invite the students to read.)
- أرجو أن تنجحوا. (I hope you all succeed.)
- يبدو أنهم تعبوا. (It seems they got tired.)

**ض vs ظ**
- ضرب الضابط الطاولة بيده وانتظر. (The officer hit the table with his hand and waited.)
- الظهر حار، والظل بارد. (Noon is hot, and the shade is cool.)
- نظرت إلى النظام الجديد بعناية. (I looked at the new system carefully.)
- الضوء ضعيف في الظلام. (The light is weak in the dark.)

**ذ, ز, ث, س, ق, ك**
- ذهب زيد إلى سوق الذهب. (Zaid went to the gold market.)
- هذا زميلي الذكي. (This is my clever colleague.)
- ثلاثة أثواب ثمينة. (Three precious garments.)
- كثير من الناس يحبون الثلج. (Many people love snow.)
- الثعلب سريع، والسلحفاة بطيئة. (The fox is fast, and the tortoise is slow.)
- قال الكاتب كلمة قصيرة. (The writer said a short word.)
- قرأ كريم قصة قديمة. (Karim read an old story.)

**Expressions**
- إن شاء الله نلتقي في أمستردام. (God willing, we'll meet in Amsterdam.)
- ما شاء الله، خطك جميل. (Wow, your handwriting is beautiful.)
- الحمد لله على كل حال. (Thank God in every situation.)
- بإذن الله سأنجح. (With God's permission I will succeed.)

**Hidden alif and final hamza**
- هذا كتاب، وذلك قلم، لكن هؤلاء طلاب وأولئك معلمون. (This is a book and that is a pen, but these are students and those are teachers.)
- هذا شيء جميل، والقطار بطيء. (This is a nice thing, and the train is slow.)
- في المساء هدوء، وفي السماء نجوم. (In the evening there is calm, and in the sky there are stars.)
- سؤال المعلم سهل، ورأيت الجواب. (The teacher's question is easy, and I saw the answer.)
- تفاءل بالخير، فالتفاؤل مهم. (Be optimistic; optimism matters.)

**Dutch life**
- أتعلم اللغة الهولندية في المساء. (I study Dutch in the evening.)
- ركبت الدراجة إلى العمل رغم المطر. (I cycled to work despite the rain.)
- قطار أوتريخت يتأخر أحيانا. (The Utrecht train is sometimes late.)
- اشتريت الجبن من السوق يوم السبت. (I bought cheese at the market on Saturday.)
- في هولندا قنوات كثيرة وجسور جميلة. (The Netherlands has many canals and beautiful bridges.)

**Drill formats that fit Parrotype:**
1. **Minimal-pair sprints:** a sentence containing both forms (كتابة/كتابه, ضل/ظل, ذهب/زهب→ذهب).
2. **"Fix the parrot" proofreading:** show a sentence with exactly one planted error from §2.11. The user retypes it correctly.
3. **Dictation:** TTS reads a sentence and the user types it. Run the rule engine and the classifier on the result.
4. **Spaced repetition** of every word the user misspelled (`typing-pedagogy.md` §2.11).

### 7.6 Dictation (hear and type) for Arabic

- Web Speech `speechSynthesis` voices depend on the OS. Windows ships Arabic voices "Hoda" (female) and "Naayf" (male, ar-SA) ([Microsoft](https://support.microsoft.com/en-us/help/22805)). macOS and Android have Arabic voices. Linux Chrome often has none.
- Check `getVoices()` for `lang.startsWith('ar')`. Hide dictation (or use pre-recorded clips) if none are present.
- **Feed the TTS the voweled original** (keep tashkeel in `display`). Unvoweled MSA is ambiguous and TTS will misread words. Strip harakat only for the typing target.

---

## 8. Fonts (Google Fonts) and pairing with a monospace UI

All data below is from each font's `METADATA.pb` in [google/fonts](https://github.com/google/fonts) (fetched Oct 2026).

| Font | Category | Axes / weights | Subsets | Fit for Parrotype |
|---|---|---|---|---|
| **Noto Naskh Arabic** | serif (Naskh) | wght 400–700 (variable) | arabic, latin, latin-ext, math, symbols | **Default typing font.** Classic, very legible letter and dot shapes, good for learners. Monkeytype ships it. Pairs with any mono |
| **IBM Plex Sans Arabic** | sans | 7 static weights 100–700 | arabic, cyrillic-ext, latin, latin-ext | **Pick this if the UI uses IBM Plex Mono** (same superfamily). Modern, calm |
| **Readex Pro** | sans | wght 160–700 + HEXP 0–100 | arabic, latin, latin-ext, vietnamese | Arabic counterpart of **Lexend** (Chahine & Jockin), designed for reading fluency. Pairs with Lexend / Lexend Deca UI ([Material blog](https://material.io/blog/readex-pro-legibility-arabic-type-design)) |
| **Noto Sans Arabic** | sans | wdth 62.5–100, wght 100–900 | arabic, latin… | Neutral sans fallback; huge coverage |
| **Rubik** | sans (rounded) | wght 300–900 | arabic, hebrew, cyrillic, latin… | **Playful, rounded.** Fits the parrot brand; one family for Latin and Arabic UI |
| **Vazirmatn** | sans | wght 100–900 | arabic, latin, latin-ext | Clean, very readable at small sizes, Persian-friendly |
| **Cairo** | display / sans | wght 200–1000, slnt −11–11 | arabic, latin | Geometric, popular for headings and stats |
| **Tajawal**, **Almarai** | sans | 7 / 4 static | arabic, latin | Clean; Almarai is very legible at UI sizes |
| **Amiri** | serif (classical Naskh) | 2 styles | arabic, latin | Beautiful book face for the **proverb card**; too ornate and small for fast typing |
| **Baloo Bhaijaan 2** | display (rounded) | wght 400–800 | arabic, latin | **Playful headings and logo text**; pairs with Baloo 2 |
| **Marhey** | display | wght 300–700 | arabic, latin | Fun, cartoony heading font |
| **Lalezar** | display | 1 | arabic, latin | Bold poster face (a Monkeytype font option) |
| **Playpen Sans Arabic** | handwriting | wght 100–800 | arabic, latin, emoji… | Friendly handwritten tips and mascot speech bubbles |
| El Messiri, Changa, Reem Kufi, Kufam, Alexandria, Mada, Harmattan, Markazi Text, Scheherazade New, Zain | various | variable or static | arabic + latin | Alternatives |

**Monospace Arabic** exists: Kawkab Mono (OFL, paired with Source Code Pro, three weights; [fontlibrary](https://fontlibrary.org/en/font/kawkab-mono)), and Vazir Code. Neither is on Google Fonts. Forcing Arabic into equal-width cells stretches it unnaturally. multilingual-typing-race reached the same conclusion: "monospace Hebrew/Arabic fonts are rare and ugly, and per-character colouring does not need equal widths". **Keep the monospace font for Latin UI chrome** (stats, timer, labels) and use a proportional Arabic face for the Arabic text.

**CSS:**

```css
/* Google Fonts css2 API serves unicode-range subsets: the Arabic file loads only when Arabic glyphs render */
@import url('https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400..700&family=Rubik:wght@400;600&display=swap');
:root { --font-mono: 'JetBrains Mono', ui-monospace, monospace; --font-ar: 'Noto Naskh Arabic', 'Noto Sans Arabic', 'Geeza Pro', 'Segoe UI', sans-serif; }
.words:lang(ar) {
  font-family: var(--font-ar);
  font-size: 1.15em;          /* Naskh looks smaller than Latin at the same size; starting point used by multilingual-typing-race */
  line-height: 1.9;           /* room for dots, hamza and harakat */
  letter-spacing: 0;          /* never space out cursive text */
  font-variant-ligatures: normal; /* undo any no-common-ligatures inherited from the Latin test styles */
  word-spacing: 0.15em;       /* slightly wider word gaps help the eye find word boundaries */
}
```

Tune `size-adjust` / `ascent-override` per font after a visual check. Noto Naskh draws lower and smaller than Latin at the same font-size.

---

## 9. Implementation checklist (basic version now)

- [ ] `src/lang/ar/normalize.ts`: Appendix A (NFC, presentation forms, invisibles, Persian map, harakat, digits, options).
- [ ] `src/lang/ar/joining.ts`: Appendix B (`buildRuns`, joining types, lam-alef rule). Use it in the renderer whenever `lang === 'ar'`.
- [ ] `src/lang/ar/keyboard.ts`: Appendix D (101 map, Mac map, geometry, neighbours, `classifySub`). Learn the layout from keystrokes.
- [ ] `src/lang/ar/rules.ts`: Appendix C (32 rules; add AR_TANWEEN_POSITION as an off-by-default style rule). CI: `clean.txt` (125 sentences) → 0 high/medium flags; `bad.txt` (48 cases) → expected rule ids.
- [ ] Typing area: `dir="rtl" lang="ar"`; words `unicode-bidi: isolate`; runs `display:inline`; overlay caret from `Range` rects; `user-select:none`.
- [ ] Optional: Custom Highlight API renderer behind `'highlights' in CSS`. Test Safari 17.2+ and Firefox 140+ before switching the default.
- [ ] Content: `ar/words-200.json` (§7.2), `ar/proverbs.json` (§7.3), `ar/sentences.json` (§7.4), `ar/drills.json` (§7.5), each with `{ text, display?, en, tags }`.
- [ ] Settings: tashkeel mode (off), lazy hamza (off), fold punctuation (off), fold digits (on), strict MSA hints (off).
- [ ] Test matrix: Chrome, Firefox, **Safari macOS + iOS** (joining!), Windows Arabic 101, macOS Arabic, Linux xkb (لا = U+FEFB), Gboard Arabic on Android (composition).

---

## 10. Uncertainties and open points

- **Safari joining.** STP 251 (26 Aug 2026) lists the fix. Which stable Safari / iOS version will ship it is unknown. Keep runs + ZWJ regardless.
- **Highlight API with Arabic.** Verified only in Chromium 141. Safari's and Firefox's partial-ligature colouring is untested.
- **macOS Arabic layout.** Taken from a 2012 community recreation, not from Apple. Number-row behaviour (Eastern vs Western digits) is unverified. Verify on a Mac, or rely on layout learning.
- **Arabic (102) details.** Only "ذ moves to OEM_5" is confirmed, and only via search excerpts (kbdlayout.info blocked).
- **Error statistics.** The CAMeL shares describe web text with heavy forum boilerplate (e.g. "إتصل بنا" inflates إتصل), not learners. ARETA/QALB category frequencies were only available through search excerpts (aclanthology and arxiv blocked).
- **Tanween placement** (ًا vs اً) is genuinely contested; keep it a style hint.
- **مسئول / مسؤول and مئة / مائة** are both in use. Don't mark either as an error (مسئول is low/style only).
- **LanguageTool Arabic via the public API** couldn't be called from this sandbox. Its Arabic rules are partly prescriptive. Measure noise before enabling by default.
- **Dialect.** We don't know the user's dialect. The ض/ظ, ذ/ز and ث/س rules are deliberately list-based. Adapt the drills to whatever the classifier sees most.

---

## Sources

**Keyboard layouts**
- xkeyboard-config `symbols/ara` (local copy, `/usr/share/X11/xkb/symbols/ara`; upstream https://gitlab.freedesktop.org/xkeyboard-config/xkeyboard-config/-/blob/master/symbols/ara)
- Windows "Arabic (101)" KLC reconstruction: https://github.com/wingedfox/jsvk/blob/master/setup/in/arabic%20101.klc
- macOS Arabic layout recreation: https://github.com/Bishoy/Mac-Ar-Layout-for-Win
- Arabic 101 vs 102 (search excerpts): https://www.kromekeycaps.com/blogs/keycaps/difference-between-arabic-101-and-102 , https://kbdlayout.info/how/ذ
- Arabic typing tutor, home row and lesson order: https://www.noqta.tn/en/arabic-typing-tutor , https://noqta.tn/en/blog/learn-arabic-typing-keyboard
- Apple community threads on Arabic / Arabic PC / Arabic QWERTY input sources: https://discussions.apple.com/thread/1044944 , https://discussions.apple.com/thread/254542360

**Rendering, bidi, joining**
- Monkeytype source (read Oct 2026):
  - https://github.com/monkeytypegame/monkeytype/blob/master/frontend/src/styles/test.scss
  - https://github.com/monkeytypegame/monkeytype/blob/master/frontend/src/ts/test/break-joining.ts
  - https://github.com/monkeytypegame/monkeytype/blob/master/frontend/src/ts/elements/caret.ts
  - https://github.com/monkeytypegame/monkeytype/blob/master/frontend/src/ts/utils/strings.ts
  - https://github.com/monkeytypegame/monkeytype/blob/master/frontend/src/ts/test/lazy-mode.ts
  - https://github.com/monkeytypegame/monkeytype/blob/master/frontend/static/languages/arabic_10k.json
  - https://github.com/monkeytypegame/monkeytype/blob/master/packages/schemas/src/languages.ts
  - https://github.com/monkeytypegame/monkeytype/blob/master/packages/schemas/src/fonts.ts
- multilingual-typing-race, Arabic joining in Safari fix and RTL notes: https://github.com/Nell-Kh/multilingual-typing-race/pull/63 , https://github.com/Nell-Kh/multilingual-typing-race/blob/main/docs/rtl-notes.md
- W3C alreq issue #222 "Inline elements break cursive shaping": https://github.com/w3c/alreq/issues/222
- WebKit bug 6148 (via search): https://bugs.webkit.org/show_bug.cgi?id=6148
- Safari Technology Preview 251 release notes (via search) and date: https://webkit.org/blog/18194/release-notes-for-safari-technology-preview-251/ , https://macrumors.com/2026/08/26/apple-releases-safari-technology-preview-251/
- W3C Arabic gap analysis (via search): https://www.w3.org/TR/alreq-gap/
- CSS Custom Highlight API support: https://web.dev/blog/web-platform-06-2025
- Unicode ArabicShaping.txt (UCD 18.0): https://github.com/unicode-org/unicodetools/blob/main/unicodetools/data/ucd/dev/ArabicShaping.txt
- MDN `SpeechSynthesis.getVoices()`: https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/getVoices ; Windows Arabic voices: https://support.microsoft.com/en-us/help/22805

**Errors, corpora, rules**
- ARETA / Arabic error type annotation: https://github.com/CAMeL-Lab/arabic_error_type_annotation , https://aclanthology.org/2021.conll-1.47/
- Arabic GEC, QALB statistics (via search): https://arxiv.org/abs/2305.14734
- CAMeL Arabic Frequency Lists (CC BY-SA 4.0): https://github.com/CAMeL-Lab/Camel_Arabic_Frequency_Lists
- LanguageTool Arabic module (`grammar.xml`, `replaces.txt`, `homophones.txt`, `darja.txt`): https://github.com/languagetool-org/languagetool/tree/master/languagetool-language-modules/ar/src/main/resources/org/languagetool/rules/ar ; language status: https://dev.languagetool.org/languages
- Aghlat misspelling corpus (AGPL-3.0): https://github.com/linuxscout/aghlat
- Hamzat al-wasl positions (موسوعة اللغة العربية, via search): https://dorar.net/arabia/2592
- Common errors لكن / هذا / إن شاء الله (via search): https://dorar.net/arabia/2707 , https://mawdoo3.com/الأخطاء_الشائعة_في_اللغة_العربية
- إن شاء الله vs إنشاء الله: https://blog.alifbee.com/inshallah-meaning-arabic/
- Egyptian Arabic phonology (via search): https://en.wikipedia.org/wiki/Egyptian_Arabic_phonology , https://www.talkinarabic.com/letter-qaf-in-egyptian-arabic/
- Ayaspell (hunspell-ar) licence: https://github.com/munzirtaha/ayaspell , https://metadata.ftp-master.debian.org/changelogs/main/h/hunspell-ar/stable_copyright
- Buckwalter & Parkinson, *A Frequency Dictionary of Arabic* (Routledge 2011): https://www.ebooks.com/en-py/book/1742682/a-frequency-dictionary-of-arabic/tim-buckwalter/
- hermitdave FrequencyWords: https://github.com/hermitdave/FrequencyWords

**Fonts**
- Google Fonts metadata (`ofl/<family>/METADATA.pb`): https://github.com/google/fonts
- Readex Pro background: https://material.io/blog/readex-pro-legibility-arabic-type-design , https://github.com/ThomasJockin/readexpro
- Kawkab Mono: https://fontlibrary.org/en/font/kawkab-mono
- IBM Plex Sans Arabic (via search): https://superdevpro.com/free-font/ibm-plex-sans-arabic

---

## Appendices: prototype code (TypeScript, tested with Node 22 `--experimental-strip-types`)

The appendices below are the exact files that produced the test results in §4.1 and §6.3.

### Appendix A: `normalize.ts`

```ts
// Arabic normalisation for comparing target vs typed text.
export const TASHKEEL = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED\u08D3-\u08E1\u08E3-\u08FF]/g;
export const TATWEEL = /\u0640/g;
export const INVISIBLES = /[\u200B-\u200F\u202A-\u202E\u2066-\u2069\u061C\uFEFF]/g; // ZW*, LRM/RLM, embeddings, isolates, ALM, BOM
const PERSIAN: Record<string, string> = {
  'ی': 'ي', // ی Farsi yeh -> ي
  'ک': 'ك', // ک keheh -> ك
  'ہ': 'ه', 'ھ': 'ه', 'ە': 'ه', // ہ ھ ە -> ه
  'ۀ': 'ة', // ۀ -> ة (approximation)
  'ٱ': 'ا', // ٱ alef wasla -> ا
};
const DIGITS: Record<string, string> = {};
for (let i = 0; i < 10; i++) {
  DIGITS[String.fromCharCode(0x0660 + i)] = String(i); // \u0660-\u0669
  DIGITS[String.fromCharCode(0x06F0 + i)] = String(i); // \u06F0-\u06F9
}
export interface NormOpts { stripTashkeel?: boolean; foldDigits?: boolean; foldPunct?: boolean; lazyHamza?: boolean }

/** Encoding-level normalisation: never hides a real typing mistake. */
export function normalizeEncoding(s: string): string {
  s = s.normalize('NFC');                       // ا+\u0654 -> أ  (NEVER use NFD + strip marks: it turns أ into ا)
  s = s.replace(/[ﭐ-﷿ﹰ-\uFEFF]/g, c => c.normalize('NFKC')); // ﻻ -> لا (Linux xkb types U+FEFB)
  s = s.replace(INVISIBLES, '');
  s = s.replace(/[یکہھەۀٱ]/g, c => PERSIAN[c]);
  return s;
}
export function normalizeForCompare(s: string, o: NormOpts = {}): string {
  const { stripTashkeel = true, foldDigits = true, foldPunct = false, lazyHamza = false } = o;
  s = normalizeEncoding(s);
  if (stripTashkeel) s = s.replace(TASHKEEL, '');
  if (foldDigits) s = s.replace(/[\u0660-\u0669\u06F0-\u06F9]/g, c => DIGITS[c]);
  if (foldPunct) s = s.replace(/،/g, ',').replace(/؛/g, ';').replace(/؟/g, '?');
  if (lazyHamza) s = s.replace(/[أإآ]/g, 'ا'); // Monkeytype "lazy mode" equivalent; OFF by default for Parrotype
  return s;
}
/** Target text preparation: strip tatweel + (optionally) tashkeel once, at import. */
export function prepareTarget(s: string, o: NormOpts = {}): string {
  return normalizeForCompare(s, o).replace(TATWEEL, '').replace(/\s+/g, ' ').trim();
}
```

### Appendix B: `joining.ts` (runs + ZWJ renderer helper)

```ts
// Unicode Joining_Type (ArabicShaping.txt) subset for Arabic + Persian letters we render.
const DUAL = new Set([...'ئبتثجحخسشصضطظعغفقكلمنهيىپچڤگکی']);
const RIGHT = new Set([...'آأؤإاةدذرزوژٱ']);
const JOIN_CAUSING = new Set(['\u0640', '\u200D']); // tatweel, ZWJ
const isTransparent = (c: string) => /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/.test(c);
const joinsForward = (c: string) => DUAL.has(c) || JOIN_CAUSING.has(c);
const joinsBackward = (c: string) => DUAL.has(c) || RIGHT.has(c) || JOIN_CAUSING.has(c);
const ALEFS = new Set([...'اأإآ']);
const ZWJ = '\u200D';
export type State = 'correct' | 'incorrect' | 'current' | 'untyped' | 'extra';
export interface Run { text: string; state: State }
/**
 * Group grapheme clusters with the same state into runs. Where a run boundary falls between two
 * letters that connect, add ZWJ on both sides (needed for WebKit/Safari, harmless in Blink/Gecko).
 * EXCEPTION: never split lam+alef with ZWJ — it destroys the mandatory لا ligature (verified in
 * Chromium 141: ZWJ renders a connected ل\u0640ا instead of لا). Instead the lam joins the alef's run.
 */
const PRIORITY: Record<State, number> = { incorrect: 4, extra: 3, current: 2, untyped: 1, correct: 0 };
export function buildRuns(clusters: string[], states: State[], opts: { splitLamAlef?: boolean } = {}): Run[] {
  const st = states.slice();
  const lamAlefAt = new Set<number>(); // index i where clusters[i]=ل and clusters[i+1]=alef
  for (let i = 0; i + 1 < clusters.length; i++) {
    const a = [...clusters[i]][0], b = [...clusters[i + 1]][0];
    if (a === 'ل' && ALEFS.has(b)) {
      lamAlefAt.add(i);
      if (!opts.splitLamAlef && st[i] !== st[i + 1]) {
        // colour the لا ligature as one unit, using the more important state (an error is never hidden)
        const s = PRIORITY[st[i]] >= PRIORITY[st[i + 1]] ? st[i] : st[i + 1];
        st[i] = st[i + 1] = s;
      }
    }
  }
  const runs: Run[] = [];
  for (let i = 0; i < clusters.length; i++) {
    const last = runs[runs.length - 1];
    if (last && last.state === st[i]) { last.text += clusters[i]; continue; }
    if (last) {
      const prevBase = [...clusters[i - 1]].filter(c => !isTransparent(c))[0] ?? '';
      const nextBase = [...clusters[i]][0];
      if (!lamAlefAt.has(i - 1) && joinsForward(prevBase) && joinsBackward(nextBase)) {
        last.text += ZWJ;
        runs.push({ text: ZWJ + clusters[i], state: st[i] });
        continue;
      }
    }
    runs.push({ text: clusters[i], state: st[i] });
  }
  return runs;
}
export const graphemes = (s: string) => [...new Intl.Segmenter('ar', { granularity: 'grapheme' }).segment(s)].map(x => x.segment);
```

Usage in the renderer (per word):

```ts
const g = graphemes(targetWord);                       // from prepareTarget()
const states = g.map((_, i) => i < typed.length ? (typed[i] === g[i] ? 'correct' : 'incorrect') : i === typed.length ? 'current' : 'untyped');
wordEl.replaceChildren(...buildRuns(g, states).map(r => Object.assign(document.createElement('span'), { className: r.state, textContent: r.text })));
```

### Appendix C: `rules.ts` (32 rules)

```ts
// Prototype Arabic rule engine (rules only, no ML). Input: free text. Output: issues with offsets.
export type Conf = 'high' | 'medium' | 'low';
export interface Issue { ruleId: string; start: number; end: number; found: string; suggestions: string[]; conf: Conf; msg: { ar: string; en: string } }
interface Tok { text: string; start: number; end: number }
const L = '\\u0621-\\u063A\\u0641-\\u064A'; // Arabic letters (no tatweel)
const M = '\\u064B-\\u065F\\u0670';           // harakat
const WORD = new RegExp(`[${L}${M}\\u0640]+`, 'gu');
const strip = (s: string) => s.replace(new RegExp(`[${M}\\u0640]`, 'gu'), '');
export function tokenize(text: string): Tok[] {
  return [...text.matchAll(WORD)].map(m => ({ text: m[0], start: m.index!, end: m.index! + m[0].length }));
}
// Split proclitics و ف ب ل ك and the article ال so word lists stay small. Returns [prefix, core].
const PROCLITIC = /^(و|ف)?(ب|ل|ك)?(ال)?/u;
const CONJ = /^(و|ف)/u;
type Clitics = 'none' | 'conj' | 'all';
function splitClitics(w: string, mode: Clitics = 'all'): [string, string] {
  if (mode === 'none') return ['', w];
  const m = w.match(mode === 'conj' ? CONJ : PROCLITIC); const p = m ? m[0] : '';
  return p.length && w.length - p.length >= 2 ? [p, w.slice(p.length)] : ['', w];
}
interface Rule { id: string; conf: Conf; msg: { ar: string; en: string }; check(text: string, toks: Tok[]): Omit<Issue, 'ruleId' | 'conf' | 'msg'>[] }
// helper: whole-token dictionary rule (with optional proclitics)
function lexRule(id: string, conf: Conf, map: Record<string, string>, msg: { ar: string; en: string }, clitics: Clitics | boolean = 'all'): Rule {
  const mode: Clitics = clitics === true ? 'all' : clitics === false ? 'none' : clitics;
  return { id, conf, msg, check: (_t, toks) => toks.flatMap(t => {
    const w = strip(t.text);
    if (map[w]) return [{ start: t.start, end: t.end, found: t.text, suggestions: map[w].split('|') }];
    if (mode === 'none') return [];
    const [p, core] = splitClitics(w, mode);
    const hit = map[core];
    return hit ? [{ start: t.start, end: t.end, found: t.text, suggestions: hit.split('|').map(s => p + s) }] : [];
  }) };
}
// helper: regex rule on raw text
function reRule(id: string, conf: Conf, re: RegExp, fix: (m: RegExpMatchArray) => string[], msg: { ar: string; en: string }): Rule {
  return { id, conf, msg, check: text => [...text.matchAll(re)].map(m => ({ start: m.index!, end: m.index! + m[0].length, found: m[0], suggestions: fix(m) })) };
}
const NB = `(?<![${L}${M}])`, NA = `(?![${L}${M}])`; // JS \b does NOT work for Arabic

export const RULES: Rule[] = [
  reRule('AR_INSHALLAH', 'high', new RegExp(`${NB}(?:[إا]نشاء\\s*الله|[إا]نشالله|[إا]ن\\s?شالله)${NA}`, 'gu'), () => ['إن شاء الله'],
    { ar: '«إنشاء» تعني الخلق والبناء؛ والصواب «إن شاء الله» ثلاث كلمات منفصلة.', en: '"إنشاء" means "creating"; write "إن شاء الله" (if God wills) as three words.' }),
  reRule('AR_MASHALLAH', 'high', new RegExp(`${NB}ماشاء\\s?الله${NA}`, 'gu'), () => ['ما شاء الله'],
    { ar: '«ما شاء الله» كلمات منفصلة.', en: 'Write "ما شاء الله" as three separate words.' }),
  lexRule('AR_HIDDEN_ALIF', 'high', {
    'هاذا': 'هذا', 'هاذه': 'هذه', 'هاذان': 'هذان', 'هاذين': 'هذين', 'هاكذا': 'هكذا', 'هاؤلاء': 'هؤلاء', 'ذالك': 'ذلك', 'ذالكم': 'ذلكم',
    'لاكن': 'لكن', 'لاكنه': 'لكنه', 'لاكنها': 'لكنها', 'لاكني': 'لكني', 'لاكنك': 'لكنك', 'لاكنهم': 'لكنهم', 'لاكي': 'لكي',
    'اولائك': 'أولئك', 'أولائك': 'أولئك', 'اللاه': 'الله', 'طاها': 'طه' },
    { ar: 'ألف ت\u064Fنطق ولا ت\u064Fكتب في: هذا، هذه، ذلك، لكن، هؤلاء، أولئك، الله، طه.', en: 'This alif is pronounced but never written (هذا، ذلك، لكن، هؤلاء، أولئك).' }),
  lexRule('AR_WASL_NOUNS', 'high', {
    'إسم': 'اسم', 'إسمي': 'اسمي', 'إسمه': 'اسمه', 'إسمها': 'اسمها', 'إسمك': 'اسمك', 'إبن': 'ابن', 'إبنة': 'ابنة', 'إبني': 'ابني', 'إبنه': 'ابنه',
    'إثنان': 'اثنان', 'إثنين': 'اثنين', 'أثنين': 'اثنين', 'إثنتان': 'اثنتان', 'إثنتين': 'اثنتين', 'إمرأة': 'امرأة', 'أمرأة': 'امرأة', 'إمرؤ': 'امرؤ' },
    { ar: 'همزة وصل: ابن، ابنة، اسم، اثنان، اثنتان، امرؤ، امرأة ت\u064Fكتب ألف\u064Bا بلا همزة.', en: 'Hamzat al-wasl: ابن، اسم، اثنان، امرأة are written with a bare alif (ا), no hamza.' }),
  { id: 'AR_WASL_PATTERN', conf: 'medium',
    msg: { ar: 'ماضي الخماسي والسداسي وأمرهما ومصدرهما تبدأ بهمزة وصل (ا) لا همزة قطع: اجتماع، استخدام، انتظار.', en: 'Past tense, imperative and verbal noun of 5- and 6-letter verbs (Forms VII, VIII, X) start with hamzat al-wasl: write ا not إ/أ (اجتماع، استخدام، انتظار).' },
    check: (_t, toks) => toks.flatMap(t => {
      const w = strip(t.text); const [p, core] = splitClitics(w);
      const C = '[^ا\\s]', K = '[^اوي\\s]'; // K: consonant slot without long vowels (past tense)
      const masdar = new RegExp(`^[إأ](ست${C}${C}ا${C}|${C}ت${C}ا${C}|ن${C}${C}ا${C})(ة|ات|ي|ية|يات|ه|ها|هم|ك|كم|نا)?$`, 'u');
      const past = new RegExp(`^إ(ست${K}${K}${K}|${K}ت${K}${K}|ن${K}${K}${K})(وا|ت|نا|تم)?$`, 'u');
      // loanwords / plurals / names that fit the shape but really start with hamzat al-qat'
      const EXC = /^(إنترنت|أنبياء|أنبيائه|أنبيائهم|أسترالي|أسترالية|أستراليا|أنطوان|إنجيل|إنزيم|إرتري|إرترية|ألتراس|إنرجي|إسطنبول)$/u;
      if (!EXC.test(core) && (masdar.test(core) || past.test(core))) return [{ start: t.start, end: t.end, found: t.text, suggestions: [p + 'ا' + core.slice(1)] }];
      return [];
    }) },
  lexRule('AR_HAMZA_OMITTED', 'medium', {
    'الى': 'إلى', 'اذا': 'إذا', 'او': 'أو', 'انا': 'أنا', 'انت': 'أنت', 'انتم': 'أنتم', 'اين': 'أين', 'اي': 'أي', 'ايضا': 'أيضا', 'اكثر': 'أكثر', 'اول': 'أول',
    'اخرى': 'أخرى', 'اهل': 'أهل', 'امس': 'أمس', 'الان': 'الآن', 'اسبوع': 'أسبوع', 'ارض': 'أرض', 'اطفال': 'أطفال', 'ابدا': 'أبدا', 'اسرة': 'أسرة',
    'افضل': 'أفضل', 'اخبار': 'أخبار', 'لان': 'لأن', 'لانه': 'لأنه', 'لانها': 'لأنها', 'ان': 'أن|إن', 'انه': 'أنه|إنه', 'انها': 'أنها|إنها', 'امام': 'أمام|إمام', 'اسلام': 'إسلام', 'انسان': 'إنسان' },
    { ar: 'همزة القطع ت\u064Fكتب: أ فوق الألف إذا كانت مفتوحة أو مضمومة، وإ تحتها إذا كانت مكسورة.', en: 'Hamzat al-qat\' must be written: أ (a/u sound) or إ (i sound). Bare ا only for hamzat al-wasl.' }, 'conj'),
  reRule('AR_TAA_MARBUTA_INSIDE', 'high', new RegExp(`ة(?=([${L}]+))`, 'gu'), m => /^(ي|ك|ه|ها|نا|هم|كم|هن|كما|هما|ان|ين)$/u.test(m[1]) ? ['ت'] : ['ة ', 'ت'],
    { ar: 'التاء المربوطة (ة) لا تأتي إلا في آخر الكلمة؛ إذا اتصل بها ضمير صارت تاء\u064B مفتوحة: سيارتك.', en: 'ة only appears word-final; before a suffix it becomes ت (سيارة → سيارتك). Or did you forget a space?' }),
  reRule('AR_ALIF_MAQSURA_INSIDE', 'high', new RegExp(`ى(?=([${L}]+))`, 'gu'), m => m[1].startsWith('ء') ? ['ئ'] : /^(ه|ها|هم|هما|هن|ك|كم|كما|نا|ي|ات|ان|ين)$/u.test(m[1]) ? ['ي'] : ['ى ', 'ي'],
    { ar: 'الألف المقصورة (ى) لا تأتي إلا في آخر الكلمة؛ عند الاتصال بضمير ت\u064Fكتب ياء\u064B: عليه، إليك.', en: 'ى only appears word-final; before a suffix write ي (على → عليه، إلى → إليك). Or a missing space?' }),
  lexRule('AR_YA_FOR_MAQSURA', 'medium', {
    'الي': 'إلى', 'إلي': 'إلى', 'حتي': 'حتى', 'متي': 'متى', 'مستشفي': 'مستشفى', 'مستوي': 'مستوى', 'أخري': 'أخرى', 'اخري': 'أخرى', 'أولي': 'أولى',
    'مدي': 'مدى', 'محتوي': 'محتوى', 'إحدي': 'إحدى', 'أعلي': 'أعلى', 'أدني': 'أدنى', 'بمعني': 'بمعنى', 'لدي': 'لدى|لدي\u0651', 'موسي': 'موسى', 'عيسي': 'عيسى', 'مصطفي': 'مصطفى' },
    { ar: 'الألف في آخر هذه الكلمات ألف مقصورة (ى) بلا نقاط، لا ياء (ي).', en: 'These words end in alif maqsura ى (no dots), not ي.' }),
  reRule('AR_ALI_ALA', 'medium', new RegExp(`${NB}(و?)علي\\s+(?=ال)`, 'gu'), m => [m[1] + 'على '],
    { ar: '«على» حرف جر بألف مقصورة؛ «علي» اسم علم. قبل اسم معر\u0651ف بأل غالب\u064Bا المقصود «على».', en: '"على" (on) ends in ى; "علي" is the name Ali. Before an al- noun you almost certainly mean على.' }),
  lexRule('AR_MAQSURA_FOR_YA', 'medium', {
    'فى': 'في', 'التى': 'التي', 'الذى': 'الذي', 'اللذى': 'الذي', 'هى': 'هي', 'لى': 'لي', 'بى': 'بي', 'أى': 'أي', 'اى': 'أي', 'لكى': 'لكي', 'الثانى': 'الثاني', 'يعنى': 'يعني', 'العربى': 'العربي', 'الماضى': 'الماضي' },
    { ar: 'هذه الكلمات تنتهي بياء منقوطة (ي). كتابتها (ى) عادة إقليمية (مصرية) وليست الرسم المعياري.', en: 'These words end in ي (with dots). Writing ى here is a regional (Egyptian) habit, not standard spelling.' }),
  lexRule('AR_HA_FOR_TAA_MARBUTA', 'medium', {
    'مدرسه': 'مدرسة', 'المدرسه': 'المدرسة', 'اللغه': 'اللغة', 'لغه': 'لغة', 'السنه': 'السنة', 'سنه': 'سنة', 'الجامعه': 'الجامعة', 'جامعه': 'جامعة', 'العربيه': 'العربية',
    'الحياه': 'الحياة', 'حياه': 'حياة', 'كلمه': 'كلمة', 'الكلمه': 'الكلمة', 'المدينه': 'المدينة', 'مدينه': 'مدينة', 'ساعه': 'ساعة', 'الساعه': 'الساعة', 'رساله': 'رسالة',
    'جديده': 'جديدة', 'كبيره': 'كبيرة', 'صغيره': 'صغيرة', 'جميله': 'جميلة', 'واحده': 'واحدة', 'مره': 'مرة', 'شركه': 'شركة', 'سياره': 'سيارة', 'السياره': 'السيارة', 'المرأه': 'المرأة', 'ثلاثه': 'ثلاثة' },
    { ar: 'هذه الكلمة تنتهي بتاء مربوطة (ة) ت\u064Fنطق تاء\u064B عند الوصل؛ أما الهاء (ه) فتبقى هاء\u064B دائم\u064Bا.', en: 'This word ends in taa marbuta ة (pronounced t when you keep reading); ه is always h.' }, false),
  lexRule('AR_WAW_JAMAA_ALIF', 'medium', {
    'كانو': 'كانوا', 'قالو': 'قالوا', 'ذهبو': 'ذهبوا', 'كتبو': 'كتبوا', 'رجعو': 'رجعوا', 'خرجو': 'خرجوا', 'دخلو': 'دخلوا', 'عملو': 'عملوا', 'فعلو': 'فعلوا', 'جاءو': 'جاؤوا|جاءوا', 'أكلو': 'أكلوا', 'شربو': 'شربوا', 'لعبو': 'لعبوا', 'سافرو': 'سافروا', 'وصلو': 'وصلوا' },
    { ar: 'واو الجماعة في الفعل ت\u064Fتبع بألف فارقة: كتبوا، ذهبوا، لم يكتبوا.', en: 'Plural "waw al-jama\'a" on a verb takes a silent alif: كتبوا، ذهبوا (they wrote/went).' }),
  { id: 'AR_WAW_JAMAA_JUSSIVE', conf: 'medium',
    msg: { ar: 'بعد لم/لن/أن/كي ي\u064Fحذف نون الفعل وت\u064Fكتب ألف فارقة: لم يكتبوا، لن يذهبوا.', en: 'After لم/لن/أن/كي the plural verb ends in \u0640وا (silent alif): لم يكتبوا.' },
    check: text => [...text.matchAll(new RegExp(`${NB}(لم|لن|أن|ان|كي|لكي|حتى)\\s+([يت][${L}]{2,})و${NA}`, 'gu'))]
      .filter(m => !/^(يدعو|يرجو|يبدو|يشكو|يسمو|يعلو|ينمو|يغزو|يلهو|يتلو|يمحو|يصحو|يدنو|ينجو|تدعو|ترجو|تبدو|تشكو|تنمو|تتلو)$/.test(m[2] + 'و'))
      .map(m => { const s = m.index! + m[0].length - (m[2].length + 1); return { start: s, end: m.index! + m[0].length, found: m[2] + 'و', suggestions: [m[2] + 'وا'] }; }) },
  lexRule('AR_EXTRA_ALIF_DEFECTIVE', 'high', { 'أرجوا': 'أرجو', 'ارجوا': 'أرجو', 'نرجوا': 'نرجو', 'أدعوا': 'أدعو', 'ندعوا': 'ندعو', 'أشكوا': 'أشكو', 'نشكوا': 'نشكو' },
    { ar: 'الواو هنا من أصل الفعل (رجا يرجو) وليست واو جماعة، فلا ت\u064Fزاد بعدها ألف: أرجو.', en: 'This و belongs to the verb root (رجا → أرجو "I hope"); it is not the plural waw, so no alif.' }, false),
  lexRule('AR_EXTRA_ALIF_DEFECTIVE_3SG', 'medium', { 'يبدوا': 'يبدو', 'تبدوا': 'تبدو', 'يدعوا': 'يدعو|يدعوا (للجمع)', 'يرجوا': 'يرجو|يرجوا (للجمع)' },
    { ar: 'إذا كان الفاعل مفرد\u064Bا فالواو أصلية ولا ألف بعدها: يبدو، يدعو.', en: 'With a singular subject the و is part of the root: يبدو، يدعو (no alif).' }, false),
  { id: 'AR_FINAL_HAMZA_LINE', conf: 'medium',
    msg: { ar: 'الهمزة المتطرفة بعد حرف مد\u0651 أو ساكن ت\u064Fكتب على السطر: شيء، بطيء، هدوء، سماء.', en: 'A final hamza after a long vowel or sukun sits on the line (ء): شيء، بطيء، هدوء، سماء.' },
    check: (_t, toks) => toks.flatMap(t => { const w = strip(t.text); const [, core] = splitClitics(w);
      // ي/و with shadda or kasra are consonants -> ئ is right: سي\u0651ئ، يهي\u0651ئ، مساو\u0650ئ
      if (/^(سيئ|يهيئ|تهيئ|نهيئ|أهيئ|مساوئ)$/u.test(core)) return [];
      const m = w.match(/(ي|و|ا)ئ$/u); if (!m || w.length < 3) return [];
      return [{ start: t.start, end: t.end, found: t.text, suggestions: [w.slice(0, -1) + 'ء'] }]; }) },
  lexRule('AR_HAMZA_WORDS', 'medium', { 'شئ': 'شيء', 'الشئ': 'الشيء', 'برئ': 'بريء', 'ملئ': 'مليء', 'بطئ': 'بطء|بطيء', 'تفائل': 'تفاؤل', 'التفائل': 'التفاؤل', 'تشائم': 'تشاؤم', 'التشائم': 'التشاؤم', 'تسائل': 'تساءل|تساؤل', 'مسأله': 'مسألة', 'رئيت': 'رأيت', 'سوأل': 'سؤال', 'يقرا': 'يقرأ', 'هاؤلاء': 'هؤلاء' },
    { ar: 'موضع الهمزة يحدده أقوى الحركتين (الكسرة ثم الضمة ثم الفتحة ثم السكون).', en: 'The seat of a medial hamza follows the stronger vowel (i > u > a > sukun): تفاؤل، سؤال، رأيت.' }),
  lexRule('AR_MASUUL_STYLE', 'low', { 'مسئول': 'مسؤول', 'مسئولية': 'مسؤولية', 'مسئولة': 'مسؤولة', 'المسئول': 'المسؤول', 'المسئولية': 'المسؤولية' },
    { ar: '«مسئول» رسم قديم ما زال مستعمل\u064Bا في مصر؛ والرسم الشائع اليوم «مسؤول».', en: '"مسئول" is an older (Egyptian) spelling; "مسؤول" is the common modern form. Style hint only.' }),
  reRule('AR_TANWEEN_MISSING_ALIF', 'high', new RegExp(`([بتثجحخدذرزسشصضطظعغفقكلمنهوي])\\u064B(?![ا${L}])`, 'gu'), m => [m[1] + '\u064Bا'],
    { ar: 'تنوين النصب ي\u064Fكتب بعده ألف (كتاب\u064Bا) إلا بعد التاء المربوطة والهمزة بعد ألف والألف المقصورة.', en: 'Accusative tanween needs an alif after it (كتاب\u064Bا), except after ة، اء and ى.' }),
  reRule('AR_TANWEEN_EXTRA_ALIF', 'high', /(ة|اء)(?:\u064Bا|ا\u064B)/gu, m => [m[1] + '\u064B'],
    { ar: 'لا ت\u064Fكتب ألف تنوين بعد التاء المربوطة ولا بعد الهمزة المسبوقة بألف: مدرسة\u064B، مساء\u064B.', en: 'No tanween alif after ة or after اء: مدرسة\u064B، مساء\u064B.' }),
  reRule('AR_WAW_DETACHED', 'high', new RegExp(`${NB}و\\s+(?=[${L}])`, 'gu'), () => ['و'],
    { ar: 'واو العطف تتصل بالكلمة التي بعدها: والكتاب، وذهب.', en: 'The conjunction و is attached to the next word: والكتاب.' }),
  reRule('AR_PREP_DETACHED', 'medium', new RegExp(`${NB}(ب|ل|ك|ف)\\s+(?=ال)`, 'gu'), m => [m[1]],
    { ar: 'حروف الجر ب، ل، ك والفاء تتصل بما بعدها: بالقلم، للبيت.', en: 'ب، ل، ك and ف attach to the next word: بالقلم.' }),
  reRule('AR_LATIN_PUNCT', 'medium', new RegExp(`(?<=[${L}${M}]\\s?)([,;?])`, 'gu'), m => [({ ',': '،', ';': '؛', '?': '؟' } as Record<string, string>)[m[1]]],
    { ar: 'استعمل علامات الترقيم العربية: ، ؛ ؟', en: 'Use Arabic punctuation in Arabic text: ، ؛ ؟' }),
  reRule('AR_SPACE_BEFORE_PUNCT', 'low', /\s+(?=[،؛؟!.:])/gu, () => [''],
    { ar: 'لا مسافة قبل علامة الترقيم، ومسافة واحدة بعدها.', en: 'No space before punctuation, one space after.' }),
  reRule('AR_PERSIAN_LETTERS', 'high', /[یکہە\u06F0-\u06F9]/gu, m => [({ 'ی': 'ي', 'ک': 'ك', 'ہ': 'ه', 'ە': 'ه' } as Record<string, string>)[m[0]] ?? String.fromCharCode(m[0].charCodeAt(0) - 0x06F0 + 0x0660)],
    { ar: 'هذا حرف فارسي/أردي؛ تأكد من اختيار لوحة المفاتيح العربية.', en: 'This is a Persian/Urdu character. Check that the Arabic keyboard layout is active.' }),
  reRule('AR_NON_MSA_LETTERS', 'low', /[پچژگڤڨ]/gu, m => [({ 'پ': 'ب', 'چ': 'ج|ش', 'ژ': 'ج|ز', 'گ': 'ج|ك|ق', 'ڤ': 'ف', 'ڨ': 'ق' } as Record<string, string>)[m[0]]],
    { ar: 'هذا الحرف ليس من حروف العربية الفصحى (ي\u064Fستعمل للأسماء الأجنبية أو اللهجات).', en: 'Not a standard Arabic letter (used for foreign names or dialects).' }),
  reRule('AR_TATWEEL', 'low', /\u0640+/gu, () => [''],
    { ar: 'التطويل (\u0640) زخرفي؛ لا تكتبه في النص العادي.', en: 'Tatweel (\u0640) is decorative; do not type it in normal text.' }),
  reRule('AR_ELONGATION', 'medium', new RegExp(`([${L}])\\1{2,}`, 'gu'), m => [m[1]],
    { ar: 'لا يتكرر حرف ثلاث مرات في كلمة عربية.', en: 'No Arabic word repeats a letter three times in a row.' }),
  lexRule('AR_DAD_DHA', 'medium', { 'ضهر': 'ظهر', 'الضهر': 'الظهر', 'النضام': 'النظام', 'نضام': 'نظام', 'عضيم': 'عظيم', 'عضيمة': 'عظيمة', 'ضلم': 'ظلم', 'الضلم': 'الظلم', 'ظابط': 'ضابط', 'الظابط': 'الضابط', 'مظبوط': 'مضبوط', 'ظرب': 'ضرب', 'ضروف': 'ظروف', 'الضروف': 'الظروف', 'انتضار': 'انتظار', 'ملاحضة': 'ملاحظة', 'محافضة': 'محافظة', 'انضر': 'انظر', 'حضيرة': 'حظيرة' },
    { ar: 'خلط بين الضاد (ض) والظاء (ظ) بسبب تشابه النطق في اللهجات.', en: 'ض/ظ mix-up: many dialects pronounce them alike; the spelling still differs.' }),
  lexRule('AR_INTERDENTAL', 'medium', { 'كتير': 'كثير', 'تلاتة': 'ثلاثة', 'تلاته': 'ثلاثة', 'اسنين': 'اثنين', 'زهب': 'ذهب', 'الزهب': 'الذهب', 'ازا': 'إذا', 'إزا': 'إذا', 'لزلك': 'لذلك', 'زلك': 'ذلك', 'هازا': 'هذا', 'اللزي': 'الذي', 'كزب': 'كذب', 'مزبوط': 'مضبوط' },
    { ar: 'في اللهجات ت\u064Fنطق ث تاء\u064B أو سين\u064Bا، وذ دال\u064Bا أو زاي\u064Bا؛ لكن الفصحى تكتب ث وذ.', en: 'Dialects say ث as t/s and ذ as d/z, but MSA spelling keeps ث and ذ.' }),
  lexRule('AR_DIALECT_WORD', 'low', { 'عشان': 'لأن|من أجل', 'علشان': 'لأن|من أجل', 'مش': 'ليس|غير', 'شو': 'ماذا|ما', 'ايش': 'ماذا', 'إيش': 'ماذا', 'هيك': 'هكذا', 'كده': 'هكذا', 'دلوقتي': 'الآن', 'ليش': 'لماذا', 'ازاي': 'كيف', 'فين': 'أين', 'برضو': 'أيضا' },
    { ar: 'كلمة عامية؛ في الفصحى استعمل البديل المقترح.', en: 'Dialect word; in MSA use the suggestion.' }, false),
];
export function check(text: string): Issue[] {
  const t = text.normalize('NFC'); const toks = tokenize(t);
  const out: Issue[] = [];
  for (const r of RULES) for (const h of r.check(t, toks)) out.push({ ...h, ruleId: r.id, conf: r.conf, msg: r.msg });
  return out.sort((a, b) => a.start - b.start);
}
```

### Appendix D: `keyboard.ts` (layouts, neighbours, substitution classifier)

```ts
// Arabic (101) as shipped by Windows (KBDA1, KLID 00000401); identical letter positions in xkb "ara(basic)".
// [unshifted, shifted]. Ligature keys emit TWO code points on Windows (ل + alef); xkb emits U+FEFB etc.
export const AR101: Record<string, [string, string]> = {
  Backquote: ['ذ', '\u0651'], Digit1: ['1', '!'], Digit2: ['2', '@'], Digit3: ['3', '#'], Digit4: ['4', '$'], Digit5: ['5', '%'],
  Digit6: ['6', '^'], Digit7: ['7', '&'], Digit8: ['8', '*'], Digit9: ['9', ')'], Digit0: ['0', '('], Minus: ['-', '_'], Equal: ['=', '+'],
  KeyQ: ['ض', '\u064E'], KeyW: ['ص', '\u064B'], KeyE: ['ث', '\u064F'], KeyR: ['ق', '\u064C'], KeyT: ['ف', 'لإ'], KeyY: ['غ', 'إ'],
  KeyU: ['ع', '\u2018'], KeyI: ['ه', '÷'], KeyO: ['خ', '×'], KeyP: ['ح', '؛'], BracketLeft: ['ج', '<'], BracketRight: ['د', '>'], Backslash: ['\\', '|'],
  KeyA: ['ش', '\u0650'], KeyS: ['س', '\u064D'], KeyD: ['ي', ']'], KeyF: ['ب', '['], KeyG: ['ل', 'لأ'], KeyH: ['ا', 'أ'], KeyJ: ['ت', '\u0640'],
  KeyK: ['ن', '،'], KeyL: ['م', '/'], Semicolon: ['ك', ':'], Quote: ['ط', '"'],
  KeyZ: ['ئ', '~'], KeyX: ['ء', '\u0652'], KeyC: ['ؤ', '}'], KeyV: ['ر', '{'], KeyB: ['لا', 'لآ'], KeyN: ['ى', 'آ'], KeyM: ['ة', '\u2019'],
  Comma: ['و', ','], Period: ['ز', '.'], Slash: ['ظ', '؟'], Space: [' ', ' '],
};
// macOS "Arabic" (NOT the same as Windows!). Source: community .klc recreation (Bishoy, 2012) — verify on a Mac.
export const MAC_ARABIC: Record<string, [string, string]> = {
  KeyQ: ['ض', '\u064E'], KeyW: ['ص', '\u064B'], KeyE: ['ث', '\u0650'], KeyR: ['ق', '\u064D'], KeyT: ['ف', '\u064F'], KeyY: ['غ', '\u064C'],
  KeyU: ['ع', '\u0652'], KeyI: ['ه', '\u0651'], KeyO: ['خ', '['], KeyP: ['ح', ']'], BracketLeft: ['ج', '{'], BracketRight: ['ة', '}'],
  KeyA: ['ش', '«'], KeyS: ['س', '»'], KeyD: ['ي', 'ى'], KeyF: ['ب', ''], KeyG: ['ل', ''], KeyH: ['ا', 'آ'], KeyJ: ['ت', ''], KeyK: ['ن', ''],
  KeyL: ['م', ''], Semicolon: ['ك', ':'], Quote: ['؛', '"'], Backquote: ['§', '±'],
  KeyZ: ['ظ', ''], KeyX: ['ط', ''], KeyC: ['ذ', 'ئ'], KeyV: ['د', 'ء'], KeyB: ['ز', 'أ'], KeyN: ['ر', 'إ'], KeyM: ['و', 'ؤ'],
  Comma: ['،', '<'], Period: ['.', '>'], Slash: ['/', '؟'],
};
// Physical ANSI geometry (key units, row stagger included).
const ROWS: [number, string[]][] = [
  [0.5, ['Backquote', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal']],
  [2.0, ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight', 'Backslash']],
  [2.25, ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote']],
  [2.75, ['KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash']],
];
const POS = new Map<string, { x: number; y: number }>();
ROWS.forEach(([x0, codes], y) => codes.forEach((c, i) => POS.set(c, { x: x0 + i, y })));
export function adjacent(a: string, b: string): boolean {
  const p = POS.get(a), q = POS.get(b); if (!p || !q || a === b) return false;
  const dy = Math.abs(p.y - q.y), dx = Math.abs(p.x - q.x);
  return (dy === 0 && dx <= 1.01) || (dy === 1 && dx <= 0.76);
}
export function reverseMap(layout: Record<string, [string, string]>) {
  const m = new Map<string, { code: string; shift: boolean }>();
  for (const [code, [b, s]] of Object.entries(layout)) { if (b) m.set(b, { code, shift: false }); if (s && !m.has(s)) m.set(s, { code, shift: true }); }
  return m;
}
// Letter groups for explanations
export const DOT_TWINS = ['بتثني', 'جحخ', 'دذ', 'رز', 'سش', 'صض', 'طظ', 'عغ', 'فق', 'ىي'];
export const HAMZA_FAMILY = 'اأإآءؤئ';
export const PHONETIC = [['ض', 'ظ'], ['ذ', 'ز'], ['ذ', 'د'], ['ث', 'س'], ['ث', 'ت'], ['ظ', 'ز'], ['ق', 'ك'], ['ق', 'ء'], ['ق', 'أ'], ['ت', 'ط'], ['س', 'ص'], ['د', 'ض'], ['ه', 'ح'], ['ع', 'ء'], ['ه', 'ة'], ['ة', 'ت'], ['ى', 'ا'], ['ى', 'ي']];
export type SubKind = 'shiftSlip' | 'hamzaSeat' | 'taMarbuta' | 'alifMaqsura' | 'phonetic' | 'dotTwinAdjacent' | 'dotTwin' | 'adjacent' | 'other';
export function classifySub(expected: string, typed: string, layout = AR101): SubKind {
  const rev = reverseMap(layout); const e = rev.get(expected), t = rev.get(typed);
  if (e && t && e.code === t.code && e.shift !== t.shift) return 'shiftSlip';           // ا↔أ (H), غ↔إ (Y), ى↔آ (N), ت↔\u0640 (J)
  const pair = (a: string, b: string) => (expected === a && typed === b) || (expected === b && typed === a);
  if (HAMZA_FAMILY.includes(expected) && HAMZA_FAMILY.includes(typed)) return 'hamzaSeat';
  if (pair('ة', 'ه') || pair('ة', 'ت')) return e && t && adjacent(e.code, t.code) ? 'adjacent' : 'taMarbuta'; // ة/ت are neighbours (M/J)
  if (pair('ى', 'ي') || pair('ى', 'ا')) return e && t && adjacent(e.code, t.code) ? 'adjacent' : 'alifMaqsura'; // ى/ا neighbours (N/H)
  if (PHONETIC.some(([a, b]) => pair(a, b))) return 'phonetic';
  const twin = DOT_TWINS.some(g => g.includes(expected) && g.includes(typed));
  if (twin) return e && t && adjacent(e.code, t.code) ? 'dotTwinAdjacent' : 'dotTwin';
  if (e && t && adjacent(e.code, t.code)) return 'adjacent';
  return 'other';
}
```

### Appendix E: regression cases

**Must flag** (sentence → expected rule id), from the prototype test run (48/48 pass):

```ts
const bad: [string, string][] = [
  ['إنشاء الله نلتقي غدا', 'AR_INSHALLAH'], ['انشالله خير', 'AR_INSHALLAH'], ['ماشاء الله عليك', 'AR_MASHALLAH'],
  ['هاذا الكتاب جميل', 'AR_HIDDEN_ALIF'], ['لاكن الجو بارد', 'AR_HIDDEN_ALIF'], ['ذالك صحيح', 'AR_HIDDEN_ALIF'],
  ['إسمي أحمد', 'AR_WASL_NOUNS'], ['جاء إبن عمي', 'AR_WASL_NOUNS'], ['عندي إثنين من الإخوة', 'AR_WASL_NOUNS'],
  ['إستخدام الحاسوب مفيد', 'AR_WASL_PATTERN'], ['حضرت الإجتماع أمس', 'AR_WASL_PATTERN'], ['إنتظرت طويلا', 'AR_WASL_PATTERN'], ['الإقتصاد قوي', 'AR_WASL_PATTERN'], ['إستخدم القلم', 'AR_WASL_PATTERN'], ['بالإستخدام', 'AR_WASL_PATTERN'],
  ['ذهبت الى البيت', 'AR_HAMZA_OMITTED'], ['انا هنا', 'AR_HAMZA_OMITTED'],
  ['سيارةك جميلة', 'AR_TAA_MARBUTA_INSIDE'], ['السلام علىكم', 'AR_ALIF_MAQSURA_INSIDE'],
  ['انتظرت حتي المساء', 'AR_YA_FOR_MAQSURA'], ['ذهبت إلي المستشفي', 'AR_YA_FOR_MAQSURA'],
  ['هو فى البيت', 'AR_MAQSURA_FOR_YA'], ['الكتاب الذى قرأته', 'AR_MAQSURA_FOR_YA'],
  ['ذهبت إلى المدرسه', 'AR_HA_FOR_TAA_MARBUTA'], ['اللغه العربيه جميله', 'AR_HA_FOR_TAA_MARBUTA'],
  ['الطلاب كتبو الدرس', 'AR_WAW_JAMAA_ALIF'], ['كانو هنا', 'AR_WAW_JAMAA_ALIF'], ['لم يكتبو الواجب', 'AR_WAW_JAMAA_JUSSIVE'], ['لن يذهبو', 'AR_WAW_JAMAA_JUSSIVE'],
  ['أرجوا أن تكون بخير', 'AR_EXTRA_ALIF_DEFECTIVE'], ['يبدوا أنه متعب', 'AR_EXTRA_ALIF_DEFECTIVE_3SG'],
  ['هذا شيئ جميل', 'AR_FINAL_HAMZA_LINE'], ['القطار بطيئ', 'AR_FINAL_HAMZA_LINE'], ['هذا شئ بسيط', 'AR_HAMZA_WORDS'], ['التفائل مهم', 'AR_HAMZA_WORDS'],
  ['قرأت كتابً', 'AR_TANWEEN_MISSING_ALIF'], ['مساءاً سعيدا', 'AR_TANWEEN_EXTRA_ALIF'],
  ['الكتاب و القلم', 'AR_WAW_DETACHED'], ['كتبت ب القلم', 'AR_PREP_DETACHED'], ['كيف حالك?', 'AR_LATIN_PUNCT'], ['كيف حالك ؟', 'AR_SPACE_BEFORE_PUNCT'],
  ['علی الطاولة', 'AR_PERSIAN_LETTERS'], ['کتاب', 'AR_PERSIAN_LETTERS'], ['جمييييل', 'AR_ELONGATION'],
  ['الضهر حار', 'AR_DAD_DHA'], ['النضام جيد', 'AR_DAD_DHA'], ['كتير حلو', 'AR_INTERDENTAL'], ['عشان كده', 'AR_DIALECT_WORD'],
];
```

**Must not flag**: all sentences in §7.3, §7.4 and §7.5, plus these tricky ones:

```text
اجتمع الأصدقاء في بيت علي يوم الجمعة.
لن يدعو أحدا إلى الحفلة.
يدعو المعلم الطلاب إلى القراءة.
موسى وعيسى ومصطفى أصدقاء.
المستوى عال، والمحتوى ممتاز.
الاقتصاد الهولندي قوي، والاستثمار فيه كبير.
كتبوا، وذهبوا، ولعبوا، ثم رجعوا إلى البيت.
الإنترنت سريع في هولندا.
الوضع السيئ لا يدوم، والمساوئ قليلة.
سافر صديقي الأسترالي إلى أمستردام.
قصص الأنبياء جميلة.
مبادئ الكتابة بسيطة، وشاطئ البحر قريب.
يهيئ المعلم الدرس قبل الحصة.
مدرستان كبيرتان في المدينة.
إذا كان الكلام من فضة فالسكوت من ذهب.
```
