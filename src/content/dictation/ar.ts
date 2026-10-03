import type { DictationSentence, FocusInfo, MinimalPair } from './types'

// Unvoweled MSA. ar-d* and ar-e* come from docs/research/exercises-and-content.md §11.3 and
// docs/research/arabic-typing.md §7.4-7.5; ar-f* were written for parity with Dutch and English.
// Every sentence passes the Arabic rule engine and Hunspell with zero flags. Only standard letters
// (U+0621-U+064A) and Arabic punctuation: no Latin letters, digits or tashkeel inside sentences
// (bidi caret pain). Tashkeel is ignored when grading anyway.
// Recorded audio exists for these ids: change a text only to fix a real mistake.
// English notes and titles render left to right: never let punctuation alone separate two Arabic
// words ("ثلاث سنوات: سنة is"), or bidi joins them into one run and flips their order. Put an
// English word in between ("In ثلاث سنوات the number..."). ar.test.ts checks this.

export const FOCUS_AR: Record<string, FocusInfo> = {
  hamza: { label: 'start hamza', title: 'أ or إ at the start: أنا، إلى، أمس، لأن' },
  wasl: { label: 'hamzat al-wasl', title: 'A plain alif with no hamza: اسم، ابن، امرأة، استخدم، اجتماع' },
  'hamza-mid': { label: 'middle hamza', title: 'سأل، سؤال، سئل، تساءل: the vowels pick the seat' },
  'hamza-end': { label: 'end hamza', title: 'قرأ، شاطئ، تباطؤ، شيء، ماء: the letter before picks the seat' },
  'taa-marbuta': { label: 'taa marbuta', title: 'ة or ه at the end, and ت before a suffix' },
  'alif-maqsura': { label: 'alif maqsura', title: 'ى or ي at the end: على، في، مستشفى' },
  tanween: { label: 'tanween alif', title: 'كتابا، شكرا: the extra alif, but not after ة or اء' },
  'waw-jamaa': { label: "waw al-jama'a", title: 'كتبوا، ذهبوا: the extra alif, but not in يدعو or أرجو' },
  lam: { label: 'lam shamsiyya', title: 'الشمس، النور، الليل: the ل you write but do not hear' },
  'hidden-alif': { label: 'hidden alif', title: 'هذا، ذلك، لكن، هؤلاء: a long a with no alif' },
  'd-z': { label: 'ض/ظ', title: 'ض or ظ, as in ضاع، الظهر، انتظر، الضوء' },
  'dh-z': { label: 'ذ/ز/ظ', title: 'ذ or ز or ظ, as in ذهب، زرت، نظرت' },
  'th-s': { label: 'ث/س', title: 'ث or س, as in ثلاثة، كثير، سنة' },
  't-t': { label: 'ت/ط', title: 'ت or ط, as in التين، الطين، القطار' },
  'q-k': { label: 'ق/ك', title: 'ق or ك, as in قلب، كلب، قصة' },
  phrase: { label: 'set phrases', title: 'إن شاء الله، ما شاء الله، بإذن الله' },
  numbers: { label: 'numbers in words', title: 'ثلاثة كتب، خمس سيارات: from three to ten the number flips gender' },
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
    focus: ['hamza-end', 'tanween'],
    note: {
      en: 'قرأ: a final hamza after a fatha sits on alif. كتابا جديدا: tanween fath adds an alif.',
      local: 'قرأ: الهمزة المتطرفة بعد فتحة تُكتب على الألف. كتابا جديدا: تنوين الفتح يُكتب بألف.',
    },
  },
  {
    id: 'ar-d04',
    text: 'سأل الطالب سؤالا مهما.',
    level: 1,
    focus: ['hamza-mid', 'tanween'],
    note: {
      en: 'سأل: hamza with fatha sits on alif. سؤالا: after a damma it sits on waw.',
      local: 'سأل: الهمزة المفتوحة على الألف. سؤالا: بعد الضمة تُكتب على الواو.',
    },
  },
  {
    id: 'ar-d05',
    text: 'اشتريت ماء باردا من المقهى.',
    level: 1,
    focus: ['wasl', 'hamza-end', 'tanween', 'alif-maqsura'],
    note: {
      en: 'اشتريت starts with hamzat al-wasl, a plain alif. In ماء the hamza sits on the line after a long alif, with no tanween alif after it, while باردا does get one. المقهى ends in ى.',
      local: 'اشتريت تبدأ بهمزة وصل (ا بلا همزة). ماء: الهمزة على السطر بعد ألف المد، ولا تُزاد بعدها ألف التنوين. أما باردا فتُزاد. والمقهى تنتهي بألف مقصورة.',
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
    focus: ['hamza-end', 'lam', 'taa-marbuta'],
    note: {
      en: 'In المساء the hamza sits on the line after a long alif. You hear ash-shaay, but the ل of الشاي is still written. الحديقة ends in ة. And في ends in a dotted ي, not ى.',
      local: 'المساء: الهمزة على السطر بعد الألف. الشاي: اللام لا تُنطق لكنها تُكتب. والحديقة تنتهي بتاء مربوطة. أما في فتنتهي بياء لا بألف مقصورة.',
    },
  },
  {
    id: 'ar-d08',
    text: 'رأيت طائرة كبيرة في السماء.',
    level: 2,
    focus: ['hamza-mid', 'hamza-end', 'taa-marbuta'],
    note: {
      en: 'رأيت: hamza on alif. طائرة: hamza with kasra sits on a seat (ئ). السماء: on the line after a long alif. طائرة and كبيرة end in ة.',
      local: 'رأيت: الهمزة على الألف. طائرة: الهمزة المكسورة على نبرة (ئ). السماء: على السطر بعد الألف. وطائرة وكبيرة تنتهيان بتاء مربوطة.',
    },
  },
  {
    id: 'ar-d09',
    text: 'هل تريد أن تأكل شيئا؟',
    level: 2,
    focus: ['hamza-end', 'tanween'],
    note: {
      en: 'شيء becomes شيئا with tanween: the hamza moves onto a seat.',
      local: 'شيء مع تنوين الفتح تُكتب شيئا، فتنتقل الهمزة إلى النبرة.',
    },
  },
  {
    id: 'ar-d10',
    text: 'الامتحان غدا في الساعة التاسعة.',
    level: 2,
    focus: ['wasl', 'numbers', 'taa-marbuta'],
    note: {
      en: 'الامتحان has hamzat al-wasl, so no hamza on the alif after ال. Clock times use the ordinal: الساعة التاسعة, both with ة at the end.',
      local: 'الامتحان فيها همزة وصل، فلا تُكتب همزة على الألف بعد ال. ومع الساعة نستعمل العدد الترتيبي: الساعة التاسعة، وكلتاهما تنتهي بتاء مربوطة.',
    },
  },
  {
    id: 'ar-d11',
    text: 'يدرس أصدقائي اللغة الهولندية.',
    level: 2,
    focus: ['hamza-mid', 'taa-marbuta'],
    note: {
      en: 'أصدقائي: the hamza with kasra sits on ئ.',
      local: 'أصدقائي: الهمزة المكسورة تُكتب على نبرة (ئ).',
    },
  },
  {
    id: 'ar-d12',
    text: 'مصطفى يحب القراءة كثيرا.',
    level: 2,
    focus: ['alif-maqsura', 'hamza-mid', 'tanween'],
    note: {
      en: 'مصطفى ends in ى. In القراءة the hamza sits on the line after a long alif. كثيرا takes the tanween alif.',
      local: 'مصطفى تنتهي بألف مقصورة. القراءة: الهمزة على السطر بعد الألف. وكثيرا يُكتب تنوينها بألف.',
    },
  },
  {
    id: 'ar-d13',
    text: 'لا تنس أن تغلق الباب.',
    level: 2,
    focus: ['alif-maqsura', 'hamza'],
    note: {
      en: 'After لا of prohibition the verb is jussive, so تنسى loses its ى and becomes تنس. The أ of أن keeps its hamza.',
      local: 'تنس: فعل مجزوم بلا الناهية، فيُحذف حرف العلة من آخره. وأن همزتها همزة قطع.',
    },
  },
  {
    id: 'ar-d14',
    text: 'هؤلاء الأطفال يلعبون في الحديقة.',
    level: 2,
    focus: ['hamza-mid', 'hidden-alif'],
    note: {
      en: 'هؤلاء: hamza on waw, and a hidden alif after ه.',
      local: 'هؤلاء: الهمزة على الواو، وفيها ألف محذوفة بعد الهاء.',
    },
  },
  {
    id: 'ar-d15',
    text: 'شكرا على مساعدتك يا صديقي.',
    level: 2,
    focus: ['alif-maqsura', 'taa-marbuta', 'tanween'],
    note: {
      en: 'شكرا takes the tanween alif and على ends in ى. Before a suffix, taa marbuta turns into ت, so مساعدة becomes مساعدتك.',
      local: 'شكرا يُكتب تنوينها بألف، وعلى تنتهي بألف مقصورة. ومساعدة تصبح مساعدتك: التاء المربوطة تُفتح قبل الضمير.',
    },
  },

  /* ---------------- arabic-typing.md §7.4 and §7.5 ---------------- */
  {
    id: 'ar-e01',
    text: 'أنا أتعلم الكتابة على لوحة المفاتيح كل يوم.',
    level: 2,
    focus: ['hamza', 'taa-marbuta'],
    note: { en: "أنا and أتعلم start with hamzat al-qat' (أ). الكتابة and لوحة end in ة.", local: 'أنا وأتعلم تبدآن بهمزة قطع (أ). والكتابة ولوحة تنتهيان بتاء مربوطة.' },
  },
  {
    id: 'ar-e02',
    text: 'يسكن صديقي في أمستردام منذ ثلاث سنوات.',
    level: 2,
    focus: ['th-s', 'numbers'],
    note: {
      en: 'ثلاث is spelled with ث, while يسكن and سنوات have س. In ثلاث سنوات the number has no ة, because سنة is feminine.',
      local: 'ثلاث بالثاء، ويسكن وسنوات بالسين. ثلاث سنوات: سنة مؤنثة، فيأتي العدد بلا تاء.',
    },
  },
  {
    id: 'ar-e03',
    text: 'الطقس في هولندا بارد وممطر في الشتاء.',
    level: 2,
    focus: ['hamza-end', 'lam'],
    note: {
      en: 'الشتاء: hamza on the line after a long alif. In الطقس and الشتاء the ل is written but not heard.',
      local: 'الشتاء: الهمزة على السطر بعد الألف. وفي الطقس والشتاء تُكتب اللام ولا تُنطق.',
    },
  },
  {
    id: 'ar-e04',
    text: 'إن شاء الله سأزورك غدا مساء.',
    level: 2,
    focus: ['phrase', 'tanween'],
    note: {
      en: 'إن شاء الله is three words. إنشاء is a different word (creation). غدا has the tanween alif, مساء has none after its ـاء.',
      local: 'إن شاء الله ثلاث كلمات، أما إنشاء فكلمة أخرى. وغدا تُكتب بألف التنوين، أما مساء فلا ألف بعد همزتها.',
    },
  },
  {
    id: 'ar-e05',
    text: 'سأل المعلم سؤالا سهلا، فأجاب الطالب بسرعة.',
    level: 2,
    focus: ['hamza-mid', 'tanween'],
    note: { en: 'سأل: hamza on alif. سؤالا: hamza on waw. سؤالا and سهلا take the tanween alif.', local: 'سأل: الهمزة على الألف. سؤالا: الهمزة على الواو. وسؤالا وسهلا يُكتب تنوينهما بألف.' },
  },
  {
    id: 'ar-e06',
    text: 'رأيت ببغاء ملونا في الحديقة.',
    level: 1,
    focus: ['hamza-end', 'tanween'],
    note: {
      en: 'ببغاء (parrot): hamza on the line after a long alif, and no tanween alif after it. ملونا does take one.',
      local: 'ببغاء: الهمزة على السطر بعد الألف، ولا تُزاد بعدها ألف التنوين. أما ملونا فتُزاد.',
    },
  },
  {
    id: 'ar-e07',
    text: 'لم يكتبوا الرسالة، لكنهم اتصلوا بالهاتف.',
    level: 2,
    focus: ['waw-jamaa', 'hidden-alif', 'wasl'],
    note: {
      en: "يكتبوا and اتصلوا: waw al-jama'a gets an extra alif. لكنهم: no alif after the ل, though you hear one. اتصلوا also starts with hamzat al-wasl.",
      local: 'يكتبوا واتصلوا: تُكتب ألف فارقة بعد واو الجماعة. لكنهم: لا تُكتب ألف بعد اللام مع أنها تُنطق. واتصلوا تبدأ بهمزة وصل.',
    },
  },
  {
    id: 'ar-e08',
    text: 'اسمي أحمد، وأنا من سوريا.',
    level: 1,
    focus: ['wasl', 'hamza'],
    note: { en: "اسم has hamzat al-wasl (ا). أحمد and أنا have qat' (أ).", local: 'اسم بهمزة وصل، وأحمد وأنا بهمزة قطع.' },
  },
  {
    id: 'ar-e09',
    text: 'انتظرت الحافلة عشر دقائق.',
    level: 1,
    focus: ['wasl', 'hamza-mid', 'numbers', 'd-z'],
    note: {
      en: 'انتظرت starts with hamzat al-wasl and is spelled with ظ. In دقائق the hamza sits on a seat (ئ). The number in عشر دقائق has no ة, because دقيقة is feminine.',
      local: 'انتظرت: همزة وصل، وتُكتب بالظاء. دقائق: الهمزة على نبرة. عشر دقائق: دقيقة مؤنثة، فيأتي العدد بلا تاء.',
    },
  },
  {
    id: 'ar-e10',
    text: 'استخدم الطالب الحاسوب لكتابة المقال.',
    level: 2,
    focus: ['wasl', 'taa-marbuta'],
    note: { en: 'استخدم (form X) starts with hamzat al-wasl. لكتابة ends in ة.', local: 'استخدم (على وزن استفعل) تبدأ بهمزة وصل. ولكتابة تنتهي بتاء مربوطة.' },
  },
  {
    id: 'ar-e11',
    text: 'هذا شيء بسيط، لكنه مهم.',
    level: 1,
    focus: ['hamza-end', 'hidden-alif'],
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
    note: { en: "كتبوا and ذهبوا get an alif after waw al-jama'a. The word إلى ends in ى.", local: 'كتبوا وذهبوا: ألف فارقة بعد واو الجماعة. وإلى تنتهي بألف مقصورة.' },
  },
  {
    id: 'ar-e13',
    text: 'مشى الولد إلى المستشفى.',
    level: 1,
    focus: ['alif-maqsura'],
    note: { en: 'مشى، إلى، المستشفى: the final alif sound is written ى.', local: 'مشى وإلى والمستشفى: الألف في آخرها مقصورة.' },
  },
  {
    id: 'ar-e14',
    text: 'الظهر حار، والظل بارد.',
    level: 1,
    focus: ['d-z'],
    note: { en: 'ظ in الظهر and الظل, not ض or ز.', local: 'الظهر والظل بالظاء، لا بالضاد ولا بالزاي.' },
  },
  {
    id: 'ar-e15',
    text: 'ذهب زيد إلى سوق الذهب.',
    level: 1,
    focus: ['dh-z', 'alif-maqsura'],
    note: { en: 'ذهب and الذهب are spelled with ذ, and زيد with ز. The word إلى ends in ى.', local: 'ذهب والذهب بالذال، وزيد بالزاي. وإلى تنتهي بألف مقصورة.' },
  },
  {
    id: 'ar-e16',
    text: 'كتابة الرسالة سهلة، وكتابه جديد.',
    level: 2,
    focus: ['taa-marbuta'],
    note: {
      en: 'كتابة (writing) ends in ة, while كتابه (his book) is كتاب plus the pronoun ه.',
      local: 'كتابة مصدر ينتهي بتاء مربوطة، وكتابه = كتاب + الضمير ه.',
    },
  },
  {
    id: 'ar-e17',
    text: 'هذا شيء جميل، والقطار بطيء.',
    level: 2,
    focus: ['hamza-end'],
    note: { en: 'شيء and بطيء: hamza on the line after a silent yaa or a long vowel.', local: 'شيء وبطيء: الهمزة على السطر بعد ياء ساكنة أو حرف مد.' },
  },
  {
    id: 'ar-e18',
    text: 'تفاءل بالخير، فالتفاؤل مهم.',
    level: 2,
    focus: ['hamza-mid'],
    note: {
      en: 'تفاءل: hamza on the line after a long alif. التفاؤل: after a damma it sits on waw.',
      local: 'تفاءل: الهمزة على السطر بعد الألف. التفاؤل: بعد الضمة على الواو.',
    },
  },
  {
    id: 'ar-e19',
    text: 'أتعلم اللغة الهولندية في المساء.',
    level: 1,
    focus: ['hamza', 'wasl', 'taa-marbuta'],
    note: { en: "أتعلم: qat'. اللغة: the ال of the article is wasl. اللغة and الهولندية end in ة.", local: 'أتعلم: همزة قطع. اللغة: أل التعريف همزتها همزة وصل. واللغة والهولندية تنتهيان بتاء مربوطة.' },
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
    focus: ['wasl', 'hamza'],
    note: { en: "اجتمع: wasl. أحمد and إخوته: qat'.", local: 'اجتمع: همزة وصل. أحمد وإخوته: همزة قطع.' },
  },
  {
    id: 'ar-e22',
    text: 'هذه شجرة عالية، وتلك فاكهة لذيذة.',
    level: 2,
    focus: ['taa-marbuta', 'dh-z'],
    note: { en: 'شجرة، عالية، فاكهة and لذيذة all end in ة, and لذيذة has ذ twice.', local: 'شجرة وعالية وفاكهة ولذيذة تنتهي بتاء مربوطة. وفي لذيذة ذالان.' },
  },

  /* ---------------- start hamza (qat') ---------------- */
  {
    id: 'ar-f01',
    text: 'خرجنا إلى الحديقة لأن الجو جميل.',
    level: 1,
    focus: ['hamza', 'alif-maqsura'],
    note: {
      en: 'لأن is ل plus أن, so the hamza stays: لأن, not لان. The word إلى has its hamza under the alif.',
      local: 'لأن مكونة من اللام وأن، فتبقى الهمزة: لأن لا لان. وإلى همزتها تحت الألف.',
    },
  },
  {
    id: 'ar-f02',
    text: 'أين وضعت أوراقي؟ أريد أن أقرأها الآن.',
    level: 2,
    focus: ['hamza', 'hamza-mid'],
    note: {
      en: 'أين، أوراقي، أريد، أن: each starts with أ. The word الآن has a madda (آ). أقرأها keeps the hamza of قرأ on its alif.',
      local: 'أين وأوراقي وأريد وأن تبدأ كلها بهمزة قطع. والآن فيها مدة (آ). وأقرأها تبقى همزتها على الألف كما في قرأ.',
    },
  },
  {
    id: 'ar-f03',
    text: 'إذا أمطرت السماء غدا، فسأبقى في البيت.',
    level: 2,
    focus: ['hamza', 'alif-maqsura'],
    note: {
      en: 'إذا has its hamza under the alif. أمطرت is form IV (أفعل), so its hamza is written. سأبقى ends in ى.',
      local: 'إذا همزتها تحت الألف. وأمطرت على وزن أفعل، فهمزتها همزة قطع تُكتب. وسأبقى تنتهي بألف مقصورة.',
    },
  },
  {
    id: 'ar-f04',
    text: 'أرسلت أمس رسالة إلى أستاذي، وأخبرته أنني سأتأخر قليلا.',
    level: 3,
    focus: ['hamza', 'hamza-mid'],
    note: {
      en: 'أرسلت and أخبرته are form IV (أفعل), so their hamza is written, like in أمس، إلى، أستاذي، أنني. In سأتأخر the middle hamza sits on alif.',
      local: 'أرسلت وأخبرته على وزن أفعل فهمزتهما همزة قطع، ومثلهما أمس وإلى وأستاذي وأنني. وسأتأخر همزتها المتوسطة على الألف.',
    },
  },
  {
    id: 'ar-f83',
    text: 'أخبرني أبي أن الأسعار ارتفعت كثيرا، فقررت أن أشتري أقل من المعتاد.',
    level: 3,
    focus: ['hamza', 'wasl', 'tanween'],
    note: {
      en: 'أخبرني، أبي، أن، أشتري، أقل start with a written hamza, and so does الأسعار after the article. ارتفعت is form VIII, so it starts with hamzat al-wasl. كثيرا takes the tanween alif.',
      local: 'أخبرني وأبي وأن وأشتري وأقل تبدأ بهمزة قطع، ومثلها الأسعار بعد ال. وارتفعت على وزن افتعل فهمزتها همزة وصل. وكثيرا يُكتب تنوينها بألف.',
    },
  },

  /* ---------------- hamzat al-wasl ---------------- */
  {
    id: 'ar-f05',
    text: 'اكتب اسمك هنا، من فضلك.',
    level: 1,
    focus: ['wasl'],
    note: {
      en: 'اكتب (an imperative) and اسم start with hamzat al-wasl: a plain ا, no hamza sign.',
      local: 'اكتب (فعل أمر) واسم تبدآن بهمزة وصل: ألف بلا همزة.',
    },
  },
  {
    id: 'ar-f06',
    text: 'امرأة لطيفة ساعدتني في محطة القطار.',
    level: 1,
    focus: ['wasl', 'hamza-mid'],
    note: {
      en: 'امرأة starts with hamzat al-wasl (ا), while the hamza in its middle sits on alif (أ).',
      local: 'امرأة تبدأ بهمزة وصل (ا)، أما الهمزة في وسطها فعلى الألف (أ).',
    },
  },
  {
    id: 'ar-f07',
    text: 'انتقلت عائلتي إلى أمستردام قبل عامين.',
    level: 2,
    focus: ['wasl', 'hamza-mid'],
    note: {
      en: 'انتقلت is form VIII (افتعل): hamzat al-wasl. عائلتي: a hamza with kasra after a long ا sits on ئ.',
      local: 'انتقلت على وزن افتعل، فهمزتها همزة وصل. وعائلتي: الهمزة المكسورة بعد الألف تُكتب على نبرة (ئ).',
    },
  },
  {
    id: 'ar-f08',
    text: 'اجتمع الجيران مساء أمس، واتفقوا على تنظيف الشارع.',
    level: 3,
    focus: ['wasl', 'waw-jamaa', 'hamza'],
    note: {
      en: "اجتمع and اتفقوا are form VIII: hamzat al-wasl. اتفقوا ends in waw al-jama'a, so it gets an extra alif. أمس has a real hamza.",
      local: 'اجتمع واتفقوا على وزن افتعل، فهمزتهما همزة وصل. واتفقوا تنتهي بواو الجماعة فتُكتب بعدها ألف. أما أمس فهمزتها همزة قطع.',
    },
  },

  /* ---------------- middle hamza ---------------- */
  {
    id: 'ar-f09',
    text: 'سئل الطالب عن رأيه، فأجاب بهدوء.',
    level: 2,
    focus: ['hamza-mid', 'hamza-end'],
    note: {
      en: 'In سئل the hamza carries a kasra, so it sits on ئ. In رأيه a silent hamza after a fatha sits on alif. In بهدوء it sits on the line after a long و.',
      local: 'سئل: الهمزة مكسورة فتُكتب على نبرة. رأيه: الهمزة ساكنة بعد فتحة فتُكتب على الألف. بهدوء: على السطر بعد واو المد.',
    },
  },
  {
    id: 'ar-f10',
    text: 'تساءل الأطفال عن موعد العيد.',
    level: 1,
    focus: ['hamza-mid'],
    note: {
      en: 'تساءل: after a long ا, a hamza with fatha sits on the line (ء). تسائل is a common mistake.',
      local: 'تساءل: الهمزة المفتوحة بعد ألف المد تُكتب على السطر (ء). وكتابتها تسائل خطأ شائع.',
    },
  },
  {
    id: 'ar-f11',
    text: 'يبدأ المؤتمر بعد ساعة، فلا تتأخر.',
    level: 2,
    focus: ['hamza-mid', 'hamza-end'],
    note: {
      en: 'In المؤتمر a silent hamza after a damma sits on و, and in تتأخر it sits on alif. يبدأ ends in a hamza after a fatha, so it sits on alif too.',
      local: 'المؤتمر: الهمزة الساكنة بعد ضمة تُكتب على الواو. تتأخر: على الألف. يبدأ: الهمزة المتطرفة بعد فتحة على الألف.',
    },
  },
  {
    id: 'ar-f12',
    text: 'يقرأ أبي الجريدة كل صباح، ويسأل أمي عن رأيها في الأخبار.',
    level: 3,
    focus: ['hamza-mid', 'hamza-end', 'hamza'],
    note: {
      en: "يسأل and رأيها have a middle hamza on alif. يقرأ ends in أ after a fatha. أبي، أمي، الأخبار start with qat'.",
      local: 'يسأل ورأيها همزتهما المتوسطة على الألف. ويقرأ تنتهي بهمزة على الألف بعد فتحة. وأبي وأمي والأخبار تبدأ بهمزة قطع.',
    },
  },
  {
    id: 'ar-f13',
    text: 'يخاف الطفل من الذئب في القصة.',
    level: 1,
    focus: ['hamza-mid', 'dh-z'],
    note: {
      en: 'ذئب: a silent hamza after a kasra sits on ئ. It starts with ذ, not ز.',
      local: 'ذئب: الهمزة الساكنة بعد كسرة تُكتب على نبرة. وتبدأ بالذال لا بالزاي.',
    },
  },

  /* ---------------- end hamza ---------------- */
  {
    id: 'ar-f14',
    text: 'بدأ الدرس في موعده تماما.',
    level: 1,
    focus: ['hamza-end', 'tanween'],
    note: {
      en: 'بدأ: the letter before the final hamza has a fatha, so the hamza sits on alif. تماما takes the tanween alif.',
      local: 'بدأ: الحرف قبل الهمزة المتطرفة مفتوح، فتُكتب على الألف. وتماما يُكتب تنوينها بألف.',
    },
  },
  {
    id: 'ar-f15',
    text: 'جلسنا على شاطئ البحر حتى المساء.',
    level: 2,
    focus: ['hamza-end', 'alif-maqsura'],
    note: {
      en: 'In شاطئ a kasra before the final hamza puts it on ئ. In المساء it sits on the line after a long alif. على and حتى end in ى.',
      local: 'شاطئ: الحرف قبل الهمزة مكسور فتُكتب على نبرة. المساء: على السطر بعد الألف. على وحتى تنتهيان بألف مقصورة.',
    },
  },
  {
    id: 'ar-f16',
    text: 'يحب فستق الهدوء في الصباح.',
    level: 1,
    focus: ['hamza-end'],
    note: {
      en: 'الهدوء: after a long و, the final hamza sits on the line (ء), not on ؤ.',
      local: 'الهدوء: بعد واو المد تُكتب الهمزة المتطرفة على السطر (ء) لا على الواو.',
    },
  },
  {
    id: 'ar-f17',
    text: 'أكلت جزءا صغيرا من الكعكة.',
    level: 2,
    focus: ['hamza-end', 'tanween'],
    note: {
      en: 'جزء: after a silent ز the hamza sits on the line. With tanween it becomes جزءا, with an alif, because there is no ا before the ء.',
      local: 'جزء: الهمزة بعد الزاي الساكنة على السطر. ومع تنوين الفتح تصبح جزءا بألف، لأن الهمزة ليست بعد ألف.',
    },
  },
  {
    id: 'ar-f18',
    text: 'القارئ الجيد يقرأ ببطء، ويتعلم من كل خطأ.',
    level: 3,
    focus: ['hamza-end'],
    note: {
      en: 'Four final hamzas, three seats: القارئ (kasra before, so ئ), يقرأ and خطأ (fatha before, so أ), ببطء (silent letter before, so ء on the line).',
      local: 'أربع همزات متطرفة على ثلاثة أشكال: القارئ (قبلها كسرة فعلى النبرة)، ويقرأ وخطأ (قبلها فتحة فعلى الألف)، وببطء (قبلها ساكن فعلى السطر).',
    },
  },

  /* ---------------- taa marbuta ---------------- */
  {
    id: 'ar-f19',
    text: 'وجهه هادئ، وابتسامته جميلة.',
    level: 2,
    focus: ['taa-marbuta', 'hamza-end'],
    note: {
      en: 'وجه ends in a real ه, so his face is وجهه. Before the suffix, ابتسامة becomes ابتسامته. In هادئ a kasra comes before the hamza, so it sits on ئ.',
      local: 'وجه تنتهي بهاء أصلية، فتصبح مع الضمير وجهه. وابتسامة تصبح ابتسامته قبل الضمير. وهادئ: قبل الهمزة كسرة فتُكتب على نبرة.',
    },
  },
  {
    id: 'ar-f20',
    text: 'المياه في هذه البحيرة نظيفة.',
    level: 2,
    focus: ['taa-marbuta', 'd-z'],
    note: {
      en: 'المياه ends in a real ه (it is the plural of ماء), not ة. But البحيرة and نظيفة do end in ة, and نظيفة is written with ظ.',
      local: 'المياه تنتهي بهاء أصلية (جمع ماء) لا بتاء مربوطة. أما البحيرة ونظيفة فتنتهيان بتاء مربوطة. ونظيفة تُكتب بالظاء.',
    },
  },
  {
    id: 'ar-f21',
    text: 'حملت حقيبتي الثقيلة إلى غرفة الفندق، ثم نزلت إلى المطعم لتناول وجبة خفيفة.',
    level: 3,
    focus: ['taa-marbuta', 'th-s'],
    note: {
      en: 'حقيبة becomes حقيبتي before the suffix. الثقيلة، غرفة، وجبة، خفيفة keep their ة, and الثقيلة is written with ث.',
      local: 'حقيبة تصبح حقيبتي قبل الضمير. والثقيلة وغرفة ووجبة وخفيفة تبقى بتاء مربوطة. والثقيلة تُكتب بالثاء.',
    },
  },

  /* ---------------- alif maqsura ---------------- */
  {
    id: 'ar-f22',
    text: 'اشترى أبي هدية لأمي في عيد ميلادها.',
    level: 2,
    focus: ['alif-maqsura', 'wasl', 'hamza'],
    note: {
      en: 'اشترى ends in ى, an a sound. في and the ي of لأمي are ii sounds, so they get dots. اشترى is form VIII, so it starts with hamzat al-wasl, while أبي and لأمي keep the hamza of أب and أم.',
      local: 'اشترى تنتهي بألف مقصورة. أما في وياء لأمي فصوتهما ياء فتُنقطان. واشترى على وزن افتعل فهمزتها همزة وصل، أما أبي ولأمي فتبقى فيهما همزة القطع.',
    },
  },
  {
    id: 'ar-f23',
    text: 'عليك أن تبقى هنا حتى أعود.',
    level: 2,
    focus: ['alif-maqsura'],
    note: {
      en: 'على becomes عليك before a suffix: the ى turns into ي. But تبقى and حتى keep their ى.',
      local: 'على تصبح عليك قبل الضمير: تتحول الألف المقصورة إلى ياء. أما تبقى وحتى فتبقيان بألف مقصورة.',
    },
  },
  {
    id: 'ar-f24',
    text: 'رأى مصطفى صديقه القديم في المقهى، فدعا له بالتوفيق.',
    level: 3,
    focus: ['alif-maqsura'],
    note: {
      en: 'رأى، مصطفى، المقهى end in ى. But دعا ends in a tall ا, because its root ends in و, as in يدعو.',
      local: 'رأى ومصطفى والمقهى تنتهي بألف مقصورة. أما دعا فتنتهي بألف قائمة لأن أصلها واو (يدعو).',
    },
  },

  /* ---------------- tanween alif ---------------- */
  {
    id: 'ar-f25',
    text: 'أهلا وسهلا بكم في بيتنا.',
    level: 1,
    focus: ['tanween'],
    note: {
      en: 'أهلا and سهلا take tanween fath, which is written as an extra alif.',
      local: 'أهلا وسهلا منونتان بالفتح، ويُكتب التنوين ألفا.',
    },
  },
  {
    id: 'ar-f26',
    text: 'قرأت قصة قصيرة وكتابا طويلا.',
    level: 2,
    focus: ['tanween', 'taa-marbuta'],
    note: {
      en: 'كتابا طويلا take the tanween alif. قصة قصيرة take none: after ة there is never an extra alif.',
      local: 'كتابا طويلا يُكتب تنوينهما بألف. أما قصة قصيرة فلا، لأن التاء المربوطة لا تُزاد بعدها ألف.',
    },
  },
  {
    id: 'ar-f27',
    text: 'شربت ماء كثيرا بعد الرياضة.',
    level: 2,
    focus: ['tanween', 'hamza-end'],
    note: {
      en: 'ماء gets no extra alif, because it ends in a hamza after a long alif. كثيرا does get one.',
      local: 'ماء لا تُزاد فيها ألف لأنها تنتهي بهمزة بعد ألف. أما كثيرا فتُزاد.',
    },
  },
  {
    id: 'ar-f28',
    text: 'أخيرا وصل القطار، وكان مزدحما جدا.',
    level: 2,
    focus: ['tanween'],
    note: {
      en: 'أخيرا، مزدحما، جدا: three tanween alifs. Without its alif, جدا turns into جد, grandfather.',
      local: 'أخيرا ومزدحما وجدا: ثلاث ألفات تنوين. ومن دون الألف تصبح جدا كلمة جد، أي والد الأب أو الأم.',
    },
  },
  {
    id: 'ar-f29',
    text: 'يمشي جدي يوميا ساعة كاملة، صيفا وشتاء.',
    level: 3,
    focus: ['tanween', 'hamza-end', 'taa-marbuta'],
    note: {
      en: 'يوميا and صيفا take the tanween alif. ساعة كاملة take none (they end in ة), and neither does شتاء (it ends in ـاء).',
      local: 'يوميا وصيفا يُكتب تنوينهما بألف. أما ساعة كاملة فلا (تاء مربوطة)، ولا شتاء (همزة بعد ألف).',
    },
  },
  {
    id: 'ar-f82',
    text: 'اشترينا خبزا طازجا وجبنا وماء، ثم جلسنا في الحديقة حتى المساء.',
    level: 3,
    focus: ['tanween', 'hamza-end', 'wasl', 'alif-maqsura'],
    note: {
      en: 'خبزا، طازجا، جبنا take the tanween alif, but ماء does not, because it ends in a hamza after a long alif. In المساء that hamza also sits on the line. اشترينا starts with hamzat al-wasl, and حتى ends in ى.',
      local: 'خبزا وطازجا وجبنا يُكتب تنوينها بألف، أما ماء فلا، لأنها تنتهي بهمزة بعد ألف. وفي المساء أيضا الهمزة على السطر. واشترينا تبدأ بهمزة وصل، وحتى تنتهي بألف مقصورة.',
    },
  },

  /* ---------------- waw al-jama'a ---------------- */
  {
    id: 'ar-f30',
    text: 'الأولاد لعبوا كرة القدم ثم ناموا مبكرا.',
    level: 1,
    focus: ['waw-jamaa'],
    note: {
      en: "لعبوا and ناموا end in waw al-jama'a, so they get a silent alif.",
      local: 'لعبوا وناموا تنتهيان بواو الجماعة، فتُكتب بعدها ألف لا تُنطق.',
    },
  },
  {
    id: 'ar-f31',
    text: 'يجب أن تكتبوا أسماءكم على الورقة.',
    level: 2,
    focus: ['waw-jamaa', 'hamza-mid'],
    note: {
      en: 'أن تكتبوا: after أن the ن drops and the alif comes. أسماءكم: a hamza with fatha after a long ا sits on the line.',
      local: 'أن تكتبوا: بعد أن تُحذف النون وتُكتب الألف. أسماءكم: الهمزة المفتوحة بعد ألف المد على السطر.',
    },
  },
  {
    id: 'ar-f32',
    text: 'أرجو أن تزوروا جدتكم قريبا.',
    level: 2,
    focus: ['waw-jamaa'],
    note: {
      en: "تزوروا gets the extra alif. أرجو does not: its و belongs to the root, it is not waw al-jama'a.",
      local: 'تزوروا تُكتب بعدها ألف. أما أرجو فلا، لأن الواو فيها من أصل الفعل وليست واو الجماعة.',
    },
  },
  {
    id: 'ar-f33',
    text: 'يبدو أن الضيوف وصلوا مبكرا.',
    level: 2,
    focus: ['waw-jamaa'],
    note: {
      en: 'وصلوا gets the extra alif. يبدو does not: the و is part of the verb itself.',
      local: 'وصلوا تُكتب بعدها ألف. أما يبدو فلا، لأن الواو من أصل الفعل.',
    },
  },
  {
    id: 'ar-f34',
    text: 'لم يفهموا السؤال، فرجعوا إلى المعلم وسألوه مرة أخرى.',
    level: 3,
    focus: ['waw-jamaa', 'hamza-mid', 'alif-maqsura'],
    note: {
      en: 'يفهموا and رجعوا get the extra alif. سألوه does not: the alif drops when a pronoun is attached. The middle hamza sits on و in السؤال and on alif in سألوه, and أخرى ends in ى.',
      local: 'يفهموا ورجعوا تُكتب بعدهما ألف. أما سألوه فلا، لأن الألف تُحذف إذا اتصل بالفعل ضمير. والهمزة المتوسطة على الواو في السؤال وعلى الألف في سألوه. وأخرى تنتهي بألف مقصورة.',
    },
  },
  {
    id: 'ar-f35',
    text: 'قالوا إنهم سيأتون غدا.',
    level: 2,
    focus: ['waw-jamaa', 'hamza-mid', 'hamza'],
    note: {
      en: 'قالوا gets the extra alif. سيأتون ends in ن, so no alif. After قال comes إن, with the hamza under.',
      local: 'قالوا تُكتب بعدها ألف. أما سيأتون فتنتهي بالنون فلا ألف. وبعد القول تأتي إن بهمزة تحت الألف.',
    },
  },

  /* ---------------- lam shamsiyya ---------------- */
  {
    id: 'ar-f36',
    text: 'الشمس ساطعة والسماء زرقاء.',
    level: 1,
    focus: ['lam'],
    note: {
      en: 'You hear ash-shams and as-samaa, but the ل of ال is still written.',
      local: 'تسمع الشمس والسماء بلا لام، لكن لام ال تُكتب دائما.',
    },
  },
  {
    id: 'ar-f37',
    text: 'النهار طويل في الصيف، والليل قصير.',
    level: 2,
    focus: ['lam'],
    note: {
      en: 'النهار and الصيف: a silent ل you still write. الليل has two ل: one from ال, one from ليل.',
      local: 'النهار والصيف: لام لا تُنطق لكنها تُكتب. والليل فيها لامان: لام ال ولام ليل.',
    },
  },
  {
    id: 'ar-f38',
    text: 'التفاح والزيتون والتين من فواكه الصيف.',
    level: 2,
    focus: ['lam', 'taa-marbuta'],
    note: {
      en: 'التفاح، الزيتون، التين، الصيف: all sun letters, all with a written ل. The ه at the end of فواكه is a real ه, not ة.',
      local: 'التفاح والزيتون والتين والصيف: كلها تبدأ بحرف شمسي، واللام فيها مكتوبة. وفواكه تنتهي بهاء أصلية.',
    },
  },
  {
    id: 'ar-f39',
    text: 'الدراجة هي الطريقة الأسرع للذهاب إلى السوق في الصباح.',
    level: 3,
    focus: ['lam'],
    note: {
      en: 'الدراجة، الطريقة، السوق، الصباح: you do not hear the ل, but you write it. للذهاب is ل plus الذهاب: the alif drops, but the ل of ال stays.',
      local: 'الدراجة والطريقة والسوق والصباح: لا تسمع اللام لكنك تكتبها. وللذهاب = ل + الذهاب: تُحذف الألف وتبقى لام ال.',
    },
  },
  {
    id: 'ar-f40',
    text: 'الثلج يغطي الشوارع والسيارات.',
    level: 1,
    focus: ['lam', 'th-s'],
    note: {
      en: 'الثلج، الشوارع، السيارات: the ل is silent, but written. الثلج is with ث.',
      local: 'الثلج والشوارع والسيارات: اللام لا تُنطق لكنها تُكتب. والثلج بالثاء.',
    },
  },

  /* ---------------- hidden alif ---------------- */
  {
    id: 'ar-f41',
    text: 'هذا قلمي، وذلك قلمك.',
    level: 1,
    focus: ['hidden-alif'],
    note: {
      en: 'هذا and ذلك are said with a long a after the first letter, but it is not written: no هاذا, no ذالك.',
      local: 'هذا وذلك تُنطقان بألف بعد الحرف الأول، لكنها لا تُكتب: لا هاذا ولا ذالك.',
    },
  },
  {
    id: 'ar-f42',
    text: 'أحب القهوة، لكن أختي تفضل الشاي.',
    level: 1,
    focus: ['hidden-alif'],
    note: {
      en: 'لكن is said laakin, but written without an alif after the ل.',
      local: 'لكن تُنطق بألف بعد اللام، لكنها تُكتب بلا ألف.',
    },
  },
  {
    id: 'ar-f43',
    text: 'أولئك الطلاب يدرسون في المكتبة كل مساء.',
    level: 2,
    focus: ['hidden-alif', 'hamza-mid'],
    note: {
      en: 'أولئك: no alif after the ل, and the hamza sits on ئ. The و after أ is written but not pronounced.',
      local: 'أولئك: لا ألف بعد اللام، والهمزة على نبرة. والواو بعد الهمزة تُكتب ولا تُنطق.',
    },
  },
  {
    id: 'ar-f44',
    text: 'هذه الحديقة جميلة جدا، لكن الطريق إليها طويل، ولذلك نذهب بالدراجة.',
    level: 3,
    focus: ['hidden-alif', 'alif-maqsura'],
    note: {
      en: 'هذه، لكن، ذلك all hide a long a. إلى becomes إليها before the suffix.',
      local: 'هذه ولكن وذلك فيها ألف تُنطق ولا تُكتب. وإلى تصبح إليها قبل الضمير.',
    },
  },
  {
    id: 'ar-f45',
    text: 'هؤلاء ضيوفنا من بلجيكا.',
    level: 1,
    focus: ['hidden-alif', 'hamza-mid', 'd-z'],
    note: {
      en: 'هؤلاء: no alif after the ه, and the hamza sits on و. The word ضيوف is spelled with ض.',
      local: 'هؤلاء: لا ألف بعد الهاء، والهمزة على الواو. وضيوف بالضاد.',
    },
  },

  /* ---------------- ض/ظ ---------------- */
  {
    id: 'ar-f46',
    text: 'انتظرتك طويلا عند محطة الحافلات.',
    level: 1,
    focus: ['d-z'],
    note: {
      en: 'انتظر is written with ظ. Many dialects say it with ض, which is where انتضر comes from.',
      local: 'انتظر تُكتب بالظاء. وكثير من اللهجات تنطقها بالضاد، ومن هنا يأتي الخطأ انتضر.',
    },
  },
  {
    id: 'ar-f47',
    text: 'ضاعت مفاتيحي، فبحثت عنها حتى الظهر.',
    level: 2,
    focus: ['d-z'],
    note: {
      en: 'ضاعت (got lost) is spelled with ض, and الظهر (noon) with ظ.',
      local: 'ضاعت بالضاد، والظهر بالظاء.',
    },
  },
  {
    id: 'ar-f48',
    text: 'الضابط ينظر إلى الأوراق بعناية.',
    level: 2,
    focus: ['d-z'],
    note: {
      en: 'الضابط (officer) is spelled with ض and ينظر (looks) with ظ. Writing ظابط is a common mistake.',
      local: 'الضابط بالضاد، وينظر بالظاء. وكتابة ظابط خطأ شائع.',
    },
  },
  {
    id: 'ar-f49',
    text: 'أظن أن الضوء ضعيف هنا، فلا تقرأ في الظلام حتى لا تتعب عيناك.',
    level: 3,
    focus: ['d-z', 'hamza-end'],
    note: {
      en: 'أظن and الظلام are spelled with ظ, and الضوء and ضعيف with ض. The ء at the end of الضوء sits on the line after a silent و.',
      local: 'أظن والظلام بالظاء، والضوء وضعيف بالضاد. والضوء تنتهي بهمزة على السطر بعد واو ساكنة.',
    },
  },

  /* ---------------- ذ/ز/ظ ---------------- */
  {
    id: 'ar-f50',
    text: 'زرت صديقي الذي يسكن قرب الجسر.',
    level: 1,
    focus: ['dh-z'],
    note: {
      en: 'زرت (I visited) is spelled with ز, and الذي with ذ.',
      local: 'زرت بالزاي، والذي بالذال.',
    },
  },
  {
    id: 'ar-f51',
    text: 'زميلي ذكي جدا، ويتذكر كل التفاصيل.',
    level: 2,
    focus: ['dh-z'],
    note: {
      en: 'ذكي (clever) and يتذكر are spelled with ذ, and زميلي with ز. The name زكي, with ز, means pure.',
      local: 'ذكي ويتذكر بالذال، وزميلي بالزاي. أما زكي بالزاي فكلمة أخرى (طاهر، واسم علم).',
    },
  },
  {
    id: 'ar-f52',
    text: 'نظرت من النافذة، فرأيت الأزهار تحت المطر.',
    level: 2,
    focus: ['dh-z', 'd-z'],
    note: {
      en: 'Three letters that many dialects say the same way: ظ in نظرت, then ذ in النافذة, and ز in الأزهار.',
      local: 'نظرت بالظاء، والنافذة بالذال، والأزهار بالزاي: ثلاثة حروف تنطقها لهجات كثيرة بصوت واحد.',
    },
  },
  {
    id: 'ar-f53',
    text: 'إذا ذهبت إلى السوق، فاشتر لي زيتا وزيتونا وذرة.',
    level: 3,
    focus: ['dh-z', 'alif-maqsura', 'tanween'],
    note: {
      en: 'ذهبت and ذرة are spelled with ذ, and زيت and زيتون with ز. In the imperative, اشتر loses its final ى. The tanween alif goes on زيتا and زيتونا, but not on ذرة.',
      local: 'ذهبت وذرة بالذال، وزيت وزيتون بالزاي. واشتر فعل أمر حُذف منه حرف العلة. وزيتا وزيتونا بألف التنوين، أما ذرة فلا.',
    },
  },

  /* ---------------- ث/س ---------------- */
  {
    id: 'ar-f54',
    text: 'ثمن هذا الثوب مرتفع.',
    level: 1,
    focus: ['th-s'],
    note: {
      en: 'ثمن and الثوب start with ث (th), not س or ت.',
      local: 'ثمن والثوب تبدآن بالثاء، لا بالسين ولا بالتاء.',
    },
  },
  {
    id: 'ar-f55',
    text: 'يسقط الثلج كثيرا في الشمال.',
    level: 1,
    focus: ['th-s'],
    note: {
      en: 'الثلج and كثيرا are spelled with ث, and يسقط with س. Some dialects say كتير, but it is written كثير.',
      local: 'الثلج وكثيرا بالثاء، ويسقط بالسين. بعض اللهجات تقول كتير، لكنها تُكتب كثير.',
    },
  },
  {
    id: 'ar-f56',
    text: 'الحقيبة ثقيلة، فساعدني من فضلك.',
    level: 1,
    focus: ['th-s'],
    note: {
      en: 'ثقيلة is spelled with ث, and ساعدني with س.',
      local: 'ثقيلة بالثاء، وساعدني بالسين.',
    },
  },
  {
    id: 'ar-f57',
    text: 'أنفقت الكثير على السفر هذه السنة، ولذلك سأبقى في البيت ثلاثة أسابيع.',
    level: 3,
    focus: ['th-s', 'numbers'],
    note: {
      en: 'الكثير and ثلاثة are spelled with ث, and السفر and السنة with س. In ثلاثة أسابيع the number takes ة, because أسبوع is masculine.',
      local: 'الكثير وثلاثة بالثاء، والسفر والسنة بالسين. ثلاثة أسابيع: أسبوع مذكر، فيأتي العدد بالتاء.',
    },
  },

  /* ---------------- ت/ط ---------------- */
  {
    id: 'ar-f58',
    text: 'يحب أخي التين والطماطم.',
    level: 1,
    focus: ['t-t'],
    note: {
      en: 'التين (figs) is spelled with ت. Written with ط, the word طين means mud. And الطماطم has ط twice.',
      local: 'التين بالتاء، أما طين بالطاء فمعناه التراب المبلل. والطماطم فيها طاءان.',
    },
  },
  {
    id: 'ar-f59',
    text: 'تأخر القطار بسبب الطقس.',
    level: 1,
    focus: ['t-t'],
    note: {
      en: 'تأخر is spelled with ت, and القطار and الطقس with ط.',
      local: 'تأخر بالتاء، والقطار والطقس بالطاء.',
    },
  },
  {
    id: 'ar-f60',
    text: 'طلبت من الطالب أن يكتب التاريخ.',
    level: 2,
    focus: ['t-t'],
    note: {
      en: 'طلبت and الطالب are spelled with ط, and يكتب and التاريخ with ت. The ت at the end of طلبت is the ending for I.',
      local: 'طلبت والطالب بالطاء، ويكتب والتاريخ بالتاء. والتاء في آخر طلبت هي تاء المتكلم.',
    },
  },
  {
    id: 'ar-f61',
    text: 'سقط الطفل وجرح ركبته، لكنه لم يبك.',
    level: 3,
    focus: ['t-t', 'taa-marbuta'],
    note: {
      en: 'سقط and الطفل are spelled with ط, and ركبته with ت (ركبة before a suffix). After لم the verb loses its final ي, so يبكي becomes يبك.',
      local: 'سقط والطفل بالطاء، وركبته بالتاء (ركبة قبل الضمير). لم يبك: بعد لم يُحذف حرف العلة من آخر الفعل.',
    },
  },
  {
    id: 'ar-f78',
    text: 'تعطلت الطابعة في المكتب مرة أخرى.',
    level: 2,
    focus: ['t-t', 'alif-maqsura'],
    note: {
      en: 'تعطلت has ت first and ط after it. The word الطابعة starts with ط, and أخرى ends in ى.',
      local: 'تعطلت فيها تاء ثم طاء. والطابعة تبدأ بالطاء. وأخرى تنتهي بألف مقصورة.',
    },
  },
  {
    id: 'ar-f79',
    text: 'طبخت أمي طعاما لذيذا، وتركت لنا الحلوى على الطاولة.',
    level: 3,
    focus: ['t-t', 'tanween', 'alif-maqsura'],
    note: {
      en: 'طبخت، طعاما، الطاولة are spelled with ط, and تركت with ت. The tanween alif goes on طعاما لذيذا, and الحلوى ends in ى.',
      local: 'طبخت وطعاما والطاولة بالطاء، وتركت بالتاء. وطعاما لذيذا يُكتب تنوينهما بألف. والحلوى تنتهي بألف مقصورة.',
    },
  },

  /* ---------------- ق/ك ---------------- */
  {
    id: 'ar-f62',
    text: 'كلب جارنا يحب القطط.',
    level: 1,
    focus: ['q-k'],
    note: {
      en: 'كلب (dog) is spelled with ك. With ق it turns into قلب, heart. The word القطط starts with ق.',
      local: 'كلب بالكاف، أما قلب بالقاف فكلمة أخرى. والقطط تبدأ بالقاف.',
    },
  },
  {
    id: 'ar-f63',
    text: 'كتبت قصة قصيرة عن قطتي.',
    level: 1,
    focus: ['q-k', 'taa-marbuta'],
    note: {
      en: 'كتبت is spelled with ك, and قصة، قصيرة، قطتي with ق. Before the suffix, قطة becomes قطتي.',
      local: 'كتبت بالكاف، وقصة وقصيرة وقطتي بالقاف. وقطة تصبح قطتي قبل الضمير.',
    },
  },
  {
    id: 'ar-f64',
    text: 'كم قطعة سكر تريد في قهوتك؟',
    level: 2,
    focus: ['q-k', 'taa-marbuta'],
    note: {
      en: 'كم and سكر are spelled with ك, and قطعة and قهوتك with ق. Before the suffix, قهوة becomes قهوتك.',
      local: 'كم وسكر بالكاف، وقطعة وقهوتك بالقاف. وقهوة تصبح قهوتك قبل الضمير.',
    },
  },
  {
    id: 'ar-f80',
    text: 'أقرأ كل يوم قليلا قبل النوم.',
    level: 1,
    focus: ['q-k', 'tanween'],
    note: {
      en: 'أقرأ، قليلا، قبل are spelled with ق, and كل with ك. Some dialects say ق as a hamza, but it is always written ق. The word قليلا takes the tanween alif.',
      local: 'أقرأ وقليلا وقبل بالقاف، وكل بالكاف. بعض اللهجات تنطق القاف همزة، لكنها تُكتب قافا دائما. وقليلا يُكتب تنوينها بألف.',
    },
  },
  {
    id: 'ar-f81',
    text: 'قبل أن تكتب الرسالة، فكر قليلا في كل كلمة.',
    level: 2,
    focus: ['q-k', 'tanween'],
    note: {
      en: 'قبل and قليلا are spelled with ق, and تكتب، فكر، كل، كلمة with ك. The tanween alif goes on قليلا, but not on كلمة.',
      local: 'قبل وقليلا بالقاف، وتكتب وفكر وكل وكلمة بالكاف. وقليلا يُكتب تنوينها بألف، أما كلمة فلا.',
    },
  },
  {
    id: 'ar-f65',
    text: 'قضيت وقتا قصيرا في المكتبة، لكنني وجدت الكتاب الذي كنت أبحث عنه.',
    level: 3,
    focus: ['q-k', 'hidden-alif'],
    note: {
      en: 'قضيت، وقتا، قصيرا are spelled with ق, and المكتبة، الكتاب، كنت with ك. The word لكنني hides an alif after the ل.',
      local: 'قضيت ووقتا وقصيرا بالقاف، والمكتبة والكتاب وكنت بالكاف. ولكنني فيها ألف لا تُكتب بعد اللام.',
    },
  },

  /* ---------------- set phrases ---------------- */
  {
    id: 'ar-f66',
    text: 'ما شاء الله، بيتك جميل.',
    level: 1,
    focus: ['phrase'],
    note: {
      en: 'ما شاء الله is three words: ما، شاء، الله. Written together as ماشاء, it is not a word.',
      local: 'ما شاء الله ثلاث كلمات منفصلة: ما وشاء والله.',
    },
  },
  {
    id: 'ar-f67',
    text: 'بإذن الله سأنجح في الامتحان.',
    level: 1,
    focus: ['phrase', 'hamza'],
    note: {
      en: 'بإذن is ب plus إذن, with the hamza under the alif. بأذن would mean with an ear.',
      local: 'بإذن = ب + إذن، والهمزة تحت الألف. أما بأذن فمعناها بالأذن التي نسمع بها.',
    },
  },
  {
    id: 'ar-f68',
    text: 'الحمد لله على السلامة.',
    level: 1,
    focus: ['phrase', 'lam'],
    note: {
      en: 'لله is ل plus الله, written with two ل and no alif. السلامة: a silent ل before س, still written.',
      local: 'لله = ل + الله، وتُكتب بلامين بلا ألف. والسلامة: لام لا تُنطق قبل السين لكنها تُكتب.',
    },
  },
  {
    id: 'ar-f69',
    text: 'إن شاء الله نلتقي في عطلة الصيف.',
    level: 2,
    focus: ['phrase', 'hamza'],
    note: {
      en: 'إن شاء الله: three words, إن with the hamza under. Written as one word, إنشاء means creating.',
      local: 'إن شاء الله ثلاث كلمات، وإن همزتها تحت الألف. أما إنشاء، وهي كلمة واحدة، فمعناها البناء والتأسيس.',
    },
  },
  {
    id: 'ar-f70',
    text: 'جزاك الله خيرا على كل ما فعلته من أجلي.',
    level: 3,
    focus: ['phrase', 'alif-maqsura', 'tanween'],
    note: {
      en: 'جزى becomes جزاك before a suffix: the ى turns into a tall ا. The word خيرا takes the tanween alif, and على keeps its ى.',
      local: 'جزى تصبح جزاك قبل الضمير: تتحول الألف المقصورة إلى ألف قائمة. وخيرا يُكتب تنوينها بألف. وعلى تبقى بألف مقصورة.',
    },
  },

  /* ---------------- numbers in words ---------------- */
  {
    id: 'ar-f71',
    text: 'عندي ثلاثة إخوة وأخت واحدة.',
    level: 1,
    focus: ['numbers'],
    note: {
      en: 'ثلاثة إخوة: with a masculine noun (أخ), the number takes ة. With a feminine noun it does not: ثلاث أخوات.',
      local: 'ثلاثة إخوة: مع المعدود المذكر (أخ) يأتي العدد بالتاء. ومع المؤنث بلا تاء: ثلاث أخوات.',
    },
  },
  {
    id: 'ar-f72',
    text: 'اشتريت خمس تفاحات وأربعة أرغفة.',
    level: 2,
    focus: ['numbers'],
    note: {
      en: 'From three to ten the number flips gender: خمس تفاحات (تفاحة is feminine, so no ة), أربعة أرغفة (رغيف is masculine, so ة).',
      local: 'من ثلاثة إلى عشرة يخالف العدد المعدود: خمس تفاحات (تفاحة مؤنثة فلا تاء)، وأربعة أرغفة (رغيف مذكر فبالتاء).',
    },
  },
  {
    id: 'ar-f73',
    text: 'تعيش جدتي في هذا البيت منذ عشرين سنة.',
    level: 2,
    focus: ['numbers'],
    note: {
      en: 'After عشرين the noun is singular: عشرين سنة, not عشرين سنوات.',
      local: 'بعد عشرين يأتي المعدود مفردا: عشرين سنة، لا عشرين سنوات.',
    },
  },
  {
    id: 'ar-f74',
    text: 'يبدأ الدرس في الساعة الثامنة والنصف.',
    level: 1,
    focus: ['numbers'],
    note: {
      en: 'Clock times use the ordinal: الساعة الثامنة, not الساعة ثمانية.',
      local: 'نستعمل العدد الترتيبي مع الساعة: الساعة الثامنة، لا الساعة ثمانية.',
    },
  },
  {
    id: 'ar-f75',
    text: 'في صفنا اثنا عشر طالبا وإحدى عشرة طالبة.',
    level: 3,
    focus: ['numbers', 'wasl', 'tanween'],
    note: {
      en: 'Eleven and twelve agree with the noun in both parts: اثنا عشر طالبا and إحدى عشرة طالبة. The noun after them is singular, and طالبا takes the tanween alif. اثنا starts with hamzat al-wasl.',
      local: 'أحد عشر واثنا عشر يوافقان المعدود في الجزأين: اثنا عشر طالبا، وإحدى عشرة طالبة. والمعدود بعدهما مفرد منصوب. واثنا تبدأ بهمزة وصل.',
    },
  },
  {
    id: 'ar-f76',
    text: 'في المكتبة أكثر من ألف كتاب.',
    level: 1,
    focus: ['numbers', 'th-s', 'hamza'],
    note: {
      en: 'After ألف and مئة the noun is singular: ألف كتاب. The word أكثر is spelled with ث, and like ألف it starts with a written hamza.',
      local: 'بعد ألف ومئة يأتي المعدود مفردا مجرورا: ألف كتاب. وأكثر بالثاء، وهي مثل ألف تبدأ بهمزة قطع.',
    },
  },
  {
    id: 'ar-f77',
    text: 'عاش فستق مع عائلتنا ثماني سنوات.',
    level: 2,
    focus: ['numbers'],
    note: {
      en: 'In ثماني سنوات the number has no ة, because سنة is feminine, and ثمان keeps its ي when a noun follows it.',
      local: 'ثماني سنوات: سنة مؤنثة فيأتي العدد بلا تاء، وتثبت الياء في ثماني إذا أُضيفت إلى المعدود.',
    },
  },
]

