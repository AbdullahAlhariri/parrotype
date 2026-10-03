import type { WritingPrompt } from './types'

// Arabic writing prompts (phase 2: basic support). Modern Standard Arabic, written without
// tashkeel, as people type it. Focus tags point at the usual typing traps: hamza seats,
// taa marbuta vs haa, alif maqsura vs yaa, hamzat al-wasl.

const p = (id: string, kind: WritingPrompt['kind'], words: number, text: string, focus: string[], watch?: string): WritingPrompt => ({
  id: `ar-${id}`,
  lang: 'ar',
  kind,
  words,
  text,
  focus,
  ...(watch ? { watch } : {}),
})

export const AR_PROMPTS: WritingPrompt[] = [
  p('p01', 'journal', 100, 'صف يومك المثالي من الصباح إلى المساء.', ['alif-maqsura', 'hamza']),
  p('p02', 'letter', 80, 'اكتب رسالة قصيرة إلى صديق تدعوه فيها إلى زيارتك.', ['alif-maqsura', 'taa-marbuta']),
  p('p03', 'journal', 100, 'ما أجمل مكان زرته؟ ولماذا أحببته؟', ['hamza']),
  p('p04', 'explain', 120, 'اكتب عن طبق تحبه، واشرح كيف تحضره خطوة بخطوة.', ['taa-marbuta']),
  p('p05', 'story', 100, 'تخيل أن عندك ببغاء يتكلم. ماذا ستعلمه أن يقول؟', ['hamza']),
  p('p06', 'describe', 100, 'صف مدينتك في فصل الشتاء: ماذا ترى؟ وماذا تسمع؟', ['alif-maqsura']),
  p('p07', 'journal', 100, 'اكتب عن شخص تعلمت منه شيئا مهما.', ['hamza', 'tanween']),
  p('p08', 'opinion', 120, 'ما الذي تفعله لتتعلم لغة جديدة؟ اذكر ثلاث نصائح.', ['taa-marbuta', 'hamzat-wasl']),
  p('p09', 'story', 120, 'اكتب قصة قصيرة تبدأ بهذه الجملة: «فتحت الباب، فوجدت رسالة على الأرض.»', ['story', 'alif-maqsura']),
  p('p10', 'opinion', 100, 'ما رأيك في استخدام الهاتف قبل النوم؟ اكتب فقرة قصيرة.', ['hamza', 'hamzat-wasl']),
  p('p11', 'letter', 100, 'اكتب رسالة شكر إلى معلم أو زميل ساعدك.', ['taa-marbuta']),
  p('p12', 'explain', 120, 'اشرح لصديق كيف يصل من المطار إلى بيتك.', ['alif-maqsura', 'imperative']),
  p('p13', 'describe', 100, 'صف غرفتك: ماذا يوجد فيها؟ وأين تضع أشياءك المفضلة؟', ['hamza']),
  p('p14', 'trap', 100, 'ماذا فعلت أمس؟ وماذا ستفعل غدا؟', ['past-future', 'hamza'], 'أمس / غدا'),
  p('p15', 'trap', 100, 'اكتب عن رحلة إلى مدينة أخرى، واستخدم كلمات مثل: إلى، على، مستشفى، مبنى.', ['alif-maqsura'], 'ى / ي'),
]
