function St() {
  let i = {};
  try {
    i = JSON.parse(localStorage.getItem(Oe)) || {};
  } catch {}
  const e = {
    ...ce
  };
  for (const s of Object.keys(ce)) {
    if (typeof i.settings?.[s] == typeof ce[s]) {
      e[s] = i.settings[s];
    }
  }
  if (!["auto", "high", "low"].includes(e.graphics)) {
    e.graphics = "auto";
  }
  if (!["left", "right"].includes(e.handedness)) {
    e.handedness = "right";
  }
  e.sensitivity = Math.min(1.7, Math.max(0.5, e.sensitivity));
  return {
    settings: e,
    best: Object.fromEntries(["race", "practice"].filter(s => Number.isFinite(i.best?.[s]) && i.best[s] > 0).map(s => [s, i.best[s]])),
    palette: Number.isInteger(i.palette) && i.palette >= 0 && i.palette < 4 ? i.palette : 0,
    accessory: ["goggles", "cap", "classic", "crown"].includes(i.accessory) ? i.accessory : "goggles",
    unlocks: Array.isArray(i.unlocks) ? i.unlocks.filter(s => ["first-splash", "shortcut", "champion"].includes(s)) : []
  };
}
function Tt(i) {
  try {
    localStorage.setItem(Oe, JSON.stringify(i));
    return true;
  } catch {
    return false;
  }
}
function Y(i) {
  if (i == null) {
    return "—";
  } else {
    return `${Math.floor(i / 60).toString().padStart(2, "0")}:${(i % 60).toFixed(2).padStart(5, "0")}`;
  }
}
class Ct {
  constructor(e, s = 13) {
    this.scene = e;
    this.geometries = {
      sphere: new O(1, 10, 8),
      capsule: new qe(1, 1, 4, 8),
      cylinder: new Z(1, 1, 1, 8),
      ring: new We(0.73, 0.21, 6, 18),
      box: new ue(1, 1, 1)
    };
    this.material = new W({
      roughness: 0.5,
      metalness: 0.02
    });
    this.batches = {};
    for (const [n, t] of Object.entries(this.geometries)) {
      const a = new Le(t, this.material, s * 18);
      a.instanceMatrix.setUsage(Ye);
      a.frustumCulled = false;
      a.castShadow = true;
      this.batches[n] = a;
      e.add(a);
    }
    this.rigs = Array.from({
      length: s
    }, (n, t) => this.createRig(t));
  }
  createRig(e) {
    const s = new G();
    const n = new G();
    s.add(n);
    const t = [];
    const a = (c, u, g, f, v = n, y = [0, 0, 0], k = "") => {
      const T = new G();
      T.position.set(...g);
      T.scale.set(...f);
      T.rotation.set(...y);
      v.add(T);
      t.push({
        type: c,
        color: u,
        node: T,
        tag: k
      });
      return T;
    };
    const o = j[e % 4];
    const h = o.skin;
    const d = o.color;
    a("capsule", d, [0, 1.04, 0], [0.37, 0.32, 0.27], n, [-0.16, 0, 0], "suit");
    a("sphere", h, [0, 1.89, 0.04], [0.37, 0.4, 0.36], n, [0, 0, 0], "skin");
    a("sphere", "#293f43", [0, 2.15, -0.02], [0.38, 0.17, 0.34]);
    a("sphere", h, [0, 1.84, 0.38], [0.09, 0.09, 0.1], n, [0, 0, 0], "skin");
    a("box", "#ffffff", [0, 1.72, 0.369], [0.16, 0.04, 0.025]);
    const l = [];
    for (const c of [-1, 1]) {
      const u = new G();
      u.position.set(c * 0.39, 1.3, 0);
      n.add(u);
      l.push(u);
      a("capsule", h, [c * 0.13, -0.24, 0.04], [0.115, 0.24, 0.12], u, [0.15, 0, c * 0.38], "skin");
      a("sphere", h, [c * 0.24, -0.57, 0.05], [0.13, 0.14, 0.13], u, [0, 0, 0], "skin");
      a("capsule", h, [c * 0.24, 0.48, 0.57], [0.145, 0.32, 0.15], n, [Math.PI / 2 - 0.1, 0, 0], "skin");
      a("sphere", d, [c * 0.24, 0.39, 1], [0.17, 0.14, 0.26], n, [0, 0, 0], "suit");
      a("sphere", "#173c44", [c * 0.155, 1.92, 0.353], [0.057, 0.074, 0.023]);
      a("sphere", "#a8f7ef", [c * 0.17, 1.93, 0.36], [0.139, 0.103, 0.065], n, [0, 0, 0], "goggles");
    }
    a("box", "#fff7dd", [0, 1.93, 0.383], [0.075, 0.045, 0.055], n, [0, 0, 0], "goggles");
    a("ring", o.ring, [0, 0.52, 0.06], [1.07, 1.07, 1.07], n, [Math.PI / 2, 0, 0], "ring");
    a("sphere", d, [0, 2.2, 0], [0.395, 0.18, 0.37], n, [0, 0, 0], "cap");
    a("box", d, [0, 2.18, 0.35], [0.48, 0.045, 0.35], n, [0, 0, 0], "cap");
    for (let c = -1; c <= 1; c++) {
      a("box", "#ffe17b", [c * 0.2, 2.34 + (c === 0 ? 0.06 : 0), 0.1], [0.13, 0.26, 0.13], n, [0, 0, c * 0.15], "crown");
    }
    return {
      root: s,
      body: n,
      arms: l,
      parts: t,
      palette: e % 4,
      accessory: ["goggles", "cap", "classic"][e % 3]
    };
  }
  customize(e, s, n) {
    this.rigs[e].palette = s;
    this.rigs[e].accessory = n;
  }
  update(e, s, n, t = false, a = null) {
    const o = Object.fromEntries(Object.keys(this.batches).map(d => [d, 0]));
    const h = new se();
    for (const d of e) {
      if (d.eliminated || !t && d.id !== 0 && a && d.position.distanceToSquared(a.position) < 64) {
        continue;
      }
      const l = this.rigs[d.id];
      const c = j[l.palette];
      const u = s[d.route].sample(d.s);
      l.root.position.copy(d.position);
      l.root.rotation.set(0, Math.atan2(u.tangent.x, u.tangent.z), 0);
      l.body.position.y = 0.11 + Math.sin(n * 7 + d.phase) * 0.055;
      l.body.rotation.set(d.state === "Airborne" ? -0.13 : -0.04, 0, -d.steer * 0.16 - u.bank * 0.6);
      if (d.state === "Falling") {
        l.body.rotation.z += d.fallTime * 2;
      }
      const g = d.state === "Finished";
      l.arms.forEach((f, v) => {
        f.rotation.z = (v === 0 ? -1 : 1) * (d.state === "Airborne" || g ? 2.3 : 0.3 + Math.sin(n * 3 + d.phase) * 0.06);
      });
      if (t && d.id === 0) {
        l.arms[1].rotation.z = 2.3 + Math.sin(n * 3) * 0.25;
      }
      l.root.updateMatrixWorld(true);
      for (const f of l.parts) {
        if (["goggles", "cap", "crown"].includes(f.tag) && f.tag !== l.accessory) {
          continue;
        }
        const v = this.batches[f.type];
        const y = o[f.type]++;
        v.setMatrixAt(y, f.node.matrixWorld);
        v.setColorAt(y, h.set(f.tag === "skin" ? c.skin : f.tag === "suit" || f.tag === "cap" ? c.color : f.tag === "ring" ? c.ring : f.color));
      }
    }
    for (const [d, l] of Object.entries(this.batches)) {
      l.count = o[d];
      l.instanceMatrix.needsUpdate = true;
      if (l.instanceColor) {
        l.instanceColor.needsUpdate = true;
      }
    }
  }
}
const N = new G();
new b();
