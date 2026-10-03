// Voice personas for pre-rendered dictation audio (Gemini 3.8 Flash TTS).
//
// Each language gets 8 personas: Kees (a voice designed from a text description) plus
// 7 native voices from Gemini's voice library. Text is read verbatim by the model, so
// delivery direction lives in `style` (speech metadata), never in the text itself.
// Persona names are our own character names, not the voice actors' names.

/** Voices created with the voice-design API (POST /v1beta/voices, type "prompted"). */
export const DESIGNED = {
  'kees-nl': {
    languageCode: 'nl-NL',
    description:
      'Kees, a clever and cheeky kea parrot who speaks fluent Dutch from the Netherlands. A bright, slightly nasal and beaky voice with a playful smile in it, quick-witted and warm, like a proud parrot repeating new words. Very clear articulation, every word easy to understand.',
  },
  'kees-en': {
    languageCode: 'en-NZ',
    description:
      'Kees, a clever and cheeky kea parrot from the mountains of New Zealand, speaking English with a light, friendly New Zealand accent. A bright, slightly nasal and beaky voice with a playful smile in it, quick-witted and warm, like a proud parrot repeating new words. Very clear articulation, every word easy to understand.',
  },
  'kees-ar': {
    languageCode: 'ar-001',
    description:
      'Kees, a clever and cheeky kea parrot who speaks clear Modern Standard Arabic (fusha). A bright, slightly nasal and beaky voice with a playful smile in it, quick-witted and warm, like a proud parrot repeating new words. Very careful, clear articulation of every letter.',
  },
}

const CLEAR = 'clear and natural, unhurried'

export const PERSONAS = {
  nl: [
    { id: 'kees', name: 'Kees', blurb: 'De kea zelf: brutaal, helder, een tikje snavelig', voice: '@kees-nl', style: 'playful and bright, clear and unhurried', languageCode: 'nl-NL' },
    { id: 'daan', name: 'Daan', blurb: 'Enthousiast en vrolijk', voice: 'nl-nl-tutor-8', style: CLEAR, languageCode: 'nl-NL' },
    { id: 'riet', name: 'Oma Riet', blurb: 'Vertelt alsof het een sprookje is', voice: 'nl-nl-storyteller-3', style: CLEAR, languageCode: 'nl-NL' },
    { id: 'fleur', name: 'Fleur', blurb: 'Warm, met droge humor', voice: 'nl-nl-techagent-5', style: CLEAR, languageCode: 'nl-NL' },
    { id: 'bram', name: 'Bram', blurb: 'Diepe stem, gevat', voice: 'nl-nl-techagent-6', style: CLEAR, languageCode: 'nl-NL' },
    { id: 'juf', name: 'Juf Ans', blurb: 'De juf van het dictee', voice: 'nl-nl-tutor-3', style: CLEAR, languageCode: 'nl-NL' },
    { id: 'sem', name: 'Sem', blurb: 'Rustig, als een radiostem', voice: 'nl-nl-training-1', style: CLEAR, languageCode: 'nl-NL' },
    { id: 'lies', name: 'Lies', blurb: 'Licht en luchtig', voice: 'nl-nl-storyteller-1', style: CLEAR, languageCode: 'nl-NL' },
  ],
  en: [
    { id: 'kees', name: 'Kees', blurb: 'The kea himself, with a light Kiwi accent', voice: '@kees-en', style: 'playful and bright, clear and unhurried', languageCode: 'en-NZ' },
    { id: 'attenbird', name: 'The narrator', blurb: 'Nature documentary narrator, resonant and witty', voice: 'en-gb-storyteller-2', style: CLEAR, languageCode: 'en-GB' },
    { id: 'radio', name: 'Radio Ray', blurb: 'Upbeat radio host', voice: 'en-us-podcaster-5', style: CLEAR, languageCode: 'en-US' },
    { id: 'bristol', name: 'Ollie', blurb: 'Warm, with dry humour (Bristol)', voice: 'en-gb-advisor-10', style: CLEAR, languageCode: 'en-GB' },
    { id: 'jess', name: 'Jess', blurb: 'Enthusiastic and fun (East Coast)', voice: 'en-us-assistant-5', style: CLEAR, languageCode: 'en-US' },
    { id: 'teacher', name: 'Miss Hale', blurb: 'Bright, breezy teacher (Winchester)', voice: 'en-gb-tutor-6', style: CLEAR, languageCode: 'en-GB' },
    { id: 'tutor', name: 'Walt', blurb: 'Writing tutor, dry and warm (West Coast)', voice: 'en-us-tutor-25', style: CLEAR, languageCode: 'en-US' },
    { id: 'storyteller', name: 'June', blurb: 'Warm storyteller (East Coast)', voice: 'en-us-storyteller-1', style: CLEAR, languageCode: 'en-US' },
  ],
  ar: [
    { id: 'kees', name: 'كيس', blurb: 'The kea himself, in clear fusha', voice: '@kees-ar', style: 'playful and bright, clear and unhurried', languageCode: 'ar-XA' },
    { id: 'ustadh', name: 'الأستاذ سامي', blurb: 'Teacher, resonant and witty', voice: 'ar-001-tutor-2', style: CLEAR, languageCode: 'ar-XA' },
    { id: 'duktura', name: 'الدكتورة ليلى', blurb: 'Professor, deep and velvety', voice: 'ar-001-tutor-1', style: CLEAR, languageCode: 'ar-XA' },
    { id: 'nour', name: 'نور', blurb: 'Bright and youthful', voice: 'ar-001-training-1', style: CLEAR, languageCode: 'ar-XA' },
    { id: 'karim', name: 'كريم', blurb: 'Crisp and eager presenter', voice: 'ar-001-training-12', style: CLEAR, languageCode: 'ar-XA' },
    { id: 'huda', name: 'هدى', blurb: 'Resonant and witty', voice: 'ar-001-techagent-2', style: CLEAR, languageCode: 'ar-XA' },
    { id: 'omar', name: 'عمر', blurb: 'Warm and engaging', voice: 'ar-001-advisor-2', style: CLEAR, languageCode: 'ar-XA' },
    { id: 'salma', name: 'سلمى', blurb: 'Soft and soothing', voice: 'ar-001-commercial-4', style: CLEAR, languageCode: 'ar-XA' },
  ],
}

/** Short Kees reactions (not dictation answers, so tags and squawks are fine here). */
export const REACTIONS = {
  nl: [
    { id: 'record', text: 'Rrraak! <cackle> Goed zo, dat is een nieuw record!', style: 'delighted and playful' },
    { id: 'again', text: 'Rrraak! Nog één keer. <short pause> Je kunt het.', style: 'encouraging and cheeky' },
  ],
  en: [
    { id: 'record', text: "Rrraak! <cackle> Well done, that's a new record!", style: 'delighted and playful' },
    { id: 'again', text: "Rrraak! One more time. <short pause> You've got this.", style: 'encouraging and cheeky' },
  ],
  ar: [
    { id: 'record', text: 'رااك! <cackle> أحسنت، هذا رقم قياسي جديد!', style: 'delighted and playful' },
    { id: 'again', text: 'رااك! مرة أخرى. <short pause> أنت تستطيع.', style: 'encouraging and cheeky' },
  ],
}
