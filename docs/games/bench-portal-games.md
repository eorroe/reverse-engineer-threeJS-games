# Reverse Engineering Report: bench-portal/games

Source: https://github.com/alesha-pro/bench-portal/tree/main/games

## FPS / Shooters

### breach-blacksite-astra
- **Model:** GPT-6 Astra
- **Tech:** Three.js bundled (game code appended after full Three.js library), WebGL, vanilla JS, CSS
- **File Structure:** Single-page app with bundled assets (`assets/index-DjtD87GC.js` ~632KB, `assets/index-E51VA0F4.css`)
- **Key Details:** Horde-survival FPS with 3 distinct weapons (MK18 MOD 1, M590 Breacher, MK14 EBR). Spring-based weapon inertia, distinct recoil per gun. MK18 uses 2.4× picture-in-picture red-dot optic; shotgun and marksman rifle use iron sights. Includes sprint, slide, jump, reload and inspection animations. SSAO and bloom post-processing. Procedural audio system. SVG-based minimap with building outlines and player position indicator.
- **Game Mechanics:** Wave-based horde survival. Attract/loading screen with "ESTABLISHING UPLINK" branding. Weapon selection before deployment. Score tracking with best score persistence in LocalStorage.
- **Notable Patterns:** Menu system with weapon selection cards. HUD includes wave counter, health/stamina bars, ammo display, crosshair, hitmarker, killfeed. Settings modal for sensitivity, volume, graphics quality (high/low). Pause system with restart/quit options.

### breach-protocol-glm53-flash
- **Model:** GLM-5.3 Flash
- **Tech:** Three.js r170, WebGL, vanilla JS (single-file 123KB HTML with embedded CSS/JS)
- **File Structure:** Entirely self-contained in `index.html` (123KB) + `game.json`. No external dependencies beyond Three.js CDN.
- **Key Details:** Fully procedural textures generated via Canvas2D (concrete, asphalt, road, building facades, crates, barriers, cars, street lamps). Custom HDR bloom pipeline with multiple render targets (rtScene, rtBright, rtBlurA/B, rtB2, rtBlur2A/B) and custom GLSL shaders for pre-pass, blur, and composite. `Spring` class used for weapon sway (3 axes), recoil (2 axes), camera pitch/yaw, FOV kick, and dip. GPU-shader driven particles with custom vertex/fragment shaders for sparks, puffs, and dust motes. Procedural audio via Web Audio API (`SFX` class with noise-buffer-based gunshots, enemy shots, footsteps, reload sounds, ambient city hum).
- **Game Mechanics:** Wave-based horde survival on a dusk city map. 3 weapons: M4 (auto), M9 (semi-auto pistol), M870 pump shotgun. Front-sight ADS, TEMPO DRIVE bullet-time (hold Q), health regeneration. Attract mode that plays itself until user clicks. God mode toggle, film grain toggle. LocalStorage persistence for best score, best wave, sensitivity, god mode, CRT setting.
- **Notable Patterns:** Single-file architecture with everything inlined. Adaptive DPR system with 4 performance levels. CRT/scanline post-FX toggle. Flickering street lamps with random drop patterns. Wet-look roughness maps for puddle reflections. Slow-mo system with charge meter and lock-out mechanic. Hit-stop and screen shake on kills. Compass HUD element.

### gpt-6-astra-2026-09-11
- **Model:** GPT-6 Astra
- **Tech:** Three.js bundled, WebGL, custom GLSL shaders, vanilla JS
- **File Structure:** Single-page app with bundled assets (`assets/index-DpsL_QoF.js` ~632KB, `assets/index-oLjQwgpw.css`). Like breach-blacksite-astra, the JS is mostly Three.js library with game code appended.
- **Key Details:** Custom post-processing with OutputShader for tone mapping and color space conversion. `bc()` function generates concrete and ground textures with seeded PRNG. `G0()` function builds an entire industrial complex procedurally using box geometries, instanced meshes, and collision data. Ragdoll system with limb groups (legL, legR, armL, armR, body) and procedural death animations. A* pathfinding: `k0()` builds a 42×42 grid and `W0()` runs Dijkstra's algorithm for enemy navigation. `Er` class for instanced mesh rendering (up to 700 instances).
- **Game Mechanics:** Arena-survival FPS with 3 weapons (MK18, M590, M14). Grenades, explosive barrels, ammo drops. Health regeneration after avoiding damage. Headshots deal extra damage. Sprint-slide movement. Wave-based enemy spawning with escalating difficulty.
- **Notable Patterns:** Data-URI icons and textures. Enemy types: basic (fast), heavy (tanky), special (shielded). Cover point system for enemy AI. Kill feed and combat messages. Radar canvas element.

