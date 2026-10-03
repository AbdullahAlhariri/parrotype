import { rules } from './rules.mjs';
const esc = s => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
const code = s => '`' + esc(s).replace(/`/g, "'") + '`';
let n = 0;
const rows = [];
rows.push('| # | ID | Type · L1 · severity | Pattern (JS RegExp) / logic | Wrong | Right | Friendly explanation | FP risk | Basis |');
rows.push('|---|---|---|---|---|---|---|---|---|');
for (const r of rules) {
  n++;
  let pat;
  if (r.fn) pat = 'function: split into sentences; count clause-chaining joins `/\\b(?:and\\|so\\|but\\|then)\\s+(?:then\\s+)?(?:I\\|we\\|he\\|she\\|they\\|it\\|you\\|there)\\b/gi`; hint if >= 3 (or >= 2 and sentence >= 45 words)';
  else {
    pat = code('/' + r.re.source + '/' + r.re.flags);
    if (r.notAfter) pat += ' + skip if the 60 chars before match ' + code('/' + r.notAfter.source.slice(0, 160) + (r.notAfter.source.length > 160 ? '...' : '') + '/');
  }
  rows.push(`| ${n} | ${r.id} | ${r.cat} · ${r.l1} · ${r.sev} | ${pat} | ${esc(r.wrong)} | ${esc(r.right)} | ${esc(r.msg)} | ${r.fp} | ${esc(r.src)} |`);
}
console.log(rows.join('\n'));
