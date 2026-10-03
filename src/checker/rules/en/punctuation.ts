import { LINKS, q, regexRule, type EnRule } from './shared'

// Punctuation, spacing and doubled words (rules 76, 88-94).

/** photo -> photos, baby -> babies, CD -> CDs */
const plural = (w: string) => (/[^aeiouAEIOU]y$/.test(w) && w !== w.toUpperCase() ? `${w.slice(0, -1)}ies` : `${w}s`)

export const pluralApostrophe = regexRule({
  id: 'en.plural-apostrophe',
  title: "photo's → photos",
  category: 'punctuation',
  confidence: 'high',
  re: /\b(?:\d{1,3}|two|three|four|five|six|seven|eight|nine|ten|many|several|few|these|those|more|both|lots\s+of|a\s+lot\s+of|hundreds\s+of|thousands\s+of)\s+(?!(?:people|children|men|women|teeth|feet|mice|sheep|fish|today|tomorrow|yesterday|everyone|someone|nobody|anyone|one|it|that|there|here|what|who|he|she|let|where|how)'s)(?<w>(?<n>[a-z]{3,}|[A-Z]{2,})'s)\b(?!\s+(?:going|gone|been|got|gonna|not)\b)/g,
  target: 'w',
  fix: (f) => [plural(f.g.n!)],
  keepCase: false,
  msg: (_f, fixes) => ({
    message: `No apostrophe in an English plural: ${q(fixes[0])}`,
    explanation: `English plurals never take an apostrophe: photos, euros, babies, CDs. Dutch writes foto's and auto's to keep the vowel long, English doesn't need to. If you meant something owned by several people, the apostrophe goes after the s: the teachers' room.`,
    learnMore: LINKS.pluralApostrophe,
  }),
  examples: {
    wrong: "We took many photo's.",
    flag: "photo's",
    fix: 'photos',
    right: 'We took many photos.',
    ok: ["My baby's toys are here.", "Two of Anna's friends came.", "These people's opinions differ.", "Many children's books are fun.", "The 1933 World's Fair.", "Some millionaire's going to build it.", "Are these Tom's bags?", "Mind your p's and q's: two x's."],
  },
})

export const spaceBeforePunct = regexRule({
  id: 'en.space-before-punct',
  title: 'no space before , . ! ?',
  category: 'punctuation',
  confidence: 'high',
  re: /[ \t]+(?<p>[,.;:!?])(?=\s|$)/g,
  fix: (f) => [f.g.p!],
  msg: (f) => ({
    message: `No space before ${q(f.g.p!)}`,
    explanation: `In English , . ! ? : and ; sit right after the word, with one space after them. (French puts a space before ! and ?, English doesn't.)`,
  }),
  examples: { wrong: 'Hello , how are you?', flag: ' ,', fix: ',', right: 'Hello, how are you?', ok: ['Wait ... what?', 'Nice :)'] },
})

export const spaceAfterComma = regexRule({
  id: 'en.space-after-comma',
  title: 'space after a comma',
  category: 'punctuation',
  confidence: 'high',
  re: /[,;](?=[A-Za-z])/g,
  fix: (f) => [`${f.text} `],
  msg: (f) => ({ message: `Put a space after the ${f.text === ',' ? 'comma' : 'semicolon'}`, explanation: `A comma or semicolon is followed by one space: yes, I know.` }),
  examples: { wrong: 'Yes,I know.', flag: ',', fix: ', ', right: 'Yes, I know.', ok: ['It costs 1,000 euros.'] },
})

export const spaceAfterPeriod = regexRule({
  id: 'en.space-after-period',
  title: 'space after a full stop',
  category: 'punctuation',
  confidence: 'high',
  re: /(?<=[a-z]{2})[.!?](?=[A-Z][a-z])/g,
  fix: (f) => [`${f.text} `],
  msg: { message: `Put a space after the end of a sentence`, explanation: `A new sentence starts after one space: I was tired. Then I slept.` },
  examples: { wrong: 'I was tired.Then I slept.', flag: '.', fix: '. ', right: 'I was tired. Then I slept.', ok: ['Visit example.com today.', 'He lives in the U.S. now.'] },
})

export const multiSpace = regexRule({
  id: 'en.multi-space',
  title: 'one space between words',
  category: 'typo',
  confidence: 'low',
  strictOnly: true,
  re: /(?<=\S) {2,}(?=\S)/g,
  fix: () => [' '],
  msg: { message: `One space is enough`, explanation: `Use a single space between words and after a full stop.` },
  examples: { wrong: 'I am  here.', flag: '  ', fix: ' ', right: 'I am here.', ok: [] },
})

const AR_PUNCT: Record<string, string> = { '،': ',', '؛': ';', '؟': '?' }

export const arabicPunct = regexRule({
  id: 'en.arabic-punct',
  title: 'Arabic punctuation in English',
  category: 'punctuation',
  confidence: 'high',
  re: /[،؛؟]/g,
  fix: (f) => [AR_PUNCT[f.text]],
  msg: (f, fixes) => ({
    message: `Arabic ${q(f.text)} slipped in: use ${q(fixes[0] ?? '')}`,
    explanation: `The Arabic keyboard layout types ، ؛ and ؟. English uses , ; and ?. Usually it means the keyboard was still on Arabic.`,
  }),
  examples: { wrong: 'How are you؟ I am fine، thanks.', flag: '؟', fix: '?', right: 'How are you? I am fine, thanks.', ok: [] },
})

export const doublePunct = regexRule({
  id: 'en.double-punct',
  title: 'doubled punctuation',
  category: 'punctuation',
  confidence: 'low',
  strictOnly: true,
  re: /,{2,}|(?<!\.)\.\.(?!\.)|[!?]{3,}/g,
  fix: (f) => (f.text === '..' ? ['...', '.'] : [[...new Set(f.text)].join('')]),
  msg: { message: `Doubled punctuation`, explanation: `Use one mark, or a proper ellipsis (...) if you mean a pause.` },
  examples: { wrong: 'Wait.. what?', flag: '..', fix: '...', right: 'Wait... what?', ok: ['Wait... what?'] },
})

const REPEAT_OK =
  'had had|that that|do do|her her|can can|bye bye|ha ha|no no|yes yes|so so|very very|really really|knock knock|well well|chop chop|night night|blah blah|hip hip|aye aye|tsk tsk|bla bla|haha haha|many many|is is'

export const wordRepeat = regexRule({
  id: 'en.word-repeat',
  title: 'the same word twice',
  category: 'typo',
  confidence: 'high',
  re: new RegExp(`\\b(?<w>[A-Za-z']+)\\s+\\k<w>\\b(?<!\\b(?:${REPEAT_OK.replace(/ /g, '\\s+')})\\b)`, 'gi'),
  fix: (f) => [f.g.w!],
  keepCase: false,
  msg: (f) => ({ message: `${q(f.g.w!)} twice`, explanation: `You typed the same word two times in a row. (Some doubles are fine: ‘had had’, ‘that that’.)` }),
  examples: {
    wrong: 'I went to the the shop.',
    flag: 'the the',
    fix: 'the',
    right: 'I went to the shop.',
    ok: ['If I had had time, I would have come.', 'I think that that is fine.', 'Be careful if you do do the test.'],
  },
})

export const punctuationRules: EnRule[] = [pluralApostrophe, spaceBeforePunct, spaceAfterComma, spaceAfterPeriod, multiSpace, arabicPunct, doublePunct, wordRepeat]
