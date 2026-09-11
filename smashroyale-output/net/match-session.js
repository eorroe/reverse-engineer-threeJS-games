import {SnapshotBuffer, MotionPredictor} from './snapshot-buffer.js';
import {SnapshotEvents} from './snapshot-events.js';
import {predictMultiplayerActor, constrainRenderPosition} from '../match.js';
import {HELD_FIELDS, EDGE_FIELDS, normalizeInput, sequenceAfter} from './input-codec.js';

// Presentation can predict motion, never combat resources or another actor.
const MOTION_FIELDS = Object.freeze([
  'x', 'y', 'z', 'vx', 'vy', 'vz', 'yaw', 'pitch', 'aiming', 'onGround', 'swimming', 'stamina', 'sprintExhausted',
  'stance', 'stanceHeight', 'stanceWeights', 'stanceYaw', 'stanceChangedAt',
  'stanceHoldTime', 'stanceHoldActive', 'stanceHoldConsumed', 'turnBlocked',
  'slideTime', 'slideCooldown', 'slideStandPending', 'traversal',
  'stage', 'canopyOpen', 'canopySafetyLock', 'canopyChangedAt', 'canopyBlocked',
  'diving', 'descentActive', 'descentMode', 'descentTurn', 'landingImpactSpeed',
]);

function validState(state, actorId) {
  return !!state && Number.isInteger(state.tick) && Number.isFinite(state.time)
    && Array.isArray(state.contestants) && state.localActorId === actorId
    && state.player?.id === actorId && state.player.isPlayer === true
    && state.contestants.some(actor => actor.id === actorId && actor.isPlayer === true)
    && state.contestants.every(actor => actor.id === actorId || actor.isPlayer !== true);
}

