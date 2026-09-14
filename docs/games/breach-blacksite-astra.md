# breach-blacksite-astra

- **Model:** GPT-6 Astra
- **Tech:** Three.js bundled (game code appended after full Three.js library), WebGL, vanilla JS, CSS
- **File Structure:** Single-page app with bundled assets (`assets/index-DjtD87GC.js` ~632KB, `assets/index-E51VA0F4.css`)
- **Key Details:** Horde-survival FPS with 3 distinct weapons (MK18 MOD 1, M590 Breacher, MK14 EBR). Spring-based weapon inertia, distinct recoil per gun. MK18 uses 2.4× picture-in-picture red-dot optic; shotgun and marksman rifle use iron sights. Includes sprint, slide, jump, reload and inspection animations. SSAO and bloom post-processing. Procedural audio system. SVG-based minimap with building outlines and player position indicator.
- **Game Mechanics:** Wave-based horde survival. Attract/loading screen with "ESTABLISHING UPLINK" branding. Weapon selection before deployment. Score tracking with best score persistence in LocalStorage.
- **Notable Patterns:** Menu system with weapon selection cards. HUD includes wave counter, health/stamina bars, ammo display, crosshair, hitmarker, killfeed. Settings modal for sensitivity, volume, graphics quality (high/low). Pause system with restart/quit options.
