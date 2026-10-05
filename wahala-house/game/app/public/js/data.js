// Static data shared by the client: cast info, the house floor plan, spots.
// World units are metres. The camera looks from +x +z toward the origin, so the
// back walls sit on x = 0 and z = 0 and every "front" edge is cut away.

export const CAST = {
  tobi: { name: "Tobi", full: "Tobi \"Odogwu\" Balogun", color: "#f2b632", job: "Club promoter, Lagos Island", traits: ["Flirty", "Clout-chaser", "Loud"], sig: "Odogwu don land! Who dey vex?", g: "m" },
  ada: { name: "Ada", full: "Adaeze \"Ada Ada\" Nwosu", color: "#ff7a3d", job: "Skit-maker, Enugu", traits: ["Funny", "Messy"], sig: "I no talk anything o... but make I tell you something.", g: "f" },
  musa: { name: "Musa", full: "Musa Abdullahi", color: "#3b6fd8", job: "Architect, Kaduna", traits: ["Loyal", "Calm", "Romantic"], sig: "Patience. Everything reveals itself.", g: "m" },
  ivie: { name: "Ivie", full: "Ivie Osagie", color: "#e2338a", job: "Fashion designer, Benin City", traits: ["Flirty", "Strategic"], sig: "If you can't handle this energy, step aside.", g: "f" },
  kunle: { name: "Kunle", full: "Kunle \"Pastor K\" Adeyemi", color: "#e8e3d3", job: "Gospel singer, Ibadan", traits: ["Moral", "Jealous"], sig: "God is watching. And so am I.", g: "m" },
  ebi: { name: "Ebi", full: "Ebiere \"Ebi\" Pepple", color: "#12a36b", job: "Engineer, Port Harcourt", traits: ["Hot-tempered", "Loyal"], sig: "Try me. I dare you. Try me.", g: "f" },
  nedu: { name: "Nedu", full: "Chinedu \"Nedu Codes\" Okoro", color: "#2c4fb8", job: "Fintech founder, Yaba", traits: ["Strategic", "Calm", "Shady"], sig: "Everybody has a price. Even you.", g: "m" },
  nkoyo: { name: "Nkoyo", full: "Nkoyo Effiong", color: "#ff8c1a", job: "Chef and caterer, Calabar", traits: ["Nurturing", "Observant"], sig: "Sit down, eat first. Then talk.", g: "f" },
  zee: { name: "Zee", full: "Zainab \"Zee\" Bello", color: "#f5cf1d", job: "Law graduate, Abuja", traits: ["Competitive", "Shady"], sig: "I'm not rude. I'm just correct.", g: "f" },
  mekus: { name: "Mekus", full: "Emeka \"Mekus\" Okafor", color: "#d62f2f", job: "Trader, Onitsha", traits: ["Hustler", "Funny"], sig: "When money speaks, truth keeps quiet.", g: "m" },
};
export const AI_IDS = Object.keys(CAST);
export const MOODS = ["neutral", "happy", "flirty", "angry", "sad", "shock"];

/** Model file per character id (player looks are pf / pm). */
export const MODEL = { tobi: "tobi", ada: "ada", musa: "musa", ivie: "ivie", kunle: "kunle", ebi: "ebi", nedu: "nedu", nkoyo: "nkoyo", zee: "zee", mekus: "mekus", pf: "pf", pm: "pm", dapo: "dapo" };

export const FACE_CAM = Math.PI / 4; // rotation.y that faces the camera

// Room rectangles [x0, z0, x1, z1]. Detection checks in this order.
export const ROOM_RECTS = [
  ["hoh", 23, 0, 30, 8],
  ["gym", 11, 10, 16, 15],
  ["kitchen", 0, 0, 11, 10],
  ["lounge", 11, 0, 23, 10],
  ["bedroom", 0, 10, 11, 22],
  ["garden", 0, 8, 36, 26],
];
export const ROOM_NAMES = { lounge: "Lounge", kitchen: "Kitchen", garden: "Garden & Pool", bedroom: "Bedroom", gym: "Gym Corner", hoh: "HoH Lounge", diary: "Diary Room", arena: "Arena", redroom: "Red Room" };

