// Retarget an animation clip from one rigged character to another with the same
// bone names but different proportions and rest orientations. Works in world
// space: each bone's rotation change relative to its rest pose is copied, then
// converted back into the target's local space. The hip position is scaled by
// the ratio of hip heights so feet stay on the floor.
import * as THREE from "three";
import { clone as skClone } from "three/addons/utils/SkeletonUtils.js";

function bonesOf(root) {
  const out = {};
  root.traverse((o) => { if (o.isBone && !out[o.name]) out[o.name] = o; });
  return out;
}

/** Rest-pose data for a character scene (call on an unanimated scene). */
export function restPose(root) {
  root.updateMatrixWorld(true);
  const bones = bonesOf(root);
  const data = {};
  for (const [n, b] of Object.entries(bones)) {
    data[n] = {
      wq: b.getWorldQuaternion(new THREE.Quaternion()),
      lq: b.quaternion.clone(),
      lp: b.position.clone(),
      pw: b.parent ? b.parent.getWorldQuaternion(new THREE.Quaternion()) : new THREE.Quaternion(),
    };
  }
  const hips = bones.Hips;
  data.__hipH = hips ? Math.abs(hips.getWorldPosition(new THREE.Vector3()).y) : 1;
  data.__order = orderBones(bones);
  return data;
}

function orderBones(bones) {
  // Parents before children.
  const names = Object.keys(bones);
  const depth = (b) => { let d = 0; let p = b.parent; while (p) { d++; p = p.parent; } return d; };
  return names.sort((a, b) => depth(bones[a]) - depth(bones[b]));
}

/**
 * srcScene: the scene the clip was authored on (unanimated, rest pose).
 * clip: THREE.AnimationClip for srcScene. dstScene: the character to drive.
 */
export function retargetClip(srcScene, clip, dstScene, opts = {}) {
  const fps = opts.fps || 30;
  const src = skClone(srcScene);
  const srcRest = restPose(src);
  const dstRest = opts.dstRest || restPose(dstScene);
  const srcBones = bonesOf(src);
  const mixer = new THREE.AnimationMixer(src);
  mixer.clipAction(clip).play();
  const n = Math.max(2, Math.round(clip.duration * fps) + 1);
  const times = new Float32Array(n);
  const order = dstRest.__order.filter((b) => srcBones[b] && srcRest[b]);
  const qv = {}; for (const b of order) qv[b] = new Float32Array(n * 4);
  const hp = new Float32Array(n * 3);
  const hipScale = dstRest.__hipH / (srcRest.__hipH || 1);
  const tmpW = {};
  const inv = new THREE.Quaternion(), d = new THREE.Quaternion(), w = new THREE.Quaternion(), l = new THREE.Quaternion();
  for (let i = 0; i < n; i++) {
    const t = Math.min(clip.duration, i / fps);
    times[i] = t;
    mixer.setTime(t);
    src.updateMatrixWorld(true);
    for (const b of order) {
      const sb = srcBones[b];
      const sw = sb.getWorldQuaternion(new THREE.Quaternion());
      d.copy(sw).multiply(inv.copy(srcRest[b].wq).invert()); // world delta from rest
      w.copy(d).multiply(dstRest[b].wq); // target world
      tmpW[b] = w.clone();
      // Parent world for the target at this frame.
      const parentName = parentOf(dstScene, b);
      const pw = parentName && tmpW[parentName] ? tmpW[parentName] : dstRest[b].pw;
      l.copy(pw).invert().multiply(w);
      qv[b].set([l.x, l.y, l.z, l.w], i * 4);
    }
    if (srcBones.Hips && dstRest.Hips) {
      const sp = srcBones.Hips.position, rp = srcRest.Hips.lp, dp = dstRest.Hips.lp;
      hp.set([dp.x + (sp.x - rp.x) * hipScale, dp.y + (sp.y - rp.y) * hipScale, dp.z + (sp.z - rp.z) * hipScale], i * 3);
    }
  }
  const tracks = order.map((b) => new THREE.QuaternionKeyframeTrack(b + ".quaternion", times, qv[b]));
  if (srcBones.Hips && dstRest.Hips) tracks.push(new THREE.VectorKeyframeTrack("Hips.position", times, hp));
  return new THREE.AnimationClip(opts.name || clip.name, clip.duration, tracks);
}

const parentCache = new WeakMap();
function parentOf(root, name) {
  let m = parentCache.get(root);
  if (!m) { m = {}; root.traverse((o) => { if (o.isBone) m[o.name] = o.parent && o.parent.isBone ? o.parent.name : null; }); parentCache.set(root, m); }
  return m[name];
}
