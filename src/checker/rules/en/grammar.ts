import { BASE_TO_PARTICIPLE, PARTICIPLE_TO_PAST, PAST_TO_BASE, baseForm, thirdPerson } from '../../lexicon/en'
import { dictVariant, LINKS, lowerKeepI, q, regexRule, SENT_START, type EnRule } from './shared'

// Grammar (rules 44-60 and 77-81): tense with since/for, agreement, do-support, uncountables,
// prepositions. Many are Dutch transfer: 'sinds', 'ik woon hier sinds', 'ik vind het niet leuk',
// 'in het weekend', 'afhangen van', 'getrouwd met', 'die' for people.

/* ------------------------------------------------------------------ */
/* since / for, present perfect                                        */
/* ------------------------------------------------------------------ */

export const sinceDuration = regexRule({
  id: 'en.since-duration',
  title: 'since five years → for five years',
  category: 'grammar',
  confidence: 'high',
  re: /\b(?<w>since)\s+(?<n>\d+|a|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|many|several|a\s+few|few)\s+(?<u>years?|months?|weeks?|days?|hours?|minutes?|decades?)\b(?!\s+ago)/gi,
  target: 'w',
  fix: () => ['for'],
  msg: (f) => ({
    message: `For a length of time use ${q('for')}: ${q(`for ${f.g.n!.toLowerCase()} ${f.g.u!.toLowerCase()}`)}`,
    explanation: `since + a starting point: since 2015, since Monday. for + a length of time: for five years. Dutch ‘sinds’ covers both, English doesn't.`,
    learnMore: LINKS.sincePerfect,
  }),
  examples: { wrong: 'I have lived here since five years.', flag: 'since', fix: 'for', right: 'I have lived here for five years.', ok: ['I have lived here since 2015.', 'since three years ago'] },
})

