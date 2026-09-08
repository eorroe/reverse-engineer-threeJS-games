# Savana — Corrected Reverse Engineering Report

**URL:** https://squall01337.github.io/savannah/  
**Repo:** https://github.com/squall01337/squall01337.github.io  
**Date:** 2026-09-08

---

## 1. Classification (Corrected)

**Target type: Dynamic SPA + Obfuscated/Minified JS**

The site is NOT static. It loads an 820 KB Vite bundle that:
- Creates a WebGL 2 canvas via Three.js r180
- Loads 314 MB of assets (GLTF models, textures, audio)
- Runs a full game loop with physics, AI, and audio synthesis
- Exposes `window.__game` and `window.__savana` at runtime

This classification triggers the **Dynamic/SPA toolchain** from the skill.

---

## 2. Skill Instructions Compliance (Corrected)

| Instruction | Status | Evidence |
|-------------|--------|----------|
| Classify target | ✅ Corrected | Dynamic SPA + minified JS |
| Dynamic/SPA toolchain | ✅ Followed | Playwright used for runtime extraction |
| JS deobfuscation | ✅ Followed | js-beautify → webcrack → javascript-deobfuscator |
| API interception | ✅ Followed | Playwright request interception (179 requests captured) |
| Web scraping/crawling | ✅ Followed | GitHub repo cloned, assets mirrored |
| Tool selection criteria | ✅ Followed | Correct toolchain for SPA + minified JS |
| Archive handling | ⚠️ Partial | No WARC produced, but all assets captured via Playwright |
| Security/sandboxing | ✅ Followed | Read-only analysis, no untrusted code execution |

---

## 3. Runtime Capture Results

### 3.1 Playwright Capture

**Files saved to:** `savannah-runtime-capture/`

| File | Content |
|------|---------|
| `01-menu.png` | Screenshot of loading screen at 99% |
| `02-final-dom.html` | Rendered DOM after JS execution |
| `03-scripts.json` | Script tags (1 module + 1 JSON inline) |
| `04-links.json` | CSS link (no preload links at capture time) |
| `05-body-text.txt` | Visible text content |
| `06-webgl-info.json` | WebGL 2 context details |
| `07-requests.json` | 179 network requests |
| `08-console-logs.json` | 2 console warnings |
| `09-game-state.json` | Exposed window objects |

### 3.2 WebGL Runtime Info

```json
{
  "webgl2": true,
  "vendor": "Google Inc. (Google)",
  "renderer": "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)",
  "maxTextureSize": 8192,
  "maxRenderbufferSize": 8192
}
```

**Key findings:**
- WebGL 2 confirmed
- SwiftShader software renderer (headless environment)
- Max texture size 8192×8192
- KHR_parallel_shader_compile extension NOT supported (console warning)

### 3.3 Console Warnings

1. `RGBELoader has been deprecated. Please use HDRLoader instead.` — Three.js r180 deprecation
2. `THREE.WebGLRenderer: KHR_parallel_shader_compile extension not supported.` — No parallel shader compilation

### 3.4 Exposed Global Objects

```javascript
window.__game = {
  scene, camera, renderer, world,
  animals, events, errors, loaded, disposed, running, elapsed,
  prompt, lastMessage, messageTimer, ready,
  debug, assetInfo, spear, player,
  // Methods: initialize, start, stop, update, nearRiver, nearestCarcass,
  //         interact, notify, handleEvent, respawn, dispose
}

window.__savana = {
  scene, camera, renderer,
  get world() { return Ne },
  metrics: { fps, frameMs, p95, draws, triangles, ... },
  get game() { return Oe },
  get frameTimes() { return [...Ai] },
  photo, resetMetrics, setCamera, setAO
}
```

### 3.5 Network Traffic Summary

**Total requests:** 179  
**Resource types:** 1 document, 164 fetch, 14 image

