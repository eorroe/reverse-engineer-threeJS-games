class ft {
  constructor(e, s, n = Math.random) {
    this.track = e;
    this.height = s;
    this.random = n;
    this.events = [];
    this.reset(false);
  }
  reset(e) {
    this.practice = e;
    this.time = 0;
    this.countdown = 3;
    this.mode = "countdown";
    this.events = [];
    this.racers = ut.map((s, n) => {
      const t = 10 + Math.floor((12 - n) / 3) * 2.5;
      const a = (n % 3 - 1) * 2.35;
      const o = this.track.main.surface(t, a);
      return {
        id: n,
        name: s,
        s: t,
        u: a,
        speed: 0,
        vy: 0,
        position: o,
        state: "Sliding",
        route: "main",
        skill: 0.5 + this.random() * 0.48,
        risk: this.random(),
        aggression: this.random(),
        target: a * 0.5,
        phase: this.random() * Math.PI * 2,
        steer: 0,
        checkpoint: 12,
        cooldown: 0,
        airTime: 0,
        miss: 0,
        fallTime: 0,
        finishTime: null,
        eliminated: false,
        decided: false,
        wantsShortcut: false,
        shortcutUsed: false,
        shortcutCompleted: false,
        failedJump: false,
        jumpedRamps: [],
        respawns: 0
      };
    });
    Object.assign(this.racers[0], {
      s: 15,
      u: 0,
      skill: 1
    });
    this.racers[0].position.copy(this.track.main.surface(15, 0));
  }
  get player() {
    return this.racers[0];
  }
  order() {
    return [...this.racers].sort((e, s) => e.finishTime !== null || s.finishTime !== null ? (e.finishTime ?? Infinity) - (s.finishTime ?? Infinity) : e.eliminated !== s.eliminated ? e.eliminated ? 1 : -1 : this.track.progress(s) - this.track.progress(e) || s.speed - e.speed);
  }
  placement(e = this.player) {
    return this.order().indexOf(e) + 1;
  }
  jump(e, s = 8.5) {
    if (e.state !== "Sliding" || e.cooldown > 0) {
      return false;
    }
    const n = e.route === "main" && Math.abs(e.s - this.track.shortcut.start) < 16;
    e.state = "Airborne";
    e.vy = n ? 11.5 : s;
    e.airTime = 0;
    e.cooldown = 0.9;
    this.events.push({
      type: "jump",
      id: e.id
    });
    return true;
  }
  fall(e) {
    if (e.state !== "Falling") {
      e.state = "Falling";
      e.vy = Math.min(e.vy, 1);
      e.fallTime = 0;
      this.events.push({
        type: "fall",
        id: e.id,
        position: e.position.clone()
      });
    }
  }
  ai(e, s) {
    const n = this.track.shortcut;
    if (!e.decided && e.route === "main" && e.s > n.start - 26) {
      e.decided = true;
      const a = this.placement(e) / 13;
      e.wantsShortcut = this.random() < e.risk * 0.65 + e.skill * 0.15 + a * 0.12;
      e.failedJump = e.wantsShortcut && this.random() > e.skill * 0.8 + 0.17;
    }
    let t = Math.sin(this.time * (0.37 + e.aggression * 0.15) + e.phase) * (0.8 + e.aggression);
    if (e.route === "main" && e.wantsShortcut && e.s > n.start - 26 && e.s < n.start + 2) {
      t = 2.8;
    }
    if (e.route === "shortcut") {
      t = e.failedJump && e.s < 32 ? 5.4 : 0;
    }
    for (const a of this.racers) {
      if (e.id !== a.id && e.route === a.route && !a.eliminated && a.s > e.s && a.s - e.s < 7 && Math.abs(a.u - e.u) < 1.2) {
        t += (e.u >= a.u ? 1 : -1) * e.aggression * 0.9;
        break;
      }
    }
    t = F(t, -4.2, e.failedJump ? 5.4 : 4.2);
    e.target = z.damp(e.target, t, 2.5, s);
    e.steer = F((e.target - e.u) * (0.65 + e.skill), -1, 1);
    if (e.wantsShortcut && e.route === "main" && e.s >= n.start - 5 && e.s < n.start) {
      this.jump(e);
    }
  }
  update(e, s = {
    steer: 0,
    jump: false
  }, n = 1) {
    if (this.mode !== "paused" && this.mode !== "menu") {
      if (this.mode === "countdown") {
        const t = Math.ceil(this.countdown);
        this.countdown = Math.max(0, this.countdown - e);
        if (Math.ceil(this.countdown) !== t) {
          this.events.push({
            type: "count",
            value: Math.ceil(this.countdown)
          });
        }
        if (this.countdown === 0) {
          this.mode = "racing";
          this.events.push({
            type: "go"
          });
        }
        return;
      }
      this.time += e;
      for (const t of this.racers) {
        if (t.eliminated || t.state === "Finished") {
          continue;
        }
        t.cooldown = Math.max(0, t.cooldown - e);
        if (t.state === "Falling") {
          t.fallTime += e;
          t.vy -= Se * e;
          t.position.y += t.vy * e;
          const f = this.track[t.route].sample(t.s);
          t.position.addScaledVector(f.tangent, t.speed * e * 0.35);
          if (t.fallTime > 1.35) {
            if (this.practice) {
              Object.assign(t, {
                s: t.checkpoint,
                u: 0,
                route: "main",
                state: "Sliding",
                speed: 12,
                vy: 0,
                miss: 0,
                fallTime: 0,
                cooldown: 0.5,
                failedJump: false,
                decided: t.checkpoint > this.track.shortcut.end,
                wantsShortcut: false
              });
              t.position.copy(this.track.main.surface(t.s, 0));
              t.jumpedRamps = t.jumpedRamps.filter(v => this.track.ramps[v] < t.checkpoint);
              t.respawns++;
              this.events.push({
                type: "respawn",
                id: t.id
              });
            } else {
              t.eliminated = true;
              this.events.push({
                type: "eliminated",
                id: t.id
              });
            }
          }
          continue;
        }
        if (t.id) {
          this.ai(t, e);
        } else {
          t.steer = F(s.steer * n, -1.7, 1.7);
          if (s.jump) {
            this.jump(t);
          }
        }
        let a = this.track[t.route];
        const o = a.sample(t.s);
        const h = Math.abs(t.u) < 1.2 ? 1.6 : 0;
        const d = (t.id ? 21.3 + t.skill * 4.7 : 25.4) + h + Math.max(0, -o.tangent.y) * 8;
        t.speed = z.damp(t.speed, d - Math.abs(t.steer) * 0.8, 0.6, e);
        if (t.state === "Sliding") {
          for (const f of this.racers) {
            if (f.id === t.id || f.route !== t.route || f.state !== "Sliding" || f.eliminated) {
              continue;
            }
            const v = f.s - t.s;
            const y = t.u - f.u;
            if (v > 0 && v < 2 && Math.abs(y) < 1.35) {
              t.speed = Math.min(t.speed, Math.max(8, f.speed * 0.97));
              t.u += (y === 0 ? t.id % 2 ? 1 : -1 : Math.sign(y)) * e * 0.85;
            }
          }
        }
        const l = t.s;
        t.s += t.speed * e;
        t.u = F(t.u + t.steer * (t.state === "Airborne" ? 2.8 : 6.2) * e, -8, 8);
        if (t.route === "main") {
          for (const v of this.track.checkpoints) {
            if (t.s >= v && v > t.checkpoint && t.state === "Sliding") {
              t.checkpoint = v;
            }
          }
          for (let v = 0; v < this.track.ramps.length; v++) {
            const y = this.track.ramps[v];
            if (l < y && t.s >= y && !t.jumpedRamps.includes(v)) {
              t.jumpedRamps.push(v);
              this.jump(t, 7.2);
            }
          }
          const f = this.track.shortcut;
          if (l <= f.start && t.s >= f.start && t.state === "Airborne" && t.u > 1.5) {
            t.s -= f.start;
            t.route = "shortcut";
            a = f;
            t.shortcutUsed = true;
            this.events.push({
              type: "shortcut",
              id: t.id
            });
          }
        } else if (t.s >= a.length) {
          t.s = this.track.shortcut.end + (t.s - a.length);
          t.route = "main";
          t.shortcutCompleted = true;
          a = this.track.main;
        }
        const c = a.surface(t.s, t.u);
        const u = t.position.y;
        t.position.x = c.x;
        t.position.z = c.z;
        const g = this.height(t.route, t.s, c);
        if (t.state === "Sliding") {
          if (Math.abs(t.u) > re) {
            this.fall(t);
            continue;
          }
          if (g === null) {
            t.miss += e;
          } else {
            t.miss = 0;
          }
          if (t.miss > 0.1) {
            this.fall(t);
            continue;
          }
          t.position.y = g ?? c.y;
        } else if (t.state === "Airborne") {
          t.airTime += e;
          t.vy -= Se * e;
          t.position.y = u + t.vy * e;
          if (t.vy < 0 && g !== null && Math.abs(t.u) <= re && t.position.y <= g + 0.1 && u >= g - 1.5) {
            t.position.y = g;
            t.state = "Sliding";
            t.vy = 0;
            t.miss = 0;
            t.failedJump = false;
            this.events.push({
              type: "land",
              id: t.id,
              position: t.position.clone()
            });
          } else if (t.position.y < c.y - 4 || t.airTime > 2.8) {
            this.fall(t);
          }
        }
        if (t.route === "main" && t.s >= this.track.length - 2 && t.state !== "Falling" && Math.abs(t.u) <= re) {
          t.s = this.track.length;
          t.state = "Finished";
          t.finishTime = this.time;
          t.speed = 0;
          t.position.copy(this.track.main.surface(this.track.length, t.u));
          this.events.push({
            type: "finish",
            id: t.id,
            place: this.placement(t),
            time: t.finishTime
          });
        }
      }
    }
  }
}
const mt = {
  name: "CopyShader",
  uniforms: {
    tDiffuse: {
      value: null
    },
    opacity: {
      value: 1
    }
  },
  vertexShader: `

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,
  fragmentShader: `

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = opacity * texel;


		}`
};