export function roomAt(x, z) {
  for (const [id, x0, z0, x1, z1] of ROOM_RECTS) if (x >= x0 && x < x1 && z >= z0 && z < z1) return id;
  return "garden";
}

export const WORLD = { w: 36, d: 26 };

/**
 * Walls: [x0, z0, x1, z1, height, kind]. kind: "ext" full height back wall,
 * "low" cutaway partition, "hedge", "glass".
 */
export const WALLS = [
  [0, 0, 30, 0, 3.2, "ext"],
  [0, 0, 0, 22, 3.2, "ext"],
  [11, 0, 11, 3, 1.1, "low"], [11, 7, 11, 10, 1.1, "low"],
  [0, 10, 4, 10, 1.1, "low"], [6, 10, 11, 10, 1.1, "low"],
  [11, 10, 15, 10, 1.1, "glass"], [19, 10, 23, 10, 1.1, "glass"],
  [23, 0, 23, 5, 1.1, "low"], [23, 7, 23, 8, 1.1, "low"],
  [23, 8, 30, 8, 1.1, "low"],
  [11, 10, 11, 17, 1.1, "low"], [11, 19, 11, 22, 1.1, "low"],
  [0, 22, 11, 22, 0.6, "low"],
  [30, 0, 30, 8, 3.2, "ext"],
  [36, 8, 36, 26, 0.9, "hedge"], [0, 26, 36, 26, 0.9, "hedge"], [30, 8, 36, 8, 0.9, "hedge"],
];

/** The HoH doorway (locked unless you are HoH or Tenant). */
export const HOH_DOOR = [23, 5, 23, 7];

export const POOL = [15, 16.5, 25, 22.5];

/**
 * Furniture. t: type, p: [x, z], s: [w, d] footprint, r: rotation (radians),
 * block: whether it blocks walking. Types are built in world.js.
 */
