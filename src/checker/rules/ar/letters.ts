import type { RuleHit } from '@/types'
import { prev } from '../../helpers'
import {
  DAD_DHA,
  DEFECTIVE_VERBS,
  EXTRA_ALIF,
  EXTRA_ALIF_3SG,
  HA_FOR_TAA,
  HA_FOR_TAA_BARE,
  HIDDEN_ALIF,
  INTERDENTAL,
  MAQSURA_FOR_YA,
  MAQSURA_WORDS,
  WAW_JAMAA,
  YA_FOR_MAQSURA,
  YA_FOR_MAQSURA_BARE,
} from '../../lexicon/ar'
import { arRule, bare, isArabic, L, lexRule, lookup, NA, NB, q, qa, reRule, splits, tokenHit, type ArRule } from './shared'

// Letters that look or sound alike: ة/ه, ى/ي, the hidden alif, waw al-jama'a, ض/ظ, ث/ذ, tanween,
// Persian letters (arabic-typing.md 2.3-2.9).

/* ------------------------------------------------------------------ */
/* Taa marbuta                                                         */
/* ------------------------------------------------------------------ */

const PRONOUN_SUFFIX = /^(?:ي|ك|ه|ها|نا|هم|كم|هن|كما|هما|ان|ين|ات)$/
const LETTER = new RegExp(`[${L}]`, 'u')

export const taaMarbutaInside: ArRule = arRule(
  {
    id: 'ar.taa-marbuta-inside',
    title: 'ة only at the end of a word',
    category: 'spelling',
    confidence: 'high',
    examples: {
      flag: [
        ['سيارةك جميلة', 'سيارةك', 'سيارتك'],
        ['زرت المدينةالكبيرة', 'المدينةالكبيرة', 'المدينة الكبيرة'],
      ],
      ok: ['مدرستي قريبة من بيتي، وسيارتك أمام الباب.', 'مدرستان كبيرتان في المدينة.'],
    },
  },
  (ctx) => {
    const out: RuleHit[] = []
    for (const t of ctx.words) {
      const w = bare(t.text)
      const i = w.indexOf('ة')
      if (i < 0 || i === w.length - 1 || !LETTER.test(w[i + 1])) continue
      const rest = w.slice(i + 1)
      const fixes = PRONOUN_SUFFIX.test(rest) ? [`${w.slice(0, i)}ت${rest}`] : [`${w.slice(0, i + 1)} ${rest}`, `${w.slice(0, i)}ت${rest}`]
      out.push(
        tokenHit(t, fixes, {
          message: PRONOUN_SUFFIX.test(rest) ? `Before a suffix ${q('ة')} becomes ${q('ت')}: ${q(fixes[0])}` : `${q('ة')} ends a word: missing space?`,
          messageLocal: PRONOUN_SUFFIX.test(rest) ? `التاء المربوطة تصير تاء مفتوحة قبل الضمير: ${qa(fixes[0])}.` : `التاء المربوطة في آخر الكلمة فقط؛ هل نسيت المسافة؟`,
          explanation: `ة only appears at the end of a word. Before a suffix it turns into ت (سيارة, سيارتك). If two words are glued together, add a space after the ة.`,
          explanationLocal: `التاء المربوطة لا تأتي إلا في آخر الكلمة، وإذا اتصل بها ضمير صارت تاء مفتوحة: سيارة، سيارتك.`,
        }),
      )
    }
    return out
  },
)

const haMsg = (fix: string) => ({
  message: `This word ends in taa marbuta: ${q(fix)}`,
  messageLocal: `تنتهي هذه الكلمة بتاء مربوطة: ${qa(fix)}.`,
  explanation: `ة is said as t when you keep reading (مدرسةٌ كبيرة) and as h at a pause, which is why it gets typed as ه. ه is always h: وجه، كتابه (his book).`,
  explanationLocal: `التاء المربوطة تُنطق تاءً عند الوصل وهاءً عند الوقف، ولذلك يكتبها بعضهم هاءً. أما الهاء فتبقى هاءً دائمًا: وجه، كتابه.`,
})

