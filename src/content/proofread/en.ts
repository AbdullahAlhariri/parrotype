import { defineTexts } from './build'
import type { RuleNote } from './types'

// English Fix it texts. Homophones first, then the Dutch-interference slips
// (since + present, then/than, lend/borrow, make/do, apostrophe plurals).

const NOTES: Record<string, RuleNote> = {
  theyre: { title: "they're / their", note: { en: "They're means they are. Their is for something they own." }, pack: 'en.their' },
  their: { title: 'their / there', note: { en: 'Something they own follows, so their.' }, pack: 'en.their' },
  there: { title: 'there / their', note: { en: 'There is, there are: there, with here hidden inside it.' }, pack: 'en.their' },
  youre: { title: "you're / your", note: { en: "You're means you are." }, pack: 'en.your' },
  your: { title: "your / you're", note: { en: 'Something of yours follows (your phone), so your.' }, pack: 'en.your' },
  than: { title: 'than / then', note: { en: 'A comparison (better, more): than, with an a like compare. Dutch dan covers both.' }, pack: 'en.then-than' },
  then: { title: 'then / than', note: { en: 'Time or order (first, next, after that): then.' }, pack: 'en.then-than' },
  its: { title: "its / it's", note: { en: 'Its, with no apostrophe, means belonging to it, like his.' }, pack: 'en.its' },
  'its-is': { title: "it's / its", note: { en: "It's means it is." }, pack: 'en.its' },
  whose: { title: "whose / who's", note: { en: "Belonging to whom: whose. Who's means who is." }, pack: 'en.whose' },
  lose: { title: 'lose / loose', note: { en: 'The verb has one o: lose. Loose means not tight.' }, pack: 'en.lose-loose' },
  affect: { title: 'affect / effect', note: { en: 'A verb is needed here: affect. Effect is the noun.' }, pack: 'en.affect-effect' },
  effect: { title: 'effect / affect', note: { en: 'A noun is needed after positive: effect. Affect is the verb.' }, pack: 'en.affect-effect' },
  too: { title: 'too / to', note: { en: 'Meaning also, or more than enough: too.' }, pack: 'en.to-too' },
  'a-an': { title: 'a / an', note: { en: 'Choose by sound: an before a vowel sound (an hour, an orange, an extra).' }, pack: 'en.a-an' },
  'make-do': { title: 'make / do', note: { en: 'A task or an activity: do. Make is for creating something.' }, pack: 'en.make-do' },
  'take-photo': { title: 'take a photo', note: { en: 'You take a photo in English. Dutch een foto maken, English take.' }, pack: 'en.make-do' },
  lend: { title: 'lend / borrow', note: { en: 'Giving something for a while: lend. Borrowing is taking.' }, pack: 'en.lend-teach' },
  teach: { title: 'teach / learn', note: { en: 'Giving knowledge: teach. Learning is getting it.' }, pack: 'en.lend-teach' },
  'since-pp': { title: 'since + present perfect', note: { en: 'Started in the past and still true: present perfect. I have lived here since 2021.' }, pack: 'en.since-for' },
  'since-for': { title: 'for + length of time', note: { en: 'A length of time (two years, a year or two) takes for, not since.' }, pack: 'en.since-for' },
  'ie-ei': { title: 'spelling: receive', note: { en: 'i before e, except after c: receive.' } },
  accommodation: { title: 'spelling: accommodation', note: { en: 'Two c\'s and two m\'s: accommodation.' } },
  definitely: { title: 'spelling: definitely', note: { en: 'Think of finite: defin-ite-ly.' } },
  separate: { title: 'spelling: separate', note: { en: 'There is a rat in separate.' } },
  necessary: { title: 'spelling: necessary', note: { en: 'One collar, two sleeves: one c, two s\'s.' } },
  'ff-sympathiek': { title: 'false friend: sympathetic', note: { en: "Dutch sympathiek means nice or likeable. English sympathetic means showing sympathy for someone's trouble." } },
  'cap-day': { title: 'capital for days', note: { en: 'Days of the week take a capital letter in English.' } },
  'cap-month': { title: 'capital for months', note: { en: 'Months take a capital letter in English.' } },
  'cap-lang': { title: 'capital for languages', note: { en: 'Languages take a capital letter in English, as in Dutch.' } },
  'cap-i': { title: 'capital I', note: { en: 'The word I is always a capital.' } },
  irregular: { title: 'irregular past tense', note: { en: 'Buy is irregular: buy, bought, bought.' } },
  agreement: { title: 'subject and verb agreement', note: { en: 'One shop assistant, so the singular verb: was.' } },
  'explain-to': { title: 'explain something to someone', note: { en: 'You explain something to someone. Dutch leg me uit has no to; English needs it.' } },
  'could-of': { title: 'should have', note: { en: "Should've sounds like should of, but the word is have." } },
  'plural-apos': { title: 'no apostrophe in plurals', note: { en: "English plurals never take an apostrophe: photos. Dutch foto's does." } },
  fewer: { title: 'fewer / less', note: { en: 'Things you can count (spaces) take fewer. Less is for amounts (less time).' } },
  fused: { title: 'two words', note: { en: 'These are two words: a lot, each other.' } },
  uncountable: { title: 'uncountable nouns', note: { en: 'Advice and information are uncountable in English: no -s.' } },
  'interested-in': { title: 'interested in', note: { en: 'Interested takes in: interested in this role.' } },
  'look-forward': { title: 'look forward to + -ing', note: { en: 'In look forward to, the to is a preposition, so an -ing form follows: to hearing.' } },
}