### highrise-protocol-5.6-luna
- **Model:** GPT-5.6 Luna
- **Tech:** Three.js r0.165 (importmap from CDN), ES modules, vanilla JS
- **File Structure:** Modular `src/` directory with clear separation: `core/`, `player/`, `weapon/`, `fx/`, `audio/`, `world/`, `ui/`, `debug/`
- **Key Details:** Player controller with collision, movement states (sprint, slide, jump, crouch, mantle). Weapon systems with separate modules for recoil, reload, viewmodel, ADS, fire control. FX pipeline for muzzle flash, impacts, decals, shells, particles, shake. Debug overlay with telemetry and aim self-test (works without pointer lock). Audio bus system with separate modules for guns, reload, UI. Asset library with GLTF/DRACO support for weapon and enemy models. Fixed timestep loop option. Ragdoll manager for enemy deaths. Quality toggle (high/low) affecting pixel ratio and shadow maps. `window.__highriseState` exposed for external debugging.
- **Game Mechanics:** Procedural rooftop/industrial environment. Wave survival with escalating enemy counts. Gunfeel-focused benchmark with detailed weapon handling.

### highrise-protocol-qwen3.8-27b
- **Model:** Qwen3.8-27B
- **Tech:** Three.js r0.160 (unpkg CDN), ES modules, vanilla JS
- **File Structure:** Modular `js/` directory with subdirectories: `systems/`, `player/`, `audio/`, `hud/`, `enemies/`, `engine/`, `effects/`
- **Key Details:** Solved red-dot ADS — viewmodel uses named sight anchors (rearSightAnchor, frontSightAnchor, muzzleAnchor) with a mathematical ADS pose solve ensuring the reticle sits on the line of fire at any FOV. Spring-based recoil with underdamped springs for kick, pitch kick, kick up, roll with configurable zeta < 1 for overshoot. Look-lag inertia — camera leads directly, weapon trails via impulse-driven springs. Detailed AR-15 viewmodel (FDE tan polymer, M-LOK handguard, PMAG, flip sights, collimator with glass + LED dot, collapsible stock, animated bolt carrier). Environment with shootable glass and buckets; glass panes shatter into physical shards. `CFG` configuration object centralizes all tuning. `EffectsManager` coordinates blood, impacts, damage numbers, shell bounces. `CameraShake` with directional damage shake. `TimeManager` with overdrive and hit-stop time scale. `EnemyManager` with active + ragdoll lists. `RNG` with seed for deterministic replays.
- **Game Mechanics:** Wave survival on unfinished rooftop. Combo system with OVERDRIVE at 5-chain kills. Multikill announcements (DOUBLE/TRIPLE/QUAD/RAMPAGE). Killcam on last enemy of wave. Health regeneration after delay. God mode toggle. Self-test system verifying ADS pose at multiple FOVs.

### highrise-protocol-qwen3.8-flash-next
- **Model:** Qwen3.8 Flash
- **Tech:** Three.js r0.170 (jsdelivr CDN), ES modules, vanilla JS
- **File Structure:** Modular `src/` directory with: `core/`, `player/`, `ai/`, `audio/`, `post/`, `world/`, `fx/`, `ui/`
- **Key Details:** Volumetric lighting with godrays and light shafts over rooftop skyline. Dust motes particle system wrapping around player position. `Spring` class in `core/spring.js` used throughout. Bus/event system in `core/bus.js` for decoupled communication. State machine in `core/state.js` for game phase management. Post-processing in `post/post.js` with custom shaders. Self-test for ADS in `player/sights-selftest.js`. Quality system with auto-degradation based on FPS. Object pooling in `pool.js`. Custom easings in `easings.js`. Input with gesture detection and pointer lock management in `input.js`.
- **Game Mechanics:** Rooftop skyline setting with volumetric atmosphere. Spring recoil with red-dot ADS. Ragdoll flinch on enemy death. Wave survival with breather periods. Overdrive mode (6s duration, 14s cooldown). Combo/chain kill scoring. Killcam on wave completion. Vision model took screenshots mid-run and graded frames itself.

