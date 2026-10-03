import type { RuleContext } from '@/types'
import { cap, LINKS, q, regexRule, type EnRule } from './shared'

/** offset is the first word of a sentence according to the core sentence splitter */
function startsSentence(ctx: RuleContext, offset: number) {
  const s = ctx.sentences.find((x) => offset >= x.start && offset < x.end)
  return !!s && s.tokens.find((t) => t.isWord)?.start === offset
}

// Capital letters (rules 39-43). Arabic has no capitals at all, and Dutch writes days, months and 'ik'
// in lowercase, so these come up a lot when switching languages.

export const iLower = regexRule({
  id: 'en.i-lower',
  title: 'i → I',
  category: 'capitalization',
  confidence: 'high',
  re: /(?<![\p{L}\p{N}_'.(-])i(?='(?:m|ve|ll|d)\b|(?![\p{L}\p{N}_.')-])(?!\s+(?:is|equals|be)\b|\s*[=<>+]|[^.!?]{0,15}\bii\b))/gu,
  notAfter: /(?:\b(?:where|letter|short|long|dotted|variable|index|the|an?|of|to|let|each|every|for|here|equals|times|plus|minus)|[=+<>(])\s*,?\s*$/i,
  fix: () => ['I'],
  msg: {
    message: `${q('I')} is always a capital`,
    explanation: `In English the word I is a capital letter wherever it sits in the sentence. Dutch ‘ik’ isn't, and Arabic has no capitals at all, so this one is easy to miss.`,
    learnMore: LINKS.capitals,
  },
  examples: {
    wrong: "Yesterday i went home and i'm tired.",
    flag: 'i',
    fix: 'I',
    right: "Yesterday I went home and I'm tired.",
    ok: ['That is, i.e., the end.', 'See point (i) above.', 'Bahāʼi is a religion.', 'Children learn the short i sound.', 'Change a to i in the word.', 'Let i be the index.', 'Here, i is a number.', 'Tests: i breath, ii heartbeat.'],
  },
})

export const sentenceStartCap = regexRule({
  id: 'en.sentence-start-cap',
  title: 'capital at the start of a sentence',
  category: 'capitalization',
  confidence: 'high',
  re: /(?<=^|(?<!\.)[.!?]\s+)(?<!\b(?:e\.g|i\.e|etc|vs|approx|Mr|Mrs|Ms|Dr|St)\.\s+)(?!(?:iPhones?|iPads?|iOS|eBay|macOS)\b)[a-z][\p{L}\p{M}'-]*/gu,
  notAfter:
    /(?:\b[A-Za-z]\.(?:[A-Za-z]\.)*|\b(?:Corp|Inc|Ltd|Co|Jr|Sr|St|Mt|No|Fig|approx|Dept|Univ|Ave|Rd|vs|etc|Mr|Mrs|Ms|Dr|Prof|Gen|Sgt|Capt|Lt|Col|Gov|Sen|Rep|ft|in|cm|mm|km|kg|lbs?|oz|sec|[Mm]sec|min|hrs?|PhD|cf|ca|al|eds?|vol|pp|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept?|Oct|Nov|Dec|Bros|Rev|Hon|est|dept|govt|misc|tel|ext|nos?|ref|figs?|eqs?|ch|para|resp|incl|excl|avg|max|viz|ibid)\.)\s+$/,
  // the shared sentence splitter must agree that a sentence starts here (abbreviations, initials, quotes)
  when: (f) => startsSentence(f.ctx, f.start),
  fix: (f) => [cap(f.text)],
  keepCase: false,
  msg: (_f, fixes) => ({
    message: `Start the sentence with a capital: ${q(fixes[0])}`,
    explanation: `Every sentence starts with a capital letter. Arabic script has no capitals, so this habit takes a while to build.`,
  }),
  examples: {
    wrong: 'I was tired. then I slept.',
    flag: 'then',
    fix: 'Then',
    right: 'I was tired. Then I slept.',
    ok: ['We bought fruit, e.g. apples.', 'I love my iPhone. iPhones are nice.', '"Am I late?" she asked.', 'Wait.. and then?', 'It starts at 5 a.m. tomorrow.', 'Exports from the U.S. boomed.', 'Acme Corp. must pay.'],
  },
})

export const dayCap = regexRule({
  id: 'en.day-cap',
  title: 'days get a capital',
  category: 'capitalization',
  confidence: 'high',
  re: /\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)s?\b/g,
  fix: (f) => [cap(f.text)],
  msg: (_f, fixes) => ({
    message: `Days get a capital in English: ${q(fixes[0])}`,
    explanation: `English writes the days of the week with a capital letter: Monday, Friday. Dutch writes ‘maandag’ in lowercase, which is where the habit comes from.`,
    learnMore: LINKS.capitals,
  }),
  examples: { wrong: 'See you on monday.', flag: 'monday', fix: 'Monday', right: 'See you on Monday.', ok: ['See you on Monday.'] },
})

export const monthCap = regexRule({
  id: 'en.month-cap',
  title: 'months get a capital',
  category: 'capitalization',
  confidence: 'high',
  re: /\b(?:january|february|april|june|july|september|october|november|december)\b|(?<=\b(?:in|since|until|till|from|early|late|mid|last|next|before|after|during|\d{1,2}(?:st|nd|rd|th)?)\s+)(?:march|may|august)\b(?!\s+(?:be|have|not|also|still|well|never|need|want|go|come|help|I|you|we|they|he|she|it)\b)/g,
  fix: (f) => [cap(f.text)],
  msg: (_f, fixes) => ({
    message: `Months get a capital in English: ${q(fixes[0])}`,
    explanation: `English writes months with a capital letter: in July, on 3 March. Dutch writes ‘juli’ in lowercase.`,
    learnMore: LINKS.capitals,
  }),
  examples: { wrong: 'My birthday is in july.', flag: 'july', fix: 'July', right: 'My birthday is in July.', ok: ['It may rain.', 'We will march on.', 'Before may I ask...'] },
})

export const langCap = regexRule({
  id: 'en.lang-cap',
  title: 'languages and nationalities get a capital',
  category: 'capitalization',
  confidence: 'high',
  re: /\b(?:english|dutch|arabic|french(?!\s+(?:fr(?:y|ies)|toast|doors?|windows?|press|kiss|horn|braids?)\b)|german|spanish|italian|portuguese|russian|chinese|japanese|korean|hindi|urdu|persian|farsi|hebrew|greek|swedish|danish|flemish|frisian|moroccan|egyptian|syrian|iraqi|saudi|lebanese|palestinian|tunisian|algerian|somali|american|british|european|african|asian|belgian|islam|muslim|christian|ramadan|christmas|easter)\b/g,
  fix: (f) => [cap(f.text)],
  msg: (_f, fixes) => ({
    message: `Languages, nationalities and religions get a capital: ${q(fixes[0])}`,
    explanation: `English capitalises languages, peoples, religions and their holidays: Dutch, Arabic, Muslim, Ramadan. Arabic has no capital letters, which makes this one easy to forget.`,
  }),
  examples: { wrong: 'I speak dutch and arabic.', flag: 'dutch', fix: 'Dutch', right: 'I speak Dutch and Arabic.', ok: ['Please polish the table.', 'We had turkey.', 'I ate french fries.'] },
})

export const capitalRules: EnRule[] = [iLower, sentenceStartCap, dayCap, monthCap, langCap]
