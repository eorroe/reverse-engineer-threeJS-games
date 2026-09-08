  r("race-toast").textContent = i;
  r("race-toast").classList.add("visible");
  te = P + e;
}
function de(i) {
  if (m.unlocks.includes(i)) {
    return false;
  } else {
    m.unlocks.push(i);
    return true;
  }
}
function $t(i) {
  if (E) {
    return;
  }
  const e = i.type === "finish";
  E = {
    finished: e,
    place: p.placement(),
    time: p.player.finishTime ?? p.time,
    newBest: false
  };
  if (e) {
    const s = p.practice ? "practice" : "race";
    if (!m.best[s] || E.time < m.best[s]) {
      m.best[s] = E.time;
      E.newBest = true;
    }
    de("first-splash");
    if (p.player.shortcutCompleted) {
      de("shortcut");
    }
    if (E.place === 1 && !p.practice) {
      de("champion");
    }
    U();
  }
  w = "results";
  C.active = false;
  C.clear();
  r("hud").inert = true;
  r("result-icon").innerHTML = x(e ? "trophy" : "wave");
  r("result-eyebrow").textContent = e ? p.practice ? "PRACTICE MAKES A SPLASH" : "SUNSET SPRINT · FINISHED" : "OFF THE EDGE";
  r("result-title").textContent = e ? E.place === 1 ? "Hello, champion." : "What a splash." : "A little too wild.";
  r("result-description").textContent = e ? p.practice ? `You found your flow. ${p.player.respawns} checkpoint respawn${p.player.respawns === 1 ? "" : "s"}.` : "Sun on your face. A finish worth chasing." : "The current got away. Try again, or practice with checkpoints.";
  r("result-position").innerHTML = e ? `${E.place}<small> / 13</small>` : "DNF";
  r("result-time").textContent = Y(E.time);
  r("result-badge").textContent = E.newBest ? "✧ A fresh personal best!" : e && E.place === 1 && !p.practice ? "♔ Champion crown unlocked" : e ? "Every slide is a good time." : "Steer gently. Center your landing.";
  r("modal-backdrop").hidden = false;
  r("result-dialog").hidden = false;
  r("settings-dialog").hidden = true;
  $e();
  r("replay").focus({
    preventScroll: true
  });
}
function $e() {
  r("result-board").innerHTML = p.order().map((i, e) => `<li class="${i.id === 0 ? "you" : ""}"><span class="rank">${i.eliminated ? "–" : e + 1}</span><span class="racer-color" style="background:${j[i.id === 0 ? m.palette : i.id % 4].color}"></span><span class="racer-name">${i.name}</span><span class="racer-time">${i.finishTime !== null ? Y(i.finishTime) : i.eliminated ? "DNF · fell" : i.state === "Falling" ? "Falling" : Math.round(M.progress(i) * 100) + "% · racing"}</span></li>`).join("");
}
function xe() {
  r("place").textContent = p.placement();
  r("time").textContent = Y(p.player.finishTime ?? p.time);
  const i = Math.round(M.progress(p.player) * 100);
  r("progress").textContent = i;
  r("progress-bar").style.width = i + "%";
  r("speed").textContent = Math.round(p.player.speed * 3.6);
  const e = p.player.cooldown > 0 || p.player.state !== "Sliding";
  r("jump").classList.toggle("cooling", e);
  r("jump-status").textContent = p.player.state === "Airborne" ? "AIRBORNE" : p.player.cooldown > 0 ? "RECHARGING" : "SPACE / TAP";
  r("jump").setAttribute("aria-disabled", e);
  const s = p.order();
  const n = s.indexOf(p.player);
  const t = s.slice(Math.max(0, Math.min(n - 1, 10)), Math.max(3, Math.min(n + 2, 13)));
  r("mini-board").innerHTML = t.map(h => `<div class="mini-racer ${h.id === 0 ? "you" : ""}"><span>${s.indexOf(h) + 1}</span><i style="background:${j[h.id === 0 ? m.palette : h.id % 4].color}"></i><span>${h.name}</span></div>`).join("");
  const [a, o] = It.map(p.player.position.x, p.player.position.z);
  document.querySelectorAll(".map-player").forEach(h => {
    h.setAttribute("cx", a);
    h.setAttribute("cy", o);
  });
  if (p.mode === "countdown") {
    r("countdown").innerHTML = `${Math.ceil(p.countdown)}<small>FIND YOUR FLOW</small>`;
  } else if (p.time < 0.7 && p.mode === "racing") {
    r("countdown").innerHTML = "GO!";
  } else {
    r("countdown").textContent = "";
  }
  if (w === "results") {
    $e();
  }
}
function je(i) {
  P += i;
  const e = C.read();
  p.update(i, e, m.settings.sensitivity);
  for (const s of p.events) {
    if (s.id === 0 || s.type === "count" || s.type === "go") {
      _.play(s.type);
    }
    if (s.position && ["land", "fall"].includes(s.type)) {
      S.splash(s.position, s.id === 0 ? 22 : 8);
    }
    if (s.id === 0) {
      if (s.type === "shortcut") {
        V("SHORTCUT! Clear the gap ↗");
      }
      if (s.type === "respawn") {
        V("Back in the flow · checkpoint respawn");
      }
      if (s.type === "fall") {
        V(p.practice ? "Splash! Returning to your checkpoint…" : "Over the edge…");
      }
      if (s.type === "finish" || s.type === "eliminated") {
        $t(s);
      }
    }
    if (s.type === "go") {
      V("Stay centered for extra speed", 2.4);
    }
  }
  p.events.length = 0;
  if (w === "game" && p.mode === "racing" && p.player.route === "main" && p.player.s > M.shortcut.start - 25 && p.player.s < M.shortcut.start - 6 && P > te) {
    V("SHORTCUT AHEAD · steer right + jump", 2.1);
  }
  if (P > te) {
    r("race-toast").classList.remove("visible");
  }
  if (P - me > 0.09 && w !== "menu") {
    xe();
    me = P;
  }
  _.update(i, w === "game" && p.mode === "racing");
}
let ge = performance.now();
let he = 0;
let pe = 0;
let J = 0;
let ve = false;
function _e(i) {
  requestAnimationFrame(_e);
  if (ve) {
    return;
  }
  const e = Math.min((i - ge) / 1000, 0.1);
  ge = i;
  le += e;
  while (le >= 1 / 60) {
    je(1 / 60);
    le -= 1 / 60;
  }
  S.update(p, P, e, w === "menu" || w === "settings" && $ === "menu");
  S.render();
  if (m.settings.graphics === "auto" && w === "game" && p.mode === "racing" && !document.hidden) {
    J += e;
    pe++;
    if (J > 3) {
      if (pe / J < 43) {
        he++;
      } else {
        he = 0;
      }
      if (he >= 2 && !S.adaptiveLow) {
        S.adaptiveLow = true;
        S.resize();
        r("quality-note").textContent = "Auto lowered resolution for smoother racing";
      }
      J = 0;
      pe = 0;
    }
  }
}
ne();
requestAnimationFrame(_e);
window.render_game_to_text = () => JSON.stringify({
  screen: w,
  mode: p.mode,
  practice: p.practice,
  time: +p.time.toFixed(2),
  countdown: +p.countdown.toFixed(2),
  coordinates: "Y up; s meters along route; u lateral meters (positive right); main course advances toward negative Z",
  player: {
    s: +p.player.s.toFixed(2),
    u: +p.player.u.toFixed(2),
    speed: +p.player.speed.toFixed(2),
    vy: +p.player.vy.toFixed(2),
    position: p.player.position.toArray().map(i => +i.toFixed(2)),
    state: p.player.state,
    route: p.player.route,
    progress: +M.progress(p.player).toFixed(4),
    place: p.placement(),
    cooldown: +p.player.cooldown.toFixed(2),
    checkpoint: +p.player.checkpoint.toFixed(2),
    respawns: p.player.respawns,
    eliminated: p.player.eliminated,
    shortcutUsed: p.player.shortcutUsed
  },
  course: {
    length: +M.length.toFixed(1),
    ramps: M.ramps.map(i => +i.toFixed(1)),
    shortcut: {
      entry: +M.shortcut.start.toFixed(1),
      exit: +M.shortcut.end.toFixed(1),
      length: +M.shortcut.length.toFixed(1),
      gap: M.shortcut.gap,
      entryRule: "Jump in the right lane (u > 1.5) at the entry"
    },
    checkpoints: M.checkpoints.map(i => +i.toFixed(1))
  },
  leaderboard: p.order().map(i => ({
    name: i.name,
    progress: +M.progress(i).toFixed(3),
    state: i.state,
    route: i.route,
    eliminated: i.eliminated,
    finishTime: i.finishTime
  })),
  controls: {
    steer: C.steer,
    stickPointer: C.stickId,
    jumpPointer: C.jumpId,
    handedness: m.settings.handedness
  },
  graphics: {
    quality: m.settings.graphics,
    adaptiveLow: S.adaptiveLow,
    pixelRatio: S.renderer.getPixelRatio(),
    drawCalls: S.renderer.info.render.calls
  },
  result: E
});
window.advanceTime = i => {
  ve = true;
  const e = Math.max(1, Math.round(i / (1000 / 60)));
  for (let s = 0; s < e; s++) {
    je(1 / 60);
    S.update(p, P, 1 / 60, w === "menu" || w === "settings" && $ === "menu");
  }
  xe();
  S.render();
  ge = performance.now();
  ve = false;
};
window.splashline = {
  track: M,
  race: p,
  profile: m,
  world: S,
  startRace: be,
  showMenu: ne
};
window.addEventListener("beforeinstallprompt", i => {
  i.preventDefault();
  X = i;
  r("install").hidden = false;
});
r("install").onclick = async () => {
  if (X) {
    await X.prompt();
    X = null;
    r("install").hidden = true;
  }
};
window.addEventListener("appinstalled", () => {
  r("install").hidden = true;
});
if ("serviceWorker" in navigator) {
  const i = new URL("./", location.href);
  navigator.serviceWorker.register(new URL("sw.js", i), {
    scope: i.pathname
  }).then(() => navigator.serviceWorker.ready).then(() => {
    r("offline-text").textContent = "OFFLINE READY. SLIDE ANYWHERE.";
  }).catch(e => {
    console.warn("Offline setup unavailable:", e);
    r("offline-text").textContent = "ONLINE · OFFLINE SETUP UNAVAILABLE";
  });
