# Overrun DeepSeek V4.1

## Reverse Engineering Report

**Classification:** Dynamic SPA / Bundled Obfuscated Three.js Application

### Extraction Summary
- **Source:** `/tmp/bench-portal/games/overrun-deepseek-v4.1/`
- **HTML Size:** 19,985 bytes
- **Total JS:** 0 chars captured (bundled external)
- **WebGL:** WebGL2 (SwiftShader)
- **Network:** 2 local requests

### HTML Structure
- Single `<canvas id="gl">` fixed full-viewport
- Extensive HUD DOM (crosshair, hitmark SVG, damage numbers, objectives, killfeed, ammo, health, armor pips, banners)
- Menu system: logo, loadout cards, deploy button, controls grid
- Pause overlay with kill/acc/wave/score stats
- Death screen with K.I.A., wave reached, headshots
- Diagnostics panel `#diag` (GPU, target, canvas, frame, scene, world, state)
- Fatal error overlay with safe-mode reload
- Loading screen with progress bar

### CSS / Styling
- **Inline CSS in `<style>` block** (~300 lines)
- Design system: amber/cyan/red accents, glassmorphism HUD
- CSS custom properties: `--amber:#ffb03a`, `--cyan:#54e8ff`, `--red:#ff3b30`
- Font stack: `Bahnschrift, DIN Alternate, Oswald, Roboto Condensed, Arial Narrow, system-ui`
- Animations: `kfin/kfout` for killfeed, `ban` for wave banner

### JavaScript Architecture
- **Single bundled module**: `assets/index-Bywc_K_8.js` (1,026,226 chars, 4543 lines)
- **Minified**: class names `e`, `e`, `e`, `extends`, `e`
- Three.js library inlined + game code appended
- 77 `THREE.*` references, 277 shader strings
- Module scope encapsulation

### Rendering Pipeline
- Three.js + WebGL2
- Hand-rolled HDR pipeline: MSAA scene target, 13-tap down/tent-up bloom chain, single composite pass (ACES, CAS sharpen, radial blur, chromatic aberration, anamorphic streak, damage grading)
- Dynamic resolution scaling to hold 60fps
- Fixed-size light pool streaming

### Internal APIs / Engine Usage
- `X0` main game class orchestrates renderer, weapons, enemies, particles, audio, postfx
- `G0` enemy manager with state machine (spawn/chase/attack/die)
- Particle pools for muzzle smoke, impact sparks, flesh bursts, death bursts, decals, tracers, shell casings
- Postfx `A0` with separate bloom/knee/grade/vibrance passes

### Data Models & Storage
- Empty exposed globals `{}`
- Empty game state `{}`
- All state encapsulated in module scope

### Network / Assets
- 2 requests: document + script
- No external font dependency
- Self-contained

### Notable Implementation Details
- **120x120m industrial arena**: merged into ~100 draw calls
- **Three weapon classes**: with red-dot and iron sights, patterned learnable recoil
- **Hitscan ballistics**: with material penetration and per-part damage
- **Instanced procedural hordes**: analytic hit spheres
- **Dynamic resolution scaling**: holds 60fps target
- **Safe mode recovery**: reload in safe mode on fatal error
- **Diagnostics overlay**: shows GPU, target, canvas, frame, scene, world, state
- **Built by DeepSeek V4.1**: no external assets

### Security / Obfuscation Observations
- Bundled/minified JS (source not captured)
- Inline CSS is readable, not obfuscated
- No external dependencies