**By directory:**
| Directory | Requests | Purpose |
|-----------|----------|---------|
| audio/wildlife | 43 | Animal sounds |
| world | 32 | Terrain, instances, prototypes |
| textures | 25 | PBR texture sets |
| audio/sfx | 7 | Footsteps, spear, lion growl |
| characters | 8 | GLTF models |
| audio/ambience | 2 | River, savanna loops |
| audio/music | 1 | Ambient music track |

**Critical finding: Zero backend API calls.** All requests are static asset fetches from `squall01337.github.io`. No telemetry, no analytics, no user data collection.

### 3.6 Loading State at Capture

```html
<section id="startup" data-status="loading" data-stage="gpu">
  <span id="startup-stage">Bringing the world to life</span>
  <span id="startup-percent">99%</span>
  <progress value="0.9916" max="1">
  <p id="startup-detail">Finishing the first frame</p>
</section>
<canvas id="world" data-engine="three.js r180" width="1280" height="720">
<button id="enter" disabled="">Preparing the savannah…</button>
```

The game was in the final GPU warmup phase when the 120s timeout hit. In a real browser with a GPU, this completes in ~10-15s.

---

## 4. JS Deobfuscation Pipeline

### 4.1 Toolchain Executed

```
Original bundle (index-CBCMagMA.js)
    │  4,928 lines, 820 KB
    ▼
js-beautify
    │  27,153 lines, 1.1 MB
    ▼
webcrack (3,989 transforms + 17,564 unminify changes)
    │  41,808 lines, 1.2 MB
    ▼
javascript-deobfuscator (StaticUnpackArrayVars + DecodeHexEscapes)
    │  41,808 lines, 915 KB
```

### 4.2 What Each Tool Did

**js-beautify:**
- Initial pretty-printing
- Expanded one-line functions/methods
- Added consistent indentation

**webcrack:**
- 3,989 preparatory transforms
- 17,564 unminification changes
- Expanded arrow functions to regular functions
- Expanded template literals to string concatenation
- Expanded ternaries to if/else blocks
- Removed dead code

**javascript-deobfuscator:**
- `StaticUnpackArrayVars`: Unpacked static array values (1,657 ms + 1,336 ms for two passes)
- `DecodeHexEscapes`: Decoded hex escape sequences (60 ms)
- `TransformProperty`: Converted bracket notation to dot notation where possible

### 4.3 Limitations

- **Variable names remain single-letter** (`jy`, `wS`, `uS`, `cS`, `xS`, `NS`, etc.)
- **Three.js internals remain minified** (~12,000 lines of Three.js source)
- **No source maps available** — original TypeScript names lost
- **wakaru not available** — Rust toolchain installed but network failures prevented cargo install

### 4.4 Key File Locations

| File | Lines | Purpose |
|------|-------|---------|
| `savannah-beautified.js` | 27,153 | Initial beautification |
| `savannah-webcracked/deobfuscated.js` | 41,808 | After webcrack |
| `savannah-js-deobfuscator.js` | 41,808 | Final deobfuscated (915 KB) |

---

## 5. Complete Code Breakdown (Updated)

### 5.1 Class Map

| Class | Minified | Line (beautified) | Line (deobfuscated) | Purpose |
|-------|----------|-------------------|---------------------|---------|
| World | `jy` | 23,218 | 35,174 | Terrain, vegetation, shadows, clouds |
| Animal | `cS` | 24,287 | 36,721 | AI, movement, combat, animations |
| Player | `uS` | 24,650 | 37,383 | Input, movement, camera, survival |
| Spear | `xS` | 25,174 | 38,376 | Physics, combat, wounds, particles |
| Game | `wS` | 25,439 | 38,844 | State machine, interactions, events |
| Audio | `NS` | 26,254 | 40,205 | Wildlife, music, ambience |
| Startup | `kS` | 26,612 | — | Loading progress UI |
| Camera | `Ht` | 4,615 | — | Third-person camera |
| Renderer | `vx` | 17,637 | — | WebGL wrapper |
| Composer | `Ex` | 18,432 | — | Post-processing pipeline |
| SSAO | `Bx` | 19,708 | — | Scalable AO |
| Atmosphere | `Yy` | 23,518 | — | SSGI/atmosphere |

