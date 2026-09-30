// Housemates on screen: loading rigged models, fitting the shared move library
// to each body, walking them around the house and playing the right move.
import * as THREE from "three";
import { loader } from "./world.js";
import { restPose } from "./retarget.js";
import { MODEL, CAST, SPOTS, FACE_CAM } from "./data.js";

const HEIGHT = { m: 1.8, f: 1.7, dapo: 1.88 };
const LOOP = new Set(["idle", "walk", "talk", "talk2", "sassy", "angry", "sit", "sleep", "sunbathe", "sneak", "strut", "dance1", "dance2", "dance3", "workout", "happy", "heart", "sad", "wag", "cheer", "wave"]);

/** Strip horizontal root motion so moves play in place; the controller moves the body. */
function inPlace(clip) {
  for (const t of clip.tracks) {
    if (!t.name.endsWith("Hips.position")) continue;
    const v = t.values;
    const x0 = v[0], z0 = v[2];
    for (let i = 0; i < v.length; i += 3) { v[i] = x0; v[i + 2] = z0; }
  }
  return clip;
}

export class Actor {
  constructor(id, lib, look) {
    this.id = id;
    this.lib = lib;
    this.look = look || id;
    this.root = new THREE.Group();
    this.root.name = "actor:" + id;
    this.pos = new THREE.Vector3();
    this.face = FACE_CAM;
    this.wantFace = FACE_CAM;
    this.path = [];
    this.speed = 1.6;
    this.anim = null;
    this.baseAnim = "idle";
    this.oneShot = null;
    this.yOff = 0;
    this.visible = true;
    this.ready = false;
    this.clips = {};
  }

