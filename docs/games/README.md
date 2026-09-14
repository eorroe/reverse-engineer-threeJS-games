# bench-portal/games Reverse Engineering

Reverse engineering analysis of all game directories in [alesha-pro/bench-portal](https://github.com/alesha-pro/bench-portal/tree/main/games).

## Games

| Game | Category | Model | Type |
|------|----------|-------|------|
| [breach-blacksite-astra](./breach-blacksite-astra.md) | shooters | GPT-6 Astra | FPS |
| [breach-protocol-glm53-flash](./breach-protocol-glm53-flash.md) | shooters | GLM-5.3 Flash | FPS |
| [gpt-6-astra-2026-09-11](./gpt-6-astra-2026-09-11.md) | shooters | GPT-6 Astra | FPS |
| [highrise-protocol-5.6-luna](./highrise-protocol-5.6-luna.md) | shooters | GPT-5.6 Luna | FPS |
| [highrise-protocol-qwen3.8-27b](./highrise-protocol-qwen3.8-27b.md) | shooters | Qwen3.8-27B | FPS |
| [highrise-protocol-qwen3.8-flash-next](./highrise-protocol-qwen3.8-flash-next.md) | shooters | Qwen3.8 Flash | FPS |
| [highrise-protocol-qwen3.8-max](./highrise-protocol-qwen3.8-max.md) | shooters | Qwen3.8 Max | FPS |
| [onslaught-fable-5.1](./onslaught-fable-5.1.md) | shooters | Fable 5.1 | FPS |
| [overrun-deepseek-v4.1](./overrun-deepseek-v4.1.md) | shooters | DeepSeek V4.1 | FPS |
| [vesper-cathedral-of-ash](./vesper-cathedral-of-ash.md) | shooters | GPT-6 Astra | FPS |
| [whiteout-protocol-glm-5.3](./whiteout-protocol-glm-5.3.md) | shooters | GLM-5.3 | FPS |
| [pagoda-ac130-glm53-flash](./pagoda-ac130-glm53-flash.md) | action | GLM-5.3 Flash | AC-130 Sandbox |
| [voidbound-choir-of-ash](./voidbound-choir-of-ash.md) | action | Astra | Hack-and-slash |
| [wow-drift-city-glm53-flash](./wow-drift-city-glm53-flash.md) | action | GLM-5.3 Flash | Racing |
| [retrocraft-qwen3.8-27b](./retrocraft-qwen3.8-27b.md) | action | Qwen3.8-27B | Voxel Sandbox |
| [voidrunner-astra](./voidrunner-astra.md) | racers | GPT-6 Astra | Anti-gravity Racer |
| [ox-alpha](./ox-alpha.md) | data | Laguna S 2.1 | MoE Visualization |
| [kerr-protocol-glm-5.3](./kerr-protocol-glm-5.3.md) | visuals | GLM-5.3 | Black Hole Simulation |
| [wow-mandelbulb-glm53-flash](./wow-mandelbulb-glm53-flash.md) | visuals | GLM-5.3 Flash | Fractal Visualization |
| [wow-terrarium-glm53-flash](./wow-terrarium-glm53-flash.md) | visuals | GLM-5.3 Flash | Diorama Simulation |
| [rig-3090-astra](./rig-3090-astra.md) | showcases | GPT-6 Astra | 3D Rig Showcase |
| [rig-3090-fable-5.1](./rig-3090-fable-5.1.md) | showcases | Fable 5.1 | 3D Rig Showcase |

## Cross-Cutting Observations

- **Tech Stack:** 15 games use Three.js, 2 use raw WebGL/WebGL2 (Kerr Protocol, RetroCraft), 1 uses raw WebGL + GLSL raymarching (Mandelbulb), 1 uses Vite modular build (Whiteout), multiple use single-file inline architectures.
- **Common FPS Mechanics:** Spring-based recoil/sway (universal), pointer lock + pause on blur, wave survival with escalating difficulty, LocalStorage persistence, hit-stop/screen shake on kills, ADS with sight alignment solving.
- **Post-Processing:** Custom HDR bloom composers, ACES tone mapping, chromatic aberration, radial blur, anamorphic streaks, film grain, vignette are widespread.
- **Procedural Generation:** Textures via Canvas2D, terrain via FBM noise, environments from box geometries, instanced vegetation.
- **Agentic Builds:** Several games built by LLMs (GLM-5.3, Fable 5.1, DeepSeek V4.1, Qwen3.8-27B) in Claude Code with iterative screenshot-based feedback and self-test validation.
- **Zero External Assets:** Many games ship with zero external texture/model files — everything procedurally generated or bundled.
