# APEX CLUB Reverse Engineering Report

## Target
**URL:** https://apex-club-racing.mauve-ibex-1793.chatgpt.site/
**Source:** https://github.com/MartinDelophy/awesome-gpt-6-astra/tree/main/works/apex-club

## Classification
**Type:** Static SPA (Single Page Application)
**Framework:** Vanilla JS + Three.js 0.179.1 (local, no CDN runtime dependency)
**Build:** Custom static build with content revision hashes (`?v=707734418ffc`)
**Runtime:** No server, no API, no database, no multiplayer

## Architecture

### Tech Stack
- **3D Engine:** Three.js (local vendor modules)
- **Post-processing:** UnrealBloomPass, EffectComposer, OutputPass
- **Styling:** Plain CSS (~40KB)
- **Module System:** ES Modules with importmap
- **Hosting:** Static HTTPS (served from `dist/` per README)

### File Structure
```
apex-club/
├── index.html           # Main game page (13KB, single page)
├── garage.html          # 3D kart showroom page
├── style.css            # Main styles (40KB)
├── garage.css           # Garage styles (3KB)
├── bootstrap.js         # Entry point: imports game.js, handles loading/errors
├── game.js              # Core game loop, Three.js scene, input (49KB)
├── mobile-controls.js   # Touch controls for mobile (7KB)
├── armored-kart.js      # TITAN kart 3D model (11KB)
├── driver-studio.js     # 3D driver profile (10KB)
├── driving-model.js     # Vehicle physics (3KB)
├── race-audio.js        # Procedural audio (2KB)
├── race-effects.js      # Visual effects (5KB)
├── race-rules.js        # Race logic, scoring, standings (2.5KB)
├── kart-catalog.js      # Kart definitions (1.6KB)
├── vendor/three/        # Three.js 0.179.1 (local)
├── package.json         # v1.1.0, Node >=18
└── tests/               # 13 automated tests
```

### Game Logic
**Game:** "Bay Kart Grand Prix" - 3-lap arcade kart racer
**Track:** Bay Circuit
**Racers:** 8 total (1 player + 7 AI)
**Modes:** Team (4v4, team points) / Solo (8 racers, one winner)
**Scoring:** 15/12/10/8/6/4/2/1 by position
**Race End:** When all finish OR 20s after first finish
**DNF:** Unfinished racers score 0

### Core Systems
1. **Physics** (`driving-model.js`): Independent world position, heading, velocity; track projection with signed progress
2. **Drift** (`race-rules.js`): Charge at speed (170+), release for mini turbo (32%=short, 78%=super); walls cancel
3. **Nitro** (`race-rules.js`): Up to 3 units, 2.1s boost each; refills via drift
4. **AI**: 7 AI opponents with racing routes
5. **Mobile**: Touch controls + tilt steering (optional)
6. **3D Driver**: Procedural articulated character with 3 animations (stand/dance/victory)

### Live Site vs Repo Differences
| Aspect | Live Site | GitHub Repo |
|--------|-----------|-------------|
| HTML | Minified/one-line, inline SVG map path | Formatted, empty map path |
| CSS | `?v=707734418ffc` (cache-busted) | No query string |
| JS | `?v=707734418ffc` | `?v=2` in bootstrap |
| Canvas | Pre-rendered `<canvas width="1280" height="720">` | Not present |
| MapPath | Inline `points="..."` attribute | Empty, populated by JS |

### Key Observations
1. **No API/Network**: Completely client-side, no external API calls captured
2. **No Authentication**: No login, no database
3. **No CDN**: Three.js bundled locally under `vendor/three/`
4. **Build Artifact**: Live site is a production build of the repo with revision hashes
5. **Responsive**: Supports desktop keyboard + mobile touch/tilt
6. **Accessibility**: ARIA labels, keyboard navigation, reduced motion support

### Controls
- **W/↑**: Accelerate
- **S/↓**: Brake/Reverse (overrides auto-throttle)
- **A/D or ←/→**: Steer
- **SPACE + STEER**: Drift (hold, release for mini turbo)
- **SHIFT**: Nitro boost (consumes 1 unit)
- **Q**: EMP (disrupts nearby opponents)
- **H/ESC**: Pause
- **R**: Restart race

### Verified Source
The live site is **identical** to the GitHub repository source code with only:
- Production cache-busting query strings added
- Minified HTML
- Pre-computed SVG map path inline

## Conclusion
The website is an **open-source static SPA** hosted from a production build. The complete source code is available at:
https://github.com/MartinDelophy/awesome-gpt-6-astra/tree/main/works/apex-club
