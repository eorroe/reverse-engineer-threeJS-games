# retrocraft-qwen3.8-27b

- **Model:** Qwen3.8-27B
- **Tech:** Raw WebGL (no Three.js), single-file voxel sandbox. 1442 lines in `index.html`.
- **File Structure:** `index.html` — everything in one file: HTML, CSS, JS, shaders.
- **Key Details:** Raw WebGL with custom shaders and manual matrix math. Procedural 64×40×64 voxel world (4MB `Uint8Array` world grid). FBM noise terrain with grass, dirt, stone, log, leaves, sand, bedrock, plank, neon. Atlas-based textured quad rendering with greedy meshing (`buildMesh`, `drawParts`). Raycast-based block interaction (mine/place) with hotbar selection. Water block with blue tint overlay. Fly mode toggle, physics (gravity, collision, step/slide movement). Pointer lock FPS controls.
- **Audio:** Chiptune synth using WebAudio oscillators and noise buffer. 16-step sequencer at 150 BPM with square-wave lead and bass. High-pass noise for hi-hat, scheduled 40ms lookahead.
- **Rendering:** Sky dome (3 triangles) with gradient. Terrain: opaque solids (culled) + transparent water (blended). Selection highlight with animated line box. CRT FX: scanlines, roll bar, vignette, pixelated rendering.
- **Notable Patterns:** `mat4Mul`, `makeView`, `persp` — all math hand-rolled. `vnoise`/`fbm` for terrain generation. `mulberry32` for deterministic world seed. `maxed` fullscreen mode with flex layout. Built by Qwen3.8-27B INT8 running locally on 4x RTX 3090. Full 1996 GeoCities chrome: Comic Sans header, marquee, DOS window chrome. Single file with no build step, no dependencies.

## Racing
