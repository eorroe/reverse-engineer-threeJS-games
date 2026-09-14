# Highrise Protocol Qwen3.8 27B

## Reverse Engineering Report

**Classification:** Dynamic SPA / Modular ES Modules (Readable Source)

### Extraction Summary
- **Source:** `/tmp/bench-portal/games/highrise-protocol-qwen3.8-27b/`
- **HTML Size:** 4,419 bytes
- **JS Files:** 28 files in `js/`
- **WebGL:** Not detected in headless
- **Network:** 3 requests (document + 2 CDN scripts)

### HTML Structure
- Minimal HTML: `<div id="app"></div>`, `<div id="canvas-host"></div>`
- HUD overlays: `#hud`, `#hud-ammo`, `#ammo-mag`, `#ammo-reserve`, `#ammo-label`, `#hud-hp`, `#hp-bar-track`, `#hp-bar-fill`
- Module script loads main.js → Game.js

### JavaScript Architecture
- **Modular architecture**: 28 JS files in `js/` directory
- **Readable source code**
- Entry point: `js/main.js` (1,027 chars) → bootstraps `systems/Game.js`
- 27 classes with descriptive names

#### Core Classes (27 total):
- **Core**: `Config`, `Easing`, `PRNG`, `Spring`, `Spring2`, `TimeManager`
- **Player**: `Input`, `Player`, `Weapon`, `WeaponViewmodel`
- **Enemies**: `Enemy`, `EnemyManager`
- **Effects**: `CameraShake`, `EffectsManager`, `DecalPool`, `Decals`, `MuzzleFlash`, `ParticleSystem`, `Tracers`
- **Audio**: `AudioEngine`, `Music`
- **Engine**: `Renderer`, `Environment`, `Lighting`, `Textures`
- **UI**: `HUD`, `DebugOverlay`, `StartScreen`
- **Systems**: `Game`

### Rendering Pipeline
- Three.js r0.160 from CDN
- EffectComposer + UnrealBloomPass + OutputPass post-processing
- Separate viewmodel render pass (`WorldViewmodelPass`)
- Bloom post-processing for weapon glow
- ACES Filmic tone mapping

### Internal APIs / Engine Usage
- **Solved red-dot ADS**: named sight anchors with mathematical ADS pose solve
- **Spring-based recoil**: underdamped springs for kick, pitch kick, kick up, roll (zeta < 1 for overshoot)
- **Look-lag inertia**: camera leads directly, weapon trails via impulse-driven springs
- **Detailed AR-15 viewmodel**: FDE tan polymer, M-LOK handguard, PMAG, flip sights, collimator with glass + LED dot
- **Shootable glass**: glass panes shatter into physical shards (F5)
- **Combo system**: OVERDRIVE at 5-chain kills
- **Multikill announcements**: DOUBLE/TRIPLE/QUAD/RAMPAGE
- **Killcam**: on last enemy of wave
- **Self-test**: verifies ADS pose at multiple FOVs

### Data Models & Storage
- `CFG` configuration object centralizes all tuning
- `PRNG` with seed for deterministic replays
- Player state: position, velocity, health, overdrive charge, combo count
- Weapon state: ammo, reserve, reloading, ads, spring targets
- Enemy state: health, state machine, active/ragdoll lists

### Network / Assets
- 3 requests: document + main.js + CSS
- Three.js from CDN
- GLTF/DRACO loaders from addons
- FBX loader for animations

### Notable Implementation Details
- **Solved red-dot ADS**: mathematical pose solve ensures reticle sits on line of fire at any FOV
- **Look-lag inertia**: camera leads, weapon trails via impulse springs
- **Detailed AR-15 viewmodel**: animated bolt carrier, collimator with LED dot
- **Shootable environment**: glass shatters, buckets can be destroyed
- **Combo/overdrive system**: 5-chain kills activate OVERDRIVE mode
- **Multikill announcements**: DOUBLE/TRIPLE/QUAD/RAMPAGE
- **Killcam**: plays on last enemy of wave
- **God mode toggle**: for testing
- **Self-test**: verifies ADS alignment without pointer lock

### Security / Obfuscation Observations
- Fully readable source — no minification
- Clear naming: `EnemyManager`, `WeaponViewmodel`, `CameraShake`
- No runtime code generation
- Standard Three.js security profile
