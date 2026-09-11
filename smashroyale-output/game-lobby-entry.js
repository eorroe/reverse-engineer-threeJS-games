import {installPrivateLobbyEntry,loadLobbyPortraits,abortableReady} from './private-lobby-entry.js';
import {createPickerPanel} from './character-picker-panel.js';
import {loadCharacterRegistry} from './character-registry.js';
import {createMap} from './map.js';
import {createBrokerLobbyClient} from './net/broker-client.js';

/** Glue to the existing real world/view. No alternate simulation or placeholder
 * character can acknowledge the server's loading barrier. */
export function createGameLobbyEntry({
 brokerUrl, gameplayIdentity, createTransport=options=>createBrokerLobbyClient({brokerUrl,...options}), document=globalThis.document, getPlayableIds, getWorld, getView,
 getSimulation, whenWorldReady, getLook, identity, getAudio=()=>null,
 onStarted, onSnapshot, onReplayReady, onOpen, onLeave, onStateChange, onError, isReady, beforePrepare=()=>Promise.resolve(), onLoadingMetadata=()=>{}, afterPrepare=()=>{},
}={}) {
 const $=id=>document.getElementById(id);
 let audioState=null,announcementGeneration=0;
 return installPrivateLobbyEntry({document,soloButton:$('enter'),entryGate:$('entry-gate'),entryTitle:$('entry-title'),
  createTransport:()=>createTransport({gameplayIdentity}),
  async getPlayableCharacters({signal}){
   const ids=await getPlayableIds({refresh:true,signal});
   return loadLobbyPortraits({ids,loadRegistry:loadCharacterRegistry,signal,catalogueURL:new URL('../art/super-smash-royale/character-picker-v1/catalog.json',import.meta.url)});
  },
  createPicker:createPickerPanel,
  renderMap(canvas){
   let gone=false;void Promise.resolve(whenWorldReady()).then(()=>{if(!gone)createMap(canvas,getWorld()).drawOverview();}).catch(()=>{});
   return()=>{gone=true;canvas.width=canvas.height=1;};
  },
  async prepareMatch(loading,{signal,playerId,characterId}){
   let stage='world readiness';
   try{
   await abortableReady(whenWorldReady(),signal);
   stage='previous shader preparation';await abortableReady(beforePrepare(),signal);
   const view=getView(),world=getWorld(),simulation=getSimulation(),audio=getAudio();
   stage='playable registry';const ids=await getPlayableIds({refresh:true,signal});
   stage='server roster validation';if(!loading.characterAssignment||loading.characterIds.some(id=>!ids.includes(id))||!loading.characterIds.includes(characterId))throw Object.assign(Error('This lobby requires an updated fighter roster.'),{code:'ROSTER_MISMATCH'});
   stage='replay metadata';await abortableReady(onLoadingMetadata(loading,{signal}),signal);
   stage='fighter and audio assets';await abortableReady(Promise.all([view.prepareCharacterBodies(loading.characterIds,{fullDetailId:characterId}),audio?.preloadMatch(),audio?.preloadCharacter(characterId)]),signal);
   stage='assigned match construction';const state=simulation.createMatch({world,characterAssignment:loading.characterAssignment,preparedCharacterIds:loading.characterIds});
   const humans=new Set((loading.players||[]).map(player=>player.characterId));
   if(typeof simulation.initializeMultiplayerHumanLoadout==='function')for(const actor of state.contestants)if(humans.has(actor.characterId))simulation.initializeMultiplayerHumanLoadout(state,actor);
   const local=state.contestants.find(actor=>actor.characterId===characterId);
   if(!local)throw Error('Your assigned fighter could not prepare.');
   for(const actor of state.contestants)actor.isPlayer=actor===local;
   state.player=local;state.localActorId=local.id;
   stage='local fighter selection';await abortableReady(view.setPlayerCharacter(characterId),signal);
   stage='private match shaders';await view.prepare(state,getLook(),{signal});
   if(signal.aborted)throw new DOMException('Loading cancelled','AbortError');
   stage='replay presentation tables';await abortableReady(afterPrepare({state,loading,signal,playerId,characterId}),signal);
   }catch(error){if(error&&typeof error==='object')try{Object.defineProperty(error,'lobbyStage',{value:stage,configurable:true});}catch{}throw error;}
  },
  initialUsername:()=>identity.name,saveUsername:name=>identity.set(name),
  onCue:type=>getAudio()?.uiCue(type),
  async onAnnounce(type){const audio=getAudio(),token=++announcementGeneration;try{await audio?.preloadCharacter?.(type);if(token===announcementGeneration&&(audioState==='identity'||audioState==='lobby'))audio?.announce(type);}catch{}},
  onGesture:()=>{void getAudio()?.unlock();},onStarted,onSnapshot,onReplayReady,
  onOpen(){audioState=null;onOpen?.();const audio=getAudio();audio?.setInterfaceActive(true);audio?.setPaused(false);audio?.setMenu(true);void audio?.unlock();},
  onStateChange(state){
   if(state!==audioState){audioState=state;announcementGeneration++;const menu=state==='identity'||state==='lobby',audio=getAudio();audio?.setInterfaceActive(menu);audio?.setMenu(menu);if(menu)audio?.setPaused(false);}
   onStateChange?.(state);
  },onLeave(){audioState=null;announcementGeneration++;onLeave?.();},onError,isReady,
 });
}
