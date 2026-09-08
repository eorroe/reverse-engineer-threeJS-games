class ie {
  constructor() {
    this.isPass = true;
    this.enabled = true;
    this.needsSwap = true;
    this.clear = false;
    this.renderToScreen = false;
  }
  setSize() {}
  render() {
    console.error("THREE.Pass: .render() must be implemented in derived pass.");
  }
  dispose() {}
}
const gt = new He(-1, 1, 1, -1, 0, 1);
class vt extends ye {
  constructor() {
    super();
    this.setAttribute("position", new q([-1, 3, 0, -1, -1, 0, 3, -1, 0], 3));
    this.setAttribute("uv", new q([0, 2, 0, 0, 2, 0], 2));
  }
}
const yt = new vt();
class wt {
  constructor(e) {
    this._mesh = new H(yt, e);
  }
  dispose() {
    this._mesh.geometry.dispose();
  }
  render(e) {
    e.render(this._mesh, gt);
  }
  get material() {
    return this._mesh.material;
  }
  set material(e) {
    this._mesh.material = e;
  }
}
class Ie extends ie {
  constructor(e, s = "tDiffuse") {
    super();
    this.textureID = s;
    this.uniforms = null;
    this.material = null;
    if (e instanceof ee) {
      this.uniforms = e.uniforms;
      this.material = e;
    } else if (e) {
      this.uniforms = Ue.clone(e.uniforms);
      this.material = new ee({
        name: e.name !== undefined ? e.name : "unspecified",
        defines: Object.assign({}, e.defines),
        uniforms: this.uniforms,
        vertexShader: e.vertexShader,
        fragmentShader: e.fragmentShader
      });
    }
    this._fsQuad = new wt(this.material);
  }
  render(e, s, n) {
    if (this.uniforms[this.textureID]) {
      this.uniforms[this.textureID].value = n.texture;
    }
    this._fsQuad.material = this.material;
    if (this.renderToScreen) {
      e.setRenderTarget(null);
      this._fsQuad.render(e);
    } else {
      e.setRenderTarget(s);
      if (this.clear) {
        e.clear(e.autoClearColor, e.autoClearDepth, e.autoClearStencil);
      }
      this._fsQuad.render(e);
    }
  }
  dispose() {
    this.material.dispose();
    this._fsQuad.dispose();
  }
}
class Ce extends ie {
  constructor(e, s) {
    super();
    this.scene = e;
    this.camera = s;
    this.clear = true;
    this.needsSwap = false;
    this.inverse = false;
  }
  render(e, s, n) {
    const t = e.getContext();
    const a = e.state;
    a.buffers.color.setMask(false);
    a.buffers.depth.setMask(false);
    a.buffers.color.setLocked(true);
    a.buffers.depth.setLocked(true);
    let o;
    let h;
    if (this.inverse) {
      o = 0;
      h = 1;
    } else {
      o = 1;
      h = 0;
    }
    a.buffers.stencil.setTest(true);
    a.buffers.stencil.setOp(t.REPLACE, t.REPLACE, t.REPLACE);
    a.buffers.stencil.setFunc(t.ALWAYS, o, 4294967295);
    a.buffers.stencil.setClear(h);
    a.buffers.stencil.setLocked(true);
    e.setRenderTarget(n);
    if (this.clear) {
      e.clear();
    }
    e.render(this.scene, this.camera);
    e.setRenderTarget(s);
    if (this.clear) {
      e.clear();
    }
    e.render(this.scene, this.camera);
    a.buffers.color.setLocked(false);
    a.buffers.depth.setLocked(false);
    a.buffers.color.setMask(true);
    a.buffers.depth.setMask(true);
    a.buffers.stencil.setLocked(false);
    a.buffers.stencil.setFunc(t.EQUAL, 1, 4294967295);
    a.buffers.stencil.setOp(t.KEEP, t.KEEP, t.KEEP);
    a.buffers.stencil.setLocked(true);
  }
}
class bt extends ie {
  constructor() {
    super();
    this.needsSwap = false;
  }
  render(e) {
    e.state.buffers.stencil.setLocked(false);
    e.state.buffers.stencil.setTest(false);
  }
}
class kt {
  constructor(e, s) {
    this.renderer = e;
    this._pixelRatio = e.getPixelRatio();
    if (s === undefined) {
      const n = e.getSize(new Me());
      this._width = n.width;
      this._height = n.height;
      s = new Ne(this._width * this._pixelRatio, this._height * this._pixelRatio, {
        type: Be
      });
      s.texture.name = "EffectComposer.rt1";
    } else {
      this._width = s.width;
      this._height = s.height;
    }
    this.renderTarget1 = s;
    this.renderTarget2 = s.clone();
    this.renderTarget2.texture.name = "EffectComposer.rt2";
    this.writeBuffer = this.renderTarget1;
    this.readBuffer = this.renderTarget2;
    this.renderToScreen = true;
    this.passes = [];
    this.copyPass = new Ie(mt);
    this.copyPass.material.blending = Ve;
    this.clock = new Ge();
  }
  swapBuffers() {
    const e = this.readBuffer;
    this.readBuffer = this.writeBuffer;
    this.writeBuffer = e;
  }
  addPass(e) {
    this.passes.push(e);
    e.setSize(this._width * this._pixelRatio, this._height * this._pixelRatio);
  }
  insertPass(e, s) {
    this.passes.splice(s, 0, e);
    e.setSize(this._width * this._pixelRatio, this._height * this._pixelRatio);
  }
  removePass(e) {
    const s = this.passes.indexOf(e);
    if (s !== -1) {
      this.passes.splice(s, 1);
    }
  }
  isLastEnabledPass(e) {
    for (let s = e + 1; s < this.passes.length; s++) {
      if (this.passes[s].enabled) {
        return false;
      }
    }
    return true;
  }
  render(e = this.clock.getDelta()) {
    const s = this.renderer.getRenderTarget();
    let n = false;
    for (let t = 0, a = this.passes.length; t < a; t++) {
      const o = this.passes[t];
      if (o.enabled !== false) {
        o.renderToScreen = this.renderToScreen && this.isLastEnabledPass(t);
        o.render(this.renderer, this.writeBuffer, this.readBuffer, e, n);
        if (o.needsSwap) {
          if (n) {
            const h = this.renderer.getContext();
            const d = this.renderer.state.buffers.stencil;
            d.setFunc(h.NOTEQUAL, 1, 4294967295);
            this.copyPass.render(this.renderer, this.writeBuffer, this.readBuffer, e);
            d.setFunc(h.EQUAL, 1, 4294967295);
          }
          this.swapBuffers();
        }
        if (Ce !== undefined) {
          if (o instanceof Ce) {
            n = true;
          } else if (o instanceof bt) {
            n = false;
          }
        }
      }
    }
    this.renderer.setRenderTarget(s);
  }
  reset(e) {
    if (e === undefined) {
      const s = this.renderer.getSize(new Me());
      this._pixelRatio = this.renderer.getPixelRatio();
      this._width = s.width;
      this._height = s.height;
      e = this.renderTarget1.clone();
      e.setSize(this._width * this._pixelRatio, this._height * this._pixelRatio);
    }
    this.renderTarget1.dispose();
    this.renderTarget2.dispose();
    this.renderTarget1 = e;
    this.renderTarget2 = e.clone();
    this.writeBuffer = this.renderTarget1;
    this.readBuffer = this.renderTarget2;
  }
  setSize(e, s) {
    this._width = e;
    this._height = s;
    const n = this._width * this._pixelRatio;
    const t = this._height * this._pixelRatio;
    this.renderTarget1.setSize(n, t);
    this.renderTarget2.setSize(n, t);
    for (let a = 0; a < this.passes.length; a++) {
      this.passes[a].setSize(n, t);
    }
  }
  setPixelRatio(e) {
    this._pixelRatio = e;
    this.setSize(this._width, this._height);
  }
  dispose() {
    this.renderTarget1.dispose();
    this.renderTarget2.dispose();
    this.copyPass.dispose();
  }
}
class xt extends ie {
  constructor(e, s, n = null, t = null, a = null) {
    super();
    this.scene = e;
    this.camera = s;
    this.overrideMaterial = n;
    this.clearColor = t;
    this.clearAlpha = a;
    this.clear = true;
    this.clearDepth = false;
    this.needsSwap = false;
    this._oldClearColor = new se();
  }
  render(e, s, n) {
    const t = e.autoClear;
    e.autoClear = false;
    let a;
    let o;
    if (this.overrideMaterial !== null) {
      o = this.scene.overrideMaterial;
      this.scene.overrideMaterial = this.overrideMaterial;
    }
    if (this.clearColor !== null) {
      e.getClearColor(this._oldClearColor);
      e.setClearColor(this.clearColor, e.getClearAlpha());
    }
    if (this.clearAlpha !== null) {
      a = e.getClearAlpha();
      e.setClearAlpha(this.clearAlpha);
    }
    if (this.clearDepth == true) {
      e.clearDepth();
    }
    e.setRenderTarget(this.renderToScreen ? null : n);
    if (this.clear === true) {
      e.clear(e.autoClearColor, e.autoClearDepth, e.autoClearStencil);
    }
    e.render(this.scene, this.camera);
    if (this.clearColor !== null) {
      e.setClearColor(this._oldClearColor);
    }
    if (this.clearAlpha !== null) {
      e.setClearAlpha(a);
    }
    if (this.overrideMaterial !== null) {
      this.scene.overrideMaterial = o;
    }
    e.autoClear = t;
  }
}
const Mt = new URL("./", location.href).pathname;
const Oe = `splashline:${Mt}:v1`;
const ce = {
  graphics: "auto",
  sensitivity: 1,
  handedness: "right",
  shadows: false,
  postprocessing: false,
  effects: true,
  sound: true,
  music: false,
  practice: false
};
const j = [{
  name: "Lagoon",
  color: "#27b9bb",
  ring: "#dbf884",
  skin: "#bd784f"
}, {
  name: "Guava",
  color: "#f47d88",
  ring: "#ffcb7c",
  skin: "#eebc92"
}, {
  name: "Lilac",
  color: "#a79cef",
  ring: "#f9f2d4",
  skin: "#81503f"
}, {
  name: "Sunshine",
  color: "#f5bd53",
  ring: "#91e5d7",
  skin: "#e3a57c"
}];
