# English spelling & grammar errors: what Parrotype should catch, and how (rule-based)

> Research report for the Parrotype ("parrotype") engineers. Topic: the most common English spelling and grammar mistakes, with a focus on **Dutch** and **Arabic** native speakers, and how to **detect them with rules** (regex + word lists + small functions, no ML) at a **low false-positive rate**.
>
> Companion code (verified, runnable): `docs/research/english-rules-prototype/`. Run `node test.mjs` (95 rules + a/an checker, 443 assertions, all passing). The rule table in section 4 is generated from `rules.mjs` (`node gen-table.mjs`), so the table and the code always match.

---

## 0. TL;DR for the engineers

1. **Three layers, in this order of trust.**
   - **Target-text diff** (typing tests, dictation): we know the right answer, so every difference is a mistake. No rules needed.
   - **Local rule engine** (free writing, and as an extra "why" layer on dictation): ~95 regex rules + an a/an function + a US/UK consistency check + a misspelling map + a spell checker. It runs instantly and offline on every keystroke (debounced), and every rule ships with a friendly explanation and examples.
   - **LanguageTool public API** (optional, opt-in, debounced): catches what our rules can't (deep agreement, complex grammar). Call it with `language=en-GB` (or `en-US`) and `motherTongue=nl`. Drop LanguageTool matches whose span overlaps a local issue, so the user doesn't get duplicate underlines and keeps our L1-aware explanation. Free limits: 20 requests/min, 20 KB per request, 75 KB/min per IP.
2. **Precision over recall.** A learner who gets told "wrong" when they're right loses trust fast. Every rule has a severity: `error` (very low or low false-positive risk; red underline, counts in stats), `warning` (low/medium; amber), or `hint` (style or false-friend notes; dotted underline, never counted as a mistake). Rules that need real parsing (deep subject-verb agreement, comma splices) are `hint`s or left to LanguageTool.
3. **L1 profiles change the explanations and priorities, not the truth.** Every rule runs for everyone. The `l1` tag (`nl`, `ar`, `all`) only picks which explanation to show (for example "Dutch *dan* means both *than* and *then*") and which drills to suggest. For this user, enable **both** NL and AR.
4. **The Dutch-specific signal is strong and easy to catch with rules:** then/than (Dutch *dan* covers both), lose/loose and life/live (final devoicing), *since + present* ("I live here since 2015"), *since five years* (Dutch *sinds*), no do-support ("I not like", "When go you?"), *lend/borrow* and *teach/learn* (Dutch *lenen* and *leren* cover both), *make a photo / make homework*, apostrophe plurals (*photo's, CD's*), lowercase days and months, compounds glued together (*eachother, infront*), and false friends (eventually, actual, control).
5. **The Arabic-specific signal:** missing *a/an*, *the* in front of general ideas ("The life is short"), a missing *is/are* ("He very tall"), questions without inversion ("When I can call you?"), no capital letters, long *and…and…and* chains and comma splices, p/b and f/v and vowel confusions (best handled in the **spell checker's edit costs**, not in regexes), and Arabic punctuation (، ؛ ؟) slipping in after switching keyboard layout.
6. **Validation that was actually run:** all 95 rules pass their own wrong/right/ok examples. None of them fires on the 55 dictation sentences. On a false-positive benchmark of 12,685 "should not trigger" example sentences pulled from LanguageTool's English `grammar.xml`, the rules produce 355 rule hits in total (one sentence can be hit by two rules), so at most 2.8% of sentences are affected. Most of those remaining hits are real errors in the benchmark text (LanguageTool's negative examples are only clean for their *own* rule) or sentence fragments (section 5).

---

## 1. Who makes which mistakes (evidence)

### 1.1 Classic confusions (native speakers *and* learners)

| Pair / issue | Why it happens | How to catch it with rules | Rule IDs |
|---|---|---|---|
| its / it's | The apostrophe looks like a possessive. | `its` + article/`not`/`been`, `its` + adjective + end of clause, `it's own`, preposition + `it's` + noun | EN_ITS_* , EN_PREP_ITS |
| your / you're | Homophones. | `your` + `not/gonna/a/the...`, `your welcome.`, `you're` + common noun | EN_YOUR_YOURE, EN_YOURE_YOUR |
| their / there / they're | Homophones. | `their is/are`, `there own`, preposition + `there` + noun, `they're` + noun | EN_THEIR_IS, EN_THERE_OWN, EN_PREP_THERE_NOUN, EN_THEYRE_THERE, EN_THEIR_THEYRE |
| then / than | Homophones in fast speech. **For Dutch speakers `dan` covers both** (Burrough-Boenisch calls then-for-than "a typical Dutch mistake"). | comparative + `then` + not end of clause; `and/since/until/back than` | EN_THEN_THAN, EN_THAN_THEN |
| could/should/would **of** | "could've" sounds like "could of". | modal + `of`, except `of course` / `of necessity` | EN_COULD_OF |
| lose / loose | Spelling. **For Dutch speakers final devoicing makes them sound the same.** | `loose` + object (keys, weight, money...), aux/`to` + `loose`, `on the lose` | EN_LOSE_LOOSE_*, EN_LOOSE_LOSE_ADJ |
| affect / effect | Verb vs noun. | determiner/adjective + `affect`, `take affect`, modal + `effect` + object (but `effect change` is valid) | EN_AFFECT_NOUN, EN_EFFECT_VERB |
| a / an | It depends on the **sound**, not the letter: *an hour, a university, an MBA, a one-off, an 8*. | function with exception lists (section 4.2) | EN_A_AN |
| who's / whose | Homophones. | `who's` + noun list; `whose` + `going/coming/the/a` | EN_WHOS_WHOSE, EN_WHOSE_WHOS |
| to / too / two | Homophones. Cambridge's Dutch-learner data lists "to too much" as very common. | `want too go`, `is to hot.`, `Me to!`, `two much` | EN_TOO_VERB, EN_TO_TOO, EN_ME_TOO, EN_TWO_TOO |
| accept / except | Near-homophones. | `please/will/can't except` | EN_ACCEPT_EXCEPT |
| advice / advise | noun (s-sound) vs verb (z-sound). | subject/modal + `advice`; determiner + `advise`; `advices` | EN_ADVICE_VERB, EN_ADVISE_NOUN, EN_ADVICES |
| i → I | Fast typing. Dutch `ik` and Arabic (no capitals) both make it worse. | lowercase standalone `i`, `i'm`, `i've` (not `i.e.`, `(i)`, maths) | EN_I_LOWER |
| doubled words ("the the") | Typing slip. | backreference `\b(\w+)\s+\1\b` + exception list (*had had, that that, do do*) | EN_WORD_REPEAT |
| alot, definately, ... | Spelling. | exact misspelling map + regex | EN_ALOT, EN_DEFINITELY, misspelling map |

### 1.2 Dutch speakers writing English ("Dunglish")

