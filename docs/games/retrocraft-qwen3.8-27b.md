# RetroCraft Qwen3.8 27B

## Reverse Engineering Report

**Classification:** Raw WebGL1 Voxel Sandbox (No Engine)

### Extraction Summary
- **Source:** `/tmp/bench-portal/games/retrocraft-qwen3.8-27b/`
- **HTML Size:** 54,523 bytes (entire game inline)
- **Total JS:** 39,194 chars captured inline
- **WebGL:** WebGL1 (SwiftShader)
- **Network:** 1 request (document only)

### HTML Structure
- DOS/Windows 95 UI chrome: `#topbar` marquee, `#win` window frame with `#titlebar`, `#menubar`, `#stage`
- Canvas `#gl` 744x417 inside `#stage` (16:9)
- CRT overlay effects: `#scan` (scanlines), `#roll` (rolling bar), `#vig` (vignette), `#waterTint`
- HUD: `#debug` text, `#cross` crosshair, `#blockName`, `#hotbar` with 8 slots
- Overlay: `#overlay` with pause/start screens
- Loading screen, status bar, footer with badges and visitor counter
- Maximize/fullscreen toggle

### CSS / Styling
- **Inline CSS** (~290 lines) — elaborate retro UI
- DOS aesthetic: `#c0c0c0` backgrounds, `border-color: #fff #4a4a4a #4a4a4a #fff` raised/sunken borders
- Fonts: `"Courier New"`, `"Comic Sans MS"`, monospace
- CRT effects via CSS gradients/animations
- Responsive scaling via `--ui` CSS custom property

### JavaScript Architecture
- **Single inline `<script>` block** (~55KB) — no external dependencies
- World: 64x40x64 voxel grid (`W=64, H=40, D=64`)
- Procedural texture atlas: 12x16px tiles generated on canvas
- Custom WebGL1 rendering pipeline (no Three.js)

### Rendering Pipeline
- **Raw WebGL1** context (`antialias: false, alpha: false`)
- 3 shader programs:
  - `T` (terrain): vertex + fragment (texture + fog + shade)
  - `S` (sky): vertex + fragment (procedural sky gradient, sun disc, stars)
  - `L` (line highlight): vertex + fragment for targeted block wireframe
- Custom matrix math: `persp()`, `makeView()`, `mat4Mul()`
- Mesh building: greedy meshing of opaque and water parts
- Texture atlas 192x16 (12 tiles), `NEAREST` filtering
- Fog: `[0.93, 0.40, 0.55]` distance-based

### Game Loop Structure
- `render(t)` — sky pass → terrain opaque pass → water pass → target highlight
- `physics(dt)` — fixed-step (1/90s) integration with axis-aligned collision
- `step1(h)` — input → velocity → `moveAxis()` with wall sliding
- Raycast for mining/placing: DDA-style voxel traversal (300 step limit)
- `buildMesh()` — full mesh rebuild on every block change

### Data Models & Storage
- `B` — `Uint8Array(W*H*D)` voxel grid
- Block types: AIR=0, GRASS=1, DIRT=2, STONE=3, LOG=4, LEAVES=5, SAND=6, WATER=7, BEDROCK=8, PLANK=9, NEON=10
- `HOTBAR[]` — 8 block types with icons
- `player` — pos, vel, yaw, pitch, onGround, fly, slot

### Internal APIs / Engine Usage
- No external engine — pure WebGL1
- `AudioContext` for chiptune synth (square wave lead + bass + noise hi-hats)
- 150 BPM 16-step sequencer scheduled via `setInterval(sched, 40)`
- Pointer lock API for FPS controls
- `ResizeObserver` on canvas for dynamic buffer sizing

### Network / Assets
- 1 request (document only) — truly self-contained
- Zero external dependencies

### Notable Implementation Details
- **Procedural world gen**: FBM noise (4 octaves) with beach detection, bedrock scatter, tree placement
- **Plaza feature**: 25-38 plaza with NEON block pattern, LOG pillars, floating synth-ring at y=20
- **Water**: semi-transparent (alpha 0.62), animated UV tint overlay
- **Sky**: procedural shader with gradient, sun disc with scan-line effect, star field with twinkle
- **Audio**: chiptune synth lead (220-523Hz arpeggio), bass root notes, noise-based hi-hats
- **HUD scaling**: `--ui` variable clamps canvas-width/960 between 1.0-1.75
- **Maximize mode**: hides chrome, requests fullscreen, re-sizes GL buffer
- **Visitor counter**: hardcoded "VISITOR № 120636 SINCE 1.1.1996" — purely decorative
- **Full 1996 GeoCities chrome**: Comic Sans header, marquee, DOS window chrome

### Security / Obfuscation Observations
- Fully readable source — no minification, no obfuscation
- Zero external dependencies reduces supply-chain risk
- `setInterval` scheduler for audio, `requestAnimationFrame` for render loop
