# Highrise Protocol Qwen3.8 Flash Next

## Reverse Engineering Report

**Classification:** Dynamic SPA / Modular ES Modules (Readable Source)

### Extraction Summary
- **Source:** `/tmp/bench-portal/games/highrise-protocol-qwen3.8-flash-next/`
- **HTML Size:** 12,197 bytes
- **JS Files:** 23 files in `src/`
- **WebGL:** Not detected in headless
- **Network:** 2 local requests

### HTML Structure
- Minimal HTML: `<div id="ui"></div>` mount point
- HUD overlays: `#hud`, `#crosshair`, `#hitmarker`, `#dmgdirs`, `#dmgvignette`, `#odglow`, `#ammo`, `#health`, `#god-badge`

### JavaScript Architecture
- **Modular architecture**: 23 JS files in `src/` directory
- **Readable source code**
- Entry point: `src/main.js` (14,072 chars, 417 lines)
- 12 classes: `Bus`, `DecalBuf`, `IBuf`, `Input`, `Noise2`, `Pool`, `Quality`, `Rng`, `Shake`, `Spring`, `Spring3`, `TimeManager`

### Rendering Pipeline
- Three.js r0.170 from CDN
- EffectComposer + UnrealBloomPass + OutputPass post-processing
- Custom post-processing in `post/post.js`
- Volumetric lighting with godrays
- Dust motes particle system

### Internal APIs / Engine Usage
- `Spring` class in `core/spring.js` used throughout
- Bus/event system in `core/bus.js` for decoupled communication
- State machine in `core/state.js` for game phase management
- Quality system with auto-degradation based on FPS
- Object pooling in `pool.js`
- Self-test for ADS in `player/sights-selftest.js`

### Data Models & Storage
- `Rng` class for seeded random
- `TimeManager` with overdrive and hit-stop time scale
- Player state: position, velocity, health, overdrive charge
- Weapon state: ammo, reserve, reloading, ads
- Enemy state: health, state machine, speed (spring-damped)

### Network / Assets
- 2 requests: document + Three.js CDN
- All game code modular and readable
- No external assets

### Notable Implementation Details
- **Overdrive mode**: 6s duration, 14s cooldown
- **Killcam**: on wave completion
- **Combo/chain kill scoring**
- **Quality auto-degradation**: adjusts DPR based on FPS
- **Volumetric lighting**: godrays over rooftop skyline
- **Dust motes**: particle system wrapping around player
- **Vision model feedback**: took screenshots mid-run and graded frames

### Security / Obfuscation Observations
- Fully readable source — no minification
- Clear module organization
- No runtime code generation
