# Breach Blaksite Astra

## Reverse Engineering Report

**Classification:** Dynamic SPA / Bundled Obfuscated Three.js Application

### Extraction Summary
- **Source:** `/tmp/bench-portal/games/breach-blacksite-astra/`
- **HTML Size:** 6,125 bytes
- **Total JS:** 0 chars captured (bundled external)
- **WebGL:** WebGL2 (SwiftShader)
- **Network:** 3 local requests, 0 external domains

### HTML Structure
- Single full-viewport `<canvas>` element
- HUD overlay system with multiple DOM layers: `#menu`, `#hud`, `#crosshair`, `#hitmarker`, `#killfeed`, `#announcement`, `#reload-hint`
- SVG-based minimap overlay
- Settings modal (sensitivity, volume, graphics quality)

### JavaScript Architecture
- **Bundled single file**: `assets/index-DjtD87GC.js` (639,727 chars, 4237 lines)
- **Heavily minified**: class names reduced to 1-2 characters (`Kr`, `ot`, `Zr`, `D`, `Wt`)
- Three.js library inlined + game code appended
- 113 `THREE.*` references, 90 shader strings
- Module scope encapsulation

### Rendering Pipeline
- Three.js WebGL2Renderer
- Shadow maps: PCFSoftShadowMap
- SSAO + Bloom post-processing
- Separate viewmodel render pass
- Procedural audio via Web Audio API

### Internal APIs / Engine Usage
- Spring-based recoil/sway system
- Wave-based enemy spawning with state machine
- Weapon state machine: equip → fire → reload → inspect
- Kill feed and score tracking
- SVG minimap with building outlines

### Data Models & Storage
- Best score in localStorage
- Game state encapsulated in module scope
- Weapon config: damage, fire rate, magazine size
- Enemy spawn parameters per wave

### Network / Assets
- 3 requests: document + 2 local assets
- No external CDN dependencies
- Self-contained after initial load

### Notable Implementation Details
- 3 weapons: MK18 MOD 1 (2.4× red-dot optic), M590 Breacher (iron sights), MK14 EBR (marksman)
- Spring-based weapon inertia with distinct recoil per gun
- Sprint, slide, jump, reload, inspection animations
- Picture-in-picture optic for MK18
- Procedural audio with distance-based attenuation

### Security / Obfuscation Observations
- Heavy minification: 1-2 character class names
- Shader strings as template literals
- Three.js concatenated with game code
- No source maps
