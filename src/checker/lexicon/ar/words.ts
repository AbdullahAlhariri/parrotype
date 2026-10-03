// Curated Arabic word lists for the rules (docs/research/arabic-typing.md sections 2 and 6).
// Wrong forms are typed without harakat or tatweel; rules strip those before looking words up.
// Every list is "wrong form -> right form(s)" with '|' between alternatives, best first.

const map = (o: Record<string, string>): ReadonlyMap<string, string[]> => new Map(Object.entries(o).map(([k, v]) => [k, v.split('|')]))
export const set = (words: string): ReadonlySet<string> => new Set(words.trim().split(/\s+/))

/** alif that is pronounced but never written: هذا، ذلك، لكن، هكذا، هؤلاء، أولئك */
export const HIDDEN_ALIF = map({
  هاذا: 'هذا',
  هاذه: 'هذه',
  هاذان: 'هذان',
  هاذين: 'هذين',
  هاكذا: 'هكذا',
  هاؤلاء: 'هؤلاء',
  هاؤلائ: 'هؤلاء',
  ذالك: 'ذلك',
  ذالكم: 'ذلكم',
  ذالكما: 'ذلكما',
  لاكن: 'لكن',
  لاكنه: 'لكنه',
  لاكنها: 'لكنها',
  لاكني: 'لكني',
  لاكنني: 'لكنني',
  لاكنك: 'لكنك',
  لاكنهم: 'لكنهم',
  لاكننا: 'لكننا',
  اولائك: 'أولئك',
  أولائك: 'أولئك',
})

/** hamzat al-wasl nouns written with a hamza: ابن، اسم، اثنان، امرأة (their plurals أبناء، أسماء are qat') */
export const WASL_NOUNS = map({
  إسم: 'اسم',
  إسمي: 'اسمي',
  إسمه: 'اسمه',
  إسمها: 'اسمها',
  إسمك: 'اسمك',
  إسمكم: 'اسمكم',
  إسمهم: 'اسمهم',
  إسمنا: 'اسمنا',
  إبن: 'ابن',
  إبنة: 'ابنة',
  إبني: 'ابني',
  إبنه: 'ابنه',
  إبنها: 'ابنها',
  إبنك: 'ابنك',
  إبنتي: 'ابنتي',
  إبنته: 'ابنته',
  إبنتها: 'ابنتها',
  إثنان: 'اثنان',
  إثنين: 'اثنين',
  أثنين: 'اثنين',
  إثنتان: 'اثنتان',
  إثنتين: 'اثنتين',
  إمرأة: 'امرأة',
  أمرأة: 'امرأة',
  إمرؤ: 'امرؤ',
})

/** loanwords, names and plurals that look like Form VII/VIII/X but really start with hamzat al-qat' */
export const WASL_PATTERN_EXCEPTIONS = set(`إنترنت أنبياء أنبيائه أنبيائهم أسترالي أسترالية أستراليا أنطوان إنجيل إنزيم
  إرتري إرترية ألتراس إنرجي إسطنبول إستونيا إستوني أستاذ أستاذة إسبانيا إسباني إسبانية أسطورة أسطول إسطبل إستاد`)

/**
 * Particles and pronouns that need hamzat al-qat' (only و/ف may be attached).
 * أن/إن/ان and friends are ambiguous and live in AN_HAMZA instead.
 */
export const HAMZA_PARTICLES = map({
  الى: 'إلى',
  اذا: 'إذا',
  انا: 'أنا',
  انت: 'أنت',
  انتم: 'أنتم',
  انتما: 'أنتما',
  انتن: 'أنتن',
  اين: 'أين',
  ايضا: 'أيضا',
  ابدا: 'أبدا',
  امس: 'أمس',
  الان: 'الآن',
  لان: 'لأن',
  لانه: 'لأنه',
  لانها: 'لأنها',
  لانهم: 'لأنهم',
  لاني: 'لأني',
  لانني: 'لأنني',
  لاننا: 'لأننا',
  امام: 'أمام|إمام',
  اما: 'أما|إما',
})

/** particles that are fine to look up only without any clitic (واو is the letter, واي فاي is Wi-Fi) */
export const HAMZA_BARE_ONLY = map({ او: 'أو', اي: 'أي' })

