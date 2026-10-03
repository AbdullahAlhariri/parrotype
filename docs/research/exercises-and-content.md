# Exercises and content for Parrotype: what to type, which modes to build, and a first content pack

> Research for **Parrotype** (repo `parrotype`): a static Vite + TypeScript typing trainer, deployed to Vercel, with a parrot mascot and a Monkeytype-style minimal look.
> **Reader:** the engineers building the modes and the content pipeline.
> **The user:** one person who makes many typos and spelling/grammar mistakes in **Dutch (priority)** and English, with Arabic coming in phase 2.
> **Companion docs:** [`typing-pedagogy.md`](./typing-pedagogy.md) covers metrics, the typo classifier and weakness scores. [`dutch-errors.md`](./dutch-errors.md) covers the Dutch rule engine and word lists. This document builds on both and does not repeat them.
> **Scope:** (1) what comparable apps do, and which parts work or get criticised; (2) a full set of Parrotype modes, with rationale, mechanics and priorities; (3) a gamification and tone system that is playful without being childish; (4) **original, verified content ready to ship**: writing prompts, dictation sentences, stories, quotes, proofreading texts and grammar drills, as tables and as JSON.
> **Evidence labels:** **[Strong]** replicated research or primary data; **[Moderate]** single studies or consistent practitioner evidence; **[Design]** my judgement, flagged as such.

---

## 0. TL;DR for engineers

1. **Build in this order** (see §6): **Classic test** (it is the shell everything else reuses) → **Parrot Says dictation** → **Mistake nest (spaced repetition) + Weak spots** → **Grammar gym** → **Free write with report** → **Fix-it** → **Story mode** → **Daily flight / streak** → **Pip's Catch mini-game**.
   - Dictation and the Mistake nest give this user the most benefit per minute. They are the only modes that test spelling *from memory*: copy-typing shows the answer on screen.
2. **Accuracy first, everywhere.**
   - XP is zero below 85% accuracy and grows steeply above it (§7.1).
   - There are no "hearts" or "energy" that punish mistakes in normal practice. Duolingo's switch from hearts to energy (tested from July 2025) drew a strong backlash ([fandom wiki](https://duolingo.fandom.com/wiki/Energy), [Android Authority](https://www.androidauthority.com/quitting-duolingo-energy-system-3599842/)).
   - Sudden death is an opt-in challenge only.
