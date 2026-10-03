import type { RuleHit } from '@/types'
import { next } from '../../helpers'
import { ALA_EXPRESSIONS } from '../../lexicon/ar'
import { arRule, bare, LINKS, NA, NB, q, qa, reRule, tokenHit, type ArRule } from './shared'

// Fixed expressions (arabic-typing.md 2.10): إن شاء الله، ما شاء الله، بإذن الله, and على in set phrases.

export const inshallah = reRule(
  {
    id: 'ar.inshallah',
    title: 'إن شاء الله (three words)',
    category: 'spelling',
    confidence: 'high',
    examples: {
      flag: [
        ['إنشاء الله نلتقي غدا', 'إنشاء الله', 'إن شاء الله'],
        ['انشالله خير', 'انشالله', 'إن شاء الله'],
        ['سأزورك وإنشاء الله نتحدث', 'وإنشاء الله', 'وإن شاء الله'],
        ['ان شاء الله نلتقي', 'ان شاء الله', 'إن شاء الله'],
      ],
      ok: ['إن شاء الله سأزورك غدا مساء.', 'إن شاء الله نلتقي في أمستردام.', 'بدأ إنشاء المدرسة الجديدة.'],
    },
  },
  new RegExp(`${NB}(?<p>[وف]?)(?:(?<a>[إا]نشاء\\s*الله|[إا]نشالله|[إا]ن\\s?شالله)|(?<b>ان\\s+شاء\\s+الله))${NA}`),
  {
    fix: (m) => [`${m.groups!.p}إن شاء الله`],
    msg: (m) =>
      m.groups!.b
        ? {
            message: `${q('إن')} needs its hamza: ${q('إن شاء الله')}`,
            messageLocal: `الصواب: ${qa('إن شاء الله')} بهمزة تحت الألف.`,
            explanation: `إن (if) starts with hamzat al-qat', written under the alif: إن شاء الله.`,
            explanationLocal: `«إن» الشرطية همزتها همزة قطع مكسورة، فتُكتب تحت الألف.`,
          }
        : {
            message: `Three words: ${q('إن شاء الله')}`,
            messageLocal: `الصواب: ${qa('إن شاء الله')} ثلاث كلمات منفصلة.`,
            explanation: `إنشاء means creating or building, so ‘إنشاء الله’ reads as ‘creating God’. ‘If God wills’ is three words: إن شاء الله.`,
            explanationLocal: `«إنشاء» مصدر بمعنى الخلق والبناء؛ أما «إن شاء الله» فمعناها «إذا أراد الله»، وتُكتب ثلاث كلمات منفصلة.`,
            learnMore: LINKS.inshallah,
          },
  },
)

export const mashallah = reRule(
  {
    id: 'ar.mashallah',
    title: 'ما شاء الله (three words)',
    category: 'spelling',
    confidence: 'high',
    examples: {
      flag: [
        ['ماشاء الله عليك', 'ماشاء الله', 'ما شاء الله'],
        ['ماشالله خطك جميل', 'ماشالله', 'ما شاء الله'],
      ],
      ok: ['ما شاء الله، خطك جميل.'],
    },
  },
  new RegExp(`${NB}(?<p>[وف]?)(?:ماشاء\\s?الله|ماشالله)${NA}`),
  {
    fix: (m) => [`${m.groups!.p}ما شاء الله`],
    msg: {
      message: `Three words: ${q('ما شاء الله')}`,
      messageLocal: `الصواب: ${qa('ما شاء الله')} ثلاث كلمات منفصلة.`,
      explanation: `ما (what) + شاء (willed) + الله: three separate words, like إن شاء الله.`,
      explanationLocal: `«ما شاء الله» ثلاث كلمات: «ما» و«شاء» و«الله»، ولا تُدمج.`,
    },
  },
)

export const biIdhnAllah = reRule(
  {
    id: 'ar.bi-idhn',
    title: 'بإذن الله',
    category: 'spelling',
    confidence: 'high',
    examples: { flag: [['بأذن الله سأنجح', 'بأذن', 'بإذن']], ok: ['بإذن الله سأنجح.', 'سمعته بأذني.'] },
  },
  new RegExp(`${NB}(?<w>بأذن)(?=\\s+الله${NA})`),
  {
    target: 'w',
    fix: () => ['بإذن'],
    msg: {
      message: `${q('إذن')} (permission) takes the hamza below: ${q('بإذن الله')}`,
      messageLocal: `الصواب: ${qa('بإذن الله')} (الهمزة تحت الألف).`,
      explanation: `إِذْن (permission) has a kasra, so the hamza sits under the alif. أُذُن with the hamza on top means ear.`,
      explanationLocal: `«إِذْن» بمعنى السماح همزته مكسورة فتُكتب تحت الألف، أما «أُذُن» فهي عضو السمع.`,
    },
  },
)

export const alaExpressions: ArRule = arRule(
  {
    id: 'ar.ala-ali',
    title: 'على in fixed phrases (not علي)',
    category: 'spelling',
    confidence: 'medium',
    examples: {
      flag: [
        ['علي الفور ذهبت', 'علي', 'على'],
        ['اكتب علي الأقل جملة', 'علي', 'على'],
        ['الكتاب علي الطاولة', 'علي', 'على'],
        ['أنا علي ما يرام', 'علي', 'على'],
      ],
      ok: ['اجتمع الأصدقاء في بيت علي يوم الجمعة.', 'علي الأحمد صديقي.', 'سلم علي على المعلم.', 'علي ما زال يدرس.'],
    },
  },
  (ctx) => {
    const out: RuleHit[] = []
    ctx.words.forEach((t, i) => {
      const w = bare(t.text)
      if (w !== 'علي' && w !== 'وعلي') return
      const n = next(ctx, i)
      if (n < 0) return
      const nw = bare(ctx.words[n].text)
      const nn = next(ctx, n)
      const fixed = ALA_EXPRESSIONS.has(nw) || (nw === 'ما' && nn >= 0 && bare(ctx.words[nn].text) === 'يرام')
      if (!fixed) return
      out.push(
        tokenHit(t, [w === 'وعلي' ? 'وعلى' : 'على'], {
          message: `In this phrase it's ${q('على')} (on), with ى`,
          messageLocal: `في هذا التعبير: ${qa('على')} بألف مقصورة.`,
          explanation: `على (on, at) ends in alif maqsura ى. علي with dotted ي is the name Ali. In set phrases like على الفور and على الأقل it is always على.`,
          explanationLocal: `«على» حرف جر ينتهي بألف مقصورة، أما «علي» بالياء فاسم علم. في التعابير مثل «على الفور» و«على الأقل» نكتب «على».`,
        }),
      )
    })
    return out
  },
)

export const expressionRules: ArRule[] = [inshallah, mashallah, biIdhnAllah, alaExpressions]