export const haForTaa: ArRule = arRule(
  {
    id: 'ar.ha-for-taa',
    title: 'ة typed as ه',
    category: 'spelling',
    confidence: 'high',
    examples: {
      flag: [
        ['ذهبت إلى المدرسه', 'المدرسه', 'المدرسة'],
        ['اللغه العربيه جميلة', 'اللغه', 'اللغة'],
        ['ركبت السياره', 'السياره', 'السيارة'],
        ['ذهبت للمدرسه', 'للمدرسه', 'للمدرسة'],
        ['عندي سياره جديدة', 'سياره', 'سيارة'],
      ],
      ok: [
        'كتابة الرسالة سهلة، وكتابه جديد.',
        'زرت مكتبة المدينة مع صديقه.',
        'وجهه جميل، وابتسامته واسعة.',
        'المدرسة الجديدة قريبة من بيته.',
        'كلمه المعلم بعد الدرس.',
        'هذا مدرسه في الجامعة.',
        'بلغه الخبر صباحا.',
      ],
    },
  },
  (ctx) => {
    const out: RuleHit[] = []
    for (const t of ctx.words) {
      if (!isArabic(t)) continue
      const w = bare(t.text)
      if (!w.endsWith('ه')) continue
      let hit: RuleHit | undefined
      for (const sp of splits(w, 'all')) {
        const fix = HA_FOR_TAA.get(sp.core)?.[0]
        if (!fix) continue
        if (sp.article) hit = tokenHit(t, [sp.prefix + fix], haMsg(sp.prefix + fix), 'high')
        else if (HA_FOR_TAA_BARE.has(sp.core) && (sp.prefix === '' || sp.prefix === 'و' || sp.core.length > 3)) {
          hit = tokenHit(t, [sp.prefix + fix], haMsg(sp.prefix + fix), 'medium')
        }
        break
      }
      // with a dictionary: any word with the article ending in ه that only exists with ة
      if (!hit && ctx.dict && splits(w, 'all').some((s) => s.article) && w.length >= 5) {
        const fix = `${w.slice(0, -1)}ة`
        if (!ctx.dict.has(w) && ctx.dict.has(fix)) hit = tokenHit(t, [fix], haMsg(fix), 'medium')
      }
      if (hit) out.push(hit)
    }
    return out
  },
)

/* ------------------------------------------------------------------ */
/* Alif maqsura                                                        */
/* ------------------------------------------------------------------ */

const MAQSURA_SUFFIX = /^(?:ه|ها|هم|هما|هن|ك|كم|كما|نا|ي|ات|ان|ين)$/

/**
 * ىء is old typography for two different things: ئ (شاطىء -> شاطئ, مخطىء -> مخطئ) and ي + ء
 * (شىء -> شيء, بطىء -> بطيء). Offer both, the likelier one first.
 */
function maqsuraHamza(w: string, i: number): string[] {
  const head = w.slice(0, i)
  const tail = w.slice(i + 2)
  if (head.endsWith('ي')) return [`${head}ء${tail}`]
  const asSeat = `${head}ئ${tail}`
  const asLong = `${head}يء${tail}`
  const core = splits(head, 'all')[0]?.core ?? head
  // فاعل / مفعل shapes (شاطئ، الطوارئ، مخطئ) take ئ; a one-letter stem (شيء، سيء) or فعيل (بطيء) takes يء
  const seatFirst = core.length > 1 && (core.at(-2) === 'ا' || (core.startsWith('م') && core.length >= 3))
  return seatFirst ? [asSeat, asLong] : [asLong, asSeat]
}

