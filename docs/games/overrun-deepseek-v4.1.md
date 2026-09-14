# overrun-deepseek-v4.1

- **Model:** DeepSeek V4.1
- **Tech:** Three.js, custom GLSL. Bundled single file (`assets/index-Bywc_K_8.js`, 4543 lines).
- **File Structure:** `index.html` — game shell with HUD/menu/pause/death screens. `assets/index-Bywc_K_8.js` — all logic bundled.
- **Key Details:** 120x120m industrial arena merged into ~100 draw calls. Three weapon classes with red-dot and iron sights, patterned learnable recoil. Hitscan ballistics with material penetration and per-part damage. Instanced procedural hordes with analytic hit spheres. Hand-rolled HDR pipeline: MSAA scene target, 13-tap down/tent-up bloom chain, single composite pass (ACES, CAS sharpen, radial blur, chromatic aberration, anamorphic streak, damage grading). Dynamic resolution scaling to hold 60fps. Fixed-size light pool streaming.
- **Game Mechanics:** Horde-survival with wave system, score multipliers, streaks. Sprint, crouch, slide, jump with physics. Ammo/reserve system with reload mechanics. Killfeed, damage direction indicators, headshot markers.
- **Notable Patterns:** `X0` main game class orchestrates renderer, weapons, enemies, particles, audio, postfx. `G0` enemy manager with state machine (spawn/chase/attack/die). Particle pools for muzzle smoke, impact sparks, flesh bursts, death bursts, decals, tracers, shell casings. Postfx `A0` with separate bloom/knee/grade/vibrance passes. Built by DeepSeek V4.1 in Claude Code with no external assets. Adaptive scale uses display-period-aware hysteresis to avoid vsync misjudgment.