3. **Make streaks forgiving.**
   - Broken streaks make people quit, and the ability to repair a streak softens that effect (Silverman & Barasch, *J. Consumer Research* 2023, [UDSpace](https://udspace.udel.edu/handle/19716/34160)).
   - So: a weekly goal is primary, the daily streak is secondary, there are 2 automatic "rest perches" (freezes) per week, and a broken streak can be earned back within 48 h (§7.2).
4. **The user only ever types correct text, except in Fix-it.**
   - Seeing misspellings can damage your own spelling (Brown 1988; see §3).
   - So stories, quotes, dictation targets and drills are 100% correct.
   - Fix-it keeps the error density low and always ends with the user typing the corrected text.
5. **Content is original or verified public domain.**
   - Don't copy Monkeytype's lists: they are GPL-3.0, and **18 of its 69 Dutch quotes** draw LanguageTool flags, among them old spelling (`den`, `zeide`, `der`). The list also quotes authors still in copyright (Mulisch, Reve, W.F. Hermans, Wolkers, Claus, Brusselmans). One Dutch quote even contains a comparison error (`twee keer zoveel … dan` should be `als`) that LanguageTool does not catch.
   - Public-domain Dutch prose from before 1947 uses abolished spelling (`mensch`, `visch`), so it must never be a typing target unless modernised (§8.2).
6. **The content pack in §10–§15 is verified by script and by hand:**
   - **Dutch:** every token is in the OpenTaal word list (Taalunie "Keurmerk Spelling"), and LanguageTool 6.8 raises no real errors (only known false positives, listed in §16).
   - **English:** written to be valid in both British and American English, and checked with LanguageTool `en-GB` and `en-US`.
   - **Quotes:** 32 of 34 checked word for word against the Project Gutenberg source text; the other 2 (Franklin, Wilcox) against secondary sources.
   - **Arabic:** needs a native-speaker review before release (§17).
7. **LanguageTool is a second opinion, not the engine.** On the 60 planted mistakes in the Fix-it texts, local LanguageTool 6.8 (open-source rules) caught **16/20 Dutch, 14/22 English and 12/18 Arabic**.
   - It **missed** `antwoord` for *antwoordt*, `die` for *dat* after a het-noun, `ouder als`, `tand arts`, *Their going*, *Your welcome*, *it's tail*, `less` for *fewer*, `سال` for *سأل*, and others (§16.2).
   - Those are exactly the cases the custom rule engine has to own.

---

## 1. What this user needs (design targets)

| Need | Evidence / source | Mode(s) that address it |
|---|---|---|
| Fewer **motor typos** (transpositions, adjacent keys, doubled letters) | Typo classes in `typing-pedagogy.md` §1.3 and §4 | Classic, Weak spots (key/bigram drills), Story |
| Fewer **cognitive spelling errors** in Dutch: d/t, ei/ij, trema, apostrophes, compounds, de/het | `dutch-errors.md` §1 and §3 | Parrot Says, Grammar gym, Mistake nest, Fix-it |
| Not writing the **more frequent homophone under time pressure** (*wordt* where *word* is needed) | Sandra, Frisson & Daems: dominance effect under working-memory load ([HSN bundel](https://hsnbundels.taalunie.org/wp-content/uploads/2019/09/2017_XII_taal-en-letterkunde_3_Sandra.pdf)) | Parrot Says *Memory* level, Grammar gym at speed, Pip's Catch |
| **Transfer** to real writing (emails, messages) | Error-correction research: feedback plus active revision helps ([Van Beuningen et al., UvA](https://dare.uva.nl/id/d195ffca-61d9-4ee7-b36a-32130f65c885)) | Free write + report, Fix-it |
| **Cross-language interference** (nl↔en): lowercase *monday*, *I follow a course since*, *sympathetic* used for "nice", *adres/address* | Learner-error literature in `dutch-errors.md` §1; [Design] for the cognate list | Grammar gym "Cognate clash" pack, Fix-it en-f3 |
| **Arabic orthography** (phase 2): hamza seats, hamzat wasl/qat', ة/ه, ى/ي, ض/ظ | Arabic error studies: hamza is the most frequent error, then taa marbuta, then alif maqsura ([QOU journal](https://journals.qou.edu/index.php/jrresstudy/article/view/918), [Mahdi Univ.](https://mahdi.edu.sd/en/journal/1/issues/15/topic/5)) | Parrot Says (ar), Grammar gym (ar), Fix-it (ar) |
| **Keeping going for months** with one user and no social graph | Gamification meta-analysis and SDT (§3) | Daily flight, feathers, ghost-of-yourself racing |

---

## 2. What existing apps teach us

### 2.1 Duolingo (gamified language learning)

| Mechanic | What works | What is criticised | Parrotype decision |
|---|---|---|---|
| **Streaks** | Streak experiments are among Duolingo's strongest retention levers.<br>• A streak-goal choice right after a new streak improved retention even though the chosen value was not used ([lazyweb write-up](https://lazyweb.com/research/duolingo-streak-goals-retention), from Duolingo's [own blog post](https://blog.duolingo.com/improving-the-streak)).<br>• The "Weekend Amulet" streak freeze made users **4% more likely to return a week later** and cut streak loss by **5%** ([Duolingo fan wiki](https://duolingo.fandom.com/wiki/Shop/Streak_freeze); secondary source, treat as approximate). | • "Streak creep": users protect the number rather than learn, and burn out ([The Decision Lab](https://thedecisionlab.com/insights/consumer-insights/streak-creep-the-perils-of-too-much-gamification)).<br>• **[Strong]** In 7 studies, intact logged streaks raised later engagement, while *broken* streaks lowered it. The effect is stronger when people blame themselves and **weaker when the streak can be repaired** (Silverman & Barasch 2023, *JCR* 49(6):1095–1117, [UDSpace](https://udspace.udel.edu/handle/19716/34160), [CU Boulder summary](https://www.colorado.edu/business/news/2023/04/20/research-streaks-marketing-tech-barasch)). | Weekly goal first. Freezes are automatic and free. Earn-back repair. Copy blames circumstances, not the user ("Life happened. Pip kept your perch warm.") |
| **XP + leagues** | Visible progress | XP farming: people repeat easy lessons to climb leagues ([Kotaku](https://kotaku.com/duolingo-app-cheats-hacks-leagues-xp-why-duohacker-1850506482), [newsletter essay](https://linksiwouldgchatyou.substack.com/p/when-gamification-goes-too-far)). There is also an academic case study of gamification misuse in a language app ([arXiv 2203.16175](https://ar5iv.labs.arxiv.org/html/2203.16175)). | XP is weighted by accuracy and difficulty, with **diminishing returns on repeats** (§7.1). No leagues: with one user, the rival is your past self (ghost). |
| **Hearts → Energy** | Hearts made mistakes feel costly, which *can* increase care | Energy (tested from July 2025: 25 units a day, 1 unit used even for a correct answer) is widely called a cash grab and limits practice ([fandom wiki](https://duolingo.fandom.com/wiki/Energy), [Android Authority](https://www.androidauthority.com/quitting-duolingo-energy-system-3599842/)) | Never limit practice. Mistakes are data, not damage. Use an optional "Sudden-death perch" challenge for people who want stakes. |
| **Spaced repetition (HLR)** | **[Strong]** Half-life regression cut recall-prediction error by 45%+. In A/B tests it raised daily retention by 9.5% for practice sessions and 12% for overall activity (Settles & Meeder, ACL 2016, [ACL Anthology](https://preview.aclanthology.org/naacl24-info/P16-1174)). | Opaque to users | Simple, transparent Leitner boxes for one user (as in `typing-pedagogy.md` §2.11), shown as the "Mistake nest". |

### 2.2 Typing trainers

- **Monkeytype** ([features](https://www.mintlify.com/monkeytypegame/monkeytype/features), [test modes](https://mintlify.com/monkeytypegame/monkeytype/guides/test-modes))
  - **Modes:** *time* (15/30/60/120 s), *words*, *quote*, *zen*, *custom*.
  - **Toggles:** punctuation and numbers (punctuation is off in quote and zen). Quotes are grouped by length: 0–100, 101–300, 301–600 and 601+ characters (from its `quotes/*.json`). There are 40+ "funbox" modifiers.
  - **Licence:** GPL-3.0, read from the [repo](https://github.com/monkeytypegame/monkeytype) LICENSE.
  - **Take:** the mode bar, toggles, length groups and minimal results screen.
  - **Don't take:** the word or quote files (licence and quality; §8.1).
- **keybr**
  - Starts with a small set of letters and adds letters as confidence grows. It generates pronounceable pseudo-words ([PopSci overview](https://www.popsci.com/free-web-apps-speed-typing/); the algorithm is analysed from source in `typing-pedagogy.md` §2.5).
  - **Take:** per-key confidence, and "focus on the weakest key".
  - **Change:** use real words from the user's languages, because real-word practice also trains spelling.
- **TypeRacer** ([Wikipedia](https://en.wikipedia.org/wiki/TypeRacer))
  - Multiplayer races, plus a single-player practice/"ghosting" mode. Premium ($12/year) saves your best practice runs to race against.
  - **Take:** the **ghost of your personal best** as a pace line. It gives competition without other people.
- **TypeLit.io** ([FAQ](https://www.typelit.io/faq), [EdTech Impact](https://edtechimpact.com/products/typelitio/))
  - You type classic books chapter by chapter. It has 80+ books in about 9 languages including Dutch, WPM and accuracy per page/chapter/book, a 200+ rank levelling system and saved progress.
  - **Take:** chapter/page progression and per-page stats.
  - **Caution:** classic Dutch texts are usually in pre-1947 spelling (§8.2).
- **Nitro Type** ([Common Sense](https://www.commonsense.org/education/reviews/nitro-type), [NCCE](https://ncce.org/nitrotype-a-great-way-to-engage-students/))
  - Racing with cars, cash and cosmetics. "Nitros" (up to 3 per race) skip a word, and accurate typing earns boosts.
  - **Take:** the *accuracy boost* idea (streaks of correct words speed you up).
  - **Avoid:** skip-a-word power-ups (they skip exactly the words you need) and loot economies (childish for an adult).

### 2.3 Typing games

- **ZType** (PhobosLab, 2011)
  - A space-shooter: each enemy is a word, and every keystroke fires at it. Waves get faster and more numerous, and fewer errors give a higher score. Players can load **custom word files** ([Wikipedia](https://en.wikipedia.org/wiki/Z-Type)).
  - **Take:** the custom word list, fed from the Mistake nest, and the first-letter lock-on mechanic.
- **Epistory: Typing Chronicles** (2016)
  - Exploration plus typing, in a papercraft world. The words relate to their effect (fire words burn logs). Achievements reward typing passages from *Frankenstein* and *Hamlet*. Reviewers found it more relaxed than other typing games ([TechRaptor](https://techraptor.net/content/epistory-typing-chronicles-review), [Destructoid](https://destructoid.com/reviews/review-epistory-typing-chronicles)).
  - **Take:** calm, story-led progression and themed word sets.
- **The Typing of the Dead** (Sega/Smilebit; *Overkill* 2013)
  - Praised for its humour and difficulty despite being "edutainment". The original had a proper touch-typing tutorial ([Wikipedia](https://en.wikipedia.org/wiki/The_Typing_of_the_Dead), [SEGAbits review](https://segabits.com/blog/2013/11/03/review-the-typing-of-the-dead-overkill/)).
  - **Take:** humour is what makes drills feel grown-up. Pip's dry wit plays this role.

### 2.4 Dictation sites, the Dutch dictee tradition, and d/t trainers

- **dictation.io is *not* a dictation-practice site.** It is a voice-typing tool: you speak and Google speech recognition types, in Chrome, in 50+ languages ([Warwick Library](https://warwick.ac.uk/services/library/using/productivity-tools/dictation-io/), [Small Business Trends](https://smallbiztrends.com/free-dictation-software-dictation-io/)). It is the opposite direction from what we need. Speech recognition could at most be used for a later "read aloud" self-check.
- **Real dictation-practice sites:**
  - [Lingua.com](https://lingua.com/english/dictation/) reads each sentence **twice, at normal and at slow speed**, and allows replays.
  - The [UCL online Dutch dictee](https://www.ucl.ac.uk/clie/learning-resources/online-dutch/taster/Oefeningen/Luisteren/Luisteren_Dictee.html) offers unlimited replays and a feedback button.
  - "Une dictée par jour" offers 50+ dictations at four levels ([outilstice](https://outilstice.com/en/une-dictee-par-jour-des-dictees-en-ligne-pour-ameliorer-lorthographe/)).
  - **Take:** the normal-then-slow playback, unlimited replays at the easy levels, and graded levels.
- **Het Groot Dictee der Nederlandse Taal**
  - It ran on TV every December from 1990 to 2016 (NTR, de Volkskrant, De Morgen) and was stopped because viewing figures fell ([Wikipedia](https://en.wikipedia.org/wiki/Grand_Dictation_of_the_Dutch_Language), [NH Nieuws](https://www.nhnieuws.nl/nieuws/206628/NTR-stopt-per-direct-met-Groot-Dictee-der-Nederlandse-Taal)).
  - It has since returned as a **radio** event on NPO Radio 1 (*De Taalstaat*). In 2024 (Rotterdam), the winner made 5 errors while listeners at home averaged 17 ([Omroep Brabant](https://www.omroepbrabant.nl/nieuws/4588382/Maar-vijf-foutjes-in-Groot-Dictee-winnares-spelde-kanunnik-fout)). The 2025 edition, from Deurne with a text by Wim Daniëls, was billed as the eighth on radio ([Omroep Brabant](https://www.omroepbrabant.nl/nieuws/4793718/Hoofdrol-voor-Deurne-in-Het-Groot-Dictee-der-Nederlandse-Taal)).
  - Onze Taal runs a [library edition](https://onzetaal.nl/schatkamer/spelen/groot-dictee/voor-bibliotheken).
  - **Take:** a *weekly* "Groot Dictee van Pip": a longer themed text, scored by error count against your own history. Error count is the national scoring convention and needs no leaderboard.
- **d/t trainers.**
  - I could not find "dtrainer" or "Cambiumned" as products. Searches returned nothing relevant, so treat those names as unverified.
  - Products that do exist:
    - **Meester Klaas** (iPad; has a "D of T" module) ([App Store](https://apps.apple.com/us/app/id6459923221)).
    - **Dees & Tees** (iPhone; asks you questions to determine the tense, then the spelling) ([iCulture](https://www.iculture.nl/apps/dees-tees-iphone-app-helpt-je-foutloos-werkwoorden-spellen/)).
    - **DT-Manie**: the rule drawn as a yes/no flowchart ([Wikipedia](https://en.wikipedia.org/wiki/DT-Manie)).
    - The academic **DT-duiveltje**: a semi-automatic d/t checker that asks the writer one or two questions ([TTWiA](https://www.jbe-platform.com/content/journals/10.1075/ttwia.35.09zui)).
    - Short multiple-choice **spelling tests** from the Flemish Team Taaladvies, e.g. *d of dt in de gebiedende wijs* ([Vlaanderen.be](https://www.vlaanderen.be/team-taaladvies/spellingtests/d-of-dt-in-de-gebiedende-wijs)).
    - Printable worksheets at [taal-oefenen.nl](https://taal-oefenen.nl/werkbladen/werkwoordspelling/gemengd/oefenen-met-zwakke-en-sterke-werkwoorden-tt-vt-en-vd-gemengd-2?print=1).
  - **Take:** the *question ladder* ("Who is doing it? Is the subject before or after the verb? Is it a participle?") as Pip's hint sequence, rather than a wall of rules.

### 2.5 Proofreading ("find the mistake") games

- **Examples:**
  - [ESLeschool Spot the Mistake](https://www.esleschool.com/spot-the-mistake/): one error per sentence, CEFR-graded.
  - [TalkDrill Error Spotter](https://www.talkdrill.com/games/error-spotter/): tenses, articles, prepositions, agreement, word order, spelling.
  - *The Grading Game*: you mark student papers as a "career" ([Common Sense](https://www.commonsensemedia.org/app-reviews/the-grading-game)).
  - Quill Proofreader ([BrainPOP](https://educators.brainpop.com/?p=119917)).
- **Take:**
  - *The Grading Game*'s **role-play framing**: Pip is the editor of a small newspaper, and you proofread his articles. That is adult and witty.
  - Error density graded by level.
- **Change:** have the user **retype** the corrected text. Clicking alone doesn't build the typing habit (§5.6).

### 2.6 Spaced repetition and cloze

- **Anki** added **FSRS** as an optional scheduler in version 23.10 ([Wikipedia](https://en.wikipedia.org/wiki/Anki)). It targets a "desired retention" (commonly 0.9) ([explainer](https://domenic.me/fsrs/)).
- **Clozemaster**: you type the missing word in real sentences. Its "Fluency Fast Track" blanks out the least frequent word in each sentence. It has listening and text-input modes ([FluentU review](https://www.fluentu.com/blog/clozemaster-review/), [Refold](https://www.refold.la/blog/srs-that-isnt-anki-clozemaster)).
- **Take:**
  - **Cloze-at-speed** for grammar items (type the gap word, then the whole sentence).
  - Simple Leitner scheduling. Mention FSRS only as a possible later upgrade: one user's data is too little to fit FSRS parameters early on.

---

## 3. Learning-science summary (what the modes rely on)

| Principle | Evidence | Where it shows up |
|---|---|---|
| **Gamification helps, modestly** | **[Strong]** Meta-analysis: g = 0.49 cognitive, 0.36 motivational, 0.25 behavioural outcomes. *Game fiction* and *competition combined with collaboration* moderated behavioural effects (Sailer & Homner 2020, *Educ. Psychol. Rev.*, [Springer](https://link.springer.com/article/10.1007/s10648-019-09498-w)). | A light fiction (Pip's newspaper, Pip's nest) beats bare points. With one user, "collaboration" means Pip as a partner. |
| **Autonomy, competence, relatedness (SDT)** | **[Moderate]** Choice in how to earn progress supports autonomy. Mastery feedback supports competence. Overusing extrinsic rewards can crowd out intrinsic motivation ([SDT and gamification](https://icenet.blog/2025/06/17/align-the-game-to-your-aim-considering-gamification-through-the-lens-of-self-determination-theory/), [Decision Lab](https://thedecisionlab.com/insights/consumer-insights/streak-creep-the-perils-of-too-much-gamification)). | Free choice of modes. Badges mark *mastery* ("50 d/t in a row"), not *time spent*. |
| **Spacing** | **[Strong]** For long retention intervals, the best review gap is roughly 10–20% of the time you want to remember for; an optimal gap improved recall by up to 150% (Cepeda et al. 2008, [PDF](https://www.evullab.org/pdf/CepedaVulRohrerWixtedPashler-PS-2008.pdf)). | Leitner intervals of 0, 1, 2, 4, 8 and 16 days (`typing-pedagogy.md` §2.11) |
| **Retrieval and generation** | **[Strong]** Testing beats re-studying (Roediger & Karpicke 2006). Spacing, interleaving, testing and generation are "desirable difficulties" ([Bjork](https://bjorklab.psych.ucla.edu/wp-content/uploads/sites/13/2016/07/RBjork_inpress.pdf), [summary](https://structural-learning.com/post/desirable-difficulties)). | Dictation (recall from sound) and cloze without options beat copy-typing and multiple choice. Gym packs are interleaved. |
| **Cover-Copy-Compare** | **[Strong]** A meta-analysis supports CCC and its variants (Joseph et al. 2012, *Psychology in the Schools* 49(2), 122–136). | Mistake-nest review: show the word with its tricky segment highlighted → hide → type → compare |
| **Exposure to misspellings can hurt** | **[Moderate]** Brown (1988), "Encountering misspellings and spelling performance: Why wrong isn't right", *J. Educ. Psychol.* 80, 488–494. Exposure to incorrect forms lowered later spelling accuracy (also discussed in [Dixon 1997](https://openaccess.city.ac.uk/id/eprint/30780/)). | Only Fix-it shows wrong forms, and only briefly and sparsely. The user always ends by typing the right form. |
| **Feedback must be acted on** | **[Moderate]** Learners improve more when they respond to corrections. Mini-lessons per error type help self-editing ([AWEJ](https://awej.org/wp-content/uploads/2020/12/5-6.pdf), [UvA](https://dare.uva.nl/id/d195ffca-61d9-4ee7-b36a-32130f65c885)). | Every report ends with "fix it now": retype the sentence, then add the item to the nest |
| **Cloze for grammar** | **[Moderate]** Cloze performance correlates with grammar ability, and reconstruction cloze improved grammar mastery in small studies ([UNP journal](https://ejournal.unp.ac.id/index.php/eltar/article/download/8748/6743), [Hawaii validation study](https://scholarspace.manoa.hawaii.edu/items/ffe67992-7a42-4c94-88a6-e571c65164bb)). | Grammar gym "cloze-at-speed" |

---

## 4. Design principles: playful, not childish

1. **Wit over cuteness.**
   - Pip is a dry, slightly pedantic editor-parrot who loves words: "Pip ruffles his feathers at that t."
   - No baby talk, no exclamation-mark floods, no confetti on every keypress.
   - Monkeytype's restraint is the visual baseline: one accent colour, a monospaced text area, and the parrot appearing at the edges.
2. **Fiction lightly worn.** Three small framings carry everything (Sailer & Homner: game fiction helps):
   - Pip's **nest**: the words you are learning;
   - Pip's **newspaper**: Fix-it;
   - Pip's **flight**: the daily plan.
3. **Mistakes are information.** Every error gets a *label* and *one sentence* of explanation in Dutch and English (`dutch-errors.md` §8, `typing-pedagogy.md` §4). Practice never loses lives.
4. **Show progress you can feel**, never time spent. Examples: "Your d/t accuracy went from 71% to 93% in 3 weeks", "12 words hatched from the nest".
5. **Short sessions, clear end.** Rounds of 30–120 s and a daily flight of about 10–15 min. A "done for today" state means the app never nags for more.
6. **Choice.** Every mode can be reached at any time. The daily flight is a *suggestion* built from the user's weakest labels.
7. **Sound and motion are opt-in**, and the app respects `prefers-reduced-motion`.
8. **Bilingual UI copy** (the interface in Dutch or English, chosen by the user). Pip's explanations can be shown in both at once while the user is learning.

### 4.1 Mascot name: **Pip**

- **Short and easy to type** in all three scripts: *Pip*, *بيب*.
- **Pronounceable** for Dutch, English and Arabic speakers. It reads as a small, lively bird.
- **A Dutch pun to use sparingly:** *de pip* is a bird disease, and *ergens de pip van krijgen* means "to get fed up with something" (well-known Van Dale idiom). That gives a natural line when the user repeats the same error: "Ik krijg er bijna de pip van… nog één keer?"
- **Consistency:** `typing-pedagogy.md` uses "Polly's perch" for sudden death. Rename it to **"Pip's perch"**.

---

## 5. The Parrotype mode set

Every mode below reuses the **same typing surface**:

- caret, per-character diff, keystroke log;
- the same **error classifier**: word-level labels from `dutch-errors.md` §8 plus key/bigram events from `typing-pedagogy.md` §5–6;
- the same **results sheet**: WPM, accuracy, labels, "fix it now", "add to nest".

A mode is mostly *a content source + a presentation rule + a scoring rule*.

### 5.1 Classic test (the shell)

- **Modes:** `time` (15/30/60/120 s), `words` (10/25/50/100), `quote` (short/medium/long, using Monkeytype's length groups), `custom` (paste text).
- **Per-language word pools** (nl/en/ar): top 200 / 1k / 5k frequency words, **filtered through the spellcheck word list**. For Dutch, keep only OpenTaal words. This matters because subtitle-based frequency lists contain misspellings and English words.
  - For frequencies use [hermitdave/FrequencyWords](https://github.com/hermitdave/FrequencyWords) (content CC-BY-SA-4.0: attribute it and keep the derived list under the same licence) or an equivalent. The licensing details are in `dutch-errors.md` §2.3.
- **Toggles:**
  - `punctuation`, `numbers` (as in Monkeytype);
  - `capitals`: capitalise sentence starts and proper nouns;
  - `diacritics` (nl): mix in high-frequency words with ë/é/ï, e.g. *ideeën, België, café, geïnteresseerd*.
  - Arabic only: `harakat` (off by default) and `strict hamza` (on by default).
- **Ghost line:** a thin caret moving at the pace of your PB for this mode, or at 90% of your recent average WPM in "accuracy" sessions, as in `typing-pedagogy.md` §2.14.
- **Why it matters for this user:** it is the baseline for motor typos and the warm-up. It feeds the key/bigram weakness model. It helps spelling only indirectly, because the answer is visible.

### 5.2 "Parrot Says": dictation (highest value for spelling)

Pip says a sentence aloud using the Web Speech API. The user types it from memory. Then comes the diff with labelled explanations.

**Levels** (the user can choose; the auto-ladder moves up after 3 sessions at ≥95% word accuracy and down after 2 sessions below 80%):

| Level | Name | What happens | Trains |
|---|---|---|---|
| 1 | **Flash** | The sentence is shown for `600 ms + 250 ms × words`, then hidden, then spoken once. The user types. | Visual memory of correct spelling. **This is also the fallback when no TTS voice exists for the language.** |
| 2 | **Listen** | Spoken at rate 0.9. Unlimited replays (`R` key or 🔁 button). Slow replay at rate 0.7 (`Shift+R`). | Spelling from sound, with low pressure |
| 3 | **Dictee** | Classic Dutch dictee style: the whole sentence at rate 1.0, then each chunk (split at `,;:` or about 6 words) **twice** at 0.85, then the whole sentence again. At most 2 replays. | Long sentences, punctuation, endurance |
| 4 | **Memory** | Heard **once**, followed by a 3-second "Pip is thinking" pause before typing is enabled. No replay. | Spelling under working-memory load, which is exactly when the dominant homophone sneaks in (*wordt* for *word*) |

**Grading:**

- **Normalise both strings first:** NFC; curly to straight quotes and apostrophes (`’` → `'`); collapse whitespace.
- **Arabic only:** strip tatweel (U+0640). Strip harakat (U+064B–U+0652, U+0670) unless `harakat` is on. Map lam-alif presentation forms with NFKC: U+FEFB → U+0644 U+0627.
- **Align at word level**, then at character level (alignment algorithm in `typing-pedagogy.md` §5.2). Classify each wrong word with the classifier (`dutch-errors.md` §8).
- **Score** = correct words / target words.
  - Punctuation errors are listed but **not scored** at levels 1–2. At levels 3–4 they score at half weight.
  - Capital-letter errors **are** scored (capitals is a real error category for this user: days and months in en vs nl).
- **Hint ladder** after submitting: (1) the wrong word is marked → (2) Pip names the category ("d/t") → (3) Pip asks the dt question ("Who is doing it? Where is the subject?") → (4) the answer. See `typing-pedagogy.md` §2.9: indirect feedback first.
- **"Fix it now":** the user retypes the full sentence correctly. Every wrong word goes to the Mistake nest **with its sentence as context**.

**TTS engineering notes:**

- **Load voices asynchronously.** In Chrome, `speechSynthesis.getVoices()` is empty until the `voiceschanged` event fires ([Chrome blog](https://developer.chrome.com/blog/web-apps-that-talk-introduction-to-the-speech-synthesis-api), [flaviocopes](https://flaviocopes.com/speech-synthesis-api/)).
- **Pick a voice by language,** with fallback order `nl-NL` → `nl-BE` → any `nl*`; `en-GB`/`en-US` per the user's setting; `ar-*`. Remember the user's choice in `localStorage`, wrapped in try/catch.
- **Speak one sentence or chunk per `SpeechSynthesisUtterance`.** Chrome's network "Google" voices stop after about 15 s or about 200–300 characters. The pause/resume workaround breaks on Android, so chunking is the safe option ([phetsims issue](https://github.com/phetsims/utterance-queue/issues/60), [dev.to](https://dev.to/jankapunkt/cross-browser-speech-synthesis-the-hard-way-and-the-easy-way-353), [Caktus](https://www.caktusgroup.com/blog/2025/11/03/the-halting-problem/)).
- **Voice availability depends on the browser and OS.** Chrome adds network voices only when online, and offline voice sets are smaller. Arabic voices depend on the operating system ([readium notes](https://readium.org/speech/docs/WebSpeech.html); not fetched, cited from search). Detect the voice at session start and drop to **Flash** with a short notice if no voice exists. Never block.
- **Watch for TTS mispronunciations** of rare names. Content uses common words. A `say` field can override pronunciation (e.g. `"say": "e-mailadres"`).
- **Content:** §11 has 40 Dutch, 30 English and 15 Arabic sentences. `dutch-errors.md` §9 adds 46 more Dutch sentences.
- **Weekly "Groot Dictee van Pip":** a 5–8-sentence themed text at level 3, scored like the TV show (error count). The user's history is the leaderboard: "your best: 3 errors; national average on air: 17".

### 5.3 Story mode

- **Format:** type a story **page by page** (70–110 words a page). Progress is saved per story: the current page, plus WPM and accuracy per page.
- **End of a story:** a single quiet illustration of Pip (line art) and a "chapter feather".
- **Ghost:** your previous attempt on the same page, shown as a faint caret.
- **Content:**
  - 3 Dutch, 3 English and 1 Arabic original Pip stories (§12);
  - later more originals, and **public-domain texts in modern spelling only** (§8.2).
  - Sentences are chosen to be rich in the user's trap categories (d/t forms, trema, ei/ij, apostrophes, compounds), while still reading like a story, not a drill.
- **Why:** motivation and volume. Long-form copy-typing builds motor fluency, and correct exposure to tricky forms in context. It is weaker than dictation for spelling, because the text is visible.
- **Option "Read-then-recall":** after typing a page, its last sentence is hidden and Pip says it, so the user types it once more from memory. This turns part of story mode into retrieval practice. [Design]

### 5.4 Free write

- **Start:**
  - Pick a **prompt card** (§10) or draw one at random.
  - The card's `focus` tags tell the report what to look at.
  - Optional constraints: a time box (5/10/15 min) or a word goal (100/200/300).
  - Playful constraints for variety: "use *word* or *wordt* 5 times", "no more than five *the*".
- **Checking:**
  - **Default "check at the end"**, so the writing flow isn't broken.
  - Optional **live mode**: underline only *high-confidence* rule hits, debounced about 800 ms after the user pauses.
  - The rule engine runs in a Web Worker. LanguageTool is an optional second opinion: free public API limits are 20 requests/min/IP, 75 KB/min and 20 KB per request ([LT public API](https://dev.languagetool.org/public-http-api)). Send the text once, at the end, and deduplicate by span.
- **Final report:**
  1. Counts by category, with a sparkline per category across sessions.
  2. Each issue in context, with Pip's one-line explanation in Dutch and English.
  3. **Fix it now:** retype each flagged sentence.
  4. **Self-review step** (`typing-pedagogy.md` §2.13): switch to a different font and have TTS read the text back. Reading in an unfamiliar form helps catch your own errors.
  5. "Add to nest" for real misspellings. Motor slips are added only if they recur (`typing-pedagogy.md` §2.11).
- **Storage:** drafts autosave locally (IndexedDB or localStorage with try/catch).
- **Phone width:** the prompt card collapses above the editor.

### 5.5 Grammar gym

**Format:** rapid-fire rounds of 60 s or 20 items on one *pack*, or an **interleaved mix** of the 2–3 weakest packs. Interleaving is a desirable difficulty.

**Item formats** (each pack supports all four):

| Format | Interaction | Why |
|---|---|---|
| **Pick** | Two options (←/→ or 1/2 keys). After each pick, **type the full sentence** ("type to lock it in"). | Fast rule practice. Typing the correct form afterwards cancels the exposure to the wrong option. |
| **Cloze-at-speed** | A gap with no options: type the missing word, then the whole sentence | Generation effect, and no wrong forms on screen |
| **Minimal-pair duel** | Two sentences in a row that differ only in the target (*Ik word…* / *Hij wordt…*; *gebeurd* / *gebeurt*) | Trains the contrast itself |
| **Speed ladder** | The same items again, with the ghost pace raised 5% after each perfect run | Practises the form under time pressure, where the dominant homophone appears |

**Packs:**

- **Dutch:**
  - *d/t present*; *d/t inversion (je/jij)*; *participle vs present*; *'t kofschip past tense*;
  - *de/het core 300* (word list in `dutch-errors.md` §6.1); *die/dat*; *adjective -e*;
  - *als/dan*; *ei/ij*; *au/ou*; *hun/zij/hen*; *me/mijn*; *jou/jouw*;
  - *capitals*; *compound join*; *trema*; *apostrophe*.
- **English:**
  - *its/it's*; *their/there/they're*; *your/you're*; *then/than*; *affect/effect*; *lose/loose*;
  - *whose/who's*; *fewer/less*; *since/for*; *irregular past*; *capitals (days, months, languages)*;
  - **"Cognate clash"** (nl→en interference): *adres → address*, *succes → success*, *comfortabel → comfortable*, *appartement → apartment*, *literatuur → literature*, *sympathiek → nice (not sympathetic)*, *eventueel → possibly (not eventually)*, *actueel → current (not actual)*. [Design: a list from common nl→en false friends and cognate spellings. Grow it from the user's own errors.]
- **Arabic:** *hamza seats*, *wasl vs qat'*, *ة/ه*, *ى/ي*, *ض/ظ*, *tanween alif*.

**Generating items:**

- Use templates over the verb, noun and adjective lists in `dutch-errors.md` §6. For example, d/t present: `{subj} {verb.present(subj)} {object}.` with `subj ∈ {ik, jij, hij, …}`, plus inverted variants `{verb.present(subj, inverted)} {subj} …?`.
- Every generated sentence must pass the rule engine with zero flags. That doubles as a test.
- §15 has 42 hand-written starter items.

**Scoring:** points = correct × a combo multiplier (×1 to ×3). A mistake resets the multiplier but never ends the round.

### 5.6 Fix-it ("Pip's newspaper")

**Premise:** Pip edits the *Papegaaienpost* (a coined name, regularly formed with tussen-n) and has left mistakes in his articles. The user is the copy editor.

**Two interaction modes:**

- **(A) Retype clean** (default on desktop):
  - The text is shown in a *different font* (e.g. a serif), with N errors planted (3–5 per 40–60 words).
  - The user types the **corrected** text from the start.
  - Score: errors fixed (+), errors copied (−), new errors introduced (−).
- **(B) Spot & fix** (phone-friendly): tap a word to fix it inline. After 2 misses the remaining errors are revealed.

**Always end** by showing the clean text and having the user type the corrected words of any missed errors (CCC). This limits the exposure hazard.

**Content:**

- 15 hand-written texts (§14). Each has character spans for its mistakes, and its LanguageTool coverage is marked.
- **Generated items** [Design]: run *error injectors* on correct sentences. The injectors are the inverses of the classifier labels: flip d/t, swap de/het, remove a trema, split a compound, lowercase a weekday in English, drop the hamza on `أ`. Because each injected error carries its label, grading is automatic. Inject the categories the user actually gets wrong, and keep density ≤ 1 error per 12 words.

### 5.7 Weak spots + "Mistake nest"

- **Weak spots** (motor):
  - Per-key and per-bigram weakness scores (`typing-pedagogy.md` §6) choose **real words** that contain the weak bigrams.
  - Blocks: 60% target words, 25% general high-frequency words, 15% review words (`typing-pedagogy.md` §2.8).
  - Example: if `ij`→`ji` transpositions are frequent, a block of *vijf, tijd, blij, wij, prijs, rijden…*.
- **Mistake nest** (cognitive), modelled on Cover-Copy-Compare and Leitner:
  - Each nest item is a word together with the **sentence in which it was missed**.
  - **Review loop:**
    1. Show the word with its *tricky segment* highlighted (`wor`**`dt`**, `ide`**`eë`**`n`), plus Pip's rule line.
    2. Hide it after 1.5 s.
    3. The user types it. Then they type the context sentence (cloze for the word).
    4. Compare.
  - **Boxes:** 0 (same session, after 3–5 other items), 1 d, 2 d, 4 d, 8 d, 16 d. A word **hatches** (graduates) after a correct recall in the last box. A miss sends it back to box 1.
  - **Daily review cap:** 20 items, so reviews never pile up.
  - **Visual:** minimal line-art eggs that crack as they move up boxes. A small "hatched" collection gives a sense of accomplishment without cartoon excess.
  - **Intake rules** (`typing-pedagogy.md` §2.11): cognitive errors are added straight away. Motor slips are added only after ≥ 3 occurrences on the same word.

### 5.8 Daily flight, streaks and challenges

- **Daily flight** is about 10–15 min and is built automatically from the user's data:
  1. Warm-up: classic 30 s.
  2. Nest reviews due today (≤ 20).
  3. Grammar gym: the weakest label, 1 round.
  4. Parrot Says: 5 sentences at the current level.
  5. Optional: a story page or free write.
- **"Dictee van de dag":** 5 sentences chosen by a date-seeded PRNG, so the challenge is stable for that day.
- **Streak and goals:** see §7.2.
- **Weekly challenges** (opt-in): **Pip's perch** (sudden death: one wrong key ends the run), **No-backspace Friday**, **Groot Dictee van Pip** (§5.2).

### 5.9 Mini-game: "Pip's Catch"

**Mechanic:** words float in from the right on a minimal sky. Typing a word's first letter **locks on** to it (ZType-style). Completing the word makes Pip swoop and catch it. A word that reaches the left edge is missed. Speed and density rise over a 60–90 s round.

**Word source:**

- 60% from the **Mistake nest** and the current gym pack (correct forms only);
- 40% high-frequency words.
- Optional *pairs mode*: both members of a homophone pair float past in context, e.g. "ik ___ " carries *word*. [Design]

**Rules:**

- An exact spelling match is required. Case-insensitive by default; strict case is a toggle.
- A wrong letter shakes the word but doesn't kill it (accuracy is counted).
- Score = caught words × accuracy².

**Role:** a reward and cool-down. Its value is spelling at speed. It should not become the main course: its learning value per minute is lower than dictation's [Design].

**Rendering:** use Canvas or CSS transforms. Respect `prefers-reduced-motion`: switch to a static "word queue" variant.

### 5.10 Smaller extras

- **Ghost race:** the PB ghost in Classic, Story and Gym (§5.1).
- **Language switch drill** [Design]: alternate Dutch and English sentences, to practise the interference points (capitals, cognates).
- **Arabic phase-2 drills:** a key-position warm-up for the hamza keys. On the Arabic 101 layout, `أ` = Shift+H, `إ` = Shift+Y, `آ` = Shift+N, `ء` = X, `ئ` = Z, `ؤ` = C, `ى` = N, `ة` = M, `لا` = B, `لأ` = Shift+G, `لإ` = Shift+T, `لآ` = Shift+B. Source: the xkeyboard-config `ara` layout, read locally; Windows' Arabic (101) matches for the keys I could check (`ء` X, `ئ` Z, `ؤ` C, `ى` N, `ة` M), per a search snippet of the [Microsoft keyboard page](https://learn.microsoft.com/en-us/globalization/keyboards/kbda1), which could not be fetched here. The lam-alif keys produce **presentation-form** code points on Linux (U+FEF5–U+FEFB), so always NFKC-normalise input.
- **Typing diacritics (nl)** help card:
  - Windows "US-International": `"` then `e` → ë, `'` then `e` → é.
  - macOS: `⌥U` then `e` → ë, `⌥E` then `e` → é.
  - The app shows the card the first time a diacritic is missed, and never auto-corrects.

---

## 6. Which modes give this user the biggest benefit

Scores run 1–5 and are my [Design] judgement, based on the evidence in §2–§3.

| Mode | Dutch spelling/grammar | Typos (motor) | Transfer to real writing | Motivation | Build effort | Priority |
|---|---|---|---|---|---|---|
| Classic test | 2 | **5** | 2 | 4 | 2 (the shell) | **P0** |
| Parrot Says (dictation) | **5** | 3 | 4 | 3 | 3 (TTS + levels) | **P0** |
| Mistake nest + Weak spots | **5** | **4** | 3 | 4 (hatching) | 3 | **P0** |
| Grammar gym | **4** | 2 | 3 | 4 | 3 (packs, templates) | **P1** |
| Free write + report | 4 | 2 | **5** | 3 | 4 (rule engine, report) | **P1** |
| Fix-it | 3 | 2 | 4 | 4 (newspaper fiction) | 2 | **P1** |
| Story mode | 2 | 4 | 2 | **5** | 2 | **P2** |
| Daily flight / streak | (wrapper) | (wrapper) | – | **5** | 2 | **P2** |
| Pip's Catch mini-game | 2 | 3 | 1 | **5** | 3 | **P3** |

**MVP slice (about 2 weeks of one engineer)** [Design]:

1. Classic (nl/en) with the classifier and results sheet.
2. Parrot Says, levels 1–2.
3. Mistake nest with Leitner boxes.
4. Grammar gym with the d/t and de/het packs in Pick + type-to-lock format.
5. Content from §11 and §15.

Everything else builds on those pieces.

---

## 7. Gamification system and tone

### 7.1 XP that rewards learning, not grinding

```ts
// Accuracy-first XP. acc ∈ [0,1] is keystroke accuracy for the activity.
function accuracyFactor(acc: number): number {
  return acc < 0.85 ? 0 : Math.pow((acc - 0.85) / 0.15, 1.5); // 85% → 0, 92.5% → 0.35, 100% → 1
}
const BASE = {
  classicWord: 1,                 // per correctly typed target word
  storyWord: 1,
  dictationSentence: 6,           // × fraction of words correct
  gymItem: 3,                     // correct pick + correct full sentence
  fixitError: 4,                  // planted error fixed
  nestReview: 2, nestHatch: 15,   // hatching (graduation) is the big one
};
const LEVEL_MULT = { 1: 1, 2: 1.25, 3: 1.5, 4: 1.75 };
// Diminishing returns: the same content id (story page, gym pack seed, dictation set) earns
// 100% the first time a day, then 50%, then 25%, then 10%.
xp = Math.round(base * accuracyFactor(acc) * LEVEL_MULT[level] * repeatFactor(contentId, today));
// Level n needs 50·n² total XP (quadratic, so levels slow down but never stall).
```

- **Why:** XP that ignores accuracy invites speed-mashing. XP without diminishing returns invites farming (§2.1).
- **Show XP small.** Show *skill* metrics big: per-category accuracy trends.

### 7.2 Streaks and goals (forgiving by design)

- **Primary: weekly goal.** Practise on N of 7 days (default 4), shown as 7 dots.
- **Secondary: daily streak.** A day counts with ≥ 5 min or one completed daily flight.
  - **2 rest perches per week** (freezes) are applied automatically and are free.
  - A broken streak can be **earned back within 48 h** by completing two daily flights in one day. This repair is grounded in Silverman & Barasch 2023 (repairs weaken the drop-off after a break).
- **No guilt copy.**
  - Breaks are framed as external: "Life happened."
  - Never send push-style nagging (there are no notifications in a static web app anyway).
  - Never show a big red 0.
- **Commitment moment** (from Duolingo's streak-goal experiment, §2.1): on day 1 the user picks a weekly target of 3, 4, 5 or 7 days, with no preselected default.

### 7.3 "Feathers" (badges) for mastery events

Examples. Each is defined by a pure function over the event log, so badges can be added without migrations.

| Feather | Rule |
|---|---|
| **d/t-detective** | 50 d/t items in a row correct (gym or dictation) |
| **Trema tamer** | 30 words with a trema or accent typed correctly with no misses |
| **Perfect page** | A story page at 100% accuracy |
| **Clean dictee** | 5 dictation sentences at level ≥ 3 with 0 errors |
| **Empty nest** | All nest items hatched, with ≥ 20 hatched |
| **Slow is smooth** | 10 classic tests in a row at ≥ 98% accuracy |
| **Polyglot parrot** | Practice in all three languages in one week |
| **Editor-in-chief** | 10 Fix-it texts with every error found and no new errors |
| **Groot Dictee** | Beat your own weekly Groot Dictee record 3 times |

### 7.4 Pip's voice (copy guide)

- **Tone:** dry, kind and a little nerdy. One short line at a time. Never sarcastic about the user. The Dutch and English lines are equivalent, not literal translations.
- **Examples** (Dutch checked with LanguageTool and against the word list):
  - After a d/t error: *"Bijna! Hier hoort een t bij: hij wordt."* / *"So close. 'Its' has no apostrophe here."*
  - After a correct tricky word: *"Ideeën, mét trema. Pip knikt goedkeurend."* / *"Accommodation, both doubles. Pip is impressed."*
  - After a break: *"Even pauze gehad? Prima. Pip heeft je plekje warm gehouden."* / *"Life happened. Pip kept your perch warm."*
  - After a personal best: *"Nieuw record! Pip vliegt een rondje door de kamer."* / *"New record. Pip does a lap of the room."*
  - On repeated errors (sparingly): *"Ik krijg er bijna de pip van… nog één keer?"*
- **Avoid:**
  - exclamation marks in every message;
  - more than one emoji per screen;
  - mascot speech on every keystroke;
  - childish rewards (stickers, candy, loot boxes);
  - leaderboards against strangers.

---

## 8. Content strategy, licensing and language policy

### 8.1 Where content comes from

1. **Original writing** (this document). It ships under the project's licence. This is the default.
2. **Public domain.**
   - English: Project Gutenberg books, mostly pre-1929 US publications. Check the country rules for translations (e.g. Constance Garnett's Tolstoy translation, 1901).
   - Dutch: DBNL and Gutenberg, but see §8.2.
3. **Not:**
   - Monkeytype lists (GPL-3.0, which would force the bundle to GPL; their quote lists include in-copyright sources, such as *Life of Pi* in English and Mulisch, Reve, Hermans and Claus in Dutch);
   - quote websites (misattributions are common);
   - newspaper texts.
4. **Quality gate for any imported text:**
   - Dutch: OpenTaal word check plus the rule engine with zero high-confidence flags, plus LanguageTool.
   - All languages: a human read-through.
   - For example, running LanguageTool on Monkeytype's 69 Dutch quotes flagged 18, including archaic `den`/`der`/`zeide` and spoken-language forms (`nou`, `ik wou`).

### 8.2 Dutch spelling policy

- **Target norm:** the Woordenlijst Nederlandse Taal (Groene Boekje) 2015 spelling, as encoded in the OpenTaal list.
- **Do not use pre-1947 texts as typing targets.** The Marchant reform (1934), made official in 1946/1947, abolished forms like *mensch → mens*, *visch → vis*, *tusschen → tussen* ([elon.io](https://elon.io/grammar/dutch/regional/older-spelling-conventions), [DBNL: Van Maerlant tot Marchant](https://dbnl.org/tekst/_nee003198001_01/_nee003198001_01_0042.php)). Old case forms like *den*, *der* and *zeide* are also out. Typing old spellings would train exactly the wrong forms.
- **Dialogue punctuation:** stories follow the literary *elda* convention (comma before the closing quote mark). Both placements occur in Dutch practice ([webwoordenboek: leestekens bij een quote](https://webwoordenboek.nl/kenniscentrum/welke-leestekens-bij-een-quote)). The rule engine must **not** flag either placement in free writing. LanguageTool's `KOMMA_AANHALING` fires on the literary style, so suppress it.
- **Letters mentioned as letters** ("de t", "een d") are correct, but LanguageTool's `T` rule flags them. Add an antipattern for this to our rules.

### 8.3 English variant policy

- All shipped English content is **variant-neutral**. It avoids *-our/-or*, *-ise/-ize*, *practise/practice*, *flat/apartment*, *Mrs/Mrs.*, and quotation-mark punctuation that differs between US and UK style. In the stories, words that are being talked about appear without quotes, because a period or comma next to a closing quote mark differs by variant.
- **Free writing:** the user chooses `en-GB` or `en-US`. The engine accepts both spellings unless "strict variant" is on.

### 8.4 Arabic policy (phase 2)

- **Modern Standard Arabic, typed without harakat** (that is how Arabic is normally typed). Tanween fatha on the accusative alif (*كتابًا*) is optional. Grade with harakat stripped unless the `harakat` toggle is on.
- **Strict about** hamza, ة/ه, ى/ي, ض/ظ and wasl/qat': these are the error classes that matter (§1).
- **Normalise input:** NFKC for presentation forms; strip tatweel. A lenient option maps Persian ی (U+06CC) to ي and ک (U+06A9) to ك, for users with Persian keyboards.
- **Layout:** `dir="rtl"` on the typing surface, `unicode-bidi: isolate` around mixed-direction fragments (numbers, Latin), and Arabic punctuation `، ؛ ؟`.
- **Review:** all Arabic content needs a native-speaker review before release (§17).

---

## 9. Data model and content pipeline

### 9.1 Types

```ts
export type Lang = 'nl' | 'en' | 'ar';
export type Level = 'easy' | 'medium' | 'hard';

export interface WritingPrompt { id: string; lang: Lang; kind: string; text: string; focus: string[] }
export interface DictationItem { id: string; lang: Lang; level: Level; text: string; focus: string[]; say?: string }
export interface Story { id: string; lang: Lang; title: string; pages: string[]; words: number }
export interface QuoteItem {
  id: string; lang: Lang; kind: 'proverb' | 'quote'; text: string;
  author?: string; work?: string; year?: string; meaning_en?: string; note?: string;
}
export interface PlantedMistake {
  wrong: string; right: string; type: string;
  start: number; end: number;            // UTF-16 offsets in `wrong` (JS string indices)
  explain: { en: string; nl?: string };
}
export interface ProofreadItem { id: string; lang: Lang; wrong: string; correct: string; mistakes: PlantedMistake[] }
export interface GymItem {
  id: string; lang: Lang; pack: string; prompt: string;  // prompt contains '___' gap(s)
  options: string[]; answer: string; rule: string; full: string;
}
```

> Offsets in §14 are Python code-point indices. They equal JS UTF-16 indices for all shipped text, because the content has no astral-plane characters (no emoji). Recompute them in the build step if that ever changes.

### 9.2 Files and loading (static Vercel build)

```
src/content/
  nl/ prompts.json dictation.json stories.json quotes.json proofread.json gym.json
  en/ …same…
  ar/ …same…
  index.ts   // export const loadContent = (lang: Lang) => import(`./${lang}/index.ts`)  (Vite code-splits per language)
```

- **Build-time content tests** (Vitest):
  1. ids are unique and match `^(nl|en|ar)-[a-z]\d+$`;
  2. focus tags come from the controlled vocabulary;
  3. dictation sentences are ≤ 20 words for easy/medium and ≤ 30 for hard;
  4. story pages are ≤ 110 words;
  5. applying each Fix-it item's `mistakes` (in order) to `wrong` gives `correct` exactly (the script used for §14 already does this);
  6. `gym.full` contains `answer`;
  7. **every correct string passes the custom rule engine with zero high-confidence flags.** This is the false-positive regression suite: §11 + `dutch-errors.md` §9 = 86 Dutch sentences;
  8. every Fix-it `wrong` text triggers the expected label at each span. This is the recall suite.
- **Lazy-load** the large OpenTaal list in a Web Worker (`dutch-errors.md` §10). The JSON content in this document is small (about 70 KB uncompressed, about 21 KB gzipped).

### 9.3 Selecting what to show next (shared helper)

```ts
// Weighted pick: weakest labels first, but never starve other labels (interleaving).
function pickItems<T extends { focus: string[] }>(pool: T[], weakness: Record<string, number>, n: number, seenToday: Set<string>): T[] {
  // weakness[label] ∈ [0,1] from the classifier history (EMA of error rate per label)
  const score = (it: T) => 0.15 + Math.max(0, ...it.focus.map(f => weakness[f.split(':')[0]] ?? 0));
  return weightedSampleWithoutReplacement(pool.filter(p => !seenToday.has((p as any).id)), score, n);
}
```

## 10. Content pack (a): writing prompts

Each prompt carries `focus` tags: the structures it tends to *elicit*. The Free-write report can then say "this prompt was about comparisons: you used *dan/als* 6 times, 1 wrong". Prompts are deliberately adult and a little playful, never childish.

### 10.1 Dutch (25)

| # | Kind | Prompt | Focus |
|---|---|---|---|
| nl-p01 | journal | Beschrijf je ochtend van vandaag, vanaf het moment dat je wakker werd tot je de deur uitging. | past-tense, kofschip |
| nl-p02 | journal | Wat is er de afgelopen week gebeurd? Kies één moment dat je verraste en vertel hoe je reageerde. | participle, dt |
| nl-p03 | opinion | Vergelijk je woonplaats met de stad waar je het liefst zou wonen. Wat is daar beter, en wat is er minder goed dan hier? | als-dan, comparative |
| nl-p04 | describe | Beschrijf je kamer: wat staat er, wat ligt er en wat hangt er aan de muur? | de-het, adj-e, staan-liggen |
| nl-p05 | instructions | Schrijf het recept van je lievelingsgerecht op. Gebruik de gebiedende wijs, bijvoorbeeld: 'Snijd de ui in kleine stukjes.' | imperative, dt |
| nl-p06 | playful | Hoe ziet je leven er over tien jaar uit? Gebruik minstens vijf keer 'word' of 'wordt'. | dt, word-wordt |
| nl-p07 | story | Eerste zin: 'Toen ik de deur opendeed, zat er een papegaai op mijn bank. Hij keek me aan en zei: "Eindelijk ben je thuis."' | story, ei-ij |
| nl-p08 | story | Eerste zin: 'De lift bleef steken tussen de derde en de vierde verdieping, en ik was niet alleen.' | story, past-tense |
| nl-p09 | letter | Schrijf een klachtenbrief aan een webwinkel die je het verkeerde pakket heeft gestuurd. Blijf beleefd en gebruik 'u'. | formal, participle, u-form |
| nl-p10 | message | Schrijf een bericht aan een vriend of vriendin om een afspraak te verzetten. Leg uit waarom en stel een nieuwe datum voor. | dt, capitals |
| nl-p11 | opinion | Wat vind je van thuiswerken? Noem twee voordelen en twee nadelen, en sluit af met je eigen mening. | vind-vindt, opinion |
| nl-p12 | describe | Beschrijf een persoon die je bewondert, zonder zijn of haar naam te noemen. Kan een lezer raden wie het is? | die-dat, adj-e |
| nl-p13 | instructions | Leg aan een kind van tien uit hoe je een lekke fietsband plakt. | imperative, compound |
| nl-p14 | journal | Schrijf over een feest dat je nooit zult vergeten. Wie waren er, en wat maakte het zo bijzonder? | die-dat, past-tense |
| nl-p15 | playful | Welke drie dingen neem je mee naar een onbewoond eiland, en waarom juist die drie? | ei-ij, die-dat |
| nl-p16 | describe | Beschrijf deze scène: een drukke markt op zaterdagochtend, met kraampjes, spelende kinderen en een straatmuzikant met een accordeon. | describe, compound, capitals |
| nl-p17 | playful | Presenteer het weer van vandaag alsof je de weerman of weervrouw van het achtuurjournaal bent. | compound, wordt |
| nl-p18 | journal | Wat heb je dit jaar geleerd dat je vorig jaar nog niet wist? | participle, kofschip |
| nl-p19 | story | Schrijf een dagboekfragment van een kat die een hele dag alleen thuis is. | story, ik-form |
| nl-p20 | story | Een buitenaards wezen bezoekt voor het eerst een Nederlandse supermarkt. Wat ziet het, en wat begrijpt het helemaal niet? | story, het-pronoun |
| nl-p21 | opinion | Moeten kinderen onder de vijftien sociale media mogen gebruiken? Geef je mening met minstens twee argumenten. | opinion, numbers |
| nl-p22 | describe | Beschrijf je favoriete plek in de natuur met al je zintuigen: wat zie, hoor, ruik en voel je daar? | ik-form, dt |
| nl-p23 | letter | Schrijf een korte sollicitatiebrief voor je droombaan. Wat maakt jou de beste kandidaat? | formal, compound |
| nl-p24 | journal | Vertel over een misverstand dat ontstond doordat iemand iets verkeerd begreep. | participle, past-tense |
| nl-p25 | story | Schrijf de achterflap van een spannend boek dat nog niet bestaat. | story, die-dat |

```json
[
  {"id": "nl-p01", "lang": "nl", "kind": "journal", "text": "Beschrijf je ochtend van vandaag, vanaf het moment dat je wakker werd tot je de deur uitging.", "focus": ["past-tense", "kofschip"]},
  {"id": "nl-p02", "lang": "nl", "kind": "journal", "text": "Wat is er de afgelopen week gebeurd? Kies één moment dat je verraste en vertel hoe je reageerde.", "focus": ["participle", "dt"]},
  {"id": "nl-p03", "lang": "nl", "kind": "opinion", "text": "Vergelijk je woonplaats met de stad waar je het liefst zou wonen. Wat is daar beter, en wat is er minder goed dan hier?", "focus": ["als-dan", "comparative"]},
  {"id": "nl-p04", "lang": "nl", "kind": "describe", "text": "Beschrijf je kamer: wat staat er, wat ligt er en wat hangt er aan de muur?", "focus": ["de-het", "adj-e", "staan-liggen"]},
  {"id": "nl-p05", "lang": "nl", "kind": "instructions", "text": "Schrijf het recept van je lievelingsgerecht op. Gebruik de gebiedende wijs, bijvoorbeeld: 'Snijd de ui in kleine stukjes.'", "focus": ["imperative", "dt"]},
  {"id": "nl-p06", "lang": "nl", "kind": "playful", "text": "Hoe ziet je leven er over tien jaar uit? Gebruik minstens vijf keer 'word' of 'wordt'.", "focus": ["dt", "word-wordt"]},
  {"id": "nl-p07", "lang": "nl", "kind": "story", "text": "Eerste zin: 'Toen ik de deur opendeed, zat er een papegaai op mijn bank. Hij keek me aan en zei: \"Eindelijk ben je thuis.\"'", "focus": ["story", "ei-ij"]},
  {"id": "nl-p08", "lang": "nl", "kind": "story", "text": "Eerste zin: 'De lift bleef steken tussen de derde en de vierde verdieping, en ik was niet alleen.'", "focus": ["story", "past-tense"]},
  {"id": "nl-p09", "lang": "nl", "kind": "letter", "text": "Schrijf een klachtenbrief aan een webwinkel die je het verkeerde pakket heeft gestuurd. Blijf beleefd en gebruik 'u'.", "focus": ["formal", "participle", "u-form"]},
  {"id": "nl-p10", "lang": "nl", "kind": "message", "text": "Schrijf een bericht aan een vriend of vriendin om een afspraak te verzetten. Leg uit waarom en stel een nieuwe datum voor.", "focus": ["dt", "capitals"]},
  {"id": "nl-p11", "lang": "nl", "kind": "opinion", "text": "Wat vind je van thuiswerken? Noem twee voordelen en twee nadelen, en sluit af met je eigen mening.", "focus": ["vind-vindt", "opinion"]},
  {"id": "nl-p12", "lang": "nl", "kind": "describe", "text": "Beschrijf een persoon die je bewondert, zonder zijn of haar naam te noemen. Kan een lezer raden wie het is?", "focus": ["die-dat", "adj-e"]},
  {"id": "nl-p13", "lang": "nl", "kind": "instructions", "text": "Leg aan een kind van tien uit hoe je een lekke fietsband plakt.", "focus": ["imperative", "compound"]},
  {"id": "nl-p14", "lang": "nl", "kind": "journal", "text": "Schrijf over een feest dat je nooit zult vergeten. Wie waren er, en wat maakte het zo bijzonder?", "focus": ["die-dat", "past-tense"]},
  {"id": "nl-p15", "lang": "nl", "kind": "playful", "text": "Welke drie dingen neem je mee naar een onbewoond eiland, en waarom juist die drie?", "focus": ["ei-ij", "die-dat"]},
  {"id": "nl-p16", "lang": "nl", "kind": "describe", "text": "Beschrijf deze scène: een drukke markt op zaterdagochtend, met kraampjes, spelende kinderen en een straatmuzikant met een accordeon.", "focus": ["describe", "compound", "capitals"]},
  {"id": "nl-p17", "lang": "nl", "kind": "playful", "text": "Presenteer het weer van vandaag alsof je de weerman of weervrouw van het achtuurjournaal bent.", "focus": ["compound", "wordt"]},
  {"id": "nl-p18", "lang": "nl", "kind": "journal", "text": "Wat heb je dit jaar geleerd dat je vorig jaar nog niet wist?", "focus": ["participle", "kofschip"]},
  {"id": "nl-p19", "lang": "nl", "kind": "story", "text": "Schrijf een dagboekfragment van een kat die een hele dag alleen thuis is.", "focus": ["story", "ik-form"]},
  {"id": "nl-p20", "lang": "nl", "kind": "story", "text": "Een buitenaards wezen bezoekt voor het eerst een Nederlandse supermarkt. Wat ziet het, en wat begrijpt het helemaal niet?", "focus": ["story", "het-pronoun"]},
  {"id": "nl-p21", "lang": "nl", "kind": "opinion", "text": "Moeten kinderen onder de vijftien sociale media mogen gebruiken? Geef je mening met minstens twee argumenten.", "focus": ["opinion", "numbers"]},
  {"id": "nl-p22", "lang": "nl", "kind": "describe", "text": "Beschrijf je favoriete plek in de natuur met al je zintuigen: wat zie, hoor, ruik en voel je daar?", "focus": ["ik-form", "dt"]},
  {"id": "nl-p23", "lang": "nl", "kind": "letter", "text": "Schrijf een korte sollicitatiebrief voor je droombaan. Wat maakt jou de beste kandidaat?", "focus": ["formal", "compound"]},
  {"id": "nl-p24", "lang": "nl", "kind": "journal", "text": "Vertel over een misverstand dat ontstond doordat iemand iets verkeerd begreep.", "focus": ["participle", "past-tense"]},
  {"id": "nl-p25", "lang": "nl", "kind": "story", "text": "Schrijf de achterflap van een spannend boek dat nog niet bestaat.", "focus": ["story", "die-dat"]}
]
```

### 10.2 English (25)

| # | Kind | Prompt | Focus |
|---|---|---|---|
| en-p01 | journal | Describe your perfect weekend, hour by hour. | past-vs-future, then-than |
| en-p02 | story | Tell the story of the worst trip you have ever taken. What went wrong first? | irregular-past |
| en-p03 | story | Story starter: The parrot cleared its throat and said, "We need to talk." | its-its, dialogue-punctuation |
| en-p04 | review | Write a review of a restaurant, bakery or shop you know well. Would you recommend it? | double-letters, opinion |
| en-p05 | instructions | Explain how to make the drink you like best to someone who has never made it. | imperative, sequence-words |
| en-p06 | opinion | Compare two cities you know. Which one would you rather live in, and why? | then-than, comparatives |
| en-p07 | letter | Write a friendly note to the people next door, inviting them to a small party. | your-youre, their-there |
| en-p08 | journal | What is one skill you would like to learn this year, and how will you work on it? | future, modal-verbs |
| en-p09 | describe | Describe this scene: a busy train station at rush hour, with announcements, coffee stands and people running for trains. | describe, present-continuous |
| en-p10 | letter | Write a letter to your future self, to be opened in five years. | your-youre, future |
| en-p11 | story | Story starter: Nobody noticed the door until it started to glow. | story, past-perfect |
| en-p12 | opinion | Is it better to work from home or in an office? Give two reasons for each side before you decide. | opinion, linking-words |
| en-p13 | describe | Describe a family tradition and explain where it comes from. | their-there, present-simple |
| en-p14 | playful | Write a survival guide for a Monday morning. | capitals:days, imperative |
| en-p15 | playful | What would you do if you won a free ticket to any country in the world? | conditionals |
| en-p16 | news | Write a short news report about a parrot that escaped from the zoo and was found in a library. | passive, its-its |
| en-p17 | playful | Describe the room you are sitting in without using the word 'the' more than five times. | articles, constraint |
| en-p18 | journal | Write about a time you made a mistake and what you learned from it. | irregular-past, learned |
| en-p19 | story | Write a dialogue between a cat and a dog who have to share one sofa. | dialogue-punctuation |
| en-p20 | explain | Explain a Dutch habit or tradition to someone from another country. | capitals:nationalities, articles |
| en-p21 | journal | What is the best piece of advice you have ever received? Who gave it to you? | advice-advise, ie-ei |
| en-p22 | letter | Write a complaint to a company whose product broke after one week. | whose-whos, formal |
| en-p23 | playful | Imagine you could talk to animals for one day. Which animals would you visit, and what would you ask them? | conditionals |
| en-p24 | journal | Describe your morning routine, then describe what it would look like in an ideal world. | then-than, conditionals |
| en-p25 | story | Write the opening paragraph of a mystery novel set in Amsterdam. | story, capitals:places |

```json
[
  {"id": "en-p01", "lang": "en", "kind": "journal", "text": "Describe your perfect weekend, hour by hour.", "focus": ["past-vs-future", "then-than"]},
  {"id": "en-p02", "lang": "en", "kind": "story", "text": "Tell the story of the worst trip you have ever taken. What went wrong first?", "focus": ["irregular-past"]},
  {"id": "en-p03", "lang": "en", "kind": "story", "text": "Story starter: The parrot cleared its throat and said, \"We need to talk.\"", "focus": ["its-its", "dialogue-punctuation"]},
  {"id": "en-p04", "lang": "en", "kind": "review", "text": "Write a review of a restaurant, bakery or shop you know well. Would you recommend it?", "focus": ["double-letters", "opinion"]},
  {"id": "en-p05", "lang": "en", "kind": "instructions", "text": "Explain how to make the drink you like best to someone who has never made it.", "focus": ["imperative", "sequence-words"]},
  {"id": "en-p06", "lang": "en", "kind": "opinion", "text": "Compare two cities you know. Which one would you rather live in, and why?", "focus": ["then-than", "comparatives"]},
  {"id": "en-p07", "lang": "en", "kind": "letter", "text": "Write a friendly note to the people next door, inviting them to a small party.", "focus": ["your-youre", "their-there"]},
  {"id": "en-p08", "lang": "en", "kind": "journal", "text": "What is one skill you would like to learn this year, and how will you work on it?", "focus": ["future", "modal-verbs"]},
  {"id": "en-p09", "lang": "en", "kind": "describe", "text": "Describe this scene: a busy train station at rush hour, with announcements, coffee stands and people running for trains.", "focus": ["describe", "present-continuous"]},
  {"id": "en-p10", "lang": "en", "kind": "letter", "text": "Write a letter to your future self, to be opened in five years.", "focus": ["your-youre", "future"]},
  {"id": "en-p11", "lang": "en", "kind": "story", "text": "Story starter: Nobody noticed the door until it started to glow.", "focus": ["story", "past-perfect"]},
  {"id": "en-p12", "lang": "en", "kind": "opinion", "text": "Is it better to work from home or in an office? Give two reasons for each side before you decide.", "focus": ["opinion", "linking-words"]},
  {"id": "en-p13", "lang": "en", "kind": "describe", "text": "Describe a family tradition and explain where it comes from.", "focus": ["their-there", "present-simple"]},
  {"id": "en-p14", "lang": "en", "kind": "playful", "text": "Write a survival guide for a Monday morning.", "focus": ["capitals:days", "imperative"]},
  {"id": "en-p15", "lang": "en", "kind": "playful", "text": "What would you do if you won a free ticket to any country in the world?", "focus": ["conditionals"]},
  {"id": "en-p16", "lang": "en", "kind": "news", "text": "Write a short news report about a parrot that escaped from the zoo and was found in a library.", "focus": ["passive", "its-its"]},
  {"id": "en-p17", "lang": "en", "kind": "playful", "text": "Describe the room you are sitting in without using the word 'the' more than five times.", "focus": ["articles", "constraint"]},
  {"id": "en-p18", "lang": "en", "kind": "journal", "text": "Write about a time you made a mistake and what you learned from it.", "focus": ["irregular-past", "learned"]},
  {"id": "en-p19", "lang": "en", "kind": "story", "text": "Write a dialogue between a cat and a dog who have to share one sofa.", "focus": ["dialogue-punctuation"]},
  {"id": "en-p20", "lang": "en", "kind": "explain", "text": "Explain a Dutch habit or tradition to someone from another country.", "focus": ["capitals:nationalities", "articles"]},
  {"id": "en-p21", "lang": "en", "kind": "journal", "text": "What is the best piece of advice you have ever received? Who gave it to you?", "focus": ["advice-advise", "ie-ei"]},
  {"id": "en-p22", "lang": "en", "kind": "letter", "text": "Write a complaint to a company whose product broke after one week.", "focus": ["whose-whos", "formal"]},
  {"id": "en-p23", "lang": "en", "kind": "playful", "text": "Imagine you could talk to animals for one day. Which animals would you visit, and what would you ask them?", "focus": ["conditionals"]},
  {"id": "en-p24", "lang": "en", "kind": "journal", "text": "Describe your morning routine, then describe what it would look like in an ideal world.", "focus": ["then-than", "conditionals"]},
  {"id": "en-p25", "lang": "en", "kind": "story", "text": "Write the opening paragraph of a mystery novel set in Amsterdam.", "focus": ["story", "capitals:places"]}
]
```

### 10.3 Arabic (10)

| # | Kind | Prompt | Focus |
|---|---|---|---|
| ar-p01 | journal | صف يومك المثالي من الصباح إلى المساء. | alif-maqsura, hamza |
| ar-p02 | letter | اكتب رسالة قصيرة إلى صديق تدعوه فيها إلى زيارتك. | alif-maqsura, taa-marbuta |
| ar-p03 | journal | ما أجمل مكان زرته؟ ولماذا أحببته؟ | hamza |
| ar-p04 | instructions | اكتب عن طبق تحبه، واشرح كيف تحضره خطوة بخطوة. | taa-marbuta |
| ar-p05 | playful | تخيل أن عندك ببغاء يتكلم. ماذا ستعلمه أن يقول؟ | hamza, playful |
| ar-p06 | describe | صف مدينتك في فصل الشتاء: ماذا ترى؟ وماذا تسمع؟ | alif-maqsura |
| ar-p07 | journal | اكتب عن شخص تعلمت منه شيئا مهما. | hamza, tanween |
| ar-p08 | opinion | ما الذي تفعله لتتعلم لغة جديدة؟ اذكر ثلاث نصائح. | taa-marbuta, hamzat-wasl |
| ar-p09 | story | اكتب قصة قصيرة تبدأ بهذه الجملة: "فتحت الباب، فوجدت رسالة على الأرض." | story, alif-maqsura |
| ar-p10 | opinion | ما رأيك في استخدام الهاتف قبل النوم؟ اكتب فقرة قصيرة. | hamza, hamzat-wasl |

```json
[
  {"id": "ar-p01", "lang": "ar", "kind": "journal", "text": "صف يومك المثالي من الصباح إلى المساء.", "focus": ["alif-maqsura", "hamza"]},
  {"id": "ar-p02", "lang": "ar", "kind": "letter", "text": "اكتب رسالة قصيرة إلى صديق تدعوه فيها إلى زيارتك.", "focus": ["alif-maqsura", "taa-marbuta"]},
  {"id": "ar-p03", "lang": "ar", "kind": "journal", "text": "ما أجمل مكان زرته؟ ولماذا أحببته؟", "focus": ["hamza"]},
  {"id": "ar-p04", "lang": "ar", "kind": "instructions", "text": "اكتب عن طبق تحبه، واشرح كيف تحضره خطوة بخطوة.", "focus": ["taa-marbuta"]},
  {"id": "ar-p05", "lang": "ar", "kind": "playful", "text": "تخيل أن عندك ببغاء يتكلم. ماذا ستعلمه أن يقول؟", "focus": ["hamza", "playful"]},
  {"id": "ar-p06", "lang": "ar", "kind": "describe", "text": "صف مدينتك في فصل الشتاء: ماذا ترى؟ وماذا تسمع؟", "focus": ["alif-maqsura"]},
  {"id": "ar-p07", "lang": "ar", "kind": "journal", "text": "اكتب عن شخص تعلمت منه شيئا مهما.", "focus": ["hamza", "tanween"]},
  {"id": "ar-p08", "lang": "ar", "kind": "opinion", "text": "ما الذي تفعله لتتعلم لغة جديدة؟ اذكر ثلاث نصائح.", "focus": ["taa-marbuta", "hamzat-wasl"]},
  {"id": "ar-p09", "lang": "ar", "kind": "story", "text": "اكتب قصة قصيرة تبدأ بهذه الجملة: \"فتحت الباب، فوجدت رسالة على الأرض.\"", "focus": ["story", "alif-maqsura"]},
  {"id": "ar-p10", "lang": "ar", "kind": "opinion", "text": "ما رأيك في استخدام الهاتف قبل النوم؟ اكتب فقرة قصيرة.", "focus": ["hamza", "hamzat-wasl"]}
]
```

## 11. Content pack (b): dictation sentences for "Parrot Says"

Levels: **easy** = short, one trap; **medium** = one clause plus one or two traps; **hard** = long, several traps, larger subject–verb distance (where the frequent homophone sneaks in). The prefix of a focus tag (before `:`) maps to the error-classifier label family from `dutch-errors.md` §8 (`dt`, `kofschip`, `trema`, `ei-ij`, `au-ou`, `apostrophe`, `capitals`, `compound` = split/join or hyphen, `de-het`/`die-dat` = gender, `adj-e`, `als-dan`, `participle`). These 40 Dutch sentences are **new** and do not repeat the 46 in `dutch-errors.md` §9, so together they give 86 regression sentences on which the rule engine must raise zero flags.

### 11.1 Dutch (40)

| # | Level | Sentence | Focus |
|---|---|---|---|
| nl-d01 | easy | Ik word elke ochtend om zeven uur wakker. | dt:ik-word |
| nl-d02 | easy | Hij wordt morgen twintig jaar. | dt:hij-wordt |
| nl-d03 | easy | Vind jij die nieuwe fiets ook mooi? | dt:inversion-jij, de-het:die |
| nl-d04 | easy | Mijn zus vindt het huis te klein. | dt:3sg, de-het |
| nl-d05 | easy | Het meisje zit onder de grote eik in de tuin. | ei-ij, de-het |
| nl-d06 | easy | Wij rijden in mei naar de zee. | ei-ij, capitals:month |
| nl-d07 | easy | De baby's slapen al in hun bedjes. | apostrophe:plural |
| nl-d08 | easy | Ik heb twee ideeën voor het feest. | trema, de-het |
| nl-d09 | easy | Het is koud, dus ik trek mijn jas aan. | au-ou, separable-verb |
| nl-d10 | easy | De hond van de buren slaapt in een grote hondenmand. | compound:tussen-n |
| nl-d11 | easy | Wordt het vandaag warm of koud? | dt:inversion-het, au-ou |
| nl-d12 | easy | Ik fiets elke dag naar mijn werk. | dt:ik-stem-t |
| nl-d13 | easy | Het ijs op de vijver is nog te dun. | ei-ij, de-het |
| nl-d14 | easy | Mijn twee opa's wonen allebei in Zeeland. | apostrophe:plural, ei-ij |
| nl-d15 | medium | Word je morgen door je vader of door je moeder opgehaald? | dt:je-inversion, participle |
| nl-d16 | medium | Het pakketje is gisteren bezorgd, maar het wordt pas morgen geopend. | participle, dt |
| nl-d17 | medium | Wat er vorige week is gebeurd, vertel ik je later wel. | participle:gebeurd |
| nl-d18 | medium | Hij verbetert zijn fouten meteen, want hij wil een tien halen. | dt:present-vs-participle |
| nl-d19 | medium | Het boek dat op tafel ligt, is van mijn oudste broer. | de-het:dat, au-ou |
| nl-d20 | medium | De sleutel die ik zocht, lag gewoon in mijn jaszak. | de-het:die, compound |
| nl-d21 | medium | Ze fietste gisteren naar het strand en zwom een uur in zee. | kofschip, strong-verb |
| nl-d22 | medium | We hebben de kamer geverfd en daarna de ramen gepoetst. | kofschip:participle |
| nl-d23 | medium | Mijn collega's drinken liever thee dan koffie. | apostrophe:plural, als-dan |
| nl-d24 | medium | Zij is twee jaar ouder dan ik, maar even groot als mijn broer. | als-dan, au-ou |
| nl-d25 | medium | Op het station kocht ik een treinkaartje en een broodje kaas. | compound, de-het |
| nl-d26 | medium | In België eten ze vaak frieten met mayonaise. | trema, spelling |
| nl-d27 | medium | De reis naar Spanje duurde lang, maar het uitzicht was prachtig. | ei-ij, kofschip |
| nl-d28 | medium | Hoeveel weegt dat pakket? Het lijkt me erg zwaar. | ei-ij, de-het:dat |
| nl-d29 | hard | Wordt het rapport dat de directeur vorige week heeft geschreven, morgen eindelijk besproken? | dt:inversion-long, de-het:dat, ei-ij |
| nl-d30 | hard | Ik vind het jammer dat je je ideeën niet eerder met ons hebt gedeeld. | dt, trema, participle |
| nl-d31 | hard | Nadat ze de vergadering had geleid, leidde ze ook nog een rondleiding door het gebouw. | ei-ij, kofschip:dde, participle |
| nl-d32 | hard | Het bedrijf heeft vorig jaar veel verlies geleden, dus wordt er nu streng bezuinigd. | ei-ij:lijden, dt |
| nl-d33 | hard | Mijn schoonzus heeft gisteren haar nieuwe e-mailadres naar alle collega's gestuurd. | compound:hyphen, apostrophe:plural |
| nl-d34 | hard | De coördinator wil weten of de reünie in het voorjaar of in het najaar wordt gehouden. | trema, dt |
| nl-d35 | hard | Als je je fiets niet op slot zet, wordt hij vroeg of laat gestolen. | dt, je-je |
| nl-d36 | hard | Het oude meubelstuk dat we op de rommelmarkt hebben gekocht, staat nu in de woonkamer. | de-het:dat, compound, adj-e |
| nl-d37 | hard | Zij antwoordde pas na een week, omdat ze de vraag eerst niet had begrepen. | kofschip:dde, strong-verb |
| nl-d38 | hard | Hoewel de taxi's al klaarstonden, vertrokken de gasten pas na middernacht. | apostrophe:plural, compound-verb |
| nl-d39 | hard | Ik verwacht dat de prijzen van zonnepanelen volgend jaar opnieuw zullen dalen. | ei-ij, compound:tussen-n |
| nl-d40 | hard | Op het strand vonden we een zee-egel, twee zeesterren en een kapotte schelp. | compound:hyphen, strong-verb |

```json
[
  {"id": "nl-d01", "lang": "nl", "level": "easy", "text": "Ik word elke ochtend om zeven uur wakker.", "focus": ["dt:ik-word"]},
  {"id": "nl-d02", "lang": "nl", "level": "easy", "text": "Hij wordt morgen twintig jaar.", "focus": ["dt:hij-wordt"]},
  {"id": "nl-d03", "lang": "nl", "level": "easy", "text": "Vind jij die nieuwe fiets ook mooi?", "focus": ["dt:inversion-jij", "de-het:die"]},
  {"id": "nl-d04", "lang": "nl", "level": "easy", "text": "Mijn zus vindt het huis te klein.", "focus": ["dt:3sg", "de-het"]},
  {"id": "nl-d05", "lang": "nl", "level": "easy", "text": "Het meisje zit onder de grote eik in de tuin.", "focus": ["ei-ij", "de-het"]},
  {"id": "nl-d06", "lang": "nl", "level": "easy", "text": "Wij rijden in mei naar de zee.", "focus": ["ei-ij", "capitals:month"]},
  {"id": "nl-d07", "lang": "nl", "level": "easy", "text": "De baby's slapen al in hun bedjes.", "focus": ["apostrophe:plural"]},
  {"id": "nl-d08", "lang": "nl", "level": "easy", "text": "Ik heb twee ideeën voor het feest.", "focus": ["trema", "de-het"]},
  {"id": "nl-d09", "lang": "nl", "level": "easy", "text": "Het is koud, dus ik trek mijn jas aan.", "focus": ["au-ou", "separable-verb"]},
  {"id": "nl-d10", "lang": "nl", "level": "easy", "text": "De hond van de buren slaapt in een grote hondenmand.", "focus": ["compound:tussen-n"]},
  {"id": "nl-d11", "lang": "nl", "level": "easy", "text": "Wordt het vandaag warm of koud?", "focus": ["dt:inversion-het", "au-ou"]},
  {"id": "nl-d12", "lang": "nl", "level": "easy", "text": "Ik fiets elke dag naar mijn werk.", "focus": ["dt:ik-stem-t"]},
  {"id": "nl-d13", "lang": "nl", "level": "easy", "text": "Het ijs op de vijver is nog te dun.", "focus": ["ei-ij", "de-het"]},
  {"id": "nl-d14", "lang": "nl", "level": "easy", "text": "Mijn twee opa's wonen allebei in Zeeland.", "focus": ["apostrophe:plural", "ei-ij"]},
  {"id": "nl-d15", "lang": "nl", "level": "medium", "text": "Word je morgen door je vader of door je moeder opgehaald?", "focus": ["dt:je-inversion", "participle"]},
  {"id": "nl-d16", "lang": "nl", "level": "medium", "text": "Het pakketje is gisteren bezorgd, maar het wordt pas morgen geopend.", "focus": ["participle", "dt"]},
  {"id": "nl-d17", "lang": "nl", "level": "medium", "text": "Wat er vorige week is gebeurd, vertel ik je later wel.", "focus": ["participle:gebeurd"]},
  {"id": "nl-d18", "lang": "nl", "level": "medium", "text": "Hij verbetert zijn fouten meteen, want hij wil een tien halen.", "focus": ["dt:present-vs-participle"]},
  {"id": "nl-d19", "lang": "nl", "level": "medium", "text": "Het boek dat op tafel ligt, is van mijn oudste broer.", "focus": ["de-het:dat", "au-ou"]},
  {"id": "nl-d20", "lang": "nl", "level": "medium", "text": "De sleutel die ik zocht, lag gewoon in mijn jaszak.", "focus": ["de-het:die", "compound"]},
  {"id": "nl-d21", "lang": "nl", "level": "medium", "text": "Ze fietste gisteren naar het strand en zwom een uur in zee.", "focus": ["kofschip", "strong-verb"]},
  {"id": "nl-d22", "lang": "nl", "level": "medium", "text": "We hebben de kamer geverfd en daarna de ramen gepoetst.", "focus": ["kofschip:participle"]},
  {"id": "nl-d23", "lang": "nl", "level": "medium", "text": "Mijn collega's drinken liever thee dan koffie.", "focus": ["apostrophe:plural", "als-dan"]},
  {"id": "nl-d24", "lang": "nl", "level": "medium", "text": "Zij is twee jaar ouder dan ik, maar even groot als mijn broer.", "focus": ["als-dan", "au-ou"]},
  {"id": "nl-d25", "lang": "nl", "level": "medium", "text": "Op het station kocht ik een treinkaartje en een broodje kaas.", "focus": ["compound", "de-het"]},
  {"id": "nl-d26", "lang": "nl", "level": "medium", "text": "In België eten ze vaak frieten met mayonaise.", "focus": ["trema", "spelling"]},
  {"id": "nl-d27", "lang": "nl", "level": "medium", "text": "De reis naar Spanje duurde lang, maar het uitzicht was prachtig.", "focus": ["ei-ij", "kofschip"]},
  {"id": "nl-d28", "lang": "nl", "level": "medium", "text": "Hoeveel weegt dat pakket? Het lijkt me erg zwaar.", "focus": ["ei-ij", "de-het:dat"]},
  {"id": "nl-d29", "lang": "nl", "level": "hard", "text": "Wordt het rapport dat de directeur vorige week heeft geschreven, morgen eindelijk besproken?", "focus": ["dt:inversion-long", "de-het:dat", "ei-ij"]},
  {"id": "nl-d30", "lang": "nl", "level": "hard", "text": "Ik vind het jammer dat je je ideeën niet eerder met ons hebt gedeeld.", "focus": ["dt", "trema", "participle"]},
  {"id": "nl-d31", "lang": "nl", "level": "hard", "text": "Nadat ze de vergadering had geleid, leidde ze ook nog een rondleiding door het gebouw.", "focus": ["ei-ij", "kofschip:dde", "participle"]},
  {"id": "nl-d32", "lang": "nl", "level": "hard", "text": "Het bedrijf heeft vorig jaar veel verlies geleden, dus wordt er nu streng bezuinigd.", "focus": ["ei-ij:lijden", "dt"]},
  {"id": "nl-d33", "lang": "nl", "level": "hard", "text": "Mijn schoonzus heeft gisteren haar nieuwe e-mailadres naar alle collega's gestuurd.", "focus": ["compound:hyphen", "apostrophe:plural"]},
  {"id": "nl-d34", "lang": "nl", "level": "hard", "text": "De coördinator wil weten of de reünie in het voorjaar of in het najaar wordt gehouden.", "focus": ["trema", "dt"]},
  {"id": "nl-d35", "lang": "nl", "level": "hard", "text": "Als je je fiets niet op slot zet, wordt hij vroeg of laat gestolen.", "focus": ["dt", "je-je"]},
  {"id": "nl-d36", "lang": "nl", "level": "hard", "text": "Het oude meubelstuk dat we op de rommelmarkt hebben gekocht, staat nu in de woonkamer.", "focus": ["de-het:dat", "compound", "adj-e"]},
  {"id": "nl-d37", "lang": "nl", "level": "hard", "text": "Zij antwoordde pas na een week, omdat ze de vraag eerst niet had begrepen.", "focus": ["kofschip:dde", "strong-verb"]},
  {"id": "nl-d38", "lang": "nl", "level": "hard", "text": "Hoewel de taxi's al klaarstonden, vertrokken de gasten pas na middernacht.", "focus": ["apostrophe:plural", "compound-verb"]},
  {"id": "nl-d39", "lang": "nl", "level": "hard", "text": "Ik verwacht dat de prijzen van zonnepanelen volgend jaar opnieuw zullen dalen.", "focus": ["ei-ij", "compound:tussen-n"]},
  {"id": "nl-d40", "lang": "nl", "level": "hard", "text": "Op het strand vonden we een zee-egel, twee zeesterren en een kapotte schelp.", "focus": ["compound:hyphen", "strong-verb"]}
]
```

### 11.2 English (30)

| # | Level | Sentence | Focus |
|---|---|---|---|
| en-d01 | easy | It's raining, so the cat stays inside. | its-its |
| en-d02 | easy | The dog is chasing its own tail. | its-its |
| en-d03 | easy | They're waiting for their friends over there. | their-there-theyre |
| en-d04 | easy | You're right: your keys were in the kitchen. | your-youre |
| en-d05 | easy | My brother is taller than I am. | then-than |
| en-d06 | easy | We ate dinner, and then we went for a walk. | then-than, irregular-past |
| en-d07 | easy | I want to buy two tickets, and my friend wants one too. | to-too-two |
| en-d08 | easy | I would like a piece of cake, please. | piece-peace |
| en-d09 | easy | On Monday we have a meeting in English. | capitals:days, capitals:languages |
| en-d10 | easy | Whose bag is this, and who's going to carry it? | whose-whos |
| en-d11 | medium | If the screw is loose, you might lose the wheel. | loose-lose |
| en-d12 | medium | The weather was so bad that we didn't know whether to go out. | weather-whether |
| en-d13 | medium | I believe she received the letter last Wednesday. | ie-ei, silent-letters |
| en-d14 | medium | The noise didn't affect me, but it had a strange effect on the dog. | affect-effect |
| en-d15 | medium | Everyone except Tom accepted the invitation. | accept-except |
| en-d16 | medium | It was quite late, and the street was quiet. | quite-quiet |
| en-d17 | medium | Take a deep breath, and try to breathe slowly. | breath-breathe |
| en-d18 | medium | There were fewer people than last year, but there was less noise. | fewer-less |
| en-d19 | medium | Time passed quickly, and soon the past felt very far away. | passed-past |
| en-d20 | medium | The children's toys were all over the living room floor. | apostrophe:plural-possessive |
| en-d21 | hard | The committee will definitely need a separate room for the meeting. | double-letters, spelling |
| en-d22 | hard | It is not necessary to accommodate every request, and nobody should feel embarrassed about that. | double-letters |
| en-d23 | hard | The principal explained the principle behind the new rule. | principal-principle |
| en-d24 | hard | I bought some stationery, but the bus remained stationary for an hour. | stationery-stationary |
| en-d25 | hard | She complimented him on his tie, which complemented his jacket perfectly. | compliment-complement |
| en-d26 | hard | The desert was so hot that our dessert melted in seconds. | desert-dessert |
| en-d27 | hard | We could have arrived earlier if we had checked the timetable. | could-have, conditionals |
| en-d28 | hard | The parrot's owners hadn't noticed that its cage was open. | apostrophe, its-its |
| en-d29 | hard | Neither of the twins knows where their grandparents' house is. | agreement, apostrophe:plural-possessive |
| en-d30 | hard | Please lay the book on the table, and then lie down for a while. | lie-lay |

```json
[
  {"id": "en-d01", "lang": "en", "level": "easy", "text": "It's raining, so the cat stays inside.", "focus": ["its-its"]},
  {"id": "en-d02", "lang": "en", "level": "easy", "text": "The dog is chasing its own tail.", "focus": ["its-its"]},
  {"id": "en-d03", "lang": "en", "level": "easy", "text": "They're waiting for their friends over there.", "focus": ["their-there-theyre"]},
  {"id": "en-d04", "lang": "en", "level": "easy", "text": "You're right: your keys were in the kitchen.", "focus": ["your-youre"]},
  {"id": "en-d05", "lang": "en", "level": "easy", "text": "My brother is taller than I am.", "focus": ["then-than"]},
  {"id": "en-d06", "lang": "en", "level": "easy", "text": "We ate dinner, and then we went for a walk.", "focus": ["then-than", "irregular-past"]},
  {"id": "en-d07", "lang": "en", "level": "easy", "text": "I want to buy two tickets, and my friend wants one too.", "focus": ["to-too-two"]},
  {"id": "en-d08", "lang": "en", "level": "easy", "text": "I would like a piece of cake, please.", "focus": ["piece-peace"]},
  {"id": "en-d09", "lang": "en", "level": "easy", "text": "On Monday we have a meeting in English.", "focus": ["capitals:days", "capitals:languages"]},
  {"id": "en-d10", "lang": "en", "level": "easy", "text": "Whose bag is this, and who's going to carry it?", "focus": ["whose-whos"]},
  {"id": "en-d11", "lang": "en", "level": "medium", "text": "If the screw is loose, you might lose the wheel.", "focus": ["loose-lose"]},
  {"id": "en-d12", "lang": "en", "level": "medium", "text": "The weather was so bad that we didn't know whether to go out.", "focus": ["weather-whether"]},
  {"id": "en-d13", "lang": "en", "level": "medium", "text": "I believe she received the letter last Wednesday.", "focus": ["ie-ei", "silent-letters"]},
  {"id": "en-d14", "lang": "en", "level": "medium", "text": "The noise didn't affect me, but it had a strange effect on the dog.", "focus": ["affect-effect"]},
  {"id": "en-d15", "lang": "en", "level": "medium", "text": "Everyone except Tom accepted the invitation.", "focus": ["accept-except"]},
  {"id": "en-d16", "lang": "en", "level": "medium", "text": "It was quite late, and the street was quiet.", "focus": ["quite-quiet"]},
  {"id": "en-d17", "lang": "en", "level": "medium", "text": "Take a deep breath, and try to breathe slowly.", "focus": ["breath-breathe"]},
  {"id": "en-d18", "lang": "en", "level": "medium", "text": "There were fewer people than last year, but there was less noise.", "focus": ["fewer-less"]},
  {"id": "en-d19", "lang": "en", "level": "medium", "text": "Time passed quickly, and soon the past felt very far away.", "focus": ["passed-past"]},
  {"id": "en-d20", "lang": "en", "level": "medium", "text": "The children's toys were all over the living room floor.", "focus": ["apostrophe:plural-possessive"]},
  {"id": "en-d21", "lang": "en", "level": "hard", "text": "The committee will definitely need a separate room for the meeting.", "focus": ["double-letters", "spelling"]},
  {"id": "en-d22", "lang": "en", "level": "hard", "text": "It is not necessary to accommodate every request, and nobody should feel embarrassed about that.", "focus": ["double-letters"]},
  {"id": "en-d23", "lang": "en", "level": "hard", "text": "The principal explained the principle behind the new rule.", "focus": ["principal-principle"]},
  {"id": "en-d24", "lang": "en", "level": "hard", "text": "I bought some stationery, but the bus remained stationary for an hour.", "focus": ["stationery-stationary"]},
  {"id": "en-d25", "lang": "en", "level": "hard", "text": "She complimented him on his tie, which complemented his jacket perfectly.", "focus": ["compliment-complement"]},
  {"id": "en-d26", "lang": "en", "level": "hard", "text": "The desert was so hot that our dessert melted in seconds.", "focus": ["desert-dessert"]},
  {"id": "en-d27", "lang": "en", "level": "hard", "text": "We could have arrived earlier if we had checked the timetable.", "focus": ["could-have", "conditionals"]},
  {"id": "en-d28", "lang": "en", "level": "hard", "text": "The parrot's owners hadn't noticed that its cage was open.", "focus": ["apostrophe", "its-its"]},
  {"id": "en-d29", "lang": "en", "level": "hard", "text": "Neither of the twins knows where their grandparents' house is.", "focus": ["agreement", "apostrophe:plural-possessive"]},
  {"id": "en-d30", "lang": "en", "level": "hard", "text": "Please lay the book on the table, and then lie down for a while.", "focus": ["lie-lay"]}
]
```

### 11.3 Arabic (15)

| # | Level | Sentence | Focus |
|---|---|---|---|
| ar-d01 | easy | ذهبت إلى السوق مع أمي. | alif-maqsura, hamzat-qat |
| ar-d02 | easy | هذه مدرسة كبيرة وجميلة. | taa-marbuta |
| ar-d03 | easy | قرأ أخي كتابا جديدا. | hamza:alif, tanween |
| ar-d04 | easy | سأل الطالب سؤالا مهما. | hamza:alif, hamza:waw |
| ar-d05 | easy | اشتريت ماء باردا من المقهى. | hamzat-wasl, hamza:line, alif-maqsura |
| ar-d06 | medium | مستشفى المدينة قريب من بيتنا. | alif-maqsura, taa-marbuta |
| ar-d07 | medium | في المساء نشرب الشاي في الحديقة. | hamza:line, taa-marbuta |
| ar-d08 | medium | رأيت طائرة كبيرة في السماء. | hamza:alif, hamza:yaa, taa-marbuta |
| ar-d09 | medium | هل تريد أن تأكل شيئا؟ | hamza:alif, hamza:yaa, arabic-question-mark |
| ar-d10 | medium | الامتحان غدا في الساعة التاسعة. | hamzat-wasl, taa-marbuta |
| ar-d11 | medium | يدرس أصدقائي اللغة الهولندية. | hamza:yaa, taa-marbuta |
| ar-d12 | hard | مصطفى يحب القراءة كثيرا. | alif-maqsura, hamza:line |
| ar-d13 | hard | لا تنس أن تغلق الباب. | jussive:alif-maqsura-dropped, hamza:alif |
| ar-d14 | hard | هؤلاء الأطفال يلعبون في الحديقة. | hamza:waw, hamzat-qat |
| ar-d15 | hard | شكرا على مساعدتك يا صديقي. | alif-maqsura, taa-marbuta:suffix |

```json
[
  {"id": "ar-d01", "lang": "ar", "level": "easy", "text": "ذهبت إلى السوق مع أمي.", "focus": ["alif-maqsura", "hamzat-qat"]},
  {"id": "ar-d02", "lang": "ar", "level": "easy", "text": "هذه مدرسة كبيرة وجميلة.", "focus": ["taa-marbuta"]},
  {"id": "ar-d03", "lang": "ar", "level": "easy", "text": "قرأ أخي كتابا جديدا.", "focus": ["hamza:alif", "tanween"]},
  {"id": "ar-d04", "lang": "ar", "level": "easy", "text": "سأل الطالب سؤالا مهما.", "focus": ["hamza:alif", "hamza:waw"]},
  {"id": "ar-d05", "lang": "ar", "level": "easy", "text": "اشتريت ماء باردا من المقهى.", "focus": ["hamzat-wasl", "hamza:line", "alif-maqsura"]},
  {"id": "ar-d06", "lang": "ar", "level": "medium", "text": "مستشفى المدينة قريب من بيتنا.", "focus": ["alif-maqsura", "taa-marbuta"]},
  {"id": "ar-d07", "lang": "ar", "level": "medium", "text": "في المساء نشرب الشاي في الحديقة.", "focus": ["hamza:line", "taa-marbuta"]},
  {"id": "ar-d08", "lang": "ar", "level": "medium", "text": "رأيت طائرة كبيرة في السماء.", "focus": ["hamza:alif", "hamza:yaa", "taa-marbuta"]},
  {"id": "ar-d09", "lang": "ar", "level": "medium", "text": "هل تريد أن تأكل شيئا؟", "focus": ["hamza:alif", "hamza:yaa", "arabic-question-mark"]},
  {"id": "ar-d10", "lang": "ar", "level": "medium", "text": "الامتحان غدا في الساعة التاسعة.", "focus": ["hamzat-wasl", "taa-marbuta"]},
  {"id": "ar-d11", "lang": "ar", "level": "medium", "text": "يدرس أصدقائي اللغة الهولندية.", "focus": ["hamza:yaa", "taa-marbuta"]},
  {"id": "ar-d12", "lang": "ar", "level": "hard", "text": "مصطفى يحب القراءة كثيرا.", "focus": ["alif-maqsura", "hamza:line"]},
  {"id": "ar-d13", "lang": "ar", "level": "hard", "text": "لا تنس أن تغلق الباب.", "focus": ["jussive:alif-maqsura-dropped", "hamza:alif"]},
  {"id": "ar-d14", "lang": "ar", "level": "hard", "text": "هؤلاء الأطفال يلعبون في الحديقة.", "focus": ["hamza:waw", "hamzat-qat"]},
  {"id": "ar-d15", "lang": "ar", "level": "hard", "text": "شكرا على مساعدتك يا صديقي.", "focus": ["alif-maqsura", "taa-marbuta:suffix"]}
]
```

## 12. Content pack (c): original stories for Story mode

The mascot is **Pip**, a green parrot with one red feather (see §4.1 for why the name works in all three languages). Each story has three pages of 70–110 words, so one page is a short sitting. All stories are original and can ship under the project's licence. The Dutch stories use dialogue punctuation in the literary *elda* style ("eerst leesteken, dan aanhalingsteken": `"Hij vindt," zei hij`). Words that are being talked about appear in single quotes (`'vind'`). The English stories avoid every spelling or punctuation choice that differs between British and American English (see §8.3).

### nl-s1: Pip en de vergeten t (247 words)

**Page 1.** Pip is een groene papegaai met één rode veer op zijn kop. Hij woont bij Sanne, op de derde verdieping van een oud huis in Utrecht. Elke ochtend zit hij op de vensterbank en telt hij de fietsers die voorbijkomen. Sanne werkt thuis. Ze schrijft de hele dag e-mails, verslagen en soms een gedicht. Pip leest graag mee over haar schouder, want hij houdt van woorden. Hij houdt vooral van woorden die bijna hetzelfde klinken, zoals 'rijst' en 'reist', of 'word' en 'wordt'.

**Page 2.** Op een maandagochtend typte Sanne heel snel. Haar koffie werd koud en haar baas wachtte op een antwoord. Opeens begon Pip luid te fluiten. "Wat is er?" vroeg Sanne. Pip tikte met zijn snavel tegen het scherm, precies achter het woord 'vind'. "Hij vindt," zei hij streng. "Met een t. Hij, zij en het krijgen een t." Sanne zuchtte en verbeterde de zin. "Sinds wanneer ben jij de taalpolitie?" Pip schudde zijn veren. "Ik word gewoon wakker van een vergeten t."

**Page 3.** Vanaf die dag werkten ze samen. Sanne schreef, en Pip luisterde naar het tikken van de toetsen. Bij elke twijfel stelde hij dezelfde vraag: "Wie doet het?" Was het onderwerp 'ik', dan bleef de t weg. Was het 'hij' of 'zij', dan kwam de t erbij. Na een week maakte Sanne bijna geen fouten meer. Ze kocht een zak zonnebloempitten als beloning. Pip at ze één voor één op en zei tevreden: "Een goede schrijver word je niet vanzelf. Je wordt het samen."

### nl-s2: Pip gaat naar zee (248 words)

**Page 1.** Het was de warmste dag van het jaar. Sanne pakte haar tas in: een handdoek, zonnebrandcrème, twee boterhammen met kaas en een fles water. Ze stopte er ook een zakje zonnebloempitten bij, want zonder hapje ging Pip nergens naartoe. Pip keek vanaf zijn stok toe. "Ga je weg?" vroeg hij. "We gaan allebei weg," zei Sanne. "Vandaag reizen we met de trein naar Zandvoort." Pip had de zee nog nooit gezien. Hij was zo blij dat hij drie keer achter elkaar een rondje door de kamer vloog.

**Page 2.** In de trein zat een jongen met een ijsje tegenover hen. Hij keek met grote ogen naar Pip. "Kan die papegaai echt praten?" vroeg hij. "Natuurlijk," zei Pip. "Ik spreek Nederlands, Engels en een beetje Arabisch." De jongen lachte zo hard dat zijn ijsje bijna op de grond viel. Bij elk station riep Pip de naam al voordat de conducteur iets kon zeggen: Haarlem, Overveen, Zandvoort aan Zee. De conducteur lachte en vroeg of Pip misschien zijn baan wilde overnemen.

**Page 3.** Op het strand waaide het flink. Pip zat op Sannes schouder en proefde de zoute lucht. Hij zag meeuwen, schelpen, kinderen met emmertjes en een hond die achter de golven aan rende. "Wat vind je ervan?" vroeg Sanne. Pip dacht lang na. "De zee is groot en lawaaiig," zei hij ten slotte, "maar het mooiste vind ik dat jij erbij bent." Op de terugweg sliep hij met zijn kop onder zijn vleugel, en hij droomde van ideeën voor een nieuwe reis.

### nl-s3: Pip en het grote dictee (248 words)

**Page 1.** In de bibliotheek hing een poster: "Groot dictee voor iedereen! Zaterdag om tien uur." Sanne bleef ervoor staan. "Doe je mee?" vroeg Pip vanuit haar fietstas. Sanne twijfelde. Ze had nog nooit aan een dictee meegedaan, en alleen het woord 'dictee' maakte haar al nerveus. "Ik help je oefenen," beloofde Pip. "Ik heb een uitstekend geheugen en een nog betere snavel." Sanne lachte. "Goed dan," zei ze, "maar als het misgaat, is het jouw schuld."

**Page 2.** De hele week oefenden ze. Pip las zinnen voor en Sanne schreef ze op. Het boek dat op tafel lag, werd hun oefenboek. De woorden die ze fout had, schreef ze op kaartjes. Sommige kaartjes verdwenen snel, andere kwamen dagenlang terug. "Is het gebeurd of gebeurt?" vroeg Sanne op woensdag. "Het is gisteren gebeurd," zei Pip, "dus met een d. Het gebeurt elke dag, dus met een t." Op vrijdag kende Sanne bijna alle lastige woorden uit haar hoofd, zelfs 'zonnebrandcrème' en 'ten slotte'.

**Page 3.** Op zaterdag zat Sanne tussen veertig andere deelnemers. Een vrouw met een rustige stem las de tekst voor. Sanne schreef langzaam en zorgvuldig. Ze dacht aan de kaartjes, aan de d en de t, en aan Pip, die thuis ongeduldig op haar wachtte. Toen de uitslag werd voorgelezen, hoorde ze haar eigen naam. Ze had niet gewonnen, maar ze had slechts vier fouten gemaakt. Thuis gaf ze Pip een gouden lintje. Hij hing het trots aan zijn schommel en floot zo hard dat de buren op de muur klopten.

### en-s1: Pip and the Lost Letter (258 words)

**Page 1.** Pip is a green parrot with a single red feather on top of his head. He lives with Sam in two small rooms above a bakery, so every morning begins with the smell of warm bread. Pip likes three things more than anything else: sunflower seeds, long words, and the moment the mail drops through the door. He always gets there first, and he always reads the envelopes out loud, whether anyone is listening or not.

**Page 2.** One rainy Tuesday, a letter landed on the mat. It wasn't for Sam. It was addressed to Ada Brooks, who had lived there before them. "We should return it," said Sam, "but I don't know where she lives now." Pip tilted his head and looked at the envelope from every side, as if it might tell him the answer. "The bakers know everyone," he said. "They're downstairs, and their shop is open. Let's ask them."

**Page 3.** The baker read the name and smiled. "Ada? She moved to the house with the yellow door, near the river. She still buys her bread here every Friday." That afternoon, Sam and Pip walked to the river. They found the yellow door, and Sam knocked. When Ada saw the letter, her eyes filled with tears. "It's from my brother," she said. "I've been waiting for it for weeks." She invited them in for tea and gave Pip a whole slice of apple, which he ate very slowly to make the moment last. The envelope was damp, but its message had arrived safely, and Pip felt very proud.

### en-s2: Pip's Typing Lesson (252 words)

**Page 1.** Sam wanted to type faster. Every evening she opened her laptop, set a timer for sixty seconds and typed as quickly as she could. Her fingers flew across the keys, but so did her mistakes. "Forty-two words per minute," she announced, "and nine typos." She tried again, and again, but the number of typos only grew. Pip, who was watching from the top of the bookshelf, made a sound like a disappointed kettle.

**Page 2.** "You're rushing," he said. "Your fingers are faster than your thoughts." Sam frowned. "Then what should I do?" Pip hopped down onto the desk. "Slow down. Type every word as if it were a seed you didn't want to drop. Speed will come later, all by itself." Sam didn't believe him, but she tried it anyway. The next evening she typed more slowly and paid attention to every letter. Thirty-five words per minute, and only two mistakes.

**Page 3.** She kept going like that for two weeks. Every time she wanted to rush, she heard Pip's voice in her head: one seed at a time. Some days were better than others, but the mistakes slowly disappeared, and one evening she noticed that she was fast again without even trying. "Fifty words per minute," she said, "and zero typos." Pip bowed so deeply that he nearly fell off the desk. "I told you," he said. "Slow is smooth, and smooth is fast." Sam laughed and gave him an extra sunflower seed, which, in Pip's opinion, was the best reward in the world.

### en-s3: The Parrot Who Collected Words (249 words)

**Page 1.** Some birds collect shiny things. Pip collected words. He kept them in his head like treasures in a wooden box, and every night before he went to sleep, he took them out one by one to admire them. On rainy days he counted them, and on sunny days he sorted them by sound. He had English words like whisper and puddle. There were Dutch words too, like gezellig, which describes a warm, friendly feeling that English cannot quite capture in a single word.

**Page 2.** One day a new family moved in next door. Their daughter, Layla, knocked on the door to borrow some sugar. When she saw Pip, she smiled and said something in Arabic. "What does that mean?" Pip asked. "It's a greeting," she explained. "It means that I wish you peace." Pip repeated it carefully, and Layla clapped her hands. Nobody had ever taught him a greeting that was also a wish. Layla wrote it on a piece of paper so that he would not forget it, and he kept the paper under his water bowl.

**Page 3.** From then on, Layla visited every afternoon. She taught Pip a new Arabic word each day, and Pip taught her a Dutch one in return. The word she liked best was uitwaaien, which means going outside in strong wind to clear your head. The word Pip liked best was sabr, which means patience. "That's a good word for a parrot," he said. "It took me a whole week to say it properly."

### ar-s1: بيب والكلمة الجديدة (118 words)

**Page 1.** بيب ببغاء أخضر صغير، على رأسه ريشة حمراء واحدة. يعيش بيب مع سارة في شقة قريبة من البحر. كل صباح تشرب سارة القهوة، ويأكل بيب بذور عباد الشمس، ثم يجلس على النافذة ليراقب الناس في الشارع.

**Page 2.** يحب بيب الكلمات كثيرا. يحفظ كلمات هولندية وإنجليزية، ويريد أن يتعلم العربية أيضا. في يوم من الأيام قالت سارة: "سأعلمك كل يوم كلمة جديدة." فرح بيب كثيرا، وطار حول الغرفة مرتين.

**Page 3.** في اليوم الأول تعلم كلمة "شكرا"، وفي اليوم الثاني تعلم كلمة "صديق". وفي اليوم الثالث سأل بيب: "ما معنى كلمة صبر؟" ابتسمت سارة وقالت: "الصبر أن تنتظر دون أن تغضب، وأن تحاول مرة بعد مرة." فكر بيب قليلا ثم قال: "إذن أنا صبور جدا، فأنا أحاول أن أنطق الضاد منذ أسبوع!"

```json
[
  {
    "id": "nl-s1",
    "lang": "nl",
    "title": "Pip en de vergeten t",
    "pages": [
      "Pip is een groene papegaai met één rode veer op zijn kop. Hij woont bij Sanne, op de derde verdieping van een oud huis in Utrecht. Elke ochtend zit hij op de vensterbank en telt hij de fietsers die voorbijkomen. Sanne werkt thuis. Ze schrijft de hele dag e-mails, verslagen en soms een gedicht. Pip leest graag mee over haar schouder, want hij houdt van woorden. Hij houdt vooral van woorden die bijna hetzelfde klinken, zoals 'rijst' en 'reist', of 'word' en 'wordt'.",
      "Op een maandagochtend typte Sanne heel snel. Haar koffie werd koud en haar baas wachtte op een antwoord. Opeens begon Pip luid te fluiten. \"Wat is er?\" vroeg Sanne. Pip tikte met zijn snavel tegen het scherm, precies achter het woord 'vind'. \"Hij vindt,\" zei hij streng. \"Met een t. Hij, zij en het krijgen een t.\" Sanne zuchtte en verbeterde de zin. \"Sinds wanneer ben jij de taalpolitie?\" Pip schudde zijn veren. \"Ik word gewoon wakker van een vergeten t.\"",
      "Vanaf die dag werkten ze samen. Sanne schreef, en Pip luisterde naar het tikken van de toetsen. Bij elke twijfel stelde hij dezelfde vraag: \"Wie doet het?\" Was het onderwerp 'ik', dan bleef de t weg. Was het 'hij' of 'zij', dan kwam de t erbij. Na een week maakte Sanne bijna geen fouten meer. Ze kocht een zak zonnebloempitten als beloning. Pip at ze één voor één op en zei tevreden: \"Een goede schrijver word je niet vanzelf. Je wordt het samen.\""
    ],
    "words": 247
  },
  {
    "id": "nl-s2",
    "lang": "nl",
    "title": "Pip gaat naar zee",
    "pages": [
      "Het was de warmste dag van het jaar. Sanne pakte haar tas in: een handdoek, zonnebrandcrème, twee boterhammen met kaas en een fles water. Ze stopte er ook een zakje zonnebloempitten bij, want zonder hapje ging Pip nergens naartoe. Pip keek vanaf zijn stok toe. \"Ga je weg?\" vroeg hij. \"We gaan allebei weg,\" zei Sanne. \"Vandaag reizen we met de trein naar Zandvoort.\" Pip had de zee nog nooit gezien. Hij was zo blij dat hij drie keer achter elkaar een rondje door de kamer vloog.",
      "In de trein zat een jongen met een ijsje tegenover hen. Hij keek met grote ogen naar Pip. \"Kan die papegaai echt praten?\" vroeg hij. \"Natuurlijk,\" zei Pip. \"Ik spreek Nederlands, Engels en een beetje Arabisch.\" De jongen lachte zo hard dat zijn ijsje bijna op de grond viel. Bij elk station riep Pip de naam al voordat de conducteur iets kon zeggen: Haarlem, Overveen, Zandvoort aan Zee. De conducteur lachte en vroeg of Pip misschien zijn baan wilde overnemen.",
      "Op het strand waaide het flink. Pip zat op Sannes schouder en proefde de zoute lucht. Hij zag meeuwen, schelpen, kinderen met emmertjes en een hond die achter de golven aan rende. \"Wat vind je ervan?\" vroeg Sanne. Pip dacht lang na. \"De zee is groot en lawaaiig,\" zei hij ten slotte, \"maar het mooiste vind ik dat jij erbij bent.\" Op de terugweg sliep hij met zijn kop onder zijn vleugel, en hij droomde van ideeën voor een nieuwe reis."
    ],
    "words": 248
  },
  {
    "id": "nl-s3",
    "lang": "nl",
    "title": "Pip en het grote dictee",
    "pages": [
      "In de bibliotheek hing een poster: \"Groot dictee voor iedereen! Zaterdag om tien uur.\" Sanne bleef ervoor staan. \"Doe je mee?\" vroeg Pip vanuit haar fietstas. Sanne twijfelde. Ze had nog nooit aan een dictee meegedaan, en alleen het woord 'dictee' maakte haar al nerveus. \"Ik help je oefenen,\" beloofde Pip. \"Ik heb een uitstekend geheugen en een nog betere snavel.\" Sanne lachte. \"Goed dan,\" zei ze, \"maar als het misgaat, is het jouw schuld.\"",
      "De hele week oefenden ze. Pip las zinnen voor en Sanne schreef ze op. Het boek dat op tafel lag, werd hun oefenboek. De woorden die ze fout had, schreef ze op kaartjes. Sommige kaartjes verdwenen snel, andere kwamen dagenlang terug. \"Is het gebeurd of gebeurt?\" vroeg Sanne op woensdag. \"Het is gisteren gebeurd,\" zei Pip, \"dus met een d. Het gebeurt elke dag, dus met een t.\" Op vrijdag kende Sanne bijna alle lastige woorden uit haar hoofd, zelfs 'zonnebrandcrème' en 'ten slotte'.",
      "Op zaterdag zat Sanne tussen veertig andere deelnemers. Een vrouw met een rustige stem las de tekst voor. Sanne schreef langzaam en zorgvuldig. Ze dacht aan de kaartjes, aan de d en de t, en aan Pip, die thuis ongeduldig op haar wachtte. Toen de uitslag werd voorgelezen, hoorde ze haar eigen naam. Ze had niet gewonnen, maar ze had slechts vier fouten gemaakt. Thuis gaf ze Pip een gouden lintje. Hij hing het trots aan zijn schommel en floot zo hard dat de buren op de muur klopten."
    ],
    "words": 248
  },
  {
    "id": "en-s1",
    "lang": "en",
    "title": "Pip and the Lost Letter",
    "pages": [
      "Pip is a green parrot with a single red feather on top of his head. He lives with Sam in two small rooms above a bakery, so every morning begins with the smell of warm bread. Pip likes three things more than anything else: sunflower seeds, long words, and the moment the mail drops through the door. He always gets there first, and he always reads the envelopes out loud, whether anyone is listening or not.",
      "One rainy Tuesday, a letter landed on the mat. It wasn't for Sam. It was addressed to Ada Brooks, who had lived there before them. \"We should return it,\" said Sam, \"but I don't know where she lives now.\" Pip tilted his head and looked at the envelope from every side, as if it might tell him the answer. \"The bakers know everyone,\" he said. \"They're downstairs, and their shop is open. Let's ask them.\"",
      "The baker read the name and smiled. \"Ada? She moved to the house with the yellow door, near the river. She still buys her bread here every Friday.\" That afternoon, Sam and Pip walked to the river. They found the yellow door, and Sam knocked. When Ada saw the letter, her eyes filled with tears. \"It's from my brother,\" she said. \"I've been waiting for it for weeks.\" She invited them in for tea and gave Pip a whole slice of apple, which he ate very slowly to make the moment last. The envelope was damp, but its message had arrived safely, and Pip felt very proud."
    ],
    "words": 258
  },
  {
    "id": "en-s2",
    "lang": "en",
    "title": "Pip's Typing Lesson",
    "pages": [
      "Sam wanted to type faster. Every evening she opened her laptop, set a timer for sixty seconds and typed as quickly as she could. Her fingers flew across the keys, but so did her mistakes. \"Forty-two words per minute,\" she announced, \"and nine typos.\" She tried again, and again, but the number of typos only grew. Pip, who was watching from the top of the bookshelf, made a sound like a disappointed kettle.",
      "\"You're rushing,\" he said. \"Your fingers are faster than your thoughts.\" Sam frowned. \"Then what should I do?\" Pip hopped down onto the desk. \"Slow down. Type every word as if it were a seed you didn't want to drop. Speed will come later, all by itself.\" Sam didn't believe him, but she tried it anyway. The next evening she typed more slowly and paid attention to every letter. Thirty-five words per minute, and only two mistakes.",
      "She kept going like that for two weeks. Every time she wanted to rush, she heard Pip's voice in her head: one seed at a time. Some days were better than others, but the mistakes slowly disappeared, and one evening she noticed that she was fast again without even trying. \"Fifty words per minute,\" she said, \"and zero typos.\" Pip bowed so deeply that he nearly fell off the desk. \"I told you,\" he said. \"Slow is smooth, and smooth is fast.\" Sam laughed and gave him an extra sunflower seed, which, in Pip's opinion, was the best reward in the world."
    ],
    "words": 252
  },
  {
    "id": "en-s3",
    "lang": "en",
    "title": "The Parrot Who Collected Words",
    "pages": [
      "Some birds collect shiny things. Pip collected words. He kept them in his head like treasures in a wooden box, and every night before he went to sleep, he took them out one by one to admire them. On rainy days he counted them, and on sunny days he sorted them by sound. He had English words like whisper and puddle. There were Dutch words too, like gezellig, which describes a warm, friendly feeling that English cannot quite capture in a single word.",
      "One day a new family moved in next door. Their daughter, Layla, knocked on the door to borrow some sugar. When she saw Pip, she smiled and said something in Arabic. \"What does that mean?\" Pip asked. \"It's a greeting,\" she explained. \"It means that I wish you peace.\" Pip repeated it carefully, and Layla clapped her hands. Nobody had ever taught him a greeting that was also a wish. Layla wrote it on a piece of paper so that he would not forget it, and he kept the paper under his water bowl.",
      "From then on, Layla visited every afternoon. She taught Pip a new Arabic word each day, and Pip taught her a Dutch one in return. The word she liked best was uitwaaien, which means going outside in strong wind to clear your head. The word Pip liked best was sabr, which means patience. \"That's a good word for a parrot,\" he said. \"It took me a whole week to say it properly.\""
    ],
    "words": 249
  },
  {
    "id": "ar-s1",
    "lang": "ar",
    "title": "بيب والكلمة الجديدة",
    "pages": [
      "بيب ببغاء أخضر صغير، على رأسه ريشة حمراء واحدة. يعيش بيب مع سارة في شقة قريبة من البحر. كل صباح تشرب سارة القهوة، ويأكل بيب بذور عباد الشمس، ثم يجلس على النافذة ليراقب الناس في الشارع.",
      "يحب بيب الكلمات كثيرا. يحفظ كلمات هولندية وإنجليزية، ويريد أن يتعلم العربية أيضا. في يوم من الأيام قالت سارة: \"سأعلمك كل يوم كلمة جديدة.\" فرح بيب كثيرا، وطار حول الغرفة مرتين.",
      "في اليوم الأول تعلم كلمة \"شكرا\"، وفي اليوم الثاني تعلم كلمة \"صديق\". وفي اليوم الثالث سأل بيب: \"ما معنى كلمة صبر؟\" ابتسمت سارة وقالت: \"الصبر أن تنتظر دون أن تغضب، وأن تحاول مرة بعد مرة.\" فكر بيب قليلا ثم قال: \"إذن أنا صبور جدا، فأنا أحاول أن أنطق الضاد منذ أسبوع!\""
    ],
    "words": 118
  }
]
```

## 13. Content pack (d): quotes and proverbs for Quote mode

### 13.1 Dutch spreekwoorden and one public-domain quote (30)

Proverbs are traditional and have no author or copyright. The English meaning helps the parrot explain them after a test. Item nl-q30 is Multatuli's Idee 1 (*Ideën*, 1862). The original has `dàt`; current spelling marks emphasis with an acute accent (`dát`), so the item uses `dát`.

| # | Text | Meaning (EN) |
|---|---|---|
| nl-q01 | Al doende leert men. | You learn by doing. |
| nl-q02 | Oefening baart kunst. | Practice makes perfect. |
| nl-q03 | Wie niet waagt, die niet wint. | Nothing ventured, nothing gained. |
| nl-q04 | Haastige spoed is zelden goed. | More haste, less speed. |
| nl-q05 | Beter laat dan nooit. | Better late than never. |
| nl-q06 | Oost west, thuis best. | There is no place like home. |
| nl-q07 | Wie het laatst lacht, lacht het best. | He who laughs last laughs best. |
| nl-q08 | De aanhouder wint. | Persistence pays off. |
| nl-q09 | Stille wateren hebben diepe gronden. | Still waters run deep. |
| nl-q10 | Beter één vogel in de hand dan tien in de lucht. | A bird in the hand is worth two in the bush. |
| nl-q11 | Zoals de ouden zongen, piepen de jongen. | Children copy their parents. |
| nl-q12 | Wie a zegt, moet ook b zeggen. | In for a penny, in for a pound. |
| nl-q13 | Geen rook zonder vuur. | There is no smoke without fire. |
| nl-q14 | Hoge bomen vangen veel wind. | Prominent people attract the most criticism. |
| nl-q15 | Vele handen maken licht werk. | Many hands make light work. |
| nl-q16 | Wie zijn billen brandt, moet op de blaren zitten. | You have made your bed, now lie in it. |
| nl-q17 | Beter een goede buur dan een verre vriend. | A good person next door is worth more than a friend far away. |
| nl-q18 | Na regen komt zonneschijn. | After rain comes sunshine. |
| nl-q19 | Wie wat bewaart, die heeft wat. | Waste not, want not. |
| nl-q20 | Een ezel stoot zich in het gemeen geen twee keer aan dezelfde steen. | Even a donkey does not make the same mistake twice. |
| nl-q21 | Van uitstel komt afstel. | What is postponed is often abandoned. |
| nl-q22 | Gedeelde smart is halve smart. | A sorrow shared is a sorrow halved. |
| nl-q23 | Eind goed, al goed. | All's well that ends well. |
| nl-q24 | Rome is niet in één dag gebouwd. | Rome wasn't built in a day. |
| nl-q25 | Spreken is zilver, zwijgen is goud. | Speech is silver, silence is golden. |
| nl-q26 | Zo gewonnen, zo geronnen. | Easy come, easy go. |
| nl-q27 | Je moet het ijzer smeden als het heet is. | Strike while the iron is hot. |
| nl-q28 | Elk huisje heeft zijn kruisje. | Every family has its troubles. |
| nl-q29 | Een goed begin is het halve werk. | Well begun is half done. |
| nl-q30 | Misschien is niets geheel waar, en zelfs dát niet. | Perhaps nothing is entirely true, and not even that. (Multatuli, Ideeën, Idee 1, 1862; the original has dàt; modern spelling uses dát) |

```json
[
  {"id": "nl-q01", "lang": "nl", "kind": "proverb", "text": "Al doende leert men.", "meaning_en": "You learn by doing."},
  {"id": "nl-q02", "lang": "nl", "kind": "proverb", "text": "Oefening baart kunst.", "meaning_en": "Practice makes perfect."},
  {"id": "nl-q03", "lang": "nl", "kind": "proverb", "text": "Wie niet waagt, die niet wint.", "meaning_en": "Nothing ventured, nothing gained."},
  {"id": "nl-q04", "lang": "nl", "kind": "proverb", "text": "Haastige spoed is zelden goed.", "meaning_en": "More haste, less speed."},
  {"id": "nl-q05", "lang": "nl", "kind": "proverb", "text": "Beter laat dan nooit.", "meaning_en": "Better late than never."},
  {"id": "nl-q06", "lang": "nl", "kind": "proverb", "text": "Oost west, thuis best.", "meaning_en": "There is no place like home."},
  {"id": "nl-q07", "lang": "nl", "kind": "proverb", "text": "Wie het laatst lacht, lacht het best.", "meaning_en": "He who laughs last laughs best."},
  {"id": "nl-q08", "lang": "nl", "kind": "proverb", "text": "De aanhouder wint.", "meaning_en": "Persistence pays off."},
  {"id": "nl-q09", "lang": "nl", "kind": "proverb", "text": "Stille wateren hebben diepe gronden.", "meaning_en": "Still waters run deep."},
  {"id": "nl-q10", "lang": "nl", "kind": "proverb", "text": "Beter één vogel in de hand dan tien in de lucht.", "meaning_en": "A bird in the hand is worth two in the bush."},
  {"id": "nl-q11", "lang": "nl", "kind": "proverb", "text": "Zoals de ouden zongen, piepen de jongen.", "meaning_en": "Children copy their parents."},
  {"id": "nl-q12", "lang": "nl", "kind": "proverb", "text": "Wie a zegt, moet ook b zeggen.", "meaning_en": "In for a penny, in for a pound."},
  {"id": "nl-q13", "lang": "nl", "kind": "proverb", "text": "Geen rook zonder vuur.", "meaning_en": "There is no smoke without fire."},
  {"id": "nl-q14", "lang": "nl", "kind": "proverb", "text": "Hoge bomen vangen veel wind.", "meaning_en": "Prominent people attract the most criticism."},
  {"id": "nl-q15", "lang": "nl", "kind": "proverb", "text": "Vele handen maken licht werk.", "meaning_en": "Many hands make light work."},
  {"id": "nl-q16", "lang": "nl", "kind": "proverb", "text": "Wie zijn billen brandt, moet op de blaren zitten.", "meaning_en": "You have made your bed, now lie in it."},
  {"id": "nl-q17", "lang": "nl", "kind": "proverb", "text": "Beter een goede buur dan een verre vriend.", "meaning_en": "A good person next door is worth more than a friend far away."},
  {"id": "nl-q18", "lang": "nl", "kind": "proverb", "text": "Na regen komt zonneschijn.", "meaning_en": "After rain comes sunshine."},
  {"id": "nl-q19", "lang": "nl", "kind": "proverb", "text": "Wie wat bewaart, die heeft wat.", "meaning_en": "Waste not, want not."},
  {"id": "nl-q20", "lang": "nl", "kind": "proverb", "text": "Een ezel stoot zich in het gemeen geen twee keer aan dezelfde steen.", "meaning_en": "Even a donkey does not make the same mistake twice."},
  {"id": "nl-q21", "lang": "nl", "kind": "proverb", "text": "Van uitstel komt afstel.", "meaning_en": "What is postponed is often abandoned."},
  {"id": "nl-q22", "lang": "nl", "kind": "proverb", "text": "Gedeelde smart is halve smart.", "meaning_en": "A sorrow shared is a sorrow halved."},
  {"id": "nl-q23", "lang": "nl", "kind": "proverb", "text": "Eind goed, al goed.", "meaning_en": "All's well that ends well."},
  {"id": "nl-q24", "lang": "nl", "kind": "proverb", "text": "Rome is niet in één dag gebouwd.", "meaning_en": "Rome wasn't built in a day."},
  {"id": "nl-q25", "lang": "nl", "kind": "proverb", "text": "Spreken is zilver, zwijgen is goud.", "meaning_en": "Speech is silver, silence is golden."},
  {"id": "nl-q26", "lang": "nl", "kind": "proverb", "text": "Zo gewonnen, zo geronnen.", "meaning_en": "Easy come, easy go."},
  {"id": "nl-q27", "lang": "nl", "kind": "proverb", "text": "Je moet het ijzer smeden als het heet is.", "meaning_en": "Strike while the iron is hot."},
  {"id": "nl-q28", "lang": "nl", "kind": "proverb", "text": "Elk huisje heeft zijn kruisje.", "meaning_en": "Every family has its troubles."},
  {"id": "nl-q29", "lang": "nl", "kind": "proverb", "text": "Een goed begin is het halve werk.", "meaning_en": "Well begun is half done."},
  {"id": "nl-q30", "lang": "nl", "kind": "quote", "text": "Misschien is niets geheel waar, en zelfs dát niet.", "meaning_en": "Perhaps nothing is entirely true, and not even that. (Multatuli, Ideeën, Idee 1, 1862; the original has dàt; modern spelling uses dát)", "author": "Multatuli", "work": "Ideeën (Idee 1)", "year": "1862"}
]
```

### 13.2 English public-domain quotes (30 + 4 spares)

I checked every quote word for word against the Project Gutenberg text of its source (via GITenberg mirrors; see §16). I avoided famous quotes that are often misattributed, such as many "Mark Twain" and "Einstein" lines. Original spelling and punctuation are kept, for example Whitman's comma and parentheses, and *made on* in The Tempest. The `note` field marks small edits, such as a removed line break.

| # | Quote | Author | Source | Year |
|---|---|---|---|---|
| en-q01 | All the world's a stage, and all the men and women merely players. | William Shakespeare | As You Like It, Act 2, Scene 7 | c. 1599 |
| en-q02 | To be, or not to be, that is the question. | William Shakespeare | Hamlet, Act 3, Scene 1 | c. 1600 |
| en-q03 | The course of true love never did run smooth. | William Shakespeare | A Midsummer Night's Dream, Act 1, Scene 1 | c. 1595 |
| en-q04 | Brevity is the soul of wit. | William Shakespeare | Hamlet, Act 2, Scene 2 | c. 1600 |
| en-q05 | There is nothing either good or bad but thinking makes it so. | William Shakespeare | Hamlet, Act 2, Scene 2 | c. 1600 |
| en-q06 | This above all: to thine own self be true. | William Shakespeare | Hamlet, Act 1, Scene 3 | c. 1600 |
| en-q07 | Shall I compare thee to a summer's day? | William Shakespeare | Sonnet 18 | 1609 |
| en-q08 | If music be the food of love, play on. | William Shakespeare | Twelfth Night, Act 1, Scene 1 | c. 1601 |
| en-q09 | Some are born great, some achieve greatness, and some have greatness thrust upon them. | William Shakespeare | Twelfth Night, Act 2, Scene 5 | c. 1601 |
| en-q10 | The fault, dear Brutus, is not in our stars, but in ourselves. | William Shakespeare | Julius Caesar, Act 1, Scene 2 | c. 1599 |
| en-q11 | What's in a name? That which we call a rose by any other name would smell as sweet. | William Shakespeare | Romeo and Juliet, Act 2, Scene 2 | c. 1595 |
| en-q12 | We are such stuff as dreams are made on. | William Shakespeare | The Tempest, Act 4, Scene 1 | c. 1611 |
| en-q13 | It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife. | Jane Austen | Pride and Prejudice, Chapter 1 | 1813 |
| en-q14 | One half of the world cannot understand the pleasures of the other. | Jane Austen | Emma, Volume 1, Chapter 9 | 1815 |
| en-q15 | It was the best of times, it was the worst of times. | Charles Dickens | A Tale of Two Cities, Book 1, Chapter 1 | 1859 |
| en-q16 | Heaven knows we need never be ashamed of our tears. | Charles Dickens | Great Expectations, Chapter 19 | 1861 |
| en-q17 | Reader, I married him. | Charlotte Brontë | Jane Eyre, Chapter 38 | 1847 |
| en-q18 | I am no bird; and no net ensnares me. | Charlotte Brontë | Jane Eyre, Chapter 23 | 1847 |
| en-q19 | Curiouser and curiouser! | Lewis Carroll | Alice's Adventures in Wonderland, Chapter 2 | 1865 |
| en-q20 | Begin at the beginning, and go on till you come to the end: then stop. | Lewis Carroll | Alice's Adventures in Wonderland, Chapter 12 | 1865 |
| en-q21 | Why, sometimes I've believed as many as six impossible things before breakfast. | Lewis Carroll | Through the Looking-Glass, Chapter 5 | 1871 |
| en-q22 | It takes all the running you can do, to keep in the same place. | Lewis Carroll | Through the Looking-Glass, Chapter 2 | 1871 |
| en-q23 | We are all in the gutter, but some of us are looking at the stars. | Oscar Wilde | Lady Windermere's Fan, Act 3 | 1892 |
| en-q24 | I can resist everything except temptation. | Oscar Wilde | Lady Windermere's Fan, Act 1 | 1892 |
| en-q25 | Happy families are all alike; every unhappy family is unhappy in its own way. | Leo Tolstoy | Anna Karenina, Part 1, Chapter 1 (trans. Constance Garnett, 1901) | 1878 |
| en-q26 | Hope is the thing with feathers that perches in the soul. | Emily Dickinson | Poems, Second Series | 1891 |
| en-q27 | Do I contradict myself? Very well then I contradict myself, (I am large, I contain multitudes.) | Walt Whitman | Song of Myself, Leaves of Grass | 1855/1892 |
| en-q28 | The only way to have a friend is to be one. | Ralph Waldo Emerson | Friendship, Essays: First Series | 1841 |
| en-q29 | Well done is better than well said. | Benjamin Franklin | Poor Richard's Almanack | 1737 |
| en-q30 | Laugh, and the world laughs with you; weep, and you weep alone. | Ella Wheeler Wilcox | Solitude | 1883 |
| en-q31 | I'm not afraid of storms, for I'm learning how to sail my ship. | Louisa May Alcott | Little Women | 1868-69 |
| en-q32 | There is no place like home. | L. Frank Baum | The Wonderful Wizard of Oz | 1900 |
| en-q33 | Work consists of whatever a body is obliged to do, and Play consists of whatever a body is not obliged to do. | Mark Twain | The Adventures of Tom Sawyer, Chapter 2 | 1876 |
| en-q34 | The only way to get rid of a temptation is to yield to it. | Oscar Wilde | The Picture of Dorian Gray, Chapter 2 | 1890/1891 |

```json
[
  {"id": "en-q01", "lang": "en", "kind": "quote", "text": "All the world's a stage, and all the men and women merely players.", "author": "William Shakespeare", "work": "As You Like It, Act 2, Scene 7", "year": "c. 1599"},
  {"id": "en-q02", "lang": "en", "kind": "quote", "text": "To be, or not to be, that is the question.", "author": "William Shakespeare", "work": "Hamlet, Act 3, Scene 1", "year": "c. 1600", "note": "punctuation varies between editions"},
  {"id": "en-q03", "lang": "en", "kind": "quote", "text": "The course of true love never did run smooth.", "author": "William Shakespeare", "work": "A Midsummer Night's Dream, Act 1, Scene 1", "year": "c. 1595"},
  {"id": "en-q04", "lang": "en", "kind": "quote", "text": "Brevity is the soul of wit.", "author": "William Shakespeare", "work": "Hamlet, Act 2, Scene 2", "year": "c. 1600"},
  {"id": "en-q05", "lang": "en", "kind": "quote", "text": "There is nothing either good or bad but thinking makes it so.", "author": "William Shakespeare", "work": "Hamlet, Act 2, Scene 2", "year": "c. 1600"},
  {"id": "en-q06", "lang": "en", "kind": "quote", "text": "This above all: to thine own self be true.", "author": "William Shakespeare", "work": "Hamlet, Act 1, Scene 3", "year": "c. 1600"},
  {"id": "en-q07", "lang": "en", "kind": "quote", "text": "Shall I compare thee to a summer's day?", "author": "William Shakespeare", "work": "Sonnet 18", "year": "1609"},
  {"id": "en-q08", "lang": "en", "kind": "quote", "text": "If music be the food of love, play on.", "author": "William Shakespeare", "work": "Twelfth Night, Act 1, Scene 1", "year": "c. 1601"},
  {"id": "en-q09", "lang": "en", "kind": "quote", "text": "Some are born great, some achieve greatness, and some have greatness thrust upon them.", "author": "William Shakespeare", "work": "Twelfth Night, Act 2, Scene 5", "year": "c. 1601"},
  {"id": "en-q10", "lang": "en", "kind": "quote", "text": "The fault, dear Brutus, is not in our stars, but in ourselves.", "author": "William Shakespeare", "work": "Julius Caesar, Act 1, Scene 2", "year": "c. 1599"},
  {"id": "en-q11", "lang": "en", "kind": "quote", "text": "What's in a name? That which we call a rose by any other name would smell as sweet.", "author": "William Shakespeare", "work": "Romeo and Juliet, Act 2, Scene 2", "year": "c. 1595"},
  {"id": "en-q12", "lang": "en", "kind": "quote", "text": "We are such stuff as dreams are made on.", "author": "William Shakespeare", "work": "The Tempest, Act 4, Scene 1", "year": "c. 1611", "note": "'on', not 'of'"},
  {"id": "en-q13", "lang": "en", "kind": "quote", "text": "It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.", "author": "Jane Austen", "work": "Pride and Prejudice, Chapter 1", "year": "1813", "note": "original commas kept"},
  {"id": "en-q14", "lang": "en", "kind": "quote", "text": "One half of the world cannot understand the pleasures of the other.", "author": "Jane Austen", "work": "Emma, Volume 1, Chapter 9", "year": "1815"},
  {"id": "en-q15", "lang": "en", "kind": "quote", "text": "It was the best of times, it was the worst of times.", "author": "Charles Dickens", "work": "A Tale of Two Cities, Book 1, Chapter 1", "year": "1859"},
  {"id": "en-q16", "lang": "en", "kind": "quote", "text": "Heaven knows we need never be ashamed of our tears.", "author": "Charles Dickens", "work": "Great Expectations, Chapter 19", "year": "1861"},
  {"id": "en-q17", "lang": "en", "kind": "quote", "text": "Reader, I married him.", "author": "Charlotte Brontë", "work": "Jane Eyre, Chapter 38", "year": "1847"},
  {"id": "en-q18", "lang": "en", "kind": "quote", "text": "I am no bird; and no net ensnares me.", "author": "Charlotte Brontë", "work": "Jane Eyre, Chapter 23", "year": "1847"},
  {"id": "en-q19", "lang": "en", "kind": "quote", "text": "Curiouser and curiouser!", "author": "Lewis Carroll", "work": "Alice's Adventures in Wonderland, Chapter 2", "year": "1865"},
  {"id": "en-q20", "lang": "en", "kind": "quote", "text": "Begin at the beginning, and go on till you come to the end: then stop.", "author": "Lewis Carroll", "work": "Alice's Adventures in Wonderland, Chapter 12", "year": "1865"},
  {"id": "en-q21", "lang": "en", "kind": "quote", "text": "Why, sometimes I've believed as many as six impossible things before breakfast.", "author": "Lewis Carroll", "work": "Through the Looking-Glass, Chapter 5", "year": "1871"},
  {"id": "en-q22", "lang": "en", "kind": "quote", "text": "It takes all the running you can do, to keep in the same place.", "author": "Lewis Carroll", "work": "Through the Looking-Glass, Chapter 2", "year": "1871"},
  {"id": "en-q23", "lang": "en", "kind": "quote", "text": "We are all in the gutter, but some of us are looking at the stars.", "author": "Oscar Wilde", "work": "Lady Windermere's Fan, Act 3", "year": "1892"},
  {"id": "en-q24", "lang": "en", "kind": "quote", "text": "I can resist everything except temptation.", "author": "Oscar Wilde", "work": "Lady Windermere's Fan, Act 1", "year": "1892"},
  {"id": "en-q25", "lang": "en", "kind": "quote", "text": "Happy families are all alike; every unhappy family is unhappy in its own way.", "author": "Leo Tolstoy", "work": "Anna Karenina, Part 1, Chapter 1 (trans. Constance Garnett, 1901)", "year": "1878", "note": "translation is public domain"},
  {"id": "en-q26", "lang": "en", "kind": "quote", "text": "Hope is the thing with feathers that perches in the soul.", "author": "Emily Dickinson", "work": "Poems, Second Series", "year": "1891", "note": "line break removed"},
  {"id": "en-q27", "lang": "en", "kind": "quote", "text": "Do I contradict myself? Very well then I contradict myself, (I am large, I contain multitudes.)", "author": "Walt Whitman", "work": "Song of Myself, Leaves of Grass", "year": "1855/1892", "note": "Whitman's own punctuation"},
  {"id": "en-q28", "lang": "en", "kind": "quote", "text": "The only way to have a friend is to be one.", "author": "Ralph Waldo Emerson", "work": "Friendship, Essays: First Series", "year": "1841"},
  {"id": "en-q29", "lang": "en", "kind": "quote", "text": "Well done is better than well said.", "author": "Benjamin Franklin", "work": "Poor Richard's Almanack", "year": "1737"},
  {"id": "en-q30", "lang": "en", "kind": "quote", "text": "Laugh, and the world laughs with you; weep, and you weep alone.", "author": "Ella Wheeler Wilcox", "work": "Solitude", "year": "1883"},
  {"id": "en-q31", "lang": "en", "kind": "quote", "text": "I'm not afraid of storms, for I'm learning how to sail my ship.", "author": "Louisa May Alcott", "work": "Little Women", "year": "1868-69"},
  {"id": "en-q32", "lang": "en", "kind": "quote", "text": "There is no place like home.", "author": "L. Frank Baum", "work": "The Wonderful Wizard of Oz", "year": "1900"},
  {"id": "en-q33", "lang": "en", "kind": "quote", "text": "Work consists of whatever a body is obliged to do, and Play consists of whatever a body is not obliged to do.", "author": "Mark Twain", "work": "The Adventures of Tom Sawyer, Chapter 2", "year": "1876", "note": "capitals as in original"},
  {"id": "en-q34", "lang": "en", "kind": "quote", "text": "The only way to get rid of a temptation is to yield to it.", "author": "Oscar Wilde", "work": "The Picture of Dorian Gray, Chapter 2", "year": "1890/1891"}
]
```

## 14. Content pack (e): Fix-it / proofreading texts (5 nl, 5 en, 5 ar)

Every text has 3–5 planted mistakes. The JSON gives each mistake's character span in the *wrong* text, so the UI can highlight it after the attempt. A script check confirms that applying the fixes in order turns `wrong` into `correct` exactly. The last column shows whether **LanguageTool 6.8 (open-source rules, run locally)** catches the planted mistake (see §16.2). These are the mistakes the custom rule engine must catch itself. Spans may overlap: in en-f3 the tense/interference mistake (`I follow ... since three weeks`) covers the clause that also contains `english`. A ` ... ` (space, three dots, space) in `wrong`/`right` marks a discontinuous edit.

### 14.1 Dutch

**nl-f1**

- Wrong: Hoi Mark, ik wordt morgen om negen uur op kantoor verwacht. Vindt jij het goed als ik je daarna bel? Mijn collega antwoord meestal pas na de lunch. Wordt je trouwens nog opgehaald na de vergadering?
- Correct: Hoi Mark, ik word morgen om negen uur op kantoor verwacht. Vind jij het goed als ik je daarna bel? Mijn collega antwoordt meestal pas na de lunch. Word je trouwens nog opgehaald na de vergadering?

| Wrong | Right | Type | Why | LT 6.8 |
|---|---|---|---|---|
| ik wordt | ik word | dt | After 'ik' the verb is just the stem: no t. / Na 'ik' schrijf je alleen de stam: geen t. | caught |
| Vindt jij | Vind jij | dt | When 'jij/je' comes after the verb, the t disappears. / Staat 'jij' of 'je' achter de persoonsvorm, dan valt de t weg. | caught |
| antwoord | antwoordt | dt | Third-person singular: stem + t (antwoord + t). / Hij, zij en het: stam + t (antwoord + t). | **missed** |
| Wordt je | Word je | dt | Inversion with 'je': stem only. / Inversie met 'je': alleen de stam. | caught |

**nl-f2**

- Wrong: Gisteren heb ik de boek gelezen die jij me had aangeraden. Het verhaal speelt zich af in een klein dorp in Friesland, waar een oud boer een geheim bewaart. Het meisje die de hoofdrol speelt, ontdekt het pas aan het einde.
- Correct: Gisteren heb ik het boek gelezen dat jij me had aangeraden. Het verhaal speelt zich af in een klein dorp in Friesland, waar een oude boer een geheim bewaart. Het meisje dat de hoofdrol speelt, ontdekt het pas aan het einde.

| Wrong | Right | Type | Why | LT 6.8 |
|---|---|---|---|---|
| de boek | het boek | de-het | 'Boek' is a het-word. / 'Boek' is een het-woord. | caught |
| die jij | dat jij | die-dat | A het-word takes the relative pronoun 'dat'. / Bij een het-woord hoort het betrekkelijk voornaamwoord 'dat'. | **missed** |
| een oud boer | een oude boer | adj-e | 'Boer' is a de-word, so the adjective gets -e, also after 'een'. / 'Boer' is een de-woord, dus het bijvoeglijk naamwoord krijgt een -e, ook na 'een'. | caught |
| Het meisje die | Het meisje dat | die-dat | 'Meisje' is a het-word (all diminutives are), so 'dat'. / 'Meisje' is een het-woord (alle verkleinwoorden zijn dat), dus 'dat'. | caught |

**nl-f3**

- Wrong: Tijdens onze reis door Belgie hebben we veel musea bezocht. De meeste foto,s heb ik met mijn telefoon gemaakt. Eigelijk wilden we ook naar Brugge, maar daar was geen tijd meer voor. Volgend jaar gaan we met de trein inplaats van met de auto.
- Correct: Tijdens onze reis door België hebben we veel musea bezocht. De meeste foto's heb ik met mijn telefoon gemaakt. Eigenlijk wilden we ook naar Brugge, maar daar was geen tijd meer voor. Volgend jaar gaan we met de trein in plaats van met de auto.

| Wrong | Right | Type | Why | LT 6.8 |
|---|---|---|---|---|
| Belgie | België | trema | A trema marks the start of a new syllable: Bel-gi-ë. / Het trema laat zien dat er een nieuwe lettergreep begint: Bel-gi-ë. | caught |
| foto,s | foto's | apostrophe | Plural of a word ending in a long vowel: apostrophe + s (not a comma). / Meervoud van een woord op een lange klinker: apostrof + s (geen komma). | caught |
| Eigelijk | Eigenlijk | spelling | The word is built from 'eigen' + 'lijk': eigenlijk. / Het woord bestaat uit 'eigen' + 'lijk': eigenlijk. | caught |
| inplaats | in plaats | split-join | 'In plaats van' is written as three separate words. / 'In plaats van' schrijf je als drie losse woorden. | caught |

**nl-f4**

- Wrong: Wat is er gisteren gebeurt? Ik heb de hele avond op je gewacht en je drie keer gebelt. Uiteindelijk fietstte ik naar je huis, maar er brande geen licht.
- Correct: Wat is er gisteren gebeurd? Ik heb de hele avond op je gewacht en je drie keer gebeld. Uiteindelijk fietste ik naar je huis, maar er brandde geen licht.

| Wrong | Right | Type | Why | LT 6.8 |
|---|---|---|---|---|
| gebeurt | gebeurd | participle | Past participle after 'is': 'gebeurd' ('t kofschip: r is not in it, so -d). / Voltooid deelwoord na 'is': 'gebeurd' (r zit niet in 't kofschip, dus -d). | caught |
| gebelt | gebeld | participle | Bellen: stem 'bel', l is not in 't kofschip, so the participle ends in -d. / Bellen: stam 'bel', l zit niet in 't kofschip, dus het deelwoord eindigt op -d. | caught |
| fietstte | fietste | kofschip | Past tense = stem 'fiets' + 'te'; no extra t. / Verleden tijd = stam 'fiets' + 'te'; geen extra t. | caught |
| brande | brandde | kofschip | Stem 'brand' + 'de' = brandde (double d). / Stam 'brand' + 'de' = brandde (dubbele d). | caught |

**nl-f5**

- Wrong: Mijn zus is twee jaar ouder als ik. Zij en haar man wonen in Leiden. Hun hebben net een nieuwe auto gekocht. Op Zaterdag ga ik bij ze langs, maar eerst moet ik naar de tand arts.
- Correct: Mijn zus is twee jaar ouder dan ik. Zij en haar man wonen in Leiden. Zij hebben net een nieuwe auto gekocht. Op zaterdag ga ik bij ze langs, maar eerst moet ik naar de tandarts.

| Wrong | Right | Type | Why | LT 6.8 |
|---|---|---|---|---|
| ouder als | ouder dan | als-dan | After a comparative (ouder, groter) use 'dan'. / Na een vergrotende trap (ouder, groter) gebruik je 'dan'. | **missed** |
| Hun hebben | Zij hebben | pronoun | 'Hun' is never a subject; use 'zij' or 'ze'. / 'Hun' is nooit onderwerp; gebruik 'zij' of 'ze'. | caught |
| Zaterdag | zaterdag | capital | Days of the week are lowercase in Dutch. / Dagen van de week schrijf je in het Nederlands met een kleine letter. | caught |
| tand arts | tandarts | compound | Compounds are written as one word. / Samenstellingen schrijf je aan elkaar. | **missed** |

```json
[
  {"id": "nl-f1", "lang": "nl", "wrong": "Hoi Mark, ik wordt morgen om negen uur op kantoor verwacht. Vindt jij het goed als ik je daarna bel? Mijn collega antwoord meestal pas na de lunch. Wordt je trouwens nog opgehaald na de vergadering?", "correct": "Hoi Mark, ik word morgen om negen uur op kantoor verwacht. Vind jij het goed als ik je daarna bel? Mijn collega antwoordt meestal pas na de lunch. Word je trouwens nog opgehaald na de vergadering?", "mistakes": [{"wrong": "ik wordt", "right": "ik word", "type": "dt", "start": 10, "end": 18, "explain": {"en": "After 'ik' the verb is just the stem: no t.", "nl": "Na 'ik' schrijf je alleen de stam: geen t."}}, {"wrong": "Vindt jij", "right": "Vind jij", "type": "dt", "start": 60, "end": 69, "explain": {"en": "When 'jij/je' comes after the verb, the t disappears.", "nl": "Staat 'jij' of 'je' achter de persoonsvorm, dan valt de t weg."}}, {"wrong": "antwoord", "right": "antwoordt", "type": "dt", "start": 114, "end": 122, "explain": {"en": "Third-person singular: stem + t (antwoord + t).", "nl": "Hij, zij en het: stam + t (antwoord + t)."}}, {"wrong": "Wordt je", "right": "Word je", "type": "dt", "start": 148, "end": 156, "explain": {"en": "Inversion with 'je': stem only.", "nl": "Inversie met 'je': alleen de stam."}}]},
  {"id": "nl-f2", "lang": "nl", "wrong": "Gisteren heb ik de boek gelezen die jij me had aangeraden. Het verhaal speelt zich af in een klein dorp in Friesland, waar een oud boer een geheim bewaart. Het meisje die de hoofdrol speelt, ontdekt het pas aan het einde.", "correct": "Gisteren heb ik het boek gelezen dat jij me had aangeraden. Het verhaal speelt zich af in een klein dorp in Friesland, waar een oude boer een geheim bewaart. Het meisje dat de hoofdrol speelt, ontdekt het pas aan het einde.", "mistakes": [{"wrong": "de boek", "right": "het boek", "type": "de-het", "start": 16, "end": 23, "explain": {"en": "'Boek' is a het-word.", "nl": "'Boek' is een het-woord."}}, {"wrong": "die jij", "right": "dat jij", "type": "die-dat", "start": 32, "end": 39, "explain": {"en": "A het-word takes the relative pronoun 'dat'.", "nl": "Bij een het-woord hoort het betrekkelijk voornaamwoord 'dat'."}}, {"wrong": "een oud boer", "right": "een oude boer", "type": "adj-e", "start": 123, "end": 135, "explain": {"en": "'Boer' is a de-word, so the adjective gets -e, also after 'een'.", "nl": "'Boer' is een de-woord, dus het bijvoeglijk naamwoord krijgt een -e, ook na 'een'."}}, {"wrong": "Het meisje die", "right": "Het meisje dat", "type": "die-dat", "start": 156, "end": 170, "explain": {"en": "'Meisje' is a het-word (all diminutives are), so 'dat'.", "nl": "'Meisje' is een het-woord (alle verkleinwoorden zijn dat), dus 'dat'."}}]},
  {"id": "nl-f3", "lang": "nl", "wrong": "Tijdens onze reis door Belgie hebben we veel musea bezocht. De meeste foto,s heb ik met mijn telefoon gemaakt. Eigelijk wilden we ook naar Brugge, maar daar was geen tijd meer voor. Volgend jaar gaan we met de trein inplaats van met de auto.", "correct": "Tijdens onze reis door België hebben we veel musea bezocht. De meeste foto's heb ik met mijn telefoon gemaakt. Eigenlijk wilden we ook naar Brugge, maar daar was geen tijd meer voor. Volgend jaar gaan we met de trein in plaats van met de auto.", "mistakes": [{"wrong": "Belgie", "right": "België", "type": "trema", "start": 23, "end": 29, "explain": {"en": "A trema marks the start of a new syllable: Bel-gi-ë.", "nl": "Het trema laat zien dat er een nieuwe lettergreep begint: Bel-gi-ë."}}, {"wrong": "foto,s", "right": "foto's", "type": "apostrophe", "start": 70, "end": 76, "explain": {"en": "Plural of a word ending in a long vowel: apostrophe + s (not a comma).", "nl": "Meervoud van een woord op een lange klinker: apostrof + s (geen komma)."}}, {"wrong": "Eigelijk", "right": "Eigenlijk", "type": "spelling", "start": 111, "end": 119, "explain": {"en": "The word is built from 'eigen' + 'lijk': eigenlijk.", "nl": "Het woord bestaat uit 'eigen' + 'lijk': eigenlijk."}}, {"wrong": "inplaats", "right": "in plaats", "type": "split-join", "start": 216, "end": 224, "explain": {"en": "'In plaats van' is written as three separate words.", "nl": "'In plaats van' schrijf je als drie losse woorden."}}]},
  {"id": "nl-f4", "lang": "nl", "wrong": "Wat is er gisteren gebeurt? Ik heb de hele avond op je gewacht en je drie keer gebelt. Uiteindelijk fietstte ik naar je huis, maar er brande geen licht.", "correct": "Wat is er gisteren gebeurd? Ik heb de hele avond op je gewacht en je drie keer gebeld. Uiteindelijk fietste ik naar je huis, maar er brandde geen licht.", "mistakes": [{"wrong": "gebeurt", "right": "gebeurd", "type": "participle", "start": 19, "end": 26, "explain": {"en": "Past participle after 'is': 'gebeurd' ('t kofschip: r is not in it, so -d).", "nl": "Voltooid deelwoord na 'is': 'gebeurd' (r zit niet in 't kofschip, dus -d)."}}, {"wrong": "gebelt", "right": "gebeld", "type": "participle", "start": 79, "end": 85, "explain": {"en": "Bellen: stem 'bel', l is not in 't kofschip, so the participle ends in -d.", "nl": "Bellen: stam 'bel', l zit niet in 't kofschip, dus het deelwoord eindigt op -d."}}, {"wrong": "fietstte", "right": "fietste", "type": "kofschip", "start": 100, "end": 108, "explain": {"en": "Past tense = stem 'fiets' + 'te'; no extra t.", "nl": "Verleden tijd = stam 'fiets' + 'te'; geen extra t."}}, {"wrong": "brande", "right": "brandde", "type": "kofschip", "start": 134, "end": 140, "explain": {"en": "Stem 'brand' + 'de' = brandde (double d).", "nl": "Stam 'brand' + 'de' = brandde (dubbele d)."}}]},
  {"id": "nl-f5", "lang": "nl", "wrong": "Mijn zus is twee jaar ouder als ik. Zij en haar man wonen in Leiden. Hun hebben net een nieuwe auto gekocht. Op Zaterdag ga ik bij ze langs, maar eerst moet ik naar de tand arts.", "correct": "Mijn zus is twee jaar ouder dan ik. Zij en haar man wonen in Leiden. Zij hebben net een nieuwe auto gekocht. Op zaterdag ga ik bij ze langs, maar eerst moet ik naar de tandarts.", "mistakes": [{"wrong": "ouder als", "right": "ouder dan", "type": "als-dan", "start": 22, "end": 31, "explain": {"en": "After a comparative (ouder, groter) use 'dan'.", "nl": "Na een vergrotende trap (ouder, groter) gebruik je 'dan'."}}, {"wrong": "Hun hebben", "right": "Zij hebben", "type": "pronoun", "start": 69, "end": 79, "explain": {"en": "'Hun' is never a subject; use 'zij' or 'ze'.", "nl": "'Hun' is nooit onderwerp; gebruik 'zij' of 'ze'."}}, {"wrong": "Zaterdag", "right": "zaterdag", "type": "capital", "start": 112, "end": 120, "explain": {"en": "Days of the week are lowercase in Dutch.", "nl": "Dagen van de week schrijf je in het Nederlands met een kleine letter."}}, {"wrong": "tand arts", "right": "tandarts", "type": "compound", "start": 168, "end": 177, "explain": {"en": "Compounds are written as one word.", "nl": "Samenstellingen schrijf je aan elkaar."}}]}
]
```

### 14.2 English

**en-f1**

- Wrong: Their going to the beach tomorrow, even though it's supposed to rain. Your welcome to join us if you're free. Anything is better then staying at home. The dog wagged it's tail when it heard the news.
- Correct: They're going to the beach tomorrow, even though it's supposed to rain. You're welcome to join us if you're free. Anything is better than staying at home. The dog wagged its tail when it heard the news.

| Wrong | Right | Type | Why | LT 6.8 |
|---|---|---|---|---|
| Their going | They're going | homophone | They're = they are. | **missed** |
| Your welcome | You're welcome | homophone | You're = you are. | **missed** |
| better then | better than | then-than | Use 'than' for comparisons, 'then' for time. | caught |
| it's tail | its tail | its-its | 'Its' (no apostrophe) is possessive; 'it's' = it is. | **missed** |

**en-f2**

- Wrong: Hello Priya, I recieved your email about the accomodation for our trip. We will definately need two seperate rooms. Please let me know if a deposit is necessary.
- Correct: Hello Priya, I received your email about the accommodation for our trip. We will definitely need two separate rooms. Please let me know if a deposit is necessary.

| Wrong | Right | Type | Why | LT 6.8 |
|---|---|---|---|---|
| recieved | received | ie-ei | Remember: 'i before e, except after c', so receive. | caught |
| accomodation | accommodation | double-letters | Double c and double m: accommodation. | caught |
| definately | definitely | spelling | Think of 'finite': defin-ite-ly. | caught |
| seperate | separate | spelling | There is 'a rat' in separate. | caught |

**en-f3**

- Wrong: I follow an english course since three weeks. The teacher is very sympathetic and explains everything clearly. Every monday we have a speaking class, and in march we will have our first exam.
- Correct: I have been taking an English course for three weeks. The teacher is very nice and explains everything clearly. Every Monday we have a speaking class, and in March we will have our first exam.

| Wrong | Right | Type | Why | LT 6.8 |
|---|---|---|---|---|
| I follow ... since three weeks | I have been taking ... for three weeks | tense/interference | Dutch 'ik volg ... sinds' becomes present perfect continuous + 'for' with a period of time. | caught |
| english | English | capital | Languages take a capital letter in English (not in Dutch). | caught |
| sympathetic | nice | false-friend | Dutch 'sympathiek' means nice or likeable; English 'sympathetic' means compassionate. | **missed** |
| monday | Monday | capital | Days of the week take a capital letter in English. | caught |
| march | March | capital | Months take a capital letter in English. | caught |

**en-f4**

- Wrong: Yesterday I buyed a new laptop. The shop assistant were very helpful, and she explained me all the settings. I should of checked the price online first, though.
- Correct: Yesterday I bought a new laptop. The shop assistant was very helpful, and she explained all the settings to me. I should have checked the price online first, though.

| Wrong | Right | Type | Why | LT 6.8 |
|---|---|---|---|---|
| buyed | bought | irregular-past | 'Buy' is irregular: buy, bought, bought. | caught |
| were | was | agreement | One assistant: singular verb 'was'. | **missed** |
| explained me all the settings | explained all the settings to me | verb-pattern | 'Explain' needs 'to': explain something to someone (Dutch 'uitleggen' has no 'to'). | **missed** |
| should of | should have | could-have | 'Should've' sounds like 'should of', but the word is 'have'. | caught |

**en-f5**

- Wrong: Try not to loose your keys again. The new rules will effect everyone, especially people who's cars are parked on the street. There are less parking spaces than last year, and alot of people are angry.
- Correct: Try not to lose your keys again. The new rules will affect everyone, especially people whose cars are parked on the street. There are fewer parking spaces than last year, and a lot of people are angry.

| Wrong | Right | Type | Why | LT 6.8 |
|---|---|---|---|---|
| loose | lose | loose-lose | 'Lose' (one o) = misplace; 'loose' = not tight. | caught |
| effect | affect | affect-effect | 'Affect' is usually the verb, 'effect' the noun. | caught |
| who's | whose | whose-whos | 'Whose' is possessive; 'who's' = who is. | caught |
| less | fewer | fewer-less | Countable nouns (spaces) take 'fewer'. | **missed** |
| alot | a lot | split-join | 'A lot' is always two words. | caught |

```json
[
  {"id": "en-f1", "lang": "en", "wrong": "Their going to the beach tomorrow, even though it's supposed to rain. Your welcome to join us if you're free. Anything is better then staying at home. The dog wagged it's tail when it heard the news.", "correct": "They're going to the beach tomorrow, even though it's supposed to rain. You're welcome to join us if you're free. Anything is better than staying at home. The dog wagged its tail when it heard the news.", "mistakes": [{"wrong": "Their going", "right": "They're going", "type": "homophone", "start": 0, "end": 11, "explain": {"en": "They're = they are."}}, {"wrong": "Your welcome", "right": "You're welcome", "type": "homophone", "start": 70, "end": 82, "explain": {"en": "You're = you are."}}, {"wrong": "better then", "right": "better than", "type": "then-than", "start": 122, "end": 133, "explain": {"en": "Use 'than' for comparisons, 'then' for time."}}, {"wrong": "it's tail", "right": "its tail", "type": "its-its", "start": 166, "end": 175, "explain": {"en": "'Its' (no apostrophe) is possessive; 'it's' = it is."}}]},
  {"id": "en-f2", "lang": "en", "wrong": "Hello Priya, I recieved your email about the accomodation for our trip. We will definately need two seperate rooms. Please let me know if a deposit is necessary.", "correct": "Hello Priya, I received your email about the accommodation for our trip. We will definitely need two separate rooms. Please let me know if a deposit is necessary.", "mistakes": [{"wrong": "recieved", "right": "received", "type": "ie-ei", "start": 15, "end": 23, "explain": {"en": "Remember: 'i before e, except after c', so receive."}}, {"wrong": "accomodation", "right": "accommodation", "type": "double-letters", "start": 45, "end": 57, "explain": {"en": "Double c and double m: accommodation."}}, {"wrong": "definately", "right": "definitely", "type": "spelling", "start": 80, "end": 90, "explain": {"en": "Think of 'finite': defin-ite-ly."}}, {"wrong": "seperate", "right": "separate", "type": "spelling", "start": 100, "end": 108, "explain": {"en": "There is 'a rat' in separate."}}]},
  {"id": "en-f3", "lang": "en", "wrong": "I follow an english course since three weeks. The teacher is very sympathetic and explains everything clearly. Every monday we have a speaking class, and in march we will have our first exam.", "correct": "I have been taking an English course for three weeks. The teacher is very nice and explains everything clearly. Every Monday we have a speaking class, and in March we will have our first exam.", "mistakes": [{"wrong": "I follow ... since three weeks", "right": "I have been taking ... for three weeks", "type": "tense/interference", "start": 0, "end": 44, "explain": {"en": "Dutch 'ik volg ... sinds' becomes present perfect continuous + 'for' with a period of time."}}, {"wrong": "english", "right": "English", "type": "capital", "start": 12, "end": 19, "explain": {"en": "Languages take a capital letter in English (not in Dutch)."}}, {"wrong": "sympathetic", "right": "nice", "type": "false-friend", "start": 66, "end": 77, "explain": {"en": "Dutch 'sympathiek' means nice or likeable; English 'sympathetic' means compassionate."}}, {"wrong": "monday", "right": "Monday", "type": "capital", "start": 117, "end": 123, "explain": {"en": "Days of the week take a capital letter in English."}}, {"wrong": "march", "right": "March", "type": "capital", "start": 157, "end": 162, "explain": {"en": "Months take a capital letter in English."}}]},
  {"id": "en-f4", "lang": "en", "wrong": "Yesterday I buyed a new laptop. The shop assistant were very helpful, and she explained me all the settings. I should of checked the price online first, though.", "correct": "Yesterday I bought a new laptop. The shop assistant was very helpful, and she explained all the settings to me. I should have checked the price online first, though.", "mistakes": [{"wrong": "buyed", "right": "bought", "type": "irregular-past", "start": 12, "end": 17, "explain": {"en": "'Buy' is irregular: buy, bought, bought."}}, {"wrong": "were", "right": "was", "type": "agreement", "start": 51, "end": 55, "explain": {"en": "One assistant: singular verb 'was'."}}, {"wrong": "explained me all the settings", "right": "explained all the settings to me", "type": "verb-pattern", "start": 78, "end": 107, "explain": {"en": "'Explain' needs 'to': explain something to someone (Dutch 'uitleggen' has no 'to')."}}, {"wrong": "should of", "right": "should have", "type": "could-have", "start": 111, "end": 120, "explain": {"en": "'Should've' sounds like 'should of', but the word is 'have'."}}]},
  {"id": "en-f5", "lang": "en", "wrong": "Try not to loose your keys again. The new rules will effect everyone, especially people who's cars are parked on the street. There are less parking spaces than last year, and alot of people are angry.", "correct": "Try not to lose your keys again. The new rules will affect everyone, especially people whose cars are parked on the street. There are fewer parking spaces than last year, and a lot of people are angry.", "mistakes": [{"wrong": "loose", "right": "lose", "type": "loose-lose", "start": 11, "end": 16, "explain": {"en": "'Lose' (one o) = misplace; 'loose' = not tight."}}, {"wrong": "effect", "right": "affect", "type": "affect-effect", "start": 53, "end": 59, "explain": {"en": "'Affect' is usually the verb, 'effect' the noun."}}, {"wrong": "who's", "right": "whose", "type": "whose-whos", "start": 88, "end": 93, "explain": {"en": "'Whose' is possessive; 'who's' = who is."}}, {"wrong": "less", "right": "fewer", "type": "fewer-less", "start": 135, "end": 139, "explain": {"en": "Countable nouns (spaces) take 'fewer'."}}, {"wrong": "alot", "right": "a lot", "type": "split-join", "start": 175, "end": 179, "explain": {"en": "'A lot' is always two words."}}]}
]
```

### 14.3 Arabic

**ar-f1**

- Wrong: ذهبت الى المدرسه مبكرا، وقابلت صديقي احمد.
- Correct: ذهبت إلى المدرسة مبكرا، وقابلت صديقي أحمد.

| Wrong | Right | Type | Why | LT 6.8 |
|---|---|---|---|---|
| الى | إلى | hamza | Hamzat qat' under the alif: إلى. | caught |
| المدرسه | المدرسة | taa-marbuta | Feminine ending is taa marbuta (ة), not haa (ه). | caught |
| احمد | أحمد | hamza | The name starts with hamzat qat' on the alif: أحمد. | **missed** |

**ar-f2**

- Wrong: سال المعلم سوالا صعبا، فاجاب الطالب بسرعه.
- Correct: سأل المعلم سؤالا صعبا، فأجاب الطالب بسرعة.

| Wrong | Right | Type | Why | LT 6.8 |
|---|---|---|---|---|
| سال | سأل | hamza | Without hamza, سال means 'flowed'; 'asked' is سأل. | **missed** |
| سوالا | سؤالا | hamza | Hamza on waw: سؤال. | caught |
| فاجاب | فأجاب | hamza | Form IV verb: hamzat qat' (أجاب). | caught |
| بسرعه | بسرعة | taa-marbuta | Taa marbuta, not haa. | **missed** |

**ar-f3**

- Wrong: مشي مصطفي الي المستشفي مساء امس.
- Correct: مشى مصطفى إلى المستشفى مساء أمس.

| Wrong | Right | Type | Why | LT 6.8 |
|---|---|---|---|---|
| مشي | مشى | alif-maqsura | Final alif maqsura (ى) has no dots. | **missed** |
| مصطفي | مصطفى | alif-maqsura | The name ends in alif maqsura. | caught |
| الي | إلى | hamza+alif-maqsura | Two problems: missing hamza and dotted yaa. | caught |
| المستشفي | المستشفى | alif-maqsura | Ends in alif maqsura. | **missed** |
| امس | أمس | hamza | Hamzat qat': أمس. | **missed** |

**ar-f4**

- Wrong: انتضرت صديقتي في الحديقه حتى الضهر.
- Correct: انتظرت صديقتي في الحديقة حتى الظهر.

| Wrong | Right | Type | Why | LT 6.8 |
|---|---|---|---|---|
| انتضرت | انتظرت | dad-zaa | The root is ن-ظ-ر (ظ), not ض. | caught |
| الحديقه | الحديقة | taa-marbuta | Taa marbuta, not haa. | caught |
| الضهر | الظهر | dad-zaa | 'Noon' is الظهر with ظ. | caught |

**ar-f5**

- Wrong: إستمعت الى الأخبار، ثم تناولت الإفطار مع إبني.
- Correct: استمعت إلى الأخبار، ثم تناولت الإفطار مع ابني.

| Wrong | Right | Type | Why | LT 6.8 |
|---|---|---|---|---|
| إستمعت | استمعت | hamzat-wasl | Form VIII verbs start with hamzat wasl: no hamza is written. | caught |
| الى | إلى | hamza | Hamzat qat' under the alif. | caught |
| إبني | ابني | hamzat-wasl | ابن starts with hamzat wasl: no hamza is written. | caught |

```json
[
  {"id": "ar-f1", "lang": "ar", "wrong": "ذهبت الى المدرسه مبكرا، وقابلت صديقي احمد.", "correct": "ذهبت إلى المدرسة مبكرا، وقابلت صديقي أحمد.", "mistakes": [{"wrong": "الى", "right": "إلى", "type": "hamza", "start": 5, "end": 8, "explain": {"en": "Hamzat qat' under the alif: إلى."}}, {"wrong": "المدرسه", "right": "المدرسة", "type": "taa-marbuta", "start": 9, "end": 16, "explain": {"en": "Feminine ending is taa marbuta (ة), not haa (ه)."}}, {"wrong": "احمد", "right": "أحمد", "type": "hamza", "start": 37, "end": 41, "explain": {"en": "The name starts with hamzat qat' on the alif: أحمد."}}]},
  {"id": "ar-f2", "lang": "ar", "wrong": "سال المعلم سوالا صعبا، فاجاب الطالب بسرعه.", "correct": "سأل المعلم سؤالا صعبا، فأجاب الطالب بسرعة.", "mistakes": [{"wrong": "سال", "right": "سأل", "type": "hamza", "start": 0, "end": 3, "explain": {"en": "Without hamza, سال means 'flowed'; 'asked' is سأل."}}, {"wrong": "سوالا", "right": "سؤالا", "type": "hamza", "start": 11, "end": 16, "explain": {"en": "Hamza on waw: سؤال."}}, {"wrong": "فاجاب", "right": "فأجاب", "type": "hamza", "start": 23, "end": 28, "explain": {"en": "Form IV verb: hamzat qat' (أجاب)."}}, {"wrong": "بسرعه", "right": "بسرعة", "type": "taa-marbuta", "start": 36, "end": 41, "explain": {"en": "Taa marbuta, not haa."}}]},
  {"id": "ar-f3", "lang": "ar", "wrong": "مشي مصطفي الي المستشفي مساء امس.", "correct": "مشى مصطفى إلى المستشفى مساء أمس.", "mistakes": [{"wrong": "مشي", "right": "مشى", "type": "alif-maqsura", "start": 0, "end": 3, "explain": {"en": "Final alif maqsura (ى) has no dots."}}, {"wrong": "مصطفي", "right": "مصطفى", "type": "alif-maqsura", "start": 4, "end": 9, "explain": {"en": "The name ends in alif maqsura."}}, {"wrong": "الي", "right": "إلى", "type": "hamza+alif-maqsura", "start": 10, "end": 13, "explain": {"en": "Two problems: missing hamza and dotted yaa."}}, {"wrong": "المستشفي", "right": "المستشفى", "type": "alif-maqsura", "start": 14, "end": 22, "explain": {"en": "Ends in alif maqsura."}}, {"wrong": "امس", "right": "أمس", "type": "hamza", "start": 28, "end": 31, "explain": {"en": "Hamzat qat': أمس."}}]},
  {"id": "ar-f4", "lang": "ar", "wrong": "انتضرت صديقتي في الحديقه حتى الضهر.", "correct": "انتظرت صديقتي في الحديقة حتى الظهر.", "mistakes": [{"wrong": "انتضرت", "right": "انتظرت", "type": "dad-zaa", "start": 0, "end": 6, "explain": {"en": "The root is ن-ظ-ر (ظ), not ض."}}, {"wrong": "الحديقه", "right": "الحديقة", "type": "taa-marbuta", "start": 17, "end": 24, "explain": {"en": "Taa marbuta, not haa."}}, {"wrong": "الضهر", "right": "الظهر", "type": "dad-zaa", "start": 29, "end": 34, "explain": {"en": "'Noon' is الظهر with ظ."}}]},
  {"id": "ar-f5", "lang": "ar", "wrong": "إستمعت الى الأخبار، ثم تناولت الإفطار مع إبني.", "correct": "استمعت إلى الأخبار، ثم تناولت الإفطار مع ابني.", "mistakes": [{"wrong": "إستمعت", "right": "استمعت", "type": "hamzat-wasl", "start": 0, "end": 6, "explain": {"en": "Form VIII verbs start with hamzat wasl: no hamza is written."}}, {"wrong": "الى", "right": "إلى", "type": "hamza", "start": 7, "end": 10, "explain": {"en": "Hamzat qat' under the alif."}}, {"wrong": "إبني", "right": "ابني", "type": "hamzat-wasl", "start": 41, "end": 45, "explain": {"en": "ابن starts with hamzat wasl: no hamza is written."}}]}
]
```

## 15. Bonus content: Grammar-gym starter items (42)

Every item has a gap, its options, the answer, the rule label and the `full` sentence. After each pick the user types the `full` sentence ("type to lock it in"; see §5.5). Most items are minimal pairs, deliberately: d/t pairs appear as both members, so the user never just learns "always pick the t".

### 15.1 Dutch

| # | Pack | Item | Options | Answer | Rule |
|---|---|---|---|---|---|
| nl-g01 | dt | Ik ___ morgen opgehaald. | word / wordt | word | ik + stem |
| nl-g02 | dt | ___ je morgen opgehaald? | Word / Wordt | Word | inversion with je: stem |
| nl-g03 | dt | Mijn broer ___ morgen opgehaald. | word / wordt | wordt | hij/zij/het: stem + t |
| nl-g04 | dt | ___ jouw broer morgen opgehaald? | Word / Wordt | Wordt | jouw is possessive; the subject is 'jouw broer' (he): stem + t |
| nl-g05 | dt | Hij ___ het een goed idee. | vind / vindt | vindt | hij: stem + t |
| nl-g06 | dt | ___ jij het ook een goed idee? | Vind / Vindt | Vind | inversion with jij: stem |
| nl-g07 | dt | Het is gisteren ___. | gebeurd / gebeurt | gebeurd | participle after is/heeft: 't kofschip |
| nl-g08 | dt | Dat ___ bijna nooit. | gebeurd / gebeurt | gebeurt | present tense, het/dat: stem + t |
| nl-g09 | dt | Zij heeft haar fouten ___. | verbeterd / verbetert | verbeterd | participle |
| nl-g10 | dt | Zij ___ elke dag haar fouten. | verbeterd / verbetert | verbetert | present tense |
| nl-g11 | dt | Gisteren ___ hij meteen. | antwoordde / antwoorde | antwoordde | stem antwoord + de |
| nl-g12 | dt | De brandweer ___ de kat uit de boom. | red / redt | redt | stem red + t |
| nl-g13 | de-het | Ik zoek ___ sleutel van de schuur. | de / het | de | sleutel is a de-word |
| nl-g14 | de-het | Ik heb ___ raam opengezet. | de / het | het | raam is a het-word |
| nl-g15 | die-dat | Het huis ___ we hebben gekocht, is oud. | die / dat | dat | het-word: dat |
| nl-g16 | die-dat | De man ___ naast ons woont, is aardig. | die / dat | die | de-word: die |
| nl-g17 | adj-e | Ze woont in een ___ huis. | groot / grote | groot | een + het-word: no -e |
| nl-g18 | adj-e | Ze woont in het ___ huis op de hoek. | groot / grote | grote | het + het-word: -e |
| nl-g19 | als-dan | Mijn fiets is sneller ___ de jouwe. | als / dan | dan | comparative + dan |
| nl-g20 | als-dan | Mijn fiets is even snel ___ de jouwe. | als / dan | als | even/zo + als |
| nl-g21 | ei-ij | Het ___ van het water stijgt snel. | peil / pijl | peil | het peil = level; de pijl = arrow |
| nl-g22 | ei-ij | We gaan op ___ naar Italië. | reis / rijs | reis | de reis (journey) |
| nl-g23 | ei-ij | Hij ___ aan een zware griep. | leidt / lijdt | lijdt | lijden = suffer |
| nl-g24 | ei-ij | Zij ___ het bedrijf al tien jaar. | leidt / lijdt | leidt | leiden = lead |

```json
[
  {"id": "nl-g01", "lang": "nl", "pack": "dt", "prompt": "Ik ___ morgen opgehaald.", "options": ["word", "wordt"], "answer": "word", "rule": "ik + stem", "full": "Ik word morgen opgehaald."},
  {"id": "nl-g02", "lang": "nl", "pack": "dt", "prompt": "___ je morgen opgehaald?", "options": ["Word", "Wordt"], "answer": "Word", "rule": "inversion with je: stem", "full": "Word je morgen opgehaald?"},
  {"id": "nl-g03", "lang": "nl", "pack": "dt", "prompt": "Mijn broer ___ morgen opgehaald.", "options": ["word", "wordt"], "answer": "wordt", "rule": "hij/zij/het: stem + t", "full": "Mijn broer wordt morgen opgehaald."},
  {"id": "nl-g04", "lang": "nl", "pack": "dt", "prompt": "___ jouw broer morgen opgehaald?", "options": ["Word", "Wordt"], "answer": "Wordt", "rule": "jouw is possessive; the subject is 'jouw broer' (he): stem + t", "full": "Wordt jouw broer morgen opgehaald?"},
  {"id": "nl-g05", "lang": "nl", "pack": "dt", "prompt": "Hij ___ het een goed idee.", "options": ["vind", "vindt"], "answer": "vindt", "rule": "hij: stem + t", "full": "Hij vindt het een goed idee."},
  {"id": "nl-g06", "lang": "nl", "pack": "dt", "prompt": "___ jij het ook een goed idee?", "options": ["Vind", "Vindt"], "answer": "Vind", "rule": "inversion with jij: stem", "full": "Vind jij het ook een goed idee?"},
  {"id": "nl-g07", "lang": "nl", "pack": "dt", "prompt": "Het is gisteren ___.", "options": ["gebeurd", "gebeurt"], "answer": "gebeurd", "rule": "participle after is/heeft: 't kofschip", "full": "Het is gisteren gebeurd."},
  {"id": "nl-g08", "lang": "nl", "pack": "dt", "prompt": "Dat ___ bijna nooit.", "options": ["gebeurd", "gebeurt"], "answer": "gebeurt", "rule": "present tense, het/dat: stem + t", "full": "Dat gebeurt bijna nooit."},
  {"id": "nl-g09", "lang": "nl", "pack": "dt", "prompt": "Zij heeft haar fouten ___.", "options": ["verbeterd", "verbetert"], "answer": "verbeterd", "rule": "participle", "full": "Zij heeft haar fouten verbeterd."},
  {"id": "nl-g10", "lang": "nl", "pack": "dt", "prompt": "Zij ___ elke dag haar fouten.", "options": ["verbeterd", "verbetert"], "answer": "verbetert", "rule": "present tense", "full": "Zij verbetert elke dag haar fouten."},
  {"id": "nl-g11", "lang": "nl", "pack": "dt", "prompt": "Gisteren ___ hij meteen.", "options": ["antwoordde", "antwoorde"], "answer": "antwoordde", "rule": "stem antwoord + de", "full": "Gisteren antwoordde hij meteen."},
  {"id": "nl-g12", "lang": "nl", "pack": "dt", "prompt": "De brandweer ___ de kat uit de boom.", "options": ["red", "redt"], "answer": "redt", "rule": "stem red + t", "full": "De brandweer redt de kat uit de boom."},
  {"id": "nl-g13", "lang": "nl", "pack": "de-het", "prompt": "Ik zoek ___ sleutel van de schuur.", "options": ["de", "het"], "answer": "de", "rule": "sleutel is a de-word", "full": "Ik zoek de sleutel van de schuur."},
  {"id": "nl-g14", "lang": "nl", "pack": "de-het", "prompt": "Ik heb ___ raam opengezet.", "options": ["de", "het"], "answer": "het", "rule": "raam is a het-word", "full": "Ik heb het raam opengezet."},
  {"id": "nl-g15", "lang": "nl", "pack": "die-dat", "prompt": "Het huis ___ we hebben gekocht, is oud.", "options": ["die", "dat"], "answer": "dat", "rule": "het-word: dat", "full": "Het huis dat we hebben gekocht, is oud."},
  {"id": "nl-g16", "lang": "nl", "pack": "die-dat", "prompt": "De man ___ naast ons woont, is aardig.", "options": ["die", "dat"], "answer": "die", "rule": "de-word: die", "full": "De man die naast ons woont, is aardig."},
  {"id": "nl-g17", "lang": "nl", "pack": "adj-e", "prompt": "Ze woont in een ___ huis.", "options": ["groot", "grote"], "answer": "groot", "rule": "een + het-word: no -e", "full": "Ze woont in een groot huis."},
  {"id": "nl-g18", "lang": "nl", "pack": "adj-e", "prompt": "Ze woont in het ___ huis op de hoek.", "options": ["groot", "grote"], "answer": "grote", "rule": "het + het-word: -e", "full": "Ze woont in het grote huis op de hoek."},
  {"id": "nl-g19", "lang": "nl", "pack": "als-dan", "prompt": "Mijn fiets is sneller ___ de jouwe.", "options": ["als", "dan"], "answer": "dan", "rule": "comparative + dan", "full": "Mijn fiets is sneller dan de jouwe."},
  {"id": "nl-g20", "lang": "nl", "pack": "als-dan", "prompt": "Mijn fiets is even snel ___ de jouwe.", "options": ["als", "dan"], "answer": "als", "rule": "even/zo + als", "full": "Mijn fiets is even snel als de jouwe."},
  {"id": "nl-g21", "lang": "nl", "pack": "ei-ij", "prompt": "Het ___ van het water stijgt snel.", "options": ["peil", "pijl"], "answer": "peil", "rule": "het peil = level; de pijl = arrow", "full": "Het peil van het water stijgt snel."},
  {"id": "nl-g22", "lang": "nl", "pack": "ei-ij", "prompt": "We gaan op ___ naar Italië.", "options": ["reis", "rijs"], "answer": "reis", "rule": "de reis (journey)", "full": "We gaan op reis naar Italië."},
  {"id": "nl-g23", "lang": "nl", "pack": "ei-ij", "prompt": "Hij ___ aan een zware griep.", "options": ["leidt", "lijdt"], "answer": "lijdt", "rule": "lijden = suffer", "full": "Hij lijdt aan een zware griep."},
  {"id": "nl-g24", "lang": "nl", "pack": "ei-ij", "prompt": "Zij ___ het bedrijf al tien jaar.", "options": ["leidt", "lijdt"], "answer": "leidt", "rule": "leiden = lead", "full": "Zij leidt het bedrijf al tien jaar."}
]
```

### 15.2 English

| # | Pack | Item | Options | Answer | Rule |
|---|---|---|---|---|---|
| en-g01 | its | The company changed ___ logo. | its / it's | its | possessive: its |
| en-g02 | its | ___ getting late. | Its / It's | It's | it is |
| en-g03 | their | ___ house is next to the park. | Their / There / They're | Their | possessive |
| en-g04 | their | ___ always late on Mondays. | Their / There / They're | They're | they are |
| en-g05 | your | ___ going to love this. | Your / You're | You're | you are |
| en-g06 | than | This test is harder ___ the last one. | than / then | than | comparison |
| en-g07 | than | Finish your work, and ___ we can go. | than / then | then | time/sequence |
| en-g08 | affect | The weather can ___ your mood. | affect / effect | affect | verb |
| en-g09 | lose | Don't ___ your ticket. | lose / loose | lose | misplace |
| en-g10 | whose | ___ coat is this? | Whose / Who's | Whose | possessive |
| en-g11 | capitals | We met on a ___ in ___. | Friday ... April / friday ... april | Friday ... April | days and months take capitals in English |
| en-g12 | since-for | I have lived here ___ six years. | for / since | for | for + period, since + point in time |

```json
[
  {"id": "en-g01", "lang": "en", "pack": "its", "prompt": "The company changed ___ logo.", "options": ["its", "it's"], "answer": "its", "rule": "possessive: its", "full": "The company changed its logo."},
  {"id": "en-g02", "lang": "en", "pack": "its", "prompt": "___ getting late.", "options": ["Its", "It's"], "answer": "It's", "rule": "it is", "full": "It's getting late."},
  {"id": "en-g03", "lang": "en", "pack": "their", "prompt": "___ house is next to the park.", "options": ["Their", "There", "They're"], "answer": "Their", "rule": "possessive", "full": "Their house is next to the park."},
  {"id": "en-g04", "lang": "en", "pack": "their", "prompt": "___ always late on Mondays.", "options": ["Their", "There", "They're"], "answer": "They're", "rule": "they are", "full": "They're always late on Mondays."},
  {"id": "en-g05", "lang": "en", "pack": "your", "prompt": "___ going to love this.", "options": ["Your", "You're"], "answer": "You're", "rule": "you are", "full": "You're going to love this."},
  {"id": "en-g06", "lang": "en", "pack": "than", "prompt": "This test is harder ___ the last one.", "options": ["than", "then"], "answer": "than", "rule": "comparison", "full": "This test is harder than the last one."},
  {"id": "en-g07", "lang": "en", "pack": "than", "prompt": "Finish your work, and ___ we can go.", "options": ["than", "then"], "answer": "then", "rule": "time/sequence", "full": "Finish your work, and then we can go."},
  {"id": "en-g08", "lang": "en", "pack": "affect", "prompt": "The weather can ___ your mood.", "options": ["affect", "effect"], "answer": "affect", "rule": "verb", "full": "The weather can affect your mood."},
  {"id": "en-g09", "lang": "en", "pack": "lose", "prompt": "Don't ___ your ticket.", "options": ["lose", "loose"], "answer": "lose", "rule": "misplace", "full": "Don't lose your ticket."},
  {"id": "en-g10", "lang": "en", "pack": "whose", "prompt": "___ coat is this?", "options": ["Whose", "Who's"], "answer": "Whose", "rule": "possessive", "full": "Whose coat is this?"},
  {"id": "en-g11", "lang": "en", "pack": "capitals", "prompt": "We met on a ___ in ___.", "options": ["Friday ... April", "friday ... april"], "answer": "Friday ... April", "rule": "days and months take capitals in English", "full": "We met on a Friday in April."},
  {"id": "en-g12", "lang": "en", "pack": "since-for", "prompt": "I have lived here ___ six years.", "options": ["for", "since"], "answer": "for", "rule": "for + period, since + point in time", "full": "I have lived here for six years."}
]
```

### 15.3 Arabic

| # | Pack | Item | Options | Answer | Rule |
|---|---|---|---|---|---|
| ar-g01 | hamza | ذهبت ___ البيت. | إلى / الى | إلى | hamzat qat' |
| ar-g02 | taa-marbuta | هذه ___ جميلة. | حديقة / حديقه | حديقة | feminine noun ends in ة |
| ar-g03 | alif-maqsura | ذهب ___ إلى المدرسة. | مصطفى / مصطفي | مصطفى | final ى |
| ar-g04 | hamzat-wasl | ___ الطلاب إلى المعلم. | استمع / إستمع | استمع | form VIII: wasl |
| ar-g05 | dad-zaa | انتظرت حتى ___. | الظهر / الضهر | الظهر | root ظ-ه-ر |
| ar-g06 | hamza-seat | سألني ___ صعبا. | سؤالا / سوالا | سؤالا | hamza on waw after damma |

```json
[
  {"id": "ar-g01", "lang": "ar", "pack": "hamza", "prompt": "ذهبت ___ البيت.", "options": ["إلى", "الى"], "answer": "إلى", "rule": "hamzat qat'", "full": "ذهبت إلى البيت."},
  {"id": "ar-g02", "lang": "ar", "pack": "taa-marbuta", "prompt": "هذه ___ جميلة.", "options": ["حديقة", "حديقه"], "answer": "حديقة", "rule": "feminine noun ends in ة", "full": "هذه حديقة جميلة."},
  {"id": "ar-g03", "lang": "ar", "pack": "alif-maqsura", "prompt": "ذهب ___ إلى المدرسة.", "options": ["مصطفى", "مصطفي"], "answer": "مصطفى", "rule": "final ى", "full": "ذهب مصطفى إلى المدرسة."},
  {"id": "ar-g04", "lang": "ar", "pack": "hamzat-wasl", "prompt": "___ الطلاب إلى المعلم.", "options": ["استمع", "إستمع"], "answer": "استمع", "rule": "form VIII: wasl", "full": "استمع الطلاب إلى المعلم."},
  {"id": "ar-g05", "lang": "ar", "pack": "dad-zaa", "prompt": "انتظرت حتى ___.", "options": ["الظهر", "الضهر"], "answer": "الظهر", "rule": "root ظ-ه-ر", "full": "انتظرت حتى الظهر."},
  {"id": "ar-g06", "lang": "ar", "pack": "hamza-seat", "prompt": "سألني ___ صعبا.", "options": ["سؤالا", "سوالا"], "answer": "سؤالا", "rule": "hamza on waw after damma", "full": "سألني سؤالا صعبا."}
]
```

---

## 16. How the content was verified

### 16.1 Method (reproducible)

| Check | Tool | Result |
|---|---|---|
| Every Dutch token is a valid word form | [OpenTaal word list](https://github.com/OpenTaal/opentaal-wordlist) `wordlist.txt` (413,937 forms, downloaded 2026-10-03) | **0 unknown tokens** in the shipped Dutch strings. The only token not in the list is the syllabification `Bel-gi-ë` inside one explanation. The prompt label "Verhaalstarter" was not in the list, so I replaced it with "Eerste zin". |
| Dutch grammar and spelling | **LanguageTool 6.8** (`language-nl` from Maven Central, run locally with a small Java harness), 156 strings | Real errors: **0**. Remaining flags are known false positives or style notes: `KOMMA_AANHALING` (literary *elda* dialogue punctuation, §8.2), `T`/`T2` (the letter *t* used as a letter; *'t kofschip*), and `-d`/`Bel-gi-ë` in explanations. While writing, LanguageTool's notes made me change `Hij/zij/het` to "Hij, zij en het". |
| Dutch, read by hand | Me, against Woordenlijst conventions | Fixed issues no tool flagged: *de deur uit ging* → **uitging** (separable verb written as one word in a subordinate clause); *Was het ik* → *Was het onderwerp 'ik'* (Dutch says *ik ben het*, not *het is ik*); a clumsy relative clause in prompt nl-p02. |
| English grammar and spelling | LanguageTool 6.8 `en-GB` **and** `en-US`, 190 strings | Real errors: **0** in the content. Remaining flags: Dutch words inside explanations, foreign words in a story (*gezellig*, *uitwaaien*, *sabr*), and Shakespeare's original *"nothing either good or bad but thinking makes it so"* (no comma). Variant-specific words were removed (*apartment*, *cafe*, *neighbour*, *capitalised*), and quotation punctuation that differs by variant was rewritten. |
| English quotes are genuine and exact | Gutenberg texts fetched from the [GITenberg](https://github.com/GITenberg) GitHub mirrors (gutenberg.org itself was blocked from this environment) and searched by script | **32 of 34** quotes (30 main + 4 spares) were found word for word in the fetched source texts: Shakespeare, Austen, Dickens, Brontë, Carroll, Wilde, Tolstoy/Garnett, Dickinson, Whitman, Emerson, Alcott, Baum, Twain. Acts, scenes and chapters were confirmed by script (e.g. *Emma* Vol. I ch. IX; *Lady Windermere's Fan* Acts I and III; *Twelfth Night* II.5 reads *"thrust upon them"*, not *'em*). The other 2 were checked against secondary sources only: Franklin, *Well done is better than well said* (1737; [Franklin Institute](https://fi.edu/benjamin-franklin/famous-quotes)), and Wilcox, *Solitude* (1883; [Owl Eyes](https://www.owleyes.org/text/solitude), [NY Sun](https://nysun.com/article/poem-of-the-day-solitude)). |
| Fix-it texts are consistent | Python: apply the mistakes to `wrong` in order and compare with `correct` | **15/15 OK**. Character spans are computed by script. |
| Arabic | LanguageTool 6.8 `language-ar` | No real errors found. Flags: the name *بيب* is unknown; a recommendation to write tanween marks (*كتابًا*), which is optional by policy (§8.4); false positives on *كلمة/كلمات* and *فوجدت*; homophone hints (*فقرة*, *شقة*, *أمس*). **Still needs a native review** (§17). |

### 16.2 How much of the planted-mistake set LanguageTool catches (why the custom engine matters)

This is local LanguageTool 6.8 with its default open-source rules, run on the 15 Fix-it texts. The public API at api.languagetool.org was blocked from this environment, so I could not compare it. Premium rules may catch more.

| Language | Caught | Missed (examples) |
|---|---|---|
| Dutch | **16 / 20** | `antwoord` (should be *antwoordt*, 3rd person after a noun subject), `die jij` after the het-noun *boek* (should be *dat*), `ouder als` (should be *dan*), `tand arts` (split compound) |
| English | **14 / 22** | *Their going*, *Your welcome*, *it's tail*, *The shop assistant were*, *explained me all the settings*, *less parking spaces*, *sympathetic* (false friend), *I follow … since three weeks* |
| Arabic | **12 / 18** | *احمد* (missing hamza), *سال* (a real word: "flowed"), *بسرعه*, *مشي* (real word), *المستشفي*, *امس* |

**Takeaways for the engine:**

1. **Real-word errors dominate the misses** in all three languages: *antwoord*, *their*, *سال*, *مشي*. They need context rules, not a dictionary lookup. These map onto the rule families in `dutch-errors.md` §4: noun-subject + d-stem verb, het-noun + relative *die*, comparative + *als*.
2. **Split compounds** (*tand arts*) need the split-compound list (`dutch-errors.md` §6.7) and a "both parts are words and the joined form is a word" check.
3. **English homophones are not caught by default in LanguageTool 6.8.** Parrotype needs its own rules for these: `their + -ing verb`, `your + welcome/going/right`, `it's + noun`, `less + plural count noun`.
4. **Nl→en interference** (*sympathetic*, *since three weeks*, *explained me*) is a unique selling point for this user. It is small, rule-friendly and worth a dedicated "Cognate clash" pack (§5.5).

---

## 17. Open questions and items that need review

1. **Arabic native review.**
   - What to check: the 10 prompts, 15 dictation sentences, story, 5 Fix-it texts and 6 gym items are written in MSA and machine-checked, but should be reviewed by a native speaker before release.
   - Points to confirm:
     - *لا تنس* (jussive drops the final alif maqsura): correct, but an "advanced" item.
     - *بذور عباد الشمس* vs *دوار الشمس*: regional preference.
     - Whether to show tanween on accusative alif in the target text.
2. **Proverb variants.**
   - *Wie a zegt, moet ook b zeggen* is also printed with capital *A/B*.
   - *Oost west, thuis best* is sometimes written with a comma after *Oost*.
   - I followed the most common dictionary forms. Accept both forms in Quote mode grading if the user types the variant (allow-list).
3. **Quote attribution years.**
   - Shakespeare dates are approximate (marked *c.*).
   - Whitman's text is from the 1891–92 "deathbed" edition used by Gutenberg #1322; the punctuation differs from the 1855 edition.
4. **Products I could not verify.** "dtrainer" and "Cambiumned" (named in the brief) could not be found. If they are internal or school tools, ask the user for links.
5. **TTS quality.**
   - Dutch voices differ by platform. Test Chrome (Google Nederlands, when online), Edge (Microsoft natural voices) and Safari (macOS/iOS voices).
   - If quality is poor, consider pre-generated audio files for the shipped dictation set: 85 sentences × about 3 s ≈ 1–2 MB as Opus. This is fine for a static Vercel deploy, but check the TTS vendor's licence.
6. **Monkeytype compatibility.** Users may expect Monkeytype's language names and quote lengths. Mirroring the *structure* (not the data) is safe.
7. **Groot Dictee facts.** The radio-era details come from regional news reports (Omroep Brabant). Onze Taal's own page could not be fetched from this environment.

---

## 18. Sources

**Duolingo, streaks and gamification**
- Silverman, J. & Barasch, A. (2023). On or Off Track: How (Broken) Streaks Affect Consumer Decisions. *Journal of Consumer Research* 49(6), 1095–1117. https://udspace.udel.edu/handle/19716/34160 · summary: https://www.colorado.edu/business/news/2023/04/20/research-streaks-marketing-tech-barasch · https://www.psychologytoday.com/us/blog/ulterior-motives/202306/how-broken-streaks-sap-motivation
- Duolingo blog, "Improving the streak": https://blog.duolingo.com/improving-the-streak (cited via search; secondary write-up: https://lazyweb.com/research/duolingo-streak-goals-retention)
- Duolingo fan wiki, Streak freeze / Weekend Amulet: https://duolingo.fandom.com/wiki/Shop/Streak_freeze · Energy: https://duolingo.fandom.com/wiki/Energy
- Android Authority on the energy system: https://www.androidauthority.com/quitting-duolingo-energy-system-3599842/
- The Decision Lab, "Streak creep": https://thedecisionlab.com/insights/consumer-insights/streak-creep-the-perils-of-too-much-gamification
- Kotaku on XP cheating and leagues: https://kotaku.com/duolingo-app-cheats-hacks-leagues-xp-why-duohacker-1850506482 · essay: https://linksiwouldgchatyou.substack.com/p/when-gamification-goes-too-far
- "When Gamification Spoils Your Learning: A Qualitative Case Study of Gamification Misuse in a Language-Learning App" (arXiv 2203.16175): https://ar5iv.labs.arxiv.org/html/2203.16175 (title only; not fetched)
- Settles, B. & Meeder, B. (2016). A Trainable Spaced Repetition Model for Language Learning. ACL. https://preview.aclanthology.org/naacl24-info/P16-1174
- Sailer, M. & Homner, L. (2020). The Gamification of Learning: a Meta-analysis. *Educational Psychology Review*. https://link.springer.com/article/10.1007/s10648-019-09498-w
- SDT and gamification: https://icenet.blog/2025/06/17/align-the-game-to-your-aim-considering-gamification-through-the-lens-of-self-determination-theory/

**Typing apps and games**
- Monkeytype docs: https://www.mintlify.com/monkeytypegame/monkeytype/features · https://mintlify.com/monkeytypegame/monkeytype/guides/test-modes · repo (GPL-3.0, `frontend/static/quotes/*.json`): https://github.com/monkeytypegame/monkeytype
- TypeRacer: https://en.wikipedia.org/wiki/TypeRacer
- TypeLit.io: https://www.typelit.io/faq · https://edtechimpact.com/products/typelitio/
- keybr overview: https://www.popsci.com/free-web-apps-speed-typing/ (algorithm details: `typing-pedagogy.md` §2.5)
- Nitro Type: https://www.commonsense.org/education/reviews/nitro-type · https://ncce.org/nitrotype-a-great-way-to-engage-students/
- Z-Type: https://en.wikipedia.org/wiki/Z-Type
- Epistory reviews: https://techraptor.net/content/epistory-typing-chronicles-review · https://destructoid.com/reviews/review-epistory-typing-chronicles
- The Typing of the Dead: https://en.wikipedia.org/wiki/The_Typing_of_the_Dead · https://segabits.com/blog/2013/11/03/review-the-typing-of-the-dead-overkill/
- Clozemaster: https://www.fluentu.com/blog/clozemaster-review/ · https://www.refold.la/blog/srs-that-isnt-anki-clozemaster
- Anki / FSRS: https://en.wikipedia.org/wiki/Anki · https://domenic.me/fsrs/

**Dictation, dictee and d/t practice**
- dictation.io (voice typing): https://warwick.ac.uk/services/library/using/productivity-tools/dictation-io/ · https://smallbiztrends.com/free-dictation-software-dictation-io/
- Lingua.com dictations: https://lingua.com/english/dictation/ · UCL Dutch dictee: https://www.ucl.ac.uk/clie/learning-resources/online-dutch/taster/Oefeningen/Luisteren/Luisteren_Dictee.html · Une dictée par jour: https://outilstice.com/en/une-dictee-par-jour-des-dictees-en-ligne-pour-ameliorer-lorthographe/
- Groot Dictee: https://en.wikipedia.org/wiki/Grand_Dictation_of_the_Dutch_Language · https://www.nhnieuws.nl/nieuws/206628/NTR-stopt-per-direct-met-Groot-Dictee-der-Nederlandse-Taal · https://www.omroepbrabant.nl/nieuws/4588382/Maar-vijf-foutjes-in-Groot-Dictee-winnares-spelde-kanunnik-fout · https://www.omroepbrabant.nl/nieuws/4793718/Hoofdrol-voor-Deurne-in-Het-Groot-Dictee-der-Nederlandse-Taal · https://onzetaal.nl/groot-dictee · https://onzetaal.nl/schatkamer/spelen/groot-dictee/voor-bibliotheken
- Meester Klaas: https://apps.apple.com/us/app/id6459923221 · Dees & Tees: https://www.iculture.nl/apps/dees-tees-iphone-app-helpt-je-foutloos-werkwoorden-spellen/ · DT-Manie: https://en.wikipedia.org/wiki/DT-Manie · DT-duiveltje: https://www.jbe-platform.com/content/journals/10.1075/ttwia.35.09zui
- Team Taaladvies spelling test: https://www.vlaanderen.be/team-taaladvies/spellingtests/d-of-dt-in-de-gebiedende-wijs · taal-oefenen.nl: https://taal-oefenen.nl/werkbladen/werkwoordspelling/gemengd/oefenen-met-zwakke-en-sterke-werkwoorden-tt-vt-en-vd-gemengd-2?print=1
- Sandra (homophone dominance), HSN bundel: https://hsnbundels.taalunie.org/wp-content/uploads/2019/09/2017_XII_taal-en-letterkunde_3_Sandra.pdf

**Proofreading games**
- https://www.esleschool.com/spot-the-mistake/ · https://www.talkdrill.com/games/error-spotter/ · https://www.commonsensemedia.org/app-reviews/the-grading-game · https://educators.brainpop.com/?p=119917

**Learning science**
- Cepeda, Vul, Rohrer, Wixted & Pashler (2008). Spacing effects in learning. *Psychological Science*. https://www.evullab.org/pdf/CepedaVulRohrerWixtedPashler-PS-2008.pdf
- Bjork, desirable difficulties: https://bjorklab.psych.ucla.edu/wp-content/uploads/sites/13/2016/07/RBjork_inpress.pdf · summary incl. Roediger & Karpicke (2006): https://structural-learning.com/post/desirable-difficulties
- Joseph, L. M. et al. (2012). A meta-analytic review of the cover-copy-compare and variations of this self-management procedure. *Psychology in the Schools* 49(2), 122–136. (Reference located via https://winthrop.edu/uploadedFiles/ceshs/edco/module/202-610-cover-copy-compare.pdf)
- Brown, A. S. (1988). Encountering misspellings and spelling performance: Why wrong isn't right. *J. Educational Psychology* 80, 488–494. (Reference located via https://www.frontiersin.org/articles/10.3389/fpsyg.2020.00547/pdf) · Dixon (1997) thesis: https://openaccess.city.ac.uk/id/eprint/30780/
- Error correction in L2 writing: https://dare.uva.nl/id/d195ffca-61d9-4ee7-b36a-32130f65c885 · https://awej.org/wp-content/uploads/2020/12/5-6.pdf
- Cloze and grammar: https://ejournal.unp.ac.id/index.php/eltar/article/download/8748/6743 · https://scholarspace.manoa.hawaii.edu/items/ffe67992-7a42-4c94-88a6-e571c65164bb

**Arabic**
- Common Arabic spelling errors: https://journals.qou.edu/index.php/jrresstudy/article/view/918 · https://mahdi.edu.sd/en/journal/1/issues/15/topic/5
- Arabic typing tutors: https://arabic-for-nerds.com/tools/how-to-learn-touch-typing-in-arabic/ · https://noqta.tn/en/arabic-typing-tutor
- Arabic (101) keyboard: https://learn.microsoft.com/en-us/globalization/keyboards/kbda1 (search snippet) · xkeyboard-config `symbols/ara`: https://gitlab.freedesktop.org/xkeyboard-config/xkeyboard-config/-/blob/master/symbols/ara (read locally from `/usr/share/X11/xkb/symbols/ara`)

**Web Speech API**
- https://developer.chrome.com/blog/web-apps-that-talk-introduction-to-the-speech-synthesis-api · https://flaviocopes.com/speech-synthesis-api/ · https://github.com/phetsims/utterance-queue/issues/60 · https://dev.to/jankapunkt/cross-browser-speech-synthesis-the-hard-way-and-the-easy-way-353 · https://www.caktusgroup.com/blog/2025/11/03/the-halting-problem/ · https://readium.org/speech/docs/WebSpeech.html (search result; not fetched)

**Dutch spelling and punctuation**
- OpenTaal word list: https://github.com/OpenTaal/opentaal-wordlist
- Old spelling / Marchant reform: https://elon.io/grammar/dutch/regional/older-spelling-conventions · https://dbnl.org/tekst/_nee003198001_01/_nee003198001_01_0042.php
- Quotation-mark punctuation (*elda* rule): https://webwoordenboek.nl/kenniscentrum/welke-leestekens-bij-een-quote
- Multatuli, *Ideeën* (Idee 1): https://www.goodreads.com/work/quotes/14905481 · DBNL edition: https://www.dbnl.org/tekst/mult001idee01_01/

**Quote sources (public domain; verified against Gutenberg texts via GITenberg mirrors)**
- GITenberg mirrors: https://github.com/GITenberg (e.g. `Pride-and-Prejudice_1342`, `Hamlet-Prince-of-Denmark_1524`, `Lady-Windermere-s-Fan_790`, `Anna-Karenina_1399`, `Leaves-of-Grass_1322`, `Essays-by-Ralph-Waldo-Emerson_16643`, `Poems-by-Emily-Dickinson-Series-Two_2679`)
- Franklin, *Poor Richard's Almanack*: https://fi.edu/benjamin-franklin/famous-quotes
- Wilcox, "Solitude": https://www.owleyes.org/text/solitude · https://nysun.com/article/poem-of-the-day-solitude
- Emerson, "Friendship": https://kwize.com/Friendship/461-8

**Tools used for verification**
- LanguageTool 6.8 (Maven Central `org.languagetool:language-nl|language-en|language-ar|languagetool-commandline`): https://repo1.maven.org/maven2/org/languagetool/ · public API limits: https://dev.languagetool.org/public-http-api
- Word frequencies (recommended for Classic word pools): https://github.com/hermitdave/FrequencyWords