export const alifMaqsuraInside: ArRule = arRule(
  {
    id: 'ar.alif-maqsura-inside',
    title: 'ى only at the end of a word',
    category: 'spelling',
    confidence: 'high',
    examples: {
      flag: [
        ['السلام علىكم', 'علىكم', 'عليكم'],
        ['أرقام الطوارىء', 'الطوارىء', 'الطوارئ'],
        ['هذا شىء جميل', 'شىء', 'شيء'],
        ['القطار بطىء', 'بطىء', 'بطيء'],
        ['ذهبنا إلى الشاطىء', 'الشاطىء', 'الشاطئ'],
        ['أنت مخطىء', 'مخطىء', 'مخطئ'],
        ['ذهبت إلىالسوق', 'إلىالسوق', 'إلى السوق'],
      ],
      ok: ['مشى الولد إلى المستشفى.', 'السلام عليكم.', 'أرقام الطوارئ مهمة.'],
    },
  },
  (ctx) => {
    const out: RuleHit[] = []
    for (const t of ctx.words) {
      const w = bare(t.text)
      const i = w.indexOf('ى')
      if (i < 0 || i === w.length - 1 || !LETTER.test(w[i + 1])) continue
      const rest = w.slice(i + 1)
      let fixes: string[]
      if (rest.startsWith('ء')) fixes = maqsuraHamza(w, i)
      else if (MAQSURA_SUFFIX.test(rest)) fixes = [`${w.slice(0, i)}ي${rest}`]
      else fixes = [`${w.slice(0, i + 1)} ${rest}`, `${w.slice(0, i)}ي${rest}`]
      out.push(
        tokenHit(t, fixes, {
          message: rest.startsWith('ء') ? `Write the hamza on its seat: ${q(fixes[0])}` : MAQSURA_SUFFIX.test(rest) ? `Before a suffix ${q('ى')} becomes ${q('ي')}: ${q(fixes[0])}` : `${q('ى')} ends a word: missing space?`,
          messageLocal: rest.startsWith('ء') ? `الصواب: ${qa(fixes[0])}.` : `الألف المقصورة في آخر الكلمة فقط: ${qa(fixes[0])}.`,
          explanation: `ى only appears at the end of a word. Before a suffix it is written ي (على, عليه; إلى, إليك). The old spelling ىء for ئ (الطوارىء) is out of date: الطوارئ.`,
          explanationLocal: `الألف المقصورة لا تأتي إلا في آخر الكلمة، وعند اتصالها بضمير تُكتب ياءً: عليه، إليك. ورسم «ىء» قديم، والصواب «ئ»: الطوارئ.`,
        }),
      )
    }
    return out
  },
)

export const yaForMaqsura = lexRule(
  {
    id: 'ar.ya-for-maqsura',
    title: 'حتى، متى، مستشفى (ى not ي)',
    category: 'spelling',
    confidence: 'medium',
    examples: {
      flag: [
        ['انتظرت حتي المساء', 'حتي', 'حتى'],
        ['ذهبت إلي المستشفي', 'المستشفي', 'المستشفى'],
        ['متي تعود؟', 'متي', 'متى'],
      ],
      ok: ['حتى متى ستبقى هنا؟', 'موسى وعيسى ومصطفى أصدقاء.', 'المستوى عال، والمحتوى ممتاز.', 'اجتمع الأصدقاء في بيت علي.', 'اشترى أخي هدية لي.'],
    },
  },
  YA_FOR_MAQSURA,
  (h) => ({
    message: `Ends in alif maqsura: ${q(h.fixes[0])}`,
    messageLocal: `تنتهي بألف مقصورة (ى) بلا نقاط: ${qa(h.fixes[0])}.`,
    explanation: `These words end in an a sound written ى, without dots. ي with dots is an ii sound: في، الذي.`,
    explanationLocal: `هذه الكلمات تنتهي بألف مقصورة تُنطق ألفًا وتُكتب بلا نقاط (ى)، أما الياء المنقوطة (ي) فتُنطق ياءً: في، الذي.`,
  }),
  { clitics: 'all' },
)

/** إلي can be إليّ (to me) and الي can be آلي, so they only match bare, never after و (والي is a governor) */
export const yaForMaqsuraBare = lexRule(
  {
    id: 'ar.ya-for-maqsura-bare',
    title: 'إلى (ى not ي)',
    category: 'spelling',
    confidence: 'medium',
    examples: { flag: [['ذهبت إلي المستشفى', 'إلي', 'إلى'], ['ذهبت الي البيت', 'الي', 'إلى']], ok: ['عين الوالي مديرا جديدا.', 'ذهبت إلى البيت.'] },
  },
  YA_FOR_MAQSURA_BARE,
  {
    message: `${q('إلى')} (to) ends in alif maqsura`,
    messageLocal: `«إلى» حرف جر ينتهي بألف مقصورة.`,
    explanation: `إلى (to) is written with hamza below and a final ى. إليّ with ي means ‘to me’.`,
    explanationLocal: `«إلى» تُكتب بهمزة تحت الألف وألف مقصورة في آخرها، أما «إليّ» فمعناها «إلى + ياء المتكلم».`,
  },
)

