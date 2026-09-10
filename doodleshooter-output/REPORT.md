# Reverse Engineering Report: Doodle District (Code-Level)

## Methodology

Per the `reverse-engineer-website` skill, this report is based on:
1. Static extraction with Playwright (`page.html`, `scripts.json`, `links.json`, `api-calls.json`)
2. Asset download: `game.7LCERBLR.js` (302,767 bytes), `style.A4A8BF44.css` (22,637 bytes)
3. Beautification with `js-beautify` (269 lines → 11,694 lines)
4. Static analysis of recovered class/method boundaries, shader sources, network protocol, and data models

No execution of site code was performed. All analysis is from static reading of the client bundle.

## 1. Entry Point & Load Order

### index.html
- Canvas target: `#c`
- HUD root: `#hud` (pre-rendered HTML)
- Import map pins Three.js r170 to `https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js`
- PeerJS 1.5.4 loaded via classic script before module bundle
- Main bundle: `./game.7LCERBLR.js` (module type)
- Vercel Insights analytics deferred at end

### style.A4A8BF44.css
- CSS custom properties: `--ink: #1a30c0`, `--red: #d02030`, `--paper: #f6f3e6`
- Canvas fixed fullscreen
- HUD uses `mix-blend-mode: multiply` for ink-on-paper compositing
- HUD hidden via `.nogame` until gameplay starts
- Static HUD elements: crosshair, grapple reticle, hitmarker, damage indicator, killfeed, message, bossbar, weapon slots, tally marks, focus meter

## 2. Bundle Architecture (game-beautified.js, 11,694 lines)

### Imports
```javascript
import * as yt from "three";   // player/remote/entity code
import * as ht from "three";   // renderer/post-processing
```

Later imports for player/weapon code:
```javascript
import * as mt from "three";
import * as ut from "three";
import * as St from "three";
import * as C from "three";
```

### Global Constants
```javascript
k = { BLUE: 0, RED: 1, BLACK: 2, ORANGE: 3, GREEN: 4, PINK: 5 }
ri = [Vector3(.1,.19,.76), Vector3(.86,.12,.2), Vector3(.18,.2,.26),
      Vector3(.92,.55,.08), Vector3(.12,.6,.3), Vector3(.9,.4,.66)]
Hn = ri.map(n => n.toArray())
$a = { paper: [.965,.955,.905], lines: 0, inks: Hn }
```

`k` is the ink color enum. `ri` is the default 6-ink palette.

## 3. Shader System

### Ink Material Factory `gt(opts = {})`
```javascript
function gt(n = {}) {
    let t = new ht.ShaderMaterial({
        uniforms: {
            uInk: { value: n.ink ?? k.BLUE },
            uFill: { value: n.fill ? 1 : 0 },
            uShadeScale: { value: n.shadeScale ?? 1 },
            uShadeBias: { value: n.shadeBias ?? 0 },
            uLightDir: li.uLightDir,
            uTime: li.uTime
        },
        vertexShader: Xa,
        fragmentShader: Ja,
        side: n.side ?? ht.FrontSide
    });
    return t.inkId = n.ink ?? k.BLUE, t
}
```

**Vertex shader `Xa`:** Passes normal to fragment, handles instancing color via `vColorData`.

**Fragment shader `Ja`:**
- Encodes: shade in `.r`, ink id in `.g`, normal.x in `.ba.r`, normal.y in `.ba.g`
- `fill` mode sets shade to -1.0 (flat fill)
- `_e(mat, bool)` toggles `uFill` for flash effects

### Post-Processing Material `post`
- Full-screen quad with vertex shader `Za` and fragment shader `Qa`
- Uniforms: `tScene`, `tDepth`, `uRes`, `uAspect`, `uTime`, `uNear`, `uFar`, `uHurt`, `uFlash`, `uSlow`, `uLineSpacing`, `uLineMode`, `uLowHp`, `uPaper`, `uInks[6]`, `uInvProj`, `uInvView`

**Post-process pipeline (from `Qa` fragment shader):**
1. UV wobble for hand-drawn instability
2. Edge detection: Laplacian on inverse depth (`1/d`) for scale-invariant silhouettes
3. Normal-based edge test via `length(sl.ba - sr.ba)` (normal deltas in blue channel)
4. Hatching: 3 directional stripe patterns anchored to world-space surface orientation
   - Line spacing steps in powers of 2 with distance
   - Hand-drawn waver via `vnoise`
5. Paper background: procedural grain (`vnoise`), ruled lines or graph-paper grid
6. Red margin line at 7% screen width
7. Hurt effect: red scribble vignette using stripe pattern
8. Low HP: pulsing red vignette (`sin(uTime * 6.0)`)
9. Flash/slow mix to white/blue

## 4. Renderer: `ci` class

```javascript
ci = class {
    constructor(t) {
        this.renderer = new ht.WebGLRenderer({
            canvas: t, antialias: false,
            powerPreference: "high-performance", stencil: false
        })
        this.renderer.outputColorSpace = ht.LinearSRGBColorSpace
        this.renderer.autoClear = false
        this.pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5)
        this.scene = new ht.Scene
        this.camera = new ht.PerspectiveCamera(80, 1, 0.08, 420)
        this.rt = new ht.WebGLRenderTarget(2, 2, {
            type: ht.HalfFloatType,
            format: ht.RGBAFormat,
            minFilter: ht.NearestFilter,
            magFilter: ht.NearestFilter,
            depthTexture: new ht.DepthTexture(2, 2),
            depthBuffer: true, stencilBuffer: false, generateMipmaps: false
        })
        this.post = new ht.ShaderMaterial({...})
        this.postScene = new ht.Scene
        this.postCam = new ht.OrthographicCamera(-1, 1, 1, -1, 0, 1)
        this.postScene.add(new ht.Mesh(new ht.PlaneGeometry(2, 2), this.post))
    }

    setStyle(t) {
        // Merges style over defaults ($a), sets uPaper, uLineMode, and all 6 ink colors
    }

    resize() {
        // Rebuilds RT at pixelRatio-scaled resolution, updates camera aspect
    }

    render(time, opts = {}) {
        // 1. setRenderTarget(rt)
        // 2. clear to red (paper color space)
        // 3. render scene to camera
        // 4. update post uniforms (time, hurt, flash, slow, lowHp, invProj, invView)
        // 5. render postScene to screen
    }
}
```