export const FURNITURE = [
  // Lounge
  { t: "rug", p: [16.5, 3.4], s: [7.5, 5] },
  { t: "eyewall", p: [16.5, 0.12], s: [5, 0.1] },
  { t: "sofa", p: [16, 1.05], s: [6.4, 1.2], r: 0, block: true },
  { t: "sofa", p: [12.1, 3.6], s: [3.2, 1.2], r: Math.PI / 2, block: true },
  { t: "table", p: [16, 3.4], s: [2.2, 1.1], block: true, h: 0.4, c: "#6b3f22" },
  { t: "armchair", p: [21.2, 3], s: [1.1, 1.1], r: -Math.PI / 2, block: true },
  { t: "armchair", p: [21.2, 5.2], s: [1.1, 1.1], r: -Math.PI / 2, block: true },
  { t: "plant", p: [22.3, 0.8], s: [0.8, 0.8], block: true },
  { t: "plant", p: [11.8, 9.2], s: [0.8, 0.8], block: true },
  { t: "lamp", p: [13, 0.6], s: [0.4, 0.4] },
  // Kitchen
  { t: "counter", p: [5.2, 0.45], s: [9.6, 0.9], block: true, h: 0.95 },
  { t: "stove", p: [3.6, 0.45], s: [1.6, 0.9], block: true },
  { t: "fridge", p: [10.3, 0.5], s: [1, 0.9], block: true },
  { t: "counter", p: [5.5, 4.6], s: [5, 1.2], block: true, h: 0.95, island: true },
  { t: "stool", p: [4, 3.55], s: [0.5, 0.5] }, { t: "stool", p: [5.5, 3.55], s: [0.5, 0.5] }, { t: "stool", p: [7, 3.55], s: [0.5, 0.5] },
  { t: "table", p: [5.2, 7.8], s: [5.5, 1.3], block: true, h: 0.75, c: "#8a5a32" },
  { t: "chair", p: [3.4, 6.7], s: [0.5, 0.5], r: 0 }, { t: "chair", p: [5.2, 6.7], s: [0.5, 0.5], r: 0 }, { t: "chair", p: [7, 6.7], s: [0.5, 0.5], r: 0 },
  // Bedroom: two rows of six beds
  ...[0, 1, 2, 3, 4, 5].map((i) => ({ t: "bed", p: [1.35, 11 + i * 1.8], s: [2.1, 1.1], r: Math.PI / 2, block: true, c: i % 2 ? "#e2338a" : "#3b6fd8" })),
  ...[0, 1, 2, 3, 4, 5].map((i) => ({ t: "bed", p: [9.65, 11 + i * 1.8], s: [2.1, 1.1], r: -Math.PI / 2, block: true, c: i % 2 ? "#12a36b" : "#f2b632" })),
  { t: "dresser", p: [5.5, 10.5], s: [3, 0.6], block: true },
  // Gym
  { t: "bench", p: [13, 12.3], s: [1.6, 0.5], block: true },
  { t: "rack", p: [15.2, 10.6], s: [1.4, 0.5], block: true },
  { t: "mat", p: [13.5, 14], s: [2, 1] },
  // HoH
  { t: "kingbed", p: [26.5, 1.4], s: [2.4, 2.4], block: true },
  { t: "jacuzzi", p: [28.5, 5.8], s: [2, 2], block: true },
  { t: "sofa", p: [24.2, 5.2], s: [2, 1], r: Math.PI / 2, block: true },
  // Diary room exterior
  { t: "diarydoor", p: [31.5, 4], s: [2, 0.2] },
  // Garden
  { t: "pool", p: [20, 19.5], s: [10, 6], block: true },
  ...[0, 1, 2, 3, 4, 5].map((i) => ({ t: "lounger", p: [26.4, 17 + i * 1.1], s: [1.8, 0.7], r: -Math.PI / 2, block: true })),
  { t: "palm", p: [12.6, 11.8], s: [0.8, 0.8], block: true },
  { t: "palm", p: [34.6, 12.2], s: [0.8, 0.8], block: true },
  { t: "palm", p: [13.4, 24.8], s: [0.8, 0.8], block: true },
  { t: "palm", p: [34.8, 24.8], s: [0.8, 0.8], block: true },
  { t: "gazebo", p: [32.5, 20], s: [3.6, 3.6] },
  { t: "stage", p: [27.5, 10.6], s: [8, 3.2] },
  { t: "screen", p: [27.5, 8.1], s: [5, 0.1] },
  { t: "dj", p: [31.2, 9.6], s: [1.6, 0.9], block: true },
  { t: "benchG", p: [29.5, 24.6], s: [2.4, 0.6], block: true },
  { t: "plant", p: [23.6, 9.2], s: [0.8, 0.8], block: true },
  { t: "lights", p: [0, 0], s: [0, 0] },
  // Party mode: the generator NEPA always kills, two gas valves, and Mama Eye's bell.
  { t: "gen", p: [35.25, 15], s: [0.9, 1.3], r: -Math.PI / 2, block: true },
  { t: "valve", p: [0.18, 3], s: [0.3, 0.3], r: Math.PI / 2 },
  { t: "valve", p: [35.75, 22], s: [0.3, 0.3], r: -Math.PI / 2 },
  { t: "bell", p: [18.6, 5.6], s: [0.6, 0.6], block: true },
];

/**
 * Spots the server refers to by index. pose: stand | sit | bed | lounger | work.
 * r is the facing (rotation.y). Counts match ROOMS in the engine.
 */