export const sincePresent = regexRule({
  id: 'en.since-present',
  title: 'I live here since 2015 → I have lived',
  category: 'grammar',
  confidence: 'medium',
  re: /\b(?<s>I|you|we|they)\s+(?<v>live|work|study|know|am|are|teach|play|own|wait|stay|learn)\b(?:\s+[\w']+){0,4}?\s+since\s+(?:\d{4}|last\b|yesterday|january|february|march|april|may|june|july|august|september|october|november|december|monday|tuesday|wednesday|thursday|friday|saturday|sunday|childhood|this\s+morning|I\s+was|we\s+were)/gi,
  target: 'v',
  fix: (f) => [`have ${BASE_TO_PARTICIPLE[f.g.v!.toLowerCase()]}`],
  msg: (f, fixes) => ({
    message: `Started in the past and still true: ${q(`${lowerKeepI(f.g.s!)} ${fixes[0]}`)}`,
    explanation: `Something that started in the past and is still going takes the present perfect: I have lived here since 2015. Dutch uses the present (‘ik woon hier sinds 2015’), so the English version can feel odd at first.`,
    learnMore: LINKS.sincePerfect,
  }),
  examples: { wrong: 'I live in Utrecht since 2015.', flag: 'live', fix: 'have lived', right: 'I have lived in Utrecht since 2015.', ok: ['I live here since it is cheap.', 'I have known him since 2010.'] },
})

export const perfectPastTime = regexRule({
  id: 'en.perfect-past-time',
  title: 'have seen + yesterday → saw',
  category: 'grammar',
  confidence: 'medium',
  re: /\b(?<w>(?<aux>have|has)\s+(?<p>been|gone|seen|done|made|met|bought|eaten|written|taken|given|got|left|sent|spent|found|told|heard|won|lost|paid|visited|finished|started|arrived|called|moved|played|watched|worked|lived))\b(?:(?![.!?])[^.!?])*?(?<!\bsince\s+|\bfor\s+|\buntil\s+|\bthan\s+)\b(?<t>yesterday|last\s+(?:night|week|month|year|summer|winter|weekend|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|\d+\s+(?:days?|weeks?|months?|years?)\s+ago|in\s+(?:19|20)\d\d)\b/gi,
  notAfter: /\b(?:may|might|must|could|should|would|will)\s*$/i,
  target: 'w',
  fix: (f) => {
    const p = f.g.p!.toLowerCase()
    if (p === 'been') return f.g.aux!.toLowerCase() === 'has' ? ['was'] : ['was', 'were']
    return [PARTICIPLE_TO_PAST[p] ?? p]
  },
  msg: (f) => ({
    message: `With ${q(f.g.t!.toLowerCase().replace(/\s+/g, ' '))} English uses the past simple`,
    explanation: `A finished time (yesterday, last week, in 2019) takes the past simple: I saw that film yesterday. Dutch ‘ik heb hem gisteren gezien’ doesn't translate one to one.`,
  }),
  examples: { wrong: 'I have seen that film yesterday.', flag: 'have seen', fix: 'saw', right: 'I saw that film yesterday.', ok: ['I have lived here since last year.', 'I have been here for 3 years.'] },
})

/* ------------------------------------------------------------------ */
/* Agreement                                                           */
/* ------------------------------------------------------------------ */

export const iAmAgree = regexRule({
  id: 'en.i-am-agree',
  title: 'I am agree → I agree',
  category: 'grammar',
  confidence: 'high',
  re: /\b(?<s1>I|we|they|you)\s*(?:am|are|'m|'re)\s+(?<n1>not\s+)?agree\b|\b(?<s2>he|she|it)\s*(?:is|'s)\s+(?<n2>not\s+)?agree\b|\b(?<q>Are|Is)\s+(?<s3>you|he|she|they|we)\s+agree\b/gi,
  fix: (f) => {
    const { s1, n1, s2, n2, q: qq, s3 } = f.g
    if (s1) return [`${lowerKeepI(s1)} ${n1 ? "don't agree" : 'agree'}`]
    if (s2) return [`${s2.toLowerCase()} ${n2 ? "doesn't agree" : 'agrees'}`]
    return [`${qq!.toLowerCase() === 'are' ? 'do' : 'does'} ${s3!.toLowerCase()} agree`]
  },
  msg: {
    message: `${q('agree')} is a verb: ${q('I agree')}, ${q("I don't agree")}`,
    explanation: `In English agree is a verb, not an adjective, so there's no ‘am’ or ‘is’: I agree, she agrees, do you agree? Many languages say ‘I am agreed’, English doesn't.`,
  },
  examples: { wrong: 'I am agree with you.', flag: 'I am agree', fix: 'I agree', right: 'I agree with you.', ok: ['I agree with you.', 'We are in agreement.'] },
})

const UNCOUNTABLE: Record<string, string> = {
  informations: 'information',
  furnitures: 'furniture',
  equipments: 'equipment',
  luggages: 'luggage',
  baggages: 'baggage',
  homeworks: 'homework',
  softwares: 'software',
  jewelleries: 'jewellery',
  jewelries: 'jewelry',
  machineries: 'machinery',
  knowledges: 'knowledge',
  feedbacks: 'feedback',
  trainings: 'training',
  researches: 'research',
}

export const uncountablePlural = regexRule({
  id: 'en.uncountable-plural',
  title: 'informations → information',
  category: 'grammar',
  confidence: 'high',
  re: /\b(?:informations|furnitures|equipments|luggages|baggages|homeworks|softwares|jewelleries|jewelries|machineries)\b/gi,
  fix: (f) => [UNCOUNTABLE[f.text.toLowerCase()]],
  msg: (_f, fixes) => ({
    message: `${q(fixes[0]?.toLowerCase() ?? '')} has no plural in English`,
    explanation: `Some nouns can't be counted in English: information, furniture, equipment, homework. Say ‘some information’ or ‘a piece of furniture’. Dutch ‘informatie’ has the same idea, but ‘meubels’ and ‘huiswerkopdrachten’ make the plural tempting.`,
  }),
  examples: { wrong: 'Thanks for the informations.', flag: 'informations', fix: 'information', right: 'Thanks for the information.', ok: ['Thanks for the information.'] },
})

export const uncountablePluralSoft = regexRule({
  id: 'en.uncountable-plural-soft',
  title: 'feedbacks → feedback',
  category: 'grammar',
  confidence: 'low',
  strictOnly: true,
  re: /\b(?:knowledges|feedbacks|trainings|researches(?=\s+(?:show|have|are|were)\b))\b/gi,
  fix: (f) => [UNCOUNTABLE[f.text.toLowerCase()]],
  msg: (_f, fixes) => ({
    message: `Usually uncountable: ${q(fixes[0]?.toLowerCase() ?? '')}`,
    explanation: `In most English, feedback, training, knowledge and research don't take an -s. Dutch happily says ‘trainingen’ and ‘feedbacks’.`,
  }),
  examples: { wrong: 'Thank you for the feedbacks.', flag: 'feedbacks', fix: 'feedback', right: 'Thank you for the feedback.', ok: ['She researches birds.'] },
})

export const moreComparative = regexRule({
  id: 'en.more-comparative',
  title: 'more better → better',
  category: 'grammar',
  confidence: 'high',
  re: /\bmore\s+(?<a>better|worse)\b(?!\s*\?)|\b(?:more|most)\s+(?<b>easier|harder|bigger|smaller|faster|slower|cheaper|happier|nicer|larger|taller|stronger|best|worst|biggest|easiest)\b(?=\s+than\b|\s*[.!?,;]|\s*$)/gi,
  fix: (f) => [(f.g.a ?? f.g.b)!.toLowerCase()],
  msg: (_f, fixes) => ({
    message: `${q(fixes[0]?.toLowerCase() ?? '')} already compares: drop ${q('more')}`,
    explanation: `Better, easier and bigger are already comparatives, and best and biggest already superlatives. Adding more or most doubles it up.`,
  }),
  examples: { wrong: 'This one is more better.', flag: 'more better', fix: 'better', right: 'This one is better.', ok: ['We need more older volunteers.', 'Is more better?'] },
})

export const mostOfPeople = regexRule({
  id: 'en.most-of-people',
  title: 'most of people → most people',
  category: 'grammar',
  confidence: 'high',
  re: /\bmost\s+of\s+(?<n>people|students|children|men|women|countries|cities|time)\b/gi,
  fix: (f) => {
    const n = f.g.n!.toLowerCase()
    return n === 'time' ? ['most of the time'] : [`most ${n}`, `most of the ${n}`]
  },
  msg: (f) => ({
    message: f.g.n!.toLowerCase() === 'time' ? `It's ${q('most of the time')}` : `Say ${q(`most ${f.g.n!.toLowerCase()}`)} or ${q(`most of the ${f.g.n!.toLowerCase()}`)}`,
    explanation: `‘most people’ means people in general. ‘most of the people’ means most of a group you have in mind. ‘most of people’ is neither.`,
    learnMore: LINKS.mostOf,
  }),
  examples: { wrong: 'Most of people like music.', flag: 'Most of people', fix: 'Most people', right: 'Most people like music.', ok: ['Most of the people left.', 'Most of my friends came.'] },
})

export const heDont = regexRule({
  id: 'en.he-dont',
  title: "he don't → he doesn't",
  category: 'grammar',
  confidence: 'high',
  re: new RegExp(`\\b(?:[Hh]e|[Ss]he)\\s+(?<a>don't|do\\s+not)\\b|(?:${SENT_START}|\\b(?:and|but|because|so|if|when)\\s+)[Ii]t\\s+(?<b>don't|do\\s+not)\\b`, 'g'),
  target: ['a', 'b'],
  fix: (f) => [/n't$/i.test(f.text) ? "doesn't" : 'does not'],
  msg: { message: `With he, she and it: ${q("doesn't")}`, explanation: `He, she and it take does: he doesn't like coffee, it doesn't matter.`, learnMore: LINKS.doSupport },
  examples: { wrong: "He don't like coffee.", flag: "don't", fix: "doesn't", right: "He doesn't like coffee.", ok: ["They don't like coffee.", 'The things that cause it do not matter.'] },
})

const MODAL_AUX =
  "\\b(?:did|does|do|didn't|doesn't|don't|will|would|can|could|should|shall|may|might|must|won't|wouldn't|can't|couldn't|shouldn't|let|make|made|help|helped|watch|watched|see|saw|hear|heard|have|had|has|why|how|when|where|what|hasn't|haven't|isn't|and|or|nor)\\s*$"
const MODAL_AUX_3SG = new RegExp(
  `${MODAL_AUX}|\\b(?:suggest|suggested|insist|insisted|demand|demanded|recommend|recommended|require|required|important|essential|possibility|request|requested|vital)\\s+(?:\\w+\\s+){0,3}that\\s*$|'d\\s*$|\\b(?:need|dare)\\s*$|\\/\\s*$`,
  'i',
)

export const thirdSingularBase = regexRule({
  id: 'en.3sg-base',
  title: 'she go → she goes',
  category: 'grammar',
  confidence: 'medium',
  re: /\b(?<s>he|she)\s+(?:(?:always|never|often|usually|sometimes|also|really|just)\s+)?(?<v>go|have|do|want|like|need|know|make|come|live|work|think|say|get|see|take|play|study|speak|eat|drink|read|write|walk|drive|love|hate|feel|look|seem|try|use|watch|listen|wait|stay|help|run|sleep|teach|learn|understand|believe|remember|forget|leave|buy|pay|call|ask|tell|give)\b/gi,
  notAfter: MODAL_AUX_3SG,
  target: 'v',
  fix: (f) => [thirdPerson(f.g.v!)],
  msg: (f, fixes) => ({
    message: `${q(f.g.s!.toLowerCase())} needs an -s on the verb: ${q(`${f.g.s!.toLowerCase()} ${fixes[0]}`)}`,
    explanation: `In the present simple, he, she and it add -s to the verb: she goes, he has, she does, he studies.`,
  }),
  examples: {
    wrong: 'She go to school every day.',
    flag: 'go',
    fix: 'goes',
    right: 'She goes to school every day.',
    ok: ['Does she go to school?', 'Can he come?', 'Why does he work so late?', 'Let her go.', 'Both his wife and he like it.', "Hasn't she come?", 'I suggested that he work with Mary.', 'I suggested to Bill that he come early.', "Where'd he go?", 'Need he run so fast?', 'Where does he/she work?'],
  },
})

export const nonThirdS = regexRule({
  id: 'en.non3sg-s',
  title: 'they likes → they like',
  category: 'grammar',
  confidence: 'medium',
  re: /(?:\b(?<s>I|[Ww]e|[Tt]hey)|(?:(?<=^|[.!?,;]\s*)|\b(?:and|because|so|if|when|that)\s+)(?<y>[Yy]ou))\s+(?<v>goes|has|does|wants|likes|needs|knows|makes|comes|lives|works|thinks|says|gets|sees|takes|plays|studies|speaks|eats|loves|hates|feels|looks|seems|tries|uses|watches|listens)\b/g,
  notAfter: /\b(?:of|but|than|thank|except|like|as\s+well\s+as)\s*$/i,
  target: 'v',
  fix: (f) => [baseForm(f.g.v!)],
  msg: (f, fixes) => {
    const s = lowerKeepI((f.g.s ?? f.g.y)!)
    return { message: `With ${q(s)} the verb has no -s: ${q(`${s} ${fixes[0]}`)}`, explanation: `Only he, she and it add -s in the present simple. I, you, we and they use the plain verb: they like, we have, you go.` }
  },
  examples: {
    wrong: 'They likes football.',
    flag: 'likes',
    fix: 'like',
    right: 'They like football.',
    ok: ['I told you she likes it.', 'Each of you has a file.', 'A big thank you goes to Dan.', 'Everyone but you has done it.', 'Loving you makes me happy.', "What doesn't kill you makes you stronger."],
  },
})

const PEOPLE_VERB: Record<string, string> = { is: 'are', was: 'were', has: 'have', "doesn't": "don't", does: 'do', "isn't": "aren't", "wasn't": "weren't" }

export const peopleIs = regexRule({
  id: 'en.people-is',
  title: 'people is → people are',
  category: 'grammar',
  confidence: 'high',
  re: new RegExp(`${SENT_START}People\\s+(?<v>is|was|has|doesn't|does|isn't|wasn't)\\b`, 'g'),
  target: 'v',
  fix: (f) => [PEOPLE_VERB[f.g.v!]],
  msg: (_f, fixes) => ({ message: `${q('people')} is plural: ${q(`people ${fixes[0]}`)}`, explanation: `People is the plural of person, so it takes are, were, have: people are friendly here.` }),
  examples: {
    wrong: 'People is very friendly here.',
    flag: 'is',
    fix: 'are',
    right: 'People are very friendly here.',
    ok: ['People are nice.', 'Meeting young people is hard.', 'A crowd of 100 people is large.', 'Finding people is hard.', 'How many people is too many?', 'The worst for most people is pain.'],
  },
})

/* ------------------------------------------------------------------ */
/* do-support (Dutch word order)                                       */
/* ------------------------------------------------------------------ */

export const notWithoutDo = regexRule({
  id: 'en.not-without-do',
  title: "I not like → I don't like",
  category: 'grammar',
  confidence: 'high',
  re: /\b(?<s>I|you|we|they|he|she)\s+(?<w>not\s+(?<v>like|likes|want|wants|know|knows|need|needs|have|has|understand|understands|think|thinks|see|go|goes|eat|work|works|live|lives|speak|speaks|believe|remember|care|mind))\b/gi,
  notAfter: /\b(?:do|does|did|would|could|will|can|should|must|might|may|have|has)\s*$/i,
  target: 'w',
  fix: (f) => [`${/^s?he$/i.test(f.g.s!) ? "doesn't" : "don't"} ${baseForm(f.g.v!)}`],
  msg: (f, fixes) => ({
    message: `English needs do here: ${q(`${lowerKeepI(f.g.s!)} ${fixes[0]}`)}`,
    explanation: `English makes most verbs negative with do: I don't like it, she doesn't know. Dutch just adds ‘niet’ (ik vind het niet leuk), which is why ‘I not like’ feels natural.`,
    learnMore: LINKS.doSupport,
  }),
  examples: { wrong: 'I not like this song.', flag: 'not like', fix: "don't like", right: "I don't like this song.", ok: ['Do you not know?', 'I not only sing but dance.'] },
})

export const verbItNot = regexRule({
  id: 'en.verb-it-not',
  title: "I like it not → I don't like it",
  category: 'grammar',
  confidence: 'high',
  re: /\b(?:I|you|we|they)\s+(?<w>(?<v>like|know|want|understand|need|believe|remember|see|have)\s+(?<o>it|that|this|him|her|them)\s+not)\b(?!\s+(?:to|only)\b)/gi,
  target: 'w',
  fix: (f) => [`don't ${f.g.v!.toLowerCase()} ${f.g.o!.toLowerCase()}`],
  msg: (_f, fixes) => ({
    message: `English negative: ${q(fixes[0])}`,
    explanation: `‘not’ goes before the verb, with do: I don't like it. ‘I like it not’ copies the Dutch order of ‘ik vind het niet leuk’.`,
    learnMore: LINKS.doSupport,
  }),
  examples: { wrong: 'I like it not.', flag: 'like it not', fix: "don't like it", right: "I don't like it.", ok: ['I want him not to go.'] },
})

export const whVerbSubject = regexRule({
  id: 'en.wh-verb-subject',
  title: 'When go you? → When do you go?',
  category: 'grammar',
  confidence: 'high',
  re: new RegExp(
    `${SENT_START}(?:When|Where|Why|How|What)\\s+(?!come\\s)(?<w>(?<v>go|come|eat|work|live|think|want|like|need|know|mean|play|study|leave|start|arrive|get|make|see|speak|goes|works|lives|wants|likes|knows|went|came|ate|said)\\s+(?<s>you|he|she|we|they|I))\\b[^.!?]*\\?`,
    'g',
  ),
  target: 'w',
  keepCase: false,
  fix: (f) => {
    const v = f.g.v!
    const s = f.g.s!
    const past = PAST_TO_BASE[v]
    const aux = past ? 'did' : /^s?he$/.test(s) ? 'does' : 'do'
    return [`${aux} ${s} ${past ?? baseForm(v)}`]
  },
  msg: (_f, fixes) => ({
    message: `Questions need do, does or did: ${q(fixes[0])}`,
    explanation: `In English only helper verbs swap places with the subject: When do you go home? Dutch swaps the main verb (Wanneer ga je naar huis?), English doesn't.`,
    learnMore: LINKS.doSupport,
  }),
  examples: { wrong: 'When go you home?', flag: 'go you', fix: 'do you go', right: 'When do you go home?', ok: ['How come you are late?', 'When do you go home?'] },
})

/* ------------------------------------------------------------------ */
/* Prepositions                                                        */
/* ------------------------------------------------------------------ */

export const inTheWeekend = regexRule({
  id: 'en.in-the-weekend',
  title: 'in the weekend → at/on the weekend',
  category: 'grammar',
  confidence: 'medium',
  re: /\b(?<w>in)\s+the\s+weekends?\b(?!\s+(?:edition|papers?|news|issue|schedule|traffic|market)\b)/gi,
  target: 'w',
  fix: (f) => (dictVariant(f.ctx) === 'gb' ? ['at', 'on'] : ['on', 'at']),
  msg: {
    message: `English doesn't use ${q('in')} here: ${q('at the weekend')} (UK) or ${q('on the weekend')} (US)`,
    explanation: `British English says at the weekend, American English on the weekend. ‘in the weekend’ is Dutch ‘in het weekend’ in disguise.`,
    learnMore: LINKS.weekend,
  },
  examples: { wrong: 'What are you doing in the weekend?', flag: 'in', fix: 'on', right: 'What are you doing at the weekend?', ok: ['It was in the weekend edition.'] },
})

export const inWeekday = regexRule({
  id: 'en.in-weekday',
  title: 'in Monday → on Monday',
  category: 'grammar',
  confidence: 'high',
  re: /\b(?<w>in)\s+(?<d>Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)s?\b(?!'s|\s+(?:night|morning|afternoon|evening)'s|\s+through\b)/g,
  notAfter:
    /\b(?:weigh(?:s|ed)?|be|am|is|are|was|were|been|sleep|slept|sleeps|come|came|comes|get|got|gets|check(?:ed)?|log(?:ged)?|fill(?:ed)?|hand(?:ed)?|turn(?:ed)?|call(?:ed)?|work(?:ed)?|stay(?:ed)?|clock(?:ed)?|drop(?:ped)?|pop(?:ped)?|impressive|interested)\s*$/i,
  target: 'w',
  fix: () => ['on'],
  msg: (f) => ({ message: `Days take ${q('on')}: ${q(`on ${f.g.d}`)}`, explanation: `Use on for days and dates (on Monday, on 3 May), in for months and years (in May, in 2025), at for clock times (at six).` }),
  examples: {
    wrong: 'We meet in Monday.',
    flag: 'in',
    fix: 'on',
    right: 'We meet on Monday.',
    ok: ["In Monday's game, we lost.", 'Commerzbank weighed in Wednesday.', 'Well, we slept in Tuesday morning.', 'I will be in Monday through Thursday.', "He was great in Monday night's win."],
  },
})

export const personWhich = regexRule({
  id: 'en.person-which',
  title: 'the man which → the man who',
  category: 'grammar',
  confidence: 'medium',
  re: /\b(?:man|woman|person|people|teacher|friend|friends|boy|girl|student|students|doctor|guy|someone|somebody|anyone|everyone|children|kids|men|women|colleague|colleagues)\s+(?<w>which)\b/gi,
  target: 'w',
  fix: () => ['who', 'that'],
  msg: { message: `For people use ${q('who')} (or ${q('that')})`, explanation: `which is for things, who is for people: the man who lives next door. Dutch ‘die’ covers both.` },
  examples: { wrong: 'The man which lives next door is nice.', flag: 'which', fix: 'who', right: 'The man who lives next door is nice.', ok: ['The book which I read was long.'] },
})

export const explainMe = regexRule({
  id: 'en.explain-me',
  title: 'explain me → explain to me',
  category: 'grammar',
  confidence: 'high',
  re: /\b(?<w>(?<v>explain(?:s|ed|ing)?)\s+(?<o>me|him|her|us|you))\s+(?<n>how|what|why|where|when|which|who|the|that|this|everything|something|it)\b/gi,
  target: (m) => {
    const ix = m.indices?.groups
    if (!ix?.w) return null
    return m.groups?.n?.toLowerCase() === 'it' ? [ix.w[0], m.index + m[0].length] : ix.w
  },
  fix: (f) => {
    const v = f.g.v!.toLowerCase()
    const o = f.g.o!.toLowerCase()
    return [f.g.n!.toLowerCase() === 'it' ? `${v} it to ${o}` : `${v} to ${o}`]
  },
  msg: (f) => ({
    message: `You explain something ${q(`to ${f.g.o!.toLowerCase()}`)}`,
    explanation: `In English you explain something to someone: explain the rules to me, explain to me how it works. ‘explain me’ copies Dutch ‘leg me uit’.`,
  }),
  examples: { wrong: 'Can you explain me the rules?', flag: 'explain me', fix: 'explain to me', right: 'Can you explain the rules to me?', ok: ['Can you explain her decision?', 'Explain it to me.'] },
})

export const discussAbout = regexRule({
  id: 'en.discuss-about',
  title: 'discuss about → discuss',
  category: 'grammar',
  confidence: 'high',
  re: /\b(?<v>discuss(?:es|ed|ing)?)\s+about\b/gi,
  fix: (f) => [f.g.v!.toLowerCase(), 'talk about'],
  msg: { message: `${q('discuss')} needs no ${q('about')}`, explanation: `You discuss something, or talk about something: let's discuss the plan. (The noun can take it: a discussion about the plan.)` },
  examples: { wrong: "Let's discuss about the plan.", flag: 'discuss about', fix: 'discuss', right: "Let's discuss the plan.", ok: ['We had a discussion about it.'] },
})

export const dependOf = regexRule({
  id: 'en.depend-of',
  title: 'depend of → depend on',
  category: 'grammar',
  confidence: 'high',
  re: /\bdepend(?:s|ed|ing|ent)?\s+(?<w>of|from|by|with|in|about)\b/gi,
  target: 'w',
  fix: () => ['on'],
  msg: { message: `It's ${q('depend on')}`, explanation: `depend always takes on: it depends on the weather. Dutch says ‘afhangen van’, which pulls you towards ‘of’.` },
  examples: { wrong: 'It depends of the weather.', flag: 'of', fix: 'on', right: 'It depends on the weather.', ok: ['She is independent of her parents.'] },
})

export const marriedWith = regexRule({
  id: 'en.married-with',
  title: 'married with → married to',
  category: 'grammar',
  confidence: 'medium',
  re: /\bmarried\s+(?<w>with)\s+(?:him|her|a|an|my|his|the|someone|somebody)\b(?!\s+(?:[\w-]+\s+){0,2}(?:child|children|kids?|baby|babies|daughters?|sons?)\b)/gi,
  target: 'w',
  fix: () => ['to'],
  msg: { message: `You're married ${q('to')} someone`, explanation: `English says married to: she is married to a doctor. ‘married with children’ means having children. Dutch ‘getrouwd met’ is the source.` },
  examples: {
    wrong: 'She is married with a doctor.',
    flag: 'with',
    fix: 'to',
    right: 'She is married to a doctor.',
    ok: ['She is married with two children.', 'He is married with a young son.', 'Tom is married with a three-year-old daughter.'],
  },
})

export const grammarRules: EnRule[] = [
  sinceDuration,
  sincePresent,
  perfectPastTime,
  iAmAgree,
  uncountablePlural,
  uncountablePluralSoft,
  moreComparative,
  mostOfPeople,
  heDont,
  thirdSingularBase,
  nonThirdS,
  peopleIs,
  notWithoutDo,
  verbItNot,
  whVerbSubject,
  inTheWeekend,
  inWeekday,
  personWhich,
  explainMe,
  discussAbout,
  dependOf,
  marriedWith,
]
