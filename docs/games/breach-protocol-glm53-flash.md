# Breach Protocol Glm53 Flash

## Reverse Engineering Report

**Classification:** Dynamic SPA / Single-File Inline

### HTML Structure

- Single `<canvas>` element
- HUD overlays: `#hud`, `#vig`, `#lowhp`, `#dmg`, `#reloadBox`, `#reloadTxt`, `#reloadBar`, `#reloadFill`, `#godTag`, `#compass`
- Importmap for Three.js CDN
- No external CSS (inline styles minimal)


### CSS / Styling

- Minimal inline CSS: full-viewport canvas, hidden overflow
- HUD elements positioned via JS/CSS
- Compass rendered via DOM/CSS transforms


### JavaScript Architecture

- **Single inline module**: 111,567 chars (fully readable, NOT minified)
- Import map: Three.js r170 from CDN
- Clear section comments: UTILS, AUDIO, SPRING, etc.
- Classes: `Spring`, `SFX`, `Enemy`
- 300+ THREE.* references
- 0.89 compression ratio (well-formatted)


### Rendering Pipeline

- Three.js r170 via CDN importmap
- Custom HDR bloom composer with 6 render targets:
  - rtScene, rtBright, rtBlurA/B, rtB2, rtBlur2A/B
- Custom GLSL shaders for bloom pre-pass, blur, composite
- Procedural textures via Canvas2D (concrete, asphalt, road, buildings, crates, barriers, cars, street lamps)
- Particle system with custom vertex/fragment shaders
- CRT/scanline post-FX toggle


### Internal APIs / Engine Usage

- `Spring` class: weapon sway (3 axes), recoil (2 axes), camera pitch/yaw, FOV kick, dip
- `SFX` class: Web Audio API procedural audio (noise-buffer gunshots, enemy shots, footsteps, reload, ambient city hum)
- `Enemy` class: state machine (spawn, chase, attack, die)
- Attract mode that plays itself until user clicks
- God mode toggle, film grain toggle
- LocalStorage persistence: best score, best wave, sensitivity, god mode, CRT setting


### Data Models & Storage

- `lsGet`/`lsSet` wrappers for localStorage
- Game state: wave, score, bestScore, bestWave, godMode, crtOn
- Weapon state: ammo, reserve, reloading, ads, sprinting
- Enemy pool with spawn timer


### Network / Assets

- 2 requests: document + Three.js CDN
- All game code inline
- All textures procedurally generated


### Notable Implementation Details

- **Fully procedural textures**: every surface generated via Canvas2D
- **Custom HDR bloom**: hand-rolled composer with multiple render targets
- **TEMPO DRIVE bullet-time**: hold Q for slow-mo with charge meter and lock-out
- **Adaptive DPR**: 4 performance levels
- **Flickering street lamps**: random drop patterns
- **Wet-look roughness maps**: puddle reflections
- **Compass HUD**: CSS-transform-based directional indicator
- **Attract mode**: AI plays until user clicks


### Security / Obfuscation Observations

- No obfuscation - fully readable source
- Well-commented with section dividers
- Clear variable names and structure
- Zero dependencies beyond Three.js CDN


---
*Report generated from Playwright extraction and source code analysis*
