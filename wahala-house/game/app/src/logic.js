/**
 * WAHALA HOUSE - Week One.
 *
 * A single-player social strategy season: the human is one housemate among
 * ten AI housemates in a Lagos mansion. Two housemates are secret Saboteurs.
 * Relationships (friendship, romance, trust, beef), composure, fans, gist,
 * lies, strikes, nominations, a wager task, a party and a live eviction show
 * all run here. The browser only renders what viewFor() returns.
 *
 * Contract: six pure exports, no imports, no timers, no Math.random or
 * Date.now. Randomness is a seeded generator stored in state.
 */

export const meta = { game: "Wahala House", minPlayers: 1, maxPlayers: 1 };

// ---------------------------------------------------------------------------
// Cast
// ---------------------------------------------------------------------------

/**
 * Stats are 0-5. fl flirt, ld loud, tp temper, ly loyal, sc scheme,
 * wt wit, mo moral, jl jealous, ob observe. Skills: ck cook, bz business,
 * dn dance. home: room weights by block [morning, afternoon, evening].
 */
const CAST = [
  { id: "tobi", name: "Tobi", nick: "Odogwu", full: "Tobi Balogun", g: "m", age: 27, from: "Lagos Island", job: "Club promoter",
    fl: 5, ld: 5, tp: 3, ly: 2, sc: 2, wt: 3, mo: 2, jl: 3, ob: 2, ck: 2, bz: 3, dn: 5, fans: 58,
    traits: ["Flirty", "Clout-chaser", "Loud"], sig: "Odogwu don land! Who dey vex?",
    ex: ["Omo!", "Chai!", "Odogwu!"], pet: ["my guy", "boss"], petR: ["baby girl", "fine girl"], tell: "says 'trust me' twice",
    home: [{ gym: 3, kitchen: 2, garden: 2 }, { garden: 4, lounge: 2 }, { lounge: 3, garden: 3 }] },
  { id: "ada", name: "Ada", nick: "Ada Ada", full: "Adaeze Nwosu", g: "f", age: 25, from: "Enugu", job: "Skit-maker",
    fl: 2, ld: 4, tp: 2, ly: 2, sc: 3, wt: 5, mo: 2, jl: 2, ob: 4, ck: 2, bz: 2, dn: 4, fans: 55,
    traits: ["Funny", "Messy"], sig: "I no talk anything o... but make I tell you something.",
    ex: ["Ehen!", "Nne!", "Chineke!"], pet: ["my dear", "nne"], petR: ["my crush", "fine boy"], tell: "laughs too loud",
    home: [{ kitchen: 3, lounge: 2 }, { lounge: 4, garden: 2 }, { lounge: 4, kitchen: 2 }] },
  { id: "musa", name: "Musa", nick: "Musa", full: "Musa Abdullahi", g: "m", age: 29, from: "Kaduna", job: "Architect",
    fl: 2, ld: 1, tp: 1, ly: 5, sc: 2, wt: 2, mo: 4, jl: 1, ob: 4, ck: 3, bz: 3, dn: 2, fans: 42,
    traits: ["Loyal", "Calm", "Romantic"], sig: "Patience. Everything reveals itself.",
    ex: ["Hmm.", "Wallahi.", "Ah."], pet: ["my friend", "brother"], petR: ["my dear", "habibti"], tell: "goes very quiet",
    home: [{ garden: 3, gym: 2 }, { garden: 3, lounge: 2 }, { kitchen: 2, garden: 3 }] },
  { id: "ivie", name: "Ivie", nick: "Ivie", full: "Ivie Osagie", g: "f", age: 24, from: "Benin City", job: "Fashion designer",
    fl: 5, ld: 3, tp: 2, ly: 2, sc: 4, wt: 3, mo: 2, jl: 3, ob: 3, ck: 1, bz: 4, dn: 4, fans: 56,
    traits: ["Flirty", "Strategic"], sig: "If you can't handle this energy, step aside.",
    ex: ["Ehn ehn.", "Darling!", "Oya!"], pet: ["darling", "babe"], petR: ["handsome", "my love"], tell: "touches her braids",
    home: [{ bedroom: 3, garden: 2 }, { garden: 5 }, { garden: 3, lounge: 3 }] },
  { id: "kunle", name: "Kunle", nick: "Pastor K", full: "Kunle Adeyemi", g: "m", age: 26, from: "Ibadan", job: "Gospel singer",
    fl: 2, ld: 2, tp: 2, ly: 3, sc: 2, wt: 2, mo: 5, jl: 5, ob: 3, ck: 2, bz: 2, dn: 3, fans: 47,
    traits: ["Moral", "Jealous"], sig: "God is watching. And so am I.",
    ex: ["Jesu!", "Ah ah!", "Haba!"], pet: ["my brother", "my sister"], petR: ["sister mi", "my queen"], tell: "quotes scripture",
    home: [{ bedroom: 4, kitchen: 1 }, { lounge: 3, bedroom: 2 }, { lounge: 3, garden: 2 }] },
  { id: "ebi", name: "Ebi", nick: "Ebi", full: "Ebiere Pepple", g: "f", age: 28, from: "Port Harcourt", job: "Oil and gas engineer",
    fl: 1, ld: 4, tp: 5, ly: 5, sc: 1, wt: 2, mo: 4, jl: 2, ob: 3, ck: 3, bz: 3, dn: 3, fans: 50,
    traits: ["Hot-tempered", "Loyal"], sig: "Try me. I dare you. Try me.",
    ex: ["Tufiakwa!", "Abeg!", "See me see trouble!"], pet: ["abeg", "my person"], petR: ["my guy", "sweet boy"], tell: "folds her arms",
    home: [{ gym: 5 }, { gym: 2, garden: 2, kitchen: 2 }, { kitchen: 3, lounge: 2 }] },
  { id: "nedu", name: "Nedu", nick: "Nedu Codes", full: "Chinedu Okoro", g: "m", age: 30, from: "Yaba", job: "Fintech founder",
    fl: 2, ld: 2, tp: 1, ly: 2, sc: 5, wt: 3, mo: 2, jl: 1, ob: 5, ck: 1, bz: 5, dn: 1, fans: 45,
    traits: ["Strategic", "Calm", "Shady"], sig: "Everybody has a price. Even you.",
    ex: ["Interesting.", "Omo.", "See ehn."], pet: ["boss", "my G"], petR: ["beautiful", "my person"], tell: "adjusts his glasses",
    home: [{ kitchen: 2, lounge: 3 }, { lounge: 4 }, { lounge: 3, garden: 2 }] },
  { id: "nkoyo", name: "Nkoyo", nick: "Mama Nkoyo", full: "Nkoyo Effiong", g: "f", age: 31, from: "Calabar", job: "Chef and caterer",
    fl: 1, ld: 2, tp: 2, ly: 4, sc: 1, wt: 3, mo: 4, jl: 1, ob: 5, ck: 5, bz: 3, dn: 3, fans: 48,
    traits: ["Nurturing", "Observant"], sig: "Sit down, eat first. Then talk.",
    ex: ["Eh heh!", "My God!", "Nawa o!"], pet: ["my pikin", "my dear"], petR: ["my darling", "sweetheart"], tell: "starts cooking",
    home: [{ kitchen: 6 }, { kitchen: 3, lounge: 2 }, { kitchen: 5, lounge: 1 }] },
  { id: "zee", name: "Zee", nick: "Zee", full: "Zainab Bello", g: "f", age: 23, from: "Abuja", job: "Law graduate",
    fl: 3, ld: 3, tp: 3, ly: 2, sc: 4, wt: 4, mo: 2, jl: 3, ob: 4, ck: 2, bz: 4, dn: 3, fans: 52,
    traits: ["Competitive", "Shady"], sig: "I'm not rude. I'm just correct.",
    ex: ["Excuse me?", "Wow.", "Kai!"], pet: ["babe", "sis"], petR: ["cutie", "handsome"], tell: "over-explains",
    home: [{ bedroom: 2, gym: 2 }, { garden: 4, lounge: 1 }, { lounge: 2, garden: 3 }] },
  { id: "mekus", name: "Mekus", nick: "Mekus", full: "Emeka Okafor", g: "m", age: 32, from: "Onitsha", job: "Trader",
    fl: 3, ld: 4, tp: 2, ly: 3, sc: 3, wt: 5, mo: 3, jl: 2, ob: 3, ck: 3, bz: 5, dn: 3, fans: 50,
    traits: ["Hustler", "Funny"], sig: "When money speaks, truth keeps quiet.",
    ex: ["Nwanne!", "Ahn ahn!", "Hear me!"], pet: ["my brother", "nwanne"], petR: ["my sugar", "ada eze"], tell: "tells a proverb",
    home: [{ kitchen: 3, lounge: 2 }, { lounge: 3, garden: 2 }, { kitchen: 2, lounge: 3 }] },
];
const BY = {};
for (const c of CAST) BY[c.id] = c;
const AI_IDS = CAST.map((c) => c.id);
const ME = "you";

/** Built-in history: [a, b, friendship, romance, trust, beef], applied both ways. */
const HISTORY = [
  ["tobi", "ivie", 30, 38, 20, 22],
  ["ada", "zee", 10, 0, 10, 46],
  ["nkoyo", "musa", 62, 0, 60, 0],
  ["nedu", "mekus", 28, 0, 18, 32],
  ["ebi", "nkoyo", 50, 0, 45, 0],
  ["kunle", "ada", 40, 10, 35, 0],
];

// ---------------------------------------------------------------------------
// House
// ---------------------------------------------------------------------------

/** spots: how many standing/sitting positions the client lays out per room. */
const ROOMS = {
  lounge: { name: "Lounge", spots: 8 },
  kitchen: { name: "Kitchen", spots: 6 },
  garden: { name: "Garden & Pool", spots: 10 },
  bedroom: { name: "Bedroom", spots: 12 },
  gym: { name: "Gym Corner", spots: 3 },
  hoh: { name: "HoH Lounge", spots: 4 },
  diary: { name: "Diary Room", spots: 1 },
  arena: { name: "Arena", spots: 12 },
  redroom: { name: "Red Room", spots: 3 },
};
const ROAM_ROOMS = ["lounge", "kitchen", "garden", "bedroom", "gym", "hoh"];

const DAYS = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const DAY_START = 480; // 08:00
const DAY_END = 1560; // 02:00 next day
const TICK = 10; // game minutes per tick

/** Scheduled events per day: [minute, kind]. */
const SCHEDULE = {
  0: [[1500, "night"]],
  1: [[660, "hoh"], [1500, "night"]],
  2: [[600, "wager"], [900, "diary"], [1500, "night"]],
  3: [[840, "noms"], [1200, "nomreveal"], [1500, "night"]],
  4: [[600, "veto"], [780, "hustle"], [1500, "night"]],
  5: [[660, "wresult"], [1440, "strike"]],
  6: [[480, "strikereveal"], [1260, "party"], [1500, "night"]],
  7: [[1140, "live"]],
};

// ---------------------------------------------------------------------------
// Player actions (interaction wheel)
// ---------------------------------------------------------------------------

/** e: energy cost. need: requirement key checked in canDo(). x: needs a third person. */
const ACTS = {
  chat: { g: "VIBE", label: "Chit-chat", e: 1 },
  joke: { g: "VIBE", label: "Joke", e: 1 },
  compliment: { g: "VIBE", label: "Compliment", e: 1 },
  deep: { g: "VIBE", label: "Deep Talk", e: 2 },
  hug: { g: "VIBE", label: "Hug", e: 1 },
  gift: { g: "VIBE", label: "Give Gift", e: 1, coins: 60 },
  flirt: { g: "LOVE", label: "Flirt", e: 1 },
  askout: { g: "LOVE", label: "Ask Out", e: 2 },
  kiss: { g: "LOVE", label: "Kiss", e: 2 },
  breakup: { g: "LOVE", label: "Break Up", e: 1 },
  gist: { g: "SCHEME", label: "Spread Gist", e: 2, x: true },
  setup: { g: "SCHEME", label: "Set Up", e: 3, x: true },
  asksave: { g: "SCHEME", label: "Ask For Your Save", e: 1 },
  squad: { g: "SCHEME", label: "Propose Squad", e: 2 },
  swear: { g: "SCHEME", label: "Swear Loyalty", e: 1 },
  bribe: { g: "SCHEME", label: "Bribe", e: 1, coins: 120 },
  receipt: { g: "SCHEME", label: "Share a Receipt", e: 2, x: true },
  shade: { g: "CONFRONT", label: "Throw Shade", e: 1 },
  argue: { g: "CONFRONT", label: "Argue", e: 2 },
  accuse: { g: "CONFRONT", label: "Accuse: Saboteur", e: 2 },
  apologize: { g: "CONFRONT", label: "Apologize", e: 1 },
  peace: { g: "CONFRONT", label: "Make Peace", e: 2 },
};

/** Claims the player can make with Spread Gist. */
const CLAIMS = {
  likes: "has a crush on you",
  hates: "has been talking bad about you",
  fake: "is fake and playing everybody",
  sab: "is a Saboteur",
  using: "is only using you for the game",
};

// ---------------------------------------------------------------------------
// Voices of the show
// ---------------------------------------------------------------------------

const EYE = "Mama Eye";
const WHISPER = "The Whisper";
const DAPO = "Dapo Kalu";

const FEED_HANDLES = ["@lagosgist", "@wahalawatch", "@naijatea", "@house_stan", "@eyeseeall", "@jollofqueen", "@abujababe", "@phbossman", "@yabatechbro", "@ibadansoul", "@shipperNG", "@teatimeng"];
// ---------------------------------------------------------------------------
// Dialogue banks. Placeholders: {ex} exclamation, {pet} term of address,
// {you} player name, {x} third person, {me} speaker name.
// ---------------------------------------------------------------------------

/** Housemate replies to the player, by action then outcome (good / meh / bad). */
const REPLY = {
  chat: {
    good: ["{ex} {you}, you get sense sha. I like this gist.", "See, you're easy to talk to. Stay here small.", "Ahn ahn, {pet}, where have you been hiding this personality?", "Honestly? You're one of the real ones in this house."],
    meh: ["Mm. Okay. Nice talk.", "Yeah, yeah. The weather is weather.", "We move, {pet}.", "Cool. I'm just here, vibing."],
    bad: ["I'm not really in the mood, abeg.", "Is this conversation going somewhere?", "{ex} You again?", "Talk to me later. Much later."],
  },
  joke: {
    good: ["{ex} Stop! My stomach! Hahaha!", "You're mad! Who taught you this one?", "Omo, you need your own show. I'm crying!", "Hahaha! Okay okay, you win today."],
    meh: ["Heh. Small laugh. Very small.", "I see what you tried there.", "Keep practising, {pet}.", "That one needed more pepper."],
    bad: ["Was that a joke? I'm asking seriously.", "Not funny. At all.", "You're not a comedian, abeg.", "Please, stick to your day job."],
  },
  compliment: {
    good: ["Awww, {pet}. You just made my whole day.", "{ex} You noticed? Finally, somebody with eyes.", "Stop it! Okay, say it one more time.", "See why I like you? Correct person."],
    meh: ["Thank you. I know.", "Okay... thanks?", "Mm. Noted.", "That's sweet. I guess."],
    bad: ["What do you want from me?", "Flattery won't save you on Wednesday.", "Hmm. Suspicious.", "I don't trust sweet mouth."],
  },
  deep: {
    good: ["Can I tell you something real? {secret}", "Nobody in this house knows this, but... {secret}", "I trust you, so listen. {secret}", "Promise me this stays between us. {secret}"],
    meh: ["It's been a long week already. That's all.", "I miss home. That's the real gist.", "Some days it's too much, you know?", "I'm fine. I'm fine. Really."],
    bad: ["Deep talk? With you? Not today.", "My business is my business.", "You want my secrets so you can use them? No.", "I don't know you like that."],
  },
  hug: {
    good: ["Come here! Big hug!", "{ex} This one is a warm hug. I needed it.", "Aww. Okay, don't let go yet.", "Hug accepted. You're family now."],
    meh: ["Okay, small hug.", "Alright, alright.", "Side hug. That's all.", "Mm. Thanks."],
    bad: ["Abeg, personal space.", "Don't touch me like that.", "Hug ke? We're not there yet.", "Back up small."],
  },
  gift: {
    good: ["For me? {ex} You're the best!", "This is why I rate you. You're thoughtful.", "Jollof? You know my love language!", "I'm keeping this. And I'm keeping you."],
    meh: ["Oh. Thanks.", "Okay, I'll take it.", "Nice. Thank you.", "Appreciated, {pet}."],
    bad: ["You think you can buy me?", "Keep your gift.", "What's the catch?", "I don't collect bribes, abeg."],
  },
  flirt: {
    good: ["{ex} You're dangerous, you know that?", "Keep talking like that and see what happens.", "Is it hot in here or is it just you?", "Hmm, {pet}. I see you."],
    meh: ["Haha. Cute.", "Nice try. Try again later.", "You're sweet. That's all I'll say.", "Mm. Maybe."],
    bad: ["Abeg, it's not that kind of party.", "Let's just be friends, okay?", "Please redirect that energy.", "I'm going to pretend I didn't hear that."],
  },
  askout: {
    good: ["Yes! Oya, it's official. Tell the whole house!", "{ex} I was waiting for you to ask!", "Yes, {pet}. You and me. Let them talk.", "Finally! Yes!"],
    meh: ["Let's take it slow first.", "Ask me again after Sunday.", "I like you, but not yet.", "Hmm. Give me time."],
    bad: ["Ehn? No. Just no.", "We're not on that level.", "I think you misread things.", "Sorry, my heart is elsewhere."],
  },
  kiss: {
    good: ["...Wow.", "{ex} The cameras definitely caught that.", "Do that again. Slowly.", "Okay. Okay. I'm blushing."],
    meh: ["Easy, easy. Not in front of everybody.", "Maybe later. When it's quiet.", "Not here, {pet}.", "Slow down small."],
    bad: ["Whoa! No!", "Don't ever try that again.", "Are you okay?", "Mama Eye, are you seeing this?"],
  },
  breakup: {
    good: ["Fine. Maybe it's better this way.", "I understand. No hard feelings.", "Okay. We stay friends.", "It was fun while it lasted."],
    meh: ["Wow. Okay.", "If that's what you want.", "I didn't see this coming.", "Hmm. Noted."],
    bad: ["You're breaking up with ME? On camera?", "After everything? {ex}", "You'll regret this. Watch.", "Nigeria will judge you!"],
  },
  gist: {
    good: ["{ex} {x}?! I knew something was off!", "Wait wait wait. {x} did that? I'm watching them now.", "Thank you for telling me. I owe you.", "So {x} is like that? Okay. Noted."],
    meh: ["Hmm. I'll think about it.", "Maybe. Maybe not.", "You sure about this?", "Let me find out for myself."],
    bad: ["You're lying. {x} would never.", "Why are you always carrying gist?", "Stop trying to cause wahala.", "I don't believe you. At all."],
  },
  setup: {
    good: ["{x} said WHAT about me?! Where is {x}?", "{ex} So {x} is a snake. Thank you for telling me.", "Okay. {x} and I are going to talk. Loudly.", "I knew it. I knew {x} was fake."],
    meh: ["Hmm. That doesn't sound like {x}.", "I'll ask {x} myself.", "Maybe you heard wrong.", "Let me verify first."],
    bad: ["You're trying to set me against {x}. I see you.", "Nice try. I'm not stupid.", "I'll tell {x} you said this.", "Why do you want us to fight?"],
  },
  asksave: {
    good: ["You're safe with me. My save is yours.", "Don't worry, {pet}. I've got you on Wednesday.", "Consider it done.", "I was already planning to save you."],
    meh: ["I'll see how the week goes.", "Maybe. Show me you're worth it.", "I can't promise anything.", "Let me think about it."],
    bad: ["Save you? You never even greeted me this week.", "My saves are already taken.", "No, sorry.", "Ask somebody else."],
  },
  squad: {
    good: ["Squad! We run this house now!", "Say less. We move together.", "{ex} Finally, an alliance with sense.", "I'm in. Loyalty till the end."],
    meh: ["Let me see how you move first.", "Squad is a big word.", "Maybe after nominations.", "I'll think about it."],
    bad: ["I don't do squads with strangers.", "You want to use me? No.", "Not interested.", "Find another squad."],
  },
  swear: {
    good: ["I swear it back. Loyalty.", "I believe you. Don't disappoint me.", "Handshake? Deal.", "That means a lot, {pet}."],
    meh: ["Words are cheap in this house.", "We'll see.", "Okay. Time will tell.", "Mm hm."],
    bad: ["Everybody swears. Everybody lies.", "I don't believe you.", "Save your oaths.", "Loyalty ke? This house?"],
  },
  bribe: {
    good: ["Money talks. I'm listening.", "{ex} Okay, you're serious. Deal.", "Pleasure doing business.", "This one will stay between us."],
    meh: ["I'll take it, but no promises.", "Hmm. We'll see.", "Thanks. We'll talk.", "Okay. Small small."],
    bad: ["You want to buy my vote? Shame!", "Keep your money.", "I'm reporting this to Mama Eye.", "I'm not for sale."],
  },
  receipt: {
    good: ["{ex} You saw this with your own eyes?", "Receipts don't lie. {x} is finished.", "This is proof. I'm watching {x} now.", "Thank you. Now I know."],
    meh: ["Interesting. But it could mean anything.", "Hmm. I'll keep it in mind.", "That's something.", "Okay."],
    bad: ["That proves nothing.", "You're twisting things.", "Leave {x} alone.", "I don't care."],
  },
  shade: {
    good: ["Hahaha! You're wicked! I'm dead!", "{ex} Savage!", "The shade! The shade!", "Somebody bring water!"],
    meh: ["Was that shade? Weak shade.", "Okay, noted.", "Mm hm.", "Cute."],
    bad: ["Say it with your full chest!", "Who are you throwing shade at?", "Watch your mouth.", "{ex} You don't know me."],
  },
  argue: {
    good: ["Fine! Maybe you have a point!", "Okay, okay! I hear you!", "You win this one.", "Calm down, I understand now."],
    meh: ["Whatever!", "This is going nowhere!", "Talk to my hand!", "I'm done with this conversation."],
    bad: ["Don't raise your voice at me!", "{ex} You want wahala? You'll get it!", "Try me! Try me!", "Who do you think you are?!"],
  },
  accuse: {
    good: ["...How did you know?", "Keep your voice down!", "You don't know what you're talking about.", "Why are you looking at me like that?"],
    meh: ["Me? A Saboteur? Please.", "You're wasting your time.", "Accuse somebody else.", "Everybody is a suspect to you."],
    bad: ["How dare you?! I'm a housemate!", "{ex} You're the Saboteur, accusing others!", "I'll remember this at the Showdown.", "You just made an enemy."],
  },
  apologize: {
    good: ["It's okay. Come here.", "Apology accepted, {pet}.", "Thank you. That took guts.", "We're good. For real."],
    meh: ["Okay. I hear you.", "Hmm. Let's see.", "Words are easy.", "Fine."],
    bad: ["Sorry for what? It's too late.", "Keep your sorry.", "No.", "Don't come near me."],
  },
  peace: {
    good: ["Peace. Let's leave the past.", "Okay, truce. No more wahala.", "Life is too short. We're cool.", "Handshake. Clean slate."],
    meh: ["Truce. For now.", "I'll think about it.", "Maybe.", "Let's see how it goes."],
    bad: ["Peace? After what you did?", "Never.", "Not today, not tomorrow.", "No peace for you."],
  },
  refuse: {
    asleep: ["Zzz... Leave me... sleeping..."],
    tired: ["I'm too drained for this right now."],
  },
};

/** Secrets unlocked with Deep Talk (kept vague so they work for anyone). */
const SECRETS = {
  tobi: "My club almost closed last year. I'm here for the money, not the clout.",
  ada: "Half my skits are about people in this house. They don't know yet.",
  musa: "I left someone special in Kaduna to come here. I think about her every day.",
  ivie: "My fashion label is in debt. This prize would save it.",
  kunle: "Before church, I was a DJ in Ibadan clubs. Nobody here knows.",
  ebi: "My temper? I got it from my father. I'm trying to be better.",
  nedu: "My startup failed twice. I'm reading everybody because I can't afford to lose again.",
  nkoyo: "I cook for everybody because feeding people is the only way I know to be loved.",
  zee: "I failed the bar exam once. My family doesn't know.",
  mekus: "My shop in Onitsha burnt down last year. Everything I have is in this game.",
};

