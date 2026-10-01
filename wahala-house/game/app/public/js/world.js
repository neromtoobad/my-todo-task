// The house: renderer, camera, lights, day/night, architecture, furniture and
// the walkable grid. Everything here is presentation; the server decides where
// housemates want to be and the cast module walks them there.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { WALLS, FURNITURE, POOL, WORLD, HOH_DOOR, FACE_CAM } from "./data.js";

export const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const tl = new THREE.TextureLoader();

function tex(url, rep) {
  const t = tl.load(url);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (rep) t.repeat.set(rep[0], rep[1]);
  t.anisotropy = 4;
  return t;
}

const PAL = { cream: 0xf4e6cc, terracotta: 0xc8643c, gold: 0xd4a24a, emerald: 0x0f7a52, magenta: 0xe2338a, cobalt: 0x2c4fb8, sun: 0xf5cf1d, plum: 0x3a1f3d, wood: 0x8a5a32, dark: 0x2a2230 };

export class World {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1b1026);
    this.scene.fog = new THREE.Fog(0x1b1026, 60, 110);
    this.zoom = 7.5;
    this.camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 200);
    this.camTarget = new THREE.Vector3(16, 0, 10);
    this.camPos = this.camTarget.clone();
    const el = Math.atan(1 / Math.sqrt(2));
    this.camOffset = new THREE.Vector3(Math.cos(el) * Math.sin(Math.PI / 4), Math.sin(el), Math.cos(el) * Math.cos(Math.PI / 4)).multiplyScalar(60);
    this.clock = new THREE.Clock();
    this.animated = [];
    this.lamps = [];
    this.neon = [];
    this.fade = []; // walls that fade when the player is behind them
    this.buildLights();
    this.buildHouse();
    this.buildSets();
    this.buildGrid();
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.aspect = w / h;
    this.applyZoom();
  }
  applyZoom() {
    const z = this.zoom * (this.aspect < 1 ? 1.35 : 1);
    this.camera.left = -z * this.aspect; this.camera.right = z * this.aspect; this.camera.top = z; this.camera.bottom = -z;
    this.camera.updateProjectionMatrix();
  }
  setZoom(z) { this.zoom = Math.max(4, Math.min(16, z)); this.applyZoom(); }

  // ---------------------------------------------------------------- lights
  buildLights() {
    this.hemi = new THREE.HemisphereLight(0xfff1dd, 0x6a4a50, 1.4);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffe2b8, 2.4);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -30; sc.right = 30; sc.top = 30; sc.bottom = -30; sc.near = 1; sc.far = 120;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.03;
    this.scene.add(this.sun, this.sun.target);
    this.fill = new THREE.DirectionalLight(0xb8c8ff, 0.5);
    this.fill.position.set(-20, 18, 30);
    this.scene.add(this.fill);
    // A few warm lamps and party neons that come on at night.
    const lampAt = (x, y, z, c, d) => { const l = new THREE.PointLight(c, 0, d, 1.6); l.position.set(x, y, z); this.scene.add(l); return l; };
    this.lamps.push(lampAt(16, 2.6, 4, 0xffc27a, 12), lampAt(5.5, 2.6, 5, 0xffc27a, 12), lampAt(5.5, 2.6, 16, 0xffb070, 12), lampAt(26.5, 2.4, 4, 0xd88bff, 9));
    this.neon.push(lampAt(25, 3, 12, 0xff2fa0, 14), lampAt(30.5, 3, 12, 0x7b3cff, 14), lampAt(20, 1.2, 19.5, 0x2fd6ff, 10));
  }

  /** Light the house for a time of day (minutes since midnight, may exceed 1440). */
  setTime(min, party) {
    const m = ((min % 1440) + 1440) % 1440;
    const h = m / 60;
    // 0 at night, 1 at noon.
    let day;
    if (h >= 6.5 && h <= 18.5) day = Math.sin(((h - 6.5) / 12) * Math.PI);
    else day = 0;
    const dusk = h > 17 && h < 21 ? 1 - Math.abs(h - 19) / 2 : 0;
    const night = h >= 20 || h < 6 ? 1 : h >= 18.5 ? (h - 18.5) / 1.5 : h < 7 ? 1 - (h - 6) : 0;
    const n = Math.max(0, Math.min(1, night));
    const sunCol = new THREE.Color(0xfff0d8).lerp(new THREE.Color(0xff9a4a), dusk * 0.8);
    this.sun.color.copy(sunCol);
    this.sun.intensity = 0.35 + day * 2.3 + dusk * 0.6;
    const ang = ((h - 6) / 12) * Math.PI;
    this.sun.position.set(this.camTarget.x + Math.cos(ang) * 25 + 10, 18 + day * 25, this.camTarget.z + 20);
    this.sun.target.position.copy(this.camTarget);
    this.hemi.color.copy(new THREE.Color(0xfff1dd).lerp(new THREE.Color(0x6a5cff), n * 0.7));
    this.hemi.groundColor.copy(new THREE.Color(0x6a4a50).lerp(new THREE.Color(0x201030), n));
    this.hemi.intensity = 1.35 - n * 0.75;
    const bg = new THREE.Color(0xf6d9b0).lerp(new THREE.Color(0xff9f6b), dusk).lerp(new THREE.Color(0x160c24), n);
    this.scene.background.copy(bg);
    this.scene.fog.color.copy(bg);
    for (const l of this.lamps) l.intensity = n * 14;
    for (const l of this.neon) l.intensity = (party ? 1 : n * 0.6) * 22;
    for (const s of this.glow || []) s.material.opacity = 0.15 + n * 0.85;
    if (this.dark) {
      // NEPA has taken light: only moonlight.
      this.sun.intensity = 0.12; this.sun.color.set(0x8090ff);
      this.hemi.intensity = 0.22;
      for (const l of this.lamps) l.intensity = 0;
      for (const l of this.neon) l.intensity = 0;
      for (const s of this.glow || []) s.material.opacity = 0.05;
      this.scene.background.set(0x07040e); this.scene.fog.color.set(0x07040e);
    }
    this.nightLevel = n;
  }

  // ---------------------------------------------------------------- house
  mat(c, extra) { return new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.8, metalness: 0 }, extra || {})); }

  box(w, h, d, m, x, y, z, round) {
    const g = round ? new RoundedBoxGeometry(w, h, d, 3, Math.min(round, w / 2, h / 2, d / 2)) : new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true; mesh.receiveShadow = true;
    this.scene.add(mesh);
    return mesh;
  }

  floor(x0, z0, x1, z1, m, y = 0) {
    const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0);
    const mesh = new THREE.Mesh(g, m);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    return mesh;
  }

  buildHouse() {
    const T = {
      marble: tex("assets/tex/marble.jpg", [4, 3]), tiles: tex("assets/tex/tiles.jpg", [5, 5]), wood: tex("assets/tex/wood.jpg", [4, 5]),
      grass: tex("assets/tex/grass.jpg", [10, 8]), ankara: tex("assets/tex/ankara.jpg", [2, 2]), eye: tex("assets/img/eye.jpg"),
    };
    this.T = T;
    // Ground and floors.
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(140, 120), this.mat(0x2d5a2c));
    ground.rotation.x = -Math.PI / 2; ground.position.set(18, -0.05, 13); ground.receiveShadow = true;
    this.scene.add(ground);
    this.floor(0, 8, 36, 26, this.mat(0xffffff, { map: T.grass, roughness: 1 }), 0.001);
    this.floor(0, 0, 11, 10, this.mat(0xffffff, { map: T.tiles, roughness: 0.55 }), 0.02);
    this.floor(11, 0, 23, 10, this.mat(0xffffff, { map: T.marble, roughness: 0.35 }), 0.02);
    this.floor(23, 0, 30, 8, this.mat(0xd9c8ff, { map: T.marble, roughness: 0.35 }), 0.02);
    this.floor(0, 10, 11, 22, this.mat(0xffffff, { map: T.wood, roughness: 0.6 }), 0.02);
    this.floor(11, 10, 16, 15, this.mat(0x3a3440, { roughness: 0.95 }), 0.02);
    this.floor(30, 0, 33, 5, this.mat(0x2a0f18), 0.02);
    // Stone path and patio.
    this.floor(15, 10, 19, 26, this.mat(0xe6d6b8, { roughness: 0.9 }), 0.01);
    this.floor(22, 8, 33, 15.5, this.mat(0xead7b8, { roughness: 0.8 }), 0.012);
    // Walls.
    const wallMat = this.mat(PAL.cream, { roughness: 0.9 });
    const accent = this.mat(PAL.terracotta, { roughness: 0.85 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.25, roughness: 0.1, metalness: 0.2 });
    const hedgeMat = this.mat(0x2f7a3a, { roughness: 1 });
    for (const [x0, z0, x1, z1, h, kind] of WALLS) {
      const len = Math.hypot(x1 - x0, z1 - z0);
      const alongX = z0 === z1;
      const t = kind === "ext" ? 0.28 : kind === "hedge" ? 0.7 : 0.18;
      const m = kind === "ext" ? wallMat : kind === "glass" ? glassMat : kind === "hedge" ? hedgeMat : accent;
      const w = alongX ? len : t, d = alongX ? t : len;
      const mesh = this.box(w, h, d, m, (x0 + x1) / 2, h / 2, (z0 + z1) / 2, kind === "hedge" ? 0.25 : 0.03);
      if (kind === "glass") { mesh.castShadow = false; this.box(w, 0.08, d, this.mat(PAL.gold, { metalness: 0.6, roughness: 0.3 }), (x0 + x1) / 2, h, (z0 + z1) / 2); }
      if (kind === "ext") {
        // Baseboard and a gold trim line; Ankara band on the lounge wall.
        this.box(alongX ? len : 0.05, 0.14, alongX ? 0.05 : len, this.mat(PAL.gold, { metalness: 0.5, roughness: 0.35 }), (x0 + x1) / 2 + (alongX ? 0 : 0.17), 1.2, (z0 + z1) / 2 + (alongX ? 0.17 : 0));
      }
    }
    // Ankara band on the back walls.
    const band = this.mat(0xffffff, { map: tex("assets/tex/ankara.jpg", [14, 0.5]) });
    const b1 = new THREE.Mesh(new THREE.PlaneGeometry(30, 0.5), band); b1.position.set(15, 2.9, 0.15); this.scene.add(b1);
    const b2 = new THREE.Mesh(new THREE.PlaneGeometry(22, 0.5), this.mat(0xffffff, { map: tex("assets/tex/ankara.jpg", [10, 0.5]) })); b2.rotation.y = Math.PI / 2; b2.position.set(0.15, 2.9, 11); this.scene.add(b2);
    // Windows on the back walls.
    for (const x of [3, 7.5, 25, 28]) this.windowAt(x, 0.16, 0);
    for (const z of [14, 18]) this.windowAt(0.16, z, Math.PI / 2);
    for (const f of FURNITURE) this.furniture(f);
    this.loadProps();
  }

  windowAt(x, z, ry) {
    const g = new THREE.Group();
    const frame = this.mat(PAL.gold, { metalness: 0.5, roughness: 0.35 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x9fd7ff, emissive: 0x2a4a7a, emissiveIntensity: 0.4, roughness: 0.1 });
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.2), glass); pane.position.y = 2;
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.06), frame); top.position.y = 2.64;
    const bot = top.clone(); bot.position.y = 1.36;
    g.add(pane, top, bot);
    g.position.set(x, 0, z); g.rotation.y = ry;
    this.scene.add(g);
    this.windows = (this.windows || []).concat([glass]);
  }

  furniture(f) {
    const [x, z] = f.p;
    const [w, d] = f.s;
    const r = f.r || 0;
    const add = (obj) => { obj.position.x += x; obj.position.z += z; obj.rotation.y = r; this.scene.add(obj); return obj; };
    const grp = () => new THREE.Group();
    const part = (g, geo, m, px, py, pz) => { const mesh = new THREE.Mesh(geo, m); mesh.position.set(px, py, pz); mesh.castShadow = true; mesh.receiveShadow = true; g.add(mesh); return mesh; };
    const RB = (a, b, c, rr) => new RoundedBoxGeometry(a, b, c, 3, rr);
    switch (f.t) {
      case "rug": { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), this.mat(0xffffff, { map: this.T.ankara, roughness: 1 })); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.03, z); m.receiveShadow = true; this.scene.add(m); break; }
      case "eyewall": {
        const g = grp();
        part(g, new THREE.BoxGeometry(w + 0.3, 2.1, 0.12), this.mat(0x1a1420), 0, 2.1, 0);
        const scr = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.8), new THREE.MeshStandardMaterial({ map: this.T.eye, emissive: 0xffffff, emissiveMap: this.T.eye, emissiveIntensity: 0.9 }));
        scr.position.set(0, 2.1, 0.07); g.add(scr);
        this.eyeScreens = (this.eyeScreens || []).concat([scr.material]);
        add(g); break;
      }
      case "sofa": {
        const g = grp();
        const vel = this.mat(PAL.emerald, { roughness: 0.95 });
        part(g, RB(w, 0.34, d, 0.1), vel, 0, 0.23, 0);
        part(g, RB(w, 0.6, 0.25, 0.1), vel, 0, 0.6, -d / 2 + 0.12);
        part(g, RB(0.25, 0.35, d, 0.1), vel, -w / 2 + 0.12, 0.55, 0);
        part(g, RB(0.25, 0.35, d, 0.1), vel, w / 2 - 0.12, 0.55, 0);
        const cushion = this.mat(0xffffff, { map: this.T.ankara });
        for (let i = -1; i <= 1; i += 2) part(g, RB(0.45, 0.4, 0.14, 0.06), cushion, i * (w / 2 - 0.6), 0.7, -d / 2 + 0.3);
        add(g); break;
      }
      case "armchair": {
        const g = grp(); const vel = this.mat(PAL.magenta, { roughness: 0.95 });
        part(g, RB(w, 0.34, d, 0.1), vel, 0, 0.23, 0); part(g, RB(w, 0.6, 0.22, 0.1), vel, 0, 0.6, -d / 2 + 0.11);
        part(g, RB(0.2, 0.3, d, 0.08), vel, -w / 2 + 0.1, 0.55, 0); part(g, RB(0.2, 0.3, d, 0.08), vel, w / 2 - 0.1, 0.55, 0);
        add(g); break;
      }
      case "table": {
        const g = grp(); const h = f.h || 0.75; const m = this.mat(f.c || PAL.wood, { roughness: 0.5 });
        part(g, RB(w, 0.08, d, 0.03), m, 0, h, 0);
        const leg = new THREE.CylinderGeometry(0.05, 0.05, h, 8);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, leg, this.mat(PAL.gold, { metalness: 0.6, roughness: 0.3 }), sx * (w / 2 - 0.15), h / 2, sz * (d / 2 - 0.15));
        add(g); break;
      }
      case "counter": {
        const g = grp(); const h = f.h || 0.95;
        part(g, RB(w, h - 0.06, d, 0.04), this.mat(f.island ? PAL.cobalt : PAL.terracotta, { roughness: 0.6 }), 0, (h - 0.06) / 2, 0);
        part(g, RB(w + 0.06, 0.06, d + 0.06, 0.02), this.mat(0xf7f2ea, { roughness: 0.2 }), 0, h - 0.03, 0);
        if (!f.island) part(g, new THREE.BoxGeometry(w, 0.9, 0.35), this.mat(0xf1e4cf), 0, 2.1, -d / 2 + 0.18);
        add(g); break;
      }
      case "stove": {
        const g = grp();
        part(g, RB(w, 0.9, d, 0.04), this.mat(0x2a2a30, { metalness: 0.4, roughness: 0.4 }), 0, 0.45, 0);
        const pot = new THREE.CylinderGeometry(0.28, 0.24, 0.32, 20);
        const pm = this.mat(0xb8b8c0, { metalness: 0.8, roughness: 0.25 });
        part(g, pot, pm, -0.4, 1.06, 0); part(g, pot, pm, 0.4, 1.06, 0);
        const jollof = new THREE.Mesh(new THREE.CircleGeometry(0.25, 20), this.mat(0xe0521c, { roughness: 0.9 })); jollof.rotation.x = -Math.PI / 2; jollof.position.set(-0.4, 1.2, 0); g.add(jollof);
        add(g); break;
      }
      case "fridge": { const g = grp(); part(g, RB(w, 2, d, 0.08), this.mat(0xdfe6ea, { metalness: 0.5, roughness: 0.3 }), 0, 1, 0); part(g, new THREE.BoxGeometry(0.04, 0.6, 0.04), this.mat(PAL.gold, { metalness: 0.7 }), w / 2 - 0.15, 1.2, d / 2 + 0.02); add(g); break; }
      case "stool": case "chair": {
        const g = grp(); const m = this.mat(f.t === "stool" ? PAL.gold : PAL.wood, { metalness: f.t === "stool" ? 0.5 : 0, roughness: 0.4 });
        const sh = f.t === "stool" ? 0.72 : 0.46;
        part(g, new THREE.CylinderGeometry(0.22, 0.22, 0.06, 16), this.mat(f.t === "stool" ? PAL.magenta : PAL.sun, { roughness: 0.9 }), 0, sh, 0);
        part(g, new THREE.CylinderGeometry(0.04, 0.06, sh, 8), m, 0, sh / 2, 0);
        if (f.t === "chair") part(g, RB(0.44, 0.5, 0.06, 0.02), m, 0, sh + 0.28, -0.2);
        add(g); break;
      }
      case "bed": {
        const g = grp(); const col = f.c || PAL.cobalt;
        part(g, RB(d, 0.35, w, 0.06), this.mat(0xf3ede2), 0, 0.3, 0);
        part(g, RB(d + 0.04, 0.2, w * 0.62, 0.06), this.mat(col, { roughness: 0.95 }), 0, 0.5, w * 0.17);
        part(g, RB(d * 0.7, 0.14, 0.35, 0.07), this.mat(0xffffff), 0, 0.52, -w / 2 + 0.3);
        part(g, RB(d + 0.1, 0.9, 0.08, 0.03), this.mat(PAL.wood, { roughness: 0.6 }), 0, 0.5, -w / 2);
        add(g); break;
      }
      case "kingbed": {
        const g = grp();
        part(g, RB(w, 0.45, d, 0.08), this.mat(0xf3ede2), 0, 0.3, 0);
        part(g, RB(w + 0.04, 0.24, d * 0.6, 0.08), this.mat(0x6a2cc0, { roughness: 0.95 }), 0, 0.56, d * 0.18);
        part(g, RB(w + 0.2, 1.4, 0.12, 0.04), this.mat(PAL.gold, { metalness: 0.5, roughness: 0.35 }), 0, 0.8, -d / 2);
        add(g); break;
      }
      case "jacuzzi": {
        const g = grp();
        part(g, new THREE.CylinderGeometry(w / 2, w / 2, 0.6, 28), this.mat(0xf2ede4), 0, 0.3, 0);
        const water = new THREE.Mesh(new THREE.CircleGeometry(w / 2 - 0.15, 28), new THREE.MeshStandardMaterial({ color: 0x30c8ff, emissive: 0x0a4a6a, roughness: 0.1, transparent: true, opacity: 0.85 }));
        water.rotation.x = -Math.PI / 2; water.position.y = 0.58; g.add(water); this.animated.push({ kind: "water", mat: water.material });
        add(g); break;
      }
      case "dresser": { const g = grp(); part(g, RB(w, 0.9, d, 0.05), this.mat(PAL.wood, { roughness: 0.55 }), 0, 0.45, 0); part(g, new THREE.PlaneGeometry(w * 0.8, 1.2), this.mat(0xd8eef8, { metalness: 0.9, roughness: 0.05 }), 0, 1.6, -d / 2 + 0.01); add(g); break; }
      case "bench": { const g = grp(); part(g, RB(w, 0.12, d, 0.04), this.mat(0x1b1b1f), 0, 0.45, 0); part(g, new THREE.BoxGeometry(0.1, 0.45, d * 0.6), this.mat(0x777777), -w / 3, 0.22, 0); part(g, new THREE.BoxGeometry(0.1, 0.45, d * 0.6), this.mat(0x777777), w / 3, 0.22, 0); add(g); break; }
      case "rack": {
        const g = grp(); part(g, new THREE.BoxGeometry(w, 0.9, 0.08), this.mat(0x333333), 0, 0.45, -0.15);
        const db = new THREE.CylinderGeometry(0.08, 0.08, 0.3, 10);
        for (let i = 0; i < 5; i++) { const m = part(g, db, this.mat(0x222228, { metalness: 0.6, roughness: 0.4 }), -w / 2 + 0.2 + i * 0.25, 0.8, 0); m.rotation.z = Math.PI / 2; }
        add(g); break;
      }
      case "mat": { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), this.mat(PAL.magenta, { roughness: 1 })); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.035, z); this.scene.add(m); break; }
      case "diarydoor": {
        const g = grp(); part(g, new THREE.BoxGeometry(1.2, 2.2, 0.1), this.mat(0x8a0f1f, { roughness: 0.6 }), 0, 1.1, 0);
        const light = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), new THREE.MeshStandardMaterial({ color: 0xff2040, emissive: 0xff2040, emissiveIntensity: 2 }));
        light.position.set(0, 2.45, 0.1); g.add(light);
        this.box(3, 3.2, 0.28, this.mat(PAL.cream), 31.5, 1.6, 5 - 0.14).castShadow = true;
        add(g); break;
      }
      case "pool": {
        const [x0, z0, x1, z1] = POOL;
        const rim = this.mat(0xf2ead8, { roughness: 0.6 });
        this.box(x1 - x0 + 0.6, 0.12, 0.3, rim, (x0 + x1) / 2, 0.06, z0 - 0.15);
        this.box(x1 - x0 + 0.6, 0.12, 0.3, rim, (x0 + x1) / 2, 0.06, z1 + 0.15);
        this.box(0.3, 0.12, z1 - z0, rim, x0 - 0.15, 0.06, (z0 + z1) / 2);
        this.box(0.3, 0.12, z1 - z0, rim, x1 + 0.15, 0.06, (z0 + z1) / 2);
        const water = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0, 20, 12), new THREE.MeshStandardMaterial({ color: 0x1fc4e8, emissive: 0x06506a, emissiveIntensity: 0.6, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.9 }));
        water.rotation.x = -Math.PI / 2; water.position.set((x0 + x1) / 2, 0.04, (z0 + z1) / 2); water.receiveShadow = true;
        this.scene.add(water); this.animated.push({ kind: "pool", mesh: water, base: water.geometry.attributes.position.array.slice() });
        break;
      }
      case "lounger": {
        const g = grp();
        part(g, RB(0.65, 0.12, 1.8, 0.05), this.mat(0xf7f3ea), 0, 0.3, 0);
        const back = part(g, RB(0.65, 0.1, 0.7, 0.05), this.mat(0xf7f3ea), 0, 0.5, -0.75); back.rotation.x = -0.6;
        part(g, RB(0.6, 0.06, 1.2, 0.03), this.mat(PAL.sun, { roughness: 0.95 }), 0, 0.38, 0.2);
        add(g); break;
      }
      case "gazebo": {
        const g = grp(); const wood = this.mat(0xf2ead8, { roughness: 0.7 });
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, new THREE.CylinderGeometry(0.09, 0.09, 2.6, 10), wood, sx * (w / 2 - 0.2), 1.3, sz * (d / 2 - 0.2));
        const roof = part(g, new THREE.ConeGeometry(w * 0.78, 1, 4), this.mat(PAL.terracotta, { roughness: 0.8 }), 0, 3.05, 0); roof.rotation.y = Math.PI / 4;
        add(g); break;
      }
      case "stage": {
        const g = grp();
        part(g, RB(w, 0.35, d, 0.06), this.mat(0x241a2e, { roughness: 0.5 }), 0, 0.17, 0);
        part(g, new THREE.BoxGeometry(w, 0.04, 0.06), new THREE.MeshStandardMaterial({ color: 0xff2fa0, emissive: 0xff2fa0, emissiveIntensity: 1.5 }), 0, 0.36, d / 2);
        add(g); this.stageTop = 0.35; break;
      }
      case "screen": {
        const g = grp();
        part(g, new THREE.BoxGeometry(w + 0.3, 2.8, 0.1), this.mat(0x111111), 0, 1.9, 0);
        const scr = new THREE.Mesh(new THREE.PlaneGeometry(w, 2.4), new THREE.MeshStandardMaterial({ map: this.T.eye, emissive: 0xffffff, emissiveMap: this.T.eye, emissiveIntensity: 1 }));
        scr.position.set(0, 1.9, 0.06); g.add(scr); this.eyeScreens = (this.eyeScreens || []).concat([scr.material]);
        add(g); break;
      }
      case "benchG": { const g = grp(); part(g, RB(w, 0.1, d, 0.04), this.mat(PAL.wood), 0, 0.45, 0); part(g, RB(w, 0.4, 0.08, 0.03), this.mat(PAL.wood), 0, 0.75, d / 2 - 0.04); add(g); break; }
      case "lamp": { const g = grp(); part(g, new THREE.CylinderGeometry(0.03, 0.03, 1.6, 8), this.mat(PAL.gold, { metalness: 0.6 }), 0, 0.8, 0); part(g, new THREE.ConeGeometry(0.3, 0.35, 20, 1, true), new THREE.MeshStandardMaterial({ color: 0xfff0d0, emissive: 0xffc070, emissiveIntensity: 0.8, side: THREE.DoubleSide }), 0, 1.7, 0); add(g); break; }
      case "lights": this.fairyLights(); break;
      case "plant": case "palm": case "dj": this.propSlots = (this.propSlots || []).concat([f]); break;
    }
  }

  fairyLights() {
    this.glow = [];
    const mat = () => new THREE.MeshBasicMaterial({ color: 0xffd98a, transparent: true, opacity: 0.2 });
    const string = (a, b, n, sag) => {
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const p = new THREE.Vector3().lerpVectors(a, b, t);
        p.y -= Math.sin(t * Math.PI) * sag;
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), mat());
        s.position.copy(p); this.scene.add(s); this.glow.push(s);
      }
    };
    string(new THREE.Vector3(22, 3, 8.2), new THREE.Vector3(33, 3, 8.2), 22, 0.35);
    string(new THREE.Vector3(22, 3, 8.2), new THREE.Vector3(22, 2.6, 15.5), 14, 0.3);
    string(new THREE.Vector3(30.8, 3, 18.3), new THREE.Vector3(34.2, 3, 21.7), 10, 0.2);
    string(new THREE.Vector3(15, 2.6, 16.2), new THREE.Vector3(25, 2.6, 16.2), 18, 0.3);
  }

  async loadProps() {
    const load = (k) => loader.loadAsync(`assets/props/${k}.glb`).then((g) => g.scene).catch(() => null);
    const [palm, monstera, dj, throne] = await Promise.all(["palm", "monstera", "dj", "throne"].map(load));
    const place = (src, f, height) => {
      if (!src) return;
      const o = src.clone(true);
      const box = new THREE.Box3().setFromObject(o);
      const size = box.getSize(new THREE.Vector3());
      const s = height / (size.y || 1);
      o.scale.setScalar(s);
      o.position.set(f.p[0], -box.min.y * s + (f.y || 0), f.p[1]);
      o.rotation.y = f.r !== undefined ? f.r : FACE_CAM;
      o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
      this.scene.add(o);
    };
    for (const f of this.propSlots || []) {
      if (f.t === "palm") place(palm, f, 5.2);
      if (f.t === "plant") place(monstera, f, 1.5);
      if (f.t === "dj") place(dj, Object.assign({ y: 0.35 }, f), 1.5);
    }
    this.throneModel = throne;
    if (throne) place(throne, { p: [61.5, 1.6], r: FACE_CAM }, 1.9);
  }

  // Event sets far from the house: Diary Room and Red Room.
  buildSets() {
    // Diary Room at x 58..65.
    this.floor(58, -1, 65, 6, this.mat(0x140a12), 0.02);
    this.box(7, 3.4, 0.2, this.mat(0x1f0f1c), 61.5, 1.7, -1);
    this.box(0.2, 3.4, 7, this.mat(0x1f0f1c), 58, 1.7, 2.5);
    const eye = new THREE.Mesh(new THREE.CircleGeometry(1.1, 40), new THREE.MeshStandardMaterial({ map: tex("assets/img/eye.jpg"), emissive: 0xffffff, emissiveMap: tex("assets/img/eye.jpg"), emissiveIntensity: 1.2 }));
    eye.position.set(61.5, 2.4, -0.88); this.scene.add(eye);
    const dl = new THREE.PointLight(0xff3050, 60, 14, 1.2); dl.position.set(61.5, 3, 2.5); dl.visible = false; this.scene.add(dl);
    // Red Room at x 78..85.
    this.floor(78, -1, 85, 6, this.mat(0x200608), 0.02);
    this.box(7, 3.4, 0.2, this.mat(0x2a080c), 81.5, 1.7, -1);
    this.box(0.2, 3.4, 7, this.mat(0x2a080c), 78, 1.7, 2.5);
    const reye = new THREE.Mesh(new THREE.CircleGeometry(1.2, 40), new THREE.MeshStandardMaterial({ color: 0xff3030, map: tex("assets/img/eye.jpg"), emissive: 0xff2020, emissiveMap: tex("assets/img/eye.jpg"), emissiveIntensity: 1.4 }));
    reye.position.set(81.5, 2.3, -0.88); this.scene.add(reye);
    this.box(1.8, 0.8, 1.1, this.mat(0x3a1a12, { roughness: 0.6 }), 81.5, 0.4, 1.4, 0.05);
    const rl = new THREE.PointLight(0xff1a2a, 80, 14, 1.2); rl.position.set(81.5, 3, 3); rl.visible = false; this.scene.add(rl);
    // Only lit while the camera is on that set (every light costs every pixel).
    this.setLights = { diary: dl, redroom: rl };
  }

  // ---------------------------------------------------------------- walking
  buildGrid() {
    const C = 0.5;
    this.cell = C;
    this.gw = Math.ceil(WORLD.w / C); this.gd = Math.ceil(WORLD.d / C);
    this.block = new Uint8Array(this.gw * this.gd);
    const mark = (x0, z0, x1, z1, v = 1) => {
      for (let i = Math.floor(Math.min(x0, x1) / C); i <= Math.floor(Math.max(x0, x1) / C); i++)
        for (let j = Math.floor(Math.min(z0, z1) / C); j <= Math.floor(Math.max(z0, z1) / C); j++)
          if (i >= 0 && j >= 0 && i < this.gw && j < this.gd) this.block[j * this.gw + i] = v;
    };
    for (const [x0, z0, x1, z1, , kind] of WALLS) {
      const pad = kind === "hedge" ? 0.4 : 0.25;
      mark(Math.min(x0, x1) - pad, Math.min(z0, z1) - pad, Math.max(x0, x1) + pad - 0.01, Math.max(z0, z1) + pad - 0.01);
    }
    mark(30, 0, 33, 5);
    for (const f of FURNITURE) {
      if (!f.block) continue;
      const [x, z] = f.p;
      let [w, d] = f.s;
      if (f.r && Math.abs(Math.sin(f.r)) > 0.5) [w, d] = [d, w];
      mark(x - w / 2 + 0.05, z - d / 2 + 0.05, x + w / 2 - 0.05, z + d / 2 - 0.05);
    }
    // The HoH door is tracked separately so it can lock and unlock.
    this.hohCells = [];
    for (let j = Math.floor(HOH_DOOR[1] / C); j < Math.ceil(HOH_DOOR[3] / C); j++) for (let i = Math.floor((HOH_DOOR[0] - 0.3) / C); i <= Math.floor((HOH_DOOR[0] + 0.3) / C); i++) this.hohCells.push(j * this.gw + i);
    this.hohLocked = true;
  }
  setHohLocked(v) { this.hohLocked = v; }
  blocked(i, j) {
    if (i < 0 || j < 0 || i >= this.gw || j >= this.gd) return true;
    const k = j * this.gw + i;
    if (this.hohLocked && this.hohCells.includes(k)) return true;
    return this.block[k] === 1;
  }
  walkable(x, z) { return !this.blocked(Math.floor(x / this.cell), Math.floor(z / this.cell)); }

  /** Nearest walkable point to (x, z). */
  nearestFree(x, z) {
    if (this.walkable(x, z)) return [x, z];
    for (let r = 0.5; r < 4; r += 0.25) for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
      const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
      if (this.walkable(px, pz)) return [px, pz];
    }
    return [x, z];
  }

  /** A* on the grid. Returns a list of [x, z] waypoints (smoothed). */
  path(from, to) {
    const C = this.cell, W = this.gw;
    const [fx, fz] = this.nearestFree(from[0], from[1]);
    const [tx, tz] = this.nearestFree(to[0], to[1]);
    const s = Math.floor(fz / C) * W + Math.floor(fx / C), g = Math.floor(tz / C) * W + Math.floor(tx / C);
    if (s === g) return [[to[0], to[1]]];
    const open = [s], came = new Map(), gs = new Map([[s, 0]]), fs = new Map();
    const h = (k) => { const i = k % W, j = (k / W) | 0; return Math.hypot(i - (g % W), j - ((g / W) | 0)); };
    fs.set(s, h(s));
    const inOpen = new Set([s]);
    let guard = 0;
    while (open.length && guard++ < 6000) {
      let bi = 0; for (let q = 1; q < open.length; q++) if (fs.get(open[q]) < fs.get(open[bi])) bi = q;
      const cur = open.splice(bi, 1)[0]; inOpen.delete(cur);
      if (cur === g) break;
      const ci = cur % W, cj = (cur / W) | 0;
      for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
        if (!di && !dj) continue;
        const ni = ci + di, nj = cj + dj;
        if (this.blocked(ni, nj)) continue;
        if (di && dj && (this.blocked(ci + di, cj) || this.blocked(ci, cj + dj))) continue;
        const nk = nj * W + ni;
        const t = gs.get(cur) + (di && dj ? 1.414 : 1);
        if (t < (gs.has(nk) ? gs.get(nk) : Infinity)) {
          came.set(nk, cur); gs.set(nk, t); fs.set(nk, t + h(nk));
          if (!inOpen.has(nk)) { open.push(nk); inOpen.add(nk); }
        }
      }
    }
    if (!came.has(g)) return [[tx, tz]];
    const cells = [];
    for (let k = g; k !== s; k = came.get(k)) cells.push(k);
    cells.reverse();
    let pts = cells.map((k) => [(k % W) * C + C / 2, ((k / W) | 0) * C + C / 2]);
    pts[pts.length - 1] = [to[0], to[1]];
    // String-pull: drop points that have a clear line from the previous kept point.
    const out = [];
    let anchor = [fx, fz];
    for (let i = 0; i < pts.length; i++) {
      const next = pts[i + 1];
      if (next && this.clear(anchor, next)) continue;
      out.push(pts[i]); anchor = pts[i];
    }
    return out;
  }
  clear(a, b) {
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.ceil(d / (this.cell * 0.5));
    for (let i = 1; i < n; i++) { const t = i / n; if (!this.walkable(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)) return false; }
    return true;
  }

  // ---------------------------------------------------------------- frame
  follow(target, snap) {
    this.camTarget.copy(target);
    if (snap) this.camPos.copy(target);
  }
  update(dt, t) {
    this.camPos.lerp(this.camTarget, Math.min(1, dt * 4));
    this.camera.position.copy(this.camPos).add(this.camOffset);
    this.camera.lookAt(this.camPos);
    for (const a of this.animated) {
      if (a.kind === "pool") {
        const pos = a.mesh.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) pos.array[i * 3 + 2] = Math.sin(t * 1.6 + a.base[i * 3] * 0.9 + a.base[i * 3 + 1] * 0.7) * 0.03;
        pos.needsUpdate = true;
      }
    }
    for (const m of this.eyeScreens || []) m.emissiveIntensity = 0.75 + Math.sin(t * 1.3) * 0.2;
    if (this.partyMode) for (let i = 0; i < this.neon.length; i++) this.neon[i].intensity = 14 + Math.sin(t * 4 + i * 2) * 10;
  }
  render() { this.renderer.render(this.scene, this.camera); }
}
