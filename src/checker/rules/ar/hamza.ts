import type { RuleHit } from '@/types'
import { AN_HAMZA, FINAL_HAMZA_EXCEPTIONS, HAMZA_BARE_ONLY, HAMZA_NOUNS, HAMZA_PARTICLES, HAMZA_WORDS, WASL_NOUNS, WASL_PATTERN_EXCEPTIONS } from '../../lexicon/ar'
import { arRule, bare, isArabic, lexRule, lookup, q, qa, splits, tokenHit, type ArRule } from './shared'

// Hamza (arabic-typing.md 2.2): wasl vs qat' at the start of a word, the seat in the middle, the final hamza.

const waslMsg = (fix: string) => ({
  message: `Hamzat al-wasl: write a bare ${q('ا')} here, ${q(fix)}`,
  messageLocal: `همزة وصل: تُكتب ألفًا بلا همزة: ${qa(fix)}.`,
  explanation: `ابن، ابنة، اسم، اثنان، اثنتان، امرؤ and امرأة start with hamzat al-wasl, which is written as a plain alif. Their plurals (أبناء، أسماء) do take a hamza. After ال, امرأة loses its alif: المرأة.`,
  explanationLocal: `ابن وابنة واسم واثنان واثنتان وامرؤ وامرأة من الأسماء العشرة التي تبدأ بهمزة وصل، فتُكتب ألفًا بلا همزة. أما جموعها (أبناء، أسماء) فهمزتها همزة قطع. ومع «ال» تُحذف ألف امرأة: المرأة.`,
})

export const waslNouns: ArRule = arRule(
  {
    id: 'ar.wasl-nouns',
    title: 'ابن، اسم، اثنان، امرأة (hamzat al-wasl)',
    category: 'spelling',
    confidence: 'high',
    examples: {
      flag: [
        ['إسمي أحمد', 'إسمي', 'اسمي'],
        ['جاء إبن عمي', 'إبن', 'ابن'],
        ['عندي إثنين من الإخوة', 'إثنين', 'اثنين'],
        ['ما الإسم الكامل؟', 'الإسم', 'الاسم'],
        ['بدأت بإسم الله', 'بإسم', 'باسم'],
        ['حقوق الإمرأة مهمة', 'الإمرأة', 'المرأة'],
      ],
      ok: ['اسمي أحمد، وأنا من سوريا.', 'أسماء الأبناء جميلة.', 'امرأة واحدة واثنان من الرجال.', 'حقوق المرأة مهمة.'],
    },
  },
  (ctx) =>
    lookup(ctx, WASL_NOUNS, { clitics: 'all', shortCore: 'loose' }).map((h) => {
      // ال + امرأة / امرؤ drops the alif: المرأة، المرء
      const fixes = h.fixes.map((f) => f.replace(/(ال|لل)امر(أة|ؤ)/, '$1مر$2').replace(/(ال|لل)مرؤ/, '$1مرء'))
      return tokenHit(h.tok, fixes, waslMsg(fixes[0]))
    }),
)

/* ------------------------------------------------------------------ */
/* Forms VII, VIII, X with a hamza: إستخدام -> استخدام                  */
/* ------------------------------------------------------------------ */

const C = '[^ا\\s]'
/** consonant slot without long vowels (past tense) */
const K = '[^اوي\\s]'
const MASDAR = new RegExp(`^[إأ](?:ست${C}${C}ا${C}|${C}ت${C}ا${C}|ن${C}${C}ا${C})(?:ة|ات|ي|ية|يات|ه|ها|هم|ك|كم|نا)?$`, 'u')
const PAST = new RegExp(`^إ(?:ست${K}${K}${K}|${K}ت${K}${K}|ن${K}${K}${K})(?:وا|ت|نا|تم)?$`, 'u')

