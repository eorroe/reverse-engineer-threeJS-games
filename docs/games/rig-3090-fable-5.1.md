# Rig 3090 Fable 5.1

## Reverse Engineering Report

**Classification:** Static Showcase / Scroll-Driven Experience

### Extraction Summary
- **Source:** `/tmp/bench-portal/games/rig-3090-fable-5.1/`
- **HTML Size:** 3,354 bytes
- **JS Files:** 4 script tags, 1 external module
- **WebGL:** WebGL2 (SwiftShader)
- **Network:** 6 requests (document + 2 stylesheets + 3 scripts + fonts.googleapis.com + cdnjs.cloudflare.com)

### HTML Structure
- Minimal semantic markup with `<canvas id="bg">` for WebGL background
- Scroll-driven narrative structure: `#loader`, `header.top`, `section.hero#hero`, multiple `aside.cap` sections (cap0-cap4), `section.final#final`
- Progress bar and hidden `#scroller` div for scroll tracking

### CSS / Styling
- External stylesheet `style.css` plus Google Fonts (Unbounded, Manrope)
- Computed styles show body is 1280x7200px with `overflow: hidden auto` — tall scrollable page
- Canvas is `position: fixed` (z-index: 0), UI overlays use higher z-index
- Dark theme: `rgb(7, 7, 10)` background, `rgb(242, 240, 234)` text

### JavaScript Architecture
- Three.js 0.170.0 via importmap from jsDelivr CDN
- GSAP 3.12.5 + ScrollTrigger for scroll-driven animations
- Entry point: `main.js` (external module, not bundled inline)
- Module pattern with ES imports

### Rendering Pipeline
- `WebGLRenderer` with canvas `#bg`
- Scroll-driven teardown animation of a 3D model (673 objects from Blender glTF)
- No post-processing chain visible in extraction

### Internal APIs / Engine Usage
- Three.js core for 3D rendering
- GSAP ScrollTrigger for scroll-linked animation timeline

### Data Models & Storage
- No localStorage or persistent state observed
- Game state empty: `{}`

### Network / Assets
- 6 requests: document, 2 stylesheets, 3 scripts
- Domains: local, fonts.googleapis.com, cdnjs.cloudflare.com
- No external 3D assets (model embedded or generated)

### Notable Implementation Details
- Scroll-driven "teardown" metaphor — model explodes/apart as user scrolls
- 673 objects from Blender glTF pipeline
- Open-air PC rig documentation aesthetic
- Very lean runtime: 14 KB of authored JS for production-quality 3D scroll experience
- Draco compression keeps 673-object scene under 1 MB

### Security / Obfuscation Observations
- No obfuscation; `main.js` is a separate module file
- All code is readable; minification not evident from extraction metadata
