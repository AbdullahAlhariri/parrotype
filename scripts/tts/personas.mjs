// Voice personas for pre-rendered dictation audio (Gemini 3.8 Flash TTS).
//
// Each language gets 8 personas: Kees (a voice designed from a text description) plus
// 7 native voices from Gemini's voice library. Text is read verbatim by the model, so
// delivery direction lives in `style` (speech metadata), never in the text itself.
// Persona names are our own character names, not the voice actors' names.

/** Voices created with the voice-design API (POST /v1beta/voices, type "prompted").
 *  The mascot has a name per language: Kees (nl), Monty (en, after his monocle), Fustuq (ar, "pistachio"). */
export const DESIGNED = {
  'kees-nl': {
    languageCode: 'nl-NL',
    description:
      'Kees, a clever and cheeky kea parrot who speaks fluent Dutch from the Netherlands. A bright, slightly nasal and beaky voice with a playful smile in it, quick-witted and warm, like a proud parrot repeating new words. Very clear articulation, every word easy to understand.',
  },
  'monty-en': {
    languageCode: 'en-NZ',
    description:
      'Monty, a clever and cheeky kea parrot with a monocle, from the mountains of New Zealand, speaking English with a light, friendly New Zealand accent. A bright, slightly nasal and beaky voice with a playful smile in it, quick-witted and warm, like a proud parrot repeating new words. Very clear articulation, every word easy to understand.',
  },
  'fustuq-ar': {
    languageCode: 'ar-001',
    description:
      'Fustuq, a clever and cheeky green kea parrot who speaks clear Modern Standard Arabic (fusha). A bright, slightly nasal and beaky voice with a playful smile in it, quick-witted and warm, like a proud parrot repeating new words. Very careful, clear articulation of every letter.',
  },
}

/** The mascot's name in each practice language. */
export const MASCOT = { nl: 'Kees', en: 'Monty', ar: 'فستق' }

const CLEAR = 'clear and natural, unhurried'
const MASCOT_STYLE = 'playful and bright, clear and unhurried'

// Chosen from the sample round by Gemini ratings (clarity first, then pleasantness, fun, pace).
export const PERSONAS = {
  nl: [
    { id: 'kees', name: 'Kees', blurb: 'De kea zelf: brutaal, helder, een tikje snavelig', voice: '@kees-nl', style: MASCOT_STYLE, languageCode: 'nl-NL', mascot: true },
    { id: 'lies', name: 'Lies', blurb: 'Licht en luchtig, heel duidelijk', voice: 'nl-nl-storyteller-1', style: CLEAR, languageCode: 'nl-NL' },
    { id: 'juf', name: 'Juf Ans', blurb: 'De juf van het dictee', voice: 'nl-nl-tutor-3', style: CLEAR, languageCode: 'nl-NL' },
    { id: 'riet', name: 'Oma Riet', blurb: 'Vertelt alsof het een sprookje is', voice: 'nl-nl-storyteller-3', style: CLEAR, languageCode: 'nl-NL' },
    { id: 'fleur', name: 'Fleur', blurb: 'Warm, met droge humor', voice: 'nl-nl-techagent-5', style: CLEAR, languageCode: 'nl-NL' },
    { id: 'daan', name: 'Daan', blurb: 'Enthousiast en vrolijk', voice: 'nl-nl-tutor-8', style: CLEAR, languageCode: 'nl-NL' },
  ],
  en: [
    { id: 'monty', name: 'Monty', blurb: 'The kea himself, with a light Kiwi accent', voice: '@monty-en', style: MASCOT_STYLE, languageCode: 'en-NZ', mascot: true },
    { id: 'ollie', name: 'Ollie', blurb: 'Warm, with dry humour (Bristol)', voice: 'en-gb-advisor-10', style: CLEAR, languageCode: 'en-GB' },
    { id: 'narrator', name: 'The narrator', blurb: 'Nature documentary narrator, resonant and witty', voice: 'en-gb-storyteller-2', style: CLEAR, languageCode: 'en-GB' },
    { id: 'hale', name: 'Miss Hale', blurb: 'Bright, breezy teacher (Winchester)', voice: 'en-gb-tutor-6', style: CLEAR, languageCode: 'en-GB' },
    { id: 'june', name: 'June', blurb: 'Warm storyteller (East Coast)', voice: 'en-us-storyteller-1', style: CLEAR, languageCode: 'en-US' },
    { id: 'walt', name: 'Walt', blurb: 'Writing tutor, dry and warm (West Coast)', voice: 'en-us-tutor-25', style: CLEAR, languageCode: 'en-US' },
  ],
  ar: [
    { id: 'fustuq', name: 'فستق', blurb: 'The kea himself, in clear fusha', voice: '@fustuq-ar', style: MASCOT_STYLE, languageCode: 'ar-XA', mascot: true },
    { id: 'huda', name: 'هدى', blurb: 'Resonant and witty', voice: 'ar-001-techagent-2', style: CLEAR, languageCode: 'ar-XA' },
    { id: 'layla', name: 'الدكتورة ليلى', blurb: 'Professor, deep and velvety', voice: 'ar-001-tutor-1', style: CLEAR, languageCode: 'ar-XA' },
    { id: 'nour', name: 'نور', blurb: 'Bright and youthful', voice: 'ar-001-training-1', style: CLEAR, languageCode: 'ar-XA' },
    { id: 'salma', name: 'سلمى', blurb: 'Soft and soothing', voice: 'ar-001-commercial-4', style: CLEAR, languageCode: 'ar-XA' },
    { id: 'sami', name: 'الأستاذ سامي', blurb: 'Teacher, resonant and witty', voice: 'ar-001-tutor-2', style: CLEAR, languageCode: 'ar-XA' },
    { id: 'karim', name: 'كريم', blurb: 'Crisp and eager presenter', voice: 'ar-001-training-12', style: CLEAR, languageCode: 'ar-XA' },
    { id: 'omar', name: 'عمر', blurb: 'Warm and engaging', voice: 'ar-001-advisor-2', style: CLEAR, languageCode: 'ar-XA' },
  ],
}