/** AI to AI scene scripts. Each is a list of [speaker, line] where A and B are the pair. */
const SCENES = {
  flirt: [
    [["A", "You look really good today, you know that?"], ["B", "I know. But say it again."], ["A", "Fine. You look really, really good."], ["B", "Hmm. Keep talking."]],
    [["A", "Why do I keep ending up next to you?"], ["B", "Maybe the universe is trying to tell you something."], ["A", "Or maybe you keep following me."], ["B", "Ehn? Please. You wish."]],
    [["A", "If this house wasn't full of cameras..."], ["B", "What would you do?"], ["A", "Wouldn't you like to know."], ["B", "Omo. Behave!"]],
  ],
  kiss: [
    [["A", "Come here."], ["B", "The cameras..."], ["A", "Let them watch."], ["*", "(They kiss. Somebody gasps across the room.)"]],
    [["B", "Say it."], ["A", "I like you. Too much."], ["*", "(A slow kiss. The whole house will know by breakfast.)"]],
  ],
  argue: [
    [["A", "Don't ever talk about me behind my back again!"], ["B", "Then stop doing things worth talking about!"], ["A", "{ex} You want wahala? You'll see wahala!"], ["B", "I'm not scared of you!"]],
    [["A", "You ate my food! I labelled it!"], ["B", "It's a shared kitchen, abeg!"], ["A", "Shared? Shared ke?"], ["B", "Go and cry to Mama Eye!"]],
    [["A", "I heard what you said in the garden."], ["B", "And? Everything I said is true!"], ["A", "You're fake! Everybody can see it!"], ["B", "Better fake than boring!"]],
  ],
  gossip: [
    [["A", "Have you noticed {x}? Always whispering."], ["B", "Ehen! I thought I was the only one."], ["A", "Something is not adding up."], ["B", "Let's watch {x} closely this week."]],
    [["A", "Between us... {x} is not who they pretend to be."], ["B", "Tell me everything. Now."], ["A", "Not here. Too many ears."], ["B", "Okay, tonight then."]],
    [["A", "{x} was talking about you yesterday."], ["B", "Me? What did they say?"], ["A", "Nothing sweet, let me just say that."], ["B", "Okay. Okay. Noted."]],
  ],
  deal: [
    [["A", "Wednesday is coming. You save me, I save you."], ["B", "Deal. But if you betray me..."], ["A", "I won't. Handshake?"], ["B", "Handshake."]],
    [["A", "We need numbers. You, me, and one more."], ["B", "Who can we trust?"], ["A", "Nobody. That's why we need each other."], ["B", "Fine. We're a team now."]],
  ],
  bond: [
    [["A", "You're the only sane person here, I swear."], ["B", "Hahaha! Birds of a feather."], ["A", "Whatever happens, we stay tight."], ["B", "Till the finale."]],
    [["A", "I miss my mum's egusi soup."], ["B", "Don't start! I'll cry!"], ["A", "Hahaha! Okay, okay. We'll survive."], ["B", "Together."]],
  ],
  scheme: [
    [["A", "The Whisper wants a name."], ["B", "Then we give them one. {x}."], ["A", "{x} has been asking too many questions."], ["B", "Exactly. Let's plant something."]],
    [["A", "Keep your face normal. They're watching."], ["B", "I know. Tomorrow we move."], ["A", "Skim small, not big. Nobody will notice."], ["B", "Trust me."]],
  ],
  cry: [
    [["A", "I can't do this. Everybody hates me."], ["B", "Hey, hey. Breathe. Nobody hates you."], ["A", "Then why do I feel alone?"], ["B", "Come. Let's sit down."]],
  ],
};

/** Reason lines AI use when they explain a vote or save. */
const MOTIVE = {
  save: ["Loyalty. Simple.", "They've been real with me.", "My heart chose.", "Strategy. That's all I'll say.", "They fed me when I was hungry."],
  evict: ["They're playing a game, not living.", "I don't trust them.", "Something about them is fake.", "The house is calmer without them.", "It's strategy. Nothing personal."],
};

/** Viewer feed templates. */
const TWEET = {
  ship: ["{a} and {b}?? #{s} is REAL", "The way {a} looks at {b}... #{s} forever", "Not me shipping {a} and {b} at 2am #{s}"],
  fight: ["{a} vs {b} is the content I pay data for", "{a} about to catch a strike, I can feel it", "{b} did NOT deserve that from {a}", "Somebody hold {a} back biko"],
  kiss: ["THEY KISSED. {a} and {b}. I'm screaming #{s}", "{a} and {b} kissing in the garden, the producers are eating good"],
  sus: ["Who else thinks {a} is a Saboteur?", "{a} is too quiet. That's a Saboteur move.", "Watch {a}. Just watch."],
  you: ["{a} is the main character this season", "{a} came to PLAY", "Not {a} running the whole house", "{a} is giving mastermind"],
  youbad: ["{a} is so fake it hurts", "{a} lying on camera like we can't see", "{a} needs to go on Sunday"],
  funny: ["{a} is the funniest person in that house", "{a} has me crying laughing every episode"],
  hoh: ["{a} as Head of House? The house is shaking", "{a} won HoH and chose violence"],
  noms: ["{a} on the nomination list?! I'm voting", "Save {a}! Vote vote vote!"],
  strike: ["{a} STRUCK?! The Saboteurs are not playing", "RIP {a}. The Saboteurs chose violence"],
  boring: ["Is {a} even in the house?", "{a} is wallpaper at this point"],
};
// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/** mulberry32. The state lives in s.seed so the whole season replays exactly. */
function rngFrom(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    f: next,
    int: (n) => Math.floor(next() * n),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
    range: (lo, hi) => lo + next() * (hi - lo),
    shuffle: (arr) => { const o = arr.slice(); for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); const t = o[i]; o[i] = o[j]; o[j] = t; } return o; },
    get state() { return a; },
  };
}