export const maqsuraForYa = lexRule(
  {
    id: 'ar.maqsura-for-ya',
    title: 'في، الذي، التي (ي not ى)',
    category: 'spelling',
    confidence: 'medium',
    examples: {
      flag: [
        ['هو فى البيت', 'فى', 'في'],
        ['الكتاب الذى قرأته', 'الذى', 'الذي'],
      ],
      ok: ['الكتاب الذي قرأته في البيت.', 'نادى الرجل أولاده، وبنى بيتا جميلا.', 'مشى الولد إلى المستشفى.'],
    },
  },
  MAQSURA_FOR_YA,
  (h) => ({
    message: `Ends in a dotted ${q('ي')}: ${q(h.fixes[0])}`,
    messageLocal: `تنتهي بياء منقوطة: ${qa(h.fixes[0])}.`,
    explanation: `These words end in an ii sound, written ي with two dots. Writing ى here is a regional (Egyptian) habit, not standard spelling.`,
    explanationLocal: `هذه الكلمات تنتهي بياء منقوطة (ي). كتابتها بالألف المقصورة عادة إقليمية (مصرية)، وليست الرسم المعياري.`,
  }),
  { clitics: 'conj', minCore: 3 },
)

/* ------------------------------------------------------------------ */
/* Hidden alif                                                         */
/* ------------------------------------------------------------------ */

export const hiddenAlif = lexRule(
  {
    id: 'ar.hidden-alif',
    title: 'هذا، ذلك، لكن (alif said, not written)',
    category: 'spelling',
    confidence: 'high',
    examples: {
      flag: [
        ['هاذا الكتاب جميل', 'هاذا', 'هذا'],
        ['لاكن الجو بارد', 'لاكن', 'لكن'],
        ['ذالك صحيح', 'ذالك', 'ذلك'],
        ['كذالك أنا', 'كذالك', 'كذلك'],
        ['هاكذا تكتب', 'هاكذا', 'هكذا'],
      ],
      ok: ['هذا كتاب، وذلك قلم، لكن هؤلاء طلاب وأولئك معلمون.', 'كذلك أنا، ولذلك جئت.'],
    },
  },
  HIDDEN_ALIF,
  (h) => ({
    message: `The long a is said but not written: ${q(h.fixes[0])}`,
    messageLocal: `ألف تُنطق ولا تُكتب: ${qa(h.fixes[0])}.`,
    explanation: `هذا، هذه، ذلك، لكن، هكذا، هؤلاء and أولئك are said with a long a but written without the alif. In fully voweled text a small dagger alif marks it: هٰذا.`,
    explanationLocal: `في «هذا، هذه، ذلك، لكن، هكذا، هؤلاء، أولئك» ألف تُنطق ولا تُكتب، وتظهر في النص المشكول ألفًا خنجرية صغيرة: هٰذا.`,
  }),
  { clitics: 'prep' },
)

/* ------------------------------------------------------------------ */
/* Waw al-jama'a                                                       */
/* ------------------------------------------------------------------ */

/** و/ف + three consonants + و: كتبو، وذهبو */
const SOUND_PAST_PLURAL = /^[وف]?[^اويىءأإآ]{3}و$/

/** particles before a subjunctive or jussive verb: لم يكتبوا، لن يذهبوا، أن يكتبوا */
const JUSSIVE_PARTICLES = new Set(['لم', 'لن', 'أن', 'ان', 'كي', 'لكي', 'حتى'])

