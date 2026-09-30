// Music (crossfaded loops), sound effects and voice lines.
const BASE = "assets/audio/";

class Audio {
  constructor() {
    this.enabled = true;
    try { this.enabled = localStorage.getItem("wh:sound") !== "off"; } catch {}
    this.music = null;
    this.musicKey = null;
    this.vol = 0.45;
    this.cache = {};
    this.unlocked = false;
  }
  unlock() { this.unlocked = true; if (this.pendingMusic) { const k = this.pendingMusic; this.pendingMusic = null; this.playMusic(k); } }
  toggle() {
    this.enabled = !this.enabled;
    try { localStorage.setItem("wh:sound", this.enabled ? "on" : "off"); } catch {}
    if (!this.enabled && this.music) this.music.pause();
    if (this.enabled && this.music) this.music.play().catch(() => {});
    return this.enabled;
  }
  el(key) {
    if (!this.cache[key]) { const a = new window.Audio(BASE + key + ".mp3"); a.preload = "auto"; this.cache[key] = a; }
    return this.cache[key];
  }
  playMusic(key) {
    if (this.musicKey === key) return;
    if (!this.unlocked) { this.pendingMusic = key; return; }
    this.musicKey = key;
    const old = this.music;
    if (!key) { if (old) this.fadeOut(old); this.music = null; return; }
    const a = new window.Audio(BASE + key + ".mp3");
    a.loop = true; a.volume = 0;
    this.music = a;
    if (this.enabled) a.play().catch(() => {});
    this.fadeTo(a, this.vol, 1200);
    if (old) this.fadeOut(old);
  }
  fadeOut(a) { this.fadeTo(a, 0, 900, () => a.pause()); }
  fadeTo(a, v, ms, done) {
    const start = a.volume, t0 = performance.now();
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / ms);
      a.volume = Math.max(0, Math.min(1, start + (v - start) * k));
      if (k < 1) requestAnimationFrame(step); else if (done) done();
    };
    step();
  }
  sfx(key, vol = 0.7) {
    if (!this.enabled || !this.unlocked || !key) return;
    const a = this.el(key).cloneNode();
    a.volume = vol;
    a.play().catch(() => {});
  }
  voice(key) {
    if (!this.enabled || !this.unlocked || !key) return;
    if (this.vo) this.vo.pause();
    const a = this.el(key).cloneNode();
    a.volume = 0.95;
    this.vo = a;
    if (this.music) { this.fadeTo(this.music, this.vol * 0.35, 300); a.addEventListener("ended", () => this.music && this.fadeTo(this.music, this.vol, 600)); }
    a.play().catch(() => {});
  }
  /** The current music element, used by the rhythm game to stay on beat. */
  musicTime() { return this.music ? this.music.currentTime : 0; }
}

export const audio = new Audio();
