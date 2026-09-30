// Animation library + retargeting.
//
// Every move was bought once, on one rig. lib.json stores, per clip, that rig's
// rest pose and its rotation keys. At runtime we rebuild the source skeleton,
// then copy each bone's world-space rotation change onto every housemate, so
// one mocap clip drives bodies of any size. The hip translation is scaled by
// the ratio of hip heights so feet stay on the floor.
import * as THREE from "three";

export const BONES = new Set([
  "Hips", "Spine", "Spine01", "Spine02", "neck", "Head", "head_end", "headfront",
  "LeftShoulder", "LeftArm", "LeftForeArm", "LeftHand", "RightShoulder", "RightArm", "RightForeArm", "RightHand",
  "LeftUpLeg", "LeftLeg", "LeftFoot", "LeftToeBase", "RightUpLeg", "RightLeg", "RightFoot", "RightToeBase",
]);

function bonesOf(root) {
  const out = {};
  root.traverse((o) => { if ((o.isBone || BONES.has(o.name)) && !out[o.name]) out[o.name] = o; });
  return out;
}

function depthOf(o) { let d = 0; let p = o.parent; while (p) { d++; p = p.parent; } return d; }

/** Rest-pose data for a character or source skeleton (call before animating it). */
export function restPose(root) {
  root.updateMatrixWorld(true);
  const bones = bonesOf(root);
  const data = { bones: {}, order: [], parent: {} };
  for (const [n, b] of Object.entries(bones)) {
    data.bones[n] = {
      wq: b.getWorldQuaternion(new THREE.Quaternion()),
      lp: b.position.clone(),
      pw: b.parent ? b.parent.getWorldQuaternion(new THREE.Quaternion()) : new THREE.Quaternion(),
    };
    data.parent[n] = b.parent && bones[b.parent.name] === b.parent ? b.parent.name : null;
  }
  data.order = Object.keys(bones).sort((a, b) => depthOf(bones[a]) - depthOf(bones[b]));
  const hips = bones.Hips;
  data.hipH = hips ? Math.max(0.01, hips.getWorldPosition(new THREE.Vector3()).y - root.getWorldPosition(new THREE.Vector3()).y) : 1;
  return data;
}

/** Build a bare node hierarchy from a lib.json rest pose. */
function buildSkeleton(rest) {
  const root = new THREE.Group();
  const nodes = rest.map((r) => {
    const o = new THREE.Object3D();
    o.name = r.n;
    o.position.fromArray(r.t);
    o.quaternion.fromArray(r.r);
    o.scale.fromArray(r.s);
    return o;
  });
  rest.forEach((r, i) => { (r.p >= 0 ? nodes[r.p] : root).add(nodes[i]); });
  return root;
}

/** Source clip → sampled world-space deltas, computed once per clip and shared by everyone. */
function prepare(clipDef, fps) {
  const src = buildSkeleton(clipDef.rest);
  const srcRest = restPose(src);
  const bones = bonesOf(src);
  const n = clipDef.n;
  const trackBy = {};
  for (const t of clipDef.tracks) trackBy[t.n + ":" + t.p] = t.v;
  const deltas = {}; // bone → Float32Array(n*4) world delta quats
  const names = srcRest.order.filter((b) => srcRest.bones[b]);
  for (const b of names) deltas[b] = new Float32Array(n * 4);
  const hip = new Float32Array(n * 3);
  const q = new THREE.Quaternion(), inv = new THREE.Quaternion(), w = new THREE.Quaternion();
  for (let i = 0; i < n; i++) {
    for (const b of names) {
      const v = trackBy[b + ":q"];
      if (v) bones[b].quaternion.set(v[i * 4], v[i * 4 + 1], v[i * 4 + 2], v[i * 4 + 3]);
    }
    const hv = trackBy["Hips:t"];
    if (hv && bones.Hips) bones.Hips.position.set(hv[i * 3], hv[i * 3 + 1], hv[i * 3 + 2]);
    src.updateMatrixWorld(true);
    for (const b of names) {
      bones[b].getWorldQuaternion(w);
      q.copy(w).multiply(inv.copy(srcRest.bones[b].wq).invert());
      deltas[b].set([q.x, q.y, q.z, q.w], i * 4);
    }
    if (bones.Hips) {
      const p = bones.Hips.position, rp = srcRest.bones.Hips.lp;
      hip.set([p.x - rp.x, p.y - rp.y, p.z - rp.z], i * 3);
    }
  }
  return { n, dur: clipDef.dur, fps, deltas, hip, srcHipH: srcRest.hipH, names };
}

export class AnimLib {
  constructor(json) {
    this.fps = json.fps;
    this.defs = json.clips;
    this.prepared = {};
  }
  has(key) { return !!this.defs[key]; }
  /** A THREE.AnimationClip of `key` fitted to this character's skeleton. */
  clipFor(key, dstRest) {
    const def = this.defs[key];
    if (!def) return null;
    const P = this.prepared[key] || (this.prepared[key] = prepare(def, this.fps));
    const n = P.n;
    const times = new Float32Array(n);
    for (let i = 0; i < n; i++) times[i] = Math.min(P.dur, i / this.fps);
    const order = dstRest.order.filter((b) => P.deltas[b]);
    const world = {};
    const out = {};
    for (const b of order) out[b] = new Float32Array(n * 4);
    const hp = new Float32Array(n * 3);
    const d = new THREE.Quaternion(), w = new THREE.Quaternion(), l = new THREE.Quaternion(), pw = new THREE.Quaternion();
    const scale = dstRest.hipH / (P.srcHipH || 1);
    for (let i = 0; i < n; i++) {
      for (const b of order) {
        const dv = P.deltas[b];
        d.set(dv[i * 4], dv[i * 4 + 1], dv[i * 4 + 2], dv[i * 4 + 3]);
        w.copy(d).multiply(dstRest.bones[b].wq);
        (world[b] || (world[b] = new THREE.Quaternion())).copy(w);
        const par = dstRest.parent[b];
        pw.copy(par && world[par] ? world[par] : dstRest.bones[b].pw);
        l.copy(pw).invert().multiply(w);
        out[b].set([l.x, l.y, l.z, l.w], i * 4);
      }
      if (dstRest.bones.Hips) {
        const rp = dstRest.bones.Hips.lp;
        // Hip offsets are expressed in the parent's space; both rigs share the same armature convention.
        hp.set([rp.x + P.hip[i * 3] * scale, rp.y + P.hip[i * 3 + 1] * scale, rp.z + P.hip[i * 3 + 2] * scale], i * 3);
      }
    }
    const tracks = order.map((b) => new THREE.QuaternionKeyframeTrack(b + ".quaternion", times, out[b]));
    if (dstRest.bones.Hips) tracks.push(new THREE.VectorKeyframeTrack("Hips.position", times, hp));
    return new THREE.AnimationClip(key, P.dur, tracks);
  }
}
