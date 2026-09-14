# highrise-protocol-qwen3.8-max

- **Model:** Qwen3.8 Max
- **Tech:** Three.js r0.160 (CDN), ES modules, vanilla JS
- **File Structure:** Modular `src/` directory nearly identical to `highrise-protocol-5.6-luna` with same module organization
- **Key Details:** Shared architecture with 5.6-luna. Additional weapon modules: `weapon/sway.js`, `weapon/fire.js` (not present in 5.6-luna). Spring-based weapon systems for recoil, sway, motion, ADS, reload. Viewmodel with detailed animations (3-phase reload with mag swap, bolt rack). Particle/impact system with decals, shells, muzzle flash, blood. Ragdoll system for physics-based enemy death. Debug overlay with telemetry (FPS, draw calls, triangles, AI, particles). `TUNING` exports from weapon modules centralize balance. `runSelfTest` for ADS verification without pointer lock. `track` utility for debug metrics. `CollisionWorld` for player/environment interaction. `AudioBus` pattern with separate gun/reload/UI audio modules. `TimeManager` with pause support and hit-stop.
- **Game Mechanics:** Responsive close-range combat. Escalating enemy waves. Weapon handling focus (recoil, ADS, movement).
