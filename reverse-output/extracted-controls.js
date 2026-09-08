class At {
  constructor(e, s, {
    pause: n,
    fullscreen: t
  }) {
    this.keys = new Set();
    this.steer = 0;
    this.jumpQueued = false;
    this.stickId = null;
    this.jumpId = null;
    this.active = false;
    this.joystick = e;
    this.knob = e.querySelector(".stick-knob");
    this.jumpButton = s;
    this.move = o => {
      if (o.pointerId !== this.stickId) {
        return;
      }
      const h = e.getBoundingClientRect();
      const d = h.width * 0.32;
      let l = o.clientX - (h.left + h.width / 2);
      let c = o.clientY - (h.top + h.height / 2);
      const u = Math.hypot(l, c);
      if (u > d) {
        l *= d / u;
        c *= d / u;
      }
      this.steer = Math.abs(l / d) < 0.08 ? 0 : l / d;
      this.knob.style.transform = `translate(${l}px,${c}px)`;
      o.preventDefault();
    };
    e.addEventListener("pointerdown", o => {
      if (!!this.active && this.stickId === null) {
        this.stickId = o.pointerId;
        e.setPointerCapture(o.pointerId);
        e.classList.add("active");
        this.move(o);
      }
    });
    e.addEventListener("pointermove", this.move);
    const a = o => {
      if (o.pointerId === this.stickId) {
        this.stickId = null;
        this.steer = 0;
        this.knob.style.transform = "";
        e.classList.remove("active");
      }
    };
    for (const o of ["pointerup", "pointercancel", "lostpointercapture"]) {
      e.addEventListener(o, a);
    }
    s.addEventListener("pointerdown", o => {
      if (!!this.active && this.jumpId === null) {
        this.jumpId = o.pointerId;
        s.setPointerCapture(o.pointerId);
        this.jumpQueued = true;
        s.classList.add("pressed");
        o.preventDefault();
      }
    });
    for (const o of ["pointerup", "pointercancel", "lostpointercapture"]) {
      s.addEventListener(o, h => {
        if (h.pointerId === this.jumpId) {
          this.jumpId = null;
          s.classList.remove("pressed");
        }
      });
    }
    s.addEventListener("click", o => {
      if (o.detail === 0 && this.active) {
        this.jumpQueued = true;
      }
    });
    document.addEventListener("keydown", o => {
      if (!/INPUT|SELECT|TEXTAREA/.test(o.target.tagName)) {
        if (["ArrowLeft", "ArrowRight", "KeyA", "KeyD", "Space"].includes(o.code) && this.active) {
          o.preventDefault();
          this.keys.add(o.code);
          if (o.code === "Space" && !o.repeat) {
            this.jumpQueued = true;
          }
        }
        if (["Escape", "KeyP"].includes(o.code) && !o.repeat) {
          n();
        }
        if (o.code === "KeyF" && !o.repeat) {
          t();
        }
      }
    });
    document.addEventListener("keyup", o => this.keys.delete(o.code));
    window.addEventListener("blur", () => this.clear());
    document.addEventListener("visibilitychange", () => this.clear());
    for (const o of ["gesturestart", "gesturechange", "gestureend"]) {
      document.addEventListener(o, h => {
        if (this.active) {
          h.preventDefault();
        }
      }, {
        passive: false
      });
    }
    document.addEventListener("touchmove", o => {
      if (this.active && !o.target.closest(".dialog")) {
        o.preventDefault();
      }
    }, {
      passive: false
    });
  }
  read() {
    const e = (this.keys.has("ArrowRight") || this.keys.has("KeyD") ? 1 : 0) - (this.keys.has("ArrowLeft") || this.keys.has("KeyA") ? 1 : 0);
    const s = {
      steer: this.active ? e || this.steer : 0,
      jump: this.active && this.jumpQueued
    };
    this.jumpQueued = false;
    return s;
  }
  clear() {
    this.keys.clear();
    this.steer = 0;
    this.jumpQueued = false;
    this.stickId = null;
    this.jumpId = null;
    this.knob.style.transform = "";
    this.joystick.classList.remove("active");
    this.jumpButton.classList.remove("pressed");
  }
}
class Lt {
  constructor(e) {
    this.settings = e;
    this.context = null;
    this.noteTime = 0;
    this.note = 0;
  }
  unlock() {
    if (!this.context) {
      const e = window.AudioContext || window.webkitAudioContext;
      if (e) {
        this.context = new e();
      }
    }
    this.context?.resume().catch(() => {});
  }
  tone(e, s = 0.13, n = "sine", t = 0.06) {
    const a = this.context;
    if (!a || a.state !== "running") {
      return;
    }
    const o = a.createOscillator();
    const h = a.createGain();
    o.type = n;
    o.frequency.value = e;
    h.gain.setValueAtTime(t, a.currentTime);
    h.gain.exponentialRampToValueAtTime(0.001, a.currentTime + s);
    o.connect(h);
    h.connect(a.destination);
    o.start();
    o.stop(a.currentTime + s);
  }
  play(e) {
    if (!this.settings.sound) {
      return;
    }
    const n = {
      count: [440, 0.1],
      go: [880, 0.35],
      jump: [620, 0.16],
      land: [160, 0.08],
      fall: [110, 0.4],
      finish: [1046, 0.7],
      respawn: [520, 0.25],
      shortcut: [784, 0.2],
      click: [390, 0.05]
    }[e];
    if (n) {
      this.tone(...n);
    }
  }
  update(e, s) {
    if (!!s && !!this.settings.music && (this.noteTime -= e, this.noteTime <= 0)) {
      this.noteTime = 0.32;
      const n = [261.63, 329.63, 392, 523.25, 440, 392, 329.63, 293.66];
      this.tone(n[this.note++ % n.length], 0.24, "sine", 0.021);
    }
  }
}
const Rt = {
  wave: "<path d=\"M3 14c4-8 8 8 12 0s8 8 12 0M3 7c4-8 8 8 12 0s8 8 12 0\"/>",
  arrow: "<path d=\"M5 12h14m-6-6 6 6-6 6\"/>",
  sound: "<path d=\"m11 5-5 4H3v6h3l5 4V5Zm4 3a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14\"/>",
  muted: "<path d=\"m11 5-5 4H3v6h3l5 4V5Zm5 4 6 6m0-6-6 6\"/>",
  settings: "<path d=\"m10 3-1 3-3 1-3 3 2 3-1 3 3 3 3-1 3 2 3-2 3-1v-4l2-2-2-3-3-1-1-3-3-1Z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>",
  close: "<path d=\"m6 6 12 12M6 18 18 6\"/>",
  pause: "<path d=\"M8 5v14M16 5v14\"/>",
  jump: "<path d=\"M12 20V4m-7 7 7-7 7 7\"/>",
  trophy: "<path d=\"M7 3h10v5a5 5 0 0 1-10 0V3Zm0 2H3v3a4 4 0 0 0 4 4m10-7h4v3a4 4 0 0 1-4 4m-5 1v6m-4 2h8\"/>",
  check: "<path d=\"m5 12 4 4L19 6\"/>",
  download: "<path d=\"M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5\"/>",
  flag: "<path d=\"M5 21V3m0 1c5-4 9 4 15 0v10c-6 4-10-4-15 0\"/>"
};
const x = (i, e = "") => `<svg class="icon ${e}" viewBox="0 0 ${i === "wave" ? "30 24" : "24 24"}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${Rt[i]}</svg>`;
