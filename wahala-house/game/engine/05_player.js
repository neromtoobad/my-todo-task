// ---------------------------------------------------------------------------
// The player's moves (interaction wheel)
// ---------------------------------------------------------------------------

/** What the player says for each move. */
const SAY = {
  chat: ["How far? How is the house treating you?", "Talk to me. What's the gist today?", "You good? You look like you've been thinking.", "Abeg, how was your night? You look like you didn't sleep.", "Tell me something nobody in this house knows about you.", "What's the vibe today? I'm bored."],
  joke: ["Why did the jollof go to school? To get more flavour. Hahaha!", "If Mama Eye was a person, she'd be that auntie at every party.", "Tobi's chain is so heavy, it has its own Wi-Fi.", "They said this house has no internet. That's why everybody is connecting.", "My mother said I'd never be on TV. Mummy, look at me now!", "Mama Eye sees everything. Mama Eye, please, have you seen my slippers?"],
  compliment: ["Your outfit today? Unmatched.", "You have the best energy in this house, honestly.", "I like how you carry yourself. Real class.", "You walk like you own this house.", "Honestly, your laugh makes this place better."],
  deep: ["Can we talk for real? No cameras, no games.", "What made you come here? The real reason.", "Who are you when nobody is watching?", "Do you ever think about just walking out?", "What would you really do with the money?"],
  hug: ["Come here, big hug.", "You look like you need a hug.", "Come here. You look like you've had a day."],
  gift: ["I saved you a plate of jollof. The good part.", "Small something for you. Don't say I never did anything.", "I bought this with my hustle money. For you.", "You've been good to me. Take this."],
  flirt: ["Has anybody told you that you look dangerous today?", "I keep finding reasons to sit next to you. Funny.", "If this house had a crush list, you'd be top.", "Stop smiling like that. You're distracting me.", "I came here for the money. Now I'm confused."],
  askout: ["Let's stop pretending. Be my person in this house.", "I like you. For real. Let's make it official.", "I don't want to play games with you. Be mine."],
  kiss: ["Come here..."],
  breakup: ["I think we should just be friends.", "This thing between us... it's not working."],
  gist: ["Between us... {x} {claim}.", "I shouldn't tell you this, but {x} {claim}."],
  setup: ["I heard {x} talking about you. It wasn't sweet.", "You didn't hear it from me, but {x} is not your friend."],
  asksave: ["Wednesday is coming. Can I count on your save?", "If I'm in trouble, will you save me?"],
  squad: ["You, me, and a few real ones. Let's run this house.", "Let's form a squad. We protect each other.", "I trust you. Let's watch each other's backs."],
  swear: ["I swear, I've got your back. No matter what.", "Loyalty. You have mine.", "Whatever happens on Wednesday, I'm with you."],
  bribe: ["There's something small in it for you if you save me.", "Let's help each other. I'll make it worth your while."],
  receipt: ["I saw it with my own eyes. {x} {receipt}.", "Receipts don't lie. {x} {receipt}."],
  shade: ["Some people in this house are all noise, no sense.", "Nice outfit. Did it come with a refund?", "Loud people are usually empty. Just saying.", "Some people are only loud because nobody listens to them.", "That outfit is brave. Very brave."],
  argue: ["You need to stop talking about me!", "I'm tired of your attitude, honestly!", "Say it to my face! Go on!", "I've been quiet long enough!", "Who do you think you are, talking to me like that?"],
  accuse: ["I know what you are. You're a Saboteur.", "Stop pretending. You work for The Whisper."],
  apologize: ["I'm sorry. I was wrong.", "My bad. I shouldn't have done that.", "I messed up. I know. I'm sorry."],
  peace: ["Let's end this. Peace?", "No more wahala between us. Truce?", "We're both tired of this. Let's end it."],
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

  const cb = callbackFor(s, r, t, act);
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
  if (cb && cb.tone) score += cb.tone > 0 ? 6 : act === "apologize" || act === "peace" ? -4 : -8;
  const out = outcomeOf(score);
  // A warm memory before a cold answer reads wrong; keep it for another time.
  if (cb && ((cb.tone > 0 && out === "bad") || (cb.tone < 0 && out === "good" && act !== "apologize" && act !== "peace"))) { if (cb.ref) cb.ref.cb = false; }
  else if (cb) lines.push({ w: t, t: cb.t, mood: cb.tone < 0 ? "angry" : cb.tone > 0 ? "happy" : "neutral", anim: cb.tone < 0 ? "wag" : cb.tone > 0 ? "happy" : "talk2" });
  const said = fill(s, r, r.pick(replyBank(r, t, act, out)), t, { x, romantic: romantic && out === "good" });
  lines.push({ w: t, t: said });

  const plus = (idx, d, label) => { bump(s, t, ME, idx, d); if (label) fx.push(label); };
  switch (act) {
    case "chat": if (out === "good") { plus(F, 6, `${h.name} likes you more`); plus(TR, 3); } else if (out === "meh") plus(F, 2); else plus(F, -2, `${h.name} was not feeling it`); break;
    case "joke":
      if (out === "good") { plus(F, 8, `${h.name} is laughing`); h.comp = clamp(h.comp + 5); remember(s, t, { k: "laughed", x: ME }); me.fans = clamp(me.fans + 2); fx.push("Fans +2"); if (s.mission && s.mission.k === "laugh" && s.mission.who === t && !s.mission.done) { s.mission.n = (s.mission.n || 0) + 1; if (s.mission.n >= 2) completeMission(s, r); } for (const w of witnesses) bump(s, w.id, ME, F, 2); }
      else if (out === "bad") plus(F, -3, "That joke flopped");
      break;
    case "compliment": if (out === "good") { plus(F, 5, `${h.name} is flattered`); plus(RO, v[AT] / 10); } else if (out === "bad") plus(TR, -3, `${h.name} thinks you want something`); break;
    case "deep":
      if (out === "good") {
        plus(TR, 8, "They opened up to you"); plus(F, 6); me.comp = clamp(me.comp + 8); remember(s, t, { k: "deep", x: ME });
        if (!s.gb.some((g) => g.k === "secret" && g.about.includes(t))) addGist(s, "secret", `${h.name}'s secret: "${SECRETS[t]}"`, "secret:" + t, [t]);
      } else if (out === "meh") plus(F, 3); else plus(TR, -2, `${h.name} shut you out`);
      break;
    case "hug": if (out === "good") { plus(F, 5, "Warm hug"); h.comp = clamp(h.comp + 5); me.comp = clamp(me.comp + 3); } else if (out === "bad") plus(F, -4, `${h.name} didn't want that`); break;
    case "gift": if (out !== "bad") remember(s, t, { k: "gift", x: ME }); if (out === "good") { plus(F, 10, `${h.name} loved the gift`); plus(TR, 4); } else if (out === "meh") plus(F, 4); else plus(F, -2); if (s.mission && s.mission.k === "gift" && s.mission.who === t && !s.mission.done) completeMission(s, r); break;
    case "flirt":
      if (out === "good") { plus(RO, 6 + v[AT] / 10, `${h.name} is blushing`); me.fans = clamp(me.fans + 2); if (rel(s, t, ME)[RO] >= 55 && rel(s, ME, t)) makeShip(s, r, ME, t, false); }
      else if (out === "meh") plus(RO, 2); else { plus(F, -3, `${h.name} curved you`); me.comp = clamp(me.comp - 4); remember(s, t, { k: "curved", x: ME }); }
      jealousy(s, r, t, witnesses, 8);
      break;
    case "askout":
      if (out === "good") {
        const sh = makeShip(s, r, ME, t, true); plus(RO, 10, `You and ${h.name} are official! #${sh.name}`); me.fans = clamp(me.fans + 8); h.fans = clamp(h.fans + 5);
        tweet(s, r, "ship", ME, t, sh.name); jealousy(s, r, t, inHouse(s).filter((q) => !q.human), 12);
      } else if (out === "meh") plus(RO, 2); else { plus(RO, -8, "Rejected. On camera."); plus(F, -4); me.comp = clamp(me.comp - 8); me.fans = clamp(me.fans + 2); remember(s, t, { k: "curved", x: ME }); }
      break;
    case "kiss":
      if (out === "good") {
        const sh = makeShip(s, r, ME, t, true); plus(RO, 12, "The kiss of the season!"); me.fans = clamp(me.fans + 10); h.fans = clamp(h.fans + 6);
        tweet(s, r, "kiss", ME, t, sh.name); logEv(s, `${me.name} and ${h.name} kissed in the ${ROOMS[me.room].name}.`, "kiss");
        jealousy(s, r, t, inHouse(s).filter((q) => !q.human), 16);
        for (const w of witnesses) remember(s, w.id, { k: "kiss", x: ME, y: t, room: ROOMS[me.room].name.toLowerCase() });
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
      addBeef(s, ME, t); remember(s, t, { k: "shaded", x: ME });
      break;
    case "argue":
      remember(s, t, { k: "fight", x: ME, y: t });
      for (const w of witnesses) remember(s, w.id, { k: "fight", x: ME, y: t, room: ROOMS[me.room].name.toLowerCase() });
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
