// Downloads LanguageTool's English grammar.xml (LGPL-2.1) and extracts the example sentences that are marked as
// NOT triggering their rule (no `correction`, no `type`). Used only as a false-positive benchmark, not shipped.
import fs from 'fs';
const URL_XML = 'https://raw.githubusercontent.com/languagetool-org/languagetool/master/languagetool-language-modules/en/src/main/resources/org/languagetool/rules/en/grammar.xml';
const xml = await (await fetch(URL_XML)).text();
const ents = { '&apos;': "'", '&quot;': '"', '&lt;': '<', '&gt;': '>', '&amp;': '&', '&apostrophe;': "'" };
const out = new Set();
for (const m of xml.matchAll(/<example(\s[^>]*)?>([\s\S]*?)<\/example>/g)) {
  const attrs = m[1] || '';
  if (/correction|type=/.test(attrs)) continue;
  let t = m[2].replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, e => ents[e] ?? e).trim();
  if (t.length < 8 || /&[a-z]+;/.test(t)) continue;
  out.add(t);
}
fs.writeFileSync(new URL('./lt_ok_examples.json', import.meta.url), JSON.stringify([...out].sort()));
console.log('examples:', out.size);
