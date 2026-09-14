# bench-portal/games Reverse Engineering

Reverse engineering analysis of all game directories in [alesha-pro/bench-portal](https://github.com/alesha-pro/bench-portal/tree/main/games).

## Methodology

This analysis was performed using the `reverse-engineer-website` skill workflow:

1. **Classification**: Identified each game as a local SPA, dynamic SPA, obfuscated JS, or static showcase
2. **Extraction**: Used Playwright headless browser to extract HTML, CSS, JS, WebGL context, network requests, console logs, and computed styles
3. **Analysis**: Analyzed DOM structure, JavaScript architecture, rendering pipelines, internal APIs, data models, and obfuscation patterns
4. **Documentation**: Generated structured reports for each game

## Games

| Game | Category | Model | Type | Classification |
|------|----------|-------|------|----------------|
| [breach-blacksite-astra](./breach-blacksite-astra.md) | shooters | GPT-6 Astra | FPS | Bundled Obfuscated |
| [breach-protocol-glm53-flash](./breach-protocol-glm53-flash.md) | shooters | GLM-5.3 Flash | FPS | Single-File Inline |
| [gpt-6-astra-2026-09-11](./gpt-6-astra-2026-09-11.md) | shooters | GPT-6 Astra | FPS | Bundled Obfuscated |
| [highrise-protocol-5.6-luna](./highrise-protocol-5.6-luna.md) | shooters | GPT-5.6 Luna | FPS | Modular Readable |
| [highrise-protocol-qwen3.8-27b](./highrise-protocol-qwen3.8-27b.md) | shooters | Qwen3.8-27B | FPS | Modular Readable |
| [highrise-protocol-qwen3.8-flash-next](./highrise-protocol-qwen3.8-flash-next.md) | shooters | Qwen3.8 Flash | FPS | Modular Readable |
| [highrise-protocol-qwen3.8-max](./highrise-protocol-qwen3.8-max.md) | shooters | Qwen3.8 Max | FPS | Modular Readable |
| [onslaught-fable-5.1](./onslaught-fable-5.1.md) | shooters | Fable 5.1 | FPS | Bundled Obfuscated |
| [overrun-deepseek-v4.1](./overrun-deepseek-v4.1.md) | shooters | DeepSeek V4.1 | FPS | Bundled Obfuscated |
| [vesper-cathedral-of-ash](./vesper-cathedral-of-ash.md) | shooters | GPT-6 Astra | FPS | Bundled Obfuscated |
| [whiteout-protocol-glm-5.3](./whiteout-protocol-glm-5.3.md) | shooters | GLM-5.3 | FPS | Bundled Obfuscated |
| [pagoda-ac130-glm53-flash](./pagoda-ac130-glm53-flash.md) | action | GLM-5.3 Flash | AC-130 Sandbox | Single-File Inline |
| [voidbound-choir-of-ash](./voidbound-choir-of-ash.md) | action | Astra | Hack-and-slash | Bundled Obfuscated |
| [wow-drift-city-glm53-flash](./wow-drift-city-glm53-flash.md) | action | GLM-5.3 Flash | Racing | Single-File Inline |
| [retrocraft-qwen3.8-27b](./retrocraft-qwen3.8-27b.md) | action | Qwen3.8-27B | Voxel Sandbox | Single-File Readable |
| [voidrunner-astra](./voidrunner-astra.md) | racers | GPT-6 Astra | Anti-gravity Racer | Bundled Obfuscated |
| [ox-alpha](./ox-alpha.md) | data | Laguna S 2.1 | MoE Visualization | Bundled Obfuscated |
| [kerr-protocol-glm-5.3](./kerr-protocol-glm-5.3.md) | visuals | GLM-5.3 | Black Hole Simulation | Modular Readable |
| [wow-mandelbulb-glm53-flash](./wow-mandelbulb-glm53-flash.md) | visuals | GLM-5.3 Flash | Fractal Visualization | Single-File Inline |
| [wow-terrarium-glm53-flash](./wow-terrarium-glm53-flash.md) | visuals | GLM-5.3 Flash | Diorama Simulation | Single-File Inline |
| [rig-3090-astra](./rig-3090-astra.md) | showcases | GPT-6 Astra | 3D Rig Showcase | Bundled Obfuscated |
| [rig-3090-fable-5.1](./rig-3090-fable-5.1.md) | showcases | Fable 5.1 | 3D Rig Showcase | Modular Readable |

## Cross-Cutting Technical Patterns

### Code Architecture
- **Bundled Obfuscated** (8 games): breach-blacksite-astra, gpt-6-astra-2026-09-11, onslaught-fable-5.1, overrun-deepseek-v4.1, vesper-cathedral-of-ash, voidbound-choir-of-ash, voidrunner-astra, whiteout-protocol-glm-5.3, ox-alpha, rig-3090-astra
- **Single-File Inline** (5 games): breach-protocol-glm53-flash, pagoda-ac130-glm53-flash, wow-drift-city-glm53-flash, wow-mandelbulb-glm53-flash, wow-terrarium-glm53-flash
- **Modular Readable** (7 games): highrise-protocol-5.6-luna, highrise-protocol-qwen3.8-27b, highrise-protocol-qwen3.8-flash-next, highrise-protocol-qwen3.8-max, kerr-protocol-glm-5.3, rig-3090-fable-5.1, retrocraft-qwen3.8-27b

### Tech Stack Distribution
- **Three.js**: 15 games
- **Raw WebGL/WebGL2**: 2 games (Kerr Protocol, RetroCraft)
- **Raw WebGL + GLSL raymarching**: 1 game (Mandelbulb)
- **Vite modular build**: 1 game (Whiteout)
- **Single-file inline**: 5 games (Breach Protocol, Pagoda, Drift City, Mandelbulb, Terrarium)

### Common Implementation Patterns
1. **Spring-based recoil/sway** — universal in FPS games
2. **Pointer lock + pause on blur** — consistent across shooters
3. **Wave survival with escalating difficulty** — common game loop
4. **LocalStorage persistence** — best scores, settings
5. **Hit-stop/screen shake** — on kills/impacts
6. **ADS with sight alignment** — mathematical solve in modular games

### Post-Processing
- Custom HDR bloom composers (Breach Protocol, Onslaught, Overrun)
- ACES tone mapping
- Chromatic aberration
- Radial blur
- Anamorphic streaks
- Film grain
- Vignette

### Procedural Generation
- Textures via Canvas2D (Breach Protocol, Pagoda)
- Terrain via FBM noise (RetroCraft, Terrarium)
- Environments from box geometries (gpt-6-astra)
- Instanced vegetation (Terrarium, Pagoda)

### Agentic Builds
Several games explicitly note being built by LLMs (GLM-5.3, Fable 5.1, DeepSeek V4.1, Qwen3.8-27B) in Claude Code with iterative screenshot-based feedback and self-test validation.

### Zero External Assets
Many games ship with zero external texture/model files — everything procedurally generated or bundled.