/** nouns and adjectives with hamzat al-qat' (any proclitic, including ال, may be attached) */
export const HAMZA_NOUNS = map({
  اطفال: 'أطفال',
  اخبار: 'أخبار',
  ارض: 'أرض',
  اسرة: 'أسرة',
  اسبوع: 'أسبوع',
  اهل: 'أهل',
  اسلام: 'إسلام',
  انسان: 'إنسان',
  اول: 'أول',
  اولى: 'أولى',
  اكثر: 'أكثر',
  اقل: 'أقل',
  افضل: 'أفضل',
  اخرى: 'أخرى',
  اخير: 'أخير',
  اخيرا: 'أخيرا',
  ايام: 'أيام',
  اسئلة: 'أسئلة',
  اصدقاء: 'أصدقاء',
  اولاد: 'أولاد',
  اخت: 'أخت',
  اخي: 'أخي',
  اختي: 'أختي',
  امي: 'أمي',
  ابي: 'أبي',
  اجمل: 'أجمل',
  اكبر: 'أكبر',
  اصغر: 'أصغر',
  اسهل: 'أسهل',
  احسن: 'أحسن',
  امريكا: 'أمريكا',
  اوروبا: 'أوروبا',
  المانيا: 'ألمانيا',
})

/** أن / إن without hamza: correct form depends on the sentence, so only a hint with both options */
export const AN_HAMZA = map({
  ان: 'أن|إن',
  انه: 'أنه|إنه',
  انها: 'أنها|إنها',
  انهم: 'أنهم|إنهم',
  اننا: 'أننا|إننا',
  انني: 'أنني|إنني',
  انك: 'أنك|إنك',
})

/** words ending in alif maqsura ى typed with a dotted ي. Names (موسى، مصطفى) and ambiguous words are left out. */
export const YA_FOR_MAQSURA = map({
  حتي: 'حتى',
  متي: 'متى',
  مستشفي: 'مستشفى',
  أخري: 'أخرى',
  اخري: 'أخرى',
  إحدي: 'إحدى',
  احدي: 'إحدى',
  أعلي: 'أعلى',
  اعلي: 'أعلى',
  أدني: 'أدنى',
  ادني: 'أدنى',
  أقصي: 'أقصى',
  اقصي: 'أقصى',
  بمعني: 'بمعنى',
  ملتقي: 'ملتقى',
  منتدي: 'منتدى',
  مقهي: 'مقهى',
  عسي: 'عسى',
})

/** إلى typed with ي: only looked up bare (والي is a governor, إليّ means to me) */
export const YA_FOR_MAQSURA_BARE = map({ الي: 'إلى|آلي', إلي: 'إلى|إليّ' })

/** words ending in ي written with ى (a common Egyptian habit, not standard MSA) */
export const MAQSURA_FOR_YA = map({
  فى: 'في',
  التى: 'التي',
  الذى: 'الذي',
  اللذى: 'الذي',
  هى: 'هي',
  لى: 'لي',
  بى: 'بي',
  أى: 'أي',
  اى: 'أي',
  لكى: 'لكي',
  الثانى: 'الثاني',
  يعنى: 'يعني',
  العربى: 'العربي',
  الماضى: 'الماضي',
  الحالى: 'الحالي',
  التالى: 'التالي',
  الدولى: 'الدولي',
  الحقيقى: 'الحقيقي',
})

/** fixed expressions where على is meant: علي الفور -> على الفور (علي alone is the name Ali, never flagged) */
export const ALA_EXPRESSIONS = set(`الفور الأقل الاقل الرغم الإطلاق الاطلاق الأرجح الارجح الأغلب الاغلب النحو التوالي
  الطاولة الأرض الارض الإنترنت الانترنت الهاتف الحائط حساب حسب سبيل أي اي كل`)

/**
 * Nouns and adjectives ending in taa marbuta, typed with ه. Key = the form without ال.
 * With ال the ه can't be the pronoun 'his' (no المدرسه = 'the his teacher'), so those are safe.
 */
