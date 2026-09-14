# voidrunner-astra

- **Model:** GPT-6 Astra
- **Tech:** Three.js bundled, PBR materials + custom shaders, bloom + motion blur post-processing, Blender-authored GLB hovercraft models with LODs
- **File Structure:** `index.html` (8.8 KB), `favicon.svg`, `models/` (manifest.json, needle.glb 2.3 MB, wraith.glb 2.3 MB, bastion.glb 2.6 MB, *-lod.glb variants), `assets/index-oRakiURx.js` (675 KB), `assets/index-COtHzPQG.css` (15.6 KB)
- **Key Details:** Anti-gravity combat racer above fractured ocean world Nereid. Three Blender-authored hovercraft: Needle (speed), Wraith (balanced), Bastion (heavy). Each craft has distinct physics parameters: mass, pitch, push, camera roll, recovery, climb rate. Boost and airbrake drifting mechanics; rival combat with weapons and shields. 360° 3D craft showroom with selection UI showing SVG silhouettes. `manifest.json` documents triangle counts, mesh counts, and engine bounding radii per craft. LOD variants swap meshes at distance. Craft-specific `Me[]` parameter arrays drive spring-damper camera behavior.
- **Game Mechanics:** 3-lap race, 8 pilots, weapons live. Craft selection screen with stat bars (top speed, handling, armor). Menu shows current event "THE HALO CIRCUIT" at altitude 12,840 m, −218°C. Boost system with nitro gauge; drift bar for drift scoring.

## Data Visualization
