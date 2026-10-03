import { arRule, L, M, NB, q, qa, reRule, tokenHit, type ArRule } from './shared'

// Punctuation and spacing in Arabic text (arabic-typing.md 4.7 and 6.2).

const ARABIC_PUNCT: Record<string, string> = { ',': '،', ';': '؛', '?': '؟' }

export const latinPunct = reRule(
  {
    id: 'ar.latin-punct',
    title: 'Arabic punctuation: ، ؛ ؟',
    category: 'punctuation',
    confidence: 'medium',
    examples: {
      flag: [
        ['كيف حالك?', '?', '؟'],
        ['ذهبت إلى السوق, ثم رجعت', ',', '،'],
        ['هذا جميل ; وذلك أجمل', ';', '؛'],
      ],
      ok: ['كيف حالك؟', 'ثمنه 3,5 يورو.', 'زرت www.example.com, ثم نمت.'],
    },
  },
  new RegExp(`(?<=[${L}${M}]\\s?)(?<p>[,;?])`),
  {
    target: 'p',
    fix: (m) => [ARABIC_PUNCT[m.groups!.p]],
    msg: (m) => ({
      message: `Arabic text uses ${q(ARABIC_PUNCT[m.groups!.p])}`,
      messageLocal: `استعمل علامة الترقيم العربية: ${qa(ARABIC_PUNCT[m.groups!.p])}`,
      explanation: `Arabic has its own comma (،), semicolon (؛) and question mark (؟). On the Arabic keyboard: Shift+K for ، and Shift+/ for ؟.`,
      explanationLocal: `للعربية فاصلة (،) وفاصلة منقوطة (؛) وعلامة استفهام (؟) خاصة بها. في لوحة المفاتيح العربية: Shift+K للفاصلة وShift+/ لعلامة الاستفهام.`,
    }),
  },
)

export const spaceBeforePunct = reRule(
  {
    id: 'ar.space-before-punct',
    title: 'no space before punctuation',
    category: 'punctuation',
    confidence: 'low',
    strictOnly: true,
    examples: { flag: [['كيف حالك ؟', ' ؟', '؟']], ok: ['كيف حالك؟', 'انتظر ... ماذا؟'] },
  },
  /[ \t]+(?<p>[،؛؟!.:])(?=\s|$)/,
  {
    fix: (m) => [m.groups!.p],
    msg: {
      message: `No space before punctuation`,
      messageLocal: `لا مسافة قبل علامة الترقيم، ومسافة واحدة بعدها.`,
      explanation: `Punctuation sits right after the word, with one space after it.`,
      explanationLocal: `تأتي علامة الترقيم بعد الكلمة مباشرة، ثم مسافة واحدة.`,
    },
  },
)

export const doubleSpace = reRule(
  {
    id: 'ar.double-space',
    title: 'one space between words',
    category: 'typo',
    confidence: 'medium',
    examples: { flag: [['ذهبت  إلى البيت', '  ', ' ']], ok: ['ذهبت إلى البيت.', 'السطر الأول\nالسطر الثاني'] },
  },
  /(?<=\S) {2,}(?=\S)/,
  {
    fix: () => [' '],
    msg: {
      message: `Two spaces: one is enough`,
      messageLocal: `مسافتان؛ تكفي مسافة واحدة.`,
      explanation: `Use a single space between words.`,
      explanationLocal: `ضع مسافة واحدة بين الكلمات.`,
    },
  },
)

export const tatweel: ArRule = arRule(
  {
    id: 'ar.tatweel',
    title: 'tatweel (ـ) in normal text',
    category: 'typo',
    confidence: 'medium',
    examples: { flag: [['جمـيل جدا', 'جمـيل', 'جميل']], ok: ['جميل جدا.'] },
  },
  (ctx) =>
    ctx.words
      .filter((t) => t.text.includes('\u0640'))
      .map((t) =>
        tokenHit(t, [t.text.replace(/\u0640/g, '')], {
          message: `Tatweel (ـ) is decoration: leave it out`,
          messageLocal: `التطويل (ـ) للزخرفة؛ لا تكتبه في النص العادي.`,
          explanation: `The tatweel stretches a letter for decoration. In normal text it is usually a slip: it sits on Shift+ت on the Arabic keyboard.`,
          explanationLocal: `التطويل يمد الحرف للزخرفة فقط. في النص العادي يكون غالبًا خطأ في الكتابة، فهو على Shift+ت في لوحة المفاتيح.`,
        }),
      ),
)

export const wawDetached = reRule(
  {
    id: 'ar.waw-detached',
    title: 'و attaches to the next word',
    category: 'spelling',
    confidence: 'high',
    examples: {
      flag: [['الكتاب و القلم', 'و ', 'و']],
      ok: ['الكتاب والقلم.', 'المتغيران س و ص.', 'أ و ب حرفان.'],
    },
  },
  new RegExp(`${NB}و\\s+(?=[${L}]{2})`),
  {
    // "س و ص": a conjunction between single letters (math, lists) stays as typed
    when: (m, ctx) => !new RegExp(`(?:^|\\s)[${L}]\\s+$`, 'u').test(ctx.text.slice(Math.max(0, m.index - 3), m.index)),
    fix: () => ['و'],
    msg: {
      message: `${q('و')} attaches to the next word`,
      messageLocal: `واو العطف تتصل بالكلمة التي بعدها: والكتاب.`,
      explanation: `The conjunction و (and) is written joined to the word after it: الكتاب والقلم.`,
      explanationLocal: `واو العطف حرف واحد يُكتب متصلًا بالكلمة التي بعده: الكتاب والقلم.`,
    },
  },
)

export const prepDetached = reRule(
  {
    id: 'ar.prep-detached',
    title: 'ب، ل، ك attach to the next word',
    category: 'spelling',
    confidence: 'medium',
    examples: { flag: [['كتبت ب القلم', 'ب ', 'ب']], ok: ['كتبت بالقلم.', '(ب) الفقرة الثانية'] },
  },
  new RegExp(`${NB}(?<p>[بلكف])\\s+(?=ال[${L}])`),
  {
    fix: (m) => [m.groups!.p],
    msg: (m) => ({
      message: `${q(m.groups!.p)} attaches to the next word`,
      messageLocal: `الحروف المفردة ب، ل، ك، ف تتصل بما بعدها: بالقلم.`,
      explanation: `One-letter words like ب (with), ل (for), ك (like) and ف (so) are written joined to the next word: بالقلم، للبيت.`,
      explanationLocal: `حروف الجر المفردة (ب، ل، ك) والفاء تُكتب متصلة بالكلمة التي بعدها: بالقلم، للبيت.`,
    }),
  },
)

export const punctuationRules: ArRule[] = [latinPunct, spaceBeforePunct, doubleSpace, tatweel, wawDetached, prepDetached]