**Critical implementation detail:** The game renders to a `HalfFloat` RGBA + `Float` depth render target with `NearestFilter`, no mipmaps. The scene is cleared to red (`new ht.Color(1,0,0)`) which maps to white paper in the shader's color space. All inking, hatching, and paper effects happen in the post-process fragment shader.

## 5. Smoothing Utilities

### `ss` class (scalar spring)
```javascript
ss = class {
    constructor(t = 120, e = 14) {
        this.value = 0, this.vel = 0, this.target = 0, this.k = t, this.d = e
    }
    update(t) {
        let e = t > .02 ? 3 : 1, s = t / e;
        for (let i = 0; i < e; i++) {
            let o = (this.target - this.value) * this.k - this.vel * this.d;
            this.vel += o * s, this.value += this.vel * s
        }
        return this.value
    }
    kick(t) { this.vel += t }
    set(t) { this.value = t, this.vel = 0 }
}
```

### `Ds` class (vector spring)
```javascript
Ds = class {
    constructor(t = 120, e = 14) {
        this.value = new Ae.Vector3, this.vel = new Ae.Vector3,
        this.target = new Ae.Vector3, this.k = t, this.d = e, this._f = new Ae.Vector3
    }
    update(t) { /* same spring logic per component */ }
    kick(t, e, s) { this.vel.x += t, this.vel.y += e, this.vel.z += s }
}
```

Used for: recoil pitch/yaw (`ss(190, 17)`), fovKick (`ss(220, 14)`), landDip (`ss(170, 15)`), camera roll.

### Utility Functions
```javascript
Q = (n, t, e) => Math.max(t, Math.min(e, n))           // clamp
st = (n, t, e, s) => n + (t - n) * (1 - Math.exp(-e * s)) // exp smooth
p = (n, t) => n + Math.random() * (t - n)               // rand range
os = (n, t) => Math.floor(p(n, t + 1))                   // rand int
Fe = n => n[Math.floor(Math.random() * n.length)]        // rand element
vo = n => ((n + Math.PI) % vt + vt) % vt - Math.PI       // wrap to [-PI, PI]
Ns = (n, t, e) => n + vo(t - n) * e                      // shortest lerp yaw
```

## 6. Input System: `di` class

```javascript
di = class {
    constructor(t) {
        this.canvas = t
        this.state = {}, this.prev = {}, this.frameState = {}
        this.keys = {}, this.mouseBtns = {}
        this.move = { x: 0, y: 0 }
        this.look = { x: 0, y: 0 }
        this.mx = 0, this.my = 0, this.wheel = 0
        this.mouseSens = .0022, this.padSensX = 3.4, this.padSensY = 2.6
        this.usingGamepad = !1, this.gamepadIndex = -1
        this.pointerLocked = !1, this.lastActive = performance.now()
        this.invertY = !1, this.trackpad = !1
        this.tpSprint = !1, this._fwdTap = 0
    }

    requestLock() { /* requestPointerLock with retry */ }
    exitLock() { /* exitPointerLock */ }
    update(t) { /* polls gamepad, updates analog look, tracks idle time */ }
    pressed(action) { /* edge-triggered */ }
    down(action) { /* level-triggered */ }
}
```

### Keyboard → Action Map (`Sn`)
```javascript
Sn = {
    KeyW: "forward", KeyS: "back", KeyA: "left", KeyD: "right",
    ArrowUp: "forward", ArrowDown: "back", ArrowLeft: "left", ArrowRight: "right",
    Space: "jump", ShiftLeft: "sprint", ShiftRight: "sprint",
    ControlLeft: "crouch", KeyC: "crouch",
    KeyR: "reload", KeyQ: "grapple", KeyE: "grapple",
    KeyF: "melee", KeyV: "melee",
    Digit1-5: "slot1"-"slot5",
    Escape: "pause", KeyP: "pause", Enter: "confirm",
    KeyG: "grenade", KeyX: "dash", AltLeft: "dash",
    KeyM: "music", KeyT: "talk", Tab: "score"
}
```

### Mouse Button → Action Map (`zn`)
```javascript
zn = { 0: "fire", 2: "aim", 1: "grapple", 3: "grapple", 4: "melee" }
```

### Gamepad Button → Action Map (`Eo`)
```javascript
Eo = {
    0: "jump", 1: "crouch", 2: "reload", 3: "nextWeapon",
    4: "grapple", 5: "melee", 6: "aim", 7: "fire",
    9: "pause", 10: "sprint", 11: "grenade", 12: "grenade",
    13: "slot5", 14: "prevWeapon", 15: "nextWeapon",
    8: "score", 17: "confirm"
}
```

### Trackpad Mode
- Shift acts as aim
- Double-tap W for sprint (`tpSprint` flag with 320ms window)

## 7. Character Model Builder: `Os` function

```javascript
function Os(n, t, e) {
    let s = new C.Group, i = {}, o = {}, a = e.build || {},
        l = a.bodyW ?? 1, r = a.headS ?? 1, c = a.limbR ?? .032;
    // Hips -> torso -> head -> arms -> legs
    // Parts: hips, torso, head, armL, armR, foreL, foreR, legL, legR, shinL, shinR
    // Gun mount at foreR hand position
    // Shield mount if e.shield
    // Face: eyes (normal) + xeyes (death)
    // Hat: cap, band, helmet, hood, crown
    // Returns: { root, parts, J, tip, face, hit }
}
```

### Hit Spheres (`qi` array)
```javascript
qi = [
    ["head", .3], ["torso", .33], ["hips", .2],
    ["armL", .11], ["armR", .11], ["foreL", .1], ["foreR", .1],
    ["legL", .13], ["legR", .13], ["shinL", .11], ["shinR", .11]
]
// shield adds ["shield", .66] at front if present
```

### Weapon Model Builder: `Lo` function
```javascript
function Lo(n, t, e, s) {
    // s.weapon: "blade", "shotgun", "sniper", "pistol", "boss", "rifle" (default)
    // Builds procedural gun models from box/cylinder geometries
}
```

### Face Builder: `Ao` function
```javascript
function Ao(n, t, e = {}) {
    // e.ex, e.ey, e.ez, e.er = eye position/radius
    // e.smile = blade weapon => different eye shape
    // Returns: { eyes: Group, xeyes: Group }
}
```

## 8. Player Controller: `Pi` class