const clamp = (v, lo = 0, hi = 100) => (v < lo ? lo : v > hi ? hi : v);
const clone = (o) => JSON.parse(JSON.stringify(o));
const isInt = (v) => typeof v === "number" && Number.isInteger(v);
const naira = (n) => "₦" + Math.round(n).toLocaleString("en-US");
const hhmm = (min) => { const m = ((min % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0"); };

function blockOf(min) {
  if (min < 720) return 0; // morning
  if (min < 1020) return 1; // afternoon
  if (min < 1320) return 2; // evening
  return 3; // night
}
const BLOCK_NAMES = ["MORNING", "AFTERNOON", "EVENING", "NIGHT"];

function hmOf(s, id) { for (const h of s.hm) if (h.id === id) return h; return null; }
function nameOf(s, id) { if (id === ME) return s.hm[0].name; const c = BY[id]; return c ? c.name : id; }
function inHouse(s) { return s.hm.filter((h) => !h.out); }
function inHouseIds(s) { return inHouse(s).map((h) => h.id); }
function aiIn(s) { return s.hm.filter((h) => !h.out && !h.human); }
function isSab(s, id) { const h = hmOf(s, id); return !!h && h.role === "S"; }

// ---------------------------------------------------------------------------
// Relationships: rel["a>b"] = [friendship, romance, trust, beef, attraction, suspicion]
// How a feels about b. Values 0-100.
// ---------------------------------------------------------------------------

const F = 0, RO = 1, TR = 2, BF = 3, AT = 4, SU = 5;

function rel(s, a, b) { return s.rel[a + ">" + b]; }
function bump(s, a, b, idx, d) { const v = rel(s, a, b); if (v) v[idx] = clamp(Math.round(v[idx] + d)); }
function mutual(s, a, b, idx, d) { bump(s, a, b, idx, d); bump(s, b, a, idx, d); }

/** Overall liking of a toward b, used for saves and votes. */
function liking(s, a, b) {
  const v = rel(s, a, b);
  if (!v) return 0;
  return v[F] + v[TR] * 0.6 + v[RO] * 0.8 - v[BF] * 0.9 - v[SU] * 0.5;
}

/** Fuzzy 0-4 level the player can see for how an AI feels about them. */
function level(v) { return v >= 80 ? 4 : v >= 60 ? 3 : v >= 40 ? 2 : v >= 20 ? 1 : 0; }

// ---------------------------------------------------------------------------
// Logs, feed, notes, memories
// ---------------------------------------------------------------------------

function note(s, text, kind = "info") {
  s.nid += 1;
  s.notes.push({ id: s.nid, t: text, k: kind });
  if (s.notes.length > 12) s.notes.splice(0, s.notes.length - 12);
}

function logEv(s, text, kind) {
  s.log.push({ d: s.day, m: s.min, t: text, k: kind });
  if (s.log.length > 80) s.log.splice(0, s.log.length - 80);
}

function tweet(s, r, key, a, b, shipName) {
  const tpl = TWEET[key];
  if (!tpl) return;
  const t = r.pick(tpl).replace(/\{a\}/g, nameOf(s, a)).replace(/\{b\}/g, b ? nameOf(s, b) : "").replace(/\{s\}/g, shipName || "");
  s.feed.push({ h: r.pick(FEED_HANDLES), t, n: s.nid + s.feed.length });
  if (s.feed.length > 30) s.feed.splice(0, s.feed.length - 30);
}

function remember(s, who, item) {
  if (!s.mem[who]) return;
  s.mem[who].push(Object.assign({ d: s.day, m: s.min }, item));
  if (s.mem[who].length > 24) s.mem[who].splice(0, s.mem[who].length - 24);
}

function addGist(s, kind, text, tag, about) {
  s.gid += 1;
  s.gb.unshift({ id: s.gid, d: s.day, m: s.min, k: kind, t: text, tag: tag || "", about: about || [] });
  if (s.gb.length > 60) s.gb.length = 60;
}
function hasTag(s, prefix) { return s.gb.some((g) => g.k !== "gist" && g.tag && g.tag.split(" ").some((t) => t.indexOf(prefix) === 0)); }

/** Fill a template with a speaker's voice. */
function fill(s, r, tpl, speaker, extra) {
  const c = BY[speaker];
  const you = s.hm[0].name;
  let pet = c ? r.pick(c.pet) : "my friend";
  if (c && extra && extra.romantic) pet = r.pick(c.petR);
  return tpl
    .replace(/\{ex\}/g, c ? r.pick(c.ex) : "Omo!")
    .replace(/\{pet\}/g, pet)
    .replace(/\{you\}/g, you)
    .replace(/\{me\}/g, c ? c.name : you)
    .replace(/\{x\}/g, extra && extra.x ? nameOf(s, extra.x) : "them")
    .replace(/\{secret\}/g, (c && SECRETS[speaker]) || "");
}

function shipName(a, b) {
  const x = a.slice(0, Math.ceil(a.length / 2));
  const y = b.slice(Math.floor(b.length / 2));
  return (x + y).replace(/^./, (m) => m.toUpperCase());
}

function findShip(s, a, b) { return s.ships.find((sh) => (sh.a === a && sh.b === b) || (sh.a === b && sh.b === a)); }
function makeShip(s, r, a, b, official) {
  let sh = findShip(s, a, b);
  if (!sh) {
    sh = { a, b, name: shipName(nameOf(s, a), nameOf(s, b)), official: false, d: s.day };
    s.ships.push(sh);
    tweet(s, r, "ship", a, b, sh.name);
  }
  if (official && !sh.official) { sh.official = true; logEv(s, `${nameOf(s, a)} and ${nameOf(s, b)} are officially a couple. #${sh.name}`, "ship"); }
  return sh;
}
function breakShip(s, a, b) { s.ships = s.ships.filter((sh) => !((sh.a === a && sh.b === b) || (sh.a === b && sh.b === a))); }

function addBeef(s, a, b) {
  if (!s.beefs.some((x) => (x[0] === a && x[1] === b) || (x[0] === b && x[1] === a))) s.beefs.push([a, b]);
}

function strike(s, r, id, why) {
  const h = hmOf(s, id);
  if (!h || h.out) return;
  h.strikes += 1;
  const nm = nameOf(s, id);
  logEv(s, `${nm} received a strike for ${why}.`, "strike");
  note(s, `${EYE}: ${nm}, you have received a strike for ${why}. (${h.strikes}/3)`, "strike");
  h.comp = clamp(h.comp - 12);
  if (id !== ME) tweet(s, r, "fight", id, id);
}
// ---------------------------------------------------------------------------
// Season setup
// ---------------------------------------------------------------------------

function initSeason(pid, a) {
  const r = rngFrom((a.seed >>> 0) ^ 0x5bd1e995);
  const s = {
    v: 1, pid, phase: "EV", day: 0, min: 1080, seed: 0,
    hm: [], rel: {}, mem: {}, prom: {}, squads: [], ships: [], beefs: [], lies: [],
    gb: [], gid: 0, feed: [], log: [], notes: [], nid: 0, scenes: [], scid: 0, heard: [],
    pot: 0, hoh: null, tenant: null, noms: [], saves: null, vetoed: null, teams: null,
    wager: null, plan: { skim: 0, plant: null, rumor: null }, strikeTarget: null, struck: null,
    diary: { fav: null, snake: null, mood: null, mission: null }, mission: null,
    ev: null, last: null, done: {}, result: null, out: null, peeks: 0, eye: 0,
  };
  // Player first, always at index 0.
  s.hm.push({
    id: ME, human: true, name: a.name, look: a.look, g: a.look === "m" ? "m" : "f", role: "H",
    out: null, room: "arena", spot: 11, act: "idle", with: null, sc: null,
    comp: 70, fans: 50, strikes: 0, coins: 200, energy: 10, immune: false, acts: 0, sus: 0,
  });
  for (const c of CAST) {
    s.hm.push({
      id: c.id, human: false, name: c.name, look: c.id, g: c.g, role: "H",
      out: null, room: "arena", spot: 0, act: "idle", with: null, sc: null,
      comp: 62 + r.int(16), fans: c.fans, strikes: 0, coins: 200, energy: 0, immune: false, acts: 0,
    });
    s.mem[c.id] = [];
  }
  // Roles: two Saboteurs.
  let sabs;
  const others = r.shuffle(AI_IDS);
  if (a.fate === "saboteur") sabs = [ME, others[0]];
  else if (a.fate === "housemate") sabs = [others[0], others[1]];
  else sabs = r.chance(2 / 11) ? [ME, others[0]] : [others[0], others[1]];
  for (const id of sabs) hmOf(s, id).role = "S";
  s.sabs = sabs;

  // Relationships.
  const ids = [ME].concat(AI_IDS);
  for (const x of ids) for (const y of ids) {
    if (x === y) continue;
    const cx = BY[x];
    let att = r.int(55);
    if (cx && cx.fl >= 4) att += 15;
    if (y !== ME && BY[y] && BY[y].fl >= 4) att += 10;
    s.rel[x + ">" + y] = [22 + r.int(16), 0, 22 + r.int(14), 0, clamp(att), 8 + r.int(10)];
  }
  for (const [x, y, f, ro, t, b] of HISTORY) {
    for (const [p, q] of [[x, y], [y, x]]) {
      const v = s.rel[p + ">" + q];
      v[F] = f; v[RO] = ro; v[TR] = t; v[BF] = b; if (ro) v[AT] = Math.max(v[AT], 60);
    }
  }
  seedRivalries(s, r);
  // Saboteurs quietly look after each other.
  if (sabs[0] !== ME && sabs[1] !== ME) { mutual(s, sabs[0], sabs[1], TR, 25); mutual(s, sabs[0], sabs[1], F, 10); }

  s.seed = r.state;
  startEntry(s, r);
  s.seed = r.state;
  return s;
}

// ---------------------------------------------------------------------------
// Where the housemates are
// ---------------------------------------------------------------------------

function freeSpot(s, r, room, exclude) {
  const used = new Set(s.hm.filter((h) => !h.out && h.room === room && h.id !== exclude).map((h) => h.spot));
  const n = ROOMS[room].spots;
  const free = [];
  for (let i = 0; i < n; i++) if (!used.has(i)) free.push(i);
  return free.length ? r.pick(free) : r.int(n);
}

function activityFor(s, r, h, room) {
  const b = blockOf(s.min);
  if (room === "bedroom") return s.min >= 1440 ? "sleep" : r.pick(["rest", "rest", "phone"]);
  if (room === "kitchen") return r.pick(["cook", "eat", "idle"]);
  if (room === "gym") return "workout";
  if (room === "garden") return b === 1 && r.chance(0.5) ? "sunbathe" : r.pick(["idle", "idle", "sit"]);
  if (room === "lounge" || room === "hoh") return r.pick(["sit", "sit", "idle"]);
  return "idle";
}

/** Re-plan where every idle AI goes. Runs on the hour. */
function placeAI(s, r) {
  const b = Math.min(2, blockOf(s.min));
  const late = s.min >= 1440;
  for (const h of aiIn(s)) {
    if (h.sc) continue; // mid-scene
    const c = BY[h.id];
    let room;
    if (late && r.chance(0.82)) room = "bedroom";
    else {
      const w = Object.assign({}, c.home[b]);
      for (const k of ROAM_ROOMS) w[k] = (w[k] || 0.4);
      w.hoh = s.hoh === h.id || s.tenant === h.id ? 3 : 0;
      if (h.comp < 35) { w.bedroom += 3; if (h.id === "ebi") w.gym += 2; }
      if (late) { w.garden += 1; w.bedroom += 2; }
      if (b < 2 && !late) w.bedroom = Math.min(w.bedroom, 1);
      // Drift toward the people they want, away from the people they can't stand.
      for (const o of inHouse(s)) {
        if (o.id === h.id || !ROAM_ROOMS.includes(o.room)) continue;
        const v = rel(s, h.id, o.id);
        if (v[RO] >= 45) w[o.room] += 2.5;
        if (v[F] >= 65) w[o.room] += 1.5;
        if (v[BF] >= 60) w[o.room] = Math.max(0.2, w[o.room] - 1.5);
      }
      if (w.hoh === 0) delete w.hoh;
      let tot = 0;
      for (const k in w) tot += w[k];
      let x = r.f() * tot;
      room = "lounge";
      for (const k in w) { x -= w[k]; if (x <= 0) { room = k; break; } }
    }
    if (room !== h.room) { h.room = room; h.spot = freeSpot(s, r, room, h.id); }
    h.act = activityFor(s, r, h, room);
    h.with = null;
    h.watch = null;
  }
}

// ---------------------------------------------------------------------------
// AI scenes: drama that happens whether or not the player is watching
// ---------------------------------------------------------------------------

const PRIVATE = { gossip: 1, deal: 1, scheme: 1 };

function pickSceneKind(s, r, a, b, room, alone) {
  const ab = rel(s, a, b), ba = rel(s, b, a);
  const night = s.min >= 1260;
  if (isSab(s, a) && isSab(s, b) && alone && r.chance(0.7)) return "scheme";
  if (ab[RO] >= 68 && ba[RO] >= 58 && (night || room === "hoh" || room === "garden") && r.chance(0.6)) return "kiss";
  // Real grudges boil over before anything else; hot heads boil over sooner.
  const beef = Math.max(ab[BF], ba[BF]), temper = Math.max(BY[a].tp, BY[b].tp);
  if (beef >= 55 && r.chance(0.8)) return "argue";
  if ((ab[RO] >= 35 || ba[RO] >= 35) && Math.max(ab[AT], ba[AT]) >= 45 && r.chance(0.7)) return "flirt";
  if (beef >= 38 && r.chance(0.3 + temper * 0.12)) return "argue";
  if (Math.min(hmOf(s, a).comp, hmOf(s, b).comp) < 45 && Math.max(ab[F], ba[F]) >= 30 && r.chance(0.65)) return "cry";
  if ((BY[a].sc >= 4 || BY[b].sc >= 4) && ab[F] >= 38 && s.day >= 1 && s.day <= 3 && r.chance(0.45)) return "deal";
  if (ab[F] >= 40 && r.chance(0.55)) return "gossip";
  if (Math.max(ab[AT], ba[AT]) >= 60 && r.chance(0.35)) return "flirt";
  return "bond";
}

/** Choose who a gossip or scheme scene is about. */
function gossipTarget(s, r, a, b, kind) {
  const pool = inHouseIds(s).filter((x) => x !== a && x !== b);
  let best = null, bestV = -1;
  for (const x of pool) {
    let v = rel(s, a, x)[BF] + rel(s, b, x)[BF] + rel(s, a, x)[SU] * 0.8 + r.int(25);
    if (kind === "scheme") v = threatOf(s, x) + r.int(20);
    if (x === ME) v += s.hm[0].fans >= 65 ? 12 : 4;
    if (v > bestV) { bestV = v; best = x; }
  }
  return best;
}

function startScene(s, r, kind, a, b, room) {
  const x = kind === "gossip" || kind === "scheme" ? gossipTarget(s, r, a, b, kind) : null;
  const tpl = r.pick(SCENES[kind]);
  const lines = tpl.map(([who, text]) => {
    const sp = who === "A" ? a : who === "B" ? b : null;
    return { w: sp, t: sp ? fill(s, r, text, sp, { x }) : text.replace(/\{x\}/g, x ? nameOf(s, x) : "") };
  });
  s.scid += 1;
  const sc = { id: s.scid, k: kind, room, a, b, x, until: s.min + 30 + 10 * r.int(2), lines, heard: false, d: s.day };
  s.scenes.push(sc);
  for (const id of [a, b]) { const h = hmOf(s, id); h.sc = sc.id; h.with = id === a ? b : a; h.act = kind; h.watch = null; }
  applyScene(s, r, sc);
  if (kind === "argue" || kind === "kiss") gatherCrowd(s, r, sc);
  return sc;
}

function applyScene(s, r, sc) {
  const { a, b, x, k } = sc;
  const A = hmOf(s, a), B = hmOf(s, b);
  const others = inHouse(s).filter((h) => h.room === sc.room && h.id !== a && h.id !== b && !h.human && h.act !== "sleep");
  if (k === "flirt") {
    bump(s, a, b, RO, 5 + rel(s, a, b)[AT] / 12); bump(s, b, a, RO, 4 + rel(s, b, a)[AT] / 12);
    A.fans = clamp(A.fans + 2); B.fans = clamp(B.fans + 2);
    if (rel(s, a, b)[RO] >= 55 && rel(s, b, a)[RO] >= 55) makeShip(s, r, a, b, false);
  } else if (k === "kiss") {
    mutual(s, a, b, RO, 10);
    const sh = makeShip(s, r, a, b, true);
    A.fans = clamp(A.fans + 6); B.fans = clamp(B.fans + 6);
    tweet(s, r, "kiss", a, b, sh.name);
    logEv(s, `${A.name} and ${B.name} kissed in the ${ROOMS[sc.room].name}.`, "kiss");
    // Jealousy.
    for (const h of inHouse(s)) {
      if (h.id === a || h.id === b) continue;
      for (const [p, q] of [[a, b], [b, a]]) {
        if (rel(s, h.id, p)[RO] >= 40) { bump(s, h.id, q, BF, 14); h.comp = clamp(h.comp - 10); if (h.human) note(s, `${A.name} and ${B.name} just kissed. Your heart...`, "love"); }
      }
    }
    for (const w of others) remember(s, w.id, { k: "kiss", x: a, y: b, room: ROOMS[sc.room].name.toLowerCase() });
  } else if (k === "argue") {
    mutual(s, a, b, BF, 10); mutual(s, a, b, F, -8);
    A.comp = clamp(A.comp - 9); B.comp = clamp(B.comp - 9);
    A.fans = clamp(A.fans + 4); B.fans = clamp(B.fans + 4);
    addBeef(s, a, b);
    tweet(s, r, "fight", a, b);
    logEv(s, `${A.name} and ${B.name} had a loud fight in the ${ROOMS[sc.room].name}.`, "fight");
    for (const w of others) remember(s, w.id, { k: "fight", x: a, y: b, room: ROOMS[sc.room].name.toLowerCase() });
    for (const h of [A, B]) {
      const c = BY[h.id];
      if (c.tp >= 4 && h.comp < 50 && r.chance(0.3)) strike(s, r, h.id, "threatening another housemate");
    }
    if (s.mission && s.mission.k === "fight" && !s.mission.done && s.mission.pair && s.mission.pair.includes(a) && s.mission.pair.includes(b)) completeMission(s, r);
  } else if (k === "gossip") {
    mutual(s, a, b, F, 5);
    bump(s, a, x, BF, 5); bump(s, b, x, BF, 6);
    bump(s, a, x, SU, 3); bump(s, b, x, SU, 4);
    bump(s, b, x, TR, -5);
    remember(s, b, { k: "gossip", x, src: a });
    for (const w of others) if (r.chance(BY[w.id].ob * 0.06)) remember(s, w.id, { k: "overheard", x, src: a });
  } else if (k === "deal") {
    mutual(s, a, b, TR, 10);
    s.prom[a + ">" + b] = "save"; s.prom[b + ">" + a] = "save";
  } else if (k === "bond") {
    mutual(s, a, b, F, 7); mutual(s, a, b, TR, 4);
    if (BY[a].wt >= 4) B.fans = clamp(B.fans + 1), A.fans = clamp(A.fans + 2);
  } else if (k === "cry") {
    mutual(s, a, b, F, 8);
    A.comp = clamp(A.comp + 14);
    A.fans = clamp(A.fans + 3);
  } else if (k === "scheme") {
    s.plan.plant = s.plan.plant || x;
    for (const w of others) if (r.chance(BY[w.id].ob * 0.05)) { remember(s, w.id, { k: "saw_scheme", x: a, y: b }); bump(s, w.id, a, SU, 18); bump(s, w.id, b, SU, 18); }
  }
}

function endScene(s, sc) {
  for (const id of [sc.a, sc.b]) {
    const h = hmOf(s, id);
    if (h && h.sc === sc.id) { h.sc = null; h.with = null; h.act = "idle"; }
  }
  for (const h of s.hm) if (h.watch === sc.id) { h.watch = null; h.act = "idle"; }
}

/** Every half hour, the house makes content. */
function runScenes(s, r) {
  const busy = new Set();
  for (const sc of s.scenes) if (sc.until > s.min && sc.d === s.day) { busy.add(sc.a); busy.add(sc.b); }
  for (const room of ROAM_ROOMS) {
    const ppl = aiIn(s).filter((h) => h.room === room && !busy.has(h.id) && h.act !== "sleep");
    if (ppl.length < 2) continue;
    const pChance = room === "bedroom" ? 0.25 : 0.5;
    if (!r.chance(pChance)) continue;
    // Pick the most charged pair, with some randomness.
    let best = null, bestV = -1;
    for (let i = 0; i < ppl.length; i++) for (let j = i + 1; j < ppl.length; j++) {
      const a = ppl[i].id, b = ppl[j].id, ab = rel(s, a, b), ba = rel(s, b, a);
      const v = Math.max(ab[RO], ba[RO]) + Math.max(ab[BF], ba[BF]) + ab[F] * 0.4 + r.int(40) + (isSab(s, a) && isSab(s, b) ? 25 : 0);
      if (v > bestV) { bestV = v; best = [a, b]; }
    }
    const present = inHouse(s).filter((h) => h.room === room && h.act !== "sleep").length;
    const kind = pickSceneKind(s, r, best[0], best[1], room, present === 2);
    // The one crying is whoever is lower on composure.
    if (kind === "cry" && hmOf(s, best[1]).comp < hmOf(s, best[0]).comp) best.reverse();
    startScene(s, r, kind, best[0], best[1], room);
    busy.add(best[0]); busy.add(best[1]);
  }
}

function threatOf(s, x) {
  if (isSab(s, x)) return -100;
  let t = 0;
  for (const sab of s.sabs) {
    if (hmOf(s, sab).out) continue;
    const v = rel(s, x, sab);
    if (v) t = Math.max(t, v[SU]);
  }
  if (x === ME) { if (s.gb.some((g) => /sab:|skim:/.test(g.tag))) t += 30; t += s.hm[0].sus * 2; }
  const h = hmOf(s, x);
  return t + (h ? h.fans / 6 : 0);
}

// ---------------------------------------------------------------------------
// Clock
// ---------------------------------------------------------------------------

/** Advance one tick (10 game minutes). Returns an event kind if one is due. */
function advance(s, r) {
  s.min += TICK;
  // Close finished scenes.
  for (const sc of s.scenes) if (sc.until <= s.min && sc.d === s.day) endScene(s, sc);
  s.scenes = s.scenes.filter((sc) => sc.until > s.min - 60 && sc.d === s.day);
  if (s.min % 60 === 0) placeAI(s, r);
  if (s.min % 30 === 0 && s.min < 1500) runScenes(s, r);
  checkLies(s, r);
  const due = (SCHEDULE[s.day] || []).find(([m, k]) => m <= s.min && !s.done[s.day + ":" + k]);
  if (due) return due[1];
  if (s.min >= DAY_END) return "sleep";
  return null;
}

function nextEventMin(s) {
  const due = (SCHEDULE[s.day] || []).filter(([m, k]) => !s.done[s.day + ":" + k]).map(([m]) => m);
  return due.length ? Math.min.apply(null, due) : DAY_END;
}

function newDay(s, r) {
  // Overnight: everyone sleeps it off a little.
  for (const h of inHouse(s)) {
    h.comp = clamp(h.comp + 12);
    if (h.human) { h.energy = 10; if (h.acts < 3) { h.fans = clamp(h.fans - 4); } h.acts = 0; }
    else { if (h.fans > 52 && s.scenes.filter((sc) => sc.a === h.id || sc.b === h.id).length === 0) h.fans = clamp(h.fans - 3); }
  }
  s.day += 1;
  s.min = DAY_START;
  s.scenes = [];
  for (const h of inHouse(s)) { h.sc = null; h.with = null; }
  if (s.hm[0].fans < 38 && !s.hm[0].out) tweet(s, r, "boring", ME);
  placeAI(s, r);
  if (!s.hm[0].out) { s.hm[0].room = "bedroom"; }
}

// ---------------------------------------------------------------------------
// Lies catch up with you
// ---------------------------------------------------------------------------

function checkLies(s, r) {
  if (s.min % 60 !== 0) return;
  for (const L of s.lies) {
    if (L.exposed) continue;
    const to = hmOf(s, L.to), about = hmOf(s, L.about);
    if (!to || !about || to.out || about.out) continue;
    // They compare notes when they are together and on speaking terms.
    const together = to.room === about.room;
    const talk = rel(s, L.to, L.about)[F] + rel(s, L.to, L.about)[TR] * 0.5;
    const p = (together ? 0.12 : 0.02) + talk / 900 + (BY[L.to].ob + BY[L.about].ob) * 0.006;
    if (r.chance(p)) {
      L.exposed = true;
      bump(s, L.to, ME, TR, -30); bump(s, L.about, ME, TR, -25);
      bump(s, L.to, ME, BF, 14); bump(s, L.about, ME, BF, 20);
      bump(s, L.to, L.about, BF, -10);
      s.hm[0].fans = clamp(s.hm[0].fans + 3);
      note(s, `Exposed! ${nameOf(s, L.to)} and ${nameOf(s, L.about)} compared notes. Your lie about ${nameOf(s, L.about)} is out.`, "bad");
      logEv(s, `${nameOf(s, L.to)} and ${nameOf(s, L.about)} exposed ${s.hm[0].name}'s lie.`, "lie");
      tweet(s, r, "youbad", ME);
    }
  }
}
// ---------------------------------------------------------------------------
// The player's moves (interaction wheel)
// ---------------------------------------------------------------------------

/** What the player says for each move. */
const SAY = {
  chat: ["How far? How is the house treating you?", "Talk to me. What's the gist today?", "You good? You look like you've been thinking."],
  joke: ["Why did the jollof go to school? To get more flavour. Hahaha!", "If Mama Eye was a person, she'd be that auntie at every party.", "Tobi's chain is so heavy, it has its own Wi-Fi."],
  compliment: ["Your outfit today? Unmatched.", "You have the best energy in this house, honestly.", "I like how you carry yourself. Real class."],
  deep: ["Can we talk for real? No cameras, no games.", "What made you come here? The real reason.", "Who are you when nobody is watching?"],
  hug: ["Come here, big hug.", "You look like you need a hug."],
  gift: ["I saved you a plate of jollof. The good part.", "Small something for you. Don't say I never did anything."],
  flirt: ["Has anybody told you that you look dangerous today?", "I keep finding reasons to sit next to you. Funny.", "If this house had a crush list, you'd be top."],
  askout: ["Let's stop pretending. Be my person in this house.", "I like you. For real. Let's make it official."],
  kiss: ["Come here..."],
  breakup: ["I think we should just be friends.", "This thing between us... it's not working."],
  gist: ["Between us... {x} {claim}.", "I shouldn't tell you this, but {x} {claim}."],
  setup: ["I heard {x} talking about you. It wasn't sweet.", "You didn't hear it from me, but {x} is not your friend."],
  asksave: ["Wednesday is coming. Can I count on your save?", "If I'm in trouble, will you save me?"],
  squad: ["You, me, and a few real ones. Let's run this house.", "Let's form a squad. We protect each other."],
  swear: ["I swear, I've got your back. No matter what.", "Loyalty. You have mine."],
  bribe: ["There's something small in it for you if you save me.", "Let's help each other. I'll make it worth your while."],
  receipt: ["I saw it with my own eyes. {x} {receipt}.", "Receipts don't lie. {x} {receipt}."],
  shade: ["Some people in this house are all noise, no sense.", "Nice outfit. Did it come with a refund?", "Loud people are usually empty. Just saying."],
  argue: ["You need to stop talking about me!", "I'm tired of your attitude, honestly!", "Say it to my face! Go on!"],
  accuse: ["I know what you are. You're a Saboteur.", "Stop pretending. You work for The Whisper."],
  apologize: ["I'm sorry. I was wrong.", "My bad. I shouldn't have done that."],
  peace: ["Let's end this. Peace?", "No more wahala between us. Truce?"],
};

function canTalk(s, t, act, a) {
  const me = s.hm[0];
  const h = hmOf(s, t);
  if (!h || h.human || h.out) return "They are not in the house.";
  if (me.out) return "You are no longer in the house.";
  if (h.room !== me.room) return `${h.name} is not in this room.`;
  const def = ACTS[act];
  if (!def) return "Unknown move.";
  if (me.energy < def.e) return "You're out of Social Energy for today.";
  if (def.coins && me.coins < def.coins) return `You need ${def.coins} coins.`;
  if (me.comp < 30 && (act === "deep" || act === "apologize" || act === "peace")) return "You're too rattled for that right now. Rest first.";
  if (def.x) {
    if (!a.x || a.x === t || !hmOf(s, a.x) || hmOf(s, a.x).out) return "Pick who this is about.";
    if (act === "gist" && !CLAIMS[a.claim]) return "Pick what to say.";
    if (act === "receipt" && !receiptAbout(s, a.x)) return `You have no receipt on ${nameOf(s, a.x)}.`;
  }
  if (act === "breakup" && !findShip(s, ME, t)) return "You're not in a ship with them.";
  if (act === "squad" && s.squads.some((q) => q.members.includes(ME) && q.members.includes(t))) return "Already in your squad.";
  return null;
}

function receiptAbout(s, x) { return s.gb.find((g) => g.k === "receipt" && g.about.includes(x)); }

/** Is a claim about x, told to t, actually true? Lies are measured against reality. */
function claimTrue(s, claim, x, t) {
  const v = rel(s, x, t);
  if (claim === "likes") return v[RO] >= 40;
  if (claim === "hates") return v[BF] >= 40 || v[F] < 20;
  if (claim === "fake") return isSab(s, x) || v[F] < 25;
  if (claim === "sab") return isSab(s, x);
  if (claim === "using") return v[F] < 30 && v[RO] < 40;
  return false;
}

function outcomeOf(score) { return score >= 60 ? "good" : score >= 36 ? "meh" : "bad"; }

function talk(s, r, a) {
  const me = s.hm[0];
  const t = a.who;
  const h = hmOf(s, t);
  const c = BY[t];
  const act = a.act;
  const v = rel(s, t, ME);
  const noise = () => r.int(31) - 15;
  const fx = [];
  const lines = [];
  const x = a.x;
  me.energy -= ACTS[act].e;
  if (ACTS[act].coins) me.coins -= ACTS[act].coins;
  me.acts += 1;
  s.eye += 1;

  const my = r.pick(SAY[act] || ["..."]).replace(/\{x\}/g, x ? nameOf(s, x) : "").replace(/\{claim\}/g, a.claim ? CLAIMS[a.claim] : "")
    .replace(/\{receipt\}/g, x ? receiptText(s, x) : "");
  lines.push({ w: ME, t: my });

  if (h.act === "sleep") {
    lines.push({ w: t, t: REPLY.refuse.asleep[0] });
    me.energy += ACTS[act].e; if (ACTS[act].coins) me.coins += ACTS[act].coins;
    s.last = { n: s.nid + 1, who: t, act, out: "meh", lines, fx: ["They're asleep."] };
    return;
  }

  let score = 50;
  let romantic = false;
  const witnesses = aiIn(s).filter((w) => w.room === me.room && w.id !== t && w.act !== "sleep");
  switch (act) {
    case "chat": score = 40 + v[F] * 0.4 + v[TR] * 0.2 - v[BF] * 0.5 + noise(); break;
    case "joke": score = 28 + c.wt * 8 + v[F] * 0.3 - v[BF] * 0.4 + noise(); break;
    case "compliment": score = 34 + c.fl * 4 + v[F] * 0.3 + v[RO] * 0.2 - v[BF] * 0.4 - c.sc * 3 + noise(); break;
    case "deep": score = v[TR] * 0.8 + v[F] * 0.35 + noise(); break;
    case "hug": score = v[F] * 0.7 + v[RO] * 0.3 + 12 - v[BF] + noise(); break;
    case "gift": score = 52 + v[F] * 0.3 - v[BF] * 0.4 + noise(); break;
    case "flirt": score = v[AT] * 0.6 + v[RO] * 0.5 + c.fl * 5 - v[BF] * 0.6 - (partnerOf(s, t, ME) ? 25 : 0) + noise(); romantic = true; break;
    case "askout": score = v[RO] + v[AT] * 0.3 - 18 - (partnerOf(s, t, ME) ? 30 : 0) + noise(); romantic = true; break;
    case "kiss": score = v[RO] + v[AT] * 0.2 - 22 - (partnerOf(s, t, ME) ? 25 : 0) + noise(); romantic = true; break;
    case "breakup": score = 70 - v[RO] * 0.6 + noise(); break;
    case "gist": score = v[TR] * 0.8 + rel(s, t, x)[BF] * 0.3 + (receiptAbout(s, x) ? 15 : 0) + (a.claim === "likes" ? 10 : 0) + noise(); break;
    case "setup": score = v[TR] * 0.75 + rel(s, t, x)[BF] * 0.4 - rel(s, t, x)[F] * 0.25 + 10 + noise(); break;
    case "asksave": score = liking(s, t, ME) * 0.6 + 20 + (inSquad(s, t) ? 20 : 0) + noise(); break;
    case "squad": score = liking(s, t, ME) * 0.6 + c.ly * 4 + noise(); break;
    case "swear": score = v[TR] * 0.6 + c.ly * 5 + noise(); break;
    case "bribe": score = 30 + (c.mo <= 2 ? 25 : -10) + c.bz * 4 + noise(); break;
    case "receipt": score = v[TR] * 0.5 + 45 + noise(); break;
    case "shade": score = 45 + noise() - v[F] * 0.2; break;
    case "argue": score = me.fans / 10 + me.comp / 5 + 30 + noise() - (c.tp * 4); break;
    case "accuse": score = isSab(s, t) ? (r.chance(0.6) ? 70 : 45) : (r.chance(0.12) ? 70 : 20); break;
    case "apologize": score = v[F] * 0.4 + 50 - v[BF] * 0.5 + noise(); break;
    case "peace": score = 45 + v[F] * 0.3 - v[BF] * 0.3 + c.mo * 4 + noise(); break;
  }
  const out = outcomeOf(score);
  const said = fill(s, r, r.pick(REPLY[act][out]), t, { x, romantic: romantic && out === "good" });
  lines.push({ w: t, t: said });

  const plus = (idx, d, label) => { bump(s, t, ME, idx, d); if (label) fx.push(label); };
  switch (act) {
    case "chat": if (out === "good") { plus(F, 6, `${h.name} likes you more`); plus(TR, 3); } else if (out === "meh") plus(F, 2); else plus(F, -2, `${h.name} was not feeling it`); break;
    case "joke":
      if (out === "good") { plus(F, 8, `${h.name} is laughing`); h.comp = clamp(h.comp + 5); me.fans = clamp(me.fans + 2); fx.push("Fans +2"); if (s.mission && s.mission.k === "laugh" && s.mission.who === t && !s.mission.done) { s.mission.n = (s.mission.n || 0) + 1; if (s.mission.n >= 2) completeMission(s, r); } for (const w of witnesses) bump(s, w.id, ME, F, 2); }
      else if (out === "bad") plus(F, -3, "That joke flopped");
      break;
    case "compliment": if (out === "good") { plus(F, 5, `${h.name} is flattered`); plus(RO, v[AT] / 10); } else if (out === "bad") plus(TR, -3, `${h.name} thinks you want something`); break;
    case "deep":
      if (out === "good") {
        plus(TR, 8, "They opened up to you"); plus(F, 6); me.comp = clamp(me.comp + 8);
        if (!s.gb.some((g) => g.k === "secret" && g.about.includes(t))) addGist(s, "secret", `${h.name}'s secret: "${SECRETS[t]}"`, "secret:" + t, [t]);
      } else if (out === "meh") plus(F, 3); else plus(TR, -2, `${h.name} shut you out`);
      break;
    case "hug": if (out === "good") { plus(F, 5, "Warm hug"); h.comp = clamp(h.comp + 5); me.comp = clamp(me.comp + 3); } else if (out === "bad") plus(F, -4, `${h.name} didn't want that`); break;
    case "gift": if (out === "good") { plus(F, 10, `${h.name} loved the gift`); plus(TR, 4); } else if (out === "meh") plus(F, 4); else plus(F, -2); if (s.mission && s.mission.k === "gift" && s.mission.who === t && !s.mission.done) completeMission(s, r); break;
    case "flirt":
      if (out === "good") { plus(RO, 6 + v[AT] / 10, `${h.name} is blushing`); me.fans = clamp(me.fans + 2); if (rel(s, t, ME)[RO] >= 55 && rel(s, ME, t)) makeShip(s, r, ME, t, false); }
      else if (out === "meh") plus(RO, 2); else { plus(F, -3, `${h.name} curved you`); me.comp = clamp(me.comp - 4); }
      jealousy(s, r, t, witnesses, 8);
      break;
    case "askout":
      if (out === "good") {
        const sh = makeShip(s, r, ME, t, true); plus(RO, 10, `You and ${h.name} are official! #${sh.name}`); me.fans = clamp(me.fans + 8); h.fans = clamp(h.fans + 5);
        tweet(s, r, "ship", ME, t, sh.name); jealousy(s, r, t, inHouse(s).filter((q) => !q.human), 12);
      } else if (out === "meh") plus(RO, 2); else { plus(RO, -8, "Rejected. On camera."); plus(F, -4); me.comp = clamp(me.comp - 8); me.fans = clamp(me.fans + 2); }
      break;
    case "kiss":
      if (out === "good") {
        const sh = makeShip(s, r, ME, t, true); plus(RO, 12, "The kiss of the season!"); me.fans = clamp(me.fans + 10); h.fans = clamp(h.fans + 6);
        tweet(s, r, "kiss", ME, t, sh.name); logEv(s, `${me.name} and ${h.name} kissed in the ${ROOMS[me.room].name}.`, "kiss");
        jealousy(s, r, t, inHouse(s).filter((q) => !q.human), 16);
        for (const w of witnesses) remember(s, w.id, { k: "kiss", x: ME, y: t });
        if (s.mission && s.mission.k === "kiss" && !s.mission.done) completeMission(s, r);
      } else if (out === "meh") plus(RO, 1, "Not here, not now");
      else { plus(F, -10, `${h.name} is not happy`); plus(TR, -10); plus(BF, 10); me.comp = clamp(me.comp - 10); me.fans = clamp(me.fans + 4); }
      break;
    case "breakup":
      breakShip(s, ME, t);
      if (out === "bad") { plus(BF, 25, `${h.name} is heartbroken and furious`); h.comp = clamp(h.comp - 20); me.fans = clamp(me.fans + 6); logEv(s, `${me.name} broke up with ${h.name}. Loudly.`, "fight"); }
      else { plus(RO, -20, "You're just friends now"); }
      break;
    case "gist": {
      const truth = claimTrue(s, a.claim, x, t);
      const k = out === "good" ? 1 : out === "meh" ? 0.5 : 0;
      if (k > 0) {
        if (a.claim === "likes") { bump(s, t, x, RO, 10 * k); bump(s, t, x, F, 5 * k); }
        if (a.claim === "hates") { bump(s, t, x, BF, 15 * k); bump(s, t, x, F, -8 * k); }
        if (a.claim === "fake") { bump(s, t, x, TR, -12 * k); bump(s, t, x, SU, 5 * k); }
        if (a.claim === "sab") bump(s, t, x, SU, 22 * k);
        if (a.claim === "using") { bump(s, t, x, TR, -15 * k); bump(s, t, x, RO, -10 * k); }
        plus(TR, 4 * k);
        fx.push(`${h.name} ${k === 1 ? "believes" : "half-believes"} you about ${nameOf(s, x)}`);
        remember(s, t, { k: "told", x, src: ME, c: a.claim });
      } else {
        plus(TR, -6, `${h.name} doesn't believe you`);
        if (r.chance(0.4)) { bump(s, x, ME, BF, 10); fx.push(`${h.name} might tell ${nameOf(s, x)}...`); }
      }
      if (!truth) { s.lies.push({ to: t, about: x, c: a.claim, d: s.day, exposed: false }); fx.push("That was a lie. Lies get exposed."); }
      break;
    }
    case "setup": {
      const truth = claimTrue(s, "hates", x, t);
      if (out === "good") {
        bump(s, t, x, BF, 22); bump(s, t, x, F, -12); plus(TR, 5, `${h.name} is furious at ${nameOf(s, x)}`);
        const X = hmOf(s, x);
        if (X.room === h.room && !X.sc && !h.sc && X.act !== "sleep") { startScene(s, r, "argue", t, x, h.room); fx.push("A fight is starting!"); }
        else remember(s, t, { k: "grudge", x, src: ME });
      } else if (out === "meh") { bump(s, t, x, BF, 8); fx.push(`${h.name} will ask ${nameOf(s, x)} directly`); }
      else { plus(TR, -10, `${h.name} sees what you're doing`); bump(s, x, ME, BF, 12); }
      if (!truth) { s.lies.push({ to: t, about: x, c: "hates", d: s.day, exposed: false }); fx.push("That was a lie. Lies get exposed."); }
      break;
    }
    case "asksave":
      if (out === "good") { s.prom[t + ">" + ME] = "save"; plus(F, 2, `${h.name} promised to save you`); }
      else if (out === "bad") plus(F, -2, `${h.name} won't promise`); else fx.push("No promise yet");
      break;
    case "squad":
      if (out === "good") {
        let q = s.squads.find((z) => z.members.includes(ME));
        if (!q) { q = { name: squadName(s, r), members: [ME] }; s.squads.push(q); }
        if (q.members.length < 5) q.members.push(t);
        plus(TR, 10, `${h.name} joined your squad: ${q.name}`); s.prom[t + ">" + ME] = "save";
      } else if (out === "bad") plus(TR, -4, `${h.name} said no`);
      break;
    case "swear": if (out === "good") plus(TR, 8, `${h.name} trusts you more`); else if (out === "bad") plus(TR, -2); break;
    case "bribe":
      if (out === "good") { s.prom[t + ">" + ME] = "save"; plus(F, 3, `${h.name} took the money. Save secured?`); }
      else if (out === "meh") fx.push("They took it. No promises.");
      else { plus(TR, -10, `${h.name} is disgusted`); if (c.mo >= 4) strike(s, r, ME, "attempting to bribe a housemate"); }
      break;
    case "receipt": {
      const g = receiptAbout(s, x);
      if (out !== "bad") {
        const k = out === "good" ? 1 : 0.5;
        if (/sab:|skim:|scheme/.test(g.tag)) bump(s, t, x, SU, 26 * k);
        else bump(s, t, x, BF, 12 * k);
        bump(s, t, x, TR, -10 * k); plus(F, 3, `${h.name} now sees ${nameOf(s, x)} differently`);
      } else plus(TR, -3, `${h.name} brushed it off`);
      break;
    }
    case "shade":
      if (out === "good") { me.fans = clamp(me.fans + 4); plus(BF, 8, "Savage. The house is screaming."); h.comp = clamp(h.comp - 6); for (const w of witnesses) if (rel(s, w.id, t)[BF] > 20) bump(s, w.id, ME, F, 3); }
      else { plus(BF, 10, `${h.name} is ready for war`); me.fans = clamp(me.fans + 1); }
      addBeef(s, ME, t);
      break;
    case "argue":
      plus(BF, 12); plus(F, -8); h.comp = clamp(h.comp - 10); me.comp = clamp(me.comp - 10); me.fans = clamp(me.fans + 5);
      fx.push("Drama! Fans +5"); addBeef(s, ME, t); logEv(s, `${me.name} and ${h.name} had a heated argument.`, "fight"); tweet(s, r, "fight", ME, t);
      if (out === "good") { h.comp = clamp(h.comp - 8); fx.push(`${h.name} backed down`); }
      if (r.chance(me.comp < 35 ? 0.3 : 0.12)) strike(s, r, ME, "threatening another housemate");
      if (c.tp >= 4 && r.chance(0.25)) strike(s, r, t, "shouting at another housemate");
      break;
    case "accuse": {
      plus(BF, 20, `${h.name} will not forget this`); me.fans = clamp(me.fans + 4);
      const cred = v[TR];
      for (const w of witnesses) bump(s, w.id, t, SU, 6 + rel(s, w.id, ME)[TR] / 8 + (receiptAbout(s, t) ? 10 : 0));
      if (isSab(s, t)) s.hm[0].sus += 4; else h.fans = clamp(h.fans + 3);
      if (out === "good") fx.push(`${h.name} looked rattled...`);
      logEv(s, `${me.name} accused ${h.name} of being a Saboteur.`, "accuse");
      tweet(s, r, "sus", t);
      void cred;
      break;
    }
    case "apologize": if (out === "good") { plus(BF, -20, "Apology accepted"); plus(F, 5); } else if (out === "meh") plus(BF, -8, "They're thinking about it"); else fx.push("Not accepted"); break;
    case "peace":
      if (out === "good") { plus(BF, -35, "Peace made"); plus(TR, 6); bump(s, ME, t, BF, -35); s.beefs = s.beefs.filter((b) => !(b.includes(ME) && b.includes(t))); }
      else if (out === "bad") plus(BF, 3, "No peace today"); else plus(BF, -10, "A truce, for now");
      break;
  }
  if (["argue", "accuse", "shade", "kiss"].includes(act) && witnesses.length) fx.push(`${witnesses.length} housemate${witnesses.length > 1 ? "s" : ""} saw that`);
  s.last = { n: s.nid + 1, who: t, act, out, lines, fx };
  s.nid += 1;
}

function receiptText(s, x) {
  const g = receiptAbout(s, x);
  if (!g) return "";
  if (/skim:/.test(g.tag)) return "took money from the till";
  if (/sab:/.test(g.tag)) return "was whispering with the other Saboteur";
  if (/kiss:/.test(g.tag)) return "was kissing somebody behind your back";
  if (/hates:/.test(g.tag)) return "was talking bad about people";
  if (/deal:/.test(g.tag)) return "has a secret deal";
  return "was doing something shady";
}

function partnerOf(s, id, except) {
  for (const sh of s.ships) {
    if (!sh.official) continue;
    if (sh.a === id && sh.b !== except) return sh.b;
    if (sh.b === id && sh.a !== except) return sh.a;
  }
  return null;
}

function inSquad(s, id) { return s.squads.some((q) => q.members.includes(ME) && q.members.includes(id)); }

function squadName(s, r) {
  const names = ["The Owambe Mafia", "Jollof Cartel", "Team No Wahala", "The Lekki Seven", "Gist Gang", "Suya Squad", "Danfo Crew"];
  const used = new Set(s.squads.map((q) => q.name));
  return r.pick(names.filter((n) => !used.has(n))) || "The Squad";
}

/** Anyone crushing on t who saw that gets jealous of the player. */
function jealousy(s, r, t, pool, amt) {
  for (const w of pool) {
    if (w.id === t || w.human) continue;
    if (rel(s, w.id, t)[RO] >= 40) { bump(s, w.id, ME, BF, amt); if (BY[w.id].jl >= 4) w.comp = clamp(w.comp - 6); }
  }
  const p = partnerOf(s, t, ME);
  if (p && p !== ME) { bump(s, p, ME, BF, amt + 6); bump(s, p, t, TR, -8); }
}

// ---------------------------------------------------------------------------
// Eavesdropping
// ---------------------------------------------------------------------------

function listen(s, r, id) {
  const sc = s.scenes.find((z) => z.id === id);
  const me = s.hm[0];
  sc.heard = true;
  s.heard = sc.lines.map((l) => ({ w: l.w, t: l.t }));
  s.heardId = sc.id;
  const A = nameOf(s, sc.a), B = nameOf(s, sc.b), X = sc.x ? nameOf(s, sc.x) : "";
  const tag = {
    flirt: `flirt:${sc.a}+${sc.b}`, kiss: `kiss:${sc.a}+${sc.b}`, argue: `beef:${sc.a}+${sc.b}`,
    gossip: `hates:${sc.a}>${sc.x} hates:${sc.b}>${sc.x}`, deal: `deal:${sc.a}+${sc.b}`,
    scheme: `sab:${sc.a} sab:${sc.b}`, bond: `bond:${sc.a}+${sc.b}`, cry: `cry:${sc.a}`,
  }[sc.k];
  const text = {
    flirt: `You caught ${A} and ${B} flirting in the ${ROOMS[sc.room].name}.`,
    kiss: `You saw ${A} and ${B} kiss.`,
    argue: `You heard ${A} and ${B} fighting.`,
    gossip: `You heard ${A} and ${B} talking bad about ${X}.`,
    deal: `You overheard ${A} and ${B} making a secret save deal.`,
    scheme: `You heard ${A} and ${B} talking about The Whisper. They're the Saboteurs!`,
    bond: `${A} and ${B} are close. Really close.`,
    cry: `${A} was crying to ${B}.`,
  }[sc.k];
  const about = [sc.a, sc.b].concat(sc.x ? [sc.x] : []);
  addGist(s, sc.k === "bond" || sc.k === "cry" ? "gist" : "receipt", text, tag, about);
  if (sc.x === ME) note(s, `They were talking about YOU.`, "bad");
  // Getting caught.
  if (PRIVATE[sc.k]) {
    const p = Math.max(BY[sc.a].ob, BY[sc.b].ob) * 0.06;
    if (r.chance(p)) {
      bump(s, sc.a, ME, TR, -10); bump(s, sc.b, ME, TR, -10);
      note(s, `${A} caught you eavesdropping!`, "bad");
      if (sc.k === "scheme") { me.sus += 10; }
    }
  }
  if (sc.k === "scheme") { logEv(s, `${me.name} overheard something they shouldn't have.`, "sab"); me.fans = clamp(me.fans + 3); }
  me.acts += 1;
}

function completeMission(s, r) {
  if (!s.mission || s.mission.done) return;
  s.mission.done = true;
  s.hm[0].coins += 300;
  note(s, `${EYE}: Secret mission complete. 300 House Coins are yours.`, "good");
  void r;
}

function buy(s, r, item) {
  const me = s.hm[0];
  if (item === "peek") {
    me.coins -= 150;
    s.peeks += 1;
    // Reveal a real Diary Room line from someone.
    const pool = aiIn(s).map((h) => h.id);
    const who = r.pick(pool);
    let text;
    if (s.saves && s.saves[who]) text = `${nameOf(s, who)} (Diary Room): "I saved ${s.saves[who].map((i) => nameOf(s, i)).join(" and ")}."`;
    else {
      const snake = pool.filter((i) => i !== who).sort((p, q) => liking(s, who, p) - liking(s, who, q))[0] || ME;
      const fav = [ME].concat(pool).filter((i) => i !== who).sort((p, q) => liking(s, who, q) - liking(s, who, p))[0];
      text = `${nameOf(s, who)} (Diary Room): "The biggest snake here is ${nameOf(s, snake)}. My favourite? ${nameOf(s, fav)}."`;
      addGist(s, "receipt", text, `hates:${who}>${snake}`, [who, snake]);
      note(s, "Sneak Peek added to your Gist Book.", "good");
      return;
    }
    addGist(s, "receipt", text, `saves:${who}`, [who]);
    note(s, "Sneak Peek added to your Gist Book.", "good");
  } else if (item === "immunity") {
    me.coins -= 800;
    me.immune = true;
    note(s, "Immunity Token bought. You cannot be nominated this week.", "good");
    logEv(s, `${me.name} bought the Immunity Token.`, "power");
  }
}
/** Named continuations and choice handlers (state stores names, never functions). */
const FN_REG = {};

// ---------------------------------------------------------------------------
// Show events. An event is a queue of items the client steps through:
//   { b: beat }     a line of dialogue (next)
//   { c: choice }   the player picks (pick)
//   { m: mini }     a mini-game (score)
//   { f, a }        server continuation, runs automatically
// ---------------------------------------------------------------------------

function openEvent(s, k, stage, title) {
  s.phase = "EV";
  s.evn = (s.evn || 0) + 1;
  s.ev = { k, n: s.evn, stage, title: title || "", q: [], i: 0, data: {} };
  s.done[s.day + ":" + k] = true;
  return s.ev;
}
function beat(s, w, t, extra) { s.ev.q.push({ b: Object.assign({ w, t }, extra || {}) }); }
function choice(s, spec) { s.ev.q.push({ c: spec }); }
function mini(s, spec) { s.ev.q.push({ m: spec }); }
function cont(s, f, a) { s.ev.q.push({ f, a: a === undefined ? null : a }); }

function playerIn(s) { return !s.hm[0].out; }

function evRun(s, r) {
  while (s.ev && s.ev.i < s.ev.q.length) {
    const it = s.ev.q[s.ev.i];
    if (it.f) { s.ev.i += 1; FN[it.f](s, r, it.a); continue; }
    // Choices and mini-games are skipped when the player has left the house.
    if ((it.c || it.m) && !playerIn(s) && !(it.c && it.c.spectator)) { s.ev.i += 1; if (it.c && it.c.auto) FN[it.c.auto](s, r, null); continue; }
    return;
  }
  if (s.ev) endEvent(s, r);
}

function endEvent(s, r) {
  s.ev = null;
  if (s.result) { s.phase = "END"; return; }
  s.phase = "ROAM";
  void r;
}

function housemateOptions(s, filter) {
  return inHouse(s).filter((h) => !h.human && (!filter || filter(h))).map((h) => ({ v: h.id, l: h.name }));
}

// ---------------------------------------------------------------------------
// Entry night
// ---------------------------------------------------------------------------

const DAPO_QUIPS = [
  "Nigeria, hold your chest!", "Somebody call the fire service!", "The drip is dripping!", "Ladies and gentlemen, the energy!",
  "Oya, give it up!", "That entrance? Premium!", "Wahala don start!", "I'm already scared!", "The house will never be the same.", "Welcome, welcome!",
];

function startEntry(s, r) {
  openEvent(s, "entry", "arena", "ENTRY NIGHT");
  beat(s, "dapo", "Good evening, Nigeria! Welcome to the premiere of WAHALA HOUSE!", { anim: "cheer" });
  beat(s, "dapo", "Eleven housemates. One mansion in Lekki. Cameras in every corner. And somewhere among them... two Saboteurs.");
  const order = r.shuffle(AI_IDS);
  // The entrances play as a montage: each one advances on its own.
  order.forEach((id, i) => {
    const c = BY[id];
    beat(s, id, c.sig, { enter: id, anim: "strut", sub: `${c.full}, ${c.age}. ${c.job} from ${c.from}.`, auto: 2400 });
    if (i % 3 === 2) beat(s, "dapo", DAPO_QUIPS[i % DAPO_QUIPS.length], { auto: 1400 });
  });
  beat(s, "dapo", `And our final housemate... ${s.hm[0].name}!`, { enter: ME, anim: "strut" });
  choice(s, {
    k: "plan", p: `${DAPO}: ${s.hm[0].name}, how do you plan to win Wahala House?`, n: 1, h: "entryPlan",
    o: [
      { v: "vibes", l: "Pure vibes. Good energy only.", sub: "Everyone warms to you" },
      { v: "strategy", l: "Strategy. Every move counts.", sub: "Respect, and a little suspicion" },
      { v: "love", l: "Love. I came to find my person.", sub: "The flirts take notice" },
      { v: "chaos", l: "Chaos. I'm here for the wahala.", sub: "Fans love it. Housemates, less" },
    ],
  });
  beat(s, "eye", "Housemates, this is Mama Eye. Welcome to your home.", { stage: "lounge" });
  beat(s, "eye", "Every room has eyes. Every whisper has ears. And every lie... has consequences.");
  cont(s, "roleReveal");
}

function entryPlan(s, r, v) {
  const me = s.hm[0];
  for (const h of aiIn(s)) {
    const c = BY[h.id];
    if (v === "vibes") bump(s, h.id, ME, F, 5);
    if (v === "strategy") { if (c.sc >= 4) bump(s, h.id, ME, TR, 5); bump(s, h.id, ME, SU, 3); }
    if (v === "love" && rel(s, h.id, ME)[AT] >= 40) bump(s, h.id, ME, RO, 7);
    if (v === "chaos") bump(s, h.id, ME, BF, 3);
  }
  if (v === "strategy") me.fans = clamp(me.fans + 3);
  if (v === "love") me.fans = clamp(me.fans + 4);
  if (v === "chaos") me.fans = clamp(me.fans + 8);
  s.plan0 = v;
  void r;
}

FN_REG.roleReveal = (s, r) => {
  const me = s.hm[0];
  if (me.role === "S") {
    const partner = s.sabs.find((x) => x !== ME);
    beat(s, "whisper", `${me.name}. Don't turn around. This is The Whisper.`, { stage: "redroom" });
    beat(s, "whisper", `You are a Saboteur. Your partner is ${nameOf(s, partner)}. Nobody else knows.`, { reveal: partner });
    beat(s, "whisper", "Drain the prize pot. Frame the loud ones. And on Friday at midnight, we strike one of them out.");
    beat(s, "whisper", "If they call you out at the Showdown and the house agrees... it's over. Smile. Blend in.");
  } else {
    beat(s, "eye", "Housemates, a warning. Two of you are Saboteurs, working for The Whisper.");
    beat(s, "eye", "They will rig tasks, plant lies and, on Friday night, strike one housemate out of this house.");
    beat(s, "eye", "Find them. Or become their next victim.");
  }
  cont(s, "entryEnd");
};

FN_REG.entryEnd = (s, r) => {
  s.min = 1260;
  for (const h of aiIn(s)) h.room = "lounge";
  placeAI(s, r);
  s.hm[0].room = "lounge";
  note(s, "Day 0. Get to know the house. Nobody is safe on Wednesday.", "info");
};

// ---------------------------------------------------------------------------
// Nightly Red Room (Saboteurs)
// ---------------------------------------------------------------------------

function nightEvent(s, r) {
  s.done[s.day + ":night"] = true;
  const me = s.hm[0];
  if (me.role === "S" && !me.out) {
    openEvent(s, "night", "redroom", "THE RED ROOM");
    emptyBeds(s, r);
    beat(s, "whisper", "Welcome to the Red Room.");
    const partner = s.sabs.find((x) => x !== ME);
    const ph = hmOf(s, partner);
    if (ph && !ph.out) beat(s, partner, redroomLine(s, r, partner));
    choice(s, {
      k: "red", p: `${WHISPER}: What is tonight's move?`, n: 1, h: "redPlan",
      o: [
        { v: "skim", l: "SKIM THE TASK", sub: "Steal more from the next wager task" },
        { v: "plant", l: "PLANT A RECEIPT", sub: "Make the house suspect someone" },
        { v: "rumor", l: "SPREAD A RUMOR", sub: "Quietly damage someone's trust" },
        { v: "rest", l: "LAY LOW", sub: "Do nothing tonight" },
      ],
    });
    return true;
  }
  sabNight(s, r);
  return false;
}

function redroomLine(s, r, partner) {
  const top = topThreat(s);
  const lines = [
    top ? `${nameOf(s, top)} is asking too many questions. We need to deal with that.` : "Nobody suspects anything. Yet.",
    "Keep your face normal tomorrow. They're watching.",
    top ? `If we frame ${nameOf(s, top)}, the whole house turns on them.` : "Let's drain the pot small small.",
  ];
  void partner;
  return r.pick(lines);
}

function topThreat(s) {
  let best = null, bv = -1;
  for (const h of inHouse(s)) {
    if (isSab(s, h.id)) continue;
    const t = threatOf(s, h.id);
    if (t > bv) { bv = t; best = h.id; }
  }
  return best;
}

FN_REG.redPlan = (s, r, v) => {
  if (v === "skim") { s.plan.skim += 2; beat(s, "whisper", "Good. When the money moves on Thursday, some of it moves to us."); }
  else if (v === "rest") beat(s, "whisper", "Patience is also a weapon.");
  else {
    choice(s, { k: "redTarget", p: v === "plant" ? `${WHISPER}: Who do we frame?` : `${WHISPER}: Who do we whisper about?`, n: 1, h: "redTarget", ctx: v,
      o: housemateOptions(s, (h) => !isSab(s, h.id)) });
  }
};

FN_REG.redTarget = (s, r, v, ctx) => {
  if (ctx === "plant") { plant(s, r, v); beat(s, "whisper", `It's done. By morning, someone will "find" something on ${nameOf(s, v)}.`); }
  else { rumor(s, r, v); beat(s, "whisper", `The whispers about ${nameOf(s, v)} have started.`); }
};

function plant(s, r, x) {
  const pool = r.shuffle(aiIn(s).filter((h) => !isSab(s, h.id) && h.id !== x));
  for (const w of pool.slice(0, 2)) { bump(s, w.id, x, SU, 18 + r.int(10)); remember(s, w.id, { k: "planted", x }); }
  if (x === ME) s.hm[0].sus += 3;
}
function rumor(s, r, x) {
  const pool = r.shuffle(aiIn(s).filter((h) => h.id !== x));
  for (const w of pool.slice(0, 4)) { bump(s, w.id, x, TR, -6); bump(s, w.id, x, SU, 8); }
}

/** Light sleepers notice empty beds while the Saboteurs meet. */
function emptyBeds(s, r) {
  for (const sab of s.sabs) {
    const sh = hmOf(s, sab);
    if (!sh || sh.out) continue;
    for (const w of aiIn(s)) {
      if (isSab(s, w.id) || BY[w.id].ob < 4) continue;
      if (r.chance(0.09)) { bump(s, w.id, sab, SU, 10); remember(s, w.id, { k: "empty_bed", x: sab }); if (sab === ME) s.hm[0].sus += 2; }
    }
  }
}

/** AI Saboteurs act at night when the player is not one of them. */
function sabNight(s, r) {
  emptyBeds(s, r);
  const alive = s.sabs.filter((x) => x !== ME && !hmOf(s, x).out);
  if (!alive.length) return;
  const top = topThreat(s);
  const tv = top ? threatOf(s, top) : 0;
  if (s.day >= 1 && s.day <= 3 && r.chance(0.5)) s.plan.skim += 1;
  else if (top && tv > 35 && r.chance(0.6)) plant(s, r, top);
  else if (top && r.chance(0.5)) rumor(s, r, top);
}

// ---------------------------------------------------------------------------
// Monday: Head of House game (JOLLOF RUSH)
// ---------------------------------------------------------------------------

function startHoh(s, r) {
  openEvent(s, "hoh", "kitchen", "HEAD OF HOUSE: JOLLOF RUSH");
  gatherAll(s, "kitchen");
  beat(s, "eye", "Housemates, please gather in the kitchen. It is time for the Head of House game.");
  beat(s, "eye", "JOLLOF RUSH. Ninety seconds. Orders will come in fast. Cook, plate and serve before anything burns.");
  beat(s, "eye", "The highest score becomes Head of House: immune from nomination, the HoH Lounge, a Tenant of your choice, and the Veto.");
  mini(s, { g: "jollof", h: "hohScore", secs: 90, hard: s.hm[0].comp < 30 });
  cont(s, "hohResult");
}

function aiJollof(s, r, h) { return 1100 + BY[h.id].ck * 300 + r.int(1000) - (h.comp < 40 ? 250 : 0); }

FN_REG.hohScore = (s, r, v) => { s.ev.data.my = v; };
FN_REG.hohResult = (s, r) => {
  const board = inHouse(s).map((h) => ({ id: h.id, sc: h.human ? (s.ev.data.my || 0) : aiJollof(s, r, h) }));
  board.sort((a, b) => b.sc - a.sc);
  s.ev.data.board = board;
  const win = board[0].id;
  s.hoh = win;
  const wh = hmOf(s, win);
  wh.fans = clamp(wh.fans + 6);
  wh.coins += 300;
  beat(s, "eye", "The pots are down. Here are your scores.", { board: board.slice(0, 11) });
  beat(s, "eye", `${nameOf(s, win)}, you are the new Head of House!`, { focus: win, anim: "cheer" });
  logEv(s, `${nameOf(s, win)} won Head of House with ${board[0].sc} points.`, "power");
  tweet(s, r, "hoh", win);
  if (win === ME) {
    choice(s, { k: "tenant", p: `${EYE}: Head of House, choose a Tenant to share the HoH Lounge with you.`, n: 1, h: "pickTenant", o: housemateOptions(s) });
  } else {
    const t = inHouseIds(s).filter((x) => x !== win).sort((a, b) => liking(s, win, b) - liking(s, win, a))[0];
    FN_REG.pickTenant(s, r, t);
    beat(s, win, t === ME ? `I choose ${nameOf(s, t)}. Come and enjoy the soft life with me.` : `My Tenant is ${nameOf(s, t)}. Obviously.`, { focus: t });
  }
};
FN_REG.pickTenant = (s, r, v) => {
  s.tenant = v;
  mutual(s, s.hoh, v, F, 8);
  // Whoever thought they were the HoH's favourite takes it personally.
  for (const h of aiIn(s)) {
    if (h.id === s.hoh || h.id === v) continue;
    if (rel(s, h.id, s.hoh)[F] >= 45) { bump(s, h.id, v, BF, 10); h.comp = clamp(h.comp - 4); }
  }
  if (s.hoh === ME) bump(s, v, ME, F, 10);
  logEv(s, `${nameOf(s, v)} is the Tenant.`, "power");
};

function gatherAll(s, room) {
  for (const h of inHouse(s)) { h.room = room; h.sc = null; h.with = null; h.act = "idle"; }
  s.scenes = [];
}

// ---------------------------------------------------------------------------
// Tuesday: wager task announced, Diary Room session
// ---------------------------------------------------------------------------

function startWager(s, r) {
  openEvent(s, "wager", "lounge", "WAGER TASK: BALOGUN HUSTLE");
  gatherAll(s, "lounge");
  beat(s, "eye", "Housemates, gather in the lounge. This week's wager task is BALOGUN HUSTLE.");
  beat(s, "eye", "On Thursday you will run market stalls in two teams, ANKARA and ASO-OKE. Buy, price and haggle.");
  beat(s, "eye", `Make ${naira(10000000)} together and I will add a ${naira(5000000)} bonus to the prize pot. Fall short, and the pot loses ${naira(3000000)}.`);
  beat(s, "eye", `Head of House, ${nameOf(s, s.hoh)}, split the house into two teams.`, { focus: s.hoh });
  if (s.hoh === ME && playerIn(s)) {
    choice(s, { k: "team", p: "Pick four housemates for your team, ANKARA.", n: 4, h: "pickTeam", o: housemateOptions(s) });
  } else cont(s, "pickTeam", null);
  cont(s, "wagerTeams");
}

FN_REG.pickTeam = (s, r, v) => {
  const hoh = s.hoh;
  let mine;
  if (Array.isArray(v)) mine = v;
  else mine = inHouseIds(s).filter((x) => x !== hoh).sort((a, b) => liking(s, hoh, b) - liking(s, hoh, a)).slice(0, 4);
  const A = [hoh].concat(mine);
  const B = inHouseIds(s).filter((x) => !A.includes(x));
  s.teams = { ANKARA: A, "ASO-OKE": B };
};
FN_REG.wagerTeams = (s, r) => {
  beat(s, "eye", `TEAM ANKARA: ${s.teams.ANKARA.map((x) => nameOf(s, x)).join(", ")}.`, { team: "ANKARA" });
  beat(s, "eye", `TEAM ASO-OKE: ${s.teams["ASO-OKE"].map((x) => nameOf(s, x)).join(", ")}.`, { team: "ASO-OKE" });
  beat(s, "eye", "Plan well. And watch your tills. Money has a way of... disappearing.");
  void r;
};

function startDiary(s, r) {
  openEvent(s, "diary", "diary", "DIARY ROOM");
  const me = s.hm[0];
  beat(s, "eye", `${me.name}, please come to the Diary Room.`);
  beat(s, "eye", "Sit. Relax. Mama Eye is listening.");
  choice(s, { k: "fav", p: `${EYE}: Who is your favourite housemate so far?`, n: 1, h: "diaryFav", o: housemateOptions(s) });
  choice(s, { k: "snake", p: `${EYE}: And who is the biggest snake in this house?`, n: 1, h: "diarySnake", o: housemateOptions(s) });
  choice(s, {
    k: "mood", p: `${EYE}: How are you really feeling?`, n: 1, h: "diaryMood",
    o: [{ v: "focused", l: "Focused. I'm here to win." }, { v: "heart", l: "Honestly? My heart is involved." }, { v: "wahala", l: "Ready for wahala. Bring it." }, { v: "home", l: "I miss home. It's hard." }],
  });
  cont(s, "diaryMission");
}
FN_REG.diaryFav = (s, r, v) => { s.diary.fav = v; bump(s, v, ME, F, 4); };
FN_REG.diarySnake = (s, r, v) => { s.diary.snake = v; };
FN_REG.diaryMood = (s, r, v) => {
  const me = s.hm[0];
  s.diary.mood = v;
  if (v === "focused") me.fans = clamp(me.fans + 2);
  if (v === "heart") me.fans = clamp(me.fans + 4);
  if (v === "wahala") me.fans = clamp(me.fans + 5);
  if (v === "home") { me.fans = clamp(me.fans + 3); me.comp = clamp(me.comp + 10); }
  beat(s, "eye", "Thank you. Nigeria will be watching.");
};
FN_REG.diaryMission = (s, r) => {
  // A secret mission from Mama Eye.
  const ai = aiIn(s).map((h) => h.id);
  const kinds = ["fight", "laugh", "gift", "kiss"];
  const k = r.pick(kinds);
  let m;
  if (k === "fight") {
    let best = null, bv = -1;
    for (const a of ai) for (const b of ai) if (a < b) { const v = rel(s, a, b)[BF] + rel(s, b, a)[BF] + r.int(20); if (v > bv) { bv = v; best = [a, b]; } }
    m = { k, pair: best, text: `Get ${nameOf(s, best[0])} and ${nameOf(s, best[1])} to have a fight before Thursday midnight.` };
  } else if (k === "laugh") { const w = r.pick(ai); m = { k, who: w, text: `Make ${nameOf(s, w)} laugh twice before Thursday midnight.` }; }
  else if (k === "gift") { const w = r.pick(ai); m = { k, who: w, text: `Give ${nameOf(s, w)} a gift before Thursday midnight.` }; }
  else m = { k, text: "Share a kiss with any housemate before Thursday midnight." };
  s.ev.data.mission = m;
  choice(s, { k: "mission", p: `${EYE}: One more thing. A secret mission, for 300 House Coins. ${m.text}`, n: 1, h: "missionPick", o: [{ v: "yes", l: "ACCEPT THE MISSION" }, { v: "no", l: "DECLINE" }] });
};
FN_REG.missionPick = (s, r, v) => {
  if (v === "yes") { s.mission = Object.assign({ done: false, until: 4 }, s.ev.data.mission); addGist(s, "gist", `Secret mission: ${s.mission.text}`, "mission", []); beat(s, "eye", "Good. Tell no one."); }
  else beat(s, "eye", "As you wish.");
};

// ---------------------------------------------------------------------------
// Wednesday: nominations
// ---------------------------------------------------------------------------

function startNoms(s, r) {
  openEvent(s, "noms", "diary", "NOMINATIONS");
  beat(s, "eye", "Housemates, it is nomination day.");
  beat(s, "eye", "One by one, in the Diary Room, you will SAVE two housemates. The four with the fewest saves are up for eviction.");
  if (s.hoh) beat(s, "eye", `${nameOf(s, s.hoh)} is Head of House and cannot be nominated.`);
  const opts = inHouse(s).filter((h) => !h.human && h.id !== s.hoh).map((h) => ({ v: h.id, l: h.name, sub: promiseSub(s, h.id) }));
  choice(s, { k: "saves", p: `${EYE}: ${s.hm[0].name}, who do you want to SAVE this week? Pick two.`, n: 2, h: "noms", o: opts, auto: "nomsAuto" });
  cont(s, "nomsDone");
}
function promiseSub(s, id) { return s.prom[id + ">" + ME] ? "Promised to save you" : inSquad(s, id) ? "Squad" : ""; }

FN_REG.nomsAuto = (s, r) => computeNoms(s, r, null);
FN_REG.noms = (s, r, v) => computeNoms(s, r, v);
FN_REG.nomsDone = (s, r) => {
  beat(s, "eye", "Thank you. Nominations are closed. The results will be revealed tonight at eight.");
  void r;
};

function aiSaves(s, r, id) {
  const pool = inHouseIds(s).filter((x) => x !== id && x !== s.hoh);
  const score = (x) => {
    let v = liking(s, id, x) + r.int(20);
    if (s.prom[id + ">" + x]) v += 28;
    if (s.squads.some((q) => q.members.includes(id) && q.members.includes(x))) v += 25;
    if (isSab(s, id) && isSab(s, x)) v += 40;
    if (isSab(s, id)) v -= threatOf(s, x) * 0.3;
    v += hmOf(s, x).fans * 0.08;
    return v;
  };
  return pool.map((x) => [x, score(x)]).sort((a, b) => b[1] - a[1]).slice(0, 2).map((z) => z[0]);
}

function computeNoms(s, r, mine) {
  const saves = {};
  const tally = {};
  for (const id of inHouseIds(s)) tally[id] = 0;
  for (const h of inHouse(s)) {
    const pick = h.human ? (mine || aiSaves(s, r, ME)) : aiSaves(s, r, h.id);
    saves[h.id] = pick;
    for (const x of pick) tally[x] += 1;
  }
  s.saves = saves;
  s.tally = tally;
  const elig = inHouse(s).filter((h) => h.id !== s.hoh && !h.immune);
  const auto = elig.filter((h) => h.strikes >= 3).map((h) => h.id);
  const rest = elig.filter((h) => !auto.includes(h.id)).map((h) => ({ id: h.id, t: tally[h.id], f: h.fans + r.f() }));
  rest.sort((a, b) => a.t - b.t || a.f - b.f);
  s.noms = auto.concat(rest.map((z) => z.id)).slice(0, 4);
  // Broken promises are remembered.
  for (const h of inHouse(s)) {
    for (const [k, v] of Object.entries(s.prom)) {
      if (v !== "save") continue;
      const [a, b] = k.split(">");
      if (a === h.id && !saves[a].includes(b) && b !== s.hoh) remember(s, b, { k: "broke", x: a });
    }
  }
  // The player learns who their own saves were, nothing else.
  if (mine) addGist(s, "gist", `You saved ${mine.map((x) => nameOf(s, x)).join(" and ")}.`, "mysaves", mine.slice());
}

function startNomReveal(s, r) {
  openEvent(s, "nomreveal", "lounge", "NOMINATIONS REVEALED");
  gatherAll(s, "lounge");
  beat(s, "eye", "Housemates, please gather in the lounge.");
  beat(s, "eye", "The following housemates are up for eviction this week.");
  for (const id of s.noms) {
    const h = hmOf(s, id);
    h.comp = clamp(h.comp - 18);
    h.fans = clamp(h.fans + 3);
    // Nominees decide who did this to them.
    if (id !== ME) {
      const blame = inHouseIds(s).filter((x) => x !== id).sort((p, q) => liking(s, id, p) - liking(s, id, q))[0];
      if (blame) bump(s, id, blame, BF, 12);
    }
    beat(s, "eye", `${nameOf(s, id)}.`, { focus: id, anim: "shock" });
    if (id !== ME && r.chance(0.7)) beat(s, id, r.pick(["Wow. Okay. I see how it is.", "I'm not surprised. I know who did this.", "It's fine. Nigeria will save me.", "Chai! After everything?"]));
  }
  if (s.noms.includes(ME)) { beat(s, "sys", "You're nominated. Lobby the Head of House for the Veto, win fans, and pray."); tweet(s, r, "noms", ME); }
  else beat(s, "sys", "You're safe. For now. The nominees will be lobbying hard tomorrow.");
  beat(s, "eye", `Tomorrow morning, the Head of House, ${nameOf(s, s.hoh)}, will decide whether to use the Veto.`);
  // Broken promises to the player come to light.
  for (const [k, v] of Object.entries(s.prom)) {
    const [a, b] = k.split(">");
    if (b === ME && v === "save" && s.saves && s.saves[a] && !s.saves[a].includes(ME)) {
      addGist(s, "gist", `${nameOf(s, a)} promised to save you. You'll find out on Sunday if they kept it.`, "promise:" + a, [a]);
    }
  }
  logEv(s, `Nominated: ${s.noms.map((x) => nameOf(s, x)).join(", ")}.`, "noms");
}

// ---------------------------------------------------------------------------
// Thursday: Veto, then the wager task
// ---------------------------------------------------------------------------

function startVeto(s, r) {
  openEvent(s, "veto", "lounge", "THE VETO");
  gatherAll(s, "lounge");
  beat(s, "eye", `Head of House, ${nameOf(s, s.hoh)}, will you use your Veto Power?`, { focus: s.hoh });
  if (s.hoh === ME && playerIn(s)) {
    choice(s, { k: "veto", p: "Use the Veto to save one nominee?", n: 1, h: "vetoPick", o: s.noms.map((x) => ({ v: x, l: `SAVE ${nameOf(s, x)}` })).concat([{ v: "none", l: "KEEP THE NOMINATIONS" }]) });
  } else cont(s, "vetoAI");
}

FN_REG.vetoPick = (s, r, v) => {
  if (v === "none") { beat(s, ME, "I'm keeping the nominations the same."); return; }
  s.vetoed = v;
  s.noms = s.noms.filter((x) => x !== v);
  bump(s, v, ME, F, 18); bump(s, v, ME, TR, 12);
  beat(s, ME, `I'm using my Veto to save ${nameOf(s, v)}.`, { focus: v });
  choice(s, { k: "repl", p: "Name a replacement nominee.", n: 1, h: "vetoRepl", o: replacementOptions(s) });
};
function replacementOptions(s) { return inHouse(s).filter((h) => !h.human && h.id !== s.hoh && !s.noms.includes(h.id) && h.id !== s.vetoed && !h.immune).map((h) => ({ v: h.id, l: h.name })); }
FN_REG.vetoRepl = (s, r, v) => {
  s.noms.push(v);
  bump(s, v, ME, BF, 25);
  hmOf(s, v).comp = clamp(hmOf(s, v).comp - 15);
  beat(s, v, "Me?! You'll regret this.", { focus: v, anim: "angry" });
  logEv(s, `${s.hm[0].name} vetoed ${nameOf(s, s.vetoed)} and nominated ${nameOf(s, v)}.`, "power");
};
FN_REG.vetoAI = (s, r) => {
  const hoh = s.hoh;
  const hh = hmOf(s, hoh);
  if (!hh || hh.out) { beat(s, "eye", "There is no Head of House to use the Veto. The nominations stand."); return; }
  const best = s.noms.map((x) => [x, liking(s, hoh, x) + (s.prom[hoh + ">" + x] ? 30 : 0) + (x === ME && s.prom[hoh + ">" + ME] ? 10 : 0)]).sort((a, b) => b[1] - a[1])[0];
  if (best && best[1] >= 55) {
    const v = best[0];
    s.vetoed = v;
    s.noms = s.noms.filter((x) => x !== v);
    const cands = inHouseIds(s).filter((x) => x !== hoh && !s.noms.includes(x) && x !== v && !hmOf(s, x).immune);
    const repl = cands.sort((a, b) => liking(s, hoh, a) - liking(s, hoh, b))[0];
    s.noms.push(repl);
    bump(s, v, hoh, F, 18); bump(s, repl, hoh, BF, 25);
    hmOf(s, repl).comp = clamp(hmOf(s, repl).comp - 15);
    beat(s, hoh, `I'm using my Veto to save ${nameOf(s, v)}.`, { focus: v });
    beat(s, hoh, `And in their place, I nominate... ${nameOf(s, repl)}.`, { focus: repl, anim: "point" });
    if (repl !== ME) beat(s, repl, r.pick(["Wow. Just wow.", "So this is how you play? Okay.", "I'll see you at the Showdown."]), { anim: "angry" });
    else beat(s, "sys", "You've been put up as the replacement nominee. Time to fight for your life.");
    logEv(s, `${nameOf(s, hoh)} vetoed ${nameOf(s, v)} and nominated ${nameOf(s, repl)}.`, "power");
  } else {
    beat(s, hoh, "I won't be using the Veto. The nominations stay.");
  }
};

function startHustle(s, r) {
  openEvent(s, "hustle", "arena", "BALOGUN HUSTLE");
  gatherAll(s, "arena");
  if (!s.teams) FN_REG.pickTeam(s, r, null);
  const myTeam = s.teams.ANKARA.includes(ME) ? "ANKARA" : "ASO-OKE";
  beat(s, "eye", "Housemates, the market is open! BALOGUN HUSTLE starts now.");
  beat(s, "eye", "Three rounds. Buy stock, set your price, and haggle with every customer. Every naira counts.");
  if (s.hm[0].role === "S") beat(s, "whisper", "The till is right there. Nobody counts every note...", { whisper: 1 });
  mini(s, { g: "hustle", h: "hustleScore", team: myTeam, mates: s.teams[myTeam].filter((x) => x !== ME), sab: s.hm[0].role === "S", hard: s.hm[0].comp < 30 });
  cont(s, "hustleEnd");
}
FN_REG.hustleScore = (s, r, v) => { s.ev.data.my = v; };
FN_REG.hustleEnd = (s, r) => {
  const my = s.ev.data.my || { profit: 0, skim: 0 };
  const res = { ANKARA: 0, "ASO-OKE": 0, skim: 0, skimmers: [] };
  for (const team of ["ANKARA", "ASO-OKE"]) {
    for (const id of s.teams[team]) {
      const h = hmOf(s, id);
      if (!h || h.out) continue;
      if (id === ME) { res[team] += my.profit; if (my.skim) { res.skim += my.skim; res.skimmers.push(ME); } continue; }
      res[team] += BY[id].bz * 280000 + r.int(500000) - (h.comp < 35 ? 200000 : 0);
      if (isSab(s, id)) {
        const amt = 200000 + r.int(400000) + s.plan.skim * 150000;
        res.skim += amt;
        res.skimmers.push(id);
        // Who saw it?
        for (const w of s.teams[team]) {
          if (w === id || isSab(s, w)) continue;
          if (w === ME) { if (r.chance(0.35)) { addGist(s, "receipt", `During the hustle you saw ${nameOf(s, id)} slip cash from the till into their pocket.`, `skim:${id}`, [id]); note(s, `You saw ${nameOf(s, id)} pocket money from the till!`, "good"); } }
          else if (r.chance(BY[w].ob * 0.09)) { remember(s, w, { k: "saw_skim", x: id }); bump(s, w, id, SU, 30); }
        }
      }
    }
  }
  if (my.skim) {
    for (const w of s.teams[s.teams.ANKARA.includes(ME) ? "ANKARA" : "ASO-OKE"]) {
      if (w === ME || isSab(s, w)) continue;
      if (r.chance(BY[w].ob * 0.05 + my.skim / 8000000)) { remember(s, w, { k: "saw_skim", x: ME }); bump(s, w, ME, SU, 30); s.hm[0].sus += 6; }
    }
  }
  s.plan.skim = 0;
  s.wager = res;
  beat(s, "eye", "Time! Stalls closed. Put your money in the box. Results tomorrow at eleven.");
};

// ---------------------------------------------------------------------------
// Friday: wager results, Midnight Strike
// ---------------------------------------------------------------------------

function startWresult(s, r) {
  openEvent(s, "wresult", "lounge", "WAGER RESULTS");
  gatherAll(s, "lounge");
  const w = s.wager || { ANKARA: 0, "ASO-OKE": 0, skim: 0 };
  const a = Math.max(0, w.ANKARA), b = Math.max(0, w["ASO-OKE"]);
  const gross = a + b;
  const net = Math.max(0, gross - w.skim);
  beat(s, "eye", "Housemates, the wager results are in.");
  beat(s, "eye", `Team ANKARA made ${naira(a)}. Team ASO-OKE made ${naira(b)}.`, { ledger: { ANKARA: a, "ASO-OKE": b } });
  if (w.skim > 0) beat(s, "eye", `But when we counted the boxes... ${naira(w.skim)} was missing.`, { anim: "shock", missing: w.skim });
  const win = net >= 10000000;
  if (win) { s.pot += net + 5000000; beat(s, "eye", `Total: ${naira(net)}. You hit the target! The prize pot grows by ${naira(net + 5000000)}.`, { anim: "cheer" }); }
  else { s.pot = Math.max(0, s.pot + net - 3000000); beat(s, "eye", `Total: ${naira(net)}. You missed the target. After the penalty, the prize pot stands at ${naira(s.pot)}.`); }
  beat(s, "eye", `PRIZE POT: ${naira(s.pot)}.`);
  logEv(s, `Wager task: ${naira(net)} banked${w.skim ? `, ${naira(w.skim)} missing` : ""}. Pot: ${naira(s.pot)}.`, "wager");
  const myTeam = s.teams && s.teams.ANKARA.includes(ME) ? "ANKARA" : "ASO-OKE";
  if ((myTeam === "ANKARA" ? a >= b : b >= a) && playerIn(s)) { s.hm[0].coins += 150; note(s, "Your team won the hustle. +150 coins.", "good"); }
  if (w.skim > 0) {
    // Everybody gets a little paranoid.
    for (const h of aiIn(s)) for (const x of inHouseIds(s)) if (x !== h.id && r.chance(0.2)) bump(s, h.id, x, SU, 4);
    beat(s, "eye", "Somebody in this house is stealing from all of you. Think about that.");
  }
}

function strikeEvent(s, r) {
  s.done[s.day + ":strike"] = true;
  const me = s.hm[0];
  if (me.role === "S" && !me.out) {
    openEvent(s, "strike", "redroom", "THE MIDNIGHT STRIKE");
    beat(s, "whisper", "It is midnight. It is time.");
    const top = topThreat(s);
    const partner = s.sabs.find((x) => x !== ME);
    if (partner && !hmOf(s, partner).out && top) beat(s, partner, `I say ${nameOf(s, top)}. They're too close to the truth.`);
    choice(s, { k: "strike", p: `${WHISPER}: Choose who will not see Saturday.`, n: 1, h: "strikePick", o: housemateOptions(s, (h) => !isSab(s, h.id)) });
    return true;
  }
  const alive = s.sabs.filter((x) => !hmOf(s, x).out);
  if (alive.length) s.struck = topThreat(s);
  return false;
}
FN_REG.strikePick = (s, r, v) => { s.struck = v; beat(s, "whisper", `${nameOf(s, v)}. Sleep well. They won't.`); };

// ---------------------------------------------------------------------------
// Saturday: the strike is revealed, the party
// ---------------------------------------------------------------------------

function startStrikeReveal(s, r) {
  openEvent(s, "strikereveal", "kitchen", "THE MORNING AFTER");
  gatherAll(s, "kitchen");
  const x = s.struck;
  if (!x || !hmOf(s, x) || hmOf(s, x).out) { beat(s, "eye", "Housemates... the Saboteurs did not strike last night. Enjoy your breakfast."); return; }
  const h = hmOf(s, x);
  beat(s, "eye", "Housemates... please gather in the kitchen.");
  beat(s, "eye", "Last night, the Saboteurs struck.");
  beat(s, "eye", `${h.name} has been struck from the house.`, { focus: x, anim: "shock", out: x });
  h.out = { how: "struck", d: s.day };
  s.noms = s.noms.filter((z) => z !== x);
  if (s.hoh === x) beat(s, "eye", "The Head of House is gone. The house is without a leader.");
  logEv(s, `${h.name} was struck by the Saboteurs.`, "strike");
  tweet(s, r, "strike", x);
  for (const o of aiIn(s)) {
    const v = rel(s, o.id, x);
    if (v[F] >= 50 || v[RO] >= 40) { o.comp = clamp(o.comp - 14); }
    // The house turns on whoever had beef with the struck housemate.
    for (const y of inHouseIds(s)) if (y !== o.id && rel(s, y, x)[BF] >= 45 && r.chance(0.5)) bump(s, o.id, y, SU, 8);
  }
  if (x === ME) {
    beat(s, "sys", "YOU HAVE BEEN STRUCK. The Saboteurs got you. You can watch the rest of the week.");
    s.hm[0].room = "out";
  } else {
    const friend = aiIn(s).sort((a, b) => rel(s, b.id, x)[F] - rel(s, a.id, x)[F])[0];
    if (friend) beat(s, friend.id, r.pick([`No! Not ${h.name}! Whoever did this, I will find you.`, `${h.name} was the realest person here. This is personal now.`, "I can't breathe. Who is doing this?"]), { anim: "sad" });
  }
}

function startParty(s, r) {
  openEvent(s, "party", "arena", "SATURDAY NIGHT: OWAMBE");
  gatherAll(s, "arena");
  beat(s, "eye", "Housemates, it's Saturday night. The DJ is here. The zobo is cold. OWAMBE!", { anim: "dance" });
  if (playerIn(s)) {
    choice(s, {
      k: "dancemode", p: "The DANCE-OFF is starting. How are you playing it?", n: 1, h: "danceMode",
      o: [{ v: "battle", l: "BATTLE A RIVAL", sub: "Win and your fans explode" }, { v: "crush", l: "DANCE WITH YOUR CRUSH", sub: "Romance, in front of everyone" }, { v: "vibe", l: "JUST VIBE", sub: "Solo, no pressure" }],
    });
  }
  cont(s, "partyDrama");
}
FN_REG.danceMode = (s, r, v) => {
  s.ev.data.mode = v;
  if (v === "vibe") mini(s, { g: "dance", h: "danceScore", mode: v, vs: null, hard: s.hm[0].comp < 30 });
  else choice(s, { k: "dancewith", p: v === "battle" ? "Who are you battling?" : "Who are you dancing with?", n: 1, h: "danceWith", o: housemateOptions(s) });
};
FN_REG.danceWith = (s, r, v) => {
  s.ev.data.vs = v;
  const rival = hmOf(s, v);
  s.ev.data.rival = 50 + BY[v].dn * 7 + r.int(15) - (rival.comp < 35 ? 8 : 0);
  mini(s, { g: "dance", h: "danceScore", mode: s.ev.data.mode, vs: v, rival: s.ev.data.rival, hard: s.hm[0].comp < 30 });
};
FN_REG.danceScore = (s, r, v) => {
  const me = s.hm[0];
  const d = s.ev.data;
  const sc = v;
  if (d.mode === "vibe") { me.fans = clamp(me.fans + Math.round(sc / 20)); me.comp = clamp(me.comp + 10); beat(s, "sys", `You danced your heart out. Accuracy ${sc}%. Fans +${Math.round(sc / 20)}.`); }
  else if (d.mode === "battle") {
    const win = sc >= d.rival;
    const vs = d.vs;
    if (win) { me.fans = clamp(me.fans + 10); hmOf(s, vs).comp = clamp(hmOf(s, vs).comp - 10); bump(s, vs, ME, BF, 10); beat(s, vs, "Okay, okay! You won. Don't let it enter your head.", { anim: "angry" }); beat(s, "sys", `You won the battle ${sc}% to ${d.rival}%! Fans +10.`); logEv(s, `${me.name} won a dance battle against ${nameOf(s, vs)}.`, "party"); }
    else { me.fans = clamp(me.fans + 3); beat(s, vs, "Sit down! This floor is mine!", { anim: "dance" }); beat(s, "sys", `${nameOf(s, vs)} won ${d.rival}% to ${sc}%. Fans +3 for trying.`); hmOf(s, vs).fans = clamp(hmOf(s, vs).fans + 5); }
  } else {
    const vs = d.vs;
    const good = sc >= 55;
    bump(s, vs, ME, RO, good ? 12 : 4); bump(s, vs, ME, F, 5); me.fans = clamp(me.fans + (good ? 7 : 3));
    jealousy(s, r, vs, aiIn(s), 10);
    beat(s, vs, good ? "You can really move. I'm impressed." : "Hahaha! You stepped on my foot. But it was cute.", { anim: "dance" });
    if (good && rel(s, vs, ME)[RO] >= 60) { const sh = makeShip(s, r, ME, vs, true); beat(s, "sys", `The whole house is screaming. #${sh.name} is trending.`); }
  }
};
FN_REG.partyDrama = (s, r) => {
  const ai = aiIn(s);
  let n = 0;
  // Ships get closer at parties.
  for (const sh of s.ships.slice()) {
    if (n >= 2) break;
    if (sh.a === ME || sh.b === ME) continue;
    const A = hmOf(s, sh.a), B = hmOf(s, sh.b);
    if (!A || !B || A.out || B.out) continue;
    if (rel(s, sh.a, sh.b)[RO] >= 55 && r.chance(0.7)) {
      mutual(s, sh.a, sh.b, RO, 8); makeShip(s, r, sh.a, sh.b, true);
      beat(s, "sys", `${A.name} and ${B.name} are slow-dancing. Then... they kiss. #${sh.name}`, { focus: sh.a, anim: "kiss", pair: [sh.a, sh.b] });
      tweet(s, r, "kiss", sh.a, sh.b, sh.name);
      n++;
    }
  }
  // Jealousy or beef boils over.
  let best = null, bv = 60;
  for (const a of ai) for (const b of ai) if (a.id < b.id) { const v = rel(s, a.id, b.id)[BF] + rel(s, b.id, a.id)[BF]; if (v > bv) { bv = v; best = [a.id, b.id]; } }
  if (best) {
    const [a, b] = best;
    beat(s, a, r.pick(["You've been looking for my trouble all week!", "Say that again! Say it!", "Don't dance near me!"]), { anim: "angry", pair: [a, b] });
    beat(s, b, r.pick(["Abeg, who is even looking at you?", "Go and sit down!", "Security! Mama Eye!"]), { anim: "angry" });
    mutual(s, a, b, BF, 10);
    for (const id of [a, b]) { const h = hmOf(s, id); if (BY[id].tp >= 4 && r.chance(0.5)) { strike(s, r, id, "fighting at the party"); beat(s, "eye", `${h.name}, that is a strike.`); } }
    logEv(s, `${nameOf(s, a)} and ${nameOf(s, b)} clashed at the party.`, "fight");
    tweet(s, r, "fight", a, b);
  }
  // Kunle's wild side, for the fans.
  const k = hmOf(s, "kunle");
  if (k && !k.out && r.chance(0.5)) { beat(s, "kunle", "Pastor K is off duty tonight! DJ, run it back!", { anim: "dance" }); k.fans = clamp(k.fans + 6); }
  beat(s, "eye", "Lights out, housemates. Tomorrow is the Live Eviction Show.");
};

// ---------------------------------------------------------------------------
// Sunday: Live Eviction Show and THE SHOWDOWN
// ---------------------------------------------------------------------------

function startLive(s, r) {
  openEvent(s, "live", "arena", "LIVE EVICTION SHOW");
  gatherAll(s, "arena");
  const me = s.hm[0];
  beat(s, "dapo", "Good evening, Nigeria! This is the LIVE EVICTION SHOW!", { anim: "cheer" });
  const hi = s.log.filter((l) => ["kiss", "fight", "strike", "power", "lie", "accuse"].includes(l.k)).slice(-3);
  if (hi.length) { beat(s, "dapo", "What. A. Week. Let's recap."); for (const l of hi) beat(s, "dapo", l.t); }
  if (s.diary.snake && playerIn(s) && !hmOf(s, s.diary.snake).out) {
    const sn = s.diary.snake;
    beat(s, "dapo", `${me.name}. In the Diary Room, you called ${nameOf(s, sn)} "the biggest snake in the house".`, { focus: ME });
    beat(s, sn, r.pick(["Me?! A snake?! Say it to my face!", "Wow. Okay. I'll remember this.", "Hahaha. Interesting. Very interesting."]), { anim: "angry" });
    bump(s, sn, ME, BF, 25); me.fans = clamp(me.fans + 6);
  }
  const noms = s.noms.filter((x) => !hmOf(s, x).out);
  if (noms.length < 2) { beat(s, "dapo", "With fewer than two nominees standing, there will be no eviction tonight!"); cont(s, "showdown"); return; }
  beat(s, "dapo", `This week's nominees: ${noms.map((x) => nameOf(s, x)).join(", ")}.`);
  beat(s, "dapo", "Nigeria has voted. Two of you will face the housemates' vote.");
  const ranked = noms.map((x) => ({ x, v: hmOf(s, x).fans + r.int(12) })).sort((a, b) => a.v - b.v);
  const bottom = ranked.slice(0, 2).map((z) => z.x);
  s.bottom = bottom;
  for (const z of ranked.slice(2).reverse()) beat(s, "dapo", `${nameOf(s, z.x)}... you are SAFE!`, { focus: z.x, anim: "cheer" });
  beat(s, "dapo", `THE BOTTOM TWO: ${nameOf(s, bottom[0])} and ${nameOf(s, bottom[1])}.`, { focus: bottom[0], pair: bottom });
  beat(s, "dapo", "Housemates, please cast your eviction vote in the Diary Room.");
  if (playerIn(s) && !bottom.includes(ME)) {
    choice(s, { k: "evict", p: "Who do you vote to EVICT?", n: 1, h: "evictVote", o: bottom.map((x) => ({ v: x, l: `EVICT ${nameOf(s, x)}` })), auto: "evictAuto" });
  } else cont(s, "evictAuto");
}

FN_REG.evictVote = (s, r, v) => tallyEvict(s, r, v);
FN_REG.evictAuto = (s, r) => tallyEvict(s, r, null);

function tallyEvict(s, r, mine) {
  const [a, b] = s.bottom;
  const votes = { [a]: 0, [b]: 0 };
  const who = {};
  for (const h of inHouse(s)) {
    if (h.id === a || h.id === b) continue;
    let v;
    if (h.human) { if (!mine) continue; v = mine; }
    else {
      let la = liking(s, h.id, a) + r.int(12), lb = liking(s, h.id, b) + r.int(12);
      if (isSab(s, h.id)) { la -= threatOf(s, a) * 0.4; lb -= threatOf(s, b) * 0.4; if (isSab(s, a)) la += 80; if (isSab(s, b)) lb += 80; }
      v = la < lb ? a : b;
    }
    votes[v] += 1; who[h.id] = v;
  }
  let out = votes[a] > votes[b] ? a : votes[b] > votes[a] ? b : null;
  if (!out) {
    const hoh = s.hoh && !hmOf(s, s.hoh).out ? s.hoh : null;
    if (hoh && hoh !== a && hoh !== b) out = liking(s, hoh, a) < liking(s, hoh, b) ? a : b;
    else out = hmOf(s, a).fans <= hmOf(s, b).fans ? a : b;
  }
  s.evictVotes = who;
  beat(s, "dapo", `The votes are in. ${votes[a]} for ${nameOf(s, a)}. ${votes[b]} for ${nameOf(s, b)}.`, { votes });
  beat(s, "dapo", `${nameOf(s, out)}, you have been evicted from Wahala House.`, { focus: out, anim: "shock", out });
  const h = hmOf(s, out);
  h.out = { how: "evicted", d: s.day };
  logEv(s, `${h.name} was evicted.`, "evict");
  if (out === ME) { beat(s, "sys", "YOU HAVE BEEN EVICTED. Stay for the Showdown."); s.hm[0].room = "out"; }
  else beat(s, out, r.pick(["It's been real. Watch your backs. Seriously.", "No regrets. I played my game.", "To the Saboteurs: I know who you are."]));
  cont(s, "showdown");
}

FN_REG.showdown = (s, r) => {
  const me = s.hm[0];
  beat(s, "dapo", "Before we say goodnight... it's time for THE SHOWDOWN.", { anim: "point" });
  beat(s, "dapo", "Anyone may call out one housemate as a Saboteur. If more than half the house backs the call, the accused must reveal.");
  if (playerIn(s)) {
    choice(s, { k: "callout", p: "CALL OUT A SABOTEUR", n: 1, h: "callout", o: housemateOptions(s).concat([{ v: "pass", l: "PASS" }]), auto: "calloutAuto" });
  } else cont(s, "calloutAuto");
  void me;
};
FN_REG.callout = (s, r, v) => resolveShowdown(s, r, v === "pass" ? null : v);
FN_REG.calloutAuto = (s, r) => resolveShowdown(s, r, null);

function resolveShowdown(s, r, mine) {
  const callers = {};
  const add = (from, to) => { (callers[to] = callers[to] || []).push(from); };
  if (mine) add(ME, mine);
  for (const h of aiIn(s)) {
    if (isSab(s, h.id)) {
      // Saboteurs pile on whoever the house already suspects most.
      let best = null, bv = 0;
      for (const x of inHouseIds(s)) { if (isSab(s, x)) continue; const tot = aiIn(s).reduce((acc, o) => acc + (o.id === x ? 0 : rel(s, o.id, x)[SU]), 0); if (tot > bv) { bv = tot; best = x; } }
      if (best && r.chance(0.6)) add(h.id, best);
      continue;
    }
    let best = null, bv = 48;
    for (const x of inHouseIds(s)) { if (x === h.id) continue; const v = rel(s, h.id, x)[SU] + (mine === x ? rel(s, h.id, ME)[TR] / 5 : 0); if (v > bv) { bv = v; best = x; } }
    if (best) add(h.id, best);
  }
  const ranked = Object.entries(callers).sort((a, b) => b[1].length - a[1].length);
  const houseN = inHouse(s).length;
  if (!ranked.length) { beat(s, "dapo", "Silence! Nobody dares. The Saboteurs live to fight another week."); cont(s, "finish"); return; }
  for (const [x, list] of ranked.slice(0, 3)) beat(s, "dapo", `${list.length} ${list.length === 1 ? "housemate calls" : "housemates call"} out ${nameOf(s, x)}.`, { focus: x, callers: list });
  const [target, list] = ranked[0];
  if (list.length * 2 > houseN - 1) {
    const th = hmOf(s, target);
    beat(s, "dapo", `${th.name}, the house has spoken. Stand up. Are you a Saboteur?`, { focus: target });
    if (isSab(s, target)) {
      beat(s, target, "...I AM A SABOTEUR.", { anim: "shock", reveal: target });
      th.out = { how: "ejected", d: s.day };
      const share = Math.floor(2000000 / list.length);
      s.pot = Math.max(0, s.pot - 2000000);
      if (list.includes(ME)) { s.hm[0].coins += Math.floor(share / 1000); s.hm[0].fans = clamp(s.hm[0].fans + 12); }
      for (const c of list) hmOf(s, c).fans = clamp(hmOf(s, c).fans + 6);
      beat(s, "dapo", `${th.name} is EJECTED! The callers split ${naira(2000000)} from the pot.`, { anim: "cheer", out: target });
      logEv(s, `${th.name} was exposed as a Saboteur at the Showdown.`, "sab");
      s.exposed = (s.exposed || []).concat([target]);
    } else {
      beat(s, target, "I AM A HOUSEMATE!", { anim: "angry" });
      beat(s, "dapo", "WRONG! Every housemate who called them out takes two strikes!");
      for (const c of list) { const h = hmOf(s, c); h.strikes += 2; if (c === ME) note(s, "Two strikes for a wrong call-out.", "strike"); }
      th.fans = clamp(th.fans + 8);
      logEv(s, `${th.name} was wrongly accused at the Showdown.`, "accuse");
    }
  } else {
    beat(s, "dapo", "Not enough support. The Saboteurs live to fight another week.");
  }
  cont(s, "finish");
}

FN_REG.finish = (s, r) => {
  beat(s, "dapo", "That's all for tonight, Nigeria! Week One is DONE. See you next week on... WAHALA HOUSE!", { anim: "cheer" });
  cont(s, "recap");
};
FN_REG.recap = (s, r) => { s.result = buildRecap(s); void r; };

function buildRecap(s) {
  const me = s.hm[0];
  const all = s.hm.slice().sort((a, b) => b.fans - a.fans);
  const rank = all.findIndex((h) => h.id === ME) + 1;
  const myShips = s.ships.filter((sh) => sh.a === ME || sh.b === ME).map((sh) => ({ with: sh.a === ME ? sh.b : sh.a, name: sh.name, official: sh.official }));
  const myBeefs = aiIn(s).concat(s.hm.filter((h) => h.out && !h.human)).filter((h) => rel(s, h.id, ME)[BF] >= 45).map((h) => h.id);
  const besties = s.hm.filter((h) => !h.human && rel(s, h.id, ME)[F] >= 65).map((h) => h.id);
  let headline;
  if (me.out && me.out.how === "struck") headline = "STRUCK BY THE SABOTEURS";
  else if (me.out && me.out.how === "evicted") headline = "EVICTED";
  else if (me.out && me.out.how === "ejected") headline = "EXPOSED AS A SABOTEUR";
  else headline = me.role === "S" ? "SURVIVED AS A SABOTEUR" : "SURVIVED WEEK ONE";
  let grade = 0;
  if (!me.out) grade += 40;
  grade += Math.round(me.fans / 3);
  grade += Math.min(10, myShips.length * 5) + Math.min(10, besties.length * 3);
  if (me.role === "S") { if (s.struck && s.struck !== ME) grade += 10; if (!(s.exposed || []).includes(ME)) grade += 5; }
  else if ((s.exposed || []).length) grade += 15;
  const letter = grade >= 90 ? "S" : grade >= 75 ? "A" : grade >= 60 ? "B" : grade >= 45 ? "C" : "D";
  return {
    headline, grade: letter, score: grade, role: me.role, out: me.out, fans: me.fans, rank, of: s.hm.length,
    ships: myShips, beefs: myBeefs, besties, receipts: s.gb.filter((g) => g.k === "receipt").length,
    lies: s.lies.length, exposedLies: s.lies.filter((l) => l.exposed).length,
    pot: s.pot, struck: s.struck, sabs: s.sabs.slice(), exposed: s.exposed || [],
    hoh: s.hoh, evicted: s.hm.filter((h) => h.out && h.out.how === "evicted").map((h) => h.id),
    fanBoard: all.map((h) => ({ id: h.id, fans: h.fans, out: h.out ? h.out.how : null })),
  };
}

/** Register named continuations and choice handlers in one table. */
const FN = FN_REG;
FN.entryPlan = entryPlan;
// ---------------------------------------------------------------------------
// Drama: grudges from day one, crowds at every fight, and housemates who come
// looking for you (to confront you, flirt with you, bring gist, or cut a deal).
// ---------------------------------------------------------------------------

/** Two pairs of clashing personalities walk in with a grudge. */
function seedRivalries(s, r) {
  const known = new Set(HISTORY.map(([a, b]) => [a, b].sort().join("+")));
  const pairs = [];
  for (let i = 0; i < AI_IDS.length; i++) for (let j = i + 1; j < AI_IDS.length; j++) {
    const a = AI_IDS[i], b = AI_IDS[j];
    if (known.has([a, b].sort().join("+"))) continue;
    const clash = BY[a].tp + BY[b].tp + (BY[a].sc >= 4) + (BY[b].sc >= 4) + Math.abs(BY[a].mo - BY[b].mo) * 0.5 + r.int(4);
    pairs.push([clash, a, b]);
  }
  pairs.sort((p, q) => q[0] - p[0]);
  const used = new Set();
  s.rivals = [];
  for (const [, a, b] of pairs) {
    if (used.has(a) || used.has(b)) continue;
    for (const [p, q] of [[a, b], [b, a]]) { const v = rel(s, p, q); v[BF] = 40 + r.int(10); v[F] = 10 + r.int(8); v[TR] = 10 + r.int(8); }
    used.add(a); used.add(b);
    s.rivals.push([a, b]);
    if (s.rivals.length >= 2) break;
  }
}

/** A fight or a kiss draws a crowd. */
function gatherCrowd(s, r, sc) {
  if (sc.room === "hoh") return;
  const pool = r.shuffle(aiIn(s).filter((h) => !h.sc && !h.watch && h.act !== "sleep" && h.id !== sc.a && h.id !== sc.b && ROAM_ROOMS.includes(h.room)));
  let n = 0;
  for (const h of pool) {
    if (n >= 3) break;
    const here = h.room === sc.room;
    if (!r.chance(here ? 0.85 : 0.2 + BY[h.id].ob * 0.07)) continue;
    if (!here) { h.room = sc.room; h.spot = freeSpot(s, r, sc.room, h.id); }
    h.act = "watch";
    h.watch = sc.id;
    n += 1;
  }
}

// ---------------------------------------------------------------------------
// Housemates who come to you
// ---------------------------------------------------------------------------

const APPROACH_TITLE = { confront: "WAHALA INCOMING", crush: "SOMEBODY IS CRUSHING", gist: "FRESH GIST", deal: "A DEAL ON THE TABLE", curious: "NOSY HOUSEMATE" };

const DRAMA = {
  confrontLie: [
    "{you}! So you told {to} that I {claim}? I heard everything!",
    "{ex} {you}, come here. You've been telling people I {claim}? To my face, smile; behind my back, lies?",
    "You think this house doesn't talk? {to} told me what you said about me.",
  ],
  confrontLieTo: [
    "{you}, you lied to me. {about} never {claimPast}. I asked. Why would you do that?",
    "{ex} You made me look like a fool in front of {about}. Explain yourself.",
  ],
  confrontBeef: [
    "{you}. You and me, we need to talk. Now.",
    "{ex} I'm tired of the way you move in this house. Say what you want to say to my face.",
    "Every time I enter a room, you go quiet. What's your problem with me?",
    "You think I don't see you rolling your eyes at me? I see everything.",
  ],
  sorryOk: ["Fine. I hear you. Don't let it happen again.", "Okay... I accept. But I'm watching you.", "Hmm. At least you came correct. We move."],
  sorryNo: ["Sorry for yourself. I'm not buying it.", "Keep your sorry. Actions, not words.", "Ehen? Now you're sorry? Because you got caught?"],
  denyOk: ["...Maybe I heard wrong. But I'm keeping my eyes open.", "Hmm. Okay. If you say so."],
  denyNo: ["Liar! Look me in the eye and lie again!", "Ahn ahn! Even your face is lying! Everybody heard it!"],
  clapYou: ["You want smoke? Because I have plenty.", "Lower your voice. You're not my mate.", "Say it again. I dare you."],
  clapThem: ["{ex} You see this one? You see?!", "Hold me! Somebody hold me!", "This house is not big enough for both of us."],
  walk: ["You walk away. Behind you, {me} is still shouting.", "You leave {me} mid-sentence. The house goes quiet."],
  crushOpen: [
    "{you}... can I steal you for a minute? Just you.",
    "{ex} I've been looking for you all day. Don't laugh.",
    "Is it just me, or does this house get brighter when you walk in?",
    "I don't do this, but... I like you, {pet}. There, I said it.",
  ],
  crushYes: ["See this smile? You did that.", "Okay, now I can't stop smiling. Thanks a lot.", "Don't play with my heart, {pet}."],
  crushOut: ["Wait, for real? Yes! Yes, a thousand times!", "{ex} The fans are going to scream. Yes!"],
  crushOutNo: ["Slow down, {pet}. Let's not rush it.", "Ha! Buy me jollof first."],
  crushFriend: ["Friends. Yeah. Okay. That's... cool.", "I hear you. Friends it is."],
  crushNo: ["Wow. Okay. Noted.", "Your loss, honestly.", "I'll pretend this conversation never happened."],
  gistOpen: ["{you}, come closer. I have gist, and I trust you with it.", "Don't look now. Act normal. I need to tell you something.", "{ex} You won't believe what I saw."],
  thanks: ["Keep it between us, eh?", "You didn't hear it from me.", "Now you know. Do what you want with it."],
  dealOpen: [
    "Look, {you}. Wednesday is coming. I save you, you save me. Simple.",
    "Let's be smart about this. You and me, we protect each other at nominations. Deal?",
    "{ex} Numbers win this game. Save me on Wednesday and I've got you. Word.",
  ],
  dealYes: ["Pleasure doing business.", "Shake on it. Don't make me regret this.", "Smart. Very smart."],
  dealNo: ["Your call. Don't come crying on Wednesday.", "Okay o. Remember I offered."],
};
const CLAIM_PAST = { likes: "said they had a crush on me", hates: "said anything bad about me", fake: "played anybody", sab: "did anything shady", using: "used me" };
const CLAIM_SHORT = { likes: "have a crush on {to}", hates: "talk bad about {to}", fake: "am fake", sab: "am a Saboteur", using: "am using {to}" };

/** Something this housemate saw or heard that is worth telling you. */
function gistFor(s, id) {
  const mem = s.mem[id] || [];
  const order = ["saw_skim", "saw_scheme", "kiss", "overheard", "gossip", "broke", "fight"];
  for (const k of order) {
    for (let i = mem.length - 1; i >= 0; i--) {
      const m = mem[i];
      if (m.k !== k || m.shared) continue;
      if (m.x === ME || m.src === ME || m.y === ME) continue;
      if (m.x && hmOf(s, m.x).out) continue;
      return m;
    }
  }
  return null;
}

/** Maybe a housemate walks over to you. Runs on the half hour while roaming. */
function maybeApproach(s, r) {
  const me = s.hm[0];
  if (me.out || s.phase !== "ROAM" || s.min >= 1440 || s.min < 540) return false;
  const now = s.day * 1440 + s.min;
  if (now - (s.lastApproach === undefined ? -9999 : s.lastApproach) < 280) return false;
  const by = s.approachedBy || {};
  const cands = [];
  for (const h of aiIn(s)) {
    if (h.sc || h.watch || h.act === "sleep") continue;
    if (h.room === "hoh" && s.hoh !== ME && s.tenant !== ME) continue;
    const v = rel(s, h.id, ME);
    const rested = now - (by[h.id] === undefined ? -9999 : by[h.id]) >= 1440;
    const lie = s.lies.find((l) => l.exposed && !l.confronted && (l.to === h.id || l.about === h.id));
    if (lie) { cands.push({ h, k: "confront", w: 200, lie }); continue; }
    if (!rested) continue;
    if (v[BF] >= 45 || (v[BF] >= 36 && BY[h.id].tp >= 4)) { cands.push({ h, k: "confront", w: v[BF] + BY[h.id].tp * 5 }); continue; }
    const ship = findShip(s, ME, h.id);
    const drawn = v[RO] >= 42 || (BY[h.id].fl >= 4 && v[AT] >= 62 && v[BF] < 25);
    if (drawn && !(ship && ship.official) && !(s.asked && s.asked[h.id] >= s.day)) { cands.push({ h, k: "crush", w: v[RO] + v[AT] * 0.3 }); continue; }
    if ((s.informant === h.id || (v[F] >= 32 && v[TR] >= 26)) && gistFor(s, h.id)) { cands.push({ h, k: "gist", w: v[F] * 0.7 + (s.informant === h.id ? 30 : 0) }); continue; }
    if (s.day <= 1 && (BY[h.id].wt >= 4 || BY[h.id].ob >= 4 || BY[h.id].fl >= 4) && !(s.curious && s.curious[h.id])) cands.push({ h, k: "curious", w: 20 + r.int(10) });
    if (BY[h.id].sc >= 4 && s.day >= 1 && s.day <= 3 && !s.done["3:noms"] && v[TR] >= 30 && !s.prom[h.id + ">" + ME] && !(s.dealt && s.dealt[h.id])) cands.push({ h, k: "deal", w: 35 });
  }
  if (!cands.length) return false;
  if (!r.chance(cands.some((c) => c.lie) ? 0.9 : 0.5)) return false;
  cands.sort((a, b) => b.w - a.w);
  s.lastApproach = now;
  s.approachedBy = Object.assign({}, by, { [cands[0].h.id]: now });
  startApproach(s, r, cands[0]);
  return true;
}

function startApproach(s, r, c) {
  const me = s.hm[0], h = c.h, id = h.id;
  if (h.room !== me.room) { h.room = me.room; h.spot = freeSpot(s, r, me.room, id); }
  h.act = "idle";
  openEvent(s, "approach", "here", APPROACH_TITLE[c.k]);
  s.ev.data = { who: id, k: c.k };
  if (c.k === "confront") {
    if (c.lie) {
      c.lie.confronted = true;
      const L = c.lie;
      const angry = L.about === id ? DRAMA.confrontLie : DRAMA.confrontLieTo;
      const t = r.pick(angry).replace(/\{to\}/g, nameOf(s, L.to)).replace(/\{about\}/g, nameOf(s, L.about))
        .replace(/\{claimPast\}/g, CLAIM_PAST[L.c] || "said that").replace(/\{claim\}/g, (CLAIM_SHORT[L.c] || "said things").replace(/\{to\}/g, nameOf(s, L.to)));
      beat(s, id, fill(s, r, t, id), { approach: id, anim: "angry", key: 1 });
      s.ev.data.lie = true;
    } else beat(s, id, fill(s, r, r.pick(DRAMA.confrontBeef), id), { approach: id, anim: "angry", key: 1 });
    choice(s, {
      k: "confront", p: `${h.name} is in your face. What do you do?`, n: 1, h: "confrontPick", ctx: id,
      o: [
        { v: "sorry", l: "Apologize", sub: "Swallow your pride" },
        { v: "deny", l: "Deny everything", sub: s.ev.data.lie ? "Risky: they've heard it" : "Play it cool" },
        { v: "clap", l: "Clap back", sub: "Fans love it. They won't" },
        { v: "walk", l: "Walk away", sub: "No drama... this time" },
      ],
    });
  } else if (c.k === "crush") {
    s.asked = s.asked || {};
    s.asked[id] = s.day;
    beat(s, id, fill(s, r, r.pick(DRAMA.crushOpen), id, { romantic: true }), { approach: id, anim: "heart", key: 1 });
    choice(s, {
      k: "crush", p: `${h.name} likes you. Your move.`, n: 1, h: "crushPick", ctx: id,
      o: [
        { v: "flirt", l: "Flirt back", sub: "Turn up the heat" },
        { v: "out", l: "Ask them out", sub: "Make it official" },
        { v: "friend", l: "Keep it friendly", sub: "Gently" },
        { v: "no", l: "Not interested", sub: "Ouch" },
      ],
    });
  } else if (c.k === "gist") {
    const m = gistFor(s, id);
    m.shared = true;
    s.ev.data.mem = m;
    beat(s, id, fill(s, r, r.pick(DRAMA.gistOpen), id), { approach: id, anim: "sneak", key: 1 });
    beat(s, id, gistLine(s, m), { key: 1 });
    shareGist(s, id, m);
    choice(s, {
      k: "gist", p: `What do you say to ${h.name}?`, n: 1, h: "gistPick", ctx: id,
      o: [
        { v: "thanks", l: "Thank them", sub: "Friendship +" },
        { v: "eyes", l: "\"Keep your eyes open for me\"", sub: "Trust +" },
        { v: "doubt", l: "\"Why are you telling me?\"", sub: "Suspicious" },
      ],
    });
  } else if (c.k === "curious") {
    s.curious = s.curious || {};
    s.curious[id] = true;
    const q = r.pick(["crush", "trust", "snake"]);
    s.ev.data.q = q;
    const ask = { crush: "So... who's your crush in this house? Talk true. I won't tell anybody. Maybe.", trust: "Real question. Who do you actually trust in here?", snake: "Between us: who's the biggest snake in this house?" }[q];
    beat(s, id, fill(s, r, `{ex} ${ask}`, id), { approach: id, anim: "sassy", key: 1 });
    const pool = r.shuffle(aiIn(s).filter((x) => x.id !== id)).slice(0, 3);
    choice(s, {
      k: "curious", p: `${h.name} wants to know. What do you say?`, n: 1, h: "curiousPick", ctx: id,
      o: pool.map((x) => ({ v: x.id, l: x.name, sub: q === "crush" ? "They'll hear about it" : q === "trust" ? "They'll hear about it" : "They will DEFINITELY hear about it" }))
        .concat([{ v: id, l: q === "snake" ? "You, honestly" : "You, obviously", sub: q === "snake" ? "Bold" : "Smooth" }, { v: "none", l: "I'm not telling you", sub: "Mysterious" }]),
    });
  } else {
    s.dealt = s.dealt || {};
    s.dealt[id] = true;
    beat(s, id, fill(s, r, r.pick(DRAMA.dealOpen), id), { approach: id, anim: "talk", key: 1 });
    choice(s, {
      k: "deal", p: `${h.name} wants a save deal for Wednesday.`, n: 1, h: "dealPick", ctx: id,
      o: [
        { v: "yes", l: "Deal", sub: "Break it and they'll know" },
        { v: "no", l: "No deals", sub: "Trust -" },
      ],
    });
  }
}

function gistLine(s, m) {
  const N = (x) => nameOf(s, x);
  switch (m.k) {
    case "saw_skim": return `At the market, I saw ${N(m.x)} slip money from the till into their pocket. I'm not crazy.`;
    case "saw_scheme": return `Late last night, ${N(m.x)} and ${N(m.y)} were whispering in a corner. They went quiet the second I walked in.`;
    case "kiss": return `Did you know ${N(m.x)} and ${N(m.y)} kissed? The whole ${m.room ? m.room : "house"} saw it.`;
    case "overheard": return `${N(m.src)} has been talking about ${N(m.x)} behind their back. Badly.`;
    case "gossip": return `${N(m.src)} told me ${N(m.x)} is not who they pretend to be.`;
    case "broke": return `${N(m.x)} promised to save me and didn't. Watch your back with that one.`;
    case "fight": return `You missed it! ${N(m.x)} and ${N(m.y)} nearly fought in the ${m.room || "house"}. Somebody was about to throw a slipper.`;
    default: return "Something is going on in this house. Keep your eyes open.";
  }
}

function shareGist(s, id, m) {
  const src = nameOf(s, id);
  if (m.k === "saw_skim") addGist(s, "receipt", `${src} told you they saw ${nameOf(s, m.x)} pocket money from the till.`, `skim:${m.x}`, [m.x]);
  else if (m.k === "saw_scheme") addGist(s, "receipt", `${src} saw ${nameOf(s, m.x)} and ${nameOf(s, m.y)} scheming late at night.`, `sab:${m.x} sab:${m.y}`, [m.x, m.y]);
  else if (m.k === "overheard" || m.k === "gossip") addGist(s, "gist", `${src}: ${nameOf(s, m.src)} has been talking about ${nameOf(s, m.x)}.`, `hates:${m.src}>${m.x}`, [m.src, m.x]);
  else if (m.k === "kiss") addGist(s, "gist", `${src}: ${nameOf(s, m.x)} and ${nameOf(s, m.y)} kissed.`, `kiss:${m.x}+${m.y}`, [m.x, m.y]);
  else if (m.k === "broke") addGist(s, "gist", `${src}: ${nameOf(s, m.x)} broke a save promise.`, `broke:${m.x}`, [m.x]);
  else if (m.k === "fight") addGist(s, "gist", `${src}: ${nameOf(s, m.x)} and ${nameOf(s, m.y)} had a big fight.`, `beef:${m.x}+${m.y}`, [m.x, m.y]);
  note(s, "New gist in your Gist Book.", "good");
}

FN_REG.confrontPick = (s, r, v, id) => {
  const me = s.hm[0], h = hmOf(s, id), c = BY[id];
  const lie = s.ev.data && s.ev.data.lie;
  if (v === "sorry") {
    const p = 0.35 + (5 - c.tp) * 0.1 - (lie ? 0.15 : 0) + liking(s, id, ME) / 250;
    beat(s, ME, r.pick(["I'm sorry. I was wrong, and I own it.", "You're right. I'm sorry. Can we start again?", "My bad. Honestly. I'm sorry."]), { anim: "sad" });
    if (r.chance(p)) { bump(s, id, ME, BF, -18); bump(s, id, ME, F, 5); beat(s, id, fill(s, r, r.pick(DRAMA.sorryOk), id), { anim: "talk2", key: 1 }); }
    else { bump(s, id, ME, BF, 4); beat(s, id, fill(s, r, r.pick(DRAMA.sorryNo), id), { anim: "angry", key: 1 }); }
    me.comp = clamp(me.comp - 4);
  } else if (v === "deny") {
    const p = lie ? 0.22 + me.fans / 400 + rel(s, id, ME)[TR] / 300 : 0.5;
    beat(s, ME, r.pick(["Me? Never. Somebody is feeding you lies.", "I don't know what you're talking about.", "Check your sources, because it wasn't me."]), { anim: "sassy" });
    if (r.chance(p)) { bump(s, id, ME, BF, -6); beat(s, id, fill(s, r, r.pick(DRAMA.denyOk), id), { anim: "talk2", key: 1 }); }
    else { bump(s, id, ME, TR, -15); bump(s, id, ME, BF, 10); me.fans = clamp(me.fans - 3); beat(s, id, fill(s, r, r.pick(DRAMA.denyNo), id), { anim: "angry", key: 1 }); tweet(s, r, "youbad", ME); }
  } else if (v === "clap") {
    beat(s, ME, r.pick(DRAMA.clapYou), { anim: "angry" });
    beat(s, id, fill(s, r, r.pick(DRAMA.clapThem), id), { anim: "angry", key: 1 });
    mutual(s, id, ME, BF, 15);
    me.fans = clamp(me.fans + 6); me.comp = clamp(me.comp - 10); h.comp = clamp(h.comp - 10);
    addBeef(s, id, ME);
    tweet(s, r, "fight", id, ME);
    logEv(s, `${h.name} and ${me.name} had a screaming match.`, "fight");
    for (const w of aiIn(s)) if (w.id !== id && w.room === me.room) remember(s, w.id, { k: "fight", x: id, y: ME });
    if (c.tp >= 4 && r.chance(0.35)) { strike(s, r, id, "threatening another housemate"); beat(s, "eye", `${h.name}, that is a strike.`, { key: 1 }); }
    else if (r.chance(0.15)) { strike(s, r, ME, "fighting"); beat(s, "eye", `${me.name}, that is a strike.`, { key: 1 }); }
  } else {
    bump(s, id, ME, BF, 5); me.fans = clamp(me.fans - 2); me.comp = clamp(me.comp + 3);
    beat(s, "sys", fill(s, r, r.pick(DRAMA.walk), id));
  }
};

FN_REG.crushPick = (s, r, v, id) => {
  const me = s.hm[0], h = hmOf(s, id);
  const theirs = rel(s, id, ME)[RO];
  if (v === "flirt") {
    beat(s, ME, r.pick(["Funny, I was about to come looking for you.", "Keep talking. I like where this is going.", "You're trouble. I like trouble."]), { anim: "heart" });
    mutual(s, id, ME, RO, 10); me.fans = clamp(me.fans + 2);
    beat(s, id, fill(s, r, r.pick(DRAMA.crushYes), id, { romantic: true }), { anim: "happy", key: 1 });
    if (rel(s, id, ME)[RO] >= 55 && rel(s, ME, id)[RO] >= 40) makeShip(s, r, ME, id, false);
    jealousy(s, r, id, aiIn(s), 6);
  } else if (v === "out") {
    beat(s, ME, r.pick(["Be my person in this house. Officially.", "Let's stop pretending. You and me?"]), { anim: "heart" });
    if (theirs >= 58 || r.chance(theirs / 120)) {
      mutual(s, id, ME, RO, 15);
      const sh = makeShip(s, r, ME, id, true);
      me.fans = clamp(me.fans + 8);
      beat(s, id, fill(s, r, r.pick(DRAMA.crushOut), id, { romantic: true }), { anim: "cheer", key: 1 });
      beat(s, "sys", `It's official. #${sh.name} is trending.`, { key: 1 });
      tweet(s, r, "ship", ME, id, sh.name);
      jealousy(s, r, id, aiIn(s), 12);
    } else { bump(s, id, ME, RO, 3); beat(s, id, fill(s, r, r.pick(DRAMA.crushOutNo), id, { romantic: true }), { anim: "sassy", key: 1 }); }
  } else if (v === "friend") {
    bump(s, id, ME, RO, -8); bump(s, id, ME, F, 6);
    beat(s, id, fill(s, r, r.pick(DRAMA.crushFriend), id), { anim: "talk2", key: 1 });
  } else {
    bump(s, id, ME, RO, -25); bump(s, id, ME, BF, 8); h.comp = clamp(h.comp - 8); me.fans = clamp(me.fans + 1);
    beat(s, id, fill(s, r, r.pick(DRAMA.crushNo), id), { anim: "sad", key: 1 });
  }
};

FN_REG.gistPick = (s, r, v, id) => {
  if (v === "thanks") { bump(s, id, ME, F, 4); bump(s, id, ME, TR, 4); beat(s, id, fill(s, r, r.pick(DRAMA.thanks), id), { anim: "happy" }); }
  else if (v === "eyes") { bump(s, id, ME, TR, 7); s.informant = id; beat(s, id, "Say less. If I see anything, you'll be the first to know.", { anim: "talk2" }); }
  else { bump(s, id, ME, TR, -6); beat(s, id, "Wow. I try to help, and this is what I get?", { anim: "sassy" }); }
};

FN_REG.dealPick = (s, r, v, id) => {
  const h = hmOf(s, id);
  if (v === "yes") {
    s.prom[id + ">" + ME] = "save"; s.prom[ME + ">" + id] = "save";
    mutual(s, id, ME, TR, 8);
    beat(s, id, fill(s, r, r.pick(DRAMA.dealYes), id), { anim: "happy", key: 1 });
    note(s, `You promised to save ${h.name} on Wednesday.`, "info");
  } else { bump(s, id, ME, TR, -4); beat(s, id, fill(s, r, r.pick(DRAMA.dealNo), id), { anim: "sassy" }); }
};

FN_REG.curiousPick = (s, r, v, id) => {
  const q = s.ev.data.q, h = hmOf(s, id), me = s.hm[0];
  if (v === "none") { bump(s, id, ME, TR, -3); beat(s, id, "Hmm. Mysterious. I'll find out anyway.", { anim: "sassy" }); return; }
  if (v === id) {
    if (q === "snake") { bump(s, id, ME, BF, 12); me.fans = clamp(me.fans + 3); beat(s, id, "ME?! Wow. Okay. Noted, and remembered.", { anim: "angry", key: 1 }); }
    else { bump(s, id, ME, q === "crush" ? RO : TR, 12); bump(s, id, ME, F, 5); beat(s, id, q === "crush" ? "Stop it! You're making me blush." : "Aww. That means a lot. Truly.", { anim: q === "crush" ? "heart" : "happy", key: 1 }); }
    return;
  }
  const x = hmOf(s, v);
  // A nosy housemate never keeps it to themselves.
  if (q === "crush") { bump(s, ME, v, RO, 8); bump(s, v, ME, AT, 10); remember(s, id, { k: "crushtalk", x: v }); beat(s, id, `${x.name}?! Oh, this house is going to be fun.`, { anim: "cheer", key: 1 }); if (r.chance(0.6)) { bump(s, v, ME, RO, 6); note(s, `Word travels. ${x.name} heard you have a crush on them.`, "love"); } }
  else if (q === "trust") { bump(s, v, ME, F, 6); bump(s, v, ME, TR, 6); bump(s, id, ME, TR, -3); beat(s, id, `${x.name}? Interesting choice. Very interesting.`, { anim: "talk2", key: 1 }); }
  else { bump(s, v, ME, BF, r.chance(0.6) ? 14 : 4); me.fans = clamp(me.fans + 2); beat(s, id, `${x.name}! I KNEW it. I knew I wasn't the only one.`, { anim: "cheer", key: 1 }); if (r.chance(0.6)) note(s, `${x.name} found out you called them a snake.`, "bad"); }
};
// ---------------------------------------------------------------------------
// Things to do all day: free activities in the rooms, and one house incident
// a day that drags everybody in.
// ---------------------------------------------------------------------------

/** Free activities: where they can be done, how often, and how long they take. */
const DOINGS = {
  chores: { rooms: ["kitchen", "lounge"], perDay: 3, ticks: 3 },
  cook: { rooms: ["kitchen"], perDay: 1, ticks: 6 },
  snoop: { rooms: ["bedroom"], perDay: 2, ticks: 2 },
  prank: { rooms: ["lounge", "garden", "kitchen"], perDay: 1, ticks: 2 },
};

function doneToday(s, what) { return (s.doings && s.doings[s.day + ":" + what]) || 0; }

function canDo(s, what) {
  const me = s.hm[0], d = DOINGS[what];
  if (!d) return "Unknown activity.";
  if (me.out) return "You are no longer in the house.";
  if (!d.rooms.includes(me.room)) return `You can't do that in here.`;
  if (doneToday(s, what) >= d.perDay) return what === "cook" ? "You already cooked for the house today." : "That's enough of that for today.";
  if (what === "prank" && !inHouse(s).some((h) => !h.human && h.room === me.room && h.act !== "sleep")) return "Nobody here to prank.";
  return null;
}

function doThing(s, r, what) {
  const me = s.hm[0];
  s.doings = s.doings || {};
  s.doings[s.day + ":" + what] = doneToday(s, what) + 1;
  const here = aiIn(s).filter((h) => h.room === me.room && h.act !== "sleep");
  const names = (list) => list.map((h) => h.name).join(" and ");
  if (what === "chores") {
    me.coins += 40;
    for (const h of here) bump(s, h.id, ME, F, 2 + (BY[h.id].mo >= 4 ? 2 : 0));
    const seen = here.filter((h) => BY[h.id].mo >= 4 || BY[h.id].ob >= 4);
    note(s, `You ${me.room === "kitchen" ? "washed every plate in the sink" : "tidied the lounge"}. +40 coins.${seen.length ? ` ${names(seen.slice(0, 2))} noticed.` : ""}`, "good");
  } else if (what === "cook") {
    const pot = r.pick(["a big pot of party jollof", "egusi and pounded yam", "pepper soup", "fried rice and dodo", "beans and plantain"]);
    for (const h of aiIn(s)) { bump(s, h.id, ME, F, 5); bump(s, h.id, ME, TR, 2); }
    me.fans = clamp(me.fans + 3);
    const chef = hmOf(s, "nkoyo");
    const verdict = chef && !chef.out ? (r.chance(0.55) ? "Nkoyo had seconds. High praise." : "Nkoyo said it needed more pepper.") : "The plates came back empty.";
    note(s, `You cooked ${pot} for the house. ${verdict}`, "good");
    logEv(s, `${me.name} cooked ${pot} for the whole house.`, "nice");
  } else if (what === "snoop") {
    const beds = aiIn(s).filter((h) => h.id !== ME);
    const target = r.pick(beds);
    const watchers = here.filter((h) => h.id !== target.id);
    const caught = r.chance(0.12 + watchers.reduce((a, h) => a + BY[h.id].ob * 0.05, 0) + (target.room === "bedroom" ? 0.3 : 0));
    if (caught) {
      const by = watchers.length ? r.pick(watchers) : target;
      bump(s, target.id, ME, BF, 18); bump(s, target.id, ME, TR, -15); me.fans = clamp(me.fans - 2);
      if (by.id !== target.id) remember(s, by.id, { k: "snoop", x: ME, y: target.id });
      note(s, `${by.name} caught you going through ${target.name}'s bag! This will travel.`, "bad");
      logEv(s, `${me.name} was caught going through ${target.name}'s things.`, "lie");
      return;
    }
    if (isSab(s, target.id) && r.chance(0.55)) {
      const clue = r.pick([`a folded note in ${target.name}'s bag: "Friday. Midnight. Choose well."`, `a second set of till receipts hidden in ${target.name}'s shoe`, `${target.name}'s notebook with every housemate's name, some crossed out`]);
      addGist(s, "receipt", `You found ${clue}.`, `sab:${target.id}`, [target.id]);
      note(s, `You found something in ${target.name}'s bag. Check your Gist Book.`, "good");
    } else if (SECRETS[target.id] && r.chance(0.5)) {
      addGist(s, "secret", `${target.name}'s diary: "${SECRETS[target.id]}"`, `secret:${target.id}`, [target.id]);
      note(s, `You read a page of ${target.name}'s diary. A secret is in your Gist Book.`, "good");
    } else note(s, `You went through ${target.name}'s things. Just clothes, perfume and three bottles of hair cream.`, "info");
  } else if (what === "prank") {
    const target = r.pick(here);
    const c = BY[target.id];
    const funny = r.chance(0.35 + c.wt * 0.1 - c.tp * 0.06);
    const trick = r.pick(["swapped the sugar for salt in their tea", "hid their slippers in the freezer", "replaced their hair cream with mayonnaise", "set an alarm under their pillow"]);
    if (funny) {
      for (const h of here) bump(s, h.id, ME, F, 3);
      bump(s, target.id, ME, F, 4); me.fans = clamp(me.fans + 4);
      note(s, `You ${trick}. ${target.name} laughed hardest. The house is screaming.`, "good");
      tweet(s, r, "funny", ME);
    } else {
      bump(s, target.id, ME, BF, 12); me.fans = clamp(me.fans + 2);
      note(s, `You ${trick}. ${target.name} did NOT find it funny.`, "bad");
      logEv(s, `${me.name} pranked ${target.name} and it went badly.`, "fight");
    }
  }
}

// ---------------------------------------------------------------------------
// House incidents: one a day, early afternoon to evening.
// ---------------------------------------------------------------------------

function maybeIncident(s, r) {
  const me = s.hm[0];
  if (me.out || s.phase !== "ROAM" || s.day < 1 || s.day > 6) return false;
  if (s.min < 780 || s.min > 1140) return false;
  s.incidents = s.incidents || {};
  if (s.incidents[s.day]) return false;
  // Keep clear of the next show.
  if (nextEventMin(s) - s.min < 60) return false;
  if (!r.chance(0.3)) return false;
  const used = Object.values(s.incidents);
  const pool = ["jollof", "palmwine", "nepa", "letter"].filter((k) => !used.includes(k));
  const k = r.pick(pool.length ? pool : ["jollof", "palmwine", "nepa", "letter"]);
  s.incidents[s.day] = k;
  startIncident(s, r, k);
  return true;
}

function startIncident(s, r, k) {
  const me = s.hm[0];
  const ai = aiIn(s);
  if (k === "jollof") {
    openEvent(s, "incident", "kitchen", "THE MISSING JOLLOF");
    gatherAll(s, "kitchen");
    const owner = hmOf(s, "nkoyo") && !hmOf(s, "nkoyo").out ? "nkoyo" : r.pick(ai).id;
    s.ev.data = { owner };
    beat(s, "eye", `Housemates. ${nameOf(s, owner)} cooked a pot of jollof this morning. It is gone. The pot is empty. Somebody in this house is a thief.`);
    beat(s, owner, "I counted the pieces of meat. SEVEN pieces. Gone! Whoever did this, confess now.", { anim: "angry", key: 1 });
    const suspects = ai.filter((h) => h.id !== owner).sort((p, q) => BY[q.id].bz + BY[q.id].fl - BY[p.id].bz - BY[p.id].fl).slice(0, 3);
    choice(s, {
      k: "jollof", p: `${nameOf(s, owner)} is looking at everyone. What do you do?`, n: 1, h: "jollofPick",
      o: suspects.map((h) => ({ v: h.id, l: `Blame ${h.name}`, sub: "They will remember" })).concat([{ v: "me", l: "Confess (it was you)", sub: "Fans love honesty" }, { v: "quiet", l: "Keep quiet", sub: "Let them fight it out" }]),
    });
  } else if (k === "palmwine") {
    openEvent(s, "incident", "lounge", "A GIFT FROM MAMA EYE");
    gatherAll(s, "lounge");
    beat(s, "eye", `${me.name}, Mama Eye has sent you a bottle of chilled palm wine. You may share it with ONE housemate. Choose carefully. Everybody is watching.`, { key: 1 });
    choice(s, { k: "palmwine", p: "Who do you share the palm wine with?", n: 1, h: "palmwinePick", o: housemateOptions(s) });
  } else if (k === "nepa") {
    openEvent(s, "incident", "lounge", "NEPA TAKE LIGHT!");
    gatherAll(s, "lounge");
    s.dark = s.day * 1440 + s.min + 60;
    beat(s, "sys", "The lights die. The fans stop. Somewhere, somebody screams. NEPA has taken light.", { key: 1 });
    const flirt = ai.slice().sort((p, q) => rel(s, q.id, ME)[RO] - rel(s, p.id, ME)[RO])[0];
    beat(s, flirt.id, "Who just touched my hand? ...Oh. It's you.", { anim: "heart" });
    choice(s, {
      k: "nepa", p: "It's pitch black in the lounge. What do you do?", n: 1, h: "nepaPick", ctx: flirt.id,
      o: [
        { v: "story", l: "Tell a ghost story", sub: "Entertain the house" },
        { v: "hold", l: `Stay close to ${flirt.name}`, sub: "Romance in the dark" },
        { v: "gen", l: "Go and start the generator", sub: "Be the hero" },
        { v: "sneak", l: "Use the dark to snoop around", sub: "Risky" },
      ],
    });
  } else {
    openEvent(s, "incident", "diary", "AN ANONYMOUS LETTER");
    beat(s, "eye", `${me.name}, a letter was slipped under the Diary Room door. It is addressed to you. Mama Eye did not write it.`);
    // Most letters tell the truth.
    const sabs = s.sabs.filter((x) => x !== ME && !hmOf(s, x).out);
    const truthful = sabs.length && r.chance(0.6);
    const named = truthful ? r.pick(sabs) : r.pick(ai.filter((h) => !isSab(s, h.id))).id;
    s.ev.data = { named, truthful };
    beat(s, "sys", `The letter says: "Watch ${nameOf(s, named)}. Not everything they say is true."`, { focus: named, key: 1 });
    choice(s, {
      k: "letter", p: "What do you do with the letter?", n: 1, h: "letterPick",
      o: [
        { v: "keep", l: "Keep it to yourself", sub: "Add it to your Gist Book" },
        { v: "show", l: `Show it to ${nameOf(s, named)}`, sub: "Clear the air" },
        { v: "burn", l: "Burn it", sub: "Somebody wants to play you" },
      ],
    });
  }
}

FN_REG.jollofPick = (s, r, v) => {
  const me = s.hm[0], owner = s.ev.data.owner;
  if (v === "me") {
    me.fans = clamp(me.fans + 4); bump(s, owner, ME, BF, 8); bump(s, owner, ME, TR, 4);
    beat(s, ME, "Okay! Okay. It was me. It was too sweet. I'm sorry.", { anim: "sad" });
    beat(s, owner, "At least you confessed. You're washing every pot in this kitchen for a week.", { anim: "wag", key: 1 });
  } else if (v === "quiet") {
    const sus = r.pick(aiIn(s).filter((h) => h.id !== owner));
    mutual(s, owner, sus.id, BF, 12);
    beat(s, sus.id, "Why is everybody looking at me? I didn't touch anything!", { anim: "angry", focus: sus.id });
    beat(s, owner, "Your mouth is still oily. Don't lie to me.", { anim: "angry", pair: [owner, sus.id] });
  } else {
    const h = hmOf(s, v);
    mutual(s, owner, v, BF, 14); bump(s, v, ME, BF, 15); me.fans = clamp(me.fans + 2);
    beat(s, ME, `I saw ${h.name} by the fridge this morning. Just saying.`, { anim: "wag" });
    beat(s, v, r.pick(["ME?! You're lying! You're actually lying!", "Wow. Wow. So it's me you want to use? Okay.", "I don't even eat jollof! I'm on a diet!"]), { anim: "angry", focus: v, key: 1 });
    if (isSab(s, v)) bump(s, owner, v, SU, 6);
  }
};

FN_REG.palmwinePick = (s, r, v) => {
  const h = hmOf(s, v);
  bump(s, v, ME, F, 10); bump(s, v, ME, TR, 6);
  if (rel(s, v, ME)[AT] >= 45) bump(s, v, ME, RO, 8);
  jealousy(s, r, v, aiIn(s), 6);
  beat(s, v, r.pick(["Ahhh, palm wine! You see why I like you?", "For me? Sit down, let's finish this bottle together.", "Now THIS is friendship."]), { anim: "cheer", focus: v, key: 1 });
  const left = aiIn(s).filter((x) => x.id !== v).sort((p, q) => rel(s, q.id, ME)[F] - rel(s, p.id, ME)[F])[0];
  if (left) { bump(s, left.id, ME, BF, 6); beat(s, left.id, `Hm. ${h.name}. Okay. I see where I stand.`, { anim: "sassy" }); }
};

FN_REG.nepaPick = (s, r, v, flirt) => {
  const me = s.hm[0], f = hmOf(s, flirt);
  if (v === "story") {
    for (const h of aiIn(s)) bump(s, h.id, ME, F, 4);
    me.fans = clamp(me.fans + 5);
    beat(s, ME, "So there was this woman in white, standing by the gate of this very house...", { anim: "talk" });
    beat(s, "sys", "By the end of the story, three housemates are holding hands and Tobi refuses to go to the toilet alone.", { key: 1 });
  } else if (v === "hold") {
    mutual(s, flirt, ME, RO, 12); me.fans = clamp(me.fans + 3);
    jealousy(s, r, flirt, aiIn(s), 8);
    beat(s, flirt, "If the light never comes back... I won't complain.", { anim: "heart", key: 1 });
    beat(s, "sys", "When the lights flicker back on, the whole house sees you two. The screaming starts.", { anim: "cheer" });
    if (rel(s, flirt, ME)[RO] >= 55) makeShip(s, r, ME, flirt, false);
  } else if (v === "gen") {
    for (const h of aiIn(s)) bump(s, h.id, ME, TR, 3);
    me.fans = clamp(me.fans + 3); me.comp = clamp(me.comp + 5);
    beat(s, "sys", "You find the generator in the dark, pull the cord four times, and the house roars back to life. Hero.", { anim: "cheer", key: 1 });
  } else {
    const sabs = s.sabs.filter((x) => x !== ME && !hmOf(s, x).out);
    if (sabs.length && r.chance(0.5)) {
      const x = r.pick(sabs);
      addGist(s, "receipt", `In the blackout you heard ${nameOf(s, x)} whisper: "Now is the time. Nobody can see us."`, `sab:${x}`, [x]);
      beat(s, "sys", `In the dark, you hear ${nameOf(s, x)} whisper something they shouldn't. Receipt saved.`, { key: 1 });
    } else if (r.chance(0.4)) {
      const by = r.pick(aiIn(s));
      bump(s, by.id, ME, SU, 15); bump(s, by.id, ME, TR, -8);
      beat(s, by.id, "Who is that creeping around? I can see your shadow!", { anim: "angry", key: 1 });
    } else beat(s, "sys", "You creep around in the dark and learn nothing, except that the lounge floor is very cold.");
  }
  void f;
};

FN_REG.letterPick = (s, r, v) => {
  const { named, truthful } = s.ev.data;
  const x = nameOf(s, named);
  if (v === "keep") {
    addGist(s, truthful ? "receipt" : "gist", `An anonymous letter told you to watch ${x}.`, truthful ? `sab:${named}` : `letter:${named}`, [named]);
    beat(s, "sys", "You fold the letter into your pocket. Your Gist Book has a new entry.");
  } else if (v === "show") {
    bump(s, named, ME, TR, 8); bump(s, named, ME, F, 4);
    beat(s, named, truthful ? "Somebody wrote THIS about me? ...Interesting. Very interesting." : "Who would write this? Thank you for showing me. Seriously.", { anim: truthful ? "sassy" : "sad", focus: named, key: 1 });
  } else beat(s, "sys", "The letter curls in the flame. Whoever wrote it will never know if it worked.");
};
// ---------------------------------------------------------------------------
// Event dispatch
// ---------------------------------------------------------------------------

function trigger(s, r, kind) {
  const me = s.hm[0];
  switch (kind) {
    case "night": if (nightEvent(s, r)) evRun(s, r); return;
    case "hoh": startHoh(s, r); break;
    case "wager": startWager(s, r); break;
    case "diary": if (!me.out) startDiary(s, r); else s.done[s.day + ":diary"] = true; break;
    case "noms": startNoms(s, r); break;
    case "nomreveal": startNomReveal(s, r); break;
    case "veto": startVeto(s, r); break;
    case "hustle": startHustle(s, r); break;
    case "wresult": startWresult(s, r); break;
    case "strike": if (strikeEvent(s, r)) evRun(s, r); return;
    case "strikereveal": startStrikeReveal(s, r); break;
    case "party": startParty(s, r); break;
    case "live": startLive(s, r); break;
    case "sleep": newDay(s, r); if (s.mission && !s.mission.done && s.day > s.mission.until) { s.mission.done = true; s.mission.failed = true; note(s, `${EYE}: Your secret mission has expired.`, "info"); } return;
    default: return;
  }
  evRun(s, r);
}

/** Advance the clock by n ticks, stopping when an event takes over. */
function run(s, r, n) {
  for (let i = 0; i < n; i++) {
    if (s.phase !== "ROAM") return;
    const due = advance(s, r);
    if (due) { trigger(s, r, due); if (s.phase !== "ROAM") return; if (due === "sleep") return; }
    else if (s.min % 30 === 20 && (maybeIncident(s, r) || maybeApproach(s, r))) { evRun(s, r); return; }
  }
}

function fastForward(s, r) {
  const target = nextEventMin(s);
  let guard = 0;
  const day = s.day;
  while (s.phase === "ROAM" && guard < 130) {
    guard += 1;
    const due = advance(s, r);
    if (due) { trigger(s, r, due); if (s.phase !== "ROAM" || due === "sleep" || s.day !== day) return; }
    else if (s.min % 30 === 20 && (maybeIncident(s, r) || maybeApproach(s, r))) { evRun(s, r); return; }
    if (s.min >= target && s.phase === "ROAM" && !due) return;
  }
}

// ---------------------------------------------------------------------------
// The six exports
// ---------------------------------------------------------------------------

export function setup(players) {
  return { v: 1, phase: "LOBBY", pid: players[0] || "" };
}

const PHASE_ACTIONS = {
  LOBBY: ["start"],
  EV: ["next", "skip", "pick", "score"],
  ROAM: ["tick", "ff", "room", "talk", "listen", "buy", "rest", "do"],
  END: [],
};

function current(s) { return s.ev ? s.ev.q[s.ev.i] : null; }

/** A beat that carries a result the player must see; skipping always stops on one. */
function isKeyBeat(b) { return !!(b.key || b.focus || b.out || b.reveal || b.board || b.ledger || b.votes || b.team || b.missing || b.callers); }

/** Skip ahead through talk to the next result, choice or mini-game. */
function skipBeats(s, r) {
  s.ev.i += 1;
  evRun(s, r);
  for (let guard = 0; s.ev && guard < 400; guard++) {
    const it = current(s);
    if (!it || !it.b || isKeyBeat(it.b)) return;
    s.ev.i += 1;
    evRun(s, r);
  }
}

/** The set the show is on right now (beats can move it mid-event). */
function stageNow(ev) {
  let st = ev.stage;
  for (let k = 0; k <= ev.i && k < ev.q.length; k++) if (ev.q[k].b && ev.q[k].b.stage) st = ev.q[k].b.stage;
  return st;
}

export function validateAction(state, playerId, action) {
  const s = state;
  if (!action || typeof action !== "object" || typeof action.t !== "string") return { ok: false, error: "bad action" };
  if (s.pid && playerId !== s.pid) return { ok: false, error: "not your season" };
  const allowed = PHASE_ACTIONS[s.phase] || [];
  if (!allowed.includes(action.t)) return { ok: false, error: `not now (${s.phase})` };
  const a = action;
  const me = s.hm ? s.hm[0] : null;
  switch (a.t) {
    case "start": {
      if (typeof a.name !== "string") return { ok: false, error: "name required" };
      const n = a.name.trim();
      if (n.length < 2 || n.length > 16) return { ok: false, error: "name must be 2-16 characters" };
      if (!/^[\p{L}\p{N} .'-]+$/u.test(n)) return { ok: false, error: "letters and numbers only" };
      if (a.look !== "f" && a.look !== "m") return { ok: false, error: "bad look" };
      if (!["random", "housemate", "saboteur"].includes(a.fate)) return { ok: false, error: "bad fate" };
      if (!isInt(a.seed)) return { ok: false, error: "bad seed" };
      return { ok: true };
    }
    case "next": case "skip": { const it = current(s); return it && it.b ? { ok: true } : { ok: false, error: "nothing to advance" }; }
    case "pick": {
      const it = current(s);
      if (!it || !it.c) return { ok: false, error: "no choice pending" };
      const vals = it.c.o.map((o) => o.v);
      if (it.c.n > 1) {
        if (!Array.isArray(a.v) || a.v.length !== it.c.n) return { ok: false, error: `pick ${it.c.n}` };
        if (new Set(a.v).size !== a.v.length) return { ok: false, error: "no duplicates" };
        if (!a.v.every((x) => typeof x === "string" && vals.includes(x))) return { ok: false, error: "bad pick" };
        return { ok: true };
      }
      if (typeof a.v !== "string" || !vals.includes(a.v)) return { ok: false, error: "bad pick" };
      return { ok: true };
    }
    case "score": {
      const it = current(s);
      if (!it || !it.m) return { ok: false, error: "no game running" };
      if (it.m.g === "jollof") return isInt(a.v) && a.v >= 0 && a.v <= 6000 ? { ok: true } : { ok: false, error: "bad score" };
      if (it.m.g === "dance") return isInt(a.v) && a.v >= 0 && a.v <= 100 ? { ok: true } : { ok: false, error: "bad score" };
      if (it.m.g === "hustle") {
        const v = a.v;
        if (!v || typeof v !== "object" || !isInt(v.profit) || v.profit < 0 || v.profit > 8000000) return { ok: false, error: "bad profit" };
        if (!isInt(v.skim) || v.skim < 0 || v.skim > 2000000 || (v.skim > 0 && me.role !== "S")) return { ok: false, error: "bad skim" };
        return { ok: true };
      }
      return { ok: false, error: "bad game" };
    }
    case "tick": case "ff": return { ok: true };
    case "do": {
      if (typeof a.what !== "string" || !DOINGS[a.what]) return { ok: false, error: "bad activity" };
      const why = canDo(s, a.what);
      return why ? { ok: false, error: why } : { ok: true };
    }
    case "rest": {
      if (me.out) return { ok: false, error: "you are out" };
      if (me.room !== "bedroom" && me.room !== "gym") return { ok: false, error: "rest in the bedroom or work out in the gym" };
      return { ok: true };
    }
    case "room": {
      if (me.out) return { ok: false, error: "you are out" };
      if (!ROAM_ROOMS.includes(a.room)) return { ok: false, error: "bad room" };
      if (a.room === "hoh" && s.hoh !== ME && s.tenant !== ME) return { ok: false, error: "The HoH Lounge is locked." };
      return { ok: true };
    }
    case "talk": {
      if (typeof a.who !== "string" || typeof a.act !== "string" || !ACTS[a.act]) return { ok: false, error: "bad move" };
      if (a.x !== undefined && typeof a.x !== "string") return { ok: false, error: "bad target" };
      if (a.claim !== undefined && typeof a.claim !== "string") return { ok: false, error: "bad claim" };
      const why = canTalk(s, a.who, a.act, a);
      return why ? { ok: false, error: why } : { ok: true };
    }
    case "listen": {
      if (!isInt(a.id)) return { ok: false, error: "bad scene" };
      const sc = s.scenes.find((z) => z.id === a.id);
      if (!sc || sc.until <= s.min || sc.d !== s.day) return { ok: false, error: "That conversation is over." };
      if (me.out || sc.room !== me.room) return { ok: false, error: "You're too far away to hear." };
      if (sc.heard) return { ok: false, error: "You already heard this one." };
      return { ok: true };
    }
    case "buy": {
      if (me.out) return { ok: false, error: "you are out" };
      if (a.item === "peek") return me.coins >= 150 ? { ok: true } : { ok: false, error: "A Sneak Peek costs 150 coins." };
      if (a.item === "immunity") {
        if (me.immune) return { ok: false, error: "You are already immune." };
        if (s.done["3:noms"]) return { ok: false, error: "Nominations are over this week." };
        return me.coins >= 800 ? { ok: true } : { ok: false, error: "The Immunity Token costs 800 coins." };
      }
      return { ok: false, error: "bad item" };
    }
  }
  return { ok: false, error: "unknown action" };
}

export function applyAction(state, playerId, action) {
  if (state.phase === "LOBBY") {
    return initSeason(state.pid || playerId, { name: action.name.trim(), look: action.look, fate: action.fate, seed: action.seed });
  }
  const s = clone(state);
  const r = rngFrom(s.seed);
  const a = action;
  const me = s.hm[0];
  s.last = a.t === "talk" ? s.last : null;
  switch (a.t) {
    case "next": s.ev.i += 1; evRun(s, r); break;
    case "skip": skipBeats(s, r); break;
    case "pick": {
      const it = current(s);
      s.ev.i += 1;
      FN[it.c.h](s, r, a.v, it.c.ctx);
      evRun(s, r);
      break;
    }
    case "score": {
      const it = current(s);
      s.ev.i += 1;
      FN[it.m.h](s, r, a.v);
      evRun(s, r);
      break;
    }
    case "tick": run(s, r, 1); break;
    case "ff": fastForward(s, r); break;
    case "do": doThing(s, r, a.what); run(s, r, DOINGS[a.what].ticks); break;
    case "rest": {
      if (me.room === "bedroom") { me.comp = clamp(me.comp + 15); note(s, "You rested. Composure +15.", "good"); run(s, r, 6); }
      else { me.comp = clamp(me.comp + 8); me.fans = clamp(me.fans + 1); note(s, "Good workout. Composure +8.", "good"); run(s, r, 3); }
      break;
    }
    case "room": me.room = a.room; me.spot = 0; break;
    case "talk": talk(s, r, a); break;
    case "listen": listen(s, r, a.id); break;
    case "buy": buy(s, r, a.item); break;
  }
  s.seed = r.state;
  return s;
}

export function isGameOver(state) {
  if (!state || state.phase !== "END" || !state.result) return { over: false };
  const res = state.result;
  return { over: true, winner: res.out ? "house" : "you", headline: res.headline, grade: res.grade };
}

// ---------------------------------------------------------------------------
// What the browser is allowed to see
// ---------------------------------------------------------------------------

const PUBLIC_KIND = { flirt: "flirt", kiss: "kiss", argue: "argue", gossip: "whisper", deal: "whisper", scheme: "whisper", bond: "chat", cry: "cry" };

export function viewFor(state, playerId) {
  const s = state;
  if (!s || s.phase === "LOBBY" || !s.hm) return { phase: "LOBBY" };
  const me = s.hm[0];
  const partner = me.role === "S" ? s.sabs.find((x) => x !== ME) : null;
  const over = s.phase === "END";
  const nomsPublic = s.done["3:nomreveal"] || s.day > 3;
  const hm = s.hm.slice(1).map((h) => {
    const v = rel(s, h.id, ME);
    const badges = [];
    if (s.hoh === h.id) badges.push("HOH");
    if (s.tenant === h.id) badges.push("TENANT");
    if (nomsPublic && s.noms.includes(h.id)) badges.push("NOMINATED");
    if (h.strikes) badges.push("STRIKES " + h.strikes);
    const sh = findShip(s, ME, h.id);
    return {
      id: h.id, name: h.name, out: h.out ? h.out.how : null, room: h.room, spot: h.spot, act: h.act, with: h.with, sc: h.sc, watch: h.watch || null,
      badges, strikes: h.strikes,
      feel: { f: level(v[F]), r: level(v[RO]), t: level(v[TR]), b: level(v[BF]) },
      promised: s.prom[h.id + ">" + ME] === "save", squad: inSquad(s, h.id), ship: sh ? (sh.official ? "official" : "spark") : null,
      role: over || h.id === partner || (h.out && h.out.how === "ejected") ? h.role : null,
      sab: h.id === partner ? true : undefined,
    };
  });
  const scenes = s.scenes.filter((sc) => sc.until > s.min && sc.d === s.day).map((sc) => ({ id: sc.id, k: PUBLIC_KIND[sc.k], room: sc.room, a: sc.a, b: sc.b, heard: sc.heard }));
  const it = s.ev ? s.ev.q[s.ev.i] : null;
  const ev = s.ev ? { k: s.ev.k, n: s.ev.n || 0, stage: s.ev.stage, stageNow: stageNow(s.ev), title: s.ev.title, i: s.ev.i, item: it ? { b: it.b, c: it.c ? Object.assign({}, it.c, { h: undefined, auto: undefined }) : undefined, m: it.m ? Object.assign({}, it.m, { h: undefined }) : undefined } : null } : null;
  const nextM = nextEventMin(s);
  const nextK = (SCHEDULE[s.day] || []).find(([m, k]) => m === nextM && !s.done[s.day + ":" + k]);
  return {
    phase: s.phase, day: s.day, dayName: DAYS[s.day], min: s.min, clock: hhmm(s.min), block: BLOCK_NAMES[blockOf(s.min)],
    pot: s.pot,
    you: {
      name: me.name, look: me.look, role: me.role, partner, energy: me.energy, coins: me.coins, comp: me.comp, fans: me.fans,
      strikes: me.strikes, room: me.room, immune: me.immune, out: me.out ? me.out.how : null,
      hoh: s.hoh === ME, tenant: s.tenant === ME, nominated: nomsPublic && s.noms.includes(ME),
      doings: Object.fromEntries(Object.keys(DOINGS).map((k) => [k, doneToday(s, k)])),
    },
    dark: !!s.dark && s.dark > s.day * 1440 + s.min,
    hm,
    ships: s.ships.filter((sh) => sh.official || sh.a === ME || sh.b === ME).map((sh) => ({ a: sh.a, b: sh.b, name: sh.name, official: sh.official })),
    beefs: s.beefs.slice(-20),
    squad: s.squads.find((q) => q.members.includes(ME)) || null,
    scenes, heard: s.heard, heardId: s.heardId || 0,
    gb: s.gb, feed: s.feed.slice(-12), notes: s.notes.slice(-8), last: s.last,
    hoh: s.hoh, tenant: s.tenant, noms: nomsPublic ? s.noms : [], teams: s.teams,
    mission: s.mission ? { text: s.mission.text, done: !!s.mission.done, failed: !!s.mission.failed } : null,
    lies: s.lies.map((l) => ({ to: l.to, about: l.about, c: l.c, exposed: l.exposed })),
    ev, next: nextK ? { at: hhmm(nextK[0]), k: nextK[1] } : null,
    log: s.log.slice(-15),
    result: s.result,
  };
}
