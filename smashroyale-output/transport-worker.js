import {REPLAYS_ENABLED} from '../replay-feature.js';
import {InputChannel} from './input-channel.js';
import {snapshotBaseline, decodeSnapshotState} from './snapshot-wire.js';
import {createSnapshotPackingContext, createPackedSnapshotReceiver} from './snapshot-packing.js';
import {SnapshotEvents} from './snapshot-events.js';
import {gameplayIdentity as validateIdentity, identityControl} from './gameplay-identity.js';

/** Dependency injection keeps reconnect/edge behavior testable without a browser. */
export function createTransportRuntime({post, Socket = WebSocket, clock = () => performance.now(), every = setInterval, stopEvery = clearInterval, later = setTimeout, stopLater = clearTimeout} = {}) {
  let socket = null, url = null, credentials = null, disposed = false, running = false, retry = null, firstLossAt = null, reconnectCount = 0, resuming = false, resumeStateReady = false;
  let baseline = null, matchKey = null, capturePOV = false, spectating = false;
  let compiledIdentity, identityLocked = false;
  const packing = createPackedSnapshotReceiver();
  const packingCheckpoint = () => { try { return packing.checkpoint(); } catch { return null; } };
  const captureLimit = 512 * 1024;
  const capturePending = new Map(); let captureBytes = 0, captureId = 0;
  const captureFailure = reason => { capturePOV = false; emit('povCaptureError', {reason}); };
  const delivery = (payload, message, workerAt) => {
    if (!capturePOV || !['started', 'snapshot'].includes(message.type)) return null;
    const binary = typeof payload !== 'string';
    if ((binary ? payload.byteLength : payload.length) > captureLimit) { captureFailure('game-payload-too-large'); return null; }
    // ArrayBuffer WebSocket bytes can transfer directly after decoding; no copy.
    const bytes = binary ? new Uint8Array(payload) : new TextEncoder().encode(payload);
    if (bytes.byteLength > captureLimit) { captureFailure('game-payload-too-large'); return null; }
    if (captureBytes + bytes.byteLength > 1024 * 1024 || capturePending.size >= 64) { captureFailure('capture-delivery-backpressure'); return null; }
    const id = ++captureId; capturePending.set(id, bytes.byteLength); captureBytes += bytes.byteLength;
    return {captureId: id, kind: message.type, wireEncoding: binary ? 'snapshot-pack-v1' : 'json', bytes, workerAt, tick: message.tick ?? message.state?.tick ?? 0, ackSeq: message.ackSeq ?? 0};
  };
  const eventHistory = new SnapshotEvents();
  const channel = new InputChannel({now: clock, send: data => socket.send(data), onSent: data => post({type: 'inputSent', ...data})});
  const timer = every(() => { if (running) channel.tick({open: socket?.readyState === 1, bufferedAmount: socket?.bufferedAmount ?? Infinity, spectating}); }, 1000 / 60);
  const emit = (type, detail = {}) => post({type, ...detail});
  const control = message => {
    if (socket?.readyState !== 1 || socket.bufferedAmount >= 16384) {
      emit('response', {v: 1, requestId: message.requestId, ok: false, error: {code: 'NOT_CONNECTED', message: 'Connection is not ready. Try again.'}}); return;
    }
    socket.send(JSON.stringify(identityControl(message, compiledIdentity)));
  };
  function connect() {
    if (disposed || !url) return;
    const current = new Socket(url); socket = current; current.binaryType = 'arraybuffer';
    current.onopen = () => {
      if (disposed || socket !== current) return;
      if (credentials) { resuming = true; resumeStateReady = false; control({v: 1, type: 'resume', requestId: '__resume', ...credentials}); }
      else { reconnectCount = 0; firstLossAt = null; emit('connected'); }
    };
    current.onmessage = event => {
      if (socket !== current) return;
      const binary = event.data instanceof ArrayBuffer;
      if (!binary && (typeof event.data !== 'string' || event.data.length > 4 * 1024 * 1024)) return;
      const workerAt = capturePOV ? clock() : null;
      let message;
      try { message = binary ? packing.decode(event.data) : JSON.parse(event.data); }
      catch {
        if (!binary) return;
        // Only framed game snapshots are eligible for raw evidence, never controls.
        const header = event.data.byteLength >= 20 ? new DataView(event.data) : null;
        const evidence = header?.getUint32(0, true) === 0x53525031 ? delivery(event.data, {type:'snapshot',tick:header.getUint32(16,true),ackSeq:0}, workerAt) : null;
        packing.clear();
        if(evidence){evidence.packingCheckpoint=null;post({type:'povRejected',povDelivery:evidence},[evidence.bytes.buffer]);}
        emit('transportError', {error:{code:'SNAPSHOT_INVALID',message:'The game state could not be synchronized. Reconnecting.'}});current.close(1002,'Packed snapshot invalid');return;
      }
      if (message?.v !== 1 || typeof message.type !== 'string') return;
      const evidence = delivery(event.data, message, workerAt);
      if (message.type === 'response' && message.ok && message.data?.resumeToken) {
        const {lobbyId, playerId, resumeToken} = message.data; credentials = {lobbyId, playerId, resumeToken};
      }
      if (message.type === 'response' && message.requestId === '__resume') {
        if (!message.ok) { credentials = null; running = false; emit('resumeFailed', {error: message.error}); return; }
        resuming = false; running = resumeStateReady; reconnectCount = 0; firstLossAt = null; emit('connected', {resumed: true});
        return;
      }
      if (message.type === 'started') {
        try {
          baseline = snapshotBaseline(message.state); packing.clear();
          if(message.snapshotPacking){
            if(message.snapshotPacking.version!==1)throw Error('Unsupported snapshot packing');
            packing.install(createSnapshotPackingContext({baselineId:message.snapshotPacking.baselineId,state:message.state}));
          }
        }
        catch (error) { packing.clear(); if (evidence) { evidence.packingCheckpoint=null; post({type: 'povRejected', povDelivery: evidence}, [evidence.bytes.buffer]); } emit('transportError',{error:{code:'SNAPSHOT_INVALID',message:'The game state could not be synchronized. Reconnecting.'}});current.close(1002,'Snapshot bootstrap invalid');return; }
        const nextMatchKey = `${credentials?.lobbyId ?? ''}:${message.state?.seed ?? ''}`;
        if (nextMatchKey !== matchKey) { eventHistory.clear(); matchKey = nextMatchKey; }
        resumeStateReady = true; running = !resuming;
        channel.reset({seq: message.ackSeq ?? 0, tick: message.tick ?? message.state?.tick ?? 0});
        spectating = message.state?.spectating === true || message.state?.player?.alive === false;
      }
      if (message.type === 'snapshot') {
        if (message.stateDelta) {
          try { message.state = decodeSnapshotState(message.stateDelta, baseline); delete message.stateDelta; }
          catch {
            packing.clear(); if(evidence)evidence.packingCheckpoint=null;
            if (evidence) post({type: 'povRejected', povDelivery: evidence}, [evidence.bytes.buffer]);
            emit('transportError', {error: {code: 'SNAPSHOT_INVALID', message: 'The game state could not be synchronized. Reconnecting.'}}); current.close(1002, 'Snapshot baseline invalid'); return;
          }
        }
        spectating = message.state?.spectating === true || message.state?.player?.alive === false;
        message.events = eventHistory.consume(message.events);
        channel.acknowledge(message.ackSeq, message.tick);
      }
      if (message.type === 'ended') running = false;
      if (evidence) { evidence.packingCheckpoint = packingCheckpoint(); message.povDelivery = evidence; post(message, [evidence.bytes.buffer]); }
      else post(message);
    };
    current.onerror = () => {};
    current.onclose = () => {
      if (socket !== current || disposed) return;
      running = false; packing.clear(); channel.reset(); emit('disconnected', {reconnecting: !!credentials});
      if (!credentials) return;
      firstLossAt ??= clock();
      if (clock() - firstLossAt >= 20000) { credentials = null; emit('resumeFailed', {error: {code: 'RECONNECT_EXPIRED', message: 'The reconnect window expired.'}}); return; }
      retry = later(() => { retry = null; connect(); }, Math.min(2000, 250 * 2 ** reconnectCount++));
    };
  }
  return {
    receive(message) {
      if (disposed || !message) return;
      if (message.type === 'connect') {
        if (socket && socket.readyState < 2) return;
        if (retry !== null) { stopLater(retry); retry = null; }
        const parsed = new URL(message.url);
        if (!['wss:', 'ws:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new TypeError('A WebSocket endpoint is required');
        if (parsed.protocol === 'ws:' && !['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)) throw new TypeError('Remote multiplayer connections require TLS');
        if (!identityLocked) { compiledIdentity = validateIdentity(message.gameplayIdentity); identityLocked = true; }
        else if (message.gameplayIdentity !== undefined && JSON.stringify(validateIdentity(message.gameplayIdentity)) !== JSON.stringify(compiledIdentity)) throw new TypeError('A different gameplay build requires a new client');
        url = parsed.href; connect();
      } else if (message.type === 'capturePOV') capturePOV = REPLAYS_ENABLED && message.enabled === true;
      else if (message.type === 'povCaptured') { captureBytes -= capturePending.get(message.captureId) ?? 0; capturePending.delete(message.captureId); }
      else if (message.type === 'input') channel.sample(message.input);
      else if (message.type === 'clearInput') channel.reset();
      else if (message.type === 'control') {
        if (message.message.type === 'leave') { credentials = null; running = false; channel.reset(); }
        control(message.message);
      } else if (message.type === 'dispose') this.dispose();
    },
    dispose() { if (disposed) return; disposed = true; stopEvery(timer); if (retry !== null) stopLater(retry); credentials = null; packing.clear(); channel.reset(); capturePending.clear(); captureBytes = 0; if (socket) { socket.onclose = null; socket.close(1000, 'Client left'); } },
  };
}

if (typeof WorkerGlobalScope !== 'undefined' && globalThis instanceof WorkerGlobalScope) {
  const runtime = createTransportRuntime({post: (value, transfer) => postMessage(value, transfer ?? [])});
  globalThis.onmessage = event => { try { runtime.receive(event.data); } catch (error) { postMessage({type: 'transportError', error: {code: 'TRANSPORT_ERROR', message: error.message}}); } };
}
