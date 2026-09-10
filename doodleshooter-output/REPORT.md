# Reverse Engineering Report: Doodle District

## 1. HTML Structure Analysis
- Single-page application with canvas-based rendering
- HUD elements pre-rendered in HTML
- Three.js import map for ES modules
- External dependencies: PeerJS 1.5.4, Google Fonts

## 2. JavaScript Analysis
- Main bundle: game.7LCERBLR.js (302.8 KB, minified)
- Architecture: Module-based with classes for each system
- Key modules: Renderer, Physics, Player, Enemies, Network, HUD, Effects, Props, Input

## 3. Networking Architecture
### P2P Model (PeerJS WebRTC)
- Signaling: PeerJS cloud server (0.peerjs.com)
- Host-client architecture with host authority
- Lobby codes for matchmaking
- No traditional HTTP API endpoints

### Custom Protocol Messages
- lobby, start, startreq/startack, ps, pdmg, pdead
- pickup/taken/take, nade, brk, parry, shots
- score, end, clock, kick, feed, backtolobby

## 4. Authentication & Security
- No traditional authentication
- PeerJS peer IDs as player identifiers
- Rate limiting: 50ms player state throttle, 12 dmg/sec per weapon
- Host authority for game state validation
- LocalStorage-based moderation logging

## 5. Data Models & Storage

### localStorage Keys
- doodle_best: Best score
- doodle_checkpoint: Highest wave
- doodle_dev: Dev mode (0/1)
- doodle_invert: Invert look (0/1)
- doodle_map: Map selection
- doodle_music: Music enabled (0/1)
- doodle_name: Player name
- doodle_sens: Sensitivity 25-250
- doodle_trackpad: Trackpad mode (0/1)
- doodle_vis: Lobby visibility (public/private)

### Network State Object
```javascript
F = {
  players: Map<peerId, {name, v}>,
  hostId: string,
  isPublic: boolean,
  status: string,
  code: string,
  map: string,
  gen: number,
  next: string|null,
  token: string
}
```

## 6. Hidden/Dev Features
- Dev code: "evdevops" enables test features and extra maps
- Hidden map: "mexico" (referenced in pickup names)
- Maps: district, jungle, mexico (dev only)

## 7. Shader Technology
- Custom GLSL ink shader with 6 colors
- Paper-textured aesthetic (#f6f3e6)
- Edge detection via inverse-depth second differences
- Procedural toon shading

## 8. Gameplay Systems

### Solo Mode
- Wave-based survival with infinite scaling
- Checkpoints every 5 waves
- 4 weapons + grenades + katana
- Grappling hook mechanic

### Multiplayer (FFA)
- PeerJS P2P, up to 10 players
- First to 20 kills wins
- 10-minute match timer
- Auto host migration
- Quick Play matchmaking

### Enemy Types
Grunt, Rusher, Bomber, Sniper, Flyer, Heavy, Shield

### Bosses (every 5 waves)
The Doodler, The Eraser, The Inkblot

## 9. Extracted Assets
- page.html: 7,178 bytes
- style.css: 22,637 bytes
- game.js: 302,767 bytes
- scripts.json: Script tag inventory
- links.json: CSS/asset links

## 10. Notes
- No REST API endpoints detected
- All game logic client-side in minified bundle
- PeerJS WebRTC handles all multiplayer communication
- Game uses custom physics and navigation mesh
- Anti-cheat via host authority and rate limiting
