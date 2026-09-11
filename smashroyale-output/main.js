import {REPLAYS_ENABLED} from './replay-feature.js';
import {bindPauseControls} from './pause-controls.js';
import {analytics} from './analytics.js';
import {initFeedback} from './feedback.js';
import {soloRosterProgressForState} from './solo-roster-fill.js';
import {bindFullscreenControl} from './fullscreen-control.js';
import {SoloSimulation} from './solo-simulation.js';
// Replaced only by the immutable release builder, never by runtime config.
const CLIENT_GAMEPLAY_IDENTITY = Object.freeze({"protocol":1,"simulation":"c322e542ed987e245d455ddf7de5a4dab570697897ae0c68cedeedaa80dbffe7","world":"d8d0ecbc23d31965297044fddd35c98a1408575f06bf552a4b063b7b4ade0693"});
import {SOLO_REPLAY_PIN} from './replay/solo-release-pin.mjs';
import {selectMatchCharacterIds} from './match-roster-policy.js';
import {createPlayerIdentity,contestantUsername,makeMatchUsernames} from './player-identity.js';
import {createMatchPreparation} from './match-preparation.js';
import {constrainBodyLook,constrainCameraLook,bodyTurnLimited} from './aim-facing.js';
import {DEATH_TIMING} from './death-timing.js';
import {KILLCAM,KillcamRecorder} from './killcam.js';
import {createKillcamHud} from './killcam-hud.js';
import {createAimAssist} from './aim-assist.js';
import {getRosterCharacter} from './character-roster.js';
import {updateCombatHud,updateCombatReticle} from './combat-hud.js';
import {createScoreboard} from './scoreboard.js';
import {createDescentHud} from './descent-hud.js';
import {insertionSecondsRemaining} from './descent.js';
import { createInput } from './input.js';
import {buttonLabel} from './gamepad.js';
import { platform } from './platform.js';
import { createMap } from './map.js';
import { SurfaceFilm as MenuFilm } from './surface-film.js';
import { RenderMotion } from './render-motion.js';
import { HitFeedback } from './hit-feedback.js';
import { createSettingsStore, DEFAULT_SETTINGS } from './settings.js';
import {createPickerPanel} from './character-picker-panel.js';
import {createMatchCountdown} from './match-countdown.js';
import {createLandingLook} from './landing-look.js';
import {createReleaseRecovery,isStaleRelease} from './release-recovery.js';
const landingLook=createLandingLook();

// Diagnostic-only timings follow the real readiness promises. Parallel rows
// overlap; their durations must not be added to estimate total startup time.
function createBootTiming(){
  if(!/[?&]bootTiming=1(?:&|$)/.test(location.search||''))return{start(){},end(){},track(_name,fn){return fn();},finish(){},dispose(){}};
  const origin=performance.now(),rows=new Map(),panel=document.createElement('section');
  panel.id='boot-timing';panel.setAttribute('aria-label','Startup timings');
  panel.style.cssText='position:fixed;z-index:10000;right:12px;bottom:12px;max-width:min(520px,calc(100vw - 24px));max-height:80vh;overflow:auto;background:#fff;color:#17212b;padding:16px;border:2px solid #607080;border-radius:8px;font:13px/1.4 system-ui;box-shadow:0 4px 24px #0005';
  const title=document.createElement('strong');title.textContent='Startup timings';
  const close=document.createElement('button');close.type='button';close.textContent='Close timings';close.style.cssText='margin-left:16px;min-height:44px';close.addEventListener('click',()=>panel.remove());
  const summary=document.createElement('p');summary.setAttribute('role','status');summary.textContent=`Loading. Boot script began ${origin.toFixed(1)} ms after navigation.`;
  const note=document.createElement('p');note.textContent='Parallel stages overlap. Total time is measured separately.';
  const table=document.createElement('table'),body=document.createElement('tbody'),head=document.createElement('tr');
  for(const text of ['Stage','Start','Duration','State']){const cell=document.createElement('th');cell.scope='col';cell.textContent=text;cell.style.padding='4px 8px';head.append(cell);}const thead=document.createElement('thead');thead.append(head);table.append(thead,body);panel.append(title,close,summary,note,table);document.body.append(panel);
  let disposed=false;
  const api={
    start(name){if(disposed)return;const started=performance.now(),row=document.createElement('tr'),cells=[];for(const text of [name,`${(started-origin).toFixed(1)} ms`,'…','Running']){const cell=document.createElement('td');cell.textContent=text;cell.style.padding='4px 8px';cells.push(cell);row.append(cell);}body.append(row);rows.set(name,{started,cells});performance.mark?.('ssr:boot:'+name+':start');},
    end(name,state='Done'){if(disposed)return;const row=rows.get(name);if(!row)return;row.cells[2].textContent=`${(performance.now()-row.started).toFixed(1)} ms`;row.cells[3].textContent=state;performance.mark?.('ssr:boot:'+name+':end');performance.measure?.('ssr:boot:'+name,'ssr:boot:'+name+':start','ssr:boot:'+name+':end');},
    track(name,fn){api.start(name);try{const value=fn();if(value?.then)return Promise.resolve(value).then(result=>{api.end(name);return result;},error=>{api.end(name,'Failed');throw error;});api.end(name);return value;}catch(error){api.end(name,'Failed');throw error;}},
    finish(state){if(disposed)return;performance.mark?.(state==='Ready to enter'?'ssr:boot:interactive':'ssr:boot:failed');api.end('Menu entry readiness',state);summary.textContent=`${state}. ${(performance.now()-origin).toFixed(1)} ms from boot script; ${performance.now().toFixed(1)} ms from navigation.`;},
    dispose(){disposed=true;panel.remove();rows.clear();}
  };api.start('Menu entry readiness');return api;
}
const bootTiming=createBootTiming();
analytics.init({readMatchEnd:()=>analyticsOutcome('pagehide')});

