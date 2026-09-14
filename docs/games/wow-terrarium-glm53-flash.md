# Wow Terrarium GLM-5.3 Flash

## Reverse Engineering Report

**Classification:** Dynamic SPA / Procedural Ecosystem Simulation (Inline Code)

### Extraction Summary
- **Source:** `/tmp/bench-portal/games/wow-terrarium-glm53-flash/`
- **HTML Size:** 46,332 bytes (entire game inline)
- **Total JS:** 39,580 chars captured inline
- **WebGL:** Not detected (context loss in headless)
- **Network:** 2 requests (document + Three.js CDN)

### HTML Structure
- Single HTML file with inline JavaScript (~1255 lines)
- Boot screen (`#boot`) with spinner
- `#vignette` overlay
- `#help` modal with controls table
- HUD: `.brand` (title, subtitle), `.stats` (FPS, day/night badge, rain badge), `.chips` (controls, keyboard hints)
- `#toast` for notifications
- `noscript` fallback

### JavaScript Architecture
- Three.js 0.170.0 via importmap
- **All code inline in page.html**
- Seeded procedural generation with `mulberry32` RNG (seed 1123581321)
- Custom helpers: `vnoise`, `fbm` (3-octave fractal Brownian motion)

### Rendering Pipeline
- `WebGLRenderer` with ACES Filmic tone mapping, PCF soft shadows
- `scene.fog = FogExp2`
- PMREMGenerator for procedural environment map (no external HDR)
- Multiple `ShaderMaterial` instances (pond, fireflies, rain)
- `onBeforeCompile` hook for wind animation on standard materials

### Internal APIs / Engine Usage
- Three.js core only
- Custom GLSL shaders for water ripples, fireflies, rain
- Procedural environment map generation
- Instanced meshes for vegetation
- Raycasting for knock-on-glass interaction

### Data Models & Storage
- State object with day cycle, rain, camera controls
- No localStorage

### Network / Assets
- 2 requests: document + 1 script
- Fully self-contained

### Notable Implementation Details
- **Procedural terrarium** with dome terrain (FBM displacement)
- **Wood grain texture** procedurally generated on canvas
- **AO texture** procedurally generated
- **Glass jar** with `MeshPhysicalMaterial` (transmission, IOR 1.5, clearcoat)
- **Refractive glass toggle** (high vs low performance)
- **Pond** with animated ripple shader (8 ripple slots)
- **Instanced vegetation**: 760 grass blades, 170 moss puffs, 90 pebbles, 7 ferns
- **Procedural fern geometry** (6 fronds per bush, custom BufferGeometry)
- **6 bioluminescent mushrooms** with instanced caps/stems
- **44 fireflies** with custom shader (phase, speed, knock impulse)
- **240 rain drops** with falling animation
- **Day/night cycle** with smooth transitions (sun, moon, hemisphere light)
- **Knock-on-glass interaction** (raycasting → impulse + ripples)
- **Cork wobble physics**
- **Firefly point light** with sinusoidal movement
- **Automatic downgrade** if FPS < 42

### Security / Obfuscation Observations
- No obfuscation; readable inline code
- Well-commented sections