### highrise-protocol-qwen3.8-max
- **Model:** Qwen3.8 Max
- **Tech:** Three.js r0.160 (CDN), ES modules, vanilla JS
- **File Structure:** Modular `src/` directory nearly identical to `highrise-protocol-5.6-luna` with same module organization
- **Key Details:** Shared architecture with 5.6-luna. Additional weapon modules: `weapon/sway.js`, `weapon/fire.js` (not present in 5.6-luna). Spring-based weapon systems for recoil, sway, motion, ADS, reload. Viewmodel with detailed animations (3-phase reload with mag swap, bolt rack). Particle/impact system with decals, shells, muzzle flash, blood. Ragdoll system for physics-based enemy death. Debug overlay with telemetry (FPS, draw calls, triangles, AI, particles). `TUNING` exports from weapon modules centralize balance. `runSelfTest` for ADS verification without pointer lock. `track` utility for debug metrics. `CollisionWorld` for player/environment interaction. `AudioBus` pattern with separate gun/reload/UI audio modules. `TimeManager` with pause support and hit-stop.
- **Game Mechanics:** Responsive close-range combat. Escalating enemy waves. Weapon handling focus (recoil, ADS, movement).

### onslaught-fable-5.1
- **Model:** Fable 5.1
- **Tech:** Three.js bundled, custom GLSL shaders, WebAudio. Single-file build (`index.html` + bundled `assets/index-CI6-CFvp.js`, 4239 lines).
- **File Structure:** `index.html` — full game shell with extensive HUD CSS. `assets/index-CI6-CFvp.js` — bundled Three.js + game code + shaders.
- **Key Details:** CoD-style arena FPS: three weapons (VK-7 full-auto red dot, Hammer-12 pump shotgun, Longshot DMR iron sights). Separate viewmodel render pass with its own camera/scene. Spring-based weapon inertia/sway, CoD-style recoil patterns, ADS, sprint, slide. HDR MSAA pipeline: 13-tap bloom, chromatic aberration, radial blur, ACES grading. Instanced procedural enemy rigs with hit-flash and dissolve shaders. GPU-analytic particles, tracers, decals, shell casings. Fully synthesized WebAudio gunshots and music.
- **Game Mechanics:** Wave-based horde survival with score tracking. Killfeed, health, armor pips, ammo count, reload bar. Damage direction indicators, hitmarker (with headshot highlight), slow-mo on wave clear. Pickup system for ammo resupply.
- **Notable Patterns:** `G0` class manages all enemies (spawn, update, kill, projectiles). `R0` class for player movement/physics. `O0` class for weapons with separate viewmodel scene. `A0` postfx composer with bloom/knee/grade/vibrance passes. Enemy states: `spawn` → `chase` → `attack` → `die`, with dissolve/squash/topple animations. Built one-shot by Claude Fable 5.1 in Claude Code with zero external assets.

### overrun-deepseek-v4.1
- **Model:** DeepSeek V4.1
- **Tech:** Three.js, custom GLSL. Bundled single file (`assets/index-Bywc_K_8.js`, 4543 lines).
- **File Structure:** `index.html` — game shell with HUD/menu/pause/death screens. `assets/index-Bywc_K_8.js` — all logic bundled.
- **Key Details:** 120x120m industrial arena merged into ~100 draw calls. Three weapon classes with red-dot and iron sights, patterned learnable recoil. Hitscan ballistics with material penetration and per-part damage. Instanced procedural hordes with analytic hit spheres. Hand-rolled HDR pipeline: MSAA scene target, 13-tap down/tent-up bloom chain, single composite pass (ACES, CAS sharpen, radial blur, chromatic aberration, anamorphic streak, damage grading). Dynamic resolution scaling to hold 60fps. Fixed-size light pool streaming.
- **Game Mechanics:** Horde-survival with wave system, score multipliers, streaks. Sprint, crouch, slide, jump with physics. Ammo/reserve system with reload mechanics. Killfeed, damage direction indicators, headshot markers.
- **Notable Patterns:** `X0` main game class orchestrates renderer, weapons, enemies, particles, audio, postfx. `G0` enemy manager with state machine (spawn/chase/attack/die). Particle pools for muzzle smoke, impact sparks, flesh bursts, death bursts, decals, tracers, shell casings. Postfx `A0` with separate bloom/knee/grade/vibrance passes. Built by DeepSeek V4.1 in Claude Code with no external assets. Adaptive scale uses display-period-aware hysteresis to avoid vsync misjudgment.