/** Short mascot reactions for rare moments (never dictation answers, so tags and squawks are fine). */
export const REACTIONS = {
  nl: [
    { id: 'hello', text: 'Rrraak! Kees hier. Luister goed en typ wat ik zeg.', style: 'cheerful and cheeky' },
    { id: 'record', text: 'Rrraak! <cackle> Nieuw record! Kees is er helemaal stil van. <short pause> Nou ja, bijna.', style: 'delighted and playful' },
    { id: 'perfect', text: 'Rrraak! Foutloos! <short pause> Kees knikt tevreden.', style: 'proud and playful' },
    { id: 'again', text: 'Rrraak! Nog één keer. <short pause> Je kunt het.', style: 'encouraging and cheeky' },
    { id: 'streak', text: 'Rrraak! Weer een dag erbij. Kees schrijft het op in zijn boekje.', style: 'warm and amused' },
    { id: 'done', text: 'Rrraak! Klaar! <chuckle> Goed gedaan.', style: 'happy and bright' },
  ],
  en: [
    { id: 'hello', text: 'Rrraak! Monty here. Listen closely and type what I say.', style: 'cheerful and cheeky' },
    { id: 'record', text: 'Rrraak! <cackle> A new record! Monty is speechless. <short pause> Well, almost.', style: 'delighted and playful' },
    { id: 'perfect', text: 'Rrraak! Not a single mistake. <short pause> Monty polishes his monocle.', style: 'proud and playful' },
    { id: 'again', text: "Rrraak! One more time. <short pause> You've got this.", style: 'encouraging and cheeky' },
    { id: 'streak', text: 'Rrraak! Another day in a row. Monty has written it in his little book.', style: 'warm and amused' },
    { id: 'done', text: 'Rrraak! All done! <chuckle> Nicely typed.', style: 'happy and bright' },
  ],
  ar: [
    { id: 'hello', text: 'أهلًا! أنا فستق. استمع جيدًا، واكتب ما أقول.', style: 'cheerful and cheeky' },
    { id: 'record', text: 'يا سلام! <cackle> رقم قياسي جديد! فستق لا يجد الكلمات. <short pause> تقريبًا.', style: 'delighted and playful' },
    { id: 'perfect', text: 'يا سلام! ولا خطأ واحد. <short pause> فستق فخور بك.', style: 'proud and playful' },
    { id: 'again', text: 'مرة أخرى! <short pause> أنت تستطيع.', style: 'encouraging and cheeky' },
    { id: 'streak', text: 'يا سلام! يوم آخر على التوالي. فستق يكتبه في دفتره الصغير.', style: 'warm and amused' },
    { id: 'done', text: 'انتهينا! <chuckle> أحسنت.', style: 'happy and bright' },
  ],
}