const $ = id => document.getElementById(id);
const menuFullscreen=bindFullscreenControl($('menu-fullscreen'),{focusTarget:$('play')});
const entryFullscreen=bindFullscreenControl($('entry-fullscreen'),{focusTarget:$('enter')});
const pauseFullscreen=bindFullscreenControl($('pause-fullscreen'),{focusTarget:$('back')});
// Avoid DOM mutations (and replay records) when the displayed value is unchanged.
const hudText=(id,value)=>{const node=$(id),text=String(value);if(node.textContent!==text)node.textContent=text;};
const hudHidden=(id,value)=>{const node=$(id),hidden=!!value;if(node.hidden!==hidden)node.hidden=hidden;};
const panels = ['menu','pause','result','settings','fighter-picker'];
const settingsStore = createSettingsStore();
const playerIdentity=createPlayerIdentity();
const releaseRecovery=createReleaseRecovery();
if(releaseRecovery.restored?.name)playerIdentity.set(releaseRecovery.restored.name);
$('player-username').value=playerIdentity.name;
function saveUsername(){
 $('player-username').value=playerIdentity.set($('player-username').value);
 $('username-status').textContent=playerIdentity.saved?'Saved on this device.':'Saved for this visit. Device storage is unavailable.';
}
$('player-username').addEventListener('change',saveUsername);
$('username-status').textContent=playerIdentity.saved?'Saved on this device.':'Saved for this visit. Device storage is unavailable.';
const settingFields = Object.keys(DEFAULT_SETTINGS);
const rawSetting=key=>key==='sensitivity'||key==='gamepadSensitivity';
let settingsReturn = 'menu', settingsOpener = 'menu-settings';
let world, view, match, simulation, input, audio, map, running = false, ready = false, worldReady = false, worldReadyPromise;
let privateLobbyEntry=null,privateSession=null,privateReplay=null,privateReplayContent=null,privateReplayNotice=null,privateHudMapTrack=null,privatePreparedAudio=null,privatePreparedPresentation=null;
let soloReplay=null,soloReplayPrepared=null;
let soloDeployCuePlayed=false;
const soloReplayUploads=new WeakMap(),soloReplayUploadJobs=new Set();let soloReplayUploadsHost=null,soloReplayUploadSurface=null,soloReplayUploadSequence=0;
let soloSimulation=null;
let lastTime = 0, accumulator = 0, hudClock = 0, noticeUntil = 0, resultPresentation=null, fatalEvent=null, terminalHudPending=false;
let killcam=null,killcamHud=null;
let entered = false, menuFilm, pickerPanel, entryAudioReady=false;
let getPlayerCharacterIds,playerCharacterIds=[],selectedCharacterId=null,preparingCharacter=false,waitingForWorld=false,choiceGeneration=0;
let raf = 0, controllerRaf = 0, disposed = false, failed = false, initialRegistryAbort;
let analyticsRequestedAt=0,analyticsPrivateHumans=1,analyticsLobbyState='',analyticsFrames=0,analyticsFrameSample=0,analyticsSampleAt=performance.now(),analyticsInputSignature='',analyticsWasPlaying=false;
function analyticsInput(){
  const device=input?.device(),id=device?.id??'';
  return {input_device:device?.mode==='gamepad'?'gamepad':'keyboard-mouse',controller_layout:device?.layout??'default',controller_kind:!device?.connected?'unknown':/playstation|dualshock|dualsense|054c/i.test(id)?'playstation':/xbox|xinput|045e/i.test(id)?'xbox':/nintendo|switch|057e/i.test(id)?'nintendo':'generic'};
}
function analyticsStart(mode,{humans=1,load_ms}={}){
  analytics.setContext(analyticsInput());
  analytics.startMatch({mode,character:match?.player?.characterId??selectedCharacterId,humans,bots:Math.max(0,(match?.contestants?.length??32)-humans),load_ms:load_ms??(analyticsRequestedAt?performance.now()-analyticsRequestedAt:undefined)});
  analyticsRequestedAt=0;analyticsFrameSample=analyticsFrames;analyticsSampleAt=performance.now();analyticsWasPlaying=false;
}
function analyticsOutcome(reason){
  if(!match?.player)return {reason};
  const won=match.player.alive&&match.contestants.filter(actor=>actor.alive).length===1;
  return {kills:match.player.kills??0,won,placement:won?1:match.player.placement??undefined,reason};
}
function analyticsEnd(reason){
  analytics.endMatch(analyticsOutcome(reason));
  void analytics.flush();
}
// Reuse the existing frame loop's integer counter; only this 1 Hz timer computes
// summaries or checks input changes. No extra animation callback or canvas read.
const analyticsSampleTimer=setInterval(()=>{
  if(disposed||failed||document.hidden||analytics.health.disabled)return;
  const context=analyticsInput(),signature=JSON.stringify(context);
  if(signature!==analyticsInputSignature){analyticsInputSignature=signature;analytics.setContext(context);analytics.track('input_changed',context);}
  const time=performance.now(),playing=running&&match?.player?.alive&&match.phase!=='result',elapsed=(time-analyticsSampleAt)/1000;
  if(playing&&analyticsWasPlaying&&elapsed>0&&elapsed<3){const fps=(analyticsFrames-analyticsFrameSample)/elapsed;analytics.samplePerformance({fps,frame_ms:fps>0?1000/fps:undefined});}
  analyticsFrameSample=analyticsFrames;analyticsSampleAt=time;analyticsWasPlaying=playing;
},1000);
const renderMotion = new RenderMotion();
const hitFeedback = new HitFeedback($('hit-feedback'),{incoming:$('incoming-hit'),vitals:document.querySelector('.vitals'),damageRoot:$('damage-numbers'),elimination:$('elimination-confirm'),feed:$('elimination-feed')});
const descentHud = createDescentHud($('hud'));
const scoreboard = createScoreboard($('hud'));
let countdownBanner,countdownLabel,countdownOpener,pendingMatch,launchGeneration=0,launchAbort,countdownGoUntil=0;
const matchPreparation=createMatchPreparation({
  getIds:options=>getPlayerCharacterIds({refresh:true,...options}),
  ready:()=>worldReadyPromise,
  isDisposed:()=>disposed||failed,
  allowed:()=>worldReady&&!document.hidden&&!running&&!launchCountdown.active&&menuFilm?.ready&&!menuFilm.failed&&!menuFilm.disposed&&(!$('menu').hidden||!$('result').hidden||!$('fighter-picker').hidden||!$('settings').hidden&&settingsReturn==='menu'),
  async loadAssets(ids,id,{signal}={}){
    if(ids.length)await Promise.all([view.prepareCharacterBodies(ids,{fullDetailId:id??undefined,signal}),audio?.preloadMatch()]);
    if(id)await Promise.all([view.prepareCharacterBodies([id],{fullDetailId:id,signal}),audio?.preloadCharacter(id)]);
  },
  revisions:ids=>JSON.stringify(ids.map(id=>[id,view.characterPackages.get(id)?.revision??null])),
  plan(id,availableIds){
    const seed=crypto.getRandomValues(new Uint32Array(1))[0];
    return{ids:selectMatchCharacterIds({seed,humanCharacterIds:[id],availableCharacterIds:availableIds}),context:{seed}};
  },
  build(id,ids,{seed}){
    const assignment=simulation.planPreparedCharacterAssignment({seed,selectedCharacterId:id,preparedCharacterIds:ids});
    const state=simulation.createMatch({world,playerUsername:playerIdentity.name,characterAssignment:assignment,playerCharacterId:id,preparedCharacterIds:[...view.characterPackages.keys()]});
    const arrival=world.landmarks?.[0]??{x:0,z:0};
    state.player.yaw=Math.atan2(state.player.x-arrival.x,state.player.z-arrival.z);state.player.pitch=-.18;
    return state;
  },
  prepare:(state,{signal})=>bootTiming.track('Next match shaders',()=>view.prepare(state,{yaw:state.player.yaw,pitch:state.player.pitch},{signal})),
});
function warmSelectedFighter(){
  if(disposed||failed||preparingCharacter)return;
  // After confirmation, prepare only the exact next solo roster while the
  // player edits their name or pauses in the menu. Browsing warms one fighter.
  const id=selectedCharacterId??(playerCharacterIds.includes('bowser')?'bowser':playerCharacterIds[0]);
  if(id)void (selectedCharacterId&&!$('result').hidden?matchPreparation.warm(id):selectedCharacterId&&!$('menu').hidden?matchPreparation.prime(id):matchPreparation.preloadSelected(id)).catch(error=>{if(!disposed&&!failed&&!running&&isStaleRelease(error))showReleaseRefresh($('roster-status'),id);});
}
function showReleaseRefresh(status,characterId){
  status.hidden=false;
  status.textContent=releaseRecovery.canRefresh()?'A game update is ready. Refresh to finish loading your fighter. ':'The game is still updating. Please wait a minute, then refresh the page.';
  if(!releaseRecovery.canRefresh())return;
  const button=document.createElement('button');button.type='button';button.textContent='Refresh game';
  button.addEventListener('click',()=>{saveUsername();button.disabled=true;releaseRecovery.refresh({characterId,name:playerIdentity.name});},{once:true});
  status.append(button);
}
const launchCountdown=createMatchCountdown({
  duration:step=>Math.max(1.15,(audio?.announcementDuration(step)||0)+.15),
  onStep:step=>{paintCountdown(step);if(!launchCountdown.quick)audio?.announce(step);},
  onComplete:()=>{for(const id of [...panels,'world'])$(id).inert=false;countdownBanner.hidden=true;updateCharacterControls();begin(true);if(running){paintCountdown('go');countdownBanner.hidden=false;countdownGoUntil=performance.now()+850;audio?.announce('go');}},
  onCancel:()=>{void soloReplayPrepared?.dispose();soloReplayPrepared=null;countdownGoUntil=0;for(const id of [...panels,'world'])$(id).inert=false;if(countdownBanner)countdownBanner.hidden=true;audio?.stopAnnouncement();if(!disposed&&!failed){updateCharacterControls();(countdownOpener||$('play')).focus();}}
});
function paintCountdown(step){
  countdownBanner.dataset.step=step;
  countdownBanner.setAttribute('role',step==='go'?'status':'dialog');
  countdownBanner.setAttribute('aria-modal',String(step!=='go'));
  countdownLabel.textContent={ready:'READY?',three:'3',two:'2',one:'1',go:'GO!'}[step];
  if(!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)countdownLabel.animate?.([
    {transform:'scale(1.18)',opacity:.35},{transform:'scale(1)',opacity:1}
  ],{duration:280,easing:'cubic-bezier(.2,0,0,1)'});
}
async function requestMatch(fresh,{repeat=false}={}){
  if(!fresh){begin(false);return;}
  if(!ready||!worldReady||!entered||!selectedCharacterId||preparingCharacter||running||disposed||failed||launchCountdown.active)return;
  analyticsRequestedAt=performance.now();analytics.track('match_requested',{mode:'solo',character:selectedCharacterId,...analyticsInput()});
  const generation=++launchGeneration;
  pendingMatch=null;
  preparingCharacter=true;updateCharacterControls();
  $('roster-status').textContent='Preparing fighters…';$('roster-status').hidden=false;
  const controller=new AbortController();launchAbort=controller;
  try{
    const prepared=await deadline(matchPreparation.launch(selectedCharacterId,{signal:controller.signal}),180000);
    if(controller.signal.aborted||disposed||failed||document.hidden||generation!==launchGeneration)return;
    playerCharacterIds=prepared.availableIds;
    saveUsername();
    pendingMatch=prepared.state;
    // Names can change while the prepared simulation waits in the menu. Update
    // only names, retaining the exact actor assignment and its GPU preparation.
    const names=makeMatchUsernames(pendingMatch.seed,pendingMatch.contestants.length,playerIdentity.name);
    for(const actor of pendingMatch.contestants)actor.username=names[actor.id];
    await prepareSoloReplay(pendingMatch,{signal:controller.signal});
    if(typeof Worker==='function'){
      soloSimulation??=new SoloSimulation({onError:()=>{if(running&&!privateSession)failMatch('The match simulation stopped unexpectedly.');}});
      await deadline(soloSimulation.prepare(pendingMatch),30000);
      if(controller.signal.aborted)throw new DOMException('Match preparation cancelled','AbortError');
    }
    $('roster-status').hidden=true;
  }catch(error){
    // Focus/visibility cancellation is an abandoned UI waiter, not a broken fighter.
    if(controller.signal.aborted||disposed||failed||document.hidden||generation!==launchGeneration){
      if(launchAbort===controller&&!disposed&&!failed)updateRosterStatus();
      return;
    }
    analytics.track('match_load_failed',{mode:'solo',character:selectedCharacterId,error_kind:'load'});
    if(isStaleRelease(error))showReleaseRefresh($('roster-status'),selectedCharacterId);
    else $('roster-status').textContent='The fighters could not load. Try again.';
    $('roster-status').hidden=false;return;
  }finally{controller.abort();if(launchAbort===controller){launchAbort=null;preparingCharacter=false;if(!disposed)updateCharacterControls();}}
  if(!countdownBanner){
    countdownBanner=document.createElement('div');countdownBanner.className='match-countdown';countdownBanner.setAttribute('role','dialog');countdownBanner.setAttribute('aria-modal','true');countdownBanner.setAttribute('aria-label','Match countdown');
    countdownBanner.id='match-countdown';
    countdownLabel=document.createElement('strong');countdownLabel.setAttribute('role','status');countdownLabel.setAttribute('aria-live','assertive');countdownLabel.className='countdown-number';
    const cancel=document.createElement('button');cancel.textContent='Cancel';cancel.className='countdown-cancel';cancel.addEventListener('click',()=>{launchCountdown.cancel();audio?.uiCue('back');});countdownBanner.append(countdownLabel,cancel);document.body.append(countdownBanner);
  }
  countdownOpener=document.activeElement;for(const id of [...panels,'world'])$(id).inert=true;countdownBanner.hidden=false;launchCountdown.start({quick:repeat});updateCharacterControls();countdownBanner.children[1].focus();
}

async function deadline(promise, milliseconds) {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Loading took too long. Reload to try again.')), milliseconds);
    })]);
  } finally { clearTimeout(timer); }
}
const show = name => {
  soloReplayUploadSurface=name;
  if(name==='menu'||name===null)privateReplayNotice?.dismiss({focus:false});
  syncSoloReplayUploads();
  if(name!==null)scoreboard.close();
  if(name!==null&&countdownGoUntil){countdownGoUntil=0;countdownBanner.hidden=true;}
  hitFeedback.clear();
  descentHud.clear();
  $('scope').hidden = true;
  $('crosshair').hidden = false;
  for (const id of panels) $(id).hidden = id !== name;
  $('hud').hidden = name !== null;
  if(name===null)hudClock=.1;
  audio?.setInterfaceActive(entered&&name!==null);
  audio?.setWinner(name==='result'&&!!match?.player.alive&&match.contestants.filter(c=>c.alive).length===1);
  audio?.setMenu(entered&&(name==='menu'||name==='fighter-picker'||name==='settings'&&settingsReturn==='menu'));
  menuFilm?.syncSurface();
};
const aimAssist=createAimAssist({enabled:settingsStore.snapshot().aimAssist});
let assistFrame=null;
function updateAimAssistFrame(look){
const matrix=view.camera?.matrixWorld?.elements,position=view.camera?.position;
    if(matrix&&position){const dx=-matrix[8],dy=-matrix[9],dz=-matrix[10];assistFrame={x:position.x,y:position.y,z:position.z,yaw:Math.atan2(-dx,-dz),pitch:Math.atan2(dy,Math.hypot(dx,dz)),lookYaw:look.yaw,lookPitch:look.pitch};}
    else assistFrame=null;
}

