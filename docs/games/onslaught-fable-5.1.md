# onslaught-fable-5.1

- **Model:** Fable 5.1
- **Tech:** Three.js bundled, custom GLSL shaders, WebAudio. Single-file build (`index.html` + bundled `assets/index-CI6-CFvp.js`, 4239 lines).
- **File Structure:** `index.html` — full game shell with extensive HUD CSS. `assets/index-CI6-CFvp.js` — bundled Three.js + game code + shaders.
- **Key Details:** CoD-style arena FPS: three weapons (VK-7 full-auto red dot, Hammer-12 pump shotgun, Longshot DMR iron sights). Separate viewmodel render pass with its own camera/scene. Spring-based weapon inertia/sway, CoD-style recoil patterns, ADS, sprint, slide. HDR MSAA pipeline: 13-tap bloom, chromatic aberration, radial blur, ACES grading. Instanced procedural enemy rigs with hit-flash and dissolve shaders. GPU-analytic particles, tracers, decals, shell casings. Fully synthesized WebAudio gunshots and music.
- **Game Mechanics:** Wave-based horde survival with score tracking. Killfeed, health, armor pips, ammo count, reload bar. Damage direction indicators, hitmarker (with headshot highlight), slow-mo on wave clear. Pickup system for ammo resupply.
- **Notable Patterns:** `G0` class manages all enemies (spawn, update, kill, projectiles). `R0` class for player movement/physics. `O0` class for weapons with separate viewmodel scene. `A0` postfx composer with bloom/knee/grade/vibrance passes. Enemy states: `spawn` → `chase` → `attack` → `die`, with dissolve/squash/topple animations. Built one-shot by Claude Fable 5.1 in Claude Code with zero external assets.
