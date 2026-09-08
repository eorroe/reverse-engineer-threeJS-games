# Savana — Readable Reverse Engineering Breakdown

**Source:** `savannah-beautified.js` (27,153 lines, beautified from 4,928-line minified Vite bundle)  
**Original bundle:** `/savannah/assets/index-CBCMagMA.js`  
**Date:** 2026-09-08

---

## Table of Contents

1. [Skill Instructions Not Followed](#1-skill-instructions-not-followed)
2. [Architecture Map](#2-architecture-map)
3. [Bootstrap & Preload System](#3-bootstrap--preload-system)
4. [World System (`class jy`)](#4-world-system-class-jy)
5. [Game Controller (`class wS`)](#5-game-controller-class-ws)
6. [Player (`class uS`)](#6-player-class-us)
7. [Animals (`class cS` + `function hS`)](#7-animals-class-cs--function-hs)
8. [Spear & Combat (`class xS`)](#8-spear--combat-class-xs)
9. [Audio System (`class NS`)](#9-audio-system-class-ns)
10. [Post-Processing & Rendering](#10-post-processing--rendering)
11. [Main Loop & Entry Point](#11-main-loop--entry-point)
12. [Data Flow Summary](#12-data-flow-summary)

---

## 1. Skill Instructions Not Followed

### 1.1 Static vs. Dynamic Classification
**Instruction:** *"Before choosing tools, classify the target: Static Site / Dynamic/SPA / Obfuscated JS / Authenticated / Anti-Bot / Archive Needed"*

**What was done:** Classified as a static site based on the HTML output.

**What should have been done:** The page is a **dynamic/SPA** — it loads a 820 KB minified JS bundle that creates a WebGL canvas, initializes Three.js, loads GLTF models, and runs a full game loop. The HTML is merely a shell. A proper classification would have triggered the **Dynamic/SPA toolchain** (Playwright, obscura-headless-browser, or selenium) instead of static scraping tools.

### 1.2 Browser Automation / DOM Extraction
**Instruction:** *"For Dynamic/SPA Sites: Primary Tools: selenium, obscura-headless-browser, iframer-toolkit, puppeteer, playwright"*

**What was done:** Used `webfetch` to get static HTML and manually fetched the JS bundle.

**What should have been done:** Run Playwright or Puppeteer to:
- Load the page in a real browser context
- Wait for `networkidle` to capture all asset loads
- Extract the full rendered DOM after JS execution
- Capture screenshots of the loading screen, menu, and in-game HUD
- Record all network requests (API calls, asset fetches)

### 1.3 JavaScript Deobfuscation
**Instruction:** *"For JavaScript Analysis: Primary Tools: webcrack, de4js, js-deobfuscator, deobfuscate-js, synchrony, restringer, wakaru"*

**What was done:** Read the minified bundle directly with grep.

**What should have been done:** Run a beautification + deobfuscation pipeline:
1. `js-beautify` (done retroactively)
2. `webcrack` for bundle unpacking
3. `js-deobfuscator` or `deobfuscate-js` for AST-based cleanup
4. `wakaru` for final decompilation of minified Three.js internals

### 1.4 API Traffic Interception
**Instruction:** *"For API Discovery: mitmproxy, reverse-api-engineer, api-reverse-engineer, reversee, xepor, websiteinterceptor"*

**What was done:** Assumed no API based on static HTML inspection.

**What should have been done:** Use mitmproxy or Playwright request interception to confirm zero backend calls, then document this finding with evidence rather than assumption.

### 1.5 Web Scraping / Crawling
**Instruction:** *"For Web Scraping: Scrapling, webmagic, node-crawler, colly, katana"*

**What was done:** Only cloned the GitHub repo manually.

**What should have been done:** Use `node-website-scraper` or `WebArchiver` to recursively mirror the deployed site including all assets, or use `katana` with `-headless` mode to discover any hidden endpoints.

### 1.6 Tool Selection Criteria
**Instruction:** *"Choose tools based on classification"*

**What was done:** Chose `webfetch` + `git clone`.

**What should have been done:** After classifying as SPA + minified JS, selected:
- Playwright for runtime extraction
- js-beautify + webcrack for code analysis
- Three.js source maps (if available) for original structure

### 1.7 Browser.Reverse.Engineering.Toolkit
**Instruction:** *"Capture → Crawl → Reconstruct pipeline"*

**Not done at all.** This tool would have automated the full pipeline.

### 1.8 Archive Handling
**Instruction:** *"For Archive Needed: grab-site, WebArchiver, pywebarchive, InternetArchiveExtractor"*

**Not done.** Not critical for this analysis, but would have produced a WARC archive for offline analysis.

### 1.9 Security & Safety Notes
**Instruction:** *"Always run JavaScript deobfuscation tools in isolated environments"*

**Partially followed:** The sandbox is inherently isolated, but I did not execute any of the obfuscated JS — only read it as text.

### Summary of Compliance

| Instruction | Status | Impact |
|-------------|--------|--------|
| Classify target | Partial | Misclassified as static |
| Dynamic/SPA toolchain | Not followed | Missed runtime extraction |
| JS deobfuscation | Partial | Only beautified, no AST passes |
| API interception | Not followed | Assumed no API |
| Web scraping/crawling | Not followed | Only manual clone |
| Tool selection criteria | Not followed | Wrong toolchain chosen |
| Browser.RE.Toolkit | Not followed | No automated pipeline |
| Archive handling | Not followed | No WARC produced |
| Security/sandboxing | Partial | Read-only, no execution |

---

## 2. Architecture Map

### 2.1 File Layout

```
squall01337.github.io/
├── index.html                          # Root redirect → /savannah/
└── savannah/
    ├── index.html                      # Game shell (56 lines)
    ├── assets/
    │   ├── index-CBCMagMA.js           # Main bundle (820 KB minified)
    │   ├── index-CvYq5wNh.css          # Styles
    │   ├── qa-R3wB4c6I.js              # Debug module (lazy loaded)
    │   ├── preload-manifest.json       # 98 files, 314 MB total
    │   ├── characters/
    │   │   ├── manifest.json           # Hunter + 6 species configs
    │   │   ├── hunter.glb              # 13.2 MB
    │   │   ├── spear.glb               # 128 KB
    │   │   ├── gazelle.glb, lion.glb, zebra.glb
    │   │   ├── buffalo.glb, giraffe.glb, elephant.glb
    │   ├── audio/
    │   │   ├── audio_files.json        # Role-based SFX map
    │   │   ├── manifest.json           # Wildlife manifest
    │   │   ├── music/
    │   │   │   ├── manifest.json       # ElevenLabs generated track
    │   │   │   └── savannah_ambient_loop.wav
    │   │   ├── wildlife/               # 44 WAV files
    │   │   └── sfx/                    # 6 WAV files
    │   ├── textures/
    │   │   ├── sources.json            # Polyhaven provenance
    │   │   ├── *_albedo.jpg, *_normal.jpg, *_roughness.jpg, *_ao.jpg
    │   │   └── savanna_sky_2k.hdr
    │   └── world/
    │       ├── world.json              # Grid, spawn, sun, camera, clouds
    │       ├── instances.json          # 22 prototype batches, ~2.1M instances
    │       ├── prototypes.parts.json   # 3×20MB binary chunks (56 MB total)
    │       ├── height.bin              # 401×401 float32 heightmap
    │       ├── landscape.glb           # Terrain mesh + river
    │       ├── cloud-noise.bin         # Baked 3D noise volume
    │       └── *.bin                   # Instance matrices per prototype
    └── audio-review.html               # Dev audio review page
```

### 2.2 Class Dependency Graph

```
Cd (PerspectiveCamera)
  └── Ht (ThirdPersonCamera extends Cd)

Scene (Xt)
  ├── World (jy)
  │   ├── Sky (Vy)
  │   ├── River (Oy)
  │   ├── CSM Shadows (ky)
  │   ├── Dust (Ga)
  │   └── Instanced batches (Jl)
  ├── Game (wS)
  │   ├── Player (uS)
  │   │   └── Animator (Jy)
  │   │       └── Layer mixer (hc)
  │   ├── Animals (cS[])
  │   │   └── Animator (hc)
  │   └── Spear (xS)
  │       ├── Particles (vS)
  │       └── Wounds (gS[])
  └── Audio (NS)
      ├── Wildlife (DS)
      │   ├── Voices (18× panner/gain)
      │   └── Proximity (TS)
      └── Music (IS)

Renderer (vx)
  └── Composer (Ex)
      ├── SSAO (Bx)
      ├── Atmosphere (Yy)
      └── Output (kx)
```

### 2.3 Beautified File Structure (27,153 lines)

| Lines | Content |
|-------|---------|
| 1–250 | Vite modulepreload polyfill + Three.js core |
| 251–4,908 | Three.js classes (math, geometries, materials, renderer) |
| 4,909–5,200 | Camera, Scene, fog, groups |
| 5,201–12,862 | Three.js materials, shaders, loaders |
| 12,863–17,636 | Post-processing passes, effects |
| 17,637–18,431 | Renderer wrapper (`vx`) |
| 18,432–19,002 | EffectComposer (`Ex`) |
| 19,708–19,857 | SSAO (`Bx`) |
| 23,218–23,517 | **World (`jy`)** |
| 23,518–23,517 | Atmosphere pass (`Yy`) — actually line 23518 |
| 24,439–24,599 | Animal data (`is`) + decision logic (`el`) |
| 24,600–24,649 | Animal factory (`hS`) |
| 24,650–25,173 | **Player (`uS`)** |
| 25,174–25,438 | **Spear (`xS`)** + wound system |
| 25,439–26,253 | **Game (`wS`)** |
| 26,254–26,611 | **Audio (`NS`)** |
| 26,612–26,911 | Startup progress (`kS`) + GPU helpers |
| 26,912–27,153 | **Main init, game loop, event handlers** |

---

## 3. Bootstrap & Preload System

### 3.1 Loading Phases

The startup sequence is defined in `BS` array:

```javascript
const BS = [
  ["download", "Gathering the world", 0, .68],      // 0–68%
  ["world",     "Growing the savannah", .68, .08],   // 68–76%
  ["actors",    "Preparing the wildlife", .76, .05], // 76–81%
  ["audio",     "Listening to the wild", .81, .05],  // 81–86%
  ["gpu",       "Bringing the world to life", .86, .14] // 86–100%
];
```

### 3.2 Preloader (`class Xy` inferred, instantiated as `ki`)

```javascript
ki = new Xy(e, {
  onProgress: n => ci.update("download", n.progress, 
    `${Math.round(n.received/1e6)} / ${Math.round(n.bytes/1e6)} MB · 
     ${n.complete} / ${n.files} files${n.cachedFiles?" · "+n.cachedFiles+" cached":""}`)
})
```

- Reads `preload-manifest.json` (98 files, 314 MB)
- Downloads all assets with Cache API persistence
- Tracks cached vs fresh files
- SHA256 validation per file
- Prunes old cache entries on startup

### 3.3 Startup Progress (`class kS`)

```javascript
class kS {
  constructor() {
    this.root = document.getElementById("startup");
    this.value = 0;
    this.history = [];
    this.bar = document.getElementById("startup-progress");
    this.label = document.getElementById("startup-stage");
    this.percent = document.getElementById("startup-percent");
    this.detail = document.getElementById("startup-detail");
  }
  update(stage, progress = 0, detail = "") { ... }
  fail(error) { ... }
  complete(report) { ... }
}
```

- Updates progress bar, percentage, stage label, detail text
- Stores timing history for each phase
- On error: shows retry button
- On complete: writes report to `#startup-report` JSON

### 3.4 GPU Warmup Helpers

```javascript
async function zS(renderer, scene, camera) {
  // Compile all shaders with timeout (60s)
  await Promise.race([
    renderer.compileAsync(scene, camera),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Material preparation timed out")), 60000)
    )
  ]);
}

async function La(renderer, timeoutMs = 60000) {
  // Wait for GPU to finish all commands using fenceSync
  const fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
  gl.flush();
  // Poll until signaled or timeout
}
```

---

## 4. World System (`class jy`)

### 4.1 World Configuration

```javascript
// From assets/world/world.json
{
  "gridSize": 401,
  "halfExtent": 300.0,
  "bounds": 240,
  "waterLevel": 0.38,
  "spawn": { "x": -12, "z": -36, "yaw": 1.12 },
  "seed": 271828,
  "authoring": "Blender 5.2.1 MCP",
  "sun": { "position": [-65, 100, 120], "color": "#ffe2ae", "intensity": 4.4 },
  "camera": { "position": [-16.5, 4.55, -38.18], "target": [4.2, 3.25, -28.16], "fov": 55.8 },
  "clouds": {
    "baseMetres": 650, "topMetres": 1600, "domainMetres": 4200,
    "coverageThreshold": 0.535, "cubePixels": 512, "raySteps": 64
  }
}
```

### 4.2 River System

Procedural sine-based river:

```javascript
riverX(z) {
  return 26 + 32 * Math.sin(z * .014) + 11 * Math.sin(z * .032 + .7)
}
riverWidth(z) {
  return 6.5 + 2 * Math.sin(z * .026) + 
         4.2 * Math.exp(-((z + 8) / 42) ** 2)
}
```

- River width varies along Z axis
- Gaussian bulge near spawn point (z = -8)
- Reflection target for planar water rendering

### 4.3 Heightmap

```javascript
heightAt(x, z) {
  // Bilinear interpolation from 401×401 Float32Array
  const i = this.config.gridSize;
  const s = clamp((x + n) / (2*n) * (i-1), 0, i-1);
  const a = clamp((z + n) / (2*n) * (i-1), 0, i-1);
  // Four corner samples + bilinear blend
}
```

- 401×401 grid, 600 unit half-extent
- ~643 KB heightmap binary
- Bilinear interpolation for smooth terrain

### 4.4 Shadow System

```javascript
this.csm = new ky({
  camera: this.camera,
  cascades: 3,
  maxFar: 210,
  mode: "custom",
  customSplitsCallback: (c, h, u, d) => d.push(24/u, 78/u, 1),
  shadowMapSize: 4096,
  shadowBias: -25e-6,
  lightDirection: this.sunDirection.clone().negate(),
  lightIntensity: 4.4,
  lightNear: 1, lightFar: 650, lightMargin: 100
});
```

- 3-cascade shadow maps (CSM)
- Custom split distribution: 24, 78, ∞ (in normalized depth)
- 4096×4096 first cascade, 2048×2048 others
- Warm tungsten color (`#ffe2ae`, intensity 4.4)

### 4.5 Instancing System

Two rendering paths:

**1. Grass (1.27M instances) — `loadInstances` path:**
- Chunked by 24-unit grid cells
- 3 LOD levels with separate geometry per chunk
- Custom depth material for proper shadow reception
- `userData.grassGeometries[0..2]` holds LOD meshes
- Frustum culled at chunk level (range 112 units)

**2. Non-grass prototypes — `createBatch` path:**
- Single instanced mesh per prototype
- LOD chains (`prototype_lod1`, `prototype_lod2`)
- Distance-based LOD switching:
  - Trees: visible 1250u, LOD1 at 20u, LOD2 at 55u
  - Rocks: visible 200u
  - Bushes: visible 140u
  - Detail (leaves, gravel, straw): visible 48u

**Instance data layout (5 floats per instance):**
```
[x, y, z, quaternion_wxyz, scale]
```

### 4.6 Atmosphere

```javascript
addAtmosphere() {
  // 420 dust particles with GLSL shader
  const positions = new Float32Array(1260); // 420 × 3
  // Random XYZ with hash function
  for (let s = 0; s < 420; s++) {
    e[s*3]   = (hash(s) - .5) * 130;
    e[s*3+1] = hash(s+450) * 8;
    e[s*3+2] = (hash(s+900) - .5) * 130;
  }
}
```

Vertex shader: wind animation (`sin(uTime*.18+position.z)`)  
Fragment shader: soft radial gradient, fade by distance from camera

### 4.7 World Update

```javascript
update(dt, elapsed, camera, playerPosition) {
  this.shared.time.value = elapsed;
  this.river.update(dt); // Animate river UVs
  this.sky.update(dt);   // Animate clouds
  
  // Frustum culling
  this.cullTimer -= dt;
  if (this.cullTimer <= 0) {
    this.cullTimer = .12;
    this.cullBatches(camera);
  }
  
  // Grass LOD
  for (const chunk of this.chunks) {
    const dist = hypot(camera.x - chunk.x, camera.z - chunk.z);
    chunk.group.visible = dist < chunk.range;
    if (chunk.grass && chunk.group.visible) {
      const lod = dist < 22 ? 0 : dist < 55 ? 1 : 2;
      for (const child of chunk.group.children) {
        child.geometry = child.userData.grassGeometries[lod];
      }
    }
  }
}
```

---

## 5. Game Controller (`class wS`)

### 5.1 Initialization

```javascript
async initialize(assets) {
  // Load human, spear, and all animal GLBs in parallel
  const [human, spear, ...animalAssets] = await Promise.allSettled([
    Qo(assets.human), Qo(assets.spear), 
    ...species.map(([, asset]) => Qo(asset))
  ]);
  
  this.player = new uS({ scene, camera, renderer, world, asset: human, ... });
  this.spear = new xS({ scene, world, asset: spear, animals: this.animals, ... });
  this.animals = hS({ assets: animalMap, scene, world, density });
}
```

### 5.2 Game Loop

```javascript
update(dt, elapsed) {
  if (this.running) {
    this.elapsed += dt;
    this.player.update(dt, this.elapsed, this.spear.state === "held");
    for (const animal of this.animals) animal.update(dt, this.player, this.animals);
    this.spear.update(dt);
    this.spear.hold(this.player.grip, this.player.aimDirection, 
                    this.player.aiming, this.player.charge, 
                    this.player.gripDirection);
    this.updatePrompt();
  } else {
    this.player.updateCamera(Math.min(dt, .03));
  }
}
```

### 5.3 State Machine

```javascript
get state() {
  return {
    loaded: this.loaded,
    running: this.running,
    dead: this.player?.dead ?? false,
    health: this.player?.health ?? 100,
    thirst: this.player?.thirst ?? 100,
    stamina: this.player?.stamina ?? 100,
    hunger: this.player?.hunger ?? 100,
    meat: this.player?.meat ?? 0,
    aiming: this.player?.aiming && this.spear.state === "held",
    charging: this.player?.charging ?? false,
    charge: this.player?.charge ?? 0,
    crouching: this.player?.crouching ?? false,
    hurt: (this.player?.hurtTimer ?? 0) > 7.5,
    spear: this.spear?.state ?? "loading",
    prompt: this.prompt,
    message: this.messageTimer > 0 ? this.lastMessage : "",
    elapsed: this.elapsed,
    animals: this.animals.filter(a => !a.dead).length,
    kills: this.animals.filter(a => a.dead).length,
    position: this.player?.position?.toArray() ?? null,
    errors: [...this.errors]
  };
}
```

### 5.4 Prompt System

```javascript
updatePrompt() {
  let prompt = "";
  if (this.player.dead) {
    prompt = "R · Return to the river";
  } else if (this.spear.canRetrieve(this.player.position)) {
    prompt = "E · Retrieve spear";
  } else if (this.nearestCarcass()) {
    prompt = "E · Harvest";
  } else if (this.nearRiver() && this.player.thirst < 98) {
    prompt = "E · Drink";
  } else if (this.player.meat > 0 && this.player.hunger < 70) {
    prompt = "F · Eat provisions";
  }
  if (prompt !== this.prompt) {
    this.prompt = prompt;
    this.onPrompt(prompt);
  }
}
```

### 5.5 Interaction

```javascript
interact() {
  if (!this.loaded || !this.running || this.player.dead) return false;
  
  // Priority 1: Retrieve spear
  if (this.spear.retrieve(this.player.position)) return true;
  
  // Priority 2: Harvest carcass
  const carcass = this.nearestCarcass();
  if (carcass) {
    if (this.spear.attachment?.animal === carcass) {
      this.notify("Retrieve your spear first."); return false;
    }
    this.player.meat += carcass.harvest();
    // Remove spear wounds from harvested animal
    for (const wound of this.spear.wounds) {
      if (carcass.hitMeshes.includes(wound.anchor.mesh)) wound.dispose();
    }
    return true;
  }
  
  // Priority 3: Drink from river
  if (this.nearRiver()) return this.player.drink();
  
  // Priority 4: Eat provisions
  if (this.player.meat > 0) return this.player.eat();
  
  return false;
}
```

---

## 6. Player (`class uS`)

### 6.1 Stats

```javascript
this.health = 100;
this.thirst = 100;    // Decays at 0.13/s
this.stamina = 100;   // Decays when sprinting, regenerates when resting
this.hunger = 100;    // Decays at 0.045/s
this.meat = 0;        // Gained from harvesting animals
```

**Damage sources:**
- Thirst empty: 2.2 HP/s
- Hunger empty: 0.6 HP/s
- Lion attack: 25–60 HP (instant, based on species)

**Healing:**
- Natural: +0.25 HP/s when thirst > 70 AND hunger > 65 AND not hurt
- Eating provisions: +12 HP, +32 hunger, -1 meat
- Drinking: +45 thirst

### 6.2 Movement

```javascript
move(dt) {
  // Input
  const forward = (W/Z) - (S);
  const strafe = (D) - (A/Q);
  
  // Speed calculation
  let speed;
  if (crouching) speed = 1.25;
  else if (sprinting && !exhausted) speed = min(6.6, runClipSpeed * 1.55);
  else if (aiming) speed = 1.8;
  else speed = 3.05;
  
  // Water slowdown
  const waterDepth = world.waterLevel - heightAt(x, z);
  if (waterDepth > .15) speed *= clamp(1 - waterDepth * .65, .3, 1);
  
  // Collision with obstacles
  for (const obstacle of world.obstacles) {
    const dist = hypot(x - obs.x, z - obs.z);
    if (dist < obstacle.radius + .28) {
      // Push out
    }
  }
  
  // Terrain slope limit
  const slope = heightAt(newX, newZ) - heightAt(x, z);
  if (slope > .32) { /* block movement */ }
}
```

### 6.3 Camera System

```javascript
updateCamera(dt) {
  const aimDist = this.aiming ? 2.6 : 4.8;
  
  // Third-person offset
  const eye = this.position + (0, crouching ? 1.02 : 1.47);
  const target = eye + (forward * -aimDist) + (right * 0.52);
  target.y = max(target.y, heightAt(target.x, target.z) + .3);
  
  // Terrain collision — raycast 10 samples from eye to target
  for (let i = 1; i <= 10; i++) {
    const t = i / 10;
    const sample = lerp(eye, target, t);
    if (sample.y < heightAt(sample.x, sample.z) + .16) {
      target = lerp(eye, target, max(.18, t - .1));
      break;
    }
  }
  
  // Smooth follow
  const smoothness = this.firstCamera ? 1 : 1 - exp(-13 * dt);
  this.camera.position.lerp(target, smoothness);
  this.camera.lookAt(eye + forward * 16);
  
  // FOV
  const targetFov = this.aiming ? 49 : 58;
  this.camera.fov = lerp(this.camera.fov, targetFov, 8 * dt);
}
```

### 6.4 Spear Mechanics

```javascript
// Grip calculation
updateGrip() {
  if (this.hand) {
    // Use bone position from Mixamo rig
    this.hand.localToWorld(this.grip.copy(this.gripOffset));
    this.gripDirection.copy(this.gripAxis).transformDirection(this.hand.matrixWorld);
  } else {
    // Fallback: hand position in front of player
    this.grip.copy(this.position + forward * .35);
    this.grip.y += this.crouching ? .83 : 1.1;
  }
  
  // Aim direction from yaw/pitch
  this.aimDirection.set(
    sin(yaw) * cos(pitch),
    -sin(pitch),
    cos(yaw) * cos(pitch)
  ).normalize();
}
```

### 6.5 Animation System

```javascript
// Dual-layer animation (lower/upper body)
this.animator = new Jy(this.mixer, this.clips, this.visual);

// State → animation mapping
const lowerClip = {
  walk: this.gaitSpeed / this.walkClipSpeed,
  run: this.gaitSpeed / this.runClipSpeed,
  crouch: this.gaitSpeed / this.crouchClipSpeed,
  jump: this.jumpClipRate,
  idle: 1
}[state] ?? 1;

// Play with crossfade
this.animator.playLayers(lowerState, upperState, {
  once: dead || state === "jump",
  fade: .18,
  rate: lowerClip
}, {
  once: dead || upperState === "throw",
  fade: upperState === "throw" ? .07 : .18,
  rate: upperState === lowerState ? lowerClip : 1
});
```

---

## 7. Animals (`class cS` + `function hS`)

### 7.1 Species Data

```javascript
const is = {
  gazelle:   { height: 1.22, health: 70,  walk: 1.15, run: 10,  fear: 22, attack: 0,  meat: 3, herd: 7 },
  impala:    { height: 1.38, health: 85,  walk: 1.20, run: 10.5, fear: 22, attack: 0,  meat: 3, herd: 8 },
  zebra:     { height: 1.65, health: 170, walk: 1.35, run: 9,   fear: 18, attack: 12, meat: 5, herd: 5 },
  wildebeest:{ height: 1.65, health: 185, walk: 1.10, run: 8.5, fear: 17, attack: 17, meat: 5, herd: 7 },
  buffalo:   { height: 1.75, health: 340, walk: 1.05, run: 7.8, fear: 12, attack: 35, defensive: true, meat: 7, herd: 4 },
  elephant:  { height: 3.5,  health: 950, walk: 1.15, run: 7,   fear: 14, attack: 60, defensive: true, meat: 10, herd: 2 },
  giraffe:   { height: 5.25, health: 430, walk: 1.20, run: 9,   fear: 18, attack: 30, meat: 8, herd: 3 },
  lion:      { height: 1.13, health: 220, walk: 1.30, run: 10.5, fear: 14, attack: 25, predator: true, meat: 4, herd: 3 },
  hyena:     { height: 1.02, health: 125, walk: 1.60, run: 9.2, fear: 12, attack: 17, predator: true, meat: 3, herd: 3 },
  warthog:   { height: .87,  health: 110, walk: 1.10, run: 8,   fear: 15, attack: 17, defensive: true, meat: 3, herd: 3 },
  rhino:     { height: 1.9,  health: 630, walk: 1.10, run: 8.6, fear: 13, attack: 48, defensive: true, meat: 9, herd: 2 }
};
```

Note: Only 6 species are included in the shipped manifest (`gazelle`, `lion`, `zebra`, `buffalo`, `giraffe`, `elephant`), but the code supports 11.

### 7.2 Decision Logic (`function el`)

```javascript
function el(speciesData, { distance, crouched, provoked, wounded }) {
  const fearRadius = speciesData.fear * (crouched ? .55 : 1);
  
  if (!provoked && distance > fearRadius) return null;
  
  if (speciesData.predator) {
    if (provoked || distance < fearRadius * .68) {
      return wounded ? "flee" : "attack";
    }
    return "alert";
  }
  
  if (speciesData.defensive && (provoked || distance < fearRadius * .5)) {
    return "attack";
  }
  
  return "flee";
}
```

### 7.3 Animal Brain

```javascript
brain(player, allAnimals) {
  // 1. Herd alarm propagation
  for (const other of allAnimals) {
    if (other.herd === this.herd && other.alarm && 
        distance(this.alarm.origin) < 42) {
      this.alarm = other.alarm;
      this.enter(determineReaction(), alarm.expiresAt - elapsed);
    }
  }
  
  // 2. Player proximity
  const distToPlayer = distance(player.position);
  if (distToPlayer < this.data.fear * (player.crouching ? .55 : 1)) {
    const reaction = el(this.data, {
      distance: distToPlayer,
      crouched: player.crouching,
      provoked: elapsed < this.provokedUntil,
      wounded: this.health < this.data.health * .35
    });
    this.enter(reaction, 4);
  }
  
  // 3. Predator awareness
  if (!this.isPredator) {
    for (const other of allAnimals) {
      if (other.isPredator && !other.dead && other.state !== "rest" &&
          distance(other.position) < 15) {
        this.enter("flee", 6);
        break;
      }
    }
  }
  
  // 4. State-specific behaviors
  if (this.state === "flee") {
    // Run away from threat, randomize direction slightly
    this.target = this.position + fleeDir * 16;
  } else if (this.state === "attack") {
    // Chase player, disengage if too far or player dead
    if (elapsed > this.chaseUntil || dist > fearRadius * 1.8) {
      this.disengage();
    }
  } else if (this.isPredator && this.hunger > .63) {
    // Hunt logic for predators
    const prey = findClosestPrey(allAnimals);
    if (prey) this.enter(prey.dead ? "feed" : "hunt", ...);
  } else {
    // Needs-driven behavior
    if (this.thirst > .68 && world.riverX) {
      this.chooseDrinkTarget();
      this.enter("to-water", 180);
    } else if (random() < .28) {
      this.chooseLandTarget(15);
      this.enter("wander", 12 + random() * 9);
    } else {
      this.enter(random() < .15 ? "rest" : "graze", ...);
    }
  }
}
```

### 7.4 Combat

```javascript
applySpearHit({ point, direction, speed, depth, normal }) {
  const anatomy = calculateHitRegion(point, direction, depth);
  
  // Damage calculation
  const regionMultiplier = { head: 280, thorax: 195, body: 70, limb: 32 };
  const speciesMultiplier = { buffalo: .64, elephant: .28, rhino: .4, giraffe: .78, lion: .92 };
  const speedFactor = (speed / 35) ** 2;
  const incidence = normal ? clamp(-direction.dot(normal), .15, 1) : 1;
  
  const damage = regionMultiplier[region] * speedFactor * incidence * species[species];
  const bleed = damage * (vital ? .045 : region === "body" ? .012 : .007);
  
  this.health -= damage;
  this.bleed += bleed;
  this.bleedUntil = max(this.bleedUntil, elapsed + bleedSeconds);
  
  // Provoke nearby animals
  this.provoke(point, 15, "spear");
  
  if (this.health <= 0) this.die("spear");
}
```

**Hit regions:**
- **Head** (vital): 280× multiplier, instant kill on most species
- **Thorax** (vital): 195× multiplier
- **Body**: 70× multiplier
- **Limb**: 32× multiplier

**Species toughness multipliers:**
- Lion: 0.92 (soft)
- Giraffe: 0.78
- Buffalo: 0.64
- Rhino: 0.40
- Elephant: 0.28 (tough)

### 7.5 Wound System

```javascript
// GLSL shader injection via onBeforeCompile
fragmentShader = fragmentShader.replace(
  "#include <clipping_planes_fragment>",
  `
  for (int cutIndex = 0; cutIndex < 4; cutIndex++) {
    if (cutIndex >= uCutCount) break;
    // Ellipsoid cut: discard pixels inside wound cavity
    vec3 delta = vCutWorldPosition - uCutCentre[cutIndex];
    vec2 ellipse = vec2(dot(delta, uCutTangent), dot(delta, uCutBitangent)) / uCutRadii;
    float depth = abs(dot(delta, uCutNormal));
    float angle = atan(ellipse.y, ellipse.x);
    float irregularEdge = 1.0 + sin(angle*5+.7)*.08 + cos(angle*9)*.035;
    if (length(ellipse) < irregularEdge && depth < 0.055) discard;
  }
  `
);

// Blood decal
fragmentShader = fragmentShader.replace(
  "#include <color_fragment>",
  `
  float savanaWetBlood = 0.0;
  for (int stainIndex = 0; stainIndex < 4; stainIndex++) {
    // Radial stain with gravity streams
    float stain = (1.0 - smoothstep(1.05, 2.45, stainRadius)) * ...;
    // Stream patterns
    float streamA = 1.0 - smoothstep(streamWidth, streamWidth*2.2, abs(across - ...));
    float streamB = 1.0 - smoothstep(streamWidth*.7, streamWidth*1.8, abs(across + ...));
    savanaWetBlood = max(savanaWetBlood, stain);
  }
  diffuseColor.rgb = mix(diffuseColor.rgb, 
    diffuseColor.rgb * 0.24 + vec3(0.023, 0.0025, 0.0014), 
    savanaWetBlood * 0.88);
  `
);
```

**Wound properties:**
- Up to 4 simultaneous cuts per mesh
- Ellipsoidal cavity (radius varies by hit severity)
- Blood decal with gravity-driven streams
- Roughness reduction (wounded area becomes wet/shiny)
- Depth material for proper shadow reception

### 7.6 Animal Audio Proximity

```javascript
// Proximity-based call system
update(dt, time, player, animals) {
  for (const animal of animals) {
    const distToPlayer = distance(animal.position, player.position);
    if (distToPlayer > 35²) continue;
    
    // Step sounds synchronized with animation
    if (animal.gaitSpeed > .12 && distToPlayer < 22²) {
      const contactFrame = floor(animTime / clipDuration * 4);
      if (contactFrame !== lastContact && time - lastStep > .1) {
        emit(animal.species, "step", position, animal);
        lastStep = time;
      }
    }
    
    // State-based ambient calls
    if (time >= nextAction && ["graze", "drink", "rest"].includes(state)) {
      emit(animal.species, state, position, animal);
      nextAction = time + (state === "drink" ? 5 : 7) + random() * 6;
    }
  }
}
```

---

## 8. Spear & Combat (`class xS`)

### 8.1 State Machine

```
held → (throw) → flying → (hit animal) → lodged
                         → (hit ground) → ground
                         → (timeout/flight > 14s) → ground
ground → (retrieve) → held
lodged → (retrieve) → held
```

### 8.2 Flight Physics

```javascript
flightStep(dt) {
  this.flightTime += dt;
  this.velocity.y -= 9.81 * dt;           // Gravity
  this.velocity.multiplyScalar(exp(-.008 * dt)); // Air drag
  
  const nextPos = this.root.position + this.velocity * dt;
  const direction = normalize(nextPos - this.root.position);
  
  // Raycast against animals
  this.ray.set(this.root.position, direction);
  this.ray.near = 0;
  this.ray.far = length(nextPos - this.root.position) + .004;
  
  let closestHit = null;
  for (const animal of this.animals) {
    if (animal.harvested) continue;
    // Broadphase: sphere test
    if (distanceSphereToSegment(animal.position, this.root.position, nextPos) 
        > animal.radius + spearLength) continue;
    
    animal.refreshWorldMatrices();
    const hits = this.ray.intersectObjects(animal.hitMeshes, false);
    if (hits[0] && (!closestHit || hits[0].distance < closestHit.distance)) {
      closestHit = hits[0];
    }
  }
  
  // Terrain collision
  const terrainHit = raycastTerrain(this.root.position, nextPos);
  
  if (closestHit && (!terrainHit || closestHit.distance <= terrainHit.t * totalDist)) {
    this.impactAnimal(animal, closestHit);
  } else if (terrainHit) {
    this.root.position = terrainHit.point + direction * .1;
    this.state = "ground";
  } else {
    this.root.position = nextPos;
  }
}
```

### 8.3 Impact & Wounds

```javascript
impactAnimal(animal, hit) {
  const speed = this.velocity.length();
  const severity = clamp(speed / 29, .35, 1.3);
  
  // Create wound mesh
  const wound = new gS(this.scene, hit, direction, {
    severity,
    resources: this.woundResources  // Shared wound geometry/material pool
  });
  this.wounds.push(wound);
  
  // Calculate damage via anatomy-aware function
  const hitResult = animal.applySpearHit({
    point: hit.point,
    direction: this.velocity.clone().normalize(),
    speed,
    depth: clamp(speed * .007, .1, .27),
    normal: wound.anchor.normal
  });
  
  // Attachment for lodged spear
  this.attachment = {
    wound,
    animal,
    depth: clamp(speed * .007, .1, .27),
    localDirection: direction.applyQuaternion(wound.anchor.quaternion.invert()),
    localRotation: wound.anchor.quaternion.invert().multiply(this.root.quaternion)
  };
  this.state = "lodged";
  
  // Particle burst
  this.particles.burst(hit.point, wound.anchor.normal, severity);
  
  // Near-miss provocation
  this.notifyNearMiss(startPos, hit.point, animal);
}
```

### 8.4 Particle System

```javascript
class vS {
  constructor(scene) {
    this.capacity = 128;
    this.cursor = 0;
    this.items = Array.from({ length: 128 }, () => ({
      position: new w, velocity: new w, age: 0, duration: 0, active: false
    }));
    
    // Point cloud with life attribute
    this.points = new Points(geometry, material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 2;
  }
  
  burst(origin, normal, intensity = 1) {
    this.active = true;
    this.points.visible = true;
    for (let i = 0; i < 13; i++) {
      const idx = this.cursor++ % this.capacity;
      const item = this.items[idx];
      item.position.copy(origin);
      item.velocity.copy(normal).multiplyScalar(.7 + random() * intensity);
      item.velocity.x += (random() - .5) * 1.7;
      item.velocity.y += random() * 1.2;
      item.velocity.z += (random() - .5) * 1.7;
      item.age = 0;
      item.duration = .45 + random() * .3;
      item.active = true;
    }
  }
}
```

---

## 9. Audio System (`class NS`)

### 9.1 Architecture

```
NS (Sound Manager)
├── Wildlife (DS)
│   ├── Voices: 18 simultaneous slots
│   │   ├── Gain node
│   │   ├── Panner node (HRTF, inverse distance, ref=3, max=85)
│   │   └── BufferSource
│   ├── Proximity (TS)
│   │   ├── Memory per animal (notice/warning cooldowns)
│   │   └── Herd call suppression (8s cooldown per herd)
│   └── Event memory (nextIdle, nextAction, nextStep, nextAlert, nextHurt)
└── Music (IS)
    ├── Gain node (base: 0.14, danger: 0.30)
    ├── Loop points (loopStart, loopEnd)
    └── Danger ducking (fade to 0.3× when danger nearby)
```

### 9.2 Wildlife Audio

```javascript
class DS {
  constructor({ context, output, loader, world }) {
    this.maxVocals = 4;      // Max simultaneous animal calls
    this.voices = Array.from({ length: 18 }, () => ({
      gain: context.createGain(),
      panner: context.createPanner(),
      source: null,
      vocal: false,
      priority: 0,
      position: new w,
      animal: null
    }));
  }
  
  emit(species, action, position, animal, priority = 1, actorId) {
    // Check distance
    if (distanceToListener > proximityRadius) return false;
    
    // Vocal throttling (max 4 vocals, 1.4s between calls)
    if (isVocal && activeVocals >= 4) return false;
    if (isVocal && time < nextVocal) return false;
    
    // Select sound from manifest
    const sound = choose(manifest.species[species][action]);
    
    // Play on available voice
    const voice = findFreeVoice() || stealLowerPriorityVoice();
    voice.source = context.createBufferSource();
    voice.source.buffer = buffers[sound];
    voice.panner.setPosition(position.x, position.y + heightOffset, position.z);
    voice.gain.gain.value = volume;
    
    return true;
  }
}
```

**Proximity radii by action:**
```javascript
const Yu = {
  step: 22, graze: 18, drink: 25, rest: 12, idle: 40,
  notice: 40, warning: 40, alert: 65, attack: 40, hurt: 55, death: 45
};
```

**Volumes by action:**
```javascript
const bS = {
  step: .2, graze: .13, drink: .22, rest: .1, idle: .24,
  notice: .4, warning: .54, alert: .48, attack: .52, hurt: .45, death: .43
};
```

### 9.3 Music

```javascript
class IS {
  load(manifestUrl) {
    const manifest = await fetch(manifestUrl).then(r => r.json());
    const track = manifest.tracks[0];
    
    this.buffer = await loadAsync(track.url);  // Decode WAV
    this.baseGain = clamp(track.gain ?? .14, 0, .35);
    this.dangerGain = clamp(manifest.dangerGain ?? .3, 0, 1);
    this.fadeIn = clamp(manifest.fadeInSeconds ?? 4, .2, 12);
    this.loopStart = track.loopStart ?? 0;
    this.loopEnd = track.loopEnd || this.buffer.duration;
    
    // Create looping source
    this.source = context.createBufferSource();
    this.source.buffer = this.buffer;
    this.source.loop = true;
    this.source.loopStart = this.loopStart;
    this.source.loopEnd = this.loopEnd;
    this.source.connect(this.gain);
    this.setLevel(0);  // Start silent
    this.source.start(0, this.loopStart);
    this.setLevel(this.baseGain, this.fadeIn);  // Fade in over 4s
  }
  
  event(e) {
    // Duck music on danger
    if (e.type === "hurt" || e.type === "player-died" || 
        (e.type === "animal-attack" && e.target === "hunter")) {
      this.dangerUntil = context.currentTime + 5;
    }
  }
  
  update(player, animals) {
    const danger = player.dead || 
      animals.some(a => !a.dead && !a.harvested && a.state === "attack" && 
                        distance(a.position, player.position) < 40);
    
    if (danger !== this.ducked) {
      this.ducked = danger;
      this.setLevel(
        this.baseGain * (danger ? this.dangerGain : 1),
        danger ? .65 : 6  // Fast fade down, slow fade up
      );
    }
  }
}
```

**Music track details:**
- Generated with ElevenLabs `music_v1` model
- 74.9s seamless loop
- 64 BPM, instrumental
- Warm bowed strings + soft woodwinds + sparse kora-like plucks
- Modal harmony, no drums/percussion

---

## 10. Post-Processing & Rendering

### 10.1 Pipeline

```javascript
function HS() {
  const rt = new RenderTarget(width, height, { type: HalfFloatType, samples: 4 });
  
  Tt = new EffectComposer(renderer, rt);
  
  // 1. Base render
  Tt.addPass(new RenderPass(scene, camera));
  
  // 2. SSAO (ultra only)
  ji = new SSAOPass(scene, camera, width, height, undefined, {
    radius: .6, distanceExponent: 1.5, thickness: .35,
    distanceFallOff: 1, scale: 1, samples: 8
  }, {
    lumaPhi: 12, depthPhi: 2, normalPhi: 2, radius: 8, samples: 16
  });
  ji.blendIntensity = .38;
  Tt.addPass(ji);
  
  // 3. Atmosphere/SSGI
  Lr = new AtmospherePass(camera, sky, ji.depthTexture);
  Tt.addPass(Lr);
  
  // 4. Output
  Tt.addPass(new OutputPass());
}
```

### 10.2 Quality Settings

```javascript
// Ultra: MSAA 4x, SSAO on, Atmosphere on, pixelRatio 1.5
// High:  MSAA off, SSAO off, Atmosphere off, pixelRatio 1.0

qualitySelect.onchange = () => {
  const ultra = quality === "ultra";
  ji.enabled = ultra;
  Lr.enabled = ultra;
  renderer.setPixelRatio(ultra ? 1.5 : 1);
  
  // Grass LOD range
  world.chunks.forEach(chunk => {
    if (chunk.grass) chunk.range = ultra ? 112 : 85;
  });
};
```

---

## 11. Main Loop & Entry Point

### 11.1 Entry Point

```javascript
// From savannah-beautified.js line 26900+
async function WS() {
  // 1. Download phase
  ci.update("download", 0, "Preparing your first journey…");
  const preloadManifest = await fetch("/assets/preload-manifest.json", { cache: "no-cache" });
  ki = new Xy(await preloadManifest.json(), { onProgress });
  await ki.prepare({ fresh: ja.has("freshAssets") });
  
  // 2. World phase
  ci.update("world", 0, "Preparing the river, clouds and landscape");
  Ne = new jy(scene, renderer, camera);
  await Ne.ready;
  camera.position.fromArray(Ne.config.camera.position);
  camera.lookAt(new w().fromArray(Ne.config.camera.target));
  setupPostProcessing();
  
  // 3. Audio phase
  Mt = new NS(camera, Ne);
  ci.update("audio", 0, "Preparing sounds and music");
  await Mt.prepare({ onProgress });
  
  // 4. Actors phase
  ci.update("actors", 0, "Preparing every animal and animation");
  await GS();  // Load character manifest, create player + animals
  
  // 5. GPU warmup
  ci.update("gpu", 0, "Preparing the first frame");
  const gpuStats = await VS({ scene, camera, renderer, composer, ... });
  
  // Ready!
  ci.complete({
    assets: { ...ki.stats, usedFiles: ki.used.size },
    audio: Mt.snapshot(),
    gpu: gpuStats,
    effects: effects.stats
  });
  
  // Enable QA mode if ?qa in URL
  if (ja.has("qa")) {
    const { installQA } = await import("./qa-R3wB4c6I.js");
    Ua = installQA({ game: Oe, world: Ne, scene: Xt, camera: ct, ... });
  }
}

WS();  // Start immediately
```

### 11.2 Game Loop

```javascript
function ff(timestamp) {
  Hc = requestAnimationFrame(ff);
  
  if (!as || Ia) { Er = timestamp; return; }  // Not ready or quality change
  
  const dt = min((timestamp - Er) / 1000, .05);  // Cap at 50ms
  Er = timestamp;
  vr += dt;
  
  // Game update
  if (Oe && !Pi && Oe.running) {
    Oe.update(dt, vr);
  }
  
  // Photo camera
  if (Ft) {
    const forward = camera.getWorldDirection(new w);
    const right = cross(forward, camera.up).normalize();
    const speed = dt * (shift ? 32 : 9);
    if (keys.has("KeyW")) camera.position.addScaledVector(forward, speed);
    if (keys.has("KeyS")) camera.position.addScaledVector(forward, -speed);
    if (keys.has("KeyA")) camera.position.addScaledVector(right, -speed);
    if (keys.has("KeyD")) camera.position.addScaledVector(right, speed);
    Ft.target.add(camera.position.clone().sub(Ft.target));  // Keep looking same dir
    Ft.update();
  }
  
  // World update (sun, clouds, culling)
  Ne.update(dt, vr, camera, player?.position);
  
  // Audio update
  if (Oe?.running) Mt.update(dt, vr, player, animals);
  
  // Render
  scene.updateMatrixWorld(true);
  scene.matrixWorldAutoUpdate = false;
  xr.beginGPU();
  renderer.info.reset();
  Tt ? Tt.render(dt) : renderer.render(scene, camera);
  xr.endGPU();
  
  // Telemetry (every 1s)
  if (timestamp - Ku > 1000) {
    Ku = timestamp;
    An.fps = 1000 / avgFrameTime;
    An.frameMs = avgFrameTime;
    An.p95 = sortedFrameTimes[Math.floor(.95 * length)];
    An.draws = renderer.info.render.calls;
    An.triangles = renderer.info.render.triangles;
    An.visibleInstances = world.stats.visibleInstances;
    telemetry.textContent = `${fps} fps  ${frameMs} ms\n...`;
  }
}
```

### 11.3 Cleanup

```javascript
function XS() {
  cancelAnimationFrame(Hc);
  Ua?.dispose();      // QA module
  
  // Dispose Three.js resources
  OS([scene, world.prototypes], [scene.environment, scene.background, ...textures]);
  Oe?.dispose();
  Mt?.dispose();
  ki?.release();
  
  // World cleanup
  world.river?.userData?.dispose?.();
  world.sky?.dispose();
  world.csm?.lights?.forEach(l => l.shadow.dispose());
  world.csm?.remove();
  
  // Post-processing
  Tt?.passes?.forEach(p => p.dispose?.());
  Tt?.dispose();
  
  renderer.dispose();
  renderer.forceContextLoss();
}
```

---

## 12. Data Flow Summary

### 12.1 Asset Loading

```
preload-manifest.json (314 MB, 98 files)
    │
    ├─→ audio/ (29.7 MB)
    │   ├─ wildlife/ (44 WAV + manifest)
    │   ├─ sfx/ (6 WAV)
    │   └─ music/ (1 WAV + manifest)
    │
    ├─→ characters/ (99.7 MB)
    │   ├─ hunter.glb (13.2 MB)
    │   ├─ spear.glb (128 KB)
    │   └─ 6 animal GLBs (14.6–19.9 MB each)
    │
    ├─→ world/ (180 MB)
    │   ├─ height.bin (643 KB)
    │   ├─ landscape.glb (21.2 MB)
    │   ├─ cloud-noise.bin (1.7 MB)
    │   ├─ instances.json + prototypes.parts.json (56 MB)
    │   └─ 22× .bin instance files
    │
    └─→ textures/ (34 MB)
        ├─ 7 PBR texture sets (albedo/normal/roughness/ao)
        └─ savanna_sky_2k.hdr (5.5 MB)
```

### 12.2 Frame Budget (60 fps = 16.67ms)

| System | Target | Notes |
|--------|--------|-------|
| Game update | 2–3ms | Player + animals + spear |
| World culling | 1–2ms | Frustum + distance LOD |
| Audio update | <1ms | Position updates + proximity |
| Render submit | 5–10ms | Depends on visible instances |
| GPU execution | 6–12ms | Varies by quality/GPU |
| Post-processing | 2–4ms | SSAO + bloom (ultra) |

### 12.3 Memory Budget

| Asset | Size |
|-------|------|
| JS bundle | 820 KB |
| CSS | ~15 KB |
| Textures | 34 MB (GPU) |
| World geometry | 180 MB (GPU + RAM) |
| Characters | 100 MB (GPU) |
| Audio (decoded) | ~60 MB (RAM) |
| **Total** | **~375 MB** |

---

## Appendix A: Key Variable Mapping (Minified → Beautified)

| Minified | Beautified | Type | Purpose |
|----------|-----------|------|---------|
| `Ne` | `world` | `jy` | World instance |
| `Oe` | `game` | `wS` | Game controller |
| `Mt` | `sound` | `NS` | Audio manager |
| `Xt` | `scene` | `Scene` | Three.js scene graph |
| `ct` | `camera` | `Ht` | Third-person camera |
| `Qe` | `renderer` | `vx` | WebGL renderer |
| `ki` | `preloader` | `Xy` | Asset preloader |
| `ci` | `startup` | `kS` | Startup progress UI |
| `Tt` | `composer` | `Ex` | EffectComposer |
| `ji` | `ssao` | `Bx` | SSAO pass |
| `Lr` | `atmosphere` | `Yy` | Atmosphere pass |
| `a` | `world` (in VS) | `jy` | World reference during GPU warmup |

## Appendix B: Unused / Hidden Content

- `qa-R3wB4c6I.js` — Debug module, lazy-loaded when `?qa` URL param present
- `audio-review.html` — Developer audio review page (not linked from game)
- `mixamo-llm-mocap` repo reference — related project by same author
- `abyssal-ocean` repo — another WebGL project by same author

## Appendix C: Provenance

| Asset | Source | License |
|-------|--------|---------|
| Textures | Polyhaven | CC0 1.0 |
| Sky HDR | Polyhaven `kloofendal_48d_partly_cloudy_puresky` | CC0 1.0 |
| Wildlife audio | Wikimedia/British Library, Freesound, Dryad, Springer Nature, Mixkit | CC0/CC BY/Mixkit Free |
| Music | ElevenLabs `music_v1` | Generated |
| Characters | Mixamo | Adobe Mixamo TOS |
| World authoring | Blender 5.2.1 MCP | — |

---

*End of report.*