const viewLook = () => ({...constrainCameraLook(match?.player,input?.look()||{yaw:0,pitch:0}), ...(match?.player.alive===false?{yaw:match.player.yaw,pitch:match.player.pitch,aim:false}:{}), alwaysRadar:settingsStore.snapshot().alwaysRadar, preview:false});
function resolvePlayerAim(state, controls) {
  controls=constrainBodyLook(state.player,controls);
  const point=view.getAimPoint(state, {yaw:controls.yaw, pitch:controls.pitch, aim:controls.aim===true, preview:false});
  soloReplay?.acceptAimPoint(point);return point;
}
function applyPreferences(settings) {
  aimAssist.setEnabled(settings.aimAssist);
  audio?.applySettings(settings);
  input?.setSettings(settings);
  $('mute').textContent = settings.muted ? 'Sound off' : 'Sound on';
  $('mute').setAttribute('aria-pressed', String(settings.muted));
  $('picker-mute').textContent=settings.muted?'Sound off':'Sound on';
  $('picker-mute').setAttribute('aria-pressed',String(settings.muted));
  menuFilm?.soundLevels();
}
settingsStore.subscribe(applyPreferences);
function fillSettingsDraft(settings) {
  for (const key of settingFields) {
    const control = $(`setting-${key}`);
    if (typeof DEFAULT_SETTINGS[key] === 'boolean') control.checked = settings[key];
    else if(typeof DEFAULT_SETTINGS[key]==='string')control.value=settings[key];
    else control.value = String(rawSetting(key) ? settings[key] : Math.round(settings[key] * 100));
  }
  updateSettingsOutputs();
}
function updateSettingsOutputs() {
  for (const key of settingFields) {
    if (typeof DEFAULT_SETTINGS[key] !== 'number') continue;
    const value = Number($(`setting-${key}`).value);
    $(`setting-${key}-value`).textContent = key === 'sensitivity' ? `${value.toFixed(2)}×` : key==='gamepadSensitivity'?`${value.toFixed(1)} / 10`:`${Math.round(value)}%`;
  }
}
function openSettings(from, opener) {
  if(launchCountdown.active)return;
  if (disposed || running || $(from).hidden) return;
  settingsReturn = from; settingsOpener = opener;
  fillSettingsDraft(settingsStore.snapshot());
  const status = settingsStore.status();
  $('settings-status').textContent = status.write === 'failed' || status.write === 'unavailable' || status.read === 'unavailable'
    ? 'Storage is unavailable. Applied settings last for this visit.'
    : status.read === 'invalid' && status.write !== 'saved'
      ? 'Some saved settings could not be read. Apply to save the values shown here.'
      : 'Changes take effect when you apply them.';
  show('settings');
  $('setting-masterVolume').focus();
}
function closeSettings() {
  if ($('settings').hidden || disposed || failed) return;
  show(settingsReturn);
  $(settingsOpener).focus();
}
function applySettingsDraft(event) {
  event.preventDefault();
  if ($('settings').hidden || disposed || failed) return;
  const draft = {};
  for (const key of settingFields) {
    const control = $(`setting-${key}`);
    draft[key] = typeof DEFAULT_SETTINGS[key] === 'boolean' ? control.checked
      : typeof DEFAULT_SETTINGS[key]==='string'?control.value:Number(control.value) / (rawSetting(key) ? 1 : 100);
  }
  try { settingsStore.update(draft); }
  catch { $('settings-status').textContent = 'Check the settings and try Apply again.'; return; }
  const message = settingsStore.status().write === 'saved' ? 'Settings saved.' : 'Settings applied for this visit. Storage is unavailable.';
  $('menu-settings-status').textContent = message;
  $('pause-settings-status').textContent = message;
  closeSettings();
  audio?.uiCue('confirm');
}
function notify(text, seconds = 3) {
  $('notice').textContent = text;
  noticeUntil = performance.now() + seconds * 1000;
}
function recordReplayActivity(active,reason){const options={at:performance.now(),reason};soloReplay?.active?.(active,options);privateReplay?.active?.(active,options);}
function pause(reason) {
  analytics.setPlaying(false);analyticsWasPlaying=false;
  privateSession?.setPaused(true);
  if(killcam?.clip){if(!killcam.clip.paused)toggleKillcamPause();return;}
  if(resultPresentation?.tail){resultPresentation.paused=true;audio?.setPaused(true);show('pause');$('back').focus();return;}
  if (!running) return;
  soloSimulation?.stop();
  running = false;
  recordReplayActivity(false,reason||'pause');
  input.enable(false);
  audio?.setPaused(true);
  show('pause');
  $('pause').querySelector('p').textContent = reason==='controller-disconnected'?'Controller disconnected. Reconnect it or use mouse and keyboard to return.':'Return to keep playing. Leaving ends this match.';
  if (document.pointerLockElement) document.exitPointerLock();
  $('back').focus();
}
function begin(fresh) {
  if(privateSession&&!fresh){running=true;analytics.setPlaying(match.player.alive&&match.phase!=='result');recordReplayActivity(true,'resume');privateSession.setPaused(false);input.enable(match.player.alive);audio?.setPaused(false);show(null);return;}
  if(!fresh&&resultPresentation?.tail){resultPresentation.paused=false;audio?.setPaused(false);show(null);lastTime=performance.now();return;}
  if (!ready || !worldReady || !entered || !selectedCharacterId || preparingCharacter || launchCountdown.active || !playerCharacterIds.includes(selectedCharacterId)) return;
  if(!fresh&&(match?.player?.characterId??match?.playerCharacterId)!==selectedCharacterId){openPicker();return;}
  if (fresh || !match) {
    if(!pendingMatch)return;
    retireSoloReplayUploadsForNewMatch();
    resultPresentation=null;fatalEvent=null;view.deathCameraCentre=null;
    if(soloReplay)void soloReplay.dispose();soloReplay=soloReplayPrepared;soloReplayPrepared=null;
    soloDeployCuePlayed=false;
    match = pendingMatch;
    pendingMatch=null;
    killcam=REPLAYS_ENABLED?new KillcamRecorder(match):null;killcam?.record();killcamHud?.hide();
    landingLook.reset();
  }
  $('roster-status').hidden = true;
  input.setLook(match.player.yaw ?? 0, match.player.pitch ?? -.12);
  renderMotion.reset();aimAssist.reset();assistFrame=null;view.cameraReady=false;
  audio?.setMenu(false);
  show(null);
  running = true;
  if(fresh)analyticsStart('solo');else analytics.setPlaying(true);
  soloSimulation?.start(match);
  recordReplayActivity(true,fresh?'match-start':'resume');
  audio?.setPaused(false);
  audio?.uiCue('confirm',{transition:true});
  void audio?.unlock();
  input.enable(true);
  accumulator = 0;
  lastTime = performance.now();
  if(input.device().mode!=='gamepad'){
    try { Promise.resolve($('world').requestPointerLock()).catch(() => notify('Click the island to capture the mouse.')); }
    catch { notify('Click the island to capture the mouse.'); }
  }
  if(match.phase!=='insertion')notify('Find cover. Stay inside the storm circle.', 6);
}
function menu() {
  analyticsEnd('quit');
  soloSimulation?.stop();
  if(privateSession){privateSession.dispose();privateSession=null;privateLobbyEntry?.leave();return;}
  if(soloReplay)void soloReplay.dispose();soloReplay=null;if(soloReplayPrepared)void soloReplayPrepared.dispose();soloReplayPrepared=null;
  clearKillcam();resultPresentation=null;fatalEvent=null;
  running = false;
  input?.enable(false);
  audio?.setPaused(true);
  if (document.pointerLockElement) document.exitPointerLock();
  pendingMatch=null;
  matchPreparation.invalidate();
  match=simulation.createMatch({seed:42191,world,playerUsername:playerIdentity.name,botCount:31,playerCharacterId:selectedCharacterId??undefined});
  accumulator=0;renderMotion.reset();aimAssist.reset();assistFrame=null;if(view)view.cameraReady=false;
  show('menu');
  updateRosterStatus();
  warmSelectedFighter();
  $('play').focus();
}
function openPicker(){
  if(!ready||!entered||running||disposed||failed||launchCountdown.active||$('menu').hidden)return;
  matchPreparation.invalidate();
  show('fighter-picker');
  pickerPanel??=createPickerPanel($('picker-host'),{allowedCharacterIds:playerCharacterIds,onConfirm:chooseCharacter,onCue:type=>audio?.uiCue(type),onBack:()=>{closePicker();audio?.uiCue('back');}});
  void pickerPanel.open({characterId:selectedCharacterId});if(entryAudioReady)audio?.announce('choose');
  $('picker-close').focus();
}
function closePicker(){
  if($('fighter-picker').hidden||disposed||preparingCharacter&&!waitingForWorld)return;
  if(waitingForWorld){choiceGeneration++;waitingForWorld=false;preparingCharacter=false;$('picker-close').disabled=false;updateCharacterControls();}
  pickerPanel?.close();audio?.stopAnnouncement();
  show('menu');$('fighters').focus();warmSelectedFighter();
}
function updateRosterStatus(){
  const incomplete=playerCharacterIds.length<simulation.MAX_ROSTER_BODIES;
  $('roster-status').textContent=incomplete?`Preview has ${playerCharacterIds.length} distinct fighters. ${simulation.MAX_ROSTER_BODIES-playerCharacterIds.length} more are being prepared for the full 45-fighter selection. Matches use up to 32 unique fighters.`:'';
  $('roster-status').hidden=!incomplete;
}
function updateCharacterControls(){
  const disabled=!worldReady||!selectedCharacterId||preparingCharacter||launchCountdown.active;
  for(const [id,label] of [['play','START'],['again','DROP AGAIN']]){
    const button=$(id);
    button.disabled=disabled;
    button.textContent=preparingCharacter?'Loading':label;
    button.setAttribute('aria-busy',String(preparingCharacter));
  }
  const selected=getRosterCharacter(selectedCharacterId),summary=$('selected-fighter');
  if(summary){summary.hidden=!selected;if(selected&&summary.dataset.fighter!==selected.id){summary.dataset.fighter=selected.id;$('selected-fighter-name').textContent=selected.name;$('selected-fighter-image').src=`art/super-smash-royale/character-picker-v1/portraits/${selected.id}.webp`;}}
  $('fighters').textContent=selectedCharacterId?'Change fighter':'Choose fighter';
}

async function chooseCharacter(result){
  const id=result?.characterId;
  if(disposed||failed||preparingCharacter||!playerCharacterIds.includes(id))return false;
  const generation=++choiceGeneration;
  matchPreparation.select(id);
  preparingCharacter=true;waitingForWorld=!worldReady;updateCharacterControls();
  $('picker-close').disabled=!waitingForWorld;
  $('picker-status').textContent=waitingForWorld?'The island is loading. You can return to the menu.':'Preparing your fighter…';
  try{
    await worldReadyPromise;
    if(disposed||failed||generation!==choiceGeneration)return false;
    waitingForWorld=false;$('picker-close').disabled=true;$('picker-status').textContent='Preparing your fighter…';
    await matchPreparation.idle();
    if(disposed||failed||generation!==choiceGeneration)return false;
    await deadline(Promise.all([view.setPlayerCharacter(id),audio?.preloadCharacter(id)]),30000);
    if(disposed||failed||generation!==choiceGeneration)return false;
    selectedCharacterId=id;
    analytics.track('character_selected',{mode:'solo',character:id});
    if(match&&!Object.hasOwn(match,'playerCharacterId'))simulation.assignPlayerVisual(match,id);
    $('picker-status').textContent='Fighter ready.';
    preparingCharacter=false;closePicker();updateCharacterControls();$('play').focus();audio?.announce(id);warmSelectedFighter();return true;
  }catch(error){if(!disposed&&!failed&&generation===choiceGeneration){if(isStaleRelease(error))showReleaseRefresh($('picker-status'),id);else $('picker-status').textContent='This fighter could not prepare. Try again before starting.';}return false;}
  finally{if(generation===choiceGeneration){preparingCharacter=false;waitingForWorld=false;if(!disposed){$('picker-close').disabled=false;updateCharacterControls();}}}
}

