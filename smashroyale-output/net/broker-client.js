import {markBrokerCapacityError} from '../capacity-feedback.js';
import {createLobbyClient} from './lobby-client.js';
import {gameplayIdentity as validateIdentity, identityControl} from './gameplay-identity.js';

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}
function delay(ms, signal) {
  return new Promise((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(signal.reason ?? new Error('Cancelled')); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, ms);
    if (signal.aborted) abort(); else signal.addEventListener('abort', abort, {once: true});
  });
}

/** Same request/subscribe contract as LobbyClient; secrets stay out of the UI. */
export class BrokerLobbyClient {
  constructor({brokerUrl, fetchImpl = (...args) => globalThis.fetch(...args), clientFactory = createLobbyClient, randomId = randomToken, wait = delay, now = () => performance.now(), maxProvisionMs = 180000, gameplayIdentity, ...clientOptions} = {}) {
    const url = new URL(brokerUrl);
    if (url.username || url.password || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))) throw new TypeError('A secure lobby broker URL is required');
    url.pathname = url.pathname.replace(/\/$/, '') + (url.pathname.endsWith('/lobbies') ? '' : '/lobbies');
    this.url = url.href; this.fetch = fetchImpl; this.clientFactory = clientFactory; this.randomId = randomId; this.wait = wait; this.now = now; this.maxProvisionMs = maxProvisionMs; this.clientOptions = clientOptions;
    this.listeners = new Set(); this.client = null; this.provisioning = false; this.disposed = false; this.abortController = null; this.unsubscribeClient = null;
    Object.defineProperty(this, 'gameplayIdentity', {value: validateIdentity(gameplayIdentity), enumerable: true});
  }
  subscribe(callback) { this.listeners.add(callback); return () => this.listeners.delete(callback); }
  on(type, callback) { return this.subscribe(event => { if (event.type === type) callback(event); }); }
  emit(message) { for (const callback of this.listeners) callback(message); }
  async request(type, payload = {}) {
    if (this.disposed) throw new Error('Client disposed');
    if (!['create', 'join'].includes(type)) {
      if (!this.client) throw Object.assign(new Error('Join a lobby first'), {code: 'NOT_CONNECTED'});
      if (type !== 'leave') return this.client.request(type, payload);
      try { return await this.client.request(type, payload); } finally { this.disconnectClient(); }
    }
    if (this.client || this.provisioning) throw Object.assign(new Error('A lobby connection is already in progress'), {code: 'ALREADY_JOINED'});
    this.provisioning = true; const abortController = new AbortController(); this.abortController = abortController;
    const timeout = setTimeout(() => { abortController.abort(Object.assign(new Error('The lobby server took too long to start. Please try again.'), {code: 'PROVISION_TIMEOUT'})); this.disconnectClient(); }, this.maxProvisionMs);
    const joinId = this.randomId();
    const body = type === 'create' ? {action: 'create', requestId: this.randomId(), joinId, username: payload.username} : {action: 'join', code: payload.lobbyId ?? payload.code, joinId, username: payload.username};
    if (this.gameplayIdentity) body.gameplayIdentity = this.gameplayIdentity;
    const startedAt = this.now();
    try {
      for (;;) {
        if (abortController.signal.aborted) throw abortController.signal.reason;
        if (this.now() - startedAt >= this.maxProvisionMs) throw Object.assign(new Error('The lobby server took too long to start. Please try again.'), {code: 'PROVISION_TIMEOUT'});
        this.emit({type: 'provisioning', phase: 'starting', lobbyId: body.code ?? body.requestId});
        const response = await this.fetch(this.url, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body), signal: abortController.signal, credentials: 'omit', cache: 'no-store'});
        const data = await response.json();
        if (response.status === 202 && data.status === 'starting') { await this.wait(Math.min(5000, Math.max(500, data.retryAfterMs ?? 1500)), abortController.signal); continue; }
        if (!response.ok) {
          const error=Object.assign(new Error(data.error?.message ?? data.message ?? 'The lobby could not be opened'), {code: data.error?.code ?? data.code ?? (typeof data.error === 'string' ? data.error : 'BROKER_ERROR')});
          throw markBrokerCapacityError(error,{status:response.status,responseURL:response.url,brokerURL:this.url,redirected:response.redirected,action:type});
        }
        if (data.status !== 'ready' || typeof data.endpoint !== 'string' || typeof data.playerSessionId !== 'string' || typeof data.code !== 'string') throw new Error('Invalid lobby server response');
        const endpoint = new URL(data.endpoint);
        if (endpoint.search || endpoint.username || endpoint.password || (endpoint.protocol !== 'wss:' && !(endpoint.protocol === 'ws:' && ['localhost', '127.0.0.1', '[::1]'].includes(endpoint.hostname)))) throw new Error('Invalid lobby server endpoint');
        if (abortController.signal.aborted) throw abortController.signal.reason;
        const client = this.clientFactory({...this.clientOptions, url: endpoint.href, gameplayIdentity: this.gameplayIdentity}); this.client = client;
        this.unsubscribeClient = client.subscribe(message => {
          // Admission/resume credentials are owned by the transport Worker.
          if (message.type !== 'response' || !message.data?.resumeToken) this.emit(message);
        });
        await client.connect();
        const {type: admissionType, ...admission} = identityControl({type: 'admit', playerSessionId: data.playerSessionId, username: data.username ?? payload.username}, this.gameplayIdentity);
        const admitted = await client.request(admissionType, admission);
        return {playerId: admitted.playerId, lobbyId: admitted.lobbyId ?? data.lobbyId ?? data.code, code: data.code};
      }
    } catch (error) {
      this.disconnectClient(); throw error;
    } finally { clearTimeout(timeout); this.provisioning = false; if (this.abortController === abortController) this.abortController = null; }
  }
  input(input) { this.client?.input(input); }
  enablePOVCapture(enabled = true) { this.clientOptions.capturePOV = enabled; this.client?.enablePOVCapture(enabled); }
  clearInput() { this.client?.clearInput(); }
  create(username) { return this.request('create', {username}); }
  join(lobbyId, username) { return this.request('join', {lobbyId, username}); }
  select(characterId) { return this.request('select', {characterId}); }
  ready(ready = true) { return this.request('ready', {ready}); }
  start() { return this.request('start'); }
  assetsReady(revision) { return this.request('assetsReady', {revision}); }
  leave() { return this.request('leave'); }
  disconnectClient() { this.unsubscribeClient?.(); this.unsubscribeClient = null; this.client?.close(); this.client = null; }
  close() { if (this.disposed) return; this.disposed = true; this.abortController?.abort(new Error('Lobby connection cancelled')); this.disconnectClient(); this.listeners.clear(); }
  dispose() { this.close(); }
}
export const createBrokerLobbyClient = options => new BrokerLobbyClient(options);
