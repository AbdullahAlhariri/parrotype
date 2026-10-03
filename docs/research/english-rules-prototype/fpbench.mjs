import { rules } from './rules.mjs';
import { checkAAn } from './aan.mjs';
import fs from 'fs';
const ok = JSON.parse(fs.readFileSync(new URL('./lt_ok_examples.json', import.meta.url)));
const URL_RE = /\b(?:https?:\/\/|www\.)\S+|\S+@\S+\.\w+/g;
function inUrl(text, idx){ for (const m of text.matchAll(URL_RE)) if (idx>=m.index && idx < m.index+m[0].length) return true; return false; }
function findMatches(rule, text) {
  if (rule.fn) return rule.fn(text).map(x=>x.text);
  const re = new RegExp(rule.re.source, rule.re.flags);
  const out = []; let m;
  while ((m = re.exec(text))) { if (!m[0].length) re.lastIndex++; const before = text.slice(Math.max(0, m.index - 60), m.index); if (rule.notAfter && rule.notAfter.test(before)) continue; if (inUrl(text, m.index)) continue; out.push(m[0]); }
  return out;
}
const counts = {}; const samples = {};
for (const t of ok) {
  for (const r of rules) { const f = findMatches(r, t); if (f.length) { counts[r.id] = (counts[r.id]||0)+1; (samples[r.id] ||= []).push(t.slice(0,140) + '  ==> ' + f[0]); } }
  const a = checkAAn(t); if (a.length) { counts['EN_A_AN'] = (counts['EN_A_AN']||0)+1; (samples['EN_A_AN'] ||= []).push(t.slice(0,140) + ' ==> ' + a[0].text); }
}
console.log('sentences', ok.length, 'rules', rules.length);
for (const [k,v] of Object.entries(counts).sort((a,b)=>b[1]-a[1])) { console.log(v, k); for (const s of samples[k].slice(0, 6)) console.log('     ', s); }