```javascript
Pi = class {
    constructor(ctx) {
        this.ctx = ctx
        this.camera = ctx.camera
        this.camera.rotation.order = "YXZ"
        this.body = ws(ctx.level.playerStart, 0.35, Ci, 0.55)
        this.yaw = 0, this.pitch = 0
        this.maxHp = 120, this.hp = 120
        this.alive = true
        this.regenDelay = 4.5, this.regenRate = 11
        this.nadeCharge = 0, this._nadeHeld = false
        this.grapStam = 1, this.blockHeld = 0, this.stamPause = 0
        this.eye = new mt.Vector3, this.center = new mt.Vector3
        this.forward = new mt.Vector3(0, 0, -1), this.right = new mt.Vector3(1, 0, 0)
        this.speed = 0, this.hurtFx = 0, this.flashFx = 0
        this.lastDamageT = 10
        this.rig = new mt.Group  // weapon rig attached to camera
        this.camera.add(this.rig)
        ctx.scene.add(this.camera)
        this.weapons = [new zi(ctx), new _i(ctx), new Ai(ctx), new Li(ctx)]
        this.katanaIndex = 3
        this.weaponIndex = 0
        this.weapon = this.weapons[0]
        this.prevWeaponIndex = 0
        this.recoilPitch = new ss(190, 17)
        this.recoilYaw = new ss(190, 17)
        this.fovKick = new ss(220, 14)
        this.landDip = new ss(170, 15)
        this.roll = 0, this.fov = 82
        this.bobPhase = 0, this.bobAmt = 0, this.stepDist = 0
        this.eyeH = Oo  // standing eye height
        this.crouching = false, this.sliding = false
        this.slideT = 0, this.coyote = 0, this.jumpBuffer = 0
        this.wallTouch = 9, this.wallN = new mt.Vector3
        this.wallJumpCd = 0, this.mantleCd = 0, this.dashCd = 0
        this.airJumps = 1, this.blockCd = 0, this.landGraceT = 0
        this.sprintToggle = false, this.lastGround = true
        this.airT = 0, this._sprinting = false, this._aiming = false
        this._mv = { x: 0, y: 0 }
    }

    update(dt) {
        // Movement input -> camera-relative
        // Jump buffer, coyote time, wall touch
        // Jump, wall jump, air jump
        // Dash (ground slide / air dash)
        // Gravity with grapple modifier
        // Mantle attempt
        // Speed cap: 48 units/s
        // Physics step: world.moveBody(body, dt)
        // Out-of-bounds: teleport to start, 20 damage
        // Landing impact -> landDip, shake, rumble
        // Health regen: 11/s after 4.5s no damage, only when not sprinting and not grappling
        // Grapple stamina drain/regen
        // Bob/footsteps
        // Camera update
        // Grenade charge/throw
        // Weapon switching
        // Katana quick-slash
        // Weapon animation
    }
}
```

### Player State Serialization: `ta` function
```javascript
function ta(n, t, e = {}) {
    let s = n.body, i = n.grapple, o = i && i.state !== "idle"
    let a = [
        +s.pos.x.toFixed(2), +s.pos.y.toFixed(2), +s.pos.z.toFixed(2),
        +n.yaw.toFixed(2), +n.pitch.toFixed(2),
        t,  // weaponIndex
        (n.crouching ? 1 : 0) | (n.sliding ? 2 : 0) | (n.isBlocking ? 4 : 0) |
        (n._aiming ? 8 : 0) | (s.onGround ? 16 : 0) | (e.firing ? 32 : 0) |
        (n.alive ? 64 : 0) | (o ? 128 : 0) | (n.parryWindow ? 256 : 0) |
        (e.idle ? 512 : 0) | (e.untouched ? 1024 : 0) | (e.away ? 2048 : 0) |
        (e.shield ? 4096 : 0),
        Math.round(n.hp),
        +s.vel.x.toFixed(1), +s.vel.y.toFixed(1), +s.vel.z.toFixed(1)
    ]
    if (o) a.push(+i.hook.x.toFixed(1), +i.hook.y.toFixed(1), +i.hook.z.toFixed(1))
    return a
}
```

**Wire format:** 14 floats normal, 17 floats when grappling. Bitmask at index 6 encodes 13 boolean states.

## 9. Remote Player: `Vi` class

```javascript
Vi = class {
    constructor(t, e, s, i, o) {
        this.ctx = t, this.id = e, this.name = s || "doodle"
        this.team = i, this.ink = o, this.isLocal = false
        this.alive = true, this.parryWindow = false, this.idle = false
        this.idleSince = 0, this.untouched = false, this.away = false
        this.hp = 100, this.maxHp = 100, this.speed = 0
        this.weaponIndex = 0
        this.body = { pos: new St.Vector3(0,-50,0), vel: new St.Vector3, halfW: .35, height: 1.75, onGround: true }
        this.center = new St.Vector3, this.eye = new St.Vector3
        this.forward = new St.Vector3(0,0,-1), this.right = new St.Vector3(1,0,0)
        this.yaw = 0, this.pitch = 0
        this.crouching = false, this.sliding = false
        this.blocking = false, this.aiming = false, this.firing = false
        this.snapA = null, this.snapB = null
        this.phase = 0, this.walk = 0, this.flashT = 0, this.deadT = 0
        this.kills = 0, this.deaths = 0, this.score = 0
        this.mat = gt({ ink: o, shadeScale: 0, shadeBias: 1 })
        this.solid = gt({ ink: k.BLACK, fill: true, side: St.DoubleSide })
        this.T = { weapon: "rifle", scale: 1, hat: "cap",
                   build: { bodyW: 1, headS: 1, limbR: .033 }, blockRadius: 0 }
        this.hit = qi
        this.hitSpheres = qi.map(() => new St.Vector3)
        this.vel = new St.Vector3, this.grappling = false, this.gPoint = new St.Vector3
    }

    push(stateArray, timestamp) {
        // Interpolates between snapA and snapB
        // snapA = { p, yaw, pitch, t }
        // snapB = { p, yaw, pitch, t }
        // Interpolation factor a = clamp((now - snapA.t) / (snapB.t - snapA.t), 0, 1)
        // Position: lerp(snapA.p, snapB.p, a) + vel * max(0, now - snapB.t)
        // Yaw/pitch: shortest-path yaw interpolation
        // Body pos: exponential smoothing: pos.lerp(target, 1 - exp(-dt * 22))
    }

    update(dt, now) {
        // Flash timer
        // Snap interpolation
        // Body height: crouching ? 1.05 : 1.75
        // Eye height: crouching ? 0.88 : 1.6
        // Forward/right vectors from yaw/pitch
        // Animation: _animate(dt)
        // Hit sphere updates from part world matrices
        // Rope/hook visibility if grappling
    }

    _animate(dt) {
        // Walk cycle: leg/shin rotations from sin/cos of phase
        // Phase speed: i * 2.2 + (i > 0.4 ? 3 : 0)
        // Aiming blend: arm rotation scales
        // Blocking pose: arms crossed
        // Katana pose: different arm layout
        // Torso/hips bob
        // Head tracks local player position
    }

    ragdoll(dir, headshot) {
        // Detaches root, applies impulse, blood pool, debris
        // Corpse lifetime: 7-10 seconds
    }
}
```