export const SPOTS = {
  lounge: [
    { p: [13.6, 1.35], r: 0, pose: "sit", seat: 0.4 }, { p: [14.8, 1.35], r: 0, pose: "sit", seat: 0.4 }, { p: [16, 1.35], r: 0, pose: "sit", seat: 0.4 },
    { p: [17.2, 1.35], r: 0, pose: "sit", seat: 0.4 }, { p: [18.4, 1.35], r: 0, pose: "sit", seat: 0.4 },
    { p: [12.35, 2.9], r: Math.PI / 2, pose: "sit", seat: 0.4 }, { p: [12.35, 4.2], r: Math.PI / 2, pose: "sit", seat: 0.4 },
    { p: [21.1, 3], r: -Math.PI / 2, pose: "sit", seat: 0.4 },
  ],
  kitchen: [
    { p: [3.6, 1.35], r: Math.PI, pose: "stand", cook: 1 }, { p: [9.2, 1.4], r: Math.PI, pose: "stand" },
    { p: [4, 3.55], r: 0, pose: "sit", seat: 0.75 }, { p: [5.5, 3.55], r: 0, pose: "sit", seat: 0.75 }, { p: [7, 3.55], r: 0, pose: "sit", seat: 0.75 },
    { p: [5.2, 6.7], r: 0, pose: "sit", seat: 0.49 },
  ],
  garden: [
    ...[0, 1, 2, 3, 4, 5].map((i) => ({ p: [26.4, 17 + i * 1.1], r: -Math.PI / 2, pose: "lounger", seat: 0.41 })),
    { p: [32.5, 20], r: FACE_CAM, pose: "stand" }, { p: [14, 15.5], r: FACE_CAM, pose: "stand" },
    { p: [29.5, 24.42], r: Math.PI, pose: "sit", seat: 0.5 }, { p: [20, 15.4], r: 0, pose: "stand" },
  ],
  bedroom: [
    ...[0, 1, 2, 3, 4, 5].map((i) => ({ p: [1.35, 11 + i * 1.8], r: Math.PI / 2, pose: "bed", seat: 0.48 })),
    ...[0, 1, 2, 3, 4, 5].map((i) => ({ p: [9.65, 11 + i * 1.8], r: -Math.PI / 2, pose: "bed", seat: 0.48 })),
  ],
  gym: [
    { p: [13, 12.9], r: 0, pose: "work" }, { p: [15.2, 11.3], r: 0, pose: "work" }, { p: [13.5, 14], r: FACE_CAM, pose: "work" },
  ],
  hoh: [
    { p: [26.5, 2.35], r: 0, pose: "sit", seat: 0.53 }, { p: [24.5, 4.7], r: Math.PI / 2, pose: "sit", seat: 0.4 }, { p: [24.5, 5.8], r: Math.PI / 2, pose: "sit", seat: 0.4 }, { p: [28.5, 5.8], r: FACE_CAM, pose: "sit", seat: 0.3 },
  ],
};

/** Group layouts for events: a spot per housemate, everyone facing the camera. */
export function gatherLayout(room, n) {
  const out = [];
  const perRow = 6;
  if (room === "kitchen") {
    // Two rows along the room: between the island and the table, and behind the table.
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / perRow), col = i % perRow;
      const inRow = Math.min(perRow, n - row * perRow);
      out.push({ p: [5.6 + (col - (inRow - 1) / 2) * 1.35, row ? 9.25 : 6.05], r: FACE_CAM });
    }
    return out;
  }
  const centres = { lounge: [16.8, 5.4], arena: [28.6, 14.4], garden: [22, 13.5], redroom: [81.5, 3], diary: [61.5, 2.5] };
  const [cx, cz] = centres[room] || centres.lounge;
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / perRow), col = i % perRow;
    const inRow = Math.min(perRow, n - row * perRow);
    const off = (col - (inRow - 1) / 2) * 1.0;
    // Rows run along the screen horizontal: world (1, 0, -1) direction.
    const x = cx + off * 0.7071 + row * 0.9;
    const z = cz - off * 0.7071 + row * 0.9;
    out.push({ p: [x, z], r: FACE_CAM });
  }
  return out;
}

/** Stage marks. */
export const STAGE = {
  dapo: { p: [27.5, 10.4], r: FACE_CAM },
  gate: { p: [22, 26.5] },
  line: (i, n) => ({ p: [24.2 + i * 0.66, 11.4 - i * 0.0], r: FACE_CAM }),
  diary: { p: [61.5, 1.9], r: FACE_CAM },
  red: [{ p: [80.8, 2.4], r: FACE_CAM }, { p: [82.3, 1.6], r: FACE_CAM + 0.4 }, { p: [80, 3.6], r: FACE_CAM - 0.4 }],
};