What the sources agree on: Dunglish errors are mostly **false friends, tense/aspect, word order, prepositions and collocations**, plus a few **spelling conventions copied from Dutch** (Wikipedia: Dunglish; Burrough-Boenisch, *Righting English that's Gone Dutch*). Cambridge's error-coded learner corpus says the most common grammar error for Dutch learners is **the wrong preposition** (*in, to, on, for* are the ones most often missed), and that a "distinctively Dutch error" is **live/life** ("my whole live"). The same source lists the top Dutch-learner misspellings as *successful, success, which, until, pollution, interested, embarrassing, because, very, children*.

| Dutch-driven error | Cause in Dutch | Example (wrong → right) | Detectable by rule? | Rule IDs |
|---|---|---|---|---|
| **then/than** | `dan` = than *and* then | taller then me → taller than me | Yes (high precision) | EN_THEN_THAN, EN_THAN_THEN |
| **bigger as** | spoken Dutch also uses `groter als` (Onze Taal: as old as *groter dan*, and more common in speech) | more sales as last year → than | Partly (LanguageTool has `THAN_AS` in its German-L2 file). Not in the prototype; good candidate for v2 | (v2) |
| **since + present** | Dutch uses the present: *Ik woon hier sinds 2015* | I live here since 2015 → I have lived | Yes, if it is restricted to `since + date/time` (causal *since* must not fire) | EN_SINCE_PRESENT |
| **since + duration** | `sinds drie jaar` | since five years → for five years | Yes (very low FP) | EN_SINCE_DURATION |
| **present perfect + finished time** | Dutch perfect *Ik heb hem gisteren gezien* | I have seen him yesterday → I saw him yesterday | Yes, as a warning (skip when `since/for` comes before the time phrase, or a modal before `have`) | EN_PERFECT_PAST_TIME |
| **no do-support** | Dutch negates with `niet` and inverts the main verb | I not like it / I like it not / When go you home? | Yes | EN_NOT_WITHOUT_DO, EN_VERB_IT_NOT, EN_WH_VERB_SUBJECT |
| **lend/borrow** | `lenen` = both | Can you borrow me your pen? → lend | Yes | EN_BORROW_ME, EN_LEND_BORROW |
| **teach/learn** | `leren` = both | He learned me to swim → taught | Yes | EN_LEARN_ME |
| **make vs do/take/have** | `maken` collocations | make homework / make a photo / make a walk / make fun (= *have fun*) | Yes | EN_MAKE_HOMEWORK, EN_MAKE_PHOTO, EN_MAKE_A_WALK, EN_MAKE_FUN |
| **in the weekend** | `in het weekend` | in the weekend → at (UK) / on (US) the weekend | Yes (warning) | EN_IN_THE_WEEKEND |
| **apostrophe plurals** | Dutch writes `foto's, auto's, baby's` to keep the vowel long; there is "never an apostrophe in an English plural" (English and the Dutch) | many photo's → photos; 5 CD's → CDs | Yes (after numbers/quantifiers) | EN_PLURAL_APOSTROPHE |
| **lowercase days & months** | Dutch: `maandag, januari` (lowercase) | on monday → Monday | Yes | EN_DAY_CAP, EN_MONTH_CAP |
| (languages/nationalities) | **Careful:** Dutch *does* capitalise *Nederlands, Engels*, so lowercase *dutch/english* is **not** Dutch transfer. It's sloppiness or Arabic transfer (no capitals in Arabic). | i speak dutch → Dutch | Yes | EN_LANG_CAP |
| **compounds glued together** | Dutch writes compounds as one word | eachother, infront, atleast, everytime → two words | Yes (list). Also: unknown word = two known words → suggest a space (speller) | EN_FUSED_WORDS |
| **final devoicing pairs** | word-final /v/→/f/, /z/→/s/ | lose/loose, live/life, believe/belief, prize/price, advise/advice | Yes (context patterns) | EN_LIVE_LIFE, EN_BELIEVE_BELIEF, EN_PRICE_PRIZE, EN_LOSE_* |
| **who/which for people** | Dutch `die` covers both | the man which → who | Yes (warning) | EN_PERSON_WHICH |
| **prepositions** | `afhangen van`, `getrouwd met`, `discussiëren over`, `leg me uit` | depend of, married with, discuss about, explain me | Yes for the frequent ones | EN_DEPEND_OF, EN_MARRIED_WITH, EN_DISCUSS_ABOUT, EN_EXPLAIN_ME |
| **false friends** | eventueel (= possibly), actueel (= current), controleren (= check), bekomen (Flemish: obtain) | We can eventually meet tomorrow; actual news; control my homework; I became a present | Only as **hints**: the English words are valid, so they need context | EN_EVENTUALLY_FF, EN_ACTUAL_FF, EN_CONTROL_CHECK, EN_BECOME_GET |
| **idiom calques** | *volgens mij*, *hoe noem je dit*, *we zijn met z'n vijven* | according to me; how do you call this; we are with five | Yes (hints) | EN_ACCORDING_TO_ME, EN_HOW_DO_YOU_CALL, EN_WE_ARE_WITH_N |
| **uncountables made plural** | Dutch plurals *adviezen, trainingen* | informations, advices, furnitures, feedbacks | Yes (list) | EN_UNCOUNTABLE_PLURAL(_SOFT), EN_ADVICES |
| **cognate spelling** | Dutch spelling bleeds in: *succes, adres, interessant* | succes, adres, intresting | Speller + misspelling map | misspelling map |

Note on "become/bekomen": the famous *bekommen → become* trap is German. In Dutch, *bekomen* is mainly Flemish for "obtain". The rule is cheap and has a low false-positive rate, but I could not find corpus evidence of how often Dutch speakers make this exact mistake. It ships as a *warning*.

Note on "possibility to": Dutch *mogelijkheid om te* suggests "the possibility to do", while learner dictionaries model *possibility of doing* / *possibility that*. I found no solid source saying "possibility to" is wrong (it does occur in edited English). **Recommendation: don't flag it**, or at most add a style hint ("opportunity to / chance to / possibility of + -ing"), off by default.

### 1.3 Arabic speakers writing English

| Arabic-driven error | Cause | Example | Detectable? | Rule IDs / mechanism |
|---|---|---|---|---|
| **missing a/an** | Arabic has a definite article (*al-*) but **no indefinite article** | She is engineer; I have question | Partly: jobs after *be*, and a set list of nouns after *have/need/want* followed by a clause boundary | EN_MISSING_ARTICLE_JOB, EN_MISSING_ARTICLE_HAVE |
| **"the" with general ideas** | generic reference uses the article in Arabic (*al-hayat* = "life") | The life is short → Life is short | Only as a **hint** (sentence-initial *The + abstract noun + is*) | EN_GENERIC_THE |
| **missing copula** | no present-tense "to be" in Arabic; Alshayban's study of 100 Saudi learners found copula omission frequent, more so at intermediate level | He very tall; She a teacher | Yes (subject pronoun + `very/so/too` + adjective; sentence-initial `She a ...`) | EN_COPULA_OMISSION, EN_COPULA_OMISSION_ART |
| **questions without inversion** | Arabic questions keep statement order | When I can call you? → When can I...? | Yes (requires a final `?`) | EN_WH_NO_INVERSION |
| **no capital letters** | Arabic script has no case | i, monday, english, sentence starts | Yes | EN_I_LOWER, EN_SENT_START_CAP, EN_DAY_CAP, EN_MONTH_CAP, EN_LANG_CAP |
| **run-ons / comma splices** | Arabic chains clauses with *wa* ("and") and uses commas loosely; studies of Arab learners report run-ons and comma splices as frequent, and teachable (one intervention cut comma splices by ~52%) | I woke up and I ate and then I went out and... | Only as a hint (count clause-chaining *and I / and then we / so she*) | EN_RUN_ON_AND |
| **p→b, v→f** | /p/ and /v/ are not Arabic phonemes | blease, bicture, beoble; fery | **Spell checker**, not regex: give `b↔p` and `f↔v` substitutions a low edit cost in the AR profile (section 4.4). Real-word pairs (park/bark, pill/bill) need minimal-pair drills | speller weights + drills |
| **vowel confusion / omission ("vowel blindness")** | Arabic script leaves short vowels out; Ryan & Meara describe Arabic readers confusing words with the same consonants (*cereals/curls*) | studint, hve, rong, bet/bit | Speller: cheap vowel substitutions/insertions in the AR profile; e/i minimal-pair dictation | speller weights + drills |
| **Arabic punctuation after a keyboard switch** | the Arabic layout produces ، (U+060C), ؛ (U+061B), ؟ (U+061F) | How are you؟ | Yes (very low FP) | EN_ARABIC_PUNCT |
| **uncountables made plural** | | informations, advices, equipments | Yes | EN_UNCOUNTABLE_PLURAL |

**Phase 2 (Arabic as a target language)** is a different project (hamza forms, taa marbuta vs haa, alif maqsura vs yaa, RTL rendering). It is out of scope here.

### 1.4 Spelling: what goes wrong inside words

The Oxford/Lexico corpus-based list notes that **more than two dozen of the 100 most-misspelled words are double-letter problems** (accommodate, embarrass, occurrence, millennium, ...). The other big families are **ie/ei** (receive, believe, weird, foreign), **unstressed vowels** (separate, definitely, cemetery, independent, existence), **silent letters** (government, environment, February, Wednesday) and **-able/-ible, -ance/-ence** endings. Section 6 has 177 entries. Two practical notes:

- **Use an exact misspelling map first** (wrong form → right word). It's 100% precise when the wrong form isn't a real word, and it allows a targeted explanation ("two c's, two m's"). The wrong forms in section 6 were checked against the codespell dictionary (built from Wikipedia's "Lists of common misspellings", CC BY-SA 3.0); 208 of 224 wrong forms are listed there.
- **Real-word misspellings must not be auto-flagged:** *calender* (a machine), *lightening* (making lighter), *copywrite*, *therefor*, *florescent* are dictionary words. codespell leaves them out for exactly that reason. Show them only in dictation (where the target is known) or with a context rule.

Friendly mnemonics worth putting in explanations: *separ-**a**-te* ("there's **a rat** in separate"), *defi**nite**ly* (contains "finite"), *ne**c**e**ss**ary* ("one collar, two sleeves"), *acco**mm**odate* ("big enough for two c's and two m's"), *i before e except after c* (receive, but *weird, seize, foreign* are exceptions), *Wed-nes-day*, *gover**n**ment* (govern + ment), *enviro**n**ment* (environ + ment).

---

## 2. Engine design (implementation guidance)

### 2.1 Pipeline

```
raw text
 └─ normalise (keep a char-offset map!)
      - ’ ‘ ´ ` → '   (the US-International layout common in NL has dead keys, so ´ / ` slip in)
      - NBSP → space; “ ” → "
 └─ mask spans that must not be checked: URLs, e-mails, @handles, numbers with units, inline code
 └─ sentence split (simple: /[^.!?]+[.!?]*/ with an abbreviation list)
 └─ rule passes (all local, synchronous, < 5 ms for a few KB)
      1. exact misspelling map + spell checker (with L1-weighted suggestions)
      2. regex rules (rules.mjs), with notAfter guards
      3. function rules: a/an, US/UK consistency, run-on hint
 └─ (optional, async) LanguageTool /v2/check  → merge
 └─ resolve overlaps → issues[] → UI
```

- **Overlap resolution:** sort by start offset. When two issues overlap, keep the higher severity, then the longer span, then the local rule over LanguageTool (our explanation is friendlier and knows the user's L1).
- **Case-preserving fixes:** if the matched text starts with a capital, capitalise the suggestion (`Your` → `You're`, `Than` → `Then`).
- **When to run:** after every space or punctuation key, plus 150–300 ms after the last keystroke. LanguageTool: 1.5–3 s after the last keystroke, send only changed paragraphs, and respect 20 req/min.

### 2.2 Rule schema (TypeScript)

```ts
export type Severity = 'error' | 'warning' | 'hint';
export type L1 = 'all' | 'nl' | 'ar';
export interface EnRule {
  id: string;                       // stable, e.g. 'EN_THEN_THAN' (used for stats + spaced repetition)
  cat: 'confusable' | 'spelling' | 'grammar' | 'collocation' | 'false-friend'
     | 'capitalization' | 'punctuation' | 'typo' | 'style';
  sev: Severity;
  l1: L1;                           // whose explanation to prefer; rule runs for everyone
  re?: RegExp;                      // MUST have the g flag
  notAfter?: RegExp;                // tested against the 60 chars before the match; match → skip
  fn?: (text: string) => { index: number; text: string; fix?: string }[];
  fix: string | ((m: RegExpExecArray) => string[]);
  msg: { en: string; nl?: string }; // short, friendly, 1–2 sentences
  wrong: string; right: string;     // unit tests + shown in the "why?" popover
  ok?: string[];                    // tricky valid sentences that must NOT fire (unit tests)
  fp: 'very low' | 'low' | 'medium' | 'high';
  src: string;                      // provenance (LanguageTool rule ID, paper, ...)
}
export interface Issue {
  ruleId: string; start: number; end: number; sev: Severity;
  message: string; suggestions: string[]; source: 'local' | 'speller' | 'languagetool';
}
```

**Make the examples executable** (the prototype's `test.mjs` does this, and LanguageTool does the same for its own XML rules): every rule must fire on `wrong` and must not fire on `right` or any `ok`. CI should also run all rules over the dictation corpus and fail if any rule fires on a target sentence.

### 2.3 JavaScript regex pitfalls (these bit the prototype)

- `\b` and `\w` are **ASCII-only** in JS. For text with accents (*Bahāʼi*, *café*), use `\p{L}` with the `u` flag in lookarounds (see EN_I_LOWER).
- **Lookbehind** (`(?<=...)`, `(?<!...)`, including variable length) works in all evergreen browsers. Safari only got it in 16.4 (2023), so that's the minimum supported Safari.
- A global regex keeps its `lastIndex`. Create a fresh `RegExp` per run (or reset it), and advance `lastIndex` on zero-length matches.
- **Catastrophic backtracking:** avoid nested quantifiers over alternations (`(?:[^.]*?\b(and|so)\b){4,}`). The first run-on rule was written like that and was replaced by a function that counts.
- **Inline case modifiers** (`(?i:...)`) aren't safe across browsers yet. Write `[Tt]han` instead, and drop the `i` flag when only the first letter's case varies (EN_THAN_THEN has to be case-sensitive at sentence start).
- Normalise apostrophes before matching: `it’s` and `it's` must behave the same way. Normalising one character to one character keeps offsets stable.

### 2.4 Spelling layer

- **Dictionary:** Hunspell `en_GB` / `en_US` dictionaries (for example the `dictionary-en-gb` / `dictionary-en` npm packages used with `nspell`). Load them lazily. The user picks the variety. Defaulting to en-GB is an assumption (it is the usual school norm in the Netherlands) and should be confirmed in onboarding.
- **Suggestion ranking = weighted Damerau-Levenshtein + word frequency.** Use the L1 profile to set substitution costs (section 4.4). This is where p/b, f/v and vowel errors are fixed. Regexes can't do it.
- **Compound splitting:** if an unknown word can be split into two dictionary words (*footballteam* → *football team*), offer that first in the NL profile.
- **The misspelling map wins** over generic suggestions when it has an entry.

### 2.5 LanguageTool integration (optional layer)

- Endpoint: `POST https://api.languagetool.org/v2/check`. Parameters checked in the server source (`TextChecker.java`): `text`, `language` (`en-GB`/`en-US`/`auto`), **`motherTongue`** (enables false-friend rules for that native language), `preferredVariants`, `enabledRules`, **`disabledRules`**, `enabledCategories`, `disabledCategories`, `enabledOnly`, `level` (`default` | `picky`).
- **Free-tier limits:** 20 requests/IP/minute, 20 KB per request, 75 KB per minute. Suggestions only for the first 30 misspellings. "Don't send automated requests." Limits can change without notice. Treat it as best-effort, and degrade silently on HTTP 429/5xx.
- **Privacy:** the text leaves the browser. Make it an explicit opt-in toggle ("Deep grammar check (sends your text to LanguageTool)").
- **De-duplication:** the default is span-based. Drop any LanguageTool match that overlaps a local issue (this keeps LanguageTool's extra recall, because its versions of these rules use part-of-speech tags). Only if a LanguageTool rule turns out noisy for this user, pass it in `disabledRules=`. These are the LanguageTool IDs that overlap with our local rules: `COULD_OF, EN_A_VS_AN, IT_IS, ITS_TO_IT_S, YOUR, YOUR_YOU_RE, THEIR_IS, THERE_OWN, THERE_THEIR, THEYRE_THEIR, COMP_THAN, CONFUSION_OF_THEN_THAN, AND_THAN, LOOSE_LOSE, LOSE_LOOSE, AFFECT_EFFECT, AFFECTS, WHOS, WHO_S_NN_VB, TO_TOO, TOO_TO, ACCEPT_EXCEPT, ADVICE_ADVISE, GIVE_ADVISE, I_LOWERCASE, LOWERCASE_MONTHS, INFORMATIONS, MOST_COMPARATIVE, SINCE_FOR, PERFECT_TENSE_SINCE, IN_WEEKDAY, EXPLAIN_TO, DISCUSS_ABOUT, DEPEND_ON, PEOPLE_VBZ, ENGLISH_WORD_REPEAT_RULE, ACCORDING_TO_ME`.
- Map LanguageTool's `rule.issueType` (`misspelling`, `grammar`, `typographical`, `style`, ...) onto our categories. Show LanguageTool `style` issues as hints at most.

### 2.6 Personalisation (cheap and powerful)

Log every issue the user **accepts or ignores** by `ruleId` (plus misspelled word → correction pairs). That gives the user's own **confusion matrix**. Use it to (a) raise or lower edit costs in the speller, (b) schedule spaced-repetition drills per rule (for example then/than minimal pairs), and (c) mute rules the user keeps rejecting (those are likely false positives for their writing style).

---

## 3. How to read the rule table

- **Pattern** is the exact JS RegExp from `rules.mjs`. In the table, `\|` stands for `|` (Markdown needs pipes escaped). Copy from `rules.mjs`, not from this table.
- **notAfter**: the match is skipped if this pattern matches the 60 characters before it. This works like a negative lookbehind but is easier to keep up to date.
- **Type · L1 · severity**: `l1` says whose explanation to prefer. Every rule runs for everyone.
- **FP risk** is a judgement backed by the tests and the benchmark in section 5. `very low` means no false positives were seen on the 12,685-sentence benchmark beyond true errors.
- **Basis** is the provenance. "LT X" means the logic is a simplified port of LanguageTool rule X (LGPL-2.1). The patterns here are re-implementations written without part-of-speech tags, using word lists instead.

## 4. Detection rules

### 4.1 Rule table (95 regex/function rules, generated from `rules.mjs`)

| # | ID | Type · L1 · severity | Pattern (JS RegExp) / logic | Wrong | Right | Friendly explanation | FP risk | Basis |
|---|---|---|---|---|---|---|---|---|
| 1 | EN_COULD_OF | confusable · all · error | `/\b(could\|should\|would\|must\|might)(n't)?\s+of\b(?!\s+(?:course\|necessity)\b)/gi` | I should of called you. | I should have called you. | "should of" is what "should've" sounds like. Write "should have". | very low | LT COULD_OF |
| 2 | EN_ITS_IT_IS | confusable · all · error | `/\b[Ii]ts\s+(a\|an\|the\|not\|been\|gonna\|ok\|okay\|me\|you\|him\|us)\b(?!-)/g` | Its a beautiful day. | It's a beautiful day. | "its" = belonging to it. "it's" = it is / it has. | low | LT IT_IS |
| 3 | EN_ITS_ADJ_END | confusable · all · error | `/\b[Ii]ts\s+(?:(?:very\|really\|so\|too\|pretty\|quite)\s+)?(true\|false\|fine\|ok\|okay\|good\|great\|bad\|nice\|easy\|hard\|possible\|impossible\|important\|cold\|hot\|late\|early\|raining\|snowing\|over\|done)(?=\s*[.!?,;]\|\s*$)/g` | I think its too late. | I think it's too late. | Here you mean "it is", so write "it's". | low | LT IT_IS |
| 4 | EN_ITS_TIME | confusable · all · error | `/(?<=^\|[.!?]\s+\|\bthat\s+\|\bthink\s+\|\bguess\s+\|\bnow\s+)[Ii]ts\s+time\b/g` | I think its time to go. | I think it's time to go. | "It's time to..." = "It is time to...". | low | LT IT_IS (antipattern: "took its time") |
| 5 | EN_ITS_OWN | confusable · all · error | `/\bit['’]s\s+(own\|self)\b/gi` | The town has it's own beach. | The town has its own beach. | Possessive "its" never has an apostrophe (like his, hers). | very low | LT IT_IS |
| 6 | EN_PREP_ITS | confusable · all · warning | `/\b(of\|on\|in\|for\|with\|by\|from\|into\|onto\|under\|over\|through)\s+it['’]s\s+(?!(?:been\|a\|an\|the\|not\|going\|time\|my\|your\|our\|their\|his\|her\|so\|very\|too\|really\|just\|all\|only\|also)\b)[a-z]+/gi` | The cat licked all of it's fur. | The cat licked all of its fur. | After a preposition you usually need possessive "its". | low | LT IT_IS (prep + it's + noun) |
| 7 | EN_YOUR_YOURE | confusable · all · error | `/\b[Yy]our\s+(?:(not(?!\s+\w+ing\b)\|gonna\|always\|never\|already\|probably\|definitely\|actually\|kidding\|joking\|a\|an\|the)\b(?![-/])\|(welcome\|right\|wrong\|sure\|late\|early)(?=\s*[.!?,;]\|\s*$))/g` | Your welcome! | You're welcome! | "your" = belonging to you. "you're" = you are. | low | LT YOUR_YOU_RE, YOUR |
| 8 | EN_YOURE_YOUR | confusable · all · error | `/\byou['’]re\s+(own\|car\|house\|name\|mother\|father\|mom\|mum\|dad\|sister\|brother\|phone\|job\|room\|bag\|book\|money\|turn\|fault\|email\|address\|homework\|opinion)\b/gi` | Is this you're bag? | Is this your bag? | Before a noun you need possessive "your". | low | LT YOUR |
| 9 | EN_THEIR_IS | confusable · all · error | `/\b[Tt]heir\s+(is\|are\|was\|were\|isn't\|aren't\|wasn't\|weren't\|will\s+be\|has\s+been\|have\s+been\|might\s+be\|could\s+be\|must\s+be)\b/g` | Their is a problem with the car. | There is a problem with the car. | "There is / there are" introduces something. "their" = belonging to them. | very low | LT THEIR_IS |
| 10 | EN_THERE_OWN | confusable · all · error | `/\b(there\|they['’]re)\s+own\b/gi` | They did it on there own. | They did it on their own. | "their own" (belonging to them). | very low | LT THERE_OWN |
| 11 | EN_PREP_THERE_NOUN | confusable · all · error | `/\b(of\|in\|at\|on\|to\|with\|without\|for\|from\|about)\s+there\s+(?:(?:new\|old\|best\|first\|last\|little\|big\|young)\s+)?(parents\|children\|kids\|friends\|family\|families\|house\|houses\|homes\|car\|cars\|name\|names\|lives\|jobs?\|money\|teachers?\|mother\|father\|son\|daughter\|dog\|cat\|phones?\|rooms?\|school\|country)\b/gi` | We went to there house. | We went to their house. | Before a noun you need "their" (belonging to them). | low | LT THERE_THEIR |
| 12 | EN_THEYRE_THERE | confusable · all · error | `/\b(they['’]re\s+(is\|are\|was\|were)\b\|(of\|in\|at\|on\|with\|for\|from\|about\|by)\s+they['’]re\b)/gi` | We talked about they're plans. | We talked about their plans. | "they're" = they are. Use "their" (belonging) or "there" (place / there is). | low | LT THEYRE_THEIR, THEIR_IS |
| 13 | EN_THEIR_THEYRE | confusable · all · warning | `/\b[Tt]heir\s+(gonna\|going\s+to\s+(?:be\|go\|do\|come\|have\|make\|get\|see\|win\|lose)\|not\s+(?:going\|coming\|sure\|ready\|here\|home))\b/g` | Their going to be late. | They're going to be late. | Here you mean "they are" = "they're". | low | LT THEYRE_THEIR |
| 14 | EN_THEN_THAN | confusable · nl · error | `/\b(more\|less\|better\|worse\|bigger\|smaller\|larger\|higher\|lower\|older\|younger\|faster\|slower\|cheaper\|easier\|harder\|stronger\|weaker\|longer\|shorter\|taller\|nicer\|happier\|rather\|other\|greater\|fewer\|quicker\|warmer\|colder\|hotter\|richer\|poorer\|different)\s+then\b(?!\s*[.!?,;:]\|\s*$)/gi` + skip if the 60 chars before match `/\bif\b[^.!?,]*$/` | My brother is taller then me. | My brother is taller than me. | Comparisons use "than". "then" is about time (first..., then...). Dutch "dan" covers both! | low | LT COMP_THAN, CONFUSION_OF_THEN_THAN; Burrough-Boenisch |
| 15 | EN_THAN_THEN | confusable · nl · error | `/\b([Aa]nd\|[Ss]ince\|[Uu]ntil\|[Tt]ill\|[Bb]y\|[Bb]ack\|[Ff]rom\|[Nn]ow\s+and)\s+than\b\|(?<=^\|[.!?]\s+)Than\s+(?=(?:I\|we\|he\|she\|they\|you\|it\|the\|my)\b)/g` + skip if the 60 chars before match `/\b(rather\|more\|less\|better\|worse\|sooner\|other\|further\|farther\|earlier\|later\|longer\|way)\b[^.!?]*$/` | We ate, and than we went home. | We ate, and then we went home. | "then" = after that / at that time. "than" is only for comparisons. | low | LT AND_THAN, FROM_THAN_ON |
| 16 | EN_LOSE_LOOSE_OBJ | confusable · nl · error | `/\bloos(e\|es\|ing)\s+(?:(?:my\|your\|his\|her\|our\|their\|the\|a\|all\|some\|much\|any\|so\s+much\|too\s+much)\s+)?(weight\|money\|keys?\|job\|jobs\|game\|games\|match\|way\|time\|mind\|patience\|control\|interest\|hope\|phone\|wallet\|track\|touch\|focus\|friends?\|sleep\|temper\|faith\|everything)\b/gi` | I always loose my keys. | I always lose my keys. | lose (luz) = verliezen. loose (loos) = los / not tight. Final devoicing makes them sound alike for Dutch ears. | very low | LT LOOSE_LOSE; English and the Dutch |
| 17 | EN_LOSE_LOOSE_AUX | confusable · nl · error | `/\b(to\|will\|won't\|would\|could\|can\|can't\|might\|must\|should\|don't\|didn't\|doesn't\|gonna\|never\s+want\s+to)\s+loose\b(?!\s+(?:fit\|clothes\|ends?\|change))/gi` | Don't loose hope! | Don't lose hope! | After to / will / can / don't you need the verb "lose". | low | LT LOOSE_LOSE |
| 18 | EN_LOOSE_LOSE_ADJ | confusable · nl · error | `/\b(on\s+the\|break\|broke\|broken\|cut\|come\|came\|set\|knock(?:ed)?)\s+lose\b/gi` | The dog is on the lose. | The dog is on the loose. | "on the loose / break loose" use the adjective "loose". | very low | LT LOSE_LOOSE |
| 19 | EN_AFFECT_NOUN | confusable · all · error | `/\b(an\|no\|any\|positive\|negative\|side\|big\|huge\|great\|significant\|little\|strong\|direct\|desired\|opposite\|same\|domino\|greenhouse\|butterfly\|special\|take\|took\|taken\|takes\|into\|in)\s+affects?\b/gi` | The medicine had a strong affect on me. | The medicine had a strong effect on me. | Usually: affect = verb (to influence), effect = noun (the result). | low | LT AFFECT_EFFECT, AFFECTS |
| 20 | EN_EFFECT_VERB | confusable · all · warning | `/\b(will\|would\|can\|could\|may\|might\|does\|did\|didn't\|doesn't\|won't\|not\|to\|badly\|seriously\|negatively)\s+effect(s\|ed)?\s+(?!(?:a\s+\|the\s+\|real\s+\|positive\s+)?changes?\b)(me\|you\|him\|her\|us\|them\|my\|your\|his\|our\|their\|the\|people\|everyone\|everybody\|it\|children\|students)\b/gi` | Stress can effect your sleep. | Stress can affect your sleep. | To influence something = affect. (Verb "effect" = to bring about, e.g. "effect change".) | low | LT AFFECT_EFFECT |
| 21 | EN_WHOS_WHOSE | confusable · all · error | `/\b[Ww]ho['’]s\s+(car\|bag\|book\|phone\|idea\|house\|turn\|fault\|job\|money\|name\|side\|dog\|cat\|coat\|keys\|pen\|seat\|responsibility\|birthday\|child\|children\|mother\|father\|wife\|husband)\b/g` | Who's phone is this? | Whose phone is this? | "whose" asks about the owner. "who's" = who is / who has. | low | LT WHOS, WHO_S_NN_VB |
| 22 | EN_WHOSE_WHOS | confusable · all · error | `/\b[Ww]hose\s+(going\|coming\|calling\|doing\|been\|ready\|next\|the\|a\|an)\b/g` | Whose coming to the party? | Who's coming to the party? | "who's" = who is / who has. | low | LT WHOS (inverse) |
| 23 | EN_TOO_VERB | confusable · all · error | `/\b(want\|wants\|wanted\|need\|needs\|needed\|have\|has\|had\|like\|likes\|liked\|try\|tries\|tried\|going\|used\|able\|decided\|hope\|plan\|love\|hate\|forgot\|remember\|learn\|learned\|nice\|happy\|glad\|ready\|time\|how\|what\|where\|easy\|hard)\s+too\s+(go\|be\|do\|see\|get\|make\|have\|take\|come\|buy\|eat\|find\|know\|say\|tell\|ask\|work\|play\|help\|start\|stop\|try\|use\|leave\|meet\|learn\|read\|write\|pay\|visit\|call\|bring)\b/gi` | I want too go home. | I want to go home. | Before a verb: "to" (to go). "too" = also / more than enough. | low | LT TOO_TO |
| 24 | EN_TO_TOO | confusable · all · error | `/\b(is\|are\|was\|were\|be\|been\|it['’]s\|that['’]s\|way\|not\|much\|far)\s+to\s+(late\|early\|soon\|much\|many\|big\|small\|hot\|cold\|expensive\|fast\|slow\|long\|short\|difficult\|hard\|easy\|young\|old\|tired\|busy)\b(?=\s*[.!?,;]\|\s*$\|\s+(?:for\|to\|and\|but\|because\|today\|now\|here\|there\|outside\|inside)\b)/gi` | It is to hot today. | It is too hot today. | "too" = more than enough (too hot) or also. "to" = direction / before a verb. | low | LT TO_TOO; Cambridge Dutch learner data ("to too much") |
| 25 | EN_ME_TOO | confusable · all · error | `/(?<=^\|[.!?]\s+)(Me\|Him\|Her\|Us)\s+to(?=\s*[.!?]\|\s*$)\|\b(love\|miss\|like)\s+you\s+to(?=\s*[.!]\|\s*$)/g` | I love you to! | I love you too! | "too" = also. | low | common error; Cambridge Dutch learner data |
| 26 | EN_TWO_TOO | confusable · all · error | `/\btwo\s+(much\|many\|late\|early\|soon)\b/gi` | I ate two much cake. | I ate too much cake. | "two" is the number 2. | very low | LT TO_TOO |
| 27 | EN_ACCEPT_EXCEPT | confusable · all · error | `/\b(please\|kindly\|will\|would\|can\|could\|to\|must\|should\|cannot\|can't\|won't\|didn't\|don't)\s+except\b/gi` | Please except my apology. | Please accept my apology. | accept = say yes / receive. except = apart from. | low | LT ACCEPT_EXCEPT |
| 28 | EN_ADVICE_VERB | confusable · all · error | `/\b(I\|we\|they\|would\|will\|please\|kindly\|strongly\|can\|could\|should)\s+advice\b/gi` | I advice you to rest. | I advise you to rest. | advise (z-sound) = verb. advice (s-sound) = noun. | low | LT ADVICE_ADVISE |
| 29 | EN_ADVISE_NOUN | confusable · all · error | `/\b(some\|any\|good\|bad\|great\|my\|your\|his\|her\|our\|their\|professional\|legal\|medical\|financial\|expert\|useful\|helpful\|piece\s+of\|for\|of\|need\|needs\|needed)\s+advise\b/gi` | Can you give me some advise? | Can you give me some advice? | The noun is "advice" (with c). | low | LT GIVE_ADVISE |
| 30 | EN_ADVICES | grammar · all · error | `/\badvices\b/gi` | She gave me many advices. | She gave me a lot of advice. | "advice" is uncountable: some advice, a piece of advice. (Verb: she advises.) | very low | LT ADVICE_ADVISE |
| 31 | EN_BELIEVE_BELIEF | confusable · nl · error | `/\b(I\|you\|we\|they\|don't\|didn't\|can't\|to)\s+belief\b\|\b(my\|your\|his\|her\|our\|their\|a\|the\|strong\|religious)\s+believe\b/gi` | I can't belief it! | I can't believe it! | believe = verb, belief = noun (like prove / proof, advise / advice). | low | final-devoicing pair; LT BELIVE_BELIEVE family |
| 32 | EN_PRICE_PRIZE | confusable · nl · error | `/\b(won\|win\|wins\|winning)\s+(?:the\s+\|a\s+\|first\s+\|second\s+\|third\s+\|top\s+\|grand\s+)?price\b\|\bnobel\s+price\b\|\b(high\|low\|full\|half\|reduced\|ticket\|sale\|retail\|market)\s+prize\b/gi` | She won first price. | She won first prize. | prize = what you win. price = what you pay. | low | final-devoicing pair |
| 33 | EN_LIVE_LIFE | confusable · nl · error | `/\b(my\|your\|his\|her\|our\|their)\s+(?:whole\s+\|entire\s+\|daily\s+\|social\s+\|private\s+\|love\s+)?live\b(?=\s*[.!?,;]\|\s*$\|\s+(?:is\|was\|has\|and\|changed)\b)\|\b(I\|you\|we\|they)\s+life\s+(?=(in\|at\|on\|with\|here\|there\|near\|together\|alone\|abroad)\b)/gi` | I want to enjoy my whole live. | I want to enjoy my whole life. | life = het leven (noun). live = wonen / leven (verb). A typical Dutch mix-up. | low | Cambridge Learner Corpus, Dutch learners |
| 34 | EN_ALOT | spelling · all · error | `/\balot\b/gi` | I like it alot. | I like it a lot. | "a lot" is always two words. | very low | Brians; codespell |
| 35 | EN_FUSED_WORDS | spelling · nl · error | `/\b(eachother\|infront\|atleast\|incase\|everytime\|aswell\|ofcourse\|noone\|inspite)\b/gi` | We help eachother every day. | We help each other every day. | English writes these as two words (Dutch glues words together, English often does not). | very low | codespell dictionary |
| 36 | EN_DEFINITELY | spelling · all · error | `/\b(definately\|definatly\|definetly\|definitly\|defenitely\|definitley\|defintely)\b/gi` | I will definately come. | I will definitely come. | Remember: defi-NITE-ly (it contains "finite"). | very low | codespell; Oxford common misspellings |
| 37 | EN_DEFIANTLY | spelling · all · hint | `/\b(will\|would\|I\|I'll\|am\|was\|is\|be\|'ll)\s+defiantly\b/gi` | I will defiantly be there. | I will definitely be there. | "defiantly" means rebelliously. Did you mean "definitely"? | medium | common autocorrect confusion |
| 38 | EN_OFF_COURSE | spelling · all · error | `/(?<=^\|[.!?,]\s*)[Oo]ff\s+course\b(?=\s*[,.!?]\|\s+(?:I\|we\|you\|he\|she\|they\|it\|not)\b)/g` | Off course I will help. | Of course I will help. | "of course" (natuurlijk). "off course" = not on the planned route. | low | common error |
| 39 | EN_I_LOWER | capitalization · all · error | `/(?<![\p{L}\p{N}_'’.(-])i(?=['’](?:m\|ve\|ll\|d)\b\|(?![\p{L}\p{N}_.'’)-])(?!\s+(?:is\|equals\|be)\b\|\s*[=<>+]\|[^.!?]{0,15}\bii\b))/gu` + skip if the 60 chars before match `/(?:\b(where\|letter\|short\|long\|dotted\|variable\|index\|the\|an?\|of\|to\|let\|each\|every\|for\|here)\|[=+<>(])\s*,?\s*$/` | Yesterday i went home and i'm tired. | Yesterday I went home and I'm tired. | The word "I" is always a capital letter in English (Dutch "ik" is not). | very low | LT I_LOWERCASE |
| 40 | EN_SENT_START_CAP | capitalization · all · error | `/(?<=^\|(?<!\.)[.!?]\s+)(?<!\b(?:e\.g\|i\.e\|etc\|vs\|approx\|Mr\|Mrs\|Ms\|Dr\|St)\.\s+)(?!(?:iPhones?\|iPads?\|iOS\|eBay\|macOS)\b)[a-z]/g` + skip if the 60 chars before match `/(?:\b[A-Za-z]\.(?:[A-Za-z]\.)*\|\b(?:Corp\|Inc\|Ltd\|Co\|Jr\|Sr\|St\|Mt\|No\|Fig\|approx\|Dept\|Univ\|Ave\|Rd\|vs\|etc\|Mr\|Mrs\|Ms\|Dr\|Prof\|Gen\|Sgt\|Capt\|Lt\|Col\|Gov\|Sen\|Rep\|ft\|in\|cm.../` | I was tired. then I slept. | I was tired. Then I slept. | Start every sentence with a capital letter. | low | LT UPPERCASE_SENTENCE_START (Java rule) |
| 41 | EN_DAY_CAP | capitalization · nl · error | `/\b(monday\|tuesday\|wednesday\|thursday\|friday\|saturday\|sunday)(s)?\b/g` | See you on monday. | See you on Monday. | Days of the week always start with a capital in English (Dutch writes "maandag"). | very low | Dutch/English capitalisation contrast |
| 42 | EN_MONTH_CAP | capitalization · nl · error | `/\b(january\|february\|april\|june\|july\|september\|october\|november\|december)\b\|(?<=\b(?:in\|since\|until\|till\|from\|early\|late\|mid\|last\|next\|before\|after\|during\|\d{1,2}(?:st\|nd\|rd\|th)?)\s+)(march\|may\|august)\b(?!\s+(?:be\|have\|not\|also\|still\|well\|never\|need\|want\|go\|come\|help\|I\|you\|we\|they\|he\|she\|it)\b)/g` | My birthday is in july. | My birthday is in July. | Months start with a capital in English (Dutch writes "juli"). | low | LT LOWERCASE_MONTHS |
| 43 | EN_LANG_CAP | capitalization · ar · error | `/\b(english\|dutch\|arabic\|french(?!\s+(?:fr(?:y\|ies)\|toast\|doors?\|windows?\|press\|kiss\|horn\|braids?)\b)\|german\|spanish\|italian\|portuguese\|russian\|chinese\|japanese\|korean\|hindi\|urdu\|persian\|farsi\|hebrew\|greek\|swedish\|danish\|flemish\|frisian\|moroccan\|egyptian\|syrian\|iraqi\|saudi\|lebanese\|palestinian\|tunisian\|algerian\|somali\|american\|british\|european\|african\|asian\|belgian\|islam\|muslim\|christian\|ramadan\|christmas\|easter)\b/g` | I speak dutch and arabic. | I speak Dutch and Arabic. | Languages, nationalities and religions always start with a capital letter. | low | LT CAPITALIZATION family; Arabic has no capital letters |
| 44 | EN_SINCE_DURATION | grammar · nl · error | `/\bsince\s+(\d+\|a\|one\|two\|three\|four\|five\|six\|seven\|eight\|nine\|ten\|eleven\|twelve\|fifteen\|twenty\|thirty\|many\|several\|a\s+few\|few)\s+(years?\|months?\|weeks?\|days?\|hours?\|minutes?\|decades?)\b(?!\s+ago)/gi` | I have lived here since five years. | I have lived here for five years. | since + a moment (since 2015). for + a period (for five years). Dutch "sinds" covers both. | very low | LT SINCE_FOR |
| 45 | EN_SINCE_PRESENT | grammar · nl · warning | `/\b(I\|you\|we\|they)\s+(live\|work\|study\|know\|am\|are\|teach\|play\|own\|wait\|stay\|learn)\b(?:\s+[\w']+){0,4}?\s+since\s+(\d{4}\|last\b\|yesterday\|january\|february\|march\|april\|may\|june\|july\|august\|september\|october\|november\|december\|monday\|tuesday\|wednesday\|thursday\|friday\|saturday\|sunday\|childhood\|this\s+morning\|I\s+was\|we\s+were)/gi` | I live in Utrecht since 2015. | I have lived in Utrecht since 2015. | Started in the past and still true now -> present perfect (I have lived). Dutch uses the present ("ik woon hier sinds..."). | low | LT PERFECT_TENSE_SINCE; elon.io; Wikipedia Dunglish |
| 46 | EN_PERFECT_PAST_TIME | grammar · nl · warning | `/\b(have\|has)\s+(been\|gone\|seen\|done\|made\|met\|bought\|eaten\|written\|taken\|given\|got\|left\|sent\|spent\|found\|told\|heard\|won\|lost\|paid\|visited\|finished\|started\|arrived\|called\|moved\|played\|watched\|worked\|lived)\b(?:(?![.!?])[^.!?])*?(?<!\bsince\s+\|\bfor\s+\|\buntil\s+\|\bthan\s+)\b(yesterday\|last\s+(?:night\|week\|month\|year\|summer\|winter\|weekend\|monday\|tuesday\|wednesday\|thursday\|friday\|saturday\|sunday)\|\d+\s+(?:days?\|weeks?\|months?\|years?)\s+ago\|in\s+(?:19\|20)\d\d)\b/gi` + skip if the 60 chars before match `/\b(may\|might\|must\|could\|should\|would\|will)\s*$/` | I have seen that film yesterday. | I saw that film yesterday. | With a finished time (yesterday, last week, in 2019) English uses the past simple, not "have + ...". Dutch "ik heb ... gezien" does not translate 1:1. | medium | Gymglish (Dutch speakers); LT MISSING_PAST_TENSE |
| 47 | EN_I_AM_AGREE | grammar · all · error | `/\b(I\|we\|they\|you)\s*(am\|are\|['’]m\|['’]re)\s+(not\s+)?agree\b\|\b(he\|she\|it)\s*(is\|['’]s)\s+(not\s+)?agree\b\|\b(Are\|Is)\s+(you\|he\|she\|they\|we)\s+agree\b/gi` | I am agree with you. | I agree with you. | "agree" is a verb, not an adjective: I agree, I don't agree, Do you agree? | very low | common learner error (EnglishAlex list; Cambridge TKT) |
| 48 | EN_UNCOUNTABLE_PLURAL | grammar · all · error | `/\b(informations\|furnitures\|equipments\|luggages\|baggages\|homeworks\|softwares\|jewelleries\|jewelries\|machineries)\b/gi` | Thanks for the informations. | Thanks for the information. | These nouns are uncountable in English: no -s. Say "some information", "a piece of furniture". | very low | LT INFORMATIONS |
| 49 | EN_UNCOUNTABLE_PLURAL_SOFT | grammar · nl · hint | `/\b(knowledges\|feedbacks\|trainings\|researches(?=\s+(?:show\|have\|are\|were)\b))\b/gi` | Thank you for the feedbacks. | Thank you for the feedback. | Usually uncountable in English (Dutch "trainingen", "feedbacks" are plural). | medium | learner usage notes |
| 50 | EN_MORE_COMPARATIVE | grammar · all · error | `/\bmore\s+(better\|worse)\b(?!\s*\?)\|\b(more\|most)\s+(easier\|harder\|bigger\|smaller\|faster\|slower\|cheaper\|happier\|nicer\|larger\|taller\|stronger\|best\|worst\|biggest\|easiest)\b(?=\s+than\b\|\s*[.!?,;]\|\s*$)/gi` | This one is more better. | This one is better. | "better", "easier" are already comparatives. Don't add "more". | very low | LT MOST_COMPARATIVE |
| 51 | EN_MOST_OF_PEOPLE | grammar · all · error | `/\bmost\s+of\s+(people\|students\|children\|men\|women\|countries\|cities\|time)\b/gi` | Most of people like music. | Most people like music. | "most people" (in general) or "most of the people" (a specific group). Never "most of people". | very low | Grammar-Quizzes; LT MOST_OF_THE_TIMES |
| 52 | EN_HE_DONT | grammar · all · error | `/\b([Hh]e\|[Ss]he)\s+(don['’]t\|do\s+not)\b\|(?:(?<=^\|[.!?]\s+)\|\b(?:and\|but\|because\|so\|if\|when)\s+)[Ii]t\s+(don['’]t\|do\s+not)\b/g` | He don't like coffee. | He doesn't like coffee. | With he / she / it: doesn't. | very low | LT NON3PRS / agreement family |
| 53 | EN_3SG_BASE | grammar · all · warning | `/\b(he\|she)\s+(?:(?:always\|never\|often\|usually\|sometimes\|also\|really\|just)\s+)?(go\|have\|do\|want\|like\|need\|know\|make\|come\|live\|work\|think\|say\|get\|see\|take\|play\|study\|speak\|eat\|drink\|read\|write\|walk\|drive\|love\|hate\|feel\|look\|seem\|try\|use\|watch\|listen\|wait\|stay\|help\|run\|sleep\|teach\|learn\|understand\|believe\|remember\|forget\|leave\|buy\|pay\|call\|ask\|tell\|give)\b/gi` + skip if the 60 chars before match `/\b(did\|does\|do\|didn't\|doesn't\|don't\|will\|would\|can\|could\|should\|shall\|may\|might\|must\|won't\|wouldn't\|can't\|couldn't\|shouldn't\|let\|make\|made\|help\|helped\|watch\|wat.../` | She go to school every day. | She goes to school every day. | He / she / it + present simple verb needs -s: she goes, he has, she does. | low | LT HE_VERB_AGR (simplified, word list instead of POS) |
| 54 | EN_NON3SG_S | grammar · all · warning | `/(?:\b(?:I\|[Ww]e\|[Tt]hey)\|(?:(?<=^\|[.!?,;]\s*)\|\b(?:and\|because\|so\|if\|when\|that)\s+)[Yy]ou)\s+(goes\|has\|does\|wants\|likes\|needs\|knows\|makes\|comes\|lives\|works\|thinks\|says\|gets\|sees\|takes\|plays\|studies\|speaks\|eats\|loves\|hates\|feels\|looks\|seems\|tries\|uses\|watches\|listens)\b/g` + skip if the 60 chars before match `/\b(of\|but\|than\|thank\|except\|like\|as\s+well\s+as)\s*$/` | They likes football. | They like football. | With I / you / we / they: no -s. | low | LT NON3PRS_VERB |
| 55 | EN_PEOPLE_IS | grammar · all · error | `/(?<=^\|[.!?]\s+)People\s+(is\|was\|has\|doesn['’]t\|does\|isn['’]t\|wasn['’]t)\b/g` | People is very friendly here. | People are very friendly here. | "people" is plural: people are, people have. | low | LT PEOPLE_VBZ |
| 56 | EN_NOT_WITHOUT_DO | grammar · nl · error | `/\b(I\|you\|we\|they\|he\|she)\s+not\s+(like\|likes\|want\|wants\|know\|knows\|need\|needs\|have\|has\|understand\|understands\|think\|thinks\|see\|go\|goes\|eat\|work\|works\|live\|lives\|speak\|speaks\|believe\|remember\|care\|mind)\b/gi` + skip if the 60 chars before match `/\b(do\|does\|did\|would\|could\|will\|can\|should\|must\|might\|may\|have\|has)\s*$/` | I not like this song. | I don't like this song. | English needs "do" for negatives: I don't like, she doesn't know. (Dutch just adds "niet".) | low | elon.io do-support; Wikipedia Dunglish |
| 57 | EN_VERB_IT_NOT | grammar · nl · error | `/\b(I\|you\|we\|they)\s+(like\|know\|want\|understand\|need\|believe\|remember\|see\|have)\s+(it\|that\|this\|him\|her\|them)\s+not\b(?!\s+(?:to\|only)\b)/gi` | I like it not. | I don't like it. | English negative: I don't like it (not "I like it not" = Dutch "ik vind het niet leuk" word order). | low | elon.io do-support |
| 58 | EN_WH_VERB_SUBJECT | grammar · nl · error | `/(?<=^\|[.!?]\s+)(When\|Where\|Why\|How\|What)\s+(?!come\s)(go\|come\|eat\|work\|live\|think\|want\|like\|need\|know\|mean\|play\|study\|leave\|start\|arrive\|get\|make\|see\|speak\|goes\|works\|lives\|wants\|likes\|knows\|went\|came\|ate\|said)\s+(you\|he\|she\|we\|they\|I)\b[^.!?]*\?/g` | When go you home? | When do you go home? | English questions need do / does / did: "When do you go...?" (Dutch: "Wanneer ga je...?"). | low | LT grammar-l2-de WH_VERB_SUBJECT; Wikipedia Dunglish |
| 59 | EN_IN_THE_WEEKEND | grammar · nl · warning | `/\bin\s+the\s+weekends?\b(?!\s+(?:edition\|papers?\|news\|issue\|schedule\|traffic\|market)\b)/gi` | What are you doing in the weekend? | What are you doing at the weekend? | UK: at the weekend / at weekends. US: on the weekend / on weekends. "in the weekend" is a Dutch-ism (in het weekend). | low | Merriam-Webster Learner's; Oxford Learner's |
| 60 | EN_IN_WEEKDAY | grammar · all · error | `/\bin\s+(Monday\|Tuesday\|Wednesday\|Thursday\|Friday\|Saturday\|Sunday)s?\b(?!['’]s\|\s+(?:night\|morning\|afternoon\|evening)['’]s\|\s+through\b)/g` + skip if the 60 chars before match `/\b(weigh(?:s\|ed)?\|be\|am\|is\|are\|was\|were\|been\|sleep\|slept\|sleeps\|come\|came\|comes\|get\|got\|gets\|check(?:ed)?\|log(?:ged)?\|fill(?:ed)?\|hand(?:ed)?\|turn(?:ed)?\|call(?.../` | We meet in Monday. | We meet on Monday. | Days take "on": on Monday, on Fridays. | low | LT IN_WEEKDAY; Cambridge grammar at/on/in |
| 61 | EN_MAKE_HOMEWORK | collocation · nl · error | `/\b(make\|makes\|making\|made)\s+(?:(?:my\|your\|his\|her\|our\|their\|the\|some\|all\|all\s+my)\s+)?homework\b/gi` | I have to make my homework. | I have to do my homework. | English: DO homework (Dutch: huiswerk maken). | very low | Dunglish collocation; Jakub Marian |
| 62 | EN_MAKE_PHOTO | collocation · nl · warning | `/\b(make\|makes\|making\|made)\s+(?:(?:a\|an\|some\|many\|lots\s+of\|a\s+lot\s+of\|the\|my\|our\|this\|that\|nice\|great\|beautiful\|good)\s+)*(photos?\|photographs?\|selfies?\|pics?)\b/gi` | Can you make a photo of us? | Can you take a photo of us? | English: TAKE a photo (Dutch: een foto maken). | very low | Jakub Marian: make vs take a photo |
| 63 | EN_DO_MISTAKE | collocation · all · error | `/\b(I\|you\|we\|they\|he\|she\|to\|always\|often\|never\|sometimes\|can\|will\|would\|don['’]t\|didn['’]t\|not)\s+(do\|did\|does\|doing)\s+(?:a\s+\|the\s+same\s+\|many\s+\|some\s+\|lots\s+of\s+\|a\s+lot\s+of\s+\|stupid\s+\|small\s+\|big\s+)?mistakes?\b\|\b(have\|has\|had)\s+done\s+(?:a\s+\|many\s+\|some\s+)?mistakes?\b/gi` | I always do the same mistake. | I always make the same mistake. | English: MAKE a mistake. | low | collocation (Cambridge, Oxford Collocations) |
| 64 | EN_MAKE_A_WALK | collocation · nl · error | `/\b(make\|makes\|made\|making)\s+a\s+walk\b/gi` | Let's make a walk. | Let's go for a walk. | English: take a walk / go for a walk (Dutch: een wandeling maken). | very low | Dutch collocation transfer |
| 65 | EN_MAKE_FUN | collocation · nl · warning | `/\b(make\|made\|making)\s+fun\b(?=\s*[.!?,]\|\s*$\|\s+(?:with\|together\|tonight\|today\|this\|during\|at\|in\|on)\b)/gi` | We made fun at the party. | We had fun at the party. | "have fun" = enjoy yourself. "make fun of" = laugh at someone (unkind). Dutch "plezier maken" = have fun. | low | Dutch collocation transfer |
| 66 | EN_BORROW_ME | collocation · nl · error | `/\b(borrow\|borrows\|borrowed\|borrowing)\s+(me\|us)\s+(a\|an\|the\|your\|his\|her\|some\|money\|\d+\|it\|this\|that)\b/gi` | Can you borrow me your pen? | Can you lend me your pen? | lend = give for a while (uitlenen). borrow = take for a while (lenen van). Dutch "lenen" covers both. | very low | Paul Brians, Common Errors: borrow/lend |
| 67 | EN_LEND_BORROW | collocation · nl · error | `/\b(can\|could\|may\|might)\s+I\s+lend\s+(your\|his\|her\|their\|some\|a\|an\|the)\b/gi` | Can I lend your bike? | Can I borrow your bike? | If YOU take it, you borrow it. | low | Paul Brians, Common Errors: borrow/lend |
| 68 | EN_LEARN_ME | collocation · nl · error | `/\b(learn\|learns\|learned\|learnt\|learning)\s+(me\|him\|us)\s+(to\|how\|about\|English\|Dutch\|Arabic\|maths?\|the)\b/gi` | My father learned me how to swim. | My father taught me how to swim. | teach = give knowledge (leren aan). learn = get knowledge. Dutch "leren" covers both. | very low | iamexpat / Dunglish: leren |
| 69 | EN_BECOME_GET | false-friend · nl · warning | `/\b(become\|becomes\|became\|becoming)\s+(?:(?:a\|an\|the\|my\|some\|your\|no)\s+)?(present\|gift\|letter\|message\|email\|e-mail\|answer\|reply\|package\|parcel\|call\|prize\|discount\|refund\|salary\|raise\|ticket\|invitation)\b/gi` | I became a present from my aunt. | I got a present from my aunt. | "become" = worden. To receive something = get / receive. (Flemish "bekomen", German "bekommen" = get.) | low | false-friend pattern (German bekommen / Flemish bekomen); flagged as likely, not corpus-verified |
| 70 | EN_EVENTUALLY_FF | false-friend · nl · hint | `/\b(can\|could\|may\|might\|we\|you\|I)\s+eventually\b(?=[^.!?]*\b(?:tomorrow\|next\s+week\|later\|if\|maybe\|perhaps\|also)\b)\|\beventual\s+(questions?\|problems?\|costs?\|changes?\|delays?\|comments?)\b/gi` | We could eventually meet tomorrow if you want. | We could possibly meet tomorrow if you want. | eventually = in the end (uiteindelijk). Dutch "eventueel" = possibly / if needed. | medium | Dunglish false friends (iamexpat, Fulbright); LT false-friends.xml |
| 71 | EN_ACTUAL_FF | false-friend · nl · hint | `/\bactual\s+(news\|topics?\|issues?\|affairs\|events?\|developments?\|themes?)\b/gi` | We discussed actual news. | We discussed current news. | actual = real (werkelijk). Dutch "actueel" = current / topical. | medium | LT false-friends.xml (actual / actueel); Wikipedia Dunglish |
| 72 | EN_CONTROL_CHECK | false-friend · nl · hint | `/\b(control\|controlled\|controlling\|controls)\s+(?:(?:the\|my\|your\|his\|her\|our\|their)\s+)?(answers?\|homework\|spelling\|tickets?\|passports?\|text\|email\|grammar\|calculations?)\b/gi` | Can you control my homework? | Can you check my homework? | To look for mistakes = check. "control" = have power over (Dutch "controleren" = check). | medium | Dunglish false friend (controleren) |
| 73 | EN_WE_ARE_WITH_N | false-friend · nl · hint | `/\b(we\|they)\s+(are\|were\|['’]re)\s+with\s+(\d+\|two\|three\|four\|five\|six\|seven\|eight\|nine\|ten\|eleven\|twelve)(?=\s*[.!?,]\|\s*$\|\s+(?:people\|persons)\b)/gi` | We are with five people. | There are five of us. | Dutch "we zijn met z'n vijven" = "there are five of us". | medium | Dutch idiom transfer (Dunglish) |
| 74 | EN_HOW_DO_YOU_CALL | false-friend · nl · hint | `/\b[Hh]ow\s+(do\|would\|did)\s+you\s+call\s+(this\|that\|it\|these\|those)\b(?=\s*\?\|\s+in\b)/g` | How do you call this in English? | What do you call this in English? | English: WHAT do you call it? (Dutch: Hoe noem je dit?) | low | Dutch idiom transfer |
| 75 | EN_ACCORDING_TO_ME | style · nl · hint | `/\b[Aa]ccording\s+to\s+me\b/g` | According to me, it is a good idea. | In my opinion, it is a good idea. | "according to" is used for other sources. For yourself: "In my opinion" / "I think" (Dutch "volgens mij"). | very low | LT ACCORDING_TO_ME |
| 76 | EN_PLURAL_APOSTROPHE | punctuation · nl · error | `/\b(\d{1,3}\|two\|three\|four\|five\|six\|seven\|eight\|nine\|ten\|many\|several\|few\|these\|those\|more\|both\|lots\s+of\|a\s+lot\s+of\|hundreds\s+of\|thousands\s+of)\s+(?!(?:people\|children\|men\|women\|teeth\|feet\|mice\|sheep\|fish\|today\|tomorrow\|yesterday\|everyone\|someone\|nobody\|anyone\|one\|it\|that\|there\|here\|what\|who\|he\|she\|let\|where\|how)['’]s)([a-z]{3,}\|[A-Z]{2,})['’]s\b(?!\s+(?:going\|gone\|been\|got\|gonna\|not)\b)/g` | We took many photo's. | We took many photos. | English plurals NEVER take an apostrophe: photos, euros, babies, CDs. (Dutch writes foto's, auto's.) If you meant ownership by several people, write teachers' (apostrophe after the s). | very low | English and the Dutch (Substack); Burrough-Boenisch |
| 77 | EN_PERSON_WHICH | grammar · nl · warning | `/\b(man\|woman\|person\|people\|teacher\|friend\|friends\|boy\|girl\|student\|students\|doctor\|guy\|someone\|somebody\|anyone\|everyone\|children\|kids\|men\|women\|colleague\|colleagues)\s+which\b/gi` | The man which lives next door is nice. | The man who lives next door is nice. | For people use "who" (or "that"), not "which". Dutch "die" covers both. | low | relative clause transfer |
| 78 | EN_EXPLAIN_ME | grammar · all · error | `/\bexplain(s\|ed\|ing)?\s+(me\|him\|her\|us\|you)\s+(how\|what\|why\|where\|when\|which\|who\|the\|that\|this\|everything\|something\|it)\b/gi` | Can you explain me the rules? | Can you explain the rules to me? | explain SOMETHING TO someone. | low | LT EXPLAIN_TO |
| 79 | EN_DISCUSS_ABOUT | grammar · all · error | `/\bdiscuss(es\|ed\|ing)?\s+about\b/gi` | Let's discuss about the plan. | Let's discuss the plan. | "discuss" needs no "about". | very low | LT DISCUSS_ABOUT |
| 80 | EN_DEPEND_OF | grammar · nl · error | `/\bdepend(s\|ed\|ing\|ent)?\s+(of\|from\|by\|with\|in\|about)\b/gi` | It depends of the weather. | It depends on the weather. | depend ON (Dutch: afhangen van). | very low | LT DEPEND_ON |
| 81 | EN_MARRIED_WITH | grammar · nl · warning | `/\bmarried\s+with\s+(him\|her\|a\|an\|my\|his\|the\|someone\|somebody)\b(?!\s+(?:[\w-]+\s+){0,2}(?:child\|children\|kids?\|baby\|babies\|daughters?\|sons?)\b)/gi` | She is married with a doctor. | She is married to a doctor. | married TO someone (Dutch: getrouwd met). "married with children" = has children. | low | LT (married with -> married to) |
| 82 | EN_COPULA_OMISSION | grammar · ar · warning | `/(?:\b(?:he\|she\|I\|we\|they)\|(?:(?<=^\|[.!?]\s+)\|\b(?:and\|but\|because\|so\|when\|if)\s+)(?:it\|you\|this\|that))\s+(very\|so\|too\|really)\s+(happy\|sad\|tired\|big\|small\|good\|bad\|hungry\|busy\|ready\|late\|beautiful\|nice\|kind\|tall\|short\|old\|young\|angry\|cold\|hot\|expensive\|cheap\|important\|difficult\|easy\|interesting\|boring\|smart\|clever\|funny\|strong\|fast\|slow\|rich\|poor\|sick\|ill)\b/gi` + skip if the 60 chars before match `/\b(am\|is\|are\|was\|were\|isn't\|aren't\|wasn't\|weren't\|how\|as\|that\|[\w]+['’]s)\s*$/` | He very tall and strong. | He is very tall and strong. | English needs "is / am / are" here: he IS very tall. (Arabic has no present-tense "to be".) | low | copula-omission research (Arab EFL learners); LLEXI |
| 83 | EN_COPULA_OMISSION_ART | grammar · ar · warning | `/(?<=^\|[.!?]\s+)(He\|She\|It)\s+(a\|an)\s+(?=\w)/g` | She a teacher. | She is a teacher. | Add "is": she is a teacher. | low | copula-omission research |
| 84 | EN_MISSING_ARTICLE_JOB | grammar · ar · warning | `/\b(I['’]m\|am\|is\|are\|was\|were\|he['’]s\|she['’]s\|you['’]re\|became\|become\|work\s+as\|works\s+as\|worked\s+as\|want\s+to\s+be\|wants\s+to\s+be)\s+(teacher\|doctor\|student\|engineer\|nurse\|lawyer\|dentist\|pilot\|waiter\|waitress\|cook\|chef\|farmer\|programmer\|designer\|developer\|mechanic\|scientist\|architect\|pharmacist\|accountant\|journalist\|driver\|cleaner\|writer\|singer\|artist)(?=\s*[.!?,;]\|\s*$\|\s+(?:and\|but\|at\|in\|for\|with\|from\|who\|because\|now\|too\|here\|there)\b)/gi` | My sister is engineer. | My sister is an engineer. | Jobs need "a / an": she is AN engineer. (Arabic has no indefinite article.) | low | article-error research (Arabic L1) |
| 85 | EN_MISSING_ARTICLE_HAVE | grammar · ar · warning | `/\b(I\|you\|we\|they\|he\|she)\s+(have\|has\|had\|need\|needs\|want\|wants\|bought\|buy\|own\|owns)\s+(car\|dog\|cat\|house\|brother\|sister\|question\|problem\|idea\|job\|computer\|laptop\|phone\|bike\|bicycle\|appointment\|meeting\|exam\|test\|headache\|cold)\b(?=\s*[.!?,;]\|\s*$\|\s+(?:and\|but\|because\|so\|in\|at\|with\|for\|about\|from\|to\|on\|that\|today\|tomorrow\|yesterday\|now)\b)/gi` | I have question about the test. | I have a question about the test. | One countable thing needs "a / an": a car, a question, an idea. | low | article-error research (Arabic L1) |
| 86 | EN_GENERIC_THE | grammar · ar · hint | `/(?<=^\|[.!?]\s+)The\s+(life\|love\|money\|happiness\|education\|health\|nature\|society\|history\|science\|technology\|religion\|freedom\|success\|friendship\|music\|art\|sport\|knowledge\|marriage\|honesty\|patience\|war\|peace\|poverty)\s+(is\|are\|was\|can\|has\|makes\|gives\|teaches)\b(?![^.!?]*\b(?:of\|that\|which\|in\s+(?:this\|that\|my\|our\|the))\b)/g` | The life is very short. | Life is very short. | General statements about abstract things usually have no "the": Life is short. Money is important. | medium | definite-article research (Arabic L1, generic reference) |
| 87 | EN_WH_NO_INVERSION | grammar · ar · warning | `/(?<=^\|[.!?]\s+)(When\|Where\|What\|Why\|How\|Which)\s+(I\|you\|he\|she\|it\|we\|they)\s+(can\|will\|should\|could\|must\|would\|am\|is\|are\|was\|were)\b[^.!?]*\?/g` | When I can call you? | When can I call you? | In questions, the helper verb comes before the subject: When CAN I...? Why ARE you...? | low | Cambridge learner data summary (Arabic speakers); LT WH_* family |
| 88 | EN_SPACE_BEFORE_PUNCT | punctuation · all · error | `/[ \t]+(?=[,.;:!?](?:\s\|$))(?![.]{2}\|[:;]-?[)(DPp])/g` | Hello , how are you ? | Hello, how are you? | No space before , . ! ? : ; in English. | very low | LT COMMA_PARENTHESIS_WHITESPACE (Java) |
| 89 | EN_SPACE_AFTER_COMMA | punctuation · all · error | `/[,;](?=[A-Za-z])/g` | Yes,I know. | Yes, I know. | Put a space after a comma. | very low | LT COMMA_PARENTHESIS_WHITESPACE (Java) |
| 90 | EN_SPACE_AFTER_PERIOD | punctuation · all · error | `/(?<=[a-z]{2})[.!?](?=[A-Z][a-z])/g` | I was tired.Then I slept. | I was tired. Then I slept. | Put a space after the end of a sentence. | low | LT LC_AFTER_PERIOD family |
| 91 | EN_MULTI_SPACE | punctuation · all · hint | `/(?<=\S) {2,}(?=\S)/g` | I am  here. | I am here. | One space between words is enough. | very low | LT CONSECUTIVE_SPACES |
| 92 | EN_ARABIC_PUNCT | punctuation · ar · error | `/[،؛؟]/g` | How are you؟ I am fine، thanks. | How are you? I am fine, thanks. | Arabic keyboard punctuation (، ؛ ؟) slipped in. Use the English , ; ? | very low | Unicode U+060C / U+061B / U+061F (keyboard-switch heuristic) |
| 93 | EN_DOUBLE_PUNCT | punctuation · all · hint | `/,{2,}\|(?<!\.)\.\.(?!\.)\|[!?]{3,}/g` | Wait.. what? | Wait... what? | Doubled punctuation: use one mark (or a proper ellipsis "..."). | low | LT DOUBLE_PUNCTUATION |
| 94 | EN_WORD_REPEAT | typo · all · error | `/\b([A-Za-z']+)\s+\1\b(?<!\b(?:had\s+had\|that\s+that\|do\s+do\|her\s+her\|can\s+can\|bye\s+bye\|ha\s+ha\|no\s+no\|yes\s+yes\|so\s+so\|very\s+very\|really\s+really\|knock\s+knock\|well\s+well\|chop\s+chop\|night\s+night\|blah\s+blah\|hip\s+hip\|aye\s+aye\|tsk\s+tsk\|bla\s+bla\|haha\s+haha\|many\s+many)\b)/gi` | I went to the the shop. | I went to the shop. | You typed the same word twice. | very low | LT ENGLISH_WORD_REPEAT_RULE (exceptions list) |
| 95 | EN_RUN_ON_AND | style · ar · hint | function: split into sentences; count clause-chaining joins `/\b(?:and\|so\|but\|then)\s+(?:then\s+)?(?:I\|we\|he\|she\|they\|it\|you\|there)\b/gi`; hint if >= 3 (or >= 2 and sentence >= 45 words) | I woke up and I ate and then I went out and I met Ali and we played football and it was fun. | I woke up and ate breakfast. Then I went out and met Ali. We played football, and it was fun. | Long chain of "and / so / then". Try splitting it into shorter sentences. | medium | run-on/comma-splice research (Arab learners); Purdue OWL |


### 4.2 EN_A_AN: a/an by sound (function rule)

Regex alone can't do a/an. The prototype (`aan.mjs`) uses LanguageTool's approach (`det_a.txt` / `det_an.txt` exception lists) in a compact form:

```js
// returns 'a' | 'an' | null (both acceptable)
const BOTH = new Set(['historic','historical','herb','herbs','herbal','hotel','habitual','homage','heroic','hysterical','sql']);
const A_PREFIX  = /^(?:eu|ewe|one(?!r)|once|uk|ub|ug(?!l)|ura|ure|uri|uro|usa|use|usu|ut(?![tm])|uv|uni(?![mndl]|ns|nf|nh))/i; // a university, a European, a one-off, a user
const AN_PREFIX = /^(?:hour|honest|honou?r|heir)/i;                                                                      // an hour, an honest man
const VOWEL_SOUND_LETTERS = new Set(['A','E','F','H','I','L','M','N','O','R','S','X']);                                 // an FBI agent, an MRI, an SOS
// all-caps token: letter-by-letter if it's a known initialism (MBA, FBI, URL, UFO...) or has no vowel or isn't a dictionary word;
// otherwise it's a word written in capitals (a LOT, a LEGAL wrangle) or a word-acronym (a NATO summit, a NASA probe).
// numbers: 8..., 11, 18, 11,000, 18,000 → 'an' (an 8-year-old, an 18-year-old); others → 'a'.
```

Guards that matter (each one was a false positive found in testing):
- skip `a` used as a symbol or label: preceded by *vitamin, plan, grade, type, annex, figure, step, option, row, width...* ("Plan A is") or followed by *is, are, and, or, =, b, x...* ("where a is non-zero").
- `historic/hotel/herb` → accept both (*an historic* is old-fashioned but not wrong; *a/an herb* differs between UK and US).
- Pass the real spelling dictionary in (`setDictionary(fn)`), so that shouted words (*a LOT*) aren't treated as initialisms.

Test cases that pass: *a hour→an*, *an university→a*, *an European→a*, *a MBA→an*, *an UFO→a*, *a honest→an*, *a 8-year-old→an*, *an useful→a*, *a unimportant→an*, *a ugly→an*, *a utter→an*, *an once→a*. *SQL* returns null (both "an S-Q-L" and "a sequel" are used; LanguageTool lists it under *a*). No false positives on: *Vitamin A is good*, *Plan A is fine*, *A one-way ticket*, *A historic day / An historic day*, *An 18-year-old won*, *A UFO landed*.

### 4.3 US/UK consistency (function rule)

- Mixing is the error, not either variety. Count the US and UK variants in the text. If both are present, flag the **minority** variety, or everything that doesn't match the variety the user chose in settings.
- Treat **-ize/-ise separately.** *Oxford spelling* (-ize + British otherwise) is legitimate British English (VarCon even has a separate "Z" tag for it). Only flag mixing -ize with -ise inside one text. Words that are always *-ise* (advertise, advise, comprise, exercise, surprise, televise, ...) never count.
- **Leave out ambiguous pairs**, which are valid in both varieties with different meanings or parts of speech: *license/licence, practice/practise* (UK noun vs verb), *program/programme* (UK computer program), *tire/tyre* (verb "to tire"), *check/cheque, meter/metre, story/storey, curb/kerb, draft/draught, inquiry/enquiry, disk/disc, dialog/dialogue, judgment/judgement*.
- **Data source:** use **VarCon** (Kevin Atkinson / SCOWL; permissive licence; tags A = American, B = British -ise, Z = British -ize/Oxford, C = Canadian, D = Australian). Keep clusters at SCOWL level ≤ 50 and drop clusters with meaning notes (`|`). The prototype `variety.mjs` uses a hand-made list of 44 pairs plus an -ize/-ise counter to show the logic.

### 4.4 L1-weighted spelling suggestions (speller configuration, not regex)

Starting values for weighted Damerau-Levenshtein (1.0 = normal edit). **These are design hypotheses** drawn from the transfer evidence above. Tune them from the user's logged corrections.

| Profile | Edit | Cost | Why / example |
|---|---|---|---|
| all | adjacent-key substitution (QWERTY) | 0.6 | typing slips (*teh*, *wjat*) |
| all | transposition | 0.5 | *recieve*, *freind* |
| all | double ↔ single letter | 0.4 | *accomodate*, *untill*, *verry* |
| AR | b ↔ p | 0.3 | *blease, beoble, habby* |
| AR | f ↔ v | 0.4 | *fery, haf* |
| AR | e ↔ i, o ↔ u | 0.4 | *studint, bet/bit* |
| AR | vowel insertion/deletion | 0.5 | *hve, rong, wnted* (Ryan & Meara "vowel blindness") |
| NL | s ↔ z, f ↔ v at word end | 0.4 | final devoicing: *advise/advice, lose/loose* |
| NL | c ↔ k, qu ↔ kw | 0.5 | Dutch k-spelling (*kwaliteit, kopie*) |
| NL | missing letter in a Dutch-cognate spelling | 0.4 | *succes, adres, intresting* |
| NL | space insertion (split) | 0.3 | *eachother → each other*, *footballteam → football team* |

### 4.5 Rules deliberately NOT included (too risky without a parser)

- General subject-verb agreement beyond pronouns ("The list of items are..."). Leave it to LanguageTool.
- Comma splices in general (", I went ..."). Only the *and*-chain hint is included.
- *its time to* everywhere (LanguageTool's own counter-example: "The government has taken its time to decide").
- *your right* (valid in "your right hand", "your right to vote"). Only *your right.* at the end of a clause is flagged.
- *people is* in the middle of a sentence ("a crowd of 100 people is large", "meeting young people is hard" are valid). Only sentence-initial *People is* is flagged.
- *possibility to* (see 1.2).

---

## 5. Validation that was run

1. **Unit tests** (`node test.mjs`): each rule must fire on its `wrong` example and must not fire on its `right` example or on 1–6 tricky `ok` sentences (for example *"Your right hand is cold"*, *"The plane went off course"*, *"I suggested that he work with Mary"*, *"Loving you makes me happy"*, *"She is married with two children"*). On top of that: 28 a/an cases plus 14 a/an no-fire sentences, and **every rule over all 55 dictation sentences (zero hits)**. Result: **443 assertions, 0 failures.**
2. **False-positive benchmark** (`node extract-lt-examples.mjs && node fpbench.mjs`): 12,685 example sentences that LanguageTool's English `grammar.xml` marks as *not triggering* their rule. All 95 rules + a/an were run over them, with URLs masked.
   - First run: about **950 rule hits**. Each cluster was inspected and the rules were fixed (abbreviations before sentence starts, maths "i", gerund subjects, phrasal verbs like *weigh in Wednesday*, *I too have*, *if ... more then I...*, *married with a three-year-old daughter*, quoted questions like *"Am I late?" she asked*, ...).
   - Final run: **355 rule hits on 12,685 sentences (at most 2.8% of sentences)**. Most of the remaining hits are **true errors** in the benchmark: those sentences are only "correct" for one particular LanguageTool rule, and they contain things like *alot*, *Their is a...*, *informations*, *ask for advise*, *5 CD's*, *a lot of auto's*, *Do i need...*. The rest are sentence fragments that start in lowercase (EN_SENT_START_CAP: 165) and maths/code. The rule-quality signal: every rule except EN_SENT_START_CAP, EN_WORD_REPEAT, EN_A_AN, EN_I_LOWER and the punctuation rules has **≤ 6 hits**, and those were mostly real errors on inspection.
   - Caveat: this measures false positives on mostly native, edited English. It is **not** a recall measurement. A small hand-labelled corpus of the user's own writing (50–100 sentences) would be the best next step.

---

## 6. Commonly misspelled words (177 entries)

Sources: Oxford/Lexico corpus lists, Wikipedia's "Commonly misspelled English words", Cambridge learner-corpus findings (global learners and Dutch learners), cross-checked against the codespell dictionary. Format: **correct** (typical wrong forms). Legend: `*` = wrong form not in codespell (plausible, unverified); `!` = the wrong form is itself a real word, so don't auto-flag it (see 1.4); `^NL` = in Cambridge's top-10 misspellings for Dutch learners; `^NL?` = attributed to Dutch learners by one source only (unverified); `^G` = in Cambridge's top-5 misspellings for learners worldwide. Machine-readable version: `english-rules-prototype/misspellings.json`.

- **A:** **absence** (absense, abscence) · **acceptable** (acceptible) · **accidentally** (accidentaly, accidently) · **accommodate** (accomodate, acommodate) · **accommodation** (accomodation) ^NL? ^G · **achieve** (acheive) · **acknowledge** (acknowlege) · **acquaintance** (acquaintence) · **acquire** (aquire, adquire) · **across** (accross) · **actually** (actualy) · **address** (adress) · **advertisement** (advertisment) ^G · **aggressive** (agressive) · **almost** (allmost) · **already** (allready) · **amateur** (amatuer) · **apparent** (apparant, apparrent) · **appearance** (appearence) · **argument** (arguement) · **assassination** (assasination)
- **B:** **basically** (basicly, basicaly) · **beautiful** (beatiful, beautifull) ^G · **because** (becouse, becuase, beacuse) ^NL ^G · **beginning** (begining) · **believe** (beleive, belive) · **bicycle** (bycicle, bicicle*) ^NL? · **business** (buisness, bussiness)
- **C:** **calendar** (calender!) · **category** (catagory) · **cemetery** (cemetary) · **changeable** (changable) · **children** (childs, childeren) ^NL · **colleague** (collegue) · **column** (colum) · **coming** (comming) · **committee** (commitee, comittee) · **completely** (completly) · **conscience** (concience*) · **conscious** (concious) · **convenient** (convinient) · **copyright** (copywrite!) · **curiosity** (curiousity)
- **D:** **definitely** (definately, definitly, definatly) · **desperate** (desparate) · **develop** (develope) · **difference** (diffrence) · **dilemma** (dilemna*) · **disappear** (dissapear) · **disappoint** (dissapoint) · **discipline** (disipline*) · **dumbbell** (dumbell)
- **E:** **embarrass** (embarass) · **embarrassing** (embarassing) ^NL · **environment** (enviroment, enviorment) · **especially** (especialy) · **exaggerate** (exagerate) · **excellent** (excelent) · **exercise** (excercise, exercice) · **existence** (existance) · **experience** (experiance)
- **F:** **familiar** (familar) · **family** (familly) ^NL? · **fascinating** (facinating) · **February** (Febuary) · **finally** (finaly) · **fluorescent** (florescent!) · **foreign** (foriegn) · **forty** (fourty) · **forward** (foward) · **friend** (freind) · **fulfil** (fullfil) · **future** (futur*) ^NL?
- **G:** **government** (goverment) · **grammar** (grammer) · **grateful** (greatful) · **guarantee** (guarentee) · **guard** (gaurd)
- **H:** **happened** (happend) · **harass** (harrass) · **height** (heigth, heighth*) · **hierarchy** (heirarchy) · **holiday** (holliday) · **humorous** (humourous*) · **hygiene** (hygene)
- **I:** **ignorance** (ignorence) · **immediately** (immediatly, imediately) · **independent** (independant) · **intelligence** (inteligence) · **interested** (intrested, interessted) ^NL · **interesting** (intresting, interessting) · **interrupt** (interupt) · **irrelevant** (irrelevent) · **island** (iland)
- **K:** **knowledge** (knowlege)
- **L:** **language** (langauge, languge) · **library** (libary) · **license** (lisence*) · **lightning** (lightening!)
- **M:** **maintenance** (maintainance, maintenence) · **marriage** (marrige*) · **medieval** (mideval) · **millennium** (millenium) · **miniature** (miniture) · **mischievous** (mischievious) · **misspell** (mispell)
- **N:** **necessary** (neccessary, necessery, neccesary) · **neighbour** (neigbour, nieghbour) · **noticeable** (noticable)
- **O:** **occasion** (occassion, ocasion) · **occasionally** (occasionaly, occassionally) · **occurred** (occured) · **occurrence** (occurence, occurrance) · **official** (offical) · **opportunity** (oppurtunity, oportunity)
- **P:** **parallel** (paralel, parrallel) · **parliament** (parliment) · **pastime** (pasttime) · **people** (peaple, poeple) · **perseverance** (perseverence) · **persistent** (persistant) · **pharaoh** (pharoah) · **piece** (peice) · **pollution** (polution) ^NL · **possession** (posession) · **preferred** (prefered) · **privilege** (priviledge, privelege) · **probably** (probaly, propably) · **professor** (proffesor) · **pronunciation** (pronounciation) · **publicly** (publically)
- **Q:** **questionnaire** (questionaire)
- **R:** **really** (realy) · **receipt** (reciept) · **receive** (recieve) · **recommend** (reccomend, recomend) · **referred** (refered) · **relevant** (relevent, revelant) · **religious** (religous) · **remember** (remeber) · **repetition** (repitition) · **restaurant** (restaraunt, resturant) · **rhythm** (rythm)
- **S:** **schedule** (schedual) · **secretary** (secratary) · **seize** (sieze) · **sense** (sence) · **separate** (seperate) · **sergeant** (sargent*) · **similar** (similiar) · **sincerely** (sincerly) · **speech** (speach) · **strength** (strenght) · **success** (succes, sucess) ^NL · **successful** (succesful, sucessful, successfull) ^NL · **supersede** (supercede) · **surprise** (suprise)
- **T:** **tendency** (tendancy) · **therefore** (therefor!) · **threshold** (threshhold) · **tomorrow** (tommorow, tommorrow) · **tongue** (tounge) · **truly** (truely) · **twelfth** (twelth) · **tyranny** (tyrany)
- **U:** **until** (untill) ^NL · **unusual** (unusal)
- **V:** **vacuum** (vaccuum, vacume) · **vegetable** (vegatable, vegtable) · **vehicle** (vehical) · **very** (verry) ^NL
- **W:** **weather** (wheather, waether*) · **Wednesday** (Wensday, Wedensday) · **weird** (wierd) · **which** (wich, whitch) ^NL ^G · **writing** (writting) · **written** (writen)

---

## 7. Dictation sentences (55, all verified to pass every rule)

Design: short (8–16 words), natural, one or two traps each, variety-neutral spelling (only d23 is British: *at the weekend*; for en-US play *on the weekend*). Machine-readable version: `english-rules-prototype/dictation.mjs`.

| ID | Sentence (target text) | Traps practised | Most relevant for |
|---|---|---|---|
| d01 | It's raining, so the dog is hiding in its little house. | its/it's | everyone |
| d02 | You're going to love your new bike. | your/you're | everyone |
| d03 | They're sure their bags are over there by the door. | their/there/they're | everyone |
| d04 | My sister is taller than me, but then again, she is older. | than/then | Dutch L1 |
| d05 | I should have called you before I left. | should have | everyone |
| d06 | My jeans are loose now, so I hope I do not lose them on the bus. | lose/loose | Dutch L1 |
| d07 | The cold weather did not affect the result, but the new rule had a big effect. | affect/effect | everyone |
| d08 | It took an hour to walk to a university near an old castle. | a/an by sound | everyone |
| d09 | Whose phone is ringing, and who's going to answer it? | whose/who's | everyone |
| d10 | It is too late to buy two tickets for the concert. | to/too/two | everyone |
| d11 | Everyone accepted the invitation except Tom. | accept/except | everyone |
| d12 | My teacher gave me good advice, and I advise you to listen to her too. | advice/advise | everyone |
| d13 | I think I left my glasses at home, but I'm not sure. | I (capital) | everyone |
| d14 | I definitely need a lot of time to separate the old receipts. | a lot, definitely, separate, receipt | everyone |
| d15 | The hotel can accommodate twelve guests, so a separate room is not necessary. | accommodate, separate, necessary | everyone |
| d16 | I have lived in Utrecht since 2015. | since + present perfect | Dutch L1 |
| d17 | We have known each other for ten years. | for + period (not since) | Dutch L1 |
| d18 | Can you lend me your pen? I will give it back after class. | lend/borrow | Dutch L1 |
| d19 | May I borrow your charger for a moment? | borrow | Dutch L1 |
| d20 | My grandmother taught me how to bake bread. | teach/learn | Dutch L1 |
| d21 | We took a lot of photos on the beach last weekend. | take a photo, photos (no apostrophe), a lot | Dutch L1 |
| d22 | Have you done your homework, or are you still making mistakes? | do homework, make mistakes | Dutch L1 |
| d23 | What are you doing at the weekend? | at the weekend (UK) | Dutch L1 |
| d24 | Could you give me some information about the trains to Amsterdam? | information (uncountable) | everyone |
| d25 | I agree with you, but my brother doesn't agree with either of us. | I agree, doesn't | everyone |
| d26 | He goes to the gym every Monday and Thursday in January. | he goes, capital days/months | Dutch L1 |
| d27 | My parents speak Dutch and Arabic, and I am learning English. | capital languages | Arabic L1 |
| d28 | This book is much better than the film. | better (not more better), than | everyone |
| d29 | Most people in my class live near the station. | most people, live | everyone |
| d30 | I want to enjoy my whole life and live by the sea. | life/live | Dutch L1 |
| d31 | We might possibly move next year, and eventually we want to buy a house. | possibly vs eventually | Dutch L1 |
| d32 | The current situation is difficult, but the actual problem is money. | current vs actual | Dutch L1 |
| d33 | When do you usually go home after work? | do-support questions | Dutch L1 |
| d34 | I don't like cold coffee, and he doesn't either. | do-support negatives | Dutch L1 |
| d35 | Please park the car near the big blue building. | p/b | Arabic L1 |
| d36 | Peter put the paper bag on the back seat of the bus. | p/b | Arabic L1 |
| d37 | My brother is a teacher, and my sister is an engineer. | articles, copula | Arabic L1 |
| d38 | Life is short, so money is not the most important thing. | no "the" for general ideas | Arabic L1 |
| d39 | She is very tired because she is very busy. | copula (is) | Arabic L1 |
| d40 | Please fill the bin with paper and feel free to sit on the seat. | i/ee vowels, p/b | Arabic L1 |
| d41 | When can I call you, and why are you late? | question word order | Arabic L1 |
| d42 | I went to the market. I bought some fruit, and then I walked home. | short sentences (no run-on) | Arabic L1 |
| d43 | Wait, what is that? Hello, my name is Sara. | punctuation spacing | everyone |
| d44 | We discussed the plan and explained it to our manager. | discuss (no about), explain to | everyone |
| d45 | She has been married to Omar for five years. | married to, for | Dutch L1 |
| d46 | Their colleagues were surprised by the beautiful weather on Wednesday. | colleague, surprised, beautiful, weather, Wednesday | everyone |
| d47 | There are five of us, so we need a bigger table. | there are five of us | Dutch L1 |
| d48 | In my opinion, the second option is better than the first. | in my opinion, than | Dutch L1 |
| d49 | Whether we go or not depends on the weather. | depend on, weather/whether | everyone |
| d50 | Which restaurant would you recommend for a business dinner? | which, recommend, restaurant, business | everyone |
| d51 | The babies were asleep, so we turned off the radios and put away the photos. | plurals without apostrophe | Dutch L1 |
| d52 | The woman who lives next door is a nurse. | who (not which) for people | Dutch L1 |
| d53 | I will definitely wait until tomorrow before I decide. | until, tomorrow, definitely | everyone |
| d54 | She is interested in business, and her first shop was a big success. | successful, success, interested | Dutch L1 |
| d55 | It was embarrassing because the mistake occurred twice. | occurred, embarrassing, because | everyone |

Dictation implementation notes:
- **TTS:** Web Speech API `speechSynthesis` with an `en-GB` (or `en-US`) voice. Rate ~0.9, a "slow" button at ~0.7, and a replay button. Voices load asynchronously (`voiceschanged`), and the available voices differ per OS and browser. Always have a fallback.
- **Grading:** run the character diff against the target. Then also run the rule engine **on the user's attempt**, so that a wrong *then* in d04 gets the *then/than* explanation, not just "wrong letters". Normalise ’ to ' and collapse double spaces before diffing. Make case and punctuation strictness a setting (strict by default, since capitals and apostrophes are part of what this user is practising).
- **Minimal-pair dictation** for the sound-based traps: then/than, lose/loose, life/live, price/prize, advice/advise (NL); park/bark, pill/bill, pen/pin, ship/sheep, fill/feel, bet/bit (AR). The user hears one member of the pair in a sentence frame and has to type the right one.

## 8. Exercise ideas tied to these rules (for the product spec)

- **"Fix the sentence" cards** built automatically from each rule's `wrong`/`right` pair (95 cards for free). Each card shows the friendly message after an attempt. Schedule them with spaced repetition by `ruleId` and weight them by the user's own error log.
- **"Spot the Dunglish"**: show three sentences, one of which has a Dutch-transfer error (since 2015 / borrow me / make a photo / photo's). Tap the wrong one, then type the fix.
- **Capital-letter sprint** (AR and NL): short text with days, months, languages, *I* and sentence starts. Score on capitals only.
- **Article race** (AR): a gap-fill with *a / an / the / –*, including sound-based a/an (an hour, a university, an MBA).
- **Free writing prompts** that pull in the trap structures: "Since when have you lived where you live now?" (since + present perfect), "What did you do last weekend?" (past simple + *at the weekend*), "Compare two cities" (than), "Describe a photo you took" (take a photo, photos). Use these as writing prompts and the rule engine catches the classic slips.

## 9. Uncertainties & open questions

- Cambridge's Dutch-learner top-10 misspellings and the *live/life* and *to/too* findings come from the Cambridge ELT "Dutch" learner-error sheet as quoted by search results. The PDF itself couldn't be fetched (network egress blocked). Four extra words (accommodation, bicycle, family, future) were attributed to Dutch learners by one search summary only, and are marked "unverified".
- How often *become ↔ get* and *possibility to* actually occur for Dutch writers is not backed by a corpus here.
- The L1 edit costs (4.4) are hypotheses. Calibrate them from logs.
- The FP benchmark text is mostly native English. Expect a different (probably lower) FP rate on this user's text, and a recall that still needs measuring.
- LanguageTool's free API limits and terms change. Re-check `dev.languagetool.org/public-http-api` before launch.
- Licences: LanguageTool data (LGPL-2.1) was used as a reference. The rules here are re-implementations, not copies of the XML. The codespell dictionary is CC BY-SA 3.0: if we ship words from it, credit it, and the share-alike clause applies to that data file. VarCon is permissive (keep its notice).

---

## 10. Sources

**Rule engines & data**
- LanguageTool English rules (`grammar.xml`): https://github.com/languagetool-org/languagetool/blob/master/languagetool-language-modules/en/src/main/resources/org/languagetool/rules/en/grammar.xml
- LanguageTool a/an exception lists `det_a.txt` / `det_an.txt`: https://github.com/languagetool-org/languagetool/tree/master/languagetool-language-modules/en/src/main/resources/org/languagetool/rules/en
- LanguageTool German-L1 English rules (`grammar-l2-de.xml`: THAN_AS, WH_VERB_SUBJECT): same folder as above
- LanguageTool false friends (`false-friends.xml`, includes actual/actueel, map/folder, mening/meaning): https://github.com/languagetool-org/languagetool/blob/master/languagetool-core/src/main/resources/org/languagetool/rules/false-friends.xml
- LanguageTool `EnglishWordRepeatRule.java` (doubled-word exceptions): https://github.com/languagetool-org/languagetool/blob/master/languagetool-language-modules/en/src/main/java/org/languagetool/rules/en/EnglishWordRepeatRule.java
- LanguageTool server `TextChecker.java` (API parameters such as motherTongue, level, disabledRules): https://github.com/languagetool-org/languagetool/blob/master/languagetool-server/src/main/java/org/languagetool/server/TextChecker.java
- LanguageTool public HTTP API & limits: https://dev.languagetool.org/public-http-api
- LanguageTool rule page EN_A_VS_AN: https://community.languagetool.org/rule/show/EN_A_VS_AN?lang=en
- LanguageTool on -ise/-ize: https://languagetool.org/insights/post/ise-ize
- codespell dictionary (from Wikipedia's lists of common misspellings; CC BY-SA 3.0): https://github.com/codespell-project/codespell
- Wikipedia, Lists of common misspellings (for machines): https://en.wikipedia.org/wiki/Wikipedia:Lists_of_common_misspellings/For_machines
- Wikipedia, Commonly misspelled English words: https://en.wikipedia.org/wiki/Commonly_misspelled_English_words
- VarCon (US/UK/CA/AU variant data, SCOWL): https://github.com/en-wl/wordlist/tree/master/varcon (http://wordlist.aspell.net/)
- American-British-English-Translator lists (MIT): https://github.com/hyperreality/American-British-English-Translator

**Native-speaker error lists & usage**
- Grammarly, 30 grammar mistakes: https://www.grammarly.com/blog/30-grammar-mistakes-writers-should-avoid/
- Grammarly, a vs an: https://www.grammarly.com/blog/grammar/indefinite-articles-a-and-an/
- Paul Brians, Common Errors in English Usage: https://brians.wsu.edu/common-errors ; borrow/lend: https://brians.wsu.edu/?p=542
- Oxford Dictionaries / Lexico common misspellings (via Mental Floss summary): https://www.mentalfloss.com/article/629813/100-commonly-misspelled-words-english
- Oxford common misspellings word lists (Spellzone): https://www.spellzone.com/word_lists/list-4326.htm
- Purdue OWL, run-on sentences: https://owl.purdue.edu/owl/general_writing/punctuation/independent_and_dependent_clauses/runonsentences.html
- Grammar-Quizzes, most vs most of the: https://www.grammar-quizzes.com/article4d.html
- Learner's Dictionary, at/on the weekend: https://learnersdictionary.com/qa/Over-the-weekend-on-the-weekend-at-the-weekend ; Oxford Learner's "weekend": https://www.oxfordlearnersdictionaries.com/definition/english/weekend
- Licence/license, practice/practise: https://proofed.co.uk/writing-tips/word-choice-licence-vs-license/ ; https://www.future-perfect.co.uk/grammar-tip/is-it-practise-or-practice/
- Oxford spelling (-ize) discussion: https://www.cambridgenetwork.co.uk/news/what-did-oxford-do-deserve
- italki, a university / an university: https://www.italki.com/en/blog/a-university-or-an-university
- Jakub Marian, make vs take a photo: https://jakubmarian.com/make-a-photo-vs-take-a-photo-in-english/

**Dutch speakers (Dunglish)**
- Wikipedia, Dunglish: https://en.wikipedia.org/wiki/Dunglish
- Cambridge ELT, common learner errors by L1 (blog) + Dutch sheet: https://www.cambridge.org/elt/blog/2020/03/02/understanding-common-learner-error-cambridge-learner-corpus/ ; https://www.cambridge.org/elt/blog/wp-content/uploads/2020/03/Dutch-1.pdf
- Cambridge Network, most misspelled words by learners globally: https://www.cambridgenetwork.co.uk/news/research-highlights-most-misspelled-words-globally-people-learning-english
- Joy Burrough-Boenisch, *Righting English that's Gone Dutch* (review + extract): https://www.ciep.uk/resources/book-reviews/literary-criticism-and-books-on-language/righting-english-thats-gone-dutch ; https://download.boekhuis.nl/9789076542652_fragm-docb.pdf
- English and the Dutch (Substack), apostrophe plurals, lose/loose: https://englishandthedutch.substack.com/p/too-bad-so-sad-english-teachers-are
- Gymglish, 10 grammar mistakes Dutch speakers make: https://blog.gymglish.com/2021/12/10/10-grammar-mistakes-english-dutch-speakers-make
- Language Partners, Dutchisms: https://languagepartners.nl/en/blog/english/dutchisms/
- hlrnet, common errors for Dutch/French speakers: https://hlrnet.com/sites/vt/?p=615
- IamExpat, Dutch–English false friends: https://www.iamexpat.nl/education/education-news/learning-dutch-watch-out-these-10-false-friends
- IamExpat, "learn you": https://www.iamexpat.nl/education/education-news/how-dutch-people-can-learn-you-how-speak-better-dutch
- Fulbright Belgium, 23 Dutch–English false friends: https://www.fulbright.be/?p=15281
- elon.io: present perfect for ongoing duration https://elon.io/grammar/dutch/common-mistakes/present-perfect-duration ; do-support https://elon.io/grammar/dutch/common-mistakes/do-support ; false friends https://elon.io/grammar/dutch/common-mistakes/false-friends ; plural 's https://elon.io/grammar/dutch/nouns/plurals-apostrophe-s ; capitalisation https://elon.io/grammar/dutch/spelling/capitalization-and-ij
- Inburgering.org, Dutch capitals: https://inburgering.org/grammar/capitals
- Onze Taal, groter als / groter dan: https://onzetaal.nl/schatkamer/lezen/weblog/het-nepnieuws-rond-de-e-ans
- University of Twente English Style Guide: https://www.utwente.nl/en/language-centre/translation-editing-services/english-styleguide/

**Arabic speakers**
- LLEXI, common English errors by Arabic speakers: https://llexi.com/l1-errors/common-english-errors-arabic-speakers/
- Wimbledon School of English, common mistakes by Arabic speakers: https://www.wimbledon-school.ac.uk/blog/common-english-language-mistakes-made-by-arabic-speakers/
- Alshayban, Copula omission by EFL Arab learners (Colorado State University): https://mountainscholar.org/items/e8695078-a867-43e2-a142-b13667963cc8
- Article errors in the English writing of advanced L1 Arabic learners (Asian EFL Journal): https://asian-efl-journal.com/monthly-editions-new/article-errors-in-the-english-writing-of-advanced-l1-arabic-learners-the-role-of-transfer/index.htm
- Ryan & Meara, vowel blindness in Arabic learners: https://www.lognostics.co.uk/vlibrary/arpm96.pdf ; "The case of the invisible vowels": https://nflrc.hawaii.edu/rfl/item/495
- Literature review: spelling errors in English consonants and vowels by Arabic speakers: https://so05.tci-thaijo.org/index.php/reflections/article/view/282999
- Curry & Clark, Spelling errors in the Preliminary English B1 exam (MENA, Cambridge Learner Corpus): https://link.springer.com/chapter/10.1007/978-3-030-53254-3_15
- Writing English in Arabic (Yale Globalist), run-on comma chains: https://globalist.yale.edu/onlinecontent/blogs/writing-english-in-arabic
- Sentence-structure intervention with Arab undergraduates (comma splices / run-ons): https://ejournal.lucp.net/index.php/ijeissah/article/download/5540/4525/39408
- Mediating punctuation in English–Arabic translation: https://journal.equinoxpub.com/JALPP/article/view/13241
- Punctuation in Arabic as compared with English: https://journals.iiu.edu.pk/index.php/aldirasatalislamiyyah/article/view/749
- Swan & Smith (eds.), *Learner English* (CUP, 2nd ed. 2001), chapters on Dutch and Arabic speakers: https://www.cambridge.org/core/books/abs/learner-english/dutch-speakers/5F2630D1553FB81AA1624647A2D6BABB

**Other**
- Generic learner error "I am agree": https://www.englishalex.com/post/top-50-english-learner-grammar-mistakes
- Unicode Arabic punctuation (U+060C ARABIC COMMA, U+061B ARABIC SEMICOLON, U+061F ARABIC QUESTION MARK): https://www.unicode.org/charts/PDF/U0600.pdf
