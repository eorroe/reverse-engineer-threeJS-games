# Highrise Protocol Qwen3.8 Max

## Reverse Engineering Report

**Classification:** Dynamic SPA / Modular ES Modules (Readable Source)

### Extraction Summary
- **Source:** `/tmp/bench-portal/games/highrise-protocol-qwen3.8-max/`
- **HTML Size:** 1,003 bytes
- **JS Files:** 39 files in `src/`
- **WebGL:** Not detected in headless
- **Network:** 2 local requests

### HTML Structure
- Minimal HTML: `<div id="app"></div>` mount point
- HUD overlays: `#app`, `#hud`

### JavaScript Architecture
- **Modular architecture**: 39 JS files in `src/` directory
- **Readable source code**
- Entry point: `src/main.js` (14,062 chars, 391 lines)
- 37 classes with descriptive names

#### Core Classes (37 total):
- **Core**: `ADS`, `AI`, `AudioBus`, `CameraRig`, `CollisionWorld`, `Controller`, `Crosshair`, `Decals`, `Enemy`, `EnemyManager`, `Fire`, `Guns`, `HUD`, `Hitmarker`, `Impacts`, `Input`, `Level`, `Loop`, `Motion`, `Muzzle`, `Overlay`, `Particles`, `Pool`, `Props`, `RNG`, `Ragdolls`, `Recoil`, `Reload`, `ReloadAudio`, `Shake`, `Shells`, `Spawner`, `Spring`, `Spring3`, `Sway`, `TimeManager`, `Timeline`, `UIAudio`, `Viewmodel`

### Rendering Pipeline
- Three.js r0.160 from CDN
- WebGLRenderer with antialias
- PCFSoftShadowMap shadows
- ACES Filmic tone mapping
- Fixed timestep loop

### Internal APIs / Engine Usage
- Spring-based weapon systems for recoil, sway, motion, ADS, reload
- Viewmodel with detailed animations (3-phase reload with mag swap, bolt rack)
- Particle/impact system with decals, shells, muzzle flash, blood
- Ragdoll system for physics-based enemy death
- Debug overlay with telemetry (FPS, draw calls, triangles, AI, particles)

### Data Models & Storage
- `TUNING` exports from weapon modules centralize balance
- `runSelfTest` for ADS verification without pointer lock
- `track` utility for debug metrics
- `CollisionWorld` for player/environment interaction
- `AudioBus` pattern with separate gun/reload/UI audio modules
- `TimeManager` with pause support and hit-stop

### Network / Assets
- 2 requests: document + main.js
- Three.js from CDN
- No external assets

### Notable Implementation Details
- Shared architecture with 5.6-luna
- Additional weapon modules: `weapon/sway.js`, `weapon/fire.js`
- 3-phase reload with mag swap and bolt rack
- Debug telemetry overlay
- `window.__highriseState` for external debugging

### Security / Obfuscation Observations
- Fully readable source — no minification
- Clear naming conventions
- No runtime code generation