const wawMsg = (fix: string) => ({
  message: `Plural verbs end in ${q('وا')}: ${q(fix)}`,
  messageLocal: `واو الجماعة تُتبع بألف فارقة: ${qa(fix)}.`,
  explanation: `When و marks a plural subject on a verb (they wrote, they went), a silent alif follows it: كتبوا، ذهبوا، لم يكتبوا. Nouns (أبو، عضو) and verbs whose root ends in و (يدعو، يرجو) take no alif.`,
  explanationLocal: `واو الجماعة في الفعل تُتبع بألف فارقة لا تُنطق: كتبوا، ذهبوا، لم يكتبوا. ولا تُزاد الألف في الأسماء (أبو، عضو) ولا في الأفعال التي واوها أصلية (يدعو، يرجو).`,
})

export const wawJamaa: ArRule = arRule(
  {
    id: 'ar.waw-jamaa',
    title: 'كتبوا، ذهبوا (alif after waw al-jama\'a)',
    category: 'spelling',
    confidence: 'medium',
    examples: {
      flag: [
        ['الطلاب كتبو الدرس', 'كتبو', 'كتبوا'],
        ['كانو هنا', 'كانو', 'كانوا'],
        ['وقالو إنهم سيأتون', 'وقالو', 'وقالوا'],
      ],
      ok: ['كتبوا، وذهبوا، ولعبوا، ثم رجعوا إلى البيت.', 'يدعو المعلم الطلاب إلى القراءة.', 'أبو أحمد عضو في النادي.', 'يبدو أن الجو جميل اليوم.'],
    },
  },
  (ctx) => {
    const out: RuleHit[] = []
    const listed = new Set<number>()
    for (const h of lookup(ctx, WAW_JAMAA, { clitics: 'conj' })) {
      listed.add(h.tok.start)
      out.push(tokenHit(h.tok, h.fixes, wawMsg(h.fixes[0])))
    }
    // with a dictionary: a sound three-letter past verb + و (كتبو، سمعو) that is unknown while + ا is known.
    // The shape check keeps loanwords and names out (زيرو، هالو، اندرو), and أرجو/أبدو (root و).
    if (ctx.dict) {
      ctx.words.forEach((t, i) => {
        if (listed.has(t.start) || !isArabic(t)) return
        const w = bare(t.text)
        if (!SOUND_PAST_PLURAL.test(w) || DEFECTIVE_VERBS.has(w)) return
        const p = prev(ctx, i)
        if (p >= 0 && JUSSIVE_PARTICLES.has(bare(ctx.words[p].text))) return // ar.waw-jamaa-jussive explains these
        if (!ctx.dict!.has(w) && ctx.dict!.has(`${w}ا`)) out.push(tokenHit(t, [`${w}ا`], wawMsg(`${w}ا`)))
      })
    }
    return out
  },
)

export const wawJamaaJussive = reRule(
  {
    id: 'ar.waw-jamaa-jussive',
    title: 'لم يكتبوا (alif after لم/لن/أن)',
    category: 'spelling',
    confidence: 'medium',
    examples: {
      flag: [
        ['لم يكتبو الواجب', 'يكتبو', 'يكتبوا'],
        ['لن يذهبو', 'يذهبو', 'يذهبوا'],
      ],
      ok: ['لن يدعو أحدا إلى الحفلة.', 'لم يكتبوا الواجب، ولن يتأخروا غدا.', 'أرجو أن تنجحوا.'],
    },
  },
  new RegExp(`${NB}(?:${[...JUSSIVE_PARTICLES].join('|')})\\s+(?<v>[يت][${L}]{2,}و)${NA}`),
  {
    target: 'v',
    when: (m, ctx) => {
      const v = m.groups!.v
      if (DEFECTIVE_VERBS.has(v)) return false
      return !ctx.dict || !ctx.dict.has(v) || ctx.dict.has(`${v}ا`)
    },
    fix: (m) => [`${m.groups!.v}ا`],
    msg: (m) => wawMsg(`${m.groups!.v}ا`),
  },
)