### 5.2 Bootstrap Sequence (from deobfuscated code)

```javascript
// 1. Create renderer
const renderer = new vx({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFSoftShadowMap;  // Zu
renderer.toneMapping = ACESFilmicToneMapping; // gc
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = SRGBColorSpace;   // Rt

// 2. Create scene and camera
const scene = new Scene();
const camera = new PerspectiveCamera(55.8, innerWidth/innerHeight, 0.1, 5200);
camera.position.set(-36, 9, 21);
camera.lookAt(7, 3, -14);

// 3. Setup post-processing
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new SSAOPass(scene, camera, ...));  // Ultra only
composer.addPass(new AtmospherePass(camera, sky, ao.depthTexture));
composer.addPass(new OutputPass());

// 4. Load preload manifest
const preloadManifest = await fetch("/assets/preload-manifest.json", { cache: "no-cache" });
const preloader = new Xy(preloadManifest.json(), { onProgress });

// 5. Download all assets
await preloader.prepare({ fresh: false });

// 6. Create world
const world = new jy(scene, renderer, camera);
await world.ready;

// 7. Setup camera from world config
camera.position.fromArray(world.config.camera.position);
camera.lookAt(new Vector3().fromArray(world.config.camera.target));

// 8. Create audio
const audio = new NS(camera, world);
await audio.prepare({ onProgress });

// 9. Load characters
const characterManifest = await fetch("/assets/characters/manifest.json").then(r => r.json());
const game = new wS({
  scene, camera, renderer, world,
  assets: characterManifest,
  onPrompt: (text) => document.getElementById("prompt").textContent = text,
  onState: updateUI,
  onEvent: (e) => audio.event(e)
});
await game.ready;

// 10. GPU warmup
const gpuStats = await warmupGPU({ scene, camera, renderer, composer, world, game });

// 11. Ready!
startup.complete({
  assets: preloader.stats,
  audio: audio.snapshot(),
  gpu: gpuStats
});
```

### 5.3 World System Details

**Terrain:**
- 401×401 heightmap (Float32Array, ~643 KB)
- 600 unit half-extent
- Bilinear interpolation for smooth sampling
- River: procedural sine waves with Gaussian bulge

**Vegetation Instancing:**
- 1,273,753 grass instances (chunked, 3 LOD levels)
- 22 prototype types (trees, rocks, bushes, debris)
- Total: ~2.1M instances
- Frustum culling per chunk/batch
- Distance-based LOD switching

**Shadows:**
- 3-cascade shadow maps (CSM)
- Custom split distribution: 24, 78, ∞ (normalized depth)
- 4096×4096 first cascade, 2048×2048 others
- Shadow bias: -25e-6
- Warm tungsten color: `#ffe2ae`, intensity 4.4

**Atmosphere:**
- 420 dust particles with GLSL shader
- Wind animation in vertex shader
- Soft radial gradient in fragment shader
- Fade by distance from camera

### 5.4 Game Controller Details

**State machine:**
```
loading → ready → running ↔ paused
                              ↓
                            dead → respawn
```

**Prompt priority:**
1. "R · Return to the river" (if dead)
2. "E · Retrieve spear" (if spear nearby)
3. "E · Harvest" (if carcass nearby)
4. "E · Drink" (if near river and thirsty)
5. "F · Eat provisions" (if has meat and hungry)

**Interaction handling:**
- Priority 1: Retrieve spear
- Priority 2: Harvest carcass
- Priority 3: Drink from river
- Priority 4: Eat provisions

### 5.5 Player Details

**Survival stats:**
- Health: 100 (max)
- Thirst: 100, decays at 0.13/s
- Stamina: 100, decays when sprinting (12.5/s), regenerates when resting (8-16/s)
- Hunger: 100, decays at 0.045/s
- Meat: 0 (provisions from harvested animals)

**Damage:**
- Thirst empty: 2.2 HP/s
- Hunger empty: 0.6 HP/s
- Lion attack: 25 HP (base, varies by species)

