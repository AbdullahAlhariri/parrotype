import { rules } from './rules.mjs';
import { checkAAn, expectedArticle } from './aan.mjs';

function findMatches(rule, text) {
  if (rule.fn) return rule.fn(text);
  const re = new RegExp(rule.re.source, rule.re.flags.includes('g') ? rule.re.flags : rule.re.flags + 'g');
  const out = [];
  let m;
  while ((m = re.exec(text))) {
    if (m[0].length === 0) { re.lastIndex++; }
    const before = text.slice(Math.max(0, m.index - 60), m.index);
    if (rule.notAfter && rule.notAfter.test(before)) continue;
    out.push({ index: m.index, text: m[0] });
  }
  return out;
}

let fail = 0, pass = 0;
const ids = new Set();
for (const r of rules) {
  if (ids.has(r.id)) { console.log('DUP ID', r.id); fail++; }
  ids.add(r.id);
  const w = findMatches(r, r.wrong);
  if (w.length === 0) { console.log(`FAIL [${r.id}] did not fire on wrong: ${r.wrong}`); fail++; } else pass++;
  for (const ok of [r.right, ...(r.ok || [])]) {
    const f = findMatches(r, ok);
    if (f.length) { console.log(`FAIL [${r.id}] false positive on: ${ok}  -> ${JSON.stringify(f.map(x => x.text))}`); fail++; } else pass++;
  }
}

// a/an tests
const aanCases = [
  ['a hour', 'an'], ['an university', 'a'], ['an European', 'a'], ['a apple', 'an'], ['an one-time', 'a'],
  ['a MBA', 'an'], ['a FBI agent', 'an'], ['an UFO', 'a'], ['a honest', 'an'], ['a 8-year-old', 'an'],
  ['an useful', 'a'], ['a umbrella', 'an'], ['an uniform', 'a'], ['a unimportant', 'an'], ['a uninteresting', 'an'],
  ['an unique', 'a'], ['a ugly', 'an'], ['an user', 'a'], ['a 11-year-old', 'an'], ['an 100', 'a'], ['a NASA', null], ['a SQL', null],
  ['an URL', 'a'], ['a honour', 'an'], ['an Utrecht', 'a'], ['a umpire', 'an'], ['a utter', 'an'], ['an once', 'a'],
];
for (const [t, exp] of aanCases) {
  const r = checkAAn(t + ' thing.');
  const got = r.length ? r[0].fix.split(' ')[0].toLowerCase() : null;
  if (got !== exp) { console.log(`FAIL a/an "${t}" expected fix ${exp} got ${got}`); fail++; } else pass++;
}
const aanOk = ['It took an hour.', 'She is a university student.', 'A European city.', 'Vitamin A is good.', 'Plan A is fine.',
  'He has an MBA.', 'A one-way ticket.', 'A historic day.', 'An historic day.', 'I woke at 7 a.m. today.', 'An 18-year-old won.', 'A UFO landed.', 'A useful tip.', 'An honest man.'];
for (const t of aanOk) { const r = checkAAn(t); if (r.length) { console.log(`FAIL a/an FP: ${t} -> ${JSON.stringify(r)}`); fail++; } else pass++; }

// Cross-rule check: no rule should fire on clean dictation sentences
import { sentences } from './dictation.mjs';
for (const s of sentences) {
  for (const r of rules) {
    const f = findMatches(r, s.text);
    if (f.length) { console.log(`FP-on-dictation [${r.id}] ${s.text} -> ${JSON.stringify(f.map(x => x.text))}`); fail++; }
  }
  const aa = checkAAn(s.text); if (aa.length) { console.log(`FP-on-dictation [a/an] ${s.text}`); fail++; }
}
console.log(`rules=${rules.length} pass=${pass} fail=${fail}`);