export const EN_TEXTS = defineTexts('en', NOTES, [
  {
    id: 'en-01',
    title: 'Beach day',
    difficulty: 1,
    source:
      "[Their>They're#theyre] going to the beach tomorrow, even though it's supposed to rain in the afternoon. [Your>You're#youre] welcome to join us if you're free. We'll leave at nine and take the coast road, because the main road is always busy on Saturdays. Anything is better [then>than#than] staying at home and staring at a screen all day. My brother is bringing the dog, which wagged [it's>its#its] tail for ten minutes when it heard the word beach. Text me tonight and I'll save you a seat.",
  },
  {
    id: 'en-02',
    title: 'Saturday plans',
    difficulty: 1,
    source:
      "Hi Sam,\n\nAre you free on Saturday? We want to go to the market in the morning and [than>then#then] have lunch at that new place near the station. [Its>It's#its-is] a small place, so I booked a table for one o'clock. My cousin is coming [to>too#too], she's in town for [a>an#a-an] hour or two before her train. If the weather is [to>too#too] bad, we can stay in and play board games instead. Let me know by Friday, because I need to confirm the booking.\n\nSee you,\nRita",
  },
  {
    id: 'en-03',
    title: 'Lost keys',
    difficulty: 1,
    source:
      "I lost my keys again this morning. I looked everywhere: in my bag, in my coat, even in the fridge. [Than>Then#then] my sister asked [who's>whose#whose] keys were hanging on the door. They were mine, of course. I must have left them there last night. She says I should get one of those little trackers that beep when you [loose>lose#lose] something. [You're>Your#your] phone shows you where they are. Honestly, it sounds better [then>than#than] buying a new lock every year.",
  },
  {
    id: 'en-04',
    title: 'Playground meeting',
    difficulty: 1,
    source:
      "Hi everyone,\n\n[Their>There#there] is a meeting about the new playground on Wednesday at seven in the community room. The council wants to hear our ideas before [their>they're#theyre] finished with the design. Families with children can bring [there>their#their] drawings and [photo's>photos#plural-apos] of playgrounds they like. [Its>It's#its-is] a good chance to ask questions about safety and noise. There will be coffee and cake. If you cannot come, please put your ideas in the box by the main entrance.\n\nSee you there,\nMarieke from number 12",
  },
  {
    id: 'en-05',
    title: 'Booking a room',
    difficulty: 2,
    source:
      "Hello Priya,\n\nI [recieved>received#ie-ei] your email about the [accomodation>accommodation#accommodation] for our trip to Lisbon. We will [definately>definitely#definitely] need two [seperate>separate#separate] rooms, because my brother snores like a tractor. The hotel near the old town looks nice, but it's quite expensive. Is a deposit [neccessary>necessary#necessary], or can we pay when we arrive? I'm also not sure whether breakfast is included. If it isn't, there are plenty of bakeries in the area. Let me know what you think, and I'll book everything this weekend.\n\nBest,\nTom",
  },
  {
    id: 'en-06',
    title: 'My English course',
    difficulty: 2,
    source:
      'I [live>have lived/have been living#since-pp] in Utrecht since 2021, and three weeks ago I started an English course at the library. The teacher is very [sympathetic>nice/friendly/kind#ff-sympathiek] and explains everything clearly, even the strange spelling. Every [monday>Monday#cap-day] we have a speaking class, and in [march>March#cap-month] we will have our first exam. I was nervous at first, but the other students are friendly. Most of them have only been in the Netherlands [since>for#since-for] a year or two. Next week we will role-play job interviews, which is exactly what I need.',
  },
  {
    id: 'en-07',
    title: 'A new laptop',
    difficulty: 2,
    source:
      "Yesterday I [buyed>bought#irregular] a new laptop. The shop assistant [were>was#agreement] very helpful, and she [explained me all the settings>explained all the settings to me#explain-to]. It is much lighter than my old one, and the battery lasts a whole day. I [should of>should have/should've#could-of] checked the price online first, though: the same model is forty euros cheaper on the website. Still, I am happy with it. I spent the evening moving my [photo's>photos#plural-apos] and music, and now my desk finally looks tidy again.",
  },
  {
    id: 'en-08',
    title: 'Moving house',
    difficulty: 2,
    source:
      'We are moving house next month, and I have to [make>do#make-do] a lot of things before then. My friend Ahmed has offered to [borrow>lend#lend] us his van, which saves us a lot of money. My father [learned>taught#teach] me how to drive a van years ago, so that part is easy. The hard part is packing. I have made a list of every room, and I pack one room per evening. Tonight it is the kitchen. I have already [made>taken#take-photo] photos of all the cables, so I know how to connect the TV again.',
  },
  {
    id: 'en-09',
    title: 'Dinner at Casa Lina',
    difficulty: 2,
    source:
      "We celebrated my mother's birthday at Casa Lina on [friday>Friday#cap-day]. The restaurant is famous for [it's>its#its] seafood, and it deserves its reputation. The waiters were friendly, and the owners clearly know [there>their#their] wines. The grilled fish was even better [then>than#than] the one I had in Portugal last summer. The only downside was the noise: it was hard to hear [eachother>each other#fused]. For dessert I had [a>an#a-an] orange cake that I am still thinking about. It's not cheap, but it is worth every euro.",
  },
  {
    id: 'en-10',
    title: 'A note to the teacher',
    difficulty: 2,
    source:
      "Dear Mr Jones,\n\nMy son Adam [is>has been#since-pp] ill since Monday, so he will not be at school until Thursday. He has a high temperature and is sleeping a lot. [i>I#cap-i] have asked a classmate to bring his homework home, so he does not fall [to>too#too] far behind. Could you let me know if there is a test this week? I know the class is working on [a>an#a-an] important project, and I don't want him to miss it.\n\nThank you for your understanding.\nKind regards,\nLaila Hassan",
  },
  {
    id: 'en-11',
    title: 'Gym diary',
    difficulty: 2,
    source:
      'Week three of my fitness plan. I go to the gym on Tuesdays and Thursdays and [make>do#make-do] yoga on Sundays. My goal is to [loose>lose#lose] five kilos before the summer, but I care more about feeling fit [then>than#than] about the number on the scale. Yesterday I [made>did#make-do] my first full workout without a break. Afterwards I was so tired that I fell asleep on the sofa at eight. My trainer says I am making good progress. Next week we will add [a>an#a-an] extra session.',
  },
  {
    id: 'en-12',
    title: 'New parking rules',
    difficulty: 3,
    source:
      'Try not to [loose>lose#lose] your parking permit again, because a new one costs thirty euros. The new rules will [effect>affect#affect] everyone on our street, especially people [who\'s>whose#whose] cars are too big for the spaces. There are [less>fewer#fewer] parking spaces than last year, and [alot>a lot#fused] of people are angry about it. The council says the change will have a positive [affect>effect#effect] on air quality. I am not so sure. Maybe I will finally sell my car and buy a cargo bike.',
  },
  {
    id: 'en-13',
    title: 'Job application',
    difficulty: 3,
    source:
      'Dear Sir or Madam,\n\nI am writing to apply for the position of customer service assistant. I have worked in customer support [since>for#since-for] two years, where I answered questions about orders and gave [advices>advice#uncountable] on returns. I am interested [for>in#interested-in] this role because I enjoy helping people and solving problems. I speak [dutch>Dutch#cap-lang], English and Arabic fluently. I would be happy to provide more [informations>information#uncountable] about my experience. I look forward to [hear>hearing#look-forward] from you.\n\nKind regards,\nOmar Haddad',
  },
])