export const waslPattern: ArRule = arRule(
  {
    id: 'ar.wasl-pattern',
    title: 'اجتماع، استخدام، انتظار (hamzat al-wasl)',
    category: 'spelling',
    confidence: 'medium',
    examples: {
      flag: [
        ['إستخدام الحاسوب مفيد', 'إستخدام', 'استخدام'],
        ['حضرت الإجتماع أمس', 'الإجتماع', 'الاجتماع'],
        ['إنتظرت طويلا', 'إنتظرت', 'انتظرت'],
        ['الإقتصاد قوي', 'الإقتصاد', 'الاقتصاد'],
        ['إستخدم القلم', 'إستخدم', 'استخدم'],
        ['بالإستخدام', 'بالإستخدام', 'بالاستخدام'],
      ],
      ok: [
        'الاقتصاد الهولندي قوي، والاستثمار فيه كبير.',
        'الإنترنت سريع في هولندا.',
        'سافر صديقي الأسترالي إلى أمستردام.',
        'قصص الأنبياء جميلة.',
        'أرسلت الرسالة ثم استخدمت الحاسوب.',
        'إرسال الرسائل سهل.',
        'أستاذ الرياضيات لطيف.',
      ],
    },
  },
  (ctx) => {
    const out: RuleHit[] = []
    for (const t of ctx.words) {
      if (!isArabic(t)) continue
      const w = bare(t.text)
      for (const sp of splits(w, 'all')) {
        const core = sp.core
        if (!/^[إأ]/.test(core) || WASL_PATTERN_EXCEPTIONS.has(core)) continue
        if (!MASDAR.test(core) && !PAST.test(core)) continue
        const fix = `${sp.prefix}ا${core.slice(1)}`
        if (ctx.dict && ctx.dict.has(w) && !ctx.dict.has(fix)) break
        out.push(
          tokenHit(t, [fix], {
            message: `Forms VII, VIII and X start with hamzat al-wasl: ${q(fix)}`,
            messageLocal: `ماضي الخماسي والسداسي وأمرهما ومصدرهما تبدأ بهمزة وصل: ${qa(fix)}.`,
            explanation: `Verbs like اجتمع، انتظر، استخدم (and their verbal nouns اجتماع، انتظار، استخدام) start with a plain alif. Only Form IV (أرسل، إرسال) takes a hamza.`,
            explanationLocal: `الفعل الماضي الخماسي والسداسي وأمرهما ومصدرهما (اجتمع، انتظر، استخدم، اجتماع، استخدام) تبدأ بهمزة وصل تُكتب ألفًا بلا همزة. أما الرباعي (أرسل، إرسال) فهمزته همزة قطع.`,
          }),
        )
        break
      }
    }
    return out
  },
)

/* ------------------------------------------------------------------ */
/* Hamzat al-qat' left out: الى -> إلى                                  */
/* ------------------------------------------------------------------ */

const qatMsg = {
  message: `This word needs its hamza`,
  messageLocal: `همزة القطع تُكتب: أ فوق الألف أو إ تحتها.`,
  explanation: `Hamzat al-qat' is always written: أ when the vowel is a or u (أنا، أكثر), إ when it is i (إلى، إذا). A bare ا is only for hamzat al-wasl.`,
  explanationLocal: `همزة القطع تُكتب دائمًا: فوق الألف إذا كانت مفتوحة أو مضمومة (أنا، أكثر)، وتحتها إذا كانت مكسورة (إلى، إذا). الألف بلا همزة لهمزة الوصل فقط.`,
}

export const hamzaOmitted: ArRule = arRule(
  {
    id: 'ar.hamza-omitted',
    title: "إلى، أنا، أكثر (hamzat al-qat')",
    category: 'spelling',
    confidence: 'medium',
    examples: {
      flag: [
        ['ذهبت الى البيت', 'الى', 'إلى'],
        ['انا هنا', 'انا', 'أنا'],
        ['لعب الاطفال في الحديقة', 'الاطفال', 'الأطفال'],
        ['هذا افضل', 'افضل', 'أفضل'],
        ['والان نبدأ', 'والان', 'والآن'],
        ['جئت لان الجو جميل', 'لان', 'لأن'],
      ],
      ok: ['إلى أين تذهب؟ إلى الجامعة.', 'الأطفال يلعبون.', 'رأيت فارض الضريبة.', 'عندي واي فاي في البيت.', 'كتبت حرف الواو.', 'كان الجو جميلا.'],
    },
  },
  (ctx) => {
    const hits = [
      ...lookup(ctx, HAMZA_PARTICLES, { clitics: 'conj' }),
      ...lookup(ctx, HAMZA_BARE_ONLY),
      ...lookup(ctx, HAMZA_NOUNS, { clitics: 'all' }),
    ]
    const seen = new Set<number>()
    return hits.filter((h) => !seen.has(h.tok.start) && seen.add(h.tok.start)).map((h) => tokenHit(h.tok, h.fixes, { ...qatMsg, message: `This word needs its hamza: ${q(h.fixes[0])}` }))
  },
)