### vesper-cathedral-of-ash
- **Model:** GPT-6 Astra
- **Tech:** Three.js + GLSL, custom GLSL shaders (bloom composite, particle shaders), procedural audio via Web Audio API
- **File Structure:** `index.html` (6.4 KB), `armory.html` (2.2 KB) — separate 3D weapon viewer. `assets/` contains bundled JS/CSS, 6 PBR texture sets, 4 weapon GLBs + soldier GLB (~13 MB total).
- **Key Details:** Orbital-cathedral horde shooter set in Saturn orbit, 2189 AD. Three fully 3D weapons: Revenant (assault rifle, red-dot ADS), Absolution (pump shotgun, iron sights), Last Word (marksman rifle). Each weapon has distinct spring recoil, weapon inertia, reload choreography, muzzle flash, physical casings, smoke, fragments, decals, hit reactions, and layered procedural audio. Separate viewmodel render pass for first-person weapon rendering. Enemy system: animated soldier GLB with world-space health bars, hit reactions, and flinch states. Wave system with announcements, banner transitions, and enemy count tracking. Custom bloom stack with multiple bloom factors/tints.
- **Game Mechanics:** Endless wave survival. Score-based "Exorcism Score". Weapon switching with SVG icon cards on menu/HUD. ADS zoom levels per weapon (rifle 57°, shotgun 64°, marksman configurable). Procedural audio: per-weapon firing sounds, hit markers, near-miss sonic cracks, kill thocks, low-HP heartbeat + audio muffle.
- **Notable Patterns:** `weaponRoots` array manages three weapon transforms with visibility toggling. Spring-damper `_` class used extensively for weapon kick, camera shake, and landing recovery. Shared `graphics-*.js` bundle suggests common bloom/particle utilities between menu and game.

### whiteout-protocol-glm-5.3
- **Model:** GLM-5.3
- **Tech:** Vite + npm (real project, multi-file), Three.js (pinned) + official addons from `node_modules`, modular architecture, GLSL custom shaders (aurora, snow sparkle, tracers, heat shimmer, ice translucency)
- **File Structure:** `index.html` (572 B) mounts `#app`. `assets/index-BXZlDR_8.js` (804 KB) is the bundled production build. `prompt.md` (26 KB) is the full engineering spec.
- **Key Details:** Arctic CoD-style wave-survival FPS at an arctic research station, deep dusk. Agentic build: GLM-5.3 built this autonomously in Claude Code over 9.8 hours and 2130 tool calls. The model has no vision, so it reviewed its own screenshots through an outside vision model. Raymarched aurora borealis (layered ribbon curtains, smooth gradients). Pump-action shotgun with solved iron-sight ADS. Blood on snow, exploding fuel drums (fireball + shockwave + physics impulse + scorch marks + white flash). Wave survival with spawning logic. `0xC0DA` PRNG ensures two runs produce identical spawn patterns for benchmarking/replay.
- **Game Mechanics:** Pointer lock mouse look, WASD movement. Sprint (Shift) → tac-sprint (double-tap Shift), sprint-slide (Ctrl), crouch (hold Ctrl), lean Q/E, mantle (Space at obstacle). Full-auto rifle, ~700 RPM, 30-round magazine, infinite reserve ammo. Weapon kick, screen reaction, bullet-landing feedback (light, particles, blood, flinch, sound, numbers). Fuel drums explode on shot with fireball, shockwave, ragdoll impulse, and 1–2 frame white flash.
- **Notable Patterns:** Quality presets (low/med/high/ultra) that cleanly disable post-processing and particle caps to maintain 60 FPS. GPU-instanced particles with pooling and caps (blowing snow, muzzle smoke, impact powder, sparks, blood mist, explosion debris). Every animation uses proper easing or spring-damper; no linear lerp visible.

## Action / Arcade

### pagoda-ac130-glm53-flash
- **Model:** GLM-5.3 Flash
- **Tech:** Three.js (CDN import), CanvasTexture for procedural assets, custom GLSL for destruction FX
- **File Structure:** `index.html` (2800 lines) — all code in single file. `assets/` — none (all generated).
- **Key Details:** Voxel Japanese pagoda garden: ground, sky dome, glass ponds, lily pads, stepping stones, cherry trees, rocks. Destructible block clusters: five-tier pagoda, temple hall, three torii, eight stone lanterns. Three.js `InstancedMesh` for lilies, stepping stones, debris, particles. Thermal/WHOT view toggle: natural dusk vs white-hot thermal via material swap. Canvas-painted ground textures (1024x1024) with sandy paths and pond areas. Deterministic RNG (`mulberry32`) for repeatable garden layout. Per-instance wind sway via vertex shader injection (`G_treeSway`).
- **Weapons:** 25mm cannon (full-auto, snap pockmark, no splash), 40mm Bofors (HE splash, topples static blocks), 70mm rockets (blast, debris, shockwaves), NUKE (28 blast radius, 100 debris chunks, multiple shockwave rings).
- **Destruction System:** `Destruction` class with particle pools: debris (600), dust (512), smoke (400), flash (48), scorch (96). Per-block HP by material; cannon cannot bring anything down (HP floored at 1). Support-driven structural collapse: `_liveSupporters()` counts static supports; blow enough and blocks topple. Knock impulse scaled by power and falloff; dynamic blocks get velocity nudges.
- **Notable Patterns:** `G_DISPOSE` array tracks all GPU resources for cleanup. `FX_T_V3B` used for knock calculation because `makeDynamic()` clobbers `FX_T_V3`. Sectioned code: A=garden, B=destruction, C=weapons/HUD, D=main loop.