// Owns network presentation. No browser calls authoritative combat/AI/storm step.
export class MultiplayerMatchSession {
  constructor({world, transport, onEvent = () => {}, onStatus = () => {}, now = () => performance.now()} = {}) {
    Object.assign(this, {world, transport, onEvent, onStatus, now});
    this.snapshots = new SnapshotBuffer({now}); this.events = new SnapshotEvents();
    this.state = null; this.localActorId = null; this.paused = false; this.disposed = false;
    this.predictionSteps = 0; this.receivedAt = now(); this.inputCleared = true;
    this.localTick = 0; this.predictionAt = now(); this.predictionAccumulator = 0;
    this.heldInput = normalizeInput(); this.inputAt = -Infinity; this.inputEdges = new Map(); this.lastPacketAck = 0;
    this.inputSamples = new Map(); this.predictionBaseTick = 0;
    this.predictionBaseTime = 0; this.motionHistory = new Map();
    this.serverTimelineOffset = null; this.positionCorrection = {x: 0, y: 0, z: 0}; this.correctionAt = now();
    this.authoritativeActors = new Map();
    this.predictor = new MotionPredictor({simulateMotion: (actor, command) => {
      const {__localPredictionTick, ...input} = command;
      this.predictionSteps++;
      const predictionState = {...this.state, time: this.predictionBaseTime + ((__localPredictionTick - this.predictionBaseTick) >>> 0) / 60};
      const result = predictMultiplayerActor(predictionState, actor, input, this.world);
      this.recordMotion(__localPredictionTick, result, predictionState.time); return result;
    }});
    this.unsubscribe = transport?.subscribe(message => {
      if (this.disposed) return;
      // Packet cadence is independent of gameplay cadence. inputSent is useful
      // telemetry, but one network packet is never treated as one physics step.
      if (['disconnected', 'resumeFailed'].includes(message.type)) { this.clearInput(); onStatus(message); }
    });
  }
  start(message) {
    if (this.disposed || !Number.isInteger(message?.actorId) || !validState(message.state, message.actorId)) throw Error('Invalid multiplayer start');
    const same = this.state?.seed === message.state.seed && this.localActorId === message.actorId;
    this.localActorId = message.actorId; this.state = message.state; this.receivedAt = this.now();
    this.authoritativeActors = new Map(this.state.contestants.map(actor => [actor.id, actor]));
    this.snapshots.clear(); this.predictor.clear(); this.predictionSteps = 0;
    this.localTick = this.state.tick >>> 0; this.predictionAt = this.receivedAt; this.predictionAccumulator = 0;
    this.predictionBaseTick = this.localTick; this.predictionBaseTime = this.state.time; this.inputSamples.clear(); this.motionHistory.clear();
    this.serverTimelineOffset = null; this.positionCorrection = {x: 0, y: 0, z: 0}; this.correctionAt = this.receivedAt;
    this.recordMotion(this.localTick, this.state.player, this.state.time);
    this.heldInput = normalizeInput({yaw: this.state.player.yaw, pitch: this.state.player.pitch}); this.inputEdges.clear(); this.inputAt = -Infinity;
    if (!same) this.events.clear();
    this.lastPacketAck = message.ackSeq ?? 0; this.predictor.reconcile(this.state.player, this.state.tick);
    this.snapshots.push({tick: this.state.tick, state: this.state}); return this.state;
  }
  receive(message) {
    if (this.disposed || !this.state || !Number.isInteger(message?.ackSeq)
      || !validState(message.state, this.localActorId) || message.state.seed !== this.state.seed
      || message.tick !== message.state.tick || !this.snapshots.push(message)) return false;
    this.advancePrediction();
    this.decayCorrection();
    const previousPosition = this.predictor.actor ? Object.fromEntries(['x', 'y', 'z'].map(key => [key, this.predictor.actor[key] + this.positionCorrection[key]])) : null;
    this.state = message.state; this.receivedAt = this.now(); this.predictionSteps = 0;
    this.authoritativeActors = new Map(this.state.contestants.map(actor => [actor.id, actor]));
    this.lastPacketAck = message.ackSeq;
    const sample = this.inputSamples.get(message.ackClientTimeMs);
    // Server time alone cannot acknowledge a delayed client action. A snapshot
    // taken before a jump packet arrived must not discard that pending jump.
    const hasEcho = Object.hasOwn(message, 'ackClientTimeMs');
    if (sample && Number.isInteger(message.ackInputAppliedTick)) {
      const observedOffset = (message.ackInputAppliedTick - sample.tick) | 0;
      // A later latency spike must not stretch the local timeline and replay
      // forward steps the server already simulated while holding old controls.
      this.serverTimelineOffset = this.serverTimelineOffset === null ? observedOffset : Math.min(this.serverTimelineOffset, observedOffset);
    }
    let acknowledgedTick = this.serverTimelineOffset !== null
      ? (message.tick - this.serverTimelineOffset) >>> 0
      : hasEcho ? this.predictionBaseTick : this.state.tick >>> 0;
    let divergence = false;
    if (sample) {
      // Holding an old input simulates unchanged movement, but it cannot confirm
      // a later direction change or button press whose packet has not arrived.
      for (const command of this.predictor.pending) {
        if (!sequenceAfter(command.seq, sample.tick) || sequenceAfter(command.seq, acknowledgedTick)) continue;
        const changed = [...HELD_FIELDS, 'forward', 'strafe', 'yaw', 'pitch'].some(key => command.input[key] !== sample.input[key])
          || EDGE_FIELDS.some(key => command.input[key]) || command.input.slotPressed >= 0;
        if (changed) { acknowledgedTick = (command.seq - 1) >>> 0; divergence = true; break; }
      }
    }
    // Before the first real ACK, incoming neutral movement also cannot replace
    // the local baseline of an input still in flight.
    if (hasEcho && !sample && this.predictor.pending.length) divergence = true;
    let baseActor = this.state.player, baseTime = this.state.time;
    if (divergence && baseActor.alive && this.state.phase !== 'result') {
      const saved = this.motionHistory.get(acknowledgedTick);
      if (saved) {
        baseActor = structuredClone(baseActor);
        for (const key of MOTION_FIELDS) {
          if (Object.hasOwn(saved.motion, key)) baseActor[key] = structuredClone(saved.motion[key]);
          else delete baseActor[key];
        }
        baseTime = saved.time;
      }
    }
    if (sequenceAfter(acknowledgedTick, this.predictionBaseTick)) this.predictionBaseTick = acknowledgedTick;
    if (sequenceAfter(this.predictionBaseTick, this.localTick)) { this.localTick = this.predictionBaseTick; this.predictionAccumulator = 0; }
    this.predictionBaseTime = baseTime; this.recordMotion(this.predictionBaseTick, baseActor, baseTime);
    this.predictor.reconcile(baseActor, this.predictionBaseTick);
    if (previousPosition && this.state.player.alive && this.state.phase !== 'result') {
      const correction = Object.fromEntries(['x', 'y', 'z'].map(key => [key, previousPosition[key] - this.predictor.actor[key]]));
      this.positionCorrection = Math.hypot(correction.x, correction.y, correction.z) < 3 ? correction : {x: 0, y: 0, z: 0};
    } else this.positionCorrection = {x: 0, y: 0, z: 0};
    for (const event of this.events.consume(message.events || [])) this.onEvent(event, this.state);
    if (!this.state.player.alive || this.state.phase === 'result') this.clearInput(); return true;
  }
  input(controls) {
    if (this.disposed) return;
    if (this.state?.player.alive && this.state.phase !== 'result' && !this.paused) {
      this.inputCleared = false; this.heldInput = normalizeInput(controls); this.inputAt = this.now();
      const clientTimeMs = this.inputAt >>> 0;
      const due = Math.max(1, Math.floor((this.predictionAccumulator + Math.max(0, this.inputAt - this.predictionAt)) / (1000 / 60) + 1e-7));
      this.inputSamples.set(clientTimeMs, {tick: (this.localTick + due) >>> 0, input: {...this.heldInput}});
      if (this.inputSamples.size > 360) this.inputSamples.delete(this.inputSamples.keys().next().value);
      this.transport.input({...controls, clientTimeMs});
      for (const key of EDGE_FIELDS) if (this.heldInput[key]) this.inputEdges.set(key, this.inputAt);
      if (this.heldInput.slotPressed >= 0) this.inputEdges.set('slotPressed', {at: this.inputAt, slot: this.heldInput.slotPressed});
    }
    else this.clearInput();
  }
  clearInput() {
    if (!this.inputCleared) { this.transport?.clearInput(); this.inputCleared = true; }
    this.heldInput = normalizeInput({yaw: this.heldInput.yaw, pitch: this.heldInput.pitch}); this.inputEdges.clear(); this.inputAt = -Infinity;
  }
  setPaused(value) { this.paused = !!value; if (this.paused) this.clearInput(); }
  recordMotion(tick, actor, time) {
    const motion = {};
    for (const key of MOTION_FIELDS) if (Object.hasOwn(actor, key)) motion[key] = structuredClone(actor[key]);
    this.motionHistory.set(tick, {motion, time});
    if (this.motionHistory.size > 240) this.motionHistory.delete(this.motionHistory.keys().next().value);
  }
  decayCorrection() {
    const now = this.now(), follow = Math.exp(-Math.max(0, now - this.correctionAt) / 90); this.correctionAt = now;
    for (const key of ['x', 'y', 'z']) { this.positionCorrection[key] *= follow; if (Math.abs(this.positionCorrection[key]) < 0.00001) this.positionCorrection[key] = 0; }
  }
  advancePrediction() {
    const now = this.now(), elapsed = Math.max(0, now - this.predictionAt); this.predictionAt = now;
    if (!this.state || !this.state.player.alive || this.state.phase === 'result') { this.predictionAccumulator = 0; return; }
    this.predictionAccumulator += Math.min(100, elapsed);
    let steps = 0;
    while (this.predictionAccumulator >= 1000 / 60 - 1e-7 && steps++ < 6) {
      const input = now - this.inputAt > 250 ? normalizeInput({yaw: this.heldInput.yaw, pitch: this.heldInput.pitch}) : {...this.heldInput};
      for (const key of EDGE_FIELDS) input[key] = now - (this.inputEdges.get(key) ?? -Infinity) <= 250;
      const slot = this.inputEdges.get('slotPressed'); input.slotPressed = slot && now - slot.at <= 250 ? slot.slot : -1;
      const tick = (this.localTick + 1) >>> 0;
      if (!this.predictor.input({seq: tick, input: {...input, __localPredictionTick: tick}, dtMs: 1000 / 60})) { this.predictionAccumulator = 0; break; }
      this.localTick = tick; this.predictionAccumulator -= 1000 / 60; this.inputEdges.clear();
    }
  }
  sample() {
    if (!this.state) return null;
    this.advancePrediction();
    this.decayCorrection();
    const now = this.now(), state = this.snapshots.sample({localActorId: this.localActorId, predictedActor: this.predictor.actor, now}) ?? this.state;
    const predicted = this.predictor.actor;
    const time = this.state.time + Math.min(0.25, Math.max(0, now - this.receivedAt) / 1000);
    let player = this.state.player;
    if (player?.alive && predicted && this.state.phase !== 'result') {
      player = {...player};
      for (const key of MOTION_FIELDS) {
        if (Object.hasOwn(predicted, key)) player[key] = predicted[key] && typeof predicted[key] === 'object' ? structuredClone(predicted[key]) : predicted[key];
        else delete player[key];
      }
      const predictionTime = this.predictionBaseTime + ((this.localTick - this.predictionBaseTick) >>> 0) / 60 + this.predictionAccumulator / 1000;
      // Rendering faster than the fixed predictor must not alternate a held
      // pose with a full-step jump. Use its existing history, then sweep the
      // interpolated body against the same world before applying correction.
      const previous = this.motionHistory.get((this.localTick - 1) >>> 0);
      const current = this.motionHistory.get(this.localTick);
      player.motionTime = current?.time ?? predictionTime - this.predictionAccumulator / 1000;
      if (previous && current && previous.motion.stage === player.stage && Math.hypot(player.x-previous.motion.x,player.y-previous.motion.y,player.z-previous.motion.z)<8) {
        const alpha = Math.max(0,Math.min(1,this.predictionAccumulator*60/1000));
        const from = {...player,...previous.motion}, desired = {...player};
        for (const key of ['x','y','z','vx','vz']) desired[key] = from[key]+(player[key]-from[key])*alpha;
        player = {...desired,...constrainRenderPosition(this.state,from,desired,this.world,true)};
        player.motionTime = previous.time+(current.time-previous.time)*alpha;
      }
      // Preserve transition age when local prediction leads the server clock.
      // This translation is display-only; simulation/replay timestamps stay exact.
      for (const key of ['stanceChangedAt', 'canopyChangedAt']) if (Number.isFinite(player[key])) player[key] += time - predictionTime;
      if (Object.values(this.positionCorrection).some(value => value !== 0)) {
        const shifted = {...player, x: player.x + this.positionCorrection.x, y: player.y + this.positionCorrection.y, z: player.z + this.positionCorrection.z};
        player = {...player, ...constrainRenderPosition(this.state, player, shifted, this.world, true)};
      }
    }
    // Continue animation between 20 Hz snapshots, with a bounded stall horizon.
    return {...this.state, time, player, contestants: state.contestants.map(actor => {
      if (actor.id === this.localActorId) return player;
      const latest = this.authoritativeActors.get(actor.id);
      return latest?.onGround && actor.onGround ? constrainRenderPosition(this.state, latest, actor, this.world) : actor;
    })};
  }
  dispose() {
    if (this.disposed) return;
    this.clearInput(); this.disposed = true; this.unsubscribe?.(); this.snapshots.clear();
    this.predictor.clear(); this.events.clear(); this.authoritativeActors.clear(); this.inputSamples.clear(); this.motionHistory.clear(); this.state = null;
  }
}
