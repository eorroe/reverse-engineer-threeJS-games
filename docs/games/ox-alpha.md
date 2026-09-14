# Ox Alpha

## Reverse Engineering Report

**Classification:** Static SPA / Data Visualization (Bundled Obfuscated)

### Extraction Summary
- **Source:** `/tmp/bench-portal/games/ox-alpha/`
- **HTML Size:** 1,518 bytes
- **Total JS:** 0 chars captured (bundled external)
- **WebGL:** Not detected (context loss in headless)
- **Network:** 3 local requests

### HTML Structure
- Root `#app` div containing:
  - `#gl` (empty renderer mount)
  - `#loading` overlay with title "OX ALPHA", stage "initializing renderer", 0% progress bar
  - `#fatal` overlay (hidden): "DATA ERROR — NO FALLBACK", "This instrument only renders measured data. It will not invent any."
  - `#hud` (hidden)

### JavaScript Architecture
- **Bundled single file**: `assets/index-Bs4cRcHr.js` (684,026 chars, 4926 lines)
- **Minified**: class names `extends`, `e`, `e`, `e`, `e`
- Three.js library inlined + game code appended
- 46 `THREE.*` references, 253 shader strings
- Module scope encapsulation

### Data Models & Storage
- Empty exposed globals `{}`
- Empty game state `{}`
- All state encapsulated in module scope
- Data files: `data/routing.json` (3.2M tokens), `data/token-trace.json` (per-token route trace)

### Network / Assets
- 3 local requests only
- Self-contained
- Real MoE routing data from vLLM on 4x RTX 3090

### Notable Implementation Details
- **12,032 experts of a 117B MoE** rendered as a living star field
- **Real router profile**: 3,205,231 tokens captured live in vLLM on 4x RTX 3090
- **Per-token route trace**: watch a token climb 47 sparse layers picking top 10 experts at each
- **Star size/brightness**: load vs uniform (log scale)
- **Hue**: domain specialization
- **Diffraction spikes**: REAP saliency
- **Cold slate**: starved experts
- **Route link width**: routing weight
- **Findings panels**: A1 imbalance (Gini per layer), A2 domains, A3 dead experts, A4 loadxREAP quadrants, A5 depth trend
- **Interaction**: WASD fly, click expert for detail, arrow keys step tokens/layers, M switches aggregate/sequence modes, F opens findings, T runs self-test
- **"DATA ERROR — NO FALLBACK"**: strict data-instrument philosophy — will not invent any data

### Security / Obfuscation Observations
- Bundled module, no source available
- Minimal attack surface given empty state
- No external dependencies