function updateSoloDeployCue(soloFill){
  if(!soloFill?.ready||!running||soloDeployCuePlayed)return;
  soloDeployCuePlayed=true;audio?.uiCue('confirm',{transition:true});
}
function updateHud() {
  terminalHudPending=false;
  scoreboard.update(match,input.label('scoreboard'));
  const jumpKey=input.label('jump'),diveKey=input.label('sprint'),interactKey=input.label('interact');
  const player = match.player;
  const soloFill=!privateSession&&match.phase==='insertion'?soloRosterProgressForState(match):null;
  hudHidden('solo-roster-fill',!soloFill);
  if(soloFill){hudText('solo-roster-count',`${soloFill.count} / ${soloFill.total} PLAYERS`);hudText('solo-roster-note',soloFill.ready?`Press ${jumpKey} to deploy`:'You’ll be able to deploy in a few seconds');updateSoloDeployCue(soloFill);}
  hudText('fighter-hud-name',contestantUsername(player));
  $('fighter-hud-name').title=getRosterCharacter(player.characterId??match.playerCharacterId)?.name??'Fighter';
  hudText('phase',!player.alive ? 'Eliminated' : match.phase === 'insertion' ? `${jumpKey} to drop · Auto-drop in ${insertionSecondsRemaining(match)}s` : (match.phase === 'landing'||player.descentActive) ? (player.canopyOpen ? (player.canopySafetyLock ? 'Choose your landing' : `${jumpKey} retract canopy`) : `${jumpKey} deploy · ${diveKey} dive`) : 'Stay inside the circle');
  if(soloFill&&!soloFill.ready)hudText('phase','Finding players…');
  hudText('remaining',`${match.contestants.filter(c => c.alive).length} remaining`);
  $('hp').value = player.hp; hudText('hp-number',Math.ceil(player.hp));
  $('shield').value = player.shield; hudText('shield-number',Math.ceil(player.shield));
  const weapon = player.inventory?.weapons?.[player.weaponIndex];
  const definition = weapon && simulation.WEAPONS[weapon.id];
  hudText('weapon',definition?.name || weapon?.id || 'Find a weapon');
  hudText('ammo',weapon ? `${weapon.mag} / ${weapon.reserve}` : `${interactKey} collects nearby gear`);
  const heals=player.inventory?.heals||0,shields=player.inventory?.shields||0;
  hudText('supplies',`${heals} med kit${heals===1?'':'s'} · ${shields} shield${shields===1?'':'s'}`);
  const target = running && player.alive && match.phase === 'active'
    ? simulation.nearestInteractable?.(match, player, world) : null;
  const prompt = $('interact-prompt');
  prompt.hidden = !target;
  prompt.textContent = target?.type === 'door' ? `${interactKey} · ${target.open?'Close':'Open'} door`
    : target?.type === 'container' ? `${interactKey} · Open supply chest`
    : target ? `${interactKey} · Collect gear` : '';
  map?.draw(match,input.look());
  updateCombatHud(document,match,input.look(),simulation.WEAPONS,simulation.getStormStatus?.(match));
}
function events(quiet=false,replayInput=null) {
  const drained=simulation.drainEvents(match);
  if(replayInput)soloReplay?.step(match,replayInput,drained,performance.now());
  for (const event of drained) {
    killcam?.recordEvent(event);
    if(quiet)continue;
    // Rendering consumes the same event list later through its optional cue hook.
    soloReplay?.event(event,match);view.event?.(event, match);
    if(event.type==='elimination'&&event.id===match.player.id)fatalEvent=event;
    audio?.event(event, match);
    hitFeedback.event(event,match.player.id,performance.now(),{state:match,look:input.look(),targetHeight:view.actors?.get(event.id)?.cameraFraming?.height});
    if(event.id===match.player.id)input.rumble(event.type==='shot'?'shot':event.type==='hit'?'damage':event.type==='land'?'land':event.type==='pickup'||event.type==='containerOpened'?'pickup':'');
    if (event.id === match.player.id) {
      if (event.type === 'pickup') notify('Gear collected');
      if (event.type === 'containerOpened') notify(`Chest opened. ${input.label('interact')} collects the supplies.`, 3);
      if (event.type === 'land') {landingLook.land();notify(`Find cover. ${input.label('interact')} opens chests or collects gear.`, 4);}
    }
  }
}
function beginResult() {
  if(resultPresentation)return;
  analyticsEnd(match.player.alive?'win':'death');
  soloSimulation?.stop();
  terminalHudPending=true;
  resultPresentation={elapsed:0,tail:killcam?.canReplay(fatalEvent)===true,paused:false};running=false;input.enable(false);
  if(document.pointerLockElement)document.exitPointerLock();
  $('scope').hidden=true;$('crosshair').hidden=true;
}
function toggleKillcamPause(){
  const clip=killcam?.clip;if(!clip)return;clip.paused=!clip.paused;audio?.setPaused(clip.paused);killcamHud?.update(clip);
}
function clearKillcam(){
  if(killcam?.clip)view?.endReplay(match,viewLook());killcamHud?.hide();killcam=null;
}
function playKillcam(){
  if(!REPLAYS_ENABLED){finish();return;}
  const clip=killcam?.start(fatalEvent);
  if(!clip){finish();return;}
  resultPresentation=null;view.beginReplay();hitFeedback.clear();descentHud.clear();$('hud').hidden=true;$('scope').hidden=true;$('crosshair').hidden=true;
  killcamHud??=createKillcamHud({onPause:toggleKillcamPause,onSkip:finish});
  killcamHud.show(contestantUsername(killcam.display.player),clip);killcamHud.update(clip);audio?.setPaused(false);
}
function renderKillcam(elapsed){
  const clip=killcam?.clip;if(!clip)return false;
  if(!clip.paused)clip.elapsed=Math.min(clip.t1-clip.t0,clip.elapsed+elapsed);
  const time=clip.t0+clip.elapsed,display=killcam.sample(time);
  if(!clip.paused)killcam.emitUntil(time,(event,state)=>{view.event?.(event,state,{replay:true});audio?.event(event,state);});
  view.render(display,clip.paused?0:elapsed,killcam.look);killcamHud.update(clip,view.combatView(display,killcam.look),view.scopeBlend);
  if(clip.elapsed>=clip.t1-clip.t0-1e-9)finish();return true;
}
function finish() {
  // The existing muted result cinematic may take over only after the original
  // terminal presentation has been committed and its local journal sealed.
  const recording=soloReplay?.recorder;
  if(recording?.presentationEnded&&!recording.failed&&['recording','finalizing'].includes(recording.status))return;
  clearKillcam();audio?.setPaused(false);
  resultPresentation=null;
  running = false;
  input.enable(false);
  if (document.pointerLockElement) document.exitPointerLock();
  const won = match.player.alive && match.contestants.filter(c => c.alive).length === 1;
  $('result-title').textContent = won ? 'Last one standing' : 'Eliminated';
  const attacker=match.contestants.find(c=>c.id===fatalEvent?.attackerId),name=attacker?contestantUsername(attacker):null,weaponName=simulation.WEAPONS[fatalEvent?.cause]?.name;
  $('result-detail').textContent = won ? 'The island is yours. Find a new route on your next drop.' : fatalEvent?.cause==='storm' ? 'The storm eliminated you. Stay inside the next circle.' : fatalEvent?.cause==='fall' ? 'You were eliminated by the fall.' : name ? `${name} eliminated you${weaponName?` with ${weaponName}`:''}.` : 'You were eliminated. Choose another landing and try again.';
  show('result');
  $('again').focus();
  // The terminal frame is sealed and combat stopped; prepare the exact next match.
  warmSelectedFighter();
}
function controllerBack(){
  if(feedback.isOpen()){feedback.close();return;}
  const replayClose=document.activeElement?.closest?.('.match-replay-notice')?.querySelector('.replay-notice-close');if(replayClose){replayClose.click();return;}
  if(killcam?.clip){toggleKillcamPause();return;}
  if(preparingCharacter&&$('fighter-picker').hidden){launchGeneration++;launchAbort?.abort();return;}
  if(launchCountdown.active){launchCountdown.cancel();return;}
  if(!$('settings').hidden){closeSettings();return;}
  if(!$('fighter-picker').hidden){closePicker();audio?.uiCue('back');return;}
  if(!$('pause').hidden){begin(false);return;}
  if(!$('result').hidden){menu();return;}
  if(privateLobbyEntry?.active){privateLobbyEntry.active.controllerBack();return;}
  // At the top level Back has no destination. It must never launch a match.
}
function controllerPrimary(){
  if(feedback.isOpen()){if($('fb-form').hidden)feedback.close();else void feedback.submit();return;}
  if(killcam?.clip){finish();return;}
  let target;
  if(launchCountdown.active)return;
  if(!$('fighter-picker').hidden)target=$('picker-host').shadowRoot?.querySelector('#confirm');
  else if(!$('settings').hidden)target=$('settings-apply');
  else if(!$('pause').hidden)target=$('back');
  else if(!$('result').hidden)target=$('again');
  else if(privateLobbyEntry?.active){privateLobbyEntry.active.controllerPrimary();return;}
  else target=entered?$('play'):$('enter');
  if(target&&!target.disabled&&!target.hidden)target.click();
}
let controllerHintSignature='',pickerControllerHint=null,pickerKeyboardHint='';
function updateControllerHints(){
  if(!input)return;
  const device=input.device(),pad=device.mode==='gamepad'&&device.connected;
  if(!pickerControllerHint?.isConnected){pickerControllerHint=$('picker-host').shadowRoot?.getElementById('keyboard-hint');if(pickerControllerHint)pickerKeyboardHint=pickerControllerHint.innerHTML;}
  const pickerMode=pad?device.id:'keyboard';
  if(pickerControllerHint&&pickerControllerHint.dataset.controllerMode!==pickerMode){
    if(pad)pickerControllerHint.textContent=`Left stick / D-pad move cursor · ${buttonLabel(device.id,0)} select · ${buttonLabel(device.id,3)} choose fighter`;
    else pickerControllerHint.innerHTML=pickerKeyboardHint;
    pickerControllerHint.dataset.controllerMode=pickerMode;
  }
  const signature=[pad,device.id,device.standard,device.editing,device.layout,device.enabled,running,!!killcam?.clip].join('|');
  if(signature===controllerHintSignature)return;controllerHintSignature=signature;
  document.body.dataset.input=pad?'gamepad':'keyboard';
  const label=index=>buttonLabel(device.id,index);
  const hint=$('controller-hint');hint.hidden=!pad||running;
  hint.textContent=killcam?.clip?`${label(0)} select · ${label(1)} / ${label(9)} pause replay · ${label(3)} skip killcam`:device.editing?`${label(0)} confirm · ${label(1)} cancel · Left / right adjust`:`Left stick / D-pad navigate · ${label(0)} select · ${label(1)} back · ${label(3)} continue · ${label(4)} / ${label(5)} adjust`;
  $('controller-status').textContent=device.connected?`${device.id}${device.standard?'':' · Generic mapping; button positions may vary.'}`:'Connect a controller, then press a button. Xbox and PlayStation controllers are supported.';
  $('equipment-controls').textContent=pad?`Hold ${label(2)} collect · Tap ${label(2)} reload · ${label(12)} med kit · ${label(13)} shield · ${label(4)}/${label(5)} weapon · ${label(8)} scoreboard`:'E aim · F collect · R reload · H med kit · J shield · Q cycle / 1–3 weapon · Tab scoreboard';
  const legend=$('controller-controls');
  legend.textContent=pad?`Left stick moves; right stick looks. ${label(7)} fires; ${label(6)} aims. ${label(0)} drops, deploys the canopy, or jumps. Click L3 to sprint; hold L3 to dive. ${input.label('crouch')} crouches or slides; ${input.label('prone')} toggles prone. Tap ${label(2)} to reload; hold it to open or collect. D-Up uses a med kit; D-Down uses a shield. Press the same supply button again to cancel. ${label(4)} / ${label(5)} cycles all weapons; ${label(3)} selects the next. D-Left / D-Right select slots 1 / 2. ${label(8)} opens the scoreboard. ${label(9)} pauses.`:'Controller: left stick moves, right stick looks, triggers aim and fire, bottom face button jumps. Connect a controller and press a button for its full control labels.';
  document.body.dataset.reloadKey=pad?label(2):'R';
  document.body.dataset.cycleKey=pad?`${label(4)}/${label(5)}`:'Q';
}
// Menu control survives a loading or graphics failure. It owns no renderer or
// simulation work, and is released with the input listeners on pagehide.
function controllerFrame(now){
  if(disposed)return;
  if(!document.hidden){
    const previousController=input?.device();
    if(!running)input?.pollMenu(now,{root:feedback.isOpen()?feedback.el:document.activeElement?.closest?.('.match-replay-notice')??(killcam?.clip?killcamHud.root:launchCountdown.active?countdownBanner:panels.map($).find(p=>!p.hidden)??privateLobbyEntry?.active?.controllerRoot()),onBack:controllerBack,onPrimary:controllerPrimary,onNavigate:()=>{if(entered)audio?.uiCue('move');}});
    if(killcam?.clip&&previousController?.mode==='gamepad'&&previousController.connected&&!input.device().connected)pause('controller-disconnected');
    updateControllerHints();
  }
  controllerRaf=requestAnimationFrame(controllerFrame);
}