export const PAIRS_AR: MinimalPair[] = [
  {
    id: 'kitaba-kitabuh',
    lang: 'ar',
    words: ['كتابة', 'كتابه'],
    note: {
      en: 'كتابة (writing) ends in taa marbuta. كتابه is كتاب plus ه (his book).',
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
  {
    id: 'dhull-zalla',
    lang: 'ar',
    words: ['ذل', 'زل'],
    note: {
      en: 'ذل (humiliation) is spelled with ذ, and زل (slipped, made a slip) with ز.',
      local: 'ذل بمعنى الهوان (بالذال)، وزل بمعنى انزلق أو أخطأ (بالزاي).',
    },
    sentences: [
      { text: 'زل لسانه في الاجتماع، فاعتذر بسرعة.', word: 'زل' },
      { text: 'يعمل ليلا ونهارا حتى لا يعرف ذل السؤال.', word: 'ذل' },
      { text: 'زل الرجل على الثلج، لكنه لم يسقط.', word: 'زل' },
    ],
  },
  {
    id: 'sadiqa-sadiquh',
    lang: 'ar',
    words: ['صديقة', 'صديقه'],
    note: {
      en: 'صديقة (a female friend) ends in ة, while صديقه is صديق plus ه: his friend.',
      local: 'صديقة مؤنث صديق وتنتهي بتاء مربوطة، وصديقه = صديق + الضمير ه.',
    },
    sentences: [
      { text: 'صديقة أختي طبيبة في المستشفى.', word: 'صديقة' },
      { text: 'زار أحمد صديقه في المستشفى.', word: 'صديقه' },
      { text: 'هذه صديقة قديمة من أيام الجامعة.', word: 'صديقة' },
    ],
  },
  {
    id: 'ala-ali',
    lang: 'ar',
    words: ['على', 'علي'],
    note: {
      en: 'على (on) ends in ى, while علي, with dots, is the name Ali, or on me.',
      local: 'على حرف جر ينتهي بألف مقصورة، أما علي بالياء فاسم علم، أو على مع ياء المتكلم.',
    },
    sentences: [
      { text: 'وضعت الكتاب على الطاولة.', word: 'على' },
      { text: 'علي هو أخي الكبير.', word: 'علي' },
      { text: 'ذهب علي إلى المدرسة مبكرا.', word: 'علي' },
    ],
  },
  {
    id: 'lada-ladayy',
    lang: 'ar',
    words: ['لدى', 'لدي'],
    note: {
      en: 'لدى (at, with) ends in ى, while لدي (I have) is لدى plus ي, so it ends in ي.',
      local: 'لدى ظرف ينتهي بألف مقصورة، ولدي = لدى + ياء المتكلم فتنتهي بالياء.',
    },
    sentences: [
      { text: 'لدي سؤال صغير.', word: 'لدي' },
      { text: 'لدى أخي سيارة جديدة.', word: 'لدى' },
      { text: 'ليس لدي وقت اليوم.', word: 'لدي' },
    ],
  },
  {
    id: 'saala-sala',
    lang: 'ar',
    words: ['سأل', 'سال'],
    note: {
      en: 'سأل (asked) has a hamza on its alif. سال (flowed) has a plain ا.',
      local: 'سأل بمعنى طلب الجواب وفيها همزة، وسال بمعنى جرى وألفها بلا همزة.',
    },
    sentences: [
      { text: 'سأل الطفل أمه عن اسم الطائر.', word: 'سأل' },
      { text: 'سال الماء من الحنفية طوال الليل.', word: 'سال' },
      { text: 'سال العرق على وجهه من الحر.', word: 'سال' },
    ],
  },
  {
    id: 'ruya-rawiyya',
    lang: 'ar',
    words: ['رؤية', 'روية'],
    note: {
      en: 'رؤية (seeing) has its hamza on و, while روية (careful thought) has no hamza at all.',
      local: 'رؤية بمعنى النظر وهمزتها على الواو، وروية بمعنى التأني والتفكير بلا همزة.',
    },
    sentences: [
      { text: 'رؤية البحر تريحني.', word: 'رؤية' },
      { text: 'هذا قرار يحتاج إلى روية.', word: 'روية' },
      { text: 'سعدت جدا عند رؤية أصدقائي.', word: 'رؤية' },
    ],
  },
  {
    id: 'tin-ttin',
    lang: 'ar',
    words: ['تين', 'طين'],
    note: {
      en: 'تين (figs) is spelled with ت, and طين (mud) with ط.',
      local: 'تين الفاكهة بالتاء، وطين التراب المبلل بالطاء.',
    },
    sentences: [
      { text: 'أكلت حبة تين طازجة.', word: 'تين' },
      { text: 'لعب الأطفال في طين الحديقة بعد المطر.', word: 'طين' },
      { text: 'هذا الإناء مصنوع من طين.', word: 'طين' },
    ],
  },
  {
    id: 'qalb-kalb',
    lang: 'ar',
    words: ['قلب', 'كلب'],
    note: {
      en: 'قلب (heart) is spelled with ق, and كلب (dog) with ك.',
      local: 'قلب بالقاف، وكلب بالكاف.',
    },
    sentences: [
      { text: 'قلب أمي كبير.', word: 'قلب' },
      { text: 'عند جدي كلب صغير.', word: 'كلب' },
      { text: 'قلب الطفل يدق بسرعة.', word: 'قلب' },
    ],
  },
  {
    id: 'thamin-samin',
    lang: 'ar',
    words: ['ثمين', 'سمين'],
    note: {
      en: 'ثمين (precious) is spelled with ث, and سمين (fat) with س.',
      local: 'ثمين بمعنى غال بالثاء، وسمين ضد نحيف بالسين.',
    },
    sentences: [
      { text: 'هذا خاتم ثمين من جدتي.', word: 'ثمين' },
      { text: 'قط جارنا سمين جدا.', word: 'سمين' },
      { text: 'الوقت ثمين، فلا تضيعه.', word: 'ثمين' },
    ],
  },
  {
    id: 'an-inna',
    lang: 'ar',
    words: ['أن', 'إن'],
    note: {
      en: 'After قال, and at the start of a sentence, it is إن. After most other verbs it is أن.',
      local: 'بعد القول وفي أول الجملة تُكسر الهمزة: إن. وبعد أكثر الأفعال تُفتح: أن.',
    },
    sentences: [
      { text: 'أريد أن أنام مبكرا.', word: 'أن' },
      { text: 'قال إن القطار تأخر.', word: 'إن' },
      { text: 'أظن أن الجو سيتحسن.', word: 'أن' },
    ],
  },
]
