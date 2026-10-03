import { regexRule, q, SENT_START, type EnRule, type Msg } from './shared'

// Words that sound alike but mean different things (english-errors.md 1.1, rules 1-33).
// Several are classic Dutch traps: Dutch 'dan' is both than and then, and Dutch final devoicing makes
// lose/loose, life/live, believe/belief and prize/price sound the same.

/* ------------------------------------------------------------------ */
/* its / it's                                                          */
/* ------------------------------------------------------------------ */

const itsMsg: Msg = {
  message: `Here you mean ${q("it's")} (it is)`,
  explanation: `${q('its')} is the owner word, like ‘his’: the dog wagged its tail. ${q("it's")} is short for ‘it is’ or ‘it has’. If ‘it is’ fits, write it's.`,
}

export const couldOf = regexRule({
  id: 'en.could-of',
  title: 'could of → could have',
  category: 'grammar',
  confidence: 'high',
  re: /\b(?<modal>(?:could|should|would|must|might)(?:n't)?)\s+(?<of>of)\b(?!\s+(?:course|necessity)\b)/gi,
  target: 'of',
  fix: () => ['have'],
  msg: (f) => ({
    message: `${q(`${f.g.modal} of`)} should be ${q(`${f.g.modal} have`)}`,
    explanation: `${q('should of')} is how ${q("should've")} sounds when you say it quickly. The word is ‘have’: should have, could have, would have.`,
  }),
  examples: {
    wrong: 'I should of called you.',
    flag: 'of',
    fix: 'have',
    right: 'I should have called you.',
    ok: ['You could, of course, stay.', 'He could of course say no.', 'Policy must of necessity change.', 'They complained in May of last year.'],
  },
})

export const itsItIs = regexRule({
  id: 'en.its-it-is',
  title: "its → it's",
  category: 'grammar',
  confidence: 'high',
  re: /\b(?<w>[Ii]ts)\s+(?:a|an|the|not|been|gonna|ok|okay|me|you|him|us)\b(?!-)/g,
  target: 'w',
  fix: () => ["it's"],
  msg: itsMsg,
  examples: {
    wrong: 'Its a beautiful day.',
    flag: 'Its',
    fix: "It's",
    right: "It's a beautiful day.",
    ok: ['The company changed its name.', 'The dog wagged its tail.', 'Its own rules apply.'],
  },
})

export const itsAdjEnd = regexRule({
  id: 'en.its-adj-end',
  title: "its + adjective → it's",
  category: 'grammar',
  confidence: 'high',
  re: /\b(?<w>[Ii]ts)\s+(?:(?:very|really|so|too|pretty|quite)\s+)?(?:true|false|fine|ok|okay|good|great|bad|nice|easy|hard|possible|impossible|important|cold|hot|late|early|raining|snowing|over|done)(?=\s*[.!?,;]|\s*$)/g,
  target: 'w',
  fix: () => ["it's"],
  msg: itsMsg,
  examples: {
    wrong: 'I think its too late.',
    flag: 'its',
    fix: "it's",
    right: "I think it's too late.",
    ok: ['The plan has its good points.', 'We admired its very good design.'],
  },
})

export const itsTime = regexRule({
  id: 'en.its-time',
  title: "its time → it's time",
  category: 'grammar',
  confidence: 'high',
  re: /(?<=^|[.!?]\s+|\bthat\s+|\bthink\s+|\bguess\s+|\bnow\s+)(?<w>[Ii]ts)\s+time\b/g,
  target: 'w',
  fix: () => ["it's"],
  msg: { ...itsMsg, explanation: `${q("It's time to go")} means ‘it is time to go’, so it needs the apostrophe. (‘The council took its time’ is the owner word and stays its.)` },
  examples: {
    wrong: 'I think its time to go.',
    flag: 'its',
    fix: "it's",
    right: "I think it's time to go.",
    ok: ['The government has taken its time to decide.'],
  },
})

export const itsOwn = regexRule({
  id: 'en.its-own',
  title: "it's own → its own",
  category: 'grammar',
  confidence: 'high',
  re: /\b(?:(?<own>it's)(?=\s+own\b)|(?<self>it's\s+self)\b)/gi,
  target: ['own', 'self'],
  fix: (f) => (f.g.self ? ['itself'] : ['its']),
  msg: (f) => ({
    message: f.g.self ? `One word, no apostrophe: ${q('itself')}` : `No apostrophe in ${q('its own')}`,
    explanation: `The owner word ‘its’ never has an apostrophe, just like ‘his’ and ‘hers’. ${q("it's")} always means ‘it is’ or ‘it has’.`,
  }),
  examples: { wrong: "The town has it's own beach.", flag: "it's", fix: 'its', right: 'The town has its own beach.', ok: ["It's ours, not theirs."] },
})

export const prepIts = regexRule({
  id: 'en.prep-its',
  title: "of it's → of its",
  category: 'grammar',
  confidence: 'medium',
  re: /\b(?<p>of|on|in|for|with|by|from|into|onto|under|over|through)\s+(?<w>it's)\s+(?!(?:been|a|an|the|not|going|time|my|your|our|their|his|her|so|very|too|really|just|all|only|also)\b)[a-z]+/gi,
  target: 'w',
  fix: () => ['its'],
  msg: (f) => ({
    message: `After ${q(f.g.p!.toLowerCase())} you usually want ${q('its')} (belonging to it)`,
    explanation: `A preposition is normally followed by a noun phrase: of its fur, in its box. ${q("it's")} means ‘it is’, which rarely fits there.`,
  }),
  examples: { wrong: "The cat licked all of it's fur.", flag: "it's", fix: 'its', right: 'The cat licked all of its fur.', ok: ["In it's been a long time, nothing."] },
})

export const verbItsNoun = regexRule({
  id: 'en.verb-its-noun',
  title: "wagged it's tail → its tail",
  category: 'grammar',
  confidence: 'high',
  re: /\b(?:wag|wags|wagged|lost|loses|changed|changes|change|shook|shakes|raised|raises|showed|shows|opened|opens|closed|closes|lifted|turned|turns|hurt|hurts|broke|did|does|do|made|makes|lowered|spread|spreads|flapped|flaps|licked|licks|wiped|cleaned|keeps|kept)\s+(?<w>it's)\s+(?:tail|head|name|mind|way|best|job|colour|color|shape|value|place|ears|paws|wings|eyes|door|doors|mouth|leg|legs|feet|nose|face|fur|own|share|part|work|thing)\b/gi,
  target: 'w',
  fix: () => ['its'],
  msg: {
    message: `Belonging to it: ${q('its')}, no apostrophe`,
    explanation: `The owner word ‘its’ has no apostrophe, like ‘his’: the dog wagged its tail. ${q("it's")} always means ‘it is’ or ‘it has’.`,
  },
  examples: { wrong: "The dog wagged it's tail.", flag: "it's", fix: 'its', right: 'The dog wagged its tail.', ok: ["I think it's a dog.", "Whatever it does, it's fine."] },
})

/* ------------------------------------------------------------------ */
/* your / you're                                                       */
/* ------------------------------------------------------------------ */

export const yourYoure = regexRule({
  id: 'en.your-youre',
  title: "your → you're",
  category: 'grammar',
  confidence: 'high',
  re: /\b(?<w>[Yy]our)\s+(?:(?:not(?!\s+\w+ing\b)|gonna|always|never|already|probably|definitely|actually|kidding|joking|a|an|the)\b(?![-/])|(?:welcome|right|wrong|sure|late|early)(?=\s*[.!?,;]|\s*$)|welcome(?=\s+to\s+(?:join|come|stay|use|take|ask|bring|visit|call|try|have|borrow|share)\b))/g,
  target: 'w',
  fix: () => ["you're"],
  msg: {
    message: `Here you mean ${q("you're")} (you are)`,
    explanation: `${q('your')} is the owner word: your bike. ${q("you're")} is short for ‘you are’: you're welcome. Say ‘you are’ out loud; if it fits, write you're.`,
  },
  examples: {
    wrong: 'Your welcome!',
    flag: 'Your',
    fix: "You're",
    right: "You're welcome!",
    ok: ['Your right hand is cold.', 'Thanks for your welcome speech.', 'Your welcome to the team was warm.', 'Your A grade is great.', 'Your very own room.', 'Fix your a/c system.', 'Your not eating vegetables is bad.'],
  },
})

export const youreYour = regexRule({
  id: 'en.youre-your',
  title: "you're → your",
  category: 'grammar',
  confidence: 'high',
  re: /\b(?<w>you're)\s+(?<n>own|car|house|name|mother|father|mom|mum|dad|sister|brother|phone|job|room|bag|book|money|turn|fault|email|address|homework|opinion)\b/gi,
  target: 'w',
  fix: () => ['your'],
  msg: (f) => ({
    message: `Before a noun you want ${q('your')}: ${q(`your ${f.g.n!.toLowerCase()}`)}`,
    explanation: `${q("you're")} means ‘you are’. For something that belongs to you, write ‘your’: your bag, your turn.`,
  }),
  examples: {
    wrong: "Is this you're bag?",
    flag: "you're",
    fix: 'your',
    right: 'Is this your bag?',
    ok: ["You're home early!", "You're family to me.", "The people you're friends with."],
  },
})

/* ------------------------------------------------------------------ */
/* their / there / they're                                             */
/* ------------------------------------------------------------------ */

const thereExpl = `${q('there')} is a place, or the start of ‘there is / there are’. ${q('their')} means belonging to them. ${q("they're")} is short for ‘they are’.`

export const theirIs = regexRule({
  id: 'en.their-is',
  title: 'their is → there is',
  category: 'grammar',
  confidence: 'high',
  re: /\b(?<w>[Tt]heir)\s+(?<v>is|are|was|were|isn't|aren't|wasn't|weren't|will\s+be|has\s+been|have\s+been|might\s+be|could\s+be|must\s+be)\b/g,
  target: 'w',
  fix: () => ['there'],
  msg: (f) => ({ message: `${q(`There ${f.g.v!.replace(/\s+/g, ' ')}`)} starts with ${q('there')}`, explanation: thereExpl }),
  examples: { wrong: 'Their is a problem with the car.', flag: 'Their', fix: 'There', right: 'There is a problem with the car.', ok: ['Their house is big.'] },
})

export const thereOwn = regexRule({
  id: 'en.there-own',
  title: 'there own → their own',
  category: 'grammar',
  confidence: 'high',
  re: /\b(?<w>there|they're)\s+own\b/gi,
  target: 'w',
  fix: () => ['their'],
  msg: { message: `It's ${q('their own')} (belonging to them)`, explanation: thereExpl },
  examples: { wrong: 'They did it on there own.', flag: 'there', fix: 'their', right: 'They did it on their own.', ok: ['Is there one over there?'] },
})

export const prepThereNoun = regexRule({
  id: 'en.prep-there-noun',
  title: 'to there house → to their house',
  category: 'grammar',
  confidence: 'high',
  re: /\b(?:of|in|at|on|to|with|without|for|from|about)\s+(?<w>there)\s+(?:(?:new|old|best|first|last|little|big|young)\s+)?(?<n>parents|children|kids|friends|family|families|house|houses|homes|car|cars|name|names|lives|jobs?|money|teachers?|mother|father|son|daughter|dog|cat|phones?|rooms?|school|country)\b/gi,
  target: 'w',
  fix: () => ['their'],
  msg: (f) => ({ message: `Before a noun you want ${q('their')}: ${q(`their ${f.g.n!.toLowerCase()}`)}`, explanation: thereExpl }),
  examples: { wrong: 'We went to there house.', flag: 'there', fix: 'their', right: 'We went to their house.', ok: ['Are there parents here?', 'I left my keys in there.'] },
})

export const theyreThere = regexRule({
  id: 'en.theyre-there',
  title: "they're → their / there",
  category: 'grammar',
  confidence: 'high',
  re: /\b(?<a>they're)(?=\s+(?:is|are|was|were)\b)|\b(?:of|in|at|on|with|for|from|about|by)\s+(?<b>they're)\b/gi,
  target: ['a', 'b'],
  fix: (f) => (f.g.a ? ['there'] : ['their', 'there']),
  msg: (f) => ({
    message: f.g.a ? `Here you mean ${q('there')} (there is, there are)` : `${q("they're")} means ‘they are’: you want ${q('their')} or ${q('there')}`,
    explanation: thereExpl,
  }),
  examples: { wrong: "We talked about they're plans.", flag: "they're", fix: 'their', right: 'We talked about their plans.', ok: ["I hope they're happy."] },
})

export const theirTheyre = regexRule({
  id: 'en.their-theyre',
  title: "their going → they're going",
  category: 'grammar',
  confidence: 'medium',
  re: /\b(?<w>[Tt]heir)\s+(?:gonna|going\s+to\s+(?:be|go|do|come|have|make|get|see|win|lose|the|a|an)|not\s+(?:going|coming|sure|ready|here|home))\b/g,
  target: 'w',
  fix: () => ["they're"],
  msg: { message: `Here you mean ${q("they're")} (they are)`, explanation: thereExpl },
  examples: { wrong: 'Their going to be late.', flag: 'Their', fix: "They're", right: "They're going to be late.", ok: ['Their going-away party was fun.', 'Their goal is to win.'] },
})

/* ------------------------------------------------------------------ */
/* then / than                                                         */
/* ------------------------------------------------------------------ */

export const thenThan = regexRule({
  id: 'en.then-than',
  title: 'taller then → taller than',
  category: 'grammar',
  confidence: 'high',
  re: /\b(?<c>more|less|better|worse|bigger|smaller|larger|higher|lower|older|younger|faster|slower|cheaper|easier|harder|stronger|weaker|longer|shorter|taller|nicer|happier|rather|other|greater|fewer|quicker|warmer|colder|hotter|richer|poorer|different)\s+(?<w>then)\b(?!\s*[.!?,;:]|\s*$)/gi,
  notAfter: /\bif\b[^.!?,]*$/i,
  target: 'w',
  fix: () => ['than'],
  msg: (f) => ({
    message: `Comparisons take ${q('than')}: ${q(`${f.g.c!.toLowerCase()} than`)}`,
    explanation: `${q('than')} compares: taller than me. ${q('then')} is about time: first this, then that. Dutch ‘dan’ does both jobs, which is why this one slips through so easily.`,
  }),
  examples: {
    wrong: 'My brother is taller then me.',
    flag: 'then',
    fix: 'than',
    right: 'My brother is taller than me.',
    ok: ['It got better then.', "It was colder then, wasn't it?", "If the project costs more then I'm not interested."],
  },
})

export const thanThen = regexRule({
  id: 'en.than-then',
  title: 'and than → and then',
  category: 'grammar',
  confidence: 'high',
  re: new RegExp(
    `\\b(?:[Aa]nd|[Ss]ince|[Uu]ntil|[Tt]ill|[Bb]y|[Bb]ack|[Ff]rom|[Nn]ow\\s+and)\\s+(?<a>than)\\b|${SENT_START}(?<b>Than)(?=\\s+(?:I|we|he|she|they|you|it|the|my)\\b)`,
    'g',
  ),
  notAfter: /\b(?:rather|more|less|better|worse|sooner|other|further|farther|earlier|later|longer|way)\b[^.!?]*$/i,
  target: ['a', 'b'],
  fix: () => ['then'],
  msg: {
    message: `Here you mean ${q('then')} (after that)`,
    explanation: `${q('then')} means after that, or at that time: we ate, and then we went home. ${q('than')} only compares: bigger than. Dutch ‘dan’ covers both, English splits them.`,
  },
  examples: {
    wrong: 'We ate, and than we went home.',
    flag: 'than',
    fix: 'then',
    right: 'We ate, and then we went home.',
    ok: ['She is smarter than me.', 'He ran faster than ever.', "I'd rather go back than stay.", "I'd rather be right than happy.", 'It goes way further back than the war.', '... than the others.'],
  },
})

/* ------------------------------------------------------------------ */
/* lose / loose                                                        */
/* ------------------------------------------------------------------ */

const loseExpl = `lose (one o, sounds like ‘looz’) means verliezen. loose (two o's, rhymes with goose) means los, not tight. Dutch turns a final z into an s, so to Dutch ears both sound like ‘loos’.`
const LOOSE_TO_LOSE: Record<string, string> = { loose: 'lose', looses: 'loses', loosing: 'losing' }

export const loseLooseObj = regexRule({
  id: 'en.lose-loose-obj',
  title: 'loose my keys → lose my keys',
  category: 'grammar',
  confidence: 'high',
  re: /\b(?<w>loos(?:e|es|ing))\s+(?:(?:my|your|his|her|our|their|the|a|all|some|much|any|so\s+much|too\s+much)\s+)?(?:weight|money|keys?|job|jobs|game|games|match|way|time|mind|patience|control|interest|hope|phone|wallet|track|touch|focus|friends?|sleep|temper|faith|everything|something|anything|nothing)\b/gi,
  target: 'w',
  fix: (f) => [LOOSE_TO_LOSE[f.text.toLowerCase()] ?? 'lose'],
  msg: (_f, fixes) => ({ message: `To not have something any more is ${q(fixes[0]?.toLowerCase() ?? 'lose')} (one o)`, explanation: loseExpl }),
  examples: { wrong: 'I always loose my keys.', flag: 'loose', fix: 'lose', right: 'I always lose my keys.', ok: ['These are loose ends.', 'My shoes are loose.'] },
})

export const loseLooseAux = regexRule({
  id: 'en.lose-loose-aux',
  title: "don't loose → don't lose",
  category: 'grammar',
  confidence: 'high',
  re: /\b(?<aux>to|will|won't|would|could|can|can't|might|must|should|don't|didn't|doesn't|gonna|never\s+want\s+to)\s+(?<w>loose)\b(?!\s+(?:fit|clothes|ends?|change))/gi,
  target: 'w',
  fix: () => ['lose'],
  msg: (f) => ({ message: `After ${q(f.g.aux!.toLowerCase())} you need the verb ${q('lose')}`, explanation: loseExpl }),
  examples: { wrong: "Don't loose hope!", flag: 'loose', fix: 'lose', right: "Don't lose hope!", ok: ['The knot came loose.', 'It will come loose.'] },
})

export const looseLoseAdj = regexRule({
  id: 'en.loose-lose-adj',
  title: 'on the lose → on the loose',
  category: 'grammar',
  confidence: 'high',
  re: /\b(?:on\s+the|break|broke|broken|cut|come|came|set|knock(?:ed)?)\s+(?<w>lose)\b/gi,
  target: 'w',
  fix: () => ['loose'],
  msg: { message: `Here you need the adjective ${q('loose')} (free, not tied)`, explanation: `${loseExpl} Fixed phrases: on the loose, break loose, come loose, cut loose.` },
  examples: { wrong: 'The dog is on the lose.', flag: 'lose', fix: 'loose', right: 'The dog is on the loose.', ok: ['We might lose.'] },
})

/* ------------------------------------------------------------------ */
/* affect / effect                                                     */
/* ------------------------------------------------------------------ */

const affectExpl = `Most of the time ‘affect’ is the verb (stress affects sleep) and ‘effect’ is the noun (a strong effect). Hook: Affect is the Action, Effect is the End result.`

export const affectNoun = regexRule({
  id: 'en.affect-noun',
  title: 'an affect → an effect',
  category: 'grammar',
  confidence: 'high',
  re: /\b(?:an|no|any|positive|negative|side|big|huge|great|significant|little|strong|direct|desired|opposite|same|domino|greenhouse|butterfly|special|take|took|taken|takes|into|in)\s+(?<w>affects?)\b/gi,
  target: 'w',
  fix: (f) => [/s$/i.test(f.text) ? 'effects' : 'effect'],
  msg: { message: `The noun is ${q('effect')}`, explanation: affectExpl },
  examples: { wrong: 'The medicine had a strong affect on me.', flag: 'affect', fix: 'effect', right: 'The medicine had a strong effect on me.', ok: ['This will affect everyone.', 'Does it affect you?'] },
})

export const effectVerb = regexRule({
  id: 'en.effect-verb',
  title: 'effect your sleep → affect your sleep',
  category: 'grammar',
  confidence: 'medium',
  re: /\b(?:will|would|can|could|may|might|does|did|didn't|doesn't|won't|not|to|badly|seriously|negatively)\s+(?<w>effect(?:s|ed)?)\s+(?!(?:a\s+|the\s+|real\s+|positive\s+)?changes?\b)(?:me|you|him|her|us|them|my|your|his|our|their|the|people|everyone|everybody|it|children|students)\b/gi,
  target: 'w',
  fix: (f) => [f.text.toLowerCase().replace(/^effect/, 'affect')],
  msg: {
    message: `To influence something is ${q('affect')}`,
    explanation: `${affectExpl} The verb ‘effect’ exists but means to bring about: to effect change.`,
  },
  examples: { wrong: 'Stress can effect your sleep.', flag: 'effect', fix: 'affect', right: 'Stress can affect your sleep.', ok: ['We want to effect change.', 'They tried to effect a change in policy.'] },
})

/* ------------------------------------------------------------------ */
/* who's / whose                                                       */
/* ------------------------------------------------------------------ */

const whoseExpl = `${q('whose')} asks who something belongs to: whose phone is this? ${q("who's")} is short for ‘who is’ or ‘who has’: who's coming?`

export const whosWhose = regexRule({
  id: 'en.whos-whose',
  title: "who's phone → whose phone",
  category: 'grammar',
  confidence: 'high',
  re: /\b(?<w>[Ww]ho's)\s+(?:car|cars|bag|bags|book|books|phone|phones|idea|ideas|house|houses|turn|fault|job|jobs|money|name|names|side|dog|dogs|cat|cats|coat|coats|keys|pen|pens|seat|seats|responsibility|birthday|child|children|mother|father|parents|wife|husband|toys|clothes|shoes)\b/g,
  target: 'w',
  fix: () => ['whose'],
  msg: { message: `Asking about the owner: ${q('whose')}`, explanation: whoseExpl },
  examples: { wrong: "Who's phone is this?", flag: "Who's", fix: 'Whose', right: 'Whose phone is this?', ok: ["Who's coming tonight?"] },
})

export const whoseWhos = regexRule({
  id: 'en.whose-whos',
  title: "whose coming → who's coming",
  category: 'grammar',
  confidence: 'high',
  re: /\b(?<w>[Ww]hose)\s+(?:going|coming|calling|doing|been|ready|next|the|a|an)\b/g,
  target: 'w',
  fix: () => ["who's"],
  msg: { message: `Here you mean ${q("who's")} (who is)`, explanation: whoseExpl },
  examples: { wrong: 'Whose coming to the party?', flag: 'Whose', fix: "Who's", right: "Who's coming to the party?", ok: ['Whose is this?', "I don't know whose it is."] },
})

/* ------------------------------------------------------------------ */
/* to / too / two                                                      */
/* ------------------------------------------------------------------ */

const tooExpl = `${q('to')} goes before a verb (to go) or shows direction (to Utrecht). ${q('too')} means also, or more than enough (too hot). ${q('two')} is the number 2.`

export const tooVerb = regexRule({
  id: 'en.too-verb',
  title: 'want too go → want to go',
  category: 'grammar',
  confidence: 'high',
  re: /\b(?:want|wants|wanted|need|needs|needed|have|has|had|like|likes|liked|try|tries|tried|going|used|able|decided|hope|plan|love|hate|forgot|remember|learn|learned|nice|happy|glad|ready|time|how|what|where|easy|hard)\s+(?<w>too)\s+(?<v>go|be|do|see|get|make|have|take|come|buy|eat|find|know|say|tell|ask|work|play|help|start|stop|try|use|leave|meet|learn|read|write|pay|visit|call|bring)\b/gi,
  target: 'w',
  fix: () => ['to'],
  msg: (f) => ({ message: `Before a verb: ${q(`to ${f.g.v!.toLowerCase()}`)}`, explanation: tooExpl }),
  examples: { wrong: 'I want too go home.', flag: 'too', fix: 'to', right: 'I want to go home.', ok: ['It is too hot.', 'Me too!', 'I too have a son.', 'They too do not work.', 'You too have no idea.'] },
})

export const toToo = regexRule({
  id: 'en.to-too',
  title: 'to hot → too hot',
  category: 'grammar',
  confidence: 'high',
  re: /\b(?:is|are|was|were|be|been|it's|that's|way|not|much|far|fall|falls|fell|falling)\s+(?<w>to)\s+(?<a>late|early|soon|much|many|big|small|hot|cold|expensive|fast|slow|long|short|difficult|hard|easy|young|old|tired|busy|bad|far|heavy|loud|dangerous|dark|wet|windy|full|tight|weak|close|sweet|salty|spicy|complicated|risky|boring|quiet|warm|crowded)\b(?=\s*[.!?,;]|\s*$|\s+(?:for|to|and|but|because|today|now|here|there|outside|inside|behind)\b)/gi,
  target: 'w',
  fix: () => ['too'],
  msg: (f) => ({ message: `More than enough is ${q(`too ${f.g.a!.toLowerCase()}`)}, with two o's`, explanation: tooExpl }),
  examples: { wrong: 'It is to hot today.', flag: 'to', fix: 'too', right: 'It is too hot today.', ok: ['From early to late.', 'We went to old castles.', 'The money is to good causes.', 'It was put to good use.'] },
})

export const meToo = regexRule({
  id: 'en.me-too',
  title: 'me to → me too',
  category: 'grammar',
  confidence: 'high',
  re: new RegExp(`${SENT_START}(?:Me|Him|Her|Us)\\s+(?<a>to)(?=\\s*[.!?]|\\s*$)|\\b(?:love|miss|like)\\s+you\\s+(?<b>to)(?=\\s*[.!]|\\s*$)`, 'g'),
  target: ['a', 'b'],
  fix: () => ['too'],
  msg: { message: `${q('too')} means also`, explanation: tooExpl },
  examples: { wrong: 'I love you to!', flag: 'to', fix: 'too', right: 'I love you too!', ok: ['Who did you talk to?', 'This is the man I spoke to.'] },
})

export const twoToo = regexRule({
  id: 'en.two-too',
  title: 'two much → too much',
  category: 'grammar',
  confidence: 'high',
  re: /\b(?<w>two)\s+(?:much|many|late|early|soon)\b/gi,
  target: 'w',
  fix: () => ['too'],
  msg: { message: `${q('two')} is the number 2: you want ${q('too')}`, explanation: tooExpl },
  examples: { wrong: 'I ate two much cake.', flag: 'two', fix: 'too', right: 'I ate too much cake.', ok: ['I have two cats.'] },
})

/* ------------------------------------------------------------------ */
/* accept / except, advice / advise                                    */
/* ------------------------------------------------------------------ */

export const acceptExcept = regexRule({
  id: 'en.accept-except',
  title: 'except my apology → accept',
  category: 'grammar',
  confidence: 'high',
  re: /\b(?:please|kindly|will|would|can|could|to|must|should|cannot|can't|won't|didn't|don't)\s+(?<w>except)\b/gi,
  target: 'w',
  fix: () => ['accept'],
  msg: {
    message: `To say yes to something is ${q('accept')}`,
    explanation: `${q('accept')} means to receive or agree to: please accept my apology. ${q('except')} means apart from: everyone except Tom.`,
  },
  examples: { wrong: 'Please except my apology.', flag: 'except', fix: 'accept', right: 'Please accept my apology.', ok: ['Everyone came except Tom.', 'What can I do except wait?'] },
})

const adviceExpl = `${q('advice')} (with c, an s sound) is the noun: some good advice. ${q('advise')} (with s, a z sound) is the verb: I advise you to rest. Same pattern as practice/practise in British English.`

export const adviceVerb = regexRule({
  id: 'en.advice-verb',
  title: 'I advice → I advise',
  category: 'grammar',
  confidence: 'high',
  re: /\b(?:I|we|they|would|will|please|kindly|strongly|can|could|should)\s+(?<w>advice)\b/gi,
  target: 'w',
  fix: () => ['advise'],
  msg: { message: `The verb is ${q('advise')}, with an s`, explanation: adviceExpl },
  examples: { wrong: 'I advice you to rest.', flag: 'advice', fix: 'advise', right: 'I advise you to rest.', ok: ['Thank you for the advice.', 'I could offer you advice.', 'Listen to advice.'] },
})

export const adviseNoun = regexRule({
  id: 'en.advise-noun',
  title: 'some advise → some advice',
  category: 'grammar',
  confidence: 'high',
  re: /\b(?:some|any|good|bad|great|my|your|his|her|our|their|professional|legal|medical|financial|expert|useful|helpful|piece\s+of|for|of|need|needs|needed)\s+(?<w>advise)\b/gi,
  target: 'w',
  fix: () => ['advice'],
  msg: { message: `The noun is ${q('advice')}, with a c`, explanation: adviceExpl },
  examples: { wrong: 'Can you give me some advise?', flag: 'advise', fix: 'advice', right: 'Can you give me some advice?', ok: ['We advise caution.', 'Doctors advise rest.'] },
})

export const advices = regexRule({
  id: 'en.advices',
  title: 'advices → advice',
  category: 'grammar',
  confidence: 'high',
  re: /\badvices\b/gi,
  fix: () => ['advice'],
  msg: {
    message: `${q('advice')} has no plural`,
    explanation: `In English advice can't be counted: some advice, a piece of advice, a lot of advice. Dutch says ‘adviezen’, English doesn't. (If you meant the verb: she advises.)`,
  },
  examples: { wrong: 'She gave me many advices.', flag: 'advices', fix: 'advice', right: 'She gave me a lot of advice.', ok: [] },
})

/* ------------------------------------------------------------------ */
/* believe / belief, price / prize, live / life                        */
/* ------------------------------------------------------------------ */

const devoicing = `Dutch turns a final v into f and z into s, so these pairs sound the same to Dutch ears. English keeps them apart.`

export const believeBelief = regexRule({
  id: 'en.believe-belief',
  title: 'believe / belief',
  category: 'grammar',
  confidence: 'high',
  re: /\b(?:I|you|we|they|don't|didn't|can't|to)\s+(?<a>belief)\b|\b(?:my|your|his|her|our|their|a|the|strong|religious)\s+(?<b>believe)\b/gi,
  target: ['a', 'b'],
  fix: (f) => [f.g.a ? 'believe' : 'belief'],
  msg: (f) => ({
    message: f.g.a ? `The verb is ${q('believe')}` : `The noun is ${q('belief')}`,
    explanation: `believe (v) is the verb, belief (f) is the noun, like prove/proof and advise/advice. ${devoicing}`,
  }),
  examples: { wrong: "I can't belief it!", flag: 'belief', fix: 'believe', right: "I can't believe it!", ok: ['That is my belief.', 'I believe you.'] },
})

export const pricePrize = regexRule({
  id: 'en.price-prize',
  title: 'price / prize',
  category: 'grammar',
  confidence: 'high',
  re: /\b(?:won|win|wins|winning)\s+(?:the\s+|a\s+|first\s+|second\s+|third\s+|top\s+|grand\s+)?(?<a>price)\b|\bnobel\s+(?<b>price)\b|\b(?:high|low|full|half|reduced|ticket|sale|retail|market)\s+(?<c>prize)\b/gi,
  target: ['a', 'b', 'c'],
  fix: (f) => [f.g.c ? 'price' : 'prize'],
  msg: (f) => ({
    message: f.g.c ? `What you pay is the ${q('price')}` : `What you win is a ${q('prize')}`,
    explanation: `A prize (z) is what you win. A price (c, an s sound) is what you pay. ${devoicing}`,
  }),
  examples: { wrong: 'She won first price.', flag: 'price', fix: 'prize', right: 'She won first prize.', ok: ['The price is high.', 'He won the prize.', 'We paid top price.', 'The first price we saw was high.'] },
})

export const liveLife = regexRule({
  id: 'en.live-life',
  title: 'my live → my life',
  category: 'grammar',
  confidence: 'high',
  re: /\b(?:my|your|his|her|our|their)\s+(?:whole\s+|entire\s+|daily\s+|social\s+|private\s+|love\s+)?(?<a>live)\b(?=\s*[.!?,;]|\s*$|\s+(?:is|was|has|and|changed)\b)|\b(?:I|you|we|they)\s+(?<b>life)\s+(?=(?:in|at|on|with|here|there|near|together|alone|abroad)\b)/gi,
  target: ['a', 'b'],
  fix: (f) => [f.g.a ? 'life' : 'live'],
  msg: (f) => ({
    message: f.g.a ? `The noun is ${q('life')}: ${q('my whole life')}` : `The verb is ${q('live')}: ${q('I live in...')}`,
    explanation: `life (f) is the noun, het leven. live (v) is the verb, wonen or leven. Cambridge's learner data calls this one typically Dutch. ${devoicing}`,
  }),
  examples: { wrong: 'I want to enjoy my whole live.', flag: 'live', fix: 'life', right: 'I want to enjoy my whole life.', ok: ['We saw their live show.', 'I live in Utrecht.'] },
})

export const confusableRules: EnRule[] = [
  couldOf,
  itsItIs,
  itsAdjEnd,
  itsTime,
  itsOwn,
  prepIts,
  verbItsNoun,
  yourYoure,
  youreYour,
  theirIs,
  thereOwn,
  prepThereNoun,
  theyreThere,
  theirTheyre,
  thenThan,
  thanThen,
  loseLooseObj,
  loseLooseAux,
  looseLoseAdj,
  affectNoun,
  effectVerb,
  whosWhose,
  whoseWhos,
  tooVerb,
  toToo,
  meToo,
  twoToo,
  acceptExcept,
  adviceVerb,
  adviseNoun,
  advices,
  believeBelief,
  pricePrize,
  liveLife,
]