### voidbound-choir-of-ash
- **Model:** Astra
- **Tech:** Three.js + GLSL, skeletal animation with keyframed poses
- **File Structure:** `index.html` (4.6 KB), `assets/index-qInzopzo.js` (109 KB) — game logic, `assets/three-DSF9mCzu.js` (524 KB) — three + deps, `assets/index-CNBJs4_G.css` (10.6 KB)
- **Key Details:** Third-person hack-and-slash inside a cathedral built from star-eater bones. Complex animation system with keyframed skeletal poses for: `death`, `light0`/`light1`/`light2` (light attack variants), `heavy`, `magic`, `dodge`. Combo/style system with rank progression (D → S) and style meter that drains over time. Phase dodge (Space) with invincibility frames and camera tilt. Void magic (Q/L) with cooldown and mana cost; mana restores on kill. Endless descent wave system; `wave-label` updates between waves. World-space enemy health bars and telegraph indicators.
- **Game Mechanics:** LMB/J = REND (light sword combo, chained). RMB/K = SUNDER (crushing heavy strike). Q/L = OBLIVION (void magic). Space = PHASE dodge. Essence/mana restores on kill. Health/mana UI with lagged health-fill. Third-person camera follows player with spring-damper smoothing.
- **Notable Patterns:** Pose keyframes stored as arrays of `{t, ...jointTransforms}` objects; interpolation uses `smoothstep` and `lerp`. Enemy `speed` is spring-damped toward target speed; motion-based hit detection uses velocity magnitude. `style-track` CSS div is width-animated by JS based on combo timer. Bundled Three.js is a custom build, not the standard CDN module.

### wow-drift-city-glm53-flash
- **Model:** GLM-5.3 Flash
- **Tech:** Three.js 0.170.0, EffectComposer + RenderPass + UnrealBloomPass, pure inline single-file (62 KB HTML with embedded CSS + JS)
- **File Structure:** `index.html` (62 KB) — entire game in one file.
- **Key Details:** Night arcade drifting on a procedural neon grid. Handbrake physics, nitro boost, skid marks, glowing checkpoints. 90-second timed run. Radial gradient textures generated procedurally via canvas for headlights, glow, and neon effects.
- **Game Mechanics:** WASD/arrows drive, Space handbrakes, Shift nitros. Physics-based car state: `x, z, h, vx, vz` with slip, speed, drifting boolean, drift timer. Skid marks rendered to a `CanvasTexture` (2048×2048) that scrolls as the car drifts. Drift chains for score multiplier; nitro bar and drift bar HUD. Checkpoint system with glowing triggers. Touch controls for mobile (`body.coarse` class).
- **Notable Patterns:** `SKID_SPAN = 640`, `SKID_PX = 2048` — skid canvas is a persistent ring buffer texture. `radialTex()` factory creates glowing sprite textures from canvas gradients. Boot screen (`#boot`) fades out via CSS transition after JS init. `overscroll-behavior: none` and `touch-action: none` prevent mobile scroll interference.

### retrocraft-qwen3.8-27b
- **Model:** Qwen3.8-27B
- **Tech:** Raw WebGL (no Three.js), single-file voxel sandbox. 1442 lines in `index.html`.
- **File Structure:** `index.html` — everything in one file: HTML, CSS, JS, shaders.
- **Key Details:** Raw WebGL with custom shaders and manual matrix math. Procedural 64×40×64 voxel world (4MB `Uint8Array` world grid). FBM noise terrain with grass, dirt, stone, log, leaves, sand, bedrock, plank, neon. Atlas-based textured quad rendering with greedy meshing (`buildMesh`, `drawParts`). Raycast-based block interaction (mine/place) with hotbar selection. Water block with blue tint overlay. Fly mode toggle, physics (gravity, collision, step/slide movement). Pointer lock FPS controls.
- **Audio:** Chiptune synth using WebAudio oscillators and noise buffer. 16-step sequencer at 150 BPM with square-wave lead and bass. High-pass noise for hi-hat, scheduled 40ms lookahead.
- **Rendering:** Sky dome (3 triangles) with gradient. Terrain: opaque solids (culled) + transparent water (blended). Selection highlight with animated line box. CRT FX: scanlines, roll bar, vignette, pixelated rendering.
- **Notable Patterns:** `mat4Mul`, `makeView`, `persp` — all math hand-rolled. `vnoise`/`fbm` for terrain generation. `mulberry32` for deterministic world seed. `maxed` fullscreen mode with flex layout. Built by Qwen3.8-27B INT8 running locally on 4x RTX 3090. Full 1996 GeoCities chrome: Comic Sans header, marquee, DOS window chrome. Single file with no build step, no dependencies.

