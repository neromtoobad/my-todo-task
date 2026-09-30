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
