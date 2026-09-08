# Reverse Engineering Report: Savana

**URL:** https://squall01337.github.io/savannah/  
**Repo:** https://github.com/squall01337/squall01337.github.io  
**Date:** 2026-09-08

---

## 1. Executive Summary

Savana is a third-person savannah survival browser game built entirely with client-side WebGL. It uses Three.js for 3D rendering, Vite for bundling, and features instanced vegetation, GLTF character models, procedural audio, and a survival mechanic with hunger/thirst/health. The deployed repository contains only built assets; the original TypeScript/JS source is not public.

---

## 2. Technology Stack

| Layer | Technology | Evidence |
|-------|-----------|----------|
| 3D Engine | Three.js r180 (WebGL 2) | `@license Copyright 2010-2025 Three.js Authors`, `THREE.` namespace, shader chunks |
| Bundler | Vite | `vite:preloadError` events, chunk naming `index-CBCMagMA.js`, modulepreload link tags |
| Build Target | Browser ESM | `<script type="module">`, dynamic `import()` in QA module |
| Asset Format | glTF Binary (.glb) | `model/gltf-binary` MIME types in preload manifest |
| Audio | Web Audio API | WAV files, positional SFX, music loops |
| Caching | Service Worker / Cache API | `cachedFiles` stats, persistent asset cache mentioned in loading screen |
| Post-processing | Custom composer | SSAO, bloom, CSM shadows, depth textures |

---

## 3. Architecture Overview

### 3.1 Entry Point

```
index.html (root)
  → redirects to /savannah/
    → savannah/index.html
      → loads /savannah/assets/index-CBCMagMA.js (Vite bundle)
      → loads /savannah/assets/index-CvYq5wNh.css
```

### 3.2 Bundle Structure (index-CBCMagMA.js)

The 4928-line minified bundle contains:

1. **Three.js core** (~lines 1-500): Scene graph, geometries, materials, math, WebGL renderer, shader chunks
2. **Post-processing pipeline**: EffectComposer with SSAO, bloom, CSM shadows
3. **World system** (`Ne = new jy(...)`): Terrain, instanced vegetation, clouds, river
4. **Game state** (`Oe = new wS(...)`): Player, animals, survival stats, spear physics
5. **Audio system** (`Mt = new NS(...)`): Web Audio positional sound, music mixer
6. **Startup/preload** (`ki`): Asset cache, progressive loading with progress bar
7. **Input handling**: Keyboard + mouse with third-person camera
8. **QA module** (`qa-R3wB4c6I.js`): Debug tools, GPU profiler, camera controls

### 3.3 Loading Sequence

```
1. Module preload (modulepreload links)
2. Startup screen shows "Gathering the world"
3. Load world.json → terrain heightmap, prototypes
4. Load instances.json → instanced mesh placements
5. Prepare river, clouds, landscape
6. Initialize WebGL renderer with post-processing
7. Load character manifest → hunter + animal GLBs
8. Prepare audio (decode WAVs)
9. GPU warmup (shadow maps, foliage render)
10. Enable "Enter the savannah" button
```

---

## 4. Game Systems

### 4.1 Player

| Property | Value |
|----------|-------|
| Model | `hunter.glb` (13.2 MB) |
| Height | 1.8 units |
| Walk Speed | 1.30 m/s |
| Run Speed | 3.37 m/s |
| Crouch Speed | 1.09 m/s |
| Throw Duration | 1.3 s |
| Throw Release | 0.467 s |
| Grip Offset | [-0.0014, 0.1003, -0.0346] |
| Grip Axis | [-1, 0, 0] |

**Controls:**
- WASD / ZQSD: Move
- Mouse: Look
- Shift: Sprint
- C: Crouch
- Space: Jump
- Right mouse: Aim
- Hold left mouse: Charge spear, release to throw
- E: Retrieve / drink / harvest
- F: Eat
- Esc: Pause
- P: Photo view
- F3: Performance telemetry

### 4.2 Animals

| Species | Count | Height | Walk Speed | Run Speed | Model Size |
|---------|-------|--------|-----------|-----------|------------|
| Gazelle | 20 | 1.65 | 0.387 | 7.525 | 14.6 MB |
| Lion | 5 | 1.27 | 0.298 | 6.822 | 17.0 MB |
| Zebra | 12 | 1.72 | 0.404 | 6.740 | 18.3 MB |
| Buffalo | 8 | 1.55 | 0.364 | 4.575 | 16.4 MB |
| Giraffe | 5 | 4.80 | 1.129 | 5.513 | 19.9 MB |
| Elephant | 4 | 3.25 | 0.684 | 3.347 | 18.8 MB |

