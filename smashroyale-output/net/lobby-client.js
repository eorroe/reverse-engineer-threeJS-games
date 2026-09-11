import {REPLAYS_ENABLED} from '../replay-feature.js';
import {gameplayIdentity as validateIdentity, identityControl} from './gameplay-identity.js';

export class LobbyClient extends EventTarget {
  constructor({url, workerFactory = () => new Worker(new URL('./transport-worker.js', import.meta.url), {type: 'module'}), requestTimeoutMs = 12000, capturePOV = false, now = () => performance.now(), gameplayIdentity} = {}) {
    super(); this.url = url; this.workerFactory = workerFactory; this.requestTimeoutMs = requestTimeoutMs; this.worker = null; this.pending = new Map(); this.nextRequest = 0; this.connected = false; this.disposed = false;
    this.capturePOV = REPLAYS_ENABLED && capturePOV === true; this.now = now;
    Object.defineProperty(this, 'gameplayIdentity', {value: validateIdentity(gameplayIdentity), enumerable: true});
  }
  on(type, callback) { const listener = event => callback(event.detail); this.addEventListener(type, listener); return () => this.removeEventListener(type, listener); }
  emit(type, detail) { const event = new Event(type); Object.defineProperty(event, 'detail', {value: detail}); this.dispatchEvent(event); }
  connect() {
    if (this.disposed) return Promise.reject(new Error('Client disposed'));
    if (this.connected) return Promise.resolve();
    if (this.connectPromise) return this.connectPromise;
    this.connectPromise = new Promise((resolve, reject) => {
      const cleanup = () => { clearTimeout(timeout); offConnected(); offError(); offDisconnected(); this.connectPromise = null; };
      const offConnected = this.on('connected', () => { cleanup(); resolve(); });
      const fail = value => { cleanup(); reject(Object.assign(new Error(value?.error?.message ?? 'Connection failed'), {code: value?.error?.code ?? 'CONNECTION_FAILED'})); };
      const offError = this.on('transportError', fail), offDisconnected = this.on('disconnected', fail);
      const timeout = setTimeout(() => fail({error: {message: 'Connection timed out'}}), this.requestTimeoutMs);
      if (!this.worker) {
        this.worker = this.workerFactory(); this.worker.onmessage = event => this.receive(event.data);
        if (this.capturePOV) this.worker.postMessage({type: 'capturePOV', enabled: true});
        this.worker.onerror = () => this.receive({type: 'transportError', error: {code: 'WORKER_ERROR', message: 'Multiplayer connection worker failed'}});
      }
      this.worker.postMessage({type: 'connect', url: this.url, ...(this.gameplayIdentity ? {gameplayIdentity: this.gameplayIdentity} : {})});
    });
    return this.connectPromise;
  }
  receive(message) {
    if (this.disposed || !message) return;
    if (message.povDelivery && this.capturePOV) message.povDelivery.deliveredAt = this.now();
    if (message.type === 'connected') this.connected = true;
    if (['disconnected', 'resumeFailed', 'transportError'].includes(message.type)) {
      this.connected = false;
      for (const pending of this.pending.values()) { clearTimeout(pending.timer); pending.reject(Object.assign(new Error('Connection interrupted; action was not confirmed'), {code: 'DISCONNECTED'})); }
      this.pending.clear();
    }
    if (message.type === 'response') {
      const pending = this.pending.get(message.requestId);
      if (pending) { clearTimeout(pending.timer); this.pending.delete(message.requestId); message.ok ? pending.resolve(message.data) : pending.reject(Object.assign(new Error(message.error?.message ?? 'Request rejected'), {code: message.error?.code})); }
    }
    try { this.emit(message.type, message); this.emit('message', message); }
    finally { if (message.povDelivery?.captureId) this.worker?.postMessage({type: 'povCaptured', captureId: message.povDelivery.captureId}); }
  }
  subscribe(callback) { return this.on('message', callback); }
  enablePOVCapture(enabled = true) { this.capturePOV = REPLAYS_ENABLED && enabled === true; this.worker?.postMessage({type: 'capturePOV', enabled: this.capturePOV}); }
  async request(type, data = {}) {
    await this.connect();
    if (this.pending.size >= 32) throw new Error('Too many pending lobby actions');
    const requestId = String(++this.nextRequest);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(requestId); reject(Object.assign(new Error('Lobby action timed out'), {code: 'REQUEST_TIMEOUT'})); }, this.requestTimeoutMs);
      this.pending.set(requestId, {resolve, reject, timer});
      this.worker.postMessage({type: 'control', message: identityControl({...data, v: 1, type, requestId}, this.gameplayIdentity)});
    });
  }
  create(username) { return this.request('create', {username}); }
  join(lobbyId, username) { return this.request('join', {lobbyId, username}); }
  select(characterId) { return this.request('select', {characterId}); }
  ready(ready = true) { return this.request('ready', {ready}); }
  start() { return this.request('start'); }
  assetsReady(revision) { return this.request('assetsReady', {revision}); }
  input(input) { if (this.connected && !this.disposed) this.worker.postMessage({type: 'input', input}); }
  clearInput() { this.worker?.postMessage({type: 'clearInput'}); }
  leave() { return this.request('leave'); }
  close() { this.dispose(); }
  dispose() {
    if (this.disposed) return;
    this.receive({type: 'disconnected'}); this.disposed = true;
    this.worker?.postMessage({type: 'dispose'}); this.worker?.terminate(); this.worker = null;
  }
}
export const createLobbyClient = options => new LobbyClient(options);
