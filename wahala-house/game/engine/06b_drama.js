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
