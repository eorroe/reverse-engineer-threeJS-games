# Pagoda Garden AC-130 GLM-5.3 Flash

## Reverse Engineering Report

**Classification:** Dynamic SPA / Single-File Inline (Readable)

### Extraction Summary
- **Source:** `/tmp/bench-portal/games/pagoda-ac130-glm53-flash/`
- **HTML Size:** 112,740 bytes (entire game inline)
- **Total JS:** 112,265 chars captured inline
- **WebGL:** Not detected (context loss in headless)
- **Network:** 2 requests (document + Three.js CDN)

### HTML Structure
- Single `<div id="app">` mount point
- Inline importmap for Three.js r170 CDN
- Inline module script (~112KB in page.html)
- No external CSS

### JavaScript Architecture
- **Single inline ES module**: 112,265 chars, fully readable
- Clear section comments: A=garden, B=destruction, C=weapons/HUD, D=main loop
- Classes: `Destruction`
- 191 `THREE.*` references
- 0.77 compression ratio (well-formatted)

### Rendering Pipeline
- Three.js r170 via CDN importmap
- `InstancedMesh` for lilies, stepping stones, tree trunks, foliage voxels, rocks, grass tufts, clouds, destructible blocks
- Custom shader injection via `onBeforeCompile` for tree sway
- `ShaderMaterial` for particle FX
- `Fog` for atmosphere
- `CanvasTexture` for procedural ground, sky, water ripples
- Thermal/WHOT mode: full material swap + instance color desaturation

### Internal APIs / Engine Usage
- `buildGarden()` — constructs entire scene deterministically
- `resetGarden()` — disposes all GPU resources via `G_DISPOSE` tracker, rebuilds
- `gardenTick(dt)` — per-frame updates: tree sway uniform, water ripple scroll, lily drift, cloud drift
- `applyThermal(on)` — idempotent thermal imaging mode toggle
- `Destruction` class with particle pools: debris (600), dust (512), smoke (400), flash (48), scorch (96)

### Data Models & Storage
- `state.blocks[]` — array of block records with id, mat, pos, quat, scale, hp, maxHp, alive, dynamic, vel, ang, bounces, supports, supportedBy, structureId, color
- `state.structures[]` — id, name, points, blocks[], destroyed, deadCount
- `state.mats` — per-material { normal, thermal, mesh }
- `state.water` — normal/cheap materials + mesh refs
- Deterministic RNG (`mulberry32`) with fixed seeds

### Network / Assets
- 2 requests: document + CDN script
- All textures procedurally generated via canvas
- No image assets loaded

### Notable Implementation Details
- **Voxel subdivision**: parent blocks with dimension > 2u subdivided into 1-1.5u sub-blocks
- **Support-based structural collapse**: `supportedBy` inheritance propagates through sub-blocks
- **HP model**: wood=3, vermillion=2, stone=3, roof=2, pagoda tiers scale, lanterns=1, temple walls=7
- **Particle pools**: 6 types (debris 600, dust 512, smoke 400, flash 48, scorch 96)
- **Debris physics**: gravity + drag + bounce + angular velocity
- **Thermal imaging (WHOT)**: grayscale luminance mapping with contrast stretch
- **Destructible structures**: 5-tier pagoda (1000pts), temple hall (800pts), 3 torii (250pts each), 8 lanterns (150pts each)
- **Weapons**: 25mm cannon, 40mm Bofors, 70mm rockets, NUKE (28 blast radius, 100 debris chunks)

### Security / Obfuscation Observations
- All code inline and fully readable — no minification
- No obfuscation; rich comments describing section contracts
- CDN dependency on `cdn.jsdelivr.net`
