import { V as b, C as Ee, M as z, a as W, D as Ae, b as H, T as De, R as ze, c as se, B as ye, F as q, O as He, S as ee, U as Ue, d as Me, W as Ne, H as Be, N as Ve, e as Ge, f as ue, g as We, h as Z, i as qe, j as O, I as Le, k as Ye, l as G, m as Ke, n as Re, A as Qe, P as Je, o as Ze, p as Xe, q as et, r as tt, s as st, t as it, u as Pe, v as at, w as nt, x as ot, y as rt, z as ct } from "./three-4C1tqKkb.js";
(function () {
  const e = document.createElement("link").relList;
  if (e && e.supports && e.supports("modulepreload")) {
    return;
  }
  for (const t of document.querySelectorAll("link[rel=\"modulepreload\"]")) {
    n(t);
  }
  new MutationObserver(t => {
    for (const a of t) {
      if (a.type === "childList") {
        for (const o of a.addedNodes) {
          if (o.tagName === "LINK" && o.rel === "modulepreload") {
            n(o);
          }
        }
      }
    }
  }).observe(document, {
    childList: true,
    subtree: true
  });
  function s(t) {
    const a = {};
    if (t.integrity) {
      a.integrity = t.integrity;
    }
    if (t.referrerPolicy) {
      a.referrerPolicy = t.referrerPolicy;
    }
    if (t.crossOrigin === "use-credentials") {
      a.credentials = "include";
    } else if (t.crossOrigin === "anonymous") {
      a.credentials = "omit";
    } else {
      a.credentials = "same-origin";
    }
    return a;
  }
  function n(t) {
    if (t.ep) {
      return;
    }
    t.ep = true;
    const a = s(t);
    fetch(t.href, a);
  }
})();
const lt = new b(0, 1, 0);
const fe = 10;
const re = fe / 2 - 0.4;
const Se = 19;
const F = z.clamp;
class Te {
  constructor(e, s = "main") {
    this.id = s;
    this.curve = new Ee(e, false, "centripetal");
    this.curve.arcLengthDivisions = 1600;
    this.length = this.curve.getLength();
    this.count = Math.ceil(this.length / 1.25);
    this.samples = [];
    for (let n = 0; n <= this.count; n++) {
      const t = n / this.count;
      const a = this.curve.getPointAt(t);
      const o = this.curve.getTangentAt(t).normalize();
      const h = this.curve.getTangentAt(Math.max(0, t - 0.012));
      const d = this.curve.getTangentAt(Math.min(1, t + 0.012));
      const l = F(h.clone().cross(d).y * 1.5, -0.3, 0.3);
      const c = o.clone().cross(lt).normalize().applyAxisAngle(o, l);
      const u = c.clone().cross(o).normalize();
      this.samples.push({
        s: t * this.length,
        position: a,
        tangent: o,
        right: c,
        normal: u,
        bank: l,
        width: fe
      });
    }
  }
  sample(e) {
    const s = F(e / this.length, 0, 1) * this.count;
    const n = this.samples[Math.floor(s)];
    const t = this.samples[Math.min(this.count, Math.floor(s) + 1)];
    const a = s % 1;
    return {
      position: n.position.clone().lerp(t.position, a),
      tangent: n.tangent.clone().lerp(t.tangent, a).normalize(),
      right: n.right.clone().lerp(t.right, a).normalize(),
      normal: n.normal.clone().lerp(t.normal, a).normalize(),
      bank: z.lerp(n.bank, t.bank, a),
      width: fe
    };
  }
  surface(e, s) {
    const n = this.sample(e);
    return n.position.addScaledVector(n.right, s).addScaledVector(n.normal, s * 0.065 * s + this.rampHeight(e));
  }
  rampHeight(e) {
    return Math.max(0, ...(this.ramps || []).map(s => e > s - 8 && e <= s ? ((e - s + 8) / 8) ** 2 * 1.2 : 0));
  }
}
function dt() {
  const i = [[0, 74, 18], [0, 72, -18], [5, 67, -58], [45, 59, -92], [76, 54, -120], [48, 50, -156], [-18, 46, -152], [-57, 41, -181], [-40, 35, -225], [23, 29, -237], [64, 24, -264], [47, 19, -301], [-5, 13, -318], [-38, 8, -356], [-10, 5, -396]].map(d => new b(...d));
  const e = new Te(i);
  e.ramps = [e.length * 0.18, e.length * 0.69];
  const s = e.length * 0.295;
  const n = e.length * 0.525;
  const t = e.sample(s);
  const a = e.sample(n);
  const o = t.position.clone().lerp(a.position, 0.5);
  const h = new Te([t.position, t.position.clone().addScaledVector(t.tangent, 9), o, a.position.clone().addScaledVector(a.tangent, -9), a.position], "shortcut");
  h.start = s;
  h.end = n;
  h.gap = [8, 21];
  return {
    main: e,
    shortcut: h,
    length: e.length,
    ramps: e.ramps,
    checkpoints: [0, e.length * 0.23, e.length * 0.55, e.length * 0.77],
    progress(d) {
      const l = d.route === "shortcut" ? s + d.s / h.length * (n - s) : d.s;
      return F(l / e.length, 0, 1);
    }
  };
}
function ht(i, e, s, n, t, a, o = 10) {
  const h = Math.max(2, Math.ceil((s - e) / 1.5));
  const d = [];
  const l = [];
  const c = [];
  const u = new se(a);
  for (let f = 0; f <= h; f++) {
    const v = z.lerp(e, s, f / h);
    const y = i.sample(v);
    for (let k = 0; k <= o; k++) {
      const T = z.lerp(n, t, k / o);
      const D = T * 0.065 * T + i.rampHeight(v);
      const R = y.position.clone().addScaledVector(y.right, T).addScaledVector(y.normal, D);
      d.push(R.x, R.y, R.z);
      const I = 1 - Math.abs(T) / 70 + Math.sin(v * 0.42) * 0.012;
      l.push(u.r * I, u.g * I, u.b * I);
      if (f < h && k < o) {
        const A = f * (o + 1) + k;
        c.push(A, A + o + 1, A + 1, A + 1, A + o + 1, A + o + 2);
      }
    }
  }
  const g = new ye();
  g.setAttribute("position", new q(d, 3));
  g.setAttribute("color", new q(l, 3));
  g.setIndex(c);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}
