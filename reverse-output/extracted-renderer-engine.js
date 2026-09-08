class Et {
  constructor(e, s, n) {
    this.track = s;
    this.settings = n;
    this.renderer = new Ke({
      canvas: e,
      antialias: true,
      powerPreference: "high-performance",
      alpha: false
    });
    this.renderer.outputColorSpace = Re;
    this.renderer.toneMapping = Qe;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.setClearColor("#c1f0ed");
    this.renderer.shadowMap.type = Je;
    this.scene = new Ze();
    this.scene.fog = new Xe("#b6e7e3", 180, 570);
    this.camera = new et(52, 1, 0.1, 1400);
    this.cameraPosition = new b();
    this.cameraTarget = new b();
    this.cameraReady = false;
    this.scene.add(new tt("#fff9df", "#55999b", 2.1));
    this.sun = new st("#fff1d4", 2.2);
    this.sun.position.set(80, 170, 40);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    Object.assign(this.sun.shadow.camera, {
      left: -40,
      right: 40,
      top: 40,
      bottom: -40,
      near: 1,
      far: 260
    });
    this.sun.shadow.bias = -0.0008;
    this.scene.add(this.sun, this.sun.target);
    const t = new H(new O(900, 20, 12), new ee({
      side: it,
      depthWrite: false,
      vertexShader: "varying vec3 world; void main(){world=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader: "varying vec3 world; void main(){float t=smoothstep(-50.,550.,world.y); gl_FragColor=vec4(mix(vec3(.78,.94,.90),vec3(.40,.77,.83),t),1.);}"
    }));
    this.scene.add(t);
    this.waterMaterial = new ee({
      uniforms: {
        time: {
          value: 0
        }
      },
      vertexShader: "varying vec2 p; void main(){p=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader: "uniform float time; varying vec2 p; void main(){float wave=sin(p.x*.10+p.y*.15+time*.5)*sin(p.y*.2-time*.3); float glint=pow(max(0.,wave),16.); vec3 c=mix(vec3(.18,.66,.68),vec3(.38,.81,.78),.5+.5*sin(p.y*.008)); gl_FragColor=vec4(c+glint*.09,1.);}"
    });
    const a = new H(new Pe(2000, 2000), this.waterMaterial);
    a.rotation.x = -Math.PI / 2;
    a.position.y = -12;
    this.scene.add(a);
    this.surface = pt(s, this.scene);
    this.swimmers = new Ct(this.scene);
    this.addScenery();
    this.addMarkers();
    this.addEffects();
    this.composer = new kt(this.renderer);
    this.composer.addPass(new xt(this.scene, this.camera));
    this.composer.addPass(new Ie({
      uniforms: {
        tDiffuse: {
          value: null
        }
      },
      vertexShader: "varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader: "uniform sampler2D tDiffuse; varying vec2 vUv; void main(){vec4 c=texture2D(tDiffuse,vUv);float l=dot(c.rgb,vec3(.299,.587,.114));c.rgb=mix(vec3(l),c.rgb,1.10);c.rgb*=1.-.16*pow(length((vUv-.5)*1.3),2.);gl_FragColor=c;}"
    }));
    this.applySettings(n);
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }
  addScenery() {
    const e = [];
    const s = [];
    const n = [];
    const t = [];
    const a = [];
    const o = [];
    let h = 123;
    const d = () => {
      h = h * 16807 % 2147483647;
      return (h - 1) / 2147483646;
    };
    for (let c = 0; c < 23; c++) {
      const u = this.track.main.sample(c / 22 * this.track.length).position;
      const g = c % 2 ? 1 : -1;
      const f = u.x + g * (32 + d() * 52);
      const v = u.z + (d() - 0.5) * 50;
      const y = 11 + d() * 16;
      const k = -10 + (c < 6 ? 17 + d() * 12 : d() * 7);
      e.push({
        p: [f, k, v],
        s: [y, 5, y * 0.8],
        c: "#f1dcc0"
      });
      s.push({
        p: [f, k + 2.1, v],
        s: [y * 0.81, 3, y * 0.64],
        c: c % 2 ? "#75ba90" : "#8dca9d"
      });
      for (let T = 0; T < 3; T++) {
        const D = f + (d() - 0.5) * y;
        const R = v + (d() - 0.5) * y * 0.7;
        const I = 7 + d() * 5;
        n.push({
          p: [D, k + I / 2 + 3, R],
          s: [0.4, I, 0.4],
          r: [0.08, 0, 0.1],
          c: "#aa8966"
        });
        for (let A = 0; A < 5; A++) {
          const oe = A * Math.PI * 2 / 5;
          t.push({
            p: [D + Math.sin(oe) * 2, k + I + 2.8, R + Math.cos(oe) * 2],
            s: [1.25, 0.26, 3.9],
            r: [0.2, oe, 0.1],
            c: A % 2 ? "#2b947c" : "#48af87"
          });
        }
      }
    }
    for (let c = 0; c < 32; c++) {
      const u = (d() - 0.5) * 500;
      const g = 80 - d() * 570;
      const f = 85 + d() * 25;
      for (let v = 0; v < 3; v++) {
        a.push({
          p: [u + v * 5, f + v % 2 * 2, g],
          s: [8, 3 + d() * 2, 4],
          c: "#f4ffef"
        });
      }
    }
    for (let c = 20; c < this.track.length; c += 38) {
      const u = this.track.main.sample(c).position;
      const g = u.y + 12;
      o.push({
        p: [u.x, u.y - g / 2 - 0.25, u.z],
        s: [0.55, g, 0.55],
        c: "#e5d8b7"
      });
    }
    L(this.scene, new O(1, 9, 6), e);
    L(this.scene, new O(1, 9, 6), s);
    L(this.scene, new Z(0.7, 1, 1, 6), n);
    L(this.scene, new O(1, 6, 4), t);
    L(this.scene, new O(1, 9, 6), a, new at());
    L(this.scene, new Z(1, 1, 1, 6), o);
    const l = [];
    for (let c = 0; c < 18; c++) {
      l.push({
        p: [-95 + c * 13, -10, 52],
        s: [0.6, 0.6, 0.6],
        c: c % 2 ? "#fff1da" : "#ff906e"
      });
    }
    L(this.scene, new O(1, 8, 6), l);
  }
  addMarkers() {
    const e = [];
    const s = [];
    const n = [];
    for (const d of [9, this.track.length - 3]) {
      const l = this.track.main.sample(d);
      for (const u of [-1, 1]) {
        const g = l.position.clone().addScaledVector(l.right, u * 5.8);
        e.push({
          p: [g.x, g.y + 4, g.z],
          s: [0.35, 8, 0.35],
          c: "#fff4da"
        });
      }
      const c = Q(d < 10 ? "SPLASHLINE" : "FINISH", d < 10 ? "#173c44" : "#d4f575", d < 10 ? "#ffffff" : "#173c44");
      c.position.copy(l.position).add(new b(0, 7.5, 0));
      c.rotation.y = Math.atan2(l.tangent.x, l.tangent.z);
      this.scene.add(c);
      for (let u = 0; u < 10; u++) {
        for (let g = 0; g < 2; g++) {
          const f = this.track.main.surface(d + g * 0.85, u - 4.5).add(new b(0, 0.035, 0));
          s.push({
            p: f.toArray(),
            s: [1, 0.045, 0.85],
            r: [0, Math.atan2(l.tangent.x, l.tangent.z), l.bank],
            c: (u + g) % 2 ? "#173c44" : "#fffde7"
          });
        }
      }
    }
    for (const d of this.track.ramps) {
      const l = this.track.main.sample(d);
      for (let u = 0; u < 4; u++) {
        for (const g of [-1, 1]) {
          const f = this.track.main.surface(d - 2 - u * 1.45, g * 0.8).add(new b(0, 0.07, 0));
          n.push({
            p: f.toArray(),
            s: [0.45, 0.08, 2.1],
            r: [0, Math.atan2(l.tangent.x, l.tangent.z) + g * 0.65, 0],
            c: "#fcf9d1"
          });
        }
      }
      const c = Q("↑  LAUNCH", "#ff8e70", "#173c44");
      c.scale.setScalar(0.58);
      c.position.copy(this.track.main.surface(d, -6.6)).add(new b(0, 3.3, 0));
      c.rotation.y = Math.atan2(-l.tangent.x, -l.tangent.z);
      this.scene.add(c);
    }
    const t = this.track.shortcut.start - 16;
    const a = this.track.main.sample(t);
    const o = Q("JUMP RIGHT  ↗", "#d4f575", "#173c44");
    o.scale.setScalar(0.8);
    o.position.copy(this.track.main.surface(t, 5.8)).add(new b(0, 4, 0));
    o.rotation.y = Math.atan2(-a.tangent.x, -a.tangent.z);
    this.scene.add(o);
    L(this.scene, new Z(1, 1, 1, 8), e);
    L(this.scene, new ue(1, 1, 1), s);
    L(this.scene, new ue(1, 1, 1), n);
    const h = Q("YOU", "#173c44", "#d4f575");
    h.scale.set(0.27, 0.36, 0.3);
    this.scene.add(h);
    this.playerMark = h;
  }
  addEffects() {
    this.particles = Array.from({
      length: 110
    }, () => ({
      position: new b(),
      velocity: new b(),
      life: 0
    }));
    const e = new ye();
    e.setAttribute("position", new q(new Float32Array(330), 3));
    this.particleMesh = new nt(e, new ot({
      color: "#f4ffe8",
      size: 0.2,
      transparent: true,
      opacity: 0.75,
      depthWrite: false
    }));
    this.particleMesh.frustumCulled = false;
    this.scene.add(this.particleMesh);
  }
  splash(e, s = 14) {
    if (this.settings.effects) {
      for (const n of this.particles) {
        if (n.life <= 0 && s-- > 0) {
          n.position.copy(e);
          n.position.y += 0.4;
          n.velocity.set((Math.random() - 0.5) * 7, 2 + Math.random() * 6, (Math.random() - 0.5) * 7);
          n.life = 0.4 + Math.random() * 0.5;
        }
      }
    }
  }
  applySettings(e) {
    this.settings = e;
    this.adaptiveLow = false;
    this.renderer.shadowMap.enabled = e.shadows;
    this.resize();
  }
  resize() {
    const e = innerWidth;
    const s = innerHeight;
    this.portrait = s > e;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, this.settings.graphics === "low" || this.adaptiveLow ? 1 : 1.5));
    this.renderer.setSize(e, s, false);
    this.composer?.setSize(e, s);
    this.camera.aspect = e / s;
    this.camera.updateProjectionMatrix();
  }
  update(e, s, n, t = false) {
    this.waterMaterial.uniforms.time.value = s;
    this.swimmers.update(e.racers, this.track, s, t, this.camera);
    const a = e.player;
    this.playerMark.visible = !a.eliminated;
    this.playerMark.position.copy(a.position).add(new b(0, 3.5, 0));
    this.playerMark.quaternion.copy(this.camera.quaternion);
    let o;
    let h;
    if (t) {
      const l = this.track.main.sample(130).position;
      o = l.clone().add(new b(71 + Math.sin(s * 0.07) * 3, 59, 91));
      h = l.clone().add(new b(-1, -9, -39));
      this.camera.fov = this.portrait ? 55 : 46;
      this.camera.setViewOffset(innerWidth, innerHeight, -innerWidth * (this.portrait ? 0.03 : 0.21), this.portrait ? innerHeight * 0.18 : 0, innerWidth, innerHeight);
    } else {
      const l = this.track[a.route].sample(a.s);
      o = this.track[a.route].surface(a.s, a.u * 0.45).clone().addScaledVector(l.tangent, this.portrait ? -12.5 : -15).add(new b(0, this.portrait ? 8.7 : 8, 0));
      h = this.track[a.route].surface(Math.min(a.s + 17, this.track[a.route].length), a.u * 0.25).add(new b(0, 1.1, 0));
      this.camera.fov = (this.portrait ? 66 : 57) + Math.min(a.speed, 30) * 0.1;
      this.camera.clearViewOffset();
    }
    if (!this.cameraReady) {
      this.cameraPosition.copy(o);
      this.cameraTarget.copy(h);
      this.cameraReady = true;
    }
    this.cameraPosition.lerp(o, 1 - Math.exp(-n * (t ? 3 : 5.5)));
    this.cameraTarget.lerp(h, 1 - Math.exp(-n * 7));
    this.camera.position.copy(this.cameraPosition);
    this.camera.lookAt(this.cameraTarget);
    this.camera.updateProjectionMatrix();
    if (this.settings.shadows) {
      this.sun.position.copy(a.position).add(new b(35, 75, 35));
      this.sun.target.position.copy(a.position);
    }
    const d = this.particleMesh.geometry.attributes.position;
    this.particleMesh.visible = this.settings.effects;
    this.particles.forEach((l, c) => {
      if (l.life > 0) {
        l.life -= n;
        l.velocity.y -= n * 10;
        l.position.addScaledVector(l.velocity, n);
        d.setXYZ(c, l.position.x, l.position.y, l.position.z);
      } else {
        d.setXYZ(c, 0, -1000, 0);
      }
    });
    d.needsUpdate = true;
    if (!t && this.settings.effects && a.state === "Sliding" && a.speed > 18 && Math.random() < 0.4) {
      this.splash(a.position, 2);
    }
  }
  render() {
    if (this.settings.postprocessing && !this.adaptiveLow) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }
}
