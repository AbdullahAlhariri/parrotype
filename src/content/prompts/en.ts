import type { WritingPrompt } from './types'

// English writing prompts. Trap prompts target the mistakes Dutch speakers make in English
// (docs/research/english-errors.md §1.2): then/than, since + present, its/it's, your/you're,
// lend/borrow, teach/learn, lose/loose, make/do, lowercase days.

const p = (id: string, kind: WritingPrompt['kind'], words: number, text: string, focus: string[], watch?: string): WritingPrompt => ({
  id: `en-${id}`,
  lang: 'en',
  kind,
  words,
  text,
  focus,
  ...(watch ? { watch } : {}),
})

export const EN_PROMPTS: WritingPrompt[] = [
  // story starters
  p('p01', 'story', 150, 'Story starter: The parrot cleared its throat and said, “We need to talk.”', ['its-its', 'dialogue-punctuation']),
  p('p02', 'story', 150, 'Story starter: Nobody noticed the door until it started to glow.', ['story', 'past-perfect']),
  p('p03', 'story', 120, 'Write the opening paragraph of a mystery novel set in Amsterdam.', ['story', 'capitals:places']),
  p('p04', 'story', 150, 'Write a dialogue between a cat and a dog who have to share one sofa.', ['dialogue-punctuation']),
  p('p05', 'story', 200, 'Tell the story of the worst trip you have ever taken. What went wrong first?', ['irregular-past']),
  p('p06', 'story', 150, 'Story starter: The last train had left, and the station clock had stopped at 11:47.', ['story', 'past-perfect']),

  // opinion
  p('p07', 'opinion', 200, 'Is it better to work from home or in an office? Give two reasons for each side before you decide.', ['opinion', 'linking-words']),
  p('p08', 'opinion', 200, 'Compare two cities you know. Which one would you rather live in, and why?', ['then-than', 'comparatives']),
  p('p09', 'opinion', 180, 'Should phones be banned at the dinner table? Argue one side, then admit one thing the other side gets right.', ['opinion', 'modal-verbs']),
  p('p10', 'opinion', 150, 'Is it rude to recline your seat on a plane? Make your case.', ['opinion', 'your-youre']),
  p('p11', 'opinion', 150, 'Which invention could the world do without, and what would we use instead?', ['conditionals']),

  // describe
  p('p12', 'describe', 150, 'Describe a busy train station at rush hour: the announcements, the coffee stands, the people running for trains.', ['describe', 'present-continuous']),
  p('p13', 'describe', 120, 'Describe the room you are sitting in without using the word ‘the’ more than five times.', ['articles', 'constraint']),
  p('p14', 'describe', 150, 'Describe a family tradition and explain where it comes from.', ['their-there', 'present-simple']),
  p('p15', 'describe', 150, 'Describe a meal you remember, in enough detail that the reader gets hungry.', ['describe', 'irregular-past']),

  // journal
  p('p16', 'journal', 150, 'Describe your perfect weekend, hour by hour.', ['then-than', 'future']),
  p('p17', 'journal', 150, 'What is one skill you would like to learn this year, and how will you work on it?', ['future', 'modal-verbs']),
  p('p18', 'journal', 200, 'Write about a time you made a mistake and what you learned from it.', ['irregular-past', 'learned']),
  p('p19', 'journal', 150, 'What is the best piece of advice you have ever received? Who gave it to you?', ['advice-advise', 'ie-ei']),
  p('p20', 'journal', 100, 'What did you do yesterday that you would happily do again today?', ['irregular-past']),

  // letters
  p('p21', 'letter', 100, 'Write a friendly note to the people next door, inviting them to a small party.', ['your-youre', 'their-there']),
  p('p22', 'letter', 200, 'Write a letter to your future self, to be opened in five years.', ['your-youre', 'future']),
  p('p23', 'letter', 180, 'Write a complaint to a company whose product broke after one week.', ['whose-whos', 'formal']),
  p('p24', 'letter', 150, 'Write a thank-you email to a teacher or colleague who helped you more than they know.', ['then-than', 'formal']),

  // explain to a friend
  p('p25', 'explain', 120, 'Explain how to make your favourite drink to someone who has never made it.', ['imperative', 'sequence-words']),
  p('p26', 'explain', 150, 'Explain a Dutch habit or tradition to someone from another country.', ['capitals:nationalities', 'articles']),
  p('p27', 'explain', 150, 'Explain to a friend how to get from the airport to your home by public transport.', ['imperative', 'prepositions']),
  p('p28', 'explain', 180, 'Explain the rules of a game or sport you know well to someone who has never seen it.', ['present-simple', 'articles']),

  // grammar traps
  p('p29', 'trap', 120, 'Compare yourself with a friend or family member: who is taller, older, louder or more patient than the other?', ['then-than', 'comparatives'], 'than / then'),
  p('p30', 'trap', 150, 'How long have you lived where you live now? Write about what has changed since you moved in.', ['since-for', 'present-perfect'], 'since 2019 / for five years'),
  p('p31', 'trap', 120, 'Write a short review of your phone: its best feature, its worst habit, and whether it’s worth the price.', ['its-its'], 'its / it’s'),
  p('p32', 'trap', 120, 'A friend is staying in your flat for a week. Write them a note: where your keys are, what you’re worried about, and what they’re allowed to eat.', ['your-youre', 'their-there'], 'your / you’re, their / they’re'),
  p('p33', 'trap', 150, 'Write about a time someone taught you something, or lent you something you really needed.', ['teach-learn', 'lend-borrow'], 'teach / learn, lend / borrow'),
  p('p34', 'trap', 150, 'What did you do last weekend, and what are you doing this weekend? Write at least three sentences about each.', ['irregular-past', 'present-continuous'], 'went, bought, thought'),
  p('p35', 'trap', 120, 'What would you hate to lose most: your phone, your keys or your wallet? Explain why.', ['lose-loose'], 'lose / loose'),
  p('p36', 'trap', 120, 'Write about your weekend using do, make, take and have at least twice each: homework, a photo, a walk, fun.', ['make-do'], 'do homework, take a photo, have fun'),
  p('p37', 'trap', 120, 'Write about your week day by day, starting each part with the name of the day.', ['capitals:days'], 'Monday, not monday'),
]