**Audio behavior per species:**

| State | Gazelle | Lion | Zebra | Buffalo | Giraffe | Elephant |
|-------|---------|------|-------|---------|---------|----------|
| idle | impala snort | field roar | contact call | bovine huff | grunt | rumble |
| alert | impala snort | grunt | bray | bovine huff | snort | roar |
| notice | impala snort | grunt | contact call | bovine huff | grunt | rumble |
| warning | impala snort | grunt | bray | bovine huff | snort | roar |
| attack | impala snort | attack sound | bray | bovine huff | snort | roar |
| hurt | impala snort | hurt growl | bray | bovine huff | bursts | roar |
| death | impala snort | hurt growl | bray | bovine huff | bursts | roar |
| graze | grazing sound | feeding sound | grazing sound | grazing sound | grazing sound | grazing sound |
| drink | herbivore drink | lion drink | herbivore drink | herbivore drink | herbivore drink | elephant drink |
| step | hoof steps | paw steps | hoof steps | hoof steps | hoof steps | elephant steps |

### 4.3 Survival Mechanics

From the UI rendering in `df()`:
- **Health**: Decreases when hurt (lion attack, presumably)
- **Thirst**: Decreases over time; prompt "You need water." shown when < 20
- **Hunger**: Decreases over time
- **Provisions (Meat)**: Gained by harvesting animals; used to restore hunger

**Respawn**: Player respawns at river when dead.

### 4.4 Combat

- Player carries a spear (2.15 units long, Y-axis)
- Aim with right mouse, charge with left mouse hold, release to throw
- Spear has wound tracking (`Oe.spear.wounds`)
- Animals can be hit and wounded
- Lions attack player (lion_attack sound, hurt state)

---

## 5. World & Rendering

### 5.1 World Configuration

```json
{
  "gridSize": 401,
  "halfExtent": 300.0,
  "bounds": 240,
  "waterLevel": 0.38,
  "spawn": { "x": -12, "z": -36, "yaw": 1.12 },
  "seed": 271828,
  "authoring": "Blender 5.2.1 MCP",
  "sun": { "position": [-65, 100, 120], "color": "#ffe2ae", "intensity": 4.4 },
  "camera": { "position": [...], "target": [...], "fov": 55.8 },
  "clouds": {
    "baseMetres": 650, "topMetres": 1600, "domainMetres": 4200,
    "coverageThreshold": 0.535, "cubePixels": 512, "raySteps": 64
  }
}
```

### 5.2 Instanced Vegetation

The world uses instanced rendering for performance:

| Prototype | Count | Type |
|-----------|-------|------|
| Grass_Tussock | 1,273,753 | Grass (special shader) |
| Fine_fallen_leaves | 55,660 | Detail |
| Fine_fallen_straw | 23,332 | Detail |
| Fine_gravel | 31,144 | Detail |
| Acacia (3 variants + sapling) | 520 each | Trees |
| Baobab | 14 | Trees |
| Rock (4 variants) | 680 each | Rocks |
| Thorn bush (2 variants) | 580 each | Bushes |
| River reeds | 1,597 | Vegetation |
| River fern | 435 | Vegetation |
| Wildflowers | 2,800 | Vegetation |
| Fallen logs | 150 | Debris |
| Exposed roots | 240 | Debris |
| Termite mounds | 24 | Landmark |
| Grass dry/green | 2,000 + 1,698 | Grass |

**Total prototypes:** ~2.1M instances

### 5.3 Textures

From Polyhaven (CC0 1.0):
- Rocky terrain (soil_albedo/normal/roughness/ao)
- Aerial rocks 04 (rock_*)
- Brown mud 03 (mud_*)
- Bark brown 02 (bark_*)
- Lichen rock (lichen_*)
- Dry mud field 001 (cracked_mud_*)
- Kloofendal 48d partly cloudy (HDR sky)

### 5.4 Rendering Features

- **Shadows**: Cascaded shadow maps (CSM)
- **SSAO**: Scalable Ambient Occlusion (ultra quality only)
- **Bloom**: Lens bloom effect
- **Grass**: Custom vertex shader with wind animation, LOD (3 levels)
- **Water**: Planar reflection with river target
- **Clouds**: Volumetric raymarching (64 ray steps, 512px cube map)
- **HDR**: Tone mapping with ACES Filmic-like curve
- **Anti-aliasing**: MSAA (4x in ultra, disabled in high)

---

## 6. Audio System

### 6.1 Architecture

- Web Audio API with positional (panner) nodes for SFX
- Ambient loops: river_stream, savanna_day
- Music: Generated instrumental loop via ElevenLabs (74.9s, 64 BPM, modal harmony)
- 44.1 kHz / 16-bit WAV format
- Sounds fade based on danger proximity

