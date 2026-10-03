import type { TypoKind } from '@/types'

// Friendly one-sentence tips per typo label. Keys are tags or kinds; a `key.lang` entry
// (e.g. 'case.nl') overrides the generic one. `nl`/`ar` are the local-language versions.
// {prev} is replaced with the previous word of the sentence.

export interface TipText {
  en: string
  nl?: string
  ar?: string
}

export const TIPS: Record<string, TipText> = {
  /* motor slips */
  adjacent: {
    en: 'Your finger landed on the neighbouring key: aim for the middle of each key.',
    nl: 'Je vinger landde op de buurtoets: mik op het midden van elke toets.',
    ar: 'وقع إصبعك على المفتاح المجاور: صوّب نحو منتصف كل مفتاح.',
  },
  mirror: {
    en: 'The same finger on the other hand jumped in: picture the letter before you press it.',
    nl: 'Dezelfde vinger van je andere hand sprong in: zie de letter voor je voordat je drukt.',
    ar: 'تدخّل الإصبع نفسه من اليد الأخرى: تخيّل الحرف قبل أن تضغط.',
  },
  'same-finger': {
    en: 'Right finger, wrong row: let the finger reach while your hand stays still.',
    nl: 'Goede vinger, verkeerde rij: laat je vinger reiken en houd je hand stil.',
    ar: 'الإصبع صحيح والصف خاطئ: مدّ إصبعك وأبقِ يدك ثابتة.',
  },
  'hand-shift': {
    en: 'Your hand slipped one key sideways: feel for the bumps on F and J.',
    nl: 'Je hand schoof een toets opzij: voel naar de bultjes op F en J.',
    ar: 'انزلقت يدك مفتاحًا إلى الجانب: تحسّس النتوءين على مفتاحي ب وت (F وJ).',
  },
  transposition: {
    en: 'Two letters overtook each other: ease off a little on this letter pair.',
    nl: 'Twee letters haalden elkaar in: typ dit letterpaar iets rustiger.',
    ar: 'تبادل حرفان مكانيهما: خفّف سرعتك قليلًا عند هذين الحرفين.',
  },
  omission: {
    en: 'A letter went missing: keep a steady rhythm instead of rushing the word.',
    nl: 'Er viel een letter weg: houd een rustig ritme aan en jaag het woord niet af.',
    ar: 'سقط حرف: حافظ على إيقاع ثابت ولا تستعجل الكلمة.',
  },
  insertion: {
    en: 'An extra letter slipped in: finish each key cleanly before the next one.',
    nl: 'Er glipte een extra letter tussen: rond elke toets netjes af voor de volgende.',
    ar: 'تسلّل حرف زائد: أنهِ كل ضغطة جيدًا قبل التالية.',
  },
  roll: {
    en: 'Two neighbouring keys went down together: lift each finger right after its key.',
    nl: 'Twee buurtoetsen gingen tegelijk omlaag: til elke vinger meteen na zijn toets op.',
    ar: 'ضُغط مفتاحان متجاوران معًا: ارفع كل إصبع فور ضغطته.',
  },
  repeat: {
    en: 'A key bounced: lift your finger straight after pressing.',
    nl: 'Een toets stuiterde: til je vinger direct na het indrukken op.',
    ar: 'ارتدّ المفتاح فتكرّر الحرف: ارفع إصبعك مباشرة بعد الضغط.',
  },
  doubling: {
    en: 'A letter got doubled: check which letter in this word is really double.',
    nl: 'Er werd een letter verdubbeld: kijk welke letter in dit woord echt dubbel is.',
    ar: 'تكرّر حرف: تحقّق من الحرف المكرّر فعلًا في هذه الكلمة.',
  },
  'missed-double': {
    en: 'A double letter came out single: spot the double before you start the word.',
    nl: 'Een dubbele letter werd enkel: zie de dubbele letter al voordat je aan het woord begint.',
    ar: 'حرف مضاعف كُتب مرة واحدة: انتبه للحرف المضاعف قبل أن تبدأ الكلمة.',
  },
  substitution: {
    en: 'Wrong letter: keep your eyes one word ahead, not on your fingers.',
    nl: 'Verkeerde letter: houd je ogen één woord vooruit, niet op je vingers.',
    ar: 'حرف خاطئ: أبقِ عينيك على الكلمة التالية لا على أصابعك.',
  },
  phonetic: {
    en: 'These letters sound alike here: picture the written word before you type it.',
    nl: 'Deze letters klinken hier hetzelfde: zie het geschreven woord voor je voordat je typt.',
    ar: 'هذان الحرفان متقاربان في النطق: تخيّل الكلمة مكتوبة قبل كتابتها.',
  },
  vowel: {
    en: 'Unstressed vowels sound alike (separate, definitely): memorise the spelling or think of a related word.',
    nl: 'Onbeklemtoonde klinkers klinken hetzelfde (categorie, definitief): onthoud de spelling of denk aan een verwant woord.',
    ar: 'الحركات غير المشددة تتشابه في النطق: احفظ الإملاء أو فكّر في كلمة قريبة.',
  },
  garbled: {
    en: 'Several letters went astray: read the word once calmly, then type it.',
    nl: 'Meerdere letters gingen mis: lees het woord eerst rustig en typ het dan.',
    ar: 'أخطأت في عدة حروف: اقرأ الكلمة بهدوء مرة ثم اكتبها.',
  },
  skipped: {
    en: 'This word was skipped: keep your place by looking one word ahead.',
    nl: 'Dit woord werd overgeslagen: houd je plek vast door één woord vooruit te kijken.',
    ar: 'تخطّيت هذه الكلمة: حافظ على مكانك بالنظر إلى الكلمة التالية.',
  },
  'real-word': {
    en: 'You typed a different real word: read the word, then type exactly that.',
    nl: 'Je typte een ander bestaand woord: lees het woord en typ precies dat.',
    ar: 'كتبت كلمة أخرى موجودة: اقرأ الكلمة ثم اكتبها كما هي.',
  },
  shift: {
    en: 'Same key, wrong Shift: hold Shift with the other hand and let go before the next key.',
    nl: 'Zelfde toets, verkeerde Shift: houd Shift vast met je andere hand en laat los voor de volgende toets.',
    ar: 'المفتاح نفسه مع خطأ في Shift: اضغط Shift باليد الأخرى وأفلته قبل المفتاح التالي.',
  },
  'wrong-layout': {
    en: 'Your keyboard is set to another language: switch layouts (Win+Space or Ctrl+Space).',
    nl: 'Je toetsenbord staat op een andere taal: wissel van indeling (Win+spatie of Ctrl+spatie).',
    ar: 'لوحة المفاتيح على لغة أخرى: بدّل اللغة (Win+Space أو Ctrl+Space).',
  },
  'cut-short': {
    en: 'The word ended too soon: finish every letter before you press space.',
    nl: 'Het woord stopte te vroeg: typ elke letter voordat je op de spatiebalk drukt.',
    ar: 'انتهت الكلمة مبكرًا: أكمل كل الحروف قبل أن تضغط المسافة.',
  },
  space: {
    en: 'A space slipped in or went missing: rest your thumb until the word is finished.',
    nl: 'Er glipte een spatie in of er ontbrak er een: laat je duim rusten tot het woord af is.',
    ar: 'زادت مسافة أو نقصت: أرح إبهامك حتى تنتهي الكلمة.',
  },

  /* capitals and marks */
  case: {
    en: 'Watch the capitals: press Shift with the hand that is not typing the letter.',
    nl: 'Let op hoofdletters: druk Shift in met de hand die de letter niet typt.',
    ar: 'انتبه للأحرف الكبيرة: اضغط Shift باليد الأخرى.',
  },
  'case.nl': {
    en: 'Dutch capitalises names, languages and sentence starts, but not days, months or seasons.',
    nl: 'Namen, talen en het begin van een zin krijgen een hoofdletter; dagen, maanden en seizoenen niet.',
  },
  'case.en': { en: 'English capitalises names, days, months, languages and the word I.' },
  'ij-capital': {
    en: 'Dutch ij is one letter, so a capital IJ gets both: IJs, IJsland (not Ijs).',
    nl: 'De ij is één letter, dus allebei een hoofdletter: IJs, IJsland (niet Ijs).',
  },
  diacritic: {
    en: 'Dots and accents belong to the spelling: check the marks on this word.',
    nl: 'Puntjes en accenten horen bij de spelling: let op de tekens in dit woord.',
    ar: 'النقاط والعلامات جزء من الإملاء: انتبه لعلامات هذه الكلمة.',
  },
  accent: {
    en: "The accent is part of the spelling: on US-International type ' and then the vowel (é).",
    nl: "Het accent hoort bij de spelling: op US-International typ je ' en dan de klinker (é).",
  },
  trema: {
    en: 'The trema (ë) shows a new syllable starts (ideeën, België): on US-International type " and then the vowel.',
    nl: 'Het trema (ë) laat zien dat er een nieuwe lettergreep begint (ideeën, België): op US-International typ je " en dan de klinker.',
  },
  'dead-key': {
    en: 'The dead key merged with the next letter: after \' or " press Space first to get the plain sign.',
    nl: 'De dode toets smolt samen met de volgende letter: druk na \' of " eerst op de spatiebalk voor het losse teken.',
  },
  hamza: {
    en: 'The hamza is part of the spelling: on the Arabic keyboard أ is Shift+H, إ is Shift+Y and آ is Shift+N.',
    ar: 'الهمزة جزء من الإملاء: على لوحة المفاتيح العربية أ = Shift+H، وإ = Shift+Y، وآ = Shift+N.',
  },
  tashkeel: {
    en: 'The short-vowel marks (tashkeel) differ; they are optional in everyday writing.',
    ar: 'علامات التشكيل مختلفة؛ وهي اختيارية في الكتابة اليومية.',
  },

  /* word boundaries */
  split: { en: 'Check whether this is one word or two.', ar: 'انتبه لحدود الكلمة: أين تنتهي وأين تبدأ التالية.' },
  join: { en: 'Check whether this is one word or two.', ar: 'انتبه لحدود الكلمة: أين تنتهي وأين تبدأ التالية.' },
  'split.nl': {
    en: 'Dutch writes compounds as one word: ziekenhuis, telefoonnummer.',
    nl: 'Samenstellingen schrijf je aan elkaar: ziekenhuis, telefoonnummer.',
  },
  'join.nl': {
    en: 'These are separate words here: te veel, in plaats van, nog steeds.',
    nl: 'Hier zijn het losse woorden: te veel, in plaats van, nog steeds.',
  },
  'split.en': { en: 'Check whether this is one word or two: a lot, every day (each day) but everyday (ordinary).' },
  'join.en': { en: 'Check whether this is one word or two: a lot, every day (each day) but everyday (ordinary).' },
  hyphen: { en: 'Check the hyphen in this word.' },
  punctuation: {
    en: 'Punctuation counts too: look at the end of each word before you press space.',
    nl: 'Leestekens tellen ook mee: kijk naar het eind van elk woord voordat je op de spatiebalk drukt.',
    ar: 'علامات الترقيم مهمة أيضًا: انظر إلى آخر الكلمة قبل أن تضغط المسافة.',
  },
  'hyphen.nl': {
    en: 'Check the hyphen: Dutch uses one where two vowels would clash (zee-egel, auto-ongeluk).',
    nl: 'Let op het streepje: gebruik het als twee klinkers botsen (zee-egel, auto-ongeluk).',
  },

  /* Dutch */
  dt: {
    en: 'd/t ending: ik + stem (ik word), hij/zij/het + stem + t (hij wordt), and no extra t when jij follows the verb (word jij?).',
    nl: 'd/t aan het eind: ik + stam (ik word), hij/zij/het + stam + t (hij wordt), en geen extra t als jij achter het werkwoord staat (word jij?).',
  },
  'dt-ik': {
    en: 'After ik you write just the stem: ik word, ik vind.',
    nl: 'Na ik schrijf je alleen de stam: ik word, ik vind.',
  },
  'dt-inversion': {
    en: 'When jij/je comes after the verb, the t drops: word je?, vind jij?',
    nl: 'Staat jij/je achter het werkwoord, dan valt de t weg: word je?, vind jij?',
  },
  'dt-3rd': {
    en: "After '{prev}' the verb gets stem + t: hij wordt, het vindt.",
    nl: "Na '{prev}' krijgt het werkwoord stam + t: hij wordt, het vindt.",
  },
  'dt-participle': {
    en: "After '{prev}' you need the past participle: stem + d, or + t after a 't kofschip letter (gebeurd, gewerkt).",
    nl: "Na '{prev}' komt het voltooid deelwoord: stam + d, of + t na een letter uit 't kofschip (gebeurd, gewerkt).",
  },
  kofschip: {
    en: "If the stem ends in t, k, f, s, ch or p ('t kofschip), write -te / -t, otherwise -de / -d: werkte, gewerkt, woonde. Check the infinitive: leven → leefde.",
    nl: "Eindigt de stam op een letter uit 't kofschip (t, k, f, s, ch, p), dan -te / -t, anders -de / -d: werkte, gewerkt, woonde. Kijk naar het hele werkwoord: leven → leefde.",
  },
  'dt-stem': {
    en: 'Keep the d of the stem: worden → word → hij wordt, vinden → vind → hij vindt.',
    nl: 'De d van de stam blijft staan: worden → word → hij wordt, vinden → vind → hij vindt.',
  },
  'dt-prefix': {
    en: 'With be-, ge-, ver-, ont-, her- or er- verbs d and t sound alike: after is/heeft/wordt use the participle (is gebeurd), otherwise stem + t (het gebeurt).',
    nl: 'Bij werkwoorden met be-, ge-, ver-, ont-, her- of er- klinken d en t hetzelfde: na is/heeft/wordt het voltooid deelwoord (is gebeurd), anders stam + t (het gebeurt).',
  },
  'final-d': {
    en: 'A final d sounds like t: say a longer form of the word to hear it (handen → hand, goede → goed).',
    nl: 'Een d aan het eind klinkt als een t: zeg een langere vorm om hem te horen (handen → hand, goede → goed).',
  },
  'ei-ij': {
    en: 'ei and ij sound the same, so learn each word: korte ei (trein) or lange ij (tijd).',
    nl: 'ei en ij klinken hetzelfde, dus leer het per woord: korte ei (trein) of lange ij (tijd).',
  },
  'ij-y': {
    en: 'Dutch writes ij, not y: type i and then j (blijven).',
    nl: 'In het Nederlands schrijf je ij, geen y: typ i en dan j (blijven).',
  },
  'au-ou': {
    en: 'au and ou sound the same: learn which one each word takes (blauw, oud).',
    nl: 'au en ou klinken hetzelfde: leer per woord welke het is (blauw, oud).',
  },
  'g-ch': {
    en: 'g and ch sound alike: adjectives on -ig always take g (nodig, gelukkig), and ligt (lies) differs from licht (light).',
    nl: 'g en ch klinken hetzelfde: bijvoeglijke naamwoorden op -ig schrijf je met g (nodig, gelukkig), en ligt (liggen) is iets anders dan licht.',
  },
  lijk: {
    en: "-lijk sounds like 'luk' but is always written lijk: natuurlijk, eigenlijk, moeilijk.",
    nl: "-lijk klinkt als 'luk', maar je schrijft altijd lijk: natuurlijk, eigenlijk, moeilijk.",
  },
  apostrophe: { en: "Apostrophes mark missing letters (don't = do not) or ownership (the cat's bowl)." },
  elision: {
    en: "The apostrophe stands for left-out letters: zo'n (zo een), 's ochtends, m'n.",
    nl: "De apostrof staat voor weggelaten letters: zo'n (zo een), 's ochtends, m'n.",
  },
  'apostrophe.nl': {
    en: "Plural 's only after a final a, i, o, u or y (auto's, foto's); otherwise just add s.",
    nl: "Meervoud met 's alleen na een eind-a, -i, -o, -u of -y (auto's, foto's); anders gewoon -s.",
  },
  'tussen-n': {
    en: "Linking -en- in compounds when the first part's plural is only -en: pannenkoek, boekenkast.",
    nl: 'Tussen-n: schrijf -en- als het eerste deel alleen een meervoud op -en heeft: pannenkoek, boekenkast.',
  },
  'open-syllable': {
    en: 'A long vowel at the end of a syllable is written single (ko-pen), inside a closed syllable double (koop).',
    nl: 'Een lange klank aan het eind van een lettergreep schrijf je enkel (ko-pen), in een gesloten lettergreep dubbel (koop).',
  },
  'double-consonant': { en: 'Double consonants are a classic trap (until, occurred, beginning): learn them word by word.' },
  'double-consonant.nl': {
    en: 'After a short vowel the consonant doubles before an ending: jullie, gelukkig, zitten.',
    nl: 'Na een korte klank verdubbelt de medeklinker voor een uitgang: jullie, gelukkig, zitten.',
  },
  'de-het': {
    en: 'de or het belongs to each noun: diminutives (-je) are always het, plurals always de.',
    nl: 'Of het de of het is, hoort bij het woord: verkleinwoorden (-je) zijn altijd het, meervouden altijd de.',
  },
  'die-dat': {
    en: 'Use dat after het-words (het boek dat) and die after de-words and plurals (de man die).',
    nl: 'Na het-woorden gebruik je dat (het boek dat), na de-woorden en meervouden die (de man die).',
  },
  'jou-jouw': {
    en: 'jouw/uw goes before a noun (jouw boek); jou/u stands alone (voor jou).',
    nl: 'jouw/uw staat voor een zelfstandig naamwoord (jouw boek); jou/u staat alleen (voor jou).',
  },
  'me-mijn': {
    en: "me is never possessive: write mijn or m'n (mijn boek).",
    nl: "me is nooit bezittelijk: schrijf mijn of m'n (mijn boek).",
  },
  'hun-hen': {
    en: 'hun is never the subject: write zij/ze hebben, not hun hebben.',
    nl: 'hun is nooit onderwerp: schrijf zij/ze hebben, niet hun hebben.',
  },
  'als-dan': {
    en: 'Use dan for a difference (groter dan) and als for sameness (even groot als).',
    nl: 'Gebruik dan bij een verschil (groter dan) en als bij gelijkheid (even groot als).',
  },
  'word-order': {
    en: 'This word is in the wrong place. Remember: in a Dutch main clause the verb comes second (Gisteren ging ik), in a subclause it goes last (omdat ik ziek ben).',
    nl: 'Dit woord staat op de verkeerde plek. Let op: in een hoofdzin staat de persoonsvorm op de tweede plaats (Gisteren ging ik), in een bijzin achteraan (omdat ik ziek ben).',
  },
  'word-order.en': { en: 'This word is in the wrong place: check the word order of the sentence.' },
  'word-order.ar': { en: 'This word is in the wrong place: check the word order of the sentence.', ar: 'هذه الكلمة في غير موضعها: انتبه لترتيب الكلمات في الجملة.' },
  lexical: {
    en: 'These two words are easy to mix up: check which meaning fits the sentence.',
    nl: 'Deze twee woorden worden vaak verwisseld: kijk welke betekenis in de zin past.',
  },

  /* English */
  homophone: { en: 'These words sound the same but mean different things: check which meaning fits.' },
  'its-its': { en: "it's = it is or it has; its = belonging to it (the dog wags its tail)." },
  'ie-ei': { en: 'i before e, except after c (believe, receive), with exceptions like weird and their.' },

  /* Arabic */
  'taa-marbuta': {
    en: 'Taa marbuta (ة) ends many feminine words; it sounds like t when the next word is joined to it.',
    ar: 'التاء المربوطة (ة) تُلفظ تاءً عند وصل الكلمة بما بعدها وهاءً عند الوقف (مدرسة).',
  },
  'hidden-alif': {
    en: 'Some words keep a pronounced alif out of writing: هذا، ذلك، لكن، الله.',
    ar: 'بعض الكلمات تُنطق فيها الألف ولا تُكتب: هذا، ذلك، لكن، الله.',
  },
  'waw-alif': {
    en: "Verbs with the plural waw end in وا (كتبوا، اذهبوا); plural nouns don't take the alif (مهندسو المدينة).",
    ar: 'واو الجماعة في الفعل تتبعها ألف فارقة (كتبوا، اذهبوا)، ولا تُكتب الألف بعد واو جمع المذكر في الأسماء (مهندسو المدينة).',
  },
  'alif-maqsura': {
    en: 'Alif maqsura (ى) has no dots and ends words like على and إلى; ي has two dots below.',
    ar: 'الألف المقصورة (ى) بلا نقاط وتأتي في آخر كلمات مثل على وإلى، أما الياء (ي) فتحتها نقطتان.',
  },
}