function replayHUDRoots(){const roots=['hud','scope','crosshair','notice','hit-feedback','incoming-hit','damage-numbers','elimination-confirm','elimination-feed'].map($).filter(Boolean);return roots.filter(root=>!roots.some(other=>other!==root&&other.contains(root)));}
function soloReplayStatus(message,error=null,{hidden=false,busy=false}={}){if(!REPLAYS_ENABLED)return;for(const host of [$('deployment-controls'),$('result')?.querySelector('.dialog')]){if(!host)continue;let label=host.querySelector('.replay-availability');if(!label){label=document.createElement('p');label.className='replay-availability';label.setAttribute('role','status');host.append(label);}label.textContent=message;label.hidden=hidden;label.dataset.busy=String(busy);label.setAttribute('aria-busy',String(busy));if(error)label.dataset.replayCaptureError=String(error.message??error).slice(0,512);else delete label.dataset.replayCaptureError;}}
async function prepareSoloReplay(state,{signal}={}){
  if(!REPLAYS_ENABLED)return;
  if(soloReplay)void soloReplay.dispose();soloReplay=null;
  if(soloReplayPrepared)void soloReplayPrepared.dispose();soloReplayPrepared=null;
  if(!CLIENT_GAMEPLAY_IDENTITY||!SOLO_REPLAY_PIN){soloReplayStatus('Replay saving is not available in this build.');return;}
  let preparedAudio,preparedPresentation,capture;
  try{
    const [{preparePrivateReplayContent},{preparePrivateAudio},{preparePresentationCapture},{createSoloMatchReplay},math]=await Promise.all([import('./replay/private-match-replay.mjs'),import('./replay/prepare-private-audio.mjs'),import('./replay/presentation-capture.mjs'),import('./replay/solo-match-replay.mjs'),import('../vendor/three.module.js')]);
    const verified=await preparePrivateReplayContent({...SOLO_REPLAY_PIN,recordingAvailable:true,gameplayIdentity:CLIENT_GAMEPLAY_IDENTITY},CLIENT_GAMEPLAY_IDENTITY,{signal});
    if(!verified)throw Error('Replay release unavailable');
    audio?.setMenu(false);preparedAudio=await preparePrivateAudio(audio,{signal});preparedPresentation=await preparePresentationCapture(view,{signal});
    capture=createSoloMatchReplay({state,verified,simulation,view,math,preparedAudio,preparedPresentation,mix:audio?.mix,map,hudRoots:replayHUDRoots(),hudMeters:[$('hp'),$('shield')],config:{seed:state.seed,botCount:state.contestants.length-1,characterAssignment:state.characterAssignment,playerCharacterId:state.player.characterId,preparedCharacterIds:state.characterAssignment.characterIds,playerUsername:playerIdentity.name,initialization:'main-arrival-v1'},readSimulationPresentation:()=>({version:1,renderMotion:{tick:renderMotion.tick,time:renderMotion.time,sourceIsMatch:renderMotion.source===state,previous:[...renderMotion.previous]},accumulator}),readClocks:()=>({hudClock,noticeUntil,viewTime:view.time,accumulator,scopeHidden:$('scope').hidden,crosshairHidden:$('crosshair').hidden,running}),onFailure:error=>soloReplayStatus('Replay saving stopped. This match will not have a replay.',error)});
    if(signal?.aborted||disposed){void capture.dispose();return;}soloReplayPrepared=capture;soloReplayStatus('Your replay will be saved after your match is verified.');
  }catch{void capture?.dispose();if(!capture)preparedPresentation?.dispose();soloReplayStatus('Replay saving is unavailable for this match.');}finally{preparedAudio?.dispose();}
}
function replayEligibilityAllows({gameplaySeconds,kills}={}){
  return Number.isFinite(gameplaySeconds)&&gameplaySeconds>0&&Number.isInteger(kills)&&kills>=0;
}
function retireSoloReplayUpload(job){
  // Remove past-match presentation immediately. Its detached form and upload
  // keep their independent ownership until any in-flight work has settled.
  job.host.hidden=true;job.host.remove();
  if(job.pending||job.host.querySelector('form[aria-busy="true"]'))return;
  job.notice?.dispose();job.notice=null;soloReplayUploadJobs.delete(job);
}
function syncSoloReplayUploads(){
  if(!REPLAYS_ENABLED)return;
  for(const job of soloReplayUploadJobs){if(soloReplayUploadSurface==='menu')job.previous=true;if(job.previous)retireSoloReplayUpload(job);}
  if(soloReplayUploadsHost){soloReplayUploadsHost.dataset.surface=soloReplayUploadSurface??'gameplay';soloReplayUploadsHost.hidden=soloReplayUploadSurface!=='result'||!!privateSession||!!privateLobbyEntry?.active||![...soloReplayUploadJobs].some(job=>!job.previous&&!job.host.hidden);}
}
function retireSoloReplayUploadsForNewMatch(){
  for(const job of soloReplayUploadJobs){job.previous=true;retireSoloReplayUpload(job);}
  syncSoloReplayUploads();
}
function replayUploadFailure(error){
  const status=Number(error?.status);
  if(error?.code==='source-not-durable')return{message:'The replay service could not confirm that your recording was saved. Try uploading it again.',retryable:true};
  if(status===410)return{message:'This recording has expired and can no longer be uploaded.',retryable:false};
  if(status===401||status===403)return{message:'Access to this replay upload is no longer valid. This recording could not be saved.',retryable:false};
  if(status===413)return{message:'This recording exceeds the replay size limit and could not be saved.',retryable:false};
  if(status===400||status===409||status===422)return{message:'The replay service rejected this recording. This match could not be saved.',retryable:false};
  if(status===404)return{message:'The replay upload could not be found. This recording could not be saved.',retryable:false};
  if(status===429)return{message:'The replay service is busy. Your recording is saved on this device.',retryable:true};
  if(status>=500)return{message:'The replay service is unavailable. Your recording is saved on this device.',retryable:true};
  return{message:'The replay service could not be reached. Your recording is saved on this device.',retryable:true};
}
function uploadSoloReplay(capture){
  if(!REPLAYS_ENABLED)return capture?.discard?.();
  const eligibility=capture.eligibility?.();
  if(eligibility?.eligible!==true||!replayEligibilityAllows(eligibility)){if(capture===soloReplay)soloReplayStatus('',null,{hidden:true});return capture.discard?.();}
  // Each completed match owns its upload, retry and notice across Drop Again
  // and Back to Menu. Later matches cannot overwrite an earlier job's status.
  if(soloReplayUploads.has(capture))return soloReplayUploads.get(capture).pending;
  if(!soloReplayUploadsHost){soloReplayUploadsHost=document.createElement('aside');soloReplayUploadsHost.className='private-replay-host';soloReplayUploadsHost.dataset.uploadQueue='true';document.body.append(soloReplayUploadsHost);}
  const host=document.createElement('div'),label=document.createElement('p'),status=document.createElement('p'),retry=document.createElement('button');label.className='replay-upload-label';host.className='replay-upload-job';status.className='replay-availability';status.setAttribute('role','status');retry.type='button';retry.textContent='Retry video upload';retry.hidden=true;host.append(label,status,retry);soloReplayUploadsHost.append(host);
  const job={host,label,sequence:++soloReplayUploadSequence,previous:false,pending:null,resume:null,notice:null,done:false,emailAccepted:false,uploadError:false,canRetry:true,dismissed:false};label.hidden=true;label.textContent='';host.setAttribute('aria-label',`Video for match ${job.sequence}`);soloReplayUploads.set(capture,job);soloReplayUploadJobs.add(job);syncSoloReplayUploads();
  const noticeReady=import('./match-replay-notice.js').then(({createMatchCandidateNotice})=>{job.notice=createMatchCandidateNotice(host,{uploadState:'pending',reopenLabel:'Replay status',onVisibilityChange:visible=>{job.dismissed=!visible;label.hidden=true;status.hidden=!visible||job.done||job.emailAccepted&&!job.uploadError;retry.hidden=!visible||!job.uploadError||!job.canRetry;if(capture===soloReplay&& !visible)soloReplayStatus('',null,{hidden:true});},onEmailAccepted:()=>{job.emailAccepted=true;if(!job.uploadError){status.hidden=true;if(capture===soloReplay)soloReplayStatus('',null,{hidden:true});}Promise.resolve().then(syncSoloReplayUploads);},onError:()=>Promise.resolve().then(syncSoloReplayUploads)});job.notice.showPending();if(job.uploadError)job.notice.setUploadState('failed',{message:job.uploadMessage,retryable:job.canRetry});if(capture===soloReplay)soloReplayStatus('',null,{hidden:true});syncSoloReplayUploads();return job.notice;});
  const report=(message,{error=false,retryable=true}={})=>{job.uploadError=error;job.uploadMessage=message;job.canRetry=retryable;job.notice?.setUploadState(error?'failed':job.done?'complete':'pending',{message,retryable});status.hidden=job.dismissed||job.emailAccepted&&!error;status.dataset.busy=String(!error&&!job.done);status.setAttribute('aria-busy',String(!error&&!job.done));status.textContent=message;if(capture===soloReplay)soloReplayStatus(message,null,{hidden:status.hidden||!!job.notice,busy:!error&&!job.done});};
  const upload=()=>{
    if(job.done||job.pending)return job.pending;
    retry.hidden=true;report('Uploading your match');
    // Start sealing before awaiting UI modules; disposal waits for this task.
    const task=capture.complete(async({seal,readChunk,streamUpload})=>{
      if(typeof streamUpload==='function'){const receipt=await streamUpload();if(receipt?.durableSource!==true)throw Object.assign(Error('Cloud source durability was not confirmed'),{code:'source-not-durable'});const {candidateLandingURL}=await import('./replay-candidate-page.js');job.resume=receipt;const notice=await noticeReady;notice.show({url:candidateLandingURL(new URL('./replay.html',location.href),receipt.capability),expiresAt:receipt.expiresAt});syncSoloReplayUploads();return;}
      const manifest=await seal();const [{createSoloCandidateUpload},{candidateLandingURL}]=await Promise.all([import('./replay/solo-candidate-upload.mjs'),import('./replay-candidate-page.js')]);
      await createSoloCandidateUpload({endpoint:'https://rbtaxkgobwtftsqjqufa.supabase.co/functions/v1/replay-api'})({manifest,readChunk,resume:job.resume,onReserved:async receipt=>{job.resume=receipt;const notice=await noticeReady;notice.show({url:candidateLandingURL(new URL('./replay.html',location.href),receipt.capability),expiresAt:receipt.expiresAt});syncSoloReplayUploads();}});
    });
    job.pending=Promise.resolve(task).then(()=>{job.done=true;retry.hidden=true;retry.removeEventListener('click',upload);report('Your match is uploaded. Your video is processing.');status.hidden=true;syncSoloReplayUploads();},error=>{const failure=replayUploadFailure(error);retry.hidden=job.dismissed||!failure.retryable;report(failure.message,{error:true,retryable:failure.retryable});syncSoloReplayUploads();}).finally(()=>{job.pending=null;syncSoloReplayUploads();});
    return job.pending;
  };
  retry.addEventListener('click',upload);void noticeReady.catch(()=>{});return upload();
}

