# highrise-protocol-5.6-luna

- **Model:** GPT-5.6 Luna
- **Tech:** Three.js r0.165 (importmap from CDN), ES modules, vanilla JS
- **File Structure:** Modular `src/` directory with clear separation: `core/`, `player/`, `weapon/`, `fx/`, `audio/`, `world/`, `ui/`, `debug/`
- **Key Details:** Player controller with collision, movement states (sprint, slide, jump, crouch, mantle). Weapon systems with separate modules for recoil, reload, viewmodel, ADS, fire control. FX pipeline for muzzle flash, impacts, decals, shells, particles, shake. Debug overlay with telemetry and aim self-test (works without pointer lock). Audio bus system with separate modules for guns, reload, UI. Asset library with GLTF/DRACO support for weapon and enemy models. Fixed timestep loop option. Ragdoll manager for enemy deaths. Quality toggle (high/low) affecting pixel ratio and shadow maps. `window.__highriseState` exposed for external debugging.
- **Game Mechanics:** Procedural rooftop/industrial environment. Wave survival with escalating enemy counts. Gunfeel-focused benchmark with detailed weapon handling.
