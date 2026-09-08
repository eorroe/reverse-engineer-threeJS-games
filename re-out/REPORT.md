# Reverse Engineering Report: Pelican Pedal

## 1. Classification

| Attribute | Value |
|-----------|-------|
| **URL** | `https://pelican-pedal.zecoba.workers.dev/` |
| **Type** | Single-page WebGL 2 browser game (endless runner) |
| **Dependencies** | None — fully self-contained inline HTML/CSS/JS |
| **CDN** | None |
| **Offline capable** | Yes (no network after initial load) |
| **Language** | JavaScript (ES5/ES6), GLSL ES 3.0 |
| **Storage** | Web `localStorage` under prefix `pelican-pedal.` |

## 2. Architecture Overview

The application is a single `index.html` (~94 KB total) containing:
- Inline `<style>` block (~7 KB)
- 4 inline `<script>` blocks (~58 KB total)

No external assets, images, fonts (beyond system fonts), or fetch/XHR calls.

```
index.html
├── <style> … </style>
├── <canvas id="scene">
├── UI overlays (menu, HUD, modals, footer)
└── <script> #0 WebGL 2 Renderer (~16 KB)
    <script> #1 AudioEngine  (~3 KB)
    <script> #2 World / Geometry (~16 KB)
    <script> #3 Game Loop / UI (~23 KB)
```

## 3. Script Breakdown

### Script 0 — WebGL 2 Renderer (`script_0.js`, 134 lines)

- **Namespace**: `window.PP`
- **Matrix math**: `M.identity`, `M.mul`, `M.compose`, `M.perspective`, `M.ortho`, `M.lookAt`, `M.invert`
- **Geometry primitives**: `G.box`, `G.sphere`, `G.cylinder`, `G.torus`, `G.plane`, `G.wedge`
- **Scene graph**: `Node` class with children, position, rotation, scale
- **Renderer**: `PP.Renderer`
  - Compiles 3 shader programs:
    - `vertex` / `fragment` — main PBR-like shading with shadows, fog, specular
    - `depthV` / `depthF` — shadow map pass
    - `skyV` / `skyF` — procedural skybox with stars, sun, horizon
  - Shadow mapping: 1536×1536 depth texture, 5×5 PCF
  - Instanced rendering via `drawArraysInstanced`
  - Modes: `uMode` 0=normal, 1=water, 2=emissive, 3=specular-only, 4=checkerboard

### Script 1 — AudioEngine (`script_1.js`, 15 lines)

- **Class**: `PP.AudioEngine`
- Runtime synthesized audio using Web Audio API
- Wind noise: looping brown noise through low-pass filter
- SFX: `fish`, `jump`, `duck`, `hit`, `boost`, `start`, `over`
- Background music: procedural chord progression (4-chord loop, ~162 BPM eighth notes)
- User-gesture-gated (`AudioContext` resumes on click)

### Script 2 — World / Geometry (`script_2.js`, 111 lines)

- **Exports**: `PP.World`, `PP.mesh`, `PP.tube`, `PP.geo`, `PP.C` (palette)
- **Models**:
  - `palm(height, lean)` — procedural palm tree with trunk segments and leaf spheres
  - `umbrella(color)` — beach umbrella
  - `building(index)` — multi-story coastal building with windows
  - `lighthouse()` — striped lighthouse with balcony
  - `sailboat(color)` — simple sailboat
  - `makePelican()` — protagonist: pelican on a bicycle
    - Wheels, frame tubes, basket, bird body/head/wings/scarf/tail
    - `animate(t, speed, jump, duck, boost, laneTilt)` callback
  - `obstacle(kind)` — `crate`, `barrier`, `arch`, `van`
  - `fish()` — golden fish collectible
  - `powerup(type)` — `shield` (mint) or `magnet` (purple)
- **World layout** (`createWorld`):
  - 19 road segments, repeating every 304 units Z
  - 13 scenery blocks with palms, buildings, umbrellas, lamps
  - Far details: lighthouse, 4 sailboats, 9 hills, 12 clouds, 8 birds, 1 hot-air balloon
  - Day/sunset/night color cycle tied to `distance % 2400`

### Script 3 — Game Loop / UI (`script_3.js`, 154 lines)