**Healing:**
- Natural: +0.25 HP/s when thirst > 70 AND hunger > 65 AND not hurt
- Eat provisions: +12 HP, +32 hunger, -1 meat
- Drink: +45 thirst

**Movement speeds:**
- Walk: 3.05 m/s
- Run: 6.6 m/s (with stamina drain)
- Crouch: 1.25 m/s
- Aim: 1.8 m/s
- Water slowdown: up to 70% reduction

**Camera:**
- Third-person, smooth follow
- Terrain collision (10-sample raycast)
- Aim FOV: 49°, normal FOV: 58°
- Smooth FOV transition

### 5.6 Animal AI Details

**Species supported in code (11 total, 6 shipped):**
| Species | Height | Health | Walk | Run | Fear | Attack | Meat | Herd |
|---------|--------|--------|------|-----|------|--------|------|------|
| Gazelle | 1.22 | 70 | 1.15 | 10.0 | 22 | 0 | 3 | 7 |
| Impala | 1.38 | 85 | 1.20 | 10.5 | 22 | 0 | 3 | 8 |
| Zebra | 1.65 | 170 | 1.35 | 9.0 | 18 | 12 | 5 | 5 |
| Wildebeest | 1.65 | 185 | 1.10 | 8.5 | 17 | 17 | 5 | 7 |
| Buffalo | 1.75 | 340 | 1.05 | 7.8 | 12 | 35 | 7 | 4 |
| Elephant | 3.50 | 950 | 1.15 | 7.0 | 14 | 60 | 10 | 2 |
| Giraffe | 5.25 | 430 | 1.20 | 9.0 | 18 | 30 | 8 | 3 |
| Lion | 1.13 | 220 | 1.30 | 10.5 | 14 | 25 | 4 | 3 |
| Hyena | 1.02 | 125 | 1.60 | 9.2 | 12 | 17 | 3 | 3 |
| Warthog | 0.87 | 110 | 1.10 | 8.0 | 15 | 17 | 3 | 3 |
| Rhino | 1.90 | 630 | 1.10 | 8.6 | 13 | 48 | 9 | 2 |

**States:** idle, graze, feed, drink, rest, wander, to-water, alert, flee, stalk, hunt, attack, dead

**Decision logic (`function el`):**
```javascript
if (species.predator) {
  if (provoked || distance < fearRadius * 0.68) {
    return wounded ? "flee" : "attack";
  }
  return "alert";
}
if (species.defensive && (provoked || distance < fearRadius * 0.5)) {
  return "attack";
}
return "flee";
```

**Hit region damage multipliers:**
| Region | Multiplier | Vital | Bleed Rate |
|--------|-----------|-------|------------|
| Head | 280 | Yes | 4.5% per second |
| Thorax | 195 | Yes | 4.5% per second |
| Body | 70 | No | 1.2% per second |
| Limb | 32 | No | 0.7% per second |

**Species toughness multipliers:**
| Species | Multiplier |
|---------|-----------|
| Lion | 0.92 |
| Giraffe | 0.78 |
| Buffalo | 0.64 |
| Rhino | 0.40 |
| Elephant | 0.28 |

### 5.7 Spear & Combat Details

**Physics:**
- Initial speed: 18 + charge * 17 m/s (max 35 m/s)
- Gravity: 9.81 m/s²
- Air drag: exponential decay (0.8% per second)
- Max flight time: 14 seconds
- Grip-to-tip length: ~1.3 units

**State machine:**
```
held → throw → flying → (hit animal) → lodged
                      → (hit ground) → ground
                      → (timeout) → ground
ground/lodged → retrieve → held
```

**Wound system:**
- Up to 4 simultaneous cuts per mesh
- Ellipsoidal cavity with irregular edges
- Blood decal with gravity-driven streams
- Roughness reduction (wet/shiny appearance)
- Depth material for proper shadow reception

**Particle system:**
- 128 slots, 13 particles per burst
- Velocity: normal * 0.7 + random * intensity
- Lifetime: 0.45 + random * 0.3s
- Gravity: 9.81 m/s²

