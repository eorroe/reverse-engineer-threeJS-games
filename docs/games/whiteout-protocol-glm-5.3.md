# whiteout-protocol-glm-5.3

- **Model:** GLM-5.3
- **Tech:** Vite + npm (real project, multi-file), Three.js (pinned) + official addons from `node_modules`, modular architecture, GLSL custom shaders (aurora, snow sparkle, tracers, heat shimmer, ice translucency)
- **File Structure:** `index.html` (572 B) mounts `#app`. `assets/index-BXZlDR_8.js` (804 KB) is the bundled production build. `prompt.md` (26 KB) is the full engineering spec.
- **Key Details:** Arctic CoD-style wave-survival FPS at an arctic research station, deep dusk. Agentic build: GLM-5.3 built this autonomously in Claude Code over 9.8 hours and 2130 tool calls. The model has no vision, so it reviewed its own screenshots through an outside vision model. Raymarched aurora borealis (layered ribbon curtains, smooth gradients). Pump-action shotgun with solved iron-sight ADS. Blood on snow, exploding fuel drums (fireball + shockwave + physics impulse + scorch marks + white flash). Wave survival with spawning logic. `0xC0DA` PRNG ensures two runs produce identical spawn patterns for benchmarking/replay.
- **Game Mechanics:** Pointer lock mouse look, WASD movement. Sprint (Shift) → tac-sprint (double-tap Shift), sprint-slide (Ctrl), crouch (hold Ctrl), lean Q/E, mantle (Space at obstacle). Full-auto rifle, ~700 RPM, 30-round magazine, infinite reserve ammo. Weapon kick, screen reaction, bullet-landing feedback (light, particles, blood, flinch, sound, numbers). Fuel drums explode on shot with fireball, shockwave, ragdoll impulse, and 1–2 frame white flash.
- **Notable Patterns:** Quality presets (low/med/high/ultra) that cleanly disable post-processing and particle caps to maintain 60 FPS. GPU-instanced particles with pooling and caps (blowing snow, muzzle smoke, impact powder, sparks, blood mist, explosion debris). Every animation uses proper easing or spring-damper; no linear lerp visible.

## Action / Arcade
