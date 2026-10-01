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
