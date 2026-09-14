# Rig 3090 Astra

## Reverse Engineering Report

**Classification:** Static SPA / 3D Product Viewer (Bundled Obfuscated)

### Extraction Summary
- **Source:** `/tmp/bench-portal/games/rig-3090-astra/`
- **HTML Size:** 760 bytes
- **Total JS:** 0 chars captured (bundled external)
- **WebGL:** Not detected (context loss in headless)
- **Network:** 3 local requests

### HTML Structure
- Minimal: `<div id="root"></div>` only
- Noscript fallback: "Enable JavaScript to explore the interactive 3D presentation."
- Module script `assets/index-BET7dU4y.js` + stylesheet `assets/index-0T1VpPDi.css`

### JavaScript Architecture
- **Bundled single file**: `assets/index-BET7dU4y.js` (854,831 chars, 4323 lines)
- **Minified**: class names `e`, `e`, `e`, `e`, `e`
- Three.js library inlined + game code appended
- 76 `THREE.*` references, 242 shader strings
- Module scope encapsulation

### Rendering Pipeline
- WebGL info: **null** — renderer state not captured
- No exposed globals, no game state
- Likely a Three.js or React-Three-Fiber product configurator

### Data Models & Storage
- Empty state `{}`

### Network / Assets
- 3 local requests: document, JS bundle, CSS bundle
- Favicon SVG present
- No external CDN calls

### Notable Implementation Details
- Product showcase / PC building configurator
- "Four RTX 3090s" — extreme hardware visualization
- Character presence suggests interactive 3D avatar or technician guide
- 673-object Blender reconstruction
- Scroll-driven chapter-based narrative

### Security / Obfuscation Observations
- Bundled module, source unavailable in extraction
- No further analysis possible without JS source
