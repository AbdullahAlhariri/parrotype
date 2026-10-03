// Candidate English rule set for Typewise (research prototype, verified by test.mjs).
// Each rule: id, cat, sev (error|warning|hint), l1 (all|nl|ar), re (global RegExp),
// notAfter (optional RegExp tested against the 60 chars BEFORE the match; if it matches, skip),
// fix (human readable), wrong, right, ok (extra valid sentences that must NOT fire), msg, fp, src.

const MODAL_AUX = /\b(did|does|do|didn't|doesn't|don't|will|would|can|could|should|shall|may|might|must|won't|wouldn't|can't|couldn't|shouldn't|let|make|made|help|helped|watch|watched|see|saw|hear|heard|have|had|has|why|how|when|where|what)\s*$/i;
const MODAL_AUX_3SG = new RegExp(MODAL_AUX.source.replace('|why|how|when|where|what)', '|why|how|when|where|what|hasn\'t|haven\'t|isn\'t|and|or|nor)') + '|\\b(?:suggest|suggested|insist|insisted|demand|demanded|recommend|recommended|require|required|important|essential|possibility|request|requested|vital)\\s+(?:\\w+\\s+){0,3}that\\s*$|[\'’]d\\s*$|\\b(?:need|dare)\\s*$|\\/\\s*$', 'i');