function pt(i, e) {
  const s = new W({
    vertexColors: true,
    roughness: 0.27,
    metalness: 0.06,
    side: Ae
  });
  const n = new W({
    color: "#ff987e",
    roughness: 0.34
  });
  const t = new W({
    color: "#fff1d9",
    roughness: 0.35
  });
  const a = {
    main: [],
    shortcut: []
  };
  for (const l of [i.main, i.shortcut]) {
    let c = l.id === "shortcut" ? [[0, 8], [21, l.length]] : [[0, l.length]];
    for (const [u, g] of c) {
      for (let f = u; f < g; f += 24) {
        const v = Math.min(f + 24, g);
        const y = new H(ht(l, f, v, -5, 5, l.id === "main" ? "#94eee1" : "#d2ed79"), s);
        y.receiveShadow = true;
        y.userData = {
          from: f,
          to: v
        };
        a[l.id].push(y);
        e.add(y);
      }
      for (const f of [-1, 1]) {
        const v = [];
        const y = [];
        for (let k = u; k < g; k += 2) {
          v.push(l.surface(k, f * 5.18));
          y.push(l.surface(k, f * 5.35).add(new b(0, 0.48, 0)));
        }
        v.push(l.surface(g, f * 5.18));
        y.push(l.surface(g, f * 5.35).add(new b(0, 0.48, 0)));
        for (const [k, T, D] of [[v, 0.72, n], [y, 0.18, t]]) {
          const R = new H(new De(new Ee(k), Math.ceil((g - u) / 1.5), T, 5, false), D);
          R.castShadow = true;
          e.add(R);
        }
      }
    }
  }
  const o = new ze();
  const h = new b(0, -1, 0);
  const d = [];
  e.updateMatrixWorld(true);
  return {
    chunks: a,
    height(l, c, u) {
      o.set(new b(u.x, u.y + 7, u.z), h);
      o.far = 40;
      d.length = 0;
      for (const g of a[l]) {
        if (c >= g.userData.from - 3 && c <= g.userData.to + 3) {
          o.intersectObject(g, false, d);
        }
      }
      if (d.length) {
        return Math.max(...d.map(g => g.point.y));
      } else {
        return null;
      }
    }
  };
}
const ut = ["You", "Coco", "Finn", "Sunny", "Rio", "Poppy", "Kai", "Milo", "Luna", "Ziggy", "Nori", "Cleo", "Remy"];