/** Every finer label classifyTypo can attach (TypoLabel.tag). */
export const TYPO_TAGS = [
  // motor
  'neighbour', 'mirror', 'same-finger', 'hand-shift', 'repeat', 'roll', 'cross-hand', 'same-hand', 'wrong-double', 'cut-short', 'dead-key',
  'shift', 'wrong-layout',
  // general spelling
  'phonetic', 'vowel', 'real-word', 'capital', 'split-join', 'hyphen', 'punctuation', 'accent', 'trema', 'apostrophe', 'double-consonant',
  // Dutch
  'dt', 'final-d', 'kofschip', 'ei-ij', 'ij-y', 'au-ou', 'g-ch', 'lijk', 'tussen-n', 'open-syllable',
  'de-het', 'die-dat', 'jou-jouw', 'me-mijn', 'hun-hen', 'als-dan', 'lexical', 'word-order',
  // English
  'its-its', 'homophone', 'ie-ei',
  // Arabic
  'hamza', 'tashkeel', 'taa-marbuta', 'alif-maqsura', 'hidden-alif', 'waw-alif',
] as const

export type TypoTag = (typeof TYPO_TAGS)[number]

/** Short display names for typo kinds and tags (for stats and result screens). */
export const NAMES: Record<TypoTag | TypoKind, TipText> = {
  /* kinds */
  adjacent: { en: 'Neighbour key', nl: 'Buurtoets', ar: 'مفتاح مجاور' },
  transposition: { en: 'Swapped letters', nl: 'Letters omgedraaid', ar: 'تبديل حرفين' },
  omission: { en: 'Missed letter', nl: 'Letter vergeten', ar: 'حرف ناقص' },
  insertion: { en: 'Extra letter', nl: 'Extra letter', ar: 'حرف زائد' },
  doubling: { en: 'Doubled letter', nl: 'Letter verdubbeld', ar: 'حرف مكرّر' },
  'missed-double': { en: 'Missed double letter', nl: 'Dubbele letter vergeten', ar: 'حرف مضاعف ناقص' },
  substitution: { en: 'Wrong letter', nl: 'Verkeerde letter', ar: 'حرف خاطئ' },
  case: { en: 'Capital letter', nl: 'Hoofdletter' },
  diacritic: { en: 'Accent or mark', nl: 'Accent of trema', ar: 'علامة' },
  space: { en: 'Space', nl: 'Spatie', ar: 'مسافة' },
  spelling: { en: 'Spelling', nl: 'Spelling', ar: 'إملاء' },
  skipped: { en: 'Skipped word', nl: 'Woord overgeslagen', ar: 'كلمة متروكة' },
  /* motor tags */
  neighbour: { en: 'Neighbour key', nl: 'Buurtoets', ar: 'مفتاح مجاور' },
  mirror: { en: 'Mirror key (other hand)', nl: 'Spiegeltoets (andere hand)', ar: 'المفتاح المقابل' },
  'same-finger': { en: 'Same finger, wrong row', nl: 'Zelfde vinger, verkeerde rij', ar: 'الإصبع نفسه، صف آخر' },
  'hand-shift': { en: 'Hands shifted', nl: 'Handen verschoven', ar: 'انزياح اليد' },
  repeat: { en: 'Key bounce', nl: 'Dubbel aangeslagen', ar: 'ضغطة مكرّرة' },
  roll: { en: 'Extra neighbour key', nl: 'Extra buurtoets', ar: 'مفتاح مجاور زائد' },
  'cross-hand': { en: 'Swapped letters (two hands)', nl: 'Omgedraaid (twee handen)', ar: 'تبديل حرفين' },
  'same-hand': { en: 'Swapped letters (one hand)', nl: 'Omgedraaid (één hand)', ar: 'تبديل حرفين' },
  'wrong-double': { en: 'Wrong letter doubled', nl: 'Verkeerde letter dubbel', ar: 'تكرار الحرف الخطأ' },
  shift: { en: 'Shift slip', nl: 'Shift-fout', ar: 'خطأ في Shift' },
  'wrong-layout': { en: 'Wrong keyboard layout', nl: 'Verkeerde toetsenbordindeling', ar: 'لغة لوحة المفاتيح' },
  'cut-short': { en: 'Word cut short', nl: 'Woord te vroeg af', ar: 'كلمة ناقصة' },
  'dead-key': { en: 'Dead key', nl: 'Dode toets' },
  phonetic: { en: 'Sound-alike letters', nl: 'Klankgelijke letters', ar: 'حروف متشابهة النطق' },
  vowel: { en: 'Unstressed vowel', nl: 'Onbeklemtoonde klinker' },
  'real-word': { en: 'Other real word', nl: 'Ander bestaand woord', ar: 'كلمة أخرى' },
  capital: { en: 'Capital letter', nl: 'Hoofdletter' },
  'split-join': { en: 'One word or two', nl: 'Aan elkaar of los', ar: 'كلمة أم كلمتان' },
  hyphen: { en: 'Hyphen', nl: 'Streepje' },
  punctuation: { en: 'Punctuation', nl: 'Leestekens', ar: 'علامات الترقيم' },
  accent: { en: 'Accent', nl: 'Accent' },
  trema: { en: 'Trema', nl: 'Trema' },
  /* Dutch */
  dt: { en: 'd/t ending', nl: 'd/t-regel' },
  'final-d': { en: 'Final d (sounds like t)', nl: 'Eind-d (klinkt als t)' },
  kofschip: { en: "Past tense ('t kofschip)", nl: "Verleden tijd ('t kofschip)" },
  'ei-ij': { en: 'ei / ij', nl: 'ei / ij' },
  'ij-y': { en: 'ij / y', nl: 'ij / y' },
  'au-ou': { en: 'au / ou', nl: 'au / ou' },
  'g-ch': { en: 'g / ch', nl: 'g / ch' },
  lijk: { en: '-lijk', nl: '-lijk' },
  apostrophe: { en: 'Apostrophe', nl: 'Apostrof' },
  'tussen-n': { en: 'Linking -en-', nl: 'Tussen-n' },
  'open-syllable': { en: 'Open syllable', nl: 'Open lettergreep' },
  'double-consonant': { en: 'Double consonant', nl: 'Dubbele medeklinker' },
  'de-het': { en: 'de / het', nl: 'de / het' },
  'die-dat': { en: 'die / dat', nl: 'die / dat' },
  'jou-jouw': { en: 'jou / jouw', nl: 'jou / jouw' },
  'me-mijn': { en: 'me / mijn', nl: 'me / mijn' },
  'hun-hen': { en: 'hun / zij', nl: 'hun / zij' },
  'als-dan': { en: 'als / dan', nl: 'als / dan' },
  lexical: { en: 'Word mix-up', nl: 'Woordverwarring' },
  'word-order': { en: 'Word order', nl: 'Woordvolgorde', ar: 'ترتيب الكلمات' },
  /* English */
  'its-its': { en: "its / it's" },
  homophone: { en: 'Sound-alike word' },
  'ie-ei': { en: 'ie / ei' },
  /* Arabic */
  hamza: { en: 'Hamza', ar: 'الهمزة' },
  tashkeel: { en: 'Tashkeel', ar: 'التشكيل' },
  'taa-marbuta': { en: 'Taa marbuta', ar: 'التاء المربوطة' },
  'alif-maqsura': { en: 'Alif maqsura', ar: 'الألف المقصورة' },
  'hidden-alif': { en: 'Hidden alif', ar: 'الألف المحذوفة' },
  'waw-alif': { en: "Waw al-jama'a + alif", ar: 'الألف الفارقة' },
}
