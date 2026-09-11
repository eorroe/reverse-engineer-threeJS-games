import {soloRosterProgressForState} from './solo-roster-fill.js';
import {MARKET_INTERIOR} from './district-interior-layout.js';
import {consumableStatus,CONSUMABLES} from './consumable-policy.js';
import {bodyTurnLimited,constrainBodyLook} from './aim-facing.js';
import {isStormExposed} from './storm-exposure.js';
import {stanceWalkSpeed,stanceAccuracy,hasStanceProfile,stanceFootprint,stanceCollisionProbes,stanceRayHit,stanceRadius,stanceHeight,stanceEyeHeight,stanceHitSpheres,updateStance,clearStance,validStance} from './stance.js';
import {beginTraversal,advanceTraversal,validTraversal,sampleTraversal} from './traversal.js';
import {createWindowHealth,validWindowHealth,windowHits,movePastWindows,collisionPanels,doorHits,rayWindow,panelsOutsideClearance} from './window-physics.js';
import {cleanUsername,makeMatchUsernames} from './player-identity.js';
import {weaponFinishSeed,validFinishSeed} from './weapon-cosmetics.js';
import {assertPlayableCharacterAssignment,assertValidCharacterAssignment,MAX_ROSTER_BODIES,getRosterCharacter} from './character-roster.js';
// Solo match rules are independent of Three and the DOM. World queries use the
// same geometry as rendering; neither bots nor bullets get a second map.
import { CONTAINER_GEOMETRY } from '../assets/loot/container-geometry.js';
import {rayCasesDistance,caseSupport,caseActorOverlap,movePastOpenCases} from './case-physics.js';
import {updateDescent,inDescent,clearDescent,REDEPLOY_CLEARANCE,insertionSecondsRemaining} from './descent.js';
import {lootCollectible,ejectionClear,LOOT_EJECTION} from './loot-ejection.js';
import {botPreference,safeZoneGoal,validStormGoal,walkSegment,indoorStairGuidance,stairGuidance,navigationTarget,validNavigation,navigationBudget,validNavigationSchedule,navigationCapacity,navigationAvoids,validNavigationAvoid} from './bot-navigation.js';
export const FIXED_DT = 1 / 60;
export const WEAPONS = Object.freeze({
  scar: { name: 'SCAR-H', damage: 29, interval: .13, magazine: 20, reload: 2.0, range: 165, falloff: 70, spread: .017, pellets: 1 },
  smg: { name: 'AK compact SMG', damage: 13, interval: .085, magazine: 30, reload: 1.6, range: 105, falloff: 32, spread: .024, pellets: 1 },
  'scoped-rifle': { name: 'Scoped M4 rifle', damage: 22, interval: .10, magazine: 28, reload: 1.9, range: 150, falloff: 60, spread: .014, pellets: 1 },
  sidearm: { name: 'Desert Eagle', damage: 23, interval: .24, magazine: 12, reload: 1.15, range: 80, falloff: 25, spread: .014, pellets: 1 },
  rifle: { name: 'AK assault rifle', damage: 23, interval: .11, magazine: 28, reload: 1.85, range: 150, falloff: 60, spread: .018, pellets: 1 },
  scatter: { name: 'Gale scattergun', damage: 11, interval: .85, magazine: 6, reload: 2.2, range: 35, falloff: 12, spread: .085, pellets: 8 },
  marksman: { name: 'Longspur', damage: 68, interval: 1.10, magazine: 5, reload: 2.4, range: 230, falloff: 130, spread: .007, pellets: 1 },
});
const PHASES = [
  { wait: 48, close: 55, fraction: .72, damage: 1 },
  { wait: 35, close: 48, fraction: .46, damage: 2 },
  { wait: 25, close: 42, fraction: .25, damage: 4 },
  { wait: 18, close: 35, fraction: .11, damage: 7 },
  { wait: 12, close: 30, fraction: .025, damage: 12 },
  { wait: 8, close: 22, fraction: 0, damage: 20 },
];
// Presentation reads the same phase durations as stormStep; duplicating those
// values in the HUD would show the wrong deadline after a balance change.
export function getStormStatus(state) {
  const storm = state?.storm, phase = storm && PHASES[storm.index];
  if (!phase) return null;
  const duration = storm.phase === 'waiting' ? phase.wait : storm.phase === 'closing' ? phase.close : 0;
  const damaging=isStormExposed(state);
  return { phase: storm.phase, paused: state.player?.stage === 'insertion',damaging,
    damagePerSecond:damaging?(storm.damage??phase.damage):0,
    distanceToSafety:damaging?Math.max(0,Math.hypot(state.player.x-storm.centerX,state.player.z-storm.centerZ)-storm.radius):0,
    secondsRemaining: Math.max(0, Math.ceil(duration - (storm.phase === 'closed' ? 0 : storm.phaseTime))) };
}
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const finite = n => typeof n === 'number' && Number.isFinite(n);
const point = p => p && finite(p.x) && finite(p.y) && finite(p.z);
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const weapon = c => c.inventory.weapons[c.weaponIndex];
const ground = (w, x, z, ceiling = Infinity) => w.heightAt(x, z, ceiling);
function random(s) {
  let n = s.rng >>> 0;
  n ^= n << 13; n ^= n >>> 17; n ^= n << 5;
  s.rng = n >>> 0;
  return s.rng / 4294967296;
}
function emit(s, type, fields = {}) {
  s.events.push({ type, time: s.time, ...fields });
  // A caller may pause rendering without draining. Old audiovisual events must
  // not become an unbounded save or burst of hundreds of sounds on return.
  if (s.events.length > 512) s.events.shift();
}
function boxRay(box, origin, dir, maxDistance, margin = 0) {
  const cos=Math.cos(box.yaw),sin=Math.sin(box.yaw),dx=origin.x-box.x,dz=origin.z-box.z;
  const o=[dx*cos-dz*sin,origin.y-box.y,dx*sin+dz*cos],d=[dir.x*cos-dir.z*sin,dir.y,dir.x*sin+dir.z*cos];
  const lo=[-CONTAINER_GEOMETRY.width/2-margin,0,-CONTAINER_GEOMETRY.depth/2-margin];
  const hi=[-lo[0],CONTAINER_GEOMETRY.height,-lo[2]];
  let enter=-Infinity,exit=maxDistance,axis=-1,sign=0;
  for (let i=0;i<3;i++) {
    if (Math.abs(d[i])<1e-9) { if(o[i]<lo[i] || o[i]>hi[i]) return null; continue; }
    const a=(lo[i]-o[i])/d[i],b=(hi[i]-o[i])/d[i],near=Math.min(a,b);
    if(near>enter) {enter=near;axis=i;sign=d[i]>0?-1:1;}
    exit=Math.min(exit,Math.max(a,b));
    if(enter>exit) return null;
  }
  if(exit<0 || enter>maxDistance) return null;
  return {distance:Math.max(0,enter),inside:enter<0,normal:axis===0?{x:sign*cos,z:-sign*sin}:axis===2?{x:sign*sin,z:sign*cos}:{x:0,z:0}};
}
function rayDistance(world, origin, dir, maxDistance, s) {
  const hit = world.raycast(origin, dir, maxDistance);
  let value = hit == null ? maxDistance : typeof hit === 'number' ? hit : hit.distance;
  if (!finite(value) || value < 0) throw new Error('World raycast returned an invalid distance');
  value=rayCasesDistance(s?.containers||[],origin,dir,maxDistance,s?.time,value);
  return Math.min(value,doorHits(world,s,origin,dir,value)[0]?.distance??value);
}
function visible(world, a, b, s) {
  const o = { x: a.x, y: a.y + stanceEyeHeight(a), z: a.z };
  const dx = b.x - o.x, dy = b.y + stanceHeight(b)*.58 - o.y, dz = b.z - o.z;
  const d = Math.hypot(dx, dy, dz);
  return d < .01 || rayDistance(world, o, { x: dx / d, y: dy / d, z: dz / d }, d, s) >= d - .02;
}
function newWeapon(id, tier = 1, finishSeed) { return { id, tier, finishSeed, mag: WEAPONS[id].magazine, reserve: WEAPONS[id].magazine * 2 }; }
function validateWorld(world) {
  if (!world || !['heightAt', 'resolveMove', 'raycast'].every(k => typeof world[k] === 'function')) throw new Error('A complete collision world is required');
}
export {planCharacterAssignment, planPreparedCharacterAssignment, MAX_ROSTER_BODIES} from './character-roster.js';
export function createMatch({ seed, world, botCount, characterAssignment, playerCharacterId, preparedCharacterIds, playerUsername } = {}) {
  // Identity planning is deliberately not a launch permission. Reject drafts
  // before querying the world, allocating contestants or consuming match RNG.
  let assignment;
  if(playerCharacterId!==undefined&&!getRosterCharacter(playerCharacterId))throw Error('Unknown player visual identity');
  if(characterAssignment&&playerCharacterId!==undefined&&playerCharacterId!==characterAssignment.selectedCharacterId)throw Error('Player visual conflicts with roster assignment');
  if (characterAssignment !== undefined) {
    assertPlayableCharacterAssignment(characterAssignment, preparedCharacterIds);
    if (seed !== undefined && seed !== characterAssignment.seed) throw new Error('Character assignment seed does not match the match seed');
    if (botCount !== undefined && botCount !== characterAssignment.characterIds.length - 1) throw new Error('botCount does not match the character assignment');
    assignment = {...characterAssignment, characterIds:[...characterAssignment.characterIds]};
  }
  seed = seed === undefined ? assignment?.seed ?? 1 : seed;
  botCount = assignment ? assignment.characterIds.length - 1 : botCount === undefined ? 31 : botCount;
  validateWorld(world);
  world.updateAnimatedSolids?.(0);
  const maxBots = assignment ? MAX_ROSTER_BODIES - 1 : 31;
  if (!Number.isInteger(botCount) || botCount < 0 || botCount > maxBots) throw new Error(`botCount must be 0 through ${maxBots}`);
  const spawns = world.spawnPoints || [];
  if (assignment) {
    if (!Array.isArray(spawns) || spawns.length < assignment.characterIds.length) throw new Error('The roster requires a distinct spawn for every contestant');
    const used = spawns.slice(0, assignment.characterIds.length);
    if (used.some((p,i) => !p || !finite(p.x) || !finite(p.z) || used.slice(0,i).some(q => distance(p,q) < .9))) throw new Error('Roster contestant spawns overlap or are invalid');
  }
  const radius = finite(world.radius) ? clamp(world.radius, 60, 2000) : 240;
  const s = { version: 1, worldId: world.id || 'skybreak', worldVersion: world.version || 1,
    seed: seed >>> 0, rng: (seed >>> 0) || 1, phase: 'insertion', time: 0, activeTime: 0, tick: 0, soloRosterFillVersion: 1,
    contestants: [], player: null, loot: [], containers: [], windowHealth:createWindowHealth(world), events: [], result: null, nextLootId: 0,
    storm: { centerX: 0, centerZ: 0, radius, initialRadius: radius, nextCenterX: 0, nextCenterZ: 0,
      nextRadius: radius, startX: 0, startZ: 0, startRadius: radius, index: 0, phase: 'waiting', phaseTime: 0, damage: 1 },
  };
  if (assignment) { s.characterAssignment = assignment; s.selectedCharacterId = assignment.selectedCharacterId; }
  if(playerCharacterId!==undefined)s.playerCharacterId=playerCharacterId;
  const usernames=makeMatchUsernames(s.seed,botCount+1,playerUsername);
  for (let i = 0; i <= botCount; i++) {
    const angle = random(s) * Math.PI * 2, r = radius * (.2 + random(s) * .55);
    const spawn = assignment ? spawns[i] : spawns[i % (spawns.length || 1)] || { x: Math.cos(angle) * r, z: Math.sin(angle) * r };
    const x = spawn.x, z = spawn.z, y = ground(world, x, z) + 85;
    const c = { id: i, name: i ? `Pilot ${String(i).padStart(2, '0')}` : 'You', username:usernames[i], isPlayer: i === 0,
      x, y, z, yaw: 0, pitch: 0, vx: 0, vy: 0, vz: 0, hp: 100, shield: 100, alive: true, onGround: false,
      stance:'stand', stanceHeight:1.8, slideTime:0, slideCooldown:0, stanceChangedAt:0,
      stage: 'insertion', swimming: false, dropAt: 1 + random(s) * 12, targetX: x, targetZ: z,
      canopyOpen: false, canopySafetyLock: false, canopyChangedAt: -100, diving: false, descentMode: 'dive', descentTurn: 0,
      inventory: { weapons: [newWeapon(i === 0 ? 'rifle' : ['sidearm','sidearm','sidearm','rifle','sidearm','scatter','sidearm','marksman'][i % 8],1,weaponFinishSeed(s.seed,0,i*4))], heals: 1, shields: 1 }, weaponIndex: 0,
      cooldown: 0, reloadTime: 0, healTime: 0, healKind: null, kills: 0, damageDealt: 0,
      eliminatedAt: null, placement: null, lastDamageAt: -100, lastShotAt: -100, stamina: 100, sprintExhausted: false,
      bot: { nextThink: random(s) * .2, targetId: null, seenAt: -100, reactAt: 0,
        goalX: x, goalZ: z, mode: 'landing', strafe: random(s) > .5 ? 1 : -1, wanderAt: 0, blockedTime: 0 },
    };
    if (assignment) { c.characterId = assignment.characterIds[i]; c.name = getRosterCharacter(c.characterId).name; }
    if(i===0&&hasStanceProfile(playerCharacterId))c.stanceProfileId=playerCharacterId;
    clearStance(c);
    s.contestants.push(c);
  }
  s.player = s.contestants[0];
  const spots = world.lootSpawns?.length ? world.lootSpawns : Array.from({ length: 100 }, () => {
    const a = random(s) * Math.PI * 2, r = Math.sqrt(random(s)) * radius * .84;
    return { x: Math.cos(a) * r, z: Math.sin(a) * r };
  });
  const kinds = ['rifle', 'smg', 'scoped-rifle', 'ammo', 'shield', 'heal', 'scatter', 'marksman', 'sidearm'];
  for (let i = 0; i < spots.length; i++) {
    const p = spots[i];
    addLoot(s, { x: p.x, y: finite(p.y) ? p.y : ground(world, p.x, p.z), z: p.z,
      kind: i % (kinds.length * 2) === kinds.length ? 'scar' : kinds[i % kinds.length], tier: 1 + Math.floor(random(s) * 3), amount: 1 });
  }
  createContainers(s, spots, world);
  planStorm(s);
  emit(s, 'insertion', { remaining: botCount + 1 });
  return s;
}
function addLoot(s, item) {
  const loot = { id: s.nextLootId++, taken: false, ...item };
  if(WEAPONS[loot.kind])loot.finishSeed=loot.weapon?.finishSeed??loot.finishSeed??weaponFinishSeed(s.seed,1,loot.id);
  s.loot.push(loot);
  return loot.id;
}
function clearSegment(world, from, to, s) {
  const dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z, length = Math.hypot(dx, dy, dz);
  return length < .01 || rayDistance(world, from, { x: dx / length, y: dy / length, z: dz / length }, length, s) >= length - .02;
}
function containerPoint(box, x, z) {
  const cos = Math.cos(box.yaw), sin = Math.sin(box.yaw);
  return { x: box.x + x * cos + z * sin, y: box.y, z: box.z - x * sin + z * cos };
}
function outsideContainer(box, p, margin = 0) {
  const dx = p.x-box.x, dz = p.z-box.z, cos = Math.cos(box.yaw), sin = Math.sin(box.yaw);
  return Math.abs(dx*cos-dz*sin) >= CONTAINER_GEOMETRY.width/2+margin || Math.abs(dx*sin+dz*cos) >= CONTAINER_GEOMETRY.depth/2+margin;
}
function validSpill(world, box, p) {
  if (!point(p) || !outsideContainer(box, p, .2) || distance(box,p) > 2.3 || world.isWater?.(p.x,p.z)) return false;
  // A nearby roof is not a spill surface. Every reward remains on the chest's
  // support level and has a traversable path through the visible scenery.
  const y = ground(world,p.x,p.z,box.y+.2);
  if (!finite(y) || Math.abs(y-box.y) > .12 || Math.abs(y-p.y) > .02) return false;
  for (const [dx,dz] of [[.12,0],[-.12,0],[0,.12],[0,-.12]]) {
    if (Math.abs(ground(world,p.x+dx,p.z+dz,box.y+.2)-y) > .08) return false;
  }
  const from = {x:box.x,y:box.y+.12,z:box.z}, to = {x:p.x,y:p.y+.12,z:p.z};
  const resolved = world.resolveMove(from,to,.15);
  return point(resolved) && distance(resolved,to) < .03 && Math.abs(resolved.y-to.y) < .15
    && clearSegment(world,{...from,y:box.y+.35},{...to,y:p.y+.35});
}
function containerPlacement(world, box, eject = true) {
  const {width,depth,openHeight} = CONTAINER_GEOMETRY;
  if (world.isWater?.(box.x,box.z)) return null;
  for (const x of [-width/2,0,width/2]) for (const z of [-depth/2,0,depth/2]) {
    const p = containerPoint(box,x,z), y = ground(world,p.x,p.z,box.y+.2);
    if (!finite(y) || Math.abs(y-box.y) > .08 || world.isWater?.(p.x,p.z)) return null;
    if (!clearSegment(world,{...p,y:box.y+.03},{...p,y:box.y+openHeight+.05})) return null;
    for (const height of [.35,1.2]) if (!clearSegment(world,{x:box.x,y:box.y+height,z:box.z},{...p,y:box.y+height})) return null;
  }
  const spills = [];
  for (const [x,z] of (eject ? [[-.95,1.2],[-.32,1.45],[.32,1.45],[.95,1.2],[-1.2,1.5],[1.2,1.5],[0,1.85],[-.6,1.85],[.6,1.85]] : [[0,-1.25],[1.45,0],[0,1.25],[-1.45,0],[1.2,-1.1],[-1.2,-1.1],[1.2,1.1],[-1.2,1.1]])) {
    const p = containerPoint(box,x,z); p.y = ground(world,p.x,p.z,box.y+.2);
    if (validSpill(world,box,p) && (!eject || ejectionClear(world,box,p))) spills.push(p);
    if (spills.length === 4) return spills;
  }
  return null;
}
function createContainers(s, spots, world) {
  // This stream is separate from combat/storm randomness. Opening or ignoring a
  // chest cannot reroll its contents or perturb another contestant's shots.
  const rng = {rng:(s.seed ^ 0x7a4c19d3) >>> 0 || 1};
  for (let i = 0; i < spots.length && s.containers.length < 32; i += 4) {
    const p = spots[i], box = {id:s.containers.length,x:p.x,y:finite(p.y)?p.y:ground(world,p.x,p.z),z:p.z,yaw:random(rng)*Math.PI*2,
      opened:false,openedAt:null,openedBy:null,ejectionVersion:1,contents:[],lootIds:[]};
    if (s.containers.some(other=>distance(other,box)<14)) continue;
    const spillPoints = containerPlacement(world,box);
    if (!spillPoints) continue;
    box.spillPoints = spillPoints;
    box.contents = [{kind:['rifle','smg','scoped-rifle','scatter','marksman','scar'][Math.floor(random(rng)*6)],tier:1+Math.floor(random(rng)*3),amount:1},
      {kind:'ammo',tier:1,amount:1},{kind:'heal',tier:1,amount:1},{kind:'shield',tier:1,amount:1}];
    s.containers.push(box);
    // Keep all original floor items, but do not bury one inside a new solid box.
    for (const item of s.loot) if (Math.abs(item.y-box.y)<.2 && !outsideContainer(box,item,.15)) Object.assign(item,spillPoints[item.id%4]);
  }
}
function reachableItem(s, c, item, world, height) {
  return Math.abs(item.y-c.y)<=2 && distance(c,item)<2.8
    && clearSegment(world,{x:c.x,y:c.y+stanceEyeHeight(c),z:c.z},{x:item.x,y:item.y+height,z:item.z},s);
}
function usefulLoot(c, item) {
  if (item.kind === 'heal') return c.inventory.heals < 5;
  if (item.kind === 'shield') return c.inventory.shields < 5;
  if (item.kind === 'ammo') return c.inventory.weapons.some(w=>w.reserve<300);
  const owned = c.inventory.weapons.find(w=>w.id===item.kind);
  return !owned || owned.reserve<300 || owned.tier<item.tier;
}
function botWantsLoot(c, item) {
  if (item.kind === 'heal') return c.inventory.heals < 5;
  if (item.kind === 'shield') return c.inventory.shields < 5;
  if (item.kind === 'ammo') return c.inventory.weapons.some(w => w.reserve <= WEAPONS[w.id].magazine * 2);
  const owned = c.inventory.weapons.find(w => w.id === item.kind);
  return owned ? owned.reserve <= WEAPONS[owned.id].magazine * 2 || owned.tier < item.tier : c.inventory.weapons.length < 3;
}
// The HUD and E action share one selection rule. An opened chest leaves the
// priority set immediately, so subsequent presses collect its ordinary drops.
export function nearestInteractable(s, c = s.player, world) {
  if (!c?.alive || c.stage !== 'active' || inDescent(c)) return null;
  const door=nearestDoor(s,c,world);if(door)return {type:'door',id:door.id,x:door.x,y:door.y,z:door.z,open:s.windowHealth[door.id]===0};
  for (const [type,items,height] of [['container',s.containers || [],CONTAINER_GEOMETRY.height+.03],['loot',s.loot,.3]]) {
    let best = null, near = 2.8;
    for (const item of items) {
      if (type === 'container' ? item.opened : item.taken || !lootCollectible(s,item) || !usefulLoot(c,item)) continue;
      // The same bot policy governs destination choice and the eventual E
      // action. A closer fourth weapon otherwise replaces the selected slot,
      // then its discarded neighbour replaces it again on the next tick.
      if (type === 'loot' && c.isPlayer === false && !botWantsLoot(c,item)) continue;
      const d = distance(c,item);
      if (d<near && reachableItem(s,c,item,world,height)) {best=item;near=d;}
    }
    if (best) return {type,id:best.id,x:best.x,y:best.y,z:best.z,...(type==='loot'?{kind:best.kind}:{})};
  }
  return null;
}
// Use the ordinary interaction edge from either side. A closing leaf cannot
// materialize through a contestant, including a large body's rear slices.
export function nearestDoor(s,c,world,closedOnly=false,yaw=c.yaw){
 let found=null,near=2.6;
 for(const door of world?.doors||[]){
  if(closedOnly&&s.windowHealth[door.id]===0)continue;
  if(c.y+stanceHeight(c)<door.y-door.h/2||c.y>door.y+door.h/2)continue;
  const dx=door.x-c.x,dz=door.z-c.z,d=Math.hypot(dx,dz);
  if(d>=near||d>.2&&(-Math.sin(yaw)*dx-Math.cos(yaw)*dz)/d<.15)continue;
  const origin={x:c.x,y:Math.min(c.y+stanceEyeHeight(c),door.y+door.h*.4),z:c.z},target={x:door.x,y:door.y,z:door.z},length=Math.hypot(target.x-origin.x,target.y-origin.y,target.z-origin.z),dir={x:(target.x-origin.x)/length,y:(target.y-origin.y)/length,z:(target.z-origin.z)/length};
  const hit=world.raycast(origin,dir,Math.max(0,length-.18));if(hit&&(typeof hit==='number'?hit:hit.distance)<length-.18)continue;
  found=door;near=d;
 }
 return found;
}
function toggleDoor(s,c,door){
 const closing=s.windowHealth[door.id]===0;
 if(closing)for(const actor of s.contestants){
  if(!actor.alive||actor.stage!=='active')continue;
  for(const q of collisionOffsets(actor)){
   const point={x:actor.x+q.x,y:actor.y+q.y,z:actor.z+q.z};
   if(rayWindow(door,point,{x:0,y:0,z:0},0,q.radius+.04,q.height))return false;
  }
 }
 s.windowHealth[door.id]=closing?1:0;emit(s,'door-toggle',{id:c.id,doorId:door.id,open:!closing});return true;
}
function openContainer(s, c, box, world) {
  if (box.opened || !box.spillPoints.every(p=>validSpill(world,box,p) && (box.ejectionVersion!==1 || ejectionClear(world,box,p)))) return;
  box.opened = true; box.openedAt = s.time; box.openedBy = c.id;
  box.lootIds = box.contents.map((item,i)=>addLoot(s,{...item,...box.spillPoints[i],containerId:box.id}));
  emit(s,'containerOpened',{id:c.id,containerId:box.id,x:box.x,y:box.y,z:box.z,lootIds:[...box.lootIds]});
}
function planStorm(s) {
  const st = s.storm, phase = PHASES[st.index];
  st.startX = st.centerX; st.startZ = st.centerZ; st.startRadius = st.radius;
  st.nextRadius = st.initialRadius * phase.fraction;
  const angle = random(s) * Math.PI * 2, shift = (st.radius - st.nextRadius) * random(s) * .62;
  st.nextCenterX = st.centerX + Math.cos(angle) * shift;
  st.nextCenterZ = st.centerZ + Math.sin(angle) * shift;
  st.damage = phase.damage;
}
function stormStep(s, dt) {
  const st = s.storm, phase = PHASES[st.index];
  st.phaseTime += dt;
  if (st.phase === 'waiting' && st.phaseTime >= phase.wait) {
    st.phase = 'closing'; st.phaseTime -= phase.wait;
    emit(s, 'stormClosing', { index: st.index, radius: st.nextRadius });
  }
  if (st.phase === 'closing') {
    const f = clamp(st.phaseTime / phase.close, 0, 1);
    st.radius = st.startRadius + (st.nextRadius - st.startRadius) * f;
    st.centerX = st.startX + (st.nextCenterX - st.startX) * f;
    st.centerZ = st.startZ + (st.nextCenterZ - st.startZ) * f;
    if (f === 1) {
      if (st.index + 1 < PHASES.length) { st.index++; st.phase = 'waiting'; st.phaseTime = 0; planStorm(s); emit(s, 'stormSettled', { index: st.index }); }
      else st.phase = 'closed';
    }
  }
}
function applyDamage(s, c, amount, attacker, cause, bypassShield = false) {
  // Initial deployment remains protected from gunfire, but descending outside
  // the live storm cannot provide indefinite immunity to the closing circle.
  if (!c.alive || cause!=='disconnect' && c.stage !== 'active' && !(cause==='storm'&&c.stage==='landing'&&(s.multiplayer?s.multiplayerDeployed:s.player.stage!=='insertion'))) return;
  const absorbed = bypassShield ? 0 : Math.min(c.shield, amount);
  c.shield -= absorbed;
  const actual = Math.min(c.hp, amount - absorbed) + absorbed;
  c.hp = Math.max(0, c.hp - (amount - absorbed));
  c.lastDamageAt = s.time;
  c.healTime = 0; c.healKind = null;
  if (attacker) attacker.damageDealt += actual;
  if (cause !== 'storm') emit(s, 'hit', { id: c.id, attackerId: attacker?.id ?? null, amount: actual, shield: absorbed > 0, shieldBroken: absorbed > 0 && c.shield === 0, x: c.x, y: c.y + 1, z: c.z });
  if (c.hp > 0) return;
  c.alive = false; c.eliminatedAt = s.time;if(s.multiplayer){c.eliminatedCause=cause;if(c.isPlayer)s.lastHumanElimination={id:c.id,cause,tick:s.tick,time:s.time};} c.placement = s.contestants.filter(p => p.alive).length + 1;
  clearDescent(c);clearStance(c);c.reloadTime=0;c.healTime=0;c.healKind=null;
  c.vx = 0; c.vy = 0; c.vz = 0;
  if (attacker) attacker.kills++;
  for (const w of c.inventory.weapons) addLoot(s, { x: c.x, y: c.y, z: c.z, kind: w.id, tier: w.tier, weapon: { ...w }, amount: 1 });
  if (c.inventory.heals) addLoot(s, { x: c.x + .6, y: c.y, z: c.z, kind: 'heal', amount: c.inventory.heals, tier: 1 });
  if (c.inventory.shields) addLoot(s, { x: c.x - .6, y: c.y, z: c.z, kind: 'shield', amount: c.inventory.shields, tier: 1 });
  emit(s, 'elimination', { id: c.id, attackerId: attacker?.id ?? null, cause, remaining: c.placement - 1 });
}
function raySphere(o, d, center, radius) {
  const x = center.x - o.x, y = center.y - o.y, z = center.z - o.z;
  const along = x * d.x + y * d.y + z * d.z;
  const square = x * x + y * y + z * z - along * along;
  if (square > radius * radius) return Infinity;
  const near = along - Math.sqrt(Math.max(0, radius * radius - square));
  return near >= 0 ? near : Infinity;
}
function traceShot(s, world, origin, dir, range, shooter, breakGlass=false) {
  let nearest = rayDistance(world, origin, dir, range,s), victim = null, head = false;
  for (const other of s.contestants) {
    if (other === shooter || !other.alive || other.stage !== 'active') continue;
    const target=s._shotHistory?.get(other.id)??other;
    const posedHit=stanceRayHit(target,origin,dir,nearest);
    if(posedHit){if(posedHit.distance<nearest){nearest=posedHit.distance;victim=other;head=posedHit.head;}continue;}
    for (const [height, radius, isHead, forward=0] of stanceHitSpheres(target)) {
      const d = raySphere(origin, dir, { x: target.x-Math.sin(target.yaw)*forward, y: target.y + height, z: target.z-Math.cos(target.yaw)*forward }, radius);
      if (d < nearest) { nearest = d; victim = other; head = isHead; }
    }
  }
  const panes=windowHits(world,s,origin,dir,nearest);
  if(!breakGlass&&panes.length)return {nearest:panes[0].distance,victim:null,head:false};
  for(const hit of panes){
    s.windowHealth[hit.pane.id]=0;
    emit(s,'window-break',{windowId:hit.pane.id,houseId:hit.pane.houseId,attackerId:shooter.id,weapon:weapon(shooter).id,position:{x:origin.x+dir.x*hit.distance,y:origin.y+dir.y*hit.distance,z:origin.z+dir.z*hit.distance},normal:hit.normal});
  }
  return { nearest, victim, head };
}
// Assistance checks both the displayed sight line and the physical shot origin.
// Intact panes and supplies remain cover even when static scenery is clear.
export function aimTargetVisible(world,s,origin,target){
  const dx=target.x-origin.x,dy=target.y-origin.y,dz=target.z-origin.z,d=Math.hypot(dx,dy,dz);
  if(d<.01)return false;
  const direction={x:dx/d,y:dy/d,z:dz/d};
  return rayDistance(world,origin,direction,d,s)>=d-.02&&!windowHits(world,s,origin,direction,d-.02).length;
}
// The shoulder camera selects a point, not the origin of a damaging ray. The
// subsequent shot still starts at the player's eye and can strike nearby cover.
export function pickAimPoint(world, s, origin, direction, maxDistance = 250) {
  world.updateAnimatedSolids?.(s.time);
  if (!point(origin) || !point(direction) || !finite(maxDistance) || maxDistance <= 0) throw new Error('Invalid camera aim ray');
  const length = Math.hypot(direction.x, direction.y, direction.z);
  if (!finite(length) || length < 1e-8) throw new Error('Invalid camera aim direction');
  const dir = { x: direction.x / length, y: direction.y / length, z: direction.z / length };
  const { nearest } = traceShot(s, world, origin, dir, maxDistance, s.player);
  return { x: origin.x + dir.x * nearest, y: origin.y + dir.y * nearest, z: origin.z + dir.z * nearest };
}
export function weaponSpread(spec,actor,aim=false) { return spec.spread*(aim?.28:1)*stanceAccuracy(actor)*(1+Math.hypot(actor.vx||0,actor.vz||0)*.055); }
function fire(s, c, input, world, cooldownOvershoot = 0, resolveAimPoint) {
  const w = weapon(c), spec = WEAPONS[w.id];
  if (c.cooldown > 0 || c.reloadTime > 0 || c.healTime > 0) return;
  if (w.mag === 0) { startReload(s, c); return; }
  // Resolve the camera ray after this step's equip, reload and movement work.
  // A pre-step point can come from a shoulder camera while the new weapon is
  // already scoped. The callback is optional, so headless/replay callers retain
  // their supplied point or yaw/pitch without depending on a renderer.
  const controls=constrainBodyLook(c,input);
  const aimPoint = c.isPlayer && resolveAimPoint ? resolveAimPoint(s, controls) : input.aimPoint;
  if (c.isPlayer && resolveAimPoint && !point(aimPoint)) throw new Error('Invalid resolved aim point');
  w.mag--; c.cooldown = Math.max(0, spec.interval - cooldownOvershoot); c.lastShotAt = s.time;
  const origin = { x: c.x, y: c.y + stanceEyeHeight(c), z: c.z };
  let baseYaw = c.isPlayer&&finite(input.aimYaw)?input.aimYaw:c.isPlayer&&finite(input.yaw)?input.yaw:c.yaw, basePitch = c.isPlayer&&finite(input.aimPitch)?input.aimPitch:c.pitch;
  if (c.isPlayer && point(aimPoint)) {
    const dx = aimPoint.x - origin.x, dy = aimPoint.y - origin.y, dz = aimPoint.z - origin.z;
    const length = Math.hypot(dx, dy, dz);
    if (finite(length) && length > 1e-8) {
      baseYaw = Math.atan2(-dx, -dz);
      basePitch = Math.atan2(dy, Math.hypot(dx, dz));
    }
  }
  const spread = weaponSpread(spec,c,input.aim);
  const ends = [];
  for (let pellet = 0; pellet < spec.pellets; pellet++) {
    const yaw = baseYaw + (random(s) - .5) * spread * 2;
    const pitch = basePitch + (random(s) - .5) * spread * 2;
    const dir = { x: -Math.sin(yaw) * Math.cos(pitch), y: Math.sin(pitch), z: -Math.cos(yaw) * Math.cos(pitch) };
    const { nearest, victim, head } = traceShot(s, world, origin, dir, spec.range, c, true);
    if (victim) {
      const falloff = clamp(1 - Math.max(0, nearest - spec.falloff) / spec.range, .45, 1);
      applyDamage(s, victim, spec.damage * (1 + (w.tier - 1) * .08) * falloff * (head ? 1.65 : 1), c, w.id);
    }
    ends.push({ x: origin.x + dir.x * nearest, y: origin.y + dir.y * nearest, z: origin.z + dir.z * nearest, hit: victim?.id ?? null });
  }
  emit(s, 'shot', { id: c.id, weapon: w.id, origin, ends });
}
function startReload(s, c) {
  const w = weapon(c), spec = WEAPONS[w.id];
  if (c.reloadTime > 0 || w.mag >= spec.magazine || w.reserve <= 0) return;
  c.healTime = 0; c.healKind = null; c.reloadTime = spec.reload;
  emit(s, 'reload', { id: c.id, duration: spec.reload });
}
function beginHeal(s, c, requestedKind) {
  if (requestedKind && c.healTime > 0 && c.healKind === requestedKind) { c.healTime=0;c.healKind=null;return; }
  const kind = requestedKind ?? ( c.hp < 65 && c.inventory.heals ? 'heal' : c.shield < 100 && c.inventory.shields ? 'shield' : c.hp < 100 && c.inventory.heals ? 'heal' : null);
  if (!kind || !consumableStatus(c,kind).available) return;
  c.healKind = kind; c.healTime = CONSUMABLES[kind].duration;
  emit(s, 'healStart', { id: c.id, kind, duration: c.healTime });
}
function interact(s, c, world) {
  const selected = nearestInteractable(s,c,world);
  if (!selected) return;
  if(selected.type==='door'){toggleDoor(s,c,(world.doors||[]).find(d=>d.id===selected.id));return;}
  if (selected.type === 'container') { openContainer(s,c,s.containers.find(box=>box.id===selected.id),world); return; }
  const best = s.loot.find(item=>item.id===selected.id);
  if (WEAPONS[best.kind]) {
    const existing = c.inventory.weapons.find(w => w.id === best.kind);
    if (existing) { existing.reserve = Math.min(300, existing.reserve + (best.weapon ? best.weapon.mag + best.weapon.reserve : WEAPONS[best.kind].magazine * 2)); existing.tier = Math.max(existing.tier, best.tier); }
    else if (c.inventory.weapons.length < 3) { c.inventory.weapons.push(best.weapon ? { ...best.weapon } : newWeapon(best.kind, best.tier,best.finishSeed??weaponFinishSeed(s.seed,1,best.id))); c.weaponIndex = c.inventory.weapons.length - 1; }
    else {
      const dropped = weapon(c);
      addLoot(s, { x: c.x + 1.5, y: c.y, z: c.z, kind: dropped.id, tier: dropped.tier, weapon: { ...dropped }, amount: 1 });
      c.inventory.weapons[c.weaponIndex] = best.weapon ? { ...best.weapon } : newWeapon(best.kind, best.tier,best.finishSeed??weaponFinishSeed(s.seed,1,best.id));
    }
    c.reloadTime = 0;
  } else if (best.kind === 'ammo') {
    for (const w of c.inventory.weapons) w.reserve = Math.min(300, w.reserve + WEAPONS[w.id].magazine * 2);
  } else {
    const key = best.kind === 'heal' ? 'heals' : 'shields';
    if (c.inventory[key] >= 5) return;
    const transfer = Math.min(5 - c.inventory[key], best.amount);
    c.inventory[key] += transfer;
    best.amount -= transfer;
    if (best.amount > 0) { emit(s, 'pickup', { id: c.id, lootId: best.id, kind: best.kind, tier: best.tier }); return; }
    best.amount = 1;
  }
  best.taken = true;
  emit(s, 'pickup', { id: c.id, lootId: best.id, kind: best.kind, tier: best.tier });
}
function isSwimming(c, world) {
  return c.stage !== 'insertion' && c.onGround && finite(world.swimFeet)
    && world.isWater?.(c.x, c.z) === true && Math.abs(c.y - world.swimFeet) < .15;
}
function boxEscape(box,p,radius) {
  const cos=Math.cos(box.yaw),sin=Math.sin(box.yaw),dx=p.x-box.x,dz=p.z-box.z;
  const x=dx*cos-dz*sin,z=dx*sin+dz*cos,ex=CONTAINER_GEOMETRY.width/2+radius-Math.abs(x),ez=CONTAINER_GEOMETRY.depth/2+radius-Math.abs(z);
  if(ex<0 || ez<0) return null;
  const alongX=ex<ez,sign=(alongX?x:z)<0?-1:1;
  return {depth:Math.min(ex,ez),normal:alongX?{x:sign*cos,z:-sign*sin}:{x:sign*sin,z:sign*cos}};
}
function movePastClosedContainers(s, from, to, radius, world, height=1.8,stepAllowance=.42,verticalRadiusOverride) {
  let current={...from}, remaining={x:to.x-from.x,z:to.z-from.z};
  // Enclose the radius-expanded rotated case for every yaw. Recompute segment
  // bounds after each slide; exact box tests still decide every possible hit.
  const envelope=Math.SQRT2*(Math.max(CONTAINER_GEOMETRY.width,CONTAINER_GEOMETRY.depth)/2+radius)+1e-6;
  // A glancing descent can begin below the lid with the capsule already in the
  // side margin. Sweeping only outside-to-inside crossings misses that state.
  for(const box of s.containers || []) {
    if(box.opened)continue;
    if(from.y>=box.y+CONTAINER_GEOMETRY.height-.01 || Math.max(from.y,to.y)+height<=box.y) continue;
    if(Math.abs(current.x-box.x)>envelope||Math.abs(current.z-box.z)>envelope)continue;
    const overlap=boxEscape(box,current,radius);
    if(overlap) {
      const target={...current,x:current.x+overlap.normal.x*(overlap.depth+.0001),z:current.z+overlap.normal.z*(overlap.depth+.0001)};
      current=world.resolveMove(current,target,radius,height,stepAllowance,verticalRadiusOverride);
    }
  }
  for(let pass=0;pass<3;pass++) {
    const length=Math.hypot(remaining.x,remaining.z);
    if(length<1e-8) break;
    const dir={x:remaining.x/length,y:0,z:remaining.z/length};
    const endX=current.x+remaining.x,endZ=current.z+remaining.z,minX=Math.min(current.x,endX)-envelope,maxX=Math.max(current.x,endX)+envelope,minZ=Math.min(current.z,endZ)-envelope,maxZ=Math.max(current.z,endZ)+envelope;
    let nearest=null;
    for(const box of s.containers || []) {
      if(box.opened)continue;
      if(from.y>=box.y+CONTAINER_GEOMETRY.height-.01 || Math.max(from.y,to.y)+height<=box.y) continue;
      if(box.x<minX||box.x>maxX||box.z<minZ||box.z>maxZ)continue;
      const origin={...current,y:clamp(from.y+.1,box.y+.01,box.y+CONTAINER_GEOMETRY.height-.01)};
      const hit=boxRay(box,origin,dir,length,radius);
      if(hit?.inside) {
        const overlap=boxEscape(box,current,radius);
        if(overlap && dir.x*overlap.normal.x+dir.z*overlap.normal.z<0 && !nearest) nearest={distance:0,normal:overlap.normal};
      } else if(hit && (!nearest || hit.distance<nearest.distance)) nearest=hit;
    }
    if(!nearest) {current.x+=remaining.x;current.z+=remaining.z;break;}
    const travel=Math.max(0,nearest.distance-.0001);
    current.x+=dir.x*travel;current.z+=dir.z*travel;
    remaining.x-=dir.x*travel;remaining.z-=dir.z*travel;
    const into=remaining.x*nearest.normal.x+remaining.z*nearest.normal.z;
    if(into<0) {remaining.x-=into*nearest.normal.x;remaining.z-=into*nearest.normal.z;}
  }
  return {...to,x:current.x,z:current.z};
}
function movePastContainers(s,from,to,radius,world,height=1.8,stepAllowance=.42,verticalRadiusOverride){
  const closed=movePastClosedContainers(s,from,to,radius,world,height,stepAllowance,verticalRadiusOverride);
  return movePastOpenCases(s.containers||[],from,closed,s.time,radius,height,(a,b,r)=>world.resolveMove(a,b,r,height,stepAllowance,verticalRadiusOverride));
}
function resolveMovement(s,from,to,radius,world,height=1.8,maxCorrection=Infinity,stepAllowance=.42,verticalRadiusOverride) {
  let candidate=world.resolveMove(from,to,radius,height,stepAllowance,verticalRadiusOverride);
  // A native slice cannot resolve a local contact by crossing a building.
  // Report an invalid deep-overlap repair before feeding that teleport into
  // more swept queries. General world overlap queries retain their behavior.
  if(distance(candidate,to)>maxCorrection)return null;
  for(let pass=0;pass<4;pass++) {
    const before=candidate,glass=movePastWindows(world,s,from,candidate,radius,height);
    candidate=movePastContainers(s,from,glass,radius,world,height,stepAllowance,verticalRadiusOverride);
    if(distance(candidate,to)>maxCorrection)return null;
    if(distance(before,glass)<1e-7&&Math.abs(before.y-glass.y)<1e-7&&distance(glass,candidate)<1e-7&&Math.abs(glass.y-candidate.y)<1e-7)return candidate;
    // Sliding along a chest can redirect the path into scenery or glazing.
    // Check both without repeatedly reapplying an already resolved chest slide.
    const checked=world.resolveMove(from,candidate,radius,height,stepAllowance,verticalRadiusOverride);
    if(distance(checked,to)>maxCorrection)return null;
    if(distance(candidate,checked)<1e-7&&Math.abs(candidate.y-checked.y)<1e-7){const clear=movePastWindows(world,s,from,candidate,radius,height);if(distance(candidate,clear)<1e-7&&Math.abs(candidate.y-clear.y)<1e-7)return candidate;}
    candidate=checked;
  }
  return {...from};
}
function supportHeight(s, world, x, z, ceiling, supportRadius=.45) {
  let floor = ground(world, x, z, ceiling);
  for (const box of s.containers || []) {
    if(box.opened){const hit=caseSupport(box,x,z,ceiling,s.time,supportRadius);if(hit&&hit.y>floor)floor=hit.y;continue;}
    const top = box.y + CONTAINER_GEOMETRY.height;
    if (top <= ceiling && top > floor && !outsideContainer(box, {x,z})) floor = top;
  }
  if (!finite(floor)) throw new Error('World ground height must be finite');
  return floor;
}
function authoredStairSupport(world,x,z,ceiling){
 let highest=world.stairSupportAt?.(x,z,ceiling)??-Infinity;
 const spec=MARKET_INTERIOR;
 for(const house of world.marketHouses||[]){
  const dx=x-house.x,dz=z-house.z;if(Math.abs(dx)>7||Math.abs(dz)>7)continue;
  const cos=Math.cos(house.yaw),sin=Math.sin(house.yaw),X=dx*cos-dz*sin,Z=dx*sin+dz*cos;
  let top=-Infinity;
  for(let flight=0;flight<2;flight++)if(Math.abs(X-spec.flightX[flight])<=spec.flightWidth/2&&Z>=spec.backZ&&Z<=spec.frontZ){
    const progress=(flight?Z-spec.backZ:spec.frontZ-Z)/(spec.frontZ-spec.backZ);
    top=Math.max(top,house.baseY+spec.floor+(progress+flight)*10*spec.riser);
  }
  if(Math.abs(X-1.35)<=spec.stairWidth/2&&Math.abs(Z-spec.turnZ)<=spec.turnDepth/2)top=Math.max(top,house.baseY+spec.floor+10*spec.riser);
  // The shared ramp and landing solids remain the source of support.
  // Recognize a flight only when its actual upward surface agrees.
  if(top<=ceiling+.0001&&Math.abs(world.heightAt(x,z,top+.001)-top)<.001)highest=Math.max(highest,top);
 }
 return highest;
}
function probeVerticalRadius(p){const normal=Math.min(p.radius,p.height/2);return Number.isFinite(p.verticalRadius)&&p.verticalRadius>0?Math.min(normal,p.verticalRadius):normal;}
function minimumExplicitCap(probes){let cap;for(const p of probes)if(Number.isFinite(p.verticalRadius)&&p.verticalRadius>0)cap=Math.min(cap??Infinity,probeVerticalRadius(p));return cap;}
const stairTriangleCache=new WeakMap();
function frozenStairTriangles(world,house){
 let cache=stairTriangleCache.get(world);if(!cache){cache=new Map();stairTriangleCache.set(world,cache);}
 if(cache.has(house.id))return cache.get(house.id);
 const c=world.colliders?.find(c=>c.houseId===house.id&&c.kind==='marketHouse'&&c.model),triangles=[];
 if(c){const cos=Math.cos(house.yaw),sin=Math.sin(house.yaw),convert=v=>{const wx=c.x+c.cos*v.x*c.w+c.sin*v.z*c.d-house.x,wz=c.z-c.sin*v.x*c.w+c.cos*v.z*c.d-house.z;return{x:wx*cos-wz*sin,y:c.y+v.y*c.h-house.baseY,z:wx*sin+wz*cos};};
  for(const t of c.model.triangles){if(t.normal.y<=1e-8)continue;const a=convert(t.a),b=convert(t.b),d=convert(t.c),minX=Math.min(a.x,b.x,d.x),maxX=Math.max(a.x,b.x,d.x),minZ=Math.min(a.z,b.z,d.z),maxZ=Math.max(a.z,b.z,d.z),minY=Math.min(a.y,b.y,d.y),maxY=Math.max(a.y,b.y,d.y);
   const stairs=minX<=3.001&&maxX>=-.301&&minZ<=1.251&&maxZ>=-5.001;
   const threshold=minX<=house.door.width/2+.2&&maxX>=-house.door.width/2-.2&&(maxZ>=MARKET_INTERIOR.depth/2-.4||minZ<=-MARKET_INTERIOR.depth/2+.4);
   if(minY<-.001||maxY>MARKET_INTERIOR.upper+.001||!stairs&&!threshold)continue;
   triangles.push({a,b,c:d,minX,maxX,minZ,maxZ,onlyFeet:minY<MARKET_INTERIOR.floor-.001||!stairs});
  }
 }
 cache.set(house.id,triangles);return triangles;
}
// Upper envelope of a frozen triangle dilated by the rounded capsule bottom.
// The maximum lies on its plane, an edge, or a vertex; all are solved exactly.
function capsuleTriangleSupport(t,x,z,r,vr){
 if(x+r<t.minX||x-r>t.maxX||z+r<t.minZ||z-r>t.maxZ)return -Infinity;
 const scale=r/vr,a={...t.a,y:t.a.y*scale},b={...t.b,y:t.b.y*scale},c={...t.c,y:t.c.y*scale};let top=-Infinity;
 for(const [u,v]of [[a,b],[b,c],[c,a]]){
  const dx=v.x-u.x,dz=v.z-u.z,dy=v.y-u.y,h=dx*dx+dz*dz;
  let k=0;
  if(h>1e-14){const mid=((x-u.x)*dx+(z-u.z)*dz)/h,perp=(x-u.x-dx*mid)**2+(z-u.z-dz*mid)**2,reach=r*r-perp;if(reach<0)continue;k=clamp(mid+dy*Math.sqrt(reach)/(Math.sqrt(h)*Math.sqrt(h+dy*dy)),0,1);}
  else k=v.y>u.y?1:0;
  const distance=(x-u.x-dx*k)**2+(z-u.z-dz*k)**2;if(distance>r*r)continue;
  top=Math.max(top,u.y+dy*k+Math.sqrt(Math.max(0,r*r-distance)));
 }
 const ux=b.x-a.x,uy=b.y-a.y,uz=b.z-a.z,vx=c.x-a.x,vy=c.y-a.y,vz=c.z-a.z,nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,length=Math.hypot(nx,ny,nz);
 if(ny>1e-12){const center=a.y-(nx*(x-a.x)+nz*(z-a.z))/ny+r*length/ny,px=x-r*nx/length,pz=z-r*nz/length,cross=(u,v)=>(v.x-u.x)*(pz-u.z)-(v.z-u.z)*(px-u.x),sides=[cross(a,b),cross(b,c),cross(c,a)];if(sides.every(v=>v>=-1e-9)||sides.every(v=>v<=1e-9))top=Math.max(top,center);}
 return top/scale-vr;
}
const animatedSupportCache=new WeakMap();
function animatedSupportColliders(world){
 let colliders=animatedSupportCache.get(world);
 if(!colliders){colliders=(world.colliders||[]).filter(c=>c.animatedSolid&&c.model);animatedSupportCache.set(world,colliders);}
 return colliders;
}
function actorRampSupport(world,c,x,z,ceiling){
 let floor=-Infinity;
 const ramps=(world.stairRamps||[]).filter(p=>Math.abs((x-p.x)*p.cos-(z-p.z)*p.sin)<p.w/2+3&&Math.abs((x-p.x)*p.sin+(z-p.z)*p.cos)<p.d/2+3&&ceiling>=p.y&&ceiling<=p.y+p.h+3);
 if(!ramps.length)return floor;
 for(const p of collisionOffsets(c))for(const ramp of ramps){
   const dx=x+p.x-ramp.x,dz=z+p.z-ramp.z,X=dx*ramp.cos-dz*ramp.sin,Z=dx*ramp.sin+dz*ramp.cos;
   for(const t of ramp.supportTriangles){const contact=ramp.y+capsuleTriangleSupport(t,X,Z,p.radius,probeVerticalRadius(p))-p.y;if(contact<=ceiling+.000001&&contact>floor)floor=contact;}
 }
 return floor;
}
const buildingSupportCache=new WeakMap(),buildingTriangleCache=new WeakMap();
function actorBuildingSupport(world,c,x,z,ceiling,floor){
 let buildings=buildingSupportCache.get(world);
 if(!buildings){buildings=(world.colliders||[]).filter(p=>p.model&&['townhouse','workshop','lighthouse','market'].includes(p.kind));buildingSupportCache.set(world,buildings);}
 for(const building of buildings){
  if(ceiling<building.y+building.h*.4||Math.abs(x-building.x)>building.moveHalfX+4||Math.abs(z-building.z)>building.moveHalfZ+4)continue;
  let cached=buildingTriangleCache.get(building);if(!cached){cached=new WeakMap();buildingTriangleCache.set(building,cached);}
  for(const p of collisionOffsets(c)){
   if(p.y>.42)continue;
   const dx=x+p.x-building.x,dz=z+p.z-building.z,X=dx*building.cos-dz*building.sin,Z=dx*building.sin+dz*building.cos,r=p.radius,vr=probeVerticalRadius(p);
   const minX=(X-r)/building.w,maxX=(X+r)/building.w,minZ=(Z-r)/building.d,maxZ=(Z+r)/building.d;
   const visit=node=>{
    if(node.max.x<minX||node.min.x>maxX||node.max.z<minZ||node.min.z>maxZ||building.y+node.max.y*building.h<floor+p.y||building.y+node.min.y*building.h>ceiling+p.y+vr)return;
    if(!node.triangles){visit(node.left);visit(node.right);return;}
    for(const source of node.triangles){
     if(source.normal.y<=1e-8)continue;
     let t=cached.get(source);if(!t){const convert=v=>({x:v.x*building.w,y:building.y+v.y*building.h,z:v.z*building.d}),a=convert(source.a),b=convert(source.b),c=convert(source.c);t={a,b,c,minX:Math.min(a.x,b.x,c.x),maxX:Math.max(a.x,b.x,c.x),minZ:Math.min(a.z,b.z,c.z),maxZ:Math.max(a.z,b.z,c.z)};cached.set(source,t);}
     const support=capsuleTriangleSupport(t,X,Z,r,vr)-p.y;
     if(support<=ceiling+.000001&&support>floor)floor=support;
    }
   };visit(building.model.root);
  }
 }
 return floor;
}
// A native foot can touch a ledge even when the actor origin misses it.
// Resolve that support with the same local solids and capsule envelope used
// by movement, so a blocked fall cannot remain permanently ungrounded.
function actorEdgeSupport(world,c,x,z,ceiling,floor){
 if(!world.supportCollidersAt)return floor;
 const probes=collisionOffsets(c).filter(p=>p.y<=.42);
 let reach=0,lowest=Infinity;for(const p of probes){reach=Math.max(reach,Math.hypot(p.x,p.z)+p.radius);lowest=Math.min(lowest,p.y);}
 for(const solid of world.supportCollidersAt(x,z,reach)){
  if(solid.y+solid.h<=floor+lowest+.000001||solid.y>ceiling+.42)continue;
  for(const p of probes){
   const dx=x+p.x-solid.x,dz=z+p.z-solid.z,X=dx*solid.cos-dz*solid.sin,Z=dx*solid.sin+dz*solid.cos,r=p.radius;
   if(solid.model){
    const minX=(X-r)/solid.w,maxX=(X+r)/solid.w,minZ=(Z-r)/solid.d,maxZ=(Z+r)/solid.d,vr=probeVerticalRadius(p);
    let cache=buildingTriangleCache.get(solid);if(!cache){cache=new WeakMap();buildingTriangleCache.set(solid,cache);}
    const visit=node=>{
     if(node.max.x<minX||node.min.x>maxX||node.max.z<minZ||node.min.z>maxZ||solid.y+node.max.y*solid.h<floor+p.y||solid.y+node.min.y*solid.h>ceiling+p.y+vr)return;
     if(!node.triangles){visit(node.left);visit(node.right);return;}
     for(const source of node.triangles){
      if(source.normal.y<=1e-8)continue;
      let t=solid.animatedSolid?null:cache.get(source);if(!t){const convert=v=>({x:v.x*solid.w,y:solid.y+v.y*solid.h,z:v.z*solid.d}),a=convert(source.a),b=convert(source.b),c=convert(source.c);t={a,b,c,minX:Math.min(a.x,b.x,c.x),maxX:Math.max(a.x,b.x,c.x),minZ:Math.min(a.z,b.z,c.z),maxZ:Math.max(a.z,b.z,c.z)};if(!solid.animatedSolid)cache.set(source,t);}
      const support=capsuleTriangleSupport(t,X,Z,r,vr)-p.y;
      if(support<=ceiling+.000001&&support>floor)floor=support;
     }
    };visit(solid.model.root);
   }else if(!solid.roof){
    const top=solid.y+solid.h-p.y;if(top<=floor||top>ceiling+.000001)continue;
    let distance;
    if(solid.shape==='polygon'){
     let inside=true;distance=Infinity;
     for(let i=0;i<solid.points.length;i++){const a=solid.points[i],b=solid.points[(i+1)%solid.points.length],dx=b.x-a.x,dz=b.z-a.z;if(dx*(Z-a.z)-dz*(X-a.x)<-1e-7)inside=false;const t=clamp(((X-a.x)*dx+(Z-a.z)*dz)/(dx*dx+dz*dz),0,1);distance=Math.min(distance,Math.hypot(X-a.x-dx*t,Z-a.z-dz*t));}
     if(inside)distance=0;
    }else distance=Math.hypot(X-clamp(X,-solid.w/2,solid.w/2),Z-clamp(Z,-solid.d/2,solid.d/2));
    if(distance<r-.00001){const vr=probeVerticalRadius(p),contact=top-vr+vr*Math.sqrt(Math.max(0,1-(distance/r)**2));if(contact>floor)floor=contact;}
   }
  }
 }
 return floor;
}
function actorSupportHeight(s,world,c,x,z,ceiling,stepCeiling=ceiling){
 let floor=actorBuildingSupport(world,c,x,z,stepCeiling,supportHeight(s,world,x,z,ceiling));
 if(c.vy<=0)floor=actorEdgeSupport(world,c,x,z,stepCeiling,floor);
 const nearby=(world.marketHouses||[]).filter(h=>Math.abs(x-h.x)<7&&Math.abs(z-h.z)<7),native=stanceCollisionProbes(c);
 const negativeSole=native.some(p=>Number.isFinite(p.verticalRadius)&&p.verticalRadius>0&&p.y<0);
 const rotors=animatedSupportColliders(world).filter(p=>Math.abs((x-p.x)*p.cos-(z-p.z)*p.sin)<p.w/2+2&&Math.abs((x-p.x)*p.sin+(z-p.z)*p.cos)<p.d/2+2&&ceiling>=p.y&&stepCeiling<=p.y+p.h+2);
 const rampFloor=actorRampSupport(world,c,x,z,stepCeiling);floor=Math.max(floor,rampFloor);
 if(!nearby.length&&!negativeSole&&!rotors.length)return floor;
 const offsets=collisionOffsets(c);
 // A measured sole can begin a few millimetres below the actor origin. Seat
 // its real bottom on an actual surface beneath its center, never below it.
 if(negativeSole)for(const p of offsets)if(Number.isFinite(p.verticalRadius)&&p.verticalRadius>0&&p.y<0){const support=supportHeight(s,world,x+p.x,z+p.z,stepCeiling+p.y,0)-p.y;if(support<=stepCeiling+.000001)floor=Math.max(floor,support);}
 // Compact soles have wide horizontal cells and a thin rounded bottom.
 // A center ray misses a sloping blade under the cell edge. Seat the actual
 // cell on the current triangle envelope, using the same clock as collision.
 for(const rotor of rotors){
  const triangles=[];
  for(const t of rotor.model.triangles){if(t.normal.y<=1e-8)continue;
   const convert=v=>({x:v.x*rotor.w,y:rotor.y+v.y*rotor.h,z:v.z*rotor.d}),a=convert(t.a),b=convert(t.b),c=convert(t.c);
   triangles.push({a,b,c,minX:Math.min(a.x,b.x,c.x),maxX:Math.max(a.x,b.x,c.x),minZ:Math.min(a.z,b.z,c.z),maxZ:Math.max(a.z,b.z,c.z)});
  }
  for(const p of offsets){if(p.anatomy!=='foot'||p.verticalRadius===undefined)continue;
   const dx=x+p.x-rotor.x,dz=z+p.z-rotor.z,X=dx*rotor.cos-dz*rotor.sin,Z=dx*rotor.sin+dz*rotor.cos;
   for(const t of triangles){const contact=capsuleTriangleSupport(t,X,Z,p.radius,probeVerticalRadius(p))-p.y;if(contact<=stepCeiling+.000001&&contact>floor)floor=contact;}
  }
 }
 if(!nearby.length)return floor;
 const probes=offsets.filter(p=>p.y<=.42);
 for(const house of nearby){const cos=Math.cos(house.yaw),sin=Math.sin(house.yaw),triangles=frozenStairTriangles(world,house);
  for(const p of probes){const dx=x+p.x-house.x,dz=z+p.z-house.z,X=dx*cos-dz*sin,Z=dx*sin+dz*cos;
   for(const t of triangles){if(t.onlyFeet&&p.verticalRadius===undefined)continue;const contact=house.baseY+capsuleTriangleSupport(t,X,Z,p.radius,probeVerticalRadius(p))-p.y;if(contact<=stepCeiling+.000001&&contact>floor)floor=contact;}
  }
 }
 return floor;
}
// A jump over a floor is too short to redeploy. A roof or ledge must leave
// room beneath the feet, and the sail must fit above the current body. These
// bounded rays run on deployment and in active flight, never while grounded.
const canopyOrigin={x:0,y:0,z:0},canopyUp={x:0,y:1,z:0};
function canopyClear(s,c,world) {
  const cos=Math.cos(c.yaw),sin=Math.sin(c.yaw);
  for(let i=-1;i<=1;i++)for(let forward=-1;forward<=1;forward++){
    const lateral=i*2.8;canopyOrigin.x=c.x+lateral*cos-forward*sin;canopyOrigin.y=c.y+.001;canopyOrigin.z=c.z-lateral*sin-forward*cos;
    if(rayDistance(world,canopyOrigin,canopyUp,4.1,s)<4.1)return false;
  }
  return true;
}
function canRedeploy(s,c,input,world) {
  return c.stage==='active'&&!c.traversal&&!c.onGround&&!c.swimming&&!inDescent(c)&&input.gliderPressed===true
    &&c.y-supportHeight(s,world,c.x,c.z,c.y)>=REDEPLOY_CLEARANCE&&canopyClear(s,c,world);
}
function finishDescent(s,c) {
  c.stage='active';clearDescent(c);
  emit(s,'land',{id:c.id,x:c.x,y:c.y,z:c.z,impactSpeed:c.landingImpactSpeed||0});
}
// Display interpolation uses the same contact solver after a blocked step and
// the same support surfaces under grounded feet. This is a read-only query;
// neither the authoritative actor nor its save/checkpoints is changed.
export function constrainRenderPosition(s, from, to, world, blocked = false) {
  world.updateAnimatedSolids?.(s.time);
  const result = blocked ? resolveStanceMovement(s,from,to,{...to,stanceHeight:Math.max(stanceHeight(from),stanceHeight(to))},world) : {...to};
  if (from.onGround && to.onGround) result.y = actorSupportHeight(s, world, to, result.x, result.z, Math.max(from.y,to.y)+.55,Math.max(from.y,to.y)+.42);
  return result;
}
function footprintOffsets(c){const cos=Math.cos(c.yaw||0),sin=Math.sin(c.yaw||0);return stanceFootprint(c).map(p=>({x:p.x*cos+p.z*sin,z:-p.x*sin+p.z*cos,radius:p.radius}));}
function collisionOffsets(c){const cos=Math.cos(c.yaw||0),sin=Math.sin(c.yaw||0);return stanceCollisionProbes(c).map(p=>({...p,x:p.x*cos+p.z*sin,z:-p.x*sin+p.z*cos}));}
// Clearance only reads profile identity, weights, yaw and height. Reuse that
// query descriptor so unchanged native bounds keep their existing probe cache.
// Probe caching keys bounds rather than height, so a height change gets a fresh
// descriptor. No descriptor or returned offset is stored in simulation state.
const clearancePoseCache=new WeakMap();
function clearanceCollisionOffsets(actor,pose,height){
 let clearancePose=clearancePoseCache.get(actor);
 if(!clearancePose||clearancePose.stanceHeight!==height){clearancePose={stanceHeight:height};clearancePoseCache.set(actor,clearancePose);}
 clearancePose.characterId=pose.characterId;clearancePose.stanceProfileId=pose.stanceProfileId;
 clearancePose.stanceWeights=pose.stanceWeights;clearancePose.yaw=pose.yaw;
 return collisionOffsets(clearancePose);
}
function overlapsIntactWindow(s,world,point,radius,height){
 for(const pane of collisionPanels(world)){
  if(s.windowHealth?.[pane.id]===0)continue;
  const cos=Math.cos(pane.yaw),sin=Math.sin(pane.yaw),dx=point.x-pane.x,dz=point.z-pane.z;
  if(pane.w/2+radius-Math.abs(dx*cos-dz*sin)>.00001&&pane.depth/2+radius-Math.abs(dx*sin+dz*cos)>.00001&&(pane.h+height)/2-Math.abs(point.y+height/2-pane.y)>.00001)return true;
 }
 return false;
}
// A clear enclosing swept volume proves every native body probe's original
// movement a no-op. Keep the full solver for contact, steps, roofs, shorelines,
// cases, windows, and any malformed/unbounded query. No actor state is cached.
function emptyStanceSweep(s,from,to,probes,world){
 if(!world.clearanceEmpty||!Array.isArray(probes)||!probes.length||probes.length>256)return false;
 if(![from.x,from.y,from.z,to.x,to.y,to.z].every(Number.isFinite))return false;
 const upward=to.y>from.y;
 // Upward movement casts ceilings from the original feet plus EACH probe's
 // height. A tall aggregate midpoint must never hide a low foot-slice ray.
 if(upward&&world.clearanceEmpty.supportsTerrainCeiling!==true)return false;
 let radius=0,base=Infinity,top=-Infinity,terrainCeiling=Infinity;
 for(const p of probes){
  if(!p||![p.x,p.y,p.z,p.radius,p.height].every(Number.isFinite)||p.radius<=0||p.height<=0)return false;
  radius=Math.max(radius,Math.hypot(p.x,p.z)+p.radius);
  base=Math.min(base,p.y,upward?p.y+p.height-.04:p.y);
  top=Math.max(top,p.y+p.height);
  if(upward)terrainCeiling=Math.min(terrainCeiling,from.y+p.y+p.height);
 }
 radius+=Math.hypot(to.x-from.x,to.z-from.z)*.5+1e-6;
 const center={x:(from.x+to.x)*.5,y:Math.min(from.y,to.y)+base-1e-6,z:(from.z+to.z)*.5};
 const height=Math.max(from.y,to.y)+top+1e-6-center.y;
 if(!Number.isFinite(radius)||!Number.isFinite(height)||radius>32||height>32)return false;
 for(const box of s.containers||[])if(Math.abs(center.x-box.x)<=radius+2.00001&&Math.abs(center.z-box.z)<=radius+2.00001)return false;
 if(!panelsOutsideClearance(world,center,radius))return false;
 return world.clearanceEmpty(center,radius,height,true,terrainCeiling,minimumExplicitCap(probes));
}
// Recover only an already intersecting body, in small monotonic steps. Every
// native slice must reduce its existing penetration without acquiring a new
// contact. This avoids reapplying the initial overlap during each swept pass.
function recoverNativeOverlap(s,from,to,probes,world,stepAllowance,supportAt){
 // Even with controls released, an existing penetration must be able to
 // finish separating; the sampled checks below still reject all new contact.
 const requested=Math.hypot(to.x-from.x,to.z-from.z),limit=requested<1e-6?.14:Math.min(.14,requested);
 if(Math.abs(to.y-from.y)>.001)return null;
 const measurementLimit=Math.max(.42,...probes.map(p=>2*(Math.hypot(p.x,p.z)+p.radius)));
 if(!Number.isFinite(measurementLimit)||measurementLimit>32)return null;
 const check=(point,p)=>{
  const a={x:point.x+p.x,y:point.y+p.y,z:point.z+p.z};
  const b=resolveMovement(s,a,a,p.radius,world,p.height,measurementLimit,stepAllowance-p.y,p.verticalRadius);
  return b?{x:b.x-a.x,z:b.z-a.z,length:Math.hypot(b.x-a.x,b.z-a.z)}:null;
 };
 const initial=probes.map(p=>check(from,p));
 if(initial.some(v=>!v)||!initial.some(v=>v.length>1e-5))return null;
 let dx=0,dz=0;for(const v of initial){dx+=v.x;dz+=v.z;}
 const length=Math.hypot(dx,dz);if(length<1e-6)return null;
 dx*=Math.min(limit,length)/length;dz*=Math.min(limit,length)/length;
 let previous=initial,endpoint;
 for(let i=1;i<=8;i++){
  const point={x:from.x+dx*i/8,y:from.y,z:from.z+dz*i/8};
  if(supportAt){point.y=Math.max(from.y,supportAt(point.x,point.z));if(!Number.isFinite(point.y)||point.y-from.y>.14)return null;}
  const next=probes.map(p=>check(point,p));
  for(let j=0;j<next.length;j++){
   const v=next[j],old=previous[j],start=initial[j];
   if(!v||v.length>old.length+1e-6||v.x*start.x+v.z*start.z< -1e-8)return null;
  }
  previous=next;endpoint=point;
 }
 if(previous.reduce((n,v)=>n+v.length,0)>=initial.reduce((n,v)=>n+v.length,0)-1e-6)return null;
 return supportAt?endpoint:{x:from.x+dx,y:from.y,z:from.z+dz};
}
function resolveStanceMovement(s,from,to,c,world){
 // Airborne bodies must clear a ledge before moving over it; they cannot step through its side.
 const probes=collisionOffsets(c),height=stanceHeight(c),stepAllowance=c.onGround===false?0:.42;
 if(probes.length===1&&Math.abs(probes[0].x)+Math.abs(probes[0].z)<1e-8)return resolveMovement(s,from,to,probes[0].radius,world,height,distance(from,to)+2*probes[0].radius+.001,stepAllowance,probes[0].verticalRadius)||{...from};
 if(emptyStanceSweep(s,from,to,probes,world))return {...to};
 let repairDiameter=0;for(const p of probes)repairDiameter=Math.max(repairDiameter,2*(Math.hypot(p.x,p.z)+p.radius));repairDiameter+=.001;
 let candidate={...to};
 // Airborne corner slides must converge with every native body slice clear.
 const descending=to.y<from.y&&c.onGround===false,passes=descending?8:3;
 for(let pass=0;pass<passes;pass++){
  let changed=false;
  for(const p of probes){const a={x:from.x+p.x,y:from.y+p.y,z:from.z+p.z},b={x:candidate.x+p.x,y:candidate.y+p.y,z:candidate.z+p.z},hit=resolveMovement(s,a,b,p.radius,world,p.height,distance(a,b)+repairDiameter,stepAllowance-p.y,p.verticalRadius);
   if(!hit)return {...from};
   // A floor below the old feet is skipped by the sweep. Its edge can still
   // intersect the proposed body when the center has no supporting floor.
   const falling=descending&&hit.y<a.y,cap=Number.isFinite(p.verticalRadius)&&p.verticalRadius>0?p.verticalRadius:Math.min(p.radius,p.height/2);
   const contact=descending?resolveMovement(s,hit,hit,p.radius,world,p.height+(falling?a.y-hit.y:0),repairDiameter,stepAllowance-p.y,falling?cap:p.verticalRadius):hit;
   if(!contact)return {...from};
   if(Math.hypot(contact.x-b.x,contact.y-b.y,contact.z-b.z)>.00001){changed=true;candidate={x:contact.x-p.x,y:contact.y-p.y,z:contact.z-p.z};}
  }
  if(!changed)return candidate;
  // Multiple probe corrections can push a clear endpoint through a wall.
  // Require the entire body to reach the corrected point from the original
  // position; retain all repair passes so ordinary corner slides converge.
  let rejected=false;
  const clear=probes.every(p=>{const point={x:candidate.x+p.x,y:candidate.y+p.y,z:candidate.z+p.z},hit=resolveMovement(s,point,point,p.radius,world,p.height,repairDiameter,stepAllowance-p.y,p.verticalRadius);if(!hit){rejected=true;return false;}return Math.hypot(hit.x-point.x,hit.y-point.y,hit.z-point.z)<=.00001&&!overlapsIntactWindow(s,world,point,p.radius,p.height);});
  if(rejected)return {...from};
  if(clear){
   const swept=probes.every(p=>{const a={x:from.x+p.x,y:from.y+p.y,z:from.z+p.z},b={x:candidate.x+p.x,y:candidate.y+p.y,z:candidate.z+p.z},hit=resolveMovement(s,a,b,p.radius,world,p.height,distance(a,b)+repairDiameter,stepAllowance-p.y,p.verticalRadius);if(!hit){rejected=true;return false;}return Math.hypot(hit.x-b.x,hit.y-b.y,hit.z-b.z)<=.00001;});
   if(rejected)return {...from};
   if(swept&&!descending)return candidate;
  }
 }
 // Spend an unresolved contact's lateral correction at the old height. A
 // later fixed step can descend after the whole body has cleared the ledge.
 if(descending){
  const dx=candidate.x-from.x,dz=candidate.z-from.z,length=Math.hypot(dx,dz),limit=Math.max(Math.hypot(to.x-from.x,to.z-from.z),.14),scale=length>limit?limit/length:1;
  const lateral=resolveStanceMovement(s,from,{x:from.x+dx*scale,y:from.y,z:from.z+dz*scale},c,world);
  return Math.hypot(lateral.x-from.x,lateral.z-from.z)<=limit+.00001?lateral:{...from};
 }
 return recoverNativeOverlap(s,from,to,probes,world,stepAllowance)||{...from};
}
function traversalQueries(s,world){return {
 support:(x,z,ceiling)=>supportHeight(s,world,x,z,ceiling),
 resolve:(from,to,actor)=>resolveStanceMovement(s,from,to,actor,world),
 ray:(origin,direction,length)=>Math.min(rayDistance(world,origin,direction,length,s),windowHits(world,s,origin,direction,length)[0]?.distance??length)
};}
// Prove the union of every authored stance probe empty in one conservative
// cylinder. This never replaces a contact result: any possible obstruction or
// terrain intersection falls back to every original volume and ray below.
function emptyStanceClearance(s,c,probes,world){
  const terrain=world.terrain;
  if(!world.clearanceEmpty||!terrain?.heights||!Array.isArray(probes)||!probes.length||probes.length>256||![c.x,c.y,c.z].every(Number.isFinite))return false;
  if(!Number.isInteger(terrain.size)||terrain.size<2||!Number.isFinite(terrain.step)||terrain.step<=0||!Number.isFinite(terrain.half)||terrain.heights.length<terrain.size*terrain.size)return false;
  let radius=0,base=Infinity,top=-Infinity,midpoint=Infinity;
  for(const p of probes){
    if(!p||![p.x,p.y,p.z,p.radius,p.height].every(Number.isFinite)||p.radius<=0||p.height<=0)return false;
    radius=Math.max(radius,Math.hypot(p.x,p.z)+p.radius);
    // Some native slice probes are less than 8cm tall. Their horizontal ray
    // can be below the usual 4cm vertical-ray origin, so include it explicitly.
    base=Math.min(base,p.y,p.y+Math.min(.04,p.height*.5)-.04);
    top=Math.max(top,p.y+p.height);midpoint=Math.min(midpoint,c.y+p.y+p.height*.5);
  }
  radius+=1e-6;base-=1e-6;top+=1e-6;
  const center={x:c.x,y:c.y+base,z:c.z},height=top-base;
  if(!Number.isFinite(radius)||!Number.isFinite(height)||radius>32||height>32)return false;
  for(const box of s.containers||[])if(Math.abs(c.x-box.x)<=radius+2.00001&&Math.abs(c.z-box.z)<=radius+2.00001)return false;
  if(!panelsOutsideClearance(world,center,radius))return false;
  // A triangle's maximum lies at a vertex. Use the LOWEST horizontal probe
  // ray, not the enclosing cylinder's midpoint, to preserve the original
  // short foot-slice rays against sloping ground.
  if(world.clearanceEmpty.supportsTerrainCeiling!==true){
    const {size,half,step,heights}=terrain;
    const x0=Math.floor(clamp((c.x-radius+half)/step,0,size-1.000001)),x1=Math.floor(clamp((c.x+radius+half)/step,0,size-1.000001))+1;
    const z0=Math.floor(clamp((c.z-radius+half)/step,0,size-1.000001)),z1=Math.floor(clamp((c.z+radius+half)/step,0,size-1.000001))+1;
    for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++)if(!Number.isFinite(heights[z*size+x])||heights[z*size+x]>=midpoint-1e-6)return false;
  }
  return world.clearanceEmpty(center,radius,height,true,midpoint,minimumExplicitCap(probes),true);
}
// A rotating probe center traces a circular arc. Its chord midpoint and
// half-chord plus sagitta enclose that complete arc, not just sampled angles.
// The flat cylinder also encloses every original rounded probe at every yaw.
function airborneTurnVolumeClear(s,world,center,radius,height){
 for(const box of s.containers||[])if(caseActorOverlap(box,center,s.time,radius,height))return false;
 if(!panelsOutsideClearance(world,center,radius))for(const pane of collisionPanels(world))if(s.windowHealth?.[pane.id]!==0&&rayWindow(pane,center,{x:0,y:0,z:0},0,radius,height))return false;
 // Nearly flat caps plus the outward margin keep the broad-phase proof from
 // treating a probe's bottom few centimetres as an existing step allowance.
 return world.clearanceEmpty(center,radius,height,false,center.y,1e-9,true);
}
function airborneWholeTurnClear(s,c,world){
 if(typeof world.clearanceEmpty!=='function')return false;
 let radius=0,bottom=Infinity,top=-Infinity;
 for(const p of collisionOffsets(c)){radius=Math.max(radius,Math.hypot(p.x,p.z)+p.radius);bottom=Math.min(bottom,p.y);top=Math.max(top,p.y+p.height);}
 const center={x:c.x,y:c.y+bottom-1e-6,z:c.z};radius+=1e-6;
 return airborneTurnVolumeClear(s,world,center,radius,top-bottom+2e-6);
}
function airborneTurnSegmentClear(s,c,fromYaw,toYaw,world){
 if(typeof world.clearanceEmpty!=='function')return false;
 const from=collisionOffsets({...c,yaw:fromYaw}),to=collisionOffsets({...c,yaw:toYaw}),angle=Math.abs(toYaw-fromYaw);
 if(!Number.isFinite(angle)||angle>.15000001)return false;
 for(let i=0;i<from.length;i++){
  const a=from[i],b=to[i],orbit=Math.hypot(a.x,a.z),radius=a.radius+Math.hypot(a.x-b.x,a.z-b.z)*.5+orbit*(1-Math.cos(angle*.5))+1e-6;
  const center={x:c.x+(a.x+b.x)*.5,y:c.y+a.y-1e-6,z:c.z+(a.z+b.z)*.5};
  if(!airborneTurnVolumeClear(s,world,center,radius,a.height+2e-6))return false;
 }
 return true;
}
function move(s,c,input,dt,world){
 // Geometry and its transforms stay fixed during this synchronous actor move.
 if(typeof world.withStaticMovementQueries==='function')return world.withStaticMovementQueries(()=>moveWithStaticQueries(s,c,input,dt,world));
 return moveWithStaticQueries(s,c,input,dt,world);
}
function moveWithStaticQueries(s, c, input, dt, world) {
  if(c.traversal || c.isPlayer && input.jumpPressed){
    const query=traversalQueries(s,world),event=(type,fields)=>emit(s,type,fields);
    if(c.traversal || beginTraversal(c,input,query,event))return advanceTraversal(c,dt,query,event);
  }
  const forward = clamp(finite(input.forward) ? input.forward : 0, -1, 1);
  const strafe = clamp(finite(input.strafe) ? input.strafe : 0, -1, 1);
  const norm = Math.max(1, Math.hypot(forward, strafe));
  c.swimming = isSwimming(c, world);
  const airborne = inDescent(c);
  const canFit=(height,radius=.45,pose=c)=>{
    const probes=clearanceCollisionOffsets(c,pose,height);
    if(emptyStanceClearance(s,c,probes,world))return true;
    // Every clearance ray and support sample stays inside these probe bounds.
    // Retain a generous case/lid margin and original order, then share the
    // shortlist across all rays instead of scanning distant chests each time.
    let reachX=0,reachZ=0;
    for(const p of probes){reachX=Math.max(reachX,Math.abs(p.x)+p.radius+3);reachZ=Math.max(reachZ,Math.abs(p.z)+p.radius+3);}
    const clearanceState={...s,containers:(s.containers||[]).filter(box=>Math.abs(c.x-box.x)<=reachX&&Math.abs(c.z-box.z)<=reachZ)};
    for(const p of probes){
      const center={x:c.x+p.x,y:c.y+p.y,z:c.z+p.z};
      if(overlapsIntactWindow(s,world,center,p.radius,p.height))return false;
      // A few mid-height and vertical rays can miss a low case corner inside
      // a native body probe. Use the same volumes as movement before allowing
      // a new facing; otherwise aiming repeatedly depenetrates the contestant.
      for(const box of clearanceState.containers){
        if(Math.abs(center.x-box.x)>p.radius+2||Math.abs(center.z-box.z)>p.radius+2)continue;
        const overlap=box.opened?caseActorOverlap(box,center,s.time,p.radius,p.height):center.y>=box.y+CONTAINER_GEOMETRY.height-.01||center.y+p.height<=box.y?null:boxEscape(box,center,p.radius);
        if(overlap&&overlap.depth>.00001)return false;
      }
      if(world.clearanceEmpty?.(center,p.radius,p.height,true,Infinity,p.verticalRadius,true)&&panelsOutsideClearance(world,center,p.radius)&&clearanceState.containers.every(box=>Math.abs(center.x-box.x)>p.radius+1||Math.abs(center.z-box.z)>p.radius+1))continue;
      const free=world.resolveMove(center,center,p.radius,p.height,(c.onGround===false?0:.42)-p.y,p.verticalRadius);
      const stairFloor=world.stairSupportAt?.(center.x,center.z,center.y+.42);
      const stairFeet=finite(stairFloor)?Math.max(center.y,stairFloor):null;
      if(distance(center,free)>.001)return false;
      for(const [x,z] of [[1,0],[-1,0],[0,1],[0,-1],[.707,.707],[-.707,.707],[.707,-.707],[-.707,-.707]]){
        const origin={x:center.x,y:center.y+p.height*.5,z:center.z},direction={x,y:0,z};
        if(rayDistance(world,origin,direction,p.radius,clearanceState)<p.radius-.001||windowHits(world,s,origin,direction,p.radius).length)return false;
      }
      for(const [x,z] of [[0,0],[1,0],[-1,0],[0,1],[0,-1],[.707,.707],[-.707,.707],[.707,-.707],[-.707,-.707]]){
        const origin={x:center.x+x*p.radius*.97,y:center.y+.04,z:center.z+z*p.radius*.97};
        // A step beneath a footprint edge is support, not an overhead barrier.
        // Retain the actor's top so this cannot increase available headroom.
        origin.y=Math.max(origin.y,supportHeight(clearanceState,world,origin.x,origin.z,c.y+.55)+.04);
        // A rear native slice can span several short treads. Match the
        // movement solver's bounded stair band without skipping a roof.
        if(stairFeet!==null)origin.y=Math.max(origin.y,world.stairSupportAt(origin.x,origin.z,stairFeet+.42)+.04);
        const overhead=center.y+p.height-origin.y;
        if(overhead>0&&(rayDistance(world,origin,{x:0,y:1,z:0},overhead,clearanceState)<overhead-.001||windowHits(world,s,origin,{x:0,y:1,z:0},overhead).length))return false;
      }
    }
    return true;
  };
  // Controls follow the camera even when nearby walls prevent the body turning.
  // Otherwise looking toward an exit keeps walking into the blocked old heading.
  const movementYaw=c.yaw;
  // A blocked fall can rest against a case without a floor contact. It still
  // needs body-turn clearance; zero vertical speed is not permission to clip.
  const constrainTurn=c.onGround||c.vy===0||airborne;
  if(constrainTurn&&finite(c.stanceYaw)&&footprintOffsets(c).length>1){
    const delta=Math.atan2(Math.sin(c.yaw-c.stanceYaw),Math.cos(c.yaw-c.stanceYaw)),steps=Math.max(1,Math.ceil(Math.abs(delta)/.15));
    const emptyAirTurn=airborne&&Math.abs(delta)>.0001&&airborneWholeTurnClear(s,c,world);
    let accepted=c.stanceYaw;
    for(let i=1;Math.abs(delta)>.0001&&i<=steps;i++){const yaw=c.stanceYaw+delta*i/steps;if(airborne?!emptyAirTurn&&!airborneTurnSegmentClear(s,c,accepted,yaw,world):!canFit(stanceHeight(c),stanceRadius(c),{...c,yaw}))break;accepted=yaw;}
    if(Math.abs(delta)>.0001)c.yaw=Math.atan2(Math.sin(accepted),Math.cos(accepted));
  }
  if(constrainTurn&&Math.abs(Math.atan2(Math.sin(movementYaw-c.yaw),Math.cos(movementYaw-c.yaw)))>.0001)c.turnBlocked=true;
  else delete c.turnBlocked;
  c.stanceYaw=c.yaw;
  updateStance(c,input,dt,s.time,canFit,(type,fields)=>emit(s,type,fields));
  // Exhaustion is a state, not a one-tick speed switch. Without a recovery
  // band, holding sprint alternates drain/recharge every tick and makes an
  // analog gait flip between Walk and Run continuously.
  if(c.stamina<=0)c.sprintExhausted=true;
  else if(c.stamina>=20)c.sprintExhausted=false;
  const sprint = c.stance==='stand' && Object.values(c.stanceWeights).every(v=>v<.02) && !airborne && input.sprint && !c.swimming && c.stamina > 0 && c.sprintExhausted!==true && !input.aim;
  // Probe the next horizontal position too, so a rising roof or hillside opens
  // the canopy before crossing it instead of considering only terrain behind us.
  const clearance = airborne ? c.y - Math.max(
    supportHeight(s,world,c.x,c.z,c.y),
    supportHeight(s,world,c.x+c.vx*.5,c.z+c.vz*.5,c.y)) : 0;
  const deployClear = c.descentActive!==true || c.canopyOpen || canopyClear(s,c,world);
  const speed = airborne ? updateDescent(c,input,dt,clearance,s.time,(type,fields)=>emit(s,type,fields),deployClear) : c.swimming ? (input.aim ? 2 : 2.8) : sprint ? 8.8 : stanceWalkSpeed(c,input.aim);
  c.stamina = clamp(c.stamina + (sprint && Math.hypot(forward, strafe) > .1 ? -17 : 12) * dt, 0, 100);
  const dx = (-Math.sin(movementYaw) * forward + Math.cos(movementYaw) * strafe) / norm * speed;
  const dz = (-Math.cos(movementYaw) * forward - Math.sin(movementYaw) * strafe) / norm * speed;
  const smooth = 1 - Math.exp(-(c.onGround ? 18 : 5) * dt);
  if(c.stance!=='slide'){
    // Ground friction holds released movement immediately; aerial momentum
    // and deliberate slides keep their existing movement rules.
    if(c.onGround&&!airborne&&!c.swimming&&forward===0&&strafe===0){c.vx=0;c.vz=0;}
    else{c.vx += (dx - c.vx) * smooth; c.vz += (dz - c.vz) * smooth;}
  }
  const wasGrounded=c.onGround;
  if (!airborne && c.onGround && !c.swimming && c.stance==='stand' && input.jumpPressed && canFit(stanceHeight(c)) && c.healTime <= 0) { c.vy = 7.2; c.onGround = false; emit(s,'jump',{id:c.id,x:c.x,y:c.y,z:c.z}); }
  const followGround = c.onGround && !airborne && c.vy <= 0;
  if (!airborne) c.vy -= 20 * dt;
  const impactSpeed = Math.max(0,-c.vy);
  const from = { x: c.x, y: c.y, z: c.z };
  const to = { x: c.x + c.vx * dt, y: c.y + c.vy * dt, z: c.z + c.vz * dt };
  // Follow nearby support during the sweep. Applying a gravity displacement
  // into a grounded ramp projects it downhill, even with released controls.
  // The complete body sweep still checks walls, ceilings and the sloped path.
  if(followGround){const nextFloor=actorSupportHeight(s,world,c,to.x,to.z,from.y+.42);if(Math.abs(nextFloor-from.y)<=.42)to.y=nextFloor;}
  // Meet a real center/sole support before checking the airborne endpoint.
  // Edge contacts without support must slide clear instead of hanging there.
  if(!followGround&&to.y<from.y){const landingFloor=actorSupportHeight(s,world,c,to.x,to.z,from.y);if(landingFloor<=from.y)to.y=Math.max(to.y,landingFloor);}
  let resolved = resolveStanceMovement(s,from,to,c,world);
  if(followGround&&world.stairSupportAt&&Math.hypot(to.x-from.x,to.z-from.z)>.00001){
    const support=actorSupportHeight(s,world,c,to.x,to.z,from.y+.42);
    const stair=Math.max(authoredStairSupport(world,to.x,to.z,from.y+.42),actorRampSupport(world,c,to.x,to.z,from.y+.42));
    if(Number.isFinite(stair)&&support>from.y+.00001&&support-from.y<=.420001){
      const raised={x:from.x,y:support,z:from.z},strict={...c,onGround:false};
      const lift=resolveStanceMovement(s,from,raised,strict,world);
      if(Math.hypot(lift.x-raised.x,lift.y-raised.y,lift.z-raised.z)<.0001){
        const target={x:to.x,y:support,z:to.z},across=resolveStanceMovement(s,lift,target,strict,world);
        if(Math.hypot(across.x-target.x,across.y-target.y,across.z-target.z)<.0001)resolved=across;
      }
    }
  }
  // Clear a contacted edge horizontally before descending alongside it.
  // A diagonal display chord between those two phases could cut a thin rail.
  if(!followGround&&to.y<from.y&&Math.hypot(resolved.x-to.x,resolved.z-to.z)>.00001&&(resolved.y>=from.y||Math.hypot(resolved.x-from.x,resolved.z-from.z)>.00001)){
    // A horizontal wall cannot cancel gravity when the vertical path is clear.
    // Keep this motion on one axis so interpolation cannot cut the contact corner.
    let falling=null;
    if(to.x!==from.x||to.z!==from.z){
      const floor=actorSupportHeight(s,world,c,from.x,from.z,from.y),target={x:from.x,y:Math.max(from.y+c.vy*dt,floor),z:from.z};
      if(target.y<from.y)falling=resolveStanceMovement(s,from,target,c,world);
    }
    if(falling&&falling.y<from.y&&Math.hypot(falling.x-from.x,falling.z-from.z)<=.00001)resolved=falling;
    else resolved=resolveStanceMovement(s,from,{x:resolved.x,y:from.y,z:resolved.z},c,world);
  }
  // A blocked downward contact must not cancel an otherwise clear escape.
  // Keep the ordinary diagonal sweep first; only separate its axes when it
  // returned the original pose despite requested horizontal movement.
  if(to.y<from.y&&Math.hypot(to.x-from.x,to.z-from.z)>.00001&&Math.hypot(resolved.x-from.x,resolved.y-from.y,resolved.z-from.z)<.000001){
    const lateral=resolveStanceMovement(s,from,{x:to.x,y:from.y,z:to.z},c,world);
    if(Math.hypot(lateral.x-from.x,lateral.z-from.z)>.00001){
      resolved=airborne?lateral:resolveStanceMovement(s,lateral,{x:lateral.x,y:to.y,z:lateral.z},c,world);
    }
  }
  // A contact correction must not turn one input step into a sideways shove.
  // Re-sweep a bounded endpoint; never clamp through a solid after collision.
  const travelLimit=Math.max(.14,Math.hypot(to.x-from.x,to.z-from.z))+.0001;
  const resolvedTravel=Math.hypot(resolved.x-from.x,resolved.z-from.z);
  if(resolvedTravel>travelLimit){
    const fraction=travelLimit/resolvedTravel,target={x:from.x+(resolved.x-from.x)*fraction,y:resolved.y,z:from.z+(resolved.z-from.z)*fraction};
    let bounded=resolveStanceMovement(s,from,target,c,world);
    if(Math.hypot(bounded.x-from.x,bounded.z-from.z)>travelLimit+.000001){
      const horizontal=resolveStanceMovement(s,from,{x:to.x,y:from.y,z:to.z},c,world);
      bounded=Math.hypot(horizontal.x-from.x,horizontal.z-from.z)<=travelLimit+.000001?horizontal:from;
    }
    resolved=bounded;
  }
  if (!point(resolved)) throw new Error('World movement returned invalid coordinates');
  // A blocked fall has spent its downward momentum at the contact. Keep
  // support detection separate: wall contact alone does not grant grounding.
  if(c.vy<0&&resolved.y>to.y+.00001)c.vy=0;
  if(c.stance==='slide'&&Math.hypot(resolved.x-from.x,resolved.z-from.z)<Math.hypot(c.vx,c.vz)*dt*.2){c.slideTime=0;c.vx=0;c.vz=0;}
  c.x = resolved.x; c.y = resolved.y; c.z = resolved.z;
  const ceiling=Math.max(from.y,c.y)+.55;
  const floor = actorSupportHeight(s, world, c, c.x, c.z, ceiling,from.y+.42);
  // Swept contacts stop 0.1 mm before a face. Treat that separation as
  // grounded contact, otherwise a resting actor cannot jump off a case rim.
  // Keep existing contact down slopes and steps within the same 0.42 m height
  // the world lets us climb. Gravity alone drops only 5.6 mm on its first tick,
  // so an ordinary downhill stride otherwise alternates falling and landing.
  // A jump clears onGround above; a larger ledge drop still becomes airborne.
  let grounded = c.y <= floor + .0002;
  if (!grounded && followGround && c.y <= from.y && from.y-floor <= .42) {
    // A lower support can sit beneath a slanted obstacle (an opening lid).
    // Sweep the actual body down before following it, preserving collision's
    // separation if that path is blocked or the sweep redirects sideways.
    const contact = resolveStanceMovement(s,resolved,{...resolved,y:floor},c,world);
    grounded = Math.abs(contact.y-floor) <= .0002 && Math.hypot(contact.x-c.x,contact.z-c.z) < .00001;
  }
  if(grounded&&floor>c.y+.00001){
    // A reachable floor is not proof of headroom. Check native volume above
    // the allowed stair band before accepting the proposed supported pose.
    const fitsSupport=collisionOffsets(c).every(p=>{
      const base=Math.max(p.y,.42),height=p.y+p.height-base;if(height<=0)return true;
      const position={x:c.x+p.x,y:floor+base,z:c.z+p.z},hit=resolveMovement(s,position,position,p.radius,world,height,2*p.radius+.001,p.verticalRadius===undefined?.42:.42-base,p.verticalRadius);
      // Preserve the existing 0.1mm contact skin when a triangle slide is rechecked.
      return !!hit&&Math.hypot(hit.x-position.x,hit.y-position.y,hit.z-position.z)<=.0001;
    });
    if(!fitsSupport){
      // A body already overlapping scenery can find a safe lateral repair but
      // still fail the final slope lift. Keep that progress only after every
      // native slice passes the same monotonic/no-new-contact checks along a
      // support-following path, bounded to 14 cm horizontally and vertically.
      if(!wasGrounded&&to.y<from.y){
        const recovery=recoverNativeOverlap(s,from,{x:resolved.x,y:from.y,z:resolved.z},collisionOffsets(c),world,0,
          (x,z)=>actorSupportHeight(s,world,c,x,z,from.y+.14));
        if(recovery){c.x=recovery.x;c.y=recovery.y;c.z=recovery.z;c.vx=0;c.vy=0;c.vz=0;c.onGround=false;return distance(from,recovery);}
      }
      c.x=from.x;c.y=from.y;c.z=from.z;c.vx=0;c.vy=0;c.vz=0;c.onGround=wasGrounded;
      return 0;
    }
  }
  if (grounded) { c.y = floor; c.vy = 0; c.onGround = true; if(airborne)c.landingImpactSpeed=impactSpeed; }
  else c.onGround = false;
  if(grounded&&!wasGrounded&&!airborne&&impactSpeed>=2.4)emit(s,'groundLand',{id:c.id,x:c.x,y:c.y,z:c.z,impactSpeed});
  c.swimming = isSwimming(c, world);
  // A low body leaving a ledge keeps its clearance until standing fits.
  if((!c.onGround||c.swimming)&&c.stance==='stand')c.slideTime=0;
  if(c.descentActive===true&&c.canopyOpen&&!c.onGround&&!canopyClear(s,c,world))
    updateDescent(c,input,0,clearance,s.time,(type,fields)=>emit(s,type,fields),false);
  return Math.hypot(c.x - from.x, c.z - from.z);
}
function botInput(s, c, world) {
  const b = c.bot,preference=botPreference(s.seed,c.id);
  if (c.stage === 'insertion') return {};
  if (c.stage === 'landing') {
    const dx = c.targetX - c.x, dz = c.targetZ - c.z;
    const distanceToLanding = Math.hypot(dx,dz);
    return { yaw: distanceToLanding > 1 ? Math.atan2(-dx, -dz) : c.yaw,
      forward: distanceToLanding > 1 ? 1 : 0, dive: distanceToLanding < 12,
      gliderPressed: !c.canopyOpen && distanceToLanding > 30 };
  }
  if (s.time >= b.nextThink) {
    b.nextThink = s.time + .2 + random(s) * .12;
    let target = null, score = Infinity;
    for (const other of s.contestants) {
      if (other === c || !other.alive || other.stage !== 'active') continue;
      const d = distance(c, other);
      const facing = ((other.x - c.x) * -Math.sin(c.yaw) + (other.z - c.z) * -Math.cos(c.yaw)) / Math.max(d, .01);
      // A farther contestant cannot replace the nearest visible target. Avoid
      // tracing its complete world/window/case line after that target is known.
      if (d >= score || d > 105 || (d > 14 && facing < -.1) || !visible(world, c, other,s)) continue;
      if (d < score) { score = d; target = other; }
    }
    if (target) {
      if (b.targetId !== target.id) b.reactAt = s.time + .45 + random(s) * .35;
      b.targetId = target.id; b.seenAt = s.time; b.goalX = target.x; b.goalZ = target.z; b.goalY = target.y;
    } else if (s.time - b.seenAt > 2.3) b.targetId = null;
    const st = s.storm;
    const nextDistance=Math.hypot(c.x-st.nextCenterX,c.z-st.nextCenterZ),margin=Math.min(10,st.nextRadius*.2);
    const departureLead=Math.max(0,nextDistance-st.nextRadius+margin)/5.8+18;
    const danger = Math.hypot(c.x-st.centerX,c.z-st.centerZ)>st.radius-Math.min(10,st.radius*.2)
      || nextDistance>st.nextRadius-margin&&(st.phase!=='waiting'||getStormStatus(s).secondsRemaining<departureLead);
    if (danger) {
      if(!b.stormGoal||b.stormGoal.index!==st.index)b.stormGoal=safeZoneGoal(c,st,world,0,s.seed);
      b.mode='storm';b.goalX=b.stormGoal.x;b.goalZ=b.stormGoal.z;b.goalY=b.stormGoal.y;
    }
    else if (target) b.mode = c.hp < 35 ? 'retreat' : 'engage';
    else {
      let loot = null, nearest = 65, mode = 'loot';
      for (const l of s.loot) {
        if (l.taken || !botWantsLoot(c,l) || navigationAvoids(b,l,s.time) || Math.hypot(l.x - st.centerX, l.z - st.centerZ) > st.radius - 5) continue;
        const distanceToLoot=distance(c,l);if(distanceToLoot>=65)continue;
        const owned=c.inventory.weapons.find(w=>w.id===l.kind);
        const urgency=l.kind==='heal'&&c.hp<65&&c.inventory.heals===0?.45
          :l.kind==='shield'&&c.shield<60&&c.inventory.shields===0?.55
          :l.kind==='ammo'&&c.inventory.weapons.some(w=>w.reserve<WEAPONS[w.id].magazine)?.6
          :owned&&owned.tier<l.tier?.75:1;
        const d=distanceToLoot*urgency*(.94+botPreference(s.seed,c.id,l.id+101)*.12);
        if (d < nearest) { nearest = d; loot = l; }
      }
      // Closed containers are visible destinations, not a private list of
      // rewards. Bots only inspect individual contents after they become loot.
      for (const box of s.containers || []) {
        if (box.opened || navigationAvoids(b,box,s.time) || Math.abs(box.y-c.y)>2 || Math.hypot(box.x-st.centerX,box.z-st.centerZ)>st.radius-5) continue;
        const d = distance(c,box);
        if (d<nearest && clearSegment(world,{x:c.x,y:c.y+stanceEyeHeight(c),z:c.z},{x:box.x,y:box.y+CONTAINER_GEOMETRY.height+.03,z:box.z},s)) {
          loot=box;nearest=d;mode='container';
        }
      }
      if (loot) { b.mode = mode; b.goalX = loot.x; b.goalZ = loot.z; b.goalY = loot.y; }
      else if (s.time >= b.wanderAt || distance(c, { x: b.goalX, z: b.goalZ }) < 3) {
        b.mode = 'roam'; b.wanderAt = s.time + 5 + random(s) * 5;
        const roamGoal=safeZoneGoal(c,st,world,Math.floor(b.wanderAt),s.seed);
        b.goalX=roamGoal.x;b.goalZ=roamGoal.z;b.goalY=roamGoal.y;
      }
    }
  }
  const target = s.contestants[b.targetId];
  const hasSight = target?.alive && s.time - b.seenAt < .4 && visible(world, c, target,s);
  const dx = b.goalX - c.x, dz = b.goalZ - c.z, dist = Math.hypot(dx, dz);
  let yaw = Math.atan2(-dx, -dz), forward = dist > 1.3 ? 1 : 0, strafe = 0, fireNow = false, pitch = 0, slotPressed = -1;
  let followingRoute = false;
  if (hasSight && (b.mode === 'engage' || b.mode === 'retreat')) {
    const d = distance(c, target);
    let best = -1;
    for (const [i, candidate] of c.inventory.weapons.entries()) {
      if (candidate.mag + candidate.reserve <= 0) continue;
      const spec = WEAPONS[candidate.id];
      const coneHit = Math.min(1, .4 / Math.max(.01, spec.spread * .28 * d));
      const score = spec.damage * spec.pellets / spec.interval * coneHit * coneHit * clamp(1 - Math.max(0, d-spec.falloff)/spec.range, .1, 1);
      if (score > best) { best = score; slotPressed = i; }
    }
    const w = c.inventory.weapons[slotPressed] || weapon(c), preferred = WEAPONS[w.id].falloff * (.58+preference*.2);
    yaw = Math.atan2(c.x - target.x, c.z - target.z);
    pitch = Math.atan2(target.y + stanceHeight(target)*.58 - (c.y + stanceEyeHeight(c)), d);
    // Aim error is deterministic but never a perfect lock. Human and bot shots
    // still use the same spread, magazine, cadence, hit zones and occlusion.
    yaw += Math.sin(s.time * 2.4 + c.id * 3.1) * (.028+preference*.01);
    pitch += Math.sin(s.time * 1.7 + c.id) * (.018+preference*.006);
    forward = b.mode === 'retreat' ? -1 : d > preferred * 1.2 ? 1 : d < preferred * .65 ? -.5 : 0;
    const strafePhase=Math.floor((s.time+c.id*.37)/(1.4+preference*.8));
    strafe = b.strafe * (strafePhase%2?-1:1) * (.5+preference*.15);
    // Short aimed bursts leave time to move, reload and use cover. A bot with
    // continuously held fire and perfect tracking erased most of this island's
    // field before the first storm warning in the actual-world probe.
    const burstCycle = (s.time - b.reactAt + c.id * .19) % (2.2+preference*.45);
    fireNow = s.time >= b.reactAt && d < WEAPONS[w.id].range && burstCycle < .78+preference*.22;
  } else if (!c.swimming) {
    const goal={x:b.goalX,y:b.goalY??null,z:b.goalZ};
    const routeFloor=(x,z,ceiling)=>Math.max(supportHeight(s,world,x,z,ceiling),actorRampSupport(world,{stanceHeight:1.8},x,z,ceiling));
    const queries={
      move:(from,to)=>{
        // Route sweeps follow the same bounded support as grounded movement.
        // A flat sweep into a continuous stair ramp falsely reports a wall.
        const floor=routeFloor(to.x,to.z,from.y+.42);
        const target=Math.abs(floor-from.y)<=.42?{...to,y:floor}:to;
        return resolveMovement(s,from,target,.45,world);
      },
      height:routeFloor,
      reach:(from,to)=>clearSegment(world,{x:from.x,y:from.y+1.5,z:from.z},{x:to.x,y:(to.y??from.y)+(b.mode==='container'?CONTAINER_GEOMETRY.height+.03:.3),z:to.z},s),
    };
    const indoor=indoorStairGuidance(c,goal,world.houses,queries);
    if(indoor?.following){
      const sameTurn=b.navigation&&distance(b.navigation.goal,indoor.point)<.1&&Math.abs(b.navigation.goal.y-indoor.point.y)<.1;
      if(!sameTurn)delete b.navigation;
      yaw=Math.atan2(c.x-indoor.point.x,c.z-indoor.point.z);forward=clamp(distance(c,indoor.point)*5,0,1);followingRoute=true;
      // A movable obstruction can occupy an authored turn. Use the existing
      // bounded planner around it, then abandon an unreachable supply through
      // the same temporary avoidance used by outdoor loot navigation.
      if(sameTurn||b.blockedTime>.6){
        const turnQueries={...queries,reach:(from,to)=>{const end=walkSegment(from,to,queries);return !!end&&Math.abs(end.y-to.y)<.25;}};
        const waypoint=navigationTarget(b,c,indoor.point,s.time,s.tick,turnQueries,()=>navigationBudget(s,c.id),()=>navigationCapacity(s),s.characterAssignment?s.contestants.length:32);
        if(waypoint){yaw=Math.atan2(c.x-waypoint.point.x,c.z-waypoint.point.z);forward=waypoint.waiting?0:clamp(distance(c,waypoint.point)*1.5,.35,1);}
        if(navigationAvoids(b,indoor.point,s.time)){
          if(['loot','container'].includes(b.mode))b.navigationAvoid=[...(b.navigationAvoid||[]).filter(p=>p.until>s.time&&distance(p,goal)>=1),{...goal,until:s.time+30}].slice(-4);
          b.nextThink=0;forward=0;
        }
      }
    }else{
      const guide=stairGuidance(c,goal,world.stairs);
      const walkingGoal=indoor?.point??(guide&&!navigationAvoids(b,guide,s.time)&&(b.blockedTime>.25||b.navigation?.stalled||b.navigation&&distance(b.navigation.goal,goal)>1)?guide:goal);
      if(walkingGoal!==goal){yaw=Math.atan2(c.x-walkingGoal.x,c.z-walkingGoal.z);forward=distance(c,walkingGoal)>.3?1:0;followingRoute=true;}
      const waypoint=navigationTarget(b,c,walkingGoal,s.time,s.tick,queries,()=>navigationBudget(s,c.id),()=>navigationCapacity(s),s.characterAssignment?s.contestants.length:32);
      if(waypoint){yaw=Math.atan2(c.x-waypoint.point.x,c.z-waypoint.point.z);forward=waypoint.waiting?0:clamp(distance(c,waypoint.point)*1.5,.35,1);followingRoute=true;}
    }
  }
  if (!followingRoute && b.blockedTime > .25) {
    // Probe both sides of the actual obstacle. There is no stuck teleport or
    // private bot-only collision layer.
    for (const sign of [b.strafe, -b.strafe]) {
      const angle = yaw + sign * 1.15;
      const from = { x: c.x, y: c.y, z: c.z }, to = { x: c.x - Math.sin(angle) * 2, y: c.y, z: c.z - Math.cos(angle) * 2 };
      const p = resolveMovement(s,from,to,.45,world);
      if (distance(from, p) > 1.2) { yaw = angle; forward = 1; strafe = 0; fireNow = false; break; }
    }
  }
  // A body pinned while engaging still needs locomotion recovery. Retreat
  // from its actual facing for a short interval, through ordinary physics;
  // clear stale navigation so the next plan starts from the recovered feet.
  if(b.contactEscape&&s.time>=b.contactEscape.until)delete b.contactEscape;
  if(!b.contactEscape&&b.blockedTime>1.2&&(c.onGround||c.vy===0&&!inDescent(c))){
    const offset=[Math.PI,Math.PI/2,-Math.PI/2,Math.PI*3/4,-Math.PI*3/4,0,Math.PI/4,-Math.PI/4][(b.contactEscapeAttempt||0)%8];
    b.contactEscapeAttempt=((b.contactEscapeAttempt||0)+1)%8;
    delete b.navigation;
    let escapeYaw=c.yaw+offset;
    // Existing native overlap identifies the outward direction more reliably
    // than reversing a facing that may itself be blocked by the wall.
    let escapeX=0,escapeZ=0;
    for(const p of collisionOffsets(c)){
      const a={x:c.x+p.x,y:c.y+p.y,z:c.z+p.z},hit=resolveMovement(s,a,a,p.radius,world,p.height,.42,.42-p.y,p.verticalRadius);
      if(hit){escapeX+=hit.x-a.x;escapeZ+=hit.z-a.z;}
    }
    if(Math.hypot(escapeX,escapeZ)>1e-5)escapeYaw=Math.atan2(-escapeX,-escapeZ);
    b.contactEscape={yaw:Math.atan2(Math.sin(escapeYaw),Math.cos(escapeYaw)),until:s.time+2.2};
  }
  const escaping=!!b.contactEscape;
  if(escaping){yaw=b.contactEscape.yaw;forward=1;strafe=0;fireNow=false;followingRoute=true;}
  const entryDoor=forward>0?nearestDoor(s,c,world,true,yaw):null;
  if(entryDoor)toggleDoor(s,c,entryDoor);
  // Broad standing bodies use the same side-facing walk available to players.
  // Begin alignment before the jamb, retaining the intended world direction.
  if(!hasSight&&!escaping&&forward>0)for(const door of world.doors||[]){
    const cos=Math.cos(door.yaw),sin=Math.sin(door.yaw),dx=c.x-door.x,dz=c.z-door.z;
    if(Math.abs(dx*cos-dz*sin)>door.w/2||Math.abs(dx*sin+dz*cos)>2.0||c.y>door.y+door.h/2||c.y+stanceHeight(c)<door.y-door.h/2)continue;
    const probes=stanceCollisionProbes(c),wide=Math.max(...probes.map(p=>p.x+p.radius))-Math.min(...probes.map(p=>p.x-p.radius)),deep=Math.max(...probes.map(p=>p.z+p.radius))-Math.min(...probes.map(p=>p.z-p.radius));
    if(wide<door.w-.06||deep>=door.w-.02)continue;
    const lateral=dx*cos-dz*sin,depth=dx*sin+dz*cos;
    const travel=(-Math.sin(yaw)*sin-Math.cos(yaw)*cos)*forward;
    // Centre the complete shallow body before committing to the narrow jamb.
    // A fixed side-facing yaw also avoids rotating wide shoulders into it.
    yaw=door.yaw+Math.PI/2;
    const lateralVelocity=c.vx*cos-c.vz*sin;
    forward=clamp(lateral*1.8+lateralVelocity*.08,-.6,.6);
    strafe=Math.abs(lateral)<.045&&Math.abs(lateralVelocity)<.25?-Math.sign(travel):Math.abs(depth)<1.05?-Math.sign(depth)*.5:0;
    fireNow=false;followingRoute=true;break;
  }
  const safeHeal = !escaping && !hasSight && s.time - c.lastDamageAt > 2.5;
  return { yaw, pitch, forward, strafe, slotPressed, fire: fireNow, aim: hasSight&&!escaping, sprint: !followingRoute && (b.mode === 'storm' || (dist > 20 && !hasSight)),
    reloadPressed: weapon(c).mag === 0 || (!hasSight && weapon(c).mag < WEAPONS[weapon(c).id].magazine * .4),
    healPressed: safeHeal && (c.hp < 75 || c.shield < 50), interactPressed: (b.mode === 'loot' || b.mode === 'container') && dist < 2.8,
    jumpPressed: !followingRoute && b.blockedTime > .6 && c.onGround };
}
function actorControlStep(s,c,input,dt){
  if (Number.isInteger(input.slotPressed) && input.slotPressed >= 0 && input.slotPressed < c.inventory.weapons.length && input.slotPressed !== c.weaponIndex) {
    c.weaponIndex = input.slotPressed; c.reloadTime = 0; c.healTime = 0; c.healKind = null;
    emit(s, 'equip', { id: c.id, weapon: weapon(c).id });
  }
  if (c.reloadTime > 0) {
    c.reloadTime = c.reloadTime - dt <= 1e-9 ? 0 : c.reloadTime - dt;
    if (c.reloadTime === 0) {
      const w = weapon(c), transfer = Math.min(WEAPONS[w.id].magazine - w.mag, w.reserve);
      w.mag += transfer; w.reserve -= transfer; emit(s, 'reloadDone', { id: c.id });
    }
  }
  if (input.fire || input.jumpPressed) { c.healTime = 0; c.healKind = null; }
  if (c.healTime > 0) {
    c.healTime = Math.max(0, c.healTime - dt);
    if (c.healTime === 0) {
      if (c.healKind === 'heal') { c.hp = Math.min(100, c.hp + 60); c.inventory.heals--; }
      else { c.shield = Math.min(100, c.shield + 40); c.inventory.shields--; }
      emit(s, 'healDone', { id: c.id, kind: c.healKind }); c.healKind = null;
    }
  }
  if (!c.traversal && input.reloadPressed) startReload(s, c);
  if (!c.traversal && (input.healPressed || input.shieldPressed) && !input.fire && !input.jumpPressed) beginHeal(s,c,input.shieldPressed?'shield':c.isPlayer?'heal':undefined);
}
function actorStep(s, c, input, dt, world, resolveAimPoint) {
  if (!c.alive) return;
  if (finite(input.yaw)) c.yaw = Math.atan2(Math.sin(input.yaw), Math.cos(input.yaw));
  if (finite(input.pitch)) c.pitch = clamp(input.pitch, -1.45, 1.45);
  c.aiming=input.aim===true;
  if (c.stage === 'insertion') {
    return;
  }
  if (c.stage === 'landing') {
    move(s,c, input, dt, world);
    if (c.onGround) finishDescent(s,c);
    if(isStormExposed(s,c))applyDamage(s,c,s.storm.damage*dt,null,'storm',true);
    return;
  }
  if(canRedeploy(s,c,input,world)){
    c.descentActive=true;c.canopyOpen=false;c.canopySafetyLock=false;c.canopyChangedAt=s.time-1;
    c.reloadTime=0;c.healTime=0;c.healKind=null;
  }
  // Carry only the fraction of this step past an existing cooldown. Keeping
  // that remainder avoids rounding every held shot up to a whole extra tick.
  const cooldownLeft = c.cooldown - dt, cooldownOvershoot = c.cooldown > 0 && cooldownLeft <= 1e-9 ? Math.max(0, -cooldownLeft) : 0;
  c.cooldown = cooldownLeft <= 1e-9 ? 0 : cooldownLeft;
  if(inDescent(c)){
    move(s,c,input,dt,world);if(c.onGround)finishDescent(s,c);
    if(isStormExposed(s,c))applyDamage(s,c,s.storm.damage*dt,null,'storm',true);
    return;
  }
  actorControlStep(s,c,input,dt);
  if (!c.traversal && input.interactPressed) interact(s, c, world);
  const moved = move(s,c, input, dt, world);
  c.bot.blockedTime = Math.abs(input.forward || 0) + Math.abs(input.strafe || 0) > .2 && moved < .012 ? c.bot.blockedTime + dt : 0;
  if (!c.traversal && input.fire && (!input.sprint || input.aim || c.stance!=='stand')) fire(s, c, input, world, cooldownOvershoot, resolveAimPoint);
  if (isStormExposed(s,c)) applyDamage(s, c, s.storm.damage * dt, null, 'storm', true);
}
export function stepMatch(s, input = {}, dt = FIXED_DT, world, resolveAimPoint, {postElimination=false}={}) {
  if (resolveAimPoint !== undefined && typeof resolveAimPoint !== 'function') throw new TypeError('Invalid aim resolver');
  validateWorld(world);
  if (!finite(dt) || Math.abs(dt - FIXED_DT) > 1e-8) throw new Error('stepMatch requires a fixed 1/60 second step');
  // Only the short killcam tail advances survivors after local elimination.
  // The original placement and fatal timestamp remain the authoritative result.
  const result=s.result;
  if (s.phase === 'result'&&!(postElimination&&!s.player.alive&&s.time<result.time+1-1e-9)) return s;
  const previousTime=s.time;s.time += dt; s.tick++;
  world.updateAnimatedSolids?.(s.time);
  for(const box of s.containers)if(box.opened&&box.ejectionVersion===1)for(let i=0;i<box.lootIds.length;i++){
    const start=box.openedAt+LOOT_EJECTION.delay+i*LOOT_EJECTION.stagger;
    const land=start+LOOT_EJECTION.rise+LOOT_EJECTION.flight;
    if(previousTime<start&&s.time>=start)emit(s,'lootEjected',{containerId:box.id,lootId:box.lootIds[i],x:box.x,y:box.y+.8,z:box.z});
    if(previousTime<land&&s.time>=land){const p=box.spillPoints[i];emit(s,'lootLanded',{containerId:box.id,lootId:box.lootIds[i],...p});}
  }
  // Solo insertion fills the bot roster before accepting a manual drop. The
  // ten-second deadline remains shared; the storm waits for the same drop edge.
  const soloRosterReady=soloRosterProgressForState(s)?.ready??true;
  if (s.player.stage === 'insertion' && soloRosterReady && (input.dropPressed || insertionSecondsRemaining(s)===0)) {
    for (const c of s.contestants) if(c.alive && c.stage==='insertion') {
      c.stage='landing';c.canopyOpen=false;c.canopySafetyLock=false;c.canopyChangedAt=s.time;c.diving=false;c.descentMode='dive';
      emit(s,'drop',{id:c.id});
    }
    // The launch button also toggles canopy during descent, but its launch
    // edge must never immediately reopen the canopy in this same step.
    input={...input,gliderPressed:false};
  }
  if (s.player.stage !== 'insertion') { s.activeTime += dt; stormStep(s, dt); }
  for (const c of s.contestants) actorStep(s, c, c.isPlayer ? input : botInput(s, c, world), dt, world, resolveAimPoint);
  if(postElimination&&result){s.phase='result';return s;}
  s.phase = s.player.stage === 'insertion' ? 'insertion' : s.player.stage === 'landing' ? 'landing' : 'active';
  const living = s.contestants.filter(c => c.alive);
  if (!s.player.alive || living.length === 1 && s.contestants.length > 1) {
    s.phase = 'result';
    s.result = { won: s.player.alive, placement: s.player.alive ? 1 : s.player.placement,
      kills: s.player.kills, damage: Math.round(s.player.damageDealt), time: s.time,
      winnerId: living.length === 1 ? living[0].id : null, remaining: living.length };
    if (s.player.alive) s.player.placement = 1;
    emit(s, 'result', { ...s.result });
  }
  return s;
}
export function drainEvents(s) { const events = s.events; s.events = []; return events; }
function validWeapon(w) {
  return w && validFinishSeed(w.finishSeed) && WEAPONS[w.id] && Number.isInteger(w.tier) && w.tier >= 1 && w.tier <= 3 && Number.isInteger(w.mag) && w.mag >= 0 && w.mag <= WEAPONS[w.id].magazine && Number.isInteger(w.reserve) && w.reserve >= 0 && w.reserve <= 300;
}
function validateMatchCharacters(s) {
  if(Object.hasOwn(s,'playerCharacterId')&&!getRosterCharacter(s.playerCharacterId))throw Error('Invalid saved player visual identity');
  if(s.characterAssignment&&Object.hasOwn(s,'playerCharacterId')&&s.playerCharacterId!==s.characterAssignment.selectedCharacterId)throw Error('Saved player visual conflicts with roster assignment');
  if (!Object.hasOwn(s,'characterAssignment')) {
    if (Object.hasOwn(s,'selectedCharacterId') || Array.isArray(s.contestants) && s.contestants.some(c => c && Object.hasOwn(c,'characterId'))) throw new Error('Saved character identity has no roster assignment');
    return false;
  }
  const assignment = assertValidCharacterAssignment(s.characterAssignment);
  if (s.seed !== assignment.seed || s.selectedCharacterId !== assignment.selectedCharacterId
    || !Array.isArray(s.contestants) || s.contestants.length !== assignment.characterIds.length
    || s.contestants.some((c,i) => !c || c.characterId !== assignment.characterIds[i])) throw new Error('Saved characters do not match their roster assignment');
  return true;
}
// A prepared selected body uses its measured standing posture. Identity alone
// does not assert a ready bot roster; main first prepares the renderer adapter.
export function assignPlayerVisual(s,id){
  if(!s||!getRosterCharacter(id)||s.characterAssignment&&id!==s.characterAssignment.selectedCharacterId)throw Error('Invalid player visual identity');
  s.playerCharacterId=id;if(hasStanceProfile(id))s.player.stanceProfileId=id;else delete s.player.stanceProfileId;delete s.player.traversal;clearStance(s.player);
}
function validateState(s, world) {
  if (!s || s.version !== 1 || s.worldId !== (world.id || 'skybreak') || s.worldVersion !== (world.version || 1)) throw new Error('Save belongs to another world version');
  if(!validWindowHealth(s.windowHealth,world))throw Error('Invalid saved windows');
  const rosterMatch = validateMatchCharacters(s);
  if(s.soloRosterFillVersion!==undefined&&s.soloRosterFillVersion!==1)throw new Error('Invalid saved solo roster fill');
  if (!['insertion', 'landing', 'active', 'result'].includes(s.phase) || !finite(s.time) || s.time < 0 || s.time > 86400 || !Number.isInteger(s.tick) || Math.abs(s.tick / 60 - s.time) > .001) throw new Error('Invalid saved clock');
  if (!Number.isInteger(s.rng) || s.rng < 1 || s.rng > 4294967295 || !Array.isArray(s.contestants) || s.contestants.length < 1 || s.contestants.length > (rosterMatch?MAX_ROSTER_BODIES:32)) throw new Error('Invalid saved contestants');
  for (const [i, c] of s.contestants.entries()) {
    if(c.username!==undefined&&(!c.username||cleanUsername(c.username)!==c.username))throw new Error('Invalid saved username');
    if (c.id !== i || c.isPlayer !== (i === 0) || !point(c) || !['yaw','pitch','vx','vy','vz','hp','shield','stamina','cooldown','reloadTime','healTime','kills','damageDealt','dropAt','targetX','targetZ','lastDamageAt','lastShotAt'].every(k => finite(c[k]))) throw new Error('Invalid saved actor');
    if (Math.max(Math.abs(c.x), Math.abs(c.y), Math.abs(c.z)) > 100000 || c.hp < 0 || c.hp > 100 || c.shield < 0 || c.shield > 100 || c.stamina < 0 || c.stamina > 100 || c.alive !== (c.hp > 0) || typeof c.onGround !== 'boolean' || c.swimming !== undefined && typeof c.swimming !== 'boolean' || !['insertion','landing','active'].includes(c.stage)) throw new Error('Invalid saved health or position');
    if (c.descentActive !== undefined && typeof c.descentActive !== 'boolean' || c.canopyBlocked !== undefined && typeof c.canopyBlocked !== 'boolean' || c.canopyOpen !== undefined && typeof c.canopyOpen !== 'boolean' || c.canopySafetyLock !== undefined && typeof c.canopySafetyLock !== 'boolean' || c.landingImpactSpeed !== undefined && (!finite(c.landingImpactSpeed) || c.landingImpactSpeed<0) || c.diving !== undefined && typeof c.diving !== 'boolean' || c.canopyChangedAt !== undefined && !finite(c.canopyChangedAt) || c.descentTurn !== undefined && (!finite(c.descentTurn) || Math.abs(c.descentTurn)>1) || c.descentMode !== undefined && !['dive','glide'].includes(c.descentMode)) throw new Error('Invalid saved descent');
    if(!validStance(c))throw new Error('Invalid saved stance');
    if(!validTraversal(c.traversal))throw new Error('Invalid saved traversal');
    if(c.traversal){const expected=sampleTraversal(c.traversal,c.traversal.progress);if(Math.hypot(c.x-expected.x,c.y-expected.y,c.z-expected.z)>.02)throw new Error('Saved traversal differs from actor position');}
    if(c.stanceProfileId!==undefined&&c.stanceProfileId!==(c.characterId??(c.isPlayer?s.playerCharacterId:undefined)))throw new Error('Saved stance differs from fighter identity');
    const inv = c.inventory;
    if (!inv || !Array.isArray(inv.weapons) || inv.weapons.length < 1 || inv.weapons.length > 3 || !Number.isInteger(c.weaponIndex) || !inv.weapons[c.weaponIndex] || ![inv.heals, inv.shields].every(n => Number.isInteger(n) && n >= 0 && n <= 5)) throw new Error('Invalid saved inventory');
    for (const w of inv.weapons) if (!validWeapon(w)) throw new Error('Invalid saved weapon');
    if (new Set(inv.weapons.map(w => w.id)).size !== inv.weapons.length || c.cooldown < 0 || c.reloadTime < 0 || c.healTime < 0 || !Number.isInteger(c.kills) || c.kills < 0 || c.healTime > 0 && !['shield','heal'].includes(c.healKind) || c.healTime > 0 && !(c.inventory[c.healKind === 'heal' ? 'heals' : 'shields'] > 0)) throw new Error('Invalid saved action');
    if (!c.bot || !['nextThink','seenAt','reactAt','goalX','goalZ','strafe','wanderAt','blockedTime'].every(k => finite(c.bot[k])) || c.bot.targetId !== null && (!Number.isInteger(c.bot.targetId) || !s.contestants[c.bot.targetId])) throw new Error('Invalid saved bot');
    if(c.bot.contactEscape!==undefined&&(!c.bot.contactEscape||!finite(c.bot.contactEscape.yaw)||!finite(c.bot.contactEscape.until))||c.bot.contactEscapeAttempt!==undefined&&(!Number.isInteger(c.bot.contactEscapeAttempt)||c.bot.contactEscapeAttempt<0||c.bot.contactEscapeAttempt>7))throw new Error('Invalid saved bot contact recovery');
    if(c.bot.goalY!==undefined&&c.bot.goalY!==null&&!finite(c.bot.goalY)||(!validNavigation(c.bot.navigation)||!validNavigationAvoid(c.bot.navigationAvoid)||!validStormGoal(c.bot.stormGoal)))throw new Error('Invalid saved bot route');
  }
  if(!validNavigationSchedule(s.navigationSchedule,s)||s.contestants.filter(c=>c.bot.navigation?.search).length>4)throw new Error('Invalid saved bot schedule');
  const st = s.storm;
  if (!st || !['centerX','centerZ','radius','initialRadius','nextCenterX','nextCenterZ','nextRadius','startX','startZ','startRadius','phaseTime','damage'].every(k => finite(st[k])) || !Number.isInteger(st.index) || !PHASES[st.index] || st.radius < 0 || st.radius > st.initialRadius || !['waiting','closing','closed'].includes(st.phase)) throw new Error('Invalid saved storm');
  if (!Array.isArray(s.loot) || s.loot.length > 2000 || !Number.isInteger(s.nextLootId)) throw new Error('Invalid saved loot');
  const ids = new Set();
  for (const l of s.loot) {
    if (!point(l) || !Number.isInteger(l.id) || l.id < 0 || l.id >= s.nextLootId || ids.has(l.id) || typeof l.taken !== 'boolean' || ![...Object.keys(WEAPONS),'ammo','shield','heal'].includes(l.kind) || !Number.isInteger(l.amount) || l.amount < 1 || l.amount > 5 || !Number.isInteger(l.tier) || l.tier < 1 || l.tier > 3) throw new Error('Invalid saved loot item');
    if (!validFinishSeed(l.finishSeed)||l.finishSeed!==undefined&&l.weapon?.finishSeed!==undefined&&l.finishSeed!==l.weapon.finishSeed)throw new Error('Invalid saved weapon finish');
    if (l.weapon && (!validWeapon(l.weapon) || l.weapon.id !== l.kind || l.weapon.tier !== l.tier)) throw new Error('Invalid saved dropped weapon');
    ids.add(l.id);
  }
  if (!Array.isArray(s.containers) || s.containers.length>32) throw new Error('Invalid saved containers');
  const linkedLoot = new Set(), lootById = new Map(s.loot.map(l=>[l.id,l]));
  for (const [i,box] of s.containers.entries()) {
    if (!point(box) || box.id!==i || !finite(box.yaw) || Math.max(Math.abs(box.x),Math.abs(box.y),Math.abs(box.z))>100000
      || typeof box.opened!=='boolean' || !Array.isArray(box.contents) || box.contents.length!==4
      || !Array.isArray(box.spillPoints) || box.spillPoints.length!==4 || !Array.isArray(box.lootIds)
      || (box.ejectionVersion!==undefined && box.ejectionVersion!==1)
      || !box.spillPoints.every(p=>validSpill(world,box,p) && (box.ejectionVersion!==1 || ejectionClear(world,box,p))) || !containerPlacement(world,box,box.ejectionVersion===1)) throw new Error('Invalid saved container');
    for (const [j,item] of box.contents.entries()) {
      const kindOK = j===0 ? ['rifle','smg','scoped-rifle','scatter','marksman','scar'].includes(item?.kind) : item?.kind===['ammo','heal','shield'][j-1];
      if (!kindOK || item.amount!==1 || !Number.isInteger(item.tier) || item.tier<1 || item.tier>3 || j>0 && item.tier!==1) throw new Error('Invalid saved container contents');
    }
    if (box.opened) {
      if (!finite(box.openedAt) || box.openedAt<0 || box.openedAt>s.time || !Number.isInteger(box.openedBy) || !s.contestants[box.openedBy] || box.lootIds.length!==4) throw new Error('Invalid saved opened container');
      for (const [j,id] of box.lootIds.entries()) {
        const item=lootById.get(id), expected=box.contents[j], p=box.spillPoints[j];
        if (!item || linkedLoot.has(id) || item.containerId!==box.id || item.kind!==expected.kind || item.tier!==expected.tier
          || item.amount!==1 || item.x!==p.x || item.y!==p.y || item.z!==p.z || item.weapon) throw new Error('Invalid saved container loot link');
        linkedLoot.add(id);
      }
    } else if (box.openedAt!==null || box.openedBy!==null || box.lootIds.length!==0) throw new Error('Invalid saved closed container');
  }
  for (const item of s.loot) if (item.containerId!==undefined && !linkedLoot.has(item.id)) throw new Error('Invalid saved orphan container loot');
  if ((s.phase === 'result') !== !!s.result) throw new Error('Invalid saved result');
  if (s.result && (typeof s.result.won !== 'boolean' || s.result.won !== s.contestants[0].alive || !Number.isInteger(s.result.placement) || s.result.placement < 1 || s.result.placement > s.contestants.length || !finite(s.result.time) || s.result.time !== s.time || s.result.won && s.contestants.filter(c => c.alive).length !== 1)) throw new Error('Invalid saved classification');
}
export function serializeMatch(s) {
  validateMatchCharacters(s);
  const { player, events, ...data } = s;
  return JSON.stringify(data);
}
export function restoreMatch(json, world) {
  validateWorld(world);
  if (typeof json !== 'string' || json.length > 2000000) throw new Error('Invalid saved match');
  const s = JSON.parse(json);
  // Compatible v1 runs keep their original resources and RNG. Adding unopened
  // rewards during restore would duplicate opportunities in an ongoing match.
  if (s && !Object.hasOwn(s,'containers')) s.containers=[];
  if(s&&!Object.hasOwn(s,'windowHealth'))s.windowHealth=createWindowHealth(world);
  validateState(s, world);
  world.updateAnimatedSolids?.(s.time);
  for(const c of s.contestants)for(const [i,w]of c.inventory.weapons.entries())w.finishSeed??=weaponFinishSeed(s.seed,0,c.id*4+i);
  for(const l of s.loot)if(WEAPONS[l.kind]){l.finishSeed??=l.weapon?.finishSeed??weaponFinishSeed(s.seed,1,l.id);if(l.weapon)l.weapon.finishSeed??=l.finishSeed;}
  // Water contact is derived from the loaded physical world, not trusted from a
  // saved pose flag. Older compatible fixtures without water remain grounded.
  for (const c of s.contestants) c.swimming = isSwimming(c, world);
  s.player = s.contestants[0]; s.events = [];
  return s;
}

