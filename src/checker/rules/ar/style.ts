import { DIALECT_WORDS, MASUUL } from '../../lexicon/ar'
import { lexRule, q, qa, reRule, type ArRule } from './shared'

// Style hints for written MSA (strict mode only): dialect words, non-MSA letters, old spellings.

export const dialectWord = lexRule(
  {
    id: 'ar.dialect-word',
    title: 'dialect word in MSA',
    category: 'style',
    confidence: 'low',
    strictOnly: true,
    examples: { flag: [['عشان كده', 'عشان', 'لأن']], ok: ['لأن الجو جميل خرجنا.'] },
  },
  DIALECT_WORDS,
  (h) => ({
    message: `Dialect word: in MSA ${q(h.fixes[0])}`,
    messageLocal: `كلمة عامية؛ في الفصحى: ${qa(h.fixes.join(' أو '))}.`,
    explanation: `Fine when you speak or chat, but formal written Arabic (MSA) uses a different word.`,
    explanationLocal: `مقبولة في الكلام والمحادثة، لكن الفصحى المكتوبة تستعمل كلمة أخرى.`,
  }),
  { clitics: 'conj' },
)

const NON_MSA: Record<string, string> = { پ: 'ب', چ: 'ج|ش', ژ: 'ج|ز', گ: 'ج|ك|ق', ڤ: 'ف', ڨ: 'ق' }

export const nonMsaLetters = reRule(
  {
    id: 'ar.non-msa-letters',
    title: 'letters outside standard Arabic',
    category: 'style',
    confidence: 'low',
    strictOnly: true,
    examples: { flag: [['گال لي', 'گ', 'ج']], ok: ['قال لي.'] },
  },
  /[پچژگڤڨ]/,
  {
    fix: (m) => NON_MSA[m[0]].split('|'),
    msg: {
      message: `Not a standard Arabic letter`,
      messageLocal: `هذا الحرف ليس من حروف العربية الفصحى (يُستعمل للأسماء الأجنبية أو اللهجات).`,
      explanation: `پ چ ژ گ ڤ ڨ are used for foreign names and dialects. Standard spelling uses the closest Arabic letter.`,
      explanationLocal: `تُستعمل هذه الحروف للأسماء الأجنبية واللهجات، والرسم الفصيح يستعمل أقرب حرف عربي.`,
    },
  },
)

export const masuul = lexRule(
  {
    id: 'ar.masuul',
    title: 'مسؤول (not مسئول)',
    category: 'style',
    confidence: 'low',
    strictOnly: true,
    examples: { flag: [['المسئول غائب', 'المسئول', 'المسؤول']], ok: ['المسؤول غائب.'] },
  },
  MASUUL,
  (h) => ({
    message: `Older spelling: ${q(h.fixes[0])} is the common form today`,
    messageLocal: `«مسئول» رسم قديم ما زال مستعملًا في مصر، والشائع اليوم ${qa(h.fixes[0])}.`,
    explanation: `مسئول follows an older (mostly Egyptian) convention. Most style guides now write مسؤول.`,
    explanationLocal: `«مسئول» رسم قديم ما زال مستعملًا في مصر، والرسم الشائع اليوم «مسؤول».`,
  }),
  { clitics: 'all' },
)

export const styleRules: ArRule[] = [dialectWord, nonMsaLetters, masuul]
