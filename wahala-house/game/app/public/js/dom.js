// Tiny DOM helpers shared by the HUD and the chores.

export const $ = (s, r = document) => r.querySelector(s);

export function el(tag, attrs, ...kids) {
  const n = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === "class") n.className = v;
    else if (k === "text") n.textContent = v;
    else if (k === "html") n.innerHTML = v;
    else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
    else if (k === "style" && typeof v === "object") { for (const [sk, sv] of Object.entries(v)) { if (sk.startsWith("--")) n.style.setProperty(sk, sv); else n.style[sk] = sv; } }
    else n.setAttribute(k, v);
  }
  for (const k of kids.flat()) if (k !== null && k !== undefined && k !== false) n.append(k.nodeType ? k : document.createTextNode(String(k)));
  return n;
}

/** Portrait for a look (the ten housemates, the two classic looks, or Dapo). */
export function portrait(look, mood = "neutral") {
  if (look === "dapo") return `assets/portraits/dapo_${mood === "neutral" ? "happy" : mood}.webp`;
  return `assets/portraits/${look || "pf"}_${mood}.webp`;
}

export const LOOK_COLOR = {
  tobi: "#f2b632", ada: "#ff7a3d", musa: "#3b6fd8", ivie: "#e2338a", kunle: "#e8e3d3", ebi: "#12a36b",
  nedu: "#2c4fb8", nkoyo: "#ff8c1a", zee: "#f5cf1d", mekus: "#d62f2f", pf: "#c56cf0", pm: "#4fd1c5",
};

export function mmss(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