export const anHamza: ArRule = arRule(
  {
    id: 'ar.an-hamza',
    title: 'أن / إن without hamza',
    category: 'spelling',
    confidence: 'low',
    strictOnly: true,
    examples: { flag: [['قال ان الجو جميل', 'ان', 'أن']], ok: ['قال إن الجو جميل.', 'أريد أن أنام.', 'كان هنا.', 'ركبنا الفان.'] },
  },
  (ctx) =>
    lookup(ctx, AN_HAMZA, { clitics: 'conj' })
      .filter((h) => h.split.prefix === '' || h.split.prefix === 'و')
      .map((h) =>
        tokenHit(h.tok, h.fixes, {
          message: `${q('أن')} or ${q('إن')}: it needs a hamza`,
          messageLocal: `اكتب الهمزة: ${qa('أن')} أو ${qa('إن')} حسب المعنى.`,
          explanation: `أن (that, to) has the hamza on top; إن (indeed, and after قال) has it below. Without any hamza the word is incomplete.`,
          explanationLocal: `«أن» المصدرية همزتها مفتوحة فوق الألف، و«إن» تُكسر همزتها (في أول الكلام وبعد القول). لا تُترك بلا همزة.`,
        }),
      ),
)

/* ------------------------------------------------------------------ */
/* Final hamza and the seat in the middle                              */
/* ------------------------------------------------------------------ */

export const finalHamza: ArRule = arRule(
  {
    id: 'ar.final-hamza',
    title: 'شيء، بطيء، هدوء (final hamza on the line)',
    category: 'spelling',
    confidence: 'medium',
    examples: {
      flag: [
        ['هذا شيئ جميل', 'شيئ', 'شيء'],
        ['القطار بطيئ', 'بطيئ', 'بطيء'],
        ['أحب الهدوئ', 'الهدوئ', 'الهدوء'],
      ],
      ok: ['هذا شيء جميل، والقطار بطيء.', 'الوضع السيئ لا يدوم، والمساوئ قليلة.', 'مبادئ الكتابة بسيطة، وشاطئ البحر قريب.', 'يهيئ المعلم الدرس قبل الحصة.'],
    },
  },
  (ctx) => {
    const out: RuleHit[] = []
    for (const t of ctx.words) {
      if (!isArabic(t)) continue
      const w = bare(t.text)
      if (w.length < 3 || !/[يوا]ئ$/.test(w)) continue
      if (splits(w, 'all').some((s) => FINAL_HAMZA_EXCEPTIONS.has(s.core))) continue
      const fix = `${w.slice(0, -1)}ء`
      out.push(
        tokenHit(t, [fix], {
          message: `After a long vowel the final hamza sits on the line: ${q(fix)}`,
          messageLocal: `الهمزة المتطرفة بعد حرف مد تُكتب على السطر: ${qa(fix)}.`,
          explanation: `At the end of a word, a hamza after a long vowel (ا، و، ي) or a sukun is written alone: شيء، بطيء، هدوء، سماء.`,
          explanationLocal: `الهمزة في آخر الكلمة بعد حرف مد أو ساكن تُكتب مفردة على السطر: شيء، بطيء، هدوء، سماء.`,
        }),
      )
    }
    return out
  },
)

export const hamzaSeat = lexRule(
  {
    id: 'ar.hamza-seat',
    title: 'تفاؤل، سؤال، رأيت (hamza seat)',
    category: 'spelling',
    confidence: 'medium',
    examples: {
      flag: [
        ['هذا شئ بسيط', 'شئ', 'شيء'],
        ['التفائل مهم', 'التفائل', 'التفاؤل'],
        ['رئيت صديقي', 'رئيت', 'رأيت'],
        ['عندي سوأل', 'سوأل', 'سؤال'],
      ],
      ok: ['تفاءل بالخير، فالتفاؤل مهم.', 'سؤال المعلم سهل، ورأيت الجواب.', 'قرأت مسألة صعبة في الكتاب.'],
    },
  },
  HAMZA_WORDS,
  (h) => ({
    message: `The hamza sits on a different seat: ${q(h.fixes[0])}`,
    messageLocal: `موضع الهمزة: ${qa(h.fixes[0])}.`,
    explanation: `In the middle of a word the hamza's seat follows the stronger of the two vowels around it: i (ئ) beats u (ؤ), which beats a (أ). So تفاؤل، سؤال، رأيت.`,
    explanationLocal: `الهمزة المتوسطة تُكتب على ما يناسب أقوى الحركتين: الكسرة (ئ) ثم الضمة (ؤ) ثم الفتحة (أ). لذلك: تفاؤل، سؤال، رأيت.`,
  }),
  { clitics: 'all' },
)

export const hamzaRules: ArRule[] = [waslNouns, waslPattern, hamzaOmitted, anHamza, finalHamza, hamzaSeat]
