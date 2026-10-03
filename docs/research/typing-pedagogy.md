# Typing pedagogy for Parrotype: evidence-based ways to reduce typos

> Audience: the engineers building Parrotype (repo `parrotype`), a static Vite + TypeScript typing trainer for one user who makes many typos in **Dutch (priority)**, English and later Arabic, plus Dutch/English grammar and spelling mistakes.
>
> Scope: why typos happen, which practice methods reduce them (and how strong the evidence is), which metrics to compute, a typo taxonomy the UI can show, and three algorithm sketches: (1) typo classification, (2) per-key and per-bigram weakness scores, (3) targeted drill generation.
>
> How the research was done: web search plus primary sources where they could be reached. Many academic hosts (gwern, DTIC, crumplab, aalto, ERIC, Wikipedia, PMC) were **blocked by the egress proxy**, so some findings rest on search-engine abstracts and secondary summaries. These are marked **(secondary)**. For **keybr.com** and **Monkeytype** I read the **actual source code on GitHub** (cloned 2026-10-03), so those parts are exact.
>
> Evidence labels used below: **[Strong]** = replicated experiments or large datasets; **[Moderate]** = single good studies or consistent theory; **[Weak]** = practitioner consensus, tool conventions, or my own engineering judgment.

---

## 0. Summary: 15 rules for the build

