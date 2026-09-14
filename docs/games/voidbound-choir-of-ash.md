# voidbound-choir-of-ash

- **Model:** Astra
- **Tech:** Three.js + GLSL, skeletal animation with keyframed poses
- **File Structure:** `index.html` (4.6 KB), `assets/index-qInzopzo.js` (109 KB) — game logic, `assets/three-DSF9mCzu.js` (524 KB) — three + deps, `assets/index-CNBJs4_G.css` (10.6 KB)
- **Key Details:** Third-person hack-and-slash inside a cathedral built from star-eater bones. Complex animation system with keyframed skeletal poses for: `death`, `light0`/`light1`/`light2` (light attack variants), `heavy`, `magic`, `dodge`. Combo/style system with rank progression (D → S) and style meter that drains over time. Phase dodge (Space) with invincibility frames and camera tilt. Void magic (Q/L) with cooldown and mana cost; mana restores on kill. Endless descent wave system; `wave-label` updates between waves. World-space enemy health bars and telegraph indicators.
- **Game Mechanics:** LMB/J = REND (light sword combo, chained). RMB/K = SUNDER (crushing heavy strike). Q/L = OBLIVION (void magic). Space = PHASE dodge. Essence/mana restores on kill. Health/mana UI with lagged health-fill. Third-person camera follows player with spring-damper smoothing.
- **Notable Patterns:** Pose keyframes stored as arrays of `{t, ...jointTransforms}` objects; interpolation uses `smoothstep` and `lerp`. Enemy `speed` is spring-damped toward target speed; motion-based hit detection uses velocity magnitude. `style-track` CSS div is width-animated by JS based on combo timer. Bundled Three.js is a custom build, not the standard CDN module.
