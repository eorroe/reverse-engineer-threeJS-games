# highrise-protocol-qwen3.8-flash-next

- **Model:** Qwen3.8 Flash
- **Tech:** Three.js r0.170 (jsdelivr CDN), ES modules, vanilla JS
- **File Structure:** Modular `src/` directory with: `core/`, `player/`, `ai/`, `audio/`, `post/`, `world/`, `fx/`, `ui/`
- **Key Details:** Volumetric lighting with godrays and light shafts over rooftop skyline. Dust motes particle system wrapping around player position. `Spring` class in `core/spring.js` used throughout. Bus/event system in `core/bus.js` for decoupled communication. State machine in `core/state.js` for game phase management. Post-processing in `post/post.js` with custom shaders. Self-test for ADS in `player/sights-selftest.js`. Quality system with auto-degradation based on FPS. Object pooling in `pool.js`. Custom easings in `easings.js`. Input with gesture detection and pointer lock management in `input.js`.
- **Game Mechanics:** Rooftop skyline setting with volumetric atmosphere. Spring recoil with red-dot ADS. Ragdoll flinch on enemy death. Wave survival with breather periods. Overdrive mode (6s duration, 14s cooldown). Combo/chain kill scoring. Killcam on wave completion. Vision model took screenshots mid-run and graded frames itself.
