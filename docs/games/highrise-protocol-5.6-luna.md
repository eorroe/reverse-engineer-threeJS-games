# Highrise Protocol 5.6 Luna

## Reverse Engineering Report

**Classification:** Dynamic SPA / Modular ES Modules (Readable Source)

### Extraction Summary
- **Source:** `/tmp/bench-portal/games/highrise-protocol-5.6-luna/`
- **HTML Size:** 675 bytes
- **JS Files:** 41 files in `src/`
- **WebGL:** Not detected in headless (context loss)
- **Network:** 3 requests (document + 2 CDN scripts)

### HTML Structure
- Minimal HTML: `<div id="game"></div>` mount point
- Module script loads main.js via importmap
- All UI rendered via Three.js and DOM overlays

### JavaScript Architecture
- **Modular architecture**: 41 JS files in `src/` directory
- **Readable source code** — no minification, clear naming
- Entry point: `src/main.js` (17,252 chars, 397 lines)
- 35+ classes with descriptive names

#### Core Classes (35 total):
- **Core**: `FixedLoop`, `TimeManager`, `Input`, `RNG`, `Pool`, `Spring`, `QuatSpring`, `Vec3Spring`
- **Player**: `PlayerController`, `CameraController`, `CollisionWorld`
- **Weapons**: `WeaponSway`, `WeaponMotion`, `WeaponRecoil`, `WeaponADS`, `ReloadTimeline`, `FireController`, `WeaponViewmodel`
- **Enemies**: `Enemy`, `EnemyAI`, `EnemySpawner`, `RagdollManager`
- **FX**: `ParticleSystem`, `DecalSystem`, `ShellSystem`, `MuzzleFX`, `ImpactFX`, `ShakeFX`
- **Audio**: `AudioBus`, `GunAudio`, `ReloadAudio`, `UIAudio`
- **UI**: `HUD`, `Crosshair`, `Hitmarker`
- **World**: `Level`, `WorldProps`, `AssetLibrary`
- **Debug**: `DebugOverlay`, `runAimAlignmentSelfTest`, `updateTelemetry`

### Rendering Pipeline
- Three.js r0.165 from CDN
- WebGLRenderer with antialias, high-performance preference
- PCFSoftShadowMap shadows
- ACES Filmic tone mapping (exposure 1.08)
- SRGBColorSpace output
- Fixed timestep loop via `FixedLoop`

### Internal APIs / Engine Usage
- **Fixed timestep game loop** with accumulator pattern
- **Spring physics**: `Spring`, `QuatSpring`, `Vec3Spring` for weapon recoil, camera shake, ADS smoothing
- **CollisionWorld**: player/environment collision detection
- **AssetLibrary**: GLTF/DRACO asset loading with progress tracking
- **RNG**: seeded random for deterministic gameplay
- **TimeManager**: game time scaling, pause support
- **AudioBus**: centralized audio routing with compression

### Data Models & Storage
- `SEED` constant for deterministic RNG
- `TUNING` exports from weapon modules centralize balance
- Player state: position, velocity, health, stamina
- Weapon state: ammo, reserve, reloading, ads, sprinting
- Enemy state: health, state machine (idle, chase, attack, die), ragdoll

### Network / Assets
- 3 requests: document + main.js + CSS
- Three.js from CDN with version pinning
- GLTF/DRACO loaders from Three.js addons
- Asset library loads weapon/enemy models at runtime

### Notable Implementation Details
- **Modular architecture**: each system in its own module with clear contracts
- **Fixed timestep loop**: deterministic physics and gameplay
- **Debug overlay**: telemetry and aim self-test (works without pointer lock)
- **`window.__highriseState`**: exposed for external debugging
- **Quality toggle**: high/low affecting pixel ratio and shadow maps
- **Ragdoll manager**: physics-based enemy death
- **Version query strings**: `?v=20260801-10` cache-busting on modules

### Security / Obfuscation Observations
- **Fully readable source** — no minification, no obfuscation
- Clear naming conventions: PascalCase for classes, camelCase for methods
- ES6 module imports with explicit paths
- No runtime code generation or eval
- Low security risk — standard Three.js usage