async function installPrivateMultiplayer(){
  let config;try{const response=await fetch(new URL('../multiplayer-config.json',import.meta.url),{cache:'no-store'});if(!response.ok)return;config=await response.json();}catch{return;}
  const {readMultiplayerConfig}=await import('./net/config.js');config=readMultiplayerConfig(config,location.hostname);if(!config)return;
  const [{createGameLobbyEntry},{MultiplayerMatchSession},{createLobbyClient}]=await Promise.all([import('./game-lobby-entry.js'),import('./net/match-session.js'),import('./net/lobby-client.js')]);
  if(disposed||failed)return;
  const [{preparePrivateReplayContent,createPrivateMatchReplay},replayMath,{createMatchReplayNotice},{readReplayCapability}]=REPLAYS_ENABLED?await Promise.all([import('./replay/private-match-replay.mjs'),import('../vendor/three.module.js'),import('./match-replay-notice.js'),import('./replay-ui-state.js')]):[{},null,{},{}];
  if(!CLIENT_GAMEPLAY_IDENTITY){notify('Private lobbies require the latest game build. Reload to update.',8);return;}
  const {preparePrivateAudio}=REPLAYS_ENABLED?await import('./replay/prepare-private-audio.mjs'):{};
  const {preparePresentationCapture}=REPLAYS_ENABLED?await import('./replay/presentation-capture.mjs'):{};
  const {installHUDMapTrack}=REPLAYS_ENABLED?await import('./replay/hud-map-track.mjs'):{};if(REPLAYS_ENABLED)privateHudMapTrack=installHUDMapTrack(map,{isActive:()=>!!privateReplay&&!privateReplay.recorder.presentationEnded,record:row=>privateReplay?.decision('hud-map-draw',row.value,{at:row.at})});
  const replayHost=document.createElement('aside');replayHost.hidden=true;replayHost.className='private-replay-host';if(REPLAYS_ENABLED)document.body.append(replayHost);let privateRetryAvailable=false;privateReplayNotice=REPLAYS_ENABLED?createMatchReplayNotice(replayHost,{uploadState:'pending',onVisibilityChange:visible=>{retryReplayButton.hidden=!visible||!privateRetryAvailable;}}):null;const retryReplayButton=document.createElement('button');retryReplayButton.type='button';retryReplayButton.textContent='Retry replay upload';retryReplayButton.hidden=true;replayHost.append(retryReplayButton);let retryReplay=null,lastReplayNoticeURL=null;retryReplayButton.addEventListener('click',()=>{if(retryReplay)void retryReplay();});
  let localTransport;
  if(config.localSocketUrl){const url=new URL(config.localSocketUrl);if(!['localhost','127.0.0.1','[::1]'].includes(location.hostname)||!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw Error('Local multiplayer is only available on localhost.');localTransport=()=>createLobbyClient({url:url.href,gameplayIdentity:CLIENT_GAMEPLAY_IDENTITY});}
  privateLobbyEntry=createGameLobbyEntry({gameplayIdentity:CLIENT_GAMEPLAY_IDENTITY,brokerUrl:config.brokerUrl,createTransport:localTransport,getPlayableIds:options=>getPlayerCharacterIds(options),getWorld:()=>world,getView:()=>view,getSimulation:()=>simulation,whenWorldReady:()=>worldReadyPromise,getLook:()=>input?.look()??{},beforePrepare:()=>matchPreparation.idle(),identity:playerIdentity,getAudio:()=>audio,isReady:()=>ready&&!disposed&&!failed,
    async onLoadingMetadata(data,{signal}={}){
      analyticsPrivateHumans=Math.max(1,data.players?.length??1);
      if(!REPLAYS_ENABLED){privateLobbyEntry?.active?.transport.enablePOVCapture?.(false);return;}
      privatePreparedAudio?.dispose();privatePreparedAudio=null;privatePreparedPresentation?.dispose();privatePreparedPresentation=null;privateReplayContent=null;
      try{privateReplayContent=await preparePrivateReplayContent(data,CLIENT_GAMEPLAY_IDENTITY,{signal});}catch{/* Missing recording metadata leaves a compatible match playable. */}
      privateLobbyEntry?.active?.transport.enablePOVCapture?.(!!privateReplayContent);
      if(privateReplayContent)try{audio?.setMenu(false);privatePreparedAudio=await preparePrivateAudio(audio,{signal});}catch{privateReplayContent=null;privateLobbyEntry?.active?.transport.enablePOVCapture?.(false);}
    },
    async afterPrepare({signal}){if(privateReplayContent)try{privatePreparedPresentation=await preparePresentationCapture(view,{signal});}catch{privateReplayContent=null;privatePreparedAudio?.dispose();privatePreparedAudio=null;privateLobbyEntry?.active?.transport.enablePOVCapture?.(false);}},
    onReplayReady(value){
      if(!REPLAYS_ENABLED)return;
      try{if(value.url!==lastReplayNoticeURL){privateReplayNotice.setUploadState('pending');lastReplayNoticeURL=value.url;}privateReplayNotice.show(value);}catch{return;}
      const capture=privateReplay,capability=readReplayCapability(value.url);if(!capture||!capability)return;replayHost.hidden=false;
      const upload=async()=>{if(retryReplay!==upload)return;privateRetryAvailable=false;retryReplayButton.hidden=true;privateReplayNotice.setUploadState('pending');try{await capture.complete(async({recorder,seal,readChunk})=>{const [{createFinalizeLocalPOV},{createLocalPOVUpload}]=await Promise.all([import('./replay/finalize-local-pov.mjs'),import('./replay/local-pov-upload.mjs')]);const endpoint='https://rbtaxkgobwtftsqjqufa.supabase.co/functions/v1/replay-api';const manifest=await seal(recorder=>createFinalizeLocalPOV({endpoint,capability})({recorder}));await createLocalPOVUpload({endpoint,capability})({manifest,readChunk});});if(retryReplay===upload)privateReplayNotice.setUploadState('complete');}catch(error){if(retryReplay===upload){const failure=replayUploadFailure(error);privateRetryAvailable=failure.retryable;privateReplayNotice.setUploadState('failed',failure);retryReplayButton.hidden=privateReplayNotice.isDismissed()||!failure.retryable;}}};retryReplay=upload;void upload();
    },
    onError(error,phase){analytics.track('match_load_failed',{mode:'private',error_kind:'load'});if(['localhost','127.0.0.1','[::1]'].includes(location.hostname))console.error('Private loading failure',phase,error.lobbyStage,error.message,error.stack);},
    onStateChange(state){if(state==='loading'&&analyticsLobbyState!==state){analyticsRequestedAt=performance.now();analytics.track('match_requested',{mode:'private',...analyticsInput()});}analyticsLobbyState=state;},
    onOpen(){analyticsEnd('quit');replayHost.hidden=true;privatePreparedAudio?.dispose();privatePreparedAudio=null;privatePreparedPresentation?.dispose();privatePreparedPresentation=null;audio?.setMenu(false);retryReplay=null;retryReplayButton.hidden=true;privateReplayNotice?.hide();entered=true;running=false;input?.enable(false);matchPreparation.invalidate();launchCountdown.cancel();clearKillcam();show('private-lobby');void audio?.unlock();},
    onStarted(data,{resume=false}={}){
      const continuing=resume&&privateSession&&privateSession.state?.seed===data.state.seed&&privateSession.localActorId===data.actorId;
      if(!continuing){replayHost.hidden=true;privateReplay?.dispose();privateReplay=null;privateSession?.dispose();privateSession=new MultiplayerMatchSession({world,transport:privateLobbyEntry.active.transport,onEvent(event,state){privateReplay?.event(event,state);view.event?.(event,state);audio?.event(event,state);hitFeedback.event(event,state.player.id,performance.now(),{state,look:input.look()});},onStatus(){analytics.setPlaying(false);analyticsWasPlaying=false;notify('Connection interrupted. Reconnecting…',6);}});
      if(privateReplayContent)try{privateReplay=createPrivateMatchReplay({session:privateSession,started:data,verified:privateReplayContent,view,hudRoots:replayHUDRoots(),hudMeters:[$('hp'),$('shield')],readHudMap:()=>privateHudMapTrack?.snapshot(),math:replayMath,mix:audio?.mix,preparedAudio:privatePreparedAudio,preparedPresentation:privatePreparedPresentation,readClocks:()=>({hudClock,noticeUntil,viewTime:view.time,scopeHidden:$('scope').hidden,crosshairHidden:$('crosshair').hidden,running}),onFailure:()=>{}});}catch{privateReplay=null;privateLobbyEntry.active.transport.enablePOVCapture?.(false);}finally{privatePreparedAudio?.dispose();privatePreparedAudio=null;if(!privateReplay)privatePreparedPresentation?.dispose();privatePreparedPresentation=null;}
      }else privateReplay?.decision('reconnect-presentation-reset',{at:performance.now()});
      match=privateSession.start(data);selectedCharacterId=match.player.characterId;pendingMatch=null;resultPresentation=null;fatalEvent=null;killcam=null;view.deathCameraCentre=null;view.cameraReady=false;renderMotion.reset();landingLook.reset();aimAssist.reset();assistFrame=null;
      input.setLook(match.player.yaw??0,match.player.pitch??0);show(null);running=true;recordReplayActivity(true,resume?'reconnect-resume':'match-start');audio?.setMenu(false);audio?.setPaused(false);input.enable(match.player.alive&&match.phase!=='result');lastTime=performance.now();accumulator=0;
      if(!continuing){analytics.track('character_selected',{mode:'private',character:selectedCharacterId});analyticsStart('private',{humans:analyticsPrivateHumans});}else analytics.setPlaying(match.player.alive&&match.phase!=='result');
      if(!match.player.alive||match.phase==='result')analyticsEnd(match.player.alive?'completed':'death');
      if(!match.player.alive||match.phase==='result')privateLobbyEntry.showSpectator(match);else notify(`${input.label('jump')} to deploy. Everyone drops within 10 seconds.`,6);
    },
    onSnapshot(data){if(!privateSession)return;const alive=match?.player.alive,phase=match?.phase;privateSession.receive(data);match=privateSession.state;if(alive&&!match.player.alive||phase!=='result'&&match.phase==='result'){analyticsEnd(match.player.alive?'win':'death');terminalHudPending=true;input.enable(false);privateLobbyEntry.showSpectator(match);if(document.pointerLockElement)document.exitPointerLock();}},
    onLeave(){analyticsEnd('disconnect');replayHost.hidden=true;privatePreparedAudio?.dispose();privatePreparedAudio=null;privatePreparedPresentation?.dispose();privatePreparedPresentation=null;privateReplay?.dispose();privateReplay=null;privateReplayContent=null;privateSession?.dispose();privateSession=null;entered=false;if(worldReady&&simulation)menu();else show('menu');$('entry-gate').hidden=false;$('deployment-controls').hidden=true;}
  });privateLobbyEntry.enable();
}
function renderPrivateMultiplayer(now,elapsed){
  const network=privateSession;if(!network?.state)return;
  match=network.state;network.setPaused(!running||document.hidden);
  const look={...viewLook(),spectator:!match.player.alive||match.phase==='result'};
  if(running&&match.player.alive&&match.phase!=='result'){
    const aimView=view.combatView(match,{...look,aim:true});input.setScoped(aimView.scoped,aimView.zoom);
    const rawControls=input.sample(elapsed,{weaponIndex:match.player.weaponIndex,weaponCount:match.player.inventory?.weapons?.length??0});
    const controls=aimAssist.update(match,rawControls,elapsed,assistFrame,(origin,target)=>simulation.aimTargetVisible?.(world,match,origin,target)===true);
    if(controls!==rawControls){input.setLook(controls.yaw,controls.pitch);look.yaw=controls.yaw;look.pitch=controls.pitch;}
    const target=view.getAimPoint?.(match,controls);
    if(target){const eyeY=match.player.y+simulation.multiplayerEyeHeight(match.player),dx=target.x-match.player.x,dy=target.y-eyeY,dz=target.z-match.player.z;controls.aimYaw=Math.atan2(-dx,-dz);controls.aimPitch=Math.atan2(dy,Math.hypot(dx,dz));}
    network.input(controls);
  }else {network.clearInput();if(running)input.pollScoreboard(elapsed);}
  const display=network.sample();if(!display)return;
  view.render(display,elapsed,look);updateAimAssistFrame(look);const combat=view.combatView(display,look);
  hudHidden('scope',!running||!display.player.alive||display.phase==='result'||!combat.scoped);if($('scope').dataset.optic!==(combat.optic||'sniper'))$('scope').dataset.optic=combat.optic||'sniper';hudText('scope-zoom',combat.zoom+'×');
  hudHidden('crosshair',!running||!display.player.alive||display.phase==='result'||combat.scoped);
  const weapon=display.player.inventory?.weapons?.[display.player.weaponIndex],spec=simulation.WEAPONS[weapon?.id];updateCombatReticle($('crosshair'),weapon?.id,spec?simulation.weaponSpread(spec,display.player,look.aim):0,view.camera?.fov,$('world').clientHeight||window.innerHeight,look.aim);
  hitFeedback.update(now,{state:display,look});hitFeedback.project?.(now,{state:display,camera:view.camera,width:$('world').clientWidth||window.innerWidth,height:$('world').clientHeight||window.innerHeight});
  audio?.update(display,elapsed);if(running)audio?.stormLightning(view.stormLightningState,display);
  hudClock+=elapsed;if(hudClock>.1||terminalHudPending){updateHud();descentHud.update(match,world);hudClock=0;}if(now>noticeUntil)hudText('notice','');
  privateReplay?.frame({at:now,dt:elapsed,state:display,look,hudClock,noticeUntil,viewportWidth:$('world').clientWidth,viewportHeight:$('world').clientHeight});
}

function renderFrame(now) {
  if (disposed) return;
  if(countdownGoUntil&&now>=countdownGoUntil){countdownGoUntil=0;countdownBanner.hidden=true;}
  const elapsed = Math.min(.1, Math.max(0, (now - (lastTime || now)) / 1000));
  lastTime = now;
  if (document.hidden || !worldReady || !view || !match || !input) return;
  if(privateSession){renderPrivateMultiplayer(now,elapsed);return;}
  if(privateLobbyEntry?.active)return;
  // Private-lobby cancellation restores the entry screen before a solo roster
  // exists. That screen owns presentation; never draw its unassigned match.
  if(!running&&!launchCountdown.active&&!$('entry-gate').hidden)return;
  // Loading owns the prepared actor scene through replay/audio setup. The old
  // result must not render over it between asynchronous preparation stages.
  if(!running&&!launchCountdown.active&&(preparingCharacter||view.preparation))return;
  // The film owns menu motion. Hidden combat overlays and the minimap need no
  // updates while a menu, gallery or its settings cover the prepared island.
  if(!running&&!launchCountdown.active&&menuFilm?.ready&&!menuFilm.failed&&!menuFilm.disposed&&(!$('menu').hidden||!$('result').hidden||!$('fighter-picker').hidden||!$('settings').hidden&&settingsReturn==='menu'))return;
  hitFeedback.update(now,{state:match,look:input.look()});
  if(killcam?.clip){renderKillcam(elapsed);return;}
  let replayFrame=null;
  if(launchCountdown.active)launchCountdown.update(elapsed);
  if(running&&soloSimulation?.active){
    const batch=soloSimulation.take(performance.timeOrigin+now);
    for(const row of batch.rows){
      if(!running)break;
      renderMotion.capture(match);
      for(const key of Object.keys(match))if(!(key in row.state))delete match[key];
      Object.assign(match,row.state);
      match.player=match.contestants.find(c=>c.id===row.state.player.id);
      world.updateAnimatedSolids?.(match.time);
      events(false,row.input);killcam?.record(match);
      if(match.result||!match.player.alive)beginResult();
    }
    accumulator=batch.alpha/60;
    if(running){
      const aimView=view.combatView(match,{...viewLook(),aim:true});input.setScoped(aimView.scoped,aimView.zoom);
      const rawControls=input.sample(elapsed,{weaponIndex:match.player.weaponIndex,weaponCount:match.player.inventory?.weapons?.length??0});
      const landedControls=landingLook.update(rawControls,elapsed);
      const controls=aimAssist.update(match,landedControls,elapsed,assistFrame,(origin,target)=>simulation.aimTargetVisible?.(world,match,origin,target)===true);
      if(controls!==rawControls)input.setLook(controls.yaw,controls.pitch);
      if(running){
        if(controls.fire&&view.getAimPoint)controls.aimPoint=view.getAimPoint(match,{...constrainBodyLook(match.player,controls),preview:false});
        soloSimulation.input(controls);
      }
      audio?.update(match,elapsed);
    }
  }else if (running) {
    accumulator += elapsed;
    while (accumulator >= 1 / 60 && running) {
      const aimView=view.combatView(match, {...viewLook(), aim:true});
      input.setScoped(aimView.scoped,aimView.zoom);
      const rawControls = input.sample(1/60,{weaponIndex:match.player.weaponIndex,weaponCount:match.player.inventory?.weapons?.length??0});
      const landedControls=landingLook.update(rawControls,1/60);
      const controls=aimAssist.update(match,landedControls,1/60,assistFrame,(origin,target)=>simulation.aimTargetVisible?.(world,match,origin,target)===true);
      if(controls!==rawControls)input.setLook(controls.yaw,controls.pitch);
      if (!running) break;
      renderMotion.capture(match);
      simulation.stepMatch(match, controls, 1 / 60, world, view.getAimPoint ? resolvePlayerAim : undefined);
      events(false,controls);
      killcam?.record(match);
      accumulator -= 1 / 60;
      if (match.result || !match.player.alive) beginResult();
    }
    audio?.update(match, elapsed);
  }
  if(resultPresentation?.tail&&!resultPresentation.paused&&(!soloReplay?.recorder.candidate||soloReplay.recorder.presentationEnded)){
    accumulator+=elapsed;
    while(accumulator>=1/60&&match.time<fatalEvent.time+KILLCAM.tail-1e-9){simulation.stepMatch(match,{},1/60,world,undefined,{postElimination:true});events(true);killcam?.record(match);accumulator-=1/60;}
    if(match.time>=fatalEvent.time+KILLCAM.tail-1e-9){accumulator=0;playKillcam();if(killcam?.clip){renderKillcam(0);return;}}
  }
  if (launchCountdown.active || ($('menu').hidden && $('fighter-picker').hidden && ($('settings').hidden || settingsReturn !== 'menu'))) {
    const presented=launchCountdown.active&&pendingMatch?pendingMatch:match;
    const look = launchCountdown.active&&pendingMatch?{...viewLook(),yaw:presented.player.yaw,pitch:presented.player.pitch}:viewLook();
    const display = renderMotion.sample(presented,running?accumulator*60:1,look,world,simulation.constrainRenderPosition);
    const combat = view.combatView(display,look);
    const aimView=view.combatView(display,{...look,aim:true});
    input.setScoped(running && aimView.scoped,aimView.zoom);
    hudHidden('scope',!running || !combat.scoped);
    if($('scope').dataset.optic!==(combat.optic||'sniper'))$('scope').dataset.optic=combat.optic||'sniper';
    hudText('scope-zoom',combat.zoom + '×');
    hudHidden('crosshair',!!resultPresentation || running && combat.scoped);
    // Presentation keeps moving while launch gates simulation. Water, foliage
    // and breathing use this clock; match positions advance only above.
    view.render(display,elapsed,look);
    killcam?.captureCamera(view.camera);
    if(soloReplay)replayFrame={state:display,at:now,dt:elapsed,look,viewportWidth:$('world').clientWidth,viewportHeight:$('world').clientHeight};
    $('scope').style.opacity=String(Math.max(0,Math.min(1,((view.scopeBlend??1)-.72)/.28)));
    hitFeedback.project?.(now,{state:display,camera:view.camera,width:$('world').clientWidth||window.innerWidth,height:$('world').clientHeight||window.innerHeight});
    const reticleWeapon=display.player.inventory?.weapons?.[display.player.weaponIndex],reticleSpec=simulation.WEAPONS[reticleWeapon?.id];
    updateCombatReticle($('crosshair'),reticleWeapon?.id,reticleSpec?simulation.weaponSpread?.(reticleSpec,display.player,look.aim):0,view.camera?.fov,$('world').clientHeight||window.innerHeight,look.aim);
    updateAimAssistFrame(look);
    if(running)audio?.stormLightning(view.stormLightningState,match);
    if(resultPresentation&&!resultPresentation.tail){resultPresentation.elapsed+=elapsed;audio?.update(match,elapsed);if(resultPresentation.elapsed>=DEATH_TIMING.result)finish();}
  }
  if (!running && !launchCountdown.active && (!menuFilm?.ready || menuFilm.failed || menuFilm.disposed) && (!$('menu').hidden || !$('fighter-picker').hidden)) {matchPreparation.invalidateView();view.render(match,elapsed,{preview:true});}
  if (running) platform.ready();
  if(!$('hud').hidden){hudClock += elapsed;
    if (hudClock > .1 || terminalHudPending) { if(running)descentHud.update(match,world);else descentHud.clear(); updateHud(); hudClock = 0; }
  }
  if (now > noticeUntil) hudText('notice','');
  if(replayFrame&&soloReplay?.frame({...replayFrame,hudClock,noticeUntil,accumulator}))void uploadSoloReplay(soloReplay);
}
function failMatch(message) {
  if (failed || disposed) return;
  analytics.track('runtime_error',{error_kind:'runtime'});analyticsEnd('error');
  soloSimulation?.dispose();soloSimulation=null;
  failed = true;initialRegistryAbort?.abort();matchPreparation.dispose();launchCountdown.cancel();
  killcamHud?.hide();killcam=null;
  running = false; ready = false;worldReady=false;choiceGeneration++;
  cancelAnimationFrame(raf);
  input?.enable(false);
  pickerPanel?.dispose();
  menuFilm?.dispose();
  audio?.dispose();
  view?.dispose();
  if (document.pointerLockElement) document.exitPointerLock();
  show('menu');
  $('entry-gate').hidden = false;
  $('deployment-controls').hidden = true;
  $('entry-title').textContent = 'Return to the island.';
  $('loading').textContent = `${message} Select Play solo to try again.`;
  $('play').disabled = false; $('play').textContent = 'Play solo';
  $('play').onclick = () => location.reload();
  $('enter').setAttribute('aria-busy','false');$('enter').disabled = false; $('enter').textContent = 'Play solo';
  $('enter').onclick = () => location.reload();
}
function frame(now) {
  if (disposed || failed) return;
  analyticsFrames++;
  try {
    renderFrame(now);
    if (!failed) raf = requestAnimationFrame(frame);
  } catch (error) {
    console.error('Smash Royale frame failed',error);
    failMatch('The match stopped unexpectedly.');
  }
}
$('world').addEventListener('webglcontextlost', event => {
  event.preventDefault();
  failMatch('The graphics connection was lost.');
});
async function boot() {
  // Remove only the retired match key. Audio and control preferences remain.
  try { localStorage.removeItem('skybreak-royale.match.v1'); } catch {}
  try {
    menuFilm = new MenuFilm($('approved-film'), {delivery:'progressive',source:'./art/gameplay-loading-cloud-v6.mp4',poster:'./art/gameplay-loading-poster-v5.jpg',title:"",surfaces:['#menu','#fighter-picker','#pause','#result','#settings'],soundtrack:false,buttonAudio:false,onError:()=>console.warn('Loading cinematic unavailable; continuing with the live island.')});
    menuFilm.setSoundSettings(() => {
      const settings = settingsStore.snapshot();
      // The embedded cinematic ambience is disabled. The supplied Overture
      // continues independently through MatchAudio's single Music owner.
      return {muted:audio?.muted ?? settings.muted,volume:settings.masterVolume*settings.effectsVolume,uiVolume:0};
    });
    const filmReady = bootTiming.track('Menu film',()=>menuFilm.prepare());
    const fontsReady = bootTiming.track('Fonts',()=>document.fonts?.ready||Promise.resolve());
    fontsReady.catch(()=>{});
    // Stream decorative footage alongside loading. Media failure must never
    // disable the game; the live preview remains available after world readiness.
    filmReady.catch(()=>console.warn('Loading cinematic unavailable; continuing with the live island.'));
    const modules = await bootTiming.track('Dynamic modules',()=>deadline(Promise.all([import('./world.js'), import('./view.js'), import('./match.js'), import('./audio.js')]), 20000));
    if (disposed || failed) return;
    simulation = modules[2];
    getPlayerCharacterIds=modules[1].getPlayerCharacterIds;
    const registryController=initialRegistryAbort=new AbortController();
    let registeredCharacters;
    try{registeredCharacters=[...await bootTiming.track('Fighter registry',()=>deadline(getPlayerCharacterIds({signal:registryController.signal}),20000))];}
    finally{registryController.abort();if(initialRegistryAbort===registryController)initialRegistryAbort=null;}
    if(disposed||failed)return;
    playerCharacterIds=registeredCharacters;
    if(playerCharacterIds.includes(releaseRecovery.restored?.characterId))selectedCharacterId=releaseRecovery.restored.characterId;
    bootTiming.track('World and map',()=>{world = modules[0].createWorld({contestantCount:simulation.MAX_ROSTER_BODIES});map = createMap($('map'),world);});
    const audioReady=bootTiming.track('Entry audio',()=>{audio = new modules[3].MatchAudio({ world, initialSettings:settingsStore.snapshot() });return audio.preload();});
    audioReady.catch(()=>{});
    bootTiming.start('Match world readiness');
    worldReadyPromise=(async()=>{
      bootTiming.start('View assets');
      let abandonedView=false;
      const viewPromise=modules[1].createView({canvas:$('world'),world,legacyPilot:false,compressedWorldTextures:new URLSearchParams(location.search).get('worldTextures')!=='source'}).then(result=>{
        if(abandonedView||disposed||failed){result.dispose();throw new Error('Loading was cancelled.');}
        return result;
      });
      try{view=await deadline(viewPromise,25000);bootTiming.end('View assets');}
      catch(error){bootTiming.end('View assets','Failed');abandonedView=true;throw error;}
      if(disposed||failed)throw new Error('Loading was cancelled.');
      // Browsing prepares one likely selection. START owns the actual roster
      // download; opening a menu never fetches every opponent package.
      // Input already owns menu navigation while this world is loading.
      applyPreferences(settingsStore.snapshot());
      match=simulation.createMatch({seed:42191,world,playerUsername:playerIdentity.name,botCount:31});
      // The renderer owns cancellable linking/progress checks. A second wall
      // timer could reject completed shaders after slow source-cache work.
      await bootTiming.track('View shader preparation',()=>view.prepare(match,{...input.look(),preview:true}));
      if(disposed||failed)throw new Error('Loading was cancelled.');
      worldReady=true;bootTiming.end('Match world readiness');updateCharacterControls();warmSelectedFighter();
      return view;
    })();
    worldReadyPromise.catch(error=>{
      bootTiming.end('Match world readiness','Failed');
      if(!disposed&&!failed)failMatch(`The island could not finish loading. ${error.message}`);
    });
    await bootTiming.track('Audio fonts gate',()=>deadline(Promise.all([audioReady,fontsReady]),20000));
    if(disposed||failed)return;
    ready = true;
    updateCharacterControls();
    menuFilm.syncSurface();
    if (disposed || failed) return;
    $('enter').setAttribute('aria-busy','false');$('enter').disabled = false; $('enter').textContent = 'Click to enter';
    bootTiming.finish('Ready to enter');
    analytics.track('menu_ready');
    void installPrivateMultiplayer().catch(()=>notify('Private lobbies could not be initialized. Reload to retry.',6));
    $('loading').textContent = 'Menu and fighter gallery ready. The island loads in the background.';
    updateRosterStatus();
    raf = requestAnimationFrame(frame);
  } catch (error) {
    if (failed || disposed) return;
    analytics.track('match_load_failed',{error_kind:'load'});
    failed=true;initialRegistryAbort?.abort();matchPreparation.dispose();worldReady=false;choiceGeneration++;
    bootTiming.finish('Failed');
    console.error('Island startup failed', error);
    menuFilm?.dispose();
    audio?.dispose();
    view?.dispose();
    $('loading').textContent = `The island could not load. ${error.message}`;
    $('play').disabled = false; $('play').textContent = 'Play solo';
    $('play').onclick = () => location.reload();
    $('enter').setAttribute('aria-busy','false');$('enter').disabled = false; $('enter').textContent = 'Play solo';
    $('enter').onclick = () => location.reload();
    ready = false;
  }
}
function toggleMute() {
  if (!audio || disposed || failed) return;
  settingsStore.update({muted:!settingsStore.snapshot().muted});
}
$('enter').addEventListener('click', () => {
  if (!ready || entered || disposed || failed || $('enter').disabled) return;
  entered = true;
  audio?.setInterfaceActive(true);
  audio?.setMenu(true);
  void audio?.unlock().then(ok => {
    if (disposed || failed) return;
    if (!ok) { $('menu-audio-status').textContent = 'Sound unavailable. You can still play.'; return; }
    entryAudioReady=true;
    if (!$('menu').hidden || !$('fighter-picker').hidden) audio.uiCue('confirm');
    if (!$('fighter-picker').hidden)audio.announce('choose');
  });
  $('entry-gate').hidden = true;
  $('deployment-controls').hidden = false;
  updateCharacterControls();if(!selectedCharacterId)openPicker();
});
$('play').addEventListener('click', () => requestMatch(true));
$('back').addEventListener('click', () => begin(false));
$('quit').addEventListener('click', menu);
$('again').addEventListener('click', () => requestMatch(true,{repeat:true}));
$('home').addEventListener('click', menu);
$('fighters').addEventListener('click',openPicker);
$('picker-close').addEventListener('click',closePicker);
$('picker-mute').addEventListener('click',toggleMute);
$('mute').addEventListener('click', toggleMute);
$('entry-settings').addEventListener('click', () => openSettings('menu','entry-settings'));
$('entry-settings').disabled=false;
$('menu-settings').addEventListener('click', () => openSettings('menu','menu-settings'));
$('pause-settings').addEventListener('click', () => openSettings('pause','pause-settings'));
const pauseControls=bindPauseControls($('pause-controls'),$('pause-controls-panel'),{device:()=>input?.device()??{}});
$('settings-form').addEventListener('submit', applySettingsDraft);
$('settings-form').addEventListener('input', updateSettingsOutputs);
$('settings-cancel').addEventListener('click', closeSettings);
$('settings-reset').addEventListener('click', () => {
  fillSettingsDraft(DEFAULT_SETTINGS);
  $('settings-status').textContent = 'Defaults restored in this panel. Apply to keep them.';
});
window.addEventListener('keydown', event => {
  if(event.defaultPrevented)return;
  if(event.key==='Escape'&&preparingCharacter&&$('fighter-picker').hidden){launchGeneration++;launchAbort?.abort();event.preventDefault();return;}
  if(event.key==='Escape'&&launchCountdown.active){event.preventDefault();launchCountdown.cancel();return;}
  if (event.key === 'Escape' && !$('settings').hidden) { event.preventDefault(); closeSettings(); }
  else if(event.key==='Escape'&&!$('fighter-picker').hidden){event.preventDefault();closePicker();audio?.uiCue('back');}
});
// One cue per completed button action. Focus sounds are only for keyboard
// navigation, so click→focus and arrow-selection cannot double-trigger.
const menuCues={quit:'back',home:'back','menu-settings':'confirm','pause-settings':'confirm','settings-cancel':'back','settings-reset':'select',mute:'select',fighters:'confirm','picker-close':'back','picker-mute':'select'};
for(const [id,type]of Object.entries(menuCues))$(id).addEventListener('click',()=>{if(entered&&!disposed&&!failed)audio?.uiCue(type);});
let keyboardNavigation=false;
document.addEventListener('pointerdown',()=>{keyboardNavigation=false;});
document.addEventListener('keydown',e=>{keyboardNavigation=['Tab','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key);});
document.addEventListener('focusin',e=>{if(keyboardNavigation&&entered&&!running&&e.target?.tagName==='BUTTON'&&!e.target.disabled)audio?.uiCue('move');});
window.addEventListener('resize', () => {view?.resize();matchPreparation.invalidateView();});
window.addEventListener('blur',()=>{launchGeneration++;launchAbort?.abort();matchPreparation.invalidate();launchCountdown.cancel();pause('window-blur');});
window.addEventListener('focus',warmSelectedFighter);
document.addEventListener('visibilitychange', () => {
  menuFilm?.syncSurface();
  if (document.hidden) { launchGeneration++;launchAbort?.abort();matchPreparation.invalidate();launchCountdown.cancel();pause('document-hidden'); audio?.setPaused(true); }
  else warmSelectedFighter();
});
window.addEventListener('pagehide', () => { clearInterval(analyticsSampleTimer);analytics.dispose();feedback.destroy();menuFullscreen.dispose();entryFullscreen.dispose();pauseFullscreen.dispose();pauseControls.dispose();soloSimulation?.dispose();soloSimulation=null; for(const job of soloReplayUploadJobs)job.notice?.dispose();void soloReplay?.dispose();void soloReplayPrepared?.dispose(); privatePreparedAudio?.dispose();privatePreparedPresentation?.dispose();privateHudMapTrack?.dispose();privateReplayNotice?.dispose();privateReplay?.dispose();privateSession?.dispose();privateLobbyEntry?.dispose(); bootTiming.dispose();disposed = true;initialRegistryAbort?.abort();matchPreparation.dispose();worldReady=false;choiceGeneration++;launchAbort?.abort();launchCountdown.dispose();countdownBanner?.remove(); pickerPanel?.dispose(); descentHud.dispose(); scoreboard.dispose(); settingsStore.dispose(); cancelAnimationFrame(raf); cancelAnimationFrame(controllerRaf); input?.dispose(); menuFilm?.dispose(); audio?.dispose(); view?.dispose(); });
window.addEventListener('pageshow', event => { if (event.persisted && disposed) location.reload(); });
window.addEventListener('pagehide',()=>killcamHud?.dispose());
const feedback=initFeedback({describeContext:()=>`${privateSession||privateLobbyEntry?.active?'Private lobby':running||!$('pause').hidden?'Solo match':'Main menu'} · ${analyticsInput().input_device}`,onOpen:()=>{pause('feedback');input?.enable(false);if(document.pointerLockElement)document.exitPointerLock();},onClose:()=>{}});
input=createInput($('world'),{onPause:pause,onMute:toggleMute,onScoreboard:()=>{if(!running||!match||$('hud').hidden||killcam?.clip)return false;scoreboard.toggle(match,input.label('scoreboard'));return true;},onDismissScoreboard:()=>scoreboard.close()});
input.setSettings(settingsStore.snapshot());
controllerRaf=requestAnimationFrame(controllerFrame);
boot();

// The owner is created during boot; parent mute remains effective on the film.
