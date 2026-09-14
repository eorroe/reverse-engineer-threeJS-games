# Breach Blacksite Astra

## Reverse Engineering Report

**Classification:** Dynamic SPA / Bundled Obfuscated

### HTML Structure

- Single `<canvas>` full-viewport
- HUD overlays: `#menu`, `#hud`, `#crosshair`, `#hitmarker`, `#killfeed`, `#announcement`, `#reload-hint`
- Loading screen with progress
- Settings modal (sensitivity, volume, graphics quality)
- SVG minimap overlay


### CSS / Styling

- External bundled CSS (`assets/index-E51VA0F4.css`)
- Transparent HUD panels with backdrop blur
- Rajdhani/Orbitron font stack
- CSS animations for announcements, killfeed entries


### JavaScript Architecture

- **Bundled single file**: `assets/index-DjtD87GC.js` (639KB, 4237 lines)
- Minified/obfuscated: class names `Kr`, `ot`, `Zr`, `D`, `Wt`
- Three.js library inlined + game code appended
- 113 THREE.* references, 90 shader strings
- 2 localStorage references (best score persistence)


### Rendering Pipeline

- Three.js WebGL2Renderer
- Shadow maps enabled
- SSAO post-processing (from shader strings)
- Bloom post-processing
- Separate viewmodel render pass (implied by HUD structure)
- Procedural audio via Web Audio API


### Internal APIs / Engine Usage

- Spring-based recoil/sway system (from class patterns)
- Wave-based enemy spawning
- Weapon state machine (equip, fire, reload, inspect)
- Kill feed and score tracking
- SVG minimap with building outlines


### Data Models & Storage

- Best score in localStorage
- Game state encapsulated in module scope (not exposed)
- Weapon config objects with damage, fire rate, magazine size
- Enemy spawn parameters per wave


### Network / Assets

- 3 requests: document + 2 local assets
- No external CDN dependencies
- Self-contained after initial load


### Notable Implementation Details

- 3 weapons: MK18 MOD 1 (red-dot optic), M590 Breacher (iron sights), MK14 EBR (marksman)
- Spring-based weapon inertia with distinct recoil per gun
- Sprint, slide, jump, reload, inspection animations
- Procedural audio system with distance-based attenuation
- Picture-in-picture optic for MK18 (unzoomed peripheral view)


### Security / Obfuscation Observations

- Heavy minification: class names reduced to 1-2 chars
- Shader strings embedded as template literals
- Three.js library concatenated with game code
- No source maps
- 0.89 compression ratio (partially minified)


---
*Report generated from Playwright extraction and source code analysis*