// Multiplayer calls the same actor movement, hits, damage, inventory and bots as
// solo. The service owns every contestant; no browser is a privileged host.
export function stepMultiplayer(s, inputs, world, {historyFor=()=>null}={}) {
  validateWorld(world);
  if(s.phase==='result')return s;
  const dt=FIXED_DT,previousTime=s.time;s.time+=dt;s.tick++;
  world.updateAnimatedSolids?.(s.time);
  for(const box of s.containers)if(box.opened&&box.ejectionVersion===1)for(let i=0;i<box.lootIds.length;i++){
    const start=box.openedAt+LOOT_EJECTION.delay+i*LOOT_EJECTION.stagger,land=start+LOOT_EJECTION.rise+LOOT_EJECTION.flight;
    if(previousTime<start&&s.time>=start)emit(s,'lootEjected',{containerId:box.id,lootId:box.lootIds[i],x:box.x,y:box.y+.8,z:box.z});
    if(previousTime<land&&s.time>=land)emit(s,'lootLanded',{containerId:box.id,lootId:box.lootIds[i],...box.spillPoints[i]});
  }
  const deadline=s.time>=10,firstDeploy=s.contestants.some(c=>c.isPlayer&&c.alive&&c.stage==='insertion'&&inputs.get(c.id)?.dropPressed);
  if(firstDeploy||deadline)s.multiplayerDeployed=true;
  for(const c of s.contestants)if(c.alive&&c.stage==='insertion'&&(deadline||(!c.isPlayer&&s.multiplayerDeployed)||(c.isPlayer&&inputs.get(c.id)?.dropPressed))){
    c.stage='landing';c.canopyOpen=false;c.canopySafetyLock=false;c.canopyChangedAt=s.time;c.diving=false;c.descentMode='dive';
    emit(s,'drop',{id:c.id});
  }
  if(s.multiplayerDeployed){s.activeTime+=dt;stormStep(s,dt);}
  try{
    for(const c of s.contestants){
      const input=c.isPlayer?(inputs.get(c.id)||{}):botInput(s,c,world);
      s._shotHistory=c.isPlayer?historyFor(c):null;
      actorStep(s,c,c.stage==='landing'&&c.canopyChangedAt===s.time?{...input,gliderPressed:false}:input,dt,world);
    }
  }finally{delete s._shotHistory;}
  s.phase=s.multiplayerDeployed?'active':'insertion';
  const living=s.contestants.filter(c=>c.alive),humans=s.contestants.filter(c=>c.isPlayer),humanSurvivors=humans.filter(c=>c.alive);
  if(living.length<=1||humans.length>0&&humanSurvivors.length===0){
    const finalElimination=[...s.events].reverse().find(e=>e.type==='elimination');
    const abandoned=!humanSurvivors.length&&s.lastHumanElimination?.cause==='disconnect';
    s.phase='result';s.result={reason:abandoned?'abandoned':humanSurvivors.length===0?'all_humans_eliminated':'last_survivor',winnerId:living.length===1?living[0].id:null,remaining:living.length,time:s.time,finalElimination:finalElimination?{id:finalElimination.id,attackerId:finalElimination.attackerId,cause:finalElimination.cause}:null};
    if(living.length===1)living[0].placement=1;
    emit(s,'result',s.result);
  }
  return s;
}
export function disconnectMultiplayerActor(s,id){
  const c=s.contestants.find(c=>c.id===id);
  if(c?.alive)applyDamage(s,c,c.hp+c.shield,null,'disconnect',true);
}
// Prediction never fires or mutates shared loot, opponents, storm or windows.
export function predictMultiplayerActor(state,actor,input,world){
  if(!actor.alive||actor.stage==='insertion')return actor;
  world.updateAnimatedSolids?.(state.time);
  if(finite(input.yaw))actor.yaw=Math.atan2(Math.sin(input.yaw),Math.cos(input.yaw));
  if(finite(input.pitch))actor.pitch=clamp(input.pitch,-1.45,1.45);
  actor.aiming=input.aim===true;
  if(canRedeploy(state,actor,input,world)){actor.descentActive=true;actor.canopyOpen=false;actor.canopySafetyLock=false;actor.canopyChangedAt=state.time-1;actor.reloadTime=0;actor.healTime=0;actor.healKind=null;}
  const isolated={...state,player:actor,events:[],loot:[],contestants:[actor]};
  if(actor.stage==='active'&&!inDescent(actor))actorControlStep(isolated,actor,input,FIXED_DT);
  move(isolated,actor,input,FIXED_DT,world);
  if(actor.stage==='landing'&&actor.onGround)finishDescent(isolated,actor);
  return actor;
}
export const multiplayerEyeHeight=stanceEyeHeight;

export function initializeMultiplayerHumanLoadout(state,actor){
  actor.inventory={weapons:[newWeapon('rifle',1,weaponFinishSeed(state.seed,0,actor.id*4))],heals:1,shields:1};actor.weaponIndex=0;
}
