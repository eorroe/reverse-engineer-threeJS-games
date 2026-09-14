# Vesper Cathedral of Ash

## Reverse Engineering Report

**Classification:** Dynamic SPA / First-Person Shooter (Bundled Obfuscated)

### Extraction Summary
- **Source:** `/tmp/bench-portal/games/vesper-cathedral-of-ash/`
- **HTML Size:** 6,417 bytes
- **Total JS:** 0 chars captured (bundled external)
- **WebGL:** WebGL2 (SwiftShader)
- **Network:** 4 requests (document + 2 scripts + 1 stylesheet)

### HTML Structure
- Single `<canvas id="game">` for WebGL
- Overlay system: `#loading`, `#menu.screen`, `#hud.hidden`, `#pause.overlay.hidden`, `#death.overlay.hidden`, `#manual.overlay.hidden`, `#unsupported`
- Rich HUD with vitals, ammo, crosshair, hitmarker, combat feed, wave banners
- Arsenal UI with 3 weapon cards (Revenant, Absolution, Last Word)

### CSS / Styling
- External CSS: `graphics-BxSOmvuA.css` (bundled asset)
- Computed styles show canvas at 300x150 (default) with transparent background
- Dark theme with vignette, grain, damage flash overlays

### JavaScript Architecture
- **Bundled entry**: `main-Cp9NY4yH.js` with preload of `graphics-rRdjLIzW.js`
- **Minified**: class names `e`, `e`, `e`, `e`, `e`
- SPA architecture with distinct screens managed by `hidden` class toggling
- No external frameworks beyond Three.js

### Rendering Pipeline
- WebGL2 context required; unsupported overlay for fallback
- Separate viewmodel render pass for first-person weapon rendering
- Custom bloom stack with multiple bloom factors/tints
- PBR textures: 6 texture sets (albedo + normal + roughness)

### Internal APIs / Engine Usage
- Three.js for WebGL rendering
- Custom game loop with state machine (menu → playing → paused → dead)
- Wave-based horde mode with scoring
- `weaponRoots` array manages three weapon transforms with visibility toggling
- Spring-damper `_` class used extensively for weapon kick, camera shake, and landing recovery

### Data Models & Storage
- Game state not captured in extraction (empty keys/sample)
- No localStorage evident

### Network / Assets
- 4 requests: document, 2 scripts (main + graphics preload), 1 stylesheet
- All assets self-hosted under `./assets/`
- 13 MB of GLB assets (4 weapon GLBs + soldier GLB)

### Notable Implementation Details
- **Orbital-cathedral horde shooter** set in Saturn orbit, 2189 AD
- **Three fully 3D weapons**: Revenant (assault rifle, red-dot ADS), Absolution (pump shotgun, iron sights), Last Word (marksman rifle)
- Each weapon has distinct spring recoil, weapon inertia, reload choreography, muzzle flash, physical casings, smoke, fragments, decals, hit reactions, and layered procedural audio
- **Enemy system**: animated soldier GLB with world-space health bars, hit reactions, and flinch states
- **Wave system**: announcements, banner transitions, and enemy count tracking
- **Procedural audio**: per-weapon firing sounds, hit markers, near-miss sonic cracks, kill thocks, low-HP heartbeat + audio muffle
- **ADS zoom levels**: rifle 57°, shotgun 64°, marksman configurable

### Security / Obfuscation Observations
- Code is bundled and minified (hashed filenames: `Cp9NY4yH`, `rRdjLIzW`, `BxSOmvuA`)
- Cannot inspect raw source without original build artifacts
