import type { RuleHit } from '@/types'
import { expectedArticle } from './aan'
import { LINKS, lowerKeepI, q, regexRule, SENT_START, type EnRule } from './shared'

// Patterns that come from Arabic (rules 82-87, 95): no present-tense 'to be', no indefinite article,
// 'the' for general ideas, statement order in questions, long chains of 'and'.

const COPULA: Record<string, string> = { i: 'am', he: 'is', she: 'is', it: 'is', this: 'is', that: 'is', we: 'are', they: 'are', you: 'are' }

export const copulaOmission = regexRule({
  id: 'en.copula-omission',
  title: 'he very tall → he is very tall',
  category: 'grammar',
  confidence: 'medium',
  re: new RegExp(
    `(?:\\b(?<s1>he|she|I|we|they)|(?:${SENT_START}|\\b(?:and|but|because|so|when|if)\\s+)(?<s2>it|you|this|that))\\s+(?:very|so|too|really)\\s+(?:happy|sad|tired|big|small|good|bad|hungry|busy|ready|late|beautiful|nice|kind|tall|short|old|young|angry|cold|hot|expensive|cheap|important|difficult|easy|interesting|boring|smart|clever|funny|strong|fast|slow|rich|poor|sick|ill)\\b`,
    'gi',
  ),
  notAfter: /\b(?:am|is|are|was|were|isn't|aren't|wasn't|weren't|how|as|that|\w+'s)\s*$/i,
  target: ['s1', 's2'],
  fix: (f) => {
    const s = (f.g.s1 ?? f.g.s2)!
    return [`${s} ${COPULA[s.toLowerCase()]}`]
  },
  msg: (f) => {
    const s = (f.g.s1 ?? f.g.s2)!
    return {
      message: `English needs a verb here: ${q(`${lowerKeepI(s)} ${COPULA[s.toLowerCase()]}`)}`,
      explanation: `English always needs am, is or are in sentences like this: he is very tall. Arabic has no present-tense ‘to be’ (هو طويل جدا), so it is easy to leave out.`,
    }
  },
  examples: {
    wrong: 'He very tall and strong.',
    flag: 'He',
    fix: 'He is',
    right: 'He is very tall and strong.',
    ok: ['I found it very hard.', 'That made me so happy.', 'She is very tired.', "Don't cut it too short.", 'Why am I so sad?', 'Making it very difficult to stop.', "Why's it so cold?"],
  },
})

export const copulaOmissionArticle = regexRule({
  id: 'en.copula-omission-art',
  title: 'she a teacher → she is a teacher',
  category: 'grammar',
  confidence: 'medium',
  re: new RegExp(`${SENT_START}(?<s>He|She|It)(?=\\s+(?:a|an)\\s+\\w)`, 'g'),
  target: 's',
  fix: (f) => [`${f.g.s} is`],
  msg: (f) => ({
    message: `Add ${q('is')}: ${q(`${f.g.s} is a...`)}`,
    explanation: `English needs is between the person and what they are: she is a teacher. Arabic (هي معلمة) doesn't.`,
  }),
  examples: { wrong: 'She a teacher.', flag: 'She', fix: 'She is', right: 'She is a teacher.', ok: ['Is she a teacher?', 'Give her a hand.', 'I bought a book and he a ruler.'] },
})

const articleFor = (noun: string) => `${expectedArticle(noun) ?? 'a'} ${noun}`

export const missingArticleJob = regexRule({
  id: 'en.missing-article-job',
  title: 'she is engineer → she is an engineer',
  category: 'grammar',
  confidence: 'medium',
  re: /\b(?:I'm|am|is|are|was|were|he's|she's|you're|became|become|work\s+as|works\s+as|worked\s+as|want\s+to\s+be|wants\s+to\s+be)\s+(?<j>teacher|doctor|student|engineer|nurse|lawyer|dentist|pilot|waiter|waitress|cook|chef|farmer|programmer|designer|developer|mechanic|scientist|architect|pharmacist|accountant|journalist|driver|cleaner|writer|singer|artist)(?=\s*[.!?,;]|\s*$|\s+(?:and|but|at|in|for|with|from|who|because|now|too|here|there)\b)/gi,
  target: 'j',
  fix: (f) => [articleFor(f.g.j!.toLowerCase())],
  msg: (_f, fixes) => ({
    message: `Jobs need ${q('a')} or ${q('an')}: ${q(fixes[0] ?? '')}`,
    explanation: `One person doing a job gets a or an: she is an engineer, he works as a nurse. Arabic has no word for a/an, so it often goes missing.`,
  }),
  examples: {
    wrong: 'My sister is engineer.',
    flag: 'engineer',
    fix: 'an engineer',
    right: 'My sister is an engineer.',
    ok: ['She is a teacher.', 'He is student-friendly.', 'She was teacher of the year.', 'The topic is student behaviour.', 'What is engineering?'],
  },
})

export const missingArticleHave = regexRule({
  id: 'en.missing-article-have',
  title: 'I have question → I have a question',
  category: 'grammar',
  confidence: 'medium',
  re: /\b(?:I|you|we|they|he|she)\s+(?:have|has|had|need|needs|want|wants|bought|buy|own|owns)\s+(?<n>car|dog|cat|house|brother|sister|question|problem|idea|job|computer|laptop|phone|bike|bicycle|appointment|meeting|exam|test|headache|cold)\b(?=\s*[.!?,;]|\s*$|\s+(?:and|but|because|so|in|at|with|for|about|from|to|on|that|today|tomorrow|yesterday|now)\b)/gi,
  target: 'n',
  fix: (f) => [articleFor(f.g.n!.toLowerCase())],
  msg: (_f, fixes) => ({
    message: `One countable thing needs ${q('a')} or ${q('an')}: ${q(fixes[0] ?? '')}`,
    explanation: `A single countable thing takes a or an: a car, a question, an idea. Arabic marks only ‘the’ (ال), not ‘a’.`,
  }),
  examples: { wrong: 'I have question about the test.', flag: 'question', fix: 'a question', right: 'I have a question about the test.', ok: ['I have car insurance.', 'We need house keys.'] },
})

export const genericThe = regexRule({
  id: 'en.generic-the',
  title: 'The life is short → Life is short',
  category: 'grammar',
  confidence: 'low',
  strictOnly: true,
  re: new RegExp(
    `${SENT_START}(?<w>The\\s+(?<n>life|love|money|happiness|education|health|nature|society|history|science|technology|religion|freedom|success|friendship|music|art|sport|knowledge|marriage|honesty|patience|war|peace|poverty))\\s+(?:is|are|was|can|has|makes|gives|teaches)\\b(?![^.!?]*\\b(?:of|that|which|in\\s+(?:this|that|my|our|the))\\b)`,
    'g',
  ),
  target: 'w',
  fix: (f) => [f.g.n!],
  msg: (f) => ({
    message: `General ideas usually have no ${q('the')}: ${q(f.g.n!.charAt(0).toUpperCase() + f.g.n!.slice(1))}`,
    explanation: `When you talk about life, money or love in general, English leaves out the: Life is short. Money is important. Arabic says الحياة (with the article) for the same idea.`,
  }),
  examples: { wrong: 'The life is very short.', flag: 'The life', fix: 'Life', right: 'Life is very short.', ok: ['The life of a bee is short.', 'The money that I saved is gone.'] },
})

export const whNoInversion = regexRule({
  id: 'en.wh-no-inversion',
  title: 'When I can call? → When can I call?',
  category: 'grammar',
  confidence: 'medium',
  re: new RegExp(
    `${SENT_START}(?:When|Where|What|Why|How|Which)\\s+(?<w>(?<s>I|you|he|she|it|we|they)\\s+(?<a>can|will|should|could|must|would|am|is|are|was|were))\\b[^.!?]*\\?`,
    'g',
  ),
  target: 'w',
  keepCase: false,
  fix: (f) => [`${f.g.a!.toLowerCase()} ${lowerKeepI(f.g.s!)}`],
  msg: (_f, fixes) => ({
    message: `In a question the helper verb comes first: ${q(fixes[0] ?? '')}`,
    explanation: `English questions swap the subject and the helper verb: When can I call you? Why are you late? Arabic keeps the statement order (متى أستطيع أن أتصل بك؟).`,
  }),
  examples: { wrong: 'When I can call you?', flag: 'I can', fix: 'can I', right: 'When can I call you?', ok: ['When can I call you?'] },
})

/* ------------------------------------------------------------------ */
/* Run-on sentences (hint)                                             */
/* ------------------------------------------------------------------ */

const JOIN = /\b(?:and|so|but|then)\s+(?:then\s+)?(?:I|we|he|she|they|it|you|there)\b/gi

export const runOnAnd: EnRule = {
  id: 'en.run-on-and',
  lang: 'en',
  category: 'style',
  title: 'long chain of and... and...',
  confidence: 'low',
  strictOnly: true,
  examples: {
    wrong: 'I woke up and I ate and then I went out and I met Ali and we played football and it was fun.',
    flag: 'I woke up and I ate and then I went out and I met Ali and we played football and it was fun.',
    right: 'I woke up and ate breakfast. Then I went out and met Ali. We played football, and it was fun.',
    ok: ['I woke up and ate breakfast. Then I went out.'],
  },
  check(ctx) {
    const out: RuleHit[] = []
    for (const s of ctx.sentences) {
      const joins = s.text.match(JOIN)?.length ?? 0
      const words = s.tokens.filter((t) => t.isWord).length
      if (joins < 3 && !(words >= 45 && joins >= 2)) continue
      out.push({
        offset: s.start,
        length: s.end - s.start,
        replacements: [],
        message: `Long chain of ‘and’, ‘so’ and ‘then’: try two or three sentences`,
        explanation: `English readers prefer shorter sentences. Arabic happily links clause after clause with و, English usually starts a new sentence instead.`,
        learnMore: LINKS.runOn,
      })
    }
    return out
  },
}

export const arabicTransferRules: EnRule[] = [copulaOmission, copulaOmissionArticle, missingArticleJob, missingArticleHave, genericThe, whNoInversion, runOnAnd]
