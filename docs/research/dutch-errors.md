# Dutch spelling & grammar errors: what people get wrong and how to catch it with rules

> Research for **Parrotype** (repo `parrotype`). The reader is the engineer building the Dutch rule engine (`src/lang/nl/…`) and the content author writing the practice sentences.
> Scope: the most common Dutch spelling and grammar mistakes, made by native writers and by learners (Dutch is most important for our user, who is probably an Arabic-speaking learner). For each one: how to detect it with **rules only** (regex/token patterns, small word lists, light morphology, no ML) while keeping false positives low.
> Every word list and dictee sentence below was checked by script against the **OpenTaal word list**, which received the Taalunie "Keurmerk Spelling" in 2017–2018. The noun genders were checked against an open de/het dataset, and I corrected that dataset by hand where it is wrong (see §6.1).

---

## 0. TL;DR for engineers

1. **Two kinds of error, two engines.**
   - *Non-word* errors (`eigelijk`, `ideeen`, `gefietsd`, `werdt`, `autos`). A dictionary lookup catches these. The OpenTaal word list has ~414k forms, 5.1 MB raw and 1.36 MB gzipped, and is BSD/CC-BY licensed. Add a correction map (OpenTaal `corrections.tsv`, 17k entries) and generated candidates: d↔t↔dt flips, restored diacritics, apostrophe fixes, tussen-n toggles.
   - *Real-word* errors (`hij vind`, `het is gebeurt`, `word je`/`wordt je`, `de huis`, `het meisje die`, `groter als`, `hun hebben`, `me boek`). Both forms are valid words, so **only context rules can catch them**. This is where the custom rule engine pays off, and it is also where most Dutch errors live: almost every d/t error produces a valid word.
2. **Precision before recall.** Each rule has a confidence tier: `high` (shown as an error and counted in the score), `medium` (warning, not counted), `low/style` (hint, only in a "strict/formal" setting). A false alarm on a correct sentence costs a learner more trust than a missed error.
3. **Antipatterns are half of every rule.** LanguageTool's Dutch rules (grammar.xml, about 3,000 rule elements, maintained by Ruud Baars/OpenTaal) show this clearly. For example, its `het + de-noun` rule needs about 20 antipatterns, because `het` is also a pronoun (*Ik vind het top*, *Toch blijft het theorie*).
4. **The highest-value rules for this user**, in order: d/t in the present tense (stem vs stem+t, including the *je*-inversion), participle vs present (*gebeurd/gebeurt*, *verbeterd/verbetert*), past tense with 't kofschip (*-te/-de*), de/het plus *die/dat* plus adjective *-e* (*een groot huis*), word order V2 and verb-final (an Arabic/English interference error), *hun hebben*, *groter als*, *me/mijn*, *jou/jouw*, capital letters, compounds written apart, then lexical lists.
5. **Typing-test mode needs no grammar engine:** the target is known. Use the *error classifier* in §8 to label each diff (d/t, trema, ei/ij, apostrophe, capital, split compound) and show the matching friendly explanation from the rules table.
6. **Use LanguageTool's public API only as an optional second opinion.** The free tier allows 20 requests/min/IP, 75 KB/min and 20 KB per request ([dev.languagetool.org](https://dev.languagetool.org/public-http-api)). Dedupe its matches against ours. Never block the UI on it.

---

## 1. Why these errors happen (and what that means for practice)