## Racing

### voidrunner-astra
- **Model:** GPT-6 Astra
- **Tech:** Three.js bundled, PBR materials + custom shaders, bloom + motion blur post-processing, Blender-authored GLB hovercraft models with LODs
- **File Structure:** `index.html` (8.8 KB), `favicon.svg`, `models/` (manifest.json, needle.glb 2.3 MB, wraith.glb 2.3 MB, bastion.glb 2.6 MB, *-lod.glb variants), `assets/index-oRakiURx.js` (675 KB), `assets/index-COtHzPQG.css` (15.6 KB)
- **Key Details:** Anti-gravity combat racer above fractured ocean world Nereid. Three Blender-authored hovercraft: Needle (speed), Wraith (balanced), Bastion (heavy). Each craft has distinct physics parameters: mass, pitch, push, camera roll, recovery, climb rate. Boost and airbrake drifting mechanics; rival combat with weapons and shields. 360° 3D craft showroom with selection UI showing SVG silhouettes. `manifest.json` documents triangle counts, mesh counts, and engine bounding radii per craft. LOD variants swap meshes at distance. Craft-specific `Me[]` parameter arrays drive spring-damper camera behavior.
- **Game Mechanics:** 3-lap race, 8 pilots, weapons live. Craft selection screen with stat bars (top speed, handling, armor). Menu shows current event "THE HALO CIRCUIT" at altitude 12,840 m, −218°C. Boost system with nitro gauge; drift bar for drift scoring.

## Data Visualization

### ox-alpha
- **Model:** Laguna S 2.1
- **Tech:** Three.js + Canvas2D, data-driven visualization
- **File Structure:** `index.html` — shell with loading overlay. `assets/index-Bs4cRcHr.js` (4926 lines) — app logic, starfield renderer, UI panels. `data/routing.json` — real MoE routing data (3.2M tokens, 47 sparse layers, 64 experts per layer, 10 picks per layer). `data/token-trace.json` — per-token route trace with 117B MoE checkpoint provenance.
- **Key Details:** 12,032 experts of a 117B MoE rendered as a living star field. Real router profile: 3,205,231 tokens captured live in vLLM on 4x RTX 3090. Per-token route trace: watch a token climb 47 sparse layers picking top 10 experts at each. Star size/brightness = load vs uniform (log scale); hue = domain specialization; diffraction spikes = REAP saliency; cold slate = starved experts. Route link width = routing weight; per-expert hit counters validated against raw files. In-browser findings panels: A1 imbalance (Gini per layer), A2 domains, A3 dead experts, A4 load×REAP quadrants, A5 depth trend.
- **Interaction:** WASD fly, click expert for detail, arrow keys step tokens/layers, M switches aggregate/sequence modes, F opens findings, T runs self-test.
- **Notable Patterns:** `uu` shell class with system-list pattern (each subsystem is an `update` function). `Bd` main app: starfield, nebula, furniture, player (animated beam), accumulation, picker, HUD, transport, stats, tooltip, detail, layer panel, filters, findings, debug, selftest. `ad` accumulation engine with scratch replay for live counter verification. Self-test validates: round-trip field display, conservation of share, route integrity, live counters, provenance badges, no NaN.

## Visualizations / Showcases

