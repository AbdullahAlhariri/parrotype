import { before, LINKS, q, regexRule, type EnRule, type Found } from './shared'

// Word partners and false friends (rules 61-75). Almost all of these are Dutch transfer:
// huiswerk maken, een foto maken, lenen (lend and borrow), leren (teach and learn), eventueel, actueel,
// controleren, met z'n vijven, hoe noem je dit, volgens mij.

/** pick the form of `to` that matches the tense of `from` (make/makes/making/made) */
const tense = (from: string, forms: Record<string, string[]>) => forms[from.toLowerCase()] ?? []
const afterHave = (f: Found) => /\b(?:have|has|had|'ve|'s|'d)\s+(?:(?:not|never|just|already)\s+)?$/i.test(before(f))

export const makeHomework = regexRule({
  id: 'en.make-homework',
  title: 'make homework → do homework',
  category: 'grammar',
  confidence: 'high',
  re: /\b(?<v>make|makes|making|made)\s+(?:(?:my|your|his|her|our|their|the|some|all|all\s+my)\s+)?homework\b/gi,
  target: 'v',
  fix: (f) => (f.g.v!.toLowerCase() === 'made' ? (afterHave(f) ? ['done'] : ['did']) : tense(f.g.v!, { make: ['do'], makes: ['does'], making: ['doing'] })),
  msg: { message: `In English you ${q('do')} homework`, explanation: `English says do your homework. Dutch ‘huiswerk maken’ is where ‘make’ sneaks in.` },
  examples: { wrong: 'I have to make my homework.', flag: 'make', fix: 'do', right: 'I have to do my homework.', ok: ['I did my homework.'] },
})

export const makePhoto = regexRule({
  id: 'en.make-photo',
  title: 'make a photo → take a photo',
  category: 'grammar',
  confidence: 'medium',
  re: /\b(?<v>make|makes|making|made)\s+(?:(?:a|an|some|many|lots\s+of|a\s+lot\s+of|the|my|our|this|that|nice|great|beautiful|good)\s+)*(?:photos?|photographs?|selfies?|pics?)\b/gi,
  target: 'v',
  fix: (f) => (f.g.v!.toLowerCase() === 'made' ? (afterHave(f) ? ['taken'] : ['took']) : tense(f.g.v!, { make: ['take'], makes: ['takes'], making: ['taking'] })),
  msg: { message: `In English you ${q('take')} a photo`, explanation: `English takes photos. Dutch makes them (een foto maken).`, learnMore: LINKS.takePhoto },
  examples: { wrong: 'Can you make a photo of us?', flag: 'make', fix: 'take', right: 'Can you take a photo of us?', ok: ['Can you take a photo of us?'] },
})

export const doMistake = regexRule({
  id: 'en.do-mistake',
  title: 'do a mistake → make a mistake',
  category: 'grammar',
  confidence: 'high',
  re: /\b(?:I|you|we|they|he|she|to|always|often|never|sometimes|can|will|would|don't|didn't|not)\s+(?<a>do|did|does|doing)\s+(?:a\s+|the\s+same\s+|many\s+|some\s+|lots\s+of\s+|a\s+lot\s+of\s+|stupid\s+|small\s+|big\s+)?mistakes?\b|\b(?:have|has|had)\s+(?<b>done)\s+(?:a\s+|many\s+|some\s+)?mistakes?\b/gi,
  target: ['a', 'b'],
  fix: (f) => tense(f.text, { do: ['make'], did: ['made'], does: ['makes'], doing: ['making'], done: ['made'] }),
  msg: { message: `In English you ${q('make')} a mistake`, explanation: `Mistakes are made, not done: I always make the same mistake.` },
  examples: { wrong: 'I always do the same mistake.', flag: 'do', fix: 'make', right: 'I always make the same mistake.', ok: ['Does a mistake matter?'] },
})

export const makeAWalk = regexRule({
  id: 'en.make-a-walk',
  title: 'make a walk → go for a walk',
  category: 'grammar',
  confidence: 'high',
  re: /\b(?<v>make|makes|made|making)\s+a\s+walk\b/gi,
  fix: (f) =>
    tense(f.g.v!, {
      make: ['go for a walk', 'take a walk'],
      makes: ['goes for a walk', 'takes a walk'],
      made: ['went for a walk', 'took a walk'],
      making: ['going for a walk', 'taking a walk'],
    }),
  msg: { message: `In English you ${q('go for')} or ${q('take')} a walk`, explanation: `English goes for a walk or takes a walk. Dutch ‘een wandeling maken’ is the source of ‘make’.` },
  examples: { wrong: "Let's make a walk.", flag: 'make a walk', fix: 'go for a walk', right: "Let's go for a walk.", ok: [] },
})

export const makeFun = regexRule({
  id: 'en.make-fun',
  title: 'make fun → have fun',
  category: 'grammar',
  confidence: 'medium',
  re: /\b(?<v>make|made|making)\s+fun\b(?=\s*[.!?,]|\s*$|\s+(?:with|together|tonight|today|this|during|at|in|on)\b)/gi,
  target: 'v',
  fix: (f) => tense(f.g.v!, { make: ['have'], made: ['had'], making: ['having'] }),
  msg: {
    message: `Enjoying yourself is ${q('have fun')}`,
    explanation: `have fun means enjoying yourself. make fun of someone means laughing at them, which is not nice. Dutch ‘plezier maken’ means have fun.`,
  },
  examples: { wrong: 'We made fun at the party.', flag: 'made', fix: 'had', right: 'We had fun at the party.', ok: ['They made fun of him.', 'We make fun crafts.'] },
})

const lendBorrow = `lend means giving something for a while (uitlenen). borrow means taking something for a while (lenen van). Dutch ‘lenen’ does both.`

export const borrowMe = regexRule({
  id: 'en.borrow-me',
  title: 'borrow me → lend me',
  category: 'grammar',
  confidence: 'high',
  re: /\b(?<v>borrow|borrows|borrowed|borrowing)\s+(?:me|us)\s+(?:a|an|the|your|his|her|some|money|\d+|it|this|that)\b/gi,
  target: 'v',
  fix: (f) => tense(f.g.v!, { borrow: ['lend'], borrows: ['lends'], borrowed: ['lent'], borrowing: ['lending'] }),
  msg: { message: `Giving it to someone is ${q('lend')}: ${q('lend me')}`, explanation: lendBorrow, learnMore: LINKS.borrowLend },
  examples: { wrong: 'Can you borrow me your pen?', flag: 'borrow', fix: 'lend', right: 'Can you lend me your pen?', ok: ['Can I borrow your pen?', 'Can I borrow them?'] },
})

export const lendBorrowRule = regexRule({
  id: 'en.lend-borrow',
  title: 'can I lend your → can I borrow your',
  category: 'grammar',
  confidence: 'high',
  re: /\b(?:can|could|may|might)\s+I\s+(?<v>lend)\s+(?:your|his|her|their|some|a|an|the)\b/gi,
  target: 'v',
  fix: () => ['borrow'],
  msg: { message: `If you take it, you ${q('borrow')} it`, explanation: lendBorrow, learnMore: LINKS.borrowLend },
  examples: { wrong: 'Can I lend your bike?', flag: 'lend', fix: 'borrow', right: 'Can I borrow your bike?', ok: ['Can I lend you my bike?'] },
})

export const learnMe = regexRule({
  id: 'en.learn-me',
  title: 'learn me → teach me',
  category: 'grammar',
  confidence: 'high',
  re: /\b(?<v>learn|learns|learned|learnt|learning)\s+(?:me|him|us)\s+(?:to|how|about|English|Dutch|Arabic|maths?|the)\b/gi,
  target: 'v',
  fix: (f) => tense(f.g.v!, { learn: ['teach'], learns: ['teaches'], learned: ['taught'], learnt: ['taught'], learning: ['teaching'] }),
  msg: {
    message: `Passing knowledge on is ${q('teach')}`,
    explanation: `teach means giving knowledge (leren aan). learn means getting it. Dutch ‘leren’ covers both, so ‘he learned me’ sounds right but isn't.`,
  },
  examples: { wrong: 'My father learned me how to swim.', flag: 'learned', fix: 'taught', right: 'My father taught me how to swim.', ok: ['I learned how to swim.'] },
})

export const becomeGet = regexRule({
  id: 'en.become-get',
  title: 'became a present → got a present',
  category: 'grammar',
  confidence: 'medium',
  re: /\b(?<v>become|becomes|became|becoming)\s+(?:(?:a|an|the|my|some|your|no)\s+)?(?:present|gift|letter|message|email|e-mail|answer|reply|package|parcel|call|prize|discount|refund|salary|raise|ticket|invitation)\b/gi,
  target: 'v',
  fix: (f) => tense(f.g.v!, { become: ['get', 'receive'], becomes: ['gets', 'receives'], became: ['got', 'received'], becoming: ['getting', 'receiving'] }),
  msg: {
    message: `Receiving something is ${q('get')} or ${q('receive')}`,
    explanation: `become means worden. To receive something is get or receive. (Flemish ‘bekomen’ and German ‘bekommen’ do mean get, which causes the mix-up.)`,
  },
  examples: { wrong: 'I became a present from my aunt.', flag: 'became', fix: 'got', right: 'I got a present from my aunt.', ok: ['She became a teacher.'] },
})

export const eventuallyFalseFriend = regexRule({
  id: 'en.eventually-ff',
  title: 'eventually (false friend)',
  category: 'style',
  confidence: 'low',
  strictOnly: true,
  re: /\b(?:can|could|may|might|we|you|I)\s+(?<a>eventually)\b(?=[^.!?]*\b(?:tomorrow|next\s+week|later|if|maybe|perhaps|also)\b)|\b(?<b>eventual)\s+(?:questions?|problems?|costs?|changes?|delays?|comments?)\b/gi,
  target: ['a', 'b'],
  fix: (f) => (f.g.a ? ['possibly', 'if needed'] : ['possible', 'any']),
  msg: {
    message: `${q('eventually')} means ‘in the end’: did you mean ${q('possibly')}?`,
    explanation: `English eventually means uiteindelijk. Dutch ‘eventueel’ means possibly, or if needed.`,
    learnMore: LINKS.falseFriends,
  },
  examples: { wrong: 'We could eventually meet tomorrow if you want.', flag: 'eventually', fix: 'possibly', right: 'We could possibly meet tomorrow if you want.', ok: ['Eventually, after many years, we won.'] },
})

export const actualFalseFriend = regexRule({
  id: 'en.actual-ff',
  title: 'actual news (false friend)',
  category: 'style',
  confidence: 'low',
  strictOnly: true,
  re: /\b(?<w>actual)\s+(?:news|topics?|issues?|affairs|events?|developments?|themes?)\b/gi,
  target: 'w',
  fix: () => ['current', 'topical', 'latest'],
  msg: { message: `${q('actual')} means real: did you mean ${q('current')}?`, explanation: `English actual means werkelijk. Dutch ‘actueel’ means current or topical.`, learnMore: LINKS.falseFriends },
  examples: { wrong: 'We discussed actual news.', flag: 'actual', fix: 'current', right: 'We discussed current news.', ok: ['The actual cost was higher.'] },
})

export const controlCheck = regexRule({
  id: 'en.control-check',
  title: 'control my homework → check',
  category: 'style',
  confidence: 'low',
  strictOnly: true,
  re: /\b(?<v>control|controlled|controlling|controls)\s+(?:(?:the|my|your|his|her|our|their)\s+)?(?:answers?|homework|spelling|tickets?|passports?|text|email|grammar|calculations?)\b/gi,
  target: 'v',
  fix: (f) => tense(f.g.v!, { control: ['check'], controlled: ['checked'], controlling: ['checking'], controls: ['checks'] }),
  msg: { message: `Looking for mistakes is ${q('check')}`, explanation: `control means having power over something. Dutch ‘controleren’ means check.`, learnMore: LINKS.falseFriends },
  examples: { wrong: 'Can you control my homework?', flag: 'control', fix: 'check', right: 'Can you check my homework?', ok: ['They control the market.'] },
})

export const weAreWithN = regexRule({
  id: 'en.we-are-with-n',
  title: 'we are with five → there are five of us',
  category: 'style',
  confidence: 'low',
  strictOnly: true,
  re: /\b(?<s>we|they)\s+(?<v>are|were|'re)\s+with\s+(?<n>\d+|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)(?=\s*[.!?,]|\s*$|\s+(?:people|persons)\b)/gi,
  target: (m, src) => {
    const end = m.index + m[0].length
    const extra = /^\s+(?:people|persons)\b/i.exec(src.slice(end))
    return [m.index, end + (extra ? extra[0].length : 0)]
  },
  fix: (f) => {
    const was = f.g.v!.toLowerCase() === 'were' ? 'were' : 'are'
    return [`there ${was} ${f.g.n!.toLowerCase()} of ${f.g.s!.toLowerCase() === 'we' ? 'us' : 'them'}`]
  },
  msg: (_f, fixes) => ({ message: `English says ${q(fixes[0])}`, explanation: `Dutch ‘we zijn met z'n vijven’ becomes ‘there are five of us’ in English.` }),
  examples: { wrong: 'We are with five people.', flag: 'We are with five people', fix: 'There are five of us', right: 'There are five of us.', ok: ['We are with three friends from Spain.'] },
})

export const howDoYouCall = regexRule({
  id: 'en.how-do-you-call',
  title: 'How do you call this? → What',
  category: 'style',
  confidence: 'low',
  strictOnly: true,
  re: /\b(?<w>[Hh]ow)\s+(?:do|would|did)\s+you\s+call\s+(?:this|that|it|these|those)\b(?=\s*\?|\s+in\b)/g,
  target: 'w',
  fix: () => ['what'],
  msg: { message: `English asks ${q('What do you call this?')}`, explanation: `Dutch ‘Hoe noem je dit?’ uses how, English uses what.` },
  examples: { wrong: 'How do you call this in English?', flag: 'How', fix: 'What', right: 'What do you call this in English?', ok: ['How do you call home from abroad?'] },
})

export const accordingToMe = regexRule({
  id: 'en.according-to-me',
  title: 'according to me → in my opinion',
  category: 'style',
  confidence: 'low',
  strictOnly: true,
  re: /\b[Aa]ccording\s+to\s+me\b/g,
  fix: () => ['in my opinion', 'I think'],
  msg: { message: `For your own view: ${q('in my opinion')} or ${q('I think')}`, explanation: `according to is for other sources: according to the BBC. For yourself, say in my opinion. Dutch ‘volgens mij’ is the source.` },
  examples: { wrong: 'According to me, it is a good idea.', flag: 'According to me', fix: 'In my opinion', right: 'In my opinion, it is a good idea.', ok: [] },
})

export const collocationRules: EnRule[] = [
  makeHomework,
  makePhoto,
  doMistake,
  makeAWalk,
  makeFun,
  borrowMe,
  lendBorrowRule,
  learnMe,
  becomeGet,
  eventuallyFalseFriend,
  actualFalseFriend,
  controlCheck,
  weAreWithN,
  howDoYouCall,
  accordingToMe,
]