- **Homophone dominance.** *Word/wordt*, *vind/vindt*, *gebeurd/gebeurt* and *verbeterd/verbetert* sound identical. Sandra, Frisson & Daems (1999) showed that writers under time pressure tend to write the **more frequent** homophone: for "dt-dominant" verbs like *worden* they wrongly write *wordt* where *word* is needed, and vice versa. Errors increase when working memory is loaded, and the effect also shows up in spontaneous writing (Verhaert 2015). ([HSN bundel, Sandra](https://hsnbundels.taalunie.org/wp-content/uploads/2019/09/2017_XII_taal-en-letterkunde_3_Sandra.pdf), [Sandra/Frisson/Daems 1999 PDF](https://www.clips.uantwerpen.be/~walter/papers/2000/sfddg00.pdf), [Verhaert et al., Mental Lexicon](https://benjamins.com/catalog/ml.11.1.01ver))
  - **Practice implication:** drill the *less frequent* form in context (*word je…?*, *Het is gebeurd.*, *Ik word…*) at typing speed. Speed is exactly when the dominant form sneaks in. Mix in minimal pairs in the same sentence (*Word je opgehaald, of wordt je zus gebracht?*).
- **Spelling by sound fails** for ei/ij, au/ou, -ig/-ich, -lijk (pronounced /lək/), g/ch (*ligt/licht*), d/t at word end (final devoicing), and v/z → f/s in stems (*leven → leefde*).
- **Interference from English/Arabic:** no grammatical gender (de/het), no V2 word order (*Morgen ik ga…*), compounds written with spaces ("Engelse ziekte"), English participles (*geupdated*), apostrophe plurals (*computer's*), capitalized days/months/"Ik".

---

## 2. Engine design (rules, not ML)

### 2.1 Pipeline

```
text → normalise (NFC, curly→straight quotes, keep offsets)
     → sentence split  (. ? ! … ; newline; ignore "bijv." "d.w.z." "o.a." "enz." "mr." "dhr." "mevr.")
     → tokenise        (words incl. internal ' and -, e.g. z'n, 's, auto's, e-mail, zee-egel; numbers; punctuation)
     → clause split    (commas, ; :, and BEFORE subordinators/coordinators: en, maar, want, dus, of, omdat,
                        dat*, als, wanneer, terwijl, hoewel, zodat, voordat, nadat, totdat, sinds, die*, wat*, waar*)
                        (*only when not followed by a noun → avoids splitting determiner "dat huis")
     → lexicon tagging (cheap tags from word lists: PRON_SUBJ, AUX, FINITE, PARTICIPLE, D_STEM, HET_NOUN, DE_NOUN,
                        ADJ, PREP, SUBORD, ADV_FRONT, DAY, MONTH, LANG …)
     → rules           (each rule = pattern + antipatterns + confidence + bilingual message + tests)
     → dedupe/merge    (one issue per span; higher confidence wins; LanguageTool matches merged by span)
```

Skip zones: URLs, e-mail addresses, @handles, #tags, numbers with units, text in quotes or backticks, ALL-CAPS tokens, and tokens inside a sentence that a cheap stopword test says is English (e.g. ≥3 of: the, and, is, of, to, you, with). The user practises in three languages, so this matters.

### 2.2 Rule shape (TypeScript)

```ts
type Conf = 'high' | 'medium' | 'low';
interface Token { text: string; lower: string; start: number; end: number; tags: Set<string>; clause: number; i: number }
interface Issue { ruleId: string; start: number; end: number; suggestions: string[]; conf: Conf; msg: { nl: string; en: string } }
interface Rule {
  id: string;                       // 'NL-DT-04'
  category: 'dt' | 'participle' | 'pastTense' | 'article' | 'relative' | 'adjective' | 'pronoun'
          | 'comparison' | 'agreement' | 'wordOrder' | 'spelling' | 'compound' | 'capital' | 'style';
  conf: Conf;
  check(tokens: Token[], ctx: Ctx): Issue[];
  examples: { wrong: string; right: string }[];
  tests: { mustFlag: string[]; mustNotFlag: string[] };   // run in CI: every antipattern gets a mustNotFlag sentence
}
```

**CI contract:** each rule has ≥3 `mustNotFlag` sentences, and the 46 dictee sentences in §9 are all correct Dutch, so every rule must pass all of them with **zero** flags. That gives a cheap false-positive regression suite.

### 2.3 Data sources (licences OK for a static GitHub Pages app)

| Resource | What | Licence | Use |
|---|---|---|---|
| [OpenTaal wordlist](https://github.com/OpenTaal/opentaal-wordlist) `wordlist.txt` | 413,937 forms (4,395 multi-word, 55k capitalised); inflections included | BSD-3 or CC-BY-3.0 | Spellcheck `Set`, candidate validation (morphology "generate and check"), lazy-loaded in a Web Worker |
| OpenTaal `elements/corrections.tsv` | 17,196 misspelling→correction pairs (1,005 are d/t-final flips like `aangemelt→aangemeld`, 232 missing diacritics, 332 apostrophe cases) | same | Direct correction map |
| [`dictionary-nl`](https://www.npmjs.com/package/dictionary-nl) (npm, v2.0.0) | OpenTaal Hunspell aff/dic for `nspell` | BSD-3 or CC-BY-3.0 | Alternative to the flat list if affix-aware suggestions are wanted (heavier to load) |
| [centrefordigitalhumanities/dutch-plurals](https://github.com/centrefordigitalhumanities/dutch-plurals) `gender.tsv` | 24,484 nouns with article (17,740 de / 4,498 het / 701 de/het) partly from Wiktionary | BSD-3 | De/het lookup **beyond** the curated core list, at *medium* confidence only. It contains errors: it lists `suiker` as *het* (it is *de*) and `boek`/`dorp`/`dak` as *de/het* (they are *het*) |
| [LanguageTool nl rules](https://github.com/languagetool-org/languagetool/tree/master/languagetool-language-modules/nl/src/main/resources/org/languagetool/rules/nl) (`grammar.xml`, `replace.txt` 66k lines, `wrongWordInContext.txt`) | Battle-tested patterns + antipatterns | LGPL-2.1 | Read for **ideas/antipatterns**. Do not copy the XML wholesale into our MIT/BSD bundle (LGPL obligations) |
| [hermitdave/FrequencyWords](https://github.com/hermitdave/FrequencyWords) `nl_50k.txt` | OpenSubtitles 2018 frequencies | MIT code / CC-BY-SA-4.0 content | Sort lists, choose drill words, break ties between suggestions |

### 2.4 Light morphology: "generate, then validate against the word list"

Do not try to implement Dutch morphology perfectly. Generate candidates with simple rules, then **keep only candidates that exist in the OpenTaal list**. That makes the rules both short and safe.

```ts
const KOFSCHIP = /[tkfsp]$|ch$|x$/;        // 't kofschip (+x, and ch/sh for loans: lunchte, gecrasht)
const INSEP = /^(be|ge|ver|ont|her|er)/;    // inseparable prefixes → no extra ge-

// W = Set of OpenTaal word forms
function stem(inf: string): string {        // werken→werk, maken→maak, zetten→zet, leven→leef, reizen→reis
  if (/^(gaan|staan|slaan|zien|doen)$/.test(inf)) return inf.slice(0, -1);
  let s = inf.replace(/en$/, '');
  s = s.replace(/v$/, 'f').replace(/z$/, 's');                 // final devoicing in spelling
  if (/([^aeiouy])\1$/.test(s)) return s.slice(0, -1);         // zett→zet, pakk→pak
  const m = s.match(/([^aeiouy]|^)([aeou])([^aeiouy])$/);      // open syllable in the infinitive?
  if (!m) return s;                                            // werk, fiets, gebeur, huil …
  const v = m[2];
  const long = s.slice(0, s.length - 2) + v + v + m[3];        // lop→loop, maak, spel→speel
  const syllables = (s.match(/[aeiouyëïöüé]+/g) ?? []).length;
  if (v !== 'e' || syllables === 1) return long;               // a/o/u are never schwa; 1 syllable = stressed
  // 'e' in a longer stem: schwa (wandel, teken, verbeter, herinner) or stressed (negeer, studeer, reageer)?
  const ok = (c: string) => (c.endsWith('t') || W.has(c + 't')) && (W.has(c + 'de') || W.has(c + 'te'));
  if (ok(long) && !ok(s)) return long;                         // negeren→negeer, studeren→studeer
  return s;                                                    // default schwa: wandelen→wandel
}
// Validated on OpenTaal + nl_50k: ~1,600 frequent weak verbs, every remaining failure was a non-verb.
// Known gaps: -iëren verbs (kopiëren→kopieer: replace /ië(.)$/ by 'iee$1'), strong verbs (use §6.4 table).
// voiced/voiceless is decided on the INFINITIVE consonant: leven→leefde (v is voiced), reizen→reisde.
const isKof = (inf: string, st: string) => /chen$/.test(inf) || KOFSCHIP.test(inf.replace(/en$/, '').replace(/(.)\1$/, '$1'));
const pres3 = (st: string) => st.endsWith('t') ? st : st + 't';         // zet, praat; vind→vindt
const pastWeak = (inf: string, st: string) => st + (isKof(inf, st) ? 'te' : 'de');   // antwoordde, praatte
function participleCandidates(inf: string, st: string): string[] {
  const end = /[td]$/.test(st) ? '' : (isKof(inf, st) ? 't' : 'd');
  return ['ge' + st + end, st + end];      // pick the one that exists in the wordlist
}
```

I prototyped this in Python against OpenTaal and the frequency list. Three pitfalls showed up, and all three are solved by validating against the word list:
- **Schwa vs stressed e.** *wandelen → wandel* and *verbeteren → verbeter* (the e is a schwa), but *spelen → speel*, *negeren → negeer* and *studeren → studeer*. A regex can't tell these apart; checking which candidate's 3sg and past forms exist can.
- **False prefixes.** *verven* is not *ver+ven* (→ *geverfd*); likewise *beven*, *bellen*, *erven*, *geven*. So never decide on "no ge-" by regex alone. Generate both `ge+X` and `X` and keep the one in the list.
- **Strong/irregular verbs** (*lopen → liep/gelopen*, *vinden → vond/gevonden*) need the table in §6.4. It overrides the generator.

The voiced/voiceless decision is based on the **infinitive**, not the spelled stem: *leven → leef → leefde/geleefd*; *verhuizen → verhuis → verhuisde/verhuisd*; *krabben → krabde/gekrabd* (b is not in 't kofschip); *leggen → legde/gelegd*.

---

## 3. The error catalogue, topic by topic (rules and pitfalls)

### 3.1 d / t / dt in the present tense

**Rule** (Taaladvies/Onze Taal, summarised in [Onze Taal "Taalmaat d, t of dt"](https://onzetaal.nl/uploads/editor/Taalmaat_-_d%2C_t_of_dt.pdf)):

| Subject | Form | Examples |
|---|---|---|
| `ik` | stem | ik **word**, ik **vind**, ik **antwoord** |
| `jij/je` **before** the verb | stem + t | jij **wordt**, je **vindt** |
| `jij/je` **after** the verb (inversion) | stem (t drops) | **word** je?, **vind** jij? |
| `u` (before *or* after) | stem + t | u **wordt**, **wordt** u geholpen? |
| `hij/zij/het/men/er/die/dat/wie`, singular noun | stem + t | hij **vindt**, het **wordt**, wat **gebeurt** er |
| plural | infinitive | wij **worden** |

- Stems already ending in **t** take no extra t: *hij zet*, *jij praat*, *zit je?*
- **No dt in the past tense ever** (*hij werd*, *vond*, *hield*, *stond*, *reed*). `werdt`, `vondt`, `hieldt` and `stondt` are not in the OpenTaal list, so the spellchecker catches them. Archaic/Flemish *gij vondt* is the only exception: skip rules when `gij` is present.
- **Possessive "je" exception.** In *Wordt je broer ook opgehaald?*, `je` means *jouw*, the subject is *je broer* (3rd person), so **wordt** is correct. Detection: if the token after `je` is a noun (or adjective + noun), skip. LanguageTool's `WORDT_JE`/`VINDT_IK` rules use exactly this antipattern, plus *wordt je aangeboden* (`je` = indirect object "to you").
- **Irregular 2nd person.** *ben je/bent u*, *heb je/hebt u ~ heeft u*, *kun je/kunt u ~ kan u*, *wil je*, *zul je*. Errors: *Bent je*, *Hebt je*, *jij ben*, *jij heb*. Allowed variants (never flag): *jij kan/kunt*, *jij wil/wilt*, *jij zal/zult*, *u hebt/heeft*, *u kunt/kan*. *u is* is outdated; use *u bent* ([webwoordenboek summary of Onze Taal](https://webwoordenboek.nl/kenniscentrum/is-het-hebt-u-of-heeft-u)).
- **Never flag** *ik hou/houd*, *hou je*, *ik rij/rijd*, *ik snij*, *ik glij*. Dropping the d is allowed for *glijden, houden, rijden, snijden, uitscheiden* and their compounds ([summary](https://webwoordenboek.nl/kenniscentrum/hoe-schrijf-je-ik-hou-van-jou)). It never applies in the 3rd person: *hij houdt*, *hij rijdt*.
- **Proximity trap.** In long subjects (*De auto van mijn ouders wordt…*) learners agree with the nearest noun. Only flag agreement when the subject is a pronoun directly adjacent to the verb. Noun-phrase subjects are too risky without a parser.

### 3.2 Participle vs present: *gebeurd/gebeurt*, *verbeterd/verbetert*

Verbs with an inseparable prefix (be-, ge-, ver-, ont-, her-, er-) get no extra *ge-*. As a result the participle (ending in **d** after a non-kofschip stem) and the 3rd-person present (**t**) sound the same:

| Present (hij/zij/het …) | Participle (heeft/is/wordt … + __ ) |
|---|---|
| Wat **gebeurt** er? | Wat is er **gebeurd**? |
| Zij **verbetert** de tekst. | Zij heeft de tekst **verbeterd**. |
| Hij **betaalt** de rekening. | De rekening is **betaald**. |
| Dit **betekent** dat … | Wat heeft dit **betekend**? |
| Hij **belooft** het. | Hij heeft het **beloofd**. (v → f, but participle d) |
| Ze **verhuist** morgen. | Ze is **verhuisd**. (z → s, but participle d) |
| Hij **beantwoordt** de vraag. | Hij heeft de vraag **beantwoord**. (d-stem: dt vs d) |

**Detection (two directions):**
- *Participle wanted, -t written* (`NL-PART-01`): a token X ending in **t** is in the confusables map (X minus t plus d is a participle) **and** it is the last verb of its clause **and** an auxiliary `heb|hebt|heeft|hebben|had|hadden|ben|bent|is|zijn|was|waren|word|wordt|worden|werd|werden|geworden` appears earlier **in the same clause**, and that auxiliary is not the possessive *zijn* (i.e. not followed by a noun).
  - Antipattern: a subordinate clause without an auxiliary (*…dat het vaak gebeurt*). The clause split handles it.
- *Present wanted, -d written* (`NL-PART-02`): a subject pronoun (`hij|zij|ze|het|dit|dat|er|men|u|jij|je`) **directly** followed by X ending in **d**, where X is in the confusables map **and** there is no auxiliary anywhere in the same clause.
  - Antipatterns: *Is het gebeurd?* and *Heb je het verbeterd?* (auxiliary before the subject, in a question), and *…dat het gebeurd is* (participle + clause-final auxiliary).
  - Also *Wat/Wie/Hoe/Waar + X-d + er/hier/daar/…* (*Wat gebeurd er?* → *gebeurt*).

### 3.3 't kofschip: past tense -te/-de and participle -t/-d (weak verbs)

- If the **stem** (based on the infinitive consonant) ends in **t, k, f, s, ch, p** (+ **x** in loans: *faxte, mixte*; and *-ch/-sh*: *lunchte, gecrasht*), use **-te(n)** / **-t**. Otherwise use **-de(n)** / **-d** ([Onze Taal Taalmaat 't kofschip](https://Onzetaal.nl/uploads/editor/Taalmaat_-_t_kofschip.pdf), [en.wikipedia 't kofschip](https://en.wikipedia.org/wiki/%27t_kofschip)).
- **Traps:** *leven → leefde, geleefd* (not *leefte*); *verhuizen → verhuisde, verhuisd*; *reizen → reisde*; *geloven → geloofde*. A stem ending in d/t still adds a full ending: *antwoordde*, *praatte*, *wachtte* (**double letter!** *wachte* and *prate* are non-words); participle *geantwoord*, *gepraat* (no doubled letter at the end of a word).
- Most mistakes create non-words (*fietsde, geleeft, gefietsd, verhuiste, wachte* are all absent from OpenTaal). So the cheapest high-precision fix is: if a word is not in the dictionary, flip the final `d↔t`, `de↔te` or `dde↔de` and check again.

### 3.4 English loan verbs

Loan verbs are conjugated as Dutch weak verbs. Choose t/d on the **last letter of the bare stem** using "'t (e)x-kofschip". When adding the ending would distort the pronunciation, keep the English silent *-e* in the stem: *ik time, hij timet, getimed*; *ik race, geracet* ([Taaladvies.net: Engelse werkwoorden](https://taaladvies.net/vervoeging-en-spelling-van-engelse-werkwoorden-in-het-nederlands-algemeen/), [Onze Taal: Engelse werkwoorden](https://onzetaal.nl/taalloket/engelse-werkwoorden), [goedmettekst: geliked of geliket](https://www.goedmettekst.nl/geliked-geliket/)). English **-ed** is always wrong: *geïnterviewd*, not *geïnterviewed*; *gefinisht*, not *gefinished*.

All of the forms below are in the OpenTaal list (checked):

| Infinitive | hij … | past | participle | Common wrong |
|---|---|---|---|---|
| updaten | updatet | updatete | **geüpdatet** | geupdate, geüpdated, ge-update |
| downloaden | downloadt | downloadde | **gedownload** | gedownloadt, gedownloaded |
| uploaden | uploadt | uploadde | **geüpload** | geupload, geüploadt |
| deleten | deletet | deletete | **gedeletet** | gedeleted, gedelete |
| recyclen | recyclet | recyclede | **gerecycled** | gerecyclet, gerecycleerd (BE: *recycleren* → gerecycleerd is fine) |
| liken | (liket) | (likete) | **geliket** | geliked, gelikete |
| racen | racet | racete | **geracet** | geraced |
| timen | timet | timede | **getimed** | getimet |
| faxen | faxt | faxte | **gefaxt** | gefaxed |
| crashen | crasht | crashte | **gecrasht** | gecrashed |
| chatten | chat | chatte | **gechat** | gechatted |
| (e-)mailen | (e-)mailt | (e-)mailde | **gemaild / ge-e-maild** | gemailed, ge-emaild |
| googelen | googelt | googelde | **gegoogeld** | gegoogled |
| scoren | scoort | scoorde | **gescoord** | gescored |
| barbecueën | barbecuet | barbecuede | **gebarbecued** | gebarbecuet |
| plannen | plant | plande | **gepland** | geplanned |
| dealen | dealt | dealde | **gedeald** | gedealed |
| checken | checkt | checkte | **gecheckt** | gechecked |
| printen | print | printte | **geprint** | geprinted |
| coachen | coacht | coachte | **gecoacht** | gecoached |
| finishen | finisht | finishte | **gefinisht** | gefinished |
| interviewen | interviewt | interviewde | **geïnterviewd** | geïnterviewed |
| stylen | – | – | **gestyled** | gestyld |
| leasen | – | leasede | **geleased** | geleaset |

Note the exceptions (*geleased*, *gerecycled*, *gestyled*). They show that a rule alone is not enough here: **use a lookup table for loan verbs**, not the generator.

### 3.5 de / het, die / dat, and adjective -e

- **Never-fail rules:** diminutives are **het** (*het huisje*); plurals are **de**; infinitives used as nouns are **het** (*het eten*); words for people are mostly **de** (except *het kind, het meisje*, all diminutives); compounds take the gender of the **last** part (*het ziekenhuis*, *de huisdeur*).
- **Suffix heuristics** (computed from the 24k-noun dataset, lowercase entries only; % = share of *het*):

| Suffix | n | het % | Use as rule? | Main exceptions |
|---|---|---|---|---|
| -je (incl. -tje/-pje/-kje/-etje) | 458 | 98% | **yes → het** | (a few false matches like *kastanje*, *plunje*) |
| -isme | 184 | 98% | yes → het | |
| -sel | 103 | 90% | weak | *mossel, wissel, kansel* |
| -ment | 85 | 88% | weak | *consument, ligament* |
| -um | 200 | 85% | weak | *datum* (de!), *compendium* is het |
| -heid | 703 | 0.4% | **yes → de** | *afscheid, bescheid, onderscheid* (not real -heid) |
| -ing | 1398 | 0.3% | **yes → de** | *beding, geding, messing* |
| -tie / -teit / -ica / -ade / -euse / -erij / -ist | ~1,180 | 0–0.2% | **yes → de** | |
| -nis | 46 | 7% | yes → de | *vonnis, tennis, vernis* are het |
| -schap | 40 | 68% het | **no** | *vriendschap, wetenschap, boodschap* (de) vs *landschap, lidmaatschap* (het) |
| -te / -de | 600 | 6–7% | de | *gebergte, gedeelte, einde, gemiddelde* are het |
| ge-/be-/ver-/ont- stem without suffix | – | 49–88% | **no** | *het gesprek* but *de geest, de verkoop, de ontvangst* |

  Use suffix rules only to **choose the explanation text** ("words ending in *-ing* are always *de*"). Do not use them to flag. Flag only nouns found in the curated lists (§6.1) or in `gender.tsv` with a single article, at medium confidence.
- **die/dat** as relative pronoun: *dat* after a singular het-noun, *die* after de-nouns and plurals (*het meisje **dat***, *het boek **dat***). One accepted exception: a **non-restrictive** clause with a het-noun that denotes a person may take *die*: *Het schoolhoofd, **die** nogal gesteld is op netheid, …* ([Taaladvies via vlaanderen.be summary](https://www.vlaanderen.be/team-taaladvies/taaladviezen/die-dat)). So skip when a comma precedes *die* and the noun is a person noun (*meisje, kind, hoofd, schoolhoofd, vriendinnetje …*).
  - *het boek **wat** ik lees* is spoken, mainly Netherlands, and rated lower in writing. Treat it as a style hint. After *alles, iets, niets, het enige* and superlatives, use **wat** (*alles wat*, *het enige wat*).
- **Adjective -e** ([Taaladvies: het grote huis / *het groot huis](https://www.vlaanderen.be/team-taaladvies/taaladviezen/het-grote-huis-het-groot-huis)): an adjective before a noun gets **-e**, *except* before a singular **het**-noun after *een, geen, elk, ieder, veel, welk, zo'n* or with no article: *een groot huis*, *het grote huis*, *de grote auto*, *een grote auto*. A classic learner error is ***een grote huis*** (and its mirror ***het groot huis***). Never inflected: adjectives ending in -en (*gouden, open, houten*), -a/-o/-é (*lila, retro, beige*), *rechter/linker* in compounds. With -ig/-isch/-lijk and long comparatives, dropping the -e is sometimes stylistic: give low confidence there.
- **deze/dit, onze/ons:** *dit huis / deze auto*, *ons huis / onze auto*. *deze + het-noun* and *onze + het-noun* (singular) are safe flags. The reverse (*ons + de-noun*, *dat + de-noun*) is not: *ons* is also an object pronoun (*Hij gaf ons koffie*) and *dat* a conjunction.

### 3.6 Pronouns: hun/hen/zij, me/mijn, jou/jouw, u/uw

- ***Hun hebben*** is a "serious and ugly" error for most readers: *hun* is never a subject. Write ***Zij/Ze hebben***. Object: direct object *hen* (formal) or *ze*; indirect object without a preposition *hun*. Only flag subject *hun* (*hun* + finite verb at clause start). The *hen/hun* object distinction is widely ignored in speech: do not flag it ([webwoordenboek: hun hebben](https://webwoordenboek.nl/kenniscentrum/is-het-hun-hebben-of-zij-hebben), [Taaladvies hen/hun via search summary](https://taaladvies.net/?p=49852)).
- ***me boek*** → ***mijn/m'n boek***. *me* is never possessive, in speech or in writing; the reduced form of *mijn* is *m'n* ([webwoordenboek: me of mijn](https://webwoordenboek.nl/kenniscentrum/is-het-me-of-mijn), [Taaladvies mij/mijn](https://www.vlaanderen.be/team-taaladvies/taaladviezen/mij-mijn)). Pitfall: *Hij gaf **me** boeken* (indirect object, correct!). So flag only at sentence start (*Me broer is ziek*) or after a preposition (*met me vriend*, *naar me moeder*), and only when the next token is a noun.
- ***jou/jouw***: *jouw* = possessive before a noun (*jouw boek*); *jou* = object (*voor jou*, *ik hou van jou*). *jouw* at the end of a clause or before a preposition is always wrong (*Dit is van jouw.* → *jou*). *jou + noun* is wrong after a preposition (*met jou fiets* → *jouw fiets*), but correct as an indirect object (*Ik geef jou boeken*).
- ***u/uw***: same pattern (*Bedankt voor **uw** bericht*; *Dit is voor **u**.*).
- *Als ik **jou** was* (not *jij*) is a fixed expression (LanguageTool `ALS_IK_JIJ_WAS`).

### 3.7 als / dan in comparisons

- **Inequality:** comparative or *anders/ander(e)* + **dan** (*groter dan*, *beter dan*, *anders dan*, *meer dan*). **Equality:** *zo/even … **als***, *net als*, *hetzelfde als*. *Groter als* is "no longer rejected by many" in speech, but *groter dan* is preferred, especially in writing ([webwoordenboek: dan of als](https://webwoordenboek.nl/kenniscentrum/is-het-dan-of-als), [Inburgering.org dan vs als](https://inburgering.org/grammar/dan-vs-als-comparison)).
- **The big false-positive trap:** *Het is beter **als** je komt*. Here *als* means "if" and is correct. Antipattern (from LanguageTool `GROTERE_ALS`): skip when *als* is followed by a subject pronoun (+ verb), and skip *eerder/later/vroeger als*.
- *groter dan **ik*** (subject form) is preferred to *dan mij*: style hint only.

### 3.8 Apostrophes

- Plural **-'s** only after a word ending in a single **a, i, o, u, y** (or e with a syllable break): *auto's, foto's, menu's, baby's, taxi's, opa's*. **No** apostrophe after an accented vowel or a silent -e (*cafés, garages*), and none after consonants or *-el, -em, -en, -er, -je* (*computers*, *films*, *meisjes*) ([Inburgering.org apostrophe](https://inburgering.org/nl/grammar/apostrophe), [vlaanderen.be meervouden](https://www.vlaanderen.be/team-taaladvies/spellingregels/zelfstandige-naamwoorden/zelfstandige-naamwoorden-2-spelling-van-meervouden)).
- Abbreviations and letters take *'s*: *cd's, tv's, pc's, a's*.
- **Genitive:** *Jans fiets* (no apostrophe), *Anna's fiets*, *Max' fiets* (apostrophe only after a long vowel or a sibilant). *McDonald's* is a brand: whitelist capitalised tokens that appear in a brand list.
- Time adverbs: ***'s avonds, 's ochtends, 's morgens, 's middags, 's nachts, 's zomers, 's winters, 's maandags***. Common wrong forms: *s'avonds, savonds, s avonds*. Sentence-initial: *'s Avonds* (capitalise the second word).
- Reduced forms: *z'n, m'n, d'r, 't, zo'n*. *zo'n* vs *zon* (sun): *zon* + adjective/noun (*zon mooie dag*) means *zo'n*.

### 3.9 Tussen-n (linking -e-/-en- in compounds)

Main rule since 2005: write **-en-** when the first part is a noun whose plural is **only -en**: *pannenkoek, boekenkast, hondenhok, kippensoep, paardenbloem, ruggengraat, zielenpiet, slangengif*. The 2005 revision removed the old animal/plant exception, which is why *paardenbloem* and *paddenstoel* now have -en- ([dbnl Onze Taal 2005](https://dbnl.org/tekst/_taa014200501_01/_taa014200501_01_0204.php), [Onze Taal schatkamer 1995](https://onzetaal.nl/schatkamer/lezen/taal-en-maatschappij/spelling-geschiedenis/1995-het-tweede-groene-boekje-ruzie-over-de-tussen-n)). Exceptions keep **-e-**, for example when the first part has no -en plural or also an -s plural (*aspergesoep, gedachtegang, roggebrood, rijstebrij*), and in fossilised or "unique-thing" words (*zonnebloem, zonneschijn, maneschijn, hellevuur, bruidegom, Koninginnedag*). All of these spellings were confirmed in the OpenTaal list; *zonnenbloem, pannekoek, gedachtengang, zielepiet* are absent.

**Engineering:** do not implement the rule. Use **dictionary toggling**: if a compound is not in the list, try inserting or removing `n` after a linking `e` and accept the variant that is in the list. This is high-precision because both directions are validated.

### 3.10 Compounds written apart ("Engelse ziekte")

Dutch writes compounds as **one word**: *ziekenhuis, kaassoufflé, accountmanager, managementteam, e-mailadres, telefoonnummer*. Writing them apart under English influence is called the "Engelse ziekte" ([Inburgering.org](https://inburgering.org/nl/grammar/english-loans-one-word-or-two), [Taaladvies: Engelse woorden aaneenschrijven](https://www.vlaanderen.be/team-taaladvies/spellingregels/engelse-woorden-aaneenschrijven/engelse-woorden-aaneenschrijven-2-samenkoppelingen)). A split can change the meaning: *rode wijnglazen* = red glasses, *rodewijnglazen* = red-wine glasses.

- High confidence: a curated list of frequent splits (§6.7).
- Medium (generated): two adjacent lowercase tokens A B, where A is a **noun** (in a noun list and not in an adjective/adverb/preposition/article list) and B is a noun, and `A+B` (or `A+s+B`, `A+en+B`, `A+'-'+B` when vowels clash) is in the dictionary, and the bigram is not an allowed phrase. Show it as a hint, not an error.
- Vowel clash at the join → **hyphen**, not a trema: *zee-egel, auto-ongeluk, na-apen* ([Inburgering.org trema](https://inburgering.org/nl/grammar/trema-dieresis)).

### 3.11 Capital letters

- Capitalised: first word of a sentence, names, **languages and peoples** (*Nederlands, Engels, Arabisch, een Nederlander*), adjectives from place names (*Nederlandse kaas, Amsterdamse grachten*), official holiday names (*Pasen, Kerstmis, Koningsdag*, *Pinksteren*).
- Lowercase: **days, months, seasons, parts of the day** (*maandag, januari, zomer*); informal holiday words and derivations (*kerst*, *kerstboom*); *ik*; *u* (a capital *U* is allowed only for reverence, and is rare) ([Inburgering.org capitals](https://inburgering.org/nl/grammar/capitals), [vlaanderen.be hoofdletters dagen](https://www.vlaanderen.be/team-taaladvies/spellingregels/hoofdletters/hoofdletters-09-namen-van-dagen-feestdagen-periodes-en-historische-gebeurtenissen), [talen](https://www.vlaanderen.be/team-taaladvies/spellingregels/hoofdletters/hoofdletters-06-namen-van-talen-en-dialecten)).
- Interference errors: *Maandag* mid-sentence, *Januari*, *Ik* mid-sentence (English), *nederlands*/*engels* lowercase.
- Name particles: *Jan de Vries* but *meneer De Vries* (no first name → capital *De*). Low priority.
- *'s Morgens* at sentence start: the first *letter word* is capitalised (*'s Morgens*, *'t Is*).

### 3.12 Trema (diaeresis)

The trema marks that the second vowel starts a new syllable (*ideeën, België, coördinatie, geïnteresseerd, reünie, naïef, knieën, zeeën, egoïst, beïnvloeden*). No trema where nothing can be misread (*financieel, officieel*: *financiëel* is a common over-correction). In compounds a **hyphen** replaces the trema (*zee-egel*). Engineering: build a `Map<stripDiacritics(word), word[]>` from the word list. Any unknown token whose stripped form hits the map gets the diacritic version as its suggestion (*ideeen→ideeën, Belgie→België, cafe→café, een→één* only when emphasised, so skip *een*, *uberhaupt→überhaupt*).

### 3.13 ei/ij, au/ou, -ig/-ich, -lijk, g/ch

- **ei/ij** and **au/ou** are the same sounds, and the spelling must simply be learned. Non-words are handled by the spellchecker. Real-word pairs need context lists (LanguageTool's `wrongWordInContext.txt` provides pairs with trigger words). For example, ***reist*** (travels) vs ***rijst*** (rice): triggers like *naar, trein, wereld* vs *kook, witte, paella*. Other pairs: *eis/ijs, steil/stijl, peil/pijl, reizen/rijzen, leiden/lijden, zei/zij, wei/wij, hei/hij, mei/mij, rauw/rouw, kou/kauw*.
  - Highest value: ***hij zij*** → ***hij zei*** (said), and ***zei*** used as a pronoun before a verb (*Zei is ziek* → *Zij*). *Zei hij?* is a correct question, so require the pronoun reading: *zei* + finite verb other than a pronoun.
  - ***leidt/lijdt***: *Zij lijdt aan …* (suffers) vs *Zij leidt het bedrijf* (leads). Trigger: *lijd* + *aan/onder/pijn/verlies*; *leid* + *naar/tot/bedrijf/team*.
- **-ig** is pronounced /əx/, so learners write ***-ich*** (*gelukkich, prachtich, nodich*). **-lijk** is pronounced /lək/, so they write *-luk/-lek/-lik* (*natuurluk, eigenlek*). Dictionary check + suffix swap → high precision. Whitelist real *-ich* words (*sandwich, Zürich*).
- **g/ch:** ***ligt*** (lies) vs ***licht*** (light): *Het boek licht op tafel* → *ligt* (subject + *licht* + place preposition).

### 3.14 Lexical confusions

- **kennen/kunnen** (dialect *ken* = *kan*): *Ik ken niet komen* → *kan*. Detection: *ken/kent* + (*niet/wel/goed/ook/nog*)? + infinitive at clause end, with no object noun/pronoun. Also ***weten/kennen*** for learners: *Ik weet hem niet* → *ken* (person object); *Ken je waar het is?* → *Weet je*.
- **liggen/leggen, zitten/zetten (and staan/zetten):** *liggen/zitten/staan* = position (no object); *leggen/zetten* = put something somewhere (needs an object) ([Inburgering.org liggen vs leggen](https://inburgering.org/nl/grammar/liggen-vs-leggen)). Detection: *ga(at)/gaan (even/lekker/nog)? leggen|zetten* at clause end with no object → *liggen/zitten*. Participle mix-ups: *Ik heb het boek op tafel gelegen* → *gelegd* (object + *gelegen* + *hebben*), medium.
- **heel/hele:** *een heel mooie auto* is standard (*heel* is an uninflected adverb); *een hele mooie auto* is very common and informal ([webwoordenboek: heel of hele](https://webwoordenboek.nl/kenniscentrum/is-het-heel-of-hele), [dbnl: Heel of hele](https://dbnl.org/tekst/_taa014198201_01/_taa014198201_01_0031.php)). Style hint only after *een*. *de hele mooie stad* can mean "the whole beautiful city", so never flag after *de/het*. **erg** as an intensifier (*erg leuk*) is standard: do not flag.
- **beide/beiden:** *beiden* = two persons, used independently (*Ze komen beiden*); *beide* before a noun or for things (*beide kinderen*, *Ik neem ze beide*) ([vlaanderen.be beide/beiden](https://www.vlaanderen.be/taaladvies/taaladviezen/beide-beiden)). Safe rule: *beiden + plural noun* → *beide*.
- **zich beseffen** → *beseffen* (not reflexive); *zich realiseren* is reflexive. LanguageTool `BESEF_ME` cites [Taaladvies 1394](https://taaladvies.net/taal/advies/vraag/1394/zich_beseffen_beseffen/).
- **het met iemand mee eens zijn** → *het met iemand eens zijn* (pleonasm).
- **wie z'n** (*Wie z'n fiets is dit?*) is informal and spoken; formal alternatives are *van wie* or *wiens* ([vlaanderen.be wiens/van wie/wie z'n](https://www.vlaanderen.be/team-taaladvies/taaladviezen/wiens-van-wie-waarvan-wie-zn)). Style hint.
- **hoe als:** I found no authoritative source treating "hoe als" as a standard error. I interpret it as the pleonastic comparison links *zoals hoe / als hoe* (*Ik doe het zoals hoe mijn moeder het deed* → *zoals mijn moeder het deed*) and dialectal *hoe als* (*Ik weet niet hoe als ik moet beginnen* → *hoe ik*). Implement as a low-confidence hint only. **Flagged as uncertain.**
- **vanaf / van … af / ervanaf:** *vanaf maandag*, *van het dak af*. *Er van af* (three words) is wrong; write *ervan af* or *er vanaf*, depending on structure ([vlaanderen.be ervanaf](https://www.vlaanderen.be/taaladvies/taaladviezen/ervanaf-ervan-af-er-vanaf-er-van-af)).
- **enigste** → ***enige*** in the meaning "only". *Enigst(e)* is correct only as the superlative of *enig* = "lovely" (*het enigste jurkje*), so the word is in the dictionary and needs a context rule ([vlaanderen.be enigste/enige](https://www.vlaanderen.be/taaladvies/enigste-enige)).
- **te allen tijde**, not *ten alle tijden* (*ten* = *te den*, impossible before *alle*) ([rendement.nl](https://www.rendement.nl/zakelijke-communicatie/nieuws/is-het-nou-ten-alle-tijden-of-te-allen-tijde.html)). **per se**, not *perse* (but *ter perse* is valid; *perse* is also a verb form, which is why it is in the dictionary). **op zich**, not *opzich*. **sowieso** (not *zowieso*). **überhaupt**. **eigenlijk**. **alleen** (*allen* = everybody, valid word!). **onwijs** is a valid informal intensifier (*onwijs leuk*): a register hint at most.
- **teveel / te veel:** *te veel* (two words) unless it is the noun *het teveel*.

### 3.15 Word order (high value for Arabic/English speakers)

- **V2:** in a main clause the finite verb is the 2nd constituent. *Morgen **ga ik***, not *Morgen ik ga*. Detection: sentence-initial adverb from a closed list + subject pronoun + finite verb, with **no comma** after the adverb → high confidence (*Natuurlijk, ik kom* with a comma is fine).
- **Verb-final in subordinate clauses:** *omdat ik moe **ben***, not *omdat ik ben moe*. Detection: subordinator + subject pronoun + finite verb + ≥1 token + clause end, where the clause does **not** end in a participle or infinitive. *omdat ik heb gewerkt* and *omdat ik ben gaan zwemmen* are grammatical (verb-cluster order varies), hence medium confidence.
- **Auxiliary choice:** *Ik **ben** gegaan/gekomen/gebleven/geworden/geweest/gestorven/geboren/overleden/verdwenen/begonnen/vertrokken*; and *Het **is** gebeurd*. *Ik heb gegaan* → *ben*. High confidence for the core list.
- **geen vs niet een:** *Ik heb geen auto*. *niet een* + noun → suggest *geen* (low/medium; emphatic *niet één* exists). **Double negation** *niet geen / nooit geen* → *geen* (medium).

---

## 4. Detection rules table (85 rules)

Legend: **H** = high (error, counted), **M** = medium (warning), **L** = low (style hint, strict mode only). `SUBJ3 = hij|zij|ze|het|men|u|er|dit|dat|wat|wie|iemand|niemand|iedereen`. `DSTEM` = verbs whose stem ends in d (§6.3). `CONF` = participle/present confusables (§6.5). `AUX = heb|hebt|heeft|hebben|had|hadden|ben|bent|is|zijn|was|waren|word|wordt|worden|werd|werden|geworden`. `PREP = in|op|aan|met|van|voor|naar|bij|uit|over|onder|door|tegen|zonder|tussen|achter|naast|tijdens|om|na|sinds`.

| ID | Pattern / logic | Wrong | Right | Uitleg (NL) | Explanation (EN) | Conf. / FP notes |
|---|---|---|---|---|---|---|
| NL-DT-01 | `ik` + token = DSTEM+`t` (or any verb stem+t from the lexicon) | Ik wordt boos. | Ik word boos. | Bij *ik* schrijf je alleen de stam: ik word, ik vind. Geen t erachter! | With *ik* you write just the stem: *ik word*. No t! | H. FP: none known; skip if `ik` is used as a noun (*het ik*) |
| NL-DT-02 | verb stem+t + `ik` (inversion) | Vindt ik dat leuk? | Vind ik dat leuk? | Ook als *ik* achter het werkwoord staat: alleen de stam. | Even when *ik* comes after the verb: stem only. | H |
| NL-DT-03 | `SUBJ3` directly + DSTEM without t, next token ≠ `ik\|je\|jij` | Hij vind het leuk. | Hij vindt het leuk. | Hij, zij, het: stam + t. Vind + t = vindt. | He/she/it: stem + t, so *vind* becomes *vindt*. | H for hij/zij/het/men/u; M for die/dat/wat (could be a fronted object: *Die word ik nooit*, so require next ≠ ik/je/jij) |
| NL-DT-04 | `jij` + DSTEM (no t); `je` at clause start + DSTEM | Jij word later dokter. | Jij wordt later dokter. | *Jij* vóór het werkwoord? Dan stam + t: jij wordt. | *Jij* before the verb means stem + t: *jij wordt*. | H (jij), M (je) |
| NL-DT-05 | DSTEM+`t` + `jij` | Wordt jij ook moe? | Word jij ook moe? | Staat *jij* achter het werkwoord? Dan valt de t weg: word jij? | When *jij* follows the verb, the t drops: *word jij?* | H |
| NL-DT-06 | stem+`t` + `je` + next token NOT noun/adj+noun, and (sentence start OR preceded by adverb/question word) | Wordt je morgen opgehaald? | Word je morgen opgehaald? | *Je* achter het werkwoord = geen t. Maar let op: *Wordt je broer opgehaald?* is goed (je = jouw). | *je* after the verb: no t. But *Wordt je broer…?* is right, because there *je* means "your". | M. Antipatterns: `je` + noun; `wordt je` + aangeboden/gegeven/toegestuurd (je = "to you"); noun-phrase subject before verb |
| NL-DT-07 | `word\|vind\|houd\|…` (DSTEM) + `u`, not preceded by `ik`; `u` + DSTEM | Word u al geholpen? | Wordt u al geholpen? | Bij *u* altijd een t, ook als *u* achter het werkwoord staat. | With *u* always add t, even after the verb. | H |
| NL-DT-08 | `Bent\|Hebt\|Kunt\|Zult\|Wilt` + `je\|jij` | Bent je klaar? | Ben je klaar? | Met *je/jij* erachter: ben je, heb je, kun je. | With *je/jij* after it: *ben je, heb je, kun je*. | H |
| NL-DT-09 | `jij\|je` (non-inverted) + `ben\|heb` | Jij ben te laat. | Jij bent te laat. | Jij bent, jij hebt. (Jij kan/kunt en jij wil/wilt mogen allebei.) | *jij bent, jij hebt* (*kan/kunt* and *wil/wilt* are both fine). | H. Never flag kan/kunt, wil/wilt, zal/zult |
| NL-DT-10 | non-word past with dt (`werdt\|vondt\|hieldt\|stondt\|reedt\|…`) unless `gij` in sentence | Hij werdt boos. | Hij werd boos. | In de verleden tijd schrijf je nooit dt. | Past tense never ends in *dt*. | H |
| NL-DT-11 | `hij\|zij\|het` + `hout\|rijt` (where `houdt/rijdt` intended) | Hij hout van voetbal. | Hij houdt van voetbal. | Ik hou mag, maar bij hij hoort houdt: stam houd + t. | *ik hou* is fine, but *hij* needs *houdt*. | M (*rijt* is a valid form of *rijten*) |
| NL-DT-12 | whitelist: `ik hou\|ik rij\|ik snij\|ik glij\|hou je\|rij je\|snij je\|glij je` | (never flag) ik hou van je | — | *Ik hou* en *ik houd* zijn allebei goed. | *ik hou* and *ik houd* are both correct. | Guard rule (prevents FPs) |
| NL-PART-01 | CONF token ending in t, clause-final, `AUX` earlier in clause (AUX not followed by noun) | Wat is er gebeurt? | Wat is er gebeurd? | Na *is/heeft/wordt* komt het voltooid deelwoord. Gebeuren → gebeurd (met d). | After *is/heeft/wordt* you need the past participle: *gebeurd* (with d). | H (if clause split is reliable). FP: subordinate clause without AUX |
| NL-PART-02 | `SUBJ3\|jij\|je` directly + CONF token ending in d, and NO `AUX` anywhere in the same clause | Het gebeurd vaak. | Het gebeurt vaak. | Hier is het de tegenwoordige tijd: het gebeurt (stam + t). | This is the present tense: *het gebeurt* (stem + t). | H. Antipatterns: *Is het gebeurd?*, *Heb je het verbeterd?*, *…dat het gebeurd is* (AUX before or after) |
| NL-PART-03 | `wat\|wie\|hoe\|waar\|wanneer` + CONF-d + `er\|hier\|daar\|nu\|dan` | Wat gebeurd er? | Wat gebeurt er? | Geen hulpwerkwoord? Dan tegenwoordige tijd: wat gebeurt er? | No auxiliary, so present tense: *wat gebeurt er?* | H |
| NL-PART-04 | `dit\|dat` + `betekend` + `dat\|niet\|toch\|wel` (LT `DIT_BETEKEND_DAT`) | Dit betekend dat … | Dit betekent dat … | *Dit betekent*: stam (beteken) + t. | *Dit betekent*: stem + t. | H |
| NL-PART-05 | DSTEM-participle confusion: AUX … `beantwoordt\|verbrandt\|verspreidt\|bereidt\|vermoordt` clause-final | Hij heeft de vraag beantwoordt. | Hij heeft de vraag beantwoord. | Voltooid deelwoord van beantwoorden = beantwoord (geen extra t). | Participle of *beantwoorden* is *beantwoord*. | H |
| NL-PAST-01 | non-word; flip `-de↔-te`, `-d↔-t`, `-dde↔-de`, `-tte↔-te` and look up | Ik fietsde naar huis. | Ik fietste naar huis. | 't Kofschip: f-s-t-k-ch-p aan het eind van de stam → -te. | Stem ends in a 't kofschip letter, so use *-te*. | H (dictionary-validated) |
| NL-PAST-02 | non-word: `geleeft, gefietsd, verhuist(as participle after AUX), gereist` → flip | Hij heeft daar lang geleeft. | Hij heeft daar lang geleefd. | Kijk naar het hele werkwoord: leven heeft een v, dus geleefd met d. | Look at the infinitive: *leven* has a v (not in 't kofschip), so *geleefd*. | H |
| NL-PAST-03 | `ik\|hij\|zij\|we` + `verbrande\|…` (real-word adjective) where past is `-dde` | Ik verbrande mijn hand. | Ik verbrandde mijn hand. | Stam eindigt op d? Dan krijg je -dde: verbrandde. | Stem ends in d, so the past tense is *-dde*. | M |
| NL-LOAN-01 | lookup table §3.4 | Ik heb de app geupdate. | Ik heb de app geüpdatet. | Engelse werkwoorden vervoeg je op z'n Nederlands: geüpdatet. | English verbs follow Dutch rules: *geüpdatet*. | H |
| NL-LOAN-02 | `ge\w+ed$` not in dictionary and `ge…d`/`ge…t` variant in dictionary | Ik heb hem geïnterviewed. | Ik heb hem geïnterviewd. | Nooit -ed: dat is Engels. | Never *-ed*, that's English. | H |
| NL-AGR-01 | `wij\|we` + verb 3sg form | Wij gaat naar huis. | Wij gaan naar huis. | Bij *wij* gebruik je de meervoudsvorm: wij gaan. | With *wij* use the plural: *wij gaan*. | H |
| NL-AGR-02 | `ik` + infinitive/plural verb, not preceded by `en\|of` + noun/pronoun | Ik hebben honger. | Ik heb honger. | Bij *ik* hoort de ik-vorm: ik heb. | *ik* takes the *ik* form: *ik heb*. | M-H (coordination: *Zij en ik hebben* is correct) |
| NL-AGR-03 | `u is` not preceded by PREP | U is van harte welkom. | U bent van harte welkom. | *U is* is ouderwets. Zeg: u bent. | *u is* is outdated; say *u bent*. | M |
| NL-AUX-01 | `heb\|hebt\|heeft\|hebben\|had\|hadden` … participle of a zijn-verb (gegaan, gekomen, gebleven, geworden, geweest, gestorven, overleden, verdwenen, geboren, gebeurd) in same clause | Ik heb naar huis gegaan. | Ik ben naar huis gegaan. | Bij beweging naar een doel of verandering gebruik je *zijn*: ik ben gegaan. | Verbs of movement/change take *zijn*: *ik ben gegaan*. | H (core list). Avoid *gevallen/begonnen* (rare *hebben* uses) at M |
| NL-PRN-01 | clause start `hun` + finite verb from verb lexicon (not noun) | Hun hebben gewonnen. | Zij hebben gewonnen. | *Hun* is nooit onderwerp. Gebruik zij of ze. | *Hun* is never the subject; use *zij/ze*. | H. Antipattern: *Hun* + noun (*Hun huis is groot*) |
| NL-PRN-02 | (sentence start \| PREP) + `me` + noun (de/het list or family/possession list) | Ik ga naar me moeder. | Ik ga naar mijn (m'n) moeder. | *Me* is geen bezittelijk voornaamwoord. Schrijf mijn of m'n. | *me* can't mean "my"; write *mijn* or *m'n*. | M-H. Antipattern: verb + `me` + noun (*Hij gaf me boeken*) |
| NL-PRN-03 | `jouw` + (`.` `?` `!` `,` \| PREP \| end) | Dit cadeau is voor jouw. | Dit cadeau is voor jou. | *Jouw* staat altijd vóór een zelfstandig naamwoord (jouw boek). Anders: jou. | *jouw* only before a noun; otherwise *jou*. | H |
| NL-PRN-04 | PREP + `jou` + noun | Ik ga met jou auto. | Ik ga met jouw auto. | Van jou? Dan jouw + zelfstandig naamwoord. | Belongs to you, so *jouw* + noun. | M. Antipattern: verb + `jou` + noun (indirect object) |
| NL-PRN-05 | `uw` + (punct \| end); PREP + `u` + noun | Bedankt voor u bericht. | Bedankt voor uw bericht. | *Uw* = van u (uw bericht). *U* = de persoon (voor u). | *uw* = your (formal); *u* = you. | M (H for clause-final *uw*) |
| NL-PRN-06 | `als ik jij was` | Als ik jij was, … | Als ik jou was, … | Vaste uitdrukking: als ik jou was. | Fixed phrase: *als ik jou was*. | H |
| NL-REL-01 | (`het\|dit\|dat\|een\|geen`) + HET_NOUN(sg) + `die`, no comma before `die`, token after `die` not DE_NOUN/adj+DE_NOUN | Het meisje die daar loopt … | Het meisje dat daar loopt … | Meisje is een het-woord, dus: het meisje **dat**. | *meisje* is a het-word, so use *dat*. | H. Antipattern: comma + person noun (*Het schoolhoofd, die …*); demonstrative *die man* |
| NL-REL-02 | HET_NOUN + `wat` + subject pronoun | Het boek wat ik lees. | Het boek dat ik lees. | Na een het-woord is *dat* netter dan *wat*. | After a het-word, *dat* is better than *wat* in writing. | L (informal is accepted) |
| NL-REL-03 | `alles\|iets\|niets\|het enige` + `dat` + pronoun | Alles dat ik weet. | Alles wat ik weet. | Na alles, iets, niets en het enige gebruik je *wat*. | After *alles/iets/niets/het enige*, use *wat*. | L |
| NL-ART-01 | `de` (lowercase, not part of a name) + HET_NOUN(sg) (curated list, minus the exclusions in §4.1) and not followed by a noun forming a dictionary compound | Ik woon in de huis. | Ik woon in het huis. | Huis is een het-woord: het huis. | *huis* is a het-word: *het huis*. | H (curated) / M (`gender.tsv`) |
| NL-ART-02 | PREP + `het` + DE_NOUN(sg) | Ik woon in het stad. | Ik woon in de stad. | Stad is een de-woord: de stad. | *stad* is a de-word: *de stad*. | M-H. Only after PREP (elsewhere *het* is often a pronoun: *Ik vind het top*) |
| NL-ART-03 | `deze` + HET_NOUN(sg) | Deze huis is mooi. | Dit huis is mooi. | Bij een het-woord: dit/dat. Bij een de-woord: deze/die. | het-words take *dit/dat*; de-words *deze/die*. | H |
| NL-ART-04 | `onze` + HET_NOUN(sg) | Onze huis is groot. | Ons huis is groot. | Bij een het-woord zeg je *ons*: ons huis. | With het-words use *ons*: *ons huis*. | H |
| NL-ADJ-01 | `een\|geen\|elk\|ieder\|zo'n\|veel\|welk` + ADJ+`e` + HET_NOUN(sg) | Ik heb een grote huis. | Ik heb een groot huis. | Een + het-woord: geen -e aan het bijvoeglijk naamwoord. Een groot huis. | *een* + het-word: the adjective gets no *-e*. | H for curated ADJ list. Skip -ig/-isch/-lijk and comparatives (stylistic) |
| NL-ADJ-02 | `de\|het\|deze\|dit\|die\|dat\|mijn\|jouw\|zijn\|haar\|ons\|onze\|uw\|hun` + ADJ(base, inflectable) + noun | Het groot huis is van mij. | Het grote huis is van mij. | Na *het/de/mijn…* krijgt het bijvoeglijk naamwoord een -e. | After *de/het/mijn…* the adjective takes *-e*. | M-H. Never for -en adjectives (*gouden, open*), *eigen*, loans |
| NL-CMP-01 | comparative (`groter\|beter\|meer\|minder\|liever\|…` or ADJ+er) \| `anders` + `als`, NOT followed by subject pronoun(+verb), not `eerder\|later\|vroeger` | Hij is groter als ik. | Hij is groter dan ik. | Verschil → *dan*. Gelijk → *als* (even groot als). | Difference → *dan*; sameness → *als*. | M (style in speech, error in writing). Antipattern: *beter als je komt* (= if) |
| NL-CMP-02 | `even\|zo` + ADJ + `dan` | Hij is even groot dan ik. | Hij is even groot als ik. | Bij *even/zo* hoort *als*. | *even/zo* goes with *als*. | H |
| NL-CMP-03 | `hetzelfde dan` | Hetzelfde dan gisteren. | Hetzelfde als gisteren. | Hetzelfde **als**. | It's *hetzelfde als*. | H |
| NL-CMP-04 | `zowel` … `en` (≤6 tokens, no `als` between) | zowel kinderen en ouders | zowel kinderen als ouders | Het is *zowel … als …*. | It's *zowel … als …*. | M |
| NL-SP-01 | misspelling map §6.8 + OpenTaal `corrections.tsv` | Ik ben eigelijk moe. | Ik ben eigenlijk moe. | Kleine spelfout: eigenlijk (met n). | Small typo: *eigenlijk* (with n). | H |
| NL-SP-02 | `perse` not preceded by `ter` | Ik wil perse winnen. | Ik wil per se winnen. | *Per se* schrijf je als twee woorden. | *per se* is two words. | H |
| NL-SP-03 | `opzich` | Opzich is het goed. | Op zich is het goed. | *Op zich*: twee woorden. | *op zich*: two words. | H |
| NL-SP-04 | `ten alle tijden\|ten allen tijde\|te alle tijden` | ten alle tijden | te allen tijde | Oude vaste uitdrukking: te allen tijde. | Old fixed phrase: *te allen tijde*. | H |
| NL-SP-05 | `(de\|het\|mijn\|onze) enigste` + (noun \| `die\|dat\|wat`) | Dit is de enigste kans. | Dit is de enige kans. | Enig = er is er maar één. Eniger dan enig kan niet: de enige. | "Only" can't be more only: *de enige*. | M (*enigste* = "loveliest" is valid) |
| NL-SP-06 | `beiden` + plural noun | beiden kinderen | beide kinderen | Vóór een zelfstandig naamwoord: beide. | Before a noun: *beide*. | H |
| NL-SP-07 | unknown token whose diacritic-stripped form maps to a dictionary word | ideeen, Belgie, coordinatie | ideeën, België, coördinatie | Vergeet het trema niet: het laat zien dat er een nieuwe lettergreep begint. | Don't forget the trema: it marks a new syllable. | H |
| NL-SP-08 | over-trema: `financiëel\|officiëel\|…` not in dictionary, stripped form is | financiëel | financieel | Hier hoort geen trema: financieel leest al goed. | No trema needed: *financieel* is already unambiguous. | H |
| NL-SP-09 | lowercase word + `'s`, char before `'` is a consonant, not an abbreviation | twee computer's | twee computers | Na een medeklinker: gewoon -s. Alleen na a, i, o, u, y: 's (auto's). | After a consonant just add *-s*; *'s* only after a/i/o/u/y. | H |
| NL-SP-10 | word + `s`, not in dictionary, word ends in a/i/o/u/y and `word+'s` is | twee autos | twee auto's | Eindigt het woord op a, i, o, u of y? Dan 's: auto's. | Ends in a/i/o/u/y, so write *'s*: *auto's*. | H |
| NL-SP-11 | `s'(avonds\|ochtends\|morgens\|middags\|nachts\|zomers\|winters)` / `s avonds` / `savonds` | s'avonds | 's avonds | Het apostrofje staat vóór de s: 's avonds. | The apostrophe goes before the s: *'s avonds*. | H |
| NL-SP-12 | `zn\|mn` → `z'n\|m'n`; `zon` + ADJ+e/noun → `zo'n` | zon mooie dag | zo'n mooie dag | *Zo'n* = zo een. *Zon* = die in de lucht. | *zo'n* = "such a"; *zon* = sun. | H (zn/mn), M (zon) |
| NL-SP-13 | non-word ending `-ich` / `-luk\|-lek\|-lik` → swap to `-ig` / `-lijk` if in dictionary | gelukkich, natuurluk | gelukkig, natuurlijk | Je hoort -ich, maar je schrijft -ig. En -lijk klinkt als 'luk'. | You hear *-ich* but write *-ig*; *-lijk* sounds like "luk". | H |
| NL-SP-14 | `hij\|zij\|ze\|ik` + `zij` + (dat\|het\|niets\|tegen\|:\|,) | Hij zij dat het klopte. | Hij zei dat het klopte. | Zeggen in de verleden tijd = zei (met ei). | Past tense of *zeggen* is *zei* (with ei). | M-H |
| NL-SP-15 | ei/ij context pairs (LT `wrongWordInContext` style): word1 + trigger set of word2 within ±5 tokens | Hij rijst naar Spanje. | Hij reist naar Spanje. | Reizen (op pad) met ei; rijst (eten) met ij. | *reizen* (travel) has ei; *rijst* (rice) has ij. | M |
| NL-SP-16 | `lijdt\|leidt` with triggers (aan/onder/pijn vs naar/tot/bedrijf) | Hij leidt aan hoofdpijn. | Hij lijdt aan hoofdpijn. | Lijden = pijn hebben. Leiden = de baas zijn of de weg wijzen. | *lijden* = suffer; *leiden* = lead. | M |
| NL-SP-17 | SUBJ + `licht` + place PREP | Het boek licht op tafel. | Het boek ligt op tafel. | Liggen → het ligt (met g). Licht is lamp of niet zwaar. | *liggen* → *ligt* (with g); *licht* = light. | M |
| NL-SP-18 | `teveel` not preceded by `het\|een` | Ik heb teveel gegeten. | Ik heb te veel gegeten. | *Te veel* = twee woorden. Alleen *het teveel* is één woord. | *te veel* is two words (except the noun *het teveel*). | M |
| NL-SP-19 | non-words `nogsteeds\|vanalles\|inplaats\|zometeen\|iedergeval` | nogsteeds | nog steeds | Twee woorden: nog steeds. | Two words: *nog steeds*. | H |
| NL-SP-20 | `er van af` | Ik ben er van af. | Ik ben ervan af. | *Er van af* kan niet: ervan af of er vanaf. | Not *er van af*: write *ervan af* or *er vanaf*. | M |
| NL-CAP-01 | DAY/MONTH/SEASON capitalised, not sentence-initial, not in a title | Op Maandag 3 Januari … | Op maandag 3 januari … | Dagen en maanden schrijf je in het Nederlands met een kleine letter. | Days and months are lowercase in Dutch. | H |
| NL-CAP-02 | lowercase language/nationality (`nederlands, engels, arabisch, frans, duits, turks, marokkaans, belgisch, nederlander…`) | Ik spreek nederlands. | Ik spreek Nederlands. | Talen en volken krijgen een hoofdletter: Nederlands. | Languages and nationalities get a capital. | H |
| NL-CAP-03 | `Ik` capitalised mid-sentence | Gisteren ging Ik … | Gisteren ging ik … | *Ik* krijgt alleen een hoofdletter aan het begin van de zin. | *ik* is only capitalised at the start of a sentence. | H |
| NL-CAP-04 | sentence-initial lowercase letter (skip `'s`/`'t` + check next word) | ik ga naar huis. | Ik ga naar huis. | Begin een zin met een hoofdletter. | Start a sentence with a capital. | H |
| NL-CMPD-01 | curated split-compound list §6.7 | Ik moet naar het zieken huis. | Ik moet naar het ziekenhuis. | Samenstellingen schrijf je aan elkaar: ziekenhuis. | Dutch compounds are written as one word. | H |
| NL-CMPD-02 | generated: NOUN NOUN where join is in dictionary | kaas soufflé | kaassoufflé | Twee zelfstandige naamwoorden die samen één ding zijn → aan elkaar. | Two nouns forming one concept → one word. | M (hint) |
| NL-CMPD-03 | vowel clash join (`zee egel`, `zeeegel`, `auto ongeluk`) | auto ongeluk | auto-ongeluk | Botsen twee klinkers in een samenstelling? Zet er een streepje tussen. | Vowels clash at the join, so use a hyphen. | H |
| NL-TUSN-01 | unknown compound; insert/remove `n` after linking `e`, validate | pannekoek | pannenkoek | Meervoud alleen op -en (pannen)? Dan schrijf je -en-: pannenkoek. | Plural only in *-en* (*pannen*) → *pannenkoek*. | H |
| NL-LEX-01 | `besef me\|beseft zich\|beseffen zich` | Ik besef me dat … | Ik besef dat … / Ik realiseer me dat … | *Beseffen* is niet wederkerend: ik besef. | *beseffen* isn't reflexive. | H |
| NL-LEX-02 | `met` … `mee eens` | Ik ben het met je mee eens. | Ik ben het met je eens. | *Mee* is hier dubbel: het met iemand eens zijn. | *mee* is redundant here. | H |
| NL-LEX-03 | `ken\|kent` + (niet\|wel\|goed\|ook)? + infinitive (clause-final), no object | Ik ken niet zwemmen. | Ik kan niet zwemmen. | Kunnen (in staat zijn) → ik kan. Kennen = iets of iemand kennen. | *kunnen* (be able) → *kan*; *kennen* = know someone/something. | M |
| NL-LEX-04 | `ken je\|ken jij\|kent u` + `waar\|wat\|hoe\|wanneer\|of\|dat` | Ken je waar hij woont? | Weet je waar hij woont? | Een feit of antwoord → weten. Een persoon of plek → kennen. | Facts → *weten*; people/places → *kennen*. | M-H |
| NL-LEX-05 | `weet\|weten\|wist` + `hem\|haar\|jou\|jullie\|hen` + not `te` + inf | Ik weet hem niet. | Ik ken hem niet. | Een persoon *ken* je. | You *kennen* a person. | M |
| NL-LEX-06 | `ga\|gaat\|gaan` + (even\|lekker\|nog)? + `leggen\|zetten` + clause end | Ik ga even leggen. | Ik ga even liggen. | Liggen/zitten = waar je bent. Leggen/zetten = iets ergens neerleggen. | *liggen/zitten* = position; *leggen/zetten* = put something. | M |
| NL-LEX-07 | `een hele` + ADJ+e + noun | een hele mooie dag | een heel mooie dag | In nette taal: *heel* (zonder -e) vóór een bijvoeglijk naamwoord. | In formal writing use *heel* (no -e) before an adjective. | L |
| NL-LEX-08 | `wie z'n\|wie zijn` + noun | Wie z'n jas is dit? | Van wie is deze jas? | *Wie z'n* is spreektaal. Netter: van wie of wiens. | *wie z'n* is spoken style; formal: *van wie* / *wiens*. | L |
| NL-LEX-09 | `zoals hoe\|als hoe\|hoe als` | zoals hoe ik het doe | zoals ik het doe | Dubbelop: *zoals* is genoeg. | Doubled up: *zoals* is enough. | L (uncertain, see §3.14) |
| NL-WO-01 | sentence start ADV_FRONT (no comma) + subject pronoun + FINITE | Morgen ik ga naar school. | Morgen ga ik naar school. | Het werkwoord staat op plek 2: Morgen **ga** ik … | The verb comes second: *Morgen ga ik*. | H |
| NL-WO-02 | SUBORD + subject pronoun + FINITE + ≥1 token + clause end, last token not participle/infinitive | …omdat ik ben moe. | …omdat ik moe ben. | In een bijzin staat het werkwoord achteraan: omdat ik moe ben. | In a subordinate clause the verb goes to the end. | M |
| NL-WO-03 | `niet een` + noun; `niet geen\|nooit geen` | Ik heb niet een auto. | Ik heb geen auto. | Zelfstandig naamwoord ontkennen → geen. | To negate a noun use *geen*. | L-M |

### 4.1 Rule-specific word lists (closed classes)

- **Subject pronouns:** ik, jij, je, u, hij, zij, ze, het, men, wij, we, jullie, (gij: skip rules).
- **ADV_FRONT (V2 trigger):** morgen, gisteren, vandaag, nu, toen, daarna, dan, soms, misschien, daarom, eigenlijk, natuurlijk, vaak, altijd, nooit, hier, daar, straks, vanavond, vanmorgen, vanochtend, vanmiddag, eerst, later, ook, gelukkig, helaas, meestal, ineens, opeens, vroeger, binnenkort, volgende week, vorige week, elke dag.
- **SUBORD:** omdat, dat, als, wanneer, terwijl, hoewel, zodat, voordat, nadat, totdat, sinds, of (indirect question), zodra, tenzij, alsof, doordat, waardoor, zolang.
- **FINITE (high-freq, for WO rules):** ben, bent, is, zijn, heb, hebt, heeft, hebben, kan, kun, kunt, kunnen, wil, wilt, willen, moet, moeten, mag, mogen, zal, zult, zullen, ga, gaat, gaan, kom, komt, komen, woon, woont, wonen, werk, werkt, werken, doe, doet, doen, zie, ziet, weet, weten, vind, vindt, vinden, word, wordt, worden, was, waren, had, hadden, ging, gingen, kwam, kwamen.
- **Person het-nouns (REL-01 comma exception):** meisje, kind, hoofd, schoolhoofd, familielid, lid, slachtoffer, personeelslid, any diminutive (*-je*).
- **Article-rule exclusions** (homographs that make `de X`/`het X` legitimate): wit, meer, weer, verleden (*de verleden tijd*), totaal, licht, recht, publiek, uniform, patroon (*de patroon* = cartridge/boss), teken (*de teken* = ticks), voetbal (*de voetbal* = ball), weg (*het weg…* pronoun + adverb), tijd (*Ik vind het tijd…*), kwart (in *kwart finale*, handled by the compound rule).

---

## 5. Severity & false-positive strategy (what makes it feel smart and not annoying)

1. **Adjacent tokens by default.** Only a few rules (PART-01, AUX-01, CMP-04, SP-15) look across more than 2 tokens, and they stay inside the clause.
2. **Possessive/indirect-object guards** on all *je/me/jou/u/hun* rules (next-token-is-noun checks).
3. **The dictionary must validate every generated suggestion.** Never suggest a non-word.
4. **Variant whitelist** (§3.1): hou/houd, rij/rijd, kan/kunt, wil/wilt, zal/zult, hebt/heeft (u), idee de/het, Belgian variant genders (*de weekend, de commentaar, de snoep*). For a Belgian user, set `variant: 'nl-BE'` and relax gender rules for *weekend, commentaar, snoep, pistool, ticket*.
5. **Score only `high` issues** in the accuracy metric. Show `medium` issues as a dotted underline with a "why?" tooltip. Hide `low` issues unless the user enables "Strenge modus / strict mode".
6. **Per-rule kill switch and telemetry-free learning:** if the user dismisses a rule's issue 3× in the same context, store the rule ID + context signature in `localStorage` and stop showing it.

---

## 6. Word lists

### 6.1 High-frequency **het**-nouns (315)

Selection: frequent nouns in OpenSubtitles (`nl_50k`) whose article in `gender.tsv` is *het*, plus nouns I checked by hand where the dataset says *de/het* but standard Dutch (Netherlands) uses *het* (*boek, dorp, dak, bier, been, moment, nummer, aantal, resultaat, gevoel, papier, paleis, toilet, bad, deel, ding, monster, bestuur, merk, zwaard, verstand, kwart, potlood, schaap, konijn, gereedschap, vat, woordenboek, stadion, stadhuis, voorjaar, najaar, kruispunt, mysterie*). Removed: dataset errors (*suiker* is **de**), true double-gender words (*idee, schilderij, gordijn, vest, pyjama, menu, ticket, toernooi, haar (de/het), bos (het bos/de bos)*), Belgian variation (*weekend*: BE *de weekend*), *restaurant* (standard *het*, but the dataset says de/het, so it is left out to be safe) and homographs (see §4.1). Sorted by frequency, most frequent first.

leven, jaar, huis, geld, werk, uur, eten, meisje, probleem, kind, hoofd, ding, moment, plan, water, land, verhaal, bloed, nieuws, bed, hart, begin, lichaam, gezicht, nummer, deel, team, geval, geluk, wapen, vertrouwen, recht, kantoor, onderzoek, bewijs, stuk, woord, antwoord, boek, ziekenhuis, gevoel, contact, schip, plezier, einde, spel, gebruik, leger, geheim, ongeluk, slachtoffer, feest, gevaar, succes, bedrijf, vuur, hotel, doel, gesprek, huwelijk, vliegtuig, gezin, gebouw, bureau, bericht, oog, aantal, gebied, eind, respect, paard, risico, midden, adres, bezoek, park, volk, systeem, raam, mes, spoor, gevecht, feit, verschil, verlies, been, monster, ijs, appartement, vlees, glas, goud, eiland, beeld, dak, dorp, dossier, geluid, bier, gat, proces, programma, advies, bezit, gedrag, ontbijt, voedsel, geweld, verband, publiek, rapport, beest, kamp, strand, bad, toilet, telefoontje, lid, signaal, veld, project, belang, zwaard, afscheid, aanbod, contract, internet, ontslag, noorden, talent, cadeau, geheugen, station, diner, besluit, verstand, papier, verzoek, zicht, graf, dier, westen, niveau, voordeel, geduld, personeel, zuiden, verslag, gas, excuus, bord, voorstel, terrein, horloge, pensioen, artikel, brood, voorbeeld, vliegveld, centrum, universum, materiaal, shirt, beroep, bezwaar, zwembad, verdriet, uniform, onderwerp, gedeelte, model, oor, lijf, lied, seizoen, huiswerk, onderdeel, touw, kasteel, resultaat, apparaat, oosten, gewicht, geschenk, zand, varken, hout, merk, hek, café, gras, interview, middel, podium, effect, masker, museum, kopje, kruis, schema, oordeel, ei, uitzicht, vat, theater, netwerk, gebrek, rijbewijs, ministerie, nut, ondergoed, incident, vak, speelgoed, dagboek, bewustzijn, avontuur, karakter, college, paspoort, voertuig, zout, afval, gevolg, loon, experiment, gemak, concert, bestuur, testament, mysterie, symbool, profiel, verkeer, paleis, recept, scherm, kwart, drama, bedrag, lawaai, konijn, misdrijf, fruit, kanaal, gereedschap, misbruik, nest, kostuum, hoofdstuk, jasje, begrip, toestel, accent, congres, verlof, kwartier, verblijf, tekort, beleid, detail, salaris, bestand, paradijs, toezicht, circus, protocol, product, winkelcentrum, wachtwoord, examen, gedicht, diploma, tapijt, ontwerp, hemd, gezag, vervoer, plafond, onderwijs, gerecht, familielid, formulier, schaap, inkomen, instrument, overhemd, getal, plein, hert, insect, stadion, cijfer, klimaat, koor, continent, stadhuis, potlood, kampioenschap, nadeel, orkest, laken, woordenboek, voorjaar, kruispunt, register, gebak, alfabet, bestek, toetsenbord, doelpunt, servies, najaar, werkwoord, fietspad

> Learners mostly get the **het** words wrong (only about 1 in 5 nouns is *het*, 20% in the dataset, so "default to de" is a common strategy and fails on exactly these). Drill: *de/het* flashcards built from this list, in typing form (*het huis, het meisje, het water…*).

### 6.2 Common **de**-nouns learners get wrong (164)

All are *de* in standard Dutch (checked against `gender.tsv`). The dataset marks 7 of them *de/het* because of Wiktionary homographs (*taal, appel, zin, sport, broek, bruiloft, nacht*), and *koelkast* is missing from it; all 8 are plain *de*. Typical over-use of *het* by learners: *het auto, het computer, het foto, het baby, het informatie, het familie, het politie*.

weg, man, tijd, dood, dag, vader, vrouw, moeder, auto, vriend, hand, vraag, jongen, wereld, zoon, familie, politie, manier, kans, hulp, stad, pijn, school, broer, kamer, dokter, foto, dochter, week, deur, baby, nacht, avond, vriendin, baas, telefoon, fout, liefde, buurt, baan, mond, zin, zus, film, informatie, koffie, lucht, maand, muziek, afspraak, bank, straat, rug, prijs, stem, keuze, situatie, tafel, reis, partner, regel, oma, arm, sleutel, kerk, zon, brief, zee, wedstrijd, les, computer, winkel, angst, muur, neus, broek, geschiedenis, hoogte, bus, tas, thee, collega, rekening, verjaardag, trein, opa, ochtend, keuken, energie, stoel, voet, ervaring, vakantie, video, bruiloft, vorm, radio, maan, klas, krant, mening, wind, rivier, chef, brug, jas, trap, zomer, universiteit, oplossing, klant, ziekte, kleur, vergadering, tuin, melk, omgeving, kast, vloer, berg, pizza, taal, natuur, buik, leraar, markt, gezondheid, kaas, winter, regen, klok, douche, middag, bril, fiets, sneeuw, sport, bibliotheek, uitnodiging, opleiding, soep, tekst, televisie, koelkast, agenda, laptop, temperatuur, website, buurman, schoen, cultuur, lamp, lente, grootte, appel, muis, belasting, lengte, tand, herfst, cursus, app, groente, printer

### 6.3 Verbs with a **d-stem** (the dt-danger list)

Infinitive → stem (ik, *… je?*) / 3rd person (*hij*, *jij* before the verb, *u*). All 3rd-person forms exist in OpenTaal (460 d/dt pairs were found there automatically; these are the frequent verbs):

worden (word/wordt), vinden (vind/vindt), houden (houd~hou/houdt), rijden (rijd~rij/rijdt), antwoorden (antwoord/antwoordt), beantwoorden, branden, verbranden, landen, belanden, melden, vermelden, redden (red/redt), wedden (wed/wedt), kleden (kleed/kleedt), verkleden, voeden (voed/voedt), hoeden, bereiden (bereid/bereidt), voorbereiden, leiden (leid/leidt), begeleiden, verleiden, misleiden, lijden (lijd/lijdt), overlijden, spreiden, verspreiden, bevrijden, benijden, wijden, luiden, duiden, vermoorden, vermoeden, besteden, vergoeden, beïnvloeden, aanvaarden, verantwoorden, bieden (bied/biedt), aanbieden, verbieden, binden, verbinden, zenden, schenden, snijden (snijd~snij/snijdt), glijden (glijd~glij/glijdt), strijden, bestrijden, mijden, vermijden, scheiden, onderscheiden, raden (raad/raadt), verraden, laden (laad/laadt), braden, baden, treden (treed/treedt), betreden, optreden, overtreden, wenden, bloeden, doden (dood/doodt), gelden (geld/geldt), schudden (schud/schudt), bidden (bid/bidt), verwonden, downloaden (download/downloadt), uploaden.

**Their past tense ends in -dde(n)** when weak: *antwoordde, landde, redde, brandde, meldde, kleedde, voedde, leidde, bereidde, verspreidde, bevrijdde, vermoordde, vermoedde, besteedde, downloadde*.

### 6.4 Strong, mixed & irregular verbs (134 verbs; the d/t angle: mostly **no -de/-te past, no -d/-t participle**)

Key point for learners: the truly strong verbs here **never** take *-de/-te* or *-dt* in the past (*hij vond*, not *vondt/vindde*). Their participle ends in **-en** (or is irregular), so *gevonden* is never written *gevondt*. A d-stem among them still takes **dt** in the present (*hij vindt, wordt, houdt, rijdt, biedt, snijdt*). Mixed verbs (weak past, strong participle: *lachen, bakken, heten, raden, laden, braden, scheiden, wassen*) and verbs with a strong past but weak participle (*vragen → vroeg/gevraagd, jagen, waaien*) are marked by their forms. All 134 × 5 forms were verified to exist in the OpenTaal list.

| Infinitief | 3e pers. (hij) | Verl. tijd ev | Verl. tijd mv | Volt. deelwoord | Hulpww. |
|---|---|---|---|---|---|
| worden | wordt | werd | werden | geworden | zijn |
| vinden | vindt | vond | vonden | gevonden | hebben |
| houden | houdt | hield | hielden | gehouden | hebben |
| rijden | rijdt | reed | reden | gereden | hebben/zijn |
| snijden | snijdt | sneed | sneden | gesneden | hebben |
| glijden | glijdt | gleed | gleden | gegleden | hebben/zijn |
| lijden | lijdt | leed | leden | geleden | hebben |
| strijden | strijdt | streed | streden | gestreden | hebben |
| mijden | mijdt | meed | meden | gemeden | hebben |
| vermijden | vermijdt | vermeed | vermeden | vermeden | hebben |
| bieden | biedt | bood | boden | geboden | hebben |
| verbieden | verbiedt | verbood | verboden | verboden | hebben |
| binden | bindt | bond | bonden | gebonden | hebben |
| verbinden | verbindt | verbond | verbonden | verbonden | hebben |
| zenden | zendt | zond | zonden | gezonden | hebben |
| schenden | schendt | schond | schonden | geschonden | hebben |
| bidden | bidt | bad | baden | gebeden | hebben |
| raden | raadt | raadde | raadden | geraden | hebben |
| laden | laadt | laadde | laadden | geladen | hebben |
| braden | braadt | braadde | braadden | gebraden | hebben |
| scheiden | scheidt | scheidde | scheidden | gescheiden | hebben/zijn |
| treden | treedt | trad | traden | getreden | hebben/zijn |
| betreden | betreedt | betrad | betraden | betreden | hebben |
| overtreden | overtreedt | overtrad | overtraden | overtreden | hebben |
| wenden | wendt | wendde | wendden | gewend | hebben |
| zijn | is | was | waren | geweest | zijn |
| hebben | heeft | had | hadden | gehad | hebben |
| kunnen | kan | kon | konden | gekund | hebben |
| zullen | zal | zou | zouden | - | - |
| mogen | mag | mocht | mochten | gemogen | hebben |
| moeten | moet | moest | moesten | gemoeten | hebben |
| willen | wil | wilde | wilden | gewild | hebben |
| weten | weet | wist | wisten | geweten | hebben |
| gaan | gaat | ging | gingen | gegaan | zijn |
| staan | staat | stond | stonden | gestaan | hebben |
| verstaan | verstaat | verstond | verstonden | verstaan | hebben |
| begrijpen | begrijpt | begreep | begrepen | begrepen | hebben |
| doen | doet | deed | deden | gedaan | hebben |
| slaan | slaat | sloeg | sloegen | geslagen | hebben |
| zien | ziet | zag | zagen | gezien | hebben |
| komen | komt | kwam | kwamen | gekomen | zijn |
| nemen | neemt | nam | namen | genomen | hebben |
| geven | geeft | gaf | gaven | gegeven | hebben |
| lezen | leest | las | lazen | gelezen | hebben |
| eten | eet | at | aten | gegeten | hebben |
| vergeten | vergeet | vergat | vergaten | vergeten | hebben/zijn |
| zitten | zit | zat | zaten | gezeten | hebben |
| liggen | ligt | lag | lagen | gelegen | hebben |
| leggen | legt | legde | legden | gelegd | hebben |
| zetten | zet | zette | zetten | gezet | hebben |
| spreken | spreekt | sprak | spraken | gesproken | hebben |
| breken | breekt | brak | braken | gebroken | hebben/zijn |
| treffen | treft | trof | troffen | getroffen | hebben |
| schrijven | schrijft | schreef | schreven | geschreven | hebben |
| blijven | blijft | bleef | bleven | gebleven | zijn |
| kijken | kijkt | keek | keken | gekeken | hebben |
| lijken | lijkt | leek | leken | geleken | hebben |
| krijgen | krijgt | kreeg | kregen | gekregen | hebben |
| beginnen | begint | begon | begonnen | begonnen | zijn |
| winnen | wint | won | wonnen | gewonnen | hebben |
| drinken | drinkt | dronk | dronken | gedronken | hebben |
| zingen | zingt | zong | zongen | gezongen | hebben |
| springen | springt | sprong | sprongen | gesprongen | hebben/zijn |
| schieten | schiet | schoot | schoten | geschoten | hebben |
| sluiten | sluit | sloot | sloten | gesloten | hebben |
| genieten | geniet | genoot | genoten | genoten | hebben |
| gieten | giet | goot | goten | gegoten | hebben |
| ruiken | ruikt | rook | roken | geroken | hebben |
| buigen | buigt | boog | bogen | gebogen | hebben |
| vliegen | vliegt | vloog | vlogen | gevlogen | hebben/zijn |
| liegen | liegt | loog | logen | gelogen | hebben |
| kiezen | kiest | koos | kozen | gekozen | hebben |
| verliezen | verliest | verloor | verloren | verloren | hebben |
| vriezen | vriest | vroor | vroren | gevroren | hebben |
| wegen | weegt | woog | wogen | gewogen | hebben |
| trekken | trekt | trok | trokken | getrokken | hebben |
| vechten | vecht | vocht | vochten | gevochten | hebben |
| dragen | draagt | droeg | droegen | gedragen | hebben |
| varen | vaart | voer | voeren | gevaren | hebben/zijn |
| graven | graaft | groef | groeven | gegraven | hebben |
| helpen | helpt | hielp | hielpen | geholpen | hebben |
| sterven | sterft | stierf | stierven | gestorven | zijn |
| werpen | werpt | wierp | wierpen | geworpen | hebben |
| zwemmen | zwemt | zwom | zwommen | gezwommen | hebben/zijn |
| lopen | loopt | liep | liepen | gelopen | hebben/zijn |
| roepen | roept | riep | riepen | geroepen | hebben |
| slapen | slaapt | sliep | sliepen | geslapen | hebben |
| laten | laat | liet | lieten | gelaten | hebben |
| vallen | valt | viel | vielen | gevallen | zijn |
| hangen | hangt | hing | hingen | gehangen | hebben |
| vangen | vangt | ving | vingen | gevangen | hebben |
| heten | heet | heette | heetten | geheten | hebben |
| lachen | lacht | lachte | lachten | gelachen | hebben |
| bakken | bakt | bakte | bakten | gebakken | hebben |
| vragen | vraagt | vroeg | vroegen | gevraagd | hebben |
| zeggen | zegt | zei | zeiden | gezegd | hebben |
| kopen | koopt | kocht | kochten | gekocht | hebben |
| brengen | brengt | bracht | brachten | gebracht | hebben |
| denken | denkt | dacht | dachten | gedacht | hebben |
| zoeken | zoekt | zocht | zochten | gezocht | hebben |
| bezoeken | bezoekt | bezocht | bezochten | bezocht | hebben |
| verkopen | verkoopt | verkocht | verkochten | verkocht | hebben |
| jagen | jaagt | joeg | joegen | gejaagd | hebben |
| waaien | waait | woei | woeien | gewaaid | hebben |
| zweren | zweert | zwoer | zwoeren | gezworen | hebben |
| wijzen | wijst | wees | wezen | gewezen | hebben |
| prijzen | prijst | prees | prezen | geprezen | hebben |
| rijzen | rijst | rees | rezen | gerezen | zijn |
| bijten | bijt | beet | beten | gebeten | hebben |
| smijten | smijt | smeet | smeten | gesmeten | hebben |
| verdwijnen | verdwijnt | verdween | verdwenen | verdwenen | zijn |
| verschijnen | verschijnt | verscheen | verschenen | verschenen | zijn |
| schijnen | schijnt | scheen | schenen | geschenen | hebben |
| stijgen | stijgt | steeg | stegen | gestegen | zijn |
| zwijgen | zwijgt | zweeg | zwegen | gezwegen | hebben |
| grijpen | grijpt | greep | grepen | gegrepen | hebben |
| knijpen | knijpt | kneep | knepen | geknepen | hebben |
| fluiten | fluit | floot | floten | gefloten | hebben |
| kruipen | kruipt | kroop | kropen | gekropen | hebben/zijn |
| zuigen | zuigt | zoog | zogen | gezogen | hebben |
| bederven | bederft | bedierf | bedierven | bedorven | hebben/zijn |
| gelden | geldt | gold | golden | gegolden | hebben |
| schelden | scheldt | schold | scholden | gescholden | hebben |
| smelten | smelt | smolt | smolten | gesmolten | hebben/zijn |
| zwellen | zwelt | zwol | zwollen | gezwollen | zijn |
| stinken | stinkt | stonk | stonken | gestonken | hebben |
| dwingen | dwingt | dwong | dwongen | gedwongen | hebben |
| klimmen | klimt | klom | klommen | geklommen | hebben/zijn |
| glimmen | glimt | glom | glommen | geglommen | hebben |
| wassen | wast | waste | wasten | gewassen | hebben |
| scheppen | schept | schiep | schiepen | geschapen | hebben |
| bevelen | beveelt | beval | bevalen | bevolen | hebben |
| stelen | steelt | stal | stalen | gestolen | hebben |
| bewegen | beweegt | bewoog | bewogen | bewogen | hebben |

Notes: *scheppen* = "create" (*schiep/geschapen*); *scheppen* = "scoop" is weak (*schepte/geschept*). *vergeten* takes *zijn* when meaning "forgotten (gone from memory)" and *hebben* when meaning "left behind". *staan/liggen/zitten* take *hebben* in NL and often *zijn* in BE. *willen* also has the past form *wou* (informal).

### 6.5 Participle / present confusables (CONF map, curated, all forms verified)

Format `participle | present-3sg`. Build the map in both directions. Kofschip "trap" pairs (participle **d** even though the stem ends in f/s) are marked *.

gebeurd|gebeurt, verteld|vertelt, betekend|betekent, veranderd|verandert, bedoeld|bedoelt, betaald|betaalt, verdiend|verdient, beloofd|belooft*, geloofd|gelooft*, herinnerd|herinnert, behandeld|behandelt, bepaald|bepaalt, verbaasd|verbaast*, beschermd|beschermt, verklaard|verklaart, vertrouwd|vertrouwt, verwijderd|verwijdert, bevestigd|bevestigt, herkend|herkent, vertaald|vertaalt, veroordeeld|veroordeelt, bedreigd|bedreigt, besteld|bestelt, bewaard|bewaart, verhuisd|verhuist*, beschadigd|beschadigt, beweerd|beweert, hersteld|herstelt, ontwikkeld|ontwikkelt, beledigd|beledigt, beleefd|beleeft*, verspild|verspilt, verzameld|verzamelt, beschouwd|beschouwt, verondersteld|veronderstelt, verzekerd|verzekert, verzorgd|verzorgt, ontkend|ontkent, verstuurd|verstuurt, vervolgd|vervolgt, verdeeld|verdeelt, verdedigd|verdedigt, bestudeerd|bestudeert, verveeld|verveelt, vertegenwoordigd|vertegenwoordigt, verbeterd|verbetert, verhoogd|verhoogt, benaderd|benadert, bespaard|bespaart, verenigd|verenigt, beloond|beloont, verlangd|verlangt, beëindigd|beëindigt, vertraagd|vertraagt, bemoeid|bemoeit, bestuurd|bestuurt, vertoond|vertoont, beoordeeld|beoordeelt, erkend|erkent, vervoerd|vervoert, verleend|verleent, benoemd|benoemt, herhaald|herhaalt, veroverd|verovert, verminderd|vermindert, berekend|berekent, bediend|bedient, bewonderd|bewondert, versierd|versiert, verhuurd|verhuurt, verlaagd|verlaagt.

**d-stem pairs (participle without t | present with dt):** beantwoord|beantwoordt, verbrand|verbrandt, verspreid|verspreidt, bereid|bereidt, voorbereid|voorbereidt, begeleid|begeleidt, vermoord|vermoordt, vermoed|vermoedt, besteed|besteedt, beïnvloed|beïnvloedt, aanvaard|aanvaardt.

**Participle = present (never flag, nothing to confuse):** gebruikt, verwacht, bezocht, verkocht, ontmoet. Strong participles like *vergeten, begonnen, verboden* can't be confused with a -t form.
**Exclude noise pairs** from auto-generated lists: *verband/verbant*, *gepland/geplant* (two different verbs!), *gewend/gewent*, *verlaad/verlaat*, *verwijd/verwijt*, and *bekend/bekent* (keep this one only with care).

Generating more: the OpenTaal list yields 797 `prefix…d / prefix…t` pairs automatically. Filter them with the frequency list and manual review before use.

### 6.6 *zijn*-verbs (for NL-AUX-01)

gegaan, gekomen, gebleven, geworden, geweest, gestorven, overleden, verdwenen, geboren, gebeurd, ontstaan, verschenen, vertrokken, aangekomen, opgestaan, teruggekomen, meegegaan, thuisgekomen, uitgegaan, weggegaan, (begonnen, gevallen, gestegen, gedaald: zijn, but keep at medium).

### 6.7 Split compounds (curated, all joined forms in OpenTaal)

zieken huis→ziekenhuis, kaas soufflé→kaassoufflé, account manager→accountmanager, management team→managementteam, contact persoon→contactpersoon, werk ervaring→werkervaring, auto verzekering→autoverzekering, computer programma→computerprogramma, telefoon nummer→telefoonnummer, e-mail adres→e-mailadres, taal fout→taalfout, spelling controle→spellingcontrole, zorg verzekering→zorgverzekering, klanten service→klantenservice, sollicitatie gesprek→sollicitatiegesprek, verjaardags feest→verjaardagsfeest, voetbal wedstrijd→voetbalwedstrijd, boodschappen lijst→boodschappenlijst, studenten kamer→studentenkamer, tand arts→tandarts, huis arts→huisarts, service desk→servicedesk, help desk→helpdesk, web winkel→webwinkel, gebruikers naam→gebruikersnaam, wacht woord→wachtwoord, zonne bril→zonnebril, koffie machine→koffiemachine, sinaasappel sap→sinaasappelsap, kinder opvang→kinderopvang, bus halte→bushalte, trein station→treinstation, fietsen stalling→fietsenstalling, salaris verhoging→salarisverhoging, eind examen→eindexamen, zomer vakantie→zomervakantie, kerst vakantie→kerstvakantie, boeken kast→boekenkast, huis werk→huiswerk, rij bewijs→rijbewijs.

### 6.8 Misspelling map (non-words, wrong → right; wrong forms absent from OpenTaal, right forms present)

| Wrong | Right | | Wrong | Right |
|---|---|---|---|---|
| eigelijk | eigenlijk | | sympatiek | sympathiek |
| uberhaupt, uberhaubt, überhaubt | überhaupt | | vacantie | vakantie |
| zowieso, sowiso, zowiezo, zo wie zo | sowieso | | namenlijk | namelijk |
| aleen | alleen | | nivo | niveau |
| interresant, intressant, interesant | interessant | | kado, cado | cadeau |
| geinteresseerd, geintereseerd | geïnteresseerd | | buro | bureau |
| mischien, misschein, misshien | misschien | | sinasappel | sinaasappel |
| accomodatie | accommodatie | | chagerijnig | chagrijnig |
| abbonement, abonnoment | abonnement | | pyama | pyjama |
| aggressief | agressief | | financiëel / officiëel | financieel / officieel |
| aparaat | apparaat | | efficient | efficiënt |
| carriere | carrière | | ideeen, Belgie, coordinatie, reunie | ideeën, België, coördinatie, reünie |
| entousiast | enthousiast | | nogsteeds, vanalles, inplaats, zometeen | nog steeds, van alles, in plaats, zo meteen |
| onmiddelijk | onmiddellijk | | s'avonds | 's avonds |
| paralel | parallel | | pannekoek | pannenkoek |
| heelemaal | helemaal | | adress | adres |
| ingewikkelt | ingewikkeld | | defenitief | definitief |
| catagorie | categorie | | uiteindlijk | uiteindelijk |
| waarschijlijk | waarschijnlijk | | verantwoordlijk | verantwoordelijk |
| natuurluk | natuurlijk | | gemakelijk | gemakkelijk |
| harstikke | hartstikke | | gefeliciteert | gefeliciteerd |
| sucses | succes | | asjeblieft | alsjeblieft |

**Context-dependent (real words, rule needed):** perse (→ per se, not after *ter*), enigste (→ enige), teveel (→ te veel), allen (vs alleen), tenminste/ten minste, tenslotte/ten slotte, opzich (non-word → op zich), vanaf/van af, zon/zo'n, zij/zei, licht/ligt, leidt/lijdt, reist/rijst.

### 6.9 Learner-oriented adjective list (for NL-ADJ rules; base → inflected)

groot→grote, klein→kleine, mooi→mooie, nieuw→nieuwe, oud→oude, goed→goede, slecht→slechte, lang→lange, kort→korte, leuk→leuke, lekker→lekkere, rood→rode, wit→witte, zwart→zwarte, blauw→blauwe, groen→groene, geel→gele, duur→dure, goedkoop→goedkope, snel→snelle, langzaam→langzame, druk→drukke, rustig→rustige, belangrijk→belangrijke, moeilijk→moeilijke, makkelijk→makkelijke, warm→warme, koud→koude, dik→dikke, dun→dunne, hoog→hoge, laag→lage, breed→brede, smal→smalle, zwaar→zware, licht→lichte, vies→vieze, lief→lieve, boos→boze, blij→blije, ziek→zieke, gezond→gezonde, jong→jonge, schoon→schone, vol→volle, leeg→lege, sterk→sterke, zwak→zwakke, open (never inflected), gouden (never), eigen (never), rechter/linker (never).

Spelling of the inflected form follows the open-syllable rules (*groot→grote*, *wit→witte*, *lief→lieve*, *boos→boze*). Generate the form, validate it against the word list, and also treat the form as an "ADJ+e" token in NL-ADJ-01.

---

## 7. Minimal-pair and drill material (ei/ij, au/ou, d/t)

- **ei/ij:** leiden/lijden, peil/pijl, steil/stijl, reizen/rijzen, reist/rijst, eis/ijs, zei/zij, wei/wij, hei/hij, mei/mij, bereiden/berijden, weiden/wijden, rein/Rijn.
- **au/ou:** rauw/rouw, kauw/kou, (oud, fout, goud, hout, zout, vrouw, trouw, touw, nou, jou, blauw, gauw, flauw, pauw, saus, auto: memorise).
- **d/t homophones to drill** (the less frequent member in **bold** is the one people miss): **word** (ik word, word je)/wordt; **vind** je/vindt; gebeurt/**gebeurd**; verbetert/**verbeterd**; betekent/**betekend**; **beantwoord**/beantwoordt; verspreidt/**verspreid**; antwoordt/**antwoordde** (past).

---

## 8. Error classifier for known-target modes (typing tests, dictation)

When the target text is known, label each word-level diff so the UI can show the matching explanation (rule ID from §4). Run these checks in order on a `(typed, target)` pair:

| Check | Label | Linked rule/explanation |
|---|---|---|
| same except final `d`/`t`/`dt` (e.g. word/wordt, gebeurd/gebeurt) | `dt` | NL-DT-0x / NL-PART-0x (pick by context: target AUX → participle; target subject → present) |
| `-de/-te`, `-dde/-de`, `-tte/-te` difference | `kofschip` | NL-PAST-01 |
| same after `stripDiacritics` | `trema/accent` | NL-SP-07/08 |
| `ei↔ij` or `au↔ou` swap | `ei-ij` / `au-ou` | §3.13 |
| `g↔ch` at end (ligt/licht, -ig/-ich) | `g-ch` | NL-SP-13/17 |
| apostrophe added/removed (`'s`) | `apostrophe` | NL-SP-09/10/11 |
| case-only difference | `capital` | NL-CAP-0x |
| typed has a space where target doesn't, or vice versa | `split/join` | NL-CMPD-01, NL-SP-19 |
| `n` inserted/removed after linking `e` | `tussen-n` | NL-TUSN-01 |
| `de↔het`, `die↔dat`, `deze↔dit`, `ons↔onze` | `gender` | NL-ART / NL-REL |
| `-e` added/removed on adjective | `adj-e` | NL-ADJ-0x |
| `jou↔jouw`, `u↔uw`, `me↔mijn`, `hun↔zij` | `pronoun` | NL-PRN-0x |
| `als↔dan` | `comparison` | NL-CMP-01/02 |
| Damerau-Levenshtein 1 (transposition, adjacent key on QWERTY) | `typo` | generic "typo" (keyboard heatmap) |

Store per-label counts per session. Pick the next drill sentences from §9 by the user's weakest labels (spaced repetition).

---

## 9. Dictee sentences (46, all correct Dutch)

All tokens were checked against the OpenTaal word list, and I reviewed the grammar of every sentence by hand. Focus tags show which traps each sentence trains. Use them as a regression test: **every rule must produce zero flags on all 46.**

| # | Sentence | Focus |
|---|---|---|
| 1 | Word je morgen ook om zeven uur opgehaald, of wordt je zus eerst gebracht? | je-inversion vs possessive *je* |
| 2 | Hij wordt elke dag om zes uur wakker, maar ik word pas om acht uur wakker. | wordt/word |
| 3 | Vind jij het ook raar dat hij nooit antwoordt als je hem iets vraagt? | inversion, dt |
| 4 | Wat er gisteren is gebeurd, gebeurt hopelijk nooit meer. | participle vs present |
| 5 | Ze heeft haar tekst drie keer verbeterd en nu verbetert ze die van haar broer. | verbeterd/verbetert |
| 6 | De docent beantwoordt nu de vragen die hij vorige week niet heeft beantwoord. | d-stem dt vs d |
| 7 | Wordt u al geholpen, of mag ik u even iets vragen? | *u* + t |
| 8 | Hij vond zijn sleutels pas terug nadat hij het hele huis had doorzocht. | strong past, no dt |
| 9 | Ik houd van pannenkoeken met stroop, maar mijn vriendin houdt meer van poffertjes. | houd/houdt, tussen-n |
| 10 | Het meisje dat naast mij woont, heeft een hond die heel hard blaft. | het-noun + dat |
| 11 | Het boek dat ik gisteren heb gekocht, ligt nu op de tafel in de woonkamer. | dat, ligt |
| 12 | Zij zijn groter dan wij, maar niet zo groot als onze buren. | dan/als |
| 13 | Zij hebben hun huiswerk vergeten, dus de leraar heeft hun een extra opdracht gegeven. | zij/hun |
| 14 | Hoe laat begint de film die jij zo graag wilt zien? | de-noun + die, jij wilt |
| 15 | Ik heb mijn telefoon geüpdatet en daarna alle foto's gedownload. | loan verbs, apostrophe |
| 16 | De auto's van mijn ooms staan al dagen voor het ziekenhuis geparkeerd. | 's plural, compound |
| 17 | Bij de snackbar bestel ik altijd een kaassoufflé en een portie patat. | compound (Engelse ziekte) |
| 18 | Mijn ideeën over de coördinatie van het project zijn heel anders dan die van mijn collega's. | trema, anders dan |
| 19 | We zijn in België geweest en hebben daar veel cafés en musea bezocht. | trema, cafés (no apostrophe) |
| 20 | Eigenlijk wil ik niet per se winnen, maar ik doe sowieso mee. | misspellings |
| 21 | Het enige wat ik wil, is dat iedereen te allen tijde veilig is. | enige, wat, te allen tijde |
| 22 | Beide kinderen waren ziek, dus zijn ze allebei thuisgebleven. | beide, compound verb |
| 23 | Op maandag 3 januari spreken we Nederlands, Engels en Arabisch met onze nieuwe buren. | capitals |
| 24 | Het verhaal dat jij vertelde, klopte niet; dat heb ik meteen gemerkt. | dat, past tense -de/-te |
| 25 | Hij verhuisde vorig jaar naar Utrecht en leefde daar heel rustig. | kofschip trap (z/v) |
| 26 | Wie heeft het laatste stuk taart opgegeten dat in de koelkast stond? | het stuk … dat |
| 27 | Ik zet de vaas op de tafel en ga daarna even op de bank liggen. | zetten/liggen |
| 28 | Kun jij me vertellen waar mijn tas ligt? Ik heb hem net nog gezien. | me (object) vs mijn |
| 29 | Het wordt tijd dat je je kamer opruimt, want het ziet er niet uit. | je je, opruimt |
| 30 | Mijn broer rijdt elke ochtend met de fiets naar zijn werk, ook als het regent. | rijdt |
| 31 | Ik besef dat ik te laat ben, maar de trein had vertraging. | besef (not reflexive) |
| 32 | Het nieuws dat de minister heeft verspreid, verspreidt zich razendsnel. | verspreid/verspreidt |
| 33 | Wie heeft dat verzonnen? Ik heb het nooit zo bedoeld. | participles |
| 34 | De vergadering werd uitgesteld omdat de voorzitter ziek was geworden. | werd (no dt), verb-final |
| 35 | Hoe vaak heb je dit al gezegd? Het verandert toch niets. | verandert (present) |
| 36 | Ik antwoordde meteen, maar hij heeft nog steeds niet geantwoord. | -dde past, participle |
| 37 | Je bent geïnteresseerd in talen, dus je vindt deze oefening vast leuk. | trema, je vindt |
| 38 | Morgen leg ik het pakketje bij de buren neer, want ik ben de hele dag weg. | V2 inversion, leggen |
| 39 | Zijn jullie al aan het nieuwe hoofdstuk begonnen, of moeten we nog even wachten? | adj -e, zijn-verb |
| 40 | Het kind dat zijn fiets kwijt was, vond hem terug achter de schuur. | het kind dat |
| 41 | De brandweerman redt de kat, die al uren in de boom zat. | redt (d-stem) |
| 42 | Zij lijdt al jaren aan migraine, maar ze leidt toch haar eigen bedrijf. | lijdt/leidt, ei/ij |
| 43 | Hij belooft dat hij op tijd komt, maar dat heeft hij vorige week ook beloofd. | belooft/beloofd |
| 44 | Gisteren fietste ik naar de markt en kocht ik verse groente. | kofschip, V2 |
| 45 | Het water bevroor, dus we schaatsten de hele middag op de vijver. | strong past, -te(n) |
| 46 | Ze heeft de foto geliket en daarna haar profiel geüpdatet. | loan verbs |

Extra short sentences for the "listen and type" mode (also verified):
- Omdat ik moe ben, ga ik vanavond vroeg naar bed. *(verb-final + V2)*
- Ik ken hem niet, maar ik weet wel waar hij woont. *(kennen/weten)*
- Wij hebben gisteren een groot huis met een mooie tuin gezien. *(een groot huis / een mooie tuin)*
- Het grote huis op de hoek is van een oude dame die alleen woont. *(het grote huis)*
- Ik wachtte een uur op de bus, maar hij kwam niet. *(wachtte double t)*
- Hebt u het formulier al ingevuld, of zal ik u even helpen? *(u hebt)*
- Zij zijn vorige zomer naar Marokko gegaan en zijn daar drie weken gebleven. *(zijn + gegaan/gebleven)*
- Ik ben het helemaal met je eens: dit is een heel mooie dag. *(eens without mee, heel)*

**Content idea for fun practice.** Generate *contrast pairs* from the CONF map with templates: `Het is al {participle}.` / `Het {present} elke dag.` Also *cloze-at-speed*: show the sentence with the verb gap; the user types the whole sentence; the classifier from §8 labels a `dt` miss and shows the NL/EN micro-explanation from §4.

---

## 10. Implementation checklist

1. Bundle `wordlist.txt` (gzip; ~1.36 MB) and load it lazily in a Web Worker into a `Set<string>`. Build `stripDiacritics` and lowercase indexes on load (~400k entries is fine in modern browsers).
2. Ship small JSON lexicons: `het-nouns.json` (§6.1), `de-nouns.json` (§6.2), `dstem-verbs.json` (§6.3), `strong-verbs.json` (§6.4), `conf-pairs.json` (§6.5), `zijn-participles.json` (§6.6), `split-compounds.json` (§6.7), `misspellings.json` (§6.8 + optional OpenTaal `corrections.tsv`), `adjectives.json` (§6.9), `loan-verbs.json` (§3.4).
3. Implement the tokenizer, clause splitter and tagger, then the rules in priority order: DT-01..09, PART-01..05, AUX-01, WO-01, PRN-01..03, ART-01/03/04, REL-01, ADJ-01, CMP-01..03, CAP-01..04, SP-*, CMPD-*, TUSN-01, LEX-*.
4. Unit tests: the examples from each rule row (`mustFlag`) + the 46 dictee sentences (`mustNotFlag` for all rules) + the antipattern sentences in §3.
5. Optional: call LanguageTool (`language=nl` or `nl-NL`) on demand for free writing, debounced and at most 20 req/min. Map its rule IDs (e.g. `WORDT_JE`, `HIJ_VIND`, `HET_STUK_DIE`, `GROTERE_ALS`, `HUN_HEBBEN`, `JOU_JOUW`, `BETEKENT_HEEFT`) to our categories for consistent explanations.

---

## Sources

**Primary rule references (Taalunie / Taaladvies / Onze Taal)**
- Onze Taal, Taalmaat "d, t of dt": https://onzetaal.nl/uploads/editor/Taalmaat_-_d%2C_t_of_dt.pdf
- Onze Taal, Taalmaat "'t kofschip": https://Onzetaal.nl/uploads/editor/Taalmaat_-_t_kofschip.pdf
- Onze Taal, Taalmaat "betaald of betaalt": https://onzetaal.nl/uploads/editor/Taalmaat_-_betaald_of_betaalt.pdf
- Onze Taal, Engelse werkwoorden in het Nederlands: https://onzetaal.nl/taalloket/engelse-werkwoorden
- Taaladvies.net, Vervoeging en spelling van Engelse werkwoorden: https://taaladvies.net/vervoeging-en-spelling-van-engelse-werkwoorden-in-het-nederlands-algemeen/
- Taaladvies.net, Gedeletet (uitspraak): https://taaladvies.net/gedeletet-uitspraak/
- Taaladvies.net, zich beseffen/beseffen (cited in LanguageTool rule BESEF_ME): https://taaladvies.net/taal/advies/vraag/1394/zich_beseffen_beseffen/
- Taaladvies.net (hen/hun/wie z'n entries via search): https://taaladvies.net/?p=49852 , https://taaladvies.net/?p=49856
- Team Taaladvies Vlaanderen: werkwoorden vervoegen (stam + t): https://www.vlaanderen.be/team-taaladvies/spellingregels/werkwoorden-vervoegen/werkwoorden-vervoegen-1-spelling-van-de-stam-en-de-tegenwoordige-tijd-ott
- Team Taaladvies: die/dat: https://www.vlaanderen.be/team-taaladvies/taaladviezen/die-dat ; dat/wat: https://www.vlaanderen.be/team-taaladvies/taaladviezen/dat-wat
- Team Taaladvies: het grote huis / *het groot huis: https://www.vlaanderen.be/team-taaladvies/taaladviezen/het-grote-huis-het-groot-huis ; bijvoeglijke naamwoorden verbuigen: https://www.vlaanderen.be/team-taaladvies/taaladviezen/bijvoeglijke-naamwoorden-verbuigen-verbuiging-met-of-zonder-e
- Team Taaladvies: mij/mijn: https://www.vlaanderen.be/team-taaladvies/taaladviezen/mij-mijn ; u/uw: https://www.vlaanderen.be/team-taaladvies/taaladviezen/u-uw
- Team Taaladvies: wiens / van wie / waarvan / wie z'n: https://www.vlaanderen.be/team-taaladvies/taaladviezen/wiens-van-wie-waarvan-wie-zn
- Team Taaladvies: beide/beiden: https://www.vlaanderen.be/taaladvies/taaladviezen/beide-beiden
- Team Taaladvies: enigste/enige: https://www.vlaanderen.be/taaladvies/enigste-enige
- Team Taaladvies: ervanaf/ervan af/er vanaf: https://www.vlaanderen.be/taaladvies/taaladviezen/ervanaf-ervan-af-er-vanaf-er-van-af
- Team Taaladvies: hoofdletters dagen/feestdagen: https://www.vlaanderen.be/team-taaladvies/spellingregels/hoofdletters/hoofdletters-09-namen-van-dagen-feestdagen-periodes-en-historische-gebeurtenissen ; talen: https://www.vlaanderen.be/team-taaladvies/spellingregels/hoofdletters/hoofdletters-06-namen-van-talen-en-dialecten
- Team Taaladvies: meervouden: https://www.vlaanderen.be/team-taaladvies/spellingregels/zelfstandige-naamwoorden/zelfstandige-naamwoorden-2-spelling-van-meervouden
- Team Taaladvies: Engelse woorden aaneenschrijven: https://www.vlaanderen.be/team-taaladvies/spellingregels/engelse-woorden-aaneenschrijven/engelse-woorden-aaneenschrijven-2-samenkoppelingen
- Team Taaladvies: gans/heel: https://www.vlaanderen.be/team-taaladvies/taaladviezen/gans-heel
- Onze Taal schatkamer, 1995: ruzie over de tussen-n: https://onzetaal.nl/schatkamer/lezen/taal-en-maatschappij/spelling-geschiedenis/1995-het-tweede-groene-boekje-ruzie-over-de-tussen-n
- Onze Taal 2005 (dbnl) on the tussen-n changes: https://dbnl.org/tekst/_taa014200501_01/_taa014200501_01_0204.php
- Universiteit Antwerpen (Daems/Sandra) material on tussenletters: https://medialibrary.uantwerpen.be/oldcontent/container5831/files/tussenletters.pdf
- dbnl, Heel of hele: https://dbnl.org/tekst/_taa014198201_01/_taa014198201_01_0031.php ; Het meisje die: https://dbnl.org/tekst/_taa014199901_01/_taa014199901_01_0058.php ; Het boek wat/dat: https://dbnl.org/tekst/_taa014201101_01/_taa014201101_01_0044.php
- rendement.nl, te allen tijde: https://www.rendement.nl/zakelijke-communicatie/nieuws/is-het-nou-ten-alle-tijden-of-te-allen-tijde.html

**Secondary explainers (used where primary pages were blocked by the proxy; claims cross-checked)**
- webwoordenboek.nl kenniscentrum: hebt u/heeft u https://webwoordenboek.nl/kenniscentrum/is-het-hebt-u-of-heeft-u ; je kunt/je kan https://webwoordenboek.nl/kenniscentrum/is-het-je-kunt-of-je-kan ; ik hou/houd https://webwoordenboek.nl/kenniscentrum/hoe-schrijf-je-ik-hou-van-jou ; hun hebben https://webwoordenboek.nl/kenniscentrum/is-het-hun-hebben-of-zij-hebben ; me of mijn https://webwoordenboek.nl/kenniscentrum/is-het-me-of-mijn ; dan of als https://webwoordenboek.nl/kenniscentrum/is-het-dan-of-als ; heel of hele https://webwoordenboek.nl/kenniscentrum/is-het-heel-of-hele ; D of dt https://webwoordenboek.nl/kenniscentrum/is-het-d-of-dt
- Inburgering.org grammar: dan vs als https://inburgering.org/grammar/dan-vs-als-comparison ; trema https://inburgering.org/nl/grammar/trema-dieresis ; apostrophe https://inburgering.org/nl/grammar/apostrophe ; capitals https://inburgering.org/nl/grammar/capitals ; liggen vs leggen https://inburgering.org/nl/grammar/liggen-vs-leggen ; English loans one word or two https://inburgering.org/nl/grammar/english-loans-one-word-or-two ; compound linking letters https://inburgering.org/nl/grammar/compound-linking-letters ; adjective -e https://inburgering.org/nl/grammar/adjective-no-e-ending ; word/wordt https://inburgering.org/nl/d-of-t/word-of-wordt
- goedmettekst.nl, Geliked of geliket: https://www.goedmettekst.nl/geliked-geliket/
- maxvandaag.nl, 8 veelvoorkomende taalfouten: https://www.maxvandaag.nl/sessies/themas/consument/van-stam-plus-t-tot-beter-als-8-veel-voorkomende-taalfouten/
- en.wikipedia, 't kofschip: https://en.wikipedia.org/wiki/%27t_kofschip
- babyhelp.nl summary of enigste/enige: https://babyhelp.nl/vraag-en-antwoord/is-enigste-een-woord

**Research on why d/t errors happen**
- Sandra, D., Frisson, S. & Daems, F. (1999), homophone dominance in Dutch verb spelling: https://www.clips.uantwerpen.be/~walter/papers/2000/sfddg00.pdf
- Sandra (HSN 2017), overview: https://hsnbundels.taalunie.org/wp-content/uploads/2019/09/2017_XII_taal-en-letterkunde_3_Sandra.pdf
- Verhaert et al., The Mental Lexicon 11(1): https://benjamins.com/catalog/ml.11.1.01ver
- "Waarom ook jij dt-fouten maakt": https://www.rijketeksten.org/sites/default/files/downloads/Waarom-ook-jij-dt-fouten-maakt.pdf

**Data & tools (downloaded and analysed for this report)**
- OpenTaal wordlist (BSD/CC-BY; Keurmerk Spelling): https://github.com/OpenTaal/opentaal-wordlist (files `wordlist.txt`, `elements/corrections.tsv`, `LICENSE.txt`)
- dictionary-nl (npm, Hunspell from OpenTaal): https://www.npmjs.com/package/dictionary-nl
- Dutch Plurals and Articles (`gender.tsv`, BSD-3, Utrecht CDH): https://github.com/centrefordigitalhumanities/dutch-plurals
- LanguageTool Dutch rules (LGPL-2.1): https://github.com/languagetool-org/languagetool/tree/master/languagetool-language-modules/nl/src/main/resources/org/languagetool/rules/nl (`grammar.xml`: rule groups WORDT_JE, HIJ_VIND, VINDT_IK, WORD_ZONDER_IK, IK_RIJDT, BETEKENT_HEEFT, DIT_BETEKEND_DAT, WORDT_OMHULT, HUN_HEBBEN, GROTERE_ALS, HET_STUK_DIE, HET_JE_DIE, JOU_JOUW, MEN_MIJN, PERSE, BEIDEN_BRUGGEN, BESEF_ME, HET_FIETS, ALS_IK_JIJ_WAS; `wrongWordInContext.txt`; `replace.txt`; `coherency.txt`)
- LanguageTool public HTTP API limits: https://dev.languagetool.org/public-http-api
- hermitdave FrequencyWords (nl_50k, OpenSubtitles 2018): https://github.com/hermitdave/FrequencyWords

**Uncertainty notes.** (1) Most Taaladvies/Onze Taal/Woordenlijst pages could not be fetched directly (egress proxy). Their rules are taken from search-result extracts (including extracts of the Onze Taal Taalmaat PDFs) and from secondary explainers, and cross-checked where possible. (2) The interpretation of "hoe als" is my own (§3.14). (3) Some genders vary between the Netherlands and Belgium; I took NL usage as the default. (4) I verified the existence of all verb forms and dictee tokens against OpenTaal by script; the grammatical correctness of the dictee sentences and verb paradigms comes from my own review, not from an external checker.
