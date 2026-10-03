import type { DictationSentence, FocusInfo, MinimalPair } from './types'

// Unvoweled MSA from docs/research/exercises-and-content.md §11.3 and docs/research/arabic-typing.md
// §7.4-7.5 (all pass the Arabic rule engine with zero flags). No Latin letters or digits inside
// sentences (bidi caret pain). Tashkeel is ignored when grading.

export const FOCUS_AR: Record<string, FocusInfo> = {
  hamza: { label: 'hamza', title: 'أ إ ؤ ئ ء: which seat?' },
  wasl: { label: "wasl or qat'", title: 'اسم, استخدم (plain alif) against أحمد, أنا' },
  'taa-marbuta': { label: 'taa marbuta', title: 'ة or ه at the end' },
  'alif-maqsura': { label: 'alif maqsura', title: 'ى or ي at the end' },
  tanween: { label: 'tanween', title: 'كتابا, شكرا: the extra alif' },
  'waw-jamaa': { label: "waw al-jama'a", title: 'كتبوا, ذهبوا: the extra alif' },
  letters: { label: 'similar letters', title: 'ض/ظ, ذ/ز, ث/س' },
  phrase: { label: 'set phrases', title: 'إن شاء الله' },
}

export const DICTATION_AR: DictationSentence[] = [
  /* ---------------- exercises-and-content.md §11.3 ---------------- */
  {
    id: 'ar-d01',
    text: 'ذهبت إلى السوق مع أمي.',
    level: 1,
    focus: ['alif-maqsura', 'hamza'],
    note: {
      en: 'إلى ends in alif maqsura (ى) and has its hamza under the alif (إ).',
      local: 'إلى تنتهي بألف مقصورة (ى)، وهمزتها تحت الألف (إ).',
    },
  },
  {
    id: 'ar-d02',
    text: 'هذه مدرسة كبيرة وجميلة.',
    level: 1,
    focus: ['taa-marbuta'],
    note: {
      en: 'Feminine words end in taa marbuta (ة), not haa (ه).',
      local: 'الكلمات المؤنثة تنتهي بتاء مربوطة (ة) لا بهاء (ه).',
    },
  },
  {
    id: 'ar-d03',
    text: 'قرأ أخي كتابا جديدا.',
    level: 1,
    focus: ['hamza', 'tanween'],
    note: {
      en: 'قرأ: a final hamza after a fatha sits on alif. كتابا جديدا: tanween fath adds an alif.',
      local: 'قرأ: الهمزة المتطرفة بعد فتحة تُكتب على الألف. كتابا جديدا: تنوين الفتح يُكتب بألف.',
    },
  },
  {
    id: 'ar-d04',
    text: 'سأل الطالب سؤالا مهما.',
    level: 1,
    focus: ['hamza'],
    note: {
      en: 'سأل: hamza with fatha sits on alif. سؤالا: after a damma it sits on waw.',
      local: 'سأل: الهمزة المفتوحة على الألف. سؤالا: بعد الضمة تُكتب على الواو.',
    },
  },
  {
    id: 'ar-d05',
    text: 'اشتريت ماء باردا من المقهى.',
    level: 1,
    focus: ['wasl', 'hamza', 'alif-maqsura'],
    note: {
      en: 'اشتريت starts with hamzat al-wasl, a plain ا. ماء: hamza on the line after a long alif.',
      local: 'اشتريت تبدأ بهمزة وصل (ا بلا همزة). ماء: الهمزة على السطر بعد ألف المد.',
    },
  },
  {
    id: 'ar-d06',
    text: 'مستشفى المدينة قريب من بيتنا.',
    level: 2,
    focus: ['alif-maqsura', 'taa-marbuta'],
    note: {
      en: 'مستشفى ends in alif maqsura, المدينة in taa marbuta.',
      local: 'مستشفى تنتهي بألف مقصورة، والمدينة بتاء مربوطة.',
    },
  },
  {
    id: 'ar-d07',
    text: 'في المساء نشرب الشاي في الحديقة.',
    level: 2,
    focus: ['hamza', 'taa-marbuta'],
    note: {
      en: 'المساء: hamza on the line after a long alif. في ends in yaa, not ى.',
      local: 'المساء: الهمزة على السطر بعد الألف. في تنتهي بياء لا بألف مقصورة.',
    },
  },
  {
    id: 'ar-d08',
    text: 'رأيت طائرة كبيرة في السماء.',
    level: 2,
    focus: ['hamza', 'taa-marbuta'],
    note: {
      en: 'رأيت: hamza on alif. طائرة: hamza with kasra sits on a seat (ئ).',
      local: 'رأيت: الهمزة على الألف. طائرة: الهمزة المكسورة على نبرة (ئ).',
    },
  },
  {
    id: 'ar-d09',
    text: 'هل تريد أن تأكل شيئا؟',
    level: 2,
    focus: ['hamza', 'tanween'],
    note: {
      en: 'شيء becomes شيئا with tanween: the hamza moves onto a seat.',
      local: 'شيء مع تنوين الفتح تُكتب شيئا، فتنتقل الهمزة إلى النبرة.',
    },
  },
  {
    id: 'ar-d10',
    text: 'الامتحان غدا في الساعة التاسعة.',
    level: 2,
    focus: ['wasl', 'taa-marbuta'],
    note: {
      en: 'الامتحان has hamzat al-wasl, so no hamza on the alif after ال.',
      local: 'الامتحان فيها همزة وصل، فلا تُكتب همزة على الألف بعد ال.',
    },
  },
  {
    id: 'ar-d11',
    text: 'يدرس أصدقائي اللغة الهولندية.',
    level: 2,
    focus: ['hamza', 'taa-marbuta'],
    note: {
      en: 'أصدقائي: the hamza with kasra sits on ئ.',
      local: 'أصدقائي: الهمزة المكسورة تُكتب على نبرة (ئ).',
    },
  },
  {
    id: 'ar-d12',
    text: 'مصطفى يحب القراءة كثيرا.',
    level: 3,
    focus: ['alif-maqsura', 'hamza'],
    note: {
      en: 'مصطفى ends in ى. القراءة: hamza on the line after a long alif.',
      local: 'مصطفى تنتهي بألف مقصورة. القراءة: الهمزة على السطر بعد الألف.',
    },
  },
  {
    id: 'ar-d13',
    text: 'لا تنس أن تغلق الباب.',
    level: 3,
    focus: ['alif-maqsura', 'hamza'],
    note: {
      en: 'تنس: after لا of prohibition the verb is jussive and loses its final ى.',
      local: 'تنس: فعل مجزوم بلا الناهية، فيُحذف حرف العلة من آخره.',
    },
  },
  {
    id: 'ar-d14',
    text: 'هؤلاء الأطفال يلعبون في الحديقة.',
    level: 3,
    focus: ['hamza'],
    note: {
      en: 'هؤلاء: hamza on waw, and a hidden alif after ه.',
      local: 'هؤلاء: الهمزة على الواو، وفيها ألف محذوفة بعد الهاء.',
    },
  },
  {
    id: 'ar-d15',
    text: 'شكرا على مساعدتك يا صديقي.',
    level: 3,
    focus: ['alif-maqsura', 'taa-marbuta', 'tanween'],
    note: {
      en: 'على ends in ى. مساعدة becomes مساعدتك: taa marbuta turns into ت before a suffix.',
      local: 'على تنتهي بألف مقصورة. مساعدة تصبح مساعدتك: التاء المربوطة تُفتح قبل الضمير.',
    },
  },

  /* ---------------- arabic-typing.md §7.4 and §7.5 ---------------- */
  {
    id: 'ar-e01',
    text: 'أنا أتعلم الكتابة على لوحة المفاتيح كل يوم.',
    level: 2,
    focus: ['wasl', 'taa-marbuta'],
    note: { en: "أنا and أتعلم start with hamzat al-qat' (أ).", local: 'أنا وأتعلم تبدآن بهمزة قطع (أ).' },
  },
  {
    id: 'ar-e02',
    text: 'يسكن صديقي في أمستردام منذ ثلاث سنوات.',
    level: 2,
    focus: ['letters'],
    note: { en: 'ث in ثلاث, س in يسكن and سنوات.', local: 'ثلاث بالثاء، ويسكن وسنوات بالسين.' },
  },
  {
    id: 'ar-e03',
    text: 'الطقس في هولندا بارد وممطر في الشتاء.',
    level: 2,
    focus: ['hamza'],
    note: { en: 'الشتاء: hamza on the line after a long alif.', local: 'الشتاء: الهمزة على السطر بعد الألف.' },
  },
  {
    id: 'ar-e04',
    text: 'إن شاء الله سأزورك غدا مساء.',
    level: 2,
    focus: ['phrase', 'hamza'],
    note: {
      en: 'إن شاء الله is three words. إنشاء is a different word (creation).',
      local: 'إن شاء الله ثلاث كلمات، أما إنشاء فكلمة أخرى.',
    },
  },
  {
    id: 'ar-e05',
    text: 'سأل المعلم سؤالا سهلا، فأجاب الطالب بسرعة.',
    level: 2,
    focus: ['hamza', 'tanween'],
    note: { en: 'سأل: hamza on alif. سؤالا: hamza on waw.', local: 'سأل: الهمزة على الألف. سؤالا: الهمزة على الواو.' },
  },
  {
    id: 'ar-e06',
    text: 'رأيت ببغاء ملونا في الحديقة.',
    level: 1,
    focus: ['hamza', 'tanween'],
    note: { en: 'ببغاء (parrot): hamza on the line after a long alif.', local: 'ببغاء: الهمزة على السطر بعد الألف.' },
  },
  {
    id: 'ar-e07',
    text: 'لم يكتبوا الرسالة، لكنهم اتصلوا بالهاتف.',
    level: 2,
    focus: ['waw-jamaa', 'wasl'],
    note: { en: "يكتبوا and اتصلوا: waw al-jama'a gets an extra alif.", local: 'يكتبوا واتصلوا: تُكتب ألف فارقة بعد واو الجماعة.' },
  },
  {
    id: 'ar-e08',
    text: 'اسمي أحمد، وأنا من سوريا.',
    level: 1,
    focus: ['wasl'],
    note: { en: "اسم has hamzat al-wasl (ا). أحمد and أنا have qat' (أ).", local: 'اسم بهمزة وصل، وأحمد وأنا بهمزة قطع.' },
  },
  {
    id: 'ar-e09',
    text: 'انتظرت الحافلة عشر دقائق.',
    level: 1,
    focus: ['wasl', 'hamza'],
    note: { en: 'انتظرت: hamzat al-wasl. دقائق: hamza on a seat (ئ).', local: 'انتظرت: همزة وصل. دقائق: الهمزة على نبرة.' },
  },
  {
    id: 'ar-e10',
    text: 'استخدم الطالب الحاسوب لكتابة المقال.',
    level: 2,
    focus: ['wasl', 'taa-marbuta'],
    note: { en: 'استخدم (form X) starts with hamzat al-wasl.', local: 'استخدم (على وزن استفعل) تبدأ بهمزة وصل.' },
  },
  {
    id: 'ar-e11',
    text: 'هذا شيء بسيط، لكنه مهم.',
    level: 1,
    focus: ['hamza'],
    note: {
      en: 'شيء: hamza on the line after a yaa with sukun. هذا and لكنه hide an alif.',
      local: 'شيء: الهمزة على السطر بعد ياء ساكنة. في هذا ولكنه ألف محذوفة.',
    },
  },
  {
    id: 'ar-e12',
    text: 'الطلاب كتبوا الدرس وذهبوا إلى البيت.',
    level: 2,
    focus: ['waw-jamaa', 'alif-maqsura'],
    note: { en: "كتبوا, ذهبوا: an alif after waw al-jama'a.", local: 'كتبوا وذهبوا: ألف فارقة بعد واو الجماعة.' },
  },
  {
    id: 'ar-e13',
    text: 'مشى الولد إلى المستشفى.',
    level: 1,
    focus: ['alif-maqsura'],
    note: { en: 'مشى, إلى, المستشفى: the final alif sound is written ى.', local: 'مشى وإلى والمستشفى: الألف في آخرها مقصورة.' },
  },
  {
    id: 'ar-e14',
    text: 'الظهر حار، والظل بارد.',
    level: 1,
    focus: ['letters'],
    note: { en: 'ظ in الظهر and الظل, not ض or ز.', local: 'الظهر والظل بالظاء، لا بالضاد ولا بالزاي.' },
  },
  {
    id: 'ar-e15',
    text: 'ذهب زيد إلى سوق الذهب.',
    level: 1,
    focus: ['letters', 'alif-maqsura'],
    note: { en: 'ذ in ذهب and الذهب, ز in زيد.', local: 'ذهب والذهب بالذال، وزيد بالزاي.' },
  },
  {
    id: 'ar-e16',
    text: 'كتابة الرسالة سهلة، وكتابه جديد.',
    level: 2,
    focus: ['taa-marbuta'],
    note: {
      en: 'كتابة (writing) ends in ة. كتابه (his book) is كتاب + the pronoun ه.',
      local: 'كتابة مصدر ينتهي بتاء مربوطة، وكتابه = كتاب + الضمير ه.',
    },
  },
  {
    id: 'ar-e17',
    text: 'هذا شيء جميل، والقطار بطيء.',
    level: 2,
    focus: ['hamza'],
    note: { en: 'شيء and بطيء: hamza on the line after a long vowel.', local: 'شيء وبطيء: الهمزة على السطر بعد حرف مد.' },
  },
  {
    id: 'ar-e18',
    text: 'تفاءل بالخير، فالتفاؤل مهم.',
    level: 3,
    focus: ['hamza'],
    note: {
      en: 'تفاءل: hamza on the line after a long alif. التفاؤل: after a damma it sits on waw.',
      local: 'تفاءل: الهمزة على السطر بعد الألف. التفاؤل: بعد الضمة على الواو.',
    },
  },
  {
    id: 'ar-e19',
    text: 'أتعلم اللغة الهولندية في المساء.',
    level: 1,
    focus: ['wasl', 'taa-marbuta'],
    note: { en: "أتعلم: qat'. اللغة: the ال of the article is wasl.", local: 'أتعلم: همزة قطع. اللغة: أل التعريف همزتها همزة وصل.' },
  },
  {
    id: 'ar-e20',
    text: 'اشتريت الجبن من السوق يوم السبت.',
    level: 1,
    focus: ['wasl'],
    note: { en: 'اشتريت (form VIII): hamzat al-wasl, a plain ا.', local: 'اشتريت (على وزن افتعل): همزة وصل.' },
  },
  {
    id: 'ar-e21',
    text: 'اجتمع أحمد وإخوته في البيت.',
    level: 1,
    focus: ['wasl'],
    note: { en: "اجتمع: wasl. أحمد and إخوته: qat'.", local: 'اجتمع: همزة وصل. أحمد وإخوته: همزة قطع.' },
  },
  {
    id: 'ar-e22',
    text: 'هذه شجرة عالية، وتلك فاكهة لذيذة.',
    level: 2,
    focus: ['taa-marbuta', 'letters'],
    note: { en: 'شجرة, عالية, فاكهة and لذيذة all end in ة. لذيذة has ذ twice.', local: 'شجرة وعالية وفاكهة ولذيذة تنتهي بتاء مربوطة. وفي لذيذة ذالان.' },
  },
]