const extraAlifMsg = (fix: string) => ({
  message: `The و belongs to the verb here, no alif: ${q(fix)}`,
  messageLocal: `الواو أصلية وليست واو جماعة، فلا ألف بعدها: ${qa(fix)}.`,
  explanation: `In أرجو (I hope), يبدو (it seems) and يدعو (he calls) the و is part of the root, not the plural ending, so no alif follows it.`,
  explanationLocal: `الواو في «أرجو، يبدو، يدعو» من أصل الفعل (رجا يرجو، بدا يبدو)، وليست واو الجماعة، فلا تُزاد بعدها ألف.`,
})

export const extraAlif = lexRule(
  {
    id: 'ar.extra-alif',
    title: 'أرجو (no alif after a root و)',
    category: 'spelling',
    confidence: 'high',
    examples: { flag: [['أرجوا أن تكون بخير', 'أرجوا', 'أرجو'], ['نرجوا لكم التوفيق', 'نرجوا', 'نرجو']], ok: ['أرجو أن تكون بخير.', 'أرجو أن تنجحوا.'] },
  },
  EXTRA_ALIF,
  (h) => extraAlifMsg(h.fixes[0]),
  { clitics: 'conj' },
)

const SUBJUNCTIVE_BEFORE = new Set(['لم', 'لن', 'أن', 'ان', 'كي', 'لكي', 'حتى', 'ل'])

export const extraAlif3sg: ArRule = arRule(
  {
    id: 'ar.extra-alif-3sg',
    title: 'يبدو (no alif with a singular subject)',
    category: 'spelling',
    confidence: 'medium',
    examples: { flag: [['يبدوا أنه متعب', 'يبدوا', 'يبدو']], ok: ['يبدو أنهم تعبوا.', 'يجب أن يبدوا مستعدين.'] },
  },
  (ctx) =>
    lookup(ctx, EXTRA_ALIF_3SG, { clitics: 'conj' })
      .filter((h) => {
        const i = ctx.words.indexOf(h.tok)
        const p = prev(ctx, i)
        return p < 0 || !SUBJUNCTIVE_BEFORE.has(bare(ctx.words[p].text))
      })
      .map((h) => tokenHit(h.tok, h.fixes, extraAlifMsg(h.fixes[0]))),
)

/* ------------------------------------------------------------------ */
/* Dialect sounds written down                                         */
/* ------------------------------------------------------------------ */

export const dadDha = lexRule(
  {
    id: 'ar.dad-dha',
    title: 'ض / ظ mix-up',
    category: 'spelling',
    confidence: 'medium',
    examples: {
      flag: [
        ['الضهر حار', 'الضهر', 'الظهر'],
        ['النضام جيد', 'النضام', 'النظام'],
        ['هذا مظبوط', 'مظبوط', 'مضبوط'],
      ],
      ok: ['الظهر حار، والظل بارد.', 'ضرب الضابط الطاولة بيده وانتظر.', 'نظرت إلى النظام الجديد بعناية.', 'الضوء ضعيف في الظلام.'],
    },
  },
  DAD_DHA,
  (h) => ({
    message: `ض and ظ mixed up: ${q(h.fixes[0])}`,
    messageLocal: `خلط بين الضاد والظاء: ${qa(h.fixes[0])}.`,
    explanation: `Many dialects pronounce ض and ظ the same way, but the spelling keeps them apart: الظهر (noon), النظام (system), ضابط (officer).`,
    explanationLocal: `تنطق لهجات كثيرة الضاد والظاء نطقًا واحدًا، لكن الرسم يفرق بينهما: الظهر، النظام، ضابط.`,
  }),
  { clitics: 'all' },
)