export const HA_FOR_TAA = map({
  مدرسه: 'مدرسة',
  لغه: 'لغة',
  سنه: 'سنة',
  جامعه: 'جامعة',
  عربيه: 'عربية',
  حياه: 'حياة',
  كلمه: 'كلمة',
  مدينه: 'مدينة',
  ساعه: 'ساعة',
  سياره: 'سيارة',
  مرأه: 'مرأة',
  شركه: 'شركة',
  رساله: 'رسالة',
  دوله: 'دولة',
  حكومه: 'حكومة',
  طاوله: 'طاولة',
  غرفه: 'غرفة',
  قصه: 'قصة',
  مكتبه: 'مكتبة',
  صوره: 'صورة',
  فكره: 'فكرة',
  مشكله: 'مشكلة',
  حديقه: 'حديقة',
  صلاه: 'صلاة',
  كتابه: 'كتابة',
  قراءه: 'قراءة',
  دراسه: 'دراسة',
  جمله: 'جملة',
  هولنديه: 'هولندية',
  انجليزيه: 'إنجليزية',
  إنجليزيه: 'إنجليزية',
  فرنسيه: 'فرنسية',
  ألمانيه: 'ألمانية',
  اجتماعيه: 'اجتماعية',
  سعوديه: 'سعودية',
  متحده: 'متحدة',
  ماضيه: 'ماضية',
  قادمه: 'قادمة',
  ثانيه: 'ثانية',
  جديده: 'جديدة',
  مره: 'مرة',
  واحده: 'واحدة',
  ثلاثه: 'ثلاثة',
})

/**
 * Forms that are also fine without ال. Left out: مدرسه (مدرّسه 'his teacher'), كلمه (كلّمه 'he spoke to him'),
 * حياه (حيّاه 'he greeted him'), سنه (سنّه 'his age'), كتابه (his book), صوره، فكره، مكتبه، قصه، جمله...
 */
export const HA_FOR_TAA_BARE = set(`سياره رساله شركه ساعه لغه مدينه دوله حكومه طاوله غرفه مشكله حديقه صلاه دراسه
  عربيه هولنديه انجليزيه إنجليزيه فرنسيه ألمانيه اجتماعيه سعوديه جديده مره واحده ثلاثه`)

/** past-tense plurals missing the silent alif after waw al-jama'a */
export const WAW_JAMAA = map({
  كانو: 'كانوا',
  قالو: 'قالوا',
  ذهبو: 'ذهبوا',
  كتبو: 'كتبوا',
  رجعو: 'رجعوا',
  خرجو: 'خرجوا',
  دخلو: 'دخلوا',
  عملو: 'عملوا',
  فعلو: 'فعلوا',
  جاءو: 'جاؤوا|جاءوا',
  أكلو: 'أكلوا',
  اكلو: 'أكلوا',
  شربو: 'شربوا',
  لعبو: 'لعبوا',
  سافرو: 'سافروا',
  وصلو: 'وصلوا',
  درسو: 'درسوا',
  نامو: 'ناموا',
  قامو: 'قاموا',
  سألو: 'سألوا',
  عرفو: 'عرفوا',
  فهمو: 'فهموا',
  حضرو: 'حضروا',
  اشترو: 'اشتروا',
  أرادو: 'أرادوا',
  ارادو: 'أرادوا',
  أصبحو: 'أصبحوا',
  اصبحو: 'أصبحوا',
  صارو: 'صاروا',
  تعلمو: 'تعلموا',
  تكلمو: 'تكلموا',
  انتظرو: 'انتظروا',
  وجدو: 'وجدوا',
  أخذو: 'أخذوا',
  اخذو: 'أخذوا',
  اتصلو: 'اتصلوا',
  ساعدو: 'ساعدوا',
  نجحو: 'نجحوا',
  كونو: 'كونوا',
})

/** verbs whose final و is part of the root: يدعو، يرجو، يبدو (never add an alif to the singular) */
export const DEFECTIVE_VERBS = set(`يدعو يرجو يبدو يشكو يسمو يعلو ينمو يغزو يلهو يتلو يمحو يصحو يدنو ينجو يخلو يعدو
  تدعو ترجو تبدو تشكو تنمو تتلو تعلو تخلو تدنو تنجو`)

/** 1st person of a root-و verb with an extra alif: always wrong (I/we can't carry a plural marker) */
export const EXTRA_ALIF = map({ أرجوا: 'أرجو', نرجوا: 'نرجو', أدعوا: 'أدعو', ندعوا: 'ندعو', أشكوا: 'أشكو', نشكوا: 'نشكو' })

