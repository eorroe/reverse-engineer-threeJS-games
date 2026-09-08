  r("menu-header").inert = false;
  S.cameraReady = false;
  E = null;
  ae();
}
function be() {
  _.unlock();
  _.play("click");
  w = "game";
  p.reset(m.settings.practice);
  E = null;
  for (const i of ["menu", "menu-header", "menu-footer", "menu-shade", "modal-backdrop", "settings-dialog", "result-dialog"]) {
    r(i).hidden = true;
  }
  r("hud").hidden = false;
  r("hud").inert = false;
  C.clear();
  C.active = true;
  S.cameraReady = false;
  r("mode-label").textContent = m.settings.practice ? "PRACTICE · CHECKPOINTS ON" : "SUNSET SPRINT";
  te = 0;
  r("race-toast").classList.remove("visible");
  me = -1;
  xe();
  r("pause").focus({
    preventScroll: true
  });
}
function K() {
  if (w === "settings") {
    return;
  }
  Fe = document.activeElement;
  $ = p.mode;
  if (w === "game") {
    p.mode = "paused";
    r("settings-eyebrow").textContent = "TAKE A BREATHER";
    r("settings-title").textContent = "Poolside pause.";
  } else {
    r("settings-eyebrow").textContent = "MAKE YOURSELF COMFORTABLE";
    r("settings-title").textContent = "Your kind of flow.";
  }
  w = "settings";
  C.clear();
  C.active = false;
  r("hud").inert = true;
  r("menu").inert = true;
  r("menu-header").inert = true;
  r("quit").hidden = $ === "menu";
  r("settings-done").innerHTML = `${$ === "menu" ? "Back to the sunshine" : "Keep sliding"} ${x("arrow")}`;
  for (const e of ["graphics", "handedness", "sensitivity"]) {
    r(e).value = m.settings[e];
  }
  for (const e of ["shadows", "postprocessing", "effects", "music"]) {
    r(e).checked = m.settings[e];
  }
  r("sound-setting").checked = m.settings.sound;
  r("sensitivity-value").textContent = m.settings.sensitivity.toFixed(1) + "×";
  const i = [["first-splash", "First finish"], ["shortcut", "Gap jumper"], ["champion", "Champion ♔"]];
  r("unlocks").innerHTML = i.map(([e, s]) => `<span class="unlock ${m.unlocks.includes(e) ? "earned" : ""}">${m.unlocks.includes(e) ? "✓" : "○"} ${s}</span>`).join("");
  r("unlock-count").textContent = `${m.unlocks.length} / 3`;
  r("modal-backdrop").hidden = false;
  r("settings-dialog").hidden = false;
  r("result-dialog").hidden = true;
  r("settings-close").focus({
    preventScroll: true
  });
}
function ke() {
  if (w === "settings") {
    r("modal-backdrop").hidden = true;
    r("settings-dialog").hidden = true;
    r("hud").inert = false;
    r("menu").inert = false;
    r("menu-header").inert = false;
    p.mode = $;
    w = $ === "menu" ? "menu" : "game";
    C.active = w === "game";
    C.clear();
    Fe?.focus({
      preventScroll: true
    });
  }
}
function Ot() {
  if (w === "settings") {
    ke();
  } else if (w === "game") {
    K();
  }
}
function Ft() {
  if (document.fullscreenElement) {
    document.exitFullscreen?.();
  } else {
    document.documentElement.requestFullscreen?.().catch(() => {});
  }
}
C = new At(r("joystick"), r("jump"), {
  pause: Ot,
  fullscreen: Ft
});
r("start-btn").onclick = be;
r("replay").onclick = be;
r("result-menu").onclick = ne;
r("settings-open").onclick = K;
r("settings-close").onclick = ke;
r("settings-done").onclick = ke;
r("quit").onclick = ne;
r("pause").onclick = K;
r("practice").onchange = i => {
  m.settings.practice = i.target.checked;
  U();
  ae();
};
r("sound").onclick = () => {
  _.unlock();
  m.settings.sound = !m.settings.sound;
  U();
  ae();
  _.play("click");
};
document.querySelectorAll("[data-palette]").forEach(i => i.onclick = () => {
  m.palette = +i.dataset.palette;
  U();
  we();
});
document.querySelectorAll("[data-accessory]").forEach(i => i.onclick = () => {
  m.accessory = i.dataset.accessory;
  U();
  we();
});
for (const i of ["graphics", "handedness", "sensitivity", "shadows", "postprocessing", "effects", "sound-setting", "music"]) {
  r(i).addEventListener(i === "sensitivity" ? "input" : "change", e => {
    const s = i === "sound-setting" ? "sound" : i;
    m.settings[s] = e.target.type === "checkbox" ? e.target.checked : i === "sensitivity" ? +e.target.value : e.target.value;
    if (["graphics", "shadows", "postprocessing", "effects"].includes(i)) {
      S.applySettings(m.settings);
    }
    r("sensitivity-value").textContent = m.settings.sensitivity.toFixed(1) + "×";
    _.unlock();
    U();
    ae();
  });
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden && w === "game") {
    K();
  }
});
window.addEventListener("blur", () => {
  if (w === "game") {
    K();
  }
});
document.addEventListener("keydown", i => {
  if (i.key !== "Tab" || !["settings", "results"].includes(w)) {
    return;
  }
  const s = [...r(w === "settings" ? "settings-dialog" : "result-dialog").querySelectorAll("button:not([disabled]),input,select")].filter(a => !a.hidden);
  const n = s[0];
  const t = s.at(-1);
  if (i.shiftKey && document.activeElement === n) {
    i.preventDefault();
    t.focus();
  } else if (!i.shiftKey && document.activeElement === t) {
    i.preventDefault();
    n.focus();
  }
});
function V(i, e = 2.3) {