export const interdental = lexRule(
  {
    id: 'ar.interdental',
    title: 'ث / ذ written as ت، س، ز',
    category: 'spelling',
    confidence: 'medium',
    examples: {
      flag: [
        ['كتير من الناس', 'كتير', 'كثير'],
        ['زهب إلى السوق', 'زهب', 'ذهب'],
      ],
      ok: ['كثير من الناس يحبون الثلج.', 'ذهب زيد إلى سوق الذهب.', 'هذا زميلي الذكي.', 'ثلاثة أثواب ثمينة.'],
    },
  },
  INTERDENTAL,
  (h) => ({
    message: `Standard Arabic keeps ث and ذ: ${q(h.fixes[0])}`,
    messageLocal: `الفصحى تكتب الثاء والذال: ${qa(h.fixes[0])}.`,
    explanation: `In many dialects ث sounds like t or s and ذ like d or z, but the standard spelling keeps ث and ذ: كثير، ذهب، هذا.`,
    explanationLocal: `في اللهجات تُنطق الثاء تاءً أو سينًا والذال دالًا أو زايًا، لكن الفصحى تكتب الثاء والذال: كثير، ذهب، هذا.`,
  }),
  { clitics: 'all' },
)

/* ------------------------------------------------------------------ */
/* Tanween (only matters when harakat are typed)                       */
/* ------------------------------------------------------------------ */

const TANWEEN_MISSING = /([بتثجحخدذرزسشصضطظعغفقكلمنهوي])\u064B(?![ا\u0621-\u064A])/u
const TANWEEN_EXTRA = /(ة|اء)(?:\u064Bا|ا\u064B)/u

export const tanweenMissingAlif: ArRule = arRule(
  {
    id: 'ar.tanween-missing-alif',
    title: 'كتابًا (alif after tanween fath)',
    category: 'spelling',
    confidence: 'high',
    examples: { flag: [['قرأت كتابً', 'كتابً', 'كتابًا']], ok: ['قرأت كتابًا جميلًا.', 'شكرًا جزيلًا.', 'مساءً سعيدًا.', 'مدرسةً كبيرة.'] },
  },
  (ctx) =>
    ctx.words
      .filter((t) => TANWEEN_MISSING.test(t.text))
      .map((t) =>
        tokenHit(t, [t.text.replace(TANWEEN_MISSING, '$1\u064Bا')], {
          message: `Tanween fath needs an alif after it`,
          messageLocal: `تنوين النصب تتبعه ألف (كتابًا).`,
          explanation: `The accusative tanween is followed by an alif: كتابًا، شكرًا. No alif after ة, after اء or after ى: مدرسةً، مساءً، هدًى.`,
          explanationLocal: `يُكتب بعد تنوين النصب ألف: كتابًا، شكرًا، إلا بعد التاء المربوطة والهمزة المسبوقة بألف والألف المقصورة: مدرسةً، مساءً، هدًى.`,
        }),
      ),
)

export const tanweenExtraAlif: ArRule = arRule(
  {
    id: 'ar.tanween-extra-alif',
    title: 'مساءً (no alif after ة or اء)',
    category: 'spelling',
    confidence: 'high',
    examples: { flag: [['مساءاً سعيدا', 'مساءاً', 'مساءً']], ok: ['مساءً سعيدًا.', 'مساء الخير.'] },
  },
  (ctx) =>
    ctx.words
      .filter((t) => TANWEEN_EXTRA.test(t.text))
      .map((t) =>
        tokenHit(t, [t.text.replace(TANWEEN_EXTRA, '$1\u064B')], {
          message: `No alif after ${q('ة')} or ${q('اء')}: ${q('مساءً')}`,
          messageLocal: `لا تُكتب ألف التنوين بعد التاء المربوطة ولا بعد الهمزة المسبوقة بألف: مساءً.`,
          explanation: `After ة and after a hamza that follows an alif, tanween fath stands alone: مدرسةً، مساءً.`,
          explanationLocal: `بعد التاء المربوطة وبعد الهمزة المسبوقة بألف يُكتب التنوين وحده: مدرسةً، مساءً.`,
        }),
      ),
)

/* ------------------------------------------------------------------ */
/* Keyboard: Persian letters, repeated letters                         */
/* ------------------------------------------------------------------ */

const PERSIAN: Record<string, string> = { ی: 'ي', ک: 'ك', ہ: 'ه', ە: 'ه', ھ: 'ه' }
const PERSIAN_RE = /[یکہەھ۰-۹]/g

