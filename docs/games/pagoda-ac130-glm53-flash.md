# pagoda-ac130-glm53-flash

- **Model:** GLM-5.3 Flash
- **Tech:** Three.js (CDN import), CanvasTexture for procedural assets, custom GLSL for destruction FX
- **File Structure:** `index.html` (2800 lines) — all code in single file. `assets/` — none (all generated).
- **Key Details:** Voxel Japanese pagoda garden: ground, sky dome, glass ponds, lily pads, stepping stones, cherry trees, rocks. Destructible block clusters: five-tier pagoda, temple hall, three torii, eight stone lanterns. Three.js `InstancedMesh` for lilies, stepping stones, debris, particles. Thermal/WHOT view toggle: natural dusk vs white-hot thermal via material swap. Canvas-painted ground textures (1024x1024) with sandy paths and pond areas. Deterministic RNG (`mulberry32`) for repeatable garden layout. Per-instance wind sway via vertex shader injection (`G_treeSway`).
- **Weapons:** 25mm cannon (full-auto, snap pockmark, no splash), 40mm Bofors (HE splash, topples static blocks), 70mm rockets (blast, debris, shockwaves), NUKE (28 blast radius, 100 debris chunks, multiple shockwave rings).
- **Destruction System:** `Destruction` class with particle pools: debris (600), dust (512), smoke (400), flash (48), scorch (96). Per-block HP by material; cannon cannot bring anything down (HP floored at 1). Support-driven structural collapse: `_liveSupporters()` counts static supports; blow enough and blocks topple. Knock impulse scaled by power and falloff; dynamic blocks get velocity nudges.
- **Notable Patterns:** `G_DISPOSE` array tracks all GPU resources for cleanup. `FX_T_V3B` used for knock calculation because `makeDynamic()` clobbers `FX_T_V3`. Sectioned code: A=garden, B=destruction, C=weapons/HUD, D=main loop.
