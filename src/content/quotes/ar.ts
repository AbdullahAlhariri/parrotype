import { q, type Quote } from './types'

// Arabic: traditional proverbs and classical poetry, unvoweled (no tashkeel) so they type on
// a plain Arabic 101 layout. No Latin letters or digits inside the text (bidi caret jumps).
// Proverbs come from docs/research/arabic-typing.md section 7.3, where each one passes the
// Arabic rule engine with zero flags.

const P = 'Arabic proverb'
const M = 'al-Mutanabbi (10th century)'

export const AR_QUOTES: Quote[] = [
  q('الصبر مفتاح الفرج.', P, { meaning: 'Patience is the key to relief.' }),
  q('العلم نور والجهل ظلام.', P, { meaning: 'Knowledge is light and ignorance is darkness.' }),
  q('الوقت كالسيف، إن لم تقطعه قطعك.', P, { meaning: "Time is like a sword: if you don't cut it, it cuts you." }),
  q('من جد وجد، ومن زرع حصد.', P, { meaning: 'Whoever strives succeeds; whoever sows reaps.' }),
  q('الصديق وقت الضيق.', P, { meaning: 'A friend in need is a friend indeed.' }),
  q('في التأني السلامة، وفي العجلة الندامة.', P, { meaning: 'In patience lies safety, in haste regret.' }),
  q('لكل مجتهد نصيب.', P, { meaning: 'Every hard worker gets a share.' }),
  q('خير الكلام ما قل ودل.', P, { meaning: 'The best speech is short and to the point.' }),
  q('درهم وقاية خير من قنطار علاج.', P, { meaning: 'An ounce of prevention is worth a pound of cure.' }),
  q('القناعة كنز لا يفنى.', P, { meaning: 'Contentment is a treasure that never runs out.' }),
  q('يد واحدة لا تصفق.', P, { meaning: 'One hand cannot clap.' }),
  q('إذا كان الكلام من فضة فالسكوت من ذهب.', P, { meaning: 'If speech is silver, silence is gold.' }),
  q('الجار قبل الدار، والرفيق قبل الطريق.', P, { meaning: 'Choose the neighbour before the house, the companion before the road.' }),
  q('العقل السليم في الجسم السليم.', P, { meaning: 'A sound mind in a sound body.' }),
  q('رب أخ لك لم تلده أمك.', P, { meaning: 'Many a brother of yours was not born of your mother.' }),
  q('عصفور في اليد خير من عشرة على الشجرة.', P, { meaning: 'A bird in the hand is better than ten in the tree.' }),
  q('كل إناء بما فيه ينضح.', P, { meaning: 'Every vessel leaks what it holds: actions reveal character.' }),
  q('لا تؤجل عمل اليوم إلى الغد.', P, { meaning: "Don't put off today's work until tomorrow." }),
  q('الطيور على أشكالها تقع.', P, { meaning: 'Birds of a feather flock together.' }),
  q('من حفر حفرة لأخيه وقع فيها.', P, { meaning: 'Whoever digs a pit for his brother falls into it.' }),
  q('التكرار يعلم الشطار.', P, { meaning: 'Repetition teaches the clever. Practice makes perfect.' }),
  q('أول الغيث قطرة.', P, { meaning: 'The first of the rain is a single drop: big things start small.' }),
  q('لسانك حصانك، إن صنته صانك، وإن خنته خانك.', P, {
    meaning: 'Your tongue is your horse: guard it and it guards you; betray it and it betrays you.',
  }),
  q('ليس كل ما يلمع ذهبا.', P, { meaning: 'Not all that glitters is gold.' }),
  q('البعيد عن العين بعيد عن القلب.', P, { meaning: 'Out of sight, out of mind.' }),
  q('الأفعال أبلغ من الأقوال.', P, { meaning: 'Actions speak louder than words.' }),
  q('اطلب العلم من المهد إلى اللحد.', P, { meaning: 'Seek knowledge from the cradle to the grave.' }),
  q('الحاجة أم الاختراع.', P, { meaning: 'Necessity is the mother of invention.' }),
  q('اتق شر الحليم إذا غضب.', P, { meaning: 'Beware the anger of a patient man.' }),

  /* classical poetry */
  q('ما كل ما يتمنى المرء يدركه، تجري الرياح بما لا تشتهي السفن.', M, {
    meaning: 'Not everything one wishes for is reached: the winds blow against what the ships desire.',
  }),
  q('على قدر أهل العزم تأتي العزائم، وتأتي على قدر الكرام المكارم.', M, {
    meaning: 'Great resolve comes to the resolute, and noble deeds to the noble.',
  }),
  q('أعز مكان في الدنى سرج سابح، وخير جليس في الزمان كتاب.', M, {
    meaning: 'The finest seat in the world is the saddle of a swift horse, and the best companion at any time is a book.',
  }),
  q('الخيل والليل والبيداء تعرفني، والسيف والرمح والقرطاس والقلم.', M, {
    meaning: 'The horses, the night and the desert know me, and so do the sword, the spear, the paper and the pen.',
  }),
  q('إذا رأيت نيوب الليث بارزة، فلا تظنن أن الليث يبتسم.', M, {
    meaning: "If you see the lion's teeth showing, don't think the lion is smiling.",
  }),
  q('دع الأيام تفعل ما تشاء، وطب نفسا إذا حكم القضاء.', "al-Shafi'i (9th century)", {
    meaning: 'Let the days do as they will, and be at peace with what fate decides.',
  }),
  q('يولد جميع الناس أحرارا متساوين في الكرامة والحقوق. وقد وهبوا عقلا وضميرا وعليهم أن يعامل بعضهم بعضا بروح الإخاء.', 'Universal Declaration of Human Rights, article 1 (1948)', {
    meaning: 'All human beings are born free and equal in dignity and rights.',
    note: 'tanween marks left out',
  }),
]