### 6.2 Audio Manifest

Total preload size: ~29.7 MB of audio  
Wildlife sounds: ~51 files  
SFX: 6 files  
Music: 1 file (13.2 MB)

---

## 7. Asset Pipeline

### 7.1 Preload Manifest

Total bundle: **314 MB** (including all assets)  
Files tracked: 98  
Each file has SHA256 hash for cache validation.

### 7.2 Caching

- Assets cached in browser Cache API
- Manifest revision hash: `1326963e79e3d3f2e0a0ec767d49acac578d1690...`
- Loading screen shows cached vs fresh asset counts
- Cache pruning on startup

### 7.3 Authoring Toolchain

- World built in **Blender 5.2.1 MCP** (Blender with Model Context Protocol)
- Characters: Mixamo-rigged GLB files
- Textures: Polyhaven CC0 PBR textures
- Audio: ElevenLabs generation + Freesound/Wikimedia/Dryad/Mixkit field recordings

---

## 8. UI/UX

### 8.1 Screens

1. **Startup/Loading**: Full-screen overlay with progress bar, stage text, detail description
2. **Main Menu**: Title, intro text, Enter button, quality selector, controls help
3. **HUD**: Reticle, survival stats (health/water/food/meat), notices, hurt vignette
4. **Photo Mode**: Free camera, PNG export
5. **Telemetry**: F3 debug overlay with FPS, frame time, draw calls, triangles, GPU costs

### 8.2 Styling

- Dark theme: `#20251e` background, `#ebe4cd` text
- Serif title: Georgia / Times New Roman
- Responsive with `clamp()` sizing
- `prefers-reduced-motion` respected

---

## 9. Networking & Data Flow

**No backend API.** All assets served as static files from GitHub Pages. The game:
1. Fetches JSON manifests at startup
2. Preloads all audio + world + character assets
3. Caches everything in Cache API for subsequent visits
4. No telemetry, no analytics, no user data collection

---

## 10. Code Organization (Minified Bundle)

The minified code uses single-letter variable names. Key mappings from analysis:

| Variable | Likely Meaning | Evidence |
|----------|---------------|----------|
| `Ne` / `jy` | World class | `new jy(Xt, Qe, ct)`, `Ne.config.camera` |
| `Oe` / `wS` | Game class | `new wS({scene, camera, renderer, world, assets})` |
| `Mt` / `NS` | Audio system | `new NS(ct, Ne)`, `Mt.enabled`, `Mt.update()` |
| `Xt` | Scene graph | `Xt.updateMatrixWorld()` |
| `ct` | Camera | `ct.position`, `ct.lookAt()` |
| `Qe` | WebGLRenderer | `Qe.setPixelRatio()`, `Qe.render()` |
| `ki` | Asset preloader | `ki.prepare()`, `ki.stats` |
| `ci` | Startup progress | `ci.update("world", ...)`, `ci.complete()` |
| `Tt` / `Ex` | EffectComposer | `Tt.addPass()`, `Tt.render()` |
| `ji` / `Bx` | SSAO pass | `ji.blendIntensity` |
| `Lr` / `Yy` | Atmosphere/SSGI | `Lr.enabled` |
| `a` / `jy` instance | World instance | `a.river`, `a.sky`, `a.csm`, `a.update()` |

---

## 11. Key Findings

1. **No source code public**: The repo only contains the Vite build output (JS bundle, CSS, assets).
2. **Blender MCP pipeline**: World authored using Blender with MCP (Model Context Protocol) integration.
3. **Massive instancing**: 1.2M+ grass instances with LOD and custom shaders for performance.
4. **Procedural audio**: Music generated with ElevenLabs; wildlife sounds curated from open sources.
5. **Client-only**: Zero server communication after initial static asset load.
6. **Cache-first**: Subsequent loads are nearly instant due to Cache API + preload manifest.
7. **QA tools built-in**: F3 telemetry, camera debug, GPU profiler accessible via URL param `?qa`.
8. **Survival loop**: Health/thirst/hunger degrade; animals provide meat; river for water.
9. **No explicit win condition**: Open-ended survival exploration.
10. **Photo mode**: Full screenshot export with camera controls.

---

## 12. Limitations of This Analysis

- Original TypeScript/JS source is not available (only minified bundle)
- Game logic extracted from runtime behavior + bundle strings
- Some class names inferred from usage patterns
- Exact AI behavior trees for animals not fully traceable in minified code

---

*Report generated via reverse-engineering-website skill workflow.*