/** Voice lines keyed by the start of what is said. */
export const VO = [
  [/^Housemates, this is Mama Eye/, "eye_welcome"],
  [/^Every room has eyes/, "eye_warning"],
  [/It is time for the Head of House game/i, "eye_hoh"],
  [/^Housemates, it is nomination day/, "eye_noms"],
  [/^The following housemates are up for eviction/, "eye_nomreveal"],
  [/^Sit\. Relax\. Mama Eye is listening/, "eye_diary"],
  [/^Last night, the Saboteurs struck/, "eye_strike"],
  [/OWAMBE!$/, "eye_owambe"],
  [/^Somebody in this house is stealing/, "eye_missing"],
  [/, that is a strike\.$/, "eye_strikewarn"],
  [/^Good evening, Nigeria! Welcome to the premiere/, "dapo_open"],
  [/^Good evening, Nigeria! This is the LIVE/, "dapo_live"],
  [/^THE BOTTOM TWO/, "dapo_bottom"],
  [/it's time for THE SHOWDOWN/, "dapo_showdown"],
  [/Week One is DONE/, "dapo_outro"],
  [/you have been evicted from Wahala House/, "dapo_evicted"],
  [/^Welcome to the Red Room/, "wh_welcome"],
  [/^You are a Saboteur/, "wh_saboteur"],
  [/^Choose who will not see Saturday/, "wh_strike"],
];

export const SPEAKERS = {
  eye: { name: "MAMA EYE", img: "assets/img/eye.jpg", color: "#1fbf7a" },
  dapo: { name: "DAPO KALU", img: "assets/portraits/dapo_happy.webp", color: "#8a3cff" },
  whisper: { name: "THE WHISPER", img: "assets/img/eye.jpg", color: "#d31b3a", red: true },
  sys: { name: "", img: null, color: "#f2b632" },
};

export const ACT_GROUPS = {
  VIBE: ["chat", "joke", "compliment", "deep", "hug", "gift"],
  LOVE: ["flirt", "askout", "kiss", "breakup"],
  SCHEME: ["gist", "setup", "asksave", "squad", "swear", "bribe", "receipt"],
  CONFRONT: ["shade", "argue", "accuse", "apologize", "peace"],
};
export const ACT_INFO = {
  chat: ["Chit-chat", 1, "Small talk. Builds friendship."], joke: ["Joke", 1, "Funny people love it."], compliment: ["Compliment", 1, "Sweet mouth. Some get suspicious."],
  deep: ["Deep Talk", 2, "High trust unlocks their secret."], hug: ["Hug", 1, "Only if they like you."], gift: ["Give Gift", 1, "Costs 60 coins."],
  flirt: ["Flirt", 1, "Romance up if they're into you."], askout: ["Ask Out", 2, "Make the ship official."], kiss: ["Kiss", 2, "High risk. High reward."], breakup: ["Break Up", 1, "End your ship."],
  gist: ["Spread Gist", 2, "Tell them something about someone. Lies are tracked."], setup: ["Set Up", 3, "Tell them someone bad-mouthed them."],
  asksave: ["Ask For Your Save", 1, "Secure a save before Wednesday."], squad: ["Propose Squad", 2, "Form an alliance."], swear: ["Swear Loyalty", 1, "Words are cheap here."],
  bribe: ["Bribe", 1, "Costs 120 coins. Moral people report it."], receipt: ["Share a Receipt", 2, "Show proof about someone."],
  shade: ["Throw Shade", 1, "Fans love it. They won't."], argue: ["Argue", 2, "Drama. Risk a strike."], accuse: ["Accuse: Saboteur", 2, "Everyone in the room hears it."],
  apologize: ["Apologize", 1, "Cool down some beef."], peace: ["Make Peace", 2, "End a beef for good."],
};
export const CLAIMS = { likes: "has a crush on you", hates: "has been talking bad about you", fake: "is fake and playing everybody", sab: "is a Saboteur", using: "is only using you for the game" };