## 10. Enemy System: `mi` class

```javascript
mi = class {
    constructor(ctx) {
        this.ctx = ctx
        this.enemies = [], this.alive = 0
        this.projectiles = new _o(this)  // projectile pool
        this.onKill = null, this.onBoss = null
        this._sepT = 0, this._slot = 0
        this.mods = { speed: 1, damage: 1 }
    }
}
```

### Enemy Types (`w0` array)
```javascript
w0 = [
    { t: "grunt", from: 1, w: 10 },
    { t: "rusher", from: 2, w: 6 },
    { t: "bomber", from: 3, w: 3 },
    { t: "sniper", from: 3, w: 4 },
    { t: "flyer", from: 4, w: 4 },
    { t: "heavy", from: 5, w: 4 },
    { t: "shield", from: 6, w: 4 }
]
```
`from` = minimum wave to spawn. `w` = spawn weight.

### Wave Modifiers (`pa` array)
```javascript
pa = [
    { name: "", apply: () => { mods.speed = 1, mods.damage = 1 } },
    { name: "CAFFEINATED - they move fast", apply: () => { mods.speed = 1.35, mods.damage = 0.85 } },
    { name: "HEAVY INK - they hit harder", apply: () => { mods.speed = 0.9, mods.damage = 1.4 } },
    { name: "SWARM - more of them, thinner", apply: () => { mods.speed = 1.15, mods.damage = 0.9 } }
]
```

### Boss Types
```javascript
bossTypes = ["doodler", "eraser", "inkblot"]
// Every 5 waves: wave 5, 10, 15, ...
```

### Spawn Selection
```javascript
function pickSpawn(type) {
    // Flyer: random angle, 22-32 units away, elevated
    // Boss: far from player >20 units, with line-of-sight check
    // Normal: prefer 14-48 units away, not in line of sight
    // Fallback: random point in circle with ground check
}
```

## 11. Weapons System

### Base Weapon Class: `Si` class
```javascript
Si = class {
    constructor(t) {
        this.ctx = t
        this.root = new ut.Group
        this.scale = .46
        this.root.scale.setScalar(this.scale)
        this.root.visible = !1
        this.basePos = new ut.Vector3(.2, -.17, -.36)
        this.baseRot = new ut.Vector3(0, 0, 0)
        this.aimPos = new ut.Vector3(0, -.13, -.3)
        this.adsFov = 60
        this.isGun = false
        this.recoil = new Ds(260, 18)   // position recoil spring
        this.recoilRot = new Ds(220, 16) // rotation recoil spring
        this.swayPos = new ut.Vector3
        this.swayRot = new ut.Vector3
        this.aimAmt = 0, this.sprintAmt = 0
        this.equipT = 0
    }

    animate(t, e) {
        // Sway from look delta
        // Aim interpolation
        // Bob from walk cycle
        // Sprint bob
        // Recoil decay
        // Equip animation (cubic ease out)
        // Position: basePos.lerp(aimPos, aimAmt) + sway + recoil + bob + sprint offset
        // Rotation: baseRot * (1-aim) + swayRot + recoilRot + sprint + landDip
    }
}
```

### Weapon Definitions (`zr` object)
```javascript
zr = {
    rifle: {
        name: "RIFLE", hint: "auto \xB7 put the red dot on them",
        kind: "rifle", magSize: 35, reserve: 175, maxReserve: 350,
        interval: 1/11, damage: 24, headMul: 2.6,
        pellets: 1, spread: .016, adsSpread: .0034,
        spreadKick: .009, spreadMax: .075,
        adsFov: 58, sight: [0, .12, -.05, .3],
        camKick: [.009, .0034],
        modelKick: [.25, .3, 2.4, -3.2, .9, 1.2],
        fovKick: 1.2, reloadDur: 1.45, reloadType: "mag",
        auto: true, falloff: null,
        tracer: .02, flashScale: 1, sound: "shot",
        shell: [.02, k.ORANGE]
    },
    shotgun: {
        name: "SHOTGUN", kind: "shotgun",
        magSize: 6, reserve: 36, maxReserve: 72,
        interval: 1/1.2, damage: 27, headMul: 2.2,
        pellets: 8, spread: .07, adsSpread: .04,
        spreadKick: .03, spreadMax: .12,
        adsFov: 50, sight: [0, .1, -.04, .25],
        camKick: [.025, .012],
        modelKick: [.4, .5, 3.5, -5, 1.5, 2],
        fovKick: 2.5, reloadDur: 2.2, reloadType: "one",
        auto: false, falloff: [0, 20],
        tracer: .025, flashScale: 1.4, sound: "shot",
        shell: [.025, k.ORANGE]
    },
    sniper: {
        name: "SNIPER", kind: "sniper",
        magSize: 5, reserve: 25, maxReserve: 50,
        interval: 1/.75, damage: 230, headMul: 3.5,
        pellets: 1, spread: .001, adsSpread: 0,
        spreadKick: .002, spreadMax: .015,
        adsFov: 40, sight: [0, .08, -.03, .2],
        camKick: [.04, .008],
        modelKick: [.6, .8, 5, -8, 2, 3],
        fovKick: 4, reloadDur: 2.8, reloadType: "mag",
        auto: false, falloff: null,
        tracer: .04, flashScale: 2, sound: "sniper",
        shell: [.03, k.BLACK]
    },
    revolver: {
        name: "REVOLVER", kind: "revolver",
        magSize: 6, reserve: 30, maxReserve: 60,
        interval: 1/3.5, damage: 151, headMul: 2.8,
        pellets: 1, spread: .008, adsSpread: .002,
        spreadKick: .006, spreadMax: .04,
        adsFov: 55, sight: [0, .1, -.04, .28],
        camKick: [.03, .01],
        modelKick: [.35, .4, 3, -4.5, 1.2, 1.8],
        fovKick: 2.8, reloadDur: 2, reloadType: "mag",
        auto: false, falloff: [30, 120],
        tracer: .03, flashScale: 1.6, sound: "shot",
        shell: [.025, k.BLACK]
    }
}
```

