# Wow Mandelbulb GLM-5.3 Flash

## Reverse Engineering Report

**Classification:** Dynamic SPA / Distance-Field Raymarcher (Inline Code)

### Extraction Summary
- **Source:** `/tmp/bench-portal/games/wow-mandelbulb-glm53-flash/`
- **HTML Size:** 28,848 bytes (entire game inline)
- **Total JS:** 22,921 chars captured inline
- **WebGL:** Not detected (context loss in headless)
- **Network:** 2 requests (document + Three.js CDN)

### HTML Structure
- Single HTML file with inline JavaScript (~861 lines)
- Minimal UI: `#hud` with title, subtitle, FPS/resolution/SPP chips, palette/quality info
- `#help` modal with controls table
- `#toast` and `#err` for feedback
- `noscript` fallback

### JavaScript Architecture
- Three.js 0.170.0 via importmap (only core, no addons)
- **All code inline in page.html**
- Full-screen quad raymarching setup (OrthographicCamera, PlaneGeometry(2,2))

### Rendering Pipeline
- `WebGLRenderer` with `autoClear: false`, no antialias, no depth/stencil
- Two-pass ping-pong buffer system:
  - Pass 1: Raymarch fragment shader → `rtWrite`
  - Pass 2: Tone-map/copy fragment shader → screen
- `RawShaderMaterial` with GLSL3
- Render targets: `HalfFloatType` if `EXT_color_buffer_float` available, else `UnsignedByteType`
- Temporal accumulation / TAA via `uPrev` texture and `uBlend` mixing

### Internal APIs / Engine Usage
- Three.js core only
- Custom GLSL raymarching shader
- Mandelbulb distance estimator: `vec2 map(vec3 p)` with power parameter
- Soft shadows, orbit traps, palette system
- Jittered sampling for anti-aliasing
- Adaptive resolution scaling based on frame time (target 42-55 fps)

### Data Models & Storage
- State object with camera params (theta, phi, dist), quality, palette, morph, power
- No localStorage

### Network / Assets
- 2 requests: document + 1 script (Three.js CDN)
- Fully self-contained

### Notable Implementation Details
- **Mandelbulb fractal raymarcher** with up to 15 power-parameter iterations
- **5 palettes** (Solar, Glacier, Ultraviolet, Verdigris, Monolith) using cosine palette formula
- **4 quality presets** (LOW/MED/HIGH/ULTRA) controlling march steps (72-176) and fractal iterations (9-15)
- **5 named presets** (Classic, Bloom, Coral, Ion, Spire)
- **Temporal accumulation**: up to 512 samples per pixel when still
- **Adaptive resolution**: holds ~42fps, scales up when headroom available
- **Orbit controls** with inertia/velocity decay
- **Power morph animation** (sinusoidal)
- **Double-click dive**
- **PNG screenshot export**
- **No textures or models** — pure procedural

### Security / Obfuscation Observations
- No obfuscation; readable inline code
- Well-structured with clear section comments
