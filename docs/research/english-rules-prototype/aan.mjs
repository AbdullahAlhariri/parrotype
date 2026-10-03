// a/an by SOUND (prototype). Returns 'a' | 'an' | null (null = both acceptable / unknown).
// Exception idea + word lists modelled on LanguageTool det_a.txt / det_an.txt (LGPL).
const BOTH = new Set(['historic', 'historical', 'herb', 'herbs', 'herbal', 'hotel', 'habitual', 'homage', 'heroic', 'hysterical', 'sql']);
// consonant-sound words that start with a vowel letter
const A_PREFIX = /^(?:eu|ewe|one(?!r)|once|uk|ub|ug(?!l)|ura|ure|uri|uro|usa|use|usu|ut(?![tm])|uv|uni(?![mndl]|ns|nf|nh))/i;
// vowel-sound words that start with a consonant letter (silent h)
const AN_PREFIX = /^(?:hour|honest|honou?r|heir)/i;
// acronyms pronounced as words (use normal word rules)
const WORD_ACRONYMS = new Set(['NASA', 'NATO', 'UNESCO', 'UNICEF', 'FIFA', 'UEFA', 'OPEC', 'AIDS', 'LASER', 'RADAR', 'SCUBA', 'PIN', 'SIM', 'GIF', 'JPEG', 'ASAP', 'COVID', 'IKEA', 'ISIS', 'OPEN']);
// Initialisms read letter by letter even though they contain vowels
const INITIALISMS = new Set(['MBA','FBI','MRI','HIV','SMS','NGO','HR','SUV','ATM','FAQ','UFO','URL','USB','EU','UN','UK','US','USA','LED','RSVP','MP','MC','HTML','XML','SOS','IOU','OK','IQ','ID','AI','TV','PC','CD','DVD','BBC','CEO','MSc','BSc','PhD','ISP','IT','MA','BA','LLM','ICU','ER','IOC','UEFA']);
// In the app, replace this with the real spelling dictionary: an all-caps token that is a normal word (LOT, LEGAL) is read as a word.
export let isDictionaryWord = (w) => ['lot','legal','laps','big','new','huge','free','must','never','only','one','all','any','own','not','old','open','other'].includes(w);
export function setDictionary(fn) { isDictionaryWord = fn; }
const VOWEL_SOUND_LETTERS = new Set(['A', 'E', 'F', 'H', 'I', 'L', 'M', 'N', 'O', 'R', 'S', 'X']);

export function expectedArticle(raw) {
  const word = raw.replace(/^["'“‘(]+/, '').replace(/[^A-Za-z0-9'-].*$/, '');
  if (!word) return null;
  const lower = word.toLowerCase();
  const head = lower.split('-')[0];
  if (BOTH.has(head)) return null;
  if (/^\d/.test(word)) {
    if (/^8/.test(word) || /^(11|18)(?!\d)/.test(word) || /^(11|18),?\d{3}(?!\d)/.test(word)) return 'an';
    return 'a';
  }
  const lettersOnly = word.replace(/[^A-Za-z]/g, '');
  const allCaps = lettersOnly.length >= 2 && lettersOnly === lettersOnly.toUpperCase();
  const isAcronym = allCaps && !WORD_ACRONYMS.has(lettersOnly) && (INITIALISMS.has(lettersOnly) || !/[AEIOUY]/.test(lettersOnly) || !isDictionaryWord(lettersOnly.toLowerCase()));
  if (isAcronym || (lettersOnly.length === 1 && /^[A-Z]$/.test(word))) {
    return VOWEL_SOUND_LETTERS.has(lettersOnly[0]) ? 'an' : 'a';
  }
  if (AN_PREFIX.test(head)) return 'an';
  if (A_PREFIX.test(head)) return 'a';
  return /^[aeiou]/i.test(head) ? 'an' : 'a';
}

const LABEL_BEFORE = /\b(vitamin|plan|grade|type|class|section|option|exhibit|part|appendix|annex|schedule|article|figure|table|step|phase|series|case|version|letter|point|row|column|group|team|category|level|size|block|platform|gate|model|width|length|height|set|matrix|vector|constant|variable)\s*$/i;
// if the word AFTER 'a' is one of these, 'a' is a symbol/variable, not an article
const STOP_AFTER = new Set(['a','an','be','is','are','was','were','and','or','has','have','had','can','could','will','would','should','may','might','must','to','of','in','on','at','for','with','by','as','than','then','if','b','c','d','x','y','z','=']);

export function checkAAn(text) {
  const out = [];
  const re = /\b(a|an)\s+(["'“‘(]?[A-Za-z0-9][\w'-]*)/gi;
  let m;
  while ((m = re.exec(text))) {
    const art = m[1];
    const before = text.slice(Math.max(0, m.index - 20), m.index);
    if (LABEL_BEFORE.test(before)) continue;            // "Plan A is", "vitamin A and"
    if (STOP_AFTER.has(m[2].toLowerCase())) continue;     // "where a is non-zero", "Annex A are"
    const exp = expectedArticle(m[2]);
    if (!exp || exp === art.toLowerCase()) continue;
    const fixed = art[0] === art[0].toUpperCase() ? exp[0].toUpperCase() + exp.slice(1) : exp;
    out.push({ index: m.index, text: m[0], fix: `${fixed} ${m[2]}` });
    re.lastIndex = m.index + art.length; // allow overlapping next check
  }
  return out;
}
