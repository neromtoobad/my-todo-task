// ---------------------------------------------------------------------------
// House meetings: chat, votes, and the eviction.
// ---------------------------------------------------------------------------

/**
 * One-tap lines. {name} and {room} are filled from the action. Shared with the
 * client by index, so only append to this list.
 */
const QUICK = [
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
const QUICK_NEEDS = QUICK.map((q) => ({ name: q.includes("{name}"), room: q.includes("{room}") }));

/** Whole words that are starred, and stems starred inside any word. Names like Dickson or Shitta stay. */
const BAD = [
  "fuk", "fck", "shit", "bitch", "dick", "pussy", "asshole", "bastard", "slut", "fag", "retard", "rape", "porn",
  "ashawo", "ashewo", "olosho", "oloshi", "dickhead", "mf", "toto", "prick", "wanker", "twat", "penis", "vagina",
].map(collapse);
const BAD_STEM = ["fuck", "cunt", "nigg", "fagot", "motherf", "bitch", "whore"].map(collapse);
const LEET = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s", "!": "i" };
function collapse(w) { return w.replace(/(.)\1+/g, "$1"); }
function norm(w) { return collapse(w.toLowerCase().split("").map((c) => LEET[c] || c).join("").replace(/[^a-z]/g, "")); }
function badWord(w) { const n = norm(w); if (n.length < 2) return false; return BAD.includes(n) || BAD.includes(n.replace(/s$/, "")) || BAD_STEM.some((b) => n.includes(b)); }
function hasBadWord(text) { return String(text).split(/\s+/).some(badWord); }
/** Swear filter and link stripper for typed chat. */
function cleanChat(raw) {
  let t = String(raw || "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 100);
  t = t.replace(/\b(https?:\/\/|www\.)\S+/gi, "[link]").replace(/\b\S+\.(com|ng|net|org|io|ly|co|me|xyz|app)\b\S*/gi, "[link]");
  t = t.split(" ").map((w) => (badWord(w) ? "*".repeat(Math.min(6, w.length)) : w)).join(" ");
  return t;
}

function startMeeting(s, by, kind, bodyId) {
  s.stats.meetings += 1;
  const reporter = pOf(s, by);
  const body = s.bodies.find((x) => x.id === bodyId);
  const where = body ? roomAt(body.x, body.z) : reporter ? roomAt(reporter.x, reporter.z) : null;
  // Everyone learns who is dead; bodies are cleared away.
  for (const p of s.ps) if (!p.alive) p.known = true;
  s.bodies = [];
  if (s.sab && s.sab.k === "nepa") s.sab = null;
  const order = R.shuffle(s, living(s).map((p) => p.id));
  order.forEach((id, i) => { const p = pOf(s, id); const seat = SEATS[i % SEATS.length]; p.x = seat[0]; p.z = seat[1]; p.f = seat[2]; p.tp += 1; p.act = null; p.mv = 0; p.at = s.now; });
  for (const p of s.ps) p.voted = null;
  s.meet = { by, kind, body: bodyId || null, room: where, at: s.now, chat: [], seats: order };
  s.phase = "MEET"; s.ends = s.now + s.opts.discuss * 1000;
  feed(s, kind === "body" ? `${reporter ? reporter.name : "Someone"} found ${nameOf(s, bodyId)}'s body!` : `${reporter ? reporter.name : "Someone"} rang Mama Eye's bell!`, "meet");
  botsPlanMeeting(s);
}
function nameOf(s, id) { const p = pOf(s, id); return p ? p.name : "someone"; }

function chatLine(s, p, text, extra) {
  s.dirty = true;
  s.cid += 1;
  s.meet.chat.push(Object.assign({ i: s.cid, w: p.id, t: text, g: p.alive ? 0 : 1, at: s.now }, extra || {}));
  if (s.meet.chat.length > 60) s.meet.chat.splice(0, s.meet.chat.length - 60);
  p.lastChat = s.now;
}

function checkChat(s, p, a) {
  if (s.phase !== "MEET" && s.phase !== "VOTE") return "Chat opens at House Meetings.";
  if (p.spec) return "spectating";
  if (s.now - (p.lastChat || 0) < 1200) return "Slow down small.";
  if (a.q !== undefined) {
    if (!Number.isInteger(a.q) || a.q < 0 || a.q >= QUICK.length) return "bad line";
    const need = QUICK_NEEDS[a.q];
    if (need.name && !(typeof a.who === "string" && pOf(s, a.who))) return "Pick who.";
    if (need.room && !(typeof a.room === "string" && ROOM_NAME[a.room])) return "Pick where.";
    return null;
  }
  if (typeof a.text !== "string" || !a.text.trim()) return "Say something.";
  if (a.text.length > 140) return "Too long.";
  return null;
}
function applyChat(s, p, a) {
  if (a.q !== undefined) {
    const text = QUICK[a.q].replace(/\{name\}/g, a.who ? nameOf(s, a.who) : "").replace(/\{room\}/g, a.room ? ROOM_NAME[a.room] : "");
    chatLine(s, p, text, { q: a.q, about: a.who || null });
  } else {
    const text = cleanChat(a.text);
    if (!text) return;
    chatLine(s, p, text);
  }
  if (p.alive) botsHear(s, s.meet.chat[s.meet.chat.length - 1]);
}

function checkVote(s, p, a) {
  if (s.phase !== "VOTE") return "Voting has not started.";
  if (!p.alive || p.spec) return "Only living housemates vote.";
  if (p.voted) return "You already voted.";
  if (a.who !== "skip") { const t = pOf(s, a.who); if (!t || !t.alive || t.spec) return "Pick a living housemate."; }
  return null;
}
function applyVote(s, p, who) {
  s.dirty = true;
  p.voted = who;
  if (living(s).every((q) => q.voted)) s.ends = Math.min(s.ends, s.now + 1500);
}

function openVote(s) { s.phase = "VOTE"; s.ends = s.now + s.opts.vote * 1000; botsPlanVotes(s); }

function closeVote(s) {
  const tally = {};
  let skips = 0;
  for (const p of living(s)) {
    if (!p.voted || p.voted === "skip") { skips += 1; continue; }
    (tally[p.voted] = tally[p.voted] || []).push(p.id);
  }
  let top = null, topN = 0, tie = false;
  for (const [id, list] of Object.entries(tally)) {
    if (list.length > topN) { top = id; topN = list.length; tie = false; } else if (list.length === topN) tie = true;
  }
  let out = null;
  if (top && !tie && topN > skips) out = top;
  s.res = { out, tally, skips, tie: !!tie && topN > 0, role: null, at: s.now };
  if (out) {
    const p = pOf(s, out);
    p.alive = false; p.ejected = true; p.known = true; p.deadAt = s.now; p.act = null;
    s.res.role = p.role;
    feed(s, `${p.name} was evicted.`, "evict");
  } else feed(s, tie ? "It's a tie. Nobody leaves." : "The house skipped. Nobody leaves.", "evict");
  s.phase = "RESULT"; s.ends = s.now + T.result;
}

/** After the reveal: win check, then everyone back to the lounge and on with it. */
function afterResult(s) {
  s.meet = null;
  checkWin(s);
  if (s.phase === "END") return;
  const spots = R.shuffle(s, SPAWN);
  living(s).forEach((p, i) => { p.x = spots[i % spots.length][0]; p.z = spots[i % spots.length][1]; p.f = Math.PI; p.tp += 1; p.at = s.now; });
  for (const p of s.ps) if (isSab(p)) p.cd = s.now + s.opts.kill * 1000;
  s.sabAt = Math.max(s.sabAt, s.now + T.sabCd / 2);
  s.bellAt = s.now + T.bellLock;
  s.res = null;
  s.phase = "PLAY"; s.ends = 0;
}