  async load() {
    const file = MODEL[this.look] || this.look;
    try {
      const g = await loader.loadAsync(`assets/chars/${file}.glb`);
      this.model = g.scene;
      this.model.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; o.frustumCulled = false; if (o.material) o.material.side = THREE.FrontSide; } });
      const box = new THREE.Box3().setFromObject(this.model);
      const h = box.max.y - box.min.y || 1.7;
      const target = this.look === "dapo" ? HEIGHT.dapo : HEIGHT[(CAST[this.look] && CAST[this.look].g) || (this.look === "pm" ? "m" : "f")] || 1.75;
      this.model.scale.setScalar(target / h);
      this.model.position.y = -box.min.y * (target / h);
      this.root.add(this.model);
      this.rest = restPose(this.model);
      this.mixer = new THREE.AnimationMixer(this.model);
      if (g.animations[0]) this.clips.walk = inPlace(g.animations[0].clone());
      this.ready = true;
    } catch (e) {
      // Stand-in so the game still works if a model fails to load.
      const col = (CAST[this.id] && CAST[this.id].color) || "#f2b632";
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 1.0, 6, 12), new THREE.MeshStandardMaterial({ color: col }));
      body.position.y = 0.8; body.castShadow = true;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), new THREE.MeshStandardMaterial({ color: 0x6b4226 }));
      head.position.y = 1.55;
      this.model = new THREE.Group(); this.model.add(body, head);
      this.root.add(this.model);
      this.fallback = true;
    }
    this.play("idle");
  }

  clip(key) {
    if (this.clips[key]) return this.clips[key];
    if (!this.rest || !this.lib || !this.lib.has(key)) return null;
    const c = inPlace(this.lib.clipFor(key, this.rest));
    this.clips[key] = c;
    return c;
  }

  /** Crossfade to a move. once: play one time then fall back to the base move. */
  play(key, opts = {}) {
    if (!this.mixer) { this.anim = key; return; }
    if (key === "walk" && !this.clips.walk) key = "idle";
    const c = this.clip(key) || this.clip("idle");
    if (!c) return;
    if (this.anim === key && !opts.restart) return;
    const next = this.mixer.clipAction(c);
    next.reset();
    next.setLoop(opts.once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    next.clampWhenFinished = !!opts.once;
    next.timeScale = opts.speed || 1;
    if (opts.offset) next.time = opts.offset * c.duration;
    next.enabled = true;
    next.fadeIn(opts.fade ?? 0.3).play();
    if (this.action && this.action !== next) this.action.fadeOut(opts.fade ?? 0.3);
    this.action = next;
    this.anim = key;
    this.oneShot = opts.once ? { until: performance.now() + Math.min(c.duration, opts.max || 6) * 1000 } : null;
  }

  /** Set the resting move (what they do when not walking). */
  setBase(key, yOff = 0) {
    this.baseAnim = key;
    this.baseY = yOff;
    if (!this.path.length && !this.oneShot) { this.yOff = yOff; this.play(key); }
  }

  /** Play a gesture for a few seconds, then return to the base move. */
  gesture(key, secs = 3.5) {
    if (!this.lib || !this.lib.has(key)) return;
    this.play(key, { restart: true });
    this.oneShot = { until: performance.now() + secs * 1000 };
  }

  place(x, z, face) {
    this.pos.set(x, 0, z);
    this.path = [];
    if (face !== undefined) { this.face = face; this.wantFace = face; }
    this.sync();
  }

  walkTo(world, x, z, face, onArrive) {
    const from = [this.pos.x, this.pos.z];
    const d = Math.hypot(x - from[0], z - from[1]);
    if (d < 0.08) { if (face !== undefined) this.wantFace = face; if (onArrive) onArrive(); return; }
    this.path = world.path(from, [x, z]);
    this.arriveFace = face;
    this.onArrive = onArrive || null;
    this.yOff = 0;
    this.play(this.sneaky ? "sneak" : "walk");
  }

  stop() { this.path = []; }

  update(dt, now) {
    if (this.mixer) this.mixer.update(dt);
    if (this.path.length) {
      const [tx, tz] = this.path[0];
      const dx = tx - this.pos.x, dz = tz - this.pos.z;
      const d = Math.hypot(dx, dz);
      const sp = this.speed * (this.hurry ? 2.2 : 1);
      if (d < sp * dt + 0.02) {
        this.pos.x = tx; this.pos.z = tz;
        this.path.shift();
        if (!this.path.length) {
          if (this.arriveFace !== undefined) this.wantFace = this.arriveFace;
          this.yOff = this.baseY || 0;
          this.play(this.baseAnim);
          const cb = this.onArrive; this.onArrive = null;
          if (cb) cb();
        }
      } else {
        this.pos.x += (dx / d) * sp * dt;
        this.pos.z += (dz / d) * sp * dt;
        this.wantFace = Math.atan2(dx, dz);
        if (this.action && this.anim !== "walk" && this.anim !== "sneak") this.play(this.sneaky ? "sneak" : "walk");
        if (this.action) this.action.timeScale = this.hurry ? 1.6 : 1;
      }
    } else if (this.oneShot && now > this.oneShot.until) {
      this.oneShot = null;
      this.play(this.baseAnim);
    }
    // Turn smoothly.
    let diff = this.wantFace - this.face;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.face += diff * Math.min(1, dt * 8);
    this.sync();
  }

  sync() {
    this.root.position.set(this.pos.x, this.yOff || 0, this.pos.z);
    this.root.rotation.y = this.face;
    this.root.visible = this.visible;
  }

  headWorld(out) { return out.set(this.pos.x, (this.yOff || 0) + 2.05, this.pos.z); }
}

/** Resting move and height offset for a spot pose and a server activity. */
export function restFor(pose, act) {
  if (act === "sleep") return pose === "bed" ? ["sleep", 0.62] : ["sit", 0];
  if (act === "sunbathe") return pose === "lounger" ? ["sunbathe", 0.38] : ["idle", 0];
  if (act === "workout") return ["workout", 0];
  if (act === "sit" || act === "rest" || act === "phone" || act === "eat") return pose === "sit" || pose === "bed" || pose === "lounger" ? ["sit", pose === "bed" ? 0.1 : 0] : ["idle", 0];
  if (act === "cook") return ["talk2", 0];
  return ["idle", 0];
}

/** Moves used when a scene is running between two housemates. */
export const SCENE_MOVES = {
  flirt: ["heart", "talk"], kiss: ["heart", "heart"], argue: ["angry", "wag"], whisper: ["talk", "talk2"],
  chat: ["talk", "happy"], cry: ["sad", "talk2"],
};
export const SCENE_ICON = { flirt: "💘", kiss: "💋", argue: "💢", whisper: "🤫", chat: "💬", cry: "😢" };

export function spotOf(room, i) {
  const list = SPOTS[room];
  if (!list || !list.length) return null;
  return list[((i % list.length) + list.length) % list.length];
}
