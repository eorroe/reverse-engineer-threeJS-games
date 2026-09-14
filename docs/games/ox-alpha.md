# ox-alpha

- **Model:** Laguna S 2.1
- **Tech:** Three.js + Canvas2D, data-driven visualization
- **File Structure:** `index.html` — shell with loading overlay. `assets/index-Bs4cRcHr.js` (4926 lines) — app logic, starfield renderer, UI panels. `data/routing.json` — real MoE routing data (3.2M tokens, 47 sparse layers, 64 experts per layer, 10 picks per layer). `data/token-trace.json` — per-token route trace with 117B MoE checkpoint provenance.
- **Key Details:** 12,032 experts of a 117B MoE rendered as a living star field. Real router profile: 3,205,231 tokens captured live in vLLM on 4x RTX 3090. Per-token route trace: watch a token climb 47 sparse layers picking top 10 experts at each. Star size/brightness = load vs uniform (log scale); hue = domain specialization; diffraction spikes = REAP saliency; cold slate = starved experts. Route link width = routing weight; per-expert hit counters validated against raw files. In-browser findings panels: A1 imbalance (Gini per layer), A2 domains, A3 dead experts, A4 load×REAP quadrants, A5 depth trend.
- **Interaction:** WASD fly, click expert for detail, arrow keys step tokens/layers, M switches aggregate/sequence modes, F opens findings, T runs self-test.
- **Notable Patterns:** `uu` shell class with system-list pattern (each subsystem is an `update` function). `Bd` main app: starfield, nebula, furniture, player (animated beam), accumulation, picker, HUD, transport, stats, tooltip, detail, layer panel, filters, findings, debug, selftest. `ad` accumulation engine with scratch replay for live counter verification. Self-test validates: round-trip field display, conservation of share, route integrity, live counters, provenance badges, no NaN.

## Visualizations / Showcases
