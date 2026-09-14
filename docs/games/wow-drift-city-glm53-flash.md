# Wow Drift City GLM-5.3 Flash

## Reverse Engineering Report

**Classification:** Dynamic SPA / Racing Game (Inline Code)

### Extraction Summary
- **Source:** `/tmp/bench-portal/games/wow-drift-city-glm53-flash/`
- **HTML Size:** 62,198 bytes (entire game inline)
- **Total JS:** 55,201 chars captured inline
- **WebGL:** Not detected (context loss in headless)
- **Network:** 6 requests (document + 5 scripts)

### HTML Structure
- Single HTML file with extensive inline JavaScript (~1278 lines)
- `<canvas>` for WebGL, plus multiple UI overlay divs: `#vignette`, `#scan`, `#title`, `#score`, `#speedo`, `#popup`, `#paused`, `#fps`, `#hint`, `#help`, `#boot`
- Touch controls: `#touch` with `.tbtn` buttons
- `#fallback` for unsupported browsers

### JavaScript Architecture
- Three.js 0.170.0 via importmap from jsDelivr
- Post-processing: EffectComposer, RenderPass, UnrealBloomPass, OutputPass
- **Entire game code is inline in page.html** — no external JS files
- Module pattern with IIFE-style sections

### Rendering Pipeline
- `WebGLRenderer` with antialias, high-performance preference
- ACES Filmic tone mapping, exposure 1.12
- EffectComposer: RenderPass → UnrealBloomPass → OutputPass
- Custom sky shader (stars, moon, atmospheric scattering)
- Ground shader with procedural city, roads, street lamps, wet-road specular
- Instanced building shader with procedural windows and neon signs
- Neon billboard shader with animated patterns
- Street lamps, antennas, trees (instanced)
- Traffic AI (14 vehicles)
- Player car with detailed parts (body, cabin, wheels, headlights, underglow, nitro flames)
- Skid marks via canvas texture overlay
- Smoke particle system (420 particles, GPU-driven points)

### Game Loop Structure
- `THREE.Clock` based main loop (`tick()`)
- Sub-stepped physics (2 sub-steps per frame)
- Physics: custom car dynamics with grip, drift, slip angle, yaw rate
- Building-block collision (8x8 grid)
- Traffic collision
- World bounds (±300)
- Scoring system with chain multiplier
- Adaptive pixel ratio (quality scaling based on frame time)

### Internal APIs / Engine Usage
- Three.js core + post-processing addons
- `PMREMGenerator` for environment reflections from sky
- `THREE.Clock` for delta time
- Custom audio: Web Audio API synthesized engine (sawtooth + square oscillators, filtered noise for skid/wind)
- Deterministic RNG (mulberry32 variant) for procedural city

### Data Models & Storage
- `localStorage.setItem('dc_best', best)` — persistent best score
- Game state: `{}` (empty)

### Network / Assets
- 6 requests: document, 5 scripts (importmap + 4 Three.js imports)
- Only dependency: Three.js CDN
- All game code and assets self-contained

### Notable Implementation Details
- **Full procedural city generation** (8x8 blocks, buildings, parks, antennas)
- **Instanced rendering** for buildings, traffic, lamps, trees
- **Custom GLSL shaders** for ground (roads, paint, wet specular, neon spill, headlights)
- **Skid mark system** via dynamic canvas texture
- **Smoke particle system** with velocity-based animation
- **Synthesized engine audio** with RPM-throttle mapping
- **Drift mechanic** with chain scoring
- **Traffic AI** with intersection turning logic
- **Adaptive quality** (pixel ratio adjustment)
- **Touch controls** for mobile

### Security / Obfuscation Observations
- No obfuscation — all code is readable inline JavaScript
- No minification; well-commented with section dividers
- No external bundler artifacts