export const rules = [
  // ---------- Homophones / confusables ----------
  { id: 'EN_COULD_OF', cat: 'confusable', sev: 'error', l1: 'all',
    re: /\b(could|should|would|must|might)(n't)?\s+of\b(?!\s+(?:course|necessity)\b)/gi,
    fix: '$1$2 have', wrong: 'I should of called you.', right: 'I should have called you.',
    ok: ['You could, of course, stay.', 'He could of course say no.', 'Policy must of necessity change.', 'They complained in May of last year.'],
    msg: '"should of" is what "should\'ve" sounds like. Write "should have".', fp: 'very low', src: 'LT COULD_OF' },

  { id: 'EN_ITS_IT_IS', cat: 'confusable', sev: 'error', l1: 'all',
    re: /\b[Ii]ts\s+(a|an|the|not|been|gonna|ok|okay|me|you|him|us)\b(?!-)/g,
    fix: "it's", wrong: 'Its a beautiful day.', right: "It's a beautiful day.",
    ok: ['The company changed its name.', 'The dog wagged its tail.', 'Its own rules apply.'],
    msg: '"its" = belonging to it. "it\'s" = it is / it has.', fp: 'low', src: 'LT IT_IS' },

  { id: 'EN_ITS_ADJ_END', cat: 'confusable', sev: 'error', l1: 'all',
    re: /\b[Ii]ts\s+(?:(?:very|really|so|too|pretty|quite)\s+)?(true|false|fine|ok|okay|good|great|bad|nice|easy|hard|possible|impossible|important|cold|hot|late|early|raining|snowing|over|done)(?=\s*[.!?,;]|\s*$)/g,
    fix: "it's", wrong: 'I think its too late.', right: "I think it's too late.",
    ok: ['The plan has its good points.', 'We admired its very good design.'],
    msg: 'Here you mean "it is", so write "it\'s".', fp: 'low', src: 'LT IT_IS' },

  { id: 'EN_ITS_TIME', cat: 'confusable', sev: 'error', l1: 'all',
    re: /(?<=^|[.!?]\s+|\bthat\s+|\bthink\s+|\bguess\s+|\bnow\s+)[Ii]ts\s+time\b/g,
    fix: "it's time", wrong: 'I think its time to go.', right: "I think it's time to go.",
    ok: ['The government has taken its time to decide.'],
    msg: '"It\'s time to..." = "It is time to...".', fp: 'low', src: 'LT IT_IS (antipattern: "took its time")' },

  { id: 'EN_ITS_OWN', cat: 'confusable', sev: 'error', l1: 'all',
    re: /\bit['’]s\s+(own|self)\b/gi,
    fix: 'its own / itself', wrong: "The town has it's own beach.", right: 'The town has its own beach.',
    ok: ["It's ours, not theirs."],
    msg: 'Possessive "its" never has an apostrophe (like his, hers).', fp: 'very low', src: 'LT IT_IS' },

  { id: 'EN_PREP_ITS', cat: 'confusable', sev: 'warning', l1: 'all',
    re: /\b(of|on|in|for|with|by|from|into|onto|under|over|through)\s+it['’]s\s+(?!(?:been|a|an|the|not|going|time|my|your|our|their|his|her|so|very|too|really|just|all|only|also)\b)[a-z]+/gi,
    fix: 'its', wrong: "The cat licked all of it's fur.", right: 'The cat licked all of its fur.',
    ok: ["In it's been a long time, nothing."],
    msg: 'After a preposition you usually need possessive "its".', fp: 'low', src: 'LT IT_IS (prep + it\'s + noun)' },

  { id: 'EN_YOUR_YOURE', cat: 'confusable', sev: 'error', l1: 'all',
    re: /\b[Yy]our\s+(?:(not(?!\s+\w+ing\b)|gonna|always|never|already|probably|definitely|actually|kidding|joking|a|an|the)\b(?![-/])|(welcome|right|wrong|sure|late|early)(?=\s*[.!?,;]|\s*$))/g,
    fix: "you're", wrong: 'Your welcome!', right: "You're welcome!",
    ok: ['Your right hand is cold.', 'Thanks for your welcome speech.', 'Your A grade is great.', 'Your very own room.', 'Fix your a/c system.', 'Your not eating vegetables is bad.'],
    msg: '"your" = belonging to you. "you\'re" = you are.', fp: 'low', src: 'LT YOUR_YOU_RE, YOUR' },

  { id: 'EN_YOURE_YOUR', cat: 'confusable', sev: 'error', l1: 'all',
    re: /\byou['’]re\s+(own|car|house|name|mother|father|mom|mum|dad|sister|brother|phone|job|room|bag|book|money|turn|fault|email|address|homework|opinion)\b/gi,
    fix: 'your', wrong: "Is this you're bag?", right: 'Is this your bag?',
    ok: ["You're home early!", "You're family to me.", "The people you're friends with."],
    msg: 'Before a noun you need possessive "your".', fp: 'low', src: 'LT YOUR' },

  { id: 'EN_THEIR_IS', cat: 'confusable', sev: 'error', l1: 'all',
    re: /\b[Tt]heir\s+(is|are|was|were|isn't|aren't|wasn't|weren't|will\s+be|has\s+been|have\s+been|might\s+be|could\s+be|must\s+be)\b/g,
    fix: 'there', wrong: 'Their is a problem with the car.', right: 'There is a problem with the car.',
    ok: ['Their house is big.'],
    msg: '"There is / there are" introduces something. "their" = belonging to them.', fp: 'very low', src: 'LT THEIR_IS' },

  { id: 'EN_THERE_OWN', cat: 'confusable', sev: 'error', l1: 'all',
    re: /\b(there|they['’]re)\s+own\b/gi,
    fix: 'their own', wrong: 'They did it on there own.', right: 'They did it on their own.',
    ok: ['Is there one over there?'],
    msg: '"their own" (belonging to them).', fp: 'very low', src: 'LT THERE_OWN' },

  { id: 'EN_PREP_THERE_NOUN', cat: 'confusable', sev: 'error', l1: 'all',
    re: /\b(of|in|at|on|to|with|without|for|from|about)\s+there\s+(?:(?:new|old|best|first|last|little|big|young)\s+)?(parents|children|kids|friends|family|families|house|houses|homes|car|cars|name|names|lives|jobs?|money|teachers?|mother|father|son|daughter|dog|cat|phones?|rooms?|school|country)\b/gi,
    fix: 'their', wrong: 'We went to there house.', right: 'We went to their house.',
    ok: ['Are there parents here?', 'I left my keys in there.'],
    msg: 'Before a noun you need "their" (belonging to them).', fp: 'low', src: 'LT THERE_THEIR' },

  { id: 'EN_THEYRE_THERE', cat: 'confusable', sev: 'error', l1: 'all',
    re: /\b(they['’]re\s+(is|are|was|were)\b|(of|in|at|on|with|for|from|about|by)\s+they['’]re\b)/gi,
    fix: 'there / their', wrong: "We talked about they're plans.", right: 'We talked about their plans.',
    ok: ["I hope they're happy."],
    msg: '"they\'re" = they are. Use "their" (belonging) or "there" (place / there is).', fp: 'low', src: 'LT THEYRE_THEIR, THEIR_IS' },

  { id: 'EN_THEIR_THEYRE', cat: 'confusable', sev: 'warning', l1: 'all',
    re: /\b[Tt]heir\s+(gonna|going\s+to\s+(?:be|go|do|come|have|make|get|see|win|lose)|not\s+(?:going|coming|sure|ready|here|home))\b/g,
    fix: "they're", wrong: 'Their going to be late.', right: "They're going to be late.",
    ok: ['Their going-away party was fun.'],
    msg: 'Here you mean "they are" = "they\'re".', fp: 'low', src: 'LT THEYRE_THEIR' },

  { id: 'EN_THEN_THAN', cat: 'confusable', sev: 'error', l1: 'nl',
    re: /\b(more|less|better|worse|bigger|smaller|larger|higher|lower|older|younger|faster|slower|cheaper|easier|harder|stronger|weaker|longer|shorter|taller|nicer|happier|rather|other|greater|fewer|quicker|warmer|colder|hotter|richer|poorer|different)\s+then\b(?!\s*[.!?,;:]|\s*$)/gi,
    notAfter: /\bif\b[^.!?,]*$/i,
    fix: 'than', wrong: 'My brother is taller then me.', right: 'My brother is taller than me.',
    ok: ['It got better then.', 'It was colder then, wasn\'t it?', "If the project costs more then I'm not interested."],
    msg: 'Comparisons use "than". "then" is about time (first..., then...). Dutch "dan" covers both!', fp: 'low', src: 'LT COMP_THAN, CONFUSION_OF_THEN_THAN; Burrough-Boenisch' },

  { id: 'EN_THAN_THEN', cat: 'confusable', sev: 'error', l1: 'nl',
    re: /\b([Aa]nd|[Ss]ince|[Uu]ntil|[Tt]ill|[Bb]y|[Bb]ack|[Ff]rom|[Nn]ow\s+and)\s+than\b|(?<=^|[.!?]\s+)Than\s+(?=(?:I|we|he|she|they|you|it|the|my)\b)/g,
    fix: 'then', wrong: 'We ate, and than we went home.', right: 'We ate, and then we went home.',
    notAfter: /\b(rather|more|less|better|worse|sooner|other|further|farther|earlier|later|longer|way)\b[^.!?]*$/i,
    ok: ['She is smarter than me.', 'He ran faster than ever.', "I'd rather go back than stay.", "I'd rather be right than happy.", 'It goes way further back than the war.', '... than the others.'],
    msg: '"then" = after that / at that time. "than" is only for comparisons.', fp: 'low', src: 'LT AND_THAN, FROM_THAN_ON' },

  { id: 'EN_LOSE_LOOSE_OBJ', cat: 'confusable', sev: 'error', l1: 'nl',
    re: /\bloos(e|es|ing)\s+(?:(?:my|your|his|her|our|their|the|a|all|some|much|any|so\s+much|too\s+much)\s+)?(weight|money|keys?|job|jobs|game|games|match|way|time|mind|patience|control|interest|hope|phone|wallet|track|touch|focus|friends?|sleep|temper|faith|everything)\b/gi,
    fix: 'lose / loses / losing', wrong: 'I always loose my keys.', right: 'I always lose my keys.',
    ok: ['These are loose ends.', 'My shoes are loose.'],
    msg: 'lose (luz) = verliezen. loose (loos) = los / not tight. Final devoicing makes them sound alike for Dutch ears.', fp: 'very low', src: 'LT LOOSE_LOSE; English and the Dutch' },

  { id: 'EN_LOSE_LOOSE_AUX', cat: 'confusable', sev: 'error', l1: 'nl',
    re: /\b(to|will|won't|would|could|can|can't|might|must|should|don't|didn't|doesn't|gonna|never\s+want\s+to)\s+loose\b(?!\s+(?:fit|clothes|ends?|change))/gi,
    fix: 'lose', wrong: "Don't loose hope!", right: "Don't lose hope!",
    ok: ['The knot came loose.', 'It will come loose.'],
    msg: 'After to / will / can / don\'t you need the verb "lose".', fp: 'low', src: 'LT LOOSE_LOSE' },

  { id: 'EN_LOOSE_LOSE_ADJ', cat: 'confusable', sev: 'error', l1: 'nl',
    re: /\b(on\s+the|break|broke|broken|cut|come|came|set|knock(?:ed)?)\s+lose\b/gi,
    fix: 'loose', wrong: 'The dog is on the lose.', right: 'The dog is on the loose.',
    ok: ['We might lose.'],
    msg: '"on the loose / break loose" use the adjective "loose".', fp: 'very low', src: 'LT LOSE_LOOSE' },

  { id: 'EN_AFFECT_NOUN', cat: 'confusable', sev: 'error', l1: 'all',
    re: /\b(an|no|any|positive|negative|side|big|huge|great|significant|little|strong|direct|desired|opposite|same|domino|greenhouse|butterfly|special|take|took|taken|takes|into|in)\s+affects?\b/gi,
    fix: 'effect(s)', wrong: 'The medicine had a strong affect on me.', right: 'The medicine had a strong effect on me.',
    ok: ['This will affect everyone.', 'Does it affect you?'],
    msg: 'Usually: affect = verb (to influence), effect = noun (the result).', fp: 'low', src: 'LT AFFECT_EFFECT, AFFECTS' },

  { id: 'EN_EFFECT_VERB', cat: 'confusable', sev: 'warning', l1: 'all',
    re: /\b(will|would|can|could|may|might|does|did|didn't|doesn't|won't|not|to|badly|seriously|negatively)\s+effect(s|ed)?\s+(?!(?:a\s+|the\s+|real\s+|positive\s+)?changes?\b)(me|you|him|her|us|them|my|your|his|our|their|the|people|everyone|everybody|it|children|students)\b/gi,
    fix: 'affect', wrong: 'Stress can effect your sleep.', right: 'Stress can affect your sleep.',
    ok: ['We want to effect change.', 'They tried to effect a change in policy.'],
    msg: 'To influence something = affect. (Verb "effect" = to bring about, e.g. "effect change".)', fp: 'low', src: 'LT AFFECT_EFFECT' },

  { id: 'EN_WHOS_WHOSE', cat: 'confusable', sev: 'error', l1: 'all',
    re: /\b[Ww]ho['’]s\s+(car|bag|book|phone|idea|house|turn|fault|job|money|name|side|dog|cat|coat|keys|pen|seat|responsibility|birthday|child|children|mother|father|wife|husband)\b/g,
    fix: 'whose', wrong: "Who's phone is this?", right: 'Whose phone is this?',
    ok: ["Who's coming tonight?"],
    msg: '"whose" asks about the owner. "who\'s" = who is / who has.', fp: 'low', src: 'LT WHOS, WHO_S_NN_VB' },

  { id: 'EN_WHOSE_WHOS', cat: 'confusable', sev: 'error', l1: 'all',
    re: /\b[Ww]hose\s+(going|coming|calling|doing|been|ready|next|the|a|an)\b/g,
    fix: "who's", wrong: 'Whose coming to the party?', right: "Who's coming to the party?",
    ok: ['Whose is this?', "I don't know whose it is."],
    msg: '"who\'s" = who is / who has.', fp: 'low', src: 'LT WHOS (inverse)' },

  { id: 'EN_TOO_VERB', cat: 'confusable', sev: 'error', l1: 'all',
    re: /\b(want|wants|wanted|need|needs|needed|have|has|had|like|likes|liked|try|tries|tried|going|used|able|decided|hope|plan|love|hate|forgot|remember|learn|learned|nice|happy|glad|ready|time|how|what|where|easy|hard)\s+too\s+(go|be|do|see|get|make|have|take|come|buy|eat|find|know|say|tell|ask|work|play|help|start|stop|try|use|leave|meet|learn|read|write|pay|visit|call|bring)\b/gi,
    fix: 'to', wrong: 'I want too go home.', right: 'I want to go home.',
    ok: ['It is too hot.', 'Me too!', 'I too have a son.', 'They too do not work.', 'You too have no idea.'],
    msg: 'Before a verb: "to" (to go). "too" = also / more than enough.', fp: 'low', src: 'LT TOO_TO' },

  { id: 'EN_TO_TOO', cat: 'confusable', sev: 'error', l1: 'all',
    re: /\b(is|are|was|were|be|been|it['’]s|that['’]s|way|not|much|far)\s+to\s+(late|early|soon|much|many|big|small|hot|cold|expensive|fast|slow|long|short|difficult|hard|easy|young|old|tired|busy)\b(?=\s*[.!?,;]|\s*$|\s+(?:for|to|and|but|because|today|now|here|there|outside|inside)\b)/gi,
    fix: 'too', wrong: 'It is to hot today.', right: 'It is too hot today.',
    ok: ['From early to late.', 'We went to old castles.'],
    msg: '"too" = more than enough (too hot) or also. "to" = direction / before a verb.', fp: 'low', src: 'LT TO_TOO; Cambridge Dutch learner data ("to too much")' },

  { id: 'EN_ME_TOO', cat: 'confusable', sev: 'error', l1: 'all',
    re: /(?<=^|[.!?]\s+)(Me|Him|Her|Us)\s+to(?=\s*[.!?]|\s*$)|\b(love|miss|like)\s+you\s+to(?=\s*[.!]|\s*$)/g,
    fix: 'too', wrong: 'I love you to!', right: 'I love you too!',
    ok: ['Who did you talk to?', 'This is the man I spoke to.'],
    msg: '"too" = also.', fp: 'low', src: 'common error; Cambridge Dutch learner data' },

  { id: 'EN_TWO_TOO', cat: 'confusable', sev: 'error', l1: 'all',
    re: /\btwo\s+(much|many|late|early|soon)\b/gi,
    fix: 'too', wrong: 'I ate two much cake.', right: 'I ate too much cake.',
    ok: ['I have two cats.'], msg: '"two" is the number 2.', fp: 'very low', src: 'LT TO_TOO' },

  { id: 'EN_ACCEPT_EXCEPT', cat: 'confusable', sev: 'error', l1: 'all',
    re: /\b(please|kindly|will|would|can|could|to|must|should|cannot|can't|won't|didn't|don't)\s+except\b/gi,
    fix: 'accept', wrong: 'Please except my apology.', right: 'Please accept my apology.',
    ok: ['Everyone came except Tom.', 'What can I do except wait?'],
    msg: 'accept = say yes / receive. except = apart from.', fp: 'low', src: 'LT ACCEPT_EXCEPT' },

  { id: 'EN_ADVICE_VERB', cat: 'confusable', sev: 'error', l1: 'all',
    re: /\b(I|we|they|would|will|please|kindly|strongly|can|could|should)\s+advice\b/gi,
    fix: 'advise', wrong: 'I advice you to rest.', right: 'I advise you to rest.',
    ok: ['Thank you for the advice.', 'I could offer you advice.', 'Listen to advice.'], msg: 'advise (z-sound) = verb. advice (s-sound) = noun.', fp: 'low', src: 'LT ADVICE_ADVISE' },

  { id: 'EN_ADVISE_NOUN', cat: 'confusable', sev: 'error', l1: 'all',
    re: /\b(some|any|good|bad|great|my|your|his|her|our|their|professional|legal|medical|financial|expert|useful|helpful|piece\s+of|for|of|need|needs|needed)\s+advise\b/gi,
    fix: 'advice', wrong: 'Can you give me some advise?', right: 'Can you give me some advice?',
    ok: ['We advise caution.', 'Doctors advise rest.'], msg: 'The noun is "advice" (with c).', fp: 'low', src: 'LT GIVE_ADVISE' },

  { id: 'EN_ADVICES', cat: 'grammar', sev: 'error', l1: 'all',
    re: /\badvices\b/gi,
    fix: 'advice (noun) / advises (verb after he/she)', wrong: 'She gave me many advices.', right: 'She gave me a lot of advice.',
    ok: [], msg: '"advice" is uncountable: some advice, a piece of advice. (Verb: she advises.)', fp: 'very low', src: 'LT ADVICE_ADVISE' },

  { id: 'EN_BELIEVE_BELIEF', cat: 'confusable', sev: 'error', l1: 'nl',
    re: /\b(I|you|we|they|don't|didn't|can't|to)\s+belief\b|\b(my|your|his|her|our|their|a|the|strong|religious)\s+believe\b/gi,
    fix: 'believe (verb) / belief (noun)', wrong: "I can't belief it!", right: "I can't believe it!",
    ok: ['That is my belief.', 'I believe you.'],
    msg: 'believe = verb, belief = noun (like prove / proof, advise / advice).', fp: 'low', src: 'final-devoicing pair; LT BELIVE_BELIEVE family' },

  { id: 'EN_PRICE_PRIZE', cat: 'confusable', sev: 'error', l1: 'nl',
    re: /\b(won|win|wins|winning)\s+(?:the\s+|a\s+|first\s+|second\s+|third\s+|top\s+|grand\s+)?price\b|\bnobel\s+price\b|\b(high|low|full|half|reduced|ticket|sale|retail|market)\s+prize\b/gi,
    fix: 'prize / price', wrong: 'She won first price.', right: 'She won first prize.',
    ok: ['The price is high.', 'He won the prize.', 'We paid top price.', 'The first price we saw was high.'],
    msg: 'prize = what you win. price = what you pay.', fp: 'low', src: 'final-devoicing pair' },

  { id: 'EN_LIVE_LIFE', cat: 'confusable', sev: 'error', l1: 'nl',
    re: /\b(my|your|his|her|our|their)\s+(?:whole\s+|entire\s+|daily\s+|social\s+|private\s+|love\s+)?live\b(?=\s*[.!?,;]|\s*$|\s+(?:is|was|has|and|changed)\b)|\b(I|you|we|they)\s+life\s+(?=(in|at|on|with|here|there|near|together|alone|abroad)\b)/gi,
    fix: 'life / live', wrong: 'I want to enjoy my whole live.', right: 'I want to enjoy my whole life.',
    ok: ['We saw their live show.', 'I live in Utrecht.'],
    msg: 'life = het leven (noun). live = wonen / leven (verb). A typical Dutch mix-up.', fp: 'low', src: 'Cambridge Learner Corpus, Dutch learners' },

  // ---------- Spelling (rule-level, beyond the dictionary) ----------
  { id: 'EN_ALOT', cat: 'spelling', sev: 'error', l1: 'all',
    re: /\balot\b/gi, fix: 'a lot', wrong: 'I like it alot.', right: 'I like it a lot.', ok: ['Allot time for it.'],
    msg: '"a lot" is always two words.', fp: 'very low', src: 'Brians; codespell' },

  { id: 'EN_FUSED_WORDS', cat: 'spelling', sev: 'error', l1: 'nl',
    re: /\b(eachother|infront|atleast|incase|everytime|aswell|ofcourse|noone|inspite)\b/gi,
    fix: 'each other / in front / at least / in case / every time / as well / of course / no one / in spite', wrong: 'We help eachother every day.', right: 'We help each other every day.',
    ok: ['Everyone is here.', 'Nobody came.'],
    msg: 'English writes these as two words (Dutch glues words together, English often does not).', fp: 'very low', src: 'codespell dictionary' },

  { id: 'EN_DEFINITELY', cat: 'spelling', sev: 'error', l1: 'all',
    re: /\b(definately|definatly|definetly|definitly|defenitely|definitley|defintely)\b/gi,
    fix: 'definitely', wrong: 'I will definately come.', right: 'I will definitely come.', ok: [],
    msg: 'Remember: defi-NITE-ly (it contains "finite").', fp: 'very low', src: 'codespell; Oxford common misspellings' },

  { id: 'EN_DEFIANTLY', cat: 'spelling', sev: 'hint', l1: 'all',
    re: /\b(will|would|I|I'll|am|was|is|be|'ll)\s+defiantly\b/gi,
    fix: 'definitely?', wrong: 'I will defiantly be there.', right: 'I will definitely be there.',
    ok: ['She defiantly refused.'], msg: '"defiantly" means rebelliously. Did you mean "definitely"?', fp: 'medium', src: 'common autocorrect confusion' },

  { id: 'EN_OFF_COURSE', cat: 'spelling', sev: 'error', l1: 'all',
    re: /(?<=^|[.!?,]\s*)[Oo]ff\s+course\b(?=\s*[,.!?]|\s+(?:I|we|you|he|she|they|it|not)\b)/g,
    fix: 'of course', wrong: 'Off course I will help.', right: 'Of course I will help.',
    ok: ['The plane went off course.'], msg: '"of course" (natuurlijk). "off course" = not on the planned route.', fp: 'low', src: 'common error' },

  // ---------- Capitalisation ----------
  { id: 'EN_I_LOWER', cat: 'capitalization', sev: 'error', l1: 'all',
    re: /(?<![\p{L}\p{N}_'’.(-])i(?=['’](?:m|ve|ll|d)\b|(?![\p{L}\p{N}_.'’)-])(?!\s+(?:is|equals|be)\b|\s*[=<>+]|[^.!?]{0,15}\bii\b))/gu,
    notAfter: /(?:\b(where|letter|short|long|dotted|variable|index|the|an?|of|to|let|each|every|for|here)|[=+<>(])\s*,?\s*$/i,
    fix: 'I', wrong: 'Yesterday i went home and i\'m tired.', right: "Yesterday I went home and I'm tired.",
    ok: ['That is, i.e., the end.', 'See point (i) above.', 'Bahāʼi is a religion.', 'Children learn the short i sound.', 'Change a to i in the word.', 'Let i be the index.', 'Here, i is a number.', 'Tests: i breath, ii heartbeat.'],
    msg: 'The word "I" is always a capital letter in English (Dutch "ik" is not).', fp: 'very low', src: 'LT I_LOWERCASE' },

  { id: 'EN_SENT_START_CAP', cat: 'capitalization', sev: 'error', l1: 'all',
    re: /(?<=^|(?<!\.)[.!?]\s+)(?<!\b(?:e\.g|i\.e|etc|vs|approx|Mr|Mrs|Ms|Dr|St)\.\s+)(?!(?:iPhones?|iPads?|iOS|eBay|macOS)\b)[a-z]/g,
    notAfter: /(?:\b[A-Za-z]\.(?:[A-Za-z]\.)*|\b(?:Corp|Inc|Ltd|Co|Jr|Sr|St|Mt|No|Fig|approx|Dept|Univ|Ave|Rd|vs|etc|Mr|Mrs|Ms|Dr|Prof|Gen|Sgt|Capt|Lt|Col|Gov|Sen|Rep|ft|in|cm|mm|km|kg|lbs?|oz|sec|[Mm]sec|min|hrs?|PhD|cf|ca|al|eds?|vol|pp)\.)\s+$/,
    fix: 'Capital letter', wrong: 'I was tired. then I slept.', right: 'I was tired. Then I slept.',
    ok: ['We bought fruit, e.g. apples.', 'I love my iPhone. iPhones are nice.', '"Am I late?" she asked.', 'Wait.. and then?', 'It starts at 5 a.m. tomorrow.', 'Exports from the U.S. boomed.', 'Acme Corp. must pay.'],
    msg: 'Start every sentence with a capital letter.', fp: 'low', src: 'LT UPPERCASE_SENTENCE_START (Java rule)' },

  { id: 'EN_DAY_CAP', cat: 'capitalization', sev: 'error', l1: 'nl',
    re: /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)(s)?\b/g,
    fix: 'Monday ...', wrong: 'See you on monday.', right: 'See you on Monday.', ok: ['See you on Monday.'],
    msg: 'Days of the week always start with a capital in English (Dutch writes "maandag").', fp: 'very low', src: 'Dutch/English capitalisation contrast' },

  { id: 'EN_MONTH_CAP', cat: 'capitalization', sev: 'error', l1: 'nl',
    re: /\b(january|february|april|june|july|september|october|november|december)\b|(?<=\b(?:in|since|until|till|from|early|late|mid|last|next|before|after|during|\d{1,2}(?:st|nd|rd|th)?)\s+)(march|may|august)\b(?!\s+(?:be|have|not|also|still|well|never|need|want|go|come|help|I|you|we|they|he|she|it)\b)/g,
    fix: 'January ...', wrong: 'My birthday is in july.', right: 'My birthday is in July.',
    ok: ['It may rain.', 'We will march on.', 'Before may I ask...'],
    msg: 'Months start with a capital in English (Dutch writes "juli").', fp: 'low', src: 'LT LOWERCASE_MONTHS' },

  { id: 'EN_LANG_CAP', cat: 'capitalization', sev: 'error', l1: 'ar',
    re: /\b(english|dutch|arabic|french(?!\s+(?:fr(?:y|ies)|toast|doors?|windows?|press|kiss|horn|braids?)\b)|german|spanish|italian|portuguese|russian|chinese|japanese|korean|hindi|urdu|persian|farsi|hebrew|greek|swedish|danish|flemish|frisian|moroccan|egyptian|syrian|iraqi|saudi|lebanese|palestinian|tunisian|algerian|somali|american|british|european|african|asian|belgian|islam|muslim|christian|ramadan|christmas|easter)\b/g,
    fix: 'English, Dutch ...', wrong: 'I speak dutch and arabic.', right: 'I speak Dutch and Arabic.',
    ok: ['Please polish the table.', 'We had turkey.', 'I ate french fries.'],
    msg: 'Languages, nationalities and religions always start with a capital letter.', fp: 'low', src: 'LT CAPITALIZATION family; Arabic has no capital letters' },

  // ---------- Grammar: Dutch transfer ----------
  { id: 'EN_SINCE_DURATION', cat: 'grammar', sev: 'error', l1: 'nl',
    re: /\bsince\s+(\d+|a|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|many|several|a\s+few|few)\s+(years?|months?|weeks?|days?|hours?|minutes?|decades?)\b(?!\s+ago)/gi,
    fix: 'for', wrong: 'I have lived here since five years.', right: 'I have lived here for five years.',
    ok: ['I have lived here since 2015.', 'since three years ago'],
    msg: 'since + a moment (since 2015). for + a period (for five years). Dutch "sinds" covers both.', fp: 'very low', src: 'LT SINCE_FOR' },

  { id: 'EN_SINCE_PRESENT', cat: 'grammar', sev: 'warning', l1: 'nl',
    re: /\b(I|you|we|they)\s+(live|work|study|know|am|are|teach|play|own|wait|stay|learn)\b(?:\s+[\w']+){0,4}?\s+since\s+(\d{4}|last\b|yesterday|january|february|march|april|may|june|july|august|september|october|november|december|monday|tuesday|wednesday|thursday|friday|saturday|sunday|childhood|this\s+morning|I\s+was|we\s+were)/gi,
    fix: 'have lived / have been ...', wrong: 'I live in Utrecht since 2015.', right: 'I have lived in Utrecht since 2015.',
    ok: ['I live here since it is cheap.', 'I have known him since 2010.'],
    msg: 'Started in the past and still true now -> present perfect (I have lived). Dutch uses the present ("ik woon hier sinds...").', fp: 'low', src: 'LT PERFECT_TENSE_SINCE; elon.io; Wikipedia Dunglish' },

  { id: 'EN_PERFECT_PAST_TIME', cat: 'grammar', sev: 'warning', l1: 'nl',
    re: /\b(have|has)\s+(been|gone|seen|done|made|met|bought|eaten|written|taken|given|got|left|sent|spent|found|told|heard|won|lost|paid|visited|finished|started|arrived|called|moved|played|watched|worked|lived)\b(?:(?![.!?])[^.!?])*?(?<!\bsince\s+|\bfor\s+|\buntil\s+|\bthan\s+)\b(yesterday|last\s+(?:night|week|month|year|summer|winter|weekend|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|\d+\s+(?:days?|weeks?|months?|years?)\s+ago|in\s+(?:19|20)\d\d)\b/gi,
    notAfter: /\b(may|might|must|could|should|would|will)\s*$/i,
    fix: 'past simple (went, saw, ...)', wrong: 'I have seen that film yesterday.', right: 'I saw that film yesterday.',
    ok: ['I have lived here since last year.', 'I have been here for 3 years.'],
    msg: 'With a finished time (yesterday, last week, in 2019) English uses the past simple, not "have + ...". Dutch "ik heb ... gezien" does not translate 1:1.', fp: 'medium', src: 'Gymglish (Dutch speakers); LT MISSING_PAST_TENSE' },

  { id: 'EN_I_AM_AGREE', cat: 'grammar', sev: 'error', l1: 'all',
    re: /\b(I|we|they|you)\s*(am|are|['’]m|['’]re)\s+(not\s+)?agree\b|\b(he|she|it)\s*(is|['’]s)\s+(not\s+)?agree\b|\b(Are|Is)\s+(you|he|she|they|we)\s+agree\b/gi,
    fix: 'I agree / I don\'t agree / Do you agree?', wrong: 'I am agree with you.', right: 'I agree with you.',
    ok: ['I agree with you.', 'We are in agreement.'],
    msg: '"agree" is a verb, not an adjective: I agree, I don\'t agree, Do you agree?', fp: 'very low', src: 'common learner error (EnglishAlex list; Cambridge TKT)' },

  { id: 'EN_UNCOUNTABLE_PLURAL', cat: 'grammar', sev: 'error', l1: 'all',
    re: /\b(informations|furnitures|equipments|luggages|baggages|homeworks|softwares|jewelleries|jewelries|machineries)\b/gi,
    fix: 'information, furniture, equipment ...', wrong: 'Thanks for the informations.', right: 'Thanks for the information.',
    ok: ['Thanks for the information.'],
    msg: 'These nouns are uncountable in English: no -s. Say "some information", "a piece of furniture".', fp: 'very low', src: 'LT INFORMATIONS' },

  { id: 'EN_UNCOUNTABLE_PLURAL_SOFT', cat: 'grammar', sev: 'hint', l1: 'nl',
    re: /\b(knowledges|feedbacks|trainings|researches(?=\s+(?:show|have|are|were)\b))\b/gi,
    fix: 'knowledge, feedback, training ...', wrong: 'Thank you for the feedbacks.', right: 'Thank you for the feedback.',
    ok: ['She researches birds.'], msg: 'Usually uncountable in English (Dutch "trainingen", "feedbacks" are plural).', fp: 'medium', src: 'learner usage notes' },

  { id: 'EN_MORE_COMPARATIVE', cat: 'grammar', sev: 'error', l1: 'all',
    re: /\bmore\s+(better|worse)\b(?!\s*\?)|\b(more|most)\s+(easier|harder|bigger|smaller|faster|slower|cheaper|happier|nicer|larger|taller|stronger|best|worst|biggest|easiest)\b(?=\s+than\b|\s*[.!?,;]|\s*$)/gi,
    fix: 'better / easier (without more)', wrong: 'This one is more better.', right: 'This one is better.',
    ok: ['We need more older volunteers.', 'Is more better?'],
    msg: '"better", "easier" are already comparatives. Don\'t add "more".', fp: 'very low', src: 'LT MOST_COMPARATIVE' },

  { id: 'EN_MOST_OF_PEOPLE', cat: 'grammar', sev: 'error', l1: 'all',
    re: /\bmost\s+of\s+(people|students|children|men|women|countries|cities|time)\b/gi,
    fix: 'most people / most of the people / most of the time', wrong: 'Most of people like music.', right: 'Most people like music.',
    ok: ['Most of the people left.', 'Most of my friends came.'],
    msg: '"most people" (in general) or "most of the people" (a specific group). Never "most of people".', fp: 'very low', src: 'Grammar-Quizzes; LT MOST_OF_THE_TIMES' },

  { id: 'EN_HE_DONT', cat: 'grammar', sev: 'error', l1: 'all',
    re: /\b([Hh]e|[Ss]he)\s+(don['’]t|do\s+not)\b|(?:(?<=^|[.!?]\s+)|\b(?:and|but|because|so|if|when)\s+)[Ii]t\s+(don['’]t|do\s+not)\b/g,
    fix: "doesn't / does not", wrong: "He don't like coffee.", right: "He doesn't like coffee.",
    ok: ["They don't like coffee.", 'The things that cause it do not matter.'], msg: 'With he / she / it: doesn\'t.', fp: 'very low', src: 'LT NON3PRS / agreement family' },

  { id: 'EN_3SG_BASE', cat: 'grammar', sev: 'warning', l1: 'all',
    re: /\b(he|she)\s+(?:(?:always|never|often|usually|sometimes|also|really|just)\s+)?(go|have|do|want|like|need|know|make|come|live|work|think|say|get|see|take|play|study|speak|eat|drink|read|write|walk|drive|love|hate|feel|look|seem|try|use|watch|listen|wait|stay|help|run|sleep|teach|learn|understand|believe|remember|forget|leave|buy|pay|call|ask|tell|give)\b/gi,
    notAfter: MODAL_AUX_3SG,
    fix: 'goes / has / does ...', wrong: 'She go to school every day.', right: 'She goes to school every day.',
    ok: ['Does she go to school?', 'Can he come?', 'Why does he work so late?', 'Let her go.', 'Both his wife and he like it.', "Hasn't she come?", 'I suggested that he work with Mary.', 'I suggested to Bill that he come early.', "Where'd he go?", 'Need he run so fast?', 'Where does he/she work?'],
    msg: 'He / she / it + present simple verb needs -s: she goes, he has, she does.', fp: 'low', src: 'LT HE_VERB_AGR (simplified, word list instead of POS)' },

  { id: 'EN_NON3SG_S', cat: 'grammar', sev: 'warning', l1: 'all',
    re: /(?:\b(?:I|[Ww]e|[Tt]hey)|(?:(?<=^|[.!?,;]\s*)|\b(?:and|because|so|if|when|that)\s+)[Yy]ou)\s+(goes|has|does|wants|likes|needs|knows|makes|comes|lives|works|thinks|says|gets|sees|takes|plays|studies|speaks|eats|loves|hates|feels|looks|seems|tries|uses|watches|listens)\b/g,
    notAfter: /\b(of|but|than|thank|except|like|as\s+well\s+as)\s*$/i,
    fix: 'go / have / do ...', wrong: 'They likes football.', right: 'They like football.',
    ok: ['I told you she likes it.', 'Each of you has a file.', 'A big thank you goes to Dan.', 'Everyone but you has done it.', 'Loving you makes me happy.', 'What doesn\'t kill you makes you stronger.'], msg: 'With I / you / we / they: no -s.', fp: 'low', src: 'LT NON3PRS_VERB' },

  { id: 'EN_PEOPLE_IS', cat: 'grammar', sev: 'error', l1: 'all',
    re: /(?<=^|[.!?]\s+)People\s+(is|was|has|doesn['’]t|does|isn['’]t|wasn['’]t)\b/g,
    fix: 'are / were / have', wrong: 'People is very friendly here.', right: 'People are very friendly here.',
    ok: ['People are nice.', 'Meeting young people is hard.', 'A crowd of 100 people is large.', 'Finding people is hard.', 'How many people is too many?', 'The worst for most people is pain.'], msg: '"people" is plural: people are, people have.', fp: 'low', src: 'LT PEOPLE_VBZ' },

  { id: 'EN_NOT_WITHOUT_DO', cat: 'grammar', sev: 'error', l1: 'nl',
    re: /\b(I|you|we|they|he|she)\s+not\s+(like|likes|want|wants|know|knows|need|needs|have|has|understand|understands|think|thinks|see|go|goes|eat|work|works|live|lives|speak|speaks|believe|remember|care|mind)\b/gi,
    notAfter: /\b(do|does|did|would|could|will|can|should|must|might|may|have|has)\s*$/i,
    fix: "don't / doesn't + verb", wrong: 'I not like this song.', right: "I don't like this song.",
    ok: ['Do you not know?', 'I not only sing but dance.'],
    msg: 'English needs "do" for negatives: I don\'t like, she doesn\'t know. (Dutch just adds "niet".)', fp: 'low', src: 'elon.io do-support; Wikipedia Dunglish' },

  { id: 'EN_VERB_IT_NOT', cat: 'grammar', sev: 'error', l1: 'nl',
    re: /\b(I|you|we|they)\s+(like|know|want|understand|need|believe|remember|see|have)\s+(it|that|this|him|her|them)\s+not\b(?!\s+(?:to|only)\b)/gi,
    fix: "I don't like it", wrong: 'I like it not.', right: "I don't like it.",
    ok: ['I want him not to go.'], msg: 'English negative: I don\'t like it (not "I like it not" = Dutch "ik vind het niet leuk" word order).', fp: 'low', src: 'elon.io do-support' },

  { id: 'EN_WH_VERB_SUBJECT', cat: 'grammar', sev: 'error', l1: 'nl',
    re: /(?<=^|[.!?]\s+)(When|Where|Why|How|What)\s+(?!come\s)(go|come|eat|work|live|think|want|like|need|know|mean|play|study|leave|start|arrive|get|make|see|speak|goes|works|lives|wants|likes|knows|went|came|ate|said)\s+(you|he|she|we|they|I)\b[^.!?]*\?/g,
    fix: 'When do you go ...?', wrong: 'When go you home?', right: 'When do you go home?',
    ok: ['How come you are late?', 'When do you go home?'],
    msg: 'English questions need do / does / did: "When do you go...?" (Dutch: "Wanneer ga je...?").', fp: 'low', src: 'LT grammar-l2-de WH_VERB_SUBJECT; Wikipedia Dunglish' },

  { id: 'EN_IN_THE_WEEKEND', cat: 'grammar', sev: 'warning', l1: 'nl',
    re: /\bin\s+the\s+weekends?\b(?!\s+(?:edition|papers?|news|issue|schedule|traffic|market)\b)/gi,
    fix: 'at the weekend (UK) / on the weekend (US)', wrong: 'What are you doing in the weekend?', right: 'What are you doing at the weekend?',
    ok: ['It was in the weekend edition.'],
    msg: 'UK: at the weekend / at weekends. US: on the weekend / on weekends. "in the weekend" is a Dutch-ism (in het weekend).', fp: 'low', src: 'Merriam-Webster Learner\'s; Oxford Learner\'s' },

  { id: 'EN_IN_WEEKDAY', cat: 'grammar', sev: 'error', l1: 'all',
    re: /\bin\s+(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)s?\b(?!['’]s|\s+(?:night|morning|afternoon|evening)['’]s|\s+through\b)/g,
    notAfter: /\b(weigh(?:s|ed)?|be|am|is|are|was|were|been|sleep|slept|sleeps|come|came|comes|get|got|gets|check(?:ed)?|log(?:ged)?|fill(?:ed)?|hand(?:ed)?|turn(?:ed)?|call(?:ed)?|work(?:ed)?|stay(?:ed)?|clock(?:ed)?|drop(?:ped)?|pop(?:ped)?|impressive|interested)\s*$/i,
    fix: 'on Monday', wrong: 'We meet in Monday.', right: 'We meet on Monday.',
    ok: ["In Monday's game, we lost.", 'Commerzbank weighed in Wednesday.', 'Well, we slept in Tuesday morning.', 'I will be in Monday through Thursday.', "He was great in Monday night's win."], msg: 'Days take "on": on Monday, on Fridays.', fp: 'low', src: 'LT IN_WEEKDAY; Cambridge grammar at/on/in' },

  { id: 'EN_MAKE_HOMEWORK', cat: 'collocation', sev: 'error', l1: 'nl',
    re: /\b(make|makes|making|made)\s+(?:(?:my|your|his|her|our|their|the|some|all|all\s+my)\s+)?homework\b/gi,
    fix: 'do (my) homework', wrong: 'I have to make my homework.', right: 'I have to do my homework.',
    ok: ['I did my homework.'], msg: 'English: DO homework (Dutch: huiswerk maken).', fp: 'very low', src: 'Dunglish collocation; Jakub Marian' },

  { id: 'EN_MAKE_PHOTO', cat: 'collocation', sev: 'warning', l1: 'nl',
    re: /\b(make|makes|making|made)\s+(?:(?:a|an|some|many|lots\s+of|a\s+lot\s+of|the|my|our|this|that|nice|great|beautiful|good)\s+)*(photos?|photographs?|selfies?|pics?)\b/gi,
    fix: 'take a photo', wrong: 'Can you make a photo of us?', right: 'Can you take a photo of us?',
    ok: ['Can you take a photo of us?'], msg: 'English: TAKE a photo (Dutch: een foto maken).', fp: 'very low', src: 'Jakub Marian: make vs take a photo' },

  { id: 'EN_DO_MISTAKE', cat: 'collocation', sev: 'error', l1: 'all',
    re: /\b(I|you|we|they|he|she|to|always|often|never|sometimes|can|will|would|don['’]t|didn['’]t|not)\s+(do|did|does|doing)\s+(?:a\s+|the\s+same\s+|many\s+|some\s+|lots\s+of\s+|a\s+lot\s+of\s+|stupid\s+|small\s+|big\s+)?mistakes?\b|\b(have|has|had)\s+done\s+(?:a\s+|many\s+|some\s+)?mistakes?\b/gi,
    fix: 'make a mistake', wrong: 'I always do the same mistake.', right: 'I always make the same mistake.',
    ok: ['Does a mistake matter?'], msg: 'English: MAKE a mistake.', fp: 'low', src: 'collocation (Cambridge, Oxford Collocations)' },

  { id: 'EN_MAKE_A_WALK', cat: 'collocation', sev: 'error', l1: 'nl',
    re: /\b(make|makes|made|making)\s+a\s+walk\b/gi,
    fix: 'take a walk / go for a walk', wrong: "Let's make a walk.", right: "Let's go for a walk.",
    ok: [], msg: 'English: take a walk / go for a walk (Dutch: een wandeling maken).', fp: 'very low', src: 'Dutch collocation transfer' },

  { id: 'EN_MAKE_FUN', cat: 'collocation', sev: 'warning', l1: 'nl',
    re: /\b(make|made|making)\s+fun\b(?=\s*[.!?,]|\s*$|\s+(?:with|together|tonight|today|this|during|at|in|on)\b)/gi,
    fix: 'have fun', wrong: "We made fun at the party.", right: 'We had fun at the party.',
    ok: ['They made fun of him.', 'We make fun crafts.'],
    msg: '"have fun" = enjoy yourself. "make fun of" = laugh at someone (unkind). Dutch "plezier maken" = have fun.', fp: 'low', src: 'Dutch collocation transfer' },

  { id: 'EN_BORROW_ME', cat: 'collocation', sev: 'error', l1: 'nl',
    re: /\b(borrow|borrows|borrowed|borrowing)\s+(me|us)\s+(a|an|the|your|his|her|some|money|\d+|it|this|that)\b/gi,
    fix: 'lend me', wrong: 'Can you borrow me your pen?', right: 'Can you lend me your pen?',
    ok: ['Can I borrow your pen?', 'Can I borrow them?'],
    msg: 'lend = give for a while (uitlenen). borrow = take for a while (lenen van). Dutch "lenen" covers both.', fp: 'very low', src: 'Paul Brians, Common Errors: borrow/lend' },

  { id: 'EN_LEND_BORROW', cat: 'collocation', sev: 'error', l1: 'nl',
    re: /\b(can|could|may|might)\s+I\s+lend\s+(your|his|her|their|some|a|an|the)\b/gi,
    fix: 'borrow', wrong: 'Can I lend your bike?', right: 'Can I borrow your bike?',
    ok: ['Can I lend you my bike?'], msg: 'If YOU take it, you borrow it.', fp: 'low', src: 'Paul Brians, Common Errors: borrow/lend' },

  { id: 'EN_LEARN_ME', cat: 'collocation', sev: 'error', l1: 'nl',
    re: /\b(learn|learns|learned|learnt|learning)\s+(me|him|us)\s+(to|how|about|English|Dutch|Arabic|maths?|the)\b/gi,
    fix: 'teach me / taught me', wrong: 'My father learned me how to swim.', right: 'My father taught me how to swim.',
    ok: ['I learned how to swim.'], msg: 'teach = give knowledge (leren aan). learn = get knowledge. Dutch "leren" covers both.', fp: 'very low', src: 'iamexpat / Dunglish: leren' },

  { id: 'EN_BECOME_GET', cat: 'false-friend', sev: 'warning', l1: 'nl',
    re: /\b(become|becomes|became|becoming)\s+(?:(?:a|an|the|my|some|your|no)\s+)?(present|gift|letter|message|email|e-mail|answer|reply|package|parcel|call|prize|discount|refund|salary|raise|ticket|invitation)\b/gi,
    fix: 'get / receive', wrong: 'I became a present from my aunt.', right: 'I got a present from my aunt.',
    ok: ['She became a teacher.'], msg: '"become" = worden. To receive something = get / receive. (Flemish "bekomen", German "bekommen" = get.)', fp: 'low', src: 'false-friend pattern (German bekommen / Flemish bekomen); flagged as likely, not corpus-verified' },

  { id: 'EN_EVENTUALLY_FF', cat: 'false-friend', sev: 'hint', l1: 'nl',
    re: /\b(can|could|may|might|we|you|I)\s+eventually\b(?=[^.!?]*\b(?:tomorrow|next\s+week|later|if|maybe|perhaps|also)\b)|\beventual\s+(questions?|problems?|costs?|changes?|delays?|comments?)\b/gi,
    fix: 'possibly / if necessary', wrong: 'We could eventually meet tomorrow if you want.', right: 'We could possibly meet tomorrow if you want.',
    ok: ['Eventually, after many years, we won.'],
    msg: 'eventually = in the end (uiteindelijk). Dutch "eventueel" = possibly / if needed.', fp: 'medium', src: 'Dunglish false friends (iamexpat, Fulbright); LT false-friends.xml' },

  { id: 'EN_ACTUAL_FF', cat: 'false-friend', sev: 'hint', l1: 'nl',
    re: /\bactual\s+(news|topics?|issues?|affairs|events?|developments?|themes?)\b/gi,
    fix: 'current / topical / latest', wrong: 'We discussed actual news.', right: 'We discussed current news.',
    ok: ['The actual cost was higher.'], msg: 'actual = real (werkelijk). Dutch "actueel" = current / topical.', fp: 'medium', src: 'LT false-friends.xml (actual / actueel); Wikipedia Dunglish' },

  { id: 'EN_CONTROL_CHECK', cat: 'false-friend', sev: 'hint', l1: 'nl',
    re: /\b(control|controlled|controlling|controls)\s+(?:(?:the|my|your|his|her|our|their)\s+)?(answers?|homework|spelling|tickets?|passports?|text|email|grammar|calculations?)\b/gi,
    fix: 'check', wrong: 'Can you control my homework?', right: 'Can you check my homework?',
    ok: ['They control the market.'], msg: 'To look for mistakes = check. "control" = have power over (Dutch "controleren" = check).', fp: 'medium', src: 'Dunglish false friend (controleren)' },

  { id: 'EN_WE_ARE_WITH_N', cat: 'false-friend', sev: 'hint', l1: 'nl',
    re: /\b(we|they)\s+(are|were|['’]re)\s+with\s+(\d+|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)(?=\s*[.!?,]|\s*$|\s+(?:people|persons)\b)/gi,
    fix: 'There are five of us.', wrong: 'We are with five people.', right: 'There are five of us.',
    ok: ['We are with three friends from Spain.'], msg: 'Dutch "we zijn met z\'n vijven" = "there are five of us".', fp: 'medium', src: 'Dutch idiom transfer (Dunglish)' },

  { id: 'EN_HOW_DO_YOU_CALL', cat: 'false-friend', sev: 'hint', l1: 'nl',
    re: /\b[Hh]ow\s+(do|would|did)\s+you\s+call\s+(this|that|it|these|those)\b(?=\s*\?|\s+in\b)/g,
    fix: 'What do you call this?', wrong: 'How do you call this in English?', right: 'What do you call this in English?',
    ok: ['How do you call home from abroad?'], msg: 'English: WHAT do you call it? (Dutch: Hoe noem je dit?)', fp: 'low', src: 'Dutch idiom transfer' },

  { id: 'EN_ACCORDING_TO_ME', cat: 'style', sev: 'hint', l1: 'nl',
    re: /\b[Aa]ccording\s+to\s+me\b/g,
    fix: 'In my opinion / I think', wrong: 'According to me, it is a good idea.', right: 'In my opinion, it is a good idea.',
    ok: [], msg: '"according to" is used for other sources. For yourself: "In my opinion" / "I think" (Dutch "volgens mij").', fp: 'very low', src: 'LT ACCORDING_TO_ME' },

  { id: 'EN_PLURAL_APOSTROPHE', cat: 'punctuation', sev: 'error', l1: 'nl',
    re: /\b(\d{1,3}|two|three|four|five|six|seven|eight|nine|ten|many|several|few|these|those|more|both|lots\s+of|a\s+lot\s+of|hundreds\s+of|thousands\s+of)\s+(?!(?:people|children|men|women|teeth|feet|mice|sheep|fish|today|tomorrow|yesterday|everyone|someone|nobody|anyone|one|it|that|there|here|what|who|he|she|let|where|how)['’]s)([a-z]{3,}|[A-Z]{2,})['’]s\b(?!\s+(?:going|gone|been|got|gonna|not)\b)/g,
    fix: 'photos, babies, CDs (no apostrophe)', wrong: 'We took many photo\'s.', right: 'We took many photos.',
    ok: ["My baby's toys are here.", "Two of Anna's friends came.", "These people's opinions differ.", "Many children's books are fun.", "The 1933 World's Fair.", "Some millionaire's going to build it.", "Are these Tom's bags?", "Mind your p's and q's: two x's."],
    msg: 'English plurals NEVER take an apostrophe: photos, euros, babies, CDs. (Dutch writes foto\'s, auto\'s.) If you meant ownership by several people, write teachers\' (apostrophe after the s).', fp: 'very low', src: 'English and the Dutch (Substack); Burrough-Boenisch' },

  { id: 'EN_PERSON_WHICH', cat: 'grammar', sev: 'warning', l1: 'nl',
    re: /\b(man|woman|person|people|teacher|friend|friends|boy|girl|student|students|doctor|guy|someone|somebody|anyone|everyone|children|kids|men|women|colleague|colleagues)\s+which\b/gi,
    fix: 'who', wrong: 'The man which lives next door is nice.', right: 'The man who lives next door is nice.',
    ok: ['The book which I read was long.'], msg: 'For people use "who" (or "that"), not "which". Dutch "die" covers both.', fp: 'low', src: 'relative clause transfer' },

  { id: 'EN_EXPLAIN_ME', cat: 'grammar', sev: 'error', l1: 'all',
    re: /\bexplain(s|ed|ing)?\s+(me|him|her|us|you)\s+(how|what|why|where|when|which|who|the|that|this|everything|something|it)\b/gi,
    fix: 'explain (it) to me', wrong: 'Can you explain me the rules?', right: 'Can you explain the rules to me?',
    ok: ['Can you explain her decision?', 'Explain it to me.'], msg: 'explain SOMETHING TO someone.', fp: 'low', src: 'LT EXPLAIN_TO' },

  { id: 'EN_DISCUSS_ABOUT', cat: 'grammar', sev: 'error', l1: 'all',
    re: /\bdiscuss(es|ed|ing)?\s+about\b/gi,
    fix: 'discuss / talk about', wrong: "Let's discuss about the plan.", right: "Let's discuss the plan.",
    ok: ['We had a discussion about it.'], msg: '"discuss" needs no "about".', fp: 'very low', src: 'LT DISCUSS_ABOUT' },

  { id: 'EN_DEPEND_OF', cat: 'grammar', sev: 'error', l1: 'nl',
    re: /\bdepend(s|ed|ing|ent)?\s+(of|from|by|with|in|about)\b/gi,
    fix: 'depend on', wrong: 'It depends of the weather.', right: 'It depends on the weather.',
    ok: ['She is independent of her parents.'], msg: 'depend ON (Dutch: afhangen van).', fp: 'very low', src: 'LT DEPEND_ON' },

  { id: 'EN_MARRIED_WITH', cat: 'grammar', sev: 'warning', l1: 'nl',
    re: /\bmarried\s+with\s+(him|her|a|an|my|his|the|someone|somebody)\b(?!\s+(?:[\w-]+\s+){0,2}(?:child|children|kids?|baby|babies|daughters?|sons?)\b)/gi,
    fix: 'married to', wrong: 'She is married with a doctor.', right: 'She is married to a doctor.',
    ok: ['She is married with two children.', 'He is married with a young son.', 'Tom is married with a three-year-old daughter.'],
    msg: 'married TO someone (Dutch: getrouwd met). "married with children" = has children.', fp: 'low', src: 'LT (married with -> married to)' },

  // ---------- Grammar: Arabic transfer ----------
  { id: 'EN_COPULA_OMISSION', cat: 'grammar', sev: 'warning', l1: 'ar',
    re: /(?:\b(?:he|she|I|we|they)|(?:(?<=^|[.!?]\s+)|\b(?:and|but|because|so|when|if)\s+)(?:it|you|this|that))\s+(very|so|too|really)\s+(happy|sad|tired|big|small|good|bad|hungry|busy|ready|late|beautiful|nice|kind|tall|short|old|young|angry|cold|hot|expensive|cheap|important|difficult|easy|interesting|boring|smart|clever|funny|strong|fast|slow|rich|poor|sick|ill)\b/gi,
    notAfter: /\b(am|is|are|was|were|isn't|aren't|wasn't|weren't|how|as|that|[\w]+['’]s)\s*$/i,
    fix: 'he is very ...', wrong: 'He very tall and strong.', right: 'He is very tall and strong.',
    ok: ['I found it very hard.', 'That made me so happy.', 'She is very tired.', "Don't cut it too short.", 'Why am I so sad?', 'Making it very difficult to stop.', "Why's it so cold?"],
    msg: 'English needs "is / am / are" here: he IS very tall. (Arabic has no present-tense "to be".)', fp: 'low', src: 'copula-omission research (Arab EFL learners); LLEXI' },

  { id: 'EN_COPULA_OMISSION_ART', cat: 'grammar', sev: 'warning', l1: 'ar',
    re: /(?<=^|[.!?]\s+)(He|She|It)\s+(a|an)\s+(?=\w)/g,
    fix: 'she is a ...', wrong: 'She a teacher.', right: 'She is a teacher.',
    ok: ['Is she a teacher?', 'Give her a hand.', 'I bought a book and he a ruler.'], msg: 'Add "is": she is a teacher.', fp: 'low', src: 'copula-omission research' },

  { id: 'EN_MISSING_ARTICLE_JOB', cat: 'grammar', sev: 'warning', l1: 'ar',
    re: /\b(I['’]m|am|is|are|was|were|he['’]s|she['’]s|you['’]re|became|become|work\s+as|works\s+as|worked\s+as|want\s+to\s+be|wants\s+to\s+be)\s+(teacher|doctor|student|engineer|nurse|lawyer|dentist|pilot|waiter|waitress|cook|chef|farmer|programmer|designer|developer|mechanic|scientist|architect|pharmacist|accountant|journalist|driver|cleaner|writer|singer|artist)(?=\s*[.!?,;]|\s*$|\s+(?:and|but|at|in|for|with|from|who|because|now|too|here|there)\b)/gi,
    fix: 'a teacher / an engineer', wrong: 'My sister is engineer.', right: 'My sister is an engineer.',
    ok: ['She is a teacher.', 'He is student-friendly.', 'She was teacher of the year.', 'The topic is student behaviour.', 'What is engineering?'], msg: 'Jobs need "a / an": she is AN engineer. (Arabic has no indefinite article.)', fp: 'low', src: 'article-error research (Arabic L1)' },

  { id: 'EN_MISSING_ARTICLE_HAVE', cat: 'grammar', sev: 'warning', l1: 'ar',
    re: /\b(I|you|we|they|he|she)\s+(have|has|had|need|needs|want|wants|bought|buy|own|owns)\s+(car|dog|cat|house|brother|sister|question|problem|idea|job|computer|laptop|phone|bike|bicycle|appointment|meeting|exam|test|headache|cold)\b(?=\s*[.!?,;]|\s*$|\s+(?:and|but|because|so|in|at|with|for|about|from|to|on|that|today|tomorrow|yesterday|now)\b)/gi,
    fix: 'a car / an idea', wrong: 'I have question about the test.', right: 'I have a question about the test.',
    ok: ['I have car insurance.', 'We need house keys.'], msg: 'One countable thing needs "a / an": a car, a question, an idea.', fp: 'low', src: 'article-error research (Arabic L1)' },

  { id: 'EN_GENERIC_THE', cat: 'grammar', sev: 'hint', l1: 'ar',
    re: /(?<=^|[.!?]\s+)The\s+(life|love|money|happiness|education|health|nature|society|history|science|technology|religion|freedom|success|friendship|music|art|sport|knowledge|marriage|honesty|patience|war|peace|poverty)\s+(is|are|was|can|has|makes|gives|teaches)\b(?![^.!?]*\b(?:of|that|which|in\s+(?:this|that|my|our|the))\b)/g,
    fix: 'Life is ... (no "the")', wrong: 'The life is very short.', right: 'Life is very short.',
    ok: ['The life of a bee is short.', 'The money that I saved is gone.'],
    msg: 'General statements about abstract things usually have no "the": Life is short. Money is important.', fp: 'medium', src: 'definite-article research (Arabic L1, generic reference)' },

  { id: 'EN_WH_NO_INVERSION', cat: 'grammar', sev: 'warning', l1: 'ar',
    re: /(?<=^|[.!?]\s+)(When|Where|What|Why|How|Which)\s+(I|you|he|she|it|we|they)\s+(can|will|should|could|must|would|am|is|are|was|were)\b[^.!?]*\?/g,
    fix: 'When can I ...?', wrong: 'When I can call you?', right: 'When can I call you?',
    ok: ['When can I call you?'], msg: 'In questions, the helper verb comes before the subject: When CAN I...? Why ARE you...?', fp: 'low', src: 'Cambridge learner data summary (Arabic speakers); LT WH_* family' },

  // ---------- Punctuation / whitespace ----------
  { id: 'EN_SPACE_BEFORE_PUNCT', cat: 'punctuation', sev: 'error', l1: 'all',
    re: /[ \t]+(?=[,.;:!?](?:\s|$))(?![.]{2}|[:;]-?[)(DPp])/g,
    fix: 'remove the space', wrong: 'Hello , how are you ?', right: 'Hello, how are you?',
    ok: ['Wait ... what?', 'Nice :)'], msg: 'No space before , . ! ? : ; in English.', fp: 'very low', src: 'LT COMMA_PARENTHESIS_WHITESPACE (Java)' },

  { id: 'EN_SPACE_AFTER_COMMA', cat: 'punctuation', sev: 'error', l1: 'all',
    re: /[,;](?=[A-Za-z])/g,
    fix: ', + space', wrong: 'Yes,I know.', right: 'Yes, I know.', ok: ['It costs 1,000 euros.'],
    msg: 'Put a space after a comma.', fp: 'very low', src: 'LT COMMA_PARENTHESIS_WHITESPACE (Java)' },

  { id: 'EN_SPACE_AFTER_PERIOD', cat: 'punctuation', sev: 'error', l1: 'all',
    re: /(?<=[a-z]{2})[.!?](?=[A-Z][a-z])/g,
    fix: '. + space', wrong: 'I was tired.Then I slept.', right: 'I was tired. Then I slept.', ok: ['Visit example.com today.', 'He lives in the U.S. now.'],
    msg: 'Put a space after the end of a sentence.', fp: 'low', src: 'LT LC_AFTER_PERIOD family' },

  { id: 'EN_MULTI_SPACE', cat: 'punctuation', sev: 'hint', l1: 'all',
    re: /(?<=\S) {2,}(?=\S)/g, fix: 'one space', wrong: 'I am  here.', right: 'I am here.', ok: [],
    msg: 'One space between words is enough.', fp: 'very low', src: 'LT CONSECUTIVE_SPACES' },

  { id: 'EN_ARABIC_PUNCT', cat: 'punctuation', sev: 'error', l1: 'ar',
    re: /[،؛؟]/g, fix: ', ; ?', wrong: 'How are you؟ I am fine، thanks.', right: 'How are you? I am fine, thanks.', ok: [],
    msg: 'Arabic keyboard punctuation (، ؛ ؟) slipped in. Use the English , ; ?', fp: 'very low', src: 'Unicode U+060C / U+061B / U+061F (keyboard-switch heuristic)' },

  { id: 'EN_DOUBLE_PUNCT', cat: 'punctuation', sev: 'hint', l1: 'all',
    re: /,{2,}|(?<!\.)\.\.(?!\.)|[!?]{3,}/g, fix: ', or . or ...', wrong: 'Wait.. what?', right: 'Wait... what?', ok: ['Wait... what?'],
    msg: 'Doubled punctuation: use one mark (or a proper ellipsis "...").', fp: 'low', src: 'LT DOUBLE_PUNCTUATION' },

  // ---------- Repetition ----------
  { id: 'EN_WORD_REPEAT', cat: 'typo', sev: 'error', l1: 'all',
    re: /\b([A-Za-z']+)\s+\1\b(?<!\b(?:had\s+had|that\s+that|do\s+do|her\s+her|can\s+can|bye\s+bye|ha\s+ha|no\s+no|yes\s+yes|so\s+so|very\s+very|really\s+really|knock\s+knock|well\s+well|chop\s+chop|night\s+night|blah\s+blah|hip\s+hip|aye\s+aye|tsk\s+tsk|bla\s+bla|haha\s+haha|many\s+many)\b)/gi,
    fix: 'remove the repeated word', wrong: 'I went to the the shop.', right: 'I went to the shop.',
    ok: ['If I had had time, I would have come.', 'I think that that is fine.', 'Be careful if you do do the test.'],
    msg: 'You typed the same word twice.', fp: 'very low', src: 'LT ENGLISH_WORD_REPEAT_RULE (exceptions list)' },

  // ---------- Run-ons (hint only) ----------
  { id: 'EN_RUN_ON_AND', cat: 'style', sev: 'hint', l1: 'ar',
    fn: (text) => {
      const out = [];
      const sentRe = /[^.!?]+[.!?]*/g; let m;
      while ((m = sentRe.exec(text))) {
        const s = m[0];
        // count clause-chaining joins: "and I", "and then we", "so she", "then they" ...
        const joins = (s.match(/\b(?:and|so|but|then)\s+(?:then\s+)?(?:I|we|he|she|they|it|you|there)\b/gi) || []).length;
        const words = (s.match(/[A-Za-z']+/g) || []).length;
        if (joins >= 3 || (words >= 45 && joins >= 2)) out.push({ index: m.index, text: s.trim() });
      }
      return out;
    },
    fix: 'split into 2-3 sentences', wrong: 'I woke up and I ate and then I went out and I met Ali and we played football and it was fun.', right: 'I woke up and ate breakfast. Then I went out and met Ali. We played football, and it was fun.',
    ok: ['I woke up and ate breakfast. Then I went out.'],
    msg: 'Long chain of "and / so / then". Try splitting it into shorter sentences.', fp: 'medium', src: 'run-on/comma-splice research (Arab learners); Purdue OWL' },
];
