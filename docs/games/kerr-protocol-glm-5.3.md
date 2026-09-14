# Kerr Protocol GLM-5.3

## Reverse Engineering Report

**Classification:** Minimal Static SPA / Raw WebGL2 Black Hole Simulator

### Extraction Summary
- **Source:** `/tmp/bench-portal/games/kerr-protocol-glm-5.3/`
- **HTML Size:** 1,008 bytes
- **JS Files:** 14 files in `src/`
- **WebGL:** WebGL2 (SwiftShader, extensions: EXT_color_buffer_float, EXT_clip_control, WEBGL_multi_draw, OVR_multiview2)
- **Network:** 3 local requests

### HTML Structure
- Single `<canvas id="gl">` element covering 1280x720 viewport
- HUD overlay container `#hud` with sub-panels: `#status`, `#physics`, `#hint`, `#debug` (hidden), `#toast` (hidden)
- Fatal error overlay `#fatal` (hidden)
- Noscript fallback div
- Module script `src/main.js` + conditional demo loader (`?demo=calm/hard`)

### JavaScript Architecture
- **Modular architecture**: 14 JS files in `src/`
- **Readable source code** — no minification
- Entry point: `src/main.js` (13,465 chars, 328 lines)
- Classes: `Camera`, `Hud`, `Input`, `MRT`, `Params`, `Program`, `RT`, `Renderer`, `SelfTest`

### Rendering Pipeline
- **Raw WebGL2** — zero runtime dependencies
- Backward null-geodesic raymarcher in Kerr spacetime
- Boyer-Lindquist coordinates, Hamiltonian RK4 integrator
- Per-pixel adaptive step sizing: coarse far from horizon, fine near photon sphere (r<5)
- MRT output with 4 data planes (color, steps/events, disk hit params, deflection angle)
- Blue noise tile for dithering; deterministic R2 jitter sequence for TAA
- Post-process chain: geodesic → TAA → bloom (13-tap down/up) → anamorphic streaks → composite

### Internal APIs / Engine Usage
- Custom GLSL shaders in `shaders/passes/` and `shaders/lib/`
- `geodesic.frag` (12.4KB) — main raymarching kernel
- `taa.frag` — temporal anti-aliasing
- `bloom_down/up.frag` — bloom post-processing
- `streak.frag` — anamorphic streaks
- `composite.frag` — final composite with ACES, grain, dither, chromatic aberration, vignette
- Physics shaders: `kerr.glsl`, `disk.glsl`, `jet.glsl`, `sky.glsl`, `blackbody.glsl`, `camera.glsl`, `common.glsl`, `noise.glsl`

### Data Models & Storage
- `Params` class for all render parameters with toast notifications
- `state` object: spin, camR, camTh, camPh, camFov, jitter, time, exposure, diskBright, nebulaBright, jetMul, etc.
- `testEnv` promise-based frame counting for self-test

### Network / Assets
- 3 local requests only
- No external dependencies
- All shaders embedded in JS or loaded via fetch

### Notable Implementation Details
- **Physics-accurate black hole**: backward null-geodesic raymarching in Kerr spacetime
- **Hamiltonian RK4 integrator**: per-pixel adaptive step sizing
- **TAA with deflection-aware reprojection**: uses oData3.w (deflection angle) to decide whether camera-matrix reprojection is trustworthy
- **Adaptive render scale**: vsync-aware hysteresis, refresh estimated from 10th-percentile frame interval
- **10-check self-test**: validates shadow radius against 3√3 M, frame dragging, ISCO tracking, lensing against numpy ground truth
- **Built agentically by GLM-5.3**: 15 hours, 749 tool calls in Claude Code
- **Non-vision model**: judged every frame through an outside vision model

### Security / Obfuscation Observations
- Fully readable source — no minification
- No external dependencies
- No runtime code generation
- Low security risk — standard WebGL usage