export const PAIRS_AR: MinimalPair[] = [
  {
    id: 'kitaba-kitabuh',
    lang: 'ar',
    words: ['كتابة', 'كتابه'],
    note: {
      en: 'كتابة (writing) ends in taa marbuta. كتابه is كتاب + ه (his book).',
      local: 'كتابة مصدر ينتهي بتاء مربوطة، وكتابه = كتاب + الضمير ه.',
    },
    sentences: [
      { text: 'كتابة الرسالة سهلة.', word: 'كتابة' },
      { text: 'كتابه جديد.', word: 'كتابه' },
      { text: 'أحب كتابة القصص.', word: 'كتابة' },
      { text: 'نسي أحمد كتابه في البيت.', word: 'كتابه' },
    ],
  },
  {
    id: 'dalla-zalla',
    lang: 'ar',
    words: ['ضل', 'ظل'],
    note: {
      en: 'ضل = got lost (ض). ظل = stayed, or shade (ظ).',
      local: 'ضل بمعنى تاه (بالضاد)، وظل بمعنى بقي أو الفيء (بالظاء).',
    },
    sentences: [
      { text: 'ظل الجو حارا طوال اليوم.', word: 'ظل' },
      { text: 'ضل الرجل طريقه في الصحراء.', word: 'ضل' },
      { text: 'ظل الطفل نائما حتى الظهر.', word: 'ظل' },
      { text: 'ضل السائح في المدينة القديمة.', word: 'ضل' },
    ],
  },
]