### Katana Weapon: `Li` class
```javascript
Li = class extends Si {
    constructor(t) {
        super(t)
        this.name = "KATANA"
        this.hint = "slash \xB7 hold aim to block & return bullets"
        this.kind = "katana"
        this.basePos.set(.27, -.25, -.4)
        this.baseRot.set(.75, .15, -.35)
        this.slashT = 0, this.slashDur = .27
        this.combo = 0, this.comboT = 0
        this.blocking = false, this.blockT = 0, this.blockAmt = 0
        this.hitDone = false, this.cooldown = 0
        this.damage = 75
        this.deflectKick = 0, this.parrySwing = 0, this.parryDir = 1
        this.bloodLevel = 0
    }

    startSlash(t) {
        this.slashT = this.slashDur
        this.hitDone = false
        this.combo++
        this.comboT = .9
        this.cooldown = this.slashDur + .06
        D.katanaSwing()
        this.ctx.player.kickFov(2)
        if (t.sprinting || !t.grounded) this.ctx.player.lunge(5.5)
        // Spawn 9 tracer lines in arc
    }

    update(t, e) {
        // Cooldown decay
        // Combo timeout (0.9s)
        // Deflect/parry decay
        // Block detection: aim held, no fire, not on cooldown
        // Block animation: lerp to blockPos/blockRot
        // Parry swing animation
        // Slash animation: cubic bezier arc
        // Hit detection at 32% of slash duration
        // Auto-slash on fire if combo > 0
    }

    doHit(t, e) {
        // Direction e = -1 or 1 (alternating combo)
        // Sphere-sweep against enemies in arc
        // Blood smears on blade (6 shapes, alternating sides)
    }
}
```

## 12. Grenade System

### Grenade Object
```javascript
{
    mesh: Group,           // sphere + torus + cylinder
    pos: Vector3,
    vel: Vector3,
    ang: Vector3,          // angular velocity
    fuse: 1.7,
    mine: boolean,         // true if thrown by remote player
    rest: boolean,         // settled on ground
    tick: number
}
```

### Grenade Physics
```javascript
// Gravity: 22 units/s²
// Bounce: velocity reflected on normal, multiplied by 0.55
// Rest: velocity length < 1.2 and normal.y > 0.5
// Fuse: 1.7 seconds
// Explosion radius: 6.4 units
// Player damage: 10 + 34 * (1 - dist / (6.4 * 0.95))
// Enemy damage (mine): 12 + 50 * (1 - dist / (6.4 * 0.95))
// Knockback: 9 units toward explosion center
// Ticks faster when fuse < 0.8 (14Hz vs 5Hz)
```

### Arc Prediction (`updateNadeArc`)
- 26 dot meshes + 1 landing marker
- Simulates 1/30s steps, max 52 steps
- Raycasts against world for collision
- Dots visible from step 6 onward, every other step
- Scale: 0.8 + charge * 0.6

## 13. Grapple System

### Grapple State
```javascript
grapple = {
    state: "idle" | "fly" | "on",
    anchor: Vector3,
    hook: Vector3,
    from: Vector3,
    len: number,
    flyT: number,
    flyDur: number,
    enemy: enemy | null,
    mover: prop | null,
    t: number,
    swingT: number,
    blockedT: number,
    cd: number
}
```

### Target Priority
1. Enemy hit sphere (closest, max 50 units)
2. Prop mover (radius + .3 + dist * .012)
3. Enemy center (line-of-sight check)
4. Prop ring (grapple ring object in level)
5. World geometry raycast (max 75 units)

### Stamina Constants
```javascript
grapStam: 0-1
Drain (fly/swing): Lr (constant)
Regen ground: Gr
Regen air: Cr
Stam pause after detach: Yn
Minimum to fire: Br
```

### Yank
- When grapple attaches to enemy: `enemies.yank(enemy, playerCenter)`
- Score +30, text "YANKED"
- Pulls enemy toward player

## 14. Camera System

### Camera Parameters
```javascript
FOV:
  Base: 82
  Sprint: +3
  Slide: +4
  Grapple: +3
  Speed (>7): +clamp((speed-7)/16, 0, 1) * 8
  ADS: weapon.adsFov (rifle=58, sniper=40)

Eye Height:
  Standing: Oo = 1.6
  Crouching: Kr = 0.88

Recoil Springs:
  recoilPitch: ss(190, 17)
  recoilYaw: ss(190, 17)
  fovKick: ss(220, 14)
  landDip: ss(170, 15)

Shake:
  Decay: 7
  Max: 1.2
  Random offset: ±0.07 * shakeAmt
```

### Camera Position
```
eye = body.pos + (0, eyeH + landDip * 0.07 + bob * 0.03 * bobAmt, 0)
center = body.pos + (0, height * 0.55, 0)
camera.position = eye + right * (cos(bobPhase*0.5) * 0.018 * bobAmt) + shake offset
camera.rotation = (pitch + recoilPitch + shake, yaw + recoilYaw + shake, roll + sin(bobPhase*0.5) * 0.004 * bobAmt)
```

## 15. Effects Manager: `Hi` class

```javascript
Hi = class {
    constructor(t, e) {
        this.scene = t, this.world = e
        this.drops = this._pool(new bt.IcosahedronGeometry(.5, 1), 700)
        this.strokes = this._pool(new bt.BoxGeometry(1, 1, 1), 600)
        this.splats = [0..7].map(s => this._pool(Mr(s), 200, true))
        this.holes = this._pool(new bt.CircleGeometry(.5, 8), 260, true)
        this.particles = [], this.debrisList = [], this.growing = []
        this.shakeAmt = 0, this.gibsAlive = 0
    }

    strokeBurst(pos, ink, count, life, opts) { /* ink strokes */ }
    blood(pos, dir, amount, opts) { /* blood spray */ }
    bloodPool(pos, radius, ink) { /* ground blood decal */ }
    debris(mesh, pos, vel, ang, opts) { /* physics debris */ }
    tracer(from, to, ink, width, life) { /* bullet trail */ }
    boom(pos, radius) { /* explosion ring */ }
    smoke(pos, dir, size) { /* smoke puff */ }
    update(dt) { /* update particles, debris, splats */ }
}
```

