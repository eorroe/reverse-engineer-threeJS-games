# Voidbound Choir of Ash

## Reverse Engineering Report

**Classification:** Dynamic SPA / Third-Person Melee Action (Bundled Obfuscated)

### Extraction Summary
- **Source:** `/tmp/bench-portal/games/voidbound-choir-of-ash/`
- **HTML Size:** 4,592 bytes
- **Total JS:** 0 chars captured (bundled external)
- **WebGL:** WebGL2 (SwiftShader)
- **Network:** 4 requests (document + 2 scripts + 1 stylesheet)

### HTML Structure
- Single `<canvas id="game">` with vignette, damage-flash, grain overlays
- `header` with brand, chapter/status, sound/pause controls
- `main#intro` with eyebrow, h1, p, start button
- `aside#location` with vertical rule, coordinates
- `div#hud.hidden` with vitals, style/combo, abilities (Rend, Sunder, Oblivion, Phase), wave progress
- `#announcement`, `#hit-label`, `#crosshair`
- `footer` with controls hint
- `#pause-screen`, `#death-screen`, `#loading`

### JavaScript Architecture
- **Bundled**: `index-qInzopzo.js` with preload of `three-DSF9mCzu.js`
- **Minified**: class names `Ys`, `ra`, `ct`, `ua`, `xi`
- Third-person melee combat system
- Abilities: light combo (J/LMB), heavy (K/RMB), magic (Q/L), dodge (Space/Shift)
- Style/combo meter system

### Rendering Pipeline
- WebGL2 required
- No post-processing details in extraction
- Custom combat state machine

### Internal APIs / Engine Usage
- Three.js bundled as separate chunk (`three-DSF9mCzu.js`)
- Custom combat state machine
- Kill-based essence restoration
- Pose keyframes stored as arrays of `{t, ...jointTransforms}` objects
- Interpolation uses `smoothstep` and `lerp`

### Data Models & Storage
- Game state not captured
- No localStorage evident

### Network / Assets
- 4 requests: document, 2 scripts (index + three preload), 1 stylesheet
- Self-hosted assets

### Notable Implementation Details
- **"Symphony of violence"** melee system with no two swings alike
- **Third-person camera** follows player with spring-damper smoothing
- **Mana/essence system** with kill restoration
- **Rank system** (D → Awaken)
- **Wave-based progression**: "The Choir"
- **Phase dodge** (Space) with invincibility frames and camera tilt
- **Void magic** (Q/L) with cooldown and mana cost
- **Combo/style meter** that drains over time

### Security / Obfuscation Observations
- Bundled with hashed filenames (minified/obfuscated)
- Three.js vendored as separate chunk rather than CDN
