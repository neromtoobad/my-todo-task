// Party Mode data the client needs to draw and explain the game. The server's
// copies (party/03_map.js and party/06_meet.js) are the source of truth;
// party_sim.mjs fails if these drift from them.

export const STATIONS = {
  jollof: { kind: "task", label: "Stir the jollof", room: "kitchen", x: 3.6, z: 1.45, f: Math.PI, game: "stir", dur: 5, icon: "🍲" },
  plates: { kind: "task", label: "Wash the plates", room: "kitchen", x: 7.4, z: 1.45, f: Math.PI, game: "scrub", dur: 5, icon: "🍽️" },
  fridge: { kind: "task", label: "Restock the fridge", room: "kitchen", x: 10.1, z: 1.5, f: Math.PI, game: "tapall", dur: 5, icon: "🥤" },
  money: { kind: "task", label: "Count the market money", room: "lounge", x: 16, z: 4.6, f: Math.PI, game: "order", dur: 5, icon: "💵" },
  aerial: { kind: "task", label: "Fix the TV aerial", room: "lounge", x: 21.7, z: 1.9, f: Math.PI, game: "dial", dur: 5, icon: "📡" },
  cushions: { kind: "task", label: "Arrange the cushions", room: "lounge", x: 13.3, z: 3.6, f: -Math.PI / 2, game: "tapall", dur: 4, icon: "🛋️" },
  crown: { kind: "task", label: "Polish the HoH crown", room: "hoh", x: 26.5, z: 3.3, f: Math.PI, game: "scrub", dur: 4, icon: "👑" },
  jacuzzi: { kind: "task", label: "Skim the jacuzzi", room: "hoh", x: 27, z: 7.2, f: Math.PI / 2, game: "tapall", dur: 5, icon: "🫧" },
  weights: { kind: "task", label: "Rack the weights", room: "gym", x: 15.2, z: 11.5, f: Math.PI, game: "rhythm", dur: 5, icon: "🏋️" },
  laundry: { kind: "task", label: "Fold the laundry", room: "bedroom", x: 5.5, z: 11.4, f: Math.PI, game: "tapall", dur: 5, icon: "👕" },
  beds: { kind: "task", label: "Make the beds", room: "bedroom", x: 3.1, z: 15.4, f: -Math.PI / 2, game: "order", dur: 4, icon: "🛏️" },
  pool: { kind: "task", label: "Skim the pool", room: "garden", x: 20, z: 15.6, f: 0, game: "tapall", dur: 5, icon: "🍃" },
  plantain: { kind: "task", label: "Water the plantain", room: "garden", x: 14.6, z: 23.8, f: Math.PI, game: "hold", dur: 4, icon: "🌱" },
  sweep: { kind: "task", label: "Sweep the compound", room: "garden", x: 24.5, z: 12.6, f: Math.PI / 4, game: "scrub", dur: 5, icon: "🧹" },
  gen: { kind: "fix", label: "Fix the gen", room: "garden", x: 34.2, z: 15, f: Math.PI / 2, game: "pull", dur: 3, icon: "⚡" },
  gas1: { kind: "fix", label: "Close the gas valve", room: "kitchen", x: 0.95, z: 3, f: -Math.PI / 2, game: "hold", dur: 2, icon: "🔧" },
  gas2: { kind: "fix", label: "Close the gas valve", room: "garden", x: 34.9, z: 22, f: Math.PI / 2, game: "hold", dur: 2, icon: "🔧" },
  bell: { kind: "bell", label: "Ring Mama Eye's bell", room: "lounge", x: 18.6, z: 6.4, f: Math.PI, game: null, dur: 0, icon: "🔔" },
};
export const VISUAL = new Set(["jollof", "weights", "sweep", "pool", "plantain"]);

/** One-tap meeting lines, by index (must match the server's QUICK list). */
export const QUICK = [
  "Where was the body?",
  "I was in the {room}.",
  "I saw {name} near the body!",
  "{name} is sus.",
  "{name} was with me. Clear.",
  "I was doing my chores.",
  "Skip am. No evidence.",
  "Vote {name}!",
  "Na lie!",
  "No be me o!",
  "Who called this meeting?",
  "I fixed the gen.",
  "Watch the task bar.",
  "Ehen?! Explain yourself, {name}.",
  "I saw {name} in the {room}.",
  "Trust me abeg.",
];
export const ROOM_NAME = { lounge: "lounge", kitchen: "kitchen", garden: "garden", bedroom: "bedroom", gym: "gym", hoh: "HoH lounge" };
export const ROOM_LABEL = { lounge: "Lounge", kitchen: "Kitchen", garden: "Garden", bedroom: "Bedroom", gym: "Gym", hoh: "HoH Lounge" };

export const RANGE = { strike: 1.9, report: 2.6, use: 2.3, bell: 2.3 };
export const LOOKS = ["tobi", "ada", "musa", "ivie", "kunle", "ebi", "nedu", "nkoyo", "zee", "mekus", "pf", "pm"];
export const LOOK_NAME = { tobi: "Tobi", ada: "Ada", musa: "Musa", ivie: "Ivie", kunle: "Kunle", ebi: "Ebi", nedu: "Nedu", nkoyo: "Nkoyo", zee: "Zee", mekus: "Mekus", pf: "Classic (her)", pm: "Classic (him)" };