## 16. Prop Manager: `Ei` class

```javascript
Ei = class {
    constructor(t) {
        this.ctx = t
        this.list = []
        this.onKick = null, this.onRest = null
        this.thudT = 0
    }

    attach(t) {
        // Spawns all props from level data
        // Each prop: { id, def, group, half, mass, snap, kind, ink, radius,
        //              body, rot, ang, rest, box, seq, mine, restT, lostT, snapQ, hitT }
    }

    reset() { /* Respawn all props to initial state */ }

    kick(t, e, s = true) {
        // Lift prop, apply velocity, angular velocity
        // If mine: seq++, broadcast "pk"
    }

    hit(t, e, s, i) {
        // Throttle: < 60ms between hits
        // Force = (3 + dist * .12) / mass^0.6
        // Direction: horizontal from hit normal, vertical = force * .4 + (rapid ? .15 : 1) / mass
        // Effects: strokeBurst, audio hit
    }

    raycast(t, e, s = 300) { /* Sphere/ray test against prop colliders */ }
    blast(origin, radius) { /* Explosion damage to props */ }
    inArc(origin, dir, maxAngle, maxDist) { /* Cone test for shotgun */ }
    bat(origin, dir) { /* Katana melee hit test */ }
}
```

### Prop Kinds
```
barrel, crate, cactus, crateB, totem, bamboo, urn, pinata, nest
```

### Breakable Behavior
```javascript
function fo(n, t, e, s = false) {
    if (!n.alive) return
    n.alive = false, ie.removeBox(n.box)
    // Spawn debris children with physics
    // Kind-specific effects:
    //   pinata: ink burst, explosion, spawn health pickups, +25 score
    //   cactus: green blood, green pool
    //   nest: orange/bird particles, negative gravity
    //   bamboo: green particles, gravity 6
    //   urn: orange particles, smoke, ground ink pool
    //   default: ink color particles + smoke
    // Broadcast "brk" if networked
}
```

## 17. Navigation Mesh: `Ks` class

```javascript
Ks = class {
    constructor(world, bounds, cell = 1) {
        this.world = world
        this.cell = cell
        this.minX = bounds.minX, this.minZ = bounds.minZ
        this.nx = ceil((maxX - minX) / cell)
        this.nz = ceil((maxZ - minZ) / cell)
        this.nodes = []
        this.cells = new Array(nx * nz).fill(null)
        this._gen = null, this._searchId = 0
    }

    build() { /* Generate navmesh from world geometry */ }
    findPath(start, end) { /* A* or Dijkstra on navmesh */ }
    getNearest(pos) { /* Find nearest walkable node */ }
}
```

## 18. HUD Manager: `Oi` class

```javascript
Oi = class {
    constructor(root) {
        this.root = root  // #hud element
        root.innerHTML = `...`  // Full HUD template
        this.el = {
            crosshair, scope, focusmark, focusmeter, gret, gstam,
            hitmarker, dmg, score, combo, wave, modifier, left, timer,
            hpfill, hpnum, mag, reserve, reloading, tally, weapon, hint,
            slots, tip, msg, msgsub, killfeed, screen, panel, nades,
            bossbar, bossname, bossfill, pvpscore, board, gstamfill
        }
    }

    setFocusMeter(show, frac, ready, label = "KATANA")
    setGrenades(count)
    setDevice(pad)
    setTrackpad(tp)
    key(action)  // returns display string for action
    setScope(on)
    setCrosshairMode(mode)
    setAds(on)
    grappleTarget(state)  // 0=off, 1=on, 2=attached
    hitmarker(kill, crit)
    setAmmo(mag, reserve, magSize, reloading)
    setKatana()
    setSlots(slots)  // [{name, active, ammo}]
    setHealth(hp, maxHp)
    setBoard(html)
    setPvpScore(html)
    setWave(wave, left)
    setModifier(text)
    setTimer(text)
    setScore(score, combo)
    setWeapon(name, hint)
    setBoss(name, frac)
    tip(html, duration = 5)
    message(main, sub, duration = 2.2)
    kill(text, points)  // adds to killfeed
    damageFrom(angle)  // damage indicator arrow
    showScreen(html) / hideScreen()
    setGameplayVisible(visible)
    update(dt)  // fades tips/messages
}
```

## 19. Network Layer: `Fi` class

### Protocol Constants
```javascript
Jr = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)
Re = Jr ? "doodledev-" : "doodledistrict-"
la = 24  // max public lobby IDs per prefix
Zr = ["", "-1", "-2", "-3"]           // private lobby variants
Qr = ["", "-1", "-2", "-3", "-4", "-5"] // join variants
Qt = 4  // protocol version
oa = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  // no O, 0, 1, I
```

### Peer ID Format
```
doodledistrict-PUB0          (public lobby 0)
doodledistrict-ABCD1         (private lobby ABCD, gen 1)
doodledev-PUB0               (localhost)
```

### Connection Timeouts
```javascript
i0 = 14000  // join timeout
na = 11000  // quick join scan timeout
o0 = 12000  // peer creation timeout
n0 = 12000  // direct link timeout
a0 = 6      // max link retries
r0 = 0.2    // max RTT for quick join priority (200ms)
```

### STUN/TURN Config
```javascript
s0 = {
    debug: 0,
    config: {
        iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            { urls: "stun:stun.cloudflare.com:3478" },
            { urls: ["turn:openrelay.metered.ca:80", "turn:openrelay.metered.ca:443",
                     "turn:openrelay.metered.ca:443?transport=tcp"],
              username: "openrelayproject", credential: "openrelayproject" }
        ]
    }
}
```

### Message Validation: `Uo` function
```javascript
function Uo(n) {
    // Returns true if message structure is valid
    // Type-specific validation:
    //   ps: array of 11 or 14 numbers, weaponIndex 0-4, bitmask < 8192
    //   shots: { k: string in [rifle,shotgun,sniper,revolver,katana], e: number[] length <= 240, divisible by 3 }
    //   pdmg: { src: string in Us, amount: number > 0 <= max, from: [x,y,z] }
    //   nade: { pos: [x,y,z], vel: [x,y,z] }
    //   pdead: { killer: string|null, dir: [x,y,z]|null, how: string|null }
    //   pk/pr: { i: number < 1e5, s: number, p: [x,y,z], v: [x,y,z], a: [x,y,z], q: [x,y,z,yaw,pitch] }
    //   brk/take: { id: number }
    //   parry: { ret: boolean }
}
```

