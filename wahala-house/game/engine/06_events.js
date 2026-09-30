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
  s.ev = { k, stage, title: title || "", q: [], i: 0, data: {} };
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
  order.forEach((id, i) => {
    const c = BY[id];
    beat(s, id, c.sig, { enter: id, anim: "strut", sub: `${c.full}, ${c.age}. ${c.job} from ${c.from}.` });
    beat(s, "dapo", DAPO_QUIPS[i % DAPO_QUIPS.length]);
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
  beat(s, "sys", "Walk anywhere with WASD, the arrow keys, or by tapping the floor. Walk up to a housemate and press E, or tap them, to talk.", { tip: 1 });
  beat(s, "sys", "Every day you get 10 Social Energy. Spend it to build friendships, ships, squads... or beef.", { tip: 1 });
  beat(s, "sys", "When people whisper nearby, press L or tap LISTEN to eavesdrop. What you witness becomes a Receipt in your Gist Book (J).", { tip: 1 });
  beat(s, "sys", "The clock is always running. Press F to fast-forward to the next event.", { tip: 1 });
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

function aiJollof(s, r, h) { return 900 + BY[h.id].ck * 260 + r.int(900) - (h.comp < 40 ? 250 : 0); }

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