1. **Separate motor typos from spelling (cognitive) errors**, because they need different training. Typos (e.g. `teh`) are finger slips: train them with adaptive key/bigram drills. Spelling errors (`recieve`, Dutch `hij word`) come from missing knowledge or rule application: train them with dictation, spaced repetition and rule hints. [Strong: Kukich 1992; Conijn et al. for Dutch]
2. **Copy-typing measures motor skill. Dictation (hear, then type) measures spelling.** Copy-typing shows the correct spelling on screen, so it hides spelling gaps. Parrotype needs both modes. [Moderate]
3. **Use real words, not nonsense strings.** Skilled typing is controlled word by word (the "outer loop"), and old typewriting research found nonsense drills less effective than dictionary words. Fall back to pseudo-words only when real words run out. [Moderate-Strong: Logan & Crump; West (secondary)]
4. **Gate on accuracy first, then speed.** Raise the speed target only after accuracy is at or above about 96–97% on the current material. Errors are costly: every typo also costs a backspace and a re-type. [Moderate/Weak; it is consensus, but the old literature is mixed, see §2.2]
5. **Adapt to the user's real weak keys and bigrams, but only once the data is clear.** Errors are partly random noise. West's review of typewriting research found that remedial drills aimed at specific errors mostly failed. So mark a key "weak" only when a confidence bound clears the threshold (§6). [Moderate]
6. **Keep the error set concentrated:** one focus key, a few support keys, and newly added letters, as keybr does (§2.5, exact algorithm from source).
7. **Interleave, don't block.** Mix target words with normal words. Practice looks worse, but retention and transfer are better. [Strong: contextual interference]
8. **Practice in short, spaced sessions with micro-breaks:** about 10–20 minutes a day, 45–90 s blocks, 10–20 s rests. Fatigue measurably raises error rates. [Strong: Baddeley & Longman 1978; fatigue studies. Moderate: micro-offline gains (contested)]
9. **Give immediate, quiet per-character feedback in copy modes.** For spelling and grammar in free writing, give feedback **delayed** to the end of the sentence or paragraph, and **indirect first** ("something is wrong in this word") before revealing the answer. [Moderate: guidance hypothesis; indirect spelling feedback studies]
10. **Keep exposure to wrong spellings short.** Seeing phonetically plausible misspellings (e.g. `recieve`) measurably hurts adults' later spelling, and the effect lasts at least a week. The correct form should be the most prominent thing on screen, and the user should type it correctly at least once. [Moderate: Dixon & Kaminska]
11. **Use spaced repetition (Leitner boxes) for every word the user misspells cognitively.** Re-test inside the session and again on later days. [Strong: spacing and testing effects]
12. **Offer strict modes** (stop-on-letter, no-backspace, fail-on-error) as optional challenges, not defaults. With correction allowed, typists fix the error and then speed up again. Without correction they slow down after errors. These are two different strategies, and both are worth training. [Moderate: Crump & Logan 2013]
13. **Measure accuracy several ways:** keystroke accuracy (Monkeytype style), corrected vs uncorrected error rate (Soukoreff & MacKenzie), per-key and per-bigram error rate and latency, the distribution of error types, and consistency (Monkeytype's kogasa formula, exact code in §3).
14. **Label every mistake with a human-readable type** ("swapped letters", "neighbour key", "wrong letter doubled", "dt-rule"). Error-type feedback with an explanation produces more learning than a bare "wrong". [Moderate: Metcalfe 2017]
15. **Treat Dutch d/t verb endings as a working-memory problem.** These errors rise when the wrong homophone is the more frequent form, and when more words separate the verb from the word that decides its spelling. Drills should vary both factors. [Strong: Sandra, Frisson & Daems 1999]

---

## 1. Why typos happen

### 1.1 Skilled typing is two nested control loops

- **Logan & Crump's two-loop theory:** an **outer loop** handles language. It understands the text, splits it into words, sends one word at a time down, and watches the screen. An **inner loop** takes each word, activates its keystrokes in parallel, and runs them in order. The outer loop works in words; the inner loop works in letters. (Logan & Crump 2011; Yamaguchi, Crump & Logan 2013, secondary)
- **Errors are detected twice.** In Logan & Crump (2010, *Science*), software secretly inserted typos the typists hadn't made, or silently fixed typos they had made. Typists *believed the screen*: they blamed themselves for inserted errors and took credit for fixed ones. Their fingers, however, slowed down only after their own real errors, whether or not the screen showed them. **Implication:** the fingers (inner loop) know when they slipped, independent of the screen. Feedback should support that awareness, not replace it.
- **Attending to the hands disrupts typing.** When skilled typists were told to type only one hand's letters, typing slowed and errors rose (Logan & Crump 2009). **Implication:** keep the user's eyes on the text. A virtual keyboard should be optional and quiet, and drills should not ask the user to think about individual fingers mid-word.
- **Word-level information primes the word's keystrokes** (Crump & Logan 2010), and typists' timing follows the letter and bigram statistics of the language. Behmer & Crump (2017) had 346 typists type real paragraphs, English-like bigram strings and random strings. Real words were started fastest, random strings slowest, and sensitivity to bigrams grew with typing speed. **Implication:** practice material should be real language (Dutch words for Dutch).
- **Errors are linguistic, not only keyboard-based.** Pinet & Nozari (2018) found more consonant-migration errors between typed words when the words shared a vowel, i.e. errors follow phonology, and many swapped keys are *not* neighbours on the keyboard. **Implication:** the classifier needs categories beyond "adjacent key".

### 1.2 Transcription typing: four stages and four error classes

- **Salthouse (1986)** splits typing into four stages: **input** (group text into chunks), **parsing** (break chunks into characters), **translation** (characters into movement plans) and **execution** (movements). He integrated 29 empirical "typing phenomena", including that there are four major error categories. (Psychological Bulletin 99(3), 303–319)
- **The classic taxonomy goes back to Wells (1916):** **substitutions, intrusions (insertions), omissions, transpositions.** (cited by Salthouse 1986)
- **Error-related phenomena** (from the Salthouse list as summarised by Wu & Liu 2008, secondary):
  - Many **substitution** errors involve **adjacent keys**.
  - **Intrusion** (insertion) errors tend to have **very short** inter-key intervals, which fits two keys pressed almost at once.
  - **Omission** errors go with **long** inter-key intervals.
  - **Transpositions are mostly cross-hand** (e.g. `teh` for `the`: t is left hand, h is right hand).
  - Different fingers have different error rates.
- **Grudin (1983/1984)** compared substitution confusion matrices of expert typists with about 70 beginning high-school typists. Two sources of substitution stood out:
  - **adjacent keys**, and
  - **homologous keys**: the same finger and position on the *other* hand (e.g. `d`↔`k`, `f`↔`j`).

  Both point to finger-control errors. (secondary; I could not retrieve the exact percentages, so **don't hard-code numbers from Grudin**.)
- **Doubling errors** (Rumelhart & Norman 1982): in a word with a double letter, the *wrong* letter gets doubled, e.g. `bokk` for `book`. Their model explains this with a weakly bound "doubling" schema that can attach to the wrong letter.

### 1.3 Motor typos vs cognitive spelling errors

- **Kukich (1992)** splits errors into **typographic** (performance: you know the spelling but your finger slips, `teh`) and **cognitive** (competence: `recieve`). **Phonetic** errors are a subtype of cognitive errors: they sound right but are spelled wrong. This is the main split for Parrotype's labels.
- **Damerau (1964):** more than **80%** of misspellings are a **single** insertion, omission, substitution or transposition of adjacent letters. This is why the classifier starts with an optimal-string-alignment (Damerau–Levenshtein) diff.
- **Dutch keystroke-log data** (Conijn, Van Waes & van Zaanen, CLIN29): 2,103 Dutch transcription tasks from 1,717 participants, 5,030 corrections. Breakdown:

  | Correction type | Share |
  |---|---|
  | Single substitution | 59% |
  | Single transposition | 5% |
  | Single insertion | 4% |
  | Single deletion | 1% |
  | More than one change | 27% |
  | No change | 4% |

  The authors stress that typos and orthographic errors are cognitively different, and that keystroke timing (when the error was produced and when it was fixed) helps tell them apart. **Implication:** log per-keystroke timing.

### 1.4 Speed, timing and errors in large datasets

- **Dhakal, Feit, Kristensson & Oulasvirta (2018):** 136 million keystrokes from about 168,000 volunteers, mean **51.56 WPM**. **Faster typists generally make fewer errors**, and slower typists especially *substitute* wrong letters. "Rollover" (pressing the next key before releasing the previous one) is common and goes with faster typing. Users cluster into 8 typist profiles. (secondary for the details)
- **Feit, Weir & Oulasvirta (2016):** self-taught typists can match touch typists, even with fewer fingers. Three predictors of high performance:
  1. **unambiguous finger-to-key mapping** (each letter always pressed by the same finger),
  2. **active preparation** of the next keystrokes,
  3. **minimal global hand movement**.

  Trained typists looked at the keyboard about half as much as untrained ones. **Implication:** encourage a *consistent* finger for each key and eyes on the screen. Strict ten-finger dogma is optional.
- **Gentner et al. bigram timing:** 11 typists at 60–110 WPM.

  | Bigram type | Mean inter-key interval |
  |---|---|
  | Two hands | 114 ms |
  | Two fingers, same hand | 131 ms |
  | Same finger, double letter | 157 ms |
  | Same finger, home key to adjacent key | 185 ms |
  | Same finger, adjacent key to adjacent key | 192 ms |

  **Implication:** don't flag a key as "slow" just because it often follows a same-finger reach. Normalise latency by bigram type (§6).
- **Typability Index** (Behavior Research Methods, 2025/26): built from the 136M dataset. Eight predictors (including share of lowercase letters, word frequency and syllables per word) explain 68–88% of the variance in how fast a text can be typed. **Implication:** text difficulty varies a lot, so compare the user's WPM only across texts of similar difficulty, or show "difficulty-adjusted" progress.

### 1.5 Fatigue

- **[Strong]** Studies of typing during real office work found that with time on task, both speed and accuracy drop, error corrections increase, and some typists keep their speed but make more errors to fix (Frontiers / PMC studies on typing and mental fatigue). **Implication:** keep sessions short, and suggest a break when the rolling error rate climbs (§8).

### 1.6 Language-specific cognitive errors this user will make

**Dutch** (main language):

| Category | Example(s) | Note |
|---|---|---|
| **d/t/dt verb endings** | `hij word` → `wordt`; `gebeurd`/`gebeurt`; `ik vindt` → `ik vind` | Sandra, Frisson & Daems (1999): errors on homophone verb forms rise when the wrong form is the more frequent one (**homophone dominance**) and when more words separate the verb from the word that decides its spelling (**distance**). Working memory loses to a fast, frequency-driven lookup. Even good spellers make these under load. |
| Past tense/participle ('t kofschip) | `-te`/`-de`, `-t`/`-d` | Stem ends in t, k, f, s, ch, p (plus x) → `-te`/`-t`; otherwise `-de`/`-d`. |
| Tests to teach | substitute `lopen` (`hij loopt` → `hij wordt`); the `ik`-form is the bare stem | |
| **ei/ij**, **au/ou** | `lijden`/`leiden`, `wij`/`wei` | Same sound, two spellings. |
| **Open/closed syllable vowel and consonant doubling** | `kopen` not `koopen`; `praatte`; `jullie` | |
| **Compounds written apart** | `samen stellingen` → `samenstellingen` | |
| **g/ch** | `echt` not `eght`; `ligt` vs `licht` | |
| Diacritics | `ideeën`, `één`, `geëxporteerd` | Often typed via US-International dead keys. |

Most Dutch users type on **US-International QWERTY**; Belgium uses **AZERTY**. On US-Intl, `'`, `"`, `` ` ``, `^`, `~` are dead keys. That gives two typo kinds:
- **missing diacritic:** `ideeen`
- **dead-key artifact:** typing `'` then `e` produces `é` when the user wanted `'e`.

**English:**
- Homophones driven by frequency: `their/there/they're`, `its/it's`, `your/you're`, `then/than`.
- `ie/ei`, doubled consonants (`untill`, `occured`).

These are mainly the grammar researcher's domain; the pedagogy implication here is to drill them as contrastive pairs inside sentences.

**Arabic** (phase 2): the most frequent spelling errors involve **hamza forms** (أ إ ا آ ء ؤ ئ, and hamzat al-wasl vs al-qat'), **ta marbuta vs ha** (ة/ه) and **ta marbuta vs open ta** (ة/ت), plus **alif maqsura vs ya** (ى/ي). One source claims about 95% of common Arabic mistakes are hamza and ha/ta-marbuta confusions (secondary; treat the number as indicative). On the Arabic (101) layout, ة sits on the US `m` key position (some sources describe it differently, so verify per layout) and ى is next to it. Expect both cognitive and adjacent-key confusions.

---

## 2. What reduces typos: methods and evidence

### 2.1 Deliberate practice
- **[Strong in general, Moderate for typing]** Ericsson's deliberate practice means effortful, feedback-rich work on specific weaknesses, just beyond current ability. Mindless repetition isn't it.
- In Keith & Ericsson (2007) on everyday typists, the best performers had taken a typing class in the past and reported *trying to type fast* in everyday typing, i.e. deliberate goals, not hours alone. (secondary)
- **Parrotype implication:** every session has an explicit target (e.g. "f/v accuracy ≥ 97% at 30 WPM"), immediate feedback, and the next session adapts.

### 2.2 Accuracy before speed (with nuance)
- **What the field says:** typing tutors and educators generally recommend accuracy first. *ngram-type* defaults to **100% accuracy** and **40 WPM** to pass a lesson. Its author argues that "correcting mistakes is costly" and that low accuracy builds "bad muscle memory".
  - keybr uses a target speed (default **175 characters per minute, about 35 WPM**, range 75–750 CPM). It celebrates accuracy streaks at **100%, 97% and 95%** (both from source code).
- **Historical nuance [Moderate, secondary]:**
  - Typewriting-education literature (Leonard J. West's research summaries) debated "speed first" vs "accuracy first" for decades.
  - Where accuracy was de-emphasised early, many students' errors per minute stayed very high unless remedial techniques were used.
  - West also wrote that error-reduction tactics built on error analysis, assuming each error type has a remedial exercise, had "nearly nothing" proven successful.
  - West reported nonsense drills to be less effective than real dictionary words.
- **Reconciling this for Parrotype:**
  - Don't drill isolated letters in nonsense strings, and don't assume every error is a stable habit.
  - **Do** gate progress on accuracy, and use adaptive selection only for *statistically consistent* weaknesses.
  - Keep most practice in real, varied words and sentences.
  - Spelling (cognitive) errors *are* stable per word, so targeted remediation clearly fits there (§2.11).
- **Concrete policy:**
  - Accuracy target **97%** (keystroke accuracy) for normal drills. Beginner level: 95%. "Precision" challenges: 100%.
  - Raise the speed target by 5–10% only after **3 consecutive blocks** at target accuracy.
  - If accuracy drops below 92% in a block, slow down: lower the pace caret (§2.14) by 10%.

### 2.3 Touch typing and consistent finger mapping
- **[Moderate]** Feit et al. (2016): touch typing isn't required for speed, but a **consistent finger per key**, preparing upcoming keys, and little hand movement predict performance. Touch typists look at the keyboard about half as much.
- **Parrotype implication:**
  - Offer an optional on-screen keyboard with finger colours (Monkeytype has a keymap mode with `off/static/react/next`).
  - Offer a "next key" hint for beginners. Fade it out (guidance hypothesis, §2.9).
  - Detect **hand-shift errors** (the whole word typed one key off, e.g. `ubfirnatuib` for `information`) and tell the user "your hands slipped off the home row: find the bumps on F and J". This hand-shift pattern is well known; there are patents for auto-detecting it.

### 2.4 Real words and n-gram chunks
- **[Moderate-Strong]**
  - Skilled typing runs at word level (§1.1).
  - Typists tune to the bigram statistics of their language (Behmer & Crump 2017).
  - Yamaguchi & Logan (2014) remapped one key's position. Breaking a single letter–key association disrupted the planning of *whole words* containing that letter, and re-learning depended on the letter sequences both before and after the target key.
- **Implication:** drill weak keys **inside real words and frequent bigrams/trigrams of the target language**, not in isolation.
- **Dutch bigram frequencies:** EN 6.08%, DE 3.28%, ER 2.97%, EE 2.09%, AN 2.05%, ET 2.03%, GE 1.96%, TE 1.93% (corpus of about 2.06M characters; secondary). Build the real frequency tables from the app's own Dutch word list.

### 2.5 Adaptive practice: keybr's algorithm, read from source
Source: `aradzie/keybr.com`, files `packages/keybr-lesson/lib/guided.ts`, `key.ts`, `target.ts`, `packages/keybr-result/lib/keystats.ts`, `packages/keybr-textinput/lib/histogram.ts`, `packages/keybr-math/lib/filter.ts`.

1. **Letter order:** the language's letters in **frequency order**. An optional setting weights them by keyboard position.
2. **Per-lesson sample per key:** `hitCount`, `missCount`, and `timeToType` = mean time for **correct** occurrences only (typo samples are excluded from the timing). Samples faster than 40 ms (about 300 WPM) or slower than 12 s are invalid.
3. **Smoothing:** each key's per-lesson `timeToType` goes through an **exponential moving average with α = 0.1**. `bestTimeToType` = the minimum smoothed value ever reached.
4. **Confidence:** `confidence = targetTimePerChar / timeToType`, where `targetTimePerChar = speedToTime(targetSpeed)` (default target 175 CPM, about 343 ms per character). `confidence ≥ 1` means "at target speed".
   - Note: the Keystrike wiki describes a keybr-like variant that also multiplies by accuracy. **keybr itself (current code) does not.** Its confidence is speed-only, and errors only enter by being left out of the timing.
5. **Which keys are included:**
   - always at least **6** letters;
   - optionally more via the `alphabetSize` setting;
   - every key that was ever confident (`bestConfidence ≥ 1`);
   - the **next** letter in order is added only when **all** included keys are confident. "Recover keys" mode uses current confidence; the default uses best-ever confidence.
6. **Focus:** among included keys with confidence < 1, the **least confident** is the focused key. The generator's `Filter(includedKeys, focusedKey)` makes words that use only included letters and favour the focused one.
7. **Words:**
   - default: **pseudo-words** from a per-language "phonetic model" (keybr ships models for `nl` and `ar` too);
   - optional `naturalWords` mode: real dictionary words containing only included letters, topped up with pseudo-words if fewer than 15 match.
8. **Learning-rate prediction:** fits a polynomial (degree 1, 2 or 3 by sample count) to the last 30 samples of speed vs lesson index. If R² ≥ 0.5, it reports the slope and the number of lessons until target speed.

**What Parrotype should copy:** frequency-ordered unlocking (only for a "learn touch typing" track), EMA per-key latency, a confidence-vs-target score, focus on the weakest key, and a lesson-count prediction.

**What Parrotype should change:**
- Add an **accuracy term** (this user's problem is errors, not speed).
- Default to **real Dutch words** (keybr's pseudo-words go against the real-word evidence).
- Add **bigram-level** tracking.
- Add **spelling-error tracking** separate from motor errors.

### 2.6 N-gram drills (ngram-type)
- Source: `ranelpadon/ngram-type`.
- Lessons are built from the top-N bigrams/trigrams/tetragrams/words. **Scope** = how many of the top items, default 50. **Combination** = items per line, default 2. **Repetition** = how often the line repeats, default 3.
- A lesson repeats until **minimum WPM (40) and minimum accuracy (100%)** are met.
- Suggested progression: grow Combination (3→10) at each Repetition level (3→2→1), raising the speed threshold each round.
- **Parrotype use:** a "Bigram gym" drill fed by the user's *weakest frequent* bigrams (§6) instead of a fixed top-N list.

### 2.7 Spacing, session length, rests
- **[Strong] Baddeley & Longman (1978):** postal workers learned to type in one of four schedules: 1 h or 2 h sessions, once or twice a day. **1 × 1 h per day** was most efficient per hour of training; **2 × 2 h per day** was least efficient. Retention tests after 1, 3 or 9 months showed about 30% speed loss.
- **[Moderate, contested] Micro-offline gains:** Bönstrup et al. (2019) found early motor-sequence learning happens largely during **short rests of seconds** between practice blocks; a crowdsourced replication had N = 951 (2020). A later study argues these gains are transient performance effects (they also appear with random, unlearnable sequences) rather than real offline learning. Either way, short rests don't hurt and help performance.
- **[Strong] Fatigue raises errors** (§1.5).
- **Parrotype policy:**
  - default **daily session of about 15 minutes** (configurable 5–30);
  - blocks of **45–90 s** (or 25–60 words);
  - an enforced **10–20 s breather** between blocks (the parrot animation can fill it);
  - a "come back tomorrow" nudge after about 25 minutes;
  - a suggested break when the rolling error rate rises more than 50% above the session's first-block baseline.

### 2.8 Interleaving (contextual interference)
- **[Strong]** Random or interleaved practice of several tasks gives worse performance during practice but **better retention and transfer** than blocked practice (Shea & Morgan 1979; Battig).
- **Parrotype policy:** a drill line mixes target words (about 60%), general high-frequency words (about 25%) and review words (about 15%).
- Pure blocked repetition of one weak bigram is only for a short warm-up (ngram-type style `Repetition=3`), followed by mixed lines.

### 2.9 Feedback design
- **Guidance hypothesis [Strong in motor learning]** (Salmoni, Schmidt & Walter 1984): feedback on every trial helps practice but can harm retention, because learners lean on it instead of their own error sense. Reduced or summary feedback supports self-detection. In typing, the inner loop already detects slips (§1.1), so:
  - Show per-character colouring (correct/incorrect), as all typing apps do. It is low-intrusion and lets the user stay in flow.
  - **Fade the extra aids** (next-key highlight, finger hints) as skill grows. Offer a **"blind" / "hide errors" mode** (Monkeytype's `indicateTypos` and blind-mode options exist for this) in which feedback comes only at the end of a block, which trains the user's *own* error detection.
  - Give **summary knowledge of results** after each block: accuracy, WPM, the top 2–3 error types with one example each, and **one** actionable tip. Don't dump every statistic mid-session.
- **Immediate vs delayed correction for spelling [Moderate]:**
  - Immediate correction beat delayed correction for learning sight words (behaviour-analytic studies).
  - Delayed feedback, even with immediate warnings, produced less learning from errors than immediate feedback.
  - **But** for free writing, interrupting the outer loop mid-sentence breaks composition.
  - **Policy:** copy modes: immediate per-key colouring. Dictation: per-word evaluation as soon as the word is committed (space). Free writing: underline at sentence end, full explanation on hover or at paragraph end.
- **Indirect before direct [Moderate]:** in EFL dictation studies, *indirect* feedback (marking the error without giving the answer) fixed spelling errors better than direct correction. **Parrotype hint ladder:**
  1. mark the word ("the parrot frowns at this word");
  2. narrow it to the letters/region;
  3. state the rule ("dt-rule: replace with *lopen*: *hij loopt* → ?");
  4. reveal the correct form;
  5. require retyping it correctly.
- **Learning from errors [Moderate-Strong]** (Metcalfe 2017): making an error and then getting corrective feedback helps learning, especially with an explanation of *why*. High-confidence errors get corrected most readily (the hypercorrection effect). **Implication:** after a reveal, show the rule. For words the user typed fast and confidently but wrongly, flag them as "surprise" items for spaced repetition.
- **Exposure hazard [Moderate]:** Dixon & Kaminska showed that seeing phonetically plausible misspellings hurts adults' later spelling of those words, immediately and one week later, through implicit item-specific priming. **Policy:**
  - In feedback, show the wrong form only briefly and visually de-emphasised (e.g. strikethrough, low contrast). Show the correct form large and make the user type it.
  - In proofreading drills (§2.13), use injected misspellings sparingly, prefer motor-style typos (`teh`) over plausible spelling errors, and always end with the correct text.

### 2.10 Backspace policies and strict modes
Monkeytype's options, read from `packages/schemas/src/configs.ts` and `frontend/src/ts/input/helpers/fail-or-finish.ts`:

| Option | Values | Behaviour |
|---|---|---|
| `stopOnError` | `off` / `word` / `letter` | `letter`: the cursor won't advance until the right key is pressed. `word`: you can't move to the next word until this one is correct. |
| `confidenceMode` | `off` / `on` / `max` | `on`: you can't backspace into previous words. `max`: backspace is disabled entirely. |
| `difficulty` | `normal` / `expert` / `master` | **expert** fails the test when you *commit* (space) an incorrect word. **master** fails on **any** incorrect keypress. |
| `indicateTypos` | `off` / `below` / `replace` / `both` | How wrong letters are displayed. |

There is also a "delete on error" behaviour.

Evidence:
- **Crump & Logan (2013, JEP: General):** with **correction disabled**, typists showed **post-error slowing** (prevention). With **correction enabled**, they fixed the error and then *sped up* (cure). They preferred cure.
- **Implication:** different backspace policies train different things.
  - **Free backspace** (default): realistic; trains noticing and fixing.
  - **Stop-on-letter ("strict")**: makes every error visible and impossible to skip. Good for beginners and for the accuracy track. It removes uncorrected errors, so measure keystroke accuracy instead.
  - **No backspace ("commit")**: trains care before pressing a key (prevention) and stops the "type fast, mash backspace" habit. Use it for short challenges.
  - **Sudden death ("Polly's perch", master-style)**: one wrong key fails the run. A gamified 100%-accuracy streak, to be used sparingly.
  - **Recommended defaults for this user:** free backspace in practice. Stop-on-letter during "focus" drills for the first 2 weeks. Weekly no-backspace and sudden-death challenges.
- **Accounting rule (important for metrics):** every incorrect keypress counts against keystroke accuracy, even if fixed later (Monkeytype's `getAccuracy` counts each `input` event as correct or incorrect). For per-key *weakness*, count only the **first attempt** at each target position, so mashing doesn't inflate one key's error count (§6).

### 2.11 Spaced repetition for misspelled words
- **[Strong]** The spacing effect and retrieval practice (testing effect) are among the best-replicated findings in learning research.
  - One adult spelling study found *copying* about as effective as testing, and argued that the key learning event is focused study of sound-to-letter mappings for letter sequences not yet learned.
  - So the review item should **force attention to the tricky segment** (highlight `dt`, `ij`, `ee`), not just re-test.
- **Cover-Copy-Compare** (look, cover, write, compare) is an effective self-managed spelling intervention (meta-analysis: Joseph et al. 2012). It maps directly onto a typing UI: show the word, hide it, type it, compare the diff.
- **Leitner system:**
  - Boxes with growing intervals.
  - Correct → next box; wrong → back to box 1.
  - **Parrotype intervals:** box 1 = same session (re-test after 3–5 other items) and the next day; then 2, 4, 8 and 16 days.
  - A word "graduates" after correct recall in box 5.
  - SM-2 is an alternative: intervals 1, 6, then I×EF, EF starting at 2.5 with a minimum of 1.3, `EF' = EF + (0.1 − (5−q)(0.08 + (5−q)·0.02))`. Leitner is simpler and transparent for one user; that is the recommendation.
- **What goes into the word bank:**
  - cognitive errors (spelling-rule or phonetic categories, or a real-word swap) found in dictation or free writing;
  - motor typos only if they **recur on the same word ≥ 3 times** across sessions (a stable motor habit for that word, e.g. always `teh`).

### 2.12 Dictation (hear and type): the Dutch dictee tradition
- **Why dictation:** it is the only mode that tests spelling-from-sound. Copy-typing shows the answer.
  - A 2025 study of university students (with and without specific learning disorders) found error patterns differ between copy and dictation tasks: more omissions in dictation for the learning-disorder group.
  - Teachers rate dictation as effective for listening, grammar, spelling and attention.
  - Experimental evidence on dictation's effect on spelling is thinner than practitioners' enthusiasm (several L2 papers note mixed results). Hence: **[Moderate/Weak]** for spelling gains, **[Strong]** as a diagnostic.
- **The Dutch tradition:**
  - School dictees: words from recent lessons are dictated, then the teacher discusses the strategies for spelling them. Standardised word dictations such as the PI-dictee exist.
  - The televised **Groot Dictee der Nederlandse Taal** (1990–2016, NTR/de Volkskrant/De Morgen) made dictee a national sport for adults. There was also a **Groot Dictee der NT2** for learners of Dutch. The tradition traces back to Prosper Mérimée's dictée for Napoleon III (about 1860) and to the French *Dicos d'Or* (Bernard Pivot).
- **Parrotype "Dictee" mode design:**
  1. Text-to-speech reads a sentence (adjustable speed, replay button).
  2. The user types it; there is no on-screen text.
  3. Each word is graded on commit, with the indirect hint ladder (§2.9).
  4. After the sentence: show the diff with labelled error types.
  5. Missed words go to the Leitner bank.
  6. A weekly "Groot Dictee" challenge: a longer themed text graded like the TV show (errors counted per word, ranking against the user's own history).
- **Content for dt drills:** vary (a) homophone dominance and (b) subject–verb distance, e.g. `Wordt het boek dat ik gisteren in de bibliotheek heb gevonden morgen teruggebracht?`. Include the `ik`-form and inversion traps (`word jij` vs `wordt hij`).

### 2.13 Proofreading practice
- **[Moderate] Why we miss our own typos:** we read what we *meant* (Tom Stafford). Familiarity makes errors invisible.
  - **Making text unfamiliar helps:** change the font or background, or read it aloud.
  - Reading aloud improved detection of both contextual and non-contextual errors.
  - Readers who made more fixations and spent more time found more errors.
  - Structured proofreading-strategy training helped students with learning disabilities.
- **Parrotype "Spot the typo" drill:**
  - Show a short text with N injected errors **generated from the user's own error profile** (their top confusion pairs and error types).
  - Render it in a different font.
  - The user clicks or retypes the error spots; then reveal.
  - Apply the exposure-hazard limits (§2.9): mostly motor-type injections, few plausible misspellings, always finish on the correct text.
  - **Self-review step in free writing:** after writing, switch font, offer TTS read-back (listening to your own text reveals omissions), then run the rule checker.

### 2.14 Rhythm and consistency
- **[Moderate]** Skilled typing is **not** evenly paced: inter-key intervals depend on the bigram (Gentner, §1.4). Stroke-by-stroke pacing such as a metronome or typing to music is an old typewriting technique that West reviewed, and the evidence for it is weak.
- **Policy:**
  - Measure **consistency at the burst level** (raw WPM per second), as Monkeytype does, and treat steadiness as a *result* to show. Don't enforce a metronome.
  - An optional **pace caret** (a ghost cursor at the target WPM) is good. It sets a gentle speed ceiling, which helps accuracy-first practice: set it to 85–95% of the user's recent WPM in accuracy drills.

---

## 3. Metrics: definitions and code

Use the Monkeytype conventions so numbers feel familiar, and add the research metrics. A "word" = **5 characters including spaces**.

```ts
// Monkeytype: calculateWpm(charCount, seconds) = charCount / 5 / (seconds / 60)
export const wpm = (chars: number, seconds: number) =>
  seconds <= 0 ? 0 : chars / 5 / (seconds / 60);

// WPM (Monkeytype): characters of CORRECTLY typed words (incl. spaces) / 5 / minutes
// Raw WPM: all typed characters (correct or not) / 5 / minutes
// Accuracy (Monkeytype getAccuracy): correctKeypresses / (correct + incorrect keypresses) * 100
//   – every incorrect keypress counts, even if later fixed with backspace.

// Monkeytype consistency (test-logic.ts + packages/util numbers.ts):
//   rawPerSecond = burst history (raw WPM per 1-second bucket)
//   consistency  = kogasa(stddev(rawPerSecond) / mean(rawPerSecond))
export function kogasa(cov: number): number {
  return 100 * (1 - Math.tanh(cov + Math.pow(cov, 3) / 3 + Math.pow(cov, 5) / 5));
}
// Also computed there: keyConsistency = kogasa(cv of inter-keydown spacing, dropping the last).
```

Soukoreff & MacKenzie (2003) keystroke classes:
- **C** = correct characters in the final text
- **INF** = incorrect, not fixed (left in the final text)
- **IF** = incorrect but fixed later
- **F** = fixing keystrokes (backspace etc.)

```ts
const totalER       = (INF + IF) / (C + INF + IF);   // all errors committed
const uncorrectedER = INF / (C + INF + IF);          // errors left behind
const correctedER   = IF  / (C + INF + IF);          // errors noticed & fixed
const kspc          = totalKeystrokes / finalText.length; // keystrokes per char (efficiency)
// Net WPM (classic typing tests): grossWPM − uncorrectedErrors / minutes
```

**Per-key and per-bigram metrics:** first-attempt error rate, smoothed correct-latency (EMA, α = 0.1 per session, keybr-style), confidence = target ms / latency, sample count, and last-practised date.

**Shown to the user:**
- *Big:* WPM, accuracy.
- *Small:* raw WPM, consistency, corrected vs uncorrected errors.
- *Results page:* top error types (pie or bars), keyboard heatmap of error rate, and the 3 weakest bigrams.
- *Over time:* accuracy trend (main KPI for this user), WPM trend, Leitner bank size and graduations, Dutch spelling-rule error counts per week.

**Badges / streaks** (keybr-like): 95%, 97% and 100% accuracy-streak levels.

---

## 4. Typo taxonomy (labels for the UI)

Each classified mistake gets `{ kind: 'motor' | 'cognitive' | 'unknown', type, subtype?, ruleId?, expected, typed, explanation }`. Suggested labels, with Dutch UI copy:

| type id | Label (EN) | Label (NL) | Example | Detection (short) | Tip shown |
|---|---|---|---|---|---|
| `transposition` | Swapped letters | Letters omgedraaid | `teh`→the | single adjacent swap (OSA) | "Your hands raced each other. Slow down on cross-hand pairs." |
| `transposition.crossHand` / `.sameHand` | (subtype) | | `hte` | finger map | |
| `sub.adjacent` | Neighbour key | Buurtoets | `thw`→the | substitution, keys adjacent on layout | "Finger landed next door: aim for the key centre." |
| `sub.homologous` | Mirror key (wrong hand) | Spiegeltoets (andere hand) | `kog`→dog | same finger/position, other hand | "Wrong hand fired. Say the word in your head first." |
| `sub.sameFinger` | Same-finger slip | Zelfde vinger, verkeerde rij | `deeent`→decent (c→e, left middle finger) | same finger, different row, not adjacent | "Same finger, wrong row: let the finger reach, not the hand." |
| `sub.other` | Wrong letter | Verkeerde letter | | anything else | |
| `ins.repeat` | Key bounced (double tap) | Dubbel aangeslagen | `thhe` | inserted char equals neighbour char | |
| `ins.adjacent` | Extra neighbour key (roll/fat finger) | Extra buurtoets | `thre`→the (r next to e) | inserted char adjacent to a neighbouring expected key; often IKI < 60 ms | |
| `ins.space` | Split word | Woord gesplitst | `samen stellingen` | inserted space | NL: link to the compound rule |
| `ins.other` | Extra letter | Extra letter | | | |
| `del.double` | Missed double letter | Dubbele letter vergeten | `leter`, `julie` | omitted char is half of a double | NL: open/closed syllable rule |
| `del.space` | Words run together | Spatie vergeten | `thecat` | omitted space | |
| `del.other` | Missed letter | Letter vergeten | `th` | | "Omissions often follow a pause: keep the rhythm." |
| `doubling.wrong` | Wrong letter doubled | Verkeerde letter verdubbeld | `bokk`→book | collapse(doubles) equal, double moved | |
| `doubling.extra` | Extra double | Onnodige dubbele letter | `untill`, `koopen` | | NL: spelling rule |
| `case` | Capitalisation | Hoofdletter | `amsterdam` | only case differs | |
| `diacritic.missing` / `.wrong` / `.extra` | Accent / trema | Accent / trema | `ideeen` | only diacritics differ after NFD strip | Explain US-Intl dead keys |
| `deadkey` | Dead-key artifact | Dode-toets-fout | `éen` for `'een` | é/ë/ê where `'`/`"`/`^` plus vowel was expected | |
| `handShift` | Hands off home row | Handen verschoven | `yjr`→the | all mismatches = the same ±1 column shift | "Find the bumps on F and J." |
| `realWord` | Wrong (real) word | Verkeerd (bestaand) woord | `form`→from | typed word is in the dictionary | |
| `homophone` | Sound-alike word | Klankgelijk woord | `there`→their, `word`→wordt | homophone table / language rule | |
| `spelling.<ruleId>` | Spelling rule | Spellingregel | NL `dt`, `eiij`, `auou`, `kofschip`, `openSyllable`, `compound`, `gch`; EN `ieEi`, `doubleConsonant`; AR `hamza`, `taMarbuta`, `alifMaqsura` | language rule hooks (shared with the grammar engine) | rule explanation + mnemonic |
| `garbled` | Lost the word | Woord kwijt | `wthe`→weather | ≥ 3 edits or > 50% of length | "Look ahead one word, not at your fingers." |

**Motor vs cognitive decision:**
- **cognitive** if any of:
  - a language spelling rule matches;
  - the typed form is phonetically equivalent to the target (rule tables);
  - the typed word is a real word or homophone;
  - the *same* wrong form appears on this word in ≥ 2 sessions;
  - the error happened in dictation and was not corrected.
- **motor** if:
  - the type is adjacent / homologous / transposition / repeat / hand-shift / doubling.wrong, **and**
  - (in copy modes) the target was visible, or the user fixed it within 2 keystrokes (fast self-detection, a sign the inner loop caught it).
- **unknown** otherwise.

---

## 5. Algorithm 1: classify a typo (expected word vs typed word)

Inputs: `expected`, `typed` (one word token; whitespace handled at the token level), `lang`, `layout` (key geometry and finger map), optional per-character timings, and language rule hooks.

### 5.1 Keyboard model

```ts
// Geometry in key units; x includes row stagger. US/US-International QWERTY.
type KeyPos = { x: number; y: number; hand: 'L' | 'R'; finger: 0|1|2|3|4; col: number };
const ROWS = [
  { y: 0, x0: 0.0,  keys: '`1234567890-=' },
  { y: 1, x0: 1.5,  keys: 'qwertyuiop[]\\' },
  { y: 2, x0: 1.75, keys: "asdfghjkl;'" },
  { y: 3, x0: 2.25, keys: 'zxcvbnm,./' },
];
// Touch-typing finger map (0 = index ... 3 = pinky; 4 = thumb/space)
const FINGER: Record<string, ['L'|'R', number]> = {
  q:['L',3],a:['L',3],z:['L',3], w:['L',2],s:['L',2],x:['L',2], e:['L',1],d:['L',1],c:['L',1],
  r:['L',0],f:['L',0],v:['L',0],t:['L',0],g:['L',0],b:['L',0],
  y:['R',0],h:['R',0],n:['R',0],u:['R',0],j:['R',0],m:['R',0],
  i:['R',1],k:['R',1],',':['R',1], o:['R',2],l:['R',2],'.':['R',2],
  p:['R',3],';':['R',3],'/':['R',3],"'":['R',3],'[':['R',3],']':['R',3],
};
// Homologous (mirror) pairs around the centre: a↔; s↔l d↔k f↔j g↔h, q↔p w↔o e↔i r↔u t↔y, z↔/ x↔. c↔, v↔m b↔n
const MIRROR: Record<string,string> = Object.fromEntries(
  ['a;','sl','dk','fj','gh','qp','wo','ei','ru','ty','z/','x.','c,','vm','bn']
    .flatMap(([a,b]) => [[a,b],[b,a]]));

const isAdjacent = (a: string, b: string, L: Layout) => {
  const p = L.pos(a), q = L.pos(b); if (!p || !q || a === b) return false;
  return Math.hypot(p.x - q.x, p.y - q.y) <= 1.25;      // 6 neighbours on a staggered grid
};
const shiftNeighbour = (c: string, dx: -1 | 1, L: Layout) => L.at(L.pos(c)!.y, L.pos(c)!.x + dx);
```

Provide layouts for **US-International** (default for NL), **Belgian AZERTY** (optional) and **Arabic 101** (phase 2). Commonly cited Arabic 101 rows, to be verified against the OS layout:
- top: `ض ص ث ق ف غ ع ه خ ح ج د`
- home: `ش س ي ب ل ا ت ن م ك ط`
- bottom: `ئ ء ؤ ر لا ى ة و ز ظ`
- `ذ` on the backtick key

Map typed characters to physical keys via `KeyboardEvent.code` when available. That makes adjacency independent of the active layout.

### 5.2 Alignment (optimal string alignment with backtrace)

```ts
type Op =
  | { k: 'eq';   e: string; t: string; i: number; j: number }
  | { k: 'sub';  e: string; t: string; i: number; j: number }
  | { k: 'ins';  t: string; i: number; j: number }            // extra typed char before expected[i]
  | { k: 'del';  e: string; i: number; j: number }            // expected[i] missing
  | { k: 'swap'; e: string; t: string; i: number; j: number }; // expected[i..i+1] typed reversed

// Keyboard-aware costs make the backtrace prefer physically plausible explanations.
const cost = {
  sub: (e: string, t: string, L: Layout) =>
    e.toLowerCase() === t.toLowerCase() ? 0.3 :            // case
    stripMarks(e) === stripMarks(t) ? 0.3 :               // diacritic
    isAdjacent(e, t, L) ? 0.8 : MIRROR[e] === t ? 0.9 : 1,
  ins: (t: string, prev?: string, next?: string) => (t === prev || t === next) ? 0.7 : 1,
  del: () => 1,
  swap: 0.9,
};

export function align(E: string[], T: string[], L: Layout): Op[] {
  const n = E.length, m = T.length;
  const d = Array.from({ length: n + 1 }, () => new Float64Array(m + 1));
  for (let i = 0; i <= n; i++) d[i][0] = i;
  for (let j = 0; j <= m; j++) d[0][j] = j;
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) {
    const s = E[i-1] === T[j-1] ? 0 : cost.sub(E[i-1], T[j-1], L);
    let v = Math.min(
      d[i-1][j-1] + s,
      d[i-1][j] + cost.del(),
      d[i][j-1] + cost.ins(T[j-1], E[i-1], E[i]),   // inserted between expected[i-1] and expected[i]
    );
    if (i > 1 && j > 1 && E[i-1] === T[j-2] && E[i-2] === T[j-1] && E[i-1] !== E[i-2])
      v = Math.min(v, d[i-2][j-2] + cost.swap);
    d[i][j] = v;
  }
  // Backtrace from (n,m); tie-break order: eq > swap > sub > del > ins
  const ops: Op[] = []; let i = n, j = m; const eps = 1e-9;
  while (i > 0 || j > 0) {
    if (i>0 && j>0 && E[i-1]===T[j-1] && Math.abs(d[i][j]-d[i-1][j-1])<eps) { ops.push({k:'eq',e:E[i-1],t:T[j-1],i:i-1,j:j-1}); i--; j--; continue; }
    if (i>1 && j>1 && E[i-1]===T[j-2] && E[i-2]===T[j-1] && Math.abs(d[i][j]-(d[i-2][j-2]+cost.swap))<eps) { ops.push({k:'swap',e:E[i-2]+E[i-1],t:T[j-2]+T[j-1],i:i-2,j:j-2}); i-=2; j-=2; continue; }
    if (i>0 && j>0 && Math.abs(d[i][j]-(d[i-1][j-1]+cost.sub(E[i-1],T[j-1],L)))<eps) { ops.push({k:'sub',e:E[i-1],t:T[j-1],i:i-1,j:j-1}); i--; j--; continue; }
    if (i>0 && Math.abs(d[i][j]-(d[i-1][j]+cost.del()))<eps) { ops.push({k:'del',e:E[i-1],i:i-1,j}); i--; continue; }
    ops.push({k:'ins',t:T[j-1],i,j:j-1}); j--;
  }
  return ops.reverse();
}
```

Work on **grapheme clusters** (`Intl.Segmenter` with granularity `grapheme`), not UTF-16 code units, so `ë` and Arabic letters with diacritics count as one unit. Normalise both strings to NFC first.

### 5.3 Classification pipeline (order matters)

```ts
export function classifyWord(expected: string, typed: string, ctx: Ctx): Mistake[] {
  const E = graphemes(expected.normalize('NFC')), T = graphemes(typed.normalize('NFC'));
  if (expected === typed) return [];

  // 1. Whole-word patterns first
  if (expected.toLowerCase() === typed.toLowerCase()) return [m('case')];
  if (stripMarks(expected) === stripMarks(typed))      return [diacriticMistake(expected, typed)];
  if (isDeadKeyArtifact(expected, typed))              return [m('deadkey')];
  if (isHandShift(E, T, ctx.layout))                   return [m('handShift', { kind: 'motor' })];

  // 2. Language rules (shared with the grammar/spelling engine) → cognitive
  const rule = ctx.rules[ctx.lang]?.match(expected, typed, ctx.sentence); // e.g. nl.dt, nl.eiij, nl.kofschip
  if (rule) return [m(`spelling.${rule.id}`, { kind: 'cognitive', explanation: rule.explain })];

  // 3. Doubling patterns (before generic ops, which would call them 'sub')
  const cE = collapseDoubles(expected), cT = collapseDoubles(typed);
  if (cE === cT) return [doublingMistake(expected, typed)]; // wrong | missing(del.double) | extra

  // 4. Real word / homophone → probably cognitive or attention slip
  if (ctx.dict.has(typed.toLowerCase())) {
    if (ctx.homophones.areHomophones(expected, typed)) return [m('homophone', { kind: 'cognitive' })];
    if (editDistance(E, T) >= 2) return [m('realWord')];   // e.g. form/from is 1 swap → keep as transposition below
  }

  // 5. Generic edit operations
  const ops = align(E, T, ctx.layout).filter(o => o.k !== 'eq');
  if (ops.length >= 3 || ops.length / Math.max(E.length, 1) > 0.5) return [m('garbled')];
  return ops.map(o => labelOp(o, E, T, ctx));
}

function labelOp(o: Op, E: string[], T: string[], ctx: Ctx): Mistake {
  const L = ctx.layout;
  switch (o.k) {
    case 'swap': {
      const [a, b] = [...o.e];
      return m(L.hand(a) !== L.hand(b) ? 'transposition.crossHand' : 'transposition.sameHand', { kind: 'motor' });
    }
    case 'sub':
      if (isAdjacent(o.e, o.t, L))      return m('sub.adjacent',   { kind: 'motor' });
      if (MIRROR[o.e] === o.t)          return m('sub.homologous', { kind: 'motor' });
      if (L.sameFinger(o.e, o.t))       return m('sub.sameFinger', { kind: 'motor' });
      if (ctx.phonEq[ctx.lang]?.(o.e, o.t, E, o.i)) return m('sub.phonetic', { kind: 'cognitive' }); // c/k, s/z, f/v, d/t...
      return m('sub.other');
    case 'ins': {
      const prev = T[o.j - 1], next = T[o.j + 1];
      if (o.t === ' ')                  return m('ins.space');
      if (o.t === prev || o.t === next) return m('ins.repeat', { kind: 'motor' });
      if ((prev && isAdjacent(o.t, prev, L)) || (next && isAdjacent(o.t, next, L)))
        return m('ins.adjacent', { kind: 'motor', confidence: ctx.iki?.[o.j] !== undefined && ctx.iki[o.j] < 60 ? 'high' : 'med' });
      return m('ins.other');
    }
    case 'del':
      if (o.e === ' ')                                   return m('del.space');
      if (E[o.i - 1] === o.e || E[o.i + 1] === o.e)      return m('del.double');
      return m('del.other');
  }
}
```

Helper rules:
- `collapseDoubles(s)` replaces every run of a repeated letter with a single letter (`book`→`bok`, `bokk`→`bok`). If the collapsed forms are equal, the difference is only in doubling:
  - expected has a double and typed has none → `del.double`;
  - typed has a double and expected has none → `doubling.extra`;
  - both have one double, on different letters → `doubling.wrong`.
  - For Dutch, check `del.double`/`doubling.extra` against the open/closed syllable rule (`kopen`/`koopen`, `praatte`/`prate`, `jullie`/`julie`) to decide motor vs cognitive.
- `isHandShift(E,T)`: requires `E.length === T.length >= 3`, at least 70% of positions mismatched, and every mismatch explained as `T[i] === shiftNeighbour(E[i], dx)` with one `dx ∈ {−1, +1}` per hand (allow one hand shifted and the other correct).
- `isDeadKeyArtifact`: the typed form contains a precomposed accented vowel (`é è ê ë ï ö ü á à`…) where the expected text had the matching ASCII mark followed by a plain vowel (`'e`, `"e`, `` `e ``, `^e`). Or the reverse: a mark followed by a vowel where the expected text had an accented vowel.
- Phonetic-equivalence tables: Dutch `ei/ij`, `au/ou`, `g/ch`, final `d/t`, `c/k`, `s/z`, `f/v`; English `c/s/k`, `ph/f`. These are needed when the alignment shows a 1–2 character substitution inside those groups. Keep the tables in the language module so the grammar engine can reuse them.

### 5.4 Timing-based refinement (optional, from keystroke logs)
- An inserted key less than 60 ms after the previous key means a simultaneous or rolled press, so `ins.adjacent` gets high confidence. This fits the Salthouse phenomenon that intrusions come with short intervals.
- An omission next to a long pause (more than 2× median IKI) suggests the user hesitated or lost their place: lean to `del.other`, and to cognitive if it happens in dictation.
- Self-correction within 2 keystrokes points to a motor error caught by the inner loop. An error left uncorrected in dictation leans cognitive. Rechecking a word long after typing it (going back) also leans cognitive (Conijn et al.: timing of production and correction differs).

### 5.5 Mapping errors back to keys (for §6)
For each non-`eq` op, record attribution events:
- **sub(e→t):** key `e` gets an error; bigram `E[i-1]E[i]` gets an error; confusion matrix entry `[e][t]++`.
- **del(e):** key `e` gets an error (omitted); bigram `E[i-1]E[i]` gets an error.
- **ins(t) before E[i]:** charge the bigram `E[i-1]E[i]` it intruded into (the user failed to go cleanly from one to the other). Optionally key `E[i]` with weight 0.5.
- **swap(ab):** bigram `ab` gets an error, and keys `a` and `b` each get 0.5.
- **cognitive (spelling/homophone/realWord):** **do not** charge keys or bigrams. Send the word to the Leitner bank instead. Mixing these would make the motor statistics blame fingers for spelling knowledge.

---

## 6. Algorithm 2: per-key and per-bigram weakness scores

### 6.1 Raw events
Store one event per **first attempt** at each target character in copy and drill modes:

```ts
type KeyEvent = {
  t: number;              // epoch ms
  session: string;
  lang: 'nl' | 'en' | 'ar';
  mode: 'drill' | 'text' | 'dictee' | 'free';
  expected: string;       // grapheme expected at this position
  prev: string | null;    // previous expected grapheme (null at word start; ' ' allowed)
  typed: string;          // first grapheme typed at this position
  correct: boolean;       // first attempt correct?
  iki: number | null;     // ms since previous keydown (null for first key / after pause > 2 s)
  code?: string;          // KeyboardEvent.code for layout-independent geometry
};
```

### 6.2 Per-session aggregation (keybr-style)
For each key (and each bigram `prev+expected`), compute per session:
- `n` = attempts
- `e` = first-attempt errors
- `mLat` = mean IKI over *correct* attempts, discarding IKI < 40 ms or > 2,000 ms (keybr discards < 40 ms and > 12 s; 2 s is tighter to skip pauses)

### 6.3 Long-term state per key / bigram

```ts
type Stat = {
  nW: number;           // time-decayed attempts
  eW: number;           // time-decayed errors
  latEma: number|null;  // EMA over sessions of mLat (alpha = 0.1, keybr)
  latBest: number|null; // min EMA ever (keybr bestTimeToType)
  lastSeen: number;     // epoch ms
  samples: number;      // undecayed attempts (for gating)
};

const HALF_LIFE_DAYS = 14;           // older behaviour fades
const decay = (dtMs: number) => Math.pow(0.5, dtMs / (HALF_LIFE_DAYS * 864e5));

function updateStat(s: Stat, sess: { n: number; e: number; mLat: number|null; t: number }) {
  const f = decay(sess.t - s.lastSeen);
  s.nW = s.nW * f + sess.n;
  s.eW = s.eW * f + sess.e;
  if (sess.mLat != null) {
    s.latEma = s.latEma == null ? sess.mLat : 0.1 * sess.mLat + 0.9 * s.latEma;
    s.latBest = Math.min(s.latBest ?? Infinity, s.latEma);
  }
  s.samples += sess.n; s.lastSeen = sess.t;
}
```

### 6.4 Scores

```ts
// Bayesian-shrunk error rate: few samples → pulled to the user's global rate p0
function errRate(s: Stat, p0: number, m = 10) { return (s.eW + m * p0) / (s.nW + m); }

// Wilson lower bound on the error rate (95%): "are we SURE this key is bad?"
function wilsonLower(e: number, n: number, z = 1.96) {
  if (n === 0) return 0;
  const p = e / n, d = 1 + z*z/n;
  return (p + z*z/(2*n) - z * Math.sqrt(p*(1-p)/n + z*z/(4*n*n))) / d;
}

// Expected latency by bigram type (Gentner-style normalisation), learned per user:
//   class = 'alt' (two hands) | 'sameHand' | 'sameFingerRepeat' | 'sameFingerReach'
//   expLat[class] = user's median correct IKI for that class (fallback ratios 1 : 1.15 : 1.38 : 1.65)
function latencyRatio(bigram: string, s: Stat, expLat: Record<BigramClass, number>) {
  return s.latEma == null ? 1 : s.latEma / expLat[bigramClass(bigram)];
}

type Weak = { id: string; weakness: number; priority: number; isWeak: boolean };

function keyWeakness(id: string, s: Stat, u: UserModel, langFreq: number /*0..1*/): Weak {
  const er    = errRate(s, u.p0);
  const errN  = Math.min(er / u.errTarget, 3) / 3;                       // 0..1, 1 = 3× target
  const conf  = s.latEma == null ? 1 : u.targetMsPerChar / s.latEma;    // keybr confidence (>=1 = at target)
  const lat   = conf >= 1 ? 0 : Math.min((1 / conf - 1) / 0.5, 1);        // 0..1; 1 = 50 % slower than target
  const stale = Math.min((Date.now() - s.lastSeen) / (7 * 864e5), 1);    // unpractised for a week → 1
  const weakness = 0.65 * errN + 0.25 * lat + 0.10 * stale;               // accuracy-heavy for this user
  const priority = weakness * (0.5 + 0.5 * Math.sqrt(langFreq));          // common letters matter more
  const isWeak = s.samples >= 20 && wilsonLower(s.eW, s.nW) > u.errTarget; // statistically confident
  return { id, weakness, priority, isWeak };
}
```

Settings:
- `u.errTarget` = 0.03 (97% target accuracy; adjustable).
- `u.p0` = the user's overall first-attempt error rate over the last 14 days.
- `u.targetMsPerChar = 60000 / targetCPM` (keybr default 175 CPM ≈ 343 ms; for this user start at the measured median, raised over time).
- **Bigram weakness:** same formula, using `latencyRatio` instead of the raw target, `m = 5`, `samples ≥ 8`, and `langFreq` = bigram frequency in the active language.
- Also keep the **confusion matrix** (expected→typed counts) per language. Its top pairs (e.g. `d→s`, `ij→y`) feed the explanations ("you often hit **s** when you mean **d**") and the proofreading generator.
- Compute **per language**. Dutch, English and Arabic weaknesses differ (different letters, bigrams and layouts).

### 6.5 Why this design
- **Shrinkage plus the Wilson gate** handles West's warning that many errors are noise: a key is "weak" only when the evidence says so.
- **EMA α = 0.1 and best-ever latency** are keybr's proven choices.
- **Normalising latency by bigram class** stops same-finger bigrams from always looking "slow" (Gentner timings).
- **Weighting by frequency** focuses effort where it pays off most in real Dutch text.

---

## 7. Algorithm 3: generate targeted drills from weaknesses

### 7.1 Inputs
- Weakness lists for keys and bigrams (§6) per language.
- A word list with frequencies for the language (Dutch first). Filter to words the user is likely to know (top 5–10k). Optionally use a sentence corpus for sentence drills.
- The Leitner bank: words due today.
- Settings: lesson length, mode, unlocked letters (only for the "learn touch typing" track).

### 7.2 Target selection

```ts
function pickTargets(keys: Weak[], bigrams: Weak[]) {
  const k = keys.filter(x => x.isWeak).sort((a,b) => b.priority - a.priority);
  const g = bigrams.filter(x => x.isWeak).sort((a,b) => b.priority - a.priority);
  return {
    focusKey: k[0]?.id ?? null,           // keybr: exactly one focused key
    supportKeys: k.slice(1, 3).map(x => x.id),
    bigrams: g.slice(0, 3).map(x => x.id),
  };
}
```

If nothing is confidently weak yet (new user), run a **diagnostic** of about 2 minutes: varied real Dutch text covering all letters and the top 100 bigrams. Use it to seed `p0`, latencies and weaknesses.

### 7.3 Word scoring and sampling

```ts
function scoreWord(w: string, T: Targets, W: WeakMaps, freqRank: number): number {
  let s = 0;
  const g = graphemes(w);
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === T.focusKey) s += 3 * W.key[c].priority;
    else if (T.supportKeys.includes(c)) s += 1.5 * W.key[c].priority;
    if (i > 0) { const bg = g[i-1] + c; if (T.bigrams.includes(bg)) s += 2.5 * W.bigram[bg].priority; }
  }
  if (s === 0) return 0;                                   // must contain at least one target
  const freqBonus = 1 / Math.log2(2 + freqRank);           // prefer common words
  const lenPenalty = g.length > 10 ? 0.7 : 1;              // keep it typable
  return s * (0.6 + 0.4 * freqBonus) * lenPenalty;
}

function sample<T>(items: T[], weight: (x: T) => number, k: number, rng: () => number, temp = 0.7): T[] {
  // softmax-ish weighted sampling without replacement; temp < 1 sharpens toward the highest scores
  const pool = items.map(x => ({ x, w: Math.pow(Math.max(weight(x), 1e-9), 1 / temp) }));
  const out: T[] = [];
  while (out.length < k && pool.length) {
    const total = pool.reduce((a, p) => a + p.w, 0); let r = rng() * total, idx = 0;
    while ((r -= pool[idx].w) > 0 && idx < pool.length - 1) idx++;
    out.push(pool.splice(idx, 1)[0].x);
  }
  return out;
}
```

### 7.4 Composing a lesson (interleaved)

```ts
function buildDrill(opts: { words: number; lang: Lang }, ctx: DrillCtx): string[] {
  const T = pickTargets(ctx.keys, ctx.bigrams);
  const nTarget = Math.round(opts.words * 0.60);
  const nReview = Math.min(ctx.dueWords.length, Math.round(opts.words * 0.15));
  const nFiller = opts.words - nTarget - nReview;

  const targetWords = sample(ctx.lexicon, w => scoreWord(w.text, T, ctx.weak, w.rank), nTarget, ctx.rng).map(w => w.text);
  const reviewWords = ctx.dueWords.slice(0, nReview);                       // Leitner due (cognitive errors)
  const fillerWords = sample(ctx.lexicon.slice(0, 300), () => 1, nFiller, ctx.rng).map(w => w.text);

  // Interleave: never 2 review words adjacent, avoid immediate repeats, spread focus words evenly
  return interleave([targetWords, fillerWords, reviewWords], ctx.rng);
}
```

### 7.5 Drill types built from the same machinery

| Drill | When | Content | Pass rule |
|---|---|---|---|
| **Warm-up (blocked)** | Start of session, 30–45 s | ngram-type style: the top 2–3 weak bigrams embedded in short real words, `Repetition=3`, `Combination=3` | accuracy ≥ 97% |
| **Focus drill (interleaved)** | Core, 2–3 × 60 s | §7.4 lines; pace caret at 90% of recent WPM; stop-on-letter optional | accuracy ≥ 97% and WPM ≥ 0.85× recent; 3 passes → raise target speed by 5% |
| **Word repair** | Right after a block with errors | Each mistyped word (motor) ×3 in a mini-line, correct-first-time required | 3/3 correct |
| **Dictee** | 3–5 min | TTS sentences rich in the user's spelling-rule weaknesses (dt with distance/dominance variation, ei/ij, compounds) | per-word hint ladder; misses → Leitner |
| **Leitner review** | 1–3 min | Due words via Cover-Copy-Compare: show (highlight the tricky segment) → hide → type → diff | correct → next box |
| **Bigram gym** | Optional | ngram-type progression on the weakest frequent bigrams | 100% accuracy at the threshold WPM |
| **Spot the typo** | Weekly / optional | Text with injected errors from the user's confusion matrix, rendered in a different font | find ≥ 80%; always end on the correct text |
| **Free write** | Optional 3–10 min | Prompt (story/essay); rule and grammar checker runs at sentence end; self-review with font switch and TTS read-back | n/a (counts cognitive errors) |
| **Challenges** | Weekly | No-backspace, sudden death ("Polly's perch"), "Groot Dictee" | streak / score |

### 7.6 Fallbacks and guards
- If fewer than 15 real words match the targets (keybr's threshold), widen the targets (drop the support keys), then fall back to a letter-transition pseudo-word generator trained on the word list. Pseudo-words should be a last resort.
- Never show the same word more than twice per minute of text. Cap target density so lines read naturally.
- Respect unlocked letters only in the "learn touch typing" track. The normal practice track uses the full alphabet.

---

## 8. Recommended practice plan for this user

**Daily, about 15 minutes ("Polly's daily flight"):**
1. Diagnostic on day 1, then every 2 weeks: 2 min of mixed Dutch text.
2. Warm-up: 45 s blocked weak-bigram line.
3. Focus drills: 3 × 60 s interleaved, with 15 s parrot breaks. Then word repair.
4. Dictee: 4 Dutch sentences targeting the current spelling rule (rotate dt → ei/ij → compounds → open/closed syllable).
5. Leitner review: due words.
6. Results card: accuracy (headline), WPM, top 3 error types with examples, one tip, streak.

**Also:**
- **2–3× per week:** a 5 min free-write in Dutch (or English) from a prompt, with delayed rule and grammar feedback and a self-review step.
- **Weekly:** "Groot Dictee" (5 min) plus one challenge (no-backspace or sudden death).
- **Language rotation:** Dutch 70%, English 30% in phase 1. Arabic is a separate track in phase 2 with its own layout, stats and rules (hamza, ta marbuta, alif maqsura).

**Progress rules:**
- Accuracy target 97% in focus drills.
- Target WPM rises by 5% after 3 passing blocks.
- Accuracy below 92% for 2 blocks → pace caret drops by 10% and the parrot suggests "slow is smooth, smooth is fast".
- Rolling error rate above 1.5× the session's first block → suggest a break or end the session.

---

## 9. Implementation notes for input capture

- Compare characters from `beforeinput`/`input` events (`inputType` = `insertText`, `deleteContentBackward`; `data`) and from composition events. **Dead keys** (US-Intl `'` `"` `` ` `` `^` `~`) fire `keydown` with `key === "Dead"` and finish as a composition. Don't treat the dead key itself as a typed character. Wait for the composed result (`compositionend`), so `"` + `e` → `ë` is one typed grapheme.
- Record `KeyboardEvent.code` (physical key) alongside the produced character, for layout-independent adjacency and finger stats.
- Use `performance.now()` for inter-key intervals. Mark IKI as null after pauses over 2 s (AFK), as Monkeytype's AFK detection does.
- Storage: keystroke events can be large, so aggregate per session into the §6 stats and keep raw events for only the last ~30 sessions. Keep Leitner cards and stats in IndexedDB, with localStorage only for preferences.
- Arabic (phase 2): typing direction is RTL, but the comparison is still logical order. Normalise optional diacritics (harakat) out of comparison unless the drill targets them. Treat `لا` as a single key output on Arabic 101.

---

## 10. Uncertainties and open questions

- **Exact error-type percentages** from Grudin (1983) and Salthouse (1986) could not be retrieved (hosts blocked). The qualitative statements (adjacent and homologous substitutions; cross-hand transpositions; short-interval intrusions; long-interval omissions) are well supported. **Don't hard-code proportions; learn them from the user.**
- **West's conclusions** (nonsense drills less effective; error-specific remediation mostly unsuccessful; weak support for stroke-pacing rhythm drills) come from secondary excerpts of his ERIC research summaries.
- **Micro-offline gains** are contested (2025 critique). The short-rest recommendation stands on fatigue and spacing evidence anyway.
- **Accuracy-first** is strong consensus and fits the cost argument, but historical controlled comparisons are mixed. The accuracy *gating* design is a reasonable engineering choice, not a settled law.
- **Dictation's effect on spelling** is less well tested than its diagnostic value. Dutch dictee is a cultural fit and strongly motivating.
- Some numbers from Dhakal et al. (2018), such as error rates, could only be checked through abstracts. Only the 51.56 WPM mean and the qualitative findings are used here.
- The Arabic 101 key positions should be checked against the actual OS layout during phase 2.

---

## Sources

**Typing cognition and errors**
- Salthouse (1986), *Perceptual, cognitive, and motoric aspects of transcription typing*, Psychological Bulletin 99(3): https://uva.theopenscholar.com/vcap/publications/perceptual-cognitive-and-motoric-aspects-transcription-typing ; PDF mirror: https://www.researchgate.net/profile/Timothy_Salthouse/publication/19446858_Perceptual_Cognitive_and_Motoric_Aspects_of_Transcription_Typing/links/0c9605374d141d8cf1000000/Perceptual-Cognitive-and-Motoric-Aspects-of-Transcription-Typing.pdf ; summary: https://paperguide.ai/papers/046317b9-32a0-4bf6-9063-800d439fbd2c/
- Wu & Liu (2008), *Queuing Network Modeling of Transcription Typing* (Salthouse phenomena list): https://researchgate.net/publication/220286265_Queuing_Network_Modeling_of_Transcription_Typing
- Grudin (1983/84), *Error patterns in novice and skilled transcription typing*, in Cooper (ed.) *Cognitive Aspects of Skilled Typewriting*: https://link.springer.com/chapter/10.1007/978-1-4612-5470-6_6 ; https://gwern.net/doc/design/typography/1983-grudin.pdf (blocked; cited via search)
- Rumelhart & Norman (1982), *Simulating a skilled typist*: https://api.philpapers.org/rec/RUMSAS ; https://escholarship.org/uc/item/24s6s4mk
- Logan & Crump (2010), *Cognitive illusions of authorship reveal hierarchical error detection in skilled typists*, Science: https://archive.memory-key.com/research/news/typing-test-reveals-two-processes-error-detection?page=1 ; https://www.nationalgeographic.com/science/article/two-ways-of-spotting-mistakes-while-typing
- Logan & Crump (2011), *Hierarchical control of cognitive processes: the case for skilled typewriting*: https://www.crumplab.com/publications/Crump/files/3898/Logan%20and%20Crump%20-%202011%20-%20Hierarchical%20control%20of%20cognitive%20processes%20The%20c.pdf
- Logan & Crump (2009), *The left hand doesn't know what the right hand is doing*: https://www.psychologicalscience.org/journals/psychological-science/j.1467-9280.2009.02442.x/
- Crump & Logan (2010), *Hierarchical control and skilled typing: evidence for word-level control*: https://www.researchgate.net/publication/47335029_Hierarchical_Control_and_Skilled_Typing_Evidence_for_Word-Level_Control_Over_the_Execution_of_Individual_Keystrokes
- Crump & Logan (2013), *Prevention and correction in post-error performance*: https://www.crumplab.com/publications/Crump/files/4683/Crump%20and%20Logan%20-%202013%20-%20Prevention%20and%20correction%20in%20post-error%20performanc.pdf
- Yamaguchi & Logan (2014), *Pushing typists back on the learning curve*: https://research.edgehill.ac.uk/en/publications/pushing-typists-back-on-the-learning-curve-contributions-of-multi-2/
- Behmer & Crump (2017), *Crunching big data with fingertips*: https://bibbase.org/network/publication/behmer-crump-crunchingbigdatawithfingertipshowtypiststunetheirperformancetowardsthestatisticsofnaturallanguage-2017 ; data: https://crumplab.com/EntropyTyping/reference/the_data.html
- Pinet & Nozari (2018), *"Twisting fingers": the case for interactivity in typed language production*: https://www.cmu.edu/dietrich/psychology/nozarilab/papers/2018PinetNozari.pdf
- Gentner et al. digraph timing (via patent summary): https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/4824268
- Dhakal, Feit, Kristensson & Oulasvirta (2018), *Observations on typing from 136 million keystrokes*: https://userinterfaces.aalto.fi/136Mkeystrokes/ ; https://dl.acm.org/doi/10.1145/3173574.3174220 ; https://www.cam.ac.uk/research/news/what-makes-a-faster-typist
- Feit, Weir & Oulasvirta (2016), *How we type*: https://userinterfaces.aalto.fi/how-we-type/ ; https://www.i-programmer.info/news/99-professional/9427-you-dont-need-to-touch-type-to-go-fast.html
- *The Typability Index* (Behavior Research Methods): https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12901113/ ; https://link.springer.com/article/10.3758/s13428-025-02877-y
- Typing and mental fatigue: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7537853/ ; https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6049040/
- Hand-position shift errors (patents): https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/6560559 ; https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/8639494 ; https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/5535119
- *Does the typing task matter?* (copy vs dictation, 2025): https://cris.huji.ac.il/en/publications/does-the-typing-task-matter-typing-performance-of-university-stud/

**Spelling errors and their classification**
- Damerau (1964), via Damerau–Levenshtein distance: https://en.wikipedia.org/wiki/Damerau%E2%80%93Levenshtein_distance ; https://web.stanford.edu/~jurafsky/slp3/slides/6_Spell.pdf
- Kukich (1992), *Techniques for automatically correcting words in text*: https://pubs.dbs.uni-leipzig.de/dc/files/Kukich1992Techniqueforautomatically.pdf
- Conijn, Van Waes & van Zaanen, *Typoo or orthographic error?* (Dutch keystroke logs, CLIN29): https://www.let.rug.nl/clin29/Rianne_Conijn_Luuk_van_Waes_Menno_van_Zaanen.php ; https://research.tilburguniversity.edu/en/publications/typoo-or-orthographic-error-automatic-classification-of-typograph/
- Soukoreff & MacKenzie (2003), *Metrics for text entry research*: https://www.yorku.ca/mack/chi03.html ; https://www.yorku.ca/mack/nordichi2002-shortpaper.html
- Wobbrock & Myers (2006), *Analyzing the input stream for character-level errors*: https://faculty.washington.edu/wobbrock/pubs/text-07.pdf
- Kano, Read, Dix & MacKenzie (2007), *ExpECT*: https://alandix.com/academic/papers/HCI2007-ExpECT ; https://www.yorku.ca/mack/bhci2007.pdf

**Learning science**
- Baddeley & Longman (1978), *The influence of length and frequency of training session on the rate of learning to type*: https://www.learningscientists.org/blog/2018/11/15-1 ; https://en.wikipedia.org/wiki/Distributed_practice
- Bönstrup et al. (2019/2020), micro-offline gains: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7272649/ ; https://neurosciencenews.com/rest-learning-memory-11073/ ; critique: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12595466/
- Shea & Morgan (1979), contextual interference: https://Www.Gwern.net/doc/psychology/spaced-repetition/1979-shea.pdf (via search) ; https://concepts.dsebastien.net/concept/contextual-interference/
- Salmoni, Schmidt & Walter (1984), guidance hypothesis: https://pmc.ncbi.nlm.nih.gov/articles/PMC4893479 ; https://experts.nau.edu/en/publications/effects-of-physical-guidance-and-knowledge-of-results-on-motor-le/
- Metcalfe (2017), *Learning from errors*: https://annualreviews.org/doi/abs/10.1146/annurev-psych-010416-044022 ; https://wesleyan.edu/ofcd/resources/OFCD%20Resource%20Docs/Learning%20from%20Errors.pdf
- Immediate vs delayed error correction: https://behavioristbookclub.com/aba-research/aba-fundamentals/effects-of-immediate-and-delayed-error-correction-on-the-acquisition-a/ ; https://hausman.sites.ucsc.edu/files/2023/11/Gonzalez-Feedback-Warning_both-sides.pdf
- Direct vs indirect corrective feedback on spelling: https://revistas.unal.edu.co/index.php/profile/article/view/20572
- Dixon & Kaminska / Dixon (1997), exposure to misspellings: https://openaccess.city.ac.uk/id/eprint/30780/
- Testing effect and spelling: https://www.frontiersin.org/journals/developmental-psychology/articles/10.3389/fdpys.2023.1270938/full ; https://journalofcognition.org/articles/82
- Cover-Copy-Compare meta-analysis (Joseph et al. 2012): https://winthrop.edu/uploadedFiles/ceshs/edco/module/202-610-cover-copy-compare.pdf
- Leitner system: https://en.wikipedia.org/wiki/Leitner_system ; https://supermemo.guru/wiki/Leitner
- SM-2: https://www-v1.supermemo.com/archives1990-2015/english/ol/sm2
- Keith & Ericsson (2007), deliberate practice in typing: https://www.humanw.tu-darmstadt.de/media/orgpsy/keithericsson2007_preprint.pdf
- Handwriting vs typing for spelling (Cunningham & Stanovich 1990; Ouellette & Tims 2014): https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2014.00117/pdf
- Proofreading: https://www.eugenewei.com/blog/2014/8/27/why-we-dont-catch-our-own-typos ; https://www.psychologytoday.com/us/blog/your-future-self/202204/a-simple-and-effective-cognitive-method-to-catch-typos-and-other ; https://link.springer.com/article/10.1007/s00426-022-01699-3 ; https://www.mcn.aac-learning-center.org/dbm/McN%20publications/McN_InSPECT_97.pdf
- Dictation in language learning: https://www.redalyc.org/pdf/666/66633023004.pdf ; https://vjol.info.vn/tctbgd/en/article/view/104378

**Typewriting-education history**
- Leonard J. West research summaries (ERIC): https://files.eric.ed.gov/fulltext/ED107884.pdf ; https://files.eric.ed.gov/fulltext/ED018630.pdf
- Speed vs accuracy emphasis (Boston University thesis): https://open.bu.edu/server/api/core/bitstreams/a055ff4e-346e-40c5-ae35-799483c110e5/content ; https://www.typing.com/blog/whats-important-typing-speed-accuracy-emphasize-students/

**Tools, read from source code**
- keybr.com source (guided lesson, confidence, key stats, EMA filter, histogram validation, accuracy streaks, learning rate): https://github.com/aradzie/keybr.com (files `packages/keybr-lesson/lib/guided.ts`, `key.ts`, `target.ts`, `learningrate.ts`, `settings.ts`; `packages/keybr-result/lib/keystats.ts`, `accuracy.ts`; `packages/keybr-textinput/lib/histogram.ts`, `stats.ts`; `packages/keybr-math/lib/filter.ts`) ; README: https://cdn.jsdelivr.net/gh/aradzie/keybr.com@master/README.md
- Monkeytype source (WPM, accuracy, consistency/kogasa, stopOnError, confidenceMode, difficulty expert/master, indicateTypos): https://github.com/monkeytypegame/monkeytype (files `frontend/src/ts/utils/numbers.ts`, `packages/util/src/numbers.ts`, `frontend/src/ts/test/test-logic.ts`, `frontend/src/ts/test/events/stats.ts`, `packages/schemas/src/configs.ts`, `frontend/src/ts/input/helpers/fail-or-finish.ts`) ; FAQ summary: https://www.mintlify.com/monkeytypegame/monkeytype/community/faq ; https://monkeytype.com/about
- ngram-type (defaults: scope 50, combination 2, repetition 3, min 40 WPM, 100% accuracy): https://github.com/ranelpadon/ngram-type
- Keystrike typing pedagogy wiki (keybr-like variant with accuracy factor): https://github.com/egno/keystrike/wiki/Typing-Pedagogy

**Dutch, English and Arabic spelling**
- Sandra, Frisson & Daems (1999), *Why simple verb forms can be so difficult to spell*: https://medialibrary.uantwerpen.be/oldcontent/container5831/files/simple_verb_forms.pdf
- Dutch verb-error materials (Antwerp): https://medialibrary.uantwerpen.be/oldcontent/container5831/files/werkwoordfouten.pdf
- Dutch spelling errors overview (DBNL): https://www.dbnl.org/tekst/dona001dutc02_01/dona001dutc02_01_0007.php
- dt-rule and 't kofschip: https://www.webwoordenboek.nl/kenniscentrum/wat-is-de-regel-van-dt ; https://webwoordenboek.nl/kenniscentrum/wat-zijn-de-regels-voor-werkwoordspelling
- Groot Dictee der Nederlandse Taal: https://en.wikipedia.org/wiki/Grand_Dictation_of_the_Dutch_Language ; https://dbnl.org/tekst/_taa014199301_01/_taa014199301_01_0031.php ; history of the dictee (Dodde 1995): https://research-portal.uu.nl/en/publications/een-geschiedenis-van-het-dictee/ ; PI-dictee: https://boom.nl/primair-onderwijs/artikelen/80-4174_Alles-wat-je-moet-weten-over-het-PI-dictee
- Dutch bigram frequencies: https://en.wikipedia.org/wiki/Bigram
- Keyboard layouts in NL/BE (US-International, AZERTY, dead keys): https://www.eui.eu/ServicesAndAdmin/ComputingService/ITResources/MultiLanguageFeatures ; https://archives.miloush.net/michkap/archive/2012/05/23/10308554.140730.html ; https://www.sbsupply.eu/qwerty-international
- Arabic spelling errors (hamza, ta marbuta): https://mahdi.edu.sd/en/journal/1/issues/15/topic/5 ; https://learn.microsoft.com/en-us/archive/blogs/robmar/download-maren-speller-high-accuracy-arabic-spell-checker-tool-for-windows-8 ; https://preview.aclanthology.org/author-url/W14-3616.pdf ; Arabic keyboard: https://www.madinaharabic.com/keyboard-instructions.html