### kerr-protocol-glm-5.3
- **Model:** GLM-5.3
- **Tech:** Raw WebGL2, zero runtime dependencies. Hand-written GLSL shaders (no engine/library/npm package).
- **File Structure:** `index.html` (29 lines) — minimal shell, loads `src/main.js`. `style.css` (50 lines) — fullscreen canvas + HUD panels. `src/` — modular JS: `main.js` (328 lines), `renderer.js` (356 lines), `params.js`, `camera.js`, `input.js`, `ui/hud.js`, `selftest.js`, `gl/context.js`, `gl/program.js`, `gl/targets.js`, `mathx.js`, `prng.js`. `shaders/passes/` — fullscreen quad shaders: `geodesic.frag` (12.4KB), `taa.frag`, `bloom_down/up.frag`, `streak.frag`, `composite.frag`, `trace.frag`, `trace2.frag`. `shaders/lib/` — kernel physics: `kerr.glsl`, `disk.glsl`, `jet.glsl`, `sky.glsl`, `blackbody.glsl`, `camera.glsl`, `common.glsl`, `noise.glsl`. `prompt.md` (19KB) — build transcript.
- **Key Details:** Backward null-geodesic raymarcher in Kerr spacetime (Boyer-Lindquist coordinates, Hamiltonian RK4 integrator). Per-pixel adaptive step sizing: coarse far from horizon, fine near photon sphere (r<5), polar-zone angular advance capping to prevent zipper artifacts. MRT output with 4 data planes (color, steps/events, disk hit params, deflection angle). Blue noise tile for dithering; deterministic R2 jitter sequence for TAA (ping-pong preallocated pairs, no per-frame allocation). TAA blend weight graded by `motionPx` (camera motion in screen pixels); >34px throws away history entirely. Post-process chain: geodesic → TAA → bloom (13-tap down/up) → anamorphic streaks → composite (ACES, grain, dither, chromatic aberration, vignette). Adaptive render scale with vsync-aware hysteresis: refresh estimated from 10th-percentile frame interval, wide cooldowns to prevent oscillation.
- **Interaction:** Interactive camera orbit, 5 cinematic shots (keys 1-5), still capture (P), self-test (T).
- **Notable Patterns:** F1 pattern: persistent `window.__frame` object mutated in place for automation hooks. Self-test overrides via `applyTestConfig`/`clearTestConfig`, with `testEnv` promise-based frame counting. Deflection-aware TAA: uses `oData3.w` (deflection angle) to decide whether camera-matrix reprojection is trustworthy. Built agentically by GLM-5.3 in Claude Code over 15 hours/749 tool calls. Non-vision model judged every frame through an external vision model. 10-check self-test validates shadow radius against 3√3 M, frame dragging, ISCO tracking, lensing against numpy ground truth.

### wow-mandelbulb-glm53-flash
- **Model:** GLM-5.3 Flash
- **Tech:** Three.js 0.170.0, RawShaderMaterial for direct GLSL raymarching, temporal accumulation via ping-pong framebuffer, single-file (29 KB HTML)
- **File Structure:** `index.html` (29 KB) — entire app inline.
- **Key Details:** Distance-field raymarcher solving the Mandelbulb fractal live in the browser. Temporal accumulation refines the frame while the fractal rotates. Custom GLSL fragment shader `MARCH_FRAG` implements the Mandelbulb distance estimator with orbit trapping. Orbit controls: drag orbit, wheel zoom, double-click dive, Space auto-orbit. Quality presets (low/med/high/ultra) control iterations and max steps. Power morphing (M key) changes the fractal exponent in real time. Multiple color palettes; silhouette glow toggle.
- **Interaction:** None — interactive mathematical visualization/visual toy. Drag to orbit, scroll/pinch to zoom, double-click to dive closer. Power parameter adjustable with M, `[`, `]`, arrow keys. Save frame as PNG (S key).
- **Notable Patterns:** Full-screen quad (`PlaneGeometry(2, 2)`) rendered with `depthTest: false, depthWrite: false`. Two-pass architecture: `marchMat` renders to a render target; `copyMat` blits to screen with blend. `COPY_FRAG` implements temporal accumulation: `mix(prevFrame, newFrame, uBlend)`. `hash12` / `hash13` / `vnoise` in GLSL for dithering and noise-based coloring. `BAILOUT = 2.4` for escape radius. No video file or pre-baked frames — pure mathematical computation per pixel per frame. Orbit trap coloring creates the visual bands; power morphing smoothly interpolates between fractal shapes. Performance scales with SPP (samples per pixel) via accumulation, not supersampling.

### wow-terrarium-glm53-flash
- **Model:** GLM-5.3 Flash
- **Tech:** Three.js 0.170.0, procedural geometry (no textures), instanced meshes for vegetation, custom shaders for glass reflection, day/night grading, rain, single-file (46 KB HTML)
- **File Structure:** `index.html` (46 KB) — entire app inline.
- **Key Details:** Glass jar on a workbench holding a living world, grown entirely from code. Everything procedural: terrain, moss, ferns, mushrooms, stones, fireflies, weather. Seeded RNG ensures reproducible generation. Dome-shaped terrain with FBM noise displacement. Mossy dome with vertex-colored gradient (soil → moss → variation). Bioluminescent mushrooms at night (emissive material). Firefly point lights with wandering paths. Day/night cycle with smooth color transitions (sun/moon colors, sky, ground). Rain on demand (Space) with particle system. Knock on glass (tap/click on canvas) creates ripple effect on water surface. Procedural environment map for glass reflections (no external HDR). Puddle ripples (array of 8 `Vector4` ripple objects). Glass material with physical translucency.
- **Interaction:** Drag to orbit, scroll/pinch to zoom. Space = rain, N = toggle day/night, T = auto-cycle, C = drift, G = toggle glass, R = view mode, H = help. Knock on glass via canvas tap — triggers `knock` uniform + ripple animation.
- **Notable Patterns:** `DOME_Y = 0.34` with `domeRaw(x, z)` hemisphere; `terrainRaw` adds FBM noise. Instanced meshes for mushrooms (`while (spots.length < 6 && guard++ < 400)` rejection sampling). `buildEnvironment()` creates a procedural gradient scene rendered to a cube-map-like texture for glass reflections. `dayT = 0.34` drives sun angle; `CYCLE = 140` seconds for full day/night. Zero texture files — all surfaces are generated via geometry manipulation, vertex colors, and procedural materials. Glass jar constraint creates a charming diorama aesthetic while demonstrating physically-based glass refraction.

