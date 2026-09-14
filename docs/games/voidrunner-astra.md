# Voidrunner Astra

## Reverse Engineering Report

**Classification:** Dynamic SPA / Racing Game (Bundled Obfuscated)

### Extraction Summary
- **Source:** `/tmp/bench-portal/games/voidrunner-astra/`
- **HTML Size:** 8,283 bytes
- **Total JS:** 0 chars captured (bundled external)
- **WebGL:** WebGL2 (SwiftShader)
- **Network:** 4 requests (document + 1 stylesheet + 1 script + Google Fonts)

### HTML Structure
- `<canvas id="game">` with vignette and damage overlays
- `header` with brand SVG logo, top-meta (Orbital Combat League, Season 09), top-actions (sound, help)
- `main#menu` with intro, world-label, craft-caption, bottom-menu (craft-select, craft-stats, launch)
- 3 craft options: Needle (speeder), Wraith (interceptor), Bastion (enforcer)
- `section#hud.hidden` with position, lap, timing, race-message, systems (hull, weapon, minimap), speedo
- `#countdown`, `#overlay` (modal for flight manual/results), `#loading`, `#touch` controls

### JavaScript Architecture
- **Bundled**: `index-oRakiURx.js` (675,408 chars, 4012 lines)
- **Minified**: class names `Gi`, `ge`, `Vt`, `P`, `Ge`
- Craft selection system with stats (top speed, handling, armor)
- 3-lap race format, 8 pilots, weapons live

### Rendering Pipeline
- WebGL2 required
- Minimap rendered on separate 2D canvas
- No post-processing details in extraction

### Internal APIs / Engine Usage
- Three.js for 3D rendering
- 2D canvas overlay for minimap
- Custom physics for zero-gravity racing

### Data Models & Storage
- Game state not captured
- No localStorage evident

### Network / Assets
- 4 requests: document, 1 stylesheet, 1 script, Google Fonts
- Self-hosted main asset
- GLB models: needle.glb (2.3 MB), wraith.glb (2.3 MB), bastion.glb (2.6 MB), plus LOD variants

### Notable Implementation Details
- **Zero-gravity orbital racing** on Nereid (fractured ocean world)
- **Airbrake drift mechanic** (Q/E)
- **Boost regeneration**
- **Weapon/shield pickup system**
- **Touch controls** for mobile
- **"The Halo Circuit"** event at altitude 12,840 m, -218°C
- **3 crafts**: Needle (speed), Wraith (balanced), Bastion (heavy)
- **LOD variants** swap meshes at distance
- **Craft-specific parameter arrays** drive spring-damper camera behavior

### Security / Obfuscation Observations
- Bundled with hashed filenames
- No raw source available from extraction