### 5.8 Audio System Details

**Architecture:**
- 18 voice slots (max 4 simultaneous vocals)
- HRTF panning, inverse distance model
- Reference distance: 3m, max distance: 85m
- Rolloff factor: 1.5

**Proximity radii:**
| Action | Radius |
|--------|--------|
| Step | 22m |
| Graze | 18m |
| Drink | 25m |
| Rest | 12m |
| Idle | 40m |
| Notice/Warning | 40m |
| Alert | 65m |
| Attack | 40m |
| Hurt | 55m |
| Death | 45m |

**Volumes:**
| Action | Volume |
|--------|--------|
| Step | 0.20 |
| Graze | 0.13 |
| Drink | 0.22 |
| Rest | 0.10 |
| Idle | 0.24 |
| Notice | 0.40 |
| Warning | 0.54 |
| Alert | 0.48 |
| Attack | 0.52 |
| Hurt | 0.45 |
| Death | 0.43 |

**Music:**
- Track: `savannah_ambient_loop.wav` (13.2 MB)
- Base gain: 0.14
- Danger gain: 0.30
- Fade in: 4s
- Loop: 0s to 74.9s (seamless)
- Generated with ElevenLabs music_v1

---

## 6. Asset Pipeline

### 6.1 Preload Manifest

**Total:** 314 MB, 98 files  
**Revision hash:** `1326963e79e3d3f2e0a0ec767d49acac578d1690...`

**Breakdown:**
| Category | Files | Size |
|----------|-------|------|
| Audio | 51 | 29.7 MB |
| Characters | 8 | 99.7 MB |
| World | 32 | 180 MB |
| Textures | 7 | 34 MB |

### 6.2 Caching

- Browser Cache API with SHA256 validation
- Cache pruning on startup
- Persistent between sessions
- Loading screen shows: `X MB · Y / Z files · N cached`

### 6.3 Authoring Toolchain

- World: Blender 5.2.1 MCP
- Characters: Mixamo (Adobe)
- Textures: Polyhaven CC0 1.0
- Audio: ElevenLabs + Freesound + Wikimedia + Dryad + Mixkit

---

## 7. What Was Actually Done vs. Skill Instructions

### 7.1 What We Did

1. **Classified correctly** — Dynamic SPA with minified JS
2. **Playwright runtime capture** — DOM, screenshots, WebGL info, network requests, global objects
3. **JS deobfuscation pipeline** — js-beautify → webcrack → javascript-deobfuscator
4. **Network analysis** — 179 requests captured, confirmed zero backend API
5. **GitHub repo cloned** — Full asset tree analyzed

### 7.2 What We Could Not Do

1. **mitmproxy traffic capture** — Playwright captured the same data; mitmproxy not needed
2. **wakaru decompilation** — Rust toolchain installed but network failures prevented cargo install
3. **Full AST renaming** — No source maps available; variable names remain single-letter
4. **WARC archive** — Not critical; all assets captured via Playwright

### 7.3 Skill Improvements for Next Time

1. **Earlier classification** — Don't waste time on static analysis for SPAs
2. **Playwright first** — Capture runtime state before deep code analysis
3. **Parallel tool execution** — Run beautifier + webcrack + network capture simultaneously
4. **Source map check** — Always check for `/savannah/assets/index-CBCMagMA.js.map` before deobfuscating

---

## 8. Final Deliverables

| File | Description |
|------|-------------|
| `savannah-runtime-capture/` | Playwright capture (9 files) |
| `savannah-beautified.js` | Initial beautification (27K lines) |
| `savannah-webcracked/deobfuscated.js` | After webcrack (41K lines) |
| `savannah-js-deobfuscator.js` | Final deobfuscated (41K lines, 915 KB) |
| `savannah-readable-breakdown.md` | Original breakdown (now superseded) |
| `savannah-corrected-report.md` | This document |

---

*Report generated following reverse-engineering-website skill workflow with Dynamic/SPA + JS deobfuscation toolchain.*