export const persianLetters: ArRule = arRule(
  {
    id: 'ar.persian-letters',
    title: 'Persian letters (wrong keyboard)',
    category: 'typo',
    confidence: 'high',
    examples: {
      flag: [
        ['علی الطاولة', 'علی', 'على'],
        ['کتاب', 'کتاب', 'كتاب'],
      ],
      ok: ['على الطاولة كتاب.'],
    },
  },
  (ctx) => {
    const out: RuleHit[] = []
    for (const t of ctx.words) {
      if (!/[یکہەھ۰-۹]/.test(t.text)) continue
      const base = t.text.replace(PERSIAN_RE, (c) => PERSIAN[c] ?? String.fromCharCode(c.charCodeAt(0) - 0x06f0 + 0x0660))
      const fixes = [base]
      // a final Persian yeh looks like ى: offer both, the likelier one first
      if (/ی$/.test(t.text)) {
        const maqsura = `${base.slice(0, -1)}ى`
        if (MAQSURA_WORDS.has(bare(maqsura))) fixes.unshift(maqsura)
        else fixes.push(maqsura)
      }
      out.push(
        tokenHit(t, fixes, {
          message: `Persian or Urdu letter: check the keyboard layout`,
          messageLocal: `حرف فارسي أو أردي؛ تأكد من اختيار لوحة المفاتيح العربية.`,
          explanation: `ی، ک and ہ come from the Persian or Urdu layout. They look almost the same but are different characters, so searches and spell checks miss them.`,
          explanationLocal: `الحروف ی وک وہ من لوحة المفاتيح الفارسية أو الأردية. تبدو مثل العربية لكنها حروف مختلفة، فلا يجدها البحث ولا المدقق الإملائي.`,
        }),
      )
    }
    return out
  },
)

const TRIPLE = /([\u0621-\u064A])\1{2,}/gu

export const elongation: ArRule = arRule(
  {
    id: 'ar.elongation',
    title: 'the same letter three times',
    category: 'typo',
    confidence: 'medium',
    examples: {
      flag: [
        ['جمييييل جدا', 'جمييييل', 'جميل'],
        ['الللغة العربية', 'الللغة', 'اللغة'],
      ],
      ok: ['جميل جدا.', 'هههههه', 'اللغة العربية جميلة.', 'مممم، لا أعرف.', 'آآآه، فهمت.'],
    },
  },
  (ctx) => {
    const out: RuleHit[] = []
    for (const t of ctx.words) {
      const w = bare(t.text)
      if (!new RegExp(TRIPLE.source, 'u').test(w)) continue
      // laughter and interjections (ههههه، مممم، آآآه، أوووه، ششش) are left alone
      if (/^[أآاوهمش]+$/.test(w)) continue
      const one = w.replace(TRIPLE, '$1')
      const two = w.replace(TRIPLE, '$1$1')
      // a letter may legitimately appear twice (اللغة = ال + لغة), so offer both, a known word first
      let fixes = /^[وفبك]?الل/.test(two) && !/^[وفبك]?الل/.test(one) ? [two, one] : [one, two]
      if (ctx.dict) fixes = [...fixes.filter((f) => ctx.dict!.has(f)), ...fixes.filter((f) => !ctx.dict!.has(f))]
      out.push(
        tokenHit(t, fixes, {
          message: `A letter typed three times or more`,
          messageLocal: `حرف مكرر؛ لا يتكرر حرف ثلاث مرات في كلمة عربية.`,
          explanation: `No Arabic word has the same letter three times in a row. Stretching a word (جمييييل) is fine in a chat, not in writing.`,
          explanationLocal: `لا يتكرر حرف ثلاث مرات متتالية في كلمة عربية. المد للتعبير مقبول في المحادثة، لا في الكتابة.`,
        }),
      )
    }
    return out
  },
)

export const letterRules: ArRule[] = [
  taaMarbutaInside,
  haForTaa,
  alifMaqsuraInside,
  yaForMaqsura,
  yaForMaqsuraBare,
  maqsuraForYa,
  hiddenAlif,
  wawJamaa,
  wawJamaaJussive,
  extraAlif,
  extraAlif3sg,
  dadDha,
  interdental,
  tanweenMissingAlif,
  tanweenExtraAlif,
  persianLetters,
  elongation,
]
