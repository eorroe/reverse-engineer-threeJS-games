function Pt(i, e) {
  const s = e.main.samples.filter((c, u) => u % 7 === 0).map(c => [c.position.x, c.position.z]);
  const n = Math.min(...s.map(c => c[0]));
  const t = Math.max(...s.map(c => c[0]));
  const a = Math.min(...s.map(c => c[1]));
  const o = Math.max(...s.map(c => c[1]));
  const h = (c, u) => [18 + (c - n) / (t - n) * 100, 14 + (u - a) / (o - a) * 134];
  const l = `<svg class="course-map" viewBox="0 0 136 166" aria-label="Sunset Sprint winding course map"><polyline points="${s.map(([c, u]) => h(c, u).join(",")).join(" ")}" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${h(...s[0])[0]}" cy="${h(...s[0])[1]}" r="5" fill="#173c44"/><circle class="map-player" r="4" fill="#173c44" stroke="#fff" stroke-width="2"/></svg>`;
  document.querySelector("#app").innerHTML = `
  <canvas id="game" aria-label="3D waterslide racing course"></canvas>
  <div id="menu-shade"></div>
  <header id="menu-header"><a class="brand" href="./" aria-label="Splashline home"><span class="brand-mark">${x("wave")}</span>splashline<span class="brand-dot">®</span></a><div class="header-right"><span class="edition">THE ENDLESS SUMMER CLUB</span><button id="install" class="icon-button" aria-label="Install game" hidden>${x("download")}</button><button id="sound" class="icon-button" aria-label="Toggle sound">${x("sound")}</button><button id="settings-open" class="icon-button" aria-label="Open settings">${x("settings")}</button></div></header>
  <main id="menu">
    <div class="menu-content"><div class="eyebrow"><span class="tiny-sun">✳</span> GOOD TIMES. HIGH TIDES.</div>
    <h1>Catch the<br><span>current.</span></h1>
    <p class="intro">A little sun. A lot of speed.<br> 13 racers. One way to make a splash.</p>
    <section class="launch-card" aria-label="Race setup">
      <div class="swimmer-row"><div><span class="field-label">YOUR SWIMMER</span><strong id="palette-name">${j[i.palette].name}</strong></div><div class="palettes" role="group" aria-label="Swimmer palette">${j.map((c, u) => `<button class="swatch ${u === i.palette ? "selected" : ""}" data-palette="${u}" style="--swatch:${c.color}" aria-label="${c.name} palette" aria-pressed="${u === i.palette}">${u === i.palette ? x("check") : ""}</button>`).join("")}</div></div>
      <div class="accessories" role="group" aria-label="Swimmer accessory"><button data-accessory="goggles">Goggles</button><button data-accessory="cap">Sun cap</button><button data-accessory="classic">Classic</button><button data-accessory="crown" title="Win a race to unlock">Crown <span>♔</span></button></div>
      <button id="start-btn" class="primary-button">Let's slide <span>${x("arrow")}</span></button>
      <div class="practice-row"><label class="switch-label" for="practice"><span class="switch"><input type="checkbox" id="practice" ${i.settings.practice ? "checked" : ""}><span></span></span>Practice mode</label><span class="practice-note" id="practice-note">One life. Make it count.</span></div>
    </section>
    <div class="control-hint"><span><kbd>←</kbd><kbd>→</kbd> steer</span><span><kbd>SPACE</kbd> jump</span><span class="touch-hint">Thumbstick to steer · tap to jump</span></div>
    </div>
    <aside class="course-card"><div class="course-top"><span class="field-label">THE COURSE</span><span class="course-number">01 / 01</span></div><div class="course-card-body"><div><h2>Sunset<br>Sprint</h2><span class="course-tag"><span></span> TROPICAL CIRCUIT</span></div>${l}</div><div class="course-stats"><div><strong>${Math.round(e.length)}<small>m</small></strong><span>SLIDE LENGTH</span></div><div><strong>13</strong><span>RACERS</span></div><div><strong>2</strong><span>RAMPS</span></div></div></aside>
    <div class="preview-label"><span></span> LIVE COURSE PREVIEW <span class="preview-arrow">↘</span></div>
  </main>
  <footer id="menu-footer"><span class="offline-state"><span id="offline-dot"></span><span id="offline-text">YOUR NEXT MINI VACATION</span></span><span id="best-record">${x("trophy")} PERSONAL BEST <strong>${Y(i.best[i.settings.practice ? "practice" : "race"])}</strong></span><span class="footer-note">NO DOWNLOAD. JUST DIVE IN.</span></footer>
  <div id="hud" hidden><div class="race-top"><div class="position-box"><span class="field-label">POSITION</span><div><strong id="place">7</strong><span>/ 13</span></div></div><div class="timing"><span id="mode-label">SUNSET SPRINT</span><strong id="time">00:00.00</strong><div class="progress-track"><span id="progress-bar"></span></div><small><span id="progress">0</span>% TO THE SPLASH</small></div><button id="pause" class="icon-button" aria-label="Pause race">${x("pause")}</button></div><div class="speed-box"><strong id="speed">0</strong><span>KM/H</span></div><aside id="mini-board"></aside><div id="race-map">${l}</div><div id="race-toast" role="status"></div><div id="countdown" aria-live="assertive"></div><div id="touch-controls"><div class="joystick-wrap"><div id="joystick" aria-label="Steering joystick" role="group"><span class="stick-cross horizontal"></span><span class="stick-cross vertical"></span><span class="stick-knob"></span></div><span class="control-caption">STEER</span></div><div class="jump-wrap"><button id="jump" aria-label="Jump">${x("jump")}<span>JUMP</span></button><span class="control-caption" id="jump-status">SPACE</span></div></div></div>
  <div id="modal-backdrop" hidden><section id="settings-dialog" class="dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title" hidden><div class="dialog-heading"><div><span class="field-label" id="settings-eyebrow">MAKE YOURSELF COMFORTABLE</span><h2 id="settings-title">Your kind of flow.</h2></div><button id="settings-close" class="icon-button" aria-label="Close settings">${x("close")}</button></div>
    <div class="settings-group"><h3>Controls</h3><label class="setting-row"><span>Steering sensitivity</span><span class="range-control"><input id="sensitivity" type="range" min="0.5" max="1.7" step="0.1" value="${i.settings.sensitivity}"><output id="sensitivity-value">${i.settings.sensitivity.toFixed(1)}×</output></span></label><label class="setting-row"><span>Thumbstick side</span><select id="handedness"><option value="right">Left side (default)</option><option value="left">Right side (swapped)</option></select></label></div>
    <div class="settings-group"><h3>Graphics</h3><label class="setting-row"><span>Quality<small id="quality-note">Auto adapts to your device</small></span><select id="graphics"><option value="auto">Adaptive</option><option value="high">High · 1.5×</option><option value="low">Low · 1.0×</option></select></label>${B("shadows", "Soft shadows", "More depth, more battery")}${B("postprocessing", "Color finish", "Subtle grading and vignette")}${B("effects", "Splashes & trails", "A little extra sparkle")}</div>
    <div class="settings-group"><h3>Audio</h3>${B("sound-setting", "Sound effects", "Countdown, jumps and splashes")}${B("music", "Poolside melody", "Original, gently generated tones")}</div>
    <div class="settings-group"><h3>Your progress <span id="unlock-count"></span></h3><div id="unlocks" class="unlock-list"></div><p class="local-note">Saved on this device. Your race stays yours.</p></div>
    <button id="settings-done" class="primary-button">Back to the sunshine ${x("arrow")}</button><button id="quit" class="text-button" hidden>Leave race</button>
  </section>
  <section id="result-dialog" class="dialog result-dialog" role="dialog" aria-modal="true" aria-labelledby="result-title" hidden><div class="result-icon" id="result-icon">${x("trophy")}</div><span class="eyebrow" id="result-eyebrow">THAT'S A WRAP</span><h2 id="result-title">What a splash.</h2><p id="result-description"></p><div class="result-stats"><div><span>POSITION</span><strong id="result-position"></strong></div><div><span>YOUR TIME</span><strong id="result-time"></strong></div></div><div id="result-badge"></div><div class="board-title"><span>THE FINISH LINE</span><span>TIME / STATUS</span></div><ol id="result-board"></ol><button id="replay" class="primary-button">One more slide ${x("arrow")}</button><button id="result-menu" class="text-button">Back to the poolside</button></section></div>
  <div id="fatal-error" hidden role="alert"></div><div id="save-notice" hidden role="status">Storage is unavailable. You can play, but progress won’t save.</div>
  `;
  return {
    map: h
  };
}
function B(i, e, s) {
  return `<label class="setting-row"><span>${e}<small>${s}</small></span><span class="switch"><input id="${i}" type="checkbox"><span></span></span></label>`;
}
const m = St();
const M = dt();
const It = Pt(m, M);
const r = i => document.getElementById(i);
let S;
let p;
let C;
let w = "menu";
let $ = "menu";
let P = 0;
let le = 0;
let te = 0;
let me = -1;
let E = null;
let X = null;
let Fe = null;
const _ = new Lt(m.settings);
try {
  S = new Et(r("game"), M, m.settings);
  p = new ft(M, (i, e, s) => S.surface.height(i, e, s));
} catch (i) {
  r("fatal-error").hidden = false;
  r("fatal-error").textContent = "The pool couldn’t open. This game needs WebGL 2. Try updating your browser and enabling hardware acceleration, then reload.";
  console.error(i);
  throw i;
}
function U() {
  if (!Tt(m)) {
    r("save-notice").hidden = false;
  }
}
function we() {
  if (m.accessory === "crown" && !m.unlocks.includes("champion")) {
    m.accessory = "goggles";
  }
  S.swimmers.customize(0, m.palette, m.accessory);
  r("palette-name").textContent = j[m.palette].name;
  document.querySelectorAll("[data-palette]").forEach(i => {
    const e = +i.dataset.palette === m.palette;
    i.classList.toggle("selected", e);
    i.setAttribute("aria-pressed", e);
    i.innerHTML = e ? x("check") : "";
  });
  document.querySelectorAll("[data-accessory]").forEach(i => {
    i.classList.toggle("selected", i.dataset.accessory === m.accessory);
    i.setAttribute("aria-pressed", i.dataset.accessory === m.accessory);
    i.disabled = i.dataset.accessory === "crown" && !m.unlocks.includes("champion");
  });
}
function ae() {
  r("practice-note").textContent = m.settings.practice ? "Fall. Respawn. Find your flow." : "One life. Make it count.";
  r("start-btn").innerHTML = `${m.settings.practice ? "Find your flow" : "Let's slide"} <span>${x("arrow")}</span>`;
  r("best-record").innerHTML = `${x("trophy")} ${m.settings.practice ? "PRACTICE" : "PERSONAL"} BEST <strong>${Y(m.best[m.settings.practice ? "practice" : "race"])}</strong>`;
  r("sound").innerHTML = x(m.settings.sound ? "sound" : "muted");
  r("sound").setAttribute("aria-pressed", m.settings.sound);
  document.body.classList.toggle("left-handed", m.settings.handedness === "left");
  we();
}
function ne() {
  w = "menu";
  p.reset(m.settings.practice);
  p.mode = "menu";
  C?.clear();
  if (C) {
    C.active = false;
  }
  for (const i of p.racers) {
    i.s = 92 + i.id * 4.1;
    i.u = Math.sin(i.id * 3) * 2.5;
    i.position.copy(M.main.surface(i.s, i.u));
  }
  p.player.s = 114;
  p.player.u = -1.2;
  p.player.position.copy(M.main.surface(114, -1.2));
  for (const i of ["menu", "menu-header", "menu-footer", "menu-shade"]) {
    r(i).hidden = false;
  }
  for (const i of ["hud", "modal-backdrop", "settings-dialog", "result-dialog"]) {
    r(i).hidden = true;
  }
  r("menu").inert = false;