/** 3rd person singular with an extra alif (valid only as a plural after لن/لم/أن...) */
export const EXTRA_ALIF_3SG = map({ يبدوا: 'يبدو', تبدوا: 'تبدو', ارجوا: 'أرجو' })

/** final ئ that is right because the ي/و before it is a consonant with shadda or kasra: سيّئ، يهيّئ، مساوِئ */
export const FINAL_HAMZA_EXCEPTIONS = set('سيئ يهيئ تهيئ نهيئ أهيئ مهيئ متهيئ مساوئ')

/** hamza on the wrong seat (stronger-vowel rule) */
export const HAMZA_WORDS = map({
  شئ: 'شيء',
  الشئ: 'الشيء',
  بطئ: 'بطء|بطيء',
  تفائل: 'تفاؤل',
  التفائل: 'التفاؤل',
  تشائم: 'تشاؤم',
  التشائم: 'التشاؤم',
  تسائل: 'تساءل|تساؤل',
  مسأله: 'مسألة',
  رئيت: 'رأيت',
  سوأل: 'سؤال',
  مسؤل: 'مسؤول',
  يقرا: 'يقرأ',
})

/** ض/ظ swaps that produce non-words (real-word pairs like ضل/ظل are never listed) */
export const DAD_DHA = map({
  ضهر: 'ظهر',
  نضام: 'نظام',
  عضيم: 'عظيم',
  عضيمة: 'عظيمة',
  ضلم: 'ظلم',
  ظابط: 'ضابط',
  مظبوط: 'مضبوط',
  ظرب: 'ضرب',
  ضروف: 'ظروف',
  انتضار: 'انتظار',
  ملاحضة: 'ملاحظة',
  محافضة: 'محافظة',
  انضر: 'انظر',
  حضيرة: 'حظيرة',
})

/** dialect pronunciations of ث and ذ written down */
export const INTERDENTAL = map({
  كتير: 'كثير',
  تلاتة: 'ثلاثة',
  تلاته: 'ثلاثة',
  اسنين: 'اثنين',
  زهب: 'ذهب',
  ازا: 'إذا',
  إزا: 'إذا',
  لزلك: 'لذلك',
  زلك: 'ذلك',
  هازا: 'هذا',
  اللزي: 'الذي',
  كزب: 'كذب',
  مزبوط: 'مضبوط',
})

/** everyday dialect words (a style hint: the user may want dialect) */
export const DIALECT_WORDS = map({
  عشان: 'لأن|من أجل',
  علشان: 'لأن|من أجل',
  مش: 'ليس|غير',
  شو: 'ماذا|ما',
  ايش: 'ماذا',
  إيش: 'ماذا',
  هيك: 'هكذا',
  كده: 'هكذا',
  دلوقتي: 'الآن',
  ليش: 'لماذا',
  ازاي: 'كيف',
  فين: 'أين',
  برضو: 'أيضا',
})

/** older Egyptian spelling of مسؤول */
export const MASUUL = map({ مسئول: 'مسؤول', مسئولة: 'مسؤولة', مسئولية: 'مسؤولية', مسئولون: 'مسؤولون', مسئولين: 'مسؤولين' })

/** words that end in ى, used to order suggestions for a Persian ی at the end of a word */
export const MAQSURA_WORDS = set('على إلى حتى متى لدى مستشفى أخرى إحدى أعلى أدنى مدى مستوى معنى ملتقى منتدى مقهى عسى سوى')

/**
 * Exact wrong -> right map for the spell checker's suggestion ranking (same shape as EN_MISSPELLINGS).
 * Only unambiguous non-words; the rules above explain them in context.
 */
export const AR_MISSPELLINGS: ReadonlyMap<string, { right: string; note?: string }> = new Map(
  [HIDDEN_ALIF, WASL_NOUNS, HAMZA_WORDS, DAD_DHA, INTERDENTAL, EXTRA_ALIF, WAW_JAMAA, YA_FOR_MAQSURA]
    .flatMap((m) => [...m])
    .map(([wrong, fixes]): [string, { right: string }] => [wrong, { right: fixes[0] }]),
)
