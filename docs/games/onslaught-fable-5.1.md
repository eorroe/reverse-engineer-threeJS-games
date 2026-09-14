# Onslaught Fable 5.1

## Reverse Engineering Report

**Classification:** Dynamic SPA / Bundled Obfuscated Three.js Application

### Extraction Summary
- **Source:** `/tmp/bench-portal/games/onslaught-fable-5.1/`
- **HTML Size:** 3,737 bytes
- **Total JS:** 0 chars captured (bundled external)
- **WebGL:** WebGL2 (SwiftShader)
- **Network:** 4 requests (document + 2 local + fonts.googleapis.com)

### HTML Structure
- Single `<canvas id="game">` (300x150 captured size)
- Rich HUD DOM overlay with multiple sub-systems:
  - Crosshair (`#crosshair`) with 4 directional lines + dot
  - Hitmarker (`#hitmarker`) with 4 spans
  - Damage indicators container
  - Bottom-left vitals panel: HP bar, wave/hostiles/kills stats
  - Bottom-right weapon panel: name, ammo (mag/reserve), fire mode, weapon slots
  - Top-right score + killfeed
  - Wave banner, hint, popups, low-HP overlay
- Menu screen with title, deploy button, control scheme, weapon cards
- Pause menu and death screen

### JavaScript Architecture
- **Bundled single file**: `assets/index-CI6-CFvp.js` (614,793 chars, 4239 lines)
- **Minified**: class names `Ii`, `It`, `zt`, `Sl`, `Pe`
- Three.js library inlined + game code appended
- 102 `THREE.*` references, 90 shader strings
- Module scope encapsulation

### Rendering Pipeline
- Three.js WebGL2Renderer
- Separate viewmodel render pass with its own camera/scene
- HDR MSAA pipeline: 13-tap bloom, chromatic aberration, radial blur, ACES grading
- Instanced procedural enemy rigs with hit-flash and dissolve shaders
- GPU-analytic particles, tracers, decals, shell casings

### Internal APIs / Engine Usage
- `G0` class manages all enemies (spawn, update, kill, projectiles)
- `R0` class for player movement/physics
- `O0` class for weapons with separate viewmodel scene
- `A0` postfx composer with bloom/knee/grade/vibrance passes
- Enemy states: `spawn` → `chase` → `attack` → `die`, with dissolve/squash/topple animations

### Data Models & Storage
- Game state encapsulated in module scope
- Enemy state machine with 4 states
- Weapon state: ammo, reserve, reloading, ads, sprinting
- Player state: health, armor, position, velocity

### Network / Assets
- 4 requests: document + 2 stylesheets (Google Fonts + local) + 1 script
- External font dependency from Google Fonts
- Self-contained game logic

### Notable Implementation Details
- **CoD-style arena FPS**: three weapons (VK-7 full-auto red dot, Hammer-12 pump shotgun, Longshot DMR iron sights)
- **Separate viewmodel render pass**: dedicated camera/scene for first-person weapons
- **Spring-based weapon inertia/sway**: CoD-style recoil patterns
- **HDR MSAA pipeline**: 13-tap bloom, chromatic aberration, radial blur, ACES grading
- **Instanced procedural enemies**: analytic hit spheres per body part (head/torso/hips)
- **Fully synthesized WebAudio**: gunshots and music
- **Built one-shot by Claude Fable 5.1**: zero external assets

### Security / Obfuscation Observations
- Bundled/minified JS (source not captured)
- No raw source available from extraction
- Standard bundler pattern with Three.js inlined