### Rate Limiting: `Hs` class
```javascript
Hs = class {
    allow(who, what, cost, per, window) {
        // Token bucket: who|what -> timestamps
        // Returns true if within rate limit
    }
    repeated(who, what) {
        // Strike system: 3 strikes in 30s = violation
        // Strike cooldown: 6s between strikes
    }
}
```

### Anti-Cheat Validation: `ia` function
```javascript
function ia(guard, msg, who, hostId, onViolate) {
    // Health check: ps.health > 120 -> violation
    // Fire rate check: shots count within Xr limits
    // Grenade rate: 9 per 3s normal, 16 per 15s long
    // Damage rate: per-weapon limit from Us max * 2 per 2s
}
```

## 20. Network Protocol Reference

### Host → Client Messages

| Type | Data | Description |
|------|------|-------------|
| `welcome` | `{hostId, code, isPublic, players, max, inMatch, hostName, map, token, v}` | Sent on connection accept |
| `lobby` | `{players: [{id, name, v}], hostId, isPublic, map, shown, next, gen}` | Lobby state broadcast |
| `start` | `{late, spawns: {peerId: spawnIndex}, map, broken: [id], props: object}` | Game start |
| `pickup` | `{id, kind, pos: [x,y,z]}` | Spawn pickup |
| `taken` | `{id}` | Remove pickup |
| `score` | `[{id, name, kills, deaths}]` | Scoreboard sync |
| `end` | `{id, name}` | Match over, winner |
| `clock` | `{left: seconds, on: boolean}` | Timer sync |
| `feed` | `{text}` | Kill feed message |
| `kick` | `{reason}` | Player kicked |
| `backtolobby` | `{}` | Return to lobby |
| `refused` | `{reason, code, players, max, inMatch, hostName, map, token, v}` | Connection refused |
| `startack` | `{why}` | Start request response |
| `peerblocked` | `{id}` | Peer blocked notification |

### Client → Host Messages

| Type | Data | Description |
|------|------|-------------|
| `stay` | `{}` | Accept welcome |
| `lobby` | `{name}` | Join lobby request |
| `startreq` | `{}` | Request game start |
| `ps` | state array (14 or 17 floats) | Player state, throttled 50ms |
| `shots` | `{k, e: [x,y,z,...]}` | Shot tracers |
| `nade` | `{pos, vel}` | Grenade throw |
| `pdmg` | `{src, amount, from, crit}` | Damage dealt to enemy |
| `pdead` | `{killer, dir, over, how, crit}` | Player death |
| `take` | `{id}` | Pickup collection request |
| `brk` | `{id}` | Breakable destroyed |
| `parry` | `{ret, by}` | Katana parry result |
| `cut` | `{}` | Grapple rope cut |
| `stat` | `{rtt, links}` | Connection stats |
| `fell` | `{}` | Fell off map |

### Direct Client → Client Messages
- `ps`, `shots`, `nade`, `pdead`, `brk`, `pk`, `pr` - sent via fast data channel if direct connection exists, otherwise relayed through host.

### Fast Channel
- Unreliable, ordered: false, maxRetransmits: 0
- Label: "fast"
- Max message: 65536 bytes
- Used for `ps` and `shots` with sequence numbers (`s` field)

## 21. Audio System

### Procedural Sound Effects
- `jump()`, `wallJump()`, `land(impact)`, `slide()`, `dash()`
- `footstep(volume)`, `grappleFire()`, `grappleHit()`, `grappleRelease()`
- `winded()`, `empty()`, `mantle()`, `katanaSwing()`, `focusIn()`
- `focusSlash()`, `hit()`, `kill(crit)`, `enemyDie()`, `explosion()`
- `smash()`, `shell()`, `shieldHit()`, `pickup()`, `wave()`, `waveClear()`, `bossRoar()`

### Music
- Tunes: "district", "mexico"
- `musicOn(on)`, `reelLoop(on)`

## 22. Map System

### Map Builder: `Bo` function
```javascript
function Bo(n, t, e, s = "district", i = {}) {
    // Returns level object with:
    // { key, style, bounds, spawns, arenaSpawns, pickups, breakables,
    //   rings, grappleMovers, meshes, animated, snipers, playerStart }
}
```

### Map Keys
- `district` - Streets, rooftops, fire escapes (bounds: ±55, height 30-68)
- `jungle` - Canopies, vines, lost temple
- `mexico` - Hidden, referenced in tune names and pickup names ("TACO")

### Style Objects
```javascript
{
    paper: [r, g, b],  // background color
    lines: 0 | 1,      // 0 = ruled paper, 1 = graph paper
    inks: [6 x [r,g,b]] // BLUE, RED, BLACK, ORANGE, GREEN, PINK
}
```

## 23. Game Loop

### Frame Structure
```javascript
function Ua(now, fixed = true) {
    let dt = min(0.05, (now - lastTime) / 1000)
    input.update(dt)

    let state = game.state
    // State machine: start, play, dying, dead, lobby, over, pause

    if (state === "play" || state === "dying") {
        let timeScale = hitstopT > 0 ? hitstopScale : (focus.active ? 0.26 : 1)
        let t = dt * timeScale

        if (state === "play" && !ffa) updateFocus(t)

        if (["play", "dying"].includes(state)) {
            player.update(t)
            enemies.update(t)
            props.update(t)
            effects.update(t)
            updatePickups(t)
            updateNetwork(t)
            updateWaves(t)
            updateCombo(t)

            if (state === "dying") {
                deathT += t
                if (ffa) {
                    // Respawn timer
                } else {
                    // Solo: game over after 1.7s
                }
            }
        }

        // HUD updates
    }

    // Render
    if (state === "play" || state === "dying") {
        renderer.render(time, {
            hurt: player.hurtFx,
            flash: player.flashFx,
            slow: timeScale < 1 ? 1 : 0,
            lowHp: player.alive && player.hp < 30 ? 1 - player.hp / 30 : 0
        })
    }
}
```

### Tick Rate
- Fixed timestep: 50ms max per frame, up to 5 sub-steps per 250ms interval
- Network update: every 50ms for player state
- Effects update: every frame with `dt`
- Physics: single step per frame with `dt` capped at 0.05s

## 24. Wave System

