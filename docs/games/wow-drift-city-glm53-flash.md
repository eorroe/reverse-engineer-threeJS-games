# wow-drift-city-glm53-flash

- **Model:** GLM-5.3 Flash
- **Tech:** Three.js 0.170.0, EffectComposer + RenderPass + UnrealBloomPass, pure inline single-file (62 KB HTML with embedded CSS + JS)
- **File Structure:** `index.html` (62 KB) — entire game in one file.
- **Key Details:** Night arcade drifting on a procedural neon grid. Handbrake physics, nitro boost, skid marks, glowing checkpoints. 90-second timed run. Radial gradient textures generated procedurally via canvas for headlights, glow, and neon effects.
- **Game Mechanics:** WASD/arrows drive, Space handbrakes, Shift nitros. Physics-based car state: `x, z, h, vx, vz` with slip, speed, drifting boolean, drift timer. Skid marks rendered to a `CanvasTexture` (2048×2048) that scrolls as the car drifts. Drift chains for score multiplier; nitro bar and drift bar HUD. Checkpoint system with glowing triggers. Touch controls for mobile (`body.coarse` class).
- **Notable Patterns:** `SKID_SPAN = 640`, `SKID_PX = 2048` — skid canvas is a persistent ring buffer texture. `radialTex()` factory creates glowing sprite textures from canvas gradients. Boot screen (`#boot`) fades out via CSS transition after JS init. `overscroll-behavior: none` and `touch-action: none` prevent mobile scroll interference.