### rig-3090-astra
- **Model:** GPT-6 Astra
- **Tech:** Three.js bundled, scroll-driven animation
- **File Structure:** `index.html`, `assets/index-BET7dU4y.js` (4323 lines) — bundled Three.js + game code. `models/rig.glb` — Blender photo reconstruction (328K triangles, 2505 source objects). `models/provenance.json` — part metadata (vertices, triangles, centers, dimensions).
- **Key Details:** Scroll-driven 3D presentation of a real 4x RTX 3090 rig. 22 movable component groups extracted from Blender scene: GPUs, cooling, motherboard, PSUs, cables, hand-built supports. Chapter-based narrative: System → Graphics → Cooling → Foundation → Power → Together. Scroll position drives camera animation between predefined keyframes with cubic Hermite interpolation. Reverse scroll reverses animation. Material cloning for opacity/color animation during transitions (parts fade in/out, scale, rotate). Responsive: mobile gets simplified camera, reduced motion respected.
- **Notable Patterns:** `Gd(ae)` function generates 9 keyframe chapters from component rest poses. `Kd(oe, t)` interpolates between keyframe pairs with smoothstep. `ge(a)` applies per-frame animation: position lerp, quaternion slerp, scale lerp, material opacity/color/emissive animation. `ve(e)` main loop with scroll progress `o`, damped to target, render when settled. Part-specific animations: GPU cards fan rotation, cable opacity fades, LED intensity changes. Loading screen with progress bar and percentage; retry on error. Source: `RIG_4x_RTX3090.blend` with 2505 copied objects, 328,604 triangles. GPU cards arranged in custom positions (3 on top, 1 on side) with individual rotations. Each part has `rest` position, animated `position`, `rotation`, `scale`, `opacity`. Environment map generated from scene for realistic reflections. Shadow map 2048×2048 with PCF; ACES tone mapping. Chapter navigation buttons + scroll wheel + vertical index indicator.

### rig-3090-fable-5.1
- **Model:** Fable 5.1
- **Tech:** Three.js 0.170.0 (ES module importmap), GSAP 3.12.5 + ScrollTrigger plugin, DRACOLoader / GLTFLoader, EffectComposer + UnrealBloomPass + OutputPass, Blender-authored model exported to Draco-compressed glTF (979 KB)
- **File Structure:** `index.html` (3.4 KB) — single-page scroller. `main.js` (14 KB) — all 3D + GSAP logic. `style.css` (4.4 KB) — scroller + UI chrome. `assets/rig_draco.glb` (979 KB) — 673-object rig.
- **Key Details:** Scroll-driven teardown: `ScrollTrigger` binds scroll progress to a GSAP timeline that explodes the rig into components, flies the camera through close-ups, then reassembles it; scrolling back reverses everything. PBR lighting rig: key `SpotLight` (warm), rim `SpotLight` (cool blue), fill `PointLight` (pink), plus `HemisphereLight` and two colored glow point lights for GPU accent lighting. Post-processing: `EffectComposer` → `RenderPass` → `UnrealBloomPass` (0.38 strength) → `OutputPass`. ACES Filmic tone mapping at 0.9 exposure; `PCFSoftShadowMap` with 2048×2048 shadow maps. Procedural honeycomb alpha-map canvas texture for GPU bracket perforations. Custom `planarUV` function re-projects geometry UVs from the thinnest axis to avoid stretched textures on irregular meshes. `RoomEnvironment` PMREM at intensity 0.3 for subtle IBL without flat lighting.
- **Notable Patterns:** Single-file dependency model (no build step; importmap + CDN). `#scroller` div is `1000vh` tall to provide scroll range; UI panels are `position: fixed` and toggled via GSAP. Loader screen with progress bar tied to GLTF load progress + initial animation. Very lean runtime: 14 KB of authored JS for a production-quality 3D scroll experience. Draco compression keeps the 673-object scene under 1 MB while preserving individual component selection for the teardown animation.