### Wave Configuration
```javascript
function startWave(n) {
    game.wave = n
    game.queue = []
    game.spawnT = 2
    game.intermission = 0
    game.boss = null

    // Wave modifier
    let modifierIndex = n > 0 && n % 5 === 0 ? 0 : (n < 4 ? 1 : n < 6 ? 3 : random(pa.length))
    let mod = pa[modifierIndex]
    mod.apply()
    enemies.mods.damage *= 1.2

    // Enemy count scaling
    let isSwarm = mod.name.startsWith("SWARM")
    game.maxAlive = min(4 + floor(n * 0.9) + (isSwarm ? 3 : 0),
                        (isSwarm ? 22 : 18) + floor(n / 3))
    let totalEnemies = round(min(5 + n * 2, 32 + n) * (isSwarm ? 1.35 : 1))

    // Boss every 5 waves
    if (n > 0 && n % 5 === 0) {
        totalEnemies = 7 + n
        game.maxAlive += 2 + floor(n / 5)
        game.queue.push(bossTypes[(floor(n / 5) - 1) % bossTypes.length])
    }

    // Build spawn queue from weighted random
    // Spawn initial pickups (5 ammo, 2 health)
    // Checkpoint every 5 waves
}
```

### Spawn Selection
```javascript
function pickSpawn(type) {
    // Flyer: elevated, 22-32 units from player
    // Boss: far from player >20, line-of-sight check
    // Normal: 14-48 units, prefer hidden (no line-of-sight)
    // Fallback: random point in circle with ground check
}
```

## 25. Damage Model

### Damage Values (`Us` object)
```javascript
Us = Object.freeze({
    rifle: [36, 24],     // max damage, rate limit per 2s
    shotgun: [27, 30],
    sniper: [230, 5],
    revolver: [151, 10],
    katana: [60, 9],
    grenade: [140, 6]
})
```

### Fire Rate Limits (`Xr` object)
```javascript
Xr = {
    sniper: [8, 3000],    // max shots, window ms
    rifle: [40, 2000],
    shotgun: [50, 2000],
    revolver: [14, 2000],
    katana: [40, 2000]
}
```

### Hit Zones (`qi` array)
```javascript
qi = [
    ["head", .3], ["torso", .33], ["hips", .2],
    ["armL", .11], ["armR", .11], ["foreL", .1], ["foreR", .1],
    ["legL", .13], ["legR", .13], ["shinL", .11], ["shinR", .11]
]
```

### Headshot Multipliers
- Rifle: 2.6x
- Shotgun: 2.2x
- Sniper: 3.5x
- Revolver: 2.8x

## 26. Dev Mode

### Dev Code
```javascript
ha = "evdevops"
```
Entered in code box on main menu. Sets `doodle_dev = "1"` in localStorage.

### Dev Mode Effects
```javascript
to = localStorage.getItem("doodle_dev") === "1"
fn = () => to ? ks : Go  // returns full map list including test maps
```

### Localhost Detection
```javascript
f0 = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)
if (f0) {
    window.__game = {
        ctx: At, game: y, player: B, enemies: Bt, nav: Ys,
        world: ie, level: Et, hud: A, effects: Ht, input: nt,
        net: u, remote: Rt, lobby: F, scores: zt, props: Wt, setLevel: pn
    }
}
```

## 27. Data Models & Storage

### localStorage Keys
```javascript
doodle_sens      // sensitivity 25-250
doodle_invert    // "1" if invert Y
doodle_trackpad  // "1" if trackpad mode
doodle_music     // "0" if music off
doodle_name      // player name (max 14 chars)
doodle_best      // best score (number)
doodle_checkpoint // highest wave reached (number)
doodle_map       // selected map key
doodle_dev       // "1" if dev mode active
doodle_vis       // "public" if last lobby was public
doodle_log       // moderation log (JSON array, max 500 entries)
```

### Moderation Log Schema
```javascript
{
    at: ISO timestamp,
    name: string,       // player name
    peerId: string,     // peer ID
    lobby: string,      // lobby code
    reason: string,     // violation reason
    action: string      // action taken
}
```

## 28. Replication Checklist

To replicate this game, you need:

1. **Three.js r170** with ES module import map
2. **Custom GLSL shaders**:
   - Ink vertex/fragment shader (`gt` material)
   - Post-processing fragment shader with edge detection, hatching, paper grain
3. **Physics**: Spatial hash AABB system with raycasting (`hi` class)
4. **Player controller**: FPS with coyote time, wall jump, double jump, mantle, slide, air dash, grapple (`Pi` class)
5. **Weapon system**: 5 weapons with distinct fire patterns, recoil, ADS, reload (`Si` base + `zi`, `_i`, `Ai`, `Li` classes)
6. **Enemy AI**: Wave-based spawning, pathfinding (navmesh), state machine (`mi` class)
7. **Grenade system**: Physics projectile with arc prediction
8. **Katana system**: Parry window, focus dash chain, combo
9. **PeerJS networking**: Host-authoritative P2P with signaling (`Fi` class)
10. **Custom protocol**: 20+ message types with validation (`Uo`) and rate limiting (`Hs` class)
11. **Procedural audio**: Web Audio API sound effects and music
12. **HUD**: HTML overlay with ink-styled CSS (`Oi` class)
13. **Map system**: Data-driven level loading with style theming (`Bo` function)
14. **Prop system**: Physics props with breakable behaviors (`Ei` class)
15. **Effects system**: Object pools for blood, strokes, debris, particles (`Hi` class)

### Critical Implementation Details
- Render target: HalfFloat RGBA + Float depth, NearestFilter, no mipmaps
- Post-pass: full-screen quad, orthographic camera, depth-aware effects
- Network state: 14-float array, bitmask packing, 50ms throttle
- Interpolation: exponential smoothing with `1 - exp(-dt * 22)`
- Anti-cheat: token bucket rate limiting, strike system, host authority
- Physics: spatial hash with cell size configurable, raycast and overlap tests
- Input: action-based abstraction supporting keyboard+mouse and gamepad with same action names
- Character: procedural rig from `Os` function with hit sphere data
- Weapons: procedural models from `Lo` function, sway/recoil/animation in `Si.animate`
- Grenades: physics with bounce, rest detection, fuse timer, arc prediction
- Grapple: 3-state machine (idle/fly/on) with stamina and rope rendering
- Camera: spring-based recoil, FOV kick, land dip, shake, bob
- Maps: built from `vr` function with walls, spawns, pickups, breakables, rings, grapple movers
- Audio: procedural Web Audio sounds, no external samples
- UI: HTML template strings rendered into #screen/#panel, CSS-animated HUD