- **State machine**: `menu` → `countdown` → `running` → `dying` → `result`
- **Modes**: `cruise` (relaxed) and `rush` (faster)
- **Controls**:
  - Keyboard: `A/D` or `←/→` lane change, `Space/↑/W` jump, `↓/S` duck, `Shift` boost, `Esc/P` pause, `M` mute, `F` fullscreen
  - Touch: directional buttons + swipe/ tap
- **Mechanics**:
  - 3 lives; collision reduces life unless shielded/boosting
  - Jump over `crate`, duck under `arch`, avoid `barrier` and `van`
  - Collect fish for score + boost charge; combo multiplier every 8 fish
  - Powerups: shield (1 hit protection), magnet (auto-collect fish)
  - Boost (Shift) when bar full: 6 s invincibility + speed ×1.48 + auto-fish
  - Near-miss bonus (+35 score) when passing obstacle closely
- **Spawning** (`spawnRow`):
  - Procedural rows of obstacles + fish lanes
  - Intro rows 0–4 are scripted; thereafter randomized with safety lane
  - Powerups spawn every 6th row after row 5
- **Persistence** (`localStorage` keys):
  - `pelican-pedal.best.cruise` / `pelican-pedal.best.rush`
  - `pelican-pedal.sound` (`on`/`off`)
  - `pelican-pedal.quality` (`auto`/`low`/`high`)
- **Debug/test API**: Exposed on `window.__PELICAN__` when `?test=1` is in the URL
  - `snapshot()`, `start()`, `home()`, `pause()`, `resume()`, `action(name)`, `set(values)`, `clear()`, `spawn(type,l,z,y,sub)`, `step(seconds)`

## 4. Network & API Analysis

Only 1 network request captured:
- `GET https://pelican-pedal.zecoba.workers.dev/` — returns the full HTML

No XHR, `fetch()`, WebSocket, or analytics endpoints detected. The site is entirely client-side with no backend API.

## 5. UI Structure

| ID / Class | Purpose |
|------------|---------|
| `#scene` | WebGL canvas |
| `#loading` | Splash screen with animated loader |
| `#error` | Fatal error modal |
| `#header` | Top bar: wordmark, status, settings |
| `#menu` | Main menu with hero copy, mode switch, start button |
| `#hud` | In-game HUD: distance, score, lives, speed, boost |
| `#countdown` | 3-2-1 countdown overlay |
| `#pause-modal` | Pause menu |
| `#help-modal` | Controls help |
| `#result-modal` | Run summary / postcard |
| `#touch-controls` | Mobile on-screen D-pad |
| `#footer` | Branding footer |

## 6. Key Technical Details

- **Renderer**: Custom tiny WebGL 2 engine, ~130 lines of JS + GLSL
- **Shadows**: Single directional-light shadow map with PCF
- **Instancing**: All geometry drawn instanced; batches keyed by `geoId_mode_cast`
- **Particles**: Object pool of 140 nodes for burst effects
- **Responsive**: Two camera rigs (`small` breakpoint at 760 px width)
- **Accessibility**: ARIA labels, focus management, reduced-motion media query
- **Quality**: `low` (ECO, no shadows, lower pixel ratio) vs `high` (HD, shadows, up to 1.7× DPR)

## 7. File Inventory (Output)

- `re-out/page.html` — Full page source (91,896 bytes)
- `re-out/screenshot.png` — Browser screenshot (1280×800)
- `re-out/requests.txt` — Captured network requests
- `re-out/scripts/script_0.js` — Renderer
- `re-out/scripts/script_1.js` — Audio
- `re-out/scripts/script_2.js` — World/Models
- `re-out/scripts/script_3.js` — Game/UI
- `re-out/REPORT.md` — This report

## 8. Notable Observations

1. The site is served behind Cloudflare Workers (`Cf-Cache-Status: HIT`, `Server: cloudflare`).
2. Favicon is an inline SVG data URI (pelican silhouette).
3. All fonts are system fonts (`Inter`, `Arial`, `PingFang SC`, `Microsoft YaHei`).
4. The game has a built-in deterministic PRNG (`sessionSeed` based) for reproducible spawning.
5. No obfuscation — code is readable, hand-written, and compact.
6. The site description explicitly states: “Original procedural game. No CDN, remote resources, or runtime dependencies.”
